require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static('public'));

// MongoDB Connection
mongoose.connect('mongodb://localhost:27017/smc_terminal')
    .then(() => console.log("MongoDB Connected Successfully!"))
    .catch(err => console.error("MongoDB Connection Error:", err));

// Trade Schema & Model
const tradeSchema = new mongoose.Schema({
    symbol: String,
    type: String,
    lots: Number,
    entry: Number,
    pl: Number,
    rr: String,
    account: String,
    date: { type: Date, default: Date.now }
});
const Trade = mongoose.model('Trade', tradeSchema);

// API to Get Trades
app.get('/api/trades', async (req, res) => {
    try {
        const trades = await Trade.find().sort({ _id: -1 });
        res.json(trades);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// API to Add Trade
app.post('/api/trades', async (req, res) => {
    try {
        const newTrade = new Trade(req.body);
        await newTrade.save();
        io.emit('tradeAdded');
        res.status(201).json(newTrade);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
});

// Socket.io Live Price & AI Simulation Ticks
io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    const interval = setInterval(() => {
        const mockPrice = (2425 + Math.random() * 5).toFixed(2);
        socket.emit('priceUpdate', {
            symbol: 'XAUUSD',
            price: mockPrice,
            liquidity: `Buy-side liquidity swept at ${mockPrice}`,
            bos: 'Bullish BOS confirmed',
            fvg: '1H FVG detected at 2421.32'
        });
    }, 3000);

    socket.on('disconnect', () => clearInterval(interval));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
    console.log(`SMC Terminal Server running on port ${PORT}`);
});
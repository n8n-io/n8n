"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BufferedDuplex = exports.writev = void 0;
const readable_stream_1 = require("readable-stream");
const buffer_1 = require("buffer");
function writev(chunks, cb) {
    const buffers = new Array(chunks.length);
    for (let i = 0; i < chunks.length; i++) {
        if (typeof chunks[i].chunk === 'string') {
            buffers[i] = buffer_1.Buffer.from(chunks[i].chunk, 'utf8');
        }
        else {
            buffers[i] = chunks[i].chunk;
        }
    }
    this._write(buffer_1.Buffer.concat(buffers), 'binary', cb);
}
exports.writev = writev;
class BufferedDuplex extends readable_stream_1.Duplex {
    constructor(opts, proxy, socket) {
        super({
            objectMode: true,
        });
        this.proxy = proxy;
        this.socket = socket;
        this.writeQueue = [];
        if (!opts.objectMode) {
            this._writev = writev.bind(this);
        }
        this.isSocketOpen = false;
        this.proxy.on('data', (chunk) => {
            this.push(chunk);
        });
    }
    _read(size) {
        this.proxy.read(size);
    }
    _write(chunk, encoding, cb) {
        if (!this.isSocketOpen) {
            this.writeQueue.push({ chunk, encoding, cb });
        }
        else {
            this.writeToProxy(chunk, encoding, cb);
        }
    }
    _final(callback) {
        this.writeQueue = [];
        this.proxy.end(callback);
    }
    _destroy(err, callback) {
        this.writeQueue = [];
        this.proxy.destroy();
        callback(err);
    }
    socketReady() {
        this.emit('connect');
        this.isSocketOpen = true;
        this.processWriteQueue();
    }
    writeToProxy(chunk, encoding, cb) {
        if (this.proxy.write(chunk, encoding) === false) {
            this.proxy.once('drain', cb);
        }
        else {
            cb();
        }
    }
    processWriteQueue() {
        while (this.writeQueue.length > 0) {
            const { chunk, encoding, cb } = this.writeQueue.shift();
            this.writeToProxy(chunk, encoding, cb);
        }
    }
}
exports.BufferedDuplex = BufferedDuplex;
//# sourceMappingURL=BufferedDuplex.js.map
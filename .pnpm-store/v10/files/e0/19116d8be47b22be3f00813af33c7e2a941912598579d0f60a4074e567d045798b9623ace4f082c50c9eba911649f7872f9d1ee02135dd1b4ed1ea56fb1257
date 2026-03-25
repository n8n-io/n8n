"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.headStream = void 0;
const stream_1 = require("stream");
const headStream_browser_1 = require("./headStream.browser");
const stream_type_check_1 = require("./stream-type-check");
const headStream = (stream, bytes) => {
    if ((0, stream_type_check_1.isReadableStream)(stream)) {
        return (0, headStream_browser_1.headStream)(stream, bytes);
    }
    return new Promise((resolve, reject) => {
        const collector = new Collector();
        collector.limit = bytes;
        stream.pipe(collector);
        stream.on("error", (err) => {
            collector.end();
            reject(err);
        });
        collector.on("error", reject);
        collector.on("finish", function () {
            const bytes = new Uint8Array(Buffer.concat(this.buffers));
            resolve(bytes);
        });
    });
};
exports.headStream = headStream;
class Collector extends stream_1.Writable {
    constructor() {
        super(...arguments);
        this.buffers = [];
        this.limit = Infinity;
        this.bytesBuffered = 0;
    }
    _write(chunk, encoding, callback) {
        var _a;
        this.buffers.push(chunk);
        this.bytesBuffered += (_a = chunk.byteLength) !== null && _a !== void 0 ? _a : 0;
        if (this.bytesBuffered >= this.limit) {
            const excess = this.bytesBuffered - this.limit;
            const tailBuffer = this.buffers[this.buffers.length - 1];
            this.buffers[this.buffers.length - 1] = tailBuffer.subarray(0, tailBuffer.byteLength - excess);
            this.emit("finish");
        }
        callback();
    }
}

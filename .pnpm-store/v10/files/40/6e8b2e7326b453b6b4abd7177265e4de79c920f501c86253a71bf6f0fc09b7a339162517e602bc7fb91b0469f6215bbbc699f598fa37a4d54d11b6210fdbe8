'use strict';

const { Transform } = require('stream');

class ChunkedPassthrough extends Transform {
    constructor(options = {}) {
        let config = {
            readableObjectMode: true,
            writableObjectMode: false
        };
        super(config);
        this.chunkSize = options.chunkSize || 64 * 1024; // 64KB default
        this.buffer = Buffer.alloc(0);
    }

    _transform(chunk, encoding, callback) {
        this.buffer = Buffer.concat([this.buffer, chunk]);

        if (this.buffer.length >= this.chunkSize) {
            this.push(this.buffer);
            this.buffer = Buffer.alloc(0);
        }

        callback();
    }

    _flush(callback) {
        // Send remaining data
        if (this.buffer.length > 0) {
            this.push(this.buffer);
            this.buffer = Buffer.alloc(0);
        }
        callback();
    }
}

module.exports = ChunkedPassthrough;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageEncoderStream = void 0;
class MessageEncoderStream {
    constructor(options) {
        this.options = options;
    }
    [Symbol.asyncIterator]() {
        return this.asyncIterator();
    }
    async *asyncIterator() {
        for await (const msg of this.options.messageStream) {
            const encoded = this.options.encoder.encode(msg);
            yield encoded;
        }
        if (this.options.includeEndFrame) {
            yield new Uint8Array(0);
        }
    }
}
exports.MessageEncoderStream = MessageEncoderStream;

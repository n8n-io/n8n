"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessageDecoderStream = void 0;
class MessageDecoderStream {
    constructor(options) {
        this.options = options;
    }
    [Symbol.asyncIterator]() {
        return this.asyncIterator();
    }
    async *asyncIterator() {
        for await (const bytes of this.options.inputStream) {
            const decoded = this.options.decoder.decode(bytes);
            yield decoded;
        }
    }
}
exports.MessageDecoderStream = MessageDecoderStream;

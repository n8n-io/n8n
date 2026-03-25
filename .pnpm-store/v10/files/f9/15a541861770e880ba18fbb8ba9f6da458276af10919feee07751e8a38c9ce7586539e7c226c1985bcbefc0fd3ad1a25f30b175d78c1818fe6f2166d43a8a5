"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmithyMessageEncoderStream = void 0;
class SmithyMessageEncoderStream {
    constructor(options) {
        this.options = options;
    }
    [Symbol.asyncIterator]() {
        return this.asyncIterator();
    }
    async *asyncIterator() {
        for await (const chunk of this.options.inputStream) {
            const payloadBuf = this.options.serializer(chunk);
            yield payloadBuf;
        }
    }
}
exports.SmithyMessageEncoderStream = SmithyMessageEncoderStream;

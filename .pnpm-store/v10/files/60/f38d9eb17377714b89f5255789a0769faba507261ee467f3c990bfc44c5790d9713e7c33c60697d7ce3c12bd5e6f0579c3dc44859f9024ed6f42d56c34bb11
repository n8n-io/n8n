"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SmithyMessageDecoderStream = void 0;
class SmithyMessageDecoderStream {
    constructor(options) {
        this.options = options;
    }
    [Symbol.asyncIterator]() {
        return this.asyncIterator();
    }
    async *asyncIterator() {
        for await (const message of this.options.messageStream) {
            const deserialized = await this.options.deserializer(message);
            if (deserialized === undefined)
                continue;
            yield deserialized;
        }
    }
}
exports.SmithyMessageDecoderStream = SmithyMessageDecoderStream;

"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.JSONLDecoder = void 0;
const error_1 = require("../../core/error.js");
const shims_1 = require("../shims.js");
const line_1 = require("./line.js");
class JSONLDecoder {
    constructor(iterator, controller) {
        this.iterator = iterator;
        this.controller = controller;
    }
    async *decoder() {
        const lineDecoder = new line_1.LineDecoder();
        for await (const chunk of this.iterator) {
            for (const line of lineDecoder.decode(chunk)) {
                yield JSON.parse(line);
            }
        }
        for (const line of lineDecoder.flush()) {
            yield JSON.parse(line);
        }
    }
    [Symbol.asyncIterator]() {
        return this.decoder();
    }
    static fromResponse(response, controller) {
        if (!response.body) {
            controller.abort();
            if (typeof globalThis.navigator !== 'undefined' &&
                globalThis.navigator.product === 'ReactNative') {
                throw new error_1.AnthropicError(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
            }
            throw new error_1.AnthropicError(`Attempted to iterate over a response with no body`);
        }
        return new JSONLDecoder((0, shims_1.ReadableStreamToAsyncIterable)(response.body), controller);
    }
}
exports.JSONLDecoder = JSONLDecoder;
//# sourceMappingURL=jsonl.js.map
import { AnthropicError } from "../../core/error.mjs";
import { ReadableStreamToAsyncIterable } from "../shims.mjs";
import { LineDecoder } from "./line.mjs";
export class JSONLDecoder {
    constructor(iterator, controller) {
        this.iterator = iterator;
        this.controller = controller;
    }
    async *decoder() {
        const lineDecoder = new LineDecoder();
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
                throw new AnthropicError(`The default react-native fetch implementation does not support streaming. Please use expo/fetch: https://docs.expo.dev/versions/latest/sdk/expo/#expofetch-api`);
            }
            throw new AnthropicError(`Attempted to iterate over a response with no body`);
        }
        return new JSONLDecoder(ReadableStreamToAsyncIterable(response.body), controller);
    }
}
//# sourceMappingURL=jsonl.mjs.map
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChatStream = void 0;
const convertKeys_1 = require("../utils/convertKeys");
/**
 * Implements an async iterable that processes the readable stream of an assistant chat response.
 *
 * This class expects each chunk of data in the stream to begin with `data:` and be followed by a valid chunk of JSON.
 * If a chunk contains malformed JSON, it is skipped, and a debug message is logged.
 *
 * @template Item - The type of items yielded by the iterable.
 */
class ChatStream {
    constructor(stream) {
        this.stream = stream;
    }
    async *[Symbol.asyncIterator]() {
        let buffer = '';
        for await (const chunk of this.stream) {
            buffer += chunk.toString();
            let newlineIndex;
            while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
                const line = buffer.slice(0, newlineIndex).trim();
                buffer = buffer.slice(newlineIndex + 1);
                // each chunk of json should begin with 'data:'
                if (line && line.startsWith('data:')) {
                    const json = line.slice(5).trim();
                    try {
                        const parsedJson = JSON.parse(json);
                        const convertedJson = (0, convertKeys_1.convertKeysToCamelCase)(parsedJson);
                        yield convertedJson;
                    }
                    catch (err) {
                        console.debug(`Skipping malformed JSON:${line}`);
                        continue;
                    }
                }
            }
        }
        if (buffer.trim()) {
            try {
                const parsedJson = JSON.parse(buffer);
                const convertedJson = (0, convertKeys_1.convertKeysToCamelCase)(parsedJson);
                yield convertedJson;
            }
            catch (err) {
                console.debug(`Skipping malformed JSON:${buffer}`);
            }
        }
    }
}
exports.ChatStream = ChatStream;
//# sourceMappingURL=chatStream.js.map
"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.concat = concat;
const stream_1 = require("stream");
const typeGuards_js_1 = require("./typeGuards.js");
async function* streamAsyncIterator() {
    const reader = this.getReader();
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                return;
            }
            yield value;
        }
    }
    finally {
        reader.releaseLock();
    }
}
function makeAsyncIterable(webStream) {
    if (!webStream[Symbol.asyncIterator]) {
        webStream[Symbol.asyncIterator] = streamAsyncIterator.bind(webStream);
    }
    if (!webStream.values) {
        webStream.values = streamAsyncIterator.bind(webStream);
    }
}
function ensureNodeStream(stream) {
    if (stream instanceof ReadableStream) {
        makeAsyncIterable(stream);
        return stream_1.Readable.fromWeb(stream);
    }
    else {
        return stream;
    }
}
function toStream(source) {
    if (source instanceof Uint8Array) {
        return stream_1.Readable.from(Buffer.from(source));
    }
    else if ((0, typeGuards_js_1.isBlob)(source)) {
        return ensureNodeStream(source.stream());
    }
    else {
        return ensureNodeStream(source);
    }
}
/**
 * Utility function that concatenates a set of binary inputs into one combined output.
 *
 * @param sources - array of sources for the concatenation
 * @returns - in Node, a (() =\> NodeJS.ReadableStream) which, when read, produces a concatenation of all the inputs.
 *           In browser, returns a `Blob` representing all the concatenated inputs.
 *
 * @internal
 */
async function concat(sources) {
    return function () {
        const streams = sources.map((x) => (typeof x === "function" ? x() : x)).map(toStream);
        return stream_1.Readable.from((async function* () {
            for (const stream of streams) {
                for await (const chunk of stream) {
                    yield chunk;
                }
            }
        })());
    };
}
//# sourceMappingURL=concat.js.map
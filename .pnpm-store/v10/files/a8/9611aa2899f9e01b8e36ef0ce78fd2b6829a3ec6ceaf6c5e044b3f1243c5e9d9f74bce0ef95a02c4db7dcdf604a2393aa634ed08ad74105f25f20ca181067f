"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.concat = concat;
const tslib_1 = require("tslib");
const stream_1 = require("stream");
const typeGuards_js_1 = require("./typeGuards.js");
function streamAsyncIterator() {
    return tslib_1.__asyncGenerator(this, arguments, function* streamAsyncIterator_1() {
        const reader = this.getReader();
        try {
            while (true) {
                const { done, value } = yield tslib_1.__await(reader.read());
                if (done) {
                    return yield tslib_1.__await(void 0);
                }
                yield yield tslib_1.__await(value);
            }
        }
        finally {
            reader.releaseLock();
        }
    });
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
        return stream_1.Readable.from((function () {
            return tslib_1.__asyncGenerator(this, arguments, function* () {
                var _a, e_1, _b, _c;
                for (const stream of streams) {
                    try {
                        for (var _d = true, stream_2 = (e_1 = void 0, tslib_1.__asyncValues(stream)), stream_2_1; stream_2_1 = yield tslib_1.__await(stream_2.next()), _a = stream_2_1.done, !_a; _d = true) {
                            _c = stream_2_1.value;
                            _d = false;
                            const chunk = _c;
                            yield yield tslib_1.__await(chunk);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (!_d && !_a && (_b = stream_2.return)) yield tslib_1.__await(_b.call(stream_2));
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
            });
        })());
    };
}
//# sourceMappingURL=concat.js.map
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
import { __asyncGenerator, __asyncValues, __await } from "tslib";
import { Readable } from "stream";
import { isBlob } from "./typeGuards.js";
function streamAsyncIterator() {
    return __asyncGenerator(this, arguments, function* streamAsyncIterator_1() {
        const reader = this.getReader();
        try {
            while (true) {
                const { done, value } = yield __await(reader.read());
                if (done) {
                    return yield __await(void 0);
                }
                yield yield __await(value);
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
        return Readable.fromWeb(stream);
    }
    else {
        return stream;
    }
}
function toStream(source) {
    if (source instanceof Uint8Array) {
        return Readable.from(Buffer.from(source));
    }
    else if (isBlob(source)) {
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
export async function concat(sources) {
    return function () {
        const streams = sources.map((x) => (typeof x === "function" ? x() : x)).map(toStream);
        return Readable.from((function () {
            return __asyncGenerator(this, arguments, function* () {
                var _a, e_1, _b, _c;
                for (const stream of streams) {
                    try {
                        for (var _d = true, stream_1 = (e_1 = void 0, __asyncValues(stream)), stream_1_1; stream_1_1 = yield __await(stream_1.next()), _a = stream_1_1.done, !_a; _d = true) {
                            _c = stream_1_1.value;
                            _d = false;
                            const chunk = _c;
                            yield yield __await(chunk);
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (!_d && !_a && (_b = stream_1.return)) yield __await(_b.call(stream_1));
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                }
            });
        })());
    };
}
//# sourceMappingURL=concat.js.map
"use strict";
// from https://raw.githubusercontent.com/openai/openai-node/6f72e7ad3e4e151c9334f4449d1c3555255c2793/src/streaming.ts
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __await = (this && this.__await) || function (v) { return this instanceof __await ? (this.v = v, this) : new __await(v); }
var __asyncGenerator = (this && this.__asyncGenerator) || function (thisArg, _arguments, generator) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var g = generator.apply(thisArg, _arguments || []), i, q = [];
    return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
    function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
    function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
    function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r); }
    function fulfill(value) { resume("next", value); }
    function reject(value) { resume("throw", value); }
    function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.readableStreamAsyncIterable = exports._decodeChunks = exports.LineDecoder = exports._iterSSEMessages = exports.StreamUtils = void 0;
const errors_1 = require("../../errors");
class StreamUtils {
    constructor(iterator, controller) {
        this.iterator = iterator;
        this.controller = controller;
    }
    static fromSSEResponse(response, controller) {
        let consumed = false;
        function iterator() {
            return __asyncGenerator(this, arguments, function* iterator_1() {
                var e_1, _a;
                if (consumed) {
                    throw new Error('Cannot iterate over a consumed stream, use `.tee()` to split the stream.');
                }
                consumed = true;
                let done = false;
                try {
                    try {
                        for (var _b = __asyncValues(_iterSSEMessages(response, controller)), _c; _c = yield __await(_b.next()), !_c.done;) {
                            const sse = _c.value;
                            if (done)
                                continue;
                            if (sse.data.startsWith('[DONE]')) {
                                done = true;
                                continue;
                            }
                            if (sse.event === null) {
                                let data;
                                try {
                                    data = JSON.parse(sse.data);
                                }
                                catch (e) {
                                    console.error(`Could not parse message into JSON:`, sse.data);
                                    console.error(`From chunk:`, sse.raw);
                                    throw e;
                                }
                                if (data && data.error) {
                                    throw new errors_1.CohereError({ message: `Error: ${data.error}` });
                                }
                                yield yield __await(data);
                            }
                            else {
                                let data;
                                try {
                                    data = JSON.parse(sse.data);
                                }
                                catch (e) {
                                    console.error(`Could not parse message into JSON:`, sse.data);
                                    console.error(`From chunk:`, sse.raw);
                                    throw e;
                                }
                                // TODO: Is this where the error should be thrown?
                                if (sse.event == 'error') {
                                    throw new errors_1.CohereError({ message: `Error: ${data.message}, ${data.error}` });
                                }
                                yield yield __await({ event: sse.event, data: data });
                            }
                        }
                    }
                    catch (e_1_1) { e_1 = { error: e_1_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) yield __await(_a.call(_b));
                        }
                        finally { if (e_1) throw e_1.error; }
                    }
                    done = true;
                }
                catch (e) {
                    // If the user calls `stream.controller.abort()`, we should exit without throwing.
                    if (e instanceof Error && e.name === 'AbortError')
                        return yield __await(void 0);
                    throw e;
                }
                finally {
                    // If the user `break`s, abort the ongoing request.
                    if (!done)
                        controller === null || controller === void 0 ? void 0 : controller.abort();
                }
            });
        }
        return new StreamUtils(iterator, controller);
    }
    /**
     * Generates a Stream from a newline-separated ReadableStream
     * where each item is a JSON value.
     */
    static fromReadableStream(readableStream, controller) {
        let consumed = false;
        function iterLines() {
            return __asyncGenerator(this, arguments, function* iterLines_1() {
                var e_2, _a;
                const lineDecoder = new LineDecoder();
                const iter = readableStreamAsyncIterable(readableStream);
                try {
                    for (var iter_1 = __asyncValues(iter), iter_1_1; iter_1_1 = yield __await(iter_1.next()), !iter_1_1.done;) {
                        const chunk = iter_1_1.value;
                        for (const line of lineDecoder.decode(chunk)) {
                            yield yield __await(line);
                        }
                    }
                }
                catch (e_2_1) { e_2 = { error: e_2_1 }; }
                finally {
                    try {
                        if (iter_1_1 && !iter_1_1.done && (_a = iter_1.return)) yield __await(_a.call(iter_1));
                    }
                    finally { if (e_2) throw e_2.error; }
                }
                for (const line of lineDecoder.flush()) {
                    yield yield __await(line);
                }
            });
        }
        function iterator() {
            return __asyncGenerator(this, arguments, function* iterator_2() {
                var e_3, _a;
                if (consumed) {
                    throw new Error('Cannot iterate over a consumed stream, use `.tee()` to split the stream.');
                }
                consumed = true;
                let done = false;
                try {
                    try {
                        for (var _b = __asyncValues(iterLines()), _c; _c = yield __await(_b.next()), !_c.done;) {
                            const line = _c.value;
                            if (done)
                                continue;
                            if (line)
                                yield yield __await(JSON.parse(line));
                        }
                    }
                    catch (e_3_1) { e_3 = { error: e_3_1 }; }
                    finally {
                        try {
                            if (_c && !_c.done && (_a = _b.return)) yield __await(_a.call(_b));
                        }
                        finally { if (e_3) throw e_3.error; }
                    }
                    done = true;
                }
                catch (e) {
                    // If the user calls `stream.controller.abort()`, we should exit without throwing.
                    if (e instanceof Error && e.name === 'AbortError')
                        return yield __await(void 0);
                    throw e;
                }
                finally {
                    // If the user `break`s, abort the ongoing request.
                    if (!done)
                        controller === null || controller === void 0 ? void 0 : controller.abort();
                }
            });
        }
        return new StreamUtils(iterator, controller);
    }
    [Symbol.asyncIterator]() {
        return this.iterator();
    }
    /**
     * Splits the stream into two streams which can be
     * independently read from at different speeds.
     */
    tee() {
        const left = [];
        const right = [];
        const iterator = this.iterator();
        const teeIterator = (queue) => {
            return {
                next: () => {
                    if (queue.length === 0) {
                        const result = iterator.next();
                        left.push(result);
                        right.push(result);
                    }
                    return queue.shift();
                },
            };
        };
        return [
            new StreamUtils(() => teeIterator(left), this.controller),
            new StreamUtils(() => teeIterator(right), this.controller),
        ];
    }
    /**
     * Converts this stream to a newline-separated ReadableStream of
     * JSON stringified values in the stream
     * which can be turned back into a Stream with `Stream.fromReadableStream()`.
     */
    toReadableStream() {
        const self = this;
        let iter;
        const encoder = new TextEncoder();
        return new ReadableStream({
            start() {
                return __awaiter(this, void 0, void 0, function* () {
                    iter = self[Symbol.asyncIterator]();
                });
            },
            pull(ctrl) {
                return __awaiter(this, void 0, void 0, function* () {
                    try {
                        const { value, done } = yield iter.next();
                        if (done)
                            return ctrl.close();
                        const bytes = encoder.encode(JSON.stringify(value) + '\n');
                        ctrl.enqueue(bytes);
                    }
                    catch (err) {
                        ctrl.error(err);
                    }
                });
            },
            cancel() {
                var _a;
                return __awaiter(this, void 0, void 0, function* () {
                    yield ((_a = iter.return) === null || _a === void 0 ? void 0 : _a.call(iter));
                });
            },
        });
    }
}
exports.StreamUtils = StreamUtils;
function _iterSSEMessages(response, controller) {
    return __asyncGenerator(this, arguments, function* _iterSSEMessages_1() {
        var e_4, _a;
        if (!response.body) {
            controller === null || controller === void 0 ? void 0 : controller.abort();
            throw new errors_1.CohereError({ message: `Attempted to iterate over a response with no body` });
        }
        const sseDecoder = new SSEDecoder();
        const lineDecoder = new LineDecoder();
        const iter = readableStreamAsyncIterable(response.body);
        try {
            for (var _b = __asyncValues(iterSSEChunks(iter)), _c; _c = yield __await(_b.next()), !_c.done;) {
                const sseChunk = _c.value;
                for (const line of lineDecoder.decode(sseChunk)) {
                    const sse = sseDecoder.decode(line);
                    if (sse)
                        yield yield __await(sse);
                }
            }
        }
        catch (e_4_1) { e_4 = { error: e_4_1 }; }
        finally {
            try {
                if (_c && !_c.done && (_a = _b.return)) yield __await(_a.call(_b));
            }
            finally { if (e_4) throw e_4.error; }
        }
        for (const line of lineDecoder.flush()) {
            const sse = sseDecoder.decode(line);
            if (sse)
                yield yield __await(sse);
        }
    });
}
exports._iterSSEMessages = _iterSSEMessages;
/**
 * Given an async iterable iterator, iterates over it and yields full
 * SSE chunks, i.e. yields when a double new-line is encountered.
 */
function iterSSEChunks(iterator) {
    return __asyncGenerator(this, arguments, function* iterSSEChunks_1() {
        var e_5, _a;
        let data = new Uint8Array();
        try {
            for (var iterator_3 = __asyncValues(iterator), iterator_3_1; iterator_3_1 = yield __await(iterator_3.next()), !iterator_3_1.done;) {
                const chunk = iterator_3_1.value;
                if (chunk == null) {
                    continue;
                }
                const binaryChunk = chunk instanceof ArrayBuffer ? new Uint8Array(chunk)
                    : typeof chunk === 'string' ? new TextEncoder().encode(chunk)
                        : chunk;
                let newData = new Uint8Array(data.length + binaryChunk.length);
                newData.set(data);
                newData.set(binaryChunk, data.length);
                data = newData;
                let patternIndex;
                while ((patternIndex = findDoubleNewlineIndex(data)) !== -1) {
                    yield yield __await(data.slice(0, patternIndex));
                    data = data.slice(patternIndex);
                }
            }
        }
        catch (e_5_1) { e_5 = { error: e_5_1 }; }
        finally {
            try {
                if (iterator_3_1 && !iterator_3_1.done && (_a = iterator_3.return)) yield __await(_a.call(iterator_3));
            }
            finally { if (e_5) throw e_5.error; }
        }
        if (data.length > 0) {
            yield yield __await(data);
        }
    });
}
function findDoubleNewlineIndex(buffer) {
    // This function searches the buffer for the end patterns (\r\r, \n\n, \r\n\r\n)
    // and returns the index right after the first occurrence of any pattern,
    // or -1 if none of the patterns are found.
    const newline = 0x0a; // \n
    const carriage = 0x0d; // \r
    for (let i = 0; i < buffer.length - 2; i++) {
        if (buffer[i] === newline && buffer[i + 1] === newline) {
            // \n\n
            return i + 2;
        }
        if (buffer[i] === carriage && buffer[i + 1] === carriage) {
            // \r\r
            return i + 2;
        }
        if (buffer[i] === carriage &&
            buffer[i + 1] === newline &&
            i + 3 < buffer.length &&
            buffer[i + 2] === carriage &&
            buffer[i + 3] === newline) {
            // \r\n\r\n
            return i + 4;
        }
    }
    return -1;
}
class SSEDecoder {
    constructor() {
        this.event = null;
        this.data = [];
        this.chunks = [];
    }
    decode(line) {
        if (line.endsWith('\r')) {
            line = line.substring(0, line.length - 1);
        }
        if (!line) {
            // empty line and we didn't previously encounter any messages
            if (!this.event && !this.data.length)
                return null;
            const sse = {
                event: this.event,
                data: this.data.join('\n'),
                raw: this.chunks,
            };
            this.event = null;
            this.data = [];
            this.chunks = [];
            return sse;
        }
        this.chunks.push(line);
        if (line.startsWith(':')) {
            return null;
        }
        let [fieldname, _, value] = partition(line, ':');
        if (value.startsWith(' ')) {
            value = value.substring(1);
        }
        if (fieldname === 'event') {
            this.event = value;
        }
        else if (fieldname === 'data') {
            this.data.push(value);
        }
        return null;
    }
}
/**
 * A re-implementation of httpx's `LineDecoder` in Python that handles incrementally
 * reading lines from text.
 *
 * https://github.com/encode/httpx/blob/920333ea98118e9cf617f246905d7b202510941c/httpx/_decoders.py#L258
 */
class LineDecoder {
    constructor() {
        this.buffer = [];
        this.trailingCR = false;
    }
    decode(chunk) {
        let text = this.decodeText(chunk);
        if (this.trailingCR) {
            text = '\r' + text;
            this.trailingCR = false;
        }
        if (text.endsWith('\r')) {
            this.trailingCR = true;
            text = text.slice(0, -1);
        }
        if (!text) {
            return [];
        }
        const trailingNewline = LineDecoder.NEWLINE_CHARS.has(text[text.length - 1] || '');
        let lines = text.split(LineDecoder.NEWLINE_REGEXP);
        // if there is a trailing new line then the last entry will be an empty
        // string which we don't care about
        if (trailingNewline) {
            lines.pop();
        }
        if (lines.length === 1 && !trailingNewline) {
            this.buffer.push(lines[0]);
            return [];
        }
        if (this.buffer.length > 0) {
            lines = [this.buffer.join('') + lines[0], ...lines.slice(1)];
            this.buffer = [];
        }
        if (!trailingNewline) {
            this.buffer = [lines.pop() || ''];
        }
        return lines;
    }
    decodeText(bytes) {
        var _a;
        if (bytes == null)
            return '';
        if (typeof bytes === 'string')
            return bytes;
        // Node:
        if (typeof Buffer !== 'undefined') {
            if (bytes instanceof Buffer) {
                return bytes.toString();
            }
            if (bytes instanceof Uint8Array) {
                return Buffer.from(bytes).toString();
            }
            throw new errors_1.CohereError({
                message: `Unexpected: received non-Uint8Array (${bytes.constructor.name}) stream chunk in an environment with a global "Buffer" defined, which this library assumes to be Node. Please report this error.`,
            });
        }
        // Browser
        if (typeof TextDecoder !== 'undefined') {
            if (bytes instanceof Uint8Array || bytes instanceof ArrayBuffer) {
                (_a = this.textDecoder) !== null && _a !== void 0 ? _a : (this.textDecoder = new TextDecoder('utf8'));
                return this.textDecoder.decode(bytes);
            }
            throw new errors_1.CohereError({
                message: `Unexpected: received non-Uint8Array/ArrayBuffer (${bytes.constructor.name}) in a web platform. Please report this error.`,
            });
        }
        throw new errors_1.CohereError({
            message: `Unexpected: neither Buffer nor TextDecoder are available as globals. Please report this error.`,
        });
    }
    flush() {
        if (!this.buffer.length && !this.trailingCR) {
            return [];
        }
        const lines = [this.buffer.join('')];
        this.buffer = [];
        this.trailingCR = false;
        return lines;
    }
}
exports.LineDecoder = LineDecoder;
// prettier-ignore
LineDecoder.NEWLINE_CHARS = new Set(['\n', '\r']);
LineDecoder.NEWLINE_REGEXP = /\r\n|[\n\r]/g;
/** This is an internal helper function that's just used for testing */
function _decodeChunks(chunks) {
    const decoder = new LineDecoder();
    const lines = [];
    for (const chunk of chunks) {
        lines.push(...decoder.decode(chunk));
    }
    return lines;
}
exports._decodeChunks = _decodeChunks;
function partition(str, delimiter) {
    const index = str.indexOf(delimiter);
    if (index !== -1) {
        return [str.substring(0, index), delimiter, str.substring(index + delimiter.length)];
    }
    return [str, '', ''];
}
/**
 * Most browsers don't yet have async iterable support for ReadableStream,
 * and Node has a very different way of reading bytes from its "ReadableStream".
 *
 * This polyfill was pulled from https://github.com/MattiasBuelens/web-streams-polyfill/pull/122#issuecomment-1627354490
 */
function readableStreamAsyncIterable(stream) {
    if (stream[Symbol.asyncIterator])
        return stream;
    const reader = stream.getReader();
    return {
        next() {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const result = yield reader.read();
                    if (result === null || result === void 0 ? void 0 : result.done)
                        reader.releaseLock(); // release lock when stream becomes closed
                    return result;
                }
                catch (e) {
                    reader.releaseLock(); // release lock when stream becomes errored
                    throw e;
                }
            });
        },
        return() {
            return __awaiter(this, void 0, void 0, function* () {
                const cancelPromise = reader.cancel();
                reader.releaseLock();
                yield cancelPromise;
                return { done: true, value: undefined };
            });
        },
        [Symbol.asyncIterator]() {
            return this;
        },
    };
}
exports.readableStreamAsyncIterable = readableStreamAsyncIterable;

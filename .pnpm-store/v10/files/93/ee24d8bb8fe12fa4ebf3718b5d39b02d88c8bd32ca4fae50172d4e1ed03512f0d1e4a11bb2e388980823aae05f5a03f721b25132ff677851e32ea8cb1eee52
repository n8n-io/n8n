"use strict";
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
exports.readableStreamAsyncIterable = exports.Stream = void 0;
const runtime_1 = require("../runtime");
const DATA_PREFIX = "data:";
class Stream {
    constructor({ stream, parse, eventShape, signal }) {
        this.controller = new AbortController();
        this.stream = stream;
        this.parse = parse;
        if (eventShape.type === "sse") {
            this.prefix = DATA_PREFIX;
            this.messageTerminator = "\n";
            this.streamTerminator = eventShape.streamTerminator;
        }
        else {
            this.messageTerminator = eventShape.messageTerminator;
        }
        signal === null || signal === void 0 ? void 0 : signal.addEventListener("abort", () => this.controller.abort());
    }
    iterMessages() {
        return __asyncGenerator(this, arguments, function* iterMessages_1() {
            var e_1, _a;
            this.controller.signal;
            const stream = readableStreamAsyncIterable(this.stream);
            let buf = "";
            let prefixSeen = false;
            try {
                for (var stream_1 = __asyncValues(stream), stream_1_1; stream_1_1 = yield __await(stream_1.next()), !stream_1_1.done;) {
                    const chunk = stream_1_1.value;
                    buf += this.decodeChunk(chunk);
                    let terminatorIndex;
                    // Parse the chunk into as many messages as possible
                    while ((terminatorIndex = buf.indexOf(this.messageTerminator)) >= 0) {
                        // Extract the line from the buffer
                        let line = buf.slice(0, terminatorIndex + 1);
                        buf = buf.slice(terminatorIndex + 1);
                        // Skip empty lines
                        if (line.length === 0) {
                            continue;
                        }
                        // Skip the chunk until the prefix is found
                        if (!prefixSeen && this.prefix != null) {
                            const prefixIndex = line.indexOf(this.prefix);
                            if (prefixIndex === -1) {
                                continue;
                            }
                            prefixSeen = true;
                            line = line.slice(prefixIndex + this.prefix.length);
                        }
                        // If the stream terminator is present, return
                        if (this.streamTerminator != null && line.includes(this.streamTerminator)) {
                            return yield __await(void 0);
                        }
                        // Otherwise, yield message from the prefix to the terminator
                        const message = yield __await(this.parse(JSON.parse(line)));
                        yield yield __await(message);
                        prefixSeen = false;
                    }
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (stream_1_1 && !stream_1_1.done && (_a = stream_1.return)) yield __await(_a.call(stream_1));
                }
                finally { if (e_1) throw e_1.error; }
            }
        });
    }
    [Symbol.asyncIterator]() {
        return __asyncGenerator(this, arguments, function* _a() {
            var e_2, _b;
            try {
                for (var _c = __asyncValues(this.iterMessages()), _d; _d = yield __await(_c.next()), !_d.done;) {
                    const message = _d.value;
                    yield yield __await(message);
                }
            }
            catch (e_2_1) { e_2 = { error: e_2_1 }; }
            finally {
                try {
                    if (_d && !_d.done && (_b = _c.return)) yield __await(_b.call(_c));
                }
                finally { if (e_2) throw e_2.error; }
            }
        });
    }
    decodeChunk(chunk) {
        let decoded = "";
        // If TextDecoder is present, use it
        if (typeof TextDecoder !== "undefined") {
            const decoder = new TextDecoder("utf8");
            decoded += decoder.decode(chunk);
        }
        // Buffer is present in Node.js environment
        else if (runtime_1.RUNTIME.type === "node" && typeof chunk != "undefined") {
            decoded += Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
        }
        return decoded;
    }
}
exports.Stream = Stream;
/**
 * Browser polyfill for ReadableStream
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function readableStreamAsyncIterable(stream) {
    if (stream[Symbol.asyncIterator]) {
        return stream;
    }
    const reader = stream.getReader();
    return {
        next() {
            return __awaiter(this, void 0, void 0, function* () {
                try {
                    const result = yield reader.read();
                    if (result === null || result === void 0 ? void 0 : result.done) {
                        reader.releaseLock();
                    } // release lock when stream becomes closed
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

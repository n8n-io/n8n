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
Object.defineProperty(exports, "__esModule", { value: true });
exports.NodePre18StreamWrapper = void 0;
class NodePre18StreamWrapper {
    constructor(readableStream) {
        this.readableStream = readableStream;
    }
    on(event, callback) {
        this.readableStream.on(event, callback);
    }
    off(event, callback) {
        this.readableStream.off(event, callback);
    }
    pipe(dest) {
        this.readableStream.pipe(dest);
        return dest;
    }
    pipeTo(dest) {
        return this.pipe(dest);
    }
    unpipe(dest) {
        if (dest) {
            this.readableStream.unpipe(dest);
        }
        else {
            this.readableStream.unpipe();
        }
    }
    destroy(error) {
        this.readableStream.destroy(error);
    }
    pause() {
        this.readableStream.pause();
    }
    resume() {
        this.readableStream.resume();
    }
    get isPaused() {
        return this.readableStream.isPaused();
    }
    read() {
        return __awaiter(this, void 0, void 0, function* () {
            return new Promise((resolve, reject) => {
                const chunk = this.readableStream.read();
                if (chunk) {
                    resolve(chunk);
                }
                else {
                    this.readableStream.once("readable", () => {
                        const chunk = this.readableStream.read();
                        resolve(chunk);
                    });
                    this.readableStream.once("error", reject);
                }
            });
        });
    }
    setEncoding(encoding) {
        this.readableStream.setEncoding(encoding);
        this.encoding = encoding;
    }
    text() {
        var e_1, _a;
        return __awaiter(this, void 0, void 0, function* () {
            const chunks = [];
            const encoder = new TextEncoder();
            this.readableStream.setEncoding((this.encoding || "utf-8"));
            try {
                for (var _b = __asyncValues(this.readableStream), _c; _c = yield _b.next(), !_c.done;) {
                    const chunk = _c.value;
                    chunks.push(encoder.encode(chunk));
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (_c && !_c.done && (_a = _b.return)) yield _a.call(_b);
                }
                finally { if (e_1) throw e_1.error; }
            }
            const decoder = new TextDecoder(this.encoding || "utf-8");
            return decoder.decode(Buffer.concat(chunks));
        });
    }
    json() {
        return __awaiter(this, void 0, void 0, function* () {
            const text = yield this.text();
            return JSON.parse(text);
        });
    }
    [Symbol.asyncIterator]() {
        const readableStream = this.readableStream;
        const iterator = readableStream[Symbol.asyncIterator]();
        // Create and return an async iterator that yields buffers
        return {
            next() {
                return __awaiter(this, void 0, void 0, function* () {
                    const { value, done } = yield iterator.next();
                    return { value: value, done };
                });
            },
            [Symbol.asyncIterator]() {
                return this;
            },
        };
    }
}
exports.NodePre18StreamWrapper = NodePre18StreamWrapper;

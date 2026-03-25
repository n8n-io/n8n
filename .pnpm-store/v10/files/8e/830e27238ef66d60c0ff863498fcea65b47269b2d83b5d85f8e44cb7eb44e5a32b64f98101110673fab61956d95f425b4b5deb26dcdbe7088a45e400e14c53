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
Object.defineProperty(exports, "__esModule", { value: true });
exports.UndiciStreamWrapper = void 0;
class UndiciStreamWrapper {
    constructor(readableStream) {
        this.readableStream = readableStream;
        this.reader = this.readableStream.getReader();
        this.events = {
            data: [],
            end: [],
            error: [],
            readable: [],
            close: [],
            pause: [],
            resume: [],
        };
        this.paused = false;
        this.resumeCallback = null;
        this.encoding = null;
    }
    on(event, callback) {
        var _a;
        (_a = this.events[event]) === null || _a === void 0 ? void 0 : _a.push(callback);
    }
    off(event, callback) {
        var _a;
        this.events[event] = (_a = this.events[event]) === null || _a === void 0 ? void 0 : _a.filter((cb) => cb !== callback);
    }
    pipe(dest) {
        this.on("data", (chunk) => {
            if (dest instanceof UndiciStreamWrapper) {
                dest._write(chunk);
            }
            else {
                const writer = dest.getWriter();
                writer.write(chunk).then(() => writer.releaseLock());
            }
        });
        this.on("end", () => {
            if (dest instanceof UndiciStreamWrapper) {
                dest._end();
            }
            else {
                const writer = dest.getWriter();
                writer.close();
            }
        });
        this.on("error", (error) => {
            if (dest instanceof UndiciStreamWrapper) {
                dest._error(error);
            }
            else {
                const writer = dest.getWriter();
                writer.abort(error);
            }
        });
        this._startReading();
        return dest;
    }
    pipeTo(dest) {
        return this.pipe(dest);
    }
    unpipe(dest) {
        this.off("data", (chunk) => {
            if (dest instanceof UndiciStreamWrapper) {
                dest._write(chunk);
            }
            else {
                const writer = dest.getWriter();
                writer.write(chunk).then(() => writer.releaseLock());
            }
        });
        this.off("end", () => {
            if (dest instanceof UndiciStreamWrapper) {
                dest._end();
            }
            else {
                const writer = dest.getWriter();
                writer.close();
            }
        });
        this.off("error", (error) => {
            if (dest instanceof UndiciStreamWrapper) {
                dest._error(error);
            }
            else {
                const writer = dest.getWriter();
                writer.abort(error);
            }
        });
    }
    destroy(error) {
        this.reader
            .cancel(error)
            .then(() => {
            this._emit("close");
        })
            .catch((err) => {
            this._emit("error", err);
        });
    }
    pause() {
        this.paused = true;
        this._emit("pause");
    }
    resume() {
        if (this.paused) {
            this.paused = false;
            this._emit("resume");
            if (this.resumeCallback) {
                this.resumeCallback();
                this.resumeCallback = null;
            }
        }
    }
    get isPaused() {
        return this.paused;
    }
    read() {
        return __awaiter(this, void 0, void 0, function* () {
            if (this.paused) {
                yield new Promise((resolve) => {
                    this.resumeCallback = resolve;
                });
            }
            const { done, value } = yield this.reader.read();
            if (done) {
                return undefined;
            }
            return value;
        });
    }
    setEncoding(encoding) {
        this.encoding = encoding;
    }
    text() {
        return __awaiter(this, void 0, void 0, function* () {
            const chunks = [];
            while (true) {
                const { done, value } = yield this.reader.read();
                if (done)
                    break;
                if (value)
                    chunks.push(value);
            }
            const decoder = new TextDecoder(this.encoding || "utf-8");
            return decoder.decode(yield new Blob(chunks).arrayBuffer());
        });
    }
    json() {
        return __awaiter(this, void 0, void 0, function* () {
            const text = yield this.text();
            return JSON.parse(text);
        });
    }
    _write(chunk) {
        this._emit("data", chunk);
    }
    _end() {
        this._emit("end");
    }
    _error(error) {
        this._emit("error", error);
    }
    _emit(event, data) {
        if (this.events[event]) {
            for (const callback of this.events[event] || []) {
                callback(data);
            }
        }
    }
    _startReading() {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                this._emit("readable");
                while (true) {
                    if (this.paused) {
                        yield new Promise((resolve) => {
                            this.resumeCallback = resolve;
                        });
                    }
                    const { done, value } = yield this.reader.read();
                    if (done) {
                        this._emit("end");
                        this._emit("close");
                        break;
                    }
                    if (value) {
                        this._emit("data", value);
                    }
                }
            }
            catch (error) {
                this._emit("error", error);
            }
        });
    }
    [Symbol.asyncIterator]() {
        return {
            next: () => __awaiter(this, void 0, void 0, function* () {
                if (this.paused) {
                    yield new Promise((resolve) => {
                        this.resumeCallback = resolve;
                    });
                }
                const { done, value } = yield this.reader.read();
                if (done) {
                    return { done: true, value: undefined };
                }
                return { done: false, value };
            }),
            [Symbol.asyncIterator]() {
                return this;
            },
        };
    }
}
exports.UndiciStreamWrapper = UndiciStreamWrapper;

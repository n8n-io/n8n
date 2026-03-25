"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _FileFromPath_path, _FileFromPath_start;
Object.defineProperty(exports, "__esModule", { value: true });
exports.fileFromPath = exports.fileFromPathSync = void 0;
const fs_1 = require("fs");
const path_1 = require("path");
const node_domexception_1 = __importDefault(require("node-domexception"));
const File_1 = require("./File");
const isPlainObject_1 = __importDefault(require("./isPlainObject"));
__exportStar(require("./isFile"), exports);
const MESSAGE = "The requested file could not be read, "
    + "typically due to permission problems that have occurred after a reference "
    + "to a file was acquired.";
class FileFromPath {
    constructor(input) {
        _FileFromPath_path.set(this, void 0);
        _FileFromPath_start.set(this, void 0);
        __classPrivateFieldSet(this, _FileFromPath_path, input.path, "f");
        __classPrivateFieldSet(this, _FileFromPath_start, input.start || 0, "f");
        this.name = (0, path_1.basename)(__classPrivateFieldGet(this, _FileFromPath_path, "f"));
        this.size = input.size;
        this.lastModified = input.lastModified;
    }
    slice(start, end) {
        return new FileFromPath({
            path: __classPrivateFieldGet(this, _FileFromPath_path, "f"),
            lastModified: this.lastModified,
            size: end - start,
            start
        });
    }
    async *stream() {
        const { mtimeMs } = await fs_1.promises.stat(__classPrivateFieldGet(this, _FileFromPath_path, "f"));
        if (mtimeMs > this.lastModified) {
            throw new node_domexception_1.default(MESSAGE, "NotReadableError");
        }
        if (this.size) {
            yield* (0, fs_1.createReadStream)(__classPrivateFieldGet(this, _FileFromPath_path, "f"), {
                start: __classPrivateFieldGet(this, _FileFromPath_start, "f"),
                end: __classPrivateFieldGet(this, _FileFromPath_start, "f") + this.size - 1
            });
        }
    }
    get [(_FileFromPath_path = new WeakMap(), _FileFromPath_start = new WeakMap(), Symbol.toStringTag)]() {
        return "File";
    }
}
function createFileFromPath(path, { mtimeMs, size }, filenameOrOptions, options = {}) {
    let filename;
    if ((0, isPlainObject_1.default)(filenameOrOptions)) {
        [options, filename] = [filenameOrOptions, undefined];
    }
    else {
        filename = filenameOrOptions;
    }
    const file = new FileFromPath({ path, size, lastModified: mtimeMs });
    if (!filename) {
        filename = file.name;
    }
    return new File_1.File([file], filename, {
        ...options, lastModified: file.lastModified
    });
}
function fileFromPathSync(path, filenameOrOptions, options = {}) {
    const stats = (0, fs_1.statSync)(path);
    return createFileFromPath(path, stats, filenameOrOptions, options);
}
exports.fileFromPathSync = fileFromPathSync;
async function fileFromPath(path, filenameOrOptions, options) {
    const stats = await fs_1.promises.stat(path);
    return createFileFromPath(path, stats, filenameOrOptions, options);
}
exports.fileFromPath = fileFromPath;

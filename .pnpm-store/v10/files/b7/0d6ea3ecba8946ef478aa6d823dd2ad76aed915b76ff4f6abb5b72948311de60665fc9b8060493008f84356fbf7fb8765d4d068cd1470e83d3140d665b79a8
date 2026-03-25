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
var _FileFromPath_path, _FileFromPath_start;
import { statSync, createReadStream, promises as fs } from "fs";
import { basename } from "path";
import DOMException from "node-domexception";
import { File } from "./File.js";
import isPlainObject from "./isPlainObject.js";
export * from "./isFile.js";
const MESSAGE = "The requested file could not be read, "
    + "typically due to permission problems that have occurred after a reference "
    + "to a file was acquired.";
class FileFromPath {
    constructor(input) {
        _FileFromPath_path.set(this, void 0);
        _FileFromPath_start.set(this, void 0);
        __classPrivateFieldSet(this, _FileFromPath_path, input.path, "f");
        __classPrivateFieldSet(this, _FileFromPath_start, input.start || 0, "f");
        this.name = basename(__classPrivateFieldGet(this, _FileFromPath_path, "f"));
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
        const { mtimeMs } = await fs.stat(__classPrivateFieldGet(this, _FileFromPath_path, "f"));
        if (mtimeMs > this.lastModified) {
            throw new DOMException(MESSAGE, "NotReadableError");
        }
        if (this.size) {
            yield* createReadStream(__classPrivateFieldGet(this, _FileFromPath_path, "f"), {
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
    if (isPlainObject(filenameOrOptions)) {
        [options, filename] = [filenameOrOptions, undefined];
    }
    else {
        filename = filenameOrOptions;
    }
    const file = new FileFromPath({ path, size, lastModified: mtimeMs });
    if (!filename) {
        filename = file.name;
    }
    return new File([file], filename, {
        ...options, lastModified: file.lastModified
    });
}
export function fileFromPathSync(path, filenameOrOptions, options = {}) {
    const stats = statSync(path);
    return createFileFromPath(path, stats, filenameOrOptions, options);
}
export async function fileFromPath(path, filenameOrOptions, options) {
    const stats = await fs.stat(path);
    return createFileFromPath(path, stats, filenameOrOptions, options);
}

import { Errno, ErrnoError } from '../internal/error.js';
import { basename } from './path.js';
import { readdir } from './promises.js';
import { readdirSync } from './sync.js';
export class Dirent {
    get name() {
        return basename(this.path);
    }
    constructor(path, stats) {
        this.path = path;
        this.stats = stats;
    }
    get parentPath() {
        return this.path;
    }
    isFile() {
        return this.stats.isFile();
    }
    isDirectory() {
        return this.stats.isDirectory();
    }
    isBlockDevice() {
        return this.stats.isBlockDevice();
    }
    isCharacterDevice() {
        return this.stats.isCharacterDevice();
    }
    isSymbolicLink() {
        return this.stats.isSymbolicLink();
    }
    isFIFO() {
        return this.stats.isFIFO();
    }
    isSocket() {
        return this.stats.isSocket();
    }
}
/**
 * A class representing a directory stream.
 */
export class Dir {
    checkClosed() {
        if (this.closed) {
            throw new ErrnoError(Errno.EBADF, 'Can not use closed Dir');
        }
    }
    constructor(path, context) {
        this.path = path;
        this.context = context;
        this.closed = false;
    }
    close(cb) {
        this.closed = true;
        if (!cb) {
            return Promise.resolve();
        }
        cb();
    }
    /**
     * Synchronously close the directory's underlying resource handle.
     * Subsequent reads will result in errors.
     */
    closeSync() {
        this.closed = true;
    }
    async _read() {
        var _a, _b;
        this.checkClosed();
        (_a = this._entries) !== null && _a !== void 0 ? _a : (this._entries = await readdir.call(this.context, this.path, {
            withFileTypes: true,
        }));
        if (!this._entries.length)
            return null;
        return (_b = this._entries.shift()) !== null && _b !== void 0 ? _b : null;
    }
    read(cb) {
        if (!cb) {
            return this._read();
        }
        void this._read().then(value => cb(undefined, value));
    }
    /**
     * Synchronously read the next directory entry via `readdir(3)` as a `Dirent`.
     * If there are no more directory entries to read, null will be returned.
     * Directory entries returned by this function are in no particular order as provided by the operating system's underlying directory mechanisms.
     */
    readSync() {
        var _a, _b;
        this.checkClosed();
        (_a = this._entries) !== null && _a !== void 0 ? _a : (this._entries = readdirSync.call(this.context, this.path, { withFileTypes: true }));
        if (!this._entries.length)
            return null;
        return (_b = this._entries.shift()) !== null && _b !== void 0 ? _b : null;
    }
    async next() {
        const value = await this._read();
        if (value) {
            return { done: false, value };
        }
        await this.close();
        return { done: true, value: undefined };
    }
    /**
     * Asynchronously iterates over the directory via `readdir(3)` until all entries have been read.
     */
    [Symbol.asyncIterator]() {
        return this;
    }
    [Symbol.asyncDispose]() {
        return Promise.resolve();
    }
}

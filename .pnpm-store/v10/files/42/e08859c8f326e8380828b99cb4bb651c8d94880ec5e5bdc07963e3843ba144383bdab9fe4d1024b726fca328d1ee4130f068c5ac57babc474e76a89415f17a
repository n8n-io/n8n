var __addDisposableResource = (this && this.__addDisposableResource) || function (env, value, async) {
    if (value !== null && value !== void 0) {
        if (typeof value !== "object" && typeof value !== "function") throw new TypeError("Object expected.");
        var dispose, inner;
        if (async) {
            if (!Symbol.asyncDispose) throw new TypeError("Symbol.asyncDispose is not defined.");
            dispose = value[Symbol.asyncDispose];
        }
        if (dispose === void 0) {
            if (!Symbol.dispose) throw new TypeError("Symbol.dispose is not defined.");
            dispose = value[Symbol.dispose];
            if (async) inner = dispose;
        }
        if (typeof dispose !== "function") throw new TypeError("Object not disposable.");
        if (inner) dispose = function() { try { inner.call(this); } catch (e) { return Promise.reject(e); } };
        env.stack.push({ value: value, dispose: dispose, async: async });
    }
    else if (async) {
        env.stack.push({ async: true });
    }
    return value;
};
var __disposeResources = (this && this.__disposeResources) || (function (SuppressedError) {
    return function (env) {
        function fail(e) {
            env.error = env.hasError ? new SuppressedError(e, env.error, "An error was suppressed during disposal.") : e;
            env.hasError = true;
        }
        var r, s = 0;
        function next() {
            while (r = env.stack.pop()) {
                try {
                    if (!r.async && s === 1) return s = 0, env.stack.push(r), Promise.resolve().then(next);
                    if (r.dispose) {
                        var result = r.dispose.call(r.value);
                        if (r.async) return s |= 2, Promise.resolve(result).then(next, function(e) { fail(e); return next(); });
                    }
                    else s |= 1;
                }
                catch (e) {
                    fail(e);
                }
            }
            if (s === 1) return env.hasError ? Promise.reject(env.error) : Promise.resolve();
            if (env.hasError) throw env.error;
        }
        return next();
    };
})(typeof SuppressedError === "function" ? SuppressedError : function (error, suppressed, message) {
    var e = new Error(message);
    return e.name = "SuppressedError", e.error = error, e.suppressed = suppressed, e;
});
import { canary } from 'utilium';
import { Errno, ErrnoError } from '../internal/error.js';
import { LazyFile } from '../internal/file.js';
import { FileSystem } from '../internal/filesystem.js';
import { debug, err, warn } from '../internal/log.js';
import { dirname, join } from '../vfs/path.js';
import { EventEmitter } from 'eventemitter3';
import { resolveMountConfig } from '../config.js';
const journalOperations = ['delete'];
/** Because TS doesn't work right w/o it */
function isJournalOp(op) {
    return journalOperations.includes(op);
}
const maxOpLength = Math.max(...journalOperations.map(op => op.length));
const journalMagicString = '#journal@v0\n';
/**
 * Tracks various operations for the CoW backend
 * @internal
 */
export class Journal extends EventEmitter {
    constructor() {
        super(...arguments);
        this.entries = [];
    }
    toString() {
        return journalMagicString + this.entries.map(entry => `${entry.op.padEnd(maxOpLength)} ${entry.path}`).join('\n');
    }
    /**
     * Parse a journal from a string
     */
    fromString(value) {
        if (!value.startsWith(journalMagicString))
            throw err(new ErrnoError(Errno.EINVAL, 'Invalid journal contents, refusing to parse'));
        for (const line of value.split('\n')) {
            if (line.startsWith('#'))
                continue; // ignore comments
            const [op, path] = line.split(/\s+/);
            if (!isJournalOp(op)) {
                warn('Unknown operation in journal (skipping): ' + op);
                continue;
            }
            this.entries.push({ op, path });
        }
        return this;
    }
    add(op, path) {
        this.entries.push({ op, path });
        this.emit('update', op, path);
        this.emit(op, path);
    }
    has(op, path) {
        const test = JSON.stringify({ op, path });
        for (const entry of this.entries)
            if (JSON.stringify(entry) === test)
                return true;
        return false;
    }
    isDeleted(path) {
        let deleted = false;
        for (const entry of this.entries) {
            if (entry.path != path)
                continue;
            switch (entry.op) {
                case 'delete':
                    deleted = true;
            }
        }
        return deleted;
    }
}
/**
 * Using a readable file system as a base, writes are done to a writable file system.
 * @internal
 */
export class CopyOnWriteFS extends FileSystem {
    async ready() {
        await this.readable.ready();
        await this.writable.ready();
    }
    constructor(
    /** The file system that initially populates this file system. */
    readable, 
    /** The file system to write modified files to. */
    writable, 
    /** The journal to use for persisting deletions */
    journal = new Journal()) {
        super(0x62756c6c, readable.name);
        this.readable = readable;
        this.writable = writable;
        this.journal = journal;
        if (writable.attributes.has('no_write')) {
            throw err(new ErrnoError(Errno.EINVAL, 'Writable file system can not be written to'));
        }
        readable.attributes.set('no_write');
    }
    isDeleted(path) {
        return this.journal.isDeleted(path);
    }
    /**
     * @todo Consider trying to track information on the writable as well
     */
    usage() {
        return this.readable.usage();
    }
    async sync(path, data, stats) {
        await this.copyForWrite(path);
        await this.writable.sync(path, data, stats);
    }
    syncSync(path, data, stats) {
        this.copyForWriteSync(path);
        this.writable.syncSync(path, data, stats);
    }
    async read(path, buffer, offset, end) {
        return (await this.writable.exists(path))
            ? await this.writable.read(path, buffer, offset, end)
            : await this.readable.read(path, buffer, offset, end);
    }
    readSync(path, buffer, offset, end) {
        return this.writable.existsSync(path) ? this.writable.readSync(path, buffer, offset, end) : this.readable.readSync(path, buffer, offset, end);
    }
    async write(path, buffer, offset) {
        await this.copyForWrite(path);
        return await this.writable.write(path, buffer, offset);
    }
    writeSync(path, buffer, offset) {
        this.copyForWriteSync(path);
        return this.writable.writeSync(path, buffer, offset);
    }
    async rename(oldPath, newPath) {
        await this.copyForWrite(oldPath);
        try {
            await this.writable.rename(oldPath, newPath);
        }
        catch {
            if (this.isDeleted(oldPath)) {
                throw ErrnoError.With('ENOENT', oldPath, 'rename');
            }
        }
    }
    renameSync(oldPath, newPath) {
        this.copyForWriteSync(oldPath);
        try {
            this.writable.renameSync(oldPath, newPath);
        }
        catch {
            if (this.isDeleted(oldPath)) {
                throw ErrnoError.With('ENOENT', oldPath, 'rename');
            }
        }
    }
    async stat(path) {
        try {
            return await this.writable.stat(path);
        }
        catch {
            if (this.isDeleted(path))
                throw ErrnoError.With('ENOENT', path, 'stat');
            const oldStat = await this.readable.stat(path);
            // Make the oldStat's mode writable.
            oldStat.mode |= 0o222;
            return oldStat;
        }
    }
    statSync(path) {
        try {
            return this.writable.statSync(path);
        }
        catch {
            if (this.isDeleted(path))
                throw ErrnoError.With('ENOENT', path, 'stat');
            const oldStat = this.readable.statSync(path);
            // Make the oldStat's mode writable.
            oldStat.mode |= 0o222;
            return oldStat;
        }
    }
    async openFile(path, flag) {
        if (await this.writable.exists(path)) {
            return this.writable.openFile(path, flag);
        }
        const stats = await this.readable.stat(path);
        return new LazyFile(this, path, flag, stats);
    }
    openFileSync(path, flag) {
        if (this.writable.existsSync(path)) {
            return this.writable.openFileSync(path, flag);
        }
        const stats = this.readable.statSync(path);
        return new LazyFile(this, path, flag, stats);
    }
    async createFile(path, flag, mode, options) {
        await this.writable.createFile(path, flag, mode, options);
        return this.openFile(path, flag);
    }
    createFileSync(path, flag, mode, options) {
        this.writable.createFileSync(path, flag, mode, options);
        return this.openFileSync(path, flag);
    }
    async link(srcpath, dstpath) {
        await this.copyForWrite(srcpath);
        await this.writable.link(srcpath, dstpath);
    }
    linkSync(srcpath, dstpath) {
        this.copyForWriteSync(srcpath);
        this.writable.linkSync(srcpath, dstpath);
    }
    async unlink(path) {
        if (!(await this.exists(path))) {
            throw ErrnoError.With('ENOENT', path, 'unlink');
        }
        if (await this.writable.exists(path)) {
            await this.writable.unlink(path);
        }
        // if it still exists add to the delete log
        if (await this.exists(path)) {
            this.journal.add('delete', path);
        }
    }
    unlinkSync(path) {
        if (!this.existsSync(path))
            throw ErrnoError.With('ENOENT', path, 'unlink');
        if (this.writable.existsSync(path)) {
            this.writable.unlinkSync(path);
        }
        // if it still exists add to the delete log
        if (this.existsSync(path)) {
            this.journal.add('delete', path);
        }
    }
    async rmdir(path) {
        if (!(await this.exists(path))) {
            throw ErrnoError.With('ENOENT', path, 'rmdir');
        }
        if (await this.writable.exists(path)) {
            await this.writable.rmdir(path);
        }
        if (!(await this.exists(path))) {
            return;
        }
        // Check if directory is empty.
        if ((await this.readdir(path)).length) {
            throw ErrnoError.With('ENOTEMPTY', path, 'rmdir');
        }
        this.journal.add('delete', path);
    }
    rmdirSync(path) {
        if (!this.existsSync(path)) {
            throw ErrnoError.With('ENOENT', path, 'rmdir');
        }
        if (this.writable.existsSync(path)) {
            this.writable.rmdirSync(path);
        }
        if (!this.existsSync(path)) {
            return;
        }
        // Check if directory is empty.
        if (this.readdirSync(path).length) {
            throw ErrnoError.With('ENOTEMPTY', path, 'rmdir');
        }
        this.journal.add('delete', path);
    }
    async mkdir(path, mode, options) {
        if (await this.exists(path))
            throw ErrnoError.With('EEXIST', path, 'mkdir');
        await this.createParentDirectories(path);
        await this.writable.mkdir(path, mode, options);
    }
    mkdirSync(path, mode, options) {
        if (this.existsSync(path))
            throw ErrnoError.With('EEXIST', path, 'mkdir');
        this.createParentDirectoriesSync(path);
        this.writable.mkdirSync(path, mode, options);
    }
    async readdir(path) {
        if (this.isDeleted(path) || !(await this.exists(path)))
            throw ErrnoError.With('ENOENT', path, 'readdir');
        const entries = (await this.readable.exists(path)) ? await this.readable.readdir(path) : [];
        if (await this.writable.exists(path))
            for (const entry of await this.writable.readdir(path)) {
                if (!entries.includes(entry))
                    entries.push(entry);
            }
        return entries.filter(entry => !this.isDeleted(join(path, entry)));
    }
    readdirSync(path) {
        if (this.isDeleted(path) || !this.existsSync(path))
            throw ErrnoError.With('ENOENT', path, 'readdir');
        const entries = this.readable.existsSync(path) ? this.readable.readdirSync(path) : [];
        if (this.writable.existsSync(path))
            for (const entry of this.writable.readdirSync(path)) {
                if (!entries.includes(entry))
                    entries.push(entry);
            }
        return entries.filter(entry => !this.isDeleted(join(path, entry)));
    }
    streamRead(path, options) {
        return this.writable.existsSync(path) ? this.writable.streamRead(path, options) : this.readable.streamRead(path, options);
    }
    streamWrite(path, options) {
        this.copyForWriteSync(path);
        return this.writable.streamWrite(path, options);
    }
    /**
     * Create the needed parent directories on the writable storage should they not exist.
     * Use modes from the read-only storage.
     */
    createParentDirectoriesSync(path) {
        const toCreate = [];
        const silence = canary(ErrnoError.With('EDEADLK', path));
        for (let parent = dirname(path); !this.writable.existsSync(parent); parent = dirname(parent)) {
            toCreate.push(parent);
        }
        silence();
        if (toCreate.length)
            debug('COW: Creating parent directories: ' + toCreate.join(', '));
        for (const path of toCreate.reverse()) {
            const { uid, gid, mode } = this.statSync(path);
            this.writable.mkdirSync(path, mode, { uid, gid });
        }
    }
    /**
     * Create the needed parent directories on the writable storage should they not exist.
     * Use modes from the read-only storage.
     */
    async createParentDirectories(path) {
        const toCreate = [];
        const silence = canary(ErrnoError.With('EDEADLK', path));
        for (let parent = dirname(path); !(await this.writable.exists(parent)); parent = dirname(parent)) {
            toCreate.push(parent);
        }
        silence();
        if (toCreate.length)
            debug('COW: Creating parent directories: ' + toCreate.join(', '));
        for (const path of toCreate.reverse()) {
            const { uid, gid, mode } = await this.stat(path);
            await this.writable.mkdir(path, mode, { uid, gid });
        }
    }
    /**
     * Helper function:
     * - Ensures p is on writable before proceeding. Throws an error if it doesn't exist.
     * - Calls f to perform operation on writable.
     */
    copyForWriteSync(path) {
        if (!this.existsSync(path)) {
            throw ErrnoError.With('ENOENT', path, '[copyForWrite]');
        }
        if (!this.writable.existsSync(dirname(path))) {
            this.createParentDirectoriesSync(path);
        }
        if (!this.writable.existsSync(path)) {
            this.copyToWritableSync(path);
        }
    }
    async copyForWrite(path) {
        if (!(await this.exists(path))) {
            throw ErrnoError.With('ENOENT', path, '[copyForWrite]');
        }
        if (!(await this.writable.exists(dirname(path)))) {
            await this.createParentDirectories(path);
        }
        if (!(await this.writable.exists(path))) {
            return this.copyToWritable(path);
        }
    }
    /**
     * Copy from readable to writable storage.
     * PRECONDITION: File does not exist on writable storage.
     */
    copyToWritableSync(path) {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
            const stats = this.statSync(path);
            stats.mode |= 0o222;
            if (stats.isDirectory()) {
                this.writable.mkdirSync(path, stats.mode, stats);
                for (const k of this.readable.readdirSync(path)) {
                    this.copyToWritableSync(join(path, k));
                }
                return;
            }
            const data = new Uint8Array(stats.size);
            const readable = __addDisposableResource(env_1, this.readable.openFileSync(path, 'r'), false);
            readable.readSync(data);
            const writable = __addDisposableResource(env_1, this.writable.createFileSync(path, 'w', stats.mode, stats), false);
            writable.writeSync(data);
        }
        catch (e_1) {
            env_1.error = e_1;
            env_1.hasError = true;
        }
        finally {
            __disposeResources(env_1);
        }
    }
    async copyToWritable(path) {
        const env_2 = { stack: [], error: void 0, hasError: false };
        try {
            const stats = await this.stat(path);
            stats.mode |= 0o222;
            if (stats.isDirectory()) {
                await this.writable.mkdir(path, stats.mode, stats);
                for (const k of await this.readable.readdir(path)) {
                    await this.copyToWritable(join(path, k));
                }
                return;
            }
            const data = new Uint8Array(stats.size);
            await this.readable.read(path, data, 0, stats.size);
            const writable = __addDisposableResource(env_2, await this.writable.createFile(path, 'w', stats.mode, stats), true);
            await writable.write(data);
        }
        catch (e_2) {
            env_2.error = e_2;
            env_2.hasError = true;
        }
        finally {
            const result_1 = __disposeResources(env_2);
            if (result_1)
                await result_1;
        }
    }
}
/**
 * @hidden @deprecated use `CopyOnWriteFS`
 */
export class OverlayFS extends CopyOnWriteFS {
}
const _CopyOnWrite = {
    name: 'CopyOnWrite',
    options: {
        writable: { type: 'object', required: true },
        readable: { type: 'object', required: true },
        journal: { type: 'object', required: false },
    },
    async create(options) {
        const readable = await resolveMountConfig(options.readable);
        const writable = await resolveMountConfig(options.writable);
        return new CopyOnWriteFS(readable, writable, options.journal);
    },
};
/**
 * Overlay makes a read-only filesystem writable by storing writes on a second, writable file system.
 * Deletes are persisted via metadata stored on the writable file system.
 * @category Backends and Configuration
 * @internal
 */
export const CopyOnWrite = _CopyOnWrite;
/**
 * @deprecated Use `CopyOnWrite`
 * @category Backends and Configuration
 * @internal @hidden
 */
export const Overlay = _CopyOnWrite;

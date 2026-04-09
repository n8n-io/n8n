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
import { ErrnoError } from '../internal/error.js';
import { err } from '../internal/log.js';
import '../polyfills.js';
/**
 * @category Internals
 * @internal
 */
export class MutexLock {
    get isLocked() {
        return this._isLocked;
    }
    constructor(previous) {
        this.previous = previous;
        this.current = Promise.withResolvers();
        this._isLocked = true;
    }
    async done() {
        var _a;
        await ((_a = this.previous) === null || _a === void 0 ? void 0 : _a.done());
        await this.current.promise;
    }
    unlock() {
        this.current.resolve();
        this._isLocked = false;
    }
    [Symbol.dispose]() {
        this.unlock();
    }
}
/**
 * @hidden
 * @category Internals
 */
export class _MutexedFS {
    get id() {
        return this._fs.id;
    }
    get name() {
        return this._fs.name;
    }
    get label() {
        return this._fs.label;
    }
    set label(value) {
        this._fs.label = value;
    }
    get attributes() {
        return this._fs.attributes;
    }
    async ready() {
        return await this._fs.ready();
    }
    usage() {
        return this._fs.usage();
    }
    metadata() {
        return this._fs.metadata();
    }
    /**
     * Adds a lock for a path
     */
    addLock() {
        const lock = new MutexLock(this.currentLock);
        this.currentLock = lock;
        return lock;
    }
    /**
     * Locks `path` asynchronously.
     * If the path is currently locked, waits for it to be unlocked.
     * @internal
     */
    async lock(path, syscall) {
        const previous = this.currentLock;
        const lock = this.addLock();
        const stack = new Error().stack;
        setTimeout(() => {
            if (lock.isLocked) {
                const error = ErrnoError.With('EDEADLK', path, syscall);
                error.stack += stack === null || stack === void 0 ? void 0 : stack.slice('Error'.length);
                throw err(error, { fs: this });
            }
        }, 5000);
        await (previous === null || previous === void 0 ? void 0 : previous.done());
        return lock;
    }
    /**
     * Locks `path` asynchronously.
     * If the path is currently locked, an error will be thrown
     * @internal
     */
    lockSync(path, syscall) {
        var _a;
        if ((_a = this.currentLock) === null || _a === void 0 ? void 0 : _a.isLocked) {
            throw err(ErrnoError.With('EBUSY', path, syscall), { fs: this });
        }
        return this.addLock();
    }
    /**
     * Whether `path` is locked
     * @internal
     */
    get isLocked() {
        var _a;
        return !!((_a = this.currentLock) === null || _a === void 0 ? void 0 : _a.isLocked);
    }
    /* eslint-disable @typescript-eslint/no-unused-vars */
    async rename(oldPath, newPath) {
        const env_1 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_1, await this.lock(oldPath, 'rename'), false);
            await this._fs.rename(oldPath, newPath);
        }
        catch (e_1) {
            env_1.error = e_1;
            env_1.hasError = true;
        }
        finally {
            __disposeResources(env_1);
        }
    }
    renameSync(oldPath, newPath) {
        const env_2 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_2, this.lockSync(oldPath, 'rename'), false);
            return this._fs.renameSync(oldPath, newPath);
        }
        catch (e_2) {
            env_2.error = e_2;
            env_2.hasError = true;
        }
        finally {
            __disposeResources(env_2);
        }
    }
    async stat(path) {
        const env_3 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_3, await this.lock(path, 'stat'), false);
            return await this._fs.stat(path);
        }
        catch (e_3) {
            env_3.error = e_3;
            env_3.hasError = true;
        }
        finally {
            __disposeResources(env_3);
        }
    }
    statSync(path) {
        const env_4 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_4, this.lockSync(path, 'stat'), false);
            return this._fs.statSync(path);
        }
        catch (e_4) {
            env_4.error = e_4;
            env_4.hasError = true;
        }
        finally {
            __disposeResources(env_4);
        }
    }
    async openFile(path, flag) {
        const env_5 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_5, await this.lock(path, 'openFile'), false);
            const file = await this._fs.openFile(path, flag);
            file.fs = this;
            return file;
        }
        catch (e_5) {
            env_5.error = e_5;
            env_5.hasError = true;
        }
        finally {
            __disposeResources(env_5);
        }
    }
    openFileSync(path, flag) {
        const env_6 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_6, this.lockSync(path, 'openFile'), false);
            const file = this._fs.openFileSync(path, flag);
            file.fs = this;
            return file;
        }
        catch (e_6) {
            env_6.error = e_6;
            env_6.hasError = true;
        }
        finally {
            __disposeResources(env_6);
        }
    }
    async createFile(path, flag, mode, options) {
        const env_7 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_7, await this.lock(path, 'createFile'), false);
            const file = await this._fs.createFile(path, flag, mode, options);
            file.fs = this;
            return file;
        }
        catch (e_7) {
            env_7.error = e_7;
            env_7.hasError = true;
        }
        finally {
            __disposeResources(env_7);
        }
    }
    createFileSync(path, flag, mode, options) {
        const env_8 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_8, this.lockSync(path, 'createFile'), false);
            const file = this._fs.createFileSync(path, flag, mode, options);
            file.fs = this;
            return file;
        }
        catch (e_8) {
            env_8.error = e_8;
            env_8.hasError = true;
        }
        finally {
            __disposeResources(env_8);
        }
    }
    async unlink(path) {
        const env_9 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_9, await this.lock(path, 'unlink'), false);
            await this._fs.unlink(path);
        }
        catch (e_9) {
            env_9.error = e_9;
            env_9.hasError = true;
        }
        finally {
            __disposeResources(env_9);
        }
    }
    unlinkSync(path) {
        const env_10 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_10, this.lockSync(path, 'unlink'), false);
            return this._fs.unlinkSync(path);
        }
        catch (e_10) {
            env_10.error = e_10;
            env_10.hasError = true;
        }
        finally {
            __disposeResources(env_10);
        }
    }
    async rmdir(path) {
        const env_11 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_11, await this.lock(path, 'rmdir'), false);
            await this._fs.rmdir(path);
        }
        catch (e_11) {
            env_11.error = e_11;
            env_11.hasError = true;
        }
        finally {
            __disposeResources(env_11);
        }
    }
    rmdirSync(path) {
        const env_12 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_12, this.lockSync(path, 'rmdir'), false);
            return this._fs.rmdirSync(path);
        }
        catch (e_12) {
            env_12.error = e_12;
            env_12.hasError = true;
        }
        finally {
            __disposeResources(env_12);
        }
    }
    async mkdir(path, mode, options) {
        const env_13 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_13, await this.lock(path, 'mkdir'), false);
            await this._fs.mkdir(path, mode, options);
        }
        catch (e_13) {
            env_13.error = e_13;
            env_13.hasError = true;
        }
        finally {
            __disposeResources(env_13);
        }
    }
    mkdirSync(path, mode, options) {
        const env_14 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_14, this.lockSync(path, 'mkdir'), false);
            return this._fs.mkdirSync(path, mode, options);
        }
        catch (e_14) {
            env_14.error = e_14;
            env_14.hasError = true;
        }
        finally {
            __disposeResources(env_14);
        }
    }
    async readdir(path) {
        const env_15 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_15, await this.lock(path, 'readdir'), false);
            return await this._fs.readdir(path);
        }
        catch (e_15) {
            env_15.error = e_15;
            env_15.hasError = true;
        }
        finally {
            __disposeResources(env_15);
        }
    }
    readdirSync(path) {
        const env_16 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_16, this.lockSync(path, 'readdir'), false);
            return this._fs.readdirSync(path);
        }
        catch (e_16) {
            env_16.error = e_16;
            env_16.hasError = true;
        }
        finally {
            __disposeResources(env_16);
        }
    }
    async exists(path) {
        const env_17 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_17, await this.lock(path, 'exists'), false);
            return await this._fs.exists(path);
        }
        catch (e_17) {
            env_17.error = e_17;
            env_17.hasError = true;
        }
        finally {
            __disposeResources(env_17);
        }
    }
    existsSync(path) {
        const env_18 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_18, this.lockSync(path, 'exists'), false);
            return this._fs.existsSync(path);
        }
        catch (e_18) {
            env_18.error = e_18;
            env_18.hasError = true;
        }
        finally {
            __disposeResources(env_18);
        }
    }
    async link(srcpath, dstpath) {
        const env_19 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_19, await this.lock(srcpath, 'link'), false);
            await this._fs.link(srcpath, dstpath);
        }
        catch (e_19) {
            env_19.error = e_19;
            env_19.hasError = true;
        }
        finally {
            __disposeResources(env_19);
        }
    }
    linkSync(srcpath, dstpath) {
        const env_20 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_20, this.lockSync(srcpath, 'link'), false);
            return this._fs.linkSync(srcpath, dstpath);
        }
        catch (e_20) {
            env_20.error = e_20;
            env_20.hasError = true;
        }
        finally {
            __disposeResources(env_20);
        }
    }
    async sync(path, data, stats) {
        const env_21 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_21, await this.lock(path, 'sync'), false);
            await this._fs.sync(path, data, stats);
        }
        catch (e_21) {
            env_21.error = e_21;
            env_21.hasError = true;
        }
        finally {
            __disposeResources(env_21);
        }
    }
    syncSync(path, data, stats) {
        const env_22 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_22, this.lockSync(path, 'sync'), false);
            return this._fs.syncSync(path, data, stats);
        }
        catch (e_22) {
            env_22.error = e_22;
            env_22.hasError = true;
        }
        finally {
            __disposeResources(env_22);
        }
    }
    async read(path, buffer, offset, end) {
        const env_23 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_23, await this.lock(path, 'read'), false);
            return await this._fs.read(path, buffer, offset, end);
        }
        catch (e_23) {
            env_23.error = e_23;
            env_23.hasError = true;
        }
        finally {
            __disposeResources(env_23);
        }
    }
    readSync(path, buffer, offset, end) {
        const env_24 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_24, this.lockSync(path, 'read'), false);
            return this._fs.readSync(path, buffer, offset, end);
        }
        catch (e_24) {
            env_24.error = e_24;
            env_24.hasError = true;
        }
        finally {
            __disposeResources(env_24);
        }
    }
    async write(path, buffer, offset) {
        const env_25 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_25, await this.lock(path, 'write'), false);
            return await this._fs.write(path, buffer, offset);
        }
        catch (e_25) {
            env_25.error = e_25;
            env_25.hasError = true;
        }
        finally {
            __disposeResources(env_25);
        }
    }
    writeSync(path, buffer, offset) {
        const env_26 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_26, this.lockSync(path, 'write'), false);
            return this._fs.writeSync(path, buffer, offset);
        }
        catch (e_26) {
            env_26.error = e_26;
            env_26.hasError = true;
        }
        finally {
            __disposeResources(env_26);
        }
    }
    streamRead(path, options) {
        const env_27 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_27, this.lockSync(path, 'streamRead'), false);
            return this._fs.streamRead(path, options);
        }
        catch (e_27) {
            env_27.error = e_27;
            env_27.hasError = true;
        }
        finally {
            __disposeResources(env_27);
        }
    }
    streamWrite(path, options) {
        const env_28 = { stack: [], error: void 0, hasError: false };
        try {
            const _ = __addDisposableResource(env_28, this.lockSync(path, 'streamWrite'), false);
            return this._fs.streamWrite(path, options);
        }
        catch (e_28) {
            env_28.error = e_28;
            env_28.hasError = true;
        }
        finally {
            __disposeResources(env_28);
        }
    }
}
/**
 * This serializes access to an underlying async filesystem.
 * For example, on an OverlayFS instance with an async lower
 * directory operations like rename and rmdir may involve multiple
 * requests involving both the upper and lower file systems -- they
 * are not executed in a single atomic step. OverlayFS used to use this
 * to avoid having to reason about the correctness of
 * multiple requests interleaving.
 *
 * @privateRemarks
 * Instead of extending the passed class, `MutexedFS` stores it internally.
 * This is to avoid a deadlock caused when a method calls another one
 * The problem is discussed extensively in [#78](https://github.com/zen-fs/core/issues/78)
 * Instead of extending `FileSystem`,
 * `MutexedFS` implements it in order to make sure all of the methods are passed through
 *
 * @todo Change `using _` to `using void` pending https://github.com/tc39/proposal-discard-binding
 * @category Internals
 * @internal
 */
export function Mutexed(FS) {
    class MutexedFS extends _MutexedFS {
        constructor(...args) {
            super();
            this._fs = new FS(...args);
        }
    }
    return MutexedFS;
}

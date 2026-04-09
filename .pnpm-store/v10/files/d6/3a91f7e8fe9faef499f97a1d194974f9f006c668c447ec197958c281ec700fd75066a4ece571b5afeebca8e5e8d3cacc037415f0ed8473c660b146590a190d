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
import { getAllPrototypes } from 'utilium';
import { StoreFS } from '../backends/store/fs.js';
import { Errno, ErrnoError } from '../internal/error.js';
import { LazyFile, parseFlag } from '../internal/file.js';
import { crit, debug, err } from '../internal/log.js';
import { join } from '../vfs/path.js';
/**
 * Async() implements synchronous methods on an asynchronous file system
 *
 * Implementing classes must define `_sync` for the synchronous file system used as a cache.
 *
 * Synchronous methods on an asynchronous FS are implemented by performing operations over the in-memory copy,
 * while asynchronously pipelining them to the backing store.
 * During loading, the contents of the async file system are preloaded into the synchronous store.
 * @category Internals
 */
export function Async(FS) {
    class AsyncFS extends FS {
        async done() {
            await this._promise;
        }
        queueDone() {
            return this.done();
        }
        _async(promise) {
            this._promise = this._promise.then(() => promise);
        }
        constructor(...args) {
            super(...args);
            this._promise = Promise.resolve();
            this._isInitialized = false;
            /** Tracks how many updates to the sync. cache we skipped during initialization */
            this._skippedCacheUpdates = 0;
            this._patchAsync();
        }
        async ready() {
            await super.ready();
            await this.queueDone();
            if (this._isInitialized || this.attributes.has('no_async'))
                return;
            this.checkSync();
            await this._sync.ready();
            // optimization: for 2 storeFS', we copy at a lower abstraction level.
            if (this._sync instanceof StoreFS && this instanceof StoreFS) {
                const sync = this._sync.transaction();
                const async = this.transaction();
                const promises = [];
                for (const key of await async.keys()) {
                    promises.push(async.get(key).then(data => sync.setSync(key, data)));
                }
                await Promise.all(promises);
                this._isInitialized = true;
                return;
            }
            try {
                await this.crossCopy('/');
                debug(`Skipped ${this._skippedCacheUpdates} updates to the sync cache during initialization`);
                this._isInitialized = true;
            }
            catch (e) {
                this._isInitialized = false;
                throw crit(e, { fs: this });
            }
        }
        checkSync(path, syscall) {
            if (this.attributes.has('no_async')) {
                throw crit(new ErrnoError(Errno.ENOTSUP, 'Sync preloading has been disabled for this async file system', path, syscall), {
                    fs: this,
                });
            }
            if (!this._sync) {
                throw crit(new ErrnoError(Errno.ENOTSUP, 'No sync cache is attached to this async file system', path, syscall), { fs: this });
            }
        }
        renameSync(oldPath, newPath) {
            this.checkSync(oldPath, 'rename');
            this._sync.renameSync(oldPath, newPath);
            this._async(this.rename(oldPath, newPath));
        }
        statSync(path) {
            this.checkSync(path, 'stat');
            return this._sync.statSync(path);
        }
        createFileSync(path, flag, mode, options) {
            this.checkSync(path, 'createFile');
            const file = this._sync.createFileSync(path, flag, mode, options);
            this._async(this.createFile(path, flag, mode, options));
            return new LazyFile(this, path, flag, file.statSync());
        }
        openFileSync(path, flag) {
            this.checkSync(path, 'openFile');
            const stats = this._sync.statSync(path);
            return new LazyFile(this, path, flag, stats);
        }
        unlinkSync(path) {
            this.checkSync(path, 'unlinkSync');
            this._sync.unlinkSync(path);
            this._async(this.unlink(path));
        }
        rmdirSync(path) {
            this.checkSync(path, 'rmdir');
            this._sync.rmdirSync(path);
            this._async(this.rmdir(path));
        }
        mkdirSync(path, mode, options) {
            this.checkSync(path, 'mkdir');
            this._sync.mkdirSync(path, mode, options);
            this._async(this.mkdir(path, mode, options));
        }
        readdirSync(path) {
            this.checkSync(path, 'readdir');
            return this._sync.readdirSync(path);
        }
        linkSync(srcpath, dstpath) {
            this.checkSync(srcpath, 'link');
            this._sync.linkSync(srcpath, dstpath);
            this._async(this.link(srcpath, dstpath));
        }
        syncSync(path, data, stats) {
            this.checkSync(path, 'sync');
            this._sync.syncSync(path, data, stats);
            this._async(this.sync(path, data, stats));
        }
        existsSync(path) {
            this.checkSync(path, 'exists');
            return this._sync.existsSync(path);
        }
        readSync(path, buffer, offset, end) {
            this.checkSync(path, 'read');
            this._sync.readSync(path, buffer, offset, end);
        }
        writeSync(path, buffer, offset) {
            this.checkSync(path, 'write');
            this._sync.writeSync(path, buffer, offset);
            this._async(this.write(path, buffer, offset));
        }
        streamWrite(path, options) {
            this.checkSync(path, 'streamWrite');
            const sync = this._sync.streamWrite(path, options).getWriter();
            const async = super.streamWrite(path, options).getWriter();
            return new WritableStream({
                async write(chunk, controller) {
                    await Promise.all([sync.write(chunk), async.write(chunk)]).catch(controller.error.bind(controller));
                },
                async close() {
                    await Promise.all([sync.close(), async.close()]);
                },
                async abort(reason) {
                    await Promise.all([sync.abort(reason), async.abort(reason)]);
                },
            });
        }
        /**
         * @internal
         */
        async crossCopy(path) {
            this.checkSync(path, 'crossCopy');
            const stats = await this.stat(path);
            if (!stats.isDirectory()) {
                const env_1 = { stack: [], error: void 0, hasError: false };
                try {
                    const syncFile = __addDisposableResource(env_1, this._sync.createFileSync(path, parseFlag('w'), stats.mode, stats), false);
                    const buffer = new Uint8Array(stats.size);
                    await this.read(path, buffer, 0, stats.size);
                    syncFile.writeSync(buffer, 0, stats.size);
                    return;
                }
                catch (e_1) {
                    env_1.error = e_1;
                    env_1.hasError = true;
                }
                finally {
                    __disposeResources(env_1);
                }
            }
            if (path !== '/') {
                const stats = await this.stat(path);
                this._sync.mkdirSync(path, stats.mode, stats);
            }
            const promises = [];
            for (const file of await this.readdir(path)) {
                promises.push(this.crossCopy(join(path, file)));
            }
            await Promise.all(promises);
        }
        /**
         * @internal
         * Patch all async methods to also call their synchronous counterparts unless called from themselves (either sync or async)
         */
        _patchAsync() {
            const methods = Array.from(getAllPrototypes(this))
                .flatMap(Object.getOwnPropertyNames)
                .filter(key => typeof this[key] == 'function' && `${key}Sync` in this);
            debug('Async: patching methods: ' + methods.join(', '));
            for (const key of methods) {
                // TS does not narrow the union based on the key
                const originalMethod = this[key];
                this[key] = async (...args) => {
                    var _a, _b, _c;
                    const result = await originalMethod.apply(this, args);
                    const stack = (_a = new Error().stack) === null || _a === void 0 ? void 0 : _a.split('\n').slice(2).join('\n');
                    // !stack == From the async queue
                    if ((stack === null || stack === void 0 ? void 0 : stack.includes(`at <computed> [as ${key}]`)) || (stack === null || stack === void 0 ? void 0 : stack.includes(`${key}Sync `)) || !stack)
                        return result;
                    if (!this._isInitialized) {
                        this._skippedCacheUpdates++;
                        return result;
                    }
                    try {
                        // @ts-expect-error 2556 - The type of `args` is not narrowed
                        (_c = (_b = this._sync) === null || _b === void 0 ? void 0 : _b[`${key}Sync`]) === null || _c === void 0 ? void 0 : _c.call(_b, ...args);
                    }
                    catch (e) {
                        throw err(new ErrnoError(e.errno, e.message + ' (Out of sync!)', e.path, key), { fs: this });
                    }
                    return result;
                };
            }
        }
    }
    return AsyncFS;
}

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
import { File } from '../internal/file.js';
import { FileSystem } from '../internal/filesystem.js';
import { Stats } from '../stats.js';
import { join, resolve } from '../vfs/path.js';
class PassthroughFile extends File {
    constructor(fs, path, fd) {
        super(fs, path);
        this.fd = fd;
        this.node = fs.nodeFS;
        this.nodePath = fs.path(path);
    }
    error(err) {
        const error = err;
        return ErrnoError.With(error.code, this.path, error.syscall);
    }
    get position() {
        // Placeholder: Implement proper position tracking if needed.
        return 0;
    }
    async stat() {
        const { resolve, reject, promise } = Promise.withResolvers();
        this.node.fstat(this.fd, (err, stats) => (err ? reject(this.error(err)) : resolve(new Stats(stats))));
        return promise;
    }
    statSync() {
        return new Stats(this.node.fstatSync(this.fd));
    }
    close() {
        const { resolve, reject, promise } = Promise.withResolvers();
        this.node.close(this.fd, err => (err ? reject(this.error(err)) : resolve()));
        return promise;
    }
    closeSync() {
        this.node.closeSync(this.fd);
    }
    async truncate(len) {
        await this.node.promises.truncate(this.nodePath, len);
    }
    truncateSync(len) {
        this.node.ftruncateSync(this.fd, len);
    }
    async sync() {
        const { resolve, reject, promise } = Promise.withResolvers();
        this.node.fsync(this.fd, err => (err ? reject(this.error(err)) : resolve()));
        return promise;
    }
    syncSync() {
        this.node.fsyncSync(this.fd);
    }
    async write(buffer, offset, length, position) {
        const { resolve, reject, promise } = Promise.withResolvers();
        this.node.write(this.fd, buffer, offset, length, position, (err, written) => (err ? reject(this.error(err)) : resolve(written)));
        return promise;
    }
    writeSync(buffer, offset, length, position) {
        return this.node.writeSync(this.fd, buffer, offset, length, position);
    }
    async read(buffer, offset = 0, length, position = null) {
        const { resolve, reject, promise } = Promise.withResolvers();
        this.node.read(this.fd, buffer, offset, length || (await this.stat()).size, position, (err, bytesRead, buffer) => err ? reject(this.error(err)) : resolve({ bytesRead, buffer }));
        return promise;
    }
    readSync(buffer, offset = 0, length = this.statSync().size, position = null) {
        return this.node.readSync(this.fd, buffer, offset, length, position);
    }
    async chmod(mode) {
        await this.node.promises.chmod(this.nodePath, mode);
    }
    chmodSync(mode) {
        this.node.fchmodSync(this.fd, mode);
    }
    async chown(uid, gid) {
        await this.node.promises.chown(this.nodePath, uid, gid);
    }
    chownSync(uid, gid) {
        this.node.fchownSync(this.fd, uid, gid);
    }
    async utimes(atime, mtime) {
        await this.node.promises.utimes(this.nodePath, atime, mtime);
    }
    utimesSync(atime, mtime) {
        this.node.futimesSync(this.fd, atime, mtime);
    }
}
export class PassthroughFS extends FileSystem {
    constructor(nodeFS, prefix) {
        super(0x6e6f6465, 'nodefs');
        this.nodeFS = nodeFS;
        this.prefix = prefix;
    }
    usage() {
        const info = this.nodeFS.statfsSync(this.prefix);
        return {
            totalSpace: info.bsize * info.blocks,
            freeSpace: info.bsize * info.bfree,
        };
    }
    path(path) {
        return join(this.prefix, path.slice(1));
    }
    error(err, path) {
        const error = err;
        throw ErrnoError.With(error.code, path, error.syscall);
    }
    /**
     * Rename a file or directory.
     */
    async rename(oldPath, newPath) {
        try {
            await this.nodeFS.promises.rename(this.path(oldPath), this.path(newPath));
        }
        catch (err) {
            this.error(err, oldPath);
        }
    }
    /**
     * Rename a file or directory synchronously.
     */
    renameSync(oldPath, newPath) {
        try {
            this.nodeFS.renameSync(this.path(oldPath), this.path(newPath));
        }
        catch (err) {
            this.error(err, oldPath);
        }
    }
    /**
     * Get file statistics.
     */
    async stat(path) {
        try {
            return new Stats(await this.nodeFS.promises.stat(this.path(path)));
        }
        catch (err) {
            this.error(err, path);
        }
    }
    /**
     * Get file statistics synchronously.
     */
    statSync(path) {
        try {
            return new Stats(this.nodeFS.statSync(this.path(path)));
        }
        catch (err) {
            this.error(err, path);
        }
    }
    /**
     * Open a file.
     */
    async openFile(path, flag) {
        try {
            const { fd } = await this.nodeFS.promises.open(this.path(path), flag);
            return new PassthroughFile(this, path, fd);
        }
        catch (err) {
            this.error(err, path);
        }
    }
    /**
     * Open a file synchronously.
     */
    openFileSync(path, flag) {
        try {
            const fd = this.nodeFS.openSync(this.path(path), flag);
            return new PassthroughFile(this, path, fd);
        }
        catch (err) {
            this.error(err, path);
        }
    }
    /**
     * Unlink (delete) a file.
     */
    async unlink(path) {
        try {
            await this.nodeFS.promises.unlink(this.path(path));
        }
        catch (err) {
            this.error(err, path);
        }
    }
    /**
     * Unlink (delete) a file synchronously.
     */
    unlinkSync(path) {
        try {
            this.nodeFS.unlinkSync(this.path(path));
        }
        catch (err) {
            this.error(err, path);
        }
    }
    /**
     * Create a directory.
     */
    async mkdir(path, mode) {
        try {
            await this.nodeFS.promises.mkdir(this.path(path), { mode });
        }
        catch (err) {
            this.error(err, path);
        }
    }
    /**
     * Create a directory synchronously.
     */
    mkdirSync(path, mode) {
        try {
            this.nodeFS.mkdirSync(this.path(path), { mode });
        }
        catch (err) {
            this.error(err, path);
        }
    }
    /**
     * Read the contents of a directory.
     */
    async readdir(path) {
        try {
            return await this.nodeFS.promises.readdir(this.path(path));
        }
        catch (err) {
            this.error(err, path);
        }
    }
    /**
     * Read the contents of a directory synchronously.
     */
    readdirSync(path) {
        try {
            return this.nodeFS.readdirSync(this.path(path));
        }
        catch (err) {
            this.error(err, path);
        }
    }
    /**
     * Create a file.
     */
    async createFile(path, flag, mode) {
        try {
            const { fd } = await this.nodeFS.promises.open(this.path(path), flag, mode);
            return new PassthroughFile(this, path, fd);
        }
        catch (err) {
            this.error(err, path);
        }
    }
    /**
     * Create a file synchronously.
     */
    createFileSync(path, flag, mode) {
        try {
            const fd = this.nodeFS.openSync(this.path(path), flag, mode);
            return new PassthroughFile(this, path, fd);
        }
        catch (err) {
            this.error(err, path);
        }
    }
    /**
     * Remove a directory.
     */
    async rmdir(path) {
        try {
            await this.nodeFS.promises.rmdir(this.path(path));
        }
        catch (err) {
            this.error(err, path);
        }
    }
    /**
     * Remove a directory synchronously.
     */
    rmdirSync(path) {
        try {
            this.nodeFS.rmdirSync(this.path(path));
        }
        catch (err) {
            this.error(err, path);
        }
    }
    /**
     * Synchronize data to the file system.
     */
    async sync(path, data, stats) {
        try {
            const env_1 = { stack: [], error: void 0, hasError: false };
            try {
                const handle = __addDisposableResource(env_1, await this.nodeFS.promises.open(this.path(path), 'w'), true);
                await handle.writeFile(data);
                await handle.chmod(stats.mode);
                await handle.chown(stats.uid, stats.gid);
                await handle.utimes(stats.atimeMs, stats.mtimeMs);
            }
            catch (e_1) {
                env_1.error = e_1;
                env_1.hasError = true;
            }
            finally {
                const result_1 = __disposeResources(env_1);
                if (result_1)
                    await result_1;
            }
        }
        catch (err) {
            this.error(err, path);
        }
    }
    /**
     * Synchronize data to the file system synchronously.
     */
    syncSync(path, data, stats) {
        try {
            const p = this.path(path);
            this.nodeFS.writeFileSync(p, data);
            this.nodeFS.chmodSync(p, stats.mode);
            this.nodeFS.chownSync(p, stats.uid, stats.gid);
            this.nodeFS.utimesSync(p, stats.atimeMs, stats.mtimeMs);
        }
        catch (err) {
            this.error(err, path);
        }
    }
    /**
     * Create a hard link.
     */
    async link(target, link) {
        try {
            await this.nodeFS.promises.link(this.path(target), this.path(link));
        }
        catch (err) {
            this.error(err, target);
        }
    }
    /**
     * Create a hard link synchronously.
     */
    linkSync(target, link) {
        try {
            this.nodeFS.linkSync(this.path(target), this.path(link));
        }
        catch (err) {
            this.error(err, target);
        }
    }
    async read(path, buffer, offset, end) {
        try {
            const env_2 = { stack: [], error: void 0, hasError: false };
            try {
                const handle = __addDisposableResource(env_2, await this.nodeFS.promises.open(this.path(path), 'r'), true);
                await handle.read({ buffer, offset, length: end - offset });
            }
            catch (e_2) {
                env_2.error = e_2;
                env_2.hasError = true;
            }
            finally {
                const result_2 = __disposeResources(env_2);
                if (result_2)
                    await result_2;
            }
        }
        catch (err) {
            this.error(err, path);
        }
    }
    readSync(path, buffer, offset, end) {
        let fd;
        try {
            fd = this.nodeFS.openSync(this.path(path), 'r');
            this.nodeFS.readSync(fd, buffer, { offset, length: end - offset });
        }
        catch (err) {
            this.error(err, path);
        }
        finally {
            if (fd)
                this.nodeFS.closeSync(fd);
        }
    }
    async write(path, buffer, offset) {
        try {
            const env_3 = { stack: [], error: void 0, hasError: false };
            try {
                const handle = __addDisposableResource(env_3, await this.nodeFS.promises.open(this.path(path), 'w'), true);
                await handle.write(buffer, offset);
            }
            catch (e_3) {
                env_3.error = e_3;
                env_3.hasError = true;
            }
            finally {
                const result_3 = __disposeResources(env_3);
                if (result_3)
                    await result_3;
            }
        }
        catch (err) {
            this.error(err, path);
        }
    }
    writeSync(path, buffer, offset) {
        let fd;
        try {
            fd = this.nodeFS.openSync(this.path(path), 'w');
            this.nodeFS.writeSync(fd, buffer, offset);
        }
        catch (err) {
            this.error(err, path);
        }
        finally {
            if (fd)
                this.nodeFS.closeSync(fd);
        }
    }
}
const _Passthrough = {
    name: 'Passthrough',
    options: {
        fs: { type: 'object', required: true },
        prefix: { type: 'string', required: false },
    },
    create({ fs, prefix = '/' }) {
        return new PassthroughFS(fs, resolve(prefix));
    },
};
/**
 * A file system that passes through to another FS
 */
export const Passthrough = _Passthrough;

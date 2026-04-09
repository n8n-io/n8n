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
import { Buffer } from 'buffer';
import { _throw } from 'utilium';
import { credentials } from '../internal/credentials.js';
import { Errno, ErrnoError } from '../internal/error.js';
import { flagToMode, isAppendable, isExclusive, isReadable, isTruncating, isWriteable, parseFlag } from '../internal/file.js';
import '../polyfills.js';
import { BigIntStats } from '../stats.js';
import { decodeUTF8, normalizeMode, normalizeOptions, normalizePath, normalizeTime } from '../utils.js';
import { config } from './config.js';
import * as constants from './constants.js';
import { Dir, Dirent } from './dir.js';
import { dirname, join, parse, resolve } from './path.js';
import { _statfs, fd2file, fdMap, file2fd, fixError, resolveMount } from './shared.js';
import { ReadStream, WriteStream } from './streams.js';
import { FSWatcher, emitChange } from './watchers.js';
export * as constants from './constants.js';
export class FileHandle {
    constructor(fdOrFile, context) {
        this.context = context;
        const isFile = typeof fdOrFile != 'number';
        this.fd = isFile ? file2fd(fdOrFile) : fdOrFile;
        this.file = isFile ? fdOrFile : fd2file(fdOrFile);
    }
    _emitChange() {
        var _a, _b, _c;
        emitChange(this.context, 'change', this.file.path.slice((_c = (_b = (_a = this.context) === null || _a === void 0 ? void 0 : _a.root) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0));
    }
    /**
     * Asynchronous fchown(2) - Change ownership of a file.
     */
    async chown(uid, gid) {
        await this.file.chown(uid, gid);
        this._emitChange();
    }
    /**
     * Asynchronous fchmod(2) - Change permissions of a file.
     * @param mode A file mode. If a string is passed, it is parsed as an octal integer.
     */
    async chmod(mode) {
        const numMode = normalizeMode(mode, -1);
        if (numMode < 0)
            throw new ErrnoError(Errno.EINVAL, 'Invalid mode');
        await this.file.chmod(numMode);
        this._emitChange();
    }
    /**
     * Asynchronous fdatasync(2) - synchronize a file's in-core state with storage device.
     */
    datasync() {
        return this.file.datasync();
    }
    /**
     * Asynchronous fsync(2) - synchronize a file's in-core state with the underlying storage device.
     */
    sync() {
        return this.file.sync();
    }
    /**
     * Asynchronous ftruncate(2) - Truncate a file to a specified length.
     * @param length If not specified, defaults to `0`.
     */
    async truncate(length) {
        length || (length = 0);
        if (length < 0)
            throw new ErrnoError(Errno.EINVAL);
        await this.file.truncate(length);
        this._emitChange();
    }
    /**
     * Asynchronously change file timestamps of the file.
     * @param atime The last access time. If a string is provided, it will be coerced to number.
     * @param mtime The last modified time. If a string is provided, it will be coerced to number.
     */
    async utimes(atime, mtime) {
        await this.file.utimes(normalizeTime(atime), normalizeTime(mtime));
        this._emitChange();
    }
    /**
     * Asynchronously append data to a file, creating the file if it does not exist. The underlying file will _not_ be closed automatically.
     * The `FileHandle` must have been opened for appending.
     * @param data The data to write. If something other than a `Buffer` or `Uint8Array` is provided, the value is coerced to a string.
     * @param _options Either the encoding for the file, or an object optionally specifying the encoding, file mode, and flag.
     * - `encoding` defaults to `'utf8'`.
     * - `mode` defaults to `0o666`.
     * - `flag` defaults to `'a'`.
     */
    async appendFile(data, _options = {}) {
        const options = normalizeOptions(_options, 'utf8', 'a', 0o644);
        const flag = parseFlag(options.flag);
        if (!isAppendable(flag)) {
            throw new ErrnoError(Errno.EINVAL, 'Flag passed to appendFile must allow for appending');
        }
        if (typeof data != 'string' && !options.encoding) {
            throw new ErrnoError(Errno.EINVAL, 'Encoding not specified');
        }
        const encodedData = typeof data == 'string' ? Buffer.from(data, options.encoding) : data;
        await this.file.write(encodedData, 0, encodedData.length);
        this._emitChange();
    }
    async read(buffer, offset, length, position) {
        if (typeof offset == 'object' && offset != null) {
            position = offset.position;
            length = offset.length;
            offset = offset.offset;
        }
        if (!ArrayBuffer.isView(buffer) && typeof buffer == 'object') {
            position = buffer.position;
            length = buffer.length;
            offset = buffer.offset;
            buffer = buffer.buffer;
        }
        const pos = Number.isSafeInteger(position) ? position : this.file.position;
        buffer || (buffer = new Uint8Array((await this.file.stat()).size));
        offset !== null && offset !== void 0 ? offset : (offset = 0);
        return this.file.read(buffer, offset, length !== null && length !== void 0 ? length : buffer.byteLength - offset, pos);
    }
    async readFile(_options) {
        const options = normalizeOptions(_options, null, 'r', 0o444);
        const flag = parseFlag(options.flag);
        if (!isReadable(flag)) {
            throw new ErrnoError(Errno.EINVAL, 'Flag passed must allow for reading');
        }
        const { size } = await this.stat();
        const { buffer: data } = await this.file.read(new Uint8Array(size), 0, size, 0);
        const buffer = Buffer.from(data);
        return options.encoding ? buffer.toString(options.encoding) : buffer;
    }
    /**
     * Read file data using a `ReadableStream`.
     * The handle will not be closed automatically.
     */
    readableWebStream(options = {}) {
        return this.file.streamRead({});
    }
    /**
     * @todo Implement
     */
    readLines(options) {
        throw ErrnoError.With('ENOSYS', this.file.path, 'FileHandle.readLines');
    }
    [Symbol.asyncDispose]() {
        return this.close();
    }
    async stat(opts) {
        const stats = await this.file.stat();
        if (config.checkAccess && !stats.hasAccess(constants.R_OK, this.context)) {
            throw ErrnoError.With('EACCES', this.file.path, 'stat');
        }
        return (opts === null || opts === void 0 ? void 0 : opts.bigint) ? new BigIntStats(stats) : stats;
    }
    /**
     * Asynchronously writes `string` to the file.
     * The `FileHandle` must have been opened for writing.
     * It is unsafe to call `write()` multiple times on the same file without waiting for the `Promise`
     * to be resolved (or rejected). For this scenario, `createWriteStream` is strongly recommended.
     */
    async write(data, options, lenOrEnc, position) {
        let buffer, offset, length;
        if (typeof options == 'object' && options != null) {
            lenOrEnc = options.length;
            position = options.position;
            options = options.offset;
        }
        if (typeof data === 'string') {
            position = typeof options === 'number' ? options : null;
            offset = 0;
            buffer = Buffer.from(data, typeof lenOrEnc === 'string' ? lenOrEnc : 'utf8');
            length = buffer.length;
        }
        else {
            buffer = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
            offset = options !== null && options !== void 0 ? options : 0;
            length = typeof lenOrEnc == 'number' ? lenOrEnc : buffer.byteLength;
            position = typeof position === 'number' ? position : null;
        }
        position !== null && position !== void 0 ? position : (position = this.file.position);
        const bytesWritten = await this.file.write(buffer, offset, length, position);
        this._emitChange();
        return { buffer: data, bytesWritten };
    }
    /**
     * Asynchronously writes data to a file, replacing the file if it already exists. The underlying file will _not_ be closed automatically.
     * The `FileHandle` must have been opened for writing.
     * It is unsafe to call `writeFile()` multiple times on the same file without waiting for the `Promise` to be resolved (or rejected).
     * @param data The data to write. If something other than a `Buffer` or `Uint8Array` is provided, the value is coerced to a string.
     * @param _options Either the encoding for the file, or an object optionally specifying the encoding, file mode, and flag.
     * - `encoding` defaults to `'utf8'`.
     * - `mode` defaults to `0o666`.
     * - `flag` defaults to `'w'`.
     */
    async writeFile(data, _options = {}) {
        const options = normalizeOptions(_options, 'utf8', 'w', 0o644);
        const flag = parseFlag(options.flag);
        if (!isWriteable(flag)) {
            throw new ErrnoError(Errno.EINVAL, 'Flag passed must allow for writing');
        }
        if (typeof data != 'string' && !options.encoding) {
            throw new ErrnoError(Errno.EINVAL, 'Encoding not specified');
        }
        const encodedData = typeof data == 'string' ? Buffer.from(data, options.encoding) : data;
        await this.file.write(encodedData, 0, encodedData.length, 0);
        this._emitChange();
    }
    /**
     * Asynchronous close(2) - close a `FileHandle`.
     */
    async close() {
        await this.file.close();
        fdMap.delete(this.fd);
    }
    /**
     * Asynchronous `writev`. Writes from multiple buffers.
     * @param buffers An array of Uint8Array buffers.
     * @param position The position in the file where to begin writing.
     * @returns The number of bytes written.
     */
    async writev(buffers, position) {
        if (typeof position == 'number')
            this.file.position = position;
        let bytesWritten = 0;
        for (const buffer of buffers) {
            bytesWritten += (await this.write(buffer)).bytesWritten;
        }
        return { bytesWritten, buffers };
    }
    /**
     * Asynchronous `readv`. Reads into multiple buffers.
     * @param buffers An array of Uint8Array buffers.
     * @param position The position in the file where to begin reading.
     * @returns The number of bytes read.
     */
    async readv(buffers, position) {
        if (typeof position == 'number')
            this.file.position = position;
        let bytesRead = 0;
        for (const buffer of buffers) {
            bytesRead += (await this.read(buffer)).bytesRead;
        }
        return { bytesRead, buffers };
    }
    /**
     * Creates a stream for reading from the file.
     * @param options Options for the readable stream
     */
    createReadStream(options = {}) {
        return new ReadStream(options, this);
    }
    /**
     * Creates a stream for writing to the file.
     * @param options Options for the writeable stream.
     */
    createWriteStream(options = {}) {
        return new WriteStream(options, this);
    }
}
export async function rename(oldPath, newPath) {
    oldPath = normalizePath(oldPath);
    newPath = normalizePath(newPath);
    const src = resolveMount(oldPath, this);
    const dst = resolveMount(newPath, this);
    if (config.checkAccess && !(await stat.call(this, dirname(oldPath))).hasAccess(constants.W_OK, this)) {
        throw ErrnoError.With('EACCES', oldPath, 'rename');
    }
    try {
        if (src.mountPoint == dst.mountPoint) {
            await src.fs.rename(src.path, dst.path);
            emitChange(this, 'rename', oldPath.toString());
            emitChange(this, 'change', newPath.toString());
            return;
        }
        await writeFile.call(this, newPath, await readFile(oldPath));
        await unlink.call(this, oldPath);
        emitChange(this, 'rename', oldPath.toString());
    }
    catch (e) {
        throw fixError(e, { [src.path]: oldPath, [dst.path]: newPath });
    }
}
rename;
/**
 * Test whether or not `path` exists by checking with the file system.
 */
export async function exists(path) {
    try {
        const { fs, path: resolved } = resolveMount(await realpath.call(this, path), this);
        return await fs.exists(resolved);
    }
    catch (e) {
        if (e instanceof ErrnoError && e.code == 'ENOENT') {
            return false;
        }
        throw e;
    }
}
export async function stat(path, options) {
    path = normalizePath(path);
    const { fs, path: resolved } = resolveMount(await realpath.call(this, path), this);
    try {
        const stats = await fs.stat(resolved);
        if (config.checkAccess && !stats.hasAccess(constants.R_OK, this)) {
            throw ErrnoError.With('EACCES', resolved, 'stat');
        }
        return (options === null || options === void 0 ? void 0 : options.bigint) ? new BigIntStats(stats) : stats;
    }
    catch (e) {
        throw fixError(e, { [resolved]: path });
    }
}
stat;
export async function lstat(path, options) {
    path = normalizePath(path);
    const { fs, path: resolved } = resolveMount(path, this);
    try {
        const stats = await fs.stat(resolved);
        return (options === null || options === void 0 ? void 0 : options.bigint) ? new BigIntStats(stats) : stats;
    }
    catch (e) {
        throw fixError(e, { [resolved]: path });
    }
}
lstat;
// FILE-ONLY METHODS
export async function truncate(path, len = 0) {
    const env_1 = { stack: [], error: void 0, hasError: false };
    try {
        const handle = __addDisposableResource(env_1, await open.call(this, path, 'r+'), true);
        await handle.truncate(len);
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
truncate;
export async function unlink(path) {
    path = normalizePath(path);
    const { fs, path: resolved } = resolveMount(path, this);
    try {
        if (config.checkAccess && !(await fs.stat(resolved)).hasAccess(constants.W_OK, this)) {
            throw ErrnoError.With('EACCES', resolved, 'unlink');
        }
        await fs.unlink(resolved);
        emitChange(this, 'rename', path.toString());
    }
    catch (e) {
        throw fixError(e, { [resolved]: path });
    }
}
unlink;
/**
 * Manually apply setuid/setgid.
 */
async function applySetId(file, uid, gid) {
    if (file.fs.attributes.has('setid'))
        return;
    const parent = await file.fs.stat(dirname(file.path));
    await file.chown(parent.mode & constants.S_ISUID ? parent.uid : uid, // manually apply setuid/setgid
    parent.mode & constants.S_ISGID ? parent.gid : gid);
}
/**
 * Opens a file. This helper handles the complexity of file flags.
 * @internal
 */
async function _open($, path, opt) {
    var _a;
    path = normalizePath(path);
    const mode = normalizeMode(opt.mode, 0o644), flag = parseFlag(opt.flag);
    const { fullPath, fs, path: resolved, stats } = await _resolve($, path.toString(), opt.preserveSymlinks);
    if (!stats) {
        if ((!isWriteable(flag) && !isAppendable(flag)) || flag == 'r+') {
            throw ErrnoError.With('ENOENT', fullPath, '_open');
        }
        // Create the file
        const parentStats = await fs.stat(dirname(resolved));
        if (config.checkAccess && !parentStats.hasAccess(constants.W_OK, $)) {
            throw ErrnoError.With('EACCES', dirname(fullPath), '_open');
        }
        if (!parentStats.isDirectory()) {
            throw ErrnoError.With('ENOTDIR', dirname(fullPath), '_open');
        }
        const { euid: uid, egid: gid } = (_a = $ === null || $ === void 0 ? void 0 : $.credentials) !== null && _a !== void 0 ? _a : credentials;
        const file = await fs.createFile(resolved, flag, mode, { uid, gid });
        await applySetId(file, uid, gid);
        return new FileHandle(file, $);
    }
    if (config.checkAccess && !stats.hasAccess(flagToMode(flag), $)) {
        throw ErrnoError.With('EACCES', fullPath, '_open');
    }
    if (isExclusive(flag)) {
        throw ErrnoError.With('EEXIST', fullPath, '_open');
    }
    const handle = new FileHandle(await fs.openFile(resolved, flag), $);
    /*
        In a previous implementation, we deleted the file and
        re-created it. However, this created a race condition if another
        asynchronous request was trying to read the file, as the file
        would not exist for a small period of time.
    */
    if (isTruncating(flag)) {
        await handle.truncate(0);
    }
    return handle;
}
/**
 * Asynchronous file open.
 * @see http://www.manpagez.com/man/2/open/
 * @param flag Handles the complexity of the various file modes. See its API for more details.
 * @param mode Mode to use to open the file. Can be ignored if the filesystem doesn't support permissions.
 */
export async function open(path, flag = 'r', mode = 0o644) {
    return await _open(this, path, { flag, mode });
}
open;
export async function readFile(path, _options) {
    const env_2 = { stack: [], error: void 0, hasError: false };
    try {
        const options = normalizeOptions(_options, null, 'r', 0o644);
        const handle = __addDisposableResource(env_2, typeof path == 'object' && 'fd' in path ? path : await open.call(this, path, options.flag, options.mode), true);
        return await handle.readFile(options);
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
readFile;
/**
 * Asynchronously writes data to a file, replacing the file if it already exists.
 *
 * The encoding option is ignored if data is a buffer.
 * @option encoding Defaults to `'utf8'`.
 * @option mode Defaults to `0644`.
 * @option flag Defaults to `'w'`.
 */
export async function writeFile(path, data, _options) {
    const env_3 = { stack: [], error: void 0, hasError: false };
    try {
        const options = normalizeOptions(_options, 'utf8', 'w+', 0o644);
        const handle = __addDisposableResource(env_3, path instanceof FileHandle ? path : await open.call(this, path.toString(), options.flag, options.mode), true);
        const _data = typeof data == 'string' ? data : data instanceof DataView ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength) : data;
        if (typeof _data != 'string' && !(_data instanceof Uint8Array)) {
            throw new ErrnoError(Errno.EINVAL, 'The "data" argument must be of type string or an instance of Buffer, TypedArray, or DataView. Received ' + typeof data, handle.file.path, 'writeFile');
        }
        await handle.writeFile(_data, options);
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
writeFile;
/**
 * Asynchronously append data to a file, creating the file if it not yet exists.
 * @option encoding Defaults to `'utf8'`.
 * @option mode Defaults to `0644`.
 * @option flag Defaults to `'a'`.
 */
export async function appendFile(path, data, _options) {
    const env_4 = { stack: [], error: void 0, hasError: false };
    try {
        const options = normalizeOptions(_options, 'utf8', 'a', 0o644);
        const flag = parseFlag(options.flag);
        if (!isAppendable(flag)) {
            throw new ErrnoError(Errno.EINVAL, 'Flag passed to appendFile must allow for appending');
        }
        if (typeof data != 'string' && !options.encoding) {
            throw new ErrnoError(Errno.EINVAL, 'Encoding not specified');
        }
        const encodedData = typeof data == 'string' ? Buffer.from(data, options.encoding) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        const handle = __addDisposableResource(env_4, typeof path == 'object' && 'fd' in path ? path : await open.call(this, path, options.flag, options.mode), true);
        await handle.appendFile(encodedData, options);
    }
    catch (e_4) {
        env_4.error = e_4;
        env_4.hasError = true;
    }
    finally {
        const result_4 = __disposeResources(env_4);
        if (result_4)
            await result_4;
    }
}
appendFile;
// DIRECTORY-ONLY METHODS
export async function rmdir(path) {
    path = await realpath.call(this, path);
    const { fs, path: resolved } = resolveMount(path, this);
    try {
        const stats = await fs.stat(resolved);
        if (!stats) {
            throw ErrnoError.With('ENOENT', path, 'rmdir');
        }
        if (!stats.isDirectory()) {
            throw ErrnoError.With('ENOTDIR', resolved, 'rmdir');
        }
        if (config.checkAccess && !stats.hasAccess(constants.W_OK, this)) {
            throw ErrnoError.With('EACCES', resolved, 'rmdir');
        }
        await fs.rmdir(resolved);
        emitChange(this, 'rename', path.toString());
    }
    catch (e) {
        throw fixError(e, { [resolved]: path });
    }
}
rmdir;
export async function mkdir(path, options) {
    var _a, _b;
    const { euid: uid, egid: gid } = (_a = this === null || this === void 0 ? void 0 : this.credentials) !== null && _a !== void 0 ? _a : credentials;
    options = typeof options === 'object' ? options : { mode: options };
    const mode = normalizeMode(options === null || options === void 0 ? void 0 : options.mode, 0o777);
    path = await realpath.call(this, path);
    const { fs, path: resolved, root } = resolveMount(path, this);
    const errorPaths = { [resolved]: path };
    try {
        if (!(options === null || options === void 0 ? void 0 : options.recursive)) {
            if (config.checkAccess && !(await fs.stat(dirname(resolved))).hasAccess(constants.W_OK, this)) {
                throw ErrnoError.With('EACCES', dirname(resolved), 'mkdir');
            }
            await fs.mkdir(resolved, mode, { uid, gid });
            await applySetId(await fs.openFile(resolved, 'r+'), uid, gid);
            emitChange(this, 'rename', path.toString());
            return;
        }
        const dirs = [];
        for (let dir = resolved, origDir = path; !(await fs.exists(dir)); dir = dirname(dir), origDir = dirname(origDir)) {
            dirs.unshift(dir);
            errorPaths[dir] = origDir;
        }
        for (const dir of dirs) {
            if (config.checkAccess && !(await fs.stat(dirname(dir))).hasAccess(constants.W_OK, this)) {
                throw ErrnoError.With('EACCES', dirname(dir), 'mkdir');
            }
            await fs.mkdir(dir, mode, { uid, gid });
            await applySetId(await fs.openFile(dir, 'r+'), uid, gid);
            emitChange(this, 'rename', dir);
        }
        return root.length == 1 ? dirs[0] : (_b = dirs[0]) === null || _b === void 0 ? void 0 : _b.slice(root.length);
    }
    catch (e) {
        throw fixError(e, errorPaths);
    }
}
mkdir;
export async function readdir(path, options) {
    options = typeof options === 'object' ? options : { encoding: options };
    path = await realpath.call(this, path);
    const { fs, path: resolved } = resolveMount(path, this);
    const stats = await fs.stat(resolved).catch((e) => _throw(fixError(e, { [resolved]: path })));
    if (!stats) {
        throw ErrnoError.With('ENOENT', path, 'readdir');
    }
    if (config.checkAccess && !stats.hasAccess(constants.R_OK, this)) {
        throw ErrnoError.With('EACCES', path, 'readdir');
    }
    if (!stats.isDirectory()) {
        throw ErrnoError.With('ENOTDIR', path, 'readdir');
    }
    const entries = await fs.readdir(resolved).catch((e) => _throw(fixError(e, { [resolved]: path })));
    const values = [];
    const addEntry = async (entry) => {
        let entryStats;
        if ((options === null || options === void 0 ? void 0 : options.recursive) || (options === null || options === void 0 ? void 0 : options.withFileTypes)) {
            entryStats = await fs.stat(join(resolved, entry)).catch((e) => {
                if (e.code == 'ENOENT')
                    return;
                throw fixError(e, { [resolved]: path });
            });
            if (!entryStats)
                return;
        }
        if (options === null || options === void 0 ? void 0 : options.withFileTypes) {
            values.push(new Dirent(entry, entryStats));
        }
        else if ((options === null || options === void 0 ? void 0 : options.encoding) == 'buffer') {
            values.push(Buffer.from(entry));
        }
        else {
            values.push(entry);
        }
        if (!(options === null || options === void 0 ? void 0 : options.recursive) || !(entryStats === null || entryStats === void 0 ? void 0 : entryStats.isDirectory()))
            return;
        for (const subEntry of await readdir.call(this, join(path, entry), options)) {
            if (subEntry instanceof Dirent) {
                subEntry.path = join(entry, subEntry.path);
                values.push(subEntry);
            }
            else if (Buffer.isBuffer(subEntry)) {
                // Convert Buffer to string, prefix with the full path
                values.push(Buffer.from(join(entry, decodeUTF8(subEntry))));
            }
            else {
                values.push(join(entry, subEntry));
            }
        }
    };
    await Promise.all(entries.map(addEntry));
    return values;
}
readdir;
export async function link(targetPath, linkPath) {
    targetPath = normalizePath(targetPath);
    linkPath = normalizePath(linkPath);
    const { fs, path } = resolveMount(targetPath, this);
    const link = resolveMount(linkPath, this);
    if (fs != link.fs) {
        throw ErrnoError.With('EXDEV', linkPath, 'link');
    }
    try {
        if (config.checkAccess && !(await fs.stat(dirname(targetPath))).hasAccess(constants.R_OK, this)) {
            throw ErrnoError.With('EACCES', dirname(path), 'link');
        }
        if (config.checkAccess && !(await stat.call(this, dirname(linkPath))).hasAccess(constants.W_OK, this)) {
            throw ErrnoError.With('EACCES', dirname(linkPath), 'link');
        }
        if (config.checkAccess && !(await fs.stat(path)).hasAccess(constants.R_OK, this)) {
            throw ErrnoError.With('EACCES', path, 'link');
        }
        return await fs.link(path, link.path);
    }
    catch (e) {
        throw fixError(e, { [link.path]: linkPath, [path]: targetPath });
    }
}
link;
/**
 * `symlink`.
 * @param target target path
 * @param path link path
 * @param type can be either `'dir'` or `'file'` (default is `'file'`)
 */
export async function symlink(target, path, type = 'file') {
    const env_5 = { stack: [], error: void 0, hasError: false };
    try {
        if (!['file', 'dir', 'junction'].includes(type)) {
            throw new ErrnoError(Errno.EINVAL, 'Invalid symlink type: ' + type);
        }
        path = normalizePath(path);
        if (await exists.call(this, path))
            throw ErrnoError.With('EEXIST', path, 'symlink');
        const handle = __addDisposableResource(env_5, await _open(this, path, { flag: 'w+', mode: 0o644, preserveSymlinks: true }), true);
        await handle.writeFile(normalizePath(target, true));
        await handle.file.chmod(constants.S_IFLNK);
    }
    catch (e_5) {
        env_5.error = e_5;
        env_5.hasError = true;
    }
    finally {
        const result_5 = __disposeResources(env_5);
        if (result_5)
            await result_5;
    }
}
symlink;
export async function readlink(path, options) {
    const env_6 = { stack: [], error: void 0, hasError: false };
    try {
        const handle = __addDisposableResource(env_6, await _open(this, normalizePath(path), { flag: 'r', mode: 0o644, preserveSymlinks: true }), true);
        const value = await handle.readFile();
        const encoding = typeof options == 'object' ? options === null || options === void 0 ? void 0 : options.encoding : options;
        // always defaults to utf-8 to avoid wrangler (cloudflare) worker "unknown encoding" exception
        return encoding == 'buffer' ? value : value.toString((encoding !== null && encoding !== void 0 ? encoding : 'utf-8'));
    }
    catch (e_6) {
        env_6.error = e_6;
        env_6.hasError = true;
    }
    finally {
        const result_6 = __disposeResources(env_6);
        if (result_6)
            await result_6;
    }
}
readlink;
export async function chown(path, uid, gid) {
    const env_7 = { stack: [], error: void 0, hasError: false };
    try {
        const handle = __addDisposableResource(env_7, await open.call(this, path, 'r+'), true);
        await handle.chown(uid, gid);
    }
    catch (e_7) {
        env_7.error = e_7;
        env_7.hasError = true;
    }
    finally {
        const result_7 = __disposeResources(env_7);
        if (result_7)
            await result_7;
    }
}
chown;
export async function lchown(path, uid, gid) {
    const env_8 = { stack: [], error: void 0, hasError: false };
    try {
        const handle = __addDisposableResource(env_8, await _open(this, path, {
            flag: 'r+',
            mode: 0o644,
            preserveSymlinks: true,
            allowDirectory: true,
        }), true);
        await handle.chown(uid, gid);
    }
    catch (e_8) {
        env_8.error = e_8;
        env_8.hasError = true;
    }
    finally {
        const result_8 = __disposeResources(env_8);
        if (result_8)
            await result_8;
    }
}
lchown;
export async function chmod(path, mode) {
    const env_9 = { stack: [], error: void 0, hasError: false };
    try {
        const handle = __addDisposableResource(env_9, await open.call(this, path, 'r+'), true);
        await handle.chmod(mode);
    }
    catch (e_9) {
        env_9.error = e_9;
        env_9.hasError = true;
    }
    finally {
        const result_9 = __disposeResources(env_9);
        if (result_9)
            await result_9;
    }
}
chmod;
export async function lchmod(path, mode) {
    const env_10 = { stack: [], error: void 0, hasError: false };
    try {
        const handle = __addDisposableResource(env_10, await _open(this, path, {
            flag: 'r+',
            mode: 0o644,
            preserveSymlinks: true,
            allowDirectory: true,
        }), true);
        await handle.chmod(mode);
    }
    catch (e_10) {
        env_10.error = e_10;
        env_10.hasError = true;
    }
    finally {
        const result_10 = __disposeResources(env_10);
        if (result_10)
            await result_10;
    }
}
lchmod;
/**
 * Change file timestamps of the file referenced by the supplied path.
 */
export async function utimes(path, atime, mtime) {
    const env_11 = { stack: [], error: void 0, hasError: false };
    try {
        const handle = __addDisposableResource(env_11, await open.call(this, path, 'r+'), true);
        await handle.utimes(atime, mtime);
    }
    catch (e_11) {
        env_11.error = e_11;
        env_11.hasError = true;
    }
    finally {
        const result_11 = __disposeResources(env_11);
        if (result_11)
            await result_11;
    }
}
utimes;
/**
 * Change file timestamps of the file referenced by the supplied path.
 */
export async function lutimes(path, atime, mtime) {
    const env_12 = { stack: [], error: void 0, hasError: false };
    try {
        const handle = __addDisposableResource(env_12, await _open(this, path, {
            flag: 'r+',
            mode: 0o644,
            preserveSymlinks: true,
            allowDirectory: true,
        }), true);
        await handle.utimes(new Date(atime), new Date(mtime));
    }
    catch (e_12) {
        env_12.error = e_12;
        env_12.hasError = true;
    }
    finally {
        const result_12 = __disposeResources(env_12);
        if (result_12)
            await result_12;
    }
}
lutimes;
/**
 * Resolves the mount and real path for a path.
 * Additionally, any stats fetched will be returned for de-duplication
 * @internal @hidden
 */
async function _resolve($, path, preserveSymlinks) {
    if (preserveSymlinks) {
        const resolved = resolveMount(path, $);
        const stats = await resolved.fs.stat(resolved.path).catch(() => undefined);
        return { ...resolved, fullPath: path, stats };
    }
    /* Try to resolve it directly. If this works,
    that means we don't need to perform any resolution for parent directories. */
    try {
        const resolved = resolveMount(path, $);
        // Stat it to make sure it exists
        const stats = await resolved.fs.stat(resolved.path);
        if (!stats.isSymbolicLink()) {
            return { ...resolved, fullPath: path, stats };
        }
        const target = resolve(dirname(path), (await readlink.call($, path)).toString());
        return await _resolve($, target);
    }
    catch {
        // Go the long way
    }
    const { base, dir } = parse(path);
    const realDir = dir == '/' ? '/' : await realpath.call($, dir);
    const maybePath = join(realDir, base);
    const resolved = resolveMount(maybePath, $);
    try {
        const stats = await resolved.fs.stat(resolved.path);
        if (!stats.isSymbolicLink()) {
            return { ...resolved, fullPath: maybePath, stats };
        }
        const target = resolve(realDir, (await readlink.call($, maybePath)).toString());
        return await _resolve($, target);
    }
    catch (e) {
        if (e.code == 'ENOENT') {
            return { ...resolved, fullPath: path };
        }
        throw fixError(e, { [resolved.path]: maybePath });
    }
}
export async function realpath(path, options) {
    var _a;
    const encoding = typeof options == 'string' ? options : ((_a = options === null || options === void 0 ? void 0 : options.encoding) !== null && _a !== void 0 ? _a : 'utf8');
    path = normalizePath(path);
    const { fullPath } = await _resolve(this, path);
    if (encoding == 'utf8' || encoding == 'utf-8')
        return fullPath;
    const buf = Buffer.from(fullPath, 'utf-8');
    if (encoding == 'buffer')
        return buf;
    return buf.toString(encoding);
}
realpath;
export function watch(filename, options = {}) {
    const watcher = new FSWatcher(this, filename.toString(), typeof options !== 'string' ? options : { encoding: options });
    // A queue to hold change events, since we need to resolve them in the async iterator
    const eventQueue = [];
    let done = false;
    watcher.on('change', (eventType, filename) => {
        var _a;
        (_a = eventQueue.shift()) === null || _a === void 0 ? void 0 : _a({ value: { eventType, filename }, done: false });
    });
    function cleanup() {
        done = true;
        watcher.close();
        for (const resolve of eventQueue) {
            resolve({ value: null, done });
        }
        eventQueue.length = 0; // Clear the queue
        return Promise.resolve({ value: null, done: true });
    }
    return {
        async next() {
            if (done)
                return Promise.resolve({ value: null, done });
            const { promise, resolve } = Promise.withResolvers();
            eventQueue.push(resolve);
            return promise;
        },
        return: cleanup,
        throw: cleanup,
        async [Symbol.asyncDispose]() {
            await cleanup();
        },
        [Symbol.asyncIterator]() {
            return this;
        },
    };
}
watch;
export async function access(path, mode = constants.F_OK) {
    if (!config.checkAccess)
        return;
    const stats = await stat.call(this, path);
    if (!stats.hasAccess(mode, this)) {
        throw new ErrnoError(Errno.EACCES);
    }
}
access;
/**
 * Asynchronous `rm`. Removes files or directories (recursively).
 * @param path The path to the file or directory to remove.
 */
export async function rm(path, options) {
    path = normalizePath(path);
    const stats = await lstat.call(this, path).catch((error) => {
        if (error.code == 'ENOENT' && (options === null || options === void 0 ? void 0 : options.force))
            return undefined;
        throw error;
    });
    if (!stats)
        return;
    switch (stats.mode & constants.S_IFMT) {
        case constants.S_IFDIR:
            if (options === null || options === void 0 ? void 0 : options.recursive) {
                for (const entry of (await readdir.call(this, path))) {
                    await rm.call(this, join(path, entry), options);
                }
            }
            await rmdir.call(this, path);
            break;
        case constants.S_IFREG:
        case constants.S_IFLNK:
        case constants.S_IFBLK:
        case constants.S_IFCHR:
            await unlink.call(this, path);
            break;
        case constants.S_IFIFO:
        case constants.S_IFSOCK:
        default:
            throw new ErrnoError(Errno.EPERM, 'File type not supported', path, 'rm');
    }
}
rm;
export async function mkdtemp(prefix, options) {
    const encoding = typeof options === 'object' ? options === null || options === void 0 ? void 0 : options.encoding : options || 'utf8';
    const fsName = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const resolvedPath = '/tmp/' + fsName;
    await mkdir.call(this, resolvedPath);
    return encoding == 'buffer' ? Buffer.from(resolvedPath) : resolvedPath;
}
mkdtemp;
/**
 * Asynchronous `copyFile`. Copies a file.
 * @param src The source file.
 * @param dest The destination file.
 * @param mode Optional flags for the copy operation. Currently supports these flags:
 *    * `fs.constants.COPYFILE_EXCL`: If the destination file already exists, the operation fails.
 */
export async function copyFile(src, dest, mode) {
    src = normalizePath(src);
    dest = normalizePath(dest);
    if (mode && mode & constants.COPYFILE_EXCL && (await exists.call(this, dest))) {
        throw new ErrnoError(Errno.EEXIST, 'Destination file already exists', dest, 'copyFile');
    }
    await writeFile.call(this, dest, await readFile.call(this, src));
    emitChange(this, 'rename', dest.toString());
}
copyFile;
/**
 * Asynchronous `opendir`. Opens a directory.
 * @param path The path to the directory.
 * @param options Options for opening the directory.
 * @returns A `Dir` object representing the opened directory.
 * @todo Use options
 */
export function opendir(path, options) {
    path = normalizePath(path);
    return Promise.resolve(new Dir(path, this));
}
opendir;
/**
 * Asynchronous `cp`. Recursively copies a file or directory.
 * @param source The source file or directory.
 * @param destination The destination file or directory.
 * @param opts Options for the copy operation. Currently supports these options from Node.js 'fs.await cp':
 *   * `dereference`: Dereference symbolic links.
 *   * `errorOnExist`: Throw an error if the destination file or directory already exists.
 *   * `filter`: A function that takes a source and destination path and returns a boolean, indicating whether to copy `source` element.
 *   * `force`: Overwrite the destination if it exists, and overwrite existing readonly destination files.
 *   * `preserveTimestamps`: Preserve file timestamps.
 *   * `recursive`: If `true`, copies directories recursively.
 */
export async function cp(source, destination, opts) {
    source = normalizePath(source);
    destination = normalizePath(destination);
    const srcStats = await lstat.call(this, source); // Use lstat to follow symlinks if not dereferencing
    if ((opts === null || opts === void 0 ? void 0 : opts.errorOnExist) && (await exists.call(this, destination))) {
        throw new ErrnoError(Errno.EEXIST, 'Destination file or directory already exists', destination, 'cp');
    }
    switch (srcStats.mode & constants.S_IFMT) {
        case constants.S_IFDIR: {
            if (!(opts === null || opts === void 0 ? void 0 : opts.recursive)) {
                throw new ErrnoError(Errno.EISDIR, source + ' is a directory (not copied)', source, 'cp');
            }
            const [entries] = await Promise.all([
                readdir.call(this, source, { withFileTypes: true }),
                mkdir.call(this, destination, { recursive: true }),
            ] // Ensure the destination directory exists
            );
            const _cp = async (dirent) => {
                if (opts.filter && !opts.filter(join(source, dirent.name), join(destination, dirent.name))) {
                    return; // Skip if the filter returns false
                }
                await cp.call(this, join(source, dirent.name), join(destination, dirent.name), opts);
            };
            await Promise.all(entries.map(_cp));
            break;
        }
        case constants.S_IFREG:
        case constants.S_IFLNK:
            await copyFile.call(this, source, destination);
            break;
        case constants.S_IFBLK:
        case constants.S_IFCHR:
        case constants.S_IFIFO:
        case constants.S_IFSOCK:
        default:
            throw new ErrnoError(Errno.EPERM, 'File type not supported', source, 'rm');
    }
    // Optionally preserve timestamps
    if (opts === null || opts === void 0 ? void 0 : opts.preserveTimestamps) {
        await utimes.call(this, destination, srcStats.atime, srcStats.mtime);
    }
}
cp;
export async function statfs(path, opts) {
    path = normalizePath(path);
    const { fs } = resolveMount(path, this);
    return Promise.resolve(_statfs(fs, opts === null || opts === void 0 ? void 0 : opts.bigint));
}
export function glob(pattern, opt) {
    pattern = Array.isArray(pattern) ? pattern : [pattern];
    const { cwd = '/', withFileTypes = false, exclude = () => false } = opt || {};
    // Escape special characters in pattern
    const regexPatterns = pattern.map(p => {
        p = p
            .replace(/([.?+^$(){}|[\]/])/g, '$1')
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '.');
        return new RegExp(`^${p}$`);
    });
    async function* recursiveList(dir) {
        const entries = await readdir(dir, { withFileTypes, encoding: 'utf8' });
        for (const entry of entries) {
            const fullPath = withFileTypes ? entry.path : dir + '/' + entry;
            if (exclude((withFileTypes ? entry : fullPath)))
                continue;
            /**
             * @todo is the pattern.source check correct?
             */
            if ((await stat(fullPath)).isDirectory() && regexPatterns.some(pattern => pattern.source.includes('.*'))) {
                yield* recursiveList(fullPath);
            }
            if (regexPatterns.some(pattern => pattern.test(fullPath.replace(/^\/+/g, '')))) {
                yield withFileTypes ? entry : fullPath.replace(/^\/+/g, '');
            }
        }
    }
    return recursiveList(cwd);
}
glob;

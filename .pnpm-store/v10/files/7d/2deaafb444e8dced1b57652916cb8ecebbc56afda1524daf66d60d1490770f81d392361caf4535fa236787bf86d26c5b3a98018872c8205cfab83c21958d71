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
import { credentials } from '../internal/credentials.js';
import { Errno, ErrnoError } from '../internal/error.js';
import { flagToMode, isAppendable, isExclusive, isReadable, isTruncating, isWriteable, parseFlag } from '../internal/file.js';
import { BigIntStats } from '../stats.js';
import { decodeUTF8, normalizeMode, normalizeOptions, normalizePath, normalizeTime } from '../utils.js';
import { config } from './config.js';
import * as constants from './constants.js';
import { Dir, Dirent } from './dir.js';
import { dirname, join, parse, resolve } from './path.js';
import { _statfs, fd2file, fdMap, file2fd, fixError, resolveMount } from './shared.js';
import { emitChange } from './watchers.js';
export function renameSync(oldPath, newPath) {
    oldPath = normalizePath(oldPath);
    newPath = normalizePath(newPath);
    const oldMount = resolveMount(oldPath, this);
    const newMount = resolveMount(newPath, this);
    if (config.checkAccess && !statSync.call(this, dirname(oldPath)).hasAccess(constants.W_OK, this)) {
        throw ErrnoError.With('EACCES', oldPath, 'rename');
    }
    try {
        if (oldMount === newMount) {
            oldMount.fs.renameSync(oldMount.path, newMount.path);
            emitChange(this, 'rename', oldPath.toString());
            emitChange(this, 'change', newPath.toString());
            return;
        }
        writeFileSync.call(this, newPath, readFileSync(oldPath));
        unlinkSync.call(this, oldPath);
        emitChange(this, 'rename', oldPath.toString());
    }
    catch (e) {
        throw fixError(e, { [oldMount.path]: oldPath, [newMount.path]: newPath });
    }
}
renameSync;
/**
 * Test whether or not `path` exists by checking with the file system.
 */
export function existsSync(path) {
    path = normalizePath(path);
    try {
        const { fs, path: resolvedPath } = resolveMount(realpathSync.call(this, path), this);
        return fs.existsSync(resolvedPath);
    }
    catch (e) {
        if (e.errno == Errno.ENOENT) {
            return false;
        }
        throw e;
    }
}
existsSync;
export function statSync(path, options) {
    path = normalizePath(path);
    const { fs, path: resolved } = resolveMount(realpathSync.call(this, path), this);
    try {
        const stats = fs.statSync(resolved);
        if (config.checkAccess && !stats.hasAccess(constants.R_OK, this)) {
            throw ErrnoError.With('EACCES', resolved, 'stat');
        }
        return (options === null || options === void 0 ? void 0 : options.bigint) ? new BigIntStats(stats) : stats;
    }
    catch (e) {
        throw fixError(e, { [resolved]: path });
    }
}
statSync;
export function lstatSync(path, options) {
    path = normalizePath(path);
    const { fs, path: resolved } = resolveMount(path, this);
    try {
        const stats = fs.statSync(resolved);
        return (options === null || options === void 0 ? void 0 : options.bigint) ? new BigIntStats(stats) : stats;
    }
    catch (e) {
        throw fixError(e, { [resolved]: path });
    }
}
lstatSync;
export function truncateSync(path, len = 0) {
    const env_1 = { stack: [], error: void 0, hasError: false };
    try {
        const file = __addDisposableResource(env_1, _openSync.call(this, path, { flag: 'r+' }), false);
        len || (len = 0);
        if (len < 0) {
            throw new ErrnoError(Errno.EINVAL);
        }
        file.truncateSync(len);
    }
    catch (e_1) {
        env_1.error = e_1;
        env_1.hasError = true;
    }
    finally {
        __disposeResources(env_1);
    }
}
truncateSync;
export function unlinkSync(path) {
    path = normalizePath(path);
    const { fs, path: resolved } = resolveMount(path, this);
    try {
        if (config.checkAccess && !fs.statSync(resolved).hasAccess(constants.W_OK, this)) {
            throw ErrnoError.With('EACCES', resolved, 'unlink');
        }
        fs.unlinkSync(resolved);
        emitChange(this, 'rename', path.toString());
    }
    catch (e) {
        throw fixError(e, { [resolved]: path });
    }
}
unlinkSync;
/**
 * Manually apply setuid/setgid.
 */
function applySetId(file, uid, gid) {
    if (file.fs.attributes.has('setid'))
        return;
    const parent = file.fs.statSync(dirname(file.path));
    file.chownSync(parent.mode & constants.S_ISUID ? parent.uid : uid, // manually apply setuid/setgid
    parent.mode & constants.S_ISGID ? parent.gid : gid);
}
function _openSync(path, opt) {
    var _a;
    path = normalizePath(path);
    const mode = normalizeMode(opt.mode, 0o644), flag = parseFlag(opt.flag);
    path = opt.preserveSymlinks ? path : realpathSync.call(this, path);
    const { fs, path: resolved } = resolveMount(path, this);
    let stats;
    try {
        stats = fs.statSync(resolved);
    }
    catch {
        // nothing
    }
    if (!stats) {
        if ((!isWriteable(flag) && !isAppendable(flag)) || flag == 'r+') {
            throw ErrnoError.With('ENOENT', path, '_open');
        }
        // Create the file
        const parentStats = fs.statSync(dirname(resolved));
        if (config.checkAccess && !parentStats.hasAccess(constants.W_OK, this)) {
            throw ErrnoError.With('EACCES', dirname(path), '_open');
        }
        if (!parentStats.isDirectory()) {
            throw ErrnoError.With('ENOTDIR', dirname(path), '_open');
        }
        const { euid: uid, egid: gid } = (_a = this === null || this === void 0 ? void 0 : this.credentials) !== null && _a !== void 0 ? _a : credentials;
        const file = fs.createFileSync(resolved, flag, mode, { uid, gid });
        if (!opt.allowDirectory && mode & constants.S_IFDIR)
            throw ErrnoError.With('EISDIR', path, '_open');
        applySetId(file, uid, gid);
        return file;
    }
    if (config.checkAccess && (!stats.hasAccess(mode, this) || !stats.hasAccess(flagToMode(flag), this))) {
        throw ErrnoError.With('EACCES', path, '_open');
    }
    if (isExclusive(flag)) {
        throw ErrnoError.With('EEXIST', path, '_open');
    }
    const file = fs.openFileSync(resolved, flag);
    if (isTruncating(flag)) {
        file.truncateSync(0);
    }
    if (!opt.allowDirectory && stats.mode & constants.S_IFDIR)
        throw ErrnoError.With('EISDIR', path, '_open');
    return file;
}
/**
 * Synchronous file open.
 * @see http://www.manpagez.com/man/2/open/
 */
export function openSync(path, flag, mode = constants.F_OK) {
    return file2fd(_openSync.call(this, path, { flag, mode }));
}
openSync;
/**
 * Opens a file or symlink
 * @internal
 */
export function lopenSync(path, flag, mode) {
    return file2fd(_openSync.call(this, path, { flag, mode, preserveSymlinks: true }));
}
function _readFileSync(path, flag, preserveSymlinks) {
    const env_2 = { stack: [], error: void 0, hasError: false };
    try {
        path = normalizePath(path);
        // Get file.
        const file = __addDisposableResource(env_2, _openSync.call(this, path, { flag, mode: 0o644, preserveSymlinks }), false);
        const stat = file.statSync();
        // Allocate buffer.
        const data = new Uint8Array(stat.size);
        file.readSync(data, 0, stat.size, 0);
        return data;
    }
    catch (e_2) {
        env_2.error = e_2;
        env_2.hasError = true;
    }
    finally {
        __disposeResources(env_2);
    }
}
export function readFileSync(path, _options = {}) {
    const options = normalizeOptions(_options, null, 'r', 0o644);
    const flag = parseFlag(options.flag);
    if (!isReadable(flag)) {
        throw new ErrnoError(Errno.EINVAL, 'Flag passed to readFile must allow for reading');
    }
    const data = Buffer.from(_readFileSync.call(this, typeof path == 'number' ? fd2file(path).path : path, options.flag, false));
    return options.encoding ? data.toString(options.encoding) : data;
}
readFileSync;
export function writeFileSync(path, data, _options = {}) {
    const env_3 = { stack: [], error: void 0, hasError: false };
    try {
        const options = normalizeOptions(_options, 'utf8', 'w+', 0o644);
        const flag = parseFlag(options.flag);
        if (!isWriteable(flag)) {
            throw new ErrnoError(Errno.EINVAL, 'Flag passed to writeFile must allow for writing');
        }
        if (typeof data != 'string' && !options.encoding) {
            throw new ErrnoError(Errno.EINVAL, 'Encoding not specified');
        }
        const encodedData = typeof data == 'string' ? Buffer.from(data, options.encoding) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        if (!encodedData) {
            throw new ErrnoError(Errno.EINVAL, 'Data not specified');
        }
        const file = __addDisposableResource(env_3, _openSync.call(this, typeof path == 'number' ? fd2file(path).path : path.toString(), {
            flag,
            mode: options.mode,
            preserveSymlinks: true,
        }), false);
        file.writeSync(encodedData, 0, encodedData.byteLength, 0);
        emitChange(this, 'change', path.toString());
    }
    catch (e_3) {
        env_3.error = e_3;
        env_3.hasError = true;
    }
    finally {
        __disposeResources(env_3);
    }
}
writeFileSync;
/**
 * Asynchronously append data to a file, creating the file if it not yet exists.
 * @option encoding Defaults to `'utf8'`.
 * @option mode Defaults to `0644`.
 * @option flag Defaults to `'a+'`.
 */
export function appendFileSync(filename, data, _options = {}) {
    const env_4 = { stack: [], error: void 0, hasError: false };
    try {
        const options = normalizeOptions(_options, 'utf8', 'a+', 0o644);
        const flag = parseFlag(options.flag);
        if (!isAppendable(flag)) {
            throw new ErrnoError(Errno.EINVAL, 'Flag passed to appendFile must allow for appending');
        }
        if (typeof data != 'string' && !options.encoding) {
            throw new ErrnoError(Errno.EINVAL, 'Encoding not specified');
        }
        const encodedData = typeof data == 'string' ? Buffer.from(data, options.encoding) : new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        const file = __addDisposableResource(env_4, _openSync.call(this, typeof filename == 'number' ? fd2file(filename).path : filename.toString(), {
            flag,
            mode: options.mode,
            preserveSymlinks: true,
        }), false);
        file.writeSync(encodedData, 0, encodedData.byteLength);
    }
    catch (e_4) {
        env_4.error = e_4;
        env_4.hasError = true;
    }
    finally {
        __disposeResources(env_4);
    }
}
appendFileSync;
export function fstatSync(fd, options) {
    const stats = fd2file(fd).statSync();
    return (options === null || options === void 0 ? void 0 : options.bigint) ? new BigIntStats(stats) : stats;
}
fstatSync;
export function closeSync(fd) {
    fd2file(fd).closeSync();
    fdMap.delete(fd);
}
closeSync;
export function ftruncateSync(fd, len = 0) {
    len || (len = 0);
    if (len < 0) {
        throw new ErrnoError(Errno.EINVAL);
    }
    fd2file(fd).truncateSync(len);
}
ftruncateSync;
export function fsyncSync(fd) {
    fd2file(fd).syncSync();
}
fsyncSync;
export function fdatasyncSync(fd) {
    fd2file(fd).datasyncSync();
}
fdatasyncSync;
export function writeSync(fd, data, posOrOff, lenOrEnc, pos) {
    let buffer, offset, length, position;
    if (typeof data === 'string') {
        // Signature 1: (fd, string, [position?, [encoding?]])
        position = typeof posOrOff === 'number' ? posOrOff : null;
        const encoding = typeof lenOrEnc === 'string' ? lenOrEnc : 'utf8';
        offset = 0;
        buffer = Buffer.from(data, encoding);
        length = buffer.byteLength;
    }
    else {
        // Signature 2: (fd, buffer, offset, length, position?)
        buffer = new Uint8Array(data.buffer, data.byteOffset, data.byteLength);
        offset = posOrOff;
        length = lenOrEnc;
        position = typeof pos === 'number' ? pos : null;
    }
    const file = fd2file(fd);
    position !== null && position !== void 0 ? position : (position = file.position);
    const bytesWritten = file.writeSync(buffer, offset, length, position);
    emitChange(this, 'change', file.path);
    return bytesWritten;
}
writeSync;
/**
 * Read data from the file specified by `fd`.
 * @param buffer The buffer that the data will be written to.
 * @param offset The offset within the buffer where writing will start.
 * @param length An integer specifying the number of bytes to read.
 * @param position An integer specifying where to begin reading from in the file.
 * If position is null, data will be read from the current file position.
 */
export function readSync(fd, buffer, options, length, position) {
    const file = fd2file(fd);
    const offset = typeof options == 'object' ? options.offset : options;
    if (typeof options == 'object') {
        length = options.length;
        position = options.position;
    }
    position = Number(position);
    if (isNaN(position)) {
        position = file.position;
    }
    return file.readSync(buffer, offset, length, position);
}
readSync;
export function fchownSync(fd, uid, gid) {
    fd2file(fd).chownSync(uid, gid);
}
fchownSync;
export function fchmodSync(fd, mode) {
    const numMode = normalizeMode(mode, -1);
    if (numMode < 0) {
        throw new ErrnoError(Errno.EINVAL, `Invalid mode.`);
    }
    fd2file(fd).chmodSync(numMode);
}
fchmodSync;
/**
 * Change the file timestamps of a file referenced by the supplied file descriptor.
 */
export function futimesSync(fd, atime, mtime) {
    fd2file(fd).utimesSync(normalizeTime(atime), normalizeTime(mtime));
}
futimesSync;
export function rmdirSync(path) {
    path = normalizePath(path);
    const { fs, path: resolved } = resolveMount(realpathSync.call(this, path), this);
    try {
        const stats = fs.statSync(resolved);
        if (!stats.isDirectory()) {
            throw ErrnoError.With('ENOTDIR', resolved, 'rmdir');
        }
        if (config.checkAccess && !stats.hasAccess(constants.W_OK, this)) {
            throw ErrnoError.With('EACCES', resolved, 'rmdir');
        }
        fs.rmdirSync(resolved);
        emitChange(this, 'rename', path.toString());
    }
    catch (e) {
        throw fixError(e, { [resolved]: path });
    }
}
rmdirSync;
export function mkdirSync(path, options) {
    var _a, _b;
    const { euid: uid, egid: gid } = (_a = this === null || this === void 0 ? void 0 : this.credentials) !== null && _a !== void 0 ? _a : credentials;
    options = typeof options === 'object' ? options : { mode: options };
    const mode = normalizeMode(options === null || options === void 0 ? void 0 : options.mode, 0o777);
    path = realpathSync.call(this, path);
    const { fs, path: resolved, root } = resolveMount(path, this);
    const errorPaths = { [resolved]: path };
    try {
        if (!(options === null || options === void 0 ? void 0 : options.recursive)) {
            if (config.checkAccess && !fs.statSync(dirname(resolved)).hasAccess(constants.W_OK, this)) {
                throw ErrnoError.With('EACCES', dirname(resolved), 'mkdir');
            }
            fs.mkdirSync(resolved, mode, { uid, gid });
            applySetId(fs.openFileSync(resolved, 'r+'), uid, gid);
            return;
        }
        const dirs = [];
        for (let dir = resolved, original = path; !fs.existsSync(dir); dir = dirname(dir), original = dirname(original)) {
            dirs.unshift(dir);
            errorPaths[dir] = original;
        }
        for (const dir of dirs) {
            if (config.checkAccess && !fs.statSync(dirname(dir)).hasAccess(constants.W_OK, this)) {
                throw ErrnoError.With('EACCES', dirname(dir), 'mkdir');
            }
            fs.mkdirSync(dir, mode, { uid, gid });
            applySetId(fs.openFileSync(dir, 'r+'), uid, gid);
            emitChange(this, 'rename', dir);
        }
        return root.length == 1 ? dirs[0] : (_b = dirs[0]) === null || _b === void 0 ? void 0 : _b.slice(root.length);
    }
    catch (e) {
        throw fixError(e, errorPaths);
    }
}
mkdirSync;
export function readdirSync(path, options) {
    options = typeof options === 'object' ? options : { encoding: options };
    path = normalizePath(path);
    const { fs, path: resolved } = resolveMount(realpathSync.call(this, path), this);
    let entries;
    try {
        const stats = fs.statSync(resolved);
        if (config.checkAccess && !stats.hasAccess(constants.R_OK, this)) {
            throw ErrnoError.With('EACCES', resolved, 'readdir');
        }
        if (!stats.isDirectory()) {
            throw ErrnoError.With('ENOTDIR', resolved, 'readdir');
        }
        entries = fs.readdirSync(resolved);
    }
    catch (e) {
        throw fixError(e, { [resolved]: path });
    }
    // Iterate over entries and handle recursive case if needed
    const values = [];
    for (const entry of entries) {
        let entryStat;
        try {
            entryStat = fs.statSync(join(resolved, entry));
        }
        catch {
            continue;
        }
        if (options === null || options === void 0 ? void 0 : options.withFileTypes) {
            values.push(new Dirent(entry, entryStat));
        }
        else if ((options === null || options === void 0 ? void 0 : options.encoding) == 'buffer') {
            values.push(Buffer.from(entry));
        }
        else {
            values.push(entry);
        }
        if (!entryStat.isDirectory() || !(options === null || options === void 0 ? void 0 : options.recursive))
            continue;
        for (const subEntry of readdirSync.call(this, join(path, entry), options)) {
            if (subEntry instanceof Dirent) {
                subEntry.path = join(entry, subEntry.path);
                values.push(subEntry);
            }
            else if (Buffer.isBuffer(subEntry)) {
                values.push(Buffer.from(join(entry, decodeUTF8(subEntry))));
            }
            else {
                values.push(join(entry, subEntry));
            }
        }
    }
    return values;
}
readdirSync;
export function linkSync(targetPath, linkPath) {
    targetPath = normalizePath(targetPath);
    if (config.checkAccess && !statSync(dirname(targetPath)).hasAccess(constants.R_OK, this)) {
        throw ErrnoError.With('EACCES', dirname(targetPath), 'link');
    }
    linkPath = normalizePath(linkPath);
    if (config.checkAccess && !statSync(dirname(linkPath)).hasAccess(constants.W_OK, this)) {
        throw ErrnoError.With('EACCES', dirname(linkPath), 'link');
    }
    const { fs, path } = resolveMount(targetPath, this);
    const link = resolveMount(linkPath, this);
    if (fs != link.fs) {
        throw ErrnoError.With('EXDEV', linkPath, 'link');
    }
    try {
        if (config.checkAccess && !fs.statSync(path).hasAccess(constants.R_OK, this)) {
            throw ErrnoError.With('EACCES', path, 'link');
        }
        return fs.linkSync(path, link.path);
    }
    catch (e) {
        throw fixError(e, { [path]: targetPath, [link.path]: linkPath });
    }
}
linkSync;
/**
 * Synchronous `symlink`.
 * @param target target path
 * @param path link path
 * @param type can be either `'dir'` or `'file'` (default is `'file'`)
 */
export function symlinkSync(target, path, type = 'file') {
    if (!['file', 'dir', 'junction'].includes(type)) {
        throw new ErrnoError(Errno.EINVAL, 'Invalid type: ' + type);
    }
    if (existsSync.call(this, path)) {
        throw ErrnoError.With('EEXIST', path.toString(), 'symlink');
    }
    writeFileSync.call(this, path, normalizePath(target, true));
    const file = _openSync.call(this, path, { flag: 'r+', mode: 0o644, preserveSymlinks: true });
    file.chmodSync(constants.S_IFLNK);
}
symlinkSync;
export function readlinkSync(path, options) {
    const value = Buffer.from(_readFileSync.call(this, path, 'r', true));
    const encoding = typeof options == 'object' ? options === null || options === void 0 ? void 0 : options.encoding : options;
    if (encoding == 'buffer') {
        return value;
    }
    // always defaults to utf-8 to avoid wrangler (cloudflare) worker "unknown encoding" exception
    return value.toString(encoding !== null && encoding !== void 0 ? encoding : 'utf-8');
}
readlinkSync;
export function chownSync(path, uid, gid) {
    const fd = openSync.call(this, path, 'r+');
    fchownSync(fd, uid, gid);
    closeSync(fd);
}
chownSync;
export function lchownSync(path, uid, gid) {
    const fd = lopenSync.call(this, path, 'r+');
    fchownSync(fd, uid, gid);
    closeSync(fd);
}
lchownSync;
export function chmodSync(path, mode) {
    const fd = openSync.call(this, path, 'r+');
    fchmodSync(fd, mode);
    closeSync(fd);
}
chmodSync;
export function lchmodSync(path, mode) {
    const fd = lopenSync.call(this, path, 'r+');
    fchmodSync(fd, mode);
    closeSync(fd);
}
lchmodSync;
/**
 * Change file timestamps of the file referenced by the supplied path.
 */
export function utimesSync(path, atime, mtime) {
    const fd = openSync.call(this, path, 'r+');
    futimesSync(fd, atime, mtime);
    closeSync(fd);
}
utimesSync;
/**
 * Change file timestamps of the file referenced by the supplied path.
 */
export function lutimesSync(path, atime, mtime) {
    const fd = lopenSync.call(this, path, 'r+');
    futimesSync(fd, atime, mtime);
    closeSync(fd);
}
lutimesSync;
/**
 * Resolves the mount and real path for a path.
 * Additionally, any stats fetched will be returned for de-duplication
 * @internal @hidden
 */
function _resolveSync($, path, preserveSymlinks) {
    if (preserveSymlinks) {
        const resolved = resolveMount(path, $);
        const stats = resolved.fs.statSync(resolved.path);
        return { ...resolved, fullPath: path, stats };
    }
    /* Try to resolve it directly. If this works,
    that means we don't need to perform any resolution for parent directories. */
    try {
        const resolved = resolveMount(path, $);
        // Stat it to make sure it exists
        const stats = resolved.fs.statSync(resolved.path);
        if (!stats.isSymbolicLink()) {
            return { ...resolved, fullPath: path, stats };
        }
        const target = resolve(dirname(path), readlinkSync.call($, path).toString());
        return _resolveSync($, target);
    }
    catch {
        // Go the long way
    }
    const { base, dir } = parse(path);
    const realDir = dir == '/' ? '/' : realpathSync.call($, dir);
    const maybePath = join(realDir, base);
    const resolved = resolveMount(maybePath, $);
    try {
        const stats = resolved.fs.statSync(resolved.path);
        if (!stats.isSymbolicLink()) {
            return { ...resolved, fullPath: maybePath, stats };
        }
        const target = resolve(realDir, readlinkSync.call($, maybePath).toString());
        return _resolveSync($, target);
    }
    catch (e) {
        if (e.code == 'ENOENT') {
            return { ...resolved, fullPath: path };
        }
        throw fixError(e, { [resolved.path]: maybePath });
    }
}
export function realpathSync(path, options) {
    var _a;
    const encoding = typeof options == 'string' ? options : ((_a = options === null || options === void 0 ? void 0 : options.encoding) !== null && _a !== void 0 ? _a : 'utf8');
    path = normalizePath(path);
    const { fullPath } = _resolveSync(this, path);
    if (encoding == 'utf8' || encoding == 'utf-8')
        return fullPath;
    const buf = Buffer.from(fullPath, 'utf-8');
    if (encoding == 'buffer')
        return buf;
    return buf.toString(encoding);
}
realpathSync;
export function accessSync(path, mode = 0o600) {
    if (!config.checkAccess)
        return;
    if (!statSync.call(this, path).hasAccess(mode, this)) {
        throw new ErrnoError(Errno.EACCES);
    }
}
accessSync;
/**
 * Synchronous `rm`. Removes files or directories (recursively).
 * @param path The path to the file or directory to remove.
 */
export function rmSync(path, options) {
    path = normalizePath(path);
    let stats;
    try {
        stats = lstatSync.bind(this)(path);
    }
    catch (error) {
        if (error.code != 'ENOENT' || !(options === null || options === void 0 ? void 0 : options.force))
            throw error;
    }
    if (!stats)
        return;
    switch (stats.mode & constants.S_IFMT) {
        case constants.S_IFDIR:
            if (options === null || options === void 0 ? void 0 : options.recursive) {
                for (const entry of readdirSync.call(this, path)) {
                    rmSync.call(this, join(path, entry), options);
                }
            }
            rmdirSync.call(this, path);
            break;
        case constants.S_IFREG:
        case constants.S_IFLNK:
        case constants.S_IFBLK:
        case constants.S_IFCHR:
            unlinkSync.call(this, path);
            break;
        case constants.S_IFIFO:
        case constants.S_IFSOCK:
        default:
            throw new ErrnoError(Errno.EPERM, 'File type not supported', path, 'rm');
    }
}
rmSync;
export function mkdtempSync(prefix, options) {
    const encoding = typeof options === 'object' ? options === null || options === void 0 ? void 0 : options.encoding : options || 'utf8';
    const fsName = `${prefix}${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const resolvedPath = '/tmp/' + fsName;
    mkdirSync.call(this, resolvedPath);
    return encoding == 'buffer' ? Buffer.from(resolvedPath) : resolvedPath;
}
mkdtempSync;
/**
 * Synchronous `copyFile`. Copies a file.
 * @param flags Optional flags for the copy operation. Currently supports these flags:
 * - `fs.constants.COPYFILE_EXCL`: If the destination file already exists, the operation fails.
 */
export function copyFileSync(source, destination, flags) {
    source = normalizePath(source);
    destination = normalizePath(destination);
    if (flags && flags & constants.COPYFILE_EXCL && existsSync(destination)) {
        throw new ErrnoError(Errno.EEXIST, 'Destination file already exists', destination, 'copyFile');
    }
    writeFileSync.call(this, destination, readFileSync(source));
    emitChange(this, 'rename', destination.toString());
}
copyFileSync;
/**
 * Synchronous `readv`. Reads from a file descriptor into multiple buffers.
 * @param fd The file descriptor.
 * @param buffers An array of Uint8Array buffers.
 * @param position The position in the file where to begin reading.
 * @returns The number of bytes read.
 */
export function readvSync(fd, buffers, position) {
    const file = fd2file(fd);
    let bytesRead = 0;
    for (const buffer of buffers) {
        bytesRead += file.readSync(buffer, 0, buffer.byteLength, position + bytesRead);
    }
    return bytesRead;
}
readvSync;
/**
 * Synchronous `writev`. Writes from multiple buffers into a file descriptor.
 * @param fd The file descriptor.
 * @param buffers An array of Uint8Array buffers.
 * @param position The position in the file where to begin writing.
 * @returns The number of bytes written.
 */
export function writevSync(fd, buffers, position) {
    const file = fd2file(fd);
    let bytesWritten = 0;
    for (const buffer of buffers) {
        bytesWritten += file.writeSync(new Uint8Array(buffer.buffer), 0, buffer.byteLength, position + bytesWritten);
    }
    return bytesWritten;
}
writevSync;
/**
 * Synchronous `opendir`. Opens a directory.
 * @param path The path to the directory.
 * @param options Options for opening the directory.
 * @returns A `Dir` object representing the opened directory.
 * @todo Handle options
 */
export function opendirSync(path, options) {
    path = normalizePath(path);
    return new Dir(path, this);
}
opendirSync;
/**
 * Synchronous `cp`. Recursively copies a file or directory.
 * @param source The source file or directory.
 * @param destination The destination file or directory.
 * @param opts Options for the copy operation. Currently supports these options from Node.js 'fs.cpSync':
 * - `dereference`: Dereference symbolic links. *(unconfirmed)*
 * - `errorOnExist`: Throw an error if the destination file or directory already exists.
 * - `filter`: A function that takes a source and destination path and returns a boolean, indicating whether to copy `source` element.
 * - `force`: Overwrite the destination if it exists, and overwrite existing readonly destination files. *(unconfirmed)*
 * - `preserveTimestamps`: Preserve file timestamps.
 * - `recursive`: If `true`, copies directories recursively.
 */
export function cpSync(source, destination, opts) {
    source = normalizePath(source);
    destination = normalizePath(destination);
    const srcStats = lstatSync.call(this, source); // Use lstat to follow symlinks if not dereferencing
    if ((opts === null || opts === void 0 ? void 0 : opts.errorOnExist) && existsSync.call(this, destination)) {
        throw new ErrnoError(Errno.EEXIST, 'Destination file or directory already exists', destination, 'cp');
    }
    switch (srcStats.mode & constants.S_IFMT) {
        case constants.S_IFDIR:
            if (!(opts === null || opts === void 0 ? void 0 : opts.recursive)) {
                throw new ErrnoError(Errno.EISDIR, source + ' is a directory (not copied)', source, 'cp');
            }
            mkdirSync.call(this, destination, { recursive: true }); // Ensure the destination directory exists
            for (const dirent of readdirSync.call(this, source, { withFileTypes: true })) {
                if (opts.filter && !opts.filter(join(source, dirent.name), join(destination, dirent.name))) {
                    continue; // Skip if the filter returns false
                }
                cpSync.call(this, join(source, dirent.name), join(destination, dirent.name), opts);
            }
            break;
        case constants.S_IFREG:
        case constants.S_IFLNK:
            copyFileSync.call(this, source, destination);
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
        utimesSync.call(this, destination, srcStats.atime, srcStats.mtime);
    }
}
cpSync;
export function statfsSync(path, options) {
    path = normalizePath(path);
    const { fs } = resolveMount(path, this);
    return _statfs(fs, options === null || options === void 0 ? void 0 : options.bigint);
}
export function globSync(pattern, options = {}) {
    pattern = Array.isArray(pattern) ? pattern : [pattern];
    const { cwd = '/', withFileTypes = false, exclude = () => false } = options;
    // Escape special characters in pattern
    const regexPatterns = pattern.map(p => {
        p = p
            .replace(/([.?+^$(){}|[\]/])/g, '\\$1')
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '.');
        return new RegExp(`^${p}$`);
    });
    const results = [];
    function recursiveList(dir) {
        const entries = readdirSync(dir, { withFileTypes, encoding: 'utf8' });
        for (const entry of entries) {
            const fullPath = withFileTypes ? entry.path : dir + '/' + entry;
            if (exclude((withFileTypes ? entry : fullPath)))
                continue;
            /**
             * @todo is the pattern.source check correct?
             */
            if (statSync(fullPath).isDirectory() && regexPatterns.some(pattern => pattern.source.includes('.*'))) {
                recursiveList(fullPath);
            }
            if (regexPatterns.some(pattern => pattern.test(fullPath.replace(/^\/+/g, '')))) {
                results.push(withFileTypes ? entry.path : fullPath.replace(/^\/+/g, ''));
            }
        }
    }
    recursiveList(cwd);
    return results;
}
globSync;

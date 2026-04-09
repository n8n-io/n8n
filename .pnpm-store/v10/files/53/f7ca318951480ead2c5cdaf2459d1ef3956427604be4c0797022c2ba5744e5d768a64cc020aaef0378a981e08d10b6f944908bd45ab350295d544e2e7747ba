import { Buffer } from 'buffer';
import { Errno, ErrnoError } from '../internal/error.js';
import { BigIntStats } from '../stats.js';
import { normalizeMode, normalizePath } from '../utils.js';
import { R_OK } from './constants.js';
import * as promises from './promises.js';
import { fd2file, fdMap } from './shared.js';
import { ReadStream, WriteStream } from './streams.js';
import { FSWatcher, StatWatcher } from './watchers.js';
const nop = () => { };
/**
 * Helper to collect an async iterator into an array
 */
async function collectAsyncIterator(it) {
    const results = [];
    for await (const result of it) {
        results.push(result);
    }
    return results;
}
/**
 * Asynchronous rename. No arguments other than a possible exception are given to the completion callback.
 */
export function rename(oldPath, newPath, cb = nop) {
    promises.rename
        .call(this, oldPath, newPath)
        .then(() => cb())
        .catch(cb);
}
rename;
/**
 * Test whether or not `path` exists by checking with the file system.
 * Then call the callback argument with either true or false.
 * @deprecated Use {@link stat} or {@link access} instead.
 */
export function exists(path, cb = nop) {
    promises.exists
        .call(this, path)
        .then(cb)
        .catch(() => cb(false));
}
exists;
export function stat(path, options, callback = nop) {
    callback = typeof options == 'function' ? options : callback;
    promises.stat
        .call(this, path, typeof options != 'function' ? options : {})
        .then(stats => callback(undefined, stats))
        .catch(callback);
}
stat;
export function lstat(path, options, callback = nop) {
    callback = typeof options == 'function' ? options : callback;
    promises.lstat
        .call(this, path, typeof options != 'function' ? options : {})
        .then(stats => callback(undefined, stats))
        .catch(callback);
}
lstat;
export function truncate(path, cbLen = 0, cb = nop) {
    cb = typeof cbLen === 'function' ? cbLen : cb;
    const len = typeof cbLen === 'number' ? cbLen : 0;
    promises.truncate
        .call(this, path, len)
        .then(() => cb())
        .catch(cb);
}
truncate;
export function unlink(path, cb = nop) {
    promises.unlink
        .call(this, path)
        .then(() => cb())
        .catch(cb);
}
unlink;
export function open(path, flag, cbMode, cb = nop) {
    const mode = normalizeMode(cbMode, 0o644);
    cb = typeof cbMode === 'function' ? cbMode : cb;
    promises.open
        .call(this, path, flag, mode)
        .then(handle => cb(undefined, handle.fd))
        .catch(cb);
}
open;
export function readFile(filename, options, cb = nop) {
    cb = typeof options === 'function' ? options : cb;
    promises.readFile
        .call(this, filename, typeof options === 'function' ? null : options)
        .then(data => cb(undefined, data))
        .catch(cb);
}
readFile;
export function writeFile(filename, data, cbEncOpts, cb = nop) {
    cb = typeof cbEncOpts === 'function' ? cbEncOpts : cb;
    promises.writeFile
        .call(this, filename, data, typeof cbEncOpts != 'function' ? cbEncOpts : null)
        .then(() => cb(undefined))
        .catch(cb);
}
writeFile;
export function appendFile(filename, data, cbEncOpts, cb = nop) {
    const optionsOrEncoding = typeof cbEncOpts != 'function' ? cbEncOpts : undefined;
    cb = typeof cbEncOpts === 'function' ? cbEncOpts : cb;
    promises.appendFile
        .call(this, filename, data, optionsOrEncoding)
        .then(() => cb())
        .catch(cb);
}
appendFile;
export function fstat(fd, options, cb = nop) {
    cb = typeof options == 'function' ? options : cb;
    fd2file(fd)
        .stat()
        .then(stats => cb(undefined, typeof options == 'object' && (options === null || options === void 0 ? void 0 : options.bigint) ? new BigIntStats(stats) : stats))
        .catch(cb);
}
fstat;
export function close(fd, cb = nop) {
    const close = fd2file(fd).close();
    fdMap.delete(fd);
    close.then(() => cb()).catch(cb);
}
close;
export function ftruncate(fd, lenOrCB, cb = nop) {
    const length = typeof lenOrCB === 'number' ? lenOrCB : 0;
    cb = typeof lenOrCB === 'function' ? lenOrCB : cb;
    const file = fd2file(fd);
    if (length < 0) {
        throw new ErrnoError(Errno.EINVAL);
    }
    file.truncate(length)
        .then(() => cb())
        .catch(cb);
}
ftruncate;
export function fsync(fd, cb = nop) {
    fd2file(fd)
        .sync()
        .then(() => cb())
        .catch(cb);
}
fsync;
export function fdatasync(fd, cb = nop) {
    fd2file(fd)
        .datasync()
        .then(() => cb())
        .catch(cb);
}
fdatasync;
export function write(fd, data, cbPosOff, cbLenEnc, cbPosEnc, cb = nop) {
    let buffer, offset, length, position, encoding;
    const handle = new promises.FileHandle(fd, this);
    if (typeof data === 'string') {
        // Signature 1: (fd, string, [position?, [encoding?]], cb?)
        encoding = 'utf8';
        switch (typeof cbPosOff) {
            case 'function':
                // (fd, string, cb)
                cb = cbPosOff;
                break;
            case 'number':
                // (fd, string, position, encoding?, cb?)
                position = cbPosOff;
                encoding = typeof cbLenEnc === 'string' ? cbLenEnc : 'utf8';
                cb = typeof cbPosEnc === 'function' ? cbPosEnc : cb;
                break;
            default:
                // ...try to find the callback and get out of here!
                cb = (typeof cbLenEnc === 'function' ? cbLenEnc : typeof cbPosEnc === 'function' ? cbPosEnc : cb);
                cb(new ErrnoError(Errno.EINVAL, 'Invalid arguments'));
                return;
        }
        buffer = Buffer.from(data);
        offset = 0;
        length = buffer.length;
        const _cb = cb;
        handle
            .write(buffer, offset, length, position)
            .then(({ bytesWritten }) => _cb(undefined, bytesWritten, buffer.toString(encoding)))
            .catch(_cb);
    }
    else {
        // Signature 2: (fd, buffer, offset, length, position?, cb?)
        buffer = Buffer.from(data.buffer);
        offset = cbPosOff;
        length = cbLenEnc;
        position = typeof cbPosEnc === 'number' ? cbPosEnc : null;
        const _cb = (typeof cbPosEnc === 'function' ? cbPosEnc : cb);
        void handle
            .write(buffer, offset, length, position)
            .then(({ bytesWritten }) => _cb(undefined, bytesWritten, buffer))
            .catch(_cb);
    }
}
write;
/**
 * Read data from the file specified by `fd`.
 * @param buffer The buffer that the data will be written to.
 * @param offset The offset within the buffer where writing will start.
 * @param length An integer specifying the number of bytes to read.
 * @param position An integer specifying where to begin reading from in the file.
 * If position is null, data will be read from the current file position.
 * @param cb The number is the number of bytes read
 */
export function read(fd, buffer, offset, length, position, cb = nop) {
    new promises.FileHandle(fd, this)
        .read(buffer, offset, length, position)
        .then(({ bytesRead, buffer }) => cb(undefined, bytesRead, buffer))
        .catch(cb);
}
read;
export function fchown(fd, uid, gid, cb = nop) {
    new promises.FileHandle(fd, this)
        .chown(uid, gid)
        .then(() => cb())
        .catch(cb);
}
fchown;
export function fchmod(fd, mode, cb) {
    new promises.FileHandle(fd, this)
        .chmod(mode)
        .then(() => cb())
        .catch(cb);
}
fchmod;
/**
 * Change the file timestamps of a file referenced by the supplied file descriptor.
 */
export function futimes(fd, atime, mtime, cb = nop) {
    new promises.FileHandle(fd, this)
        .utimes(atime, mtime)
        .then(() => cb())
        .catch(cb);
}
futimes;
export function rmdir(path, cb = nop) {
    promises.rmdir
        .call(this, path)
        .then(() => cb())
        .catch(cb);
}
rmdir;
/**
 * Asynchronous `mkdir`.
 * @param mode defaults to `0777`
 */
export function mkdir(path, mode, cb = nop) {
    promises.mkdir
        .call(this, path, mode)
        .then(() => cb())
        .catch(cb);
}
mkdir;
export function readdir(path, _options, cb = nop) {
    cb = typeof _options == 'function' ? _options : cb;
    const options = typeof _options != 'function' ? _options : {};
    promises.readdir
        .call(this, path, options)
        .then(entries => cb(undefined, entries))
        .catch(cb);
}
readdir;
export function link(existing, newpath, cb = nop) {
    promises.link
        .call(this, existing, newpath)
        .then(() => cb())
        .catch(cb);
}
link;
export function symlink(target, path, typeOrCB, cb = nop) {
    const type = typeof typeOrCB === 'string' ? typeOrCB : 'file';
    cb = typeof typeOrCB === 'function' ? typeOrCB : cb;
    promises.symlink
        .call(this, target, path, type)
        .then(() => cb())
        .catch(cb);
}
symlink;
export function readlink(path, options, callback = nop) {
    callback = typeof options == 'function' ? options : callback;
    promises.readlink
        .call(this, path)
        .then(result => callback(undefined, result))
        .catch(callback);
}
readlink;
export function chown(path, uid, gid, cb = nop) {
    promises.chown
        .call(this, path, uid, gid)
        .then(() => cb())
        .catch(cb);
}
chown;
export function lchown(path, uid, gid, cb = nop) {
    promises.lchown
        .call(this, path, uid, gid)
        .then(() => cb())
        .catch(cb);
}
lchown;
export function chmod(path, mode, cb = nop) {
    promises.chmod
        .call(this, path, mode)
        .then(() => cb())
        .catch(cb);
}
chmod;
export function lchmod(path, mode, cb = nop) {
    promises.lchmod
        .call(this, path, mode)
        .then(() => cb())
        .catch(cb);
}
lchmod;
/**
 * Change file timestamps of the file referenced by the supplied path.
 */
export function utimes(path, atime, mtime, cb = nop) {
    promises.utimes
        .call(this, path, atime, mtime)
        .then(() => cb())
        .catch(cb);
}
utimes;
/**
 * Change file timestamps of the file referenced by the supplied path.
 */
export function lutimes(path, atime, mtime, cb = nop) {
    promises.lutimes
        .call(this, path, atime, mtime)
        .then(() => cb())
        .catch(cb);
}
lutimes;
export function realpath(path, arg2, cb = nop) {
    cb = typeof arg2 === 'function' ? arg2 : cb;
    promises.realpath
        .call(this, path, typeof arg2 === 'function' ? null : arg2)
        .then(result => cb(undefined, result))
        .catch(cb);
}
realpath;
export function access(path, cbMode, cb = nop) {
    const mode = typeof cbMode === 'number' ? cbMode : R_OK;
    cb = typeof cbMode === 'function' ? cbMode : cb;
    promises.access
        .call(this, path, mode)
        .then(() => cb())
        .catch(cb);
}
access;
const statWatchers = new Map();
export function watchFile(path, options, listener) {
    const normalizedPath = normalizePath(path.toString());
    const opts = typeof options != 'function' ? options : {};
    if (typeof options == 'function') {
        listener = options;
    }
    if (!listener) {
        throw new ErrnoError(Errno.EINVAL, 'No listener specified', path.toString(), 'watchFile');
    }
    if (statWatchers.has(normalizedPath)) {
        const entry = statWatchers.get(normalizedPath);
        if (entry) {
            entry.listeners.add(listener);
        }
        return;
    }
    const watcher = new StatWatcher(this, normalizedPath, opts);
    watcher.on('change', (curr, prev) => {
        const entry = statWatchers.get(normalizedPath);
        if (!entry) {
            return;
        }
        for (const listener of entry.listeners) {
            listener(curr, prev);
        }
    });
    statWatchers.set(normalizedPath, { watcher, listeners: new Set() });
}
watchFile;
/**
 * Stop watching for changes on a file.
 *
 * If the `listener` is specified, only that particular listener is removed.
 * If no `listener` is specified, all listeners are removed, and the file is no longer watched.
 *
 * @param path The path to the file to stop watching.
 * @param listener Optional listener to remove.
 */
export function unwatchFile(path, listener = nop) {
    const normalizedPath = normalizePath(path.toString());
    const entry = statWatchers.get(normalizedPath);
    if (entry) {
        if (listener && listener !== nop) {
            entry.listeners.delete(listener);
        }
        else {
            // If no listener is specified, remove all listeners
            entry.listeners.clear();
        }
        if (entry.listeners.size === 0) {
            // No more listeners, stop the watcher
            entry.watcher.stop();
            statWatchers.delete(normalizedPath);
        }
    }
}
unwatchFile;
export function watch(path, options, listener) {
    const watcher = new FSWatcher(this, normalizePath(path), typeof options == 'object' ? options : {});
    listener = typeof options == 'function' ? options : listener;
    watcher.on('change', listener || nop);
    return watcher;
}
watch;
/**
 * Opens a file in read mode and creates a Node.js-like ReadStream.
 *
 * @param path The path to the file to be opened.
 * @param options Options for the ReadStream and file opening (e.g., `encoding`, `highWaterMark`, `mode`).
 * @returns A ReadStream object for interacting with the file's contents.
 */
export function createReadStream(path, options) {
    options = typeof options == 'object' ? options : { encoding: options };
    const _handle = promises.open.call(this, path, 'r', options === null || options === void 0 ? void 0 : options.mode);
    return new ReadStream({ ...options, autoClose: true }, _handle);
}
createReadStream;
/**
 * Opens a file in write mode and creates a Node.js-like WriteStream.
 *
 * @param path The path to the file to be opened.
 * @param options Options for the WriteStream and file opening (e.g., `encoding`, `highWaterMark`, `mode`).
 * @returns A WriteStream object for writing to the file.
 */
export function createWriteStream(path, options) {
    options = typeof options == 'object' ? options : { encoding: options };
    const _handle = promises.open.call(this, path, 'w', options === null || options === void 0 ? void 0 : options.mode);
    return new WriteStream(options, _handle);
}
createWriteStream;
export function rm(path, options, callback = nop) {
    callback = typeof options === 'function' ? options : callback;
    promises.rm
        .call(this, path, typeof options === 'function' ? undefined : options)
        .then(() => callback(undefined))
        .catch(callback);
}
rm;
export function mkdtemp(prefix, options, callback = nop) {
    callback = typeof options === 'function' ? options : callback;
    promises.mkdtemp
        .call(this, prefix, typeof options != 'function' ? options : null)
        .then(result => callback(undefined, result))
        .catch(callback);
}
mkdtemp;
export function copyFile(src, dest, flags, callback = nop) {
    callback = typeof flags === 'function' ? flags : callback;
    promises.copyFile
        .call(this, src, dest, typeof flags === 'function' ? undefined : flags)
        .then(() => callback(undefined))
        .catch(callback);
}
copyFile;
export function readv(fd, buffers, position, cb = nop) {
    cb = typeof position === 'function' ? position : cb;
    new promises.FileHandle(fd, this)
        .readv(buffers, typeof position === 'function' ? undefined : position)
        .then(({ buffers, bytesRead }) => cb(undefined, bytesRead, buffers))
        .catch(cb);
}
readv;
export function writev(fd, buffers, position, cb = nop) {
    cb = typeof position === 'function' ? position : cb;
    new promises.FileHandle(fd, this)
        .writev(buffers, typeof position === 'function' ? undefined : position)
        .then(({ buffers, bytesWritten }) => cb(undefined, bytesWritten, buffers))
        .catch(cb);
}
writev;
export function opendir(path, options, cb = nop) {
    cb = typeof options === 'function' ? options : cb;
    promises.opendir
        .call(this, path, typeof options === 'function' ? undefined : options)
        .then(result => cb(undefined, result))
        .catch(cb);
}
opendir;
export function cp(source, destination, opts, callback = nop) {
    callback = typeof opts === 'function' ? opts : callback;
    promises.cp
        .call(this, source, destination, typeof opts === 'function' ? undefined : opts)
        .then(() => callback(undefined))
        .catch(callback);
}
cp;
export function statfs(path, options, callback = nop) {
    callback = typeof options === 'function' ? options : callback;
    promises.statfs
        .call(this, path, typeof options === 'function' ? undefined : options)
        .then(result => callback(undefined, result))
        .catch(callback);
}
statfs;
export async function openAsBlob(path, options) {
    const handle = await promises.open.call(this, path.toString(), 'r');
    const buffer = await handle.readFile();
    await handle.close();
    return new Blob([buffer], options);
}
openAsBlob;
export function glob(pattern, options, callback = nop) {
    callback = typeof options == 'function' ? options : callback;
    const it = promises.glob.call(this, pattern, typeof options === 'function' ? undefined : options);
    collectAsyncIterator(it)
        .then(results => { var _a; return callback(null, (_a = results) !== null && _a !== void 0 ? _a : []); })
        .catch((e) => callback(e));
}
glob;

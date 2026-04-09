import { extendBuffer } from 'utilium/buffer.js';
import { _chown, Stats } from '../stats.js';
import { config } from '../vfs/config.js';
import * as c from '../vfs/constants.js';
import { Errno, ErrnoError } from './error.js';
import { err, log_deprecated } from './log.js';
import '../polyfills.js';
const maxByteLength = 0xffff; // 64 KiB
const validFlags = ['r', 'r+', 'rs', 'rs+', 'w', 'wx', 'w+', 'wx+', 'a', 'ax', 'a+', 'ax+'];
/**
 * @internal @hidden
 */
export function parseFlag(flag) {
    if (typeof flag === 'number') {
        return flagToString(flag);
    }
    if (!validFlags.includes(flag)) {
        throw new Error('Invalid flag string: ' + flag);
    }
    return flag;
}
/**
 * @internal @hidden
 */
export function flagToString(flag) {
    switch (flag) {
        case c.O_RDONLY:
            return 'r';
        case c.O_RDONLY | c.O_SYNC:
            return 'rs';
        case c.O_RDWR:
            return 'r+';
        case c.O_RDWR | c.O_SYNC:
            return 'rs+';
        case c.O_TRUNC | c.O_CREAT | c.O_WRONLY:
            return 'w';
        case c.O_TRUNC | c.O_CREAT | c.O_WRONLY | c.O_EXCL:
            return 'wx';
        case c.O_TRUNC | c.O_CREAT | c.O_RDWR:
            return 'w+';
        case c.O_TRUNC | c.O_CREAT | c.O_RDWR | c.O_EXCL:
            return 'wx+';
        case c.O_APPEND | c.O_CREAT | c.O_WRONLY:
            return 'a';
        case c.O_APPEND | c.O_CREAT | c.O_WRONLY | c.O_EXCL:
            return 'ax';
        case c.O_APPEND | c.O_CREAT | c.O_RDWR:
            return 'a+';
        case c.O_APPEND | c.O_CREAT | c.O_RDWR | c.O_EXCL:
            return 'ax+';
        default:
            throw new Error('Invalid flag number: ' + flag);
    }
}
/**
 * @internal @hidden
 */
export function flagToNumber(flag) {
    switch (flag) {
        case 'r':
            return c.O_RDONLY;
        case 'rs':
            return c.O_RDONLY | c.O_SYNC;
        case 'r+':
            return c.O_RDWR;
        case 'rs+':
            return c.O_RDWR | c.O_SYNC;
        case 'w':
            return c.O_TRUNC | c.O_CREAT | c.O_WRONLY;
        case 'wx':
            return c.O_TRUNC | c.O_CREAT | c.O_WRONLY | c.O_EXCL;
        case 'w+':
            return c.O_TRUNC | c.O_CREAT | c.O_RDWR;
        case 'wx+':
            return c.O_TRUNC | c.O_CREAT | c.O_RDWR | c.O_EXCL;
        case 'a':
            return c.O_APPEND | c.O_CREAT | c.O_WRONLY;
        case 'ax':
            return c.O_APPEND | c.O_CREAT | c.O_WRONLY | c.O_EXCL;
        case 'a+':
            return c.O_APPEND | c.O_CREAT | c.O_RDWR;
        case 'ax+':
            return c.O_APPEND | c.O_CREAT | c.O_RDWR | c.O_EXCL;
        default:
            throw new Error('Invalid flag string: ' + flag);
    }
}
/**
 * Parses a flag as a mode (W_OK, R_OK, and/or X_OK)
 * @param flag the flag to parse
 * @internal @hidden
 */
export function flagToMode(flag) {
    let mode = 0;
    mode <<= 1;
    mode += +isReadable(flag);
    mode <<= 1;
    mode += +isWriteable(flag);
    mode <<= 1;
    return mode;
}
/** @hidden */
export function isReadable(flag) {
    return flag.indexOf('r') !== -1 || flag.indexOf('+') !== -1;
}
/** @hidden */
export function isWriteable(flag) {
    return flag.indexOf('w') !== -1 || flag.indexOf('a') !== -1 || flag.indexOf('+') !== -1;
}
/** @hidden */
export function isTruncating(flag) {
    return flag.indexOf('w') !== -1;
}
/** @hidden */
export function isAppendable(flag) {
    return flag.indexOf('a') !== -1;
}
/** @hidden */
export function isSynchronous(flag) {
    return flag.indexOf('s') !== -1;
}
/** @hidden */
export function isExclusive(flag) {
    return flag.indexOf('x') !== -1;
}
/**
 * @category Internals
 */
export class File {
    constructor(
    /**
     * @internal
     * The file system that created the file
     */
    fs, path) {
        this.fs = fs;
        this.path = path;
    }
    async [Symbol.asyncDispose]() {
        await this.close();
    }
    [Symbol.dispose]() {
        this.closeSync();
    }
    /**
     * Default implementation maps to `sync`.
     */
    datasync() {
        return this.sync();
    }
    /**
     * Default implementation maps to `syncSync`.
     */
    datasyncSync() {
        return this.syncSync();
    }
    /**
     * Create a stream for reading the file.
     */
    streamRead(options) {
        return this.fs.streamRead(this.path, options);
    }
    /**
     * Create a stream for writing the file.
     */
    streamWrite(options) {
        return this.fs.streamWrite(this.path, options);
    }
}
/**
 * An implementation of `File` that operates completely in-memory.
 * `PreloadFile`s are backed by a `Uint8Array`.
 * @category Internals
 */
export class PreloadFile extends File {
    /**
     * Creates a file with `path` and, optionally, the given contents.
     * Note that, if contents is specified, it will be mutated by the file.
     */
    constructor(fs, path, flag, stats, 
    /**
     * A buffer containing the entire contents of the file.
     */
    _buffer = new Uint8Array(new ArrayBuffer(0, fs.attributes.has('no_buffer_resize') ? {} : { maxByteLength }))) {
        super(fs, path);
        this.flag = flag;
        this.stats = stats;
        this._buffer = _buffer;
        /**
         * Current position
         */
        this._position = 0;
        /**
         * Whether the file has changes which have not been written to the FS
         */
        this.dirty = false;
        /**
         * Whether the file is open or closed
         */
        this.closed = false;
        /*
            Note:
            This invariant is *not* maintained once the file starts getting modified.
            It only actually matters if file is readable, as writeable modes may truncate/append to file.
        */
        if (this.stats.size == _buffer.byteLength)
            return;
        if (!isWriteable(this.flag)) {
            throw err(new ErrnoError(Errno.EIO, `Size mismatch: buffer length ${_buffer.byteLength}, stats size ${this.stats.size}`, path));
        }
        this.stats.size = _buffer.byteLength;
        this.dirty = true;
    }
    /**
     * Get the underlying buffer for this file. Mutating not recommended and will mess up dirty tracking.
     */
    get buffer() {
        return this._buffer;
    }
    /**
     * Get the current file position.
     *
     * We emulate the following bug mentioned in the Node documentation:
     *
     * On Linux, positional writes don't work when the file is opened in append mode.
     * The kernel ignores the position argument and always appends the data to the end of the file.
     * @returns The current file position.
     */
    get position() {
        if (isAppendable(this.flag)) {
            return this.stats.size;
        }
        return this._position;
    }
    set position(value) {
        this._position = value;
    }
    async sync() {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'sync');
        if (!this.dirty)
            return;
        if (!this.fs.attributes.has('no_write'))
            await this.fs.sync(this.path, this._buffer, this.stats);
        this.dirty = false;
    }
    syncSync() {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'sync');
        if (!this.dirty)
            return;
        if (!this.fs.attributes.has('no_write'))
            this.fs.syncSync(this.path, this._buffer, this.stats);
        this.dirty = false;
    }
    async close() {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'close');
        await this.sync();
        this.dispose();
    }
    closeSync() {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'close');
        this.syncSync();
        this.dispose();
    }
    /**
     * Cleans up. This will *not* sync the file data to the FS
     */
    dispose(force) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'dispose');
        if (this.dirty && !force) {
            throw ErrnoError.With('EBUSY', this.path, 'dispose');
        }
        this.closed = true;
    }
    stat() {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'stat');
        return Promise.resolve(new Stats(this.stats));
    }
    statSync() {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'stat');
        return new Stats(this.stats);
    }
    _truncate(length) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'truncate');
        this.dirty = true;
        if (!isWriteable(this.flag)) {
            throw new ErrnoError(Errno.EPERM, 'File not opened with a writeable mode');
        }
        this.stats.mtimeMs = Date.now();
        if (length > this._buffer.length) {
            const data = new Uint8Array(length - this._buffer.length);
            // Write will set stats.size and handle syncing.
            this._write(data, 0, data.length, this._buffer.length);
            return;
        }
        this.stats.size = length;
        // Truncate.
        this._buffer = length ? this._buffer.subarray(0, length) : new Uint8Array();
    }
    async truncate(length) {
        this._truncate(length);
        if (config.syncImmediately)
            await this.sync();
    }
    truncateSync(length) {
        this._truncate(length);
        if (config.syncImmediately)
            this.syncSync();
    }
    _write(buffer, offset = 0, length = buffer.byteLength - offset, position = this.position) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'write');
        if (!isWriteable(this.flag)) {
            throw new ErrnoError(Errno.EPERM, 'File not opened with a writeable mode');
        }
        this.dirty = true;
        const end = position + length;
        const slice = buffer.subarray(offset, offset + length);
        this._buffer = extendBuffer(this._buffer, end);
        if (end > this.stats.size)
            this.stats.size = end;
        this._buffer.set(slice, position);
        this.stats.mtimeMs = Date.now();
        this.position = position + slice.byteLength;
        return slice.byteLength;
    }
    /**
     * Write buffer to the file.
     * @param buffer Uint8Array containing the data to write to the file.
     * @param offset Offset in the buffer to start reading data from.
     * @param length The amount of bytes to write to the file.
     * @param position Offset from the beginning of the file where this data should be written.
     * If position is null, the data will be written at  the current position.
     */
    async write(buffer, offset, length, position) {
        const bytesWritten = this._write(buffer, offset, length, position);
        if (config.syncImmediately)
            await this.sync();
        return bytesWritten;
    }
    /**
     * Write buffer to the file.
     * @param buffer Uint8Array containing the data to write to the file.
     * @param offset Offset in the buffer to start reading data from.
     * @param length The amount of bytes to write to the file.
     * @param position Offset from the beginning of the file where this data should be written.
     * If position is null, the data will be written at  the current position.
     * @returns bytes written
     */
    writeSync(buffer, offset, length, position) {
        const bytesWritten = this._write(buffer, offset, length, position);
        if (config.syncImmediately)
            this.syncSync();
        return bytesWritten;
    }
    _read(buffer, offset = 0, length = buffer.byteLength - offset, position) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'read');
        if (!isReadable(this.flag)) {
            throw new ErrnoError(Errno.EPERM, 'File not opened with a readable mode');
        }
        if (config.updateOnRead) {
            this.dirty = true;
        }
        this.stats.atimeMs = Date.now();
        position !== null && position !== void 0 ? position : (position = this.position);
        let end = position + length;
        if (end > this.stats.size) {
            end = position + Math.max(this.stats.size - position, 0);
        }
        this._position = end;
        const bytesRead = end - position;
        if (bytesRead == 0) {
            // No copy/read. Return immediately for better performance
            return bytesRead;
        }
        const slice = this._buffer.subarray(position, end);
        new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength).set(slice, offset);
        return bytesRead;
    }
    /**
     * Read data from the file.
     * @param buffer The buffer that the data will be written to.
     * @param offset The offset within the buffer where writing will start.
     * @param length An integer specifying the number of bytes to read.
     * @param position An integer specifying where to begin reading from in the file.
     * If position is null, data will be read from the current file position.
     */
    async read(buffer, offset, length, position) {
        const bytesRead = this._read(buffer, offset, length, position);
        if (config.syncImmediately)
            await this.sync();
        return { bytesRead, buffer };
    }
    /**
     * Read data from the file.
     * @param buffer The buffer that the data will be written to.
     * @param offset The offset within the buffer where writing will start.
     * @param length An integer specifying the number of bytes to read.
     * @param position An integer specifying where to begin reading from in the file.
     * If position is null, data will be read from the current file position.
     * @returns number of bytes written
     */
    readSync(buffer, offset, length, position) {
        const bytesRead = this._read(buffer, offset, length, position);
        if (config.syncImmediately)
            this.syncSync();
        return bytesRead;
    }
    async chmod(mode) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'chmod');
        this.dirty = true;
        this.stats.mode = (this.stats.mode & (mode > c.S_IFMT ? ~c.S_IFMT : c.S_IFMT)) | mode;
        if (config.syncImmediately || mode > c.S_IFMT)
            await this.sync();
    }
    chmodSync(mode) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'chmod');
        this.dirty = true;
        this.stats.mode = (this.stats.mode & (mode > c.S_IFMT ? ~c.S_IFMT : c.S_IFMT)) | mode;
        if (config.syncImmediately || mode > c.S_IFMT)
            this.syncSync();
    }
    async chown(uid, gid) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'chown');
        this.dirty = true;
        _chown(this.stats, uid, gid);
        if (config.syncImmediately)
            await this.sync();
    }
    chownSync(uid, gid) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'chown');
        this.dirty = true;
        _chown(this.stats, uid, gid);
        if (config.syncImmediately)
            this.syncSync();
    }
    async utimes(atime, mtime) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'utimes');
        this.dirty = true;
        this.stats.atimeMs = atime;
        this.stats.mtimeMs = mtime;
        if (config.syncImmediately)
            await this.sync();
    }
    utimesSync(atime, mtime) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'utimes');
        this.dirty = true;
        this.stats.atimeMs = atime;
        this.stats.mtimeMs = mtime;
        if (config.syncImmediately)
            this.syncSync();
    }
}
/* node:coverage disable */
/**
 * For the file systems which do not sync to anything.
 * @category Internals
 * @deprecated
 */
export class NoSyncFile extends PreloadFile {
    constructor(...args) {
        log_deprecated('NoSyncFile');
        super(...args);
    }
    sync() {
        return Promise.resolve();
    }
    syncSync() { }
    close() {
        return Promise.resolve();
    }
    closeSync() { }
}
/* node:coverage enable */
/**
 * An implementation of `File` that uses the FS
 * @category Internals
 */
export class LazyFile extends File {
    /**
     * Get the current file position.
     *
     * We emulate the following bug mentioned in the Node documentation:
     *
     * On Linux, positional writes don't work when the file is opened in append mode.
     * The kernel ignores the position argument and always appends the data to the end of the file.
     * @returns The current file position.
     */
    get position() {
        return isAppendable(this.flag) ? this.stats.size : this._position;
    }
    set position(value) {
        this._position = value;
    }
    /**
     * Creates a file with `path` and, optionally, the given contents.
     * Note that, if contents is specified, it will be mutated by the file.
     */
    constructor(fs, path, flag, stats) {
        super(fs, path);
        this.flag = flag;
        this.stats = stats;
        /**
         * Current position
         */
        this._position = 0;
        /**
         * Whether the file has changes which have not been written to the FS
         */
        this.dirty = false;
        /**
         * Whether the file is open or closed
         */
        this.closed = false;
    }
    async sync() {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'sync');
        if (!this.dirty)
            return;
        if (!this.fs.attributes.has('no_write'))
            await this.fs.sync(this.path, undefined, this.stats);
        this.dirty = false;
    }
    syncSync() {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'sync');
        if (!this.dirty)
            return;
        if (!this.fs.attributes.has('no_write'))
            this.fs.syncSync(this.path, undefined, this.stats);
        this.dirty = false;
    }
    async close() {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'close');
        await this.sync();
        this.dispose();
    }
    closeSync() {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'close');
        this.syncSync();
        this.dispose();
    }
    /**
     * Cleans up. This will *not* sync the file data to the FS
     */
    dispose(force) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'dispose');
        if (this.dirty && !force)
            throw ErrnoError.With('EBUSY', this.path, 'dispose');
        this.closed = true;
    }
    stat() {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'stat');
        return Promise.resolve(new Stats(this.stats));
    }
    statSync() {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'stat');
        return new Stats(this.stats);
    }
    async truncate(length) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'truncate');
        this.dirty = true;
        if (!isWriteable(this.flag)) {
            throw new ErrnoError(Errno.EPERM, 'File not opened with a writeable mode');
        }
        this.stats.mtimeMs = Date.now();
        this.stats.size = length;
        if (config.syncImmediately)
            await this.sync();
    }
    truncateSync(length) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'truncate');
        this.dirty = true;
        if (!isWriteable(this.flag)) {
            throw new ErrnoError(Errno.EPERM, 'File not opened with a writeable mode');
        }
        this.stats.mtimeMs = Date.now();
        this.stats.size = length;
        if (config.syncImmediately)
            this.syncSync();
    }
    prepareWrite(buffer, offset, length, position) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'write');
        if (!isWriteable(this.flag)) {
            throw new ErrnoError(Errno.EPERM, 'File not opened with a writeable mode');
        }
        this.dirty = true;
        const end = position + length;
        const slice = buffer.subarray(offset, offset + length);
        if (end > this.stats.size)
            this.stats.size = end;
        this.stats.mtimeMs = Date.now();
        this._position = position + slice.byteLength;
        return slice;
    }
    /**
     * Write buffer to the file.
     * @param buffer Uint8Array containing the data to write to the file.
     * @param offset Offset in the buffer to start reading data from.
     * @param length The amount of bytes to write to the file.
     * @param position Offset from the beginning of the file where this data should be written.
     * If position is null, the data will be written at  the current position.
     */
    async write(buffer, offset = 0, length = buffer.byteLength - offset, position = this.position) {
        const slice = this.prepareWrite(buffer, offset, length, position);
        await this.fs.write(this.path, slice, position);
        if (config.syncImmediately)
            await this.sync();
        return slice.byteLength;
    }
    /**
     * Write buffer to the file.
     * @param buffer Uint8Array containing the data to write to the file.
     * @param offset Offset in the buffer to start reading data from.
     * @param length The amount of bytes to write to the file.
     * @param position Offset from the beginning of the file where this data should be written.
     * If position is null, the data will be written at  the current position.
     * @returns bytes written
     */
    writeSync(buffer, offset = 0, length = buffer.byteLength - offset, position = this.position) {
        const slice = this.prepareWrite(buffer, offset, length, position);
        this.fs.writeSync(this.path, slice, position);
        if (config.syncImmediately)
            this.syncSync();
        return slice.byteLength;
    }
    /**
     * Computes position information for reading
     */
    prepareRead(length, position) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'read');
        if (!isReadable(this.flag))
            throw new ErrnoError(Errno.EPERM, 'File not opened with a readable mode');
        if (config.updateOnRead)
            this.dirty = true;
        this.stats.atimeMs = Date.now();
        let end = position + length;
        if (end > this.stats.size) {
            end = position + Math.max(this.stats.size - position, 0);
        }
        this._position = end;
        return end;
    }
    /**
     * Read data from the file.
     * @param buffer The buffer that the data will be written to.
     * @param offset The offset within the buffer where writing will start.
     * @param length An integer specifying the number of bytes to read.
     * @param position An integer specifying where to begin reading from in the file.
     * If position is unset, data will be read from the current file position.
     */
    async read(buffer, offset = 0, length = buffer.byteLength - offset, position = this.position) {
        const end = this.prepareRead(length, position);
        const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        await this.fs.read(this.path, uint8.subarray(offset, offset + length), position, end);
        if (config.syncImmediately)
            await this.sync();
        return { bytesRead: end - position, buffer };
    }
    /**
     * Read data from the file.
     * @param buffer The buffer that the data will be written to.
     * @param offset The offset within the buffer where writing will start.
     * @param length An integer specifying the number of bytes to read.
     * @param position An integer specifying where to begin reading from in the file.
     * If position is null, data will be read from the current file position.
     * @returns number of bytes written
     */
    readSync(buffer, offset = 0, length = buffer.byteLength - offset, position = this.position) {
        const end = this.prepareRead(length, position);
        const uint8 = new Uint8Array(buffer.buffer, buffer.byteOffset, buffer.byteLength);
        this.fs.readSync(this.path, uint8.subarray(offset, offset + length), position, end);
        if (config.syncImmediately)
            this.syncSync();
        return end - position;
    }
    async chmod(mode) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'chmod');
        this.dirty = true;
        this.stats.mode = (this.stats.mode & (mode > c.S_IFMT ? ~c.S_IFMT : c.S_IFMT)) | mode;
        if (config.syncImmediately || mode > c.S_IFMT)
            await this.sync();
    }
    chmodSync(mode) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'chmod');
        this.dirty = true;
        this.stats.mode = (this.stats.mode & (mode > c.S_IFMT ? ~c.S_IFMT : c.S_IFMT)) | mode;
        if (config.syncImmediately || mode > c.S_IFMT)
            this.syncSync();
    }
    async chown(uid, gid) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'chown');
        this.dirty = true;
        _chown(this.stats, uid, gid);
        if (config.syncImmediately)
            await this.sync();
    }
    chownSync(uid, gid) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'chown');
        this.dirty = true;
        _chown(this.stats, uid, gid);
        if (config.syncImmediately)
            this.syncSync();
    }
    async utimes(atime, mtime) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'utimes');
        this.dirty = true;
        this.stats.atimeMs = atime;
        this.stats.mtimeMs = mtime;
        if (config.syncImmediately)
            await this.sync();
    }
    utimesSync(atime, mtime) {
        if (this.closed)
            throw ErrnoError.With('EBADF', this.path, 'utimes');
        this.dirty = true;
        this.stats.atimeMs = atime;
        this.stats.mtimeMs = mtime;
        if (config.syncImmediately)
            this.syncSync();
    }
}

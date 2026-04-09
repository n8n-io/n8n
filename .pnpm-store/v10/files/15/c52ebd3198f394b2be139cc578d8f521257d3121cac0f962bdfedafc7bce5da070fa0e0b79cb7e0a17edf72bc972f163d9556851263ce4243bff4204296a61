import { Readable, Writable } from 'readable-stream';
import { Errno, ErrnoError } from '../internal/error.js';
import { warn } from '../internal/log.js';
/**
 * A ReadStream implementation that wraps an underlying global ReadableStream.
 */
export class ReadStream extends Readable {
    constructor(opts = {}, handleOrPromise) {
        var _a;
        super({ ...opts, encoding: (_a = opts.encoding) !== null && _a !== void 0 ? _a : undefined });
        this.pending = true;
        this._path = '<unknown>';
        this._bytesRead = 0;
        Promise.resolve(handleOrPromise)
            .then(({ file }) => {
            this._path = file.path;
            const internal = file.streamRead({ start: opts.start, end: opts.end });
            this.reader = internal.getReader();
            this.pending = false;
            return this._read();
        })
            .catch(err => this.destroy(err));
    }
    async _read() {
        if (!this.reader)
            return;
        const { done, value } = await this.reader.read();
        if (done) {
            this.push(null);
            return;
        }
        this._bytesRead += value.byteLength;
        if (!this.push(value))
            return;
        await this._read();
    }
    close(callback = () => null) {
        try {
            this.destroy();
            this.emit('close');
            callback(null);
        }
        catch (err) {
            callback(new ErrnoError(Errno.EIO, err.toString()));
        }
    }
    get path() {
        return this._path;
    }
    get bytesRead() {
        return this._bytesRead;
    }
    wrap(oldStream) {
        super.wrap(oldStream);
        return this;
    }
}
/**
 * A WriteStream implementation that wraps an underlying global WritableStream.
 */
export class WriteStream extends Writable {
    constructor(opts = {}, handleOrPromise) {
        super(opts);
        this.pending = true;
        this._path = '<unknown>';
        this._bytesWritten = 0;
        this.ready = Promise.resolve(handleOrPromise)
            .then(({ file }) => {
            this._path = file.path;
            const internal = file.streamWrite({ start: opts.start });
            this.writer = internal.getWriter();
            this.pending = false;
        })
            .catch(err => this.destroy(err));
    }
    async _write(chunk, encoding, callback) {
        await this.ready;
        if (!this.writer)
            return callback(warn(new ErrnoError(Errno.EAGAIN, 'Underlying writable stream not ready', this._path)));
        if (encoding != 'buffer')
            return callback(warn(new ErrnoError(Errno.ENOTSUP, 'Unsupported encoding for stream', this._path)));
        const data = new Uint8Array(chunk.buffer, chunk.byteOffset, chunk.byteLength);
        try {
            await this.writer.write(data);
            this._bytesWritten += chunk.byteLength;
            callback();
        }
        catch (error) {
            callback(new ErrnoError(Errno.EIO, error.toString()));
        }
    }
    async _final(callback) {
        await this.ready;
        if (!this.writer)
            return callback();
        try {
            await this.writer.close();
            callback();
        }
        catch (error) {
            callback(new ErrnoError(Errno.EIO, error.toString()));
        }
    }
    close(callback = () => null) {
        try {
            this.destroy();
            this.emit('close');
            callback(null);
        }
        catch (error) {
            callback(new ErrnoError(Errno.EIO, error.toString()));
        }
    }
    get path() {
        return this._path;
    }
    get bytesWritten() {
        return this._bytesWritten;
    }
}

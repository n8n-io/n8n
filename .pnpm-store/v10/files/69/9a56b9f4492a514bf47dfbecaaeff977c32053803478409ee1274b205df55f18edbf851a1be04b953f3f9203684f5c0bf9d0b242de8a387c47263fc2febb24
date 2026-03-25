"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ZstdDecompress = exports.ZstdCompress = exports.BrotliDecompress = exports.BrotliCompress = exports.Unzip = exports.InflateRaw = exports.DeflateRaw = exports.Gunzip = exports.Gzip = exports.Inflate = exports.Deflate = exports.Zlib = exports.ZlibError = exports.constants = void 0;
const assert_1 = __importDefault(require("assert"));
const buffer_1 = require("buffer");
const minipass_1 = require("minipass");
const realZlib = __importStar(require("zlib"));
const constants_js_1 = require("./constants.js");
var constants_js_2 = require("./constants.js");
Object.defineProperty(exports, "constants", { enumerable: true, get: function () { return constants_js_2.constants; } });
const OriginalBufferConcat = buffer_1.Buffer.concat;
const desc = Object.getOwnPropertyDescriptor(buffer_1.Buffer, 'concat');
const noop = (args) => args;
const passthroughBufferConcat = desc?.writable === true || desc?.set !== undefined
    ? (makeNoOp) => {
        buffer_1.Buffer.concat = makeNoOp ? noop : OriginalBufferConcat;
    }
    : (_) => { };
const _superWrite = Symbol('_superWrite');
class ZlibError extends Error {
    code;
    errno;
    constructor(err, origin) {
        super('zlib: ' + err.message, { cause: err });
        this.code = err.code;
        this.errno = err.errno;
        /* c8 ignore next */
        if (!this.code)
            this.code = 'ZLIB_ERROR';
        this.message = 'zlib: ' + err.message;
        Error.captureStackTrace(this, origin ?? this.constructor);
    }
    get name() {
        return 'ZlibError';
    }
}
exports.ZlibError = ZlibError;
// the Zlib class they all inherit from
// This thing manages the queue of requests, and returns
// true or false if there is anything in the queue when
// you call the .write() method.
const _flushFlag = Symbol('flushFlag');
class ZlibBase extends minipass_1.Minipass {
    #sawError = false;
    #ended = false;
    #flushFlag;
    #finishFlushFlag;
    #fullFlushFlag;
    #handle;
    #onError;
    get sawError() {
        return this.#sawError;
    }
    get handle() {
        return this.#handle;
    }
    /* c8 ignore start */
    get flushFlag() {
        return this.#flushFlag;
    }
    /* c8 ignore stop */
    constructor(opts, mode) {
        if (!opts || typeof opts !== 'object')
            throw new TypeError('invalid options for ZlibBase constructor');
        //@ts-ignore
        super(opts);
        /* c8 ignore start */
        this.#flushFlag = opts.flush ?? 0;
        this.#finishFlushFlag = opts.finishFlush ?? 0;
        this.#fullFlushFlag = opts.fullFlushFlag ?? 0;
        /* c8 ignore stop */
        //@ts-ignore
        if (typeof realZlib[mode] !== 'function') {
            throw new TypeError('Compression method not supported: ' + mode);
        }
        // this will throw if any options are invalid for the class selected
        try {
            // @types/node doesn't know that it exports the classes, but they're there
            //@ts-ignore
            this.#handle = new realZlib[mode](opts);
        }
        catch (er) {
            // make sure that all errors get decorated properly
            throw new ZlibError(er, this.constructor);
        }
        this.#onError = err => {
            // no sense raising multiple errors, since we abort on the first one.
            if (this.#sawError)
                return;
            this.#sawError = true;
            // there is no way to cleanly recover.
            // continuing only obscures problems.
            this.close();
            this.emit('error', err);
        };
        this.#handle?.on('error', er => this.#onError(new ZlibError(er)));
        this.once('end', () => this.close);
    }
    close() {
        if (this.#handle) {
            this.#handle.close();
            this.#handle = undefined;
            this.emit('close');
        }
    }
    reset() {
        if (!this.#sawError) {
            (0, assert_1.default)(this.#handle, 'zlib binding closed');
            //@ts-ignore
            return this.#handle.reset?.();
        }
    }
    flush(flushFlag) {
        if (this.ended)
            return;
        if (typeof flushFlag !== 'number')
            flushFlag = this.#fullFlushFlag;
        this.write(Object.assign(buffer_1.Buffer.alloc(0), { [_flushFlag]: flushFlag }));
    }
    end(chunk, encoding, cb) {
        /* c8 ignore start */
        if (typeof chunk === 'function') {
            cb = chunk;
            encoding = undefined;
            chunk = undefined;
        }
        if (typeof encoding === 'function') {
            cb = encoding;
            encoding = undefined;
        }
        /* c8 ignore stop */
        if (chunk) {
            if (encoding)
                this.write(chunk, encoding);
            else
                this.write(chunk);
        }
        this.flush(this.#finishFlushFlag);
        this.#ended = true;
        return super.end(cb);
    }
    get ended() {
        return this.#ended;
    }
    // overridden in the gzip classes to do portable writes
    [_superWrite](data) {
        return super.write(data);
    }
    write(chunk, encoding, cb) {
        // process the chunk using the sync process
        // then super.write() all the outputted chunks
        if (typeof encoding === 'function')
            (cb = encoding), (encoding = 'utf8');
        if (typeof chunk === 'string')
            chunk = buffer_1.Buffer.from(chunk, encoding);
        if (this.#sawError)
            return;
        (0, assert_1.default)(this.#handle, 'zlib binding closed');
        // _processChunk tries to .close() the native handle after it's done, so we
        // intercept that by temporarily making it a no-op.
        // diving into the node:zlib internals a bit here
        const nativeHandle = this.#handle
            ._handle;
        const originalNativeClose = nativeHandle.close;
        nativeHandle.close = () => { };
        const originalClose = this.#handle.close;
        this.#handle.close = () => { };
        // It also calls `Buffer.concat()` at the end, which may be convenient
        // for some, but which we are not interested in as it slows us down.
        passthroughBufferConcat(true);
        let result = undefined;
        try {
            const flushFlag = typeof chunk[_flushFlag] === 'number'
                ? chunk[_flushFlag]
                : this.#flushFlag;
            result = this.#handle._processChunk(chunk, flushFlag);
            // if we don't throw, reset it back how it was
            passthroughBufferConcat(false);
        }
        catch (err) {
            // or if we do, put Buffer.concat() back before we emit error
            // Error events call into user code, which may call Buffer.concat()
            passthroughBufferConcat(false);
            this.#onError(new ZlibError(err, this.write));
        }
        finally {
            if (this.#handle) {
                // Core zlib resets `_handle` to null after attempting to close the
                // native handle. Our no-op handler prevented actual closure, but we
                // need to restore the `._handle` property.
                ;
                this.#handle._handle =
                    nativeHandle;
                nativeHandle.close = originalNativeClose;
                this.#handle.close = originalClose;
                // `_processChunk()` adds an 'error' listener. If we don't remove it
                // after each call, these handlers start piling up.
                this.#handle.removeAllListeners('error');
                // make sure OUR error listener is still attached tho
            }
        }
        if (this.#handle)
            this.#handle.on('error', er => this.#onError(new ZlibError(er, this.write)));
        let writeReturn;
        if (result) {
            if (Array.isArray(result) && result.length > 0) {
                const r = result[0];
                // The first buffer is always `handle._outBuffer`, which would be
                // re-used for later invocations; so, we always have to copy that one.
                writeReturn = this[_superWrite](buffer_1.Buffer.from(r));
                for (let i = 1; i < result.length; i++) {
                    writeReturn = this[_superWrite](result[i]);
                }
            }
            else {
                // either a single Buffer or an empty array
                writeReturn = this[_superWrite](buffer_1.Buffer.from(result));
            }
        }
        if (cb)
            cb();
        return writeReturn;
    }
}
class Zlib extends ZlibBase {
    #level;
    #strategy;
    constructor(opts, mode) {
        opts = opts || {};
        opts.flush = opts.flush || constants_js_1.constants.Z_NO_FLUSH;
        opts.finishFlush = opts.finishFlush || constants_js_1.constants.Z_FINISH;
        opts.fullFlushFlag = constants_js_1.constants.Z_FULL_FLUSH;
        super(opts, mode);
        this.#level = opts.level;
        this.#strategy = opts.strategy;
    }
    params(level, strategy) {
        if (this.sawError)
            return;
        if (!this.handle)
            throw new Error('cannot switch params when binding is closed');
        // no way to test this without also not supporting params at all
        /* c8 ignore start */
        if (!this.handle.params)
            throw new Error('not supported in this implementation');
        /* c8 ignore stop */
        if (this.#level !== level || this.#strategy !== strategy) {
            this.flush(constants_js_1.constants.Z_SYNC_FLUSH);
            (0, assert_1.default)(this.handle, 'zlib binding closed');
            // .params() calls .flush(), but the latter is always async in the
            // core zlib. We override .flush() temporarily to intercept that and
            // flush synchronously.
            const origFlush = this.handle.flush;
            this.handle.flush = (flushFlag, cb) => {
                /* c8 ignore start */
                if (typeof flushFlag === 'function') {
                    cb = flushFlag;
                    flushFlag = this.flushFlag;
                }
                /* c8 ignore stop */
                this.flush(flushFlag);
                cb?.();
            };
            try {
                ;
                this.handle.params(level, strategy);
            }
            finally {
                this.handle.flush = origFlush;
            }
            /* c8 ignore start */
            if (this.handle) {
                this.#level = level;
                this.#strategy = strategy;
            }
            /* c8 ignore stop */
        }
    }
}
exports.Zlib = Zlib;
// minimal 2-byte header
class Deflate extends Zlib {
    constructor(opts) {
        super(opts, 'Deflate');
    }
}
exports.Deflate = Deflate;
class Inflate extends Zlib {
    constructor(opts) {
        super(opts, 'Inflate');
    }
}
exports.Inflate = Inflate;
class Gzip extends Zlib {
    #portable;
    constructor(opts) {
        super(opts, 'Gzip');
        this.#portable = opts && !!opts.portable;
    }
    [_superWrite](data) {
        if (!this.#portable)
            return super[_superWrite](data);
        // we'll always get the header emitted in one first chunk
        // overwrite the OS indicator byte with 0xFF
        this.#portable = false;
        data[9] = 255;
        return super[_superWrite](data);
    }
}
exports.Gzip = Gzip;
class Gunzip extends Zlib {
    constructor(opts) {
        super(opts, 'Gunzip');
    }
}
exports.Gunzip = Gunzip;
// raw - no header
class DeflateRaw extends Zlib {
    constructor(opts) {
        super(opts, 'DeflateRaw');
    }
}
exports.DeflateRaw = DeflateRaw;
class InflateRaw extends Zlib {
    constructor(opts) {
        super(opts, 'InflateRaw');
    }
}
exports.InflateRaw = InflateRaw;
// auto-detect header.
class Unzip extends Zlib {
    constructor(opts) {
        super(opts, 'Unzip');
    }
}
exports.Unzip = Unzip;
class Brotli extends ZlibBase {
    constructor(opts, mode) {
        opts = opts || {};
        opts.flush = opts.flush || constants_js_1.constants.BROTLI_OPERATION_PROCESS;
        opts.finishFlush =
            opts.finishFlush || constants_js_1.constants.BROTLI_OPERATION_FINISH;
        opts.fullFlushFlag = constants_js_1.constants.BROTLI_OPERATION_FLUSH;
        super(opts, mode);
    }
}
class BrotliCompress extends Brotli {
    constructor(opts) {
        super(opts, 'BrotliCompress');
    }
}
exports.BrotliCompress = BrotliCompress;
class BrotliDecompress extends Brotli {
    constructor(opts) {
        super(opts, 'BrotliDecompress');
    }
}
exports.BrotliDecompress = BrotliDecompress;
class Zstd extends ZlibBase {
    constructor(opts, mode) {
        opts = opts || {};
        opts.flush = opts.flush || constants_js_1.constants.ZSTD_e_continue;
        opts.finishFlush = opts.finishFlush || constants_js_1.constants.ZSTD_e_end;
        opts.fullFlushFlag = constants_js_1.constants.ZSTD_e_flush;
        super(opts, mode);
    }
}
class ZstdCompress extends Zstd {
    constructor(opts) {
        super(opts, 'ZstdCompress');
    }
}
exports.ZstdCompress = ZstdCompress;
class ZstdDecompress extends Zstd {
    constructor(opts) {
        super(opts, 'ZstdDecompress');
    }
}
exports.ZstdDecompress = ZstdDecompress;
//# sourceMappingURL=index.js.map
// this[BUFFER] is the remainder of a chunk if we're waiting for
// the full 512 bytes of a header to come in.  We will Buffer.concat()
// it to the next write(), which is a mem copy, but a small one.
//
// this[QUEUE] is a list of entries that haven't been emitted
// yet this can only get filled up if the user keeps write()ing after
// a write() returns false, or does a write() with more than one entry
//
// We don't buffer chunks, we always parse them and either create an
// entry, or push it into the active entry.  The ReadEntry class knows
// to throw data away if .ignore=true
//
// Shift entry off the buffer when it emits 'end', and emit 'entry' for
// the next one in the list.
//
// At any time, we're pushing body chunks into the entry at WRITEENTRY,
// and waiting for 'end' on the entry at READENTRY
//
// ignored entries get .resume() called on them straight away
import { EventEmitter as EE } from 'events';
import { BrotliDecompress, Unzip, ZstdDecompress } from 'minizlib';
import { Header } from './header.js';
import { Pax } from './pax.js';
import { ReadEntry } from './read-entry.js';
import { warnMethod, } from './warn-method.js';
const maxMetaEntrySize = 1024 * 1024;
const gzipHeader = Buffer.from([0x1f, 0x8b]);
const zstdHeader = Buffer.from([0x28, 0xb5, 0x2f, 0xfd]);
const ZIP_HEADER_LEN = Math.max(gzipHeader.length, zstdHeader.length);
const STATE = Symbol('state');
const WRITEENTRY = Symbol('writeEntry');
const READENTRY = Symbol('readEntry');
const NEXTENTRY = Symbol('nextEntry');
const PROCESSENTRY = Symbol('processEntry');
const EX = Symbol('extendedHeader');
const GEX = Symbol('globalExtendedHeader');
const META = Symbol('meta');
const EMITMETA = Symbol('emitMeta');
const BUFFER = Symbol('buffer');
const QUEUE = Symbol('queue');
const ENDED = Symbol('ended');
const EMITTEDEND = Symbol('emittedEnd');
const EMIT = Symbol('emit');
const UNZIP = Symbol('unzip');
const CONSUMECHUNK = Symbol('consumeChunk');
const CONSUMECHUNKSUB = Symbol('consumeChunkSub');
const CONSUMEBODY = Symbol('consumeBody');
const CONSUMEMETA = Symbol('consumeMeta');
const CONSUMEHEADER = Symbol('consumeHeader');
const CONSUMING = Symbol('consuming');
const BUFFERCONCAT = Symbol('bufferConcat');
const MAYBEEND = Symbol('maybeEnd');
const WRITING = Symbol('writing');
const ABORTED = Symbol('aborted');
const DONE = Symbol('onDone');
const SAW_VALID_ENTRY = Symbol('sawValidEntry');
const SAW_NULL_BLOCK = Symbol('sawNullBlock');
const SAW_EOF = Symbol('sawEOF');
const CLOSESTREAM = Symbol('closeStream');
const noop = () => true;
export class Parser extends EE {
    file;
    strict;
    maxMetaEntrySize;
    filter;
    brotli;
    zstd;
    writable = true;
    readable = false;
    [QUEUE] = [];
    [BUFFER];
    [READENTRY];
    [WRITEENTRY];
    [STATE] = 'begin';
    [META] = '';
    [EX];
    [GEX];
    [ENDED] = false;
    [UNZIP];
    [ABORTED] = false;
    [SAW_VALID_ENTRY];
    [SAW_NULL_BLOCK] = false;
    [SAW_EOF] = false;
    [WRITING] = false;
    [CONSUMING] = false;
    [EMITTEDEND] = false;
    constructor(opt = {}) {
        super();
        this.file = opt.file || '';
        // these BADARCHIVE errors can't be detected early. listen on DONE.
        this.on(DONE, () => {
            if (this[STATE] === 'begin' ||
                this[SAW_VALID_ENTRY] === false) {
                // either less than 1 block of data, or all entries were invalid.
                // Either way, probably not even a tarball.
                this.warn('TAR_BAD_ARCHIVE', 'Unrecognized archive format');
            }
        });
        if (opt.ondone) {
            this.on(DONE, opt.ondone);
        }
        else {
            this.on(DONE, () => {
                this.emit('prefinish');
                this.emit('finish');
                this.emit('end');
            });
        }
        this.strict = !!opt.strict;
        this.maxMetaEntrySize = opt.maxMetaEntrySize || maxMetaEntrySize;
        this.filter = typeof opt.filter === 'function' ? opt.filter : noop;
        // Unlike gzip, brotli doesn't have any magic bytes to identify it
        // Users need to explicitly tell us they're extracting a brotli file
        // Or we infer from the file extension
        const isTBR = opt.file &&
            (opt.file.endsWith('.tar.br') || opt.file.endsWith('.tbr'));
        // if it's a tbr file it MIGHT be brotli, but we don't know until
        // we look at it and verify it's not a valid tar file.
        this.brotli =
            !(opt.gzip || opt.zstd) && opt.brotli !== undefined ? opt.brotli
                : isTBR ? undefined
                    : false;
        // zstd has magic bytes to identify it, but we also support explicit options
        // and file extension detection
        const isTZST = opt.file &&
            (opt.file.endsWith('.tar.zst') || opt.file.endsWith('.tzst'));
        this.zstd =
            !(opt.gzip || opt.brotli) && opt.zstd !== undefined ? opt.zstd
                : isTZST ? true
                    : undefined;
        // have to set this so that streams are ok piping into it
        this.on('end', () => this[CLOSESTREAM]());
        if (typeof opt.onwarn === 'function') {
            this.on('warn', opt.onwarn);
        }
        if (typeof opt.onReadEntry === 'function') {
            this.on('entry', opt.onReadEntry);
        }
    }
    warn(code, message, data = {}) {
        warnMethod(this, code, message, data);
    }
    [CONSUMEHEADER](chunk, position) {
        if (this[SAW_VALID_ENTRY] === undefined) {
            this[SAW_VALID_ENTRY] = false;
        }
        let header;
        try {
            header = new Header(chunk, position, this[EX], this[GEX]);
        }
        catch (er) {
            return this.warn('TAR_ENTRY_INVALID', er);
        }
        if (header.nullBlock) {
            if (this[SAW_NULL_BLOCK]) {
                this[SAW_EOF] = true;
                // ending an archive with no entries.  pointless, but legal.
                if (this[STATE] === 'begin') {
                    this[STATE] = 'header';
                }
                this[EMIT]('eof');
            }
            else {
                this[SAW_NULL_BLOCK] = true;
                this[EMIT]('nullBlock');
            }
        }
        else {
            this[SAW_NULL_BLOCK] = false;
            if (!header.cksumValid) {
                this.warn('TAR_ENTRY_INVALID', 'checksum failure', { header });
            }
            else if (!header.path) {
                this.warn('TAR_ENTRY_INVALID', 'path is required', { header });
            }
            else {
                const type = header.type;
                if (/^(Symbolic)?Link$/.test(type) && !header.linkpath) {
                    this.warn('TAR_ENTRY_INVALID', 'linkpath required', {
                        header,
                    });
                }
                else if (!/^(Symbolic)?Link$/.test(type) &&
                    !/^(Global)?ExtendedHeader$/.test(type) &&
                    header.linkpath) {
                    this.warn('TAR_ENTRY_INVALID', 'linkpath forbidden', {
                        header,
                    });
                }
                else {
                    const entry = (this[WRITEENTRY] = new ReadEntry(header, this[EX], this[GEX]));
                    // we do this for meta & ignored entries as well, because they
                    // are still valid tar, or else we wouldn't know to ignore them
                    if (!this[SAW_VALID_ENTRY]) {
                        if (entry.remain) {
                            // this might be the one!
                            const onend = () => {
                                if (!entry.invalid) {
                                    this[SAW_VALID_ENTRY] = true;
                                }
                            };
                            entry.on('end', onend);
                        }
                        else {
                            this[SAW_VALID_ENTRY] = true;
                        }
                    }
                    if (entry.meta) {
                        if (entry.size > this.maxMetaEntrySize) {
                            entry.ignore = true;
                            this[EMIT]('ignoredEntry', entry);
                            this[STATE] = 'ignore';
                            entry.resume();
                        }
                        else if (entry.size > 0) {
                            this[META] = '';
                            entry.on('data', c => (this[META] += c));
                            this[STATE] = 'meta';
                        }
                    }
                    else {
                        this[EX] = undefined;
                        entry.ignore =
                            entry.ignore || !this.filter(entry.path, entry);
                        if (entry.ignore) {
                            // probably valid, just not something we care about
                            this[EMIT]('ignoredEntry', entry);
                            this[STATE] = entry.remain ? 'ignore' : 'header';
                            entry.resume();
                        }
                        else {
                            if (entry.remain) {
                                this[STATE] = 'body';
                            }
                            else {
                                this[STATE] = 'header';
                                entry.end();
                            }
                            if (!this[READENTRY]) {
                                this[QUEUE].push(entry);
                                this[NEXTENTRY]();
                            }
                            else {
                                this[QUEUE].push(entry);
                            }
                        }
                    }
                }
            }
        }
    }
    [CLOSESTREAM]() {
        queueMicrotask(() => this.emit('close'));
    }
    [PROCESSENTRY](entry) {
        let go = true;
        if (!entry) {
            this[READENTRY] = undefined;
            go = false;
        }
        else if (Array.isArray(entry)) {
            const [ev, ...args] = entry;
            this.emit(ev, ...args);
        }
        else {
            this[READENTRY] = entry;
            this.emit('entry', entry);
            if (!entry.emittedEnd) {
                entry.on('end', () => this[NEXTENTRY]());
                go = false;
            }
        }
        return go;
    }
    [NEXTENTRY]() {
        do { } while (this[PROCESSENTRY](this[QUEUE].shift()));
        if (!this[QUEUE].length) {
            // At this point, there's nothing in the queue, but we may have an
            // entry which is being consumed (readEntry).
            // If we don't, then we definitely can handle more data.
            // If we do, and either it's flowing, or it has never had any data
            // written to it, then it needs more.
            // The only other possibility is that it has returned false from a
            // write() call, so we wait for the next drain to continue.
            const re = this[READENTRY];
            const drainNow = !re || re.flowing || re.size === re.remain;
            if (drainNow) {
                if (!this[WRITING]) {
                    this.emit('drain');
                }
            }
            else {
                re.once('drain', () => this.emit('drain'));
            }
        }
    }
    [CONSUMEBODY](chunk, position) {
        // write up to but no  more than writeEntry.blockRemain
        const entry = this[WRITEENTRY];
        /* c8 ignore start */
        if (!entry) {
            throw new Error('attempt to consume body without entry??');
        }
        const br = entry.blockRemain ?? 0;
        /* c8 ignore stop */
        const c = br >= chunk.length && position === 0 ?
            chunk
            : chunk.subarray(position, position + br);
        entry.write(c);
        if (!entry.blockRemain) {
            this[STATE] = 'header';
            this[WRITEENTRY] = undefined;
            entry.end();
        }
        return c.length;
    }
    [CONSUMEMETA](chunk, position) {
        const entry = this[WRITEENTRY];
        const ret = this[CONSUMEBODY](chunk, position);
        // if we finished, then the entry is reset
        if (!this[WRITEENTRY] && entry) {
            this[EMITMETA](entry);
        }
        return ret;
    }
    [EMIT](ev, data, extra) {
        if (!this[QUEUE].length && !this[READENTRY]) {
            this.emit(ev, data, extra);
        }
        else {
            this[QUEUE].push([ev, data, extra]);
        }
    }
    [EMITMETA](entry) {
        this[EMIT]('meta', this[META]);
        switch (entry.type) {
            case 'ExtendedHeader':
            case 'OldExtendedHeader':
                this[EX] = Pax.parse(this[META], this[EX], false);
                break;
            case 'GlobalExtendedHeader':
                this[GEX] = Pax.parse(this[META], this[GEX], true);
                break;
            case 'NextFileHasLongPath':
            case 'OldGnuLongPath': {
                const ex = this[EX] ?? Object.create(null);
                this[EX] = ex;
                ex.path = this[META].replace(/\0.*/, '');
                break;
            }
            case 'NextFileHasLongLinkpath': {
                const ex = this[EX] || Object.create(null);
                this[EX] = ex;
                ex.linkpath = this[META].replace(/\0.*/, '');
                break;
            }
            /* c8 ignore start */
            default:
                throw new Error('unknown meta: ' + entry.type);
            /* c8 ignore stop */
        }
    }
    abort(error) {
        this[ABORTED] = true;
        this.emit('abort', error);
        // always throws, even in non-strict mode
        this.warn('TAR_ABORT', error, { recoverable: false });
    }
    write(chunk, encoding, cb) {
        if (typeof encoding === 'function') {
            cb = encoding;
            encoding = undefined;
        }
        if (typeof chunk === 'string') {
            chunk = Buffer.from(chunk, 
            /* c8 ignore next */
            typeof encoding === 'string' ? encoding : 'utf8');
        }
        if (this[ABORTED]) {
            /* c8 ignore next */
            cb?.();
            return false;
        }
        // first write, might be gzipped, zstd, or brotli compressed
        const needSniff = this[UNZIP] === undefined ||
            (this.brotli === undefined && this[UNZIP] === false);
        if (needSniff && chunk) {
            if (this[BUFFER]) {
                chunk = Buffer.concat([this[BUFFER], chunk]);
                this[BUFFER] = undefined;
            }
            if (chunk.length < ZIP_HEADER_LEN) {
                this[BUFFER] = chunk;
                /* c8 ignore next */
                cb?.();
                return true;
            }
            // look for gzip header
            for (let i = 0; this[UNZIP] === undefined && i < gzipHeader.length; i++) {
                if (chunk[i] !== gzipHeader[i]) {
                    this[UNZIP] = false;
                }
            }
            // look for zstd header if gzip header not found
            let isZstd = false;
            if (this[UNZIP] === false && this.zstd !== false) {
                isZstd = true;
                for (let i = 0; i < zstdHeader.length; i++) {
                    if (chunk[i] !== zstdHeader[i]) {
                        isZstd = false;
                        break;
                    }
                }
            }
            const maybeBrotli = this.brotli === undefined && !isZstd;
            if (this[UNZIP] === false && maybeBrotli) {
                // read the first header to see if it's a valid tar file. If so,
                // we can safely assume that it's not actually brotli, despite the
                // .tbr or .tar.br file extension.
                // if we ended before getting a full chunk, yes, def brotli
                if (chunk.length < 512) {
                    if (this[ENDED]) {
                        this.brotli = true;
                    }
                    else {
                        this[BUFFER] = chunk;
                        /* c8 ignore next */
                        cb?.();
                        return true;
                    }
                }
                else {
                    // if it's tar, it's pretty reliably not brotli, chances of
                    // that happening are astronomical.
                    try {
                        new Header(chunk.subarray(0, 512));
                        this.brotli = false;
                    }
                    catch (_) {
                        this.brotli = true;
                    }
                }
            }
            if (this[UNZIP] === undefined ||
                (this[UNZIP] === false && (this.brotli || isZstd))) {
                const ended = this[ENDED];
                this[ENDED] = false;
                this[UNZIP] =
                    this[UNZIP] === undefined ? new Unzip({})
                        : isZstd ? new ZstdDecompress({})
                            : new BrotliDecompress({});
                this[UNZIP].on('data', chunk => this[CONSUMECHUNK](chunk));
                this[UNZIP].on('error', er => this.abort(er));
                this[UNZIP].on('end', () => {
                    this[ENDED] = true;
                    this[CONSUMECHUNK]();
                });
                this[WRITING] = true;
                const ret = !!this[UNZIP][ended ? 'end' : 'write'](chunk);
                this[WRITING] = false;
                cb?.();
                return ret;
            }
        }
        this[WRITING] = true;
        if (this[UNZIP]) {
            this[UNZIP].write(chunk);
        }
        else {
            this[CONSUMECHUNK](chunk);
        }
        this[WRITING] = false;
        // return false if there's a queue, or if the current entry isn't flowing
        const ret = this[QUEUE].length ? false
            : this[READENTRY] ? this[READENTRY].flowing
                : true;
        // if we have no queue, then that means a clogged READENTRY
        if (!ret && !this[QUEUE].length) {
            this[READENTRY]?.once('drain', () => this.emit('drain'));
        }
        /* c8 ignore next */
        cb?.();
        return ret;
    }
    [BUFFERCONCAT](c) {
        if (c && !this[ABORTED]) {
            this[BUFFER] =
                this[BUFFER] ? Buffer.concat([this[BUFFER], c]) : c;
        }
    }
    [MAYBEEND]() {
        if (this[ENDED] &&
            !this[EMITTEDEND] &&
            !this[ABORTED] &&
            !this[CONSUMING]) {
            this[EMITTEDEND] = true;
            const entry = this[WRITEENTRY];
            if (entry && entry.blockRemain) {
                // truncated, likely a damaged file
                const have = this[BUFFER] ? this[BUFFER].length : 0;
                this.warn('TAR_BAD_ARCHIVE', `Truncated input (needed ${entry.blockRemain} more bytes, only ${have} available)`, { entry });
                if (this[BUFFER]) {
                    entry.write(this[BUFFER]);
                }
                entry.end();
            }
            this[EMIT](DONE);
        }
    }
    [CONSUMECHUNK](chunk) {
        if (this[CONSUMING] && chunk) {
            this[BUFFERCONCAT](chunk);
        }
        else if (!chunk && !this[BUFFER]) {
            this[MAYBEEND]();
        }
        else if (chunk) {
            this[CONSUMING] = true;
            if (this[BUFFER]) {
                this[BUFFERCONCAT](chunk);
                const c = this[BUFFER];
                this[BUFFER] = undefined;
                this[CONSUMECHUNKSUB](c);
            }
            else {
                this[CONSUMECHUNKSUB](chunk);
            }
            while (this[BUFFER] &&
                this[BUFFER]?.length >= 512 &&
                !this[ABORTED] &&
                !this[SAW_EOF]) {
                const c = this[BUFFER];
                this[BUFFER] = undefined;
                this[CONSUMECHUNKSUB](c);
            }
            this[CONSUMING] = false;
        }
        if (!this[BUFFER] || this[ENDED]) {
            this[MAYBEEND]();
        }
    }
    [CONSUMECHUNKSUB](chunk) {
        // we know that we are in CONSUMING mode, so anything written goes into
        // the buffer.  Advance the position and put any remainder in the buffer.
        let position = 0;
        const length = chunk.length;
        while (position + 512 <= length &&
            !this[ABORTED] &&
            !this[SAW_EOF]) {
            switch (this[STATE]) {
                case 'begin':
                case 'header':
                    this[CONSUMEHEADER](chunk, position);
                    position += 512;
                    break;
                case 'ignore':
                case 'body':
                    position += this[CONSUMEBODY](chunk, position);
                    break;
                case 'meta':
                    position += this[CONSUMEMETA](chunk, position);
                    break;
                /* c8 ignore start */
                default:
                    throw new Error('invalid state: ' + this[STATE]);
                /* c8 ignore stop */
            }
        }
        if (position < length) {
            if (this[BUFFER]) {
                this[BUFFER] = Buffer.concat([
                    chunk.subarray(position),
                    this[BUFFER],
                ]);
            }
            else {
                this[BUFFER] = chunk.subarray(position);
            }
        }
    }
    end(chunk, encoding, cb) {
        if (typeof chunk === 'function') {
            cb = chunk;
            encoding = undefined;
            chunk = undefined;
        }
        if (typeof encoding === 'function') {
            cb = encoding;
            encoding = undefined;
        }
        if (typeof chunk === 'string') {
            chunk = Buffer.from(chunk, encoding);
        }
        if (cb)
            this.once('finish', cb);
        if (!this[ABORTED]) {
            if (this[UNZIP]) {
                /* c8 ignore start */
                if (chunk)
                    this[UNZIP].write(chunk);
                /* c8 ignore stop */
                this[UNZIP].end();
            }
            else {
                this[ENDED] = true;
                if (this.brotli === undefined || this.zstd === undefined)
                    chunk = chunk || Buffer.alloc(0);
                if (chunk)
                    this.write(chunk);
                this[MAYBEEND]();
            }
        }
        return this;
    }
}
//# sourceMappingURL=parse.js.map
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
exports.WriteEntryTar = exports.WriteEntrySync = exports.WriteEntry = void 0;
const fs_1 = __importDefault(require("fs"));
const minipass_1 = require("minipass");
const path_1 = __importDefault(require("path"));
const header_js_1 = require("./header.js");
const mode_fix_js_1 = require("./mode-fix.js");
const normalize_windows_path_js_1 = require("./normalize-windows-path.js");
const options_js_1 = require("./options.js");
const pax_js_1 = require("./pax.js");
const strip_absolute_path_js_1 = require("./strip-absolute-path.js");
const strip_trailing_slashes_js_1 = require("./strip-trailing-slashes.js");
const warn_method_js_1 = require("./warn-method.js");
const winchars = __importStar(require("./winchars.js"));
const prefixPath = (path, prefix) => {
    if (!prefix) {
        return (0, normalize_windows_path_js_1.normalizeWindowsPath)(path);
    }
    path = (0, normalize_windows_path_js_1.normalizeWindowsPath)(path).replace(/^\.(\/|$)/, '');
    return (0, strip_trailing_slashes_js_1.stripTrailingSlashes)(prefix) + '/' + path;
};
const maxReadSize = 16 * 1024 * 1024;
const PROCESS = Symbol('process');
const FILE = Symbol('file');
const DIRECTORY = Symbol('directory');
const SYMLINK = Symbol('symlink');
const HARDLINK = Symbol('hardlink');
const HEADER = Symbol('header');
const READ = Symbol('read');
const LSTAT = Symbol('lstat');
const ONLSTAT = Symbol('onlstat');
const ONREAD = Symbol('onread');
const ONREADLINK = Symbol('onreadlink');
const OPENFILE = Symbol('openfile');
const ONOPENFILE = Symbol('onopenfile');
const CLOSE = Symbol('close');
const MODE = Symbol('mode');
const AWAITDRAIN = Symbol('awaitDrain');
const ONDRAIN = Symbol('ondrain');
const PREFIX = Symbol('prefix');
class WriteEntry extends minipass_1.Minipass {
    path;
    portable;
    myuid = (process.getuid && process.getuid()) || 0;
    // until node has builtin pwnam functions, this'll have to do
    myuser = process.env.USER || '';
    maxReadSize;
    linkCache;
    statCache;
    preservePaths;
    cwd;
    strict;
    mtime;
    noPax;
    noMtime;
    prefix;
    fd;
    blockLen = 0;
    blockRemain = 0;
    buf;
    pos = 0;
    remain = 0;
    length = 0;
    offset = 0;
    win32;
    absolute;
    header;
    type;
    linkpath;
    stat;
    onWriteEntry;
    #hadError = false;
    constructor(p, opt_ = {}) {
        const opt = (0, options_js_1.dealias)(opt_);
        super();
        this.path = (0, normalize_windows_path_js_1.normalizeWindowsPath)(p);
        // suppress atime, ctime, uid, gid, uname, gname
        this.portable = !!opt.portable;
        this.maxReadSize = opt.maxReadSize || maxReadSize;
        this.linkCache = opt.linkCache || new Map();
        this.statCache = opt.statCache || new Map();
        this.preservePaths = !!opt.preservePaths;
        this.cwd = (0, normalize_windows_path_js_1.normalizeWindowsPath)(opt.cwd || process.cwd());
        this.strict = !!opt.strict;
        this.noPax = !!opt.noPax;
        this.noMtime = !!opt.noMtime;
        this.mtime = opt.mtime;
        this.prefix =
            opt.prefix ? (0, normalize_windows_path_js_1.normalizeWindowsPath)(opt.prefix) : undefined;
        this.onWriteEntry = opt.onWriteEntry;
        if (typeof opt.onwarn === 'function') {
            this.on('warn', opt.onwarn);
        }
        let pathWarn = false;
        if (!this.preservePaths) {
            const [root, stripped] = (0, strip_absolute_path_js_1.stripAbsolutePath)(this.path);
            if (root && typeof stripped === 'string') {
                this.path = stripped;
                pathWarn = root;
            }
        }
        this.win32 = !!opt.win32 || process.platform === 'win32';
        if (this.win32) {
            // force the \ to / normalization, since we might not *actually*
            // be on windows, but want \ to be considered a path separator.
            this.path = winchars.decode(this.path.replace(/\\/g, '/'));
            p = p.replace(/\\/g, '/');
        }
        this.absolute = (0, normalize_windows_path_js_1.normalizeWindowsPath)(opt.absolute || path_1.default.resolve(this.cwd, p));
        if (this.path === '') {
            this.path = './';
        }
        if (pathWarn) {
            this.warn('TAR_ENTRY_INFO', `stripping ${pathWarn} from absolute path`, {
                entry: this,
                path: pathWarn + this.path,
            });
        }
        const cs = this.statCache.get(this.absolute);
        if (cs) {
            this[ONLSTAT](cs);
        }
        else {
            this[LSTAT]();
        }
    }
    warn(code, message, data = {}) {
        return (0, warn_method_js_1.warnMethod)(this, code, message, data);
    }
    emit(ev, ...data) {
        if (ev === 'error') {
            this.#hadError = true;
        }
        return super.emit(ev, ...data);
    }
    [LSTAT]() {
        fs_1.default.lstat(this.absolute, (er, stat) => {
            if (er) {
                return this.emit('error', er);
            }
            this[ONLSTAT](stat);
        });
    }
    [ONLSTAT](stat) {
        this.statCache.set(this.absolute, stat);
        this.stat = stat;
        if (!stat.isFile()) {
            stat.size = 0;
        }
        this.type = getType(stat);
        this.emit('stat', stat);
        this[PROCESS]();
    }
    [PROCESS]() {
        switch (this.type) {
            case 'File':
                return this[FILE]();
            case 'Directory':
                return this[DIRECTORY]();
            case 'SymbolicLink':
                return this[SYMLINK]();
            // unsupported types are ignored.
            default:
                return this.end();
        }
    }
    [MODE](mode) {
        return (0, mode_fix_js_1.modeFix)(mode, this.type === 'Directory', this.portable);
    }
    [PREFIX](path) {
        return prefixPath(path, this.prefix);
    }
    [HEADER]() {
        /* c8 ignore start */
        if (!this.stat) {
            throw new Error('cannot write header before stat');
        }
        /* c8 ignore stop */
        if (this.type === 'Directory' && this.portable) {
            this.noMtime = true;
        }
        this.onWriteEntry?.(this);
        this.header = new header_js_1.Header({
            path: this[PREFIX](this.path),
            // only apply the prefix to hard links.
            linkpath: this.type === 'Link' && this.linkpath !== undefined ?
                this[PREFIX](this.linkpath)
                : this.linkpath,
            // only the permissions and setuid/setgid/sticky bitflags
            // not the higher-order bits that specify file type
            mode: this[MODE](this.stat.mode),
            uid: this.portable ? undefined : this.stat.uid,
            gid: this.portable ? undefined : this.stat.gid,
            size: this.stat.size,
            mtime: this.noMtime ? undefined : this.mtime || this.stat.mtime,
            /* c8 ignore next */
            type: this.type === 'Unsupported' ? undefined : this.type,
            uname: this.portable ? undefined
                : this.stat.uid === this.myuid ? this.myuser
                    : '',
            atime: this.portable ? undefined : this.stat.atime,
            ctime: this.portable ? undefined : this.stat.ctime,
        });
        if (this.header.encode() && !this.noPax) {
            super.write(new pax_js_1.Pax({
                atime: this.portable ? undefined : this.header.atime,
                ctime: this.portable ? undefined : this.header.ctime,
                gid: this.portable ? undefined : this.header.gid,
                mtime: this.noMtime ? undefined : (this.mtime || this.header.mtime),
                path: this[PREFIX](this.path),
                linkpath: this.type === 'Link' && this.linkpath !== undefined ?
                    this[PREFIX](this.linkpath)
                    : this.linkpath,
                size: this.header.size,
                uid: this.portable ? undefined : this.header.uid,
                uname: this.portable ? undefined : this.header.uname,
                dev: this.portable ? undefined : this.stat.dev,
                ino: this.portable ? undefined : this.stat.ino,
                nlink: this.portable ? undefined : this.stat.nlink,
            }).encode());
        }
        const block = this.header?.block;
        /* c8 ignore start */
        if (!block) {
            throw new Error('failed to encode header');
        }
        /* c8 ignore stop */
        super.write(block);
    }
    [DIRECTORY]() {
        /* c8 ignore start */
        if (!this.stat) {
            throw new Error('cannot create directory entry without stat');
        }
        /* c8 ignore stop */
        if (this.path.slice(-1) !== '/') {
            this.path += '/';
        }
        this.stat.size = 0;
        this[HEADER]();
        this.end();
    }
    [SYMLINK]() {
        fs_1.default.readlink(this.absolute, (er, linkpath) => {
            if (er) {
                return this.emit('error', er);
            }
            this[ONREADLINK](linkpath);
        });
    }
    [ONREADLINK](linkpath) {
        this.linkpath = (0, normalize_windows_path_js_1.normalizeWindowsPath)(linkpath);
        this[HEADER]();
        this.end();
    }
    [HARDLINK](linkpath) {
        /* c8 ignore start */
        if (!this.stat) {
            throw new Error('cannot create link entry without stat');
        }
        /* c8 ignore stop */
        this.type = 'Link';
        this.linkpath = (0, normalize_windows_path_js_1.normalizeWindowsPath)(path_1.default.relative(this.cwd, linkpath));
        this.stat.size = 0;
        this[HEADER]();
        this.end();
    }
    [FILE]() {
        /* c8 ignore start */
        if (!this.stat) {
            throw new Error('cannot create file entry without stat');
        }
        /* c8 ignore stop */
        if (this.stat.nlink > 1) {
            const linkKey = `${this.stat.dev}:${this.stat.ino}`;
            const linkpath = this.linkCache.get(linkKey);
            if (linkpath?.indexOf(this.cwd) === 0) {
                return this[HARDLINK](linkpath);
            }
            this.linkCache.set(linkKey, this.absolute);
        }
        this[HEADER]();
        if (this.stat.size === 0) {
            return this.end();
        }
        this[OPENFILE]();
    }
    [OPENFILE]() {
        fs_1.default.open(this.absolute, 'r', (er, fd) => {
            if (er) {
                return this.emit('error', er);
            }
            this[ONOPENFILE](fd);
        });
    }
    [ONOPENFILE](fd) {
        this.fd = fd;
        if (this.#hadError) {
            return this[CLOSE]();
        }
        /* c8 ignore start */
        if (!this.stat) {
            throw new Error('should stat before calling onopenfile');
        }
        /* c8 ignore start */
        this.blockLen = 512 * Math.ceil(this.stat.size / 512);
        this.blockRemain = this.blockLen;
        const bufLen = Math.min(this.blockLen, this.maxReadSize);
        this.buf = Buffer.allocUnsafe(bufLen);
        this.offset = 0;
        this.pos = 0;
        this.remain = this.stat.size;
        this.length = this.buf.length;
        this[READ]();
    }
    [READ]() {
        const { fd, buf, offset, length, pos } = this;
        if (fd === undefined || buf === undefined) {
            throw new Error('cannot read file without first opening');
        }
        fs_1.default.read(fd, buf, offset, length, pos, (er, bytesRead) => {
            if (er) {
                // ignoring the error from close(2) is a bad practice, but at
                // this point we already have an error, don't need another one
                return this[CLOSE](() => this.emit('error', er));
            }
            this[ONREAD](bytesRead);
        });
    }
    /* c8 ignore start */
    [CLOSE](cb = () => { }) {
        /* c8 ignore stop */
        if (this.fd !== undefined)
            fs_1.default.close(this.fd, cb);
    }
    [ONREAD](bytesRead) {
        if (bytesRead <= 0 && this.remain > 0) {
            const er = Object.assign(new Error('encountered unexpected EOF'), {
                path: this.absolute,
                syscall: 'read',
                code: 'EOF',
            });
            return this[CLOSE](() => this.emit('error', er));
        }
        if (bytesRead > this.remain) {
            const er = Object.assign(new Error('did not encounter expected EOF'), {
                path: this.absolute,
                syscall: 'read',
                code: 'EOF',
            });
            return this[CLOSE](() => this.emit('error', er));
        }
        /* c8 ignore start */
        if (!this.buf) {
            throw new Error('should have created buffer prior to reading');
        }
        /* c8 ignore stop */
        // null out the rest of the buffer, if we could fit the block padding
        // at the end of this loop, we've incremented bytesRead and this.remain
        // to be incremented up to the blockRemain level, as if we had expected
        // to get a null-padded file, and read it until the end.  then we will
        // decrement both remain and blockRemain by bytesRead, and know that we
        // reached the expected EOF, without any null buffer to append.
        if (bytesRead === this.remain) {
            for (let i = bytesRead; i < this.length && bytesRead < this.blockRemain; i++) {
                this.buf[i + this.offset] = 0;
                bytesRead++;
                this.remain++;
            }
        }
        const chunk = this.offset === 0 && bytesRead === this.buf.length ?
            this.buf
            : this.buf.subarray(this.offset, this.offset + bytesRead);
        const flushed = this.write(chunk);
        if (!flushed) {
            this[AWAITDRAIN](() => this[ONDRAIN]());
        }
        else {
            this[ONDRAIN]();
        }
    }
    [AWAITDRAIN](cb) {
        this.once('drain', cb);
    }
    write(chunk, encoding, cb) {
        /* c8 ignore start - just junk to comply with NodeJS.WritableStream */
        if (typeof encoding === 'function') {
            cb = encoding;
            encoding = undefined;
        }
        if (typeof chunk === 'string') {
            chunk = Buffer.from(chunk, typeof encoding === 'string' ? encoding : 'utf8');
        }
        /* c8 ignore stop */
        if (this.blockRemain < chunk.length) {
            const er = Object.assign(new Error('writing more data than expected'), {
                path: this.absolute,
            });
            return this.emit('error', er);
        }
        this.remain -= chunk.length;
        this.blockRemain -= chunk.length;
        this.pos += chunk.length;
        this.offset += chunk.length;
        return super.write(chunk, null, cb);
    }
    [ONDRAIN]() {
        if (!this.remain) {
            if (this.blockRemain) {
                super.write(Buffer.alloc(this.blockRemain));
            }
            return this[CLOSE](er => er ? this.emit('error', er) : this.end());
        }
        /* c8 ignore start */
        if (!this.buf) {
            throw new Error('buffer lost somehow in ONDRAIN');
        }
        /* c8 ignore stop */
        if (this.offset >= this.length) {
            // if we only have a smaller bit left to read, alloc a smaller buffer
            // otherwise, keep it the same length it was before.
            this.buf = Buffer.allocUnsafe(Math.min(this.blockRemain, this.buf.length));
            this.offset = 0;
        }
        this.length = this.buf.length - this.offset;
        this[READ]();
    }
}
exports.WriteEntry = WriteEntry;
class WriteEntrySync extends WriteEntry {
    sync = true;
    [LSTAT]() {
        this[ONLSTAT](fs_1.default.lstatSync(this.absolute));
    }
    [SYMLINK]() {
        this[ONREADLINK](fs_1.default.readlinkSync(this.absolute));
    }
    [OPENFILE]() {
        this[ONOPENFILE](fs_1.default.openSync(this.absolute, 'r'));
    }
    [READ]() {
        let threw = true;
        try {
            const { fd, buf, offset, length, pos } = this;
            /* c8 ignore start */
            if (fd === undefined || buf === undefined) {
                throw new Error('fd and buf must be set in READ method');
            }
            /* c8 ignore stop */
            const bytesRead = fs_1.default.readSync(fd, buf, offset, length, pos);
            this[ONREAD](bytesRead);
            threw = false;
        }
        finally {
            // ignoring the error from close(2) is a bad practice, but at
            // this point we already have an error, don't need another one
            if (threw) {
                try {
                    this[CLOSE](() => { });
                }
                catch (er) { }
            }
        }
    }
    [AWAITDRAIN](cb) {
        cb();
    }
    /* c8 ignore start */
    [CLOSE](cb = () => { }) {
        /* c8 ignore stop */
        if (this.fd !== undefined)
            fs_1.default.closeSync(this.fd);
        cb();
    }
}
exports.WriteEntrySync = WriteEntrySync;
class WriteEntryTar extends minipass_1.Minipass {
    blockLen = 0;
    blockRemain = 0;
    buf = 0;
    pos = 0;
    remain = 0;
    length = 0;
    preservePaths;
    portable;
    strict;
    noPax;
    noMtime;
    readEntry;
    type;
    prefix;
    path;
    mode;
    uid;
    gid;
    uname;
    gname;
    header;
    mtime;
    atime;
    ctime;
    linkpath;
    size;
    onWriteEntry;
    warn(code, message, data = {}) {
        return (0, warn_method_js_1.warnMethod)(this, code, message, data);
    }
    constructor(readEntry, opt_ = {}) {
        const opt = (0, options_js_1.dealias)(opt_);
        super();
        this.preservePaths = !!opt.preservePaths;
        this.portable = !!opt.portable;
        this.strict = !!opt.strict;
        this.noPax = !!opt.noPax;
        this.noMtime = !!opt.noMtime;
        this.onWriteEntry = opt.onWriteEntry;
        this.readEntry = readEntry;
        const { type } = readEntry;
        /* c8 ignore start */
        if (type === 'Unsupported') {
            throw new Error('writing entry that should be ignored');
        }
        /* c8 ignore stop */
        this.type = type;
        if (this.type === 'Directory' && this.portable) {
            this.noMtime = true;
        }
        this.prefix = opt.prefix;
        this.path = (0, normalize_windows_path_js_1.normalizeWindowsPath)(readEntry.path);
        this.mode =
            readEntry.mode !== undefined ?
                this[MODE](readEntry.mode)
                : undefined;
        this.uid = this.portable ? undefined : readEntry.uid;
        this.gid = this.portable ? undefined : readEntry.gid;
        this.uname = this.portable ? undefined : readEntry.uname;
        this.gname = this.portable ? undefined : readEntry.gname;
        this.size = readEntry.size;
        this.mtime =
            this.noMtime ? undefined : opt.mtime || readEntry.mtime;
        this.atime = this.portable ? undefined : readEntry.atime;
        this.ctime = this.portable ? undefined : readEntry.ctime;
        this.linkpath =
            readEntry.linkpath !== undefined ?
                (0, normalize_windows_path_js_1.normalizeWindowsPath)(readEntry.linkpath)
                : undefined;
        if (typeof opt.onwarn === 'function') {
            this.on('warn', opt.onwarn);
        }
        let pathWarn = false;
        if (!this.preservePaths) {
            const [root, stripped] = (0, strip_absolute_path_js_1.stripAbsolutePath)(this.path);
            if (root && typeof stripped === 'string') {
                this.path = stripped;
                pathWarn = root;
            }
        }
        this.remain = readEntry.size;
        this.blockRemain = readEntry.startBlockSize;
        this.onWriteEntry?.(this);
        this.header = new header_js_1.Header({
            path: this[PREFIX](this.path),
            linkpath: this.type === 'Link' && this.linkpath !== undefined ?
                this[PREFIX](this.linkpath)
                : this.linkpath,
            // only the permissions and setuid/setgid/sticky bitflags
            // not the higher-order bits that specify file type
            mode: this.mode,
            uid: this.portable ? undefined : this.uid,
            gid: this.portable ? undefined : this.gid,
            size: this.size,
            mtime: this.noMtime ? undefined : this.mtime,
            type: this.type,
            uname: this.portable ? undefined : this.uname,
            atime: this.portable ? undefined : this.atime,
            ctime: this.portable ? undefined : this.ctime,
        });
        if (pathWarn) {
            this.warn('TAR_ENTRY_INFO', `stripping ${pathWarn} from absolute path`, {
                entry: this,
                path: pathWarn + this.path,
            });
        }
        if (this.header.encode() && !this.noPax) {
            super.write(new pax_js_1.Pax({
                atime: this.portable ? undefined : this.atime,
                ctime: this.portable ? undefined : this.ctime,
                gid: this.portable ? undefined : this.gid,
                mtime: this.noMtime ? undefined : this.mtime,
                path: this[PREFIX](this.path),
                linkpath: this.type === 'Link' && this.linkpath !== undefined ?
                    this[PREFIX](this.linkpath)
                    : this.linkpath,
                size: this.size,
                uid: this.portable ? undefined : this.uid,
                uname: this.portable ? undefined : this.uname,
                dev: this.portable ? undefined : this.readEntry.dev,
                ino: this.portable ? undefined : this.readEntry.ino,
                nlink: this.portable ? undefined : this.readEntry.nlink,
            }).encode());
        }
        const b = this.header?.block;
        /* c8 ignore start */
        if (!b)
            throw new Error('failed to encode header');
        /* c8 ignore stop */
        super.write(b);
        readEntry.pipe(this);
    }
    [PREFIX](path) {
        return prefixPath(path, this.prefix);
    }
    [MODE](mode) {
        return (0, mode_fix_js_1.modeFix)(mode, this.type === 'Directory', this.portable);
    }
    write(chunk, encoding, cb) {
        /* c8 ignore start - just junk to comply with NodeJS.WritableStream */
        if (typeof encoding === 'function') {
            cb = encoding;
            encoding = undefined;
        }
        if (typeof chunk === 'string') {
            chunk = Buffer.from(chunk, typeof encoding === 'string' ? encoding : 'utf8');
        }
        /* c8 ignore stop */
        const writeLen = chunk.length;
        if (writeLen > this.blockRemain) {
            throw new Error('writing more to entry than is appropriate');
        }
        this.blockRemain -= writeLen;
        return super.write(chunk, cb);
    }
    end(chunk, encoding, cb) {
        if (this.blockRemain) {
            super.write(Buffer.alloc(this.blockRemain));
        }
        /* c8 ignore start - just junk to comply with NodeJS.WritableStream */
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
            chunk = Buffer.from(chunk, encoding ?? 'utf8');
        }
        if (cb)
            this.once('finish', cb);
        chunk ? super.end(chunk, cb) : super.end(cb);
        /* c8 ignore stop */
        return this;
    }
}
exports.WriteEntryTar = WriteEntryTar;
const getType = (stat) => stat.isFile() ? 'File'
    : stat.isDirectory() ? 'Directory'
        : stat.isSymbolicLink() ? 'SymbolicLink'
            : 'Unsupported';
//# sourceMappingURL=write-entry.js.map
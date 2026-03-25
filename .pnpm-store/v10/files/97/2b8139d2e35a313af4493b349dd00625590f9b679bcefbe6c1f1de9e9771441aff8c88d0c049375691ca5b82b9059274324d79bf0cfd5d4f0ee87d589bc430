"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReadEntry = void 0;
const minipass_1 = require("minipass");
const normalize_windows_path_js_1 = require("./normalize-windows-path.js");
class ReadEntry extends minipass_1.Minipass {
    extended;
    globalExtended;
    header;
    startBlockSize;
    blockRemain;
    remain;
    type;
    meta = false;
    ignore = false;
    path;
    mode;
    uid;
    gid;
    uname;
    gname;
    size = 0;
    mtime;
    atime;
    ctime;
    linkpath;
    dev;
    ino;
    nlink;
    invalid = false;
    absolute;
    unsupported = false;
    constructor(header, ex, gex) {
        super({});
        // read entries always start life paused.  this is to avoid the
        // situation where Minipass's auto-ending empty streams results
        // in an entry ending before we're ready for it.
        this.pause();
        this.extended = ex;
        this.globalExtended = gex;
        this.header = header;
        /* c8 ignore start */
        this.remain = header.size ?? 0;
        /* c8 ignore stop */
        this.startBlockSize = 512 * Math.ceil(this.remain / 512);
        this.blockRemain = this.startBlockSize;
        this.type = header.type;
        switch (this.type) {
            case 'File':
            case 'OldFile':
            case 'Link':
            case 'SymbolicLink':
            case 'CharacterDevice':
            case 'BlockDevice':
            case 'Directory':
            case 'FIFO':
            case 'ContiguousFile':
            case 'GNUDumpDir':
                break;
            case 'NextFileHasLongLinkpath':
            case 'NextFileHasLongPath':
            case 'OldGnuLongPath':
            case 'GlobalExtendedHeader':
            case 'ExtendedHeader':
            case 'OldExtendedHeader':
                this.meta = true;
                break;
            // NOTE: gnutar and bsdtar treat unrecognized types as 'File'
            // it may be worth doing the same, but with a warning.
            default:
                this.ignore = true;
        }
        /* c8 ignore start */
        if (!header.path) {
            throw new Error('no path provided for tar.ReadEntry');
        }
        /* c8 ignore stop */
        this.path = (0, normalize_windows_path_js_1.normalizeWindowsPath)(header.path);
        this.mode = header.mode;
        if (this.mode) {
            this.mode = this.mode & 0o7777;
        }
        this.uid = header.uid;
        this.gid = header.gid;
        this.uname = header.uname;
        this.gname = header.gname;
        this.size = this.remain;
        this.mtime = header.mtime;
        this.atime = header.atime;
        this.ctime = header.ctime;
        /* c8 ignore start */
        this.linkpath =
            header.linkpath ?
                (0, normalize_windows_path_js_1.normalizeWindowsPath)(header.linkpath)
                : undefined;
        /* c8 ignore stop */
        this.uname = header.uname;
        this.gname = header.gname;
        if (ex) {
            this.#slurp(ex);
        }
        if (gex) {
            this.#slurp(gex, true);
        }
    }
    write(data) {
        const writeLen = data.length;
        if (writeLen > this.blockRemain) {
            throw new Error('writing more to entry than is appropriate');
        }
        const r = this.remain;
        const br = this.blockRemain;
        this.remain = Math.max(0, r - writeLen);
        this.blockRemain = Math.max(0, br - writeLen);
        if (this.ignore) {
            return true;
        }
        if (r >= writeLen) {
            return super.write(data);
        }
        // r < writeLen
        return super.write(data.subarray(0, r));
    }
    #slurp(ex, gex = false) {
        if (ex.path)
            ex.path = (0, normalize_windows_path_js_1.normalizeWindowsPath)(ex.path);
        if (ex.linkpath)
            ex.linkpath = (0, normalize_windows_path_js_1.normalizeWindowsPath)(ex.linkpath);
        Object.assign(this, Object.fromEntries(Object.entries(ex).filter(([k, v]) => {
            // we slurp in everything except for the path attribute in
            // a global extended header, because that's weird. Also, any
            // null/undefined values are ignored.
            return !(v === null ||
                v === undefined ||
                (k === 'path' && gex));
        })));
    }
}
exports.ReadEntry = ReadEntry;
//# sourceMappingURL=read-entry.js.map
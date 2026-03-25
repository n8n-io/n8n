"use strict";
// parse a 512-byte header block to a data object, or vice-versa
// encode returns `true` if a pax extended header is needed, because
// the data could not be faithfully encoded in a simple header.
// (Also, check header.needPax to see if it needs a pax header.)
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.Header = void 0;
const node_path_1 = require("node:path");
const large = __importStar(require("./large-numbers.js"));
const types = __importStar(require("./types.js"));
class Header {
    cksumValid = false;
    needPax = false;
    nullBlock = false;
    block;
    path;
    mode;
    uid;
    gid;
    size;
    cksum;
    #type = 'Unsupported';
    linkpath;
    uname;
    gname;
    devmaj = 0;
    devmin = 0;
    atime;
    ctime;
    mtime;
    charset;
    comment;
    constructor(data, off = 0, ex, gex) {
        if (Buffer.isBuffer(data)) {
            this.decode(data, off || 0, ex, gex);
        }
        else if (data) {
            this.#slurp(data);
        }
    }
    decode(buf, off, ex, gex) {
        if (!off) {
            off = 0;
        }
        if (!buf || !(buf.length >= off + 512)) {
            throw new Error('need 512 bytes for header');
        }
        this.path = ex?.path ?? decString(buf, off, 100);
        this.mode = ex?.mode ?? gex?.mode ?? decNumber(buf, off + 100, 8);
        this.uid = ex?.uid ?? gex?.uid ?? decNumber(buf, off + 108, 8);
        this.gid = ex?.gid ?? gex?.gid ?? decNumber(buf, off + 116, 8);
        this.size = ex?.size ?? gex?.size ?? decNumber(buf, off + 124, 12);
        this.mtime =
            ex?.mtime ?? gex?.mtime ?? decDate(buf, off + 136, 12);
        this.cksum = decNumber(buf, off + 148, 12);
        // if we have extended or global extended headers, apply them now
        // See https://github.com/npm/node-tar/pull/187
        // Apply global before local, so it overrides
        if (gex)
            this.#slurp(gex, true);
        if (ex)
            this.#slurp(ex);
        // old tar versions marked dirs as a file with a trailing /
        const t = decString(buf, off + 156, 1);
        if (types.isCode(t)) {
            this.#type = t || '0';
        }
        if (this.#type === '0' && this.path.slice(-1) === '/') {
            this.#type = '5';
        }
        // tar implementations sometimes incorrectly put the stat(dir).size
        // as the size in the tarball, even though Directory entries are
        // not able to have any body at all.  In the very rare chance that
        // it actually DOES have a body, we weren't going to do anything with
        // it anyway, and it'll just be a warning about an invalid header.
        if (this.#type === '5') {
            this.size = 0;
        }
        this.linkpath = decString(buf, off + 157, 100);
        if (buf.subarray(off + 257, off + 265).toString() ===
            'ustar\u000000') {
            /* c8 ignore start */
            this.uname =
                ex?.uname ?? gex?.uname ?? decString(buf, off + 265, 32);
            this.gname =
                ex?.gname ?? gex?.gname ?? decString(buf, off + 297, 32);
            this.devmaj =
                ex?.devmaj ?? gex?.devmaj ?? decNumber(buf, off + 329, 8) ?? 0;
            this.devmin =
                ex?.devmin ?? gex?.devmin ?? decNumber(buf, off + 337, 8) ?? 0;
            /* c8 ignore stop */
            if (buf[off + 475] !== 0) {
                // definitely a prefix, definitely >130 chars.
                const prefix = decString(buf, off + 345, 155);
                this.path = prefix + '/' + this.path;
            }
            else {
                const prefix = decString(buf, off + 345, 130);
                if (prefix) {
                    this.path = prefix + '/' + this.path;
                }
                /* c8 ignore start */
                this.atime =
                    ex?.atime ?? gex?.atime ?? decDate(buf, off + 476, 12);
                this.ctime =
                    ex?.ctime ?? gex?.ctime ?? decDate(buf, off + 488, 12);
                /* c8 ignore stop */
            }
        }
        let sum = 8 * 0x20;
        for (let i = off; i < off + 148; i++) {
            sum += buf[i];
        }
        for (let i = off + 156; i < off + 512; i++) {
            sum += buf[i];
        }
        this.cksumValid = sum === this.cksum;
        if (this.cksum === undefined && sum === 8 * 0x20) {
            this.nullBlock = true;
        }
    }
    #slurp(ex, gex = false) {
        Object.assign(this, Object.fromEntries(Object.entries(ex).filter(([k, v]) => {
            // we slurp in everything except for the path attribute in
            // a global extended header, because that's weird. Also, any
            // null/undefined values are ignored.
            return !(v === null ||
                v === undefined ||
                (k === 'path' && gex) ||
                (k === 'linkpath' && gex) ||
                k === 'global');
        })));
    }
    encode(buf, off = 0) {
        if (!buf) {
            buf = this.block = Buffer.alloc(512);
        }
        if (this.#type === 'Unsupported') {
            this.#type = '0';
        }
        if (!(buf.length >= off + 512)) {
            throw new Error('need 512 bytes for header');
        }
        const prefixSize = this.ctime || this.atime ? 130 : 155;
        const split = splitPrefix(this.path || '', prefixSize);
        const path = split[0];
        const prefix = split[1];
        this.needPax = !!split[2];
        this.needPax = encString(buf, off, 100, path) || this.needPax;
        this.needPax =
            encNumber(buf, off + 100, 8, this.mode) || this.needPax;
        this.needPax =
            encNumber(buf, off + 108, 8, this.uid) || this.needPax;
        this.needPax =
            encNumber(buf, off + 116, 8, this.gid) || this.needPax;
        this.needPax =
            encNumber(buf, off + 124, 12, this.size) || this.needPax;
        this.needPax =
            encDate(buf, off + 136, 12, this.mtime) || this.needPax;
        buf[off + 156] = this.#type.charCodeAt(0);
        this.needPax =
            encString(buf, off + 157, 100, this.linkpath) || this.needPax;
        buf.write('ustar\u000000', off + 257, 8);
        this.needPax =
            encString(buf, off + 265, 32, this.uname) || this.needPax;
        this.needPax =
            encString(buf, off + 297, 32, this.gname) || this.needPax;
        this.needPax =
            encNumber(buf, off + 329, 8, this.devmaj) || this.needPax;
        this.needPax =
            encNumber(buf, off + 337, 8, this.devmin) || this.needPax;
        this.needPax =
            encString(buf, off + 345, prefixSize, prefix) || this.needPax;
        if (buf[off + 475] !== 0) {
            this.needPax =
                encString(buf, off + 345, 155, prefix) || this.needPax;
        }
        else {
            this.needPax =
                encString(buf, off + 345, 130, prefix) || this.needPax;
            this.needPax =
                encDate(buf, off + 476, 12, this.atime) || this.needPax;
            this.needPax =
                encDate(buf, off + 488, 12, this.ctime) || this.needPax;
        }
        let sum = 8 * 0x20;
        for (let i = off; i < off + 148; i++) {
            sum += buf[i];
        }
        for (let i = off + 156; i < off + 512; i++) {
            sum += buf[i];
        }
        this.cksum = sum;
        encNumber(buf, off + 148, 8, this.cksum);
        this.cksumValid = true;
        return this.needPax;
    }
    get type() {
        return (this.#type === 'Unsupported' ?
            this.#type
            : types.name.get(this.#type));
    }
    get typeKey() {
        return this.#type;
    }
    set type(type) {
        const c = String(types.code.get(type));
        if (types.isCode(c) || c === 'Unsupported') {
            this.#type = c;
        }
        else if (types.isCode(type)) {
            this.#type = type;
        }
        else {
            throw new TypeError('invalid entry type: ' + type);
        }
    }
}
exports.Header = Header;
const splitPrefix = (p, prefixSize) => {
    const pathSize = 100;
    let pp = p;
    let prefix = '';
    let ret = undefined;
    const root = node_path_1.posix.parse(p).root || '.';
    if (Buffer.byteLength(pp) < pathSize) {
        ret = [pp, prefix, false];
    }
    else {
        // first set prefix to the dir, and path to the base
        prefix = node_path_1.posix.dirname(pp);
        pp = node_path_1.posix.basename(pp);
        do {
            if (Buffer.byteLength(pp) <= pathSize &&
                Buffer.byteLength(prefix) <= prefixSize) {
                // both fit!
                ret = [pp, prefix, false];
            }
            else if (Buffer.byteLength(pp) > pathSize &&
                Buffer.byteLength(prefix) <= prefixSize) {
                // prefix fits in prefix, but path doesn't fit in path
                ret = [pp.slice(0, pathSize - 1), prefix, true];
            }
            else {
                // make path take a bit from prefix
                pp = node_path_1.posix.join(node_path_1.posix.basename(prefix), pp);
                prefix = node_path_1.posix.dirname(prefix);
            }
        } while (prefix !== root && ret === undefined);
        // at this point, found no resolution, just truncate
        if (!ret) {
            ret = [p.slice(0, pathSize - 1), '', true];
        }
    }
    return ret;
};
const decString = (buf, off, size) => buf
    .subarray(off, off + size)
    .toString('utf8')
    .replace(/\0.*/, '');
const decDate = (buf, off, size) => numToDate(decNumber(buf, off, size));
const numToDate = (num) => num === undefined ? undefined : new Date(num * 1000);
const decNumber = (buf, off, size) => Number(buf[off]) & 0x80 ?
    large.parse(buf.subarray(off, off + size))
    : decSmallNumber(buf, off, size);
const nanUndef = (value) => (isNaN(value) ? undefined : value);
const decSmallNumber = (buf, off, size) => nanUndef(parseInt(buf
    .subarray(off, off + size)
    .toString('utf8')
    .replace(/\0.*$/, '')
    .trim(), 8));
// the maximum encodable as a null-terminated octal, by field size
const MAXNUM = {
    12: 0o77777777777,
    8: 0o7777777,
};
const encNumber = (buf, off, size, num) => num === undefined ? false
    : num > MAXNUM[size] || num < 0 ?
        (large.encode(num, buf.subarray(off, off + size)), true)
        : (encSmallNumber(buf, off, size, num), false);
const encSmallNumber = (buf, off, size, num) => buf.write(octalString(num, size), off, size, 'ascii');
const octalString = (num, size) => padOctal(Math.floor(num).toString(8), size);
const padOctal = (str, size) => (str.length === size - 1 ?
    str
    : new Array(size - str.length - 1).join('0') + str + ' ') + '\0';
const encDate = (buf, off, size, date) => date === undefined ? false : (encNumber(buf, off, size, date.getTime() / 1000));
// enough to fill the longest string we've got
const NULLS = new Array(156).join('\0');
// pad with nulls, return true if it's longer or non-ascii
const encString = (buf, off, size, str) => str === undefined ? false : ((buf.write(str + NULLS, off, size, 'utf8'),
    str.length !== Buffer.byteLength(str) || str.length > size));
//# sourceMappingURL=header.js.map
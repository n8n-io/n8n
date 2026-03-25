"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Pax = void 0;
const node_path_1 = require("node:path");
const header_js_1 = require("./header.js");
class Pax {
    atime;
    mtime;
    ctime;
    charset;
    comment;
    gid;
    uid;
    gname;
    uname;
    linkpath;
    dev;
    ino;
    nlink;
    path;
    size;
    mode;
    global;
    constructor(obj, global = false) {
        this.atime = obj.atime;
        this.charset = obj.charset;
        this.comment = obj.comment;
        this.ctime = obj.ctime;
        this.dev = obj.dev;
        this.gid = obj.gid;
        this.global = global;
        this.gname = obj.gname;
        this.ino = obj.ino;
        this.linkpath = obj.linkpath;
        this.mtime = obj.mtime;
        this.nlink = obj.nlink;
        this.path = obj.path;
        this.size = obj.size;
        this.uid = obj.uid;
        this.uname = obj.uname;
    }
    encode() {
        const body = this.encodeBody();
        if (body === '') {
            return Buffer.allocUnsafe(0);
        }
        const bodyLen = Buffer.byteLength(body);
        // round up to 512 bytes
        // add 512 for header
        const bufLen = 512 * Math.ceil(1 + bodyLen / 512);
        const buf = Buffer.allocUnsafe(bufLen);
        // 0-fill the header section, it might not hit every field
        for (let i = 0; i < 512; i++) {
            buf[i] = 0;
        }
        new header_js_1.Header({
            // XXX split the path
            // then the path should be PaxHeader + basename, but less than 99,
            // prepend with the dirname
            /* c8 ignore start */
            path: ('PaxHeader/' + (0, node_path_1.basename)(this.path ?? '')).slice(0, 99),
            /* c8 ignore stop */
            mode: this.mode || 0o644,
            uid: this.uid,
            gid: this.gid,
            size: bodyLen,
            mtime: this.mtime,
            type: this.global ? 'GlobalExtendedHeader' : 'ExtendedHeader',
            linkpath: '',
            uname: this.uname || '',
            gname: this.gname || '',
            devmaj: 0,
            devmin: 0,
            atime: this.atime,
            ctime: this.ctime,
        }).encode(buf);
        buf.write(body, 512, bodyLen, 'utf8');
        // null pad after the body
        for (let i = bodyLen + 512; i < buf.length; i++) {
            buf[i] = 0;
        }
        return buf;
    }
    encodeBody() {
        return (this.encodeField('path') +
            this.encodeField('ctime') +
            this.encodeField('atime') +
            this.encodeField('dev') +
            this.encodeField('ino') +
            this.encodeField('nlink') +
            this.encodeField('charset') +
            this.encodeField('comment') +
            this.encodeField('gid') +
            this.encodeField('gname') +
            this.encodeField('linkpath') +
            this.encodeField('mtime') +
            this.encodeField('size') +
            this.encodeField('uid') +
            this.encodeField('uname'));
    }
    encodeField(field) {
        if (this[field] === undefined) {
            return '';
        }
        const r = this[field];
        const v = r instanceof Date ? r.getTime() / 1000 : r;
        const s = ' ' +
            (field === 'dev' || field === 'ino' || field === 'nlink' ?
                'SCHILY.'
                : '') +
            field +
            '=' +
            v +
            '\n';
        const byteLen = Buffer.byteLength(s);
        // the digits includes the length of the digits in ascii base-10
        // so if it's 9 characters, then adding 1 for the 9 makes it 10
        // which makes it 11 chars.
        let digits = Math.floor(Math.log(byteLen) / Math.log(10)) + 1;
        if (byteLen + digits >= Math.pow(10, digits)) {
            digits += 1;
        }
        const len = digits + byteLen;
        return len + s;
    }
    static parse(str, ex, g = false) {
        return new Pax(merge(parseKV(str), ex), g);
    }
}
exports.Pax = Pax;
const merge = (a, b) => b ? Object.assign({}, b, a) : a;
const parseKV = (str) => str
    .replace(/\n$/, '')
    .split('\n')
    .reduce(parseKVLine, Object.create(null));
const parseKVLine = (set, line) => {
    const n = parseInt(line, 10);
    // XXX Values with \n in them will fail this.
    // Refactor to not be a naive line-by-line parse.
    if (n !== Buffer.byteLength(line) + 1) {
        return set;
    }
    line = line.slice((n + ' ').length);
    const kv = line.split('=');
    const r = kv.shift();
    if (!r) {
        return set;
    }
    const k = r.replace(/^SCHILY\.(dev|ino|nlink)/, '$1');
    const v = kv.join('=');
    set[k] =
        /^([A-Z]+\.)?([mac]|birth|creation)time$/.test(k) ?
            new Date(Number(v) * 1000)
            : /^[0-9]+$/.test(v) ? +v
                : v;
    return set;
};
//# sourceMappingURL=pax.js.map
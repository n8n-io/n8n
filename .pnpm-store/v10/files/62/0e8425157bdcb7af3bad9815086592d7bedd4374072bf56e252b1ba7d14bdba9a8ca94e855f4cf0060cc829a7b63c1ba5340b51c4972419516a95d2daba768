/*
 Copyright 2012-2015, Yahoo Inc.
 Copyrights licensed under the New BSD License. See the accompanying LICENSE file for terms.
 */
'use strict';

const path = require('path');
let parsePath = path.parse;
let SEP = path.sep;
const origParser = parsePath;
const origSep = SEP;

function makeRelativeNormalizedPath(str, sep) {
    const parsed = parsePath(str);
    let root = parsed.root;
    let dir;
    let file = parsed.base;
    let quoted;
    let pos;

    // handle a weird windows case separately
    if (sep === '\\') {
        pos = root.indexOf(':\\');
        if (pos >= 0) {
            root = root.substring(0, pos + 2);
        }
    }
    dir = parsed.dir.substring(root.length);

    if (str === '') {
        return [];
    }

    if (sep !== '/') {
        quoted = new RegExp(sep.replace(/\W/g, '\\$&'), 'g');
        dir = dir.replace(quoted, '/');
        file = file.replace(quoted, '/'); // excessively paranoid?
    }

    if (dir !== '') {
        dir = `${dir}/${file}`;
    } else {
        dir = file;
    }
    if (dir.substring(0, 1) === '/') {
        dir = dir.substring(1);
    }
    dir = dir.split(/\/+/);
    return dir;
}

class Path {
    constructor(strOrArray) {
        if (Array.isArray(strOrArray)) {
            this.v = strOrArray;
        } else if (typeof strOrArray === 'string') {
            this.v = makeRelativeNormalizedPath(strOrArray, SEP);
        } else {
            throw new Error(
                `Invalid Path argument must be string or array:${strOrArray}`
            );
        }
    }

    toString() {
        return this.v.join('/');
    }

    hasParent() {
        return this.v.length > 0;
    }

    parent() {
        if (!this.hasParent()) {
            throw new Error('Unable to get parent for 0 elem path');
        }
        const p = this.v.slice();
        p.pop();
        return new Path(p);
    }

    elements() {
        return this.v.slice();
    }

    name() {
        return this.v.slice(-1)[0];
    }

    contains(other) {
        let i;
        if (other.length > this.length) {
            return false;
        }
        for (i = 0; i < other.length; i += 1) {
            if (this.v[i] !== other.v[i]) {
                return false;
            }
        }
        return true;
    }

    ancestorOf(other) {
        return other.contains(this) && other.length !== this.length;
    }

    descendantOf(other) {
        return this.contains(other) && other.length !== this.length;
    }

    commonPrefixPath(other) {
        const len = this.length > other.length ? other.length : this.length;
        let i;
        const ret = [];

        for (i = 0; i < len; i += 1) {
            if (this.v[i] === other.v[i]) {
                ret.push(this.v[i]);
            } else {
                break;
            }
        }
        return new Path(ret);
    }

    static compare(a, b) {
        const al = a.length;
        const bl = b.length;

        if (al < bl) {
            return -1;
        }

        if (al > bl) {
            return 1;
        }

        const astr = a.toString();
        const bstr = b.toString();
        return astr < bstr ? -1 : astr > bstr ? 1 : 0;
    }
}

['push', 'pop', 'shift', 'unshift', 'splice'].forEach(fn => {
    Object.defineProperty(Path.prototype, fn, {
        value(...args) {
            return this.v[fn](...args);
        }
    });
});

Object.defineProperty(Path.prototype, 'length', {
    enumerable: true,
    get() {
        return this.v.length;
    }
});

module.exports = Path;
Path.tester = {
    setParserAndSep(p, sep) {
        parsePath = p;
        SEP = sep;
    },
    reset() {
        parsePath = origParser;
        SEP = origSep;
    }
};

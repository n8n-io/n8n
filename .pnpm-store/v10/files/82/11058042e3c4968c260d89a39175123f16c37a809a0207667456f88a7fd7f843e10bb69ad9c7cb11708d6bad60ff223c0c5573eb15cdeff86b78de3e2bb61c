"use strict";

Object.defineProperty(exports, "t", {
    value: true
});

exports.default = void 0;

var _Base = require("./Base");

var _throwError = require("../../utils/throwError");

class HashSetIterator extends _Base.HashContainerIterator {
    constructor(t, e, r, s) {
        super(t, e, s);
        this.container = r;
    }
    get pointer() {
        if (this.o === this.h) {
            (0, _throwError.throwIteratorAccessError)();
        }
        return this.o.u;
    }
    copy() {
        return new HashSetIterator(this.o, this.h, this.container, this.iteratorType);
    }
}

class HashSet extends _Base.HashContainer {
    constructor(t = []) {
        super();
        const e = this;
        t.forEach((function(t) {
            e.insert(t);
        }));
    }
    begin() {
        return new HashSetIterator(this.p, this.h, this);
    }
    end() {
        return new HashSetIterator(this.h, this.h, this);
    }
    rBegin() {
        return new HashSetIterator(this._, this.h, this, 1);
    }
    rEnd() {
        return new HashSetIterator(this.h, this.h, this, 1);
    }
    front() {
        return this.p.u;
    }
    back() {
        return this._.u;
    }
    insert(t, e) {
        return this.M(t, undefined, e);
    }
    getElementByPos(t) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        let e = this.p;
        while (t--) {
            e = e.B;
        }
        return e.u;
    }
    find(t, e) {
        const r = this.I(t, e);
        return new HashSetIterator(r, this.h, this);
    }
    forEach(t) {
        let e = 0;
        let r = this.p;
        while (r !== this.h) {
            t(r.u, e++, this);
            r = r.B;
        }
    }
    [Symbol.iterator]() {
        return function*() {
            let t = this.p;
            while (t !== this.h) {
                yield t.u;
                t = t.B;
            }
        }.bind(this)();
    }
}

var _default = HashSet;

exports.default = _default;
//# sourceMappingURL=HashSet.js.map

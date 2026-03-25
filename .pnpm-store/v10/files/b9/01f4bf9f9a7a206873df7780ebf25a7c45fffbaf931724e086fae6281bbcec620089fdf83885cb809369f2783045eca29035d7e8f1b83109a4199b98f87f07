"use strict";

Object.defineProperty(exports, "t", {
    value: true
});

exports.default = void 0;

var _Base = _interopRequireDefault(require("./Base"));

var _RandomIterator = require("./Base/RandomIterator");

function _interopRequireDefault(t) {
    return t && t.t ? t : {
        default: t
    };
}

class VectorIterator extends _RandomIterator.RandomIterator {
    constructor(t, r, e) {
        super(t, e);
        this.container = r;
    }
    copy() {
        return new VectorIterator(this.o, this.container, this.iteratorType);
    }
}

class Vector extends _Base.default {
    constructor(t = [], r = true) {
        super();
        if (Array.isArray(t)) {
            this.J = r ? [ ...t ] : t;
            this.i = t.length;
        } else {
            this.J = [];
            const r = this;
            t.forEach((function(t) {
                r.pushBack(t);
            }));
        }
    }
    clear() {
        this.i = 0;
        this.J.length = 0;
    }
    begin() {
        return new VectorIterator(0, this);
    }
    end() {
        return new VectorIterator(this.i, this);
    }
    rBegin() {
        return new VectorIterator(this.i - 1, this, 1);
    }
    rEnd() {
        return new VectorIterator(-1, this, 1);
    }
    front() {
        return this.J[0];
    }
    back() {
        return this.J[this.i - 1];
    }
    getElementByPos(t) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        return this.J[t];
    }
    eraseElementByPos(t) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        this.J.splice(t, 1);
        this.i -= 1;
        return this.i;
    }
    eraseElementByValue(t) {
        let r = 0;
        for (let e = 0; e < this.i; ++e) {
            if (this.J[e] !== t) {
                this.J[r++] = this.J[e];
            }
        }
        this.i = this.J.length = r;
        return this.i;
    }
    eraseElementByIterator(t) {
        const r = t.o;
        t = t.next();
        this.eraseElementByPos(r);
        return t;
    }
    pushBack(t) {
        this.J.push(t);
        this.i += 1;
        return this.i;
    }
    popBack() {
        if (this.i === 0) return;
        this.i -= 1;
        return this.J.pop();
    }
    setElementByPos(t, r) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        this.J[t] = r;
    }
    insert(t, r, e = 1) {
        if (t < 0 || t > this.i) {
            throw new RangeError;
        }
        this.J.splice(t, 0, ...new Array(e).fill(r));
        this.i += e;
        return this.i;
    }
    find(t) {
        for (let r = 0; r < this.i; ++r) {
            if (this.J[r] === t) {
                return new VectorIterator(r, this);
            }
        }
        return this.end();
    }
    reverse() {
        this.J.reverse();
    }
    unique() {
        let t = 1;
        for (let r = 1; r < this.i; ++r) {
            if (this.J[r] !== this.J[r - 1]) {
                this.J[t++] = this.J[r];
            }
        }
        this.i = this.J.length = t;
        return this.i;
    }
    sort(t) {
        this.J.sort(t);
    }
    forEach(t) {
        for (let r = 0; r < this.i; ++r) {
            t(this.J[r], r, this);
        }
    }
    [Symbol.iterator]() {
        return function*() {
            yield* this.J;
        }.bind(this)();
    }
}

var _default = Vector;

exports.default = _default;
//# sourceMappingURL=Vector.js.map

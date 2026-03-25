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

class DequeIterator extends _RandomIterator.RandomIterator {
    constructor(t, i, s) {
        super(t, s);
        this.container = i;
    }
    copy() {
        return new DequeIterator(this.o, this.container, this.iteratorType);
    }
}

class Deque extends _Base.default {
    constructor(t = [], i = 1 << 12) {
        super();
        this.j = 0;
        this.D = 0;
        this.R = 0;
        this.N = 0;
        this.P = 0;
        this.A = [];
        const s = (() => {
            if (typeof t.length === "number") return t.length;
            if (typeof t.size === "number") return t.size;
            if (typeof t.size === "function") return t.size();
            throw new TypeError("Cannot get the length or size of the container");
        })();
        this.F = i;
        this.P = Math.max(Math.ceil(s / this.F), 1);
        for (let t = 0; t < this.P; ++t) {
            this.A.push(new Array(this.F));
        }
        const h = Math.ceil(s / this.F);
        this.j = this.R = (this.P >> 1) - (h >> 1);
        this.D = this.N = this.F - s % this.F >> 1;
        const e = this;
        t.forEach((function(t) {
            e.pushBack(t);
        }));
    }
    T() {
        const t = [];
        const i = Math.max(this.P >> 1, 1);
        for (let s = 0; s < i; ++s) {
            t[s] = new Array(this.F);
        }
        for (let i = this.j; i < this.P; ++i) {
            t[t.length] = this.A[i];
        }
        for (let i = 0; i < this.R; ++i) {
            t[t.length] = this.A[i];
        }
        t[t.length] = [ ...this.A[this.R] ];
        this.j = i;
        this.R = t.length - 1;
        for (let s = 0; s < i; ++s) {
            t[t.length] = new Array(this.F);
        }
        this.A = t;
        this.P = t.length;
    }
    O(t) {
        const i = this.D + t + 1;
        const s = i % this.F;
        let h = s - 1;
        let e = this.j + (i - s) / this.F;
        if (s === 0) e -= 1;
        e %= this.P;
        if (h < 0) h += this.F;
        return {
            curNodeBucketIndex: e,
            curNodePointerIndex: h
        };
    }
    clear() {
        this.A = [ new Array(this.F) ];
        this.P = 1;
        this.j = this.R = this.i = 0;
        this.D = this.N = this.F >> 1;
    }
    begin() {
        return new DequeIterator(0, this);
    }
    end() {
        return new DequeIterator(this.i, this);
    }
    rBegin() {
        return new DequeIterator(this.i - 1, this, 1);
    }
    rEnd() {
        return new DequeIterator(-1, this, 1);
    }
    front() {
        if (this.i === 0) return;
        return this.A[this.j][this.D];
    }
    back() {
        if (this.i === 0) return;
        return this.A[this.R][this.N];
    }
    pushBack(t) {
        if (this.i) {
            if (this.N < this.F - 1) {
                this.N += 1;
            } else if (this.R < this.P - 1) {
                this.R += 1;
                this.N = 0;
            } else {
                this.R = 0;
                this.N = 0;
            }
            if (this.R === this.j && this.N === this.D) this.T();
        }
        this.i += 1;
        this.A[this.R][this.N] = t;
        return this.i;
    }
    popBack() {
        if (this.i === 0) return;
        const t = this.A[this.R][this.N];
        if (this.i !== 1) {
            if (this.N > 0) {
                this.N -= 1;
            } else if (this.R > 0) {
                this.R -= 1;
                this.N = this.F - 1;
            } else {
                this.R = this.P - 1;
                this.N = this.F - 1;
            }
        }
        this.i -= 1;
        return t;
    }
    pushFront(t) {
        if (this.i) {
            if (this.D > 0) {
                this.D -= 1;
            } else if (this.j > 0) {
                this.j -= 1;
                this.D = this.F - 1;
            } else {
                this.j = this.P - 1;
                this.D = this.F - 1;
            }
            if (this.j === this.R && this.D === this.N) this.T();
        }
        this.i += 1;
        this.A[this.j][this.D] = t;
        return this.i;
    }
    popFront() {
        if (this.i === 0) return;
        const t = this.A[this.j][this.D];
        if (this.i !== 1) {
            if (this.D < this.F - 1) {
                this.D += 1;
            } else if (this.j < this.P - 1) {
                this.j += 1;
                this.D = 0;
            } else {
                this.j = 0;
                this.D = 0;
            }
        }
        this.i -= 1;
        return t;
    }
    getElementByPos(t) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        const {curNodeBucketIndex: i, curNodePointerIndex: s} = this.O(t);
        return this.A[i][s];
    }
    setElementByPos(t, i) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        const {curNodeBucketIndex: s, curNodePointerIndex: h} = this.O(t);
        this.A[s][h] = i;
    }
    insert(t, i, s = 1) {
        if (t < 0 || t > this.i) {
            throw new RangeError;
        }
        if (t === 0) {
            while (s--) this.pushFront(i);
        } else if (t === this.i) {
            while (s--) this.pushBack(i);
        } else {
            const h = [];
            for (let i = t; i < this.i; ++i) {
                h.push(this.getElementByPos(i));
            }
            this.cut(t - 1);
            for (let t = 0; t < s; ++t) this.pushBack(i);
            for (let t = 0; t < h.length; ++t) this.pushBack(h[t]);
        }
        return this.i;
    }
    cut(t) {
        if (t < 0) {
            this.clear();
            return 0;
        }
        const {curNodeBucketIndex: i, curNodePointerIndex: s} = this.O(t);
        this.R = i;
        this.N = s;
        this.i = t + 1;
        return this.i;
    }
    eraseElementByPos(t) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        if (t === 0) this.popFront(); else if (t === this.i - 1) this.popBack(); else {
            const i = [];
            for (let s = t + 1; s < this.i; ++s) {
                i.push(this.getElementByPos(s));
            }
            this.cut(t);
            this.popBack();
            const s = this;
            i.forEach((function(t) {
                s.pushBack(t);
            }));
        }
        return this.i;
    }
    eraseElementByValue(t) {
        if (this.i === 0) return 0;
        const i = [];
        for (let s = 0; s < this.i; ++s) {
            const h = this.getElementByPos(s);
            if (h !== t) i.push(h);
        }
        const s = i.length;
        for (let t = 0; t < s; ++t) this.setElementByPos(t, i[t]);
        return this.cut(s - 1);
    }
    eraseElementByIterator(t) {
        const i = t.o;
        this.eraseElementByPos(i);
        t = t.next();
        return t;
    }
    find(t) {
        for (let i = 0; i < this.i; ++i) {
            if (this.getElementByPos(i) === t) {
                return new DequeIterator(i, this);
            }
        }
        return this.end();
    }
    reverse() {
        let t = 0;
        let i = this.i - 1;
        while (t < i) {
            const s = this.getElementByPos(t);
            this.setElementByPos(t, this.getElementByPos(i));
            this.setElementByPos(i, s);
            t += 1;
            i -= 1;
        }
    }
    unique() {
        if (this.i <= 1) {
            return this.i;
        }
        let t = 1;
        let i = this.getElementByPos(0);
        for (let s = 1; s < this.i; ++s) {
            const h = this.getElementByPos(s);
            if (h !== i) {
                i = h;
                this.setElementByPos(t++, h);
            }
        }
        while (this.i > t) this.popBack();
        return this.i;
    }
    sort(t) {
        const i = [];
        for (let t = 0; t < this.i; ++t) {
            i.push(this.getElementByPos(t));
        }
        i.sort(t);
        for (let t = 0; t < this.i; ++t) this.setElementByPos(t, i[t]);
    }
    shrinkToFit() {
        if (this.i === 0) return;
        const t = [];
        this.forEach((function(i) {
            t.push(i);
        }));
        this.P = Math.max(Math.ceil(this.i / this.F), 1);
        this.i = this.j = this.R = this.D = this.N = 0;
        this.A = [];
        for (let t = 0; t < this.P; ++t) {
            this.A.push(new Array(this.F));
        }
        for (let i = 0; i < t.length; ++i) this.pushBack(t[i]);
    }
    forEach(t) {
        for (let i = 0; i < this.i; ++i) {
            t(this.getElementByPos(i), i, this);
        }
    }
    [Symbol.iterator]() {
        return function*() {
            for (let t = 0; t < this.i; ++t) {
                yield this.getElementByPos(t);
            }
        }.bind(this)();
    }
}

var _default = Deque;

exports.default = _default;
//# sourceMappingURL=Deque.js.map

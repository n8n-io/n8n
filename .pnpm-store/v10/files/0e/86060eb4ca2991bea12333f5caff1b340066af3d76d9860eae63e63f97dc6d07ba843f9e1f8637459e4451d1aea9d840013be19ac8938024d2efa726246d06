"use strict";

Object.defineProperty(exports, "t", {
    value: true
});

exports.default = void 0;

var _Base = _interopRequireDefault(require("./Base"));

var _ContainerBase = require("../ContainerBase");

var _throwError = require("../../utils/throwError");

function _interopRequireDefault(t) {
    return t && t.t ? t : {
        default: t
    };
}

class LinkListIterator extends _ContainerBase.ContainerIterator {
    constructor(t, i, s, r) {
        super(r);
        this.o = t;
        this.h = i;
        this.container = s;
        if (this.iteratorType === 0) {
            this.pre = function() {
                if (this.o.L === this.h) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o = this.o.L;
                return this;
            };
            this.next = function() {
                if (this.o === this.h) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o = this.o.B;
                return this;
            };
        } else {
            this.pre = function() {
                if (this.o.B === this.h) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o = this.o.B;
                return this;
            };
            this.next = function() {
                if (this.o === this.h) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o = this.o.L;
                return this;
            };
        }
    }
    get pointer() {
        if (this.o === this.h) {
            (0, _throwError.throwIteratorAccessError)();
        }
        return this.o.l;
    }
    set pointer(t) {
        if (this.o === this.h) {
            (0, _throwError.throwIteratorAccessError)();
        }
        this.o.l = t;
    }
    copy() {
        return new LinkListIterator(this.o, this.h, this.container, this.iteratorType);
    }
}

class LinkList extends _Base.default {
    constructor(t = []) {
        super();
        this.h = {};
        this.p = this._ = this.h.L = this.h.B = this.h;
        const i = this;
        t.forEach((function(t) {
            i.pushBack(t);
        }));
    }
    V(t) {
        const {L: i, B: s} = t;
        i.B = s;
        s.L = i;
        if (t === this.p) {
            this.p = s;
        }
        if (t === this._) {
            this._ = i;
        }
        this.i -= 1;
    }
    G(t, i) {
        const s = i.B;
        const r = {
            l: t,
            L: i,
            B: s
        };
        i.B = r;
        s.L = r;
        if (i === this.h) {
            this.p = r;
        }
        if (s === this.h) {
            this._ = r;
        }
        this.i += 1;
    }
    clear() {
        this.i = 0;
        this.p = this._ = this.h.L = this.h.B = this.h;
    }
    begin() {
        return new LinkListIterator(this.p, this.h, this);
    }
    end() {
        return new LinkListIterator(this.h, this.h, this);
    }
    rBegin() {
        return new LinkListIterator(this._, this.h, this, 1);
    }
    rEnd() {
        return new LinkListIterator(this.h, this.h, this, 1);
    }
    front() {
        return this.p.l;
    }
    back() {
        return this._.l;
    }
    getElementByPos(t) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        let i = this.p;
        while (t--) {
            i = i.B;
        }
        return i.l;
    }
    eraseElementByPos(t) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        let i = this.p;
        while (t--) {
            i = i.B;
        }
        this.V(i);
        return this.i;
    }
    eraseElementByValue(t) {
        let i = this.p;
        while (i !== this.h) {
            if (i.l === t) {
                this.V(i);
            }
            i = i.B;
        }
        return this.i;
    }
    eraseElementByIterator(t) {
        const i = t.o;
        if (i === this.h) {
            (0, _throwError.throwIteratorAccessError)();
        }
        t = t.next();
        this.V(i);
        return t;
    }
    pushBack(t) {
        this.G(t, this._);
        return this.i;
    }
    popBack() {
        if (this.i === 0) return;
        const t = this._.l;
        this.V(this._);
        return t;
    }
    pushFront(t) {
        this.G(t, this.h);
        return this.i;
    }
    popFront() {
        if (this.i === 0) return;
        const t = this.p.l;
        this.V(this.p);
        return t;
    }
    setElementByPos(t, i) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        let s = this.p;
        while (t--) {
            s = s.B;
        }
        s.l = i;
    }
    insert(t, i, s = 1) {
        if (t < 0 || t > this.i) {
            throw new RangeError;
        }
        if (s <= 0) return this.i;
        if (t === 0) {
            while (s--) this.pushFront(i);
        } else if (t === this.i) {
            while (s--) this.pushBack(i);
        } else {
            let r = this.p;
            for (let i = 1; i < t; ++i) {
                r = r.B;
            }
            const e = r.B;
            this.i += s;
            while (s--) {
                r.B = {
                    l: i,
                    L: r
                };
                r.B.L = r;
                r = r.B;
            }
            r.B = e;
            e.L = r;
        }
        return this.i;
    }
    find(t) {
        let i = this.p;
        while (i !== this.h) {
            if (i.l === t) {
                return new LinkListIterator(i, this.h, this);
            }
            i = i.B;
        }
        return this.end();
    }
    reverse() {
        if (this.i <= 1) return;
        let t = this.p;
        let i = this._;
        let s = 0;
        while (s << 1 < this.i) {
            const r = t.l;
            t.l = i.l;
            i.l = r;
            t = t.B;
            i = i.L;
            s += 1;
        }
    }
    unique() {
        if (this.i <= 1) {
            return this.i;
        }
        let t = this.p;
        while (t !== this.h) {
            let i = t;
            while (i.B !== this.h && i.l === i.B.l) {
                i = i.B;
                this.i -= 1;
            }
            t.B = i.B;
            t.B.L = t;
            t = t.B;
        }
        return this.i;
    }
    sort(t) {
        if (this.i <= 1) return;
        const i = [];
        this.forEach((function(t) {
            i.push(t);
        }));
        i.sort(t);
        let s = this.p;
        i.forEach((function(t) {
            s.l = t;
            s = s.B;
        }));
    }
    merge(t) {
        const i = this;
        if (this.i === 0) {
            t.forEach((function(t) {
                i.pushBack(t);
            }));
        } else {
            let s = this.p;
            t.forEach((function(t) {
                while (s !== i.h && s.l <= t) {
                    s = s.B;
                }
                i.G(t, s.L);
            }));
        }
        return this.i;
    }
    forEach(t) {
        let i = this.p;
        let s = 0;
        while (i !== this.h) {
            t(i.l, s++, this);
            i = i.B;
        }
    }
    [Symbol.iterator]() {
        return function*() {
            if (this.i === 0) return;
            let t = this.p;
            while (t !== this.h) {
                yield t.l;
                t = t.B;
            }
        }.bind(this)();
    }
}

var _default = LinkList;

exports.default = _default;
//# sourceMappingURL=LinkList.js.map

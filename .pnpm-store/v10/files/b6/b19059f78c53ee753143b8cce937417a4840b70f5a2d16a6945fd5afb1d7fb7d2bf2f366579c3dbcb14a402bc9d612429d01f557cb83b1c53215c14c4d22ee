"use strict";

Object.defineProperty(exports, "t", {
    value: true
});

exports.default = void 0;

var _Base = require("./Base");

var _checkObject = _interopRequireDefault(require("../../utils/checkObject"));

var _throwError = require("../../utils/throwError");

function _interopRequireDefault(t) {
    return t && t.t ? t : {
        default: t
    };
}

class HashMapIterator extends _Base.HashContainerIterator {
    constructor(t, e, r, s) {
        super(t, e, s);
        this.container = r;
    }
    get pointer() {
        if (this.o === this.h) {
            (0, _throwError.throwIteratorAccessError)();
        }
        const t = this;
        return new Proxy([], {
            get(e, r) {
                if (r === "0") return t.o.u; else if (r === "1") return t.o.l;
            },
            set(e, r, s) {
                if (r !== "1") {
                    throw new TypeError("props must be 1");
                }
                t.o.l = s;
                return true;
            }
        });
    }
    copy() {
        return new HashMapIterator(this.o, this.h, this.container, this.iteratorType);
    }
}

class HashMap extends _Base.HashContainer {
    constructor(t = []) {
        super();
        const e = this;
        t.forEach((function(t) {
            e.setElement(t[0], t[1]);
        }));
    }
    begin() {
        return new HashMapIterator(this.p, this.h, this);
    }
    end() {
        return new HashMapIterator(this.h, this.h, this);
    }
    rBegin() {
        return new HashMapIterator(this._, this.h, this, 1);
    }
    rEnd() {
        return new HashMapIterator(this.h, this.h, this, 1);
    }
    front() {
        if (this.i === 0) return;
        return [ this.p.u, this.p.l ];
    }
    back() {
        if (this.i === 0) return;
        return [ this._.u, this._.l ];
    }
    setElement(t, e, r) {
        return this.M(t, e, r);
    }
    getElementByKey(t, e) {
        if (e === undefined) e = (0, _checkObject.default)(t);
        if (e) {
            const e = t[this.HASH_TAG];
            return e !== undefined ? this.H[e].l : undefined;
        }
        const r = this.g[t];
        return r ? r.l : undefined;
    }
    getElementByPos(t) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        let e = this.p;
        while (t--) {
            e = e.B;
        }
        return [ e.u, e.l ];
    }
    find(t, e) {
        const r = this.I(t, e);
        return new HashMapIterator(r, this.h, this);
    }
    forEach(t) {
        let e = 0;
        let r = this.p;
        while (r !== this.h) {
            t([ r.u, r.l ], e++, this);
            r = r.B;
        }
    }
    [Symbol.iterator]() {
        return function*() {
            let t = this.p;
            while (t !== this.h) {
                yield [ t.u, t.l ];
                t = t.B;
            }
        }.bind(this)();
    }
}

var _default = HashMap;

exports.default = _default;
//# sourceMappingURL=HashMap.js.map

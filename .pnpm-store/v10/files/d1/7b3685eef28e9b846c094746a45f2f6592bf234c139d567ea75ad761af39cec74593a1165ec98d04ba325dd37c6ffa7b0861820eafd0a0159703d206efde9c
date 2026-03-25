"use strict";

Object.defineProperty(exports, "t", {
    value: true
});

exports.default = void 0;

var _Base = _interopRequireDefault(require("./Base"));

var _TreeIterator = _interopRequireDefault(require("./Base/TreeIterator"));

var _throwError = require("../../utils/throwError");

function _interopRequireDefault(r) {
    return r && r.t ? r : {
        default: r
    };
}

class OrderedMapIterator extends _TreeIterator.default {
    constructor(r, t, e, s) {
        super(r, t, s);
        this.container = e;
    }
    get pointer() {
        if (this.o === this.h) {
            (0, _throwError.throwIteratorAccessError)();
        }
        const r = this;
        return new Proxy([], {
            get(t, e) {
                if (e === "0") return r.o.u; else if (e === "1") return r.o.l;
            },
            set(t, e, s) {
                if (e !== "1") {
                    throw new TypeError("props must be 1");
                }
                r.o.l = s;
                return true;
            }
        });
    }
    copy() {
        return new OrderedMapIterator(this.o, this.h, this.container, this.iteratorType);
    }
}

class OrderedMap extends _Base.default {
    constructor(r = [], t, e) {
        super(t, e);
        const s = this;
        r.forEach((function(r) {
            s.setElement(r[0], r[1]);
        }));
    }
    * K(r) {
        if (r === undefined) return;
        yield* this.K(r.U);
        yield [ r.u, r.l ];
        yield* this.K(r.W);
    }
    begin() {
        return new OrderedMapIterator(this.h.U || this.h, this.h, this);
    }
    end() {
        return new OrderedMapIterator(this.h, this.h, this);
    }
    rBegin() {
        return new OrderedMapIterator(this.h.W || this.h, this.h, this, 1);
    }
    rEnd() {
        return new OrderedMapIterator(this.h, this.h, this, 1);
    }
    front() {
        if (this.i === 0) return;
        const r = this.h.U;
        return [ r.u, r.l ];
    }
    back() {
        if (this.i === 0) return;
        const r = this.h.W;
        return [ r.u, r.l ];
    }
    lowerBound(r) {
        const t = this.X(this.Y, r);
        return new OrderedMapIterator(t, this.h, this);
    }
    upperBound(r) {
        const t = this.Z(this.Y, r);
        return new OrderedMapIterator(t, this.h, this);
    }
    reverseLowerBound(r) {
        const t = this.$(this.Y, r);
        return new OrderedMapIterator(t, this.h, this);
    }
    reverseUpperBound(r) {
        const t = this.rr(this.Y, r);
        return new OrderedMapIterator(t, this.h, this);
    }
    setElement(r, t, e) {
        return this.M(r, t, e);
    }
    find(r) {
        const t = this.I(this.Y, r);
        return new OrderedMapIterator(t, this.h, this);
    }
    getElementByKey(r) {
        const t = this.I(this.Y, r);
        return t.l;
    }
    union(r) {
        const t = this;
        r.forEach((function(r) {
            t.setElement(r[0], r[1]);
        }));
        return this.i;
    }
    [Symbol.iterator]() {
        return this.K(this.Y);
    }
}

var _default = OrderedMap;

exports.default = _default;
//# sourceMappingURL=OrderedMap.js.map

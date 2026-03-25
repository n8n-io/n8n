"use strict";

Object.defineProperty(exports, "t", {
    value: true
});

exports.default = void 0;

var _Base = _interopRequireDefault(require("./Base"));

var _TreeIterator = _interopRequireDefault(require("./Base/TreeIterator"));

var _throwError = require("../../utils/throwError");

function _interopRequireDefault(e) {
    return e && e.t ? e : {
        default: e
    };
}

class OrderedSetIterator extends _TreeIterator.default {
    constructor(e, t, r, i) {
        super(e, t, i);
        this.container = r;
    }
    get pointer() {
        if (this.o === this.h) {
            (0, _throwError.throwIteratorAccessError)();
        }
        return this.o.u;
    }
    copy() {
        return new OrderedSetIterator(this.o, this.h, this.container, this.iteratorType);
    }
}

class OrderedSet extends _Base.default {
    constructor(e = [], t, r) {
        super(t, r);
        const i = this;
        e.forEach((function(e) {
            i.insert(e);
        }));
    }
    * K(e) {
        if (e === undefined) return;
        yield* this.K(e.U);
        yield e.u;
        yield* this.K(e.W);
    }
    begin() {
        return new OrderedSetIterator(this.h.U || this.h, this.h, this);
    }
    end() {
        return new OrderedSetIterator(this.h, this.h, this);
    }
    rBegin() {
        return new OrderedSetIterator(this.h.W || this.h, this.h, this, 1);
    }
    rEnd() {
        return new OrderedSetIterator(this.h, this.h, this, 1);
    }
    front() {
        return this.h.U ? this.h.U.u : undefined;
    }
    back() {
        return this.h.W ? this.h.W.u : undefined;
    }
    insert(e, t) {
        return this.M(e, undefined, t);
    }
    find(e) {
        const t = this.I(this.Y, e);
        return new OrderedSetIterator(t, this.h, this);
    }
    lowerBound(e) {
        const t = this.X(this.Y, e);
        return new OrderedSetIterator(t, this.h, this);
    }
    upperBound(e) {
        const t = this.Z(this.Y, e);
        return new OrderedSetIterator(t, this.h, this);
    }
    reverseLowerBound(e) {
        const t = this.$(this.Y, e);
        return new OrderedSetIterator(t, this.h, this);
    }
    reverseUpperBound(e) {
        const t = this.rr(this.Y, e);
        return new OrderedSetIterator(t, this.h, this);
    }
    union(e) {
        const t = this;
        e.forEach((function(e) {
            t.insert(e);
        }));
        return this.i;
    }
    [Symbol.iterator]() {
        return this.K(this.Y);
    }
}

var _default = OrderedSet;

exports.default = _default;
//# sourceMappingURL=OrderedSet.js.map

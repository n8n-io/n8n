"use strict";

Object.defineProperty(exports, "t", {
    value: true
});

exports.HashContainerIterator = exports.HashContainer = void 0;

var _ContainerBase = require("../../ContainerBase");

var _checkObject = _interopRequireDefault(require("../../../utils/checkObject"));

var _throwError = require("../../../utils/throwError");

function _interopRequireDefault(t) {
    return t && t.t ? t : {
        default: t
    };
}

class HashContainerIterator extends _ContainerBase.ContainerIterator {
    constructor(t, e, i) {
        super(i);
        this.o = t;
        this.h = e;
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
}

exports.HashContainerIterator = HashContainerIterator;

class HashContainer extends _ContainerBase.Container {
    constructor() {
        super();
        this.H = [];
        this.g = {};
        this.HASH_TAG = Symbol("@@HASH_TAG");
        Object.setPrototypeOf(this.g, null);
        this.h = {};
        this.h.L = this.h.B = this.p = this._ = this.h;
    }
    V(t) {
        const {L: e, B: i} = t;
        e.B = i;
        i.L = e;
        if (t === this.p) {
            this.p = i;
        }
        if (t === this._) {
            this._ = e;
        }
        this.i -= 1;
    }
    M(t, e, i) {
        if (i === undefined) i = (0, _checkObject.default)(t);
        let s;
        if (i) {
            const i = t[this.HASH_TAG];
            if (i !== undefined) {
                this.H[i].l = e;
                return this.i;
            }
            Object.defineProperty(t, this.HASH_TAG, {
                value: this.H.length,
                configurable: true
            });
            s = {
                u: t,
                l: e,
                L: this._,
                B: this.h
            };
            this.H.push(s);
        } else {
            const i = this.g[t];
            if (i) {
                i.l = e;
                return this.i;
            }
            s = {
                u: t,
                l: e,
                L: this._,
                B: this.h
            };
            this.g[t] = s;
        }
        if (this.i === 0) {
            this.p = s;
            this.h.B = s;
        } else {
            this._.B = s;
        }
        this._ = s;
        this.h.L = s;
        return ++this.i;
    }
    I(t, e) {
        if (e === undefined) e = (0, _checkObject.default)(t);
        if (e) {
            const e = t[this.HASH_TAG];
            if (e === undefined) return this.h;
            return this.H[e];
        } else {
            return this.g[t] || this.h;
        }
    }
    clear() {
        const t = this.HASH_TAG;
        this.H.forEach((function(e) {
            delete e.u[t];
        }));
        this.H = [];
        this.g = {};
        Object.setPrototypeOf(this.g, null);
        this.i = 0;
        this.p = this._ = this.h.L = this.h.B = this.h;
    }
    eraseElementByKey(t, e) {
        let i;
        if (e === undefined) e = (0, _checkObject.default)(t);
        if (e) {
            const e = t[this.HASH_TAG];
            if (e === undefined) return false;
            delete t[this.HASH_TAG];
            i = this.H[e];
            delete this.H[e];
        } else {
            i = this.g[t];
            if (i === undefined) return false;
            delete this.g[t];
        }
        this.V(i);
        return true;
    }
    eraseElementByIterator(t) {
        const e = t.o;
        if (e === this.h) {
            (0, _throwError.throwIteratorAccessError)();
        }
        this.V(e);
        return t.next();
    }
    eraseElementByPos(t) {
        if (t < 0 || t > this.i - 1) {
            throw new RangeError;
        }
        let e = this.p;
        while (t--) {
            e = e.B;
        }
        this.V(e);
        return this.i;
    }
}

exports.HashContainer = HashContainer;
//# sourceMappingURL=index.js.map

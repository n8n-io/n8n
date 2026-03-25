"use strict";

Object.defineProperty(exports, "t", {
    value: true
});

exports.default = void 0;

var _ContainerBase = require("../../ContainerBase");

var _throwError = require("../../../utils/throwError");

class TreeIterator extends _ContainerBase.ContainerIterator {
    constructor(t, r, i) {
        super(i);
        this.o = t;
        this.h = r;
        if (this.iteratorType === 0) {
            this.pre = function() {
                if (this.o === this.h.U) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o = this.o.L();
                return this;
            };
            this.next = function() {
                if (this.o === this.h) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o = this.o.B();
                return this;
            };
        } else {
            this.pre = function() {
                if (this.o === this.h.W) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o = this.o.B();
                return this;
            };
            this.next = function() {
                if (this.o === this.h) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o = this.o.L();
                return this;
            };
        }
    }
    get index() {
        let t = this.o;
        const r = this.h.tt;
        if (t === this.h) {
            if (r) {
                return r.rt - 1;
            }
            return 0;
        }
        let i = 0;
        if (t.U) {
            i += t.U.rt;
        }
        while (t !== r) {
            const r = t.tt;
            if (t === r.W) {
                i += 1;
                if (r.U) {
                    i += r.U.rt;
                }
            }
            t = r;
        }
        return i;
    }
}

var _default = TreeIterator;

exports.default = _default;
//# sourceMappingURL=TreeIterator.js.map

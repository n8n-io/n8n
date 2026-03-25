"use strict";

Object.defineProperty(exports, "t", {
    value: true
});

exports.RandomIterator = void 0;

var _ContainerBase = require("../../ContainerBase");

var _throwError = require("../../../utils/throwError");

class RandomIterator extends _ContainerBase.ContainerIterator {
    constructor(t, r) {
        super(r);
        this.o = t;
        if (this.iteratorType === 0) {
            this.pre = function() {
                if (this.o === 0) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o -= 1;
                return this;
            };
            this.next = function() {
                if (this.o === this.container.size()) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o += 1;
                return this;
            };
        } else {
            this.pre = function() {
                if (this.o === this.container.size() - 1) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o += 1;
                return this;
            };
            this.next = function() {
                if (this.o === -1) {
                    (0, _throwError.throwIteratorAccessError)();
                }
                this.o -= 1;
                return this;
            };
        }
    }
    get pointer() {
        return this.container.getElementByPos(this.o);
    }
    set pointer(t) {
        this.container.setElementByPos(this.o, t);
    }
}

exports.RandomIterator = RandomIterator;
//# sourceMappingURL=RandomIterator.js.map

var __extends = this && this.t || function() {
    var extendStatics = function(t, r) {
        extendStatics = Object.setPrototypeOf || {
            __proto__: []
        } instanceof Array && function(t, r) {
            t.__proto__ = r;
        } || function(t, r) {
            for (var n in r) if (Object.prototype.hasOwnProperty.call(r, n)) t[n] = r[n];
        };
        return extendStatics(t, r);
    };
    return function(t, r) {
        if (typeof r !== "function" && r !== null) throw new TypeError("Class extends value " + String(r) + " is not a constructor or null");
        extendStatics(t, r);
        function __() {
            this.constructor = t;
        }
        t.prototype = r === null ? Object.create(r) : (__.prototype = r.prototype, new __);
    };
}();

import { ContainerIterator } from "../../ContainerBase";

import { throwIteratorAccessError } from "../../../utils/throwError";

var RandomIterator = function(t) {
    __extends(RandomIterator, t);
    function RandomIterator(r, n) {
        var o = t.call(this, n) || this;
        o.o = r;
        if (o.iteratorType === 0) {
            o.pre = function() {
                if (this.o === 0) {
                    throwIteratorAccessError();
                }
                this.o -= 1;
                return this;
            };
            o.next = function() {
                if (this.o === this.container.size()) {
                    throwIteratorAccessError();
                }
                this.o += 1;
                return this;
            };
        } else {
            o.pre = function() {
                if (this.o === this.container.size() - 1) {
                    throwIteratorAccessError();
                }
                this.o += 1;
                return this;
            };
            o.next = function() {
                if (this.o === -1) {
                    throwIteratorAccessError();
                }
                this.o -= 1;
                return this;
            };
        }
        return o;
    }
    Object.defineProperty(RandomIterator.prototype, "pointer", {
        get: function() {
            return this.container.getElementByPos(this.o);
        },
        set: function(t) {
            this.container.setElementByPos(this.o, t);
        },
        enumerable: false,
        configurable: true
    });
    return RandomIterator;
}(ContainerIterator);

export { RandomIterator };
//# sourceMappingURL=RandomIterator.js.map

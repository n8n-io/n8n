var __extends = this && this.t || function() {
    var extendStatics = function(r, t) {
        extendStatics = Object.setPrototypeOf || {
            __proto__: []
        } instanceof Array && function(r, t) {
            r.__proto__ = t;
        } || function(r, t) {
            for (var e in t) if (Object.prototype.hasOwnProperty.call(t, e)) r[e] = t[e];
        };
        return extendStatics(r, t);
    };
    return function(r, t) {
        if (typeof t !== "function" && t !== null) throw new TypeError("Class extends value " + String(t) + " is not a constructor or null");
        extendStatics(r, t);
        function __() {
            this.constructor = r;
        }
        r.prototype = t === null ? Object.create(t) : (__.prototype = t.prototype, new __);
    };
}();

import { ContainerIterator } from "../../ContainerBase";

import { throwIteratorAccessError } from "../../../utils/throwError";

var TreeIterator = function(r) {
    __extends(TreeIterator, r);
    function TreeIterator(t, e, i) {
        var n = r.call(this, i) || this;
        n.o = t;
        n.h = e;
        if (n.iteratorType === 0) {
            n.pre = function() {
                if (this.o === this.h.K) {
                    throwIteratorAccessError();
                }
                this.o = this.o.L();
                return this;
            };
            n.next = function() {
                if (this.o === this.h) {
                    throwIteratorAccessError();
                }
                this.o = this.o.m();
                return this;
            };
        } else {
            n.pre = function() {
                if (this.o === this.h.N) {
                    throwIteratorAccessError();
                }
                this.o = this.o.m();
                return this;
            };
            n.next = function() {
                if (this.o === this.h) {
                    throwIteratorAccessError();
                }
                this.o = this.o.L();
                return this;
            };
        }
        return n;
    }
    Object.defineProperty(TreeIterator.prototype, "index", {
        get: function() {
            var r = this.o;
            var t = this.h.rr;
            if (r === this.h) {
                if (t) {
                    return t.tr - 1;
                }
                return 0;
            }
            var e = 0;
            if (r.K) {
                e += r.K.tr;
            }
            while (r !== t) {
                var i = r.rr;
                if (r === i.N) {
                    e += 1;
                    if (i.K) {
                        e += i.K.tr;
                    }
                }
                r = i;
            }
            return e;
        },
        enumerable: false,
        configurable: true
    });
    return TreeIterator;
}(ContainerIterator);

export default TreeIterator;
//# sourceMappingURL=TreeIterator.js.map

var __extends = this && this.t || function() {
    var extendStatics = function(e, t) {
        extendStatics = Object.setPrototypeOf || {
            __proto__: []
        } instanceof Array && function(e, t) {
            e.__proto__ = t;
        } || function(e, t) {
            for (var r in t) if (Object.prototype.hasOwnProperty.call(t, r)) e[r] = t[r];
        };
        return extendStatics(e, t);
    };
    return function(e, t) {
        if (typeof t !== "function" && t !== null) throw new TypeError("Class extends value " + String(t) + " is not a constructor or null");
        extendStatics(e, t);
        function __() {
            this.constructor = e;
        }
        e.prototype = t === null ? Object.create(t) : (__.prototype = t.prototype, new __);
    };
}();

var __generator = this && this.i || function(e, t) {
    var r = {
        label: 0,
        sent: function() {
            if (o[0] & 1) throw o[1];
            return o[1];
        },
        trys: [],
        ops: []
    }, n, i, o, u;
    return u = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (u[Symbol.iterator] = function() {
        return this;
    }), u;
    function verb(e) {
        return function(t) {
            return step([ e, t ]);
        };
    }
    function step(u) {
        if (n) throw new TypeError("Generator is already executing.");
        while (r) try {
            if (n = 1, i && (o = u[0] & 2 ? i["return"] : u[0] ? i["throw"] || ((o = i["return"]) && o.call(i), 
            0) : i.next) && !(o = o.call(i, u[1])).done) return o;
            if (i = 0, o) u = [ u[0] & 2, o.value ];
            switch (u[0]) {
              case 0:
              case 1:
                o = u;
                break;

              case 4:
                r.label++;
                return {
                    value: u[1],
                    done: false
                };

              case 5:
                r.label++;
                i = u[1];
                u = [ 0 ];
                continue;

              case 7:
                u = r.ops.pop();
                r.trys.pop();
                continue;

              default:
                if (!(o = r.trys, o = o.length > 0 && o[o.length - 1]) && (u[0] === 6 || u[0] === 2)) {
                    r = 0;
                    continue;
                }
                if (u[0] === 3 && (!o || u[1] > o[0] && u[1] < o[3])) {
                    r.label = u[1];
                    break;
                }
                if (u[0] === 6 && r.label < o[1]) {
                    r.label = o[1];
                    o = u;
                    break;
                }
                if (o && r.label < o[2]) {
                    r.label = o[2];
                    r.ops.push(u);
                    break;
                }
                if (o[2]) r.ops.pop();
                r.trys.pop();
                continue;
            }
            u = t.call(e, r);
        } catch (e) {
            u = [ 6, e ];
            i = 0;
        } finally {
            n = o = 0;
        }
        if (u[0] & 5) throw u[1];
        return {
            value: u[0] ? u[1] : void 0,
            done: true
        };
    }
};

var __values = this && this.V || function(e) {
    var t = typeof Symbol === "function" && Symbol.iterator, r = t && e[t], n = 0;
    if (r) return r.call(e);
    if (e && typeof e.length === "number") return {
        next: function() {
            if (e && n >= e.length) e = void 0;
            return {
                value: e && e[n++],
                done: !e
            };
        }
    };
    throw new TypeError(t ? "Object is not iterable." : "Symbol.iterator is not defined.");
};

import TreeContainer from "./Base";

import TreeIterator from "./Base/TreeIterator";

import { throwIteratorAccessError } from "../../utils/throwError";

var OrderedSetIterator = function(e) {
    __extends(OrderedSetIterator, e);
    function OrderedSetIterator(t, r, n, i) {
        var o = e.call(this, t, r, i) || this;
        o.container = n;
        return o;
    }
    Object.defineProperty(OrderedSetIterator.prototype, "pointer", {
        get: function() {
            if (this.o === this.h) {
                throwIteratorAccessError();
            }
            return this.o.u;
        },
        enumerable: false,
        configurable: true
    });
    OrderedSetIterator.prototype.copy = function() {
        return new OrderedSetIterator(this.o, this.h, this.container, this.iteratorType);
    };
    return OrderedSetIterator;
}(TreeIterator);

var OrderedSet = function(e) {
    __extends(OrderedSet, e);
    function OrderedSet(t, r, n) {
        if (t === void 0) {
            t = [];
        }
        var i = e.call(this, r, n) || this;
        var o = i;
        t.forEach((function(e) {
            o.insert(e);
        }));
        return i;
    }
    OrderedSet.prototype.P = function(e) {
        return __generator(this, (function(t) {
            switch (t.label) {
              case 0:
                if (e === undefined) return [ 2 ];
                return [ 5, __values(this.P(e.K)) ];

              case 1:
                t.sent();
                return [ 4, e.u ];

              case 2:
                t.sent();
                return [ 5, __values(this.P(e.N)) ];

              case 3:
                t.sent();
                return [ 2 ];
            }
        }));
    };
    OrderedSet.prototype.begin = function() {
        return new OrderedSetIterator(this.h.K || this.h, this.h, this);
    };
    OrderedSet.prototype.end = function() {
        return new OrderedSetIterator(this.h, this.h, this);
    };
    OrderedSet.prototype.rBegin = function() {
        return new OrderedSetIterator(this.h.N || this.h, this.h, this, 1);
    };
    OrderedSet.prototype.rEnd = function() {
        return new OrderedSetIterator(this.h, this.h, this, 1);
    };
    OrderedSet.prototype.front = function() {
        return this.h.K ? this.h.K.u : undefined;
    };
    OrderedSet.prototype.back = function() {
        return this.h.N ? this.h.N.u : undefined;
    };
    OrderedSet.prototype.insert = function(e, t) {
        return this.v(e, undefined, t);
    };
    OrderedSet.prototype.find = function(e) {
        var t = this.g(this.W, e);
        return new OrderedSetIterator(t, this.h, this);
    };
    OrderedSet.prototype.lowerBound = function(e) {
        var t = this.U(this.W, e);
        return new OrderedSetIterator(t, this.h, this);
    };
    OrderedSet.prototype.upperBound = function(e) {
        var t = this.X(this.W, e);
        return new OrderedSetIterator(t, this.h, this);
    };
    OrderedSet.prototype.reverseLowerBound = function(e) {
        var t = this.Y(this.W, e);
        return new OrderedSetIterator(t, this.h, this);
    };
    OrderedSet.prototype.reverseUpperBound = function(e) {
        var t = this.Z(this.W, e);
        return new OrderedSetIterator(t, this.h, this);
    };
    OrderedSet.prototype.union = function(e) {
        var t = this;
        e.forEach((function(e) {
            t.insert(e);
        }));
        return this.M;
    };
    OrderedSet.prototype[Symbol.iterator] = function() {
        return this.P(this.W);
    };
    return OrderedSet;
}(TreeContainer);

export default OrderedSet;
//# sourceMappingURL=OrderedSet.js.map

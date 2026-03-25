var __extends = this && this.t || function() {
    var extendStatics = function(t, r) {
        extendStatics = Object.setPrototypeOf || {
            __proto__: []
        } instanceof Array && function(t, r) {
            t.__proto__ = r;
        } || function(t, r) {
            for (var e in r) if (Object.prototype.hasOwnProperty.call(r, e)) t[e] = r[e];
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

var __generator = this && this.i || function(t, r) {
    var e = {
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
    function verb(t) {
        return function(r) {
            return step([ t, r ]);
        };
    }
    function step(u) {
        if (n) throw new TypeError("Generator is already executing.");
        while (e) try {
            if (n = 1, i && (o = u[0] & 2 ? i["return"] : u[0] ? i["throw"] || ((o = i["return"]) && o.call(i), 
            0) : i.next) && !(o = o.call(i, u[1])).done) return o;
            if (i = 0, o) u = [ u[0] & 2, o.value ];
            switch (u[0]) {
              case 0:
              case 1:
                o = u;
                break;

              case 4:
                e.label++;
                return {
                    value: u[1],
                    done: false
                };

              case 5:
                e.label++;
                i = u[1];
                u = [ 0 ];
                continue;

              case 7:
                u = e.ops.pop();
                e.trys.pop();
                continue;

              default:
                if (!(o = e.trys, o = o.length > 0 && o[o.length - 1]) && (u[0] === 6 || u[0] === 2)) {
                    e = 0;
                    continue;
                }
                if (u[0] === 3 && (!o || u[1] > o[0] && u[1] < o[3])) {
                    e.label = u[1];
                    break;
                }
                if (u[0] === 6 && e.label < o[1]) {
                    e.label = o[1];
                    o = u;
                    break;
                }
                if (o && e.label < o[2]) {
                    e.label = o[2];
                    e.ops.push(u);
                    break;
                }
                if (o[2]) e.ops.pop();
                e.trys.pop();
                continue;
            }
            u = r.call(t, e);
        } catch (t) {
            u = [ 6, t ];
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

var __read = this && this.q || function(t, r) {
    var e = typeof Symbol === "function" && t[Symbol.iterator];
    if (!e) return t;
    var n = e.call(t), i, o = [], u;
    try {
        while ((r === void 0 || r-- > 0) && !(i = n.next()).done) o.push(i.value);
    } catch (t) {
        u = {
            error: t
        };
    } finally {
        try {
            if (i && !i.done && (e = n["return"])) e.call(n);
        } finally {
            if (u) throw u.error;
        }
    }
    return o;
};

var __spreadArray = this && this.D || function(t, r, e) {
    if (e || arguments.length === 2) for (var n = 0, i = r.length, o; n < i; n++) {
        if (o || !(n in r)) {
            if (!o) o = Array.prototype.slice.call(r, 0, n);
            o[n] = r[n];
        }
    }
    return t.concat(o || Array.prototype.slice.call(r));
};

var __values = this && this.V || function(t) {
    var r = typeof Symbol === "function" && Symbol.iterator, e = r && t[r], n = 0;
    if (e) return e.call(t);
    if (t && typeof t.length === "number") return {
        next: function() {
            if (t && n >= t.length) t = void 0;
            return {
                value: t && t[n++],
                done: !t
            };
        }
    };
    throw new TypeError(r ? "Object is not iterable." : "Symbol.iterator is not defined.");
};

import SequentialContainer from "./Base";

import { RandomIterator } from "./Base/RandomIterator";

var VectorIterator = function(t) {
    __extends(VectorIterator, t);
    function VectorIterator(r, e, n) {
        var i = t.call(this, r, n) || this;
        i.container = e;
        return i;
    }
    VectorIterator.prototype.copy = function() {
        return new VectorIterator(this.o, this.container, this.iteratorType);
    };
    return VectorIterator;
}(RandomIterator);

var Vector = function(t) {
    __extends(Vector, t);
    function Vector(r, e) {
        if (r === void 0) {
            r = [];
        }
        if (e === void 0) {
            e = true;
        }
        var n = t.call(this) || this;
        if (Array.isArray(r)) {
            n.J = e ? __spreadArray([], __read(r), false) : r;
            n.M = r.length;
        } else {
            n.J = [];
            var i = n;
            r.forEach((function(t) {
                i.pushBack(t);
            }));
        }
        return n;
    }
    Vector.prototype.clear = function() {
        this.M = 0;
        this.J.length = 0;
    };
    Vector.prototype.begin = function() {
        return new VectorIterator(0, this);
    };
    Vector.prototype.end = function() {
        return new VectorIterator(this.M, this);
    };
    Vector.prototype.rBegin = function() {
        return new VectorIterator(this.M - 1, this, 1);
    };
    Vector.prototype.rEnd = function() {
        return new VectorIterator(-1, this, 1);
    };
    Vector.prototype.front = function() {
        return this.J[0];
    };
    Vector.prototype.back = function() {
        return this.J[this.M - 1];
    };
    Vector.prototype.getElementByPos = function(t) {
        if (t < 0 || t > this.M - 1) {
            throw new RangeError;
        }
        return this.J[t];
    };
    Vector.prototype.eraseElementByPos = function(t) {
        if (t < 0 || t > this.M - 1) {
            throw new RangeError;
        }
        this.J.splice(t, 1);
        this.M -= 1;
        return this.M;
    };
    Vector.prototype.eraseElementByValue = function(t) {
        var r = 0;
        for (var e = 0; e < this.M; ++e) {
            if (this.J[e] !== t) {
                this.J[r++] = this.J[e];
            }
        }
        this.M = this.J.length = r;
        return this.M;
    };
    Vector.prototype.eraseElementByIterator = function(t) {
        var r = t.o;
        t = t.next();
        this.eraseElementByPos(r);
        return t;
    };
    Vector.prototype.pushBack = function(t) {
        this.J.push(t);
        this.M += 1;
        return this.M;
    };
    Vector.prototype.popBack = function() {
        if (this.M === 0) return;
        this.M -= 1;
        return this.J.pop();
    };
    Vector.prototype.setElementByPos = function(t, r) {
        if (t < 0 || t > this.M - 1) {
            throw new RangeError;
        }
        this.J[t] = r;
    };
    Vector.prototype.insert = function(t, r, e) {
        var n;
        if (e === void 0) {
            e = 1;
        }
        if (t < 0 || t > this.M) {
            throw new RangeError;
        }
        (n = this.J).splice.apply(n, __spreadArray([ t, 0 ], __read(new Array(e).fill(r)), false));
        this.M += e;
        return this.M;
    };
    Vector.prototype.find = function(t) {
        for (var r = 0; r < this.M; ++r) {
            if (this.J[r] === t) {
                return new VectorIterator(r, this);
            }
        }
        return this.end();
    };
    Vector.prototype.reverse = function() {
        this.J.reverse();
    };
    Vector.prototype.unique = function() {
        var t = 1;
        for (var r = 1; r < this.M; ++r) {
            if (this.J[r] !== this.J[r - 1]) {
                this.J[t++] = this.J[r];
            }
        }
        this.M = this.J.length = t;
        return this.M;
    };
    Vector.prototype.sort = function(t) {
        this.J.sort(t);
    };
    Vector.prototype.forEach = function(t) {
        for (var r = 0; r < this.M; ++r) {
            t(this.J[r], r, this);
        }
    };
    Vector.prototype[Symbol.iterator] = function() {
        return function() {
            return __generator(this, (function(t) {
                switch (t.label) {
                  case 0:
                    return [ 5, __values(this.J) ];

                  case 1:
                    t.sent();
                    return [ 2 ];
                }
            }));
        }.bind(this)();
    };
    return Vector;
}(SequentialContainer);

export default Vector;
//# sourceMappingURL=Vector.js.map

var __extends = this && this.t || function() {
    var extendStatics = function(t, i) {
        extendStatics = Object.setPrototypeOf || {
            __proto__: []
        } instanceof Array && function(t, i) {
            t.__proto__ = i;
        } || function(t, i) {
            for (var r in i) if (Object.prototype.hasOwnProperty.call(i, r)) t[r] = i[r];
        };
        return extendStatics(t, i);
    };
    return function(t, i) {
        if (typeof i !== "function" && i !== null) throw new TypeError("Class extends value " + String(i) + " is not a constructor or null");
        extendStatics(t, i);
        function __() {
            this.constructor = t;
        }
        t.prototype = i === null ? Object.create(i) : (__.prototype = i.prototype, new __);
    };
}();

var __generator = this && this.i || function(t, i) {
    var r = {
        label: 0,
        sent: function() {
            if (h[0] & 1) throw h[1];
            return h[1];
        },
        trys: [],
        ops: []
    }, e, s, h, n;
    return n = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (n[Symbol.iterator] = function() {
        return this;
    }), n;
    function verb(t) {
        return function(i) {
            return step([ t, i ]);
        };
    }
    function step(n) {
        if (e) throw new TypeError("Generator is already executing.");
        while (r) try {
            if (e = 1, s && (h = n[0] & 2 ? s["return"] : n[0] ? s["throw"] || ((h = s["return"]) && h.call(s), 
            0) : s.next) && !(h = h.call(s, n[1])).done) return h;
            if (s = 0, h) n = [ n[0] & 2, h.value ];
            switch (n[0]) {
              case 0:
              case 1:
                h = n;
                break;

              case 4:
                r.label++;
                return {
                    value: n[1],
                    done: false
                };

              case 5:
                r.label++;
                s = n[1];
                n = [ 0 ];
                continue;

              case 7:
                n = r.ops.pop();
                r.trys.pop();
                continue;

              default:
                if (!(h = r.trys, h = h.length > 0 && h[h.length - 1]) && (n[0] === 6 || n[0] === 2)) {
                    r = 0;
                    continue;
                }
                if (n[0] === 3 && (!h || n[1] > h[0] && n[1] < h[3])) {
                    r.label = n[1];
                    break;
                }
                if (n[0] === 6 && r.label < h[1]) {
                    r.label = h[1];
                    h = n;
                    break;
                }
                if (h && r.label < h[2]) {
                    r.label = h[2];
                    r.ops.push(n);
                    break;
                }
                if (h[2]) r.ops.pop();
                r.trys.pop();
                continue;
            }
            n = i.call(t, r);
        } catch (t) {
            n = [ 6, t ];
            s = 0;
        } finally {
            e = h = 0;
        }
        if (n[0] & 5) throw n[1];
        return {
            value: n[0] ? n[1] : void 0,
            done: true
        };
    }
};

var __read = this && this.q || function(t, i) {
    var r = typeof Symbol === "function" && t[Symbol.iterator];
    if (!r) return t;
    var e = r.call(t), s, h = [], n;
    try {
        while ((i === void 0 || i-- > 0) && !(s = e.next()).done) h.push(s.value);
    } catch (t) {
        n = {
            error: t
        };
    } finally {
        try {
            if (s && !s.done && (r = e["return"])) r.call(e);
        } finally {
            if (n) throw n.error;
        }
    }
    return h;
};

var __spreadArray = this && this.D || function(t, i, r) {
    if (r || arguments.length === 2) for (var e = 0, s = i.length, h; e < s; e++) {
        if (h || !(e in i)) {
            if (!h) h = Array.prototype.slice.call(i, 0, e);
            h[e] = i[e];
        }
    }
    return t.concat(h || Array.prototype.slice.call(i));
};

import SequentialContainer from "./Base";

import { RandomIterator } from "./Base/RandomIterator";

var DequeIterator = function(t) {
    __extends(DequeIterator, t);
    function DequeIterator(i, r, e) {
        var s = t.call(this, i, e) || this;
        s.container = r;
        return s;
    }
    DequeIterator.prototype.copy = function() {
        return new DequeIterator(this.o, this.container, this.iteratorType);
    };
    return DequeIterator;
}(RandomIterator);

var Deque = function(t) {
    __extends(Deque, t);
    function Deque(i, r) {
        if (i === void 0) {
            i = [];
        }
        if (r === void 0) {
            r = 1 << 12;
        }
        var e = t.call(this) || this;
        e.A = 0;
        e.S = 0;
        e.R = 0;
        e.k = 0;
        e.C = 0;
        e.j = [];
        var s = function() {
            if (typeof i.length === "number") return i.length;
            if (typeof i.size === "number") return i.size;
            if (typeof i.size === "function") return i.size();
            throw new TypeError("Cannot get the length or size of the container");
        }();
        e.B = r;
        e.C = Math.max(Math.ceil(s / e.B), 1);
        for (var h = 0; h < e.C; ++h) {
            e.j.push(new Array(e.B));
        }
        var n = Math.ceil(s / e.B);
        e.A = e.R = (e.C >> 1) - (n >> 1);
        e.S = e.k = e.B - s % e.B >> 1;
        var u = e;
        i.forEach((function(t) {
            u.pushBack(t);
        }));
        return e;
    }
    Deque.prototype.O = function() {
        var t = [];
        var i = Math.max(this.C >> 1, 1);
        for (var r = 0; r < i; ++r) {
            t[r] = new Array(this.B);
        }
        for (var r = this.A; r < this.C; ++r) {
            t[t.length] = this.j[r];
        }
        for (var r = 0; r < this.R; ++r) {
            t[t.length] = this.j[r];
        }
        t[t.length] = __spreadArray([], __read(this.j[this.R]), false);
        this.A = i;
        this.R = t.length - 1;
        for (var r = 0; r < i; ++r) {
            t[t.length] = new Array(this.B);
        }
        this.j = t;
        this.C = t.length;
    };
    Deque.prototype.T = function(t) {
        var i = this.S + t + 1;
        var r = i % this.B;
        var e = r - 1;
        var s = this.A + (i - r) / this.B;
        if (r === 0) s -= 1;
        s %= this.C;
        if (e < 0) e += this.B;
        return {
            curNodeBucketIndex: s,
            curNodePointerIndex: e
        };
    };
    Deque.prototype.clear = function() {
        this.j = [ new Array(this.B) ];
        this.C = 1;
        this.A = this.R = this.M = 0;
        this.S = this.k = this.B >> 1;
    };
    Deque.prototype.begin = function() {
        return new DequeIterator(0, this);
    };
    Deque.prototype.end = function() {
        return new DequeIterator(this.M, this);
    };
    Deque.prototype.rBegin = function() {
        return new DequeIterator(this.M - 1, this, 1);
    };
    Deque.prototype.rEnd = function() {
        return new DequeIterator(-1, this, 1);
    };
    Deque.prototype.front = function() {
        if (this.M === 0) return;
        return this.j[this.A][this.S];
    };
    Deque.prototype.back = function() {
        if (this.M === 0) return;
        return this.j[this.R][this.k];
    };
    Deque.prototype.pushBack = function(t) {
        if (this.M) {
            if (this.k < this.B - 1) {
                this.k += 1;
            } else if (this.R < this.C - 1) {
                this.R += 1;
                this.k = 0;
            } else {
                this.R = 0;
                this.k = 0;
            }
            if (this.R === this.A && this.k === this.S) this.O();
        }
        this.M += 1;
        this.j[this.R][this.k] = t;
        return this.M;
    };
    Deque.prototype.popBack = function() {
        if (this.M === 0) return;
        var t = this.j[this.R][this.k];
        if (this.M !== 1) {
            if (this.k > 0) {
                this.k -= 1;
            } else if (this.R > 0) {
                this.R -= 1;
                this.k = this.B - 1;
            } else {
                this.R = this.C - 1;
                this.k = this.B - 1;
            }
        }
        this.M -= 1;
        return t;
    };
    Deque.prototype.pushFront = function(t) {
        if (this.M) {
            if (this.S > 0) {
                this.S -= 1;
            } else if (this.A > 0) {
                this.A -= 1;
                this.S = this.B - 1;
            } else {
                this.A = this.C - 1;
                this.S = this.B - 1;
            }
            if (this.A === this.R && this.S === this.k) this.O();
        }
        this.M += 1;
        this.j[this.A][this.S] = t;
        return this.M;
    };
    Deque.prototype.popFront = function() {
        if (this.M === 0) return;
        var t = this.j[this.A][this.S];
        if (this.M !== 1) {
            if (this.S < this.B - 1) {
                this.S += 1;
            } else if (this.A < this.C - 1) {
                this.A += 1;
                this.S = 0;
            } else {
                this.A = 0;
                this.S = 0;
            }
        }
        this.M -= 1;
        return t;
    };
    Deque.prototype.getElementByPos = function(t) {
        if (t < 0 || t > this.M - 1) {
            throw new RangeError;
        }
        var i = this.T(t), r = i.curNodeBucketIndex, e = i.curNodePointerIndex;
        return this.j[r][e];
    };
    Deque.prototype.setElementByPos = function(t, i) {
        if (t < 0 || t > this.M - 1) {
            throw new RangeError;
        }
        var r = this.T(t), e = r.curNodeBucketIndex, s = r.curNodePointerIndex;
        this.j[e][s] = i;
    };
    Deque.prototype.insert = function(t, i, r) {
        if (r === void 0) {
            r = 1;
        }
        if (t < 0 || t > this.M) {
            throw new RangeError;
        }
        if (t === 0) {
            while (r--) this.pushFront(i);
        } else if (t === this.M) {
            while (r--) this.pushBack(i);
        } else {
            var e = [];
            for (var s = t; s < this.M; ++s) {
                e.push(this.getElementByPos(s));
            }
            this.cut(t - 1);
            for (var s = 0; s < r; ++s) this.pushBack(i);
            for (var s = 0; s < e.length; ++s) this.pushBack(e[s]);
        }
        return this.M;
    };
    Deque.prototype.cut = function(t) {
        if (t < 0) {
            this.clear();
            return 0;
        }
        var i = this.T(t), r = i.curNodeBucketIndex, e = i.curNodePointerIndex;
        this.R = r;
        this.k = e;
        this.M = t + 1;
        return this.M;
    };
    Deque.prototype.eraseElementByPos = function(t) {
        if (t < 0 || t > this.M - 1) {
            throw new RangeError;
        }
        if (t === 0) this.popFront(); else if (t === this.M - 1) this.popBack(); else {
            var i = [];
            for (var r = t + 1; r < this.M; ++r) {
                i.push(this.getElementByPos(r));
            }
            this.cut(t);
            this.popBack();
            var e = this;
            i.forEach((function(t) {
                e.pushBack(t);
            }));
        }
        return this.M;
    };
    Deque.prototype.eraseElementByValue = function(t) {
        if (this.M === 0) return 0;
        var i = [];
        for (var r = 0; r < this.M; ++r) {
            var e = this.getElementByPos(r);
            if (e !== t) i.push(e);
        }
        var s = i.length;
        for (var r = 0; r < s; ++r) this.setElementByPos(r, i[r]);
        return this.cut(s - 1);
    };
    Deque.prototype.eraseElementByIterator = function(t) {
        var i = t.o;
        this.eraseElementByPos(i);
        t = t.next();
        return t;
    };
    Deque.prototype.find = function(t) {
        for (var i = 0; i < this.M; ++i) {
            if (this.getElementByPos(i) === t) {
                return new DequeIterator(i, this);
            }
        }
        return this.end();
    };
    Deque.prototype.reverse = function() {
        var t = 0;
        var i = this.M - 1;
        while (t < i) {
            var r = this.getElementByPos(t);
            this.setElementByPos(t, this.getElementByPos(i));
            this.setElementByPos(i, r);
            t += 1;
            i -= 1;
        }
    };
    Deque.prototype.unique = function() {
        if (this.M <= 1) {
            return this.M;
        }
        var t = 1;
        var i = this.getElementByPos(0);
        for (var r = 1; r < this.M; ++r) {
            var e = this.getElementByPos(r);
            if (e !== i) {
                i = e;
                this.setElementByPos(t++, e);
            }
        }
        while (this.M > t) this.popBack();
        return this.M;
    };
    Deque.prototype.sort = function(t) {
        var i = [];
        for (var r = 0; r < this.M; ++r) {
            i.push(this.getElementByPos(r));
        }
        i.sort(t);
        for (var r = 0; r < this.M; ++r) this.setElementByPos(r, i[r]);
    };
    Deque.prototype.shrinkToFit = function() {
        if (this.M === 0) return;
        var t = [];
        this.forEach((function(i) {
            t.push(i);
        }));
        this.C = Math.max(Math.ceil(this.M / this.B), 1);
        this.M = this.A = this.R = this.S = this.k = 0;
        this.j = [];
        for (var i = 0; i < this.C; ++i) {
            this.j.push(new Array(this.B));
        }
        for (var i = 0; i < t.length; ++i) this.pushBack(t[i]);
    };
    Deque.prototype.forEach = function(t) {
        for (var i = 0; i < this.M; ++i) {
            t(this.getElementByPos(i), i, this);
        }
    };
    Deque.prototype[Symbol.iterator] = function() {
        return function() {
            var t;
            return __generator(this, (function(i) {
                switch (i.label) {
                  case 0:
                    t = 0;
                    i.label = 1;

                  case 1:
                    if (!(t < this.M)) return [ 3, 4 ];
                    return [ 4, this.getElementByPos(t) ];

                  case 2:
                    i.sent();
                    i.label = 3;

                  case 3:
                    ++t;
                    return [ 3, 1 ];

                  case 4:
                    return [ 2 ];
                }
            }));
        }.bind(this)();
    };
    return Deque;
}(SequentialContainer);

export default Deque;
//# sourceMappingURL=Deque.js.map

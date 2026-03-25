var __extends = this && this.t || function() {
    var extendStatics = function(i, r) {
        extendStatics = Object.setPrototypeOf || {
            __proto__: []
        } instanceof Array && function(i, r) {
            i.__proto__ = r;
        } || function(i, r) {
            for (var t in r) if (Object.prototype.hasOwnProperty.call(r, t)) i[t] = r[t];
        };
        return extendStatics(i, r);
    };
    return function(i, r) {
        if (typeof r !== "function" && r !== null) throw new TypeError("Class extends value " + String(r) + " is not a constructor or null");
        extendStatics(i, r);
        function __() {
            this.constructor = i;
        }
        i.prototype = r === null ? Object.create(r) : (__.prototype = r.prototype, new __);
    };
}();

var __read = this && this.q || function(i, r) {
    var t = typeof Symbol === "function" && i[Symbol.iterator];
    if (!t) return i;
    var e = t.call(i), n, u = [], s;
    try {
        while ((r === void 0 || r-- > 0) && !(n = e.next()).done) u.push(n.value);
    } catch (i) {
        s = {
            error: i
        };
    } finally {
        try {
            if (n && !n.done && (t = e["return"])) t.call(e);
        } finally {
            if (s) throw s.error;
        }
    }
    return u;
};

var __spreadArray = this && this.D || function(i, r, t) {
    if (t || arguments.length === 2) for (var e = 0, n = r.length, u; e < n; e++) {
        if (u || !(e in r)) {
            if (!u) u = Array.prototype.slice.call(r, 0, e);
            u[e] = r[e];
        }
    }
    return i.concat(u || Array.prototype.slice.call(r));
};

import { Base } from "../ContainerBase";

var PriorityQueue = function(i) {
    __extends(PriorityQueue, i);
    function PriorityQueue(r, t, e) {
        if (r === void 0) {
            r = [];
        }
        if (t === void 0) {
            t = function(i, r) {
                if (i > r) return -1;
                if (i < r) return 1;
                return 0;
            };
        }
        if (e === void 0) {
            e = true;
        }
        var n = i.call(this) || this;
        n.$ = t;
        if (Array.isArray(r)) {
            n.ii = e ? __spreadArray([], __read(r), false) : r;
        } else {
            n.ii = [];
            var u = n;
            r.forEach((function(i) {
                u.ii.push(i);
            }));
        }
        n.M = n.ii.length;
        var s = n.M >> 1;
        for (var o = n.M - 1 >> 1; o >= 0; --o) {
            n.ri(o, s);
        }
        return n;
    }
    PriorityQueue.prototype.ti = function(i) {
        var r = this.ii[i];
        while (i > 0) {
            var t = i - 1 >> 1;
            var e = this.ii[t];
            if (this.$(e, r) <= 0) break;
            this.ii[i] = e;
            i = t;
        }
        this.ii[i] = r;
    };
    PriorityQueue.prototype.ri = function(i, r) {
        var t = this.ii[i];
        while (i < r) {
            var e = i << 1 | 1;
            var n = e + 1;
            var u = this.ii[e];
            if (n < this.M && this.$(u, this.ii[n]) > 0) {
                e = n;
                u = this.ii[n];
            }
            if (this.$(u, t) >= 0) break;
            this.ii[i] = u;
            i = e;
        }
        this.ii[i] = t;
    };
    PriorityQueue.prototype.clear = function() {
        this.M = 0;
        this.ii.length = 0;
    };
    PriorityQueue.prototype.push = function(i) {
        this.ii.push(i);
        this.ti(this.M);
        this.M += 1;
    };
    PriorityQueue.prototype.pop = function() {
        if (this.M === 0) return;
        var i = this.ii[0];
        var r = this.ii.pop();
        this.M -= 1;
        if (this.M) {
            this.ii[0] = r;
            this.ri(0, this.M >> 1);
        }
        return i;
    };
    PriorityQueue.prototype.top = function() {
        return this.ii[0];
    };
    PriorityQueue.prototype.find = function(i) {
        return this.ii.indexOf(i) >= 0;
    };
    PriorityQueue.prototype.remove = function(i) {
        var r = this.ii.indexOf(i);
        if (r < 0) return false;
        if (r === 0) {
            this.pop();
        } else if (r === this.M - 1) {
            this.ii.pop();
            this.M -= 1;
        } else {
            this.ii.splice(r, 1, this.ii.pop());
            this.M -= 1;
            this.ti(r);
            this.ri(r, this.M >> 1);
        }
        return true;
    };
    PriorityQueue.prototype.updateItem = function(i) {
        var r = this.ii.indexOf(i);
        if (r < 0) return false;
        this.ti(r);
        this.ri(r, this.M >> 1);
        return true;
    };
    PriorityQueue.prototype.toArray = function() {
        return __spreadArray([], __read(this.ii), false);
    };
    return PriorityQueue;
}(Base);

export default PriorityQueue;
//# sourceMappingURL=PriorityQueue.js.map

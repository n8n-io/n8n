"use strict";

Object.defineProperty(exports, "t", {
    value: true
});

exports.default = void 0;

var _ContainerBase = require("../ContainerBase");

class PriorityQueue extends _ContainerBase.Base {
    constructor(t = [], s = function(t, s) {
        if (t > s) return -1;
        if (t < s) return 1;
        return 0;
    }, i = true) {
        super();
        this.v = s;
        if (Array.isArray(t)) {
            this.C = i ? [ ...t ] : t;
        } else {
            this.C = [];
            const s = this;
            t.forEach((function(t) {
                s.C.push(t);
            }));
        }
        this.i = this.C.length;
        const e = this.i >> 1;
        for (let t = this.i - 1 >> 1; t >= 0; --t) {
            this.k(t, e);
        }
    }
    m(t) {
        const s = this.C[t];
        while (t > 0) {
            const i = t - 1 >> 1;
            const e = this.C[i];
            if (this.v(e, s) <= 0) break;
            this.C[t] = e;
            t = i;
        }
        this.C[t] = s;
    }
    k(t, s) {
        const i = this.C[t];
        while (t < s) {
            let s = t << 1 | 1;
            const e = s + 1;
            let h = this.C[s];
            if (e < this.i && this.v(h, this.C[e]) > 0) {
                s = e;
                h = this.C[e];
            }
            if (this.v(h, i) >= 0) break;
            this.C[t] = h;
            t = s;
        }
        this.C[t] = i;
    }
    clear() {
        this.i = 0;
        this.C.length = 0;
    }
    push(t) {
        this.C.push(t);
        this.m(this.i);
        this.i += 1;
    }
    pop() {
        if (this.i === 0) return;
        const t = this.C[0];
        const s = this.C.pop();
        this.i -= 1;
        if (this.i) {
            this.C[0] = s;
            this.k(0, this.i >> 1);
        }
        return t;
    }
    top() {
        return this.C[0];
    }
    find(t) {
        return this.C.indexOf(t) >= 0;
    }
    remove(t) {
        const s = this.C.indexOf(t);
        if (s < 0) return false;
        if (s === 0) {
            this.pop();
        } else if (s === this.i - 1) {
            this.C.pop();
            this.i -= 1;
        } else {
            this.C.splice(s, 1, this.C.pop());
            this.i -= 1;
            this.m(s);
            this.k(s, this.i >> 1);
        }
        return true;
    }
    updateItem(t) {
        const s = this.C.indexOf(t);
        if (s < 0) return false;
        this.m(s);
        this.k(s, this.i >> 1);
        return true;
    }
    toArray() {
        return [ ...this.C ];
    }
}

var _default = PriorityQueue;

exports.default = _default;
//# sourceMappingURL=PriorityQueue.js.map

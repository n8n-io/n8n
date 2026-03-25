"use strict";

Object.defineProperty(exports, "t", {
    value: true
});

exports.default = void 0;

var _ContainerBase = require("../ContainerBase");

class Queue extends _ContainerBase.Base {
    constructor(t = []) {
        super();
        this.j = 0;
        this.q = [];
        const s = this;
        t.forEach((function(t) {
            s.push(t);
        }));
    }
    clear() {
        this.q = [];
        this.i = this.j = 0;
    }
    push(t) {
        const s = this.q.length;
        if (this.j / s > .5 && this.j + this.i >= s && s > 4096) {
            const s = this.i;
            for (let t = 0; t < s; ++t) {
                this.q[t] = this.q[this.j + t];
            }
            this.j = 0;
            this.q[this.i] = t;
        } else this.q[this.j + this.i] = t;
        return ++this.i;
    }
    pop() {
        if (this.i === 0) return;
        const t = this.q[this.j++];
        this.i -= 1;
        return t;
    }
    front() {
        if (this.i === 0) return;
        return this.q[this.j];
    }
}

var _default = Queue;

exports.default = _default;
//# sourceMappingURL=Queue.js.map

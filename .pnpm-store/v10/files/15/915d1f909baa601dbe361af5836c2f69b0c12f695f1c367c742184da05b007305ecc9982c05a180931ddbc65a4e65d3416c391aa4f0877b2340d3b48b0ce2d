"use strict";

Object.defineProperty(exports, "t", {
    value: true
});

exports.default = void 0;

var _ContainerBase = require("../ContainerBase");

class Stack extends _ContainerBase.Base {
    constructor(t = []) {
        super();
        this.S = [];
        const s = this;
        t.forEach((function(t) {
            s.push(t);
        }));
    }
    clear() {
        this.i = 0;
        this.S = [];
    }
    push(t) {
        this.S.push(t);
        this.i += 1;
        return this.i;
    }
    pop() {
        if (this.i === 0) return;
        this.i -= 1;
        return this.S.pop();
    }
    top() {
        return this.S[this.i - 1];
    }
}

var _default = Stack;

exports.default = _default;
//# sourceMappingURL=Stack.js.map

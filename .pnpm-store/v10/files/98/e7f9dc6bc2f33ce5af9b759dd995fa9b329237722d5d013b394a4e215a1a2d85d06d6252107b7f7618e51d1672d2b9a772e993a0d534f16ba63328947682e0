"use strict";

Object.defineProperty(exports, "t", {
    value: true
});

exports.TreeNodeEnableIndex = exports.TreeNode = void 0;

class TreeNode {
    constructor(e, t) {
        this.ee = 1;
        this.u = undefined;
        this.l = undefined;
        this.U = undefined;
        this.W = undefined;
        this.tt = undefined;
        this.u = e;
        this.l = t;
    }
    L() {
        let e = this;
        if (e.ee === 1 && e.tt.tt === e) {
            e = e.W;
        } else if (e.U) {
            e = e.U;
            while (e.W) {
                e = e.W;
            }
        } else {
            let t = e.tt;
            while (t.U === e) {
                e = t;
                t = e.tt;
            }
            e = t;
        }
        return e;
    }
    B() {
        let e = this;
        if (e.W) {
            e = e.W;
            while (e.U) {
                e = e.U;
            }
            return e;
        } else {
            let t = e.tt;
            while (t.W === e) {
                e = t;
                t = e.tt;
            }
            if (e.W !== t) {
                return t;
            } else return e;
        }
    }
    te() {
        const e = this.tt;
        const t = this.W;
        const s = t.U;
        if (e.tt === this) e.tt = t; else if (e.U === this) e.U = t; else e.W = t;
        t.tt = e;
        t.U = this;
        this.tt = t;
        this.W = s;
        if (s) s.tt = this;
        return t;
    }
    se() {
        const e = this.tt;
        const t = this.U;
        const s = t.W;
        if (e.tt === this) e.tt = t; else if (e.U === this) e.U = t; else e.W = t;
        t.tt = e;
        t.W = this;
        this.tt = t;
        this.U = s;
        if (s) s.tt = this;
        return t;
    }
}

exports.TreeNode = TreeNode;

class TreeNodeEnableIndex extends TreeNode {
    constructor() {
        super(...arguments);
        this.rt = 1;
    }
    te() {
        const e = super.te();
        this.ie();
        e.ie();
        return e;
    }
    se() {
        const e = super.se();
        this.ie();
        e.ie();
        return e;
    }
    ie() {
        this.rt = 1;
        if (this.U) {
            this.rt += this.U.rt;
        }
        if (this.W) {
            this.rt += this.W.rt;
        }
    }
}

exports.TreeNodeEnableIndex = TreeNodeEnableIndex;
//# sourceMappingURL=TreeNode.js.map

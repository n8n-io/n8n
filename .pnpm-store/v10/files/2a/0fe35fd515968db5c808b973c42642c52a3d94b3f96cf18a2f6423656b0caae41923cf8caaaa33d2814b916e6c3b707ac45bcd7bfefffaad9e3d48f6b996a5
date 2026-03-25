"use strict";

Object.defineProperty(exports, "t", {
    value: true
});

exports.default = void 0;

var _TreeNode = require("./TreeNode");

var _ContainerBase = require("../../ContainerBase");

var _throwError = require("../../../utils/throwError");

class TreeContainer extends _ContainerBase.Container {
    constructor(e = function(e, t) {
        if (e < t) return -1;
        if (e > t) return 1;
        return 0;
    }, t = false) {
        super();
        this.Y = undefined;
        this.v = e;
        if (t) {
            this.re = _TreeNode.TreeNodeEnableIndex;
            this.M = function(e, t, i) {
                const s = this.ne(e, t, i);
                if (s) {
                    let e = s.tt;
                    while (e !== this.h) {
                        e.rt += 1;
                        e = e.tt;
                    }
                    const t = this.he(s);
                    if (t) {
                        const {parentNode: e, grandParent: i, curNode: s} = t;
                        e.ie();
                        i.ie();
                        s.ie();
                    }
                }
                return this.i;
            };
            this.V = function(e) {
                let t = this.fe(e);
                while (t !== this.h) {
                    t.rt -= 1;
                    t = t.tt;
                }
            };
        } else {
            this.re = _TreeNode.TreeNode;
            this.M = function(e, t, i) {
                const s = this.ne(e, t, i);
                if (s) this.he(s);
                return this.i;
            };
            this.V = this.fe;
        }
        this.h = new this.re;
    }
    X(e, t) {
        let i = this.h;
        while (e) {
            const s = this.v(e.u, t);
            if (s < 0) {
                e = e.W;
            } else if (s > 0) {
                i = e;
                e = e.U;
            } else return e;
        }
        return i;
    }
    Z(e, t) {
        let i = this.h;
        while (e) {
            const s = this.v(e.u, t);
            if (s <= 0) {
                e = e.W;
            } else {
                i = e;
                e = e.U;
            }
        }
        return i;
    }
    $(e, t) {
        let i = this.h;
        while (e) {
            const s = this.v(e.u, t);
            if (s < 0) {
                i = e;
                e = e.W;
            } else if (s > 0) {
                e = e.U;
            } else return e;
        }
        return i;
    }
    rr(e, t) {
        let i = this.h;
        while (e) {
            const s = this.v(e.u, t);
            if (s < 0) {
                i = e;
                e = e.W;
            } else {
                e = e.U;
            }
        }
        return i;
    }
    ue(e) {
        while (true) {
            const t = e.tt;
            if (t === this.h) return;
            if (e.ee === 1) {
                e.ee = 0;
                return;
            }
            if (e === t.U) {
                const i = t.W;
                if (i.ee === 1) {
                    i.ee = 0;
                    t.ee = 1;
                    if (t === this.Y) {
                        this.Y = t.te();
                    } else t.te();
                } else {
                    if (i.W && i.W.ee === 1) {
                        i.ee = t.ee;
                        t.ee = 0;
                        i.W.ee = 0;
                        if (t === this.Y) {
                            this.Y = t.te();
                        } else t.te();
                        return;
                    } else if (i.U && i.U.ee === 1) {
                        i.ee = 1;
                        i.U.ee = 0;
                        i.se();
                    } else {
                        i.ee = 1;
                        e = t;
                    }
                }
            } else {
                const i = t.U;
                if (i.ee === 1) {
                    i.ee = 0;
                    t.ee = 1;
                    if (t === this.Y) {
                        this.Y = t.se();
                    } else t.se();
                } else {
                    if (i.U && i.U.ee === 1) {
                        i.ee = t.ee;
                        t.ee = 0;
                        i.U.ee = 0;
                        if (t === this.Y) {
                            this.Y = t.se();
                        } else t.se();
                        return;
                    } else if (i.W && i.W.ee === 1) {
                        i.ee = 1;
                        i.W.ee = 0;
                        i.te();
                    } else {
                        i.ee = 1;
                        e = t;
                    }
                }
            }
        }
    }
    fe(e) {
        if (this.i === 1) {
            this.clear();
            return this.h;
        }
        let t = e;
        while (t.U || t.W) {
            if (t.W) {
                t = t.W;
                while (t.U) t = t.U;
            } else {
                t = t.U;
            }
            [e.u, t.u] = [ t.u, e.u ];
            [e.l, t.l] = [ t.l, e.l ];
            e = t;
        }
        if (this.h.U === t) {
            this.h.U = t.tt;
        } else if (this.h.W === t) {
            this.h.W = t.tt;
        }
        this.ue(t);
        const i = t.tt;
        if (t === i.U) {
            i.U = undefined;
        } else i.W = undefined;
        this.i -= 1;
        this.Y.ee = 0;
        return i;
    }
    oe(e, t) {
        if (e === undefined) return false;
        const i = this.oe(e.U, t);
        if (i) return true;
        if (t(e)) return true;
        return this.oe(e.W, t);
    }
    he(e) {
        while (true) {
            const t = e.tt;
            if (t.ee === 0) return;
            const i = t.tt;
            if (t === i.U) {
                const s = i.W;
                if (s && s.ee === 1) {
                    s.ee = t.ee = 0;
                    if (i === this.Y) return;
                    i.ee = 1;
                    e = i;
                    continue;
                } else if (e === t.W) {
                    e.ee = 0;
                    if (e.U) e.U.tt = t;
                    if (e.W) e.W.tt = i;
                    t.W = e.U;
                    i.U = e.W;
                    e.U = t;
                    e.W = i;
                    if (i === this.Y) {
                        this.Y = e;
                        this.h.tt = e;
                    } else {
                        const t = i.tt;
                        if (t.U === i) {
                            t.U = e;
                        } else t.W = e;
                    }
                    e.tt = i.tt;
                    t.tt = e;
                    i.tt = e;
                    i.ee = 1;
                    return {
                        parentNode: t,
                        grandParent: i,
                        curNode: e
                    };
                } else {
                    t.ee = 0;
                    if (i === this.Y) {
                        this.Y = i.se();
                    } else i.se();
                    i.ee = 1;
                }
            } else {
                const s = i.U;
                if (s && s.ee === 1) {
                    s.ee = t.ee = 0;
                    if (i === this.Y) return;
                    i.ee = 1;
                    e = i;
                    continue;
                } else if (e === t.U) {
                    e.ee = 0;
                    if (e.U) e.U.tt = i;
                    if (e.W) e.W.tt = t;
                    i.W = e.U;
                    t.U = e.W;
                    e.U = i;
                    e.W = t;
                    if (i === this.Y) {
                        this.Y = e;
                        this.h.tt = e;
                    } else {
                        const t = i.tt;
                        if (t.U === i) {
                            t.U = e;
                        } else t.W = e;
                    }
                    e.tt = i.tt;
                    t.tt = e;
                    i.tt = e;
                    i.ee = 1;
                    return {
                        parentNode: t,
                        grandParent: i,
                        curNode: e
                    };
                } else {
                    t.ee = 0;
                    if (i === this.Y) {
                        this.Y = i.te();
                    } else i.te();
                    i.ee = 1;
                }
            }
            return;
        }
    }
    ne(e, t, i) {
        if (this.Y === undefined) {
            this.i += 1;
            this.Y = new this.re(e, t);
            this.Y.ee = 0;
            this.Y.tt = this.h;
            this.h.tt = this.Y;
            this.h.U = this.Y;
            this.h.W = this.Y;
            return;
        }
        let s;
        const r = this.h.U;
        const n = this.v(r.u, e);
        if (n === 0) {
            r.l = t;
            return;
        } else if (n > 0) {
            r.U = new this.re(e, t);
            r.U.tt = r;
            s = r.U;
            this.h.U = s;
        } else {
            const r = this.h.W;
            const n = this.v(r.u, e);
            if (n === 0) {
                r.l = t;
                return;
            } else if (n < 0) {
                r.W = new this.re(e, t);
                r.W.tt = r;
                s = r.W;
                this.h.W = s;
            } else {
                if (i !== undefined) {
                    const r = i.o;
                    if (r !== this.h) {
                        const i = this.v(r.u, e);
                        if (i === 0) {
                            r.l = t;
                            return;
                        } else if (i > 0) {
                            const i = r.L();
                            const n = this.v(i.u, e);
                            if (n === 0) {
                                i.l = t;
                                return;
                            } else if (n < 0) {
                                s = new this.re(e, t);
                                if (i.W === undefined) {
                                    i.W = s;
                                    s.tt = i;
                                } else {
                                    r.U = s;
                                    s.tt = r;
                                }
                            }
                        }
                    }
                }
                if (s === undefined) {
                    s = this.Y;
                    while (true) {
                        const i = this.v(s.u, e);
                        if (i > 0) {
                            if (s.U === undefined) {
                                s.U = new this.re(e, t);
                                s.U.tt = s;
                                s = s.U;
                                break;
                            }
                            s = s.U;
                        } else if (i < 0) {
                            if (s.W === undefined) {
                                s.W = new this.re(e, t);
                                s.W.tt = s;
                                s = s.W;
                                break;
                            }
                            s = s.W;
                        } else {
                            s.l = t;
                            return;
                        }
                    }
                }
            }
        }
        this.i += 1;
        return s;
    }
    I(e, t) {
        while (e) {
            const i = this.v(e.u, t);
            if (i < 0) {
                e = e.W;
            } else if (i > 0) {
                e = e.U;
            } else return e;
        }
        return e || this.h;
    }
    clear() {
        this.i = 0;
        this.Y = undefined;
        this.h.tt = undefined;
        this.h.U = this.h.W = undefined;
    }
    updateKeyByIterator(e, t) {
        const i = e.o;
        if (i === this.h) {
            (0, _throwError.throwIteratorAccessError)();
        }
        if (this.i === 1) {
            i.u = t;
            return true;
        }
        if (i === this.h.U) {
            if (this.v(i.B().u, t) > 0) {
                i.u = t;
                return true;
            }
            return false;
        }
        if (i === this.h.W) {
            if (this.v(i.L().u, t) < 0) {
                i.u = t;
                return true;
            }
            return false;
        }
        const s = i.L().u;
        if (this.v(s, t) >= 0) return false;
        const r = i.B().u;
        if (this.v(r, t) <= 0) return false;
        i.u = t;
        return true;
    }
    eraseElementByPos(e) {
        if (e < 0 || e > this.i - 1) {
            throw new RangeError;
        }
        let t = 0;
        const i = this;
        this.oe(this.Y, (function(s) {
            if (e === t) {
                i.V(s);
                return true;
            }
            t += 1;
            return false;
        }));
        return this.i;
    }
    eraseElementByKey(e) {
        if (this.i === 0) return false;
        const t = this.I(this.Y, e);
        if (t === this.h) return false;
        this.V(t);
        return true;
    }
    eraseElementByIterator(e) {
        const t = e.o;
        if (t === this.h) {
            (0, _throwError.throwIteratorAccessError)();
        }
        const i = t.W === undefined;
        const s = e.iteratorType === 0;
        if (s) {
            if (i) e.next();
        } else {
            if (!i || t.U === undefined) e.next();
        }
        this.V(t);
        return e;
    }
    forEach(e) {
        let t = 0;
        for (const i of this) e(i, t++, this);
    }
    getElementByPos(e) {
        if (e < 0 || e > this.i - 1) {
            throw new RangeError;
        }
        let t;
        let i = 0;
        for (const s of this) {
            if (i === e) {
                t = s;
                break;
            }
            i += 1;
        }
        return t;
    }
    getHeight() {
        if (this.i === 0) return 0;
        const traversal = function(e) {
            if (!e) return 0;
            return Math.max(traversal(e.U), traversal(e.W)) + 1;
        };
        return traversal(this.Y);
    }
}

var _default = TreeContainer;

exports.default = _default;
//# sourceMappingURL=index.js.map

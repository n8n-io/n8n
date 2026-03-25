"use strict";

Object.defineProperty(exports, "t", {
    value: true
});

class TreeNode {
    constructor(t, e, s = 1) {
        this.i = undefined;
        this.h = undefined;
        this.o = undefined;
        this.u = t;
        this.l = e;
        this.p = s;
    }
    I() {
        let t = this;
        const e = t.o.o === t;
        if (e && t.p === 1) {
            t = t.h;
        } else if (t.i) {
            t = t.i;
            while (t.h) {
                t = t.h;
            }
        } else {
            if (e) {
                return t.o;
            }
            let s = t.o;
            while (s.i === t) {
                t = s;
                s = t.o;
            }
            t = s;
        }
        return t;
    }
    B() {
        let t = this;
        if (t.h) {
            t = t.h;
            while (t.i) {
                t = t.i;
            }
            return t;
        } else {
            let e = t.o;
            while (e.h === t) {
                t = e;
                e = t.o;
            }
            if (t.h !== e) {
                return e;
            } else return t;
        }
    }
    _() {
        const t = this.o;
        const e = this.h;
        const s = e.i;
        if (t.o === this) t.o = e; else if (t.i === this) t.i = e; else t.h = e;
        e.o = t;
        e.i = this;
        this.o = e;
        this.h = s;
        if (s) s.o = this;
        return e;
    }
    g() {
        const t = this.o;
        const e = this.i;
        const s = e.h;
        if (t.o === this) t.o = e; else if (t.i === this) t.i = e; else t.h = e;
        e.o = t;
        e.h = this;
        this.o = e;
        this.i = s;
        if (s) s.o = this;
        return e;
    }
}

class TreeNodeEnableIndex extends TreeNode {
    constructor() {
        super(...arguments);
        this.M = 1;
    }
    _() {
        const t = super._();
        this.O();
        t.O();
        return t;
    }
    g() {
        const t = super.g();
        this.O();
        t.O();
        return t;
    }
    O() {
        this.M = 1;
        if (this.i) {
            this.M += this.i.M;
        }
        if (this.h) {
            this.M += this.h.M;
        }
    }
}

class ContainerIterator {
    constructor(t = 0) {
        this.iteratorType = t;
    }
    equals(t) {
        return this.T === t.T;
    }
}

class Base {
    constructor() {
        this.m = 0;
    }
    get length() {
        return this.m;
    }
    size() {
        return this.m;
    }
    empty() {
        return this.m === 0;
    }
}

class Container extends Base {}

function throwIteratorAccessError() {
    throw new RangeError("Iterator access denied!");
}

class TreeContainer extends Container {
    constructor(t = function(t, e) {
        if (t < e) return -1;
        if (t > e) return 1;
        return 0;
    }, e = false) {
        super();
        this.v = undefined;
        this.A = t;
        this.enableIndex = e;
        this.N = e ? TreeNodeEnableIndex : TreeNode;
        this.C = new this.N;
    }
    R(t, e) {
        let s = this.C;
        while (t) {
            const i = this.A(t.u, e);
            if (i < 0) {
                t = t.h;
            } else if (i > 0) {
                s = t;
                t = t.i;
            } else return t;
        }
        return s;
    }
    K(t, e) {
        let s = this.C;
        while (t) {
            const i = this.A(t.u, e);
            if (i <= 0) {
                t = t.h;
            } else {
                s = t;
                t = t.i;
            }
        }
        return s;
    }
    L(t, e) {
        let s = this.C;
        while (t) {
            const i = this.A(t.u, e);
            if (i < 0) {
                s = t;
                t = t.h;
            } else if (i > 0) {
                t = t.i;
            } else return t;
        }
        return s;
    }
    k(t, e) {
        let s = this.C;
        while (t) {
            const i = this.A(t.u, e);
            if (i < 0) {
                s = t;
                t = t.h;
            } else {
                t = t.i;
            }
        }
        return s;
    }
    P(t) {
        while (true) {
            const e = t.o;
            if (e === this.C) return;
            if (t.p === 1) {
                t.p = 0;
                return;
            }
            if (t === e.i) {
                const s = e.h;
                if (s.p === 1) {
                    s.p = 0;
                    e.p = 1;
                    if (e === this.v) {
                        this.v = e._();
                    } else e._();
                } else {
                    if (s.h && s.h.p === 1) {
                        s.p = e.p;
                        e.p = 0;
                        s.h.p = 0;
                        if (e === this.v) {
                            this.v = e._();
                        } else e._();
                        return;
                    } else if (s.i && s.i.p === 1) {
                        s.p = 1;
                        s.i.p = 0;
                        s.g();
                    } else {
                        s.p = 1;
                        t = e;
                    }
                }
            } else {
                const s = e.i;
                if (s.p === 1) {
                    s.p = 0;
                    e.p = 1;
                    if (e === this.v) {
                        this.v = e.g();
                    } else e.g();
                } else {
                    if (s.i && s.i.p === 1) {
                        s.p = e.p;
                        e.p = 0;
                        s.i.p = 0;
                        if (e === this.v) {
                            this.v = e.g();
                        } else e.g();
                        return;
                    } else if (s.h && s.h.p === 1) {
                        s.p = 1;
                        s.h.p = 0;
                        s._();
                    } else {
                        s.p = 1;
                        t = e;
                    }
                }
            }
        }
    }
    S(t) {
        if (this.m === 1) {
            this.clear();
            return;
        }
        let e = t;
        while (e.i || e.h) {
            if (e.h) {
                e = e.h;
                while (e.i) e = e.i;
            } else {
                e = e.i;
            }
            const s = t.u;
            t.u = e.u;
            e.u = s;
            const i = t.l;
            t.l = e.l;
            e.l = i;
            t = e;
        }
        if (this.C.i === e) {
            this.C.i = e.o;
        } else if (this.C.h === e) {
            this.C.h = e.o;
        }
        this.P(e);
        let s = e.o;
        if (e === s.i) {
            s.i = undefined;
        } else s.h = undefined;
        this.m -= 1;
        this.v.p = 0;
        if (this.enableIndex) {
            while (s !== this.C) {
                s.M -= 1;
                s = s.o;
            }
        }
    }
    U(t) {
        const e = typeof t === "number" ? t : undefined;
        const s = typeof t === "function" ? t : undefined;
        const i = typeof t === "undefined" ? [] : undefined;
        let r = 0;
        let n = this.v;
        const h = [];
        while (h.length || n) {
            if (n) {
                h.push(n);
                n = n.i;
            } else {
                n = h.pop();
                if (r === e) return n;
                i && i.push(n);
                s && s(n, r, this);
                r += 1;
                n = n.h;
            }
        }
        return i;
    }
    j(t) {
        while (true) {
            const e = t.o;
            if (e.p === 0) return;
            const s = e.o;
            if (e === s.i) {
                const i = s.h;
                if (i && i.p === 1) {
                    i.p = e.p = 0;
                    if (s === this.v) return;
                    s.p = 1;
                    t = s;
                    continue;
                } else if (t === e.h) {
                    t.p = 0;
                    if (t.i) {
                        t.i.o = e;
                    }
                    if (t.h) {
                        t.h.o = s;
                    }
                    e.h = t.i;
                    s.i = t.h;
                    t.i = e;
                    t.h = s;
                    if (s === this.v) {
                        this.v = t;
                        this.C.o = t;
                    } else {
                        const e = s.o;
                        if (e.i === s) {
                            e.i = t;
                        } else e.h = t;
                    }
                    t.o = s.o;
                    e.o = t;
                    s.o = t;
                    s.p = 1;
                } else {
                    e.p = 0;
                    if (s === this.v) {
                        this.v = s.g();
                    } else s.g();
                    s.p = 1;
                    return;
                }
            } else {
                const i = s.i;
                if (i && i.p === 1) {
                    i.p = e.p = 0;
                    if (s === this.v) return;
                    s.p = 1;
                    t = s;
                    continue;
                } else if (t === e.i) {
                    t.p = 0;
                    if (t.i) {
                        t.i.o = s;
                    }
                    if (t.h) {
                        t.h.o = e;
                    }
                    s.h = t.i;
                    e.i = t.h;
                    t.i = s;
                    t.h = e;
                    if (s === this.v) {
                        this.v = t;
                        this.C.o = t;
                    } else {
                        const e = s.o;
                        if (e.i === s) {
                            e.i = t;
                        } else e.h = t;
                    }
                    t.o = s.o;
                    e.o = t;
                    s.o = t;
                    s.p = 1;
                } else {
                    e.p = 0;
                    if (s === this.v) {
                        this.v = s._();
                    } else s._();
                    s.p = 1;
                    return;
                }
            }
            if (this.enableIndex) {
                e.O();
                s.O();
                t.O();
            }
            return;
        }
    }
    q(t, e, s) {
        if (this.v === undefined) {
            this.m += 1;
            this.v = new this.N(t, e, 0);
            this.v.o = this.C;
            this.C.o = this.C.i = this.C.h = this.v;
            return this.m;
        }
        let i;
        const r = this.C.i;
        const n = this.A(r.u, t);
        if (n === 0) {
            r.l = e;
            return this.m;
        } else if (n > 0) {
            r.i = new this.N(t, e);
            r.i.o = r;
            i = r.i;
            this.C.i = i;
        } else {
            const r = this.C.h;
            const n = this.A(r.u, t);
            if (n === 0) {
                r.l = e;
                return this.m;
            } else if (n < 0) {
                r.h = new this.N(t, e);
                r.h.o = r;
                i = r.h;
                this.C.h = i;
            } else {
                if (s !== undefined) {
                    const r = s.T;
                    if (r !== this.C) {
                        const s = this.A(r.u, t);
                        if (s === 0) {
                            r.l = e;
                            return this.m;
                        } else if (s > 0) {
                            const s = r.I();
                            const n = this.A(s.u, t);
                            if (n === 0) {
                                s.l = e;
                                return this.m;
                            } else if (n < 0) {
                                i = new this.N(t, e);
                                if (s.h === undefined) {
                                    s.h = i;
                                    i.o = s;
                                } else {
                                    r.i = i;
                                    i.o = r;
                                }
                            }
                        }
                    }
                }
                if (i === undefined) {
                    i = this.v;
                    while (true) {
                        const s = this.A(i.u, t);
                        if (s > 0) {
                            if (i.i === undefined) {
                                i.i = new this.N(t, e);
                                i.i.o = i;
                                i = i.i;
                                break;
                            }
                            i = i.i;
                        } else if (s < 0) {
                            if (i.h === undefined) {
                                i.h = new this.N(t, e);
                                i.h.o = i;
                                i = i.h;
                                break;
                            }
                            i = i.h;
                        } else {
                            i.l = e;
                            return this.m;
                        }
                    }
                }
            }
        }
        if (this.enableIndex) {
            let t = i.o;
            while (t !== this.C) {
                t.M += 1;
                t = t.o;
            }
        }
        this.j(i);
        this.m += 1;
        return this.m;
    }
    H(t, e) {
        while (t) {
            const s = this.A(t.u, e);
            if (s < 0) {
                t = t.h;
            } else if (s > 0) {
                t = t.i;
            } else return t;
        }
        return t || this.C;
    }
    clear() {
        this.m = 0;
        this.v = undefined;
        this.C.o = undefined;
        this.C.i = this.C.h = undefined;
    }
    updateKeyByIterator(t, e) {
        const s = t.T;
        if (s === this.C) {
            throwIteratorAccessError();
        }
        if (this.m === 1) {
            s.u = e;
            return true;
        }
        const i = s.B().u;
        if (s === this.C.i) {
            if (this.A(i, e) > 0) {
                s.u = e;
                return true;
            }
            return false;
        }
        const r = s.I().u;
        if (s === this.C.h) {
            if (this.A(r, e) < 0) {
                s.u = e;
                return true;
            }
            return false;
        }
        if (this.A(r, e) >= 0 || this.A(i, e) <= 0) return false;
        s.u = e;
        return true;
    }
    eraseElementByPos(t) {
        if (t < 0 || t > this.m - 1) {
            throw new RangeError;
        }
        const e = this.U(t);
        this.S(e);
        return this.m;
    }
    eraseElementByKey(t) {
        if (this.m === 0) return false;
        const e = this.H(this.v, t);
        if (e === this.C) return false;
        this.S(e);
        return true;
    }
    eraseElementByIterator(t) {
        const e = t.T;
        if (e === this.C) {
            throwIteratorAccessError();
        }
        const s = e.h === undefined;
        const i = t.iteratorType === 0;
        if (i) {
            if (s) t.next();
        } else {
            if (!s || e.i === undefined) t.next();
        }
        this.S(e);
        return t;
    }
    getHeight() {
        if (this.m === 0) return 0;
        function traversal(t) {
            if (!t) return 0;
            return Math.max(traversal(t.i), traversal(t.h)) + 1;
        }
        return traversal(this.v);
    }
}

class TreeIterator extends ContainerIterator {
    constructor(t, e, s) {
        super(s);
        this.T = t;
        this.C = e;
        if (this.iteratorType === 0) {
            this.pre = function() {
                if (this.T === this.C.i) {
                    throwIteratorAccessError();
                }
                this.T = this.T.I();
                return this;
            };
            this.next = function() {
                if (this.T === this.C) {
                    throwIteratorAccessError();
                }
                this.T = this.T.B();
                return this;
            };
        } else {
            this.pre = function() {
                if (this.T === this.C.h) {
                    throwIteratorAccessError();
                }
                this.T = this.T.B();
                return this;
            };
            this.next = function() {
                if (this.T === this.C) {
                    throwIteratorAccessError();
                }
                this.T = this.T.I();
                return this;
            };
        }
    }
    get index() {
        let t = this.T;
        const e = this.C.o;
        if (t === this.C) {
            if (e) {
                return e.M - 1;
            }
            return 0;
        }
        let s = 0;
        if (t.i) {
            s += t.i.M;
        }
        while (t !== e) {
            const e = t.o;
            if (t === e.h) {
                s += 1;
                if (e.i) {
                    s += e.i.M;
                }
            }
            t = e;
        }
        return s;
    }
    isAccessible() {
        return this.T !== this.C;
    }
}

class OrderedMapIterator extends TreeIterator {
    constructor(t, e, s, i) {
        super(t, e, i);
        this.container = s;
    }
    get pointer() {
        if (this.T === this.C) {
            throwIteratorAccessError();
        }
        const t = this;
        return new Proxy([], {
            get(e, s) {
                if (s === "0") return t.T.u; else if (s === "1") return t.T.l;
                e[0] = t.T.u;
                e[1] = t.T.l;
                return e[s];
            },
            set(e, s, i) {
                if (s !== "1") {
                    throw new TypeError("prop must be 1");
                }
                t.T.l = i;
                return true;
            }
        });
    }
    copy() {
        return new OrderedMapIterator(this.T, this.C, this.container, this.iteratorType);
    }
}

class OrderedMap extends TreeContainer {
    constructor(t = [], e, s) {
        super(e, s);
        const i = this;
        t.forEach((function(t) {
            i.setElement(t[0], t[1]);
        }));
    }
    begin() {
        return new OrderedMapIterator(this.C.i || this.C, this.C, this);
    }
    end() {
        return new OrderedMapIterator(this.C, this.C, this);
    }
    rBegin() {
        return new OrderedMapIterator(this.C.h || this.C, this.C, this, 1);
    }
    rEnd() {
        return new OrderedMapIterator(this.C, this.C, this, 1);
    }
    front() {
        if (this.m === 0) return;
        const t = this.C.i;
        return [ t.u, t.l ];
    }
    back() {
        if (this.m === 0) return;
        const t = this.C.h;
        return [ t.u, t.l ];
    }
    lowerBound(t) {
        const e = this.R(this.v, t);
        return new OrderedMapIterator(e, this.C, this);
    }
    upperBound(t) {
        const e = this.K(this.v, t);
        return new OrderedMapIterator(e, this.C, this);
    }
    reverseLowerBound(t) {
        const e = this.L(this.v, t);
        return new OrderedMapIterator(e, this.C, this);
    }
    reverseUpperBound(t) {
        const e = this.k(this.v, t);
        return new OrderedMapIterator(e, this.C, this);
    }
    forEach(t) {
        this.U((function(e, s, i) {
            t([ e.u, e.l ], s, i);
        }));
    }
    setElement(t, e, s) {
        return this.q(t, e, s);
    }
    getElementByPos(t) {
        if (t < 0 || t > this.m - 1) {
            throw new RangeError;
        }
        const e = this.U(t);
        return [ e.u, e.l ];
    }
    find(t) {
        const e = this.H(this.v, t);
        return new OrderedMapIterator(e, this.C, this);
    }
    getElementByKey(t) {
        const e = this.H(this.v, t);
        return e.l;
    }
    union(t) {
        const e = this;
        t.forEach((function(t) {
            e.setElement(t[0], t[1]);
        }));
        return this.m;
    }
    * [Symbol.iterator]() {
        const t = this.m;
        const e = this.U();
        for (let s = 0; s < t; ++s) {
            const t = e[s];
            yield [ t.u, t.l ];
        }
    }
}

exports.OrderedMap = OrderedMap;
//# sourceMappingURL=index.js.map

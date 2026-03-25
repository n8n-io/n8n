var __extends = this && this.t || function() {
    var extendStatics = function(e, r) {
        extendStatics = Object.setPrototypeOf || {
            __proto__: []
        } instanceof Array && function(e, r) {
            e.__proto__ = r;
        } || function(e, r) {
            for (var i in r) if (Object.prototype.hasOwnProperty.call(r, i)) e[i] = r[i];
        };
        return extendStatics(e, r);
    };
    return function(e, r) {
        if (typeof r !== "function" && r !== null) throw new TypeError("Class extends value " + String(r) + " is not a constructor or null");
        extendStatics(e, r);
        function __() {
            this.constructor = e;
        }
        e.prototype = r === null ? Object.create(r) : (__.prototype = r.prototype, new __);
    };
}();

var __read = this && this.q || function(e, r) {
    var i = typeof Symbol === "function" && e[Symbol.iterator];
    if (!i) return e;
    var t = i.call(e), n, s = [], f;
    try {
        while ((r === void 0 || r-- > 0) && !(n = t.next()).done) s.push(n.value);
    } catch (e) {
        f = {
            error: e
        };
    } finally {
        try {
            if (n && !n.done && (i = t["return"])) i.call(t);
        } finally {
            if (f) throw f.error;
        }
    }
    return s;
};

var __values = this && this.V || function(e) {
    var r = typeof Symbol === "function" && Symbol.iterator, i = r && e[r], t = 0;
    if (i) return i.call(e);
    if (e && typeof e.length === "number") return {
        next: function() {
            if (e && t >= e.length) e = void 0;
            return {
                value: e && e[t++],
                done: !e
            };
        }
    };
    throw new TypeError(r ? "Object is not iterable." : "Symbol.iterator is not defined.");
};

import { TreeNode, TreeNodeEnableIndex } from "./TreeNode";

import { Container } from "../../ContainerBase";

import { throwIteratorAccessError } from "../../../utils/throwError";

var TreeContainer = function(e) {
    __extends(TreeContainer, e);
    function TreeContainer(r, i) {
        if (r === void 0) {
            r = function(e, r) {
                if (e < r) return -1;
                if (e > r) return 1;
                return 0;
            };
        }
        if (i === void 0) {
            i = false;
        }
        var t = e.call(this) || this;
        t.W = undefined;
        t.$ = r;
        if (i) {
            t.re = TreeNodeEnableIndex;
            t.v = function(e, r, i) {
                var t = this.se(e, r, i);
                if (t) {
                    var n = t.rr;
                    while (n !== this.h) {
                        n.tr += 1;
                        n = n.rr;
                    }
                    var s = this.fe(t);
                    if (s) {
                        var f = s, h = f.parentNode, u = f.grandParent, a = f.curNode;
                        h.ie();
                        u.ie();
                        a.ie();
                    }
                }
                return this.M;
            };
            t.G = function(e) {
                var r = this.he(e);
                while (r !== this.h) {
                    r.tr -= 1;
                    r = r.rr;
                }
            };
        } else {
            t.re = TreeNode;
            t.v = function(e, r, i) {
                var t = this.se(e, r, i);
                if (t) this.fe(t);
                return this.M;
            };
            t.G = t.he;
        }
        t.h = new t.re;
        return t;
    }
    TreeContainer.prototype.U = function(e, r) {
        var i = this.h;
        while (e) {
            var t = this.$(e.u, r);
            if (t < 0) {
                e = e.N;
            } else if (t > 0) {
                i = e;
                e = e.K;
            } else return e;
        }
        return i;
    };
    TreeContainer.prototype.X = function(e, r) {
        var i = this.h;
        while (e) {
            var t = this.$(e.u, r);
            if (t <= 0) {
                e = e.N;
            } else {
                i = e;
                e = e.K;
            }
        }
        return i;
    };
    TreeContainer.prototype.Y = function(e, r) {
        var i = this.h;
        while (e) {
            var t = this.$(e.u, r);
            if (t < 0) {
                i = e;
                e = e.N;
            } else if (t > 0) {
                e = e.K;
            } else return e;
        }
        return i;
    };
    TreeContainer.prototype.Z = function(e, r) {
        var i = this.h;
        while (e) {
            var t = this.$(e.u, r);
            if (t < 0) {
                i = e;
                e = e.N;
            } else {
                e = e.K;
            }
        }
        return i;
    };
    TreeContainer.prototype.ue = function(e) {
        while (true) {
            var r = e.rr;
            if (r === this.h) return;
            if (e.ee === 1) {
                e.ee = 0;
                return;
            }
            if (e === r.K) {
                var i = r.N;
                if (i.ee === 1) {
                    i.ee = 0;
                    r.ee = 1;
                    if (r === this.W) {
                        this.W = r.ne();
                    } else r.ne();
                } else {
                    if (i.N && i.N.ee === 1) {
                        i.ee = r.ee;
                        r.ee = 0;
                        i.N.ee = 0;
                        if (r === this.W) {
                            this.W = r.ne();
                        } else r.ne();
                        return;
                    } else if (i.K && i.K.ee === 1) {
                        i.ee = 1;
                        i.K.ee = 0;
                        i.te();
                    } else {
                        i.ee = 1;
                        e = r;
                    }
                }
            } else {
                var i = r.K;
                if (i.ee === 1) {
                    i.ee = 0;
                    r.ee = 1;
                    if (r === this.W) {
                        this.W = r.te();
                    } else r.te();
                } else {
                    if (i.K && i.K.ee === 1) {
                        i.ee = r.ee;
                        r.ee = 0;
                        i.K.ee = 0;
                        if (r === this.W) {
                            this.W = r.te();
                        } else r.te();
                        return;
                    } else if (i.N && i.N.ee === 1) {
                        i.ee = 1;
                        i.N.ee = 0;
                        i.ne();
                    } else {
                        i.ee = 1;
                        e = r;
                    }
                }
            }
        }
    };
    TreeContainer.prototype.he = function(e) {
        var r, i;
        if (this.M === 1) {
            this.clear();
            return this.h;
        }
        var t = e;
        while (t.K || t.N) {
            if (t.N) {
                t = t.N;
                while (t.K) t = t.K;
            } else {
                t = t.K;
            }
            r = __read([ t.u, e.u ], 2), e.u = r[0], t.u = r[1];
            i = __read([ t.p, e.p ], 2), e.p = i[0], t.p = i[1];
            e = t;
        }
        if (this.h.K === t) {
            this.h.K = t.rr;
        } else if (this.h.N === t) {
            this.h.N = t.rr;
        }
        this.ue(t);
        var n = t.rr;
        if (t === n.K) {
            n.K = undefined;
        } else n.N = undefined;
        this.M -= 1;
        this.W.ee = 0;
        return n;
    };
    TreeContainer.prototype.ae = function(e, r) {
        if (e === undefined) return false;
        var i = this.ae(e.K, r);
        if (i) return true;
        if (r(e)) return true;
        return this.ae(e.N, r);
    };
    TreeContainer.prototype.fe = function(e) {
        while (true) {
            var r = e.rr;
            if (r.ee === 0) return;
            var i = r.rr;
            if (r === i.K) {
                var t = i.N;
                if (t && t.ee === 1) {
                    t.ee = r.ee = 0;
                    if (i === this.W) return;
                    i.ee = 1;
                    e = i;
                    continue;
                } else if (e === r.N) {
                    e.ee = 0;
                    if (e.K) e.K.rr = r;
                    if (e.N) e.N.rr = i;
                    r.N = e.K;
                    i.K = e.N;
                    e.K = r;
                    e.N = i;
                    if (i === this.W) {
                        this.W = e;
                        this.h.rr = e;
                    } else {
                        var n = i.rr;
                        if (n.K === i) {
                            n.K = e;
                        } else n.N = e;
                    }
                    e.rr = i.rr;
                    r.rr = e;
                    i.rr = e;
                    i.ee = 1;
                    return {
                        parentNode: r,
                        grandParent: i,
                        curNode: e
                    };
                } else {
                    r.ee = 0;
                    if (i === this.W) {
                        this.W = i.te();
                    } else i.te();
                    i.ee = 1;
                }
            } else {
                var t = i.K;
                if (t && t.ee === 1) {
                    t.ee = r.ee = 0;
                    if (i === this.W) return;
                    i.ee = 1;
                    e = i;
                    continue;
                } else if (e === r.K) {
                    e.ee = 0;
                    if (e.K) e.K.rr = i;
                    if (e.N) e.N.rr = r;
                    i.N = e.K;
                    r.K = e.N;
                    e.K = i;
                    e.N = r;
                    if (i === this.W) {
                        this.W = e;
                        this.h.rr = e;
                    } else {
                        var n = i.rr;
                        if (n.K === i) {
                            n.K = e;
                        } else n.N = e;
                    }
                    e.rr = i.rr;
                    r.rr = e;
                    i.rr = e;
                    i.ee = 1;
                    return {
                        parentNode: r,
                        grandParent: i,
                        curNode: e
                    };
                } else {
                    r.ee = 0;
                    if (i === this.W) {
                        this.W = i.ne();
                    } else i.ne();
                    i.ee = 1;
                }
            }
            return;
        }
    };
    TreeContainer.prototype.se = function(e, r, i) {
        if (this.W === undefined) {
            this.M += 1;
            this.W = new this.re(e, r);
            this.W.ee = 0;
            this.W.rr = this.h;
            this.h.rr = this.W;
            this.h.K = this.W;
            this.h.N = this.W;
            return;
        }
        var t;
        var n = this.h.K;
        var s = this.$(n.u, e);
        if (s === 0) {
            n.p = r;
            return;
        } else if (s > 0) {
            n.K = new this.re(e, r);
            n.K.rr = n;
            t = n.K;
            this.h.K = t;
        } else {
            var f = this.h.N;
            var h = this.$(f.u, e);
            if (h === 0) {
                f.p = r;
                return;
            } else if (h < 0) {
                f.N = new this.re(e, r);
                f.N.rr = f;
                t = f.N;
                this.h.N = t;
            } else {
                if (i !== undefined) {
                    var u = i.o;
                    if (u !== this.h) {
                        var a = this.$(u.u, e);
                        if (a === 0) {
                            u.p = r;
                            return;
                        } else if (a > 0) {
                            var o = u.L();
                            var l = this.$(o.u, e);
                            if (l === 0) {
                                o.p = r;
                                return;
                            } else if (l < 0) {
                                t = new this.re(e, r);
                                if (o.N === undefined) {
                                    o.N = t;
                                    t.rr = o;
                                } else {
                                    u.K = t;
                                    t.rr = u;
                                }
                            }
                        }
                    }
                }
                if (t === undefined) {
                    t = this.W;
                    while (true) {
                        var v = this.$(t.u, e);
                        if (v > 0) {
                            if (t.K === undefined) {
                                t.K = new this.re(e, r);
                                t.K.rr = t;
                                t = t.K;
                                break;
                            }
                            t = t.K;
                        } else if (v < 0) {
                            if (t.N === undefined) {
                                t.N = new this.re(e, r);
                                t.N.rr = t;
                                t = t.N;
                                break;
                            }
                            t = t.N;
                        } else {
                            t.p = r;
                            return;
                        }
                    }
                }
            }
        }
        this.M += 1;
        return t;
    };
    TreeContainer.prototype.g = function(e, r) {
        while (e) {
            var i = this.$(e.u, r);
            if (i < 0) {
                e = e.N;
            } else if (i > 0) {
                e = e.K;
            } else return e;
        }
        return e || this.h;
    };
    TreeContainer.prototype.clear = function() {
        this.M = 0;
        this.W = undefined;
        this.h.rr = undefined;
        this.h.K = this.h.N = undefined;
    };
    TreeContainer.prototype.updateKeyByIterator = function(e, r) {
        var i = e.o;
        if (i === this.h) {
            throwIteratorAccessError();
        }
        if (this.M === 1) {
            i.u = r;
            return true;
        }
        if (i === this.h.K) {
            if (this.$(i.m().u, r) > 0) {
                i.u = r;
                return true;
            }
            return false;
        }
        if (i === this.h.N) {
            if (this.$(i.L().u, r) < 0) {
                i.u = r;
                return true;
            }
            return false;
        }
        var t = i.L().u;
        if (this.$(t, r) >= 0) return false;
        var n = i.m().u;
        if (this.$(n, r) <= 0) return false;
        i.u = r;
        return true;
    };
    TreeContainer.prototype.eraseElementByPos = function(e) {
        if (e < 0 || e > this.M - 1) {
            throw new RangeError;
        }
        var r = 0;
        var i = this;
        this.ae(this.W, (function(t) {
            if (e === r) {
                i.G(t);
                return true;
            }
            r += 1;
            return false;
        }));
        return this.M;
    };
    TreeContainer.prototype.eraseElementByKey = function(e) {
        if (this.M === 0) return false;
        var r = this.g(this.W, e);
        if (r === this.h) return false;
        this.G(r);
        return true;
    };
    TreeContainer.prototype.eraseElementByIterator = function(e) {
        var r = e.o;
        if (r === this.h) {
            throwIteratorAccessError();
        }
        var i = r.N === undefined;
        var t = e.iteratorType === 0;
        if (t) {
            if (i) e.next();
        } else {
            if (!i || r.K === undefined) e.next();
        }
        this.G(r);
        return e;
    };
    TreeContainer.prototype.forEach = function(e) {
        var r, i;
        var t = 0;
        try {
            for (var n = __values(this), s = n.next(); !s.done; s = n.next()) {
                var f = s.value;
                e(f, t++, this);
            }
        } catch (e) {
            r = {
                error: e
            };
        } finally {
            try {
                if (s && !s.done && (i = n.return)) i.call(n);
            } finally {
                if (r) throw r.error;
            }
        }
    };
    TreeContainer.prototype.getElementByPos = function(e) {
        var r, i;
        if (e < 0 || e > this.M - 1) {
            throw new RangeError;
        }
        var t;
        var n = 0;
        try {
            for (var s = __values(this), f = s.next(); !f.done; f = s.next()) {
                var h = f.value;
                if (n === e) {
                    t = h;
                    break;
                }
                n += 1;
            }
        } catch (e) {
            r = {
                error: e
            };
        } finally {
            try {
                if (f && !f.done && (i = s.return)) i.call(s);
            } finally {
                if (r) throw r.error;
            }
        }
        return t;
    };
    TreeContainer.prototype.getHeight = function() {
        if (this.M === 0) return 0;
        var traversal = function(e) {
            if (!e) return 0;
            return Math.max(traversal(e.K), traversal(e.N)) + 1;
        };
        return traversal(this.W);
    };
    return TreeContainer;
}(Container);

export default TreeContainer;
//# sourceMappingURL=index.js.map

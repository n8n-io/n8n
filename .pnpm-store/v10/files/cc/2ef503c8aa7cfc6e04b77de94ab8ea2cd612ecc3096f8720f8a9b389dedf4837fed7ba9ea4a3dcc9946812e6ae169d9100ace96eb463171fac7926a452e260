var extendStatics = function(e, r) {
    extendStatics = Object.setPrototypeOf || {
        __proto__: []
    } instanceof Array && function(e, r) {
        e.__proto__ = r;
    } || function(e, r) {
        for (var t in r) if (Object.prototype.hasOwnProperty.call(r, t)) e[t] = r[t];
    };
    return extendStatics(e, r);
};

function __extends(e, r) {
    if (typeof r !== "function" && r !== null) throw new TypeError("Class extends value " + String(r) + " is not a constructor or null");
    extendStatics(e, r);
    function __() {
        this.constructor = e;
    }
    e.prototype = r === null ? Object.create(r) : (__.prototype = r.prototype, new __);
}

function __generator(e, r) {
    var t = {
        label: 0,
        sent: function() {
            if (s[0] & 1) throw s[1];
            return s[1];
        },
        trys: [],
        ops: []
    }, i, n, s, h;
    return h = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (h[Symbol.iterator] = function() {
        return this;
    }), h;
    function verb(e) {
        return function(r) {
            return step([ e, r ]);
        };
    }
    function step(a) {
        if (i) throw new TypeError("Generator is already executing.");
        while (h && (h = 0, a[0] && (t = 0)), t) try {
            if (i = 1, n && (s = a[0] & 2 ? n["return"] : a[0] ? n["throw"] || ((s = n["return"]) && s.call(n), 
            0) : n.next) && !(s = s.call(n, a[1])).done) return s;
            if (n = 0, s) a = [ a[0] & 2, s.value ];
            switch (a[0]) {
              case 0:
              case 1:
                s = a;
                break;

              case 4:
                t.label++;
                return {
                    value: a[1],
                    done: false
                };

              case 5:
                t.label++;
                n = a[1];
                a = [ 0 ];
                continue;

              case 7:
                a = t.ops.pop();
                t.trys.pop();
                continue;

              default:
                if (!(s = t.trys, s = s.length > 0 && s[s.length - 1]) && (a[0] === 6 || a[0] === 2)) {
                    t = 0;
                    continue;
                }
                if (a[0] === 3 && (!s || a[1] > s[0] && a[1] < s[3])) {
                    t.label = a[1];
                    break;
                }
                if (a[0] === 6 && t.label < s[1]) {
                    t.label = s[1];
                    s = a;
                    break;
                }
                if (s && t.label < s[2]) {
                    t.label = s[2];
                    t.ops.push(a);
                    break;
                }
                if (s[2]) t.ops.pop();
                t.trys.pop();
                continue;
            }
            a = r.call(e, t);
        } catch (e) {
            a = [ 6, e ];
            n = 0;
        } finally {
            i = s = 0;
        }
        if (a[0] & 5) throw a[1];
        return {
            value: a[0] ? a[1] : void 0,
            done: true
        };
    }
}

typeof SuppressedError === "function" ? SuppressedError : function(e, r, t) {
    var i = new Error(t);
    return i.name = "SuppressedError", i.error = e, i.suppressed = r, i;
};

var TreeNode = function() {
    function TreeNode(e, r, t) {
        if (t === void 0) {
            t = 1;
        }
        this.t = undefined;
        this.i = undefined;
        this.h = undefined;
        this.u = e;
        this.o = r;
        this.l = t;
    }
    TreeNode.prototype.v = function() {
        var e = this;
        var r = e.h.h === e;
        if (r && e.l === 1) {
            e = e.i;
        } else if (e.t) {
            e = e.t;
            while (e.i) {
                e = e.i;
            }
        } else {
            if (r) {
                return e.h;
            }
            var t = e.h;
            while (t.t === e) {
                e = t;
                t = e.h;
            }
            e = t;
        }
        return e;
    };
    TreeNode.prototype.p = function() {
        var e = this;
        if (e.i) {
            e = e.i;
            while (e.t) {
                e = e.t;
            }
            return e;
        } else {
            var r = e.h;
            while (r.i === e) {
                e = r;
                r = e.h;
            }
            if (e.i !== r) {
                return r;
            } else return e;
        }
    };
    TreeNode.prototype.T = function() {
        var e = this.h;
        var r = this.i;
        var t = r.t;
        if (e.h === this) e.h = r; else if (e.t === this) e.t = r; else e.i = r;
        r.h = e;
        r.t = this;
        this.h = r;
        this.i = t;
        if (t) t.h = this;
        return r;
    };
    TreeNode.prototype.I = function() {
        var e = this.h;
        var r = this.t;
        var t = r.i;
        if (e.h === this) e.h = r; else if (e.t === this) e.t = r; else e.i = r;
        r.h = e;
        r.i = this;
        this.h = r;
        this.t = t;
        if (t) t.h = this;
        return r;
    };
    return TreeNode;
}();

var TreeNodeEnableIndex = function(e) {
    __extends(TreeNodeEnableIndex, e);
    function TreeNodeEnableIndex() {
        var r = e !== null && e.apply(this, arguments) || this;
        r.O = 1;
        return r;
    }
    TreeNodeEnableIndex.prototype.T = function() {
        var r = e.prototype.T.call(this);
        this.M();
        r.M();
        return r;
    };
    TreeNodeEnableIndex.prototype.I = function() {
        var r = e.prototype.I.call(this);
        this.M();
        r.M();
        return r;
    };
    TreeNodeEnableIndex.prototype.M = function() {
        this.O = 1;
        if (this.t) {
            this.O += this.t.O;
        }
        if (this.i) {
            this.O += this.i.O;
        }
    };
    return TreeNodeEnableIndex;
}(TreeNode);

var ContainerIterator = function() {
    function ContainerIterator(e) {
        if (e === void 0) {
            e = 0;
        }
        this.iteratorType = e;
    }
    ContainerIterator.prototype.equals = function(e) {
        return this.C === e.C;
    };
    return ContainerIterator;
}();

var Base = function() {
    function Base() {
        this._ = 0;
    }
    Object.defineProperty(Base.prototype, "length", {
        get: function() {
            return this._;
        },
        enumerable: false,
        configurable: true
    });
    Base.prototype.size = function() {
        return this._;
    };
    Base.prototype.empty = function() {
        return this._ === 0;
    };
    return Base;
}();

var Container = function(e) {
    __extends(Container, e);
    function Container() {
        return e !== null && e.apply(this, arguments) || this;
    }
    return Container;
}(Base);

function throwIteratorAccessError() {
    throw new RangeError("Iterator access denied!");
}

var TreeContainer = function(e) {
    __extends(TreeContainer, e);
    function TreeContainer(r, t) {
        if (r === void 0) {
            r = function(e, r) {
                if (e < r) return -1;
                if (e > r) return 1;
                return 0;
            };
        }
        if (t === void 0) {
            t = false;
        }
        var i = e.call(this) || this;
        i.N = undefined;
        i.g = r;
        i.enableIndex = t;
        i.S = t ? TreeNodeEnableIndex : TreeNode;
        i.A = new i.S;
        return i;
    }
    TreeContainer.prototype.m = function(e, r) {
        var t = this.A;
        while (e) {
            var i = this.g(e.u, r);
            if (i < 0) {
                e = e.i;
            } else if (i > 0) {
                t = e;
                e = e.t;
            } else return e;
        }
        return t;
    };
    TreeContainer.prototype.B = function(e, r) {
        var t = this.A;
        while (e) {
            var i = this.g(e.u, r);
            if (i <= 0) {
                e = e.i;
            } else {
                t = e;
                e = e.t;
            }
        }
        return t;
    };
    TreeContainer.prototype.j = function(e, r) {
        var t = this.A;
        while (e) {
            var i = this.g(e.u, r);
            if (i < 0) {
                t = e;
                e = e.i;
            } else if (i > 0) {
                e = e.t;
            } else return e;
        }
        return t;
    };
    TreeContainer.prototype.k = function(e, r) {
        var t = this.A;
        while (e) {
            var i = this.g(e.u, r);
            if (i < 0) {
                t = e;
                e = e.i;
            } else {
                e = e.t;
            }
        }
        return t;
    };
    TreeContainer.prototype.R = function(e) {
        while (true) {
            var r = e.h;
            if (r === this.A) return;
            if (e.l === 1) {
                e.l = 0;
                return;
            }
            if (e === r.t) {
                var t = r.i;
                if (t.l === 1) {
                    t.l = 0;
                    r.l = 1;
                    if (r === this.N) {
                        this.N = r.T();
                    } else r.T();
                } else {
                    if (t.i && t.i.l === 1) {
                        t.l = r.l;
                        r.l = 0;
                        t.i.l = 0;
                        if (r === this.N) {
                            this.N = r.T();
                        } else r.T();
                        return;
                    } else if (t.t && t.t.l === 1) {
                        t.l = 1;
                        t.t.l = 0;
                        t.I();
                    } else {
                        t.l = 1;
                        e = r;
                    }
                }
            } else {
                var t = r.t;
                if (t.l === 1) {
                    t.l = 0;
                    r.l = 1;
                    if (r === this.N) {
                        this.N = r.I();
                    } else r.I();
                } else {
                    if (t.t && t.t.l === 1) {
                        t.l = r.l;
                        r.l = 0;
                        t.t.l = 0;
                        if (r === this.N) {
                            this.N = r.I();
                        } else r.I();
                        return;
                    } else if (t.i && t.i.l === 1) {
                        t.l = 1;
                        t.i.l = 0;
                        t.T();
                    } else {
                        t.l = 1;
                        e = r;
                    }
                }
            }
        }
    };
    TreeContainer.prototype.G = function(e) {
        if (this._ === 1) {
            this.clear();
            return;
        }
        var r = e;
        while (r.t || r.i) {
            if (r.i) {
                r = r.i;
                while (r.t) r = r.t;
            } else {
                r = r.t;
            }
            var t = e.u;
            e.u = r.u;
            r.u = t;
            var i = e.o;
            e.o = r.o;
            r.o = i;
            e = r;
        }
        if (this.A.t === r) {
            this.A.t = r.h;
        } else if (this.A.i === r) {
            this.A.i = r.h;
        }
        this.R(r);
        var n = r.h;
        if (r === n.t) {
            n.t = undefined;
        } else n.i = undefined;
        this._ -= 1;
        this.N.l = 0;
        if (this.enableIndex) {
            while (n !== this.A) {
                n.O -= 1;
                n = n.h;
            }
        }
    };
    TreeContainer.prototype.P = function(e) {
        var r = typeof e === "number" ? e : undefined;
        var t = typeof e === "function" ? e : undefined;
        var i = typeof e === "undefined" ? [] : undefined;
        var n = 0;
        var s = this.N;
        var h = [];
        while (h.length || s) {
            if (s) {
                h.push(s);
                s = s.t;
            } else {
                s = h.pop();
                if (n === r) return s;
                i && i.push(s);
                t && t(s, n, this);
                n += 1;
                s = s.i;
            }
        }
        return i;
    };
    TreeContainer.prototype.q = function(e) {
        while (true) {
            var r = e.h;
            if (r.l === 0) return;
            var t = r.h;
            if (r === t.t) {
                var i = t.i;
                if (i && i.l === 1) {
                    i.l = r.l = 0;
                    if (t === this.N) return;
                    t.l = 1;
                    e = t;
                    continue;
                } else if (e === r.i) {
                    e.l = 0;
                    if (e.t) {
                        e.t.h = r;
                    }
                    if (e.i) {
                        e.i.h = t;
                    }
                    r.i = e.t;
                    t.t = e.i;
                    e.t = r;
                    e.i = t;
                    if (t === this.N) {
                        this.N = e;
                        this.A.h = e;
                    } else {
                        var n = t.h;
                        if (n.t === t) {
                            n.t = e;
                        } else n.i = e;
                    }
                    e.h = t.h;
                    r.h = e;
                    t.h = e;
                    t.l = 1;
                } else {
                    r.l = 0;
                    if (t === this.N) {
                        this.N = t.I();
                    } else t.I();
                    t.l = 1;
                    return;
                }
            } else {
                var i = t.t;
                if (i && i.l === 1) {
                    i.l = r.l = 0;
                    if (t === this.N) return;
                    t.l = 1;
                    e = t;
                    continue;
                } else if (e === r.t) {
                    e.l = 0;
                    if (e.t) {
                        e.t.h = t;
                    }
                    if (e.i) {
                        e.i.h = r;
                    }
                    t.i = e.t;
                    r.t = e.i;
                    e.t = t;
                    e.i = r;
                    if (t === this.N) {
                        this.N = e;
                        this.A.h = e;
                    } else {
                        var n = t.h;
                        if (n.t === t) {
                            n.t = e;
                        } else n.i = e;
                    }
                    e.h = t.h;
                    r.h = e;
                    t.h = e;
                    t.l = 1;
                } else {
                    r.l = 0;
                    if (t === this.N) {
                        this.N = t.T();
                    } else t.T();
                    t.l = 1;
                    return;
                }
            }
            if (this.enableIndex) {
                r.M();
                t.M();
                e.M();
            }
            return;
        }
    };
    TreeContainer.prototype.D = function(e, r, t) {
        if (this.N === undefined) {
            this._ += 1;
            this.N = new this.S(e, r, 0);
            this.N.h = this.A;
            this.A.h = this.A.t = this.A.i = this.N;
            return this._;
        }
        var i;
        var n = this.A.t;
        var s = this.g(n.u, e);
        if (s === 0) {
            n.o = r;
            return this._;
        } else if (s > 0) {
            n.t = new this.S(e, r);
            n.t.h = n;
            i = n.t;
            this.A.t = i;
        } else {
            var h = this.A.i;
            var a = this.g(h.u, e);
            if (a === 0) {
                h.o = r;
                return this._;
            } else if (a < 0) {
                h.i = new this.S(e, r);
                h.i.h = h;
                i = h.i;
                this.A.i = i;
            } else {
                if (t !== undefined) {
                    var u = t.C;
                    if (u !== this.A) {
                        var f = this.g(u.u, e);
                        if (f === 0) {
                            u.o = r;
                            return this._;
                        } else if (f > 0) {
                            var o = u.v();
                            var d = this.g(o.u, e);
                            if (d === 0) {
                                o.o = r;
                                return this._;
                            } else if (d < 0) {
                                i = new this.S(e, r);
                                if (o.i === undefined) {
                                    o.i = i;
                                    i.h = o;
                                } else {
                                    u.t = i;
                                    i.h = u;
                                }
                            }
                        }
                    }
                }
                if (i === undefined) {
                    i = this.N;
                    while (true) {
                        var c = this.g(i.u, e);
                        if (c > 0) {
                            if (i.t === undefined) {
                                i.t = new this.S(e, r);
                                i.t.h = i;
                                i = i.t;
                                break;
                            }
                            i = i.t;
                        } else if (c < 0) {
                            if (i.i === undefined) {
                                i.i = new this.S(e, r);
                                i.i.h = i;
                                i = i.i;
                                break;
                            }
                            i = i.i;
                        } else {
                            i.o = r;
                            return this._;
                        }
                    }
                }
            }
        }
        if (this.enableIndex) {
            var l = i.h;
            while (l !== this.A) {
                l.O += 1;
                l = l.h;
            }
        }
        this.q(i);
        this._ += 1;
        return this._;
    };
    TreeContainer.prototype.F = function(e, r) {
        while (e) {
            var t = this.g(e.u, r);
            if (t < 0) {
                e = e.i;
            } else if (t > 0) {
                e = e.t;
            } else return e;
        }
        return e || this.A;
    };
    TreeContainer.prototype.clear = function() {
        this._ = 0;
        this.N = undefined;
        this.A.h = undefined;
        this.A.t = this.A.i = undefined;
    };
    TreeContainer.prototype.updateKeyByIterator = function(e, r) {
        var t = e.C;
        if (t === this.A) {
            throwIteratorAccessError();
        }
        if (this._ === 1) {
            t.u = r;
            return true;
        }
        var i = t.p().u;
        if (t === this.A.t) {
            if (this.g(i, r) > 0) {
                t.u = r;
                return true;
            }
            return false;
        }
        var n = t.v().u;
        if (t === this.A.i) {
            if (this.g(n, r) < 0) {
                t.u = r;
                return true;
            }
            return false;
        }
        if (this.g(n, r) >= 0 || this.g(i, r) <= 0) return false;
        t.u = r;
        return true;
    };
    TreeContainer.prototype.eraseElementByPos = function(e) {
        if (e < 0 || e > this._ - 1) {
            throw new RangeError;
        }
        var r = this.P(e);
        this.G(r);
        return this._;
    };
    TreeContainer.prototype.eraseElementByKey = function(e) {
        if (this._ === 0) return false;
        var r = this.F(this.N, e);
        if (r === this.A) return false;
        this.G(r);
        return true;
    };
    TreeContainer.prototype.eraseElementByIterator = function(e) {
        var r = e.C;
        if (r === this.A) {
            throwIteratorAccessError();
        }
        var t = r.i === undefined;
        var i = e.iteratorType === 0;
        if (i) {
            if (t) e.next();
        } else {
            if (!t || r.t === undefined) e.next();
        }
        this.G(r);
        return e;
    };
    TreeContainer.prototype.getHeight = function() {
        if (this._ === 0) return 0;
        function traversal(e) {
            if (!e) return 0;
            return Math.max(traversal(e.t), traversal(e.i)) + 1;
        }
        return traversal(this.N);
    };
    return TreeContainer;
}(Container);

var TreeIterator = function(e) {
    __extends(TreeIterator, e);
    function TreeIterator(r, t, i) {
        var n = e.call(this, i) || this;
        n.C = r;
        n.A = t;
        if (n.iteratorType === 0) {
            n.pre = function() {
                if (this.C === this.A.t) {
                    throwIteratorAccessError();
                }
                this.C = this.C.v();
                return this;
            };
            n.next = function() {
                if (this.C === this.A) {
                    throwIteratorAccessError();
                }
                this.C = this.C.p();
                return this;
            };
        } else {
            n.pre = function() {
                if (this.C === this.A.i) {
                    throwIteratorAccessError();
                }
                this.C = this.C.p();
                return this;
            };
            n.next = function() {
                if (this.C === this.A) {
                    throwIteratorAccessError();
                }
                this.C = this.C.v();
                return this;
            };
        }
        return n;
    }
    Object.defineProperty(TreeIterator.prototype, "index", {
        get: function() {
            var e = this.C;
            var r = this.A.h;
            if (e === this.A) {
                if (r) {
                    return r.O - 1;
                }
                return 0;
            }
            var t = 0;
            if (e.t) {
                t += e.t.O;
            }
            while (e !== r) {
                var i = e.h;
                if (e === i.i) {
                    t += 1;
                    if (i.t) {
                        t += i.t.O;
                    }
                }
                e = i;
            }
            return t;
        },
        enumerable: false,
        configurable: true
    });
    TreeIterator.prototype.isAccessible = function() {
        return this.C !== this.A;
    };
    return TreeIterator;
}(ContainerIterator);

var OrderedMapIterator = function(e) {
    __extends(OrderedMapIterator, e);
    function OrderedMapIterator(r, t, i, n) {
        var s = e.call(this, r, t, n) || this;
        s.container = i;
        return s;
    }
    Object.defineProperty(OrderedMapIterator.prototype, "pointer", {
        get: function() {
            if (this.C === this.A) {
                throwIteratorAccessError();
            }
            var e = this;
            return new Proxy([], {
                get: function(r, t) {
                    if (t === "0") return e.C.u; else if (t === "1") return e.C.o;
                    r[0] = e.C.u;
                    r[1] = e.C.o;
                    return r[t];
                },
                set: function(r, t, i) {
                    if (t !== "1") {
                        throw new TypeError("prop must be 1");
                    }
                    e.C.o = i;
                    return true;
                }
            });
        },
        enumerable: false,
        configurable: true
    });
    OrderedMapIterator.prototype.copy = function() {
        return new OrderedMapIterator(this.C, this.A, this.container, this.iteratorType);
    };
    return OrderedMapIterator;
}(TreeIterator);

var OrderedMap = function(e) {
    __extends(OrderedMap, e);
    function OrderedMap(r, t, i) {
        if (r === void 0) {
            r = [];
        }
        var n = e.call(this, t, i) || this;
        var s = n;
        r.forEach((function(e) {
            s.setElement(e[0], e[1]);
        }));
        return n;
    }
    OrderedMap.prototype.begin = function() {
        return new OrderedMapIterator(this.A.t || this.A, this.A, this);
    };
    OrderedMap.prototype.end = function() {
        return new OrderedMapIterator(this.A, this.A, this);
    };
    OrderedMap.prototype.rBegin = function() {
        return new OrderedMapIterator(this.A.i || this.A, this.A, this, 1);
    };
    OrderedMap.prototype.rEnd = function() {
        return new OrderedMapIterator(this.A, this.A, this, 1);
    };
    OrderedMap.prototype.front = function() {
        if (this._ === 0) return;
        var e = this.A.t;
        return [ e.u, e.o ];
    };
    OrderedMap.prototype.back = function() {
        if (this._ === 0) return;
        var e = this.A.i;
        return [ e.u, e.o ];
    };
    OrderedMap.prototype.lowerBound = function(e) {
        var r = this.m(this.N, e);
        return new OrderedMapIterator(r, this.A, this);
    };
    OrderedMap.prototype.upperBound = function(e) {
        var r = this.B(this.N, e);
        return new OrderedMapIterator(r, this.A, this);
    };
    OrderedMap.prototype.reverseLowerBound = function(e) {
        var r = this.j(this.N, e);
        return new OrderedMapIterator(r, this.A, this);
    };
    OrderedMap.prototype.reverseUpperBound = function(e) {
        var r = this.k(this.N, e);
        return new OrderedMapIterator(r, this.A, this);
    };
    OrderedMap.prototype.forEach = function(e) {
        this.P((function(r, t, i) {
            e([ r.u, r.o ], t, i);
        }));
    };
    OrderedMap.prototype.setElement = function(e, r, t) {
        return this.D(e, r, t);
    };
    OrderedMap.prototype.getElementByPos = function(e) {
        if (e < 0 || e > this._ - 1) {
            throw new RangeError;
        }
        var r = this.P(e);
        return [ r.u, r.o ];
    };
    OrderedMap.prototype.find = function(e) {
        var r = this.F(this.N, e);
        return new OrderedMapIterator(r, this.A, this);
    };
    OrderedMap.prototype.getElementByKey = function(e) {
        var r = this.F(this.N, e);
        return r.o;
    };
    OrderedMap.prototype.union = function(e) {
        var r = this;
        e.forEach((function(e) {
            r.setElement(e[0], e[1]);
        }));
        return this._;
    };
    OrderedMap.prototype[Symbol.iterator] = function() {
        var e, r, t, i;
        return __generator(this, (function(n) {
            switch (n.label) {
              case 0:
                e = this._;
                r = this.P();
                t = 0;
                n.label = 1;

              case 1:
                if (!(t < e)) return [ 3, 4 ];
                i = r[t];
                return [ 4, [ i.u, i.o ] ];

              case 2:
                n.sent();
                n.label = 3;

              case 3:
                ++t;
                return [ 3, 1 ];

              case 4:
                return [ 2 ];
            }
        }));
    };
    return OrderedMap;
}(TreeContainer);

export { OrderedMap };
//# sourceMappingURL=index.js.map

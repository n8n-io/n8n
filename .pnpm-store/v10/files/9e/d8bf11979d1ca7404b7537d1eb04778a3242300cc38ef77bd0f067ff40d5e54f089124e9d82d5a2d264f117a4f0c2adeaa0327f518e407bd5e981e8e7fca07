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
            if (e[0] & 1) throw e[1];
            return e[1];
        },
        trys: [],
        ops: []
    }, n, s, e, h;
    return h = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (h[Symbol.iterator] = function() {
        return this;
    }), h;
    function verb(t) {
        return function(i) {
            return step([ t, i ]);
        };
    }
    function step(h) {
        if (n) throw new TypeError("Generator is already executing.");
        while (r) try {
            if (n = 1, s && (e = h[0] & 2 ? s["return"] : h[0] ? s["throw"] || ((e = s["return"]) && e.call(s), 
            0) : s.next) && !(e = e.call(s, h[1])).done) return e;
            if (s = 0, e) h = [ h[0] & 2, e.value ];
            switch (h[0]) {
              case 0:
              case 1:
                e = h;
                break;

              case 4:
                r.label++;
                return {
                    value: h[1],
                    done: false
                };

              case 5:
                r.label++;
                s = h[1];
                h = [ 0 ];
                continue;

              case 7:
                h = r.ops.pop();
                r.trys.pop();
                continue;

              default:
                if (!(e = r.trys, e = e.length > 0 && e[e.length - 1]) && (h[0] === 6 || h[0] === 2)) {
                    r = 0;
                    continue;
                }
                if (h[0] === 3 && (!e || h[1] > e[0] && h[1] < e[3])) {
                    r.label = h[1];
                    break;
                }
                if (h[0] === 6 && r.label < e[1]) {
                    r.label = e[1];
                    e = h;
                    break;
                }
                if (e && r.label < e[2]) {
                    r.label = e[2];
                    r.ops.push(h);
                    break;
                }
                if (e[2]) r.ops.pop();
                r.trys.pop();
                continue;
            }
            h = i.call(t, r);
        } catch (t) {
            h = [ 6, t ];
            s = 0;
        } finally {
            n = e = 0;
        }
        if (h[0] & 5) throw h[1];
        return {
            value: h[0] ? h[1] : void 0,
            done: true
        };
    }
};

import SequentialContainer from "./Base";

import { ContainerIterator } from "../ContainerBase";

import { throwIteratorAccessError } from "../../utils/throwError";

var LinkListIterator = function(t) {
    __extends(LinkListIterator, t);
    function LinkListIterator(i, r, n, s) {
        var e = t.call(this, s) || this;
        e.o = i;
        e.h = r;
        e.container = n;
        if (e.iteratorType === 0) {
            e.pre = function() {
                if (this.o.L === this.h) {
                    throwIteratorAccessError();
                }
                this.o = this.o.L;
                return this;
            };
            e.next = function() {
                if (this.o === this.h) {
                    throwIteratorAccessError();
                }
                this.o = this.o.m;
                return this;
            };
        } else {
            e.pre = function() {
                if (this.o.m === this.h) {
                    throwIteratorAccessError();
                }
                this.o = this.o.m;
                return this;
            };
            e.next = function() {
                if (this.o === this.h) {
                    throwIteratorAccessError();
                }
                this.o = this.o.L;
                return this;
            };
        }
        return e;
    }
    Object.defineProperty(LinkListIterator.prototype, "pointer", {
        get: function() {
            if (this.o === this.h) {
                throwIteratorAccessError();
            }
            return this.o.p;
        },
        set: function(t) {
            if (this.o === this.h) {
                throwIteratorAccessError();
            }
            this.o.p = t;
        },
        enumerable: false,
        configurable: true
    });
    LinkListIterator.prototype.copy = function() {
        return new LinkListIterator(this.o, this.h, this.container, this.iteratorType);
    };
    return LinkListIterator;
}(ContainerIterator);

var LinkList = function(t) {
    __extends(LinkList, t);
    function LinkList(i) {
        if (i === void 0) {
            i = [];
        }
        var r = t.call(this) || this;
        r.h = {};
        r.H = r.l = r.h.L = r.h.m = r.h;
        var n = r;
        i.forEach((function(t) {
            n.pushBack(t);
        }));
        return r;
    }
    LinkList.prototype.G = function(t) {
        var i = t.L, r = t.m;
        i.m = r;
        r.L = i;
        if (t === this.H) {
            this.H = r;
        }
        if (t === this.l) {
            this.l = i;
        }
        this.M -= 1;
    };
    LinkList.prototype.F = function(t, i) {
        var r = i.m;
        var n = {
            p: t,
            L: i,
            m: r
        };
        i.m = n;
        r.L = n;
        if (i === this.h) {
            this.H = n;
        }
        if (r === this.h) {
            this.l = n;
        }
        this.M += 1;
    };
    LinkList.prototype.clear = function() {
        this.M = 0;
        this.H = this.l = this.h.L = this.h.m = this.h;
    };
    LinkList.prototype.begin = function() {
        return new LinkListIterator(this.H, this.h, this);
    };
    LinkList.prototype.end = function() {
        return new LinkListIterator(this.h, this.h, this);
    };
    LinkList.prototype.rBegin = function() {
        return new LinkListIterator(this.l, this.h, this, 1);
    };
    LinkList.prototype.rEnd = function() {
        return new LinkListIterator(this.h, this.h, this, 1);
    };
    LinkList.prototype.front = function() {
        return this.H.p;
    };
    LinkList.prototype.back = function() {
        return this.l.p;
    };
    LinkList.prototype.getElementByPos = function(t) {
        if (t < 0 || t > this.M - 1) {
            throw new RangeError;
        }
        var i = this.H;
        while (t--) {
            i = i.m;
        }
        return i.p;
    };
    LinkList.prototype.eraseElementByPos = function(t) {
        if (t < 0 || t > this.M - 1) {
            throw new RangeError;
        }
        var i = this.H;
        while (t--) {
            i = i.m;
        }
        this.G(i);
        return this.M;
    };
    LinkList.prototype.eraseElementByValue = function(t) {
        var i = this.H;
        while (i !== this.h) {
            if (i.p === t) {
                this.G(i);
            }
            i = i.m;
        }
        return this.M;
    };
    LinkList.prototype.eraseElementByIterator = function(t) {
        var i = t.o;
        if (i === this.h) {
            throwIteratorAccessError();
        }
        t = t.next();
        this.G(i);
        return t;
    };
    LinkList.prototype.pushBack = function(t) {
        this.F(t, this.l);
        return this.M;
    };
    LinkList.prototype.popBack = function() {
        if (this.M === 0) return;
        var t = this.l.p;
        this.G(this.l);
        return t;
    };
    LinkList.prototype.pushFront = function(t) {
        this.F(t, this.h);
        return this.M;
    };
    LinkList.prototype.popFront = function() {
        if (this.M === 0) return;
        var t = this.H.p;
        this.G(this.H);
        return t;
    };
    LinkList.prototype.setElementByPos = function(t, i) {
        if (t < 0 || t > this.M - 1) {
            throw new RangeError;
        }
        var r = this.H;
        while (t--) {
            r = r.m;
        }
        r.p = i;
    };
    LinkList.prototype.insert = function(t, i, r) {
        if (r === void 0) {
            r = 1;
        }
        if (t < 0 || t > this.M) {
            throw new RangeError;
        }
        if (r <= 0) return this.M;
        if (t === 0) {
            while (r--) this.pushFront(i);
        } else if (t === this.M) {
            while (r--) this.pushBack(i);
        } else {
            var n = this.H;
            for (var s = 1; s < t; ++s) {
                n = n.m;
            }
            var e = n.m;
            this.M += r;
            while (r--) {
                n.m = {
                    p: i,
                    L: n
                };
                n.m.L = n;
                n = n.m;
            }
            n.m = e;
            e.L = n;
        }
        return this.M;
    };
    LinkList.prototype.find = function(t) {
        var i = this.H;
        while (i !== this.h) {
            if (i.p === t) {
                return new LinkListIterator(i, this.h, this);
            }
            i = i.m;
        }
        return this.end();
    };
    LinkList.prototype.reverse = function() {
        if (this.M <= 1) return;
        var t = this.H;
        var i = this.l;
        var r = 0;
        while (r << 1 < this.M) {
            var n = t.p;
            t.p = i.p;
            i.p = n;
            t = t.m;
            i = i.L;
            r += 1;
        }
    };
    LinkList.prototype.unique = function() {
        if (this.M <= 1) {
            return this.M;
        }
        var t = this.H;
        while (t !== this.h) {
            var i = t;
            while (i.m !== this.h && i.p === i.m.p) {
                i = i.m;
                this.M -= 1;
            }
            t.m = i.m;
            t.m.L = t;
            t = t.m;
        }
        return this.M;
    };
    LinkList.prototype.sort = function(t) {
        if (this.M <= 1) return;
        var i = [];
        this.forEach((function(t) {
            i.push(t);
        }));
        i.sort(t);
        var r = this.H;
        i.forEach((function(t) {
            r.p = t;
            r = r.m;
        }));
    };
    LinkList.prototype.merge = function(t) {
        var i = this;
        if (this.M === 0) {
            t.forEach((function(t) {
                i.pushBack(t);
            }));
        } else {
            var r = this.H;
            t.forEach((function(t) {
                while (r !== i.h && r.p <= t) {
                    r = r.m;
                }
                i.F(t, r.L);
            }));
        }
        return this.M;
    };
    LinkList.prototype.forEach = function(t) {
        var i = this.H;
        var r = 0;
        while (i !== this.h) {
            t(i.p, r++, this);
            i = i.m;
        }
    };
    LinkList.prototype[Symbol.iterator] = function() {
        return function() {
            var t;
            return __generator(this, (function(i) {
                switch (i.label) {
                  case 0:
                    if (this.M === 0) return [ 2 ];
                    t = this.H;
                    i.label = 1;

                  case 1:
                    if (!(t !== this.h)) return [ 3, 3 ];
                    return [ 4, t.p ];

                  case 2:
                    i.sent();
                    t = t.m;
                    return [ 3, 1 ];

                  case 3:
                    return [ 2 ];
                }
            }));
        }.bind(this)();
    };
    return LinkList;
}(SequentialContainer);

export default LinkList;
//# sourceMappingURL=LinkList.js.map

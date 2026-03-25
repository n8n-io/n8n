var __extends = this && this.t || function() {
    var extendStatics = function(t, r) {
        extendStatics = Object.setPrototypeOf || {
            __proto__: []
        } instanceof Array && function(t, r) {
            t.__proto__ = r;
        } || function(t, r) {
            for (var n in r) if (Object.prototype.hasOwnProperty.call(r, n)) t[n] = r[n];
        };
        return extendStatics(t, r);
    };
    return function(t, r) {
        if (typeof r !== "function" && r !== null) throw new TypeError("Class extends value " + String(r) + " is not a constructor or null");
        extendStatics(t, r);
        function __() {
            this.constructor = t;
        }
        t.prototype = r === null ? Object.create(r) : (__.prototype = r.prototype, new __);
    };
}();

var __generator = this && this.i || function(t, r) {
    var n = {
        label: 0,
        sent: function() {
            if (a[0] & 1) throw a[1];
            return a[1];
        },
        trys: [],
        ops: []
    }, e, i, a, s;
    return s = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (s[Symbol.iterator] = function() {
        return this;
    }), s;
    function verb(t) {
        return function(r) {
            return step([ t, r ]);
        };
    }
    function step(s) {
        if (e) throw new TypeError("Generator is already executing.");
        while (n) try {
            if (e = 1, i && (a = s[0] & 2 ? i["return"] : s[0] ? i["throw"] || ((a = i["return"]) && a.call(i), 
            0) : i.next) && !(a = a.call(i, s[1])).done) return a;
            if (i = 0, a) s = [ s[0] & 2, a.value ];
            switch (s[0]) {
              case 0:
              case 1:
                a = s;
                break;

              case 4:
                n.label++;
                return {
                    value: s[1],
                    done: false
                };

              case 5:
                n.label++;
                i = s[1];
                s = [ 0 ];
                continue;

              case 7:
                s = n.ops.pop();
                n.trys.pop();
                continue;

              default:
                if (!(a = n.trys, a = a.length > 0 && a[a.length - 1]) && (s[0] === 6 || s[0] === 2)) {
                    n = 0;
                    continue;
                }
                if (s[0] === 3 && (!a || s[1] > a[0] && s[1] < a[3])) {
                    n.label = s[1];
                    break;
                }
                if (s[0] === 6 && n.label < a[1]) {
                    n.label = a[1];
                    a = s;
                    break;
                }
                if (a && n.label < a[2]) {
                    n.label = a[2];
                    n.ops.push(s);
                    break;
                }
                if (a[2]) n.ops.pop();
                n.trys.pop();
                continue;
            }
            s = r.call(t, n);
        } catch (t) {
            s = [ 6, t ];
            i = 0;
        } finally {
            e = a = 0;
        }
        if (s[0] & 5) throw s[1];
        return {
            value: s[0] ? s[1] : void 0,
            done: true
        };
    }
};

import { HashContainer, HashContainerIterator } from "./Base";

import checkObject from "../../utils/checkObject";

import { throwIteratorAccessError } from "../../utils/throwError";

var HashMapIterator = function(t) {
    __extends(HashMapIterator, t);
    function HashMapIterator(r, n, e, i) {
        var a = t.call(this, r, n, i) || this;
        a.container = e;
        return a;
    }
    Object.defineProperty(HashMapIterator.prototype, "pointer", {
        get: function() {
            if (this.o === this.h) {
                throwIteratorAccessError();
            }
            var t = this;
            return new Proxy([], {
                get: function(r, n) {
                    if (n === "0") return t.o.u; else if (n === "1") return t.o.p;
                },
                set: function(r, n, e) {
                    if (n !== "1") {
                        throw new TypeError("props must be 1");
                    }
                    t.o.p = e;
                    return true;
                }
            });
        },
        enumerable: false,
        configurable: true
    });
    HashMapIterator.prototype.copy = function() {
        return new HashMapIterator(this.o, this.h, this.container, this.iteratorType);
    };
    return HashMapIterator;
}(HashContainerIterator);

var HashMap = function(t) {
    __extends(HashMap, t);
    function HashMap(r) {
        if (r === void 0) {
            r = [];
        }
        var n = t.call(this) || this;
        var e = n;
        r.forEach((function(t) {
            e.setElement(t[0], t[1]);
        }));
        return n;
    }
    HashMap.prototype.begin = function() {
        return new HashMapIterator(this.H, this.h, this);
    };
    HashMap.prototype.end = function() {
        return new HashMapIterator(this.h, this.h, this);
    };
    HashMap.prototype.rBegin = function() {
        return new HashMapIterator(this.l, this.h, this, 1);
    };
    HashMap.prototype.rEnd = function() {
        return new HashMapIterator(this.h, this.h, this, 1);
    };
    HashMap.prototype.front = function() {
        if (this.M === 0) return;
        return [ this.H.u, this.H.p ];
    };
    HashMap.prototype.back = function() {
        if (this.M === 0) return;
        return [ this.l.u, this.l.p ];
    };
    HashMap.prototype.setElement = function(t, r, n) {
        return this.v(t, r, n);
    };
    HashMap.prototype.getElementByKey = function(t, r) {
        if (r === undefined) r = checkObject(t);
        if (r) {
            var n = t[this.HASH_TAG];
            return n !== undefined ? this._[n].p : undefined;
        }
        var e = this.I[t];
        return e ? e.p : undefined;
    };
    HashMap.prototype.getElementByPos = function(t) {
        if (t < 0 || t > this.M - 1) {
            throw new RangeError;
        }
        var r = this.H;
        while (t--) {
            r = r.m;
        }
        return [ r.u, r.p ];
    };
    HashMap.prototype.find = function(t, r) {
        var n = this.g(t, r);
        return new HashMapIterator(n, this.h, this);
    };
    HashMap.prototype.forEach = function(t) {
        var r = 0;
        var n = this.H;
        while (n !== this.h) {
            t([ n.u, n.p ], r++, this);
            n = n.m;
        }
    };
    HashMap.prototype[Symbol.iterator] = function() {
        return function() {
            var t;
            return __generator(this, (function(r) {
                switch (r.label) {
                  case 0:
                    t = this.H;
                    r.label = 1;

                  case 1:
                    if (!(t !== this.h)) return [ 3, 3 ];
                    return [ 4, [ t.u, t.p ] ];

                  case 2:
                    r.sent();
                    t = t.m;
                    return [ 3, 1 ];

                  case 3:
                    return [ 2 ];
                }
            }));
        }.bind(this)();
    };
    return HashMap;
}(HashContainer);

export default HashMap;
//# sourceMappingURL=HashMap.js.map

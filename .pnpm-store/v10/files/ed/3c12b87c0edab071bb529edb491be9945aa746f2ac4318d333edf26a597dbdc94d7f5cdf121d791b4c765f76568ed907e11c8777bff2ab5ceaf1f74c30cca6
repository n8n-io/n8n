var __extends = this && this.t || function() {
    var extendStatics = function(t, r) {
        extendStatics = Object.setPrototypeOf || {
            __proto__: []
        } instanceof Array && function(t, r) {
            t.__proto__ = r;
        } || function(t, r) {
            for (var e in r) if (Object.prototype.hasOwnProperty.call(r, e)) t[e] = r[e];
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
    var e = {
        label: 0,
        sent: function() {
            if (s[0] & 1) throw s[1];
            return s[1];
        },
        trys: [],
        ops: []
    }, n, i, s, a;
    return a = {
        next: verb(0),
        throw: verb(1),
        return: verb(2)
    }, typeof Symbol === "function" && (a[Symbol.iterator] = function() {
        return this;
    }), a;
    function verb(t) {
        return function(r) {
            return step([ t, r ]);
        };
    }
    function step(a) {
        if (n) throw new TypeError("Generator is already executing.");
        while (e) try {
            if (n = 1, i && (s = a[0] & 2 ? i["return"] : a[0] ? i["throw"] || ((s = i["return"]) && s.call(i), 
            0) : i.next) && !(s = s.call(i, a[1])).done) return s;
            if (i = 0, s) a = [ a[0] & 2, s.value ];
            switch (a[0]) {
              case 0:
              case 1:
                s = a;
                break;

              case 4:
                e.label++;
                return {
                    value: a[1],
                    done: false
                };

              case 5:
                e.label++;
                i = a[1];
                a = [ 0 ];
                continue;

              case 7:
                a = e.ops.pop();
                e.trys.pop();
                continue;

              default:
                if (!(s = e.trys, s = s.length > 0 && s[s.length - 1]) && (a[0] === 6 || a[0] === 2)) {
                    e = 0;
                    continue;
                }
                if (a[0] === 3 && (!s || a[1] > s[0] && a[1] < s[3])) {
                    e.label = a[1];
                    break;
                }
                if (a[0] === 6 && e.label < s[1]) {
                    e.label = s[1];
                    s = a;
                    break;
                }
                if (s && e.label < s[2]) {
                    e.label = s[2];
                    e.ops.push(a);
                    break;
                }
                if (s[2]) e.ops.pop();
                e.trys.pop();
                continue;
            }
            a = r.call(t, e);
        } catch (t) {
            a = [ 6, t ];
            i = 0;
        } finally {
            n = s = 0;
        }
        if (a[0] & 5) throw a[1];
        return {
            value: a[0] ? a[1] : void 0,
            done: true
        };
    }
};

import { HashContainer, HashContainerIterator } from "./Base";

import { throwIteratorAccessError } from "../../utils/throwError";

var HashSetIterator = function(t) {
    __extends(HashSetIterator, t);
    function HashSetIterator(r, e, n, i) {
        var s = t.call(this, r, e, i) || this;
        s.container = n;
        return s;
    }
    Object.defineProperty(HashSetIterator.prototype, "pointer", {
        get: function() {
            if (this.o === this.h) {
                throwIteratorAccessError();
            }
            return this.o.u;
        },
        enumerable: false,
        configurable: true
    });
    HashSetIterator.prototype.copy = function() {
        return new HashSetIterator(this.o, this.h, this.container, this.iteratorType);
    };
    return HashSetIterator;
}(HashContainerIterator);

var HashSet = function(t) {
    __extends(HashSet, t);
    function HashSet(r) {
        if (r === void 0) {
            r = [];
        }
        var e = t.call(this) || this;
        var n = e;
        r.forEach((function(t) {
            n.insert(t);
        }));
        return e;
    }
    HashSet.prototype.begin = function() {
        return new HashSetIterator(this.H, this.h, this);
    };
    HashSet.prototype.end = function() {
        return new HashSetIterator(this.h, this.h, this);
    };
    HashSet.prototype.rBegin = function() {
        return new HashSetIterator(this.l, this.h, this, 1);
    };
    HashSet.prototype.rEnd = function() {
        return new HashSetIterator(this.h, this.h, this, 1);
    };
    HashSet.prototype.front = function() {
        return this.H.u;
    };
    HashSet.prototype.back = function() {
        return this.l.u;
    };
    HashSet.prototype.insert = function(t, r) {
        return this.v(t, undefined, r);
    };
    HashSet.prototype.getElementByPos = function(t) {
        if (t < 0 || t > this.M - 1) {
            throw new RangeError;
        }
        var r = this.H;
        while (t--) {
            r = r.m;
        }
        return r.u;
    };
    HashSet.prototype.find = function(t, r) {
        var e = this.g(t, r);
        return new HashSetIterator(e, this.h, this);
    };
    HashSet.prototype.forEach = function(t) {
        var r = 0;
        var e = this.H;
        while (e !== this.h) {
            t(e.u, r++, this);
            e = e.m;
        }
    };
    HashSet.prototype[Symbol.iterator] = function() {
        return function() {
            var t;
            return __generator(this, (function(r) {
                switch (r.label) {
                  case 0:
                    t = this.H;
                    r.label = 1;

                  case 1:
                    if (!(t !== this.h)) return [ 3, 3 ];
                    return [ 4, t.u ];

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
    return HashSet;
}(HashContainer);

export default HashSet;
//# sourceMappingURL=HashSet.js.map

var __extends = this && this.t || function() {
    var extendStatics = function(t, i) {
        extendStatics = Object.setPrototypeOf || {
            __proto__: []
        } instanceof Array && function(t, i) {
            t.__proto__ = i;
        } || function(t, i) {
            for (var n in i) if (Object.prototype.hasOwnProperty.call(i, n)) t[n] = i[n];
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

import { Base } from "../ContainerBase";

var Queue = function(t) {
    __extends(Queue, t);
    function Queue(i) {
        if (i === void 0) {
            i = [];
        }
        var n = t.call(this) || this;
        n.A = 0;
        n.tt = [];
        var e = n;
        i.forEach((function(t) {
            e.push(t);
        }));
        return n;
    }
    Queue.prototype.clear = function() {
        this.tt = [];
        this.M = this.A = 0;
    };
    Queue.prototype.push = function(t) {
        var i = this.tt.length;
        if (this.A / i > .5 && this.A + this.M >= i && i > 4096) {
            var n = this.M;
            for (var e = 0; e < n; ++e) {
                this.tt[e] = this.tt[this.A + e];
            }
            this.A = 0;
            this.tt[this.M] = t;
        } else this.tt[this.A + this.M] = t;
        return ++this.M;
    };
    Queue.prototype.pop = function() {
        if (this.M === 0) return;
        var t = this.tt[this.A++];
        this.M -= 1;
        return t;
    };
    Queue.prototype.front = function() {
        if (this.M === 0) return;
        return this.tt[this.A];
    };
    return Queue;
}(Base);

export default Queue;
//# sourceMappingURL=Queue.js.map

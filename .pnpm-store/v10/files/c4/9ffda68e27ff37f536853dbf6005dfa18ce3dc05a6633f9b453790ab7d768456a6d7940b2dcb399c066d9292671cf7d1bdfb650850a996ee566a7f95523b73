var __extends = this && this.t || function() {
    var extendStatics = function(e, n) {
        extendStatics = Object.setPrototypeOf || {
            __proto__: []
        } instanceof Array && function(e, n) {
            e.__proto__ = n;
        } || function(e, n) {
            for (var t in n) if (Object.prototype.hasOwnProperty.call(n, t)) e[t] = n[t];
        };
        return extendStatics(e, n);
    };
    return function(e, n) {
        if (typeof n !== "function" && n !== null) throw new TypeError("Class extends value " + String(n) + " is not a constructor or null");
        extendStatics(e, n);
        function __() {
            this.constructor = e;
        }
        e.prototype = n === null ? Object.create(n) : (__.prototype = n.prototype, new __);
    };
}();

var TreeNode = function() {
    function TreeNode(e, n) {
        this.ee = 1;
        this.u = undefined;
        this.p = undefined;
        this.K = undefined;
        this.N = undefined;
        this.rr = undefined;
        this.u = e;
        this.p = n;
    }
    TreeNode.prototype.L = function() {
        var e = this;
        if (e.ee === 1 && e.rr.rr === e) {
            e = e.N;
        } else if (e.K) {
            e = e.K;
            while (e.N) {
                e = e.N;
            }
        } else {
            var n = e.rr;
            while (n.K === e) {
                e = n;
                n = e.rr;
            }
            e = n;
        }
        return e;
    };
    TreeNode.prototype.m = function() {
        var e = this;
        if (e.N) {
            e = e.N;
            while (e.K) {
                e = e.K;
            }
            return e;
        } else {
            var n = e.rr;
            while (n.N === e) {
                e = n;
                n = e.rr;
            }
            if (e.N !== n) {
                return n;
            } else return e;
        }
    };
    TreeNode.prototype.ne = function() {
        var e = this.rr;
        var n = this.N;
        var t = n.K;
        if (e.rr === this) e.rr = n; else if (e.K === this) e.K = n; else e.N = n;
        n.rr = e;
        n.K = this;
        this.rr = n;
        this.N = t;
        if (t) t.rr = this;
        return n;
    };
    TreeNode.prototype.te = function() {
        var e = this.rr;
        var n = this.K;
        var t = n.N;
        if (e.rr === this) e.rr = n; else if (e.K === this) e.K = n; else e.N = n;
        n.rr = e;
        n.N = this;
        this.rr = n;
        this.K = t;
        if (t) t.rr = this;
        return n;
    };
    return TreeNode;
}();

export { TreeNode };

var TreeNodeEnableIndex = function(e) {
    __extends(TreeNodeEnableIndex, e);
    function TreeNodeEnableIndex() {
        var n = e !== null && e.apply(this, arguments) || this;
        n.tr = 1;
        return n;
    }
    TreeNodeEnableIndex.prototype.ne = function() {
        var n = e.prototype.ne.call(this);
        this.ie();
        n.ie();
        return n;
    };
    TreeNodeEnableIndex.prototype.te = function() {
        var n = e.prototype.te.call(this);
        this.ie();
        n.ie();
        return n;
    };
    TreeNodeEnableIndex.prototype.ie = function() {
        this.tr = 1;
        if (this.K) {
            this.tr += this.K.tr;
        }
        if (this.N) {
            this.tr += this.N.tr;
        }
    };
    return TreeNodeEnableIndex;
}(TreeNode);

export { TreeNodeEnableIndex };
//# sourceMappingURL=TreeNode.js.map

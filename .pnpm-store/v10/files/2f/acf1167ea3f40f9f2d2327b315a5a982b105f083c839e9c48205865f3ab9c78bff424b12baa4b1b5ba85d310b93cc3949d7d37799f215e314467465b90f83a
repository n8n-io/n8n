"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var TsMap = (function () {
    // Accept an optional parameter,
    // The parameter's type:
    // [
    //   [K, V], [K, V], ...
    // ]
    function TsMap(intrator) {
        // Used to store keys.
        this.keyStore = [];
        // Used to store values.
        this.valueStore = [];
        // The Map's size,
        // increase at function set,
        // decrease at function remove,
        // clear at function clear.
        this.size = 0;
        if (intrator) {
            for (var _i = 0, intrator_1 = intrator; _i < intrator_1.length; _i++) {
                var item = intrator_1[_i];
                this.keyStore.push(item[0]);
                this.valueStore.push(item[1]);
                this.size++;
            }
        }
    }
    // set a key-value to Map,
    // return this to chain called.
    TsMap.prototype.set = function (k, v) {
        var existed = false;
        var ks = this.keyStore;
        var vs = this.valueStore;
        // if key is existed, replace it.
        for (var i = ks.length; i > -1; i--) {
            if (ks[i] === k) {
                vs[i] = v;
                existed = true;
            }
        }
        if (!existed) {
            this.keyStore.push(k);
            this.valueStore.push(v);
            this.size++;
        }
        return this;
    };
    // Return the value of the corresponding key,
    // if dosn't has, return undefind.
    TsMap.prototype.get = function (k) {
        var ks = this.keyStore;
        for (var i = ks.length; i > -1; i--) {
            if (ks[i] === k) {
                return this.valueStore[i];
            }
        }
        return undefined;
    };
    // Determine if a key is included.
    TsMap.prototype.has = function (k) {
        var ks = this.keyStore;
        for (var i = ks.length; i > -1; i--) {
            if (ks[i] === k) {
                return true;
            }
        }
        return false;
    };
    // Delete all the corresponding keys and its value,
    // if detele success, return true.
    // else return false.
    TsMap.prototype.delete = function (k) {
        var ks = this.keyStore;
        var len = ks.length;
        var deleteFlag = false;
        while (len--) {
            if (ks[len] === k) {
                ks.splice(len, 1);
                this.size--;
                deleteFlag = true;
            }
        }
        return deleteFlag;
    };
    // Empty the Map.
    TsMap.prototype.clear = function () {
        this.keyStore.splice(0, this.size);
        this.valueStore.splice(0, this.size);
        this.size = 0;
    };
    // return all Map's key.
    TsMap.prototype.keys = function () {
        return this.keyStore;
    };
    // return all Map's value.
    TsMap.prototype.values = function () {
        return this.valueStore;
    };
    // return all Map's key-value.
    TsMap.prototype.entries = function () {
        var entries = [];
        var ks = this.keyStore;
        var vs = this.valueStore;
        for (var i = 0; i < this.size; i++) {
            entries.push([ks[i], vs[i]]);
        }
        return entries;
    };
    // Traversal the Map,
    // Accept two parameters, first is a callback, second is a optional context.
    // callback function accepts 3 optional params.
    // first is value, second is key, last is the map
    TsMap.prototype.forEach = function (cb, context) {
        var size = this.size;
        var ks = this.keyStore;
        var vs = this.valueStore;
        for (var i = 0; i < size; i++) {
            cb.bind(context || this)(vs[i], ks[i], this);
        }
    };
    return TsMap;
}());
exports.default = TsMap;
//# sourceMappingURL=ts-map.js.map
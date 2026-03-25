import {
  __commonJS,
  __require
} from "./chunk-A242L54C.js";

// ../node_modules/memoizerific/memoizerific.js
var require_memoizerific = __commonJS({
  "../node_modules/memoizerific/memoizerific.js"(exports, module) {
    (function(f) {
      if (typeof exports == "object" && typeof module < "u")
        module.exports = f();
      else if (typeof define == "function" && define.amd)
        define([], f);
      else {
        var g;
        typeof window < "u" ? g = window : typeof global < "u" ? g = global : typeof self < "u" ? g = self : g = this, g.memoizerific = f();
      }
    })(function() {
      var define2, module2, exports2;
      return (function e(t, n, r) {
        function s(o2, u) {
          if (!n[o2]) {
            if (!t[o2]) {
              var a = typeof __require == "function" && __require;
              if (!u && a) return a(o2, !0);
              if (i) return i(o2, !0);
              var f = new Error("Cannot find module '" + o2 + "'");
              throw f.code = "MODULE_NOT_FOUND", f;
            }
            var l = n[o2] = { exports: {} };
            t[o2][0].call(l.exports, function(e2) {
              var n2 = t[o2][1][e2];
              return s(n2 || e2);
            }, l, l.exports, e, t, n, r);
          }
          return n[o2].exports;
        }
        for (var i = typeof __require == "function" && __require, o = 0; o < r.length; o++) s(r[o]);
        return s;
      })({ 1: [function(_dereq_, module3, exports3) {
        module3.exports = function(forceSimilar) {
          if (typeof Map != "function" || forceSimilar) {
            var Similar = _dereq_("./similar");
            return new Similar();
          } else
            return /* @__PURE__ */ new Map();
        };
      }, { "./similar": 2 }], 2: [function(_dereq_, module3, exports3) {
        function Similar() {
          return this.list = [], this.lastItem = void 0, this.size = 0, this;
        }
        Similar.prototype.get = function(key) {
          var index;
          if (this.lastItem && this.isEqual(this.lastItem.key, key))
            return this.lastItem.val;
          if (index = this.indexOf(key), index >= 0)
            return this.lastItem = this.list[index], this.list[index].val;
        }, Similar.prototype.set = function(key, val) {
          var index;
          return this.lastItem && this.isEqual(this.lastItem.key, key) ? (this.lastItem.val = val, this) : (index = this.indexOf(key), index >= 0 ? (this.lastItem = this.list[index], this.list[index].val = val, this) : (this.lastItem = { key, val }, this.list.push(this.lastItem), this.size++, this));
        }, Similar.prototype.delete = function(key) {
          var index;
          if (this.lastItem && this.isEqual(this.lastItem.key, key) && (this.lastItem = void 0), index = this.indexOf(key), index >= 0)
            return this.size--, this.list.splice(index, 1)[0];
        }, Similar.prototype.has = function(key) {
          var index;
          return this.lastItem && this.isEqual(this.lastItem.key, key) ? !0 : (index = this.indexOf(key), index >= 0 ? (this.lastItem = this.list[index], !0) : !1);
        }, Similar.prototype.forEach = function(callback, thisArg) {
          var i;
          for (i = 0; i < this.size; i++)
            callback.call(thisArg || this, this.list[i].val, this.list[i].key, this);
        }, Similar.prototype.indexOf = function(key) {
          var i;
          for (i = 0; i < this.size; i++)
            if (this.isEqual(this.list[i].key, key))
              return i;
          return -1;
        }, Similar.prototype.isEqual = function(val1, val2) {
          return val1 === val2 || val1 !== val1 && val2 !== val2;
        }, module3.exports = Similar;
      }, {}], 3: [function(_dereq_, module3, exports3) {
        var MapOrSimilar = _dereq_("map-or-similar");
        module3.exports = function(limit) {
          var cache = new MapOrSimilar(!1), lru = [];
          return function(fn) {
            var memoizerific = function() {
              var currentCache = cache, newMap, fnResult, argsLengthMinusOne = arguments.length - 1, lruPath = Array(argsLengthMinusOne + 1), isMemoized = !0, i;
              if ((memoizerific.numArgs || memoizerific.numArgs === 0) && memoizerific.numArgs !== argsLengthMinusOne + 1)
                throw new Error("Memoizerific functions should always be called with the same number of arguments");
              for (i = 0; i < argsLengthMinusOne; i++) {
                if (lruPath[i] = {
                  cacheItem: currentCache,
                  arg: arguments[i]
                }, currentCache.has(arguments[i])) {
                  currentCache = currentCache.get(arguments[i]);
                  continue;
                }
                isMemoized = !1, newMap = new MapOrSimilar(!1), currentCache.set(arguments[i], newMap), currentCache = newMap;
              }
              return isMemoized && (currentCache.has(arguments[argsLengthMinusOne]) ? fnResult = currentCache.get(arguments[argsLengthMinusOne]) : isMemoized = !1), isMemoized || (fnResult = fn.apply(null, arguments), currentCache.set(arguments[argsLengthMinusOne], fnResult)), limit > 0 && (lruPath[argsLengthMinusOne] = {
                cacheItem: currentCache,
                arg: arguments[argsLengthMinusOne]
              }, isMemoized ? moveToMostRecentLru(lru, lruPath) : lru.push(lruPath), lru.length > limit && removeCachedResult(lru.shift())), memoizerific.wasMemoized = isMemoized, memoizerific.numArgs = argsLengthMinusOne + 1, fnResult;
            };
            return memoizerific.limit = limit, memoizerific.wasMemoized = !1, memoizerific.cache = cache, memoizerific.lru = lru, memoizerific;
          };
        };
        function moveToMostRecentLru(lru, lruPath) {
          var lruLen = lru.length, lruPathLen = lruPath.length, isMatch, i, ii;
          for (i = 0; i < lruLen; i++) {
            for (isMatch = !0, ii = 0; ii < lruPathLen; ii++)
              if (!isEqual(lru[i][ii].arg, lruPath[ii].arg)) {
                isMatch = !1;
                break;
              }
            if (isMatch)
              break;
          }
          lru.push(lru.splice(i, 1)[0]);
        }
        function removeCachedResult(removedLru) {
          var removedLruLen = removedLru.length, currentLru = removedLru[removedLruLen - 1], tmp, i;
          for (currentLru.cacheItem.delete(currentLru.arg), i = removedLruLen - 2; i >= 0 && (currentLru = removedLru[i], tmp = currentLru.cacheItem.get(currentLru.arg), !tmp || !tmp.size); i--)
            currentLru.cacheItem.delete(currentLru.arg);
        }
        function isEqual(val1, val2) {
          return val1 === val2 || val1 !== val1 && val2 !== val2;
        }
      }, { "map-or-similar": 1 }] }, {}, [3])(3);
    });
  }
});

export {
  require_memoizerific
};

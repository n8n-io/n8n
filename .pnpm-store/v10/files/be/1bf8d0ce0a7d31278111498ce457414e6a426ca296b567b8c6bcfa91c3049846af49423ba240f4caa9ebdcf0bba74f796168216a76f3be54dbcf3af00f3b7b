var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf, __hasOwnProp = Object.prototype.hasOwnProperty;
var __require = /* @__PURE__ */ ((x2) => typeof require < "u" ? require : typeof Proxy < "u" ? new Proxy(x2, {
  get: (a2, b2) => (typeof require < "u" ? require : a2)[b2]
}) : x2)(function(x2) {
  if (typeof require < "u") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x2 + '" is not supported');
});
var __commonJS = (cb, mod) => function() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: !0 });
}, __copyProps = (to, from, except, desc) => {
  if (from && typeof from == "object" || typeof from == "function")
    for (let key of __getOwnPropNames(from))
      !__hasOwnProp.call(to, key) && key !== except && __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: !0 }) : target,
  mod
));

// ../node_modules/prop-types/lib/ReactPropTypesSecret.js
var require_ReactPropTypesSecret = __commonJS({
  "../node_modules/prop-types/lib/ReactPropTypesSecret.js"(exports, module) {
    "use strict";
    var ReactPropTypesSecret = "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED";
    module.exports = ReactPropTypesSecret;
  }
});

// ../node_modules/prop-types/factoryWithThrowingShims.js
var require_factoryWithThrowingShims = __commonJS({
  "../node_modules/prop-types/factoryWithThrowingShims.js"(exports, module) {
    "use strict";
    var ReactPropTypesSecret = require_ReactPropTypesSecret();
    function emptyFunction() {
    }
    function emptyFunctionWithReset() {
    }
    emptyFunctionWithReset.resetWarningCache = emptyFunction;
    module.exports = function() {
      function shim(props, propName, componentName, location2, propFullName, secret) {
        if (secret !== ReactPropTypesSecret) {
          var err = new Error(
            "Calling PropTypes validators directly is not supported by the `prop-types` package. Use PropTypes.checkPropTypes() to call them. Read more at http://fb.me/use-check-prop-types"
          );
          throw err.name = "Invariant Violation", err;
        }
      }
      shim.isRequired = shim;
      function getShim() {
        return shim;
      }
      var ReactPropTypes = {
        array: shim,
        bigint: shim,
        bool: shim,
        func: shim,
        number: shim,
        object: shim,
        string: shim,
        symbol: shim,
        any: shim,
        arrayOf: getShim,
        element: shim,
        elementType: shim,
        instanceOf: getShim,
        node: shim,
        objectOf: getShim,
        oneOf: getShim,
        oneOfType: getShim,
        shape: getShim,
        exact: getShim,
        checkPropTypes: emptyFunctionWithReset,
        resetWarningCache: emptyFunction
      };
      return ReactPropTypes.PropTypes = ReactPropTypes, ReactPropTypes;
    };
  }
});

// ../node_modules/prop-types/index.js
var require_prop_types = __commonJS({
  "../node_modules/prop-types/index.js"(exports, module) {
    module.exports = require_factoryWithThrowingShims()();
    var ReactIs, throwOnDirectAccess;
  }
});

// ../node_modules/react-fast-compare/index.js
var require_react_fast_compare = __commonJS({
  "../node_modules/react-fast-compare/index.js"(exports, module) {
    var hasElementType = typeof Element < "u", hasMap = typeof Map == "function", hasSet = typeof Set == "function", hasArrayBuffer = typeof ArrayBuffer == "function" && !!ArrayBuffer.isView;
    function equal4(a2, b2) {
      if (a2 === b2) return !0;
      if (a2 && b2 && typeof a2 == "object" && typeof b2 == "object") {
        if (a2.constructor !== b2.constructor) return !1;
        var length, i2, keys;
        if (Array.isArray(a2)) {
          if (length = a2.length, length != b2.length) return !1;
          for (i2 = length; i2-- !== 0; )
            if (!equal4(a2[i2], b2[i2])) return !1;
          return !0;
        }
        var it;
        if (hasMap && a2 instanceof Map && b2 instanceof Map) {
          if (a2.size !== b2.size) return !1;
          for (it = a2.entries(); !(i2 = it.next()).done; )
            if (!b2.has(i2.value[0])) return !1;
          for (it = a2.entries(); !(i2 = it.next()).done; )
            if (!equal4(i2.value[1], b2.get(i2.value[0]))) return !1;
          return !0;
        }
        if (hasSet && a2 instanceof Set && b2 instanceof Set) {
          if (a2.size !== b2.size) return !1;
          for (it = a2.entries(); !(i2 = it.next()).done; )
            if (!b2.has(i2.value[0])) return !1;
          return !0;
        }
        if (hasArrayBuffer && ArrayBuffer.isView(a2) && ArrayBuffer.isView(b2)) {
          if (length = a2.length, length != b2.length) return !1;
          for (i2 = length; i2-- !== 0; )
            if (a2[i2] !== b2[i2]) return !1;
          return !0;
        }
        if (a2.constructor === RegExp) return a2.source === b2.source && a2.flags === b2.flags;
        if (a2.valueOf !== Object.prototype.valueOf && typeof a2.valueOf == "function" && typeof b2.valueOf == "function") return a2.valueOf() === b2.valueOf();
        if (a2.toString !== Object.prototype.toString && typeof a2.toString == "function" && typeof b2.toString == "function") return a2.toString() === b2.toString();
        if (keys = Object.keys(a2), length = keys.length, length !== Object.keys(b2).length) return !1;
        for (i2 = length; i2-- !== 0; )
          if (!Object.prototype.hasOwnProperty.call(b2, keys[i2])) return !1;
        if (hasElementType && a2 instanceof Element) return !1;
        for (i2 = length; i2-- !== 0; )
          if (!((keys[i2] === "_owner" || keys[i2] === "__v" || keys[i2] === "__o") && a2.$$typeof) && !equal4(a2[keys[i2]], b2[keys[i2]]))
            return !1;
        return !0;
      }
      return a2 !== a2 && b2 !== b2;
    }
    module.exports = function(a2, b2) {
      try {
        return equal4(a2, b2);
      } catch (error) {
        if ((error.message || "").match(/stack|recursion/i))
          return console.warn("react-fast-compare cannot handle circular refs"), !1;
        throw error;
      }
    };
  }
});

// ../node_modules/invariant/browser.js
var require_browser = __commonJS({
  "../node_modules/invariant/browser.js"(exports, module) {
    "use strict";
    var invariant = function(condition, format, a2, b2, c2, d2, e2, f2) {
      if (!condition) {
        var error;
        if (format === void 0)
          error = new Error(
            "Minified exception occurred; use the non-minified dev environment for the full error message and additional helpful warnings."
          );
        else {
          var args = [a2, b2, c2, d2, e2, f2], argIndex = 0;
          error = new Error(
            format.replace(/%s/g, function() {
              return args[argIndex++];
            })
          ), error.name = "Invariant Violation";
        }
        throw error.framesToPop = 1, error;
      }
    };
    module.exports = invariant;
  }
});

// ../node_modules/shallowequal/index.js
var require_shallowequal = __commonJS({
  "../node_modules/shallowequal/index.js"(exports, module) {
    module.exports = function(objA, objB, compare, compareContext) {
      var ret = compare ? compare.call(compareContext, objA, objB) : void 0;
      if (ret !== void 0)
        return !!ret;
      if (objA === objB)
        return !0;
      if (typeof objA != "object" || !objA || typeof objB != "object" || !objB)
        return !1;
      var keysA = Object.keys(objA), keysB = Object.keys(objB);
      if (keysA.length !== keysB.length)
        return !1;
      for (var bHasOwnProperty = Object.prototype.hasOwnProperty.bind(objB), idx = 0; idx < keysA.length; idx++) {
        var key = keysA[idx];
        if (!bHasOwnProperty(key))
          return !1;
        var valueA = objA[key], valueB = objB[key];
        if (ret = compare ? compare.call(compareContext, valueA, valueB, key) : void 0, ret === !1 || ret === void 0 && valueA !== valueB)
          return !1;
      }
      return !0;
    };
  }
});

// ../node_modules/memoizerific/memoizerific.js
var require_memoizerific = __commonJS({
  "../node_modules/memoizerific/memoizerific.js"(exports, module) {
    (function(f2) {
      if (typeof exports == "object" && typeof module < "u")
        module.exports = f2();
      else if (typeof define == "function" && define.amd)
        define([], f2);
      else {
        var g2;
        typeof window < "u" ? g2 = window : typeof global < "u" ? g2 = global : typeof self < "u" ? g2 = self : g2 = this, g2.memoizerific = f2();
      }
    })(function() {
      var define2, module2, exports2;
      return (function e2(t2, n3, r3) {
        function s2(o4, u2) {
          if (!n3[o4]) {
            if (!t2[o4]) {
              var a2 = typeof __require == "function" && __require;
              if (!u2 && a2) return a2(o4, !0);
              if (i2) return i2(o4, !0);
              var f2 = new Error("Cannot find module '" + o4 + "'");
              throw f2.code = "MODULE_NOT_FOUND", f2;
            }
            var l3 = n3[o4] = { exports: {} };
            t2[o4][0].call(l3.exports, function(e3) {
              var n4 = t2[o4][1][e3];
              return s2(n4 || e3);
            }, l3, l3.exports, e2, t2, n3, r3);
          }
          return n3[o4].exports;
        }
        for (var i2 = typeof __require == "function" && __require, o3 = 0; o3 < r3.length; o3++) s2(r3[o3]);
        return s2;
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
          var i2;
          for (i2 = 0; i2 < this.size; i2++)
            callback.call(thisArg || this, this.list[i2].val, this.list[i2].key, this);
        }, Similar.prototype.indexOf = function(key) {
          var i2;
          for (i2 = 0; i2 < this.size; i2++)
            if (this.isEqual(this.list[i2].key, key))
              return i2;
          return -1;
        }, Similar.prototype.isEqual = function(val1, val2) {
          return val1 === val2 || val1 !== val1 && val2 !== val2;
        }, module3.exports = Similar;
      }, {}], 3: [function(_dereq_, module3, exports3) {
        var MapOrSimilar = _dereq_("map-or-similar");
        module3.exports = function(limit) {
          var cache = new MapOrSimilar(!1), lru = [];
          return function(fn) {
            var memoizerific3 = function() {
              var currentCache = cache, newMap, fnResult, argsLengthMinusOne = arguments.length - 1, lruPath = Array(argsLengthMinusOne + 1), isMemoized = !0, i2;
              if ((memoizerific3.numArgs || memoizerific3.numArgs === 0) && memoizerific3.numArgs !== argsLengthMinusOne + 1)
                throw new Error("Memoizerific functions should always be called with the same number of arguments");
              for (i2 = 0; i2 < argsLengthMinusOne; i2++) {
                if (lruPath[i2] = {
                  cacheItem: currentCache,
                  arg: arguments[i2]
                }, currentCache.has(arguments[i2])) {
                  currentCache = currentCache.get(arguments[i2]);
                  continue;
                }
                isMemoized = !1, newMap = new MapOrSimilar(!1), currentCache.set(arguments[i2], newMap), currentCache = newMap;
              }
              return isMemoized && (currentCache.has(arguments[argsLengthMinusOne]) ? fnResult = currentCache.get(arguments[argsLengthMinusOne]) : isMemoized = !1), isMemoized || (fnResult = fn.apply(null, arguments), currentCache.set(arguments[argsLengthMinusOne], fnResult)), limit > 0 && (lruPath[argsLengthMinusOne] = {
                cacheItem: currentCache,
                arg: arguments[argsLengthMinusOne]
              }, isMemoized ? moveToMostRecentLru(lru, lruPath) : lru.push(lruPath), lru.length > limit && removeCachedResult(lru.shift())), memoizerific3.wasMemoized = isMemoized, memoizerific3.numArgs = argsLengthMinusOne + 1, fnResult;
            };
            return memoizerific3.limit = limit, memoizerific3.wasMemoized = !1, memoizerific3.cache = cache, memoizerific3.lru = lru, memoizerific3;
          };
        };
        function moveToMostRecentLru(lru, lruPath) {
          var lruLen = lru.length, lruPathLen = lruPath.length, isMatch, i2, ii;
          for (i2 = 0; i2 < lruLen; i2++) {
            for (isMatch = !0, ii = 0; ii < lruPathLen; ii++)
              if (!isEqual(lru[i2][ii].arg, lruPath[ii].arg)) {
                isMatch = !1;
                break;
              }
            if (isMatch)
              break;
          }
          lru.push(lru.splice(i2, 1)[0]);
        }
        function removeCachedResult(removedLru) {
          var removedLruLen = removedLru.length, currentLru = removedLru[removedLruLen - 1], tmp, i2;
          for (currentLru.cacheItem.delete(currentLru.arg), i2 = removedLruLen - 2; i2 >= 0 && (currentLru = removedLru[i2], tmp = currentLru.cacheItem.get(currentLru.arg), !tmp || !tmp.size); i2--)
            currentLru.cacheItem.delete(currentLru.arg);
        }
        function isEqual(val1, val2) {
          return val1 === val2 || val1 !== val1 && val2 !== val2;
        }
      }, { "map-or-similar": 1 }] }, {}, [3])(3);
    });
  }
});

// ../node_modules/picoquery/lib/string-util.js
var require_string_util = __commonJS({
  "../node_modules/picoquery/lib/string-util.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.encodeString = encodeString;
    var hexTable = Array.from({ length: 256 }, (_2, i2) => "%" + ((i2 < 16 ? "0" : "") + i2.toString(16)).toUpperCase()), noEscape = new Int8Array([
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      0,
      0,
      1,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      0,
      1,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      0,
      0,
      0,
      1,
      0
    ]);
    function encodeString(str) {
      let len = str.length;
      if (len === 0)
        return "";
      let out = "", lastPos = 0, i2 = 0;
      outer: for (; i2 < len; i2++) {
        let c2 = str.charCodeAt(i2);
        for (; c2 < 128; ) {
          if (noEscape[c2] !== 1 && (lastPos < i2 && (out += str.slice(lastPos, i2)), lastPos = i2 + 1, out += hexTable[c2]), ++i2 === len)
            break outer;
          c2 = str.charCodeAt(i2);
        }
        if (lastPos < i2 && (out += str.slice(lastPos, i2)), c2 < 2048) {
          lastPos = i2 + 1, out += hexTable[192 | c2 >> 6] + hexTable[128 | c2 & 63];
          continue;
        }
        if (c2 < 55296 || c2 >= 57344) {
          lastPos = i2 + 1, out += hexTable[224 | c2 >> 12] + hexTable[128 | c2 >> 6 & 63] + hexTable[128 | c2 & 63];
          continue;
        }
        if (++i2, i2 >= len)
          throw new Error("URI malformed");
        let c22 = str.charCodeAt(i2) & 1023;
        lastPos = i2 + 1, c2 = 65536 + ((c2 & 1023) << 10 | c22), out += hexTable[240 | c2 >> 18] + hexTable[128 | c2 >> 12 & 63] + hexTable[128 | c2 >> 6 & 63] + hexTable[128 | c2 & 63];
      }
      return lastPos === 0 ? str : lastPos < len ? out + str.slice(lastPos) : out;
    }
  }
});

// ../node_modules/picoquery/lib/shared.js
var require_shared = __commonJS({
  "../node_modules/picoquery/lib/shared.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.defaultOptions = exports.defaultShouldSerializeObject = exports.defaultValueSerializer = void 0;
    var string_util_js_1 = require_string_util(), defaultValueSerializer = (value) => {
      switch (typeof value) {
        case "string":
          return (0, string_util_js_1.encodeString)(value);
        case "bigint":
        case "boolean":
          return "" + value;
        case "number":
          if (Number.isFinite(value))
            return value < 1e21 ? "" + value : (0, string_util_js_1.encodeString)("" + value);
          break;
      }
      return value instanceof Date ? (0, string_util_js_1.encodeString)(value.toISOString()) : "";
    };
    exports.defaultValueSerializer = defaultValueSerializer;
    var defaultShouldSerializeObject = (val) => val instanceof Date;
    exports.defaultShouldSerializeObject = defaultShouldSerializeObject;
    var identityFunc = (v2) => v2;
    exports.defaultOptions = {
      nesting: !0,
      nestingSyntax: "dot",
      arrayRepeat: !1,
      arrayRepeatSyntax: "repeat",
      delimiter: 38,
      valueDeserializer: identityFunc,
      valueSerializer: exports.defaultValueSerializer,
      keyDeserializer: identityFunc,
      shouldSerializeObject: exports.defaultShouldSerializeObject
    };
  }
});

// ../node_modules/picoquery/lib/object-util.js
var require_object_util = __commonJS({
  "../node_modules/picoquery/lib/object-util.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.getDeepObject = getDeepObject;
    exports.stringifyObject = stringifyObject;
    var shared_js_1 = require_shared(), string_util_js_1 = require_string_util();
    function isPrototypeKey(value) {
      return value === "__proto__" || value === "constructor" || value === "prototype";
    }
    function getDeepObject(obj, key, nextKey, forceObject, forceArray) {
      if (isPrototypeKey(key))
        return obj;
      let currObj = obj[key];
      return typeof currObj == "object" && currObj !== null ? currObj : !forceObject && (forceArray || typeof nextKey == "number" || typeof nextKey == "string" && nextKey * 0 === 0 && nextKey.indexOf(".") === -1) ? obj[key] = [] : obj[key] = {};
    }
    var MAX_DEPTH = 20, strBracketPair = "[]", strBracketLeft = "[", strBracketRight = "]", strDot = ".";
    function stringifyObject(obj, options2, depth = 0, parentKey, isProbableArray) {
      let { nestingSyntax = shared_js_1.defaultOptions.nestingSyntax, arrayRepeat = shared_js_1.defaultOptions.arrayRepeat, arrayRepeatSyntax = shared_js_1.defaultOptions.arrayRepeatSyntax, nesting = shared_js_1.defaultOptions.nesting, delimiter = shared_js_1.defaultOptions.delimiter, valueSerializer = shared_js_1.defaultOptions.valueSerializer, shouldSerializeObject = shared_js_1.defaultOptions.shouldSerializeObject } = options2, strDelimiter = typeof delimiter == "number" ? String.fromCharCode(delimiter) : delimiter, useArrayRepeatKey = isProbableArray === !0 && arrayRepeat, shouldUseDot = nestingSyntax === "dot" || nestingSyntax === "js" && !isProbableArray;
      if (depth > MAX_DEPTH)
        return "";
      let result = "", firstKey = !0, valueIsProbableArray = !1;
      for (let key in obj) {
        let value = obj[key];
        if (value === void 0)
          continue;
        let path;
        parentKey ? (path = parentKey, useArrayRepeatKey ? arrayRepeatSyntax === "bracket" && (path += strBracketPair) : shouldUseDot ? (path += strDot, path += key) : (path += strBracketLeft, path += key, path += strBracketRight)) : path = key, firstKey || (result += strDelimiter), typeof value == "object" && value !== null && !shouldSerializeObject(value) ? (valueIsProbableArray = value.pop !== void 0, (nesting || arrayRepeat && valueIsProbableArray) && (result += stringifyObject(value, options2, depth + 1, path, valueIsProbableArray))) : (result += (0, string_util_js_1.encodeString)(path), result += "=", result += valueSerializer(value, key)), firstKey && (firstKey = !1);
      }
      return result;
    }
  }
});

// ../node_modules/picoquery/lib/decode-uri-component.js
var require_decode_uri_component = __commonJS({
  "../node_modules/picoquery/lib/decode-uri-component.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.decodeURIComponent = decodeURIComponent;
    var UTF8_ACCEPT = 12, UTF8_REJECT = 0, UTF8_DATA = [
      // The first part of the table maps bytes to character to a transition.
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      1,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      2,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      3,
      4,
      4,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      5,
      6,
      7,
      7,
      7,
      7,
      7,
      7,
      7,
      7,
      7,
      7,
      7,
      7,
      8,
      7,
      7,
      10,
      9,
      9,
      9,
      11,
      4,
      4,
      4,
      4,
      4,
      4,
      4,
      4,
      4,
      4,
      4,
      // The second part of the table maps a state to a new state when adding a
      // transition.
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      12,
      0,
      0,
      0,
      0,
      24,
      36,
      48,
      60,
      72,
      84,
      96,
      0,
      12,
      12,
      12,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      24,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      24,
      24,
      24,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      24,
      24,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      48,
      48,
      48,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      48,
      48,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      48,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      0,
      // The third part maps the current transition to a mask that needs to apply
      // to the byte.
      127,
      63,
      63,
      63,
      0,
      31,
      15,
      15,
      15,
      7,
      7,
      7
    ];
    function decodeURIComponent(uri) {
      let percentPosition = uri.indexOf("%");
      if (percentPosition === -1)
        return uri;
      let length = uri.length, decoded = "", last = 0, codepoint = 0, startOfOctets = percentPosition, state = UTF8_ACCEPT;
      for (; percentPosition > -1 && percentPosition < length; ) {
        let high = hexCodeToInt(uri[percentPosition + 1], 4), low = hexCodeToInt(uri[percentPosition + 2], 0), byte = high | low, type = UTF8_DATA[byte];
        if (state = UTF8_DATA[256 + state + type], codepoint = codepoint << 6 | byte & UTF8_DATA[364 + type], state === UTF8_ACCEPT)
          decoded += uri.slice(last, startOfOctets), decoded += codepoint <= 65535 ? String.fromCharCode(codepoint) : String.fromCharCode(55232 + (codepoint >> 10), 56320 + (codepoint & 1023)), codepoint = 0, last = percentPosition + 3, percentPosition = startOfOctets = uri.indexOf("%", last);
        else {
          if (state === UTF8_REJECT)
            return null;
          if (percentPosition += 3, percentPosition < length && uri.charCodeAt(percentPosition) === 37)
            continue;
          return null;
        }
      }
      return decoded + uri.slice(last);
    }
    var HEX = {
      0: 0,
      1: 1,
      2: 2,
      3: 3,
      4: 4,
      5: 5,
      6: 6,
      7: 7,
      8: 8,
      9: 9,
      a: 10,
      A: 10,
      b: 11,
      B: 11,
      c: 12,
      C: 12,
      d: 13,
      D: 13,
      e: 14,
      E: 14,
      f: 15,
      F: 15
    };
    function hexCodeToInt(c2, shift2) {
      let i2 = HEX[c2];
      return i2 === void 0 ? 255 : i2 << shift2;
    }
  }
});

// ../node_modules/picoquery/lib/parse.js
var require_parse = __commonJS({
  "../node_modules/picoquery/lib/parse.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.numberValueDeserializer = exports.numberKeyDeserializer = void 0;
    exports.parse = parse;
    var object_util_js_1 = require_object_util(), shared_js_1 = require_shared(), decode_uri_component_js_1 = require_decode_uri_component(), numberKeyDeserializer = (key) => {
      let asNumber = Number(key);
      return Number.isNaN(asNumber) ? key : asNumber;
    };
    exports.numberKeyDeserializer = numberKeyDeserializer;
    var numberValueDeserializer = (value) => {
      let asNumber = Number(value);
      return Number.isNaN(asNumber) ? value : asNumber;
    };
    exports.numberValueDeserializer = numberValueDeserializer;
    var regexPlus = /\+/g, Empty = function() {
    };
    Empty.prototype = /* @__PURE__ */ Object.create(null);
    function computeKeySlice(input, startIndex, endIndex, keyHasPlus, shouldDecodeKey) {
      let chunk = input.substring(startIndex, endIndex);
      return keyHasPlus && (chunk = chunk.replace(regexPlus, " ")), shouldDecodeKey && (chunk = (0, decode_uri_component_js_1.decodeURIComponent)(chunk) || chunk), chunk;
    }
    function parse(input, options2) {
      let { valueDeserializer = shared_js_1.defaultOptions.valueDeserializer, keyDeserializer = shared_js_1.defaultOptions.keyDeserializer, arrayRepeatSyntax = shared_js_1.defaultOptions.arrayRepeatSyntax, nesting = shared_js_1.defaultOptions.nesting, arrayRepeat = shared_js_1.defaultOptions.arrayRepeat, nestingSyntax = shared_js_1.defaultOptions.nestingSyntax, delimiter = shared_js_1.defaultOptions.delimiter } = options2 ?? {}, charDelimiter = typeof delimiter == "string" ? delimiter.charCodeAt(0) : delimiter, isJsNestingSyntax = nestingSyntax === "js", result = new Empty();
      if (typeof input != "string")
        return result;
      let inputLength = input.length, value = "", startingIndex = -1, equalityIndex = -1, keySeparatorIndex = -1, currentObj = result, lastKey, currentKey = "", keyChunk = "", shouldDecodeKey = !1, shouldDecodeValue = !1, keyHasPlus = !1, valueHasPlus = !1, keyIsDot = !1, hasBothKeyValuePair = !1, c2 = 0, arrayRepeatBracketIndex = -1, prevIndex = -1, prevChar = -1;
      for (let i2 = 0; i2 < inputLength + 1; i2++) {
        if (c2 = i2 !== inputLength ? input.charCodeAt(i2) : charDelimiter, c2 === charDelimiter) {
          if (hasBothKeyValuePair = equalityIndex > startingIndex, hasBothKeyValuePair || (equalityIndex = i2), keySeparatorIndex !== equalityIndex - 1 && (keyChunk = computeKeySlice(input, keySeparatorIndex + 1, arrayRepeatBracketIndex > -1 ? arrayRepeatBracketIndex : equalityIndex, keyHasPlus, shouldDecodeKey), currentKey = keyDeserializer(keyChunk), lastKey !== void 0 && (currentObj = (0, object_util_js_1.getDeepObject)(currentObj, lastKey, currentKey, isJsNestingSyntax && keyIsDot, void 0))), hasBothKeyValuePair || currentKey !== "") {
            hasBothKeyValuePair && (value = input.slice(equalityIndex + 1, i2), valueHasPlus && (value = value.replace(regexPlus, " ")), shouldDecodeValue && (value = (0, decode_uri_component_js_1.decodeURIComponent)(value) || value));
            let newValue = valueDeserializer(value, currentKey);
            if (arrayRepeat) {
              let currentValue = currentObj[currentKey];
              currentValue === void 0 ? arrayRepeatBracketIndex > -1 ? currentObj[currentKey] = [newValue] : currentObj[currentKey] = newValue : currentValue.pop ? currentValue.push(newValue) : currentObj[currentKey] = [currentValue, newValue];
            } else
              currentObj[currentKey] = newValue;
          }
          value = "", startingIndex = i2, equalityIndex = i2, shouldDecodeKey = !1, shouldDecodeValue = !1, keyHasPlus = !1, valueHasPlus = !1, keyIsDot = !1, arrayRepeatBracketIndex = -1, keySeparatorIndex = i2, currentObj = result, lastKey = void 0, currentKey = "";
        } else c2 === 93 ? (arrayRepeat && arrayRepeatSyntax === "bracket" && prevChar === 91 && (arrayRepeatBracketIndex = prevIndex), nesting && (nestingSyntax === "index" || isJsNestingSyntax) && equalityIndex <= startingIndex && (keySeparatorIndex !== prevIndex && (keyChunk = computeKeySlice(input, keySeparatorIndex + 1, i2, keyHasPlus, shouldDecodeKey), currentKey = keyDeserializer(keyChunk), lastKey !== void 0 && (currentObj = (0, object_util_js_1.getDeepObject)(currentObj, lastKey, currentKey, void 0, void 0)), lastKey = currentKey, keyHasPlus = !1, shouldDecodeKey = !1), keySeparatorIndex = i2, keyIsDot = !1)) : c2 === 46 ? nesting && (nestingSyntax === "dot" || isJsNestingSyntax) && equalityIndex <= startingIndex && (keySeparatorIndex !== prevIndex && (keyChunk = computeKeySlice(input, keySeparatorIndex + 1, i2, keyHasPlus, shouldDecodeKey), currentKey = keyDeserializer(keyChunk), lastKey !== void 0 && (currentObj = (0, object_util_js_1.getDeepObject)(currentObj, lastKey, currentKey, isJsNestingSyntax)), lastKey = currentKey, keyHasPlus = !1, shouldDecodeKey = !1), keyIsDot = !0, keySeparatorIndex = i2) : c2 === 91 ? nesting && (nestingSyntax === "index" || isJsNestingSyntax) && equalityIndex <= startingIndex && (keySeparatorIndex !== prevIndex && (keyChunk = computeKeySlice(input, keySeparatorIndex + 1, i2, keyHasPlus, shouldDecodeKey), currentKey = keyDeserializer(keyChunk), isJsNestingSyntax && lastKey !== void 0 && (currentObj = (0, object_util_js_1.getDeepObject)(currentObj, lastKey, currentKey, isJsNestingSyntax)), lastKey = currentKey, keyHasPlus = !1, shouldDecodeKey = !1, keyIsDot = !1), keySeparatorIndex = i2) : c2 === 61 ? equalityIndex <= startingIndex ? equalityIndex = i2 : shouldDecodeValue = !0 : c2 === 43 ? equalityIndex > startingIndex ? valueHasPlus = !0 : keyHasPlus = !0 : c2 === 37 && (equalityIndex > startingIndex ? shouldDecodeValue = !0 : shouldDecodeKey = !0);
        prevIndex = i2, prevChar = c2;
      }
      return result;
    }
  }
});

// ../node_modules/picoquery/lib/stringify.js
var require_stringify = __commonJS({
  "../node_modules/picoquery/lib/stringify.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.stringify = stringify2;
    var object_util_js_1 = require_object_util();
    function stringify2(input, options2) {
      if (input === null || typeof input != "object")
        return "";
      let optionsObj = options2 ?? {};
      return (0, object_util_js_1.stringifyObject)(input, optionsObj);
    }
  }
});

// ../node_modules/picoquery/lib/main.js
var require_main = __commonJS({
  "../node_modules/picoquery/lib/main.js"(exports) {
    "use strict";
    var __createBinding = exports && exports.__createBinding || (Object.create ? (function(o3, m2, k2, k22) {
      k22 === void 0 && (k22 = k2);
      var desc = Object.getOwnPropertyDescriptor(m2, k2);
      (!desc || ("get" in desc ? !m2.__esModule : desc.writable || desc.configurable)) && (desc = { enumerable: !0, get: function() {
        return m2[k2];
      } }), Object.defineProperty(o3, k22, desc);
    }) : (function(o3, m2, k2, k22) {
      k22 === void 0 && (k22 = k2), o3[k22] = m2[k2];
    })), __exportStar = exports && exports.__exportStar || function(m2, exports2) {
      for (var p2 in m2) p2 !== "default" && !Object.prototype.hasOwnProperty.call(exports2, p2) && __createBinding(exports2, m2, p2);
    };
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.stringify = exports.parse = void 0;
    var parse_js_1 = require_parse();
    Object.defineProperty(exports, "parse", { enumerable: !0, get: function() {
      return parse_js_1.parse;
    } });
    var stringify_js_1 = require_stringify();
    Object.defineProperty(exports, "stringify", { enumerable: !0, get: function() {
      return stringify_js_1.stringify;
    } });
    __exportStar(require_shared(), exports);
  }
});

// ../node_modules/toggle-selection/index.js
var require_toggle_selection = __commonJS({
  "../node_modules/toggle-selection/index.js"(exports, module) {
    module.exports = function() {
      var selection = document.getSelection();
      if (!selection.rangeCount)
        return function() {
        };
      for (var active = document.activeElement, ranges = [], i2 = 0; i2 < selection.rangeCount; i2++)
        ranges.push(selection.getRangeAt(i2));
      switch (active.tagName.toUpperCase()) {
        // .toUpperCase handles XHTML
        case "INPUT":
        case "TEXTAREA":
          active.blur();
          break;
        default:
          active = null;
          break;
      }
      return selection.removeAllRanges(), function() {
        selection.type === "Caret" && selection.removeAllRanges(), selection.rangeCount || ranges.forEach(function(range) {
          selection.addRange(range);
        }), active && active.focus();
      };
    };
  }
});

// ../node_modules/copy-to-clipboard/index.js
var require_copy_to_clipboard = __commonJS({
  "../node_modules/copy-to-clipboard/index.js"(exports, module) {
    "use strict";
    var deselectCurrent = require_toggle_selection(), clipboardToIE11Formatting = {
      "text/plain": "Text",
      "text/html": "Url",
      default: "Text"
    }, defaultMessage = "Copy to clipboard: #{key}, Enter";
    function format(message) {
      var copyKey = (/mac os x/i.test(navigator.userAgent) ? "\u2318" : "Ctrl") + "+C";
      return message.replace(/#{\s*key\s*}/g, copyKey);
    }
    function copy3(text, options2) {
      var debug, message, reselectPrevious, range, selection, mark, success = !1;
      options2 || (options2 = {}), debug = options2.debug || !1;
      try {
        reselectPrevious = deselectCurrent(), range = document.createRange(), selection = document.getSelection(), mark = document.createElement("span"), mark.textContent = text, mark.ariaHidden = "true", mark.style.all = "unset", mark.style.position = "fixed", mark.style.top = 0, mark.style.clip = "rect(0, 0, 0, 0)", mark.style.whiteSpace = "pre", mark.style.webkitUserSelect = "text", mark.style.MozUserSelect = "text", mark.style.msUserSelect = "text", mark.style.userSelect = "text", mark.addEventListener("copy", function(e2) {
          if (e2.stopPropagation(), options2.format)
            if (e2.preventDefault(), typeof e2.clipboardData > "u") {
              debug && console.warn("unable to use e.clipboardData"), debug && console.warn("trying IE specific stuff"), window.clipboardData.clearData();
              var format2 = clipboardToIE11Formatting[options2.format] || clipboardToIE11Formatting.default;
              window.clipboardData.setData(format2, text);
            } else
              e2.clipboardData.clearData(), e2.clipboardData.setData(options2.format, text);
          options2.onCopy && (e2.preventDefault(), options2.onCopy(e2.clipboardData));
        }), document.body.appendChild(mark), range.selectNodeContents(mark), selection.addRange(range);
        var successful = document.execCommand("copy");
        if (!successful)
          throw new Error("copy command was unsuccessful");
        success = !0;
      } catch (err) {
        debug && console.error("unable to copy using execCommand: ", err), debug && console.warn("trying IE specific stuff");
        try {
          window.clipboardData.setData(options2.format || "text", text), options2.onCopy && options2.onCopy(window.clipboardData), success = !0;
        } catch (err2) {
          debug && console.error("unable to copy using clipboardData: ", err2), debug && console.error("falling back to prompt"), message = format("message" in options2 ? options2.message : defaultMessage), window.prompt(message, text);
        }
      } finally {
        selection && (typeof selection.removeRange == "function" ? selection.removeRange(range) : selection.removeAllRanges()), mark && document.body.removeChild(mark), reselectPrevious();
      }
      return success;
    }
    module.exports = copy3;
  }
});

// ../node_modules/scroll/index.js
var require_scroll = __commonJS({
  "../node_modules/scroll/index.js"(exports, module) {
    var E_NOSCROLL = new Error("Element already at target scroll position"), E_CANCELLED = new Error("Scroll cancelled"), min = Math.min, ms = Date.now;
    module.exports = {
      left: make("scrollLeft"),
      top: make("scrollTop")
    };
    function make(prop) {
      return function(el, to, opts, cb) {
        opts = opts || {}, typeof opts == "function" && (cb = opts, opts = {}), typeof cb != "function" && (cb = noop5);
        var start = ms(), from = el[prop], ease = opts.ease || inOutSine, duration = isNaN(opts.duration) ? 350 : +opts.duration, cancelled = !1;
        return from === to ? cb(E_NOSCROLL, el[prop]) : requestAnimationFrame(animate), cancel;
        function cancel() {
          cancelled = !0;
        }
        function animate(timestamp) {
          if (cancelled) return cb(E_CANCELLED, el[prop]);
          var now = ms(), time = min(1, (now - start) / duration), eased = ease(time);
          el[prop] = eased * (to - from) + from, time < 1 ? requestAnimationFrame(animate) : requestAnimationFrame(function() {
            cb(null, el[prop]);
          });
        }
      };
    }
    function inOutSine(n3) {
      return 0.5 * (1 - Math.cos(Math.PI * n3));
    }
    function noop5() {
    }
  }
});

// ../node_modules/scrollparent/scrollparent.js
var require_scrollparent = __commonJS({
  "../node_modules/scrollparent/scrollparent.js"(exports, module) {
    (function(root2, factory) {
      typeof define == "function" && define.amd ? define([], factory) : typeof module == "object" && module.exports ? module.exports = factory() : root2.Scrollparent = factory();
    })(exports, function() {
      function isScrolling(node) {
        var overflow = getComputedStyle(node, null).getPropertyValue("overflow");
        return overflow.indexOf("scroll") > -1 || overflow.indexOf("auto") > -1;
      }
      function scrollParent2(node) {
        if (node instanceof HTMLElement || node instanceof SVGElement) {
          for (var current = node.parentNode; current.parentNode; ) {
            if (isScrolling(current))
              return current;
            current = current.parentNode;
          }
          return document.scrollingElement || document.documentElement;
        }
      }
      return scrollParent2;
    });
  }
});

// ../node_modules/react-innertext/index.js
var require_react_innertext = __commonJS({
  "../node_modules/react-innertext/index.js"(exports, module) {
    "use strict";
    var hasProps = function(jsx2) {
      return Object.prototype.hasOwnProperty.call(jsx2, "props");
    }, reduceJsxToString = function(previous, current) {
      return previous + innerText2(current);
    }, innerText2 = function(jsx2) {
      return jsx2 === null || typeof jsx2 == "boolean" || typeof jsx2 > "u" ? "" : typeof jsx2 == "number" ? jsx2.toString() : typeof jsx2 == "string" ? jsx2 : Array.isArray(jsx2) ? jsx2.reduce(reduceJsxToString, "") : hasProps(jsx2) && Object.prototype.hasOwnProperty.call(jsx2.props, "children") ? innerText2(jsx2.props.children) : "";
    };
    innerText2.default = innerText2;
    module.exports = innerText2;
  }
});

// ../node_modules/deepmerge/dist/cjs.js
var require_cjs = __commonJS({
  "../node_modules/deepmerge/dist/cjs.js"(exports, module) {
    "use strict";
    var isMergeableObject = function(value) {
      return isNonNullObject(value) && !isSpecial(value);
    };
    function isNonNullObject(value) {
      return !!value && typeof value == "object";
    }
    function isSpecial(value) {
      var stringValue = Object.prototype.toString.call(value);
      return stringValue === "[object RegExp]" || stringValue === "[object Date]" || isReactElement(value);
    }
    var canUseSymbol = typeof Symbol == "function" && Symbol.for, REACT_ELEMENT_TYPE = canUseSymbol ? Symbol.for("react.element") : 60103;
    function isReactElement(value) {
      return value.$$typeof === REACT_ELEMENT_TYPE;
    }
    function emptyTarget(val) {
      return Array.isArray(val) ? [] : {};
    }
    function cloneUnlessOtherwiseSpecified(value, options2) {
      return options2.clone !== !1 && options2.isMergeableObject(value) ? deepmerge4(emptyTarget(value), value, options2) : value;
    }
    function defaultArrayMerge(target, source, options2) {
      return target.concat(source).map(function(element) {
        return cloneUnlessOtherwiseSpecified(element, options2);
      });
    }
    function getMergeFunction(key, options2) {
      if (!options2.customMerge)
        return deepmerge4;
      var customMerge = options2.customMerge(key);
      return typeof customMerge == "function" ? customMerge : deepmerge4;
    }
    function getEnumerableOwnPropertySymbols(target) {
      return Object.getOwnPropertySymbols ? Object.getOwnPropertySymbols(target).filter(function(symbol) {
        return Object.propertyIsEnumerable.call(target, symbol);
      }) : [];
    }
    function getKeys(target) {
      return Object.keys(target).concat(getEnumerableOwnPropertySymbols(target));
    }
    function propertyIsOnObject(object, property) {
      try {
        return property in object;
      } catch {
        return !1;
      }
    }
    function propertyIsUnsafe(target, key) {
      return propertyIsOnObject(target, key) && !(Object.hasOwnProperty.call(target, key) && Object.propertyIsEnumerable.call(target, key));
    }
    function mergeObject(target, source, options2) {
      var destination = {};
      return options2.isMergeableObject(target) && getKeys(target).forEach(function(key) {
        destination[key] = cloneUnlessOtherwiseSpecified(target[key], options2);
      }), getKeys(source).forEach(function(key) {
        propertyIsUnsafe(target, key) || (propertyIsOnObject(target, key) && options2.isMergeableObject(source[key]) ? destination[key] = getMergeFunction(key, options2)(target[key], source[key], options2) : destination[key] = cloneUnlessOtherwiseSpecified(source[key], options2));
      }), destination;
    }
    function deepmerge4(target, source, options2) {
      options2 = options2 || {}, options2.arrayMerge = options2.arrayMerge || defaultArrayMerge, options2.isMergeableObject = options2.isMergeableObject || isMergeableObject, options2.cloneUnlessOtherwiseSpecified = cloneUnlessOtherwiseSpecified;
      var sourceIsArray = Array.isArray(source), targetIsArray = Array.isArray(target), sourceAndTargetTypesMatch = sourceIsArray === targetIsArray;
      return sourceAndTargetTypesMatch ? sourceIsArray ? options2.arrayMerge(target, source, options2) : mergeObject(target, source, options2) : cloneUnlessOtherwiseSpecified(source, options2);
    }
    deepmerge4.all = function(array, options2) {
      if (!Array.isArray(array))
        throw new Error("first argument should be an array");
      return array.reduce(function(prev, next) {
        return deepmerge4(prev, next, options2);
      }, {});
    };
    var deepmerge_1 = deepmerge4;
    module.exports = deepmerge_1;
  }
});

// ../node_modules/downshift/node_modules/react-is/cjs/react-is.production.min.js
var require_react_is_production_min = __commonJS({
  "../node_modules/downshift/node_modules/react-is/cjs/react-is.production.min.js"(exports) {
    "use strict";
    var b2 = Symbol.for("react.element"), c2 = Symbol.for("react.portal"), d2 = Symbol.for("react.fragment"), e2 = Symbol.for("react.strict_mode"), f2 = Symbol.for("react.profiler"), g2 = Symbol.for("react.provider"), h2 = Symbol.for("react.context"), k2 = Symbol.for("react.server_context"), l3 = Symbol.for("react.forward_ref"), m2 = Symbol.for("react.suspense"), n3 = Symbol.for("react.suspense_list"), p2 = Symbol.for("react.memo"), q2 = Symbol.for("react.lazy"), t2 = Symbol.for("react.offscreen"), u2;
    u2 = Symbol.for("react.module.reference");
    function v2(a2) {
      if (typeof a2 == "object" && a2 !== null) {
        var r3 = a2.$$typeof;
        switch (r3) {
          case b2:
            switch (a2 = a2.type, a2) {
              case d2:
              case f2:
              case e2:
              case m2:
              case n3:
                return a2;
              default:
                switch (a2 = a2 && a2.$$typeof, a2) {
                  case k2:
                  case h2:
                  case l3:
                  case q2:
                  case p2:
                  case g2:
                    return a2;
                  default:
                    return r3;
                }
            }
          case c2:
            return r3;
        }
      }
    }
    exports.ContextConsumer = h2;
    exports.ContextProvider = g2;
    exports.Element = b2;
    exports.ForwardRef = l3;
    exports.Fragment = d2;
    exports.Lazy = q2;
    exports.Memo = p2;
    exports.Portal = c2;
    exports.Profiler = f2;
    exports.StrictMode = e2;
    exports.Suspense = m2;
    exports.SuspenseList = n3;
    exports.isAsyncMode = function() {
      return !1;
    };
    exports.isConcurrentMode = function() {
      return !1;
    };
    exports.isContextConsumer = function(a2) {
      return v2(a2) === h2;
    };
    exports.isContextProvider = function(a2) {
      return v2(a2) === g2;
    };
    exports.isElement = function(a2) {
      return typeof a2 == "object" && a2 !== null && a2.$$typeof === b2;
    };
    exports.isForwardRef = function(a2) {
      return v2(a2) === l3;
    };
    exports.isFragment = function(a2) {
      return v2(a2) === d2;
    };
    exports.isLazy = function(a2) {
      return v2(a2) === q2;
    };
    exports.isMemo = function(a2) {
      return v2(a2) === p2;
    };
    exports.isPortal = function(a2) {
      return v2(a2) === c2;
    };
    exports.isProfiler = function(a2) {
      return v2(a2) === f2;
    };
    exports.isStrictMode = function(a2) {
      return v2(a2) === e2;
    };
    exports.isSuspense = function(a2) {
      return v2(a2) === m2;
    };
    exports.isSuspenseList = function(a2) {
      return v2(a2) === n3;
    };
    exports.isValidElementType = function(a2) {
      return typeof a2 == "string" || typeof a2 == "function" || a2 === d2 || a2 === f2 || a2 === e2 || a2 === m2 || a2 === n3 || a2 === t2 || typeof a2 == "object" && a2 !== null && (a2.$$typeof === q2 || a2.$$typeof === p2 || a2.$$typeof === g2 || a2.$$typeof === h2 || a2.$$typeof === l3 || a2.$$typeof === u2 || a2.getModuleId !== void 0);
    };
    exports.typeOf = v2;
  }
});

// ../node_modules/downshift/node_modules/react-is/index.js
var require_react_is = __commonJS({
  "../node_modules/downshift/node_modules/react-is/index.js"(exports, module) {
    "use strict";
    module.exports = require_react_is_production_min();
  }
});

// ../node_modules/fuse.js/dist/fuse.js
var require_fuse = __commonJS({
  "../node_modules/fuse.js/dist/fuse.js"(exports, module) {
    (function(e2, t2) {
      typeof exports == "object" && typeof module == "object" ? module.exports = t2() : typeof define == "function" && define.amd ? define("Fuse", [], t2) : typeof exports == "object" ? exports.Fuse = t2() : e2.Fuse = t2();
    })(exports, function() {
      return (function(e2) {
        var t2 = {};
        function r3(n3) {
          if (t2[n3]) return t2[n3].exports;
          var o3 = t2[n3] = { i: n3, l: !1, exports: {} };
          return e2[n3].call(o3.exports, o3, o3.exports, r3), o3.l = !0, o3.exports;
        }
        return r3.m = e2, r3.c = t2, r3.d = function(e3, t3, n3) {
          r3.o(e3, t3) || Object.defineProperty(e3, t3, { enumerable: !0, get: n3 });
        }, r3.r = function(e3) {
          typeof Symbol < "u" && Symbol.toStringTag && Object.defineProperty(e3, Symbol.toStringTag, { value: "Module" }), Object.defineProperty(e3, "__esModule", { value: !0 });
        }, r3.t = function(e3, t3) {
          if (1 & t3 && (e3 = r3(e3)), 8 & t3 || 4 & t3 && typeof e3 == "object" && e3 && e3.__esModule) return e3;
          var n3 = /* @__PURE__ */ Object.create(null);
          if (r3.r(n3), Object.defineProperty(n3, "default", { enumerable: !0, value: e3 }), 2 & t3 && typeof e3 != "string") for (var o3 in e3) r3.d(n3, o3, function(t4) {
            return e3[t4];
          }.bind(null, o3));
          return n3;
        }, r3.n = function(e3) {
          var t3 = e3 && e3.__esModule ? function() {
            return e3.default;
          } : function() {
            return e3;
          };
          return r3.d(t3, "a", t3), t3;
        }, r3.o = function(e3, t3) {
          return Object.prototype.hasOwnProperty.call(e3, t3);
        }, r3.p = "", r3(r3.s = 0);
      })([function(e2, t2, r3) {
        function n3(e3) {
          return (n3 = typeof Symbol == "function" && typeof Symbol.iterator == "symbol" ? function(e4) {
            return typeof e4;
          } : function(e4) {
            return e4 && typeof Symbol == "function" && e4.constructor === Symbol && e4 !== Symbol.prototype ? "symbol" : typeof e4;
          })(e3);
        }
        function o3(e3, t3) {
          for (var r4 = 0; r4 < t3.length; r4++) {
            var n4 = t3[r4];
            n4.enumerable = n4.enumerable || !1, n4.configurable = !0, "value" in n4 && (n4.writable = !0), Object.defineProperty(e3, n4.key, n4);
          }
        }
        var i2 = r3(1), a2 = r3(7), s2 = a2.get, c2 = (a2.deepValue, a2.isArray), h2 = (function() {
          function e3(t4, r5) {
            var n4 = r5.location, o4 = n4 === void 0 ? 0 : n4, i3 = r5.distance, a4 = i3 === void 0 ? 100 : i3, c3 = r5.threshold, h3 = c3 === void 0 ? 0.6 : c3, l3 = r5.maxPatternLength, u2 = l3 === void 0 ? 32 : l3, f2 = r5.caseSensitive, v2 = f2 !== void 0 && f2, p2 = r5.tokenSeparator, d2 = p2 === void 0 ? / +/g : p2, g2 = r5.findAllMatches, y2 = g2 !== void 0 && g2, m2 = r5.minMatchCharLength, k2 = m2 === void 0 ? 1 : m2, b2 = r5.id, S2 = b2 === void 0 ? null : b2, x2 = r5.keys, M2 = x2 === void 0 ? [] : x2, _2 = r5.shouldSort, w2 = _2 === void 0 || _2, L3 = r5.getFn, A3 = L3 === void 0 ? s2 : L3, O2 = r5.sortFn, C2 = O2 === void 0 ? function(e4, t5) {
              return e4.score - t5.score;
            } : O2, j2 = r5.tokenize, P3 = j2 !== void 0 && j2, I2 = r5.matchAllTokens, F2 = I2 !== void 0 && I2, T3 = r5.includeMatches, N2 = T3 !== void 0 && T3, z2 = r5.includeScore, E2 = z2 !== void 0 && z2, W2 = r5.verbose, K2 = W2 !== void 0 && W2;
            (function(e4, t5) {
              if (!(e4 instanceof t5)) throw new TypeError("Cannot call a class as a function");
            })(this, e3), this.options = { location: o4, distance: a4, threshold: h3, maxPatternLength: u2, isCaseSensitive: v2, tokenSeparator: d2, findAllMatches: y2, minMatchCharLength: k2, id: S2, keys: M2, includeMatches: N2, includeScore: E2, shouldSort: w2, getFn: A3, sortFn: C2, verbose: K2, tokenize: P3, matchAllTokens: F2 }, this.setCollection(t4), this._processKeys(M2);
          }
          var t3, r4, a3;
          return t3 = e3, (r4 = [{ key: "setCollection", value: function(e4) {
            return this.list = e4, e4;
          } }, { key: "_processKeys", value: function(e4) {
            if (this._keyWeights = {}, this._keyNames = [], e4.length && typeof e4[0] == "string") for (var t4 = 0, r5 = e4.length; t4 < r5; t4 += 1) {
              var n4 = e4[t4];
              this._keyWeights[n4] = 1, this._keyNames.push(n4);
            }
            else {
              for (var o4 = null, i3 = null, a4 = 0, s3 = 0, c3 = e4.length; s3 < c3; s3 += 1) {
                var h3 = e4[s3];
                if (!h3.hasOwnProperty("name")) throw new Error('Missing "name" property in key object');
                var l3 = h3.name;
                if (this._keyNames.push(l3), !h3.hasOwnProperty("weight")) throw new Error('Missing "weight" property in key object');
                var u2 = h3.weight;
                if (u2 < 0 || u2 > 1) throw new Error('"weight" property in key must bein the range of [0, 1)');
                i3 = i3 == null ? u2 : Math.max(i3, u2), o4 = o4 == null ? u2 : Math.min(o4, u2), this._keyWeights[l3] = u2, a4 += u2;
              }
              if (a4 > 1) throw new Error("Total of weights cannot exceed 1");
            }
          } }, { key: "search", value: function(e4) {
            var t4 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : { limit: !1 };
            this._log(`---------
Search pattern: "`.concat(e4, '"'));
            var r5 = this._prepareSearchers(e4), n4 = r5.tokenSearchers, o4 = r5.fullSearcher, i3 = this._search(n4, o4);
            return this._computeScore(i3), this.options.shouldSort && this._sort(i3), t4.limit && typeof t4.limit == "number" && (i3 = i3.slice(0, t4.limit)), this._format(i3);
          } }, { key: "_prepareSearchers", value: function() {
            var e4 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : "", t4 = [];
            if (this.options.tokenize) for (var r5 = e4.split(this.options.tokenSeparator), n4 = 0, o4 = r5.length; n4 < o4; n4 += 1) t4.push(new i2(r5[n4], this.options));
            return { tokenSearchers: t4, fullSearcher: new i2(e4, this.options) };
          } }, { key: "_search", value: function() {
            var e4 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [], t4 = arguments.length > 1 ? arguments[1] : void 0, r5 = this.list, n4 = {}, o4 = [];
            if (typeof r5[0] == "string") {
              for (var i3 = 0, a4 = r5.length; i3 < a4; i3 += 1) this._analyze({ key: "", value: r5[i3], record: i3, index: i3 }, { resultMap: n4, results: o4, tokenSearchers: e4, fullSearcher: t4 });
              return o4;
            }
            for (var s3 = 0, c3 = r5.length; s3 < c3; s3 += 1) for (var h3 = r5[s3], l3 = 0, u2 = this._keyNames.length; l3 < u2; l3 += 1) {
              var f2 = this._keyNames[l3];
              this._analyze({ key: f2, value: this.options.getFn(h3, f2), record: h3, index: s3 }, { resultMap: n4, results: o4, tokenSearchers: e4, fullSearcher: t4 });
            }
            return o4;
          } }, { key: "_analyze", value: function(e4, t4) {
            var r5 = this, n4 = e4.key, o4 = e4.arrayIndex, i3 = o4 === void 0 ? -1 : o4, a4 = e4.value, s3 = e4.record, h3 = e4.index, l3 = t4.tokenSearchers, u2 = l3 === void 0 ? [] : l3, f2 = t4.fullSearcher, v2 = t4.resultMap, p2 = v2 === void 0 ? {} : v2, d2 = t4.results, g2 = d2 === void 0 ? [] : d2;
            (function e5(t5, o5, i4, a5) {
              if (o5 != null) {
                if (typeof o5 == "string") {
                  var s4 = !1, h4 = -1, l4 = 0;
                  r5._log(`
Key: `.concat(n4 === "" ? "--" : n4));
                  var v3 = f2.search(o5);
                  if (r5._log('Full text: "'.concat(o5, '", score: ').concat(v3.score)), r5.options.tokenize) {
                    for (var d3 = o5.split(r5.options.tokenSeparator), y2 = d3.length, m2 = [], k2 = 0, b2 = u2.length; k2 < b2; k2 += 1) {
                      var S2 = u2[k2];
                      r5._log(`
Pattern: "`.concat(S2.pattern, '"'));
                      for (var x2 = !1, M2 = 0; M2 < y2; M2 += 1) {
                        var _2 = d3[M2], w2 = S2.search(_2), L3 = {};
                        w2.isMatch ? (L3[_2] = w2.score, s4 = !0, x2 = !0, m2.push(w2.score)) : (L3[_2] = 1, r5.options.matchAllTokens || m2.push(1)), r5._log('Token: "'.concat(_2, '", score: ').concat(L3[_2]));
                      }
                      x2 && (l4 += 1);
                    }
                    h4 = m2[0];
                    for (var A3 = m2.length, O2 = 1; O2 < A3; O2 += 1) h4 += m2[O2];
                    h4 /= A3, r5._log("Token score average:", h4);
                  }
                  var C2 = v3.score;
                  h4 > -1 && (C2 = (C2 + h4) / 2), r5._log("Score average:", C2);
                  var j2 = !r5.options.tokenize || !r5.options.matchAllTokens || l4 >= u2.length;
                  if (r5._log(`
Check Matches: `.concat(j2)), (s4 || v3.isMatch) && j2) {
                    var P3 = { key: n4, arrayIndex: t5, value: o5, score: C2 };
                    r5.options.includeMatches && (P3.matchedIndices = v3.matchedIndices);
                    var I2 = p2[a5];
                    I2 ? I2.output.push(P3) : (p2[a5] = { item: i4, output: [P3] }, g2.push(p2[a5]));
                  }
                } else if (c2(o5)) for (var F2 = 0, T3 = o5.length; F2 < T3; F2 += 1) e5(F2, o5[F2], i4, a5);
              }
            })(i3, a4, s3, h3);
          } }, { key: "_computeScore", value: function(e4) {
            this._log(`

Computing score:
`);
            for (var t4 = this._keyWeights, r5 = !!Object.keys(t4).length, n4 = 0, o4 = e4.length; n4 < o4; n4 += 1) {
              for (var i3 = e4[n4], a4 = i3.output, s3 = a4.length, c3 = 1, h3 = 0; h3 < s3; h3 += 1) {
                var l3 = a4[h3], u2 = l3.key, f2 = r5 ? t4[u2] : 1, v2 = l3.score === 0 && t4 && t4[u2] > 0 ? Number.EPSILON : l3.score;
                c3 *= Math.pow(v2, f2);
              }
              i3.score = c3, this._log(i3);
            }
          } }, { key: "_sort", value: function(e4) {
            this._log(`

Sorting....`), e4.sort(this.options.sortFn);
          } }, { key: "_format", value: function(e4) {
            var t4 = [];
            if (this.options.verbose) {
              var r5 = [];
              this._log(`

Output:

`, JSON.stringify(e4, function(e5, t5) {
                if (n3(t5) === "object" && t5 !== null) {
                  if (r5.indexOf(t5) !== -1) return;
                  r5.push(t5);
                }
                return t5;
              }, 2)), r5 = null;
            }
            var o4 = [];
            this.options.includeMatches && o4.push(function(e5, t5) {
              var r6 = e5.output;
              t5.matches = [];
              for (var n4 = 0, o5 = r6.length; n4 < o5; n4 += 1) {
                var i4 = r6[n4];
                if (i4.matchedIndices.length !== 0) {
                  var a5 = { indices: i4.matchedIndices, value: i4.value };
                  i4.key && (a5.key = i4.key), i4.hasOwnProperty("arrayIndex") && i4.arrayIndex > -1 && (a5.arrayIndex = i4.arrayIndex), t5.matches.push(a5);
                }
              }
            }), this.options.includeScore && o4.push(function(e5, t5) {
              t5.score = e5.score;
            });
            for (var i3 = 0, a4 = e4.length; i3 < a4; i3 += 1) {
              var s3 = e4[i3];
              if (this.options.id && (s3.item = this.options.getFn(s3.item, this.options.id)[0]), o4.length) {
                for (var c3 = { item: s3.item }, h3 = 0, l3 = o4.length; h3 < l3; h3 += 1) o4[h3](s3, c3);
                t4.push(c3);
              } else t4.push(s3.item);
            }
            return t4;
          } }, { key: "_log", value: function() {
            var e4;
            this.options.verbose && (e4 = console).log.apply(e4, arguments);
          } }]) && o3(t3.prototype, r4), a3 && o3(t3, a3), e3;
        })();
        e2.exports = h2;
      }, function(e2, t2, r3) {
        function n3(e3, t3) {
          for (var r4 = 0; r4 < t3.length; r4++) {
            var n4 = t3[r4];
            n4.enumerable = n4.enumerable || !1, n4.configurable = !0, "value" in n4 && (n4.writable = !0), Object.defineProperty(e3, n4.key, n4);
          }
        }
        var o3 = r3(2), i2 = r3(3), a2 = r3(6), s2 = (function() {
          function e3(t4, r5) {
            var n4 = r5.location, o4 = n4 === void 0 ? 0 : n4, i3 = r5.distance, s4 = i3 === void 0 ? 100 : i3, c2 = r5.threshold, h2 = c2 === void 0 ? 0.6 : c2, l3 = r5.maxPatternLength, u2 = l3 === void 0 ? 32 : l3, f2 = r5.isCaseSensitive, v2 = f2 !== void 0 && f2, p2 = r5.tokenSeparator, d2 = p2 === void 0 ? / +/g : p2, g2 = r5.findAllMatches, y2 = g2 !== void 0 && g2, m2 = r5.minMatchCharLength, k2 = m2 === void 0 ? 1 : m2, b2 = r5.includeMatches, S2 = b2 !== void 0 && b2;
            (function(e4, t5) {
              if (!(e4 instanceof t5)) throw new TypeError("Cannot call a class as a function");
            })(this, e3), this.options = { location: o4, distance: s4, threshold: h2, maxPatternLength: u2, isCaseSensitive: v2, tokenSeparator: d2, findAllMatches: y2, includeMatches: S2, minMatchCharLength: k2 }, this.pattern = v2 ? t4 : t4.toLowerCase(), this.pattern.length <= u2 && (this.patternAlphabet = a2(this.pattern));
          }
          var t3, r4, s3;
          return t3 = e3, (r4 = [{ key: "search", value: function(e4) {
            var t4 = this.options, r5 = t4.isCaseSensitive, n4 = t4.includeMatches;
            if (r5 || (e4 = e4.toLowerCase()), this.pattern === e4) {
              var a3 = { isMatch: !0, score: 0 };
              return n4 && (a3.matchedIndices = [[0, e4.length - 1]]), a3;
            }
            var s4 = this.options, c2 = s4.maxPatternLength, h2 = s4.tokenSeparator;
            if (this.pattern.length > c2) return o3(e4, this.pattern, h2);
            var l3 = this.options, u2 = l3.location, f2 = l3.distance, v2 = l3.threshold, p2 = l3.findAllMatches, d2 = l3.minMatchCharLength;
            return i2(e4, this.pattern, this.patternAlphabet, { location: u2, distance: f2, threshold: v2, findAllMatches: p2, minMatchCharLength: d2, includeMatches: n4 });
          } }]) && n3(t3.prototype, r4), s3 && n3(t3, s3), e3;
        })();
        e2.exports = s2;
      }, function(e2, t2) {
        var r3 = /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g;
        e2.exports = function(e3, t3) {
          var n3 = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : / +/g, o3 = new RegExp(t3.replace(r3, "\\$&").replace(n3, "|")), i2 = e3.match(o3), a2 = !!i2, s2 = [];
          if (a2) for (var c2 = 0, h2 = i2.length; c2 < h2; c2 += 1) {
            var l3 = i2[c2];
            s2.push([e3.indexOf(l3), l3.length - 1]);
          }
          return { score: a2 ? 0.5 : 1, isMatch: a2, matchedIndices: s2 };
        };
      }, function(e2, t2, r3) {
        var n3 = r3(4), o3 = r3(5);
        e2.exports = function(e3, t3, r4, i2) {
          for (var a2 = i2.location, s2 = a2 === void 0 ? 0 : a2, c2 = i2.distance, h2 = c2 === void 0 ? 100 : c2, l3 = i2.threshold, u2 = l3 === void 0 ? 0.6 : l3, f2 = i2.findAllMatches, v2 = f2 !== void 0 && f2, p2 = i2.minMatchCharLength, d2 = p2 === void 0 ? 1 : p2, g2 = i2.includeMatches, y2 = g2 !== void 0 && g2, m2 = s2, k2 = e3.length, b2 = u2, S2 = e3.indexOf(t3, m2), x2 = t3.length, M2 = [], _2 = 0; _2 < k2; _2 += 1) M2[_2] = 0;
          if (S2 !== -1) {
            var w2 = n3(t3, { errors: 0, currentLocation: S2, expectedLocation: m2, distance: h2 });
            if (b2 = Math.min(w2, b2), (S2 = e3.lastIndexOf(t3, m2 + x2)) !== -1) {
              var L3 = n3(t3, { errors: 0, currentLocation: S2, expectedLocation: m2, distance: h2 });
              b2 = Math.min(L3, b2);
            }
          }
          S2 = -1;
          for (var A3 = [], O2 = 1, C2 = x2 + k2, j2 = 1 << (x2 <= 31 ? x2 - 1 : 30), P3 = 0; P3 < x2; P3 += 1) {
            for (var I2 = 0, F2 = C2; I2 < F2; )
              n3(t3, { errors: P3, currentLocation: m2 + F2, expectedLocation: m2, distance: h2 }) <= b2 ? I2 = F2 : C2 = F2, F2 = Math.floor((C2 - I2) / 2 + I2);
            C2 = F2;
            var T3 = Math.max(1, m2 - F2 + 1), N2 = v2 ? k2 : Math.min(m2 + F2, k2) + x2, z2 = Array(N2 + 2);
            z2[N2 + 1] = (1 << P3) - 1;
            for (var E2 = N2; E2 >= T3; E2 -= 1) {
              var W2 = E2 - 1, K2 = r4[e3.charAt(W2)];
              if (K2 && (M2[W2] = 1), z2[E2] = (z2[E2 + 1] << 1 | 1) & K2, P3 !== 0 && (z2[E2] |= (A3[E2 + 1] | A3[E2]) << 1 | 1 | A3[E2 + 1]), z2[E2] & j2 && (O2 = n3(t3, { errors: P3, currentLocation: W2, expectedLocation: m2, distance: h2 })) <= b2) {
                if (b2 = O2, (S2 = W2) <= m2) break;
                T3 = Math.max(1, 2 * m2 - S2);
              }
            }
            if (n3(t3, { errors: P3 + 1, currentLocation: m2, expectedLocation: m2, distance: h2 }) > b2) break;
            A3 = z2;
          }
          var $ = { isMatch: S2 >= 0, score: O2 === 0 ? 1e-3 : O2 };
          return y2 && ($.matchedIndices = o3(M2, d2)), $;
        };
      }, function(e2, t2) {
        e2.exports = function(e3, t3) {
          var r3 = t3.errors, n3 = r3 === void 0 ? 0 : r3, o3 = t3.currentLocation, i2 = o3 === void 0 ? 0 : o3, a2 = t3.expectedLocation, s2 = a2 === void 0 ? 0 : a2, c2 = t3.distance, h2 = c2 === void 0 ? 100 : c2, l3 = n3 / e3.length, u2 = Math.abs(s2 - i2);
          return h2 ? l3 + u2 / h2 : u2 ? 1 : l3;
        };
      }, function(e2, t2) {
        e2.exports = function() {
          for (var e3 = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : [], t3 = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : 1, r3 = [], n3 = -1, o3 = -1, i2 = 0, a2 = e3.length; i2 < a2; i2 += 1) {
            var s2 = e3[i2];
            s2 && n3 === -1 ? n3 = i2 : s2 || n3 === -1 || ((o3 = i2 - 1) - n3 + 1 >= t3 && r3.push([n3, o3]), n3 = -1);
          }
          return e3[i2 - 1] && i2 - n3 >= t3 && r3.push([n3, i2 - 1]), r3;
        };
      }, function(e2, t2) {
        e2.exports = function(e3) {
          for (var t3 = {}, r3 = e3.length, n3 = 0; n3 < r3; n3 += 1) t3[e3.charAt(n3)] = 0;
          for (var o3 = 0; o3 < r3; o3 += 1) t3[e3.charAt(o3)] |= 1 << r3 - o3 - 1;
          return t3;
        };
      }, function(e2, t2) {
        var r3 = function(e3) {
          return Array.isArray ? Array.isArray(e3) : Object.prototype.toString.call(e3) === "[object Array]";
        }, n3 = function(e3) {
          return e3 == null ? "" : (function(e4) {
            if (typeof e4 == "string") return e4;
            var t3 = e4 + "";
            return t3 == "0" && 1 / e4 == -1 / 0 ? "-0" : t3;
          })(e3);
        }, o3 = function(e3) {
          return typeof e3 == "string";
        }, i2 = function(e3) {
          return typeof e3 == "number";
        };
        e2.exports = { get: function(e3, t3) {
          var a2 = [];
          return (function e4(t4, s2) {
            if (s2) {
              var c2 = s2.indexOf("."), h2 = s2, l3 = null;
              c2 !== -1 && (h2 = s2.slice(0, c2), l3 = s2.slice(c2 + 1));
              var u2 = t4[h2];
              if (u2 != null) if (l3 || !o3(u2) && !i2(u2)) if (r3(u2)) for (var f2 = 0, v2 = u2.length; f2 < v2; f2 += 1) e4(u2[f2], l3);
              else l3 && e4(u2, l3);
              else a2.push(n3(u2));
            } else a2.push(t4);
          })(e3, t3), a2;
        }, isArray: r3, isString: o3, isNum: i2, toString: n3 };
      }]);
    });
  }
});

// ../node_modules/store2/dist/store2.js
var require_store2 = __commonJS({
  "../node_modules/store2/dist/store2.js"(exports, module) {
    (function(window2, define2) {
      var _2 = {
        version: "2.14.4",
        areas: {},
        apis: {},
        nsdelim: ".",
        // utilities
        inherit: function(api, o3) {
          for (var p2 in api)
            o3.hasOwnProperty(p2) || Object.defineProperty(o3, p2, Object.getOwnPropertyDescriptor(api, p2));
          return o3;
        },
        stringify: function(d2, fn) {
          return d2 === void 0 || typeof d2 == "function" ? d2 + "" : JSON.stringify(d2, fn || _2.replace);
        },
        parse: function(s2, fn) {
          try {
            return JSON.parse(s2, fn || _2.revive);
          } catch {
            return s2;
          }
        },
        // extension hooks
        fn: function(name, fn) {
          _2.storeAPI[name] = fn;
          for (var api in _2.apis)
            _2.apis[api][name] = fn;
        },
        get: function(area, key) {
          return area.getItem(key);
        },
        set: function(area, key, string) {
          area.setItem(key, string);
        },
        remove: function(area, key) {
          area.removeItem(key);
        },
        key: function(area, i2) {
          return area.key(i2);
        },
        length: function(area) {
          return area.length;
        },
        clear: function(area) {
          area.clear();
        },
        // core functions
        Store: function(id, area, namespace) {
          var store3 = _2.inherit(_2.storeAPI, function(key, data, overwrite) {
            return arguments.length === 0 ? store3.getAll() : typeof data == "function" ? store3.transact(key, data, overwrite) : data !== void 0 ? store3.set(key, data, overwrite) : typeof key == "string" || typeof key == "number" ? store3.get(key) : typeof key == "function" ? store3.each(key) : key ? store3.setAll(key, data) : store3.clear();
          });
          store3._id = id;
          try {
            var testKey = "__store2_test";
            area.setItem(testKey, "ok"), store3._area = area, area.removeItem(testKey);
          } catch {
            store3._area = _2.storage("fake");
          }
          return store3._ns = namespace || "", _2.areas[id] || (_2.areas[id] = store3._area), _2.apis[store3._ns + store3._id] || (_2.apis[store3._ns + store3._id] = store3), store3;
        },
        storeAPI: {
          // admin functions
          area: function(id, area) {
            var store3 = this[id];
            return (!store3 || !store3.area) && (store3 = _2.Store(id, area, this._ns), this[id] || (this[id] = store3)), store3;
          },
          namespace: function(namespace, singleArea, delim) {
            if (delim = delim || this._delim || _2.nsdelim, !namespace)
              return this._ns ? this._ns.substring(0, this._ns.length - delim.length) : "";
            var ns = namespace, store3 = this[ns];
            if ((!store3 || !store3.namespace) && (store3 = _2.Store(this._id, this._area, this._ns + ns + delim), store3._delim = delim, this[ns] || (this[ns] = store3), !singleArea))
              for (var name in _2.areas)
                store3.area(name, _2.areas[name]);
            return store3;
          },
          isFake: function(force) {
            return force ? (this._real = this._area, this._area = _2.storage("fake")) : force === !1 && (this._area = this._real || this._area), this._area.name === "fake";
          },
          toString: function() {
            return "store" + (this._ns ? "." + this.namespace() : "") + "[" + this._id + "]";
          },
          // storage functions
          has: function(key) {
            return this._area.has ? this._area.has(this._in(key)) : this._in(key) in this._area;
          },
          size: function() {
            return this.keys().length;
          },
          each: function(fn, fill) {
            for (var i2 = 0, m2 = _2.length(this._area); i2 < m2; i2++) {
              var key = this._out(_2.key(this._area, i2));
              if (key !== void 0 && fn.call(this, key, this.get(key), fill) === !1)
                break;
              m2 > _2.length(this._area) && (m2--, i2--);
            }
            return fill || this;
          },
          keys: function(fillList) {
            return this.each(function(k2, v2, list) {
              list.push(k2);
            }, fillList || []);
          },
          get: function(key, alt) {
            var s2 = _2.get(this._area, this._in(key)), fn;
            return typeof alt == "function" && (fn = alt, alt = null), s2 !== null ? _2.parse(s2, fn) : alt ?? s2;
          },
          getAll: function(fillObj) {
            return this.each(function(k2, v2, all) {
              all[k2] = v2;
            }, fillObj || {});
          },
          transact: function(key, fn, alt) {
            var val = this.get(key, alt), ret = fn(val);
            return this.set(key, ret === void 0 ? val : ret), this;
          },
          set: function(key, data, overwrite) {
            var d2 = this.get(key), replacer;
            return d2 != null && overwrite === !1 ? data : (typeof overwrite == "function" && (replacer = overwrite, overwrite = void 0), _2.set(this._area, this._in(key), _2.stringify(data, replacer), overwrite) || d2);
          },
          setAll: function(data, overwrite) {
            var changed, val;
            for (var key in data)
              val = data[key], this.set(key, val, overwrite) !== val && (changed = !0);
            return changed;
          },
          add: function(key, data, replacer) {
            var d2 = this.get(key);
            if (d2 instanceof Array)
              data = d2.concat(data);
            else if (d2 !== null) {
              var type = typeof d2;
              if (type === typeof data && type === "object") {
                for (var k2 in data)
                  d2[k2] = data[k2];
                data = d2;
              } else
                data = d2 + data;
            }
            return _2.set(this._area, this._in(key), _2.stringify(data, replacer)), data;
          },
          remove: function(key, alt) {
            var d2 = this.get(key, alt);
            return _2.remove(this._area, this._in(key)), d2;
          },
          clear: function() {
            return this._ns ? this.each(function(k2) {
              _2.remove(this._area, this._in(k2));
            }, 1) : _2.clear(this._area), this;
          },
          clearAll: function() {
            var area = this._area;
            for (var id in _2.areas)
              _2.areas.hasOwnProperty(id) && (this._area = _2.areas[id], this.clear());
            return this._area = area, this;
          },
          // internal use functions
          _in: function(k2) {
            return typeof k2 != "string" && (k2 = _2.stringify(k2)), this._ns ? this._ns + k2 : k2;
          },
          _out: function(k2) {
            return this._ns ? k2 && k2.indexOf(this._ns) === 0 ? k2.substring(this._ns.length) : void 0 : (
              // so each() knows to skip it
              k2
            );
          }
        },
        // end _.storeAPI
        storage: function(name) {
          return _2.inherit(_2.storageAPI, { items: {}, name });
        },
        storageAPI: {
          length: 0,
          has: function(k2) {
            return this.items.hasOwnProperty(k2);
          },
          key: function(i2) {
            var c2 = 0;
            for (var k2 in this.items)
              if (this.has(k2) && i2 === c2++)
                return k2;
          },
          setItem: function(k2, v2) {
            this.has(k2) || this.length++, this.items[k2] = v2;
          },
          removeItem: function(k2) {
            this.has(k2) && (delete this.items[k2], this.length--);
          },
          getItem: function(k2) {
            return this.has(k2) ? this.items[k2] : null;
          },
          clear: function() {
            for (var k2 in this.items)
              this.removeItem(k2);
          }
        }
        // end _.storageAPI
      }, store2 = (
        // safely set this up (throws error in IE10/32bit mode for local files)
        _2.Store("local", (function() {
          try {
            return localStorage;
          } catch {
          }
        })())
      );
      store2.local = store2, store2._ = _2, store2.area("session", (function() {
        try {
          return sessionStorage;
        } catch {
        }
      })()), store2.area("page", _2.storage("page")), typeof define2 == "function" && define2.amd !== void 0 ? define2("store2", [], function() {
        return store2;
      }) : typeof module < "u" && module.exports ? module.exports = store2 : (window2.store && (_2.conflict = window2.store), window2.store = store2);
    })(exports, exports && exports.define);
  }
});

// global-externals:react
var react_default = __REACT__, { Children, Component, Fragment, Profiler, PureComponent, StrictMode, Suspense, __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED, act, cloneElement, createContext, createElement, createFactory, createRef, forwardRef, isValidElement, lazy, memo, startTransition, unstable_act, useCallback, useContext, useDebugValue, useDeferredValue, useEffect, useId, useImperativeHandle, useInsertionEffect, useLayoutEffect, useMemo, useReducer, useRef, useState, useSyncExternalStore, useTransition, version } = __REACT__;

// global-externals:storybook/internal/channels
var channels_default = __STORYBOOK_CHANNELS__, { Channel, HEARTBEAT_INTERVAL, HEARTBEAT_MAX_LATENCY, PostMessageTransport, WebsocketTransport, createBrowserChannel } = __STORYBOOK_CHANNELS__;

// global-externals:storybook/internal/core-events
var core_events_default = __STORYBOOK_CORE_EVENTS__, { ARGTYPES_INFO_REQUEST, ARGTYPES_INFO_RESPONSE, CHANNEL_CREATED, CHANNEL_WS_DISCONNECT, CONFIG_ERROR, CREATE_NEW_STORYFILE_REQUEST, CREATE_NEW_STORYFILE_RESPONSE, CURRENT_STORY_WAS_SET, DOCS_PREPARED, DOCS_RENDERED, FILE_COMPONENT_SEARCH_REQUEST, FILE_COMPONENT_SEARCH_RESPONSE, FORCE_REMOUNT, FORCE_RE_RENDER, GLOBALS_UPDATED, MANAGER_INERT_ATTRIBUTE_CHANGED, NAVIGATE_URL, OPEN_IN_EDITOR_REQUEST, OPEN_IN_EDITOR_RESPONSE, PLAY_FUNCTION_THREW_EXCEPTION, PRELOAD_ENTRIES, PREVIEW_BUILDER_PROGRESS, PREVIEW_INITIALIZED, PREVIEW_KEYDOWN, REGISTER_SUBSCRIPTION, REQUEST_WHATS_NEW_DATA, RESET_STORY_ARGS, RESULT_WHATS_NEW_DATA, SAVE_STORY_REQUEST, SAVE_STORY_RESPONSE, SELECT_STORY, SET_CONFIG, SET_CURRENT_STORY, SET_FILTER, SET_GLOBALS, SET_INDEX, SET_STORIES, SET_WHATS_NEW_CACHE, SHARED_STATE_CHANGED, SHARED_STATE_SET, STORIES_COLLAPSE_ALL, STORIES_EXPAND_ALL, STORY_ARGS_UPDATED, STORY_CHANGED, STORY_ERRORED, STORY_FINISHED, STORY_HOT_UPDATED, STORY_INDEX_INVALIDATED, STORY_MISSING, STORY_PREPARED, STORY_RENDERED, STORY_RENDER_PHASE_CHANGED, STORY_SPECIFIED, STORY_THREW_EXCEPTION, STORY_UNCHANGED, TELEMETRY_ERROR, TOGGLE_WHATS_NEW_NOTIFICATIONS, UNHANDLED_ERRORS_WHILE_PLAYING, UPDATE_GLOBALS, UPDATE_QUERY_PARAMS, UPDATE_STORY_ARGS } = __STORYBOOK_CORE_EVENTS__;

// ../node_modules/@storybook/global/dist/index.mjs
var scope = (() => {
  let win;
  return typeof window < "u" ? win = window : typeof globalThis < "u" ? win = globalThis : typeof global < "u" ? win = global : typeof self < "u" ? win = self : win = {}, win;
})();

// global-externals:@storybook/icons
var icons_exports = {};
__export(icons_exports, {
  AccessibilityAltIcon: () => AccessibilityAltIcon,
  AccessibilityIcon: () => AccessibilityIcon,
  AccessibilityIgnoredIcon: () => AccessibilityIgnoredIcon,
  AddIcon: () => AddIcon,
  AdminIcon: () => AdminIcon,
  AlertAltIcon: () => AlertAltIcon,
  AlertIcon: () => AlertIcon,
  AlignLeftIcon: () => AlignLeftIcon,
  AlignRightIcon: () => AlignRightIcon,
  AppleIcon: () => AppleIcon,
  ArrowBottomLeftIcon: () => ArrowBottomLeftIcon,
  ArrowBottomRightIcon: () => ArrowBottomRightIcon,
  ArrowDownIcon: () => ArrowDownIcon,
  ArrowLeftIcon: () => ArrowLeftIcon,
  ArrowRightIcon: () => ArrowRightIcon,
  ArrowSolidDownIcon: () => ArrowSolidDownIcon,
  ArrowSolidLeftIcon: () => ArrowSolidLeftIcon,
  ArrowSolidRightIcon: () => ArrowSolidRightIcon,
  ArrowSolidUpIcon: () => ArrowSolidUpIcon,
  ArrowTopLeftIcon: () => ArrowTopLeftIcon,
  ArrowTopRightIcon: () => ArrowTopRightIcon,
  ArrowUpIcon: () => ArrowUpIcon,
  AzureDevOpsIcon: () => AzureDevOpsIcon,
  BackIcon: () => BackIcon,
  BasketIcon: () => BasketIcon,
  BatchAcceptIcon: () => BatchAcceptIcon,
  BatchDenyIcon: () => BatchDenyIcon,
  BeakerIcon: () => BeakerIcon,
  BellIcon: () => BellIcon,
  BitbucketIcon: () => BitbucketIcon,
  BoldIcon: () => BoldIcon,
  BookIcon: () => BookIcon,
  BookmarkHollowIcon: () => BookmarkHollowIcon,
  BookmarkIcon: () => BookmarkIcon,
  BottomBarIcon: () => BottomBarIcon,
  BottomBarToggleIcon: () => BottomBarToggleIcon,
  BoxIcon: () => BoxIcon,
  BranchIcon: () => BranchIcon,
  BrowserIcon: () => BrowserIcon,
  BugIcon: () => BugIcon,
  ButtonIcon: () => ButtonIcon,
  CPUIcon: () => CPUIcon,
  CalendarIcon: () => CalendarIcon,
  CameraIcon: () => CameraIcon,
  CameraStabilizeIcon: () => CameraStabilizeIcon,
  CategoryIcon: () => CategoryIcon,
  CertificateIcon: () => CertificateIcon,
  ChangedIcon: () => ChangedIcon,
  ChatIcon: () => ChatIcon,
  CheckIcon: () => CheckIcon,
  ChevronDownIcon: () => ChevronDownIcon,
  ChevronLeftIcon: () => ChevronLeftIcon,
  ChevronRightIcon: () => ChevronRightIcon,
  ChevronSmallDownIcon: () => ChevronSmallDownIcon,
  ChevronSmallLeftIcon: () => ChevronSmallLeftIcon,
  ChevronSmallRightIcon: () => ChevronSmallRightIcon,
  ChevronSmallUpIcon: () => ChevronSmallUpIcon,
  ChevronUpIcon: () => ChevronUpIcon,
  ChromaticIcon: () => ChromaticIcon,
  ChromeIcon: () => ChromeIcon,
  CircleHollowIcon: () => CircleHollowIcon,
  CircleIcon: () => CircleIcon,
  ClearIcon: () => ClearIcon,
  CloseAltIcon: () => CloseAltIcon,
  CloseIcon: () => CloseIcon,
  CloudHollowIcon: () => CloudHollowIcon,
  CloudIcon: () => CloudIcon,
  CogIcon: () => CogIcon,
  CollapseIcon: () => CollapseIcon,
  CommandIcon: () => CommandIcon,
  CommentAddIcon: () => CommentAddIcon,
  CommentIcon: () => CommentIcon,
  CommentsIcon: () => CommentsIcon,
  CommitIcon: () => CommitIcon,
  CompassIcon: () => CompassIcon,
  ComponentDrivenIcon: () => ComponentDrivenIcon,
  ComponentIcon: () => ComponentIcon,
  ContrastIcon: () => ContrastIcon,
  ContrastIgnoredIcon: () => ContrastIgnoredIcon,
  ControlsIcon: () => ControlsIcon,
  CopyIcon: () => CopyIcon,
  CreditIcon: () => CreditIcon,
  CrossIcon: () => CrossIcon,
  DashboardIcon: () => DashboardIcon,
  DatabaseIcon: () => DatabaseIcon,
  DeleteIcon: () => DeleteIcon,
  DiamondIcon: () => DiamondIcon,
  DirectionIcon: () => DirectionIcon,
  DiscordIcon: () => DiscordIcon,
  DocChartIcon: () => DocChartIcon,
  DocListIcon: () => DocListIcon,
  DocumentIcon: () => DocumentIcon,
  DownloadIcon: () => DownloadIcon,
  DragIcon: () => DragIcon,
  EditIcon: () => EditIcon,
  EditorIcon: () => EditorIcon,
  EllipsisIcon: () => EllipsisIcon,
  EmailIcon: () => EmailIcon,
  ExpandAltIcon: () => ExpandAltIcon,
  ExpandIcon: () => ExpandIcon,
  EyeCloseIcon: () => EyeCloseIcon,
  EyeIcon: () => EyeIcon,
  FaceHappyIcon: () => FaceHappyIcon,
  FaceNeutralIcon: () => FaceNeutralIcon,
  FaceSadIcon: () => FaceSadIcon,
  FacebookIcon: () => FacebookIcon,
  FailedIcon: () => FailedIcon,
  FastForwardIcon: () => FastForwardIcon,
  FigmaIcon: () => FigmaIcon,
  FilterIcon: () => FilterIcon,
  FlagIcon: () => FlagIcon,
  FolderIcon: () => FolderIcon,
  FormIcon: () => FormIcon,
  GDriveIcon: () => GDriveIcon,
  GiftIcon: () => GiftIcon,
  GithubIcon: () => GithubIcon,
  GitlabIcon: () => GitlabIcon,
  GlobeIcon: () => GlobeIcon,
  GoogleIcon: () => GoogleIcon,
  GraphBarIcon: () => GraphBarIcon,
  GraphLineIcon: () => GraphLineIcon,
  GraphqlIcon: () => GraphqlIcon,
  GridAltIcon: () => GridAltIcon,
  GridIcon: () => GridIcon,
  GrowIcon: () => GrowIcon,
  HeartHollowIcon: () => HeartHollowIcon,
  HeartIcon: () => HeartIcon,
  HomeIcon: () => HomeIcon,
  HourglassIcon: () => HourglassIcon,
  InfoIcon: () => InfoIcon,
  ItalicIcon: () => ItalicIcon,
  JumpToIcon: () => JumpToIcon,
  KeyIcon: () => KeyIcon,
  LightningIcon: () => LightningIcon,
  LightningOffIcon: () => LightningOffIcon,
  LinkBrokenIcon: () => LinkBrokenIcon,
  LinkIcon: () => LinkIcon,
  LinkedinIcon: () => LinkedinIcon,
  LinuxIcon: () => LinuxIcon,
  ListOrderedIcon: () => ListOrderedIcon,
  ListUnorderedIcon: () => ListUnorderedIcon,
  LocationIcon: () => LocationIcon,
  LockIcon: () => LockIcon,
  MarkdownIcon: () => MarkdownIcon,
  MarkupIcon: () => MarkupIcon,
  MediumIcon: () => MediumIcon,
  MemoryIcon: () => MemoryIcon,
  MenuIcon: () => MenuIcon,
  MergeIcon: () => MergeIcon,
  MirrorIcon: () => MirrorIcon,
  MobileIcon: () => MobileIcon,
  MoonIcon: () => MoonIcon,
  NutIcon: () => NutIcon,
  OutboxIcon: () => OutboxIcon,
  OutlineIcon: () => OutlineIcon,
  PaintBrushAltIcon: () => PaintBrushAltIcon,
  PaintBrushIcon: () => PaintBrushIcon,
  PaperClipIcon: () => PaperClipIcon,
  ParagraphIcon: () => ParagraphIcon,
  PassedIcon: () => PassedIcon,
  PhoneIcon: () => PhoneIcon,
  PhotoDragIcon: () => PhotoDragIcon,
  PhotoIcon: () => PhotoIcon,
  PhotoStabilizeIcon: () => PhotoStabilizeIcon,
  PinAltIcon: () => PinAltIcon,
  PinIcon: () => PinIcon,
  PlayAllHollowIcon: () => PlayAllHollowIcon,
  PlayBackIcon: () => PlayBackIcon,
  PlayHollowIcon: () => PlayHollowIcon,
  PlayIcon: () => PlayIcon,
  PlayNextIcon: () => PlayNextIcon,
  PlusIcon: () => PlusIcon,
  PointerDefaultIcon: () => PointerDefaultIcon,
  PointerHandIcon: () => PointerHandIcon,
  PowerIcon: () => PowerIcon,
  PrintIcon: () => PrintIcon,
  ProceedIcon: () => ProceedIcon,
  ProfileIcon: () => ProfileIcon,
  PullRequestIcon: () => PullRequestIcon,
  QuestionIcon: () => QuestionIcon,
  RSSIcon: () => RSSIcon,
  RedirectIcon: () => RedirectIcon,
  ReduxIcon: () => ReduxIcon,
  RefreshIcon: () => RefreshIcon,
  ReplyIcon: () => ReplyIcon,
  RepoIcon: () => RepoIcon,
  RequestChangeIcon: () => RequestChangeIcon,
  RewindIcon: () => RewindIcon,
  RulerIcon: () => RulerIcon,
  SaveIcon: () => SaveIcon,
  SearchIcon: () => SearchIcon,
  ShareAltIcon: () => ShareAltIcon,
  ShareIcon: () => ShareIcon,
  ShieldIcon: () => ShieldIcon,
  SideBySideIcon: () => SideBySideIcon,
  SidebarAltIcon: () => SidebarAltIcon,
  SidebarAltToggleIcon: () => SidebarAltToggleIcon,
  SidebarIcon: () => SidebarIcon,
  SidebarToggleIcon: () => SidebarToggleIcon,
  SortDownIcon: () => SortDownIcon,
  SortUpIcon: () => SortUpIcon,
  SpeakerIcon: () => SpeakerIcon,
  StackedIcon: () => StackedIcon,
  StarHollowIcon: () => StarHollowIcon,
  StarIcon: () => StarIcon,
  StatusFailIcon: () => StatusFailIcon,
  StatusIcon: () => StatusIcon,
  StatusPassIcon: () => StatusPassIcon,
  StatusWarnIcon: () => StatusWarnIcon,
  StickerIcon: () => StickerIcon,
  StopAltHollowIcon: () => StopAltHollowIcon,
  StopAltIcon: () => StopAltIcon,
  StopIcon: () => StopIcon,
  StorybookIcon: () => StorybookIcon,
  StructureIcon: () => StructureIcon,
  SubtractIcon: () => SubtractIcon,
  SunIcon: () => SunIcon,
  SupportIcon: () => SupportIcon,
  SweepIcon: () => SweepIcon,
  SwitchAltIcon: () => SwitchAltIcon,
  SyncIcon: () => SyncIcon,
  TabletIcon: () => TabletIcon,
  ThumbsUpIcon: () => ThumbsUpIcon,
  TimeIcon: () => TimeIcon,
  TimerIcon: () => TimerIcon,
  TransferIcon: () => TransferIcon,
  TrashIcon: () => TrashIcon,
  TwitterIcon: () => TwitterIcon,
  TypeIcon: () => TypeIcon,
  UbuntuIcon: () => UbuntuIcon,
  UndoIcon: () => UndoIcon,
  UnfoldIcon: () => UnfoldIcon,
  UnlockIcon: () => UnlockIcon,
  UnpinIcon: () => UnpinIcon,
  UploadIcon: () => UploadIcon,
  UserAddIcon: () => UserAddIcon,
  UserAltIcon: () => UserAltIcon,
  UserIcon: () => UserIcon,
  UsersIcon: () => UsersIcon,
  VSCodeIcon: () => VSCodeIcon,
  VerifiedIcon: () => VerifiedIcon,
  VideoIcon: () => VideoIcon,
  WandIcon: () => WandIcon,
  WatchIcon: () => WatchIcon,
  WindowsIcon: () => WindowsIcon,
  WrenchIcon: () => WrenchIcon,
  XIcon: () => XIcon,
  YoutubeIcon: () => YoutubeIcon,
  ZoomIcon: () => ZoomIcon,
  ZoomOutIcon: () => ZoomOutIcon,
  ZoomResetIcon: () => ZoomResetIcon,
  default: () => icons_default,
  iconList: () => iconList
});
var icons_default = __STORYBOOK_ICONS__, { AccessibilityAltIcon, AccessibilityIcon, AccessibilityIgnoredIcon, AddIcon, AdminIcon, AlertAltIcon, AlertIcon, AlignLeftIcon, AlignRightIcon, AppleIcon, ArrowBottomLeftIcon, ArrowBottomRightIcon, ArrowDownIcon, ArrowLeftIcon, ArrowRightIcon, ArrowSolidDownIcon, ArrowSolidLeftIcon, ArrowSolidRightIcon, ArrowSolidUpIcon, ArrowTopLeftIcon, ArrowTopRightIcon, ArrowUpIcon, AzureDevOpsIcon, BackIcon, BasketIcon, BatchAcceptIcon, BatchDenyIcon, BeakerIcon, BellIcon, BitbucketIcon, BoldIcon, BookIcon, BookmarkHollowIcon, BookmarkIcon, BottomBarIcon, BottomBarToggleIcon, BoxIcon, BranchIcon, BrowserIcon, BugIcon, ButtonIcon, CPUIcon, CalendarIcon, CameraIcon, CameraStabilizeIcon, CategoryIcon, CertificateIcon, ChangedIcon, ChatIcon, CheckIcon, ChevronDownIcon, ChevronLeftIcon, ChevronRightIcon, ChevronSmallDownIcon, ChevronSmallLeftIcon, ChevronSmallRightIcon, ChevronSmallUpIcon, ChevronUpIcon, ChromaticIcon, ChromeIcon, CircleHollowIcon, CircleIcon, ClearIcon, CloseAltIcon, CloseIcon, CloudHollowIcon, CloudIcon, CogIcon, CollapseIcon, CommandIcon, CommentAddIcon, CommentIcon, CommentsIcon, CommitIcon, CompassIcon, ComponentDrivenIcon, ComponentIcon, ContrastIcon, ContrastIgnoredIcon, ControlsIcon, CopyIcon, CreditIcon, CrossIcon, DashboardIcon, DatabaseIcon, DeleteIcon, DiamondIcon, DirectionIcon, DiscordIcon, DocChartIcon, DocListIcon, DocumentIcon, DownloadIcon, DragIcon, EditIcon, EditorIcon, EllipsisIcon, EmailIcon, ExpandAltIcon, ExpandIcon, EyeCloseIcon, EyeIcon, FaceHappyIcon, FaceNeutralIcon, FaceSadIcon, FacebookIcon, FailedIcon, FastForwardIcon, FigmaIcon, FilterIcon, FlagIcon, FolderIcon, FormIcon, GDriveIcon, GiftIcon, GithubIcon, GitlabIcon, GlobeIcon, GoogleIcon, GraphBarIcon, GraphLineIcon, GraphqlIcon, GridAltIcon, GridIcon, GrowIcon, HeartHollowIcon, HeartIcon, HomeIcon, HourglassIcon, InfoIcon, ItalicIcon, JumpToIcon, KeyIcon, LightningIcon, LightningOffIcon, LinkBrokenIcon, LinkIcon, LinkedinIcon, LinuxIcon, ListOrderedIcon, ListUnorderedIcon, LocationIcon, LockIcon, MarkdownIcon, MarkupIcon, MediumIcon, MemoryIcon, MenuIcon, MergeIcon, MirrorIcon, MobileIcon, MoonIcon, NutIcon, OutboxIcon, OutlineIcon, PaintBrushAltIcon, PaintBrushIcon, PaperClipIcon, ParagraphIcon, PassedIcon, PhoneIcon, PhotoDragIcon, PhotoIcon, PhotoStabilizeIcon, PinAltIcon, PinIcon, PlayAllHollowIcon, PlayBackIcon, PlayHollowIcon, PlayIcon, PlayNextIcon, PlusIcon, PointerDefaultIcon, PointerHandIcon, PowerIcon, PrintIcon, ProceedIcon, ProfileIcon, PullRequestIcon, QuestionIcon, RSSIcon, RedirectIcon, ReduxIcon, RefreshIcon, ReplyIcon, RepoIcon, RequestChangeIcon, RewindIcon, RulerIcon, SaveIcon, SearchIcon, ShareAltIcon, ShareIcon, ShieldIcon, SideBySideIcon, SidebarAltIcon, SidebarAltToggleIcon, SidebarIcon, SidebarToggleIcon, SortDownIcon, SortUpIcon, SpeakerIcon, StackedIcon, StarHollowIcon, StarIcon, StatusFailIcon, StatusIcon, StatusPassIcon, StatusWarnIcon, StickerIcon, StopAltHollowIcon, StopAltIcon, StopIcon, StorybookIcon, StructureIcon, SubtractIcon, SunIcon, SupportIcon, SweepIcon, SwitchAltIcon, SyncIcon, TabletIcon, ThumbsUpIcon, TimeIcon, TimerIcon, TransferIcon, TrashIcon, TwitterIcon, TypeIcon, UbuntuIcon, UndoIcon, UnfoldIcon, UnlockIcon, UnpinIcon, UploadIcon, UserAddIcon, UserAltIcon, UserIcon, UsersIcon, VSCodeIcon, VerifiedIcon, VideoIcon, WandIcon, WatchIcon, WindowsIcon, WrenchIcon, XIcon, YoutubeIcon, ZoomIcon, ZoomOutIcon, ZoomResetIcon, iconList } = __STORYBOOK_ICONS__;

// global-externals:storybook/manager-api
var manager_api_default = __STORYBOOK_API__, { ActiveTabs, Consumer, ManagerContext, Provider, RequestResponseError, addons, combineParameters, controlOrMetaKey, controlOrMetaSymbol, eventMatchesShortcut, eventToShortcut, experimental_MockUniversalStore, experimental_UniversalStore, experimental_getStatusStore, experimental_getTestProviderStore, experimental_requestResponse, experimental_useStatusStore, experimental_useTestProviderStore, experimental_useUniversalStore, internal_checklistStore, internal_fullStatusStore, internal_fullTestProviderStore, internal_universalChecklistStore, internal_universalStatusStore, internal_universalTestProviderStore, isMacLike, isShortcutTaken, keyToSymbol, merge, mockChannel, optionOrAltSymbol, shortcutMatchesShortcut, shortcutToAriaKeyshortcuts, shortcutToHumanString, types, useAddonState, useArgTypes, useArgs, useChannel, useGlobalTypes, useGlobals, useParameter, useSharedState, useStoryPrepared, useStorybookApi, useStorybookState } = __STORYBOOK_API__;

// global-externals:storybook/theming
var theming_default = __STORYBOOK_THEMING__, { CacheProvider, ClassNames, Global, ThemeProvider, background, color, convert, create, createCache, createGlobal, createReset, css, darken, ensure, getPreferredColorScheme, ignoreSsrWarning, isPropValid, jsx, keyframes, lighten, styled, themes, tokens, typography, useTheme, withTheme } = __STORYBOOK_THEMING__;

// global-externals:storybook/internal/components
var components_default = __STORYBOOK_COMPONENTS__, { A, AbstractToolbar, ActionBar, ActionList, AddonPanel, Badge, Bar, Blockquote, Button, Card, ClipboardCode, Code, Collapsible, DL, Div, DocumentWrapper, EmptyTabContent, ErrorFormatter, FlexBar, Form, H1, H2, H3, H4, H5, H6, HR, IconButton, Img, LI, Link, ListItem, Loader, Modal, ModalDecorator, OL, P, Placeholder, Popover, PopoverProvider, Pre, ProgressSpinner, ResetWrapper, ScrollArea, Select, Separator, Spaced, Span, StatelessTab, StatelessTabList, StatelessTabPanel, StatelessTabsView, StorybookIcon: StorybookIcon2, StorybookLogo, SyntaxHighlighter, TT, TabBar, TabButton, TabList, TabPanel, TabWrapper, Table, Tabs, TabsState, TabsView, ToggleButton, Toolbar, Tooltip, TooltipLinkList, TooltipMessage, TooltipNote, TooltipProvider, UL, WithTooltip, WithTooltipPure, Zoom, codeCommon, components, convertToReactAriaPlacement, createCopyToClipboardFunction, getStoryHref, interleaveSeparators, nameSpaceClassNames, resetComponents, useTabsState, withReset } = __STORYBOOK_COMPONENTS__;

// src/toolbar/utils/normalize-toolbar-arg-type.ts
var defaultItemValues = {
  type: "item",
  value: ""
}, normalizeArgType = (key, argType) => ({
  ...argType,
  name: argType.name || key,
  description: argType.description || key,
  toolbar: {
    ...argType.toolbar,
    items: argType.toolbar.items.map((_item) => {
      let item = typeof _item == "string" ? { value: _item, title: _item } : _item;
      return item.type === "reset" && argType.toolbar.icon && (item.icon = argType.toolbar.icon, item.hideIcon = !0), { ...defaultItemValues, ...item };
    })
  }
});

// global-externals:storybook/internal/client-logger
var client_logger_default = __STORYBOOK_CLIENT_LOGGER__, { deprecate, logger, once, pretty } = __STORYBOOK_CLIENT_LOGGER__;

// src/components/components/icon/icon.tsx
var NEW_ICON_MAP = icons_exports, Svg = styled.svg`
  display: inline-block;
  shape-rendering: inherit;
  vertical-align: middle;
  fill: currentColor;
  path {
    fill: currentColor;
  }
`, Icons = ({
  icon,
  useSymbol,
  __suppressDeprecationWarning = !1,
  ...props
}) => {
  __suppressDeprecationWarning || deprecate(
    `Use of the deprecated Icons ${`(${icon})` || ""} component detected. Please use the @storybook/icons component directly. For more informations, see the migration notes at https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#icons-is-deprecated`
  );
  let findIcon = icons[icon] || null;
  if (!findIcon)
    return logger.warn(
      `Use of an unknown prop ${`(${icon})` || ""} in the Icons component. The Icons component is deprecated. Please use the @storybook/icons component directly. For more informations, see the migration notes at https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#icons-is-deprecated`
    ), null;
  let Icon = NEW_ICON_MAP[findIcon];
  return react_default.createElement(Icon, { ...props });
}, Symbols = memo(function({ icons: keys = Object.keys(icons) }) {
  return react_default.createElement(
    Svg,
    {
      viewBox: "0 0 14 14",
      style: { position: "absolute", width: 0, height: 0 },
      "data-chromatic": "ignore"
    },
    keys.map((key) => react_default.createElement("symbol", { id: `icon--${key}`, key }, icons[key]))
  );
}), icons = {
  user: "UserIcon",
  useralt: "UserAltIcon",
  useradd: "UserAddIcon",
  users: "UsersIcon",
  profile: "ProfileIcon",
  facehappy: "FaceHappyIcon",
  faceneutral: "FaceNeutralIcon",
  facesad: "FaceSadIcon",
  accessibility: "AccessibilityIcon",
  accessibilityalt: "AccessibilityAltIcon",
  arrowup: "ChevronUpIcon",
  arrowdown: "ChevronDownIcon",
  arrowleft: "ChevronLeftIcon",
  arrowright: "ChevronRightIcon",
  arrowupalt: "ArrowUpIcon",
  arrowdownalt: "ArrowDownIcon",
  arrowleftalt: "ArrowLeftIcon",
  arrowrightalt: "ArrowRightIcon",
  expandalt: "ExpandAltIcon",
  collapse: "CollapseIcon",
  expand: "ExpandIcon",
  unfold: "UnfoldIcon",
  transfer: "TransferIcon",
  redirect: "RedirectIcon",
  undo: "UndoIcon",
  reply: "ReplyIcon",
  sync: "SyncIcon",
  upload: "UploadIcon",
  download: "DownloadIcon",
  back: "BackIcon",
  proceed: "ProceedIcon",
  refresh: "RefreshIcon",
  globe: "GlobeIcon",
  compass: "CompassIcon",
  location: "LocationIcon",
  pin: "PinIcon",
  time: "TimeIcon",
  dashboard: "DashboardIcon",
  timer: "TimerIcon",
  home: "HomeIcon",
  admin: "AdminIcon",
  info: "InfoIcon",
  question: "QuestionIcon",
  support: "SupportIcon",
  alert: "AlertIcon",
  email: "EmailIcon",
  phone: "PhoneIcon",
  link: "LinkIcon",
  unlink: "LinkBrokenIcon",
  bell: "BellIcon",
  rss: "RSSIcon",
  sharealt: "ShareAltIcon",
  share: "ShareIcon",
  circle: "CircleIcon",
  circlehollow: "CircleHollowIcon",
  bookmarkhollow: "BookmarkHollowIcon",
  bookmark: "BookmarkIcon",
  hearthollow: "HeartHollowIcon",
  heart: "HeartIcon",
  starhollow: "StarHollowIcon",
  star: "StarIcon",
  certificate: "CertificateIcon",
  verified: "VerifiedIcon",
  thumbsup: "ThumbsUpIcon",
  shield: "ShieldIcon",
  basket: "BasketIcon",
  beaker: "BeakerIcon",
  hourglass: "HourglassIcon",
  flag: "FlagIcon",
  cloudhollow: "CloudHollowIcon",
  edit: "EditIcon",
  cog: "CogIcon",
  nut: "NutIcon",
  wrench: "WrenchIcon",
  ellipsis: "EllipsisIcon",
  check: "CheckIcon",
  form: "FormIcon",
  batchdeny: "BatchDenyIcon",
  batchaccept: "BatchAcceptIcon",
  controls: "ControlsIcon",
  plus: "PlusIcon",
  closeAlt: "CloseAltIcon",
  cross: "CrossIcon",
  trash: "TrashIcon",
  pinalt: "PinAltIcon",
  unpin: "UnpinIcon",
  add: "AddIcon",
  subtract: "SubtractIcon",
  close: "CloseIcon",
  delete: "DeleteIcon",
  passed: "PassedIcon",
  changed: "ChangedIcon",
  failed: "FailedIcon",
  clear: "ClearIcon",
  comment: "CommentIcon",
  commentadd: "CommentAddIcon",
  requestchange: "RequestChangeIcon",
  comments: "CommentsIcon",
  lock: "LockIcon",
  unlock: "UnlockIcon",
  key: "KeyIcon",
  outbox: "OutboxIcon",
  credit: "CreditIcon",
  button: "ButtonIcon",
  type: "TypeIcon",
  pointerdefault: "PointerDefaultIcon",
  pointerhand: "PointerHandIcon",
  browser: "BrowserIcon",
  tablet: "TabletIcon",
  mobile: "MobileIcon",
  watch: "WatchIcon",
  sidebar: "SidebarIcon",
  sidebaralt: "SidebarAltIcon",
  sidebaralttoggle: "SidebarAltToggleIcon",
  sidebartoggle: "SidebarToggleIcon",
  bottombar: "BottomBarIcon",
  bottombartoggle: "BottomBarToggleIcon",
  cpu: "CPUIcon",
  database: "DatabaseIcon",
  memory: "MemoryIcon",
  structure: "StructureIcon",
  box: "BoxIcon",
  power: "PowerIcon",
  photo: "PhotoIcon",
  component: "ComponentIcon",
  grid: "GridIcon",
  outline: "OutlineIcon",
  photodrag: "PhotoDragIcon",
  search: "SearchIcon",
  zoom: "ZoomIcon",
  zoomout: "ZoomOutIcon",
  zoomreset: "ZoomResetIcon",
  eye: "EyeIcon",
  eyeclose: "EyeCloseIcon",
  lightning: "LightningIcon",
  lightningoff: "LightningOffIcon",
  contrast: "ContrastIcon",
  switchalt: "SwitchAltIcon",
  mirror: "MirrorIcon",
  grow: "GrowIcon",
  paintbrush: "PaintBrushIcon",
  ruler: "RulerIcon",
  stop: "StopIcon",
  camera: "CameraIcon",
  video: "VideoIcon",
  speaker: "SpeakerIcon",
  play: "PlayIcon",
  playback: "PlayBackIcon",
  playnext: "PlayNextIcon",
  rewind: "RewindIcon",
  fastforward: "FastForwardIcon",
  stopalt: "StopAltIcon",
  sidebyside: "SideBySideIcon",
  stacked: "StackedIcon",
  sun: "SunIcon",
  moon: "MoonIcon",
  book: "BookIcon",
  document: "DocumentIcon",
  copy: "CopyIcon",
  category: "CategoryIcon",
  folder: "FolderIcon",
  print: "PrintIcon",
  graphline: "GraphLineIcon",
  calendar: "CalendarIcon",
  graphbar: "GraphBarIcon",
  menu: "MenuIcon",
  menualt: "MenuIcon",
  filter: "FilterIcon",
  docchart: "DocChartIcon",
  doclist: "DocListIcon",
  markup: "MarkupIcon",
  bold: "BoldIcon",
  paperclip: "PaperClipIcon",
  listordered: "ListOrderedIcon",
  listunordered: "ListUnorderedIcon",
  paragraph: "ParagraphIcon",
  markdown: "MarkdownIcon",
  repository: "RepoIcon",
  commit: "CommitIcon",
  branch: "BranchIcon",
  pullrequest: "PullRequestIcon",
  merge: "MergeIcon",
  apple: "AppleIcon",
  linux: "LinuxIcon",
  ubuntu: "UbuntuIcon",
  windows: "WindowsIcon",
  storybook: "StorybookIcon",
  azuredevops: "AzureDevOpsIcon",
  bitbucket: "BitbucketIcon",
  chrome: "ChromeIcon",
  chromatic: "ChromaticIcon",
  componentdriven: "ComponentDrivenIcon",
  discord: "DiscordIcon",
  facebook: "FacebookIcon",
  figma: "FigmaIcon",
  gdrive: "GDriveIcon",
  github: "GithubIcon",
  gitlab: "GitlabIcon",
  google: "GoogleIcon",
  graphql: "GraphqlIcon",
  medium: "MediumIcon",
  redux: "ReduxIcon",
  twitter: "TwitterIcon",
  youtube: "YoutubeIcon",
  vscode: "VSCodeIcon"
};

// src/toolbar/utils/create-cycle-value-array.ts
var disallowedCycleableItemTypes = ["reset"], createCycleValueArray = (items) => items.filter((item) => !disallowedCycleableItemTypes.includes(item.type)).map((item) => item.value);

// src/toolbar/constants.ts
var TOOLBAR_ID = "toolbar";

// src/toolbar/utils/register-shortcuts.ts
var registerShortcuts = async (api, id, shortcuts) => {
  shortcuts && shortcuts.next && await api.setAddonShortcut(TOOLBAR_ID, {
    label: shortcuts.next.label,
    defaultShortcut: shortcuts.next.keys,
    actionName: `${id}:next`,
    action: shortcuts.next.action
  }), shortcuts && shortcuts.previous && await api.setAddonShortcut(TOOLBAR_ID, {
    label: shortcuts.previous.label,
    defaultShortcut: shortcuts.previous.keys,
    actionName: `${id}:previous`,
    action: shortcuts.previous.action
  }), shortcuts && shortcuts.reset && await api.setAddonShortcut(TOOLBAR_ID, {
    label: shortcuts.reset.label,
    defaultShortcut: shortcuts.reset.keys,
    actionName: `${id}:reset`,
    action: shortcuts.reset.action
  });
};

// src/toolbar/hoc/withKeyboardCycle.tsx
var withKeyboardCycle = (Component2) => (props) => {
  let {
    id,
    toolbar: { items, shortcuts }
  } = props, api = useStorybookApi(), [globals, updateGlobals] = useGlobals(), cycleValues = useRef([]), currentValue = globals[id], reset = useCallback(() => {
    updateGlobals({ [id]: "" });
  }, [updateGlobals]), setNext = useCallback(() => {
    let values = cycleValues.current, currentIndex = values.indexOf(currentValue), newCurrentIndex = currentIndex === values.length - 1 ? 0 : currentIndex + 1, newCurrent = cycleValues.current[newCurrentIndex];
    updateGlobals({ [id]: newCurrent });
  }, [cycleValues, currentValue, updateGlobals]), setPrevious = useCallback(() => {
    let values = cycleValues.current, indexOf = values.indexOf(currentValue), currentIndex = indexOf > -1 ? indexOf : 0, newCurrentIndex = currentIndex === 0 ? values.length - 1 : currentIndex - 1, newCurrent = cycleValues.current[newCurrentIndex];
    updateGlobals({ [id]: newCurrent });
  }, [cycleValues, currentValue, updateGlobals]);
  return useEffect(() => {
    shortcuts && registerShortcuts(api, id, {
      next: { ...shortcuts.next, action: setNext },
      previous: { ...shortcuts.previous, action: setPrevious },
      reset: { ...shortcuts.reset, action: reset }
    });
  }, [api, id, shortcuts, setNext, setPrevious, reset]), useEffect(() => {
    cycleValues.current = createCycleValueArray(items);
  }, []), react_default.createElement(Component2, { cycleValues: cycleValues.current, ...props });
};

// src/toolbar/utils/get-selected.ts
var getSelectedItem = ({ currentValue, items }) => currentValue != null && items.find((item) => item.value === currentValue && item.type !== "reset"), getSelectedIcon = ({ currentValue, items }) => {
  let selectedItem = getSelectedItem({ currentValue, items });
  if (selectedItem)
    return selectedItem.icon;
}, getSelectedTitle = ({ currentValue, items }) => {
  let selectedItem = getSelectedItem({ currentValue, items });
  if (selectedItem)
    return selectedItem.title;
};

// src/toolbar/components/ToolbarMenuSelect.tsx
var ToolbarMenuItemContainer = styled("div")({
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 8
}), ToolbarMenuItemMiddle = styled("div")({
  flex: 1
}), ToolbarMenuSelect = withKeyboardCycle(
  ({
    id,
    name,
    description,
    toolbar: { icon: _icon, items, title: _title, preventDynamicIcon, dynamicTitle }
  }) => {
    let [globals, updateGlobals, storyGlobals] = useGlobals(), currentValue = globals[id], isOverridden = id in storyGlobals, icon = _icon, title2 = _title;
    preventDynamicIcon || (icon = getSelectedIcon({ currentValue, items }) || icon), dynamicTitle && (title2 = getSelectedTitle({ currentValue, items }) || title2), !title2 && !icon && console.warn(`Toolbar '${name}' has no title or icon`);
    let resetLabel = items.find((item) => item.type === "reset")?.title, options2 = items.filter((item) => item.type === "item").map((item) => {
      let itemTitle = item.title ?? item.value ?? "Untitled", iconComponent = !item.hideIcon && item.icon ? react_default.createElement(Icons, { icon: item.icon, __suppressDeprecationWarning: !0 }) : void 0;
      return item.right ? {
        title: itemTitle,
        value: item.value,
        children: react_default.createElement(ToolbarMenuItemContainer, null, iconComponent, react_default.createElement(ToolbarMenuItemMiddle, null, item.title ?? item.value), item.right)
      } : {
        title: itemTitle,
        value: item.value,
        icon: iconComponent
      };
    }), ariaLabel = description || title2 || name || id;
    return react_default.createElement(
      Select,
      {
        defaultOptions: [currentValue],
        options: options2,
        disabled: isOverridden,
        ariaLabel,
        tooltip: ariaLabel,
        resetLabel,
        onReset: () => updateGlobals({ [id]: "_reset" }),
        onSelect: (selected) => updateGlobals({ [id]: selected }),
        icon: icon && react_default.createElement(Icons, { icon, __suppressDeprecationWarning: !0 })
      },
      title2
    );
  }
);

// src/toolbar/components/ToolbarManager.tsx
var ToolbarManager = () => {
  let globalTypes = useGlobalTypes(), globalIds = Object.keys(globalTypes).filter((id) => !!globalTypes[id].toolbar);
  return globalIds.length ? react_default.createElement(react_default.Fragment, null, react_default.createElement(Separator, null), globalIds.map((id) => {
    let normalizedArgType = normalizeArgType(id, globalTypes[id]);
    return react_default.createElement(ToolbarMenuSelect, { key: id, id, ...normalizedArgType });
  })) : null;
};

// global-externals:react-dom/client
var client_default = __REACT_DOM_CLIENT__, { createRoot, hydrateRoot } = __REACT_DOM_CLIENT__;

// global-externals:storybook/internal/manager-errors
var manager_errors_default = __STORYBOOK_CORE_EVENTS_MANAGER_ERRORS__, { Category, ProviderDoesNotExtendBaseProviderError, StatusTypeIdMismatchError, UncaughtManagerError } = __STORYBOOK_CORE_EVENTS_MANAGER_ERRORS__;

// global-externals:storybook/internal/router
var router_default = __STORYBOOK_ROUTER__, { BaseLocationProvider, DEEPLY_EQUAL, Link: Link2, Location, LocationProvider, Match, Route, buildArgsParam, deepDiff, getMatch, parsePath, queryFromLocation, stringifyQuery, useNavigate } = __STORYBOOK_ROUTER__;

// ../node_modules/react-helmet-async/lib/index.module.js
var import_prop_types = __toESM(require_prop_types()), import_react_fast_compare = __toESM(require_react_fast_compare()), import_invariant = __toESM(require_browser()), import_shallowequal = __toESM(require_shallowequal());
function a() {
  return a = Object.assign || function(t2) {
    for (var e2 = 1; e2 < arguments.length; e2++) {
      var r3 = arguments[e2];
      for (var n3 in r3) Object.prototype.hasOwnProperty.call(r3, n3) && (t2[n3] = r3[n3]);
    }
    return t2;
  }, a.apply(this, arguments);
}
function s(t2, e2) {
  t2.prototype = Object.create(e2.prototype), t2.prototype.constructor = t2, c(t2, e2);
}
function c(t2, e2) {
  return c = Object.setPrototypeOf || function(t3, e3) {
    return t3.__proto__ = e3, t3;
  }, c(t2, e2);
}
function u(t2, e2) {
  if (t2 == null) return {};
  var r3, n3, i2 = {}, o3 = Object.keys(t2);
  for (n3 = 0; n3 < o3.length; n3++) e2.indexOf(r3 = o3[n3]) >= 0 || (i2[r3] = t2[r3]);
  return i2;
}
var l = { BASE: "base", BODY: "body", HEAD: "head", HTML: "html", LINK: "link", META: "meta", NOSCRIPT: "noscript", SCRIPT: "script", STYLE: "style", TITLE: "title", FRAGMENT: "Symbol(react.fragment)" }, p = { rel: ["amphtml", "canonical", "alternate"] }, f = { type: ["application/ld+json"] }, d = { charset: "", name: ["robots", "description"], property: ["og:type", "og:title", "og:url", "og:image", "og:image:alt", "og:description", "twitter:url", "twitter:title", "twitter:description", "twitter:image", "twitter:image:alt", "twitter:card", "twitter:site"] }, h = Object.keys(l).map(function(t2) {
  return l[t2];
}), m = { accesskey: "accessKey", charset: "charSet", class: "className", contenteditable: "contentEditable", contextmenu: "contextMenu", "http-equiv": "httpEquiv", itemprop: "itemProp", tabindex: "tabIndex" }, y = Object.keys(m).reduce(function(t2, e2) {
  return t2[m[e2]] = e2, t2;
}, {}), T = function(t2, e2) {
  for (var r3 = t2.length - 1; r3 >= 0; r3 -= 1) {
    var n3 = t2[r3];
    if (Object.prototype.hasOwnProperty.call(n3, e2)) return n3[e2];
  }
  return null;
}, g = function(t2) {
  var e2 = T(t2, l.TITLE), r3 = T(t2, "titleTemplate");
  if (Array.isArray(e2) && (e2 = e2.join("")), r3 && e2) return r3.replace(/%s/g, function() {
    return e2;
  });
  var n3 = T(t2, "defaultTitle");
  return e2 || n3 || void 0;
}, b = function(t2) {
  return T(t2, "onChangeClientState") || function() {
  };
}, v = function(t2, e2) {
  return e2.filter(function(e3) {
    return e3[t2] !== void 0;
  }).map(function(e3) {
    return e3[t2];
  }).reduce(function(t3, e3) {
    return a({}, t3, e3);
  }, {});
}, A2 = function(t2, e2) {
  return e2.filter(function(t3) {
    return t3[l.BASE] !== void 0;
  }).map(function(t3) {
    return t3[l.BASE];
  }).reverse().reduce(function(e3, r3) {
    if (!e3.length) for (var n3 = Object.keys(r3), i2 = 0; i2 < n3.length; i2 += 1) {
      var o3 = n3[i2].toLowerCase();
      if (t2.indexOf(o3) !== -1 && r3[o3]) return e3.concat(r3);
    }
    return e3;
  }, []);
}, C = function(t2, e2, r3) {
  var n3 = {};
  return r3.filter(function(e3) {
    return !!Array.isArray(e3[t2]) || (e3[t2] !== void 0 && console && typeof console.warn == "function" && console.warn("Helmet: " + t2 + ' should be of type "Array". Instead found type "' + typeof e3[t2] + '"'), !1);
  }).map(function(e3) {
    return e3[t2];
  }).reverse().reduce(function(t3, r4) {
    var i2 = {};
    r4.filter(function(t4) {
      for (var r5, o4 = Object.keys(t4), a2 = 0; a2 < o4.length; a2 += 1) {
        var s3 = o4[a2], c3 = s3.toLowerCase();
        e2.indexOf(c3) === -1 || r5 === "rel" && t4[r5].toLowerCase() === "canonical" || c3 === "rel" && t4[c3].toLowerCase() === "stylesheet" || (r5 = c3), e2.indexOf(s3) === -1 || s3 !== "innerHTML" && s3 !== "cssText" && s3 !== "itemprop" || (r5 = s3);
      }
      if (!r5 || !t4[r5]) return !1;
      var u3 = t4[r5].toLowerCase();
      return n3[r5] || (n3[r5] = {}), i2[r5] || (i2[r5] = {}), !n3[r5][u3] && (i2[r5][u3] = !0, !0);
    }).reverse().forEach(function(e3) {
      return t3.push(e3);
    });
    for (var o3 = Object.keys(i2), s2 = 0; s2 < o3.length; s2 += 1) {
      var c2 = o3[s2], u2 = a({}, n3[c2], i2[c2]);
      n3[c2] = u2;
    }
    return t3;
  }, []).reverse();
}, O = function(t2, e2) {
  if (Array.isArray(t2) && t2.length) {
    for (var r3 = 0; r3 < t2.length; r3 += 1) if (t2[r3][e2]) return !0;
  }
  return !1;
}, S = function(t2) {
  return Array.isArray(t2) ? t2.join("") : t2;
}, E = function(t2, e2) {
  return Array.isArray(t2) ? t2.reduce(function(t3, r3) {
    return (function(t4, e3) {
      for (var r4 = Object.keys(t4), n3 = 0; n3 < r4.length; n3 += 1) if (e3[r4[n3]] && e3[r4[n3]].includes(t4[r4[n3]])) return !0;
      return !1;
    })(r3, e2) ? t3.priority.push(r3) : t3.default.push(r3), t3;
  }, { priority: [], default: [] }) : { default: t2 };
}, I = function(t2, e2) {
  var r3;
  return a({}, t2, ((r3 = {})[e2] = void 0, r3));
}, P2 = [l.NOSCRIPT, l.SCRIPT, l.STYLE], w = function(t2, e2) {
  return e2 === void 0 && (e2 = !0), e2 === !1 ? String(t2) : String(t2).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
}, x = function(t2) {
  return Object.keys(t2).reduce(function(e2, r3) {
    var n3 = t2[r3] !== void 0 ? r3 + '="' + t2[r3] + '"' : "" + r3;
    return e2 ? e2 + " " + n3 : n3;
  }, "");
}, L = function(t2, e2) {
  return e2 === void 0 && (e2 = {}), Object.keys(t2).reduce(function(e3, r3) {
    return e3[m[r3] || r3] = t2[r3], e3;
  }, e2);
}, j = function(e2, r3) {
  return r3.map(function(r4, n3) {
    var i2, o3 = ((i2 = { key: n3 })["data-rh"] = !0, i2);
    return Object.keys(r4).forEach(function(t2) {
      var e3 = m[t2] || t2;
      e3 === "innerHTML" || e3 === "cssText" ? o3.dangerouslySetInnerHTML = { __html: r4.innerHTML || r4.cssText } : o3[e3] = r4[t2];
    }), react_default.createElement(e2, o3);
  });
}, M = function(e2, r3, n3) {
  switch (e2) {
    case l.TITLE:
      return { toComponent: function() {
        return n4 = r3.titleAttributes, (i2 = { key: e3 = r3.title })["data-rh"] = !0, o3 = L(n4, i2), [react_default.createElement(l.TITLE, o3, e3)];
        var e3, n4, i2, o3;
      }, toString: function() {
        return (function(t2, e3, r4, n4) {
          var i2 = x(r4), o3 = S(e3);
          return i2 ? "<" + t2 + ' data-rh="true" ' + i2 + ">" + w(o3, n4) + "</" + t2 + ">" : "<" + t2 + ' data-rh="true">' + w(o3, n4) + "</" + t2 + ">";
        })(e2, r3.title, r3.titleAttributes, n3);
      } };
    case "bodyAttributes":
    case "htmlAttributes":
      return { toComponent: function() {
        return L(r3);
      }, toString: function() {
        return x(r3);
      } };
    default:
      return { toComponent: function() {
        return j(e2, r3);
      }, toString: function() {
        return (function(t2, e3, r4) {
          return e3.reduce(function(e4, n4) {
            var i2 = Object.keys(n4).filter(function(t3) {
              return !(t3 === "innerHTML" || t3 === "cssText");
            }).reduce(function(t3, e5) {
              var i3 = n4[e5] === void 0 ? e5 : e5 + '="' + w(n4[e5], r4) + '"';
              return t3 ? t3 + " " + i3 : i3;
            }, ""), o3 = n4.innerHTML || n4.cssText || "", a2 = P2.indexOf(t2) === -1;
            return e4 + "<" + t2 + ' data-rh="true" ' + i2 + (a2 ? "/>" : ">" + o3 + "</" + t2 + ">");
          }, "");
        })(e2, r3, n3);
      } };
  }
}, k = function(t2) {
  var e2 = t2.baseTag, r3 = t2.bodyAttributes, n3 = t2.encode, i2 = t2.htmlAttributes, o3 = t2.noscriptTags, a2 = t2.styleTags, s2 = t2.title, c2 = s2 === void 0 ? "" : s2, u2 = t2.titleAttributes, h2 = t2.linkTags, m2 = t2.metaTags, y2 = t2.scriptTags, T3 = { toComponent: function() {
  }, toString: function() {
    return "";
  } };
  if (t2.prioritizeSeoTags) {
    var g2 = (function(t3) {
      var e3 = t3.linkTags, r4 = t3.scriptTags, n4 = t3.encode, i3 = E(t3.metaTags, d), o4 = E(e3, p), a3 = E(r4, f);
      return { priorityMethods: { toComponent: function() {
        return [].concat(j(l.META, i3.priority), j(l.LINK, o4.priority), j(l.SCRIPT, a3.priority));
      }, toString: function() {
        return M(l.META, i3.priority, n4) + " " + M(l.LINK, o4.priority, n4) + " " + M(l.SCRIPT, a3.priority, n4);
      } }, metaTags: i3.default, linkTags: o4.default, scriptTags: a3.default };
    })(t2);
    T3 = g2.priorityMethods, h2 = g2.linkTags, m2 = g2.metaTags, y2 = g2.scriptTags;
  }
  return { priority: T3, base: M(l.BASE, e2, n3), bodyAttributes: M("bodyAttributes", r3, n3), htmlAttributes: M("htmlAttributes", i2, n3), link: M(l.LINK, h2, n3), meta: M(l.META, m2, n3), noscript: M(l.NOSCRIPT, o3, n3), script: M(l.SCRIPT, y2, n3), style: M(l.STYLE, a2, n3), title: M(l.TITLE, { title: c2, titleAttributes: u2 }, n3) };
}, H = [], N = function(t2, e2) {
  var r3 = this;
  e2 === void 0 && (e2 = typeof document < "u"), this.instances = [], this.value = { setHelmet: function(t3) {
    r3.context.helmet = t3;
  }, helmetInstances: { get: function() {
    return r3.canUseDOM ? H : r3.instances;
  }, add: function(t3) {
    (r3.canUseDOM ? H : r3.instances).push(t3);
  }, remove: function(t3) {
    var e3 = (r3.canUseDOM ? H : r3.instances).indexOf(t3);
    (r3.canUseDOM ? H : r3.instances).splice(e3, 1);
  } } }, this.context = t2, this.canUseDOM = e2, e2 || (t2.helmet = k({ baseTag: [], bodyAttributes: {}, encodeSpecialCharacters: !0, htmlAttributes: {}, linkTags: [], metaTags: [], noscriptTags: [], scriptTags: [], styleTags: [], title: "", titleAttributes: {} }));
}, R = react_default.createContext({}), D = import_prop_types.default.shape({ setHelmet: import_prop_types.default.func, helmetInstances: import_prop_types.default.shape({ get: import_prop_types.default.func, add: import_prop_types.default.func, remove: import_prop_types.default.func }) }), U = typeof document < "u", q = (function(e2) {
  function r3(t2) {
    var n3;
    return (n3 = e2.call(this, t2) || this).helmetData = new N(n3.props.context, r3.canUseDOM), n3;
  }
  return s(r3, e2), r3.prototype.render = function() {
    return react_default.createElement(R.Provider, { value: this.helmetData.value }, this.props.children);
  }, r3;
})(Component);
q.canUseDOM = U, q.propTypes = { context: import_prop_types.default.shape({ helmet: import_prop_types.default.shape() }), children: import_prop_types.default.node.isRequired }, q.defaultProps = { context: {} }, q.displayName = "HelmetProvider";
var Y = function(t2, e2) {
  var r3, n3 = document.head || document.querySelector(l.HEAD), i2 = n3.querySelectorAll(t2 + "[data-rh]"), o3 = [].slice.call(i2), a2 = [];
  return e2 && e2.length && e2.forEach(function(e3) {
    var n4 = document.createElement(t2);
    for (var i3 in e3) Object.prototype.hasOwnProperty.call(e3, i3) && (i3 === "innerHTML" ? n4.innerHTML = e3.innerHTML : i3 === "cssText" ? n4.styleSheet ? n4.styleSheet.cssText = e3.cssText : n4.appendChild(document.createTextNode(e3.cssText)) : n4.setAttribute(i3, e3[i3] === void 0 ? "" : e3[i3]));
    n4.setAttribute("data-rh", "true"), o3.some(function(t3, e4) {
      return r3 = e4, n4.isEqualNode(t3);
    }) ? o3.splice(r3, 1) : a2.push(n4);
  }), o3.forEach(function(t3) {
    return t3.parentNode.removeChild(t3);
  }), a2.forEach(function(t3) {
    return n3.appendChild(t3);
  }), { oldTags: o3, newTags: a2 };
}, B = function(t2, e2) {
  var r3 = document.getElementsByTagName(t2)[0];
  if (r3) {
    for (var n3 = r3.getAttribute("data-rh"), i2 = n3 ? n3.split(",") : [], o3 = [].concat(i2), a2 = Object.keys(e2), s2 = 0; s2 < a2.length; s2 += 1) {
      var c2 = a2[s2], u2 = e2[c2] || "";
      r3.getAttribute(c2) !== u2 && r3.setAttribute(c2, u2), i2.indexOf(c2) === -1 && i2.push(c2);
      var l3 = o3.indexOf(c2);
      l3 !== -1 && o3.splice(l3, 1);
    }
    for (var p2 = o3.length - 1; p2 >= 0; p2 -= 1) r3.removeAttribute(o3[p2]);
    i2.length === o3.length ? r3.removeAttribute("data-rh") : r3.getAttribute("data-rh") !== a2.join(",") && r3.setAttribute("data-rh", a2.join(","));
  }
}, K = function(t2, e2) {
  var r3 = t2.baseTag, n3 = t2.htmlAttributes, i2 = t2.linkTags, o3 = t2.metaTags, a2 = t2.noscriptTags, s2 = t2.onChangeClientState, c2 = t2.scriptTags, u2 = t2.styleTags, p2 = t2.title, f2 = t2.titleAttributes;
  B(l.BODY, t2.bodyAttributes), B(l.HTML, n3), (function(t3, e3) {
    t3 !== void 0 && document.title !== t3 && (document.title = S(t3)), B(l.TITLE, e3);
  })(p2, f2);
  var d2 = { baseTag: Y(l.BASE, r3), linkTags: Y(l.LINK, i2), metaTags: Y(l.META, o3), noscriptTags: Y(l.NOSCRIPT, a2), scriptTags: Y(l.SCRIPT, c2), styleTags: Y(l.STYLE, u2) }, h2 = {}, m2 = {};
  Object.keys(d2).forEach(function(t3) {
    var e3 = d2[t3], r4 = e3.newTags, n4 = e3.oldTags;
    r4.length && (h2[t3] = r4), n4.length && (m2[t3] = d2[t3].oldTags);
  }), e2 && e2(), s2(t2, h2, m2);
}, _ = null, z = (function(t2) {
  function e2() {
    for (var e3, r4 = arguments.length, n3 = new Array(r4), i2 = 0; i2 < r4; i2++) n3[i2] = arguments[i2];
    return (e3 = t2.call.apply(t2, [this].concat(n3)) || this).rendered = !1, e3;
  }
  s(e2, t2);
  var r3 = e2.prototype;
  return r3.shouldComponentUpdate = function(t3) {
    return !(0, import_shallowequal.default)(t3, this.props);
  }, r3.componentDidUpdate = function() {
    this.emitChange();
  }, r3.componentWillUnmount = function() {
    this.props.context.helmetInstances.remove(this), this.emitChange();
  }, r3.emitChange = function() {
    var t3, e3, r4 = this.props.context, n3 = r4.setHelmet, i2 = null, o3 = (t3 = r4.helmetInstances.get().map(function(t4) {
      var e4 = a({}, t4.props);
      return delete e4.context, e4;
    }), { baseTag: A2(["href"], t3), bodyAttributes: v("bodyAttributes", t3), defer: T(t3, "defer"), encode: T(t3, "encodeSpecialCharacters"), htmlAttributes: v("htmlAttributes", t3), linkTags: C(l.LINK, ["rel", "href"], t3), metaTags: C(l.META, ["name", "charset", "http-equiv", "property", "itemprop"], t3), noscriptTags: C(l.NOSCRIPT, ["innerHTML"], t3), onChangeClientState: b(t3), scriptTags: C(l.SCRIPT, ["src", "innerHTML"], t3), styleTags: C(l.STYLE, ["cssText"], t3), title: g(t3), titleAttributes: v("titleAttributes", t3), prioritizeSeoTags: O(t3, "prioritizeSeoTags") });
    q.canUseDOM ? (e3 = o3, _ && cancelAnimationFrame(_), e3.defer ? _ = requestAnimationFrame(function() {
      K(e3, function() {
        _ = null;
      });
    }) : (K(e3), _ = null)) : k && (i2 = k(o3)), n3(i2);
  }, r3.init = function() {
    this.rendered || (this.rendered = !0, this.props.context.helmetInstances.add(this), this.emitChange());
  }, r3.render = function() {
    return this.init(), null;
  }, e2;
})(Component);
z.propTypes = { context: D.isRequired }, z.displayName = "HelmetDispatcher";
var F = ["children"], G = ["children"], W = (function(e2) {
  function r3() {
    return e2.apply(this, arguments) || this;
  }
  s(r3, e2);
  var o3 = r3.prototype;
  return o3.shouldComponentUpdate = function(t2) {
    return !(0, import_react_fast_compare.default)(I(this.props, "helmetData"), I(t2, "helmetData"));
  }, o3.mapNestedChildrenToProps = function(t2, e3) {
    if (!e3) return null;
    switch (t2.type) {
      case l.SCRIPT:
      case l.NOSCRIPT:
        return { innerHTML: e3 };
      case l.STYLE:
        return { cssText: e3 };
      default:
        throw new Error("<" + t2.type + " /> elements are self-closing and can not contain children. Refer to our API for more information.");
    }
  }, o3.flattenArrayTypeChildren = function(t2) {
    var e3, r4 = t2.child, n3 = t2.arrayTypeChildren;
    return a({}, n3, ((e3 = {})[r4.type] = [].concat(n3[r4.type] || [], [a({}, t2.newChildProps, this.mapNestedChildrenToProps(r4, t2.nestedChildren))]), e3));
  }, o3.mapObjectTypeChildren = function(t2) {
    var e3, r4, n3 = t2.child, i2 = t2.newProps, o4 = t2.newChildProps, s2 = t2.nestedChildren;
    switch (n3.type) {
      case l.TITLE:
        return a({}, i2, ((e3 = {})[n3.type] = s2, e3.titleAttributes = a({}, o4), e3));
      case l.BODY:
        return a({}, i2, { bodyAttributes: a({}, o4) });
      case l.HTML:
        return a({}, i2, { htmlAttributes: a({}, o4) });
      default:
        return a({}, i2, ((r4 = {})[n3.type] = a({}, o4), r4));
    }
  }, o3.mapArrayTypeChildrenToProps = function(t2, e3) {
    var r4 = a({}, e3);
    return Object.keys(t2).forEach(function(e4) {
      var n3;
      r4 = a({}, r4, ((n3 = {})[e4] = t2[e4], n3));
    }), r4;
  }, o3.warnOnInvalidChildren = function(t2, e3) {
    return (0, import_invariant.default)(h.some(function(e4) {
      return t2.type === e4;
    }), typeof t2.type == "function" ? "You may be attempting to nest <Helmet> components within each other, which is not allowed. Refer to our API for more information." : "Only elements types " + h.join(", ") + " are allowed. Helmet does not support rendering <" + t2.type + "> elements. Refer to our API for more information."), (0, import_invariant.default)(!e3 || typeof e3 == "string" || Array.isArray(e3) && !e3.some(function(t3) {
      return typeof t3 != "string";
    }), "Helmet expects a string as a child of <" + t2.type + ">. Did you forget to wrap your children in braces? ( <" + t2.type + ">{``}</" + t2.type + "> ) Refer to our API for more information."), !0;
  }, o3.mapChildrenToProps = function(e3, r4) {
    var n3 = this, i2 = {};
    return react_default.Children.forEach(e3, function(t2) {
      if (t2 && t2.props) {
        var e4 = t2.props, o4 = e4.children, a2 = u(e4, F), s2 = Object.keys(a2).reduce(function(t3, e5) {
          return t3[y[e5] || e5] = a2[e5], t3;
        }, {}), c2 = t2.type;
        switch (typeof c2 == "symbol" ? c2 = c2.toString() : n3.warnOnInvalidChildren(t2, o4), c2) {
          case l.FRAGMENT:
            r4 = n3.mapChildrenToProps(o4, r4);
            break;
          case l.LINK:
          case l.META:
          case l.NOSCRIPT:
          case l.SCRIPT:
          case l.STYLE:
            i2 = n3.flattenArrayTypeChildren({ child: t2, arrayTypeChildren: i2, newChildProps: s2, nestedChildren: o4 });
            break;
          default:
            r4 = n3.mapObjectTypeChildren({ child: t2, newProps: r4, newChildProps: s2, nestedChildren: o4 });
        }
      }
    }), this.mapArrayTypeChildrenToProps(i2, r4);
  }, o3.render = function() {
    var e3 = this.props, r4 = e3.children, n3 = u(e3, G), i2 = a({}, n3), o4 = n3.helmetData;
    return r4 && (i2 = this.mapChildrenToProps(r4, i2)), !o4 || o4 instanceof N || (o4 = new N(o4.context, o4.instances)), o4 ? react_default.createElement(z, a({}, i2, { context: o4.value, helmetData: void 0 })) : react_default.createElement(R.Consumer, null, function(e4) {
      return react_default.createElement(z, a({}, i2, { context: e4 }));
    });
  }, r3;
})(Component);
W.propTypes = { base: import_prop_types.default.object, bodyAttributes: import_prop_types.default.object, children: import_prop_types.default.oneOfType([import_prop_types.default.arrayOf(import_prop_types.default.node), import_prop_types.default.node]), defaultTitle: import_prop_types.default.string, defer: import_prop_types.default.bool, encodeSpecialCharacters: import_prop_types.default.bool, htmlAttributes: import_prop_types.default.object, link: import_prop_types.default.arrayOf(import_prop_types.default.object), meta: import_prop_types.default.arrayOf(import_prop_types.default.object), noscript: import_prop_types.default.arrayOf(import_prop_types.default.object), onChangeClientState: import_prop_types.default.func, script: import_prop_types.default.arrayOf(import_prop_types.default.object), style: import_prop_types.default.arrayOf(import_prop_types.default.object), title: import_prop_types.default.string, titleAttributes: import_prop_types.default.object, titleTemplate: import_prop_types.default.string, prioritizeSeoTags: import_prop_types.default.bool, helmetData: import_prop_types.default.object }, W.defaultProps = { defer: !0, encodeSpecialCharacters: !0, prioritizeSeoTags: !1 }, W.displayName = "Helmet";

// src/manager/constants.ts
var MEDIA_DESKTOP_BREAKPOINT = "@media (min-width: 600px)";

// src/manager/hooks/useMedia.tsx
function useMediaQuery(query) {
  let getMatches = (queryMatch) => typeof window < "u" ? window.matchMedia(queryMatch).matches : !1, [matches, setMatches] = useState(getMatches(query));
  function handleChange() {
    setMatches(getMatches(query));
  }
  return useEffect(() => {
    let matchMedia = window.matchMedia(query);
    return handleChange(), matchMedia.addEventListener("change", handleChange), () => {
      matchMedia.removeEventListener("change", handleChange);
    };
  }, [query]), matches;
}

// src/manager/components/layout/LayoutProvider.tsx
var LayoutContext = createContext({
  isMobileMenuOpen: !1,
  setMobileMenuOpen: () => {
  },
  isMobileAboutOpen: !1,
  setMobileAboutOpen: () => {
  },
  isMobilePanelOpen: !1,
  setMobilePanelOpen: () => {
  },
  isDesktop: !1,
  isMobile: !1
}), LayoutProvider = ({ children, forceDesktop }) => {
  let [isMobileMenuOpen, setMobileMenuOpen] = useState(!1), [isMobileAboutOpen, setMobileAboutOpen] = useState(!1), [isMobilePanelOpen, setMobilePanelOpen] = useState(!1), isDesktop = forceDesktop ?? useMediaQuery(`(min-width: ${600}px)`), isMobile2 = !isDesktop, contextValue = useMemo(
    () => ({
      isMobileMenuOpen,
      setMobileMenuOpen,
      isMobileAboutOpen,
      setMobileAboutOpen,
      isMobilePanelOpen,
      setMobilePanelOpen,
      isDesktop,
      isMobile: isMobile2
    }),
    [
      isMobileMenuOpen,
      setMobileMenuOpen,
      isMobileAboutOpen,
      setMobileAboutOpen,
      isMobilePanelOpen,
      setMobilePanelOpen,
      isDesktop,
      isMobile2
    ]
  );
  return react_default.createElement(LayoutContext.Provider, { value: contextValue }, children);
}, useLayout = () => useContext(LayoutContext);

// ../node_modules/@babel/runtime/helpers/esm/extends.js
function _extends() {
  return _extends = Object.assign ? Object.assign.bind() : function(n3) {
    for (var e2 = 1; e2 < arguments.length; e2++) {
      var t2 = arguments[e2];
      for (var r3 in t2) ({}).hasOwnProperty.call(t2, r3) && (n3[r3] = t2[r3]);
    }
    return n3;
  }, _extends.apply(null, arguments);
}

// ../node_modules/@babel/runtime/helpers/esm/assertThisInitialized.js
function _assertThisInitialized(e2) {
  if (e2 === void 0) throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  return e2;
}

// ../node_modules/@babel/runtime/helpers/esm/setPrototypeOf.js
function _setPrototypeOf(t2, e2) {
  return _setPrototypeOf = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(t3, e3) {
    return t3.__proto__ = e3, t3;
  }, _setPrototypeOf(t2, e2);
}

// ../node_modules/@babel/runtime/helpers/esm/inheritsLoose.js
function _inheritsLoose(t2, o3) {
  t2.prototype = Object.create(o3.prototype), t2.prototype.constructor = t2, _setPrototypeOf(t2, o3);
}

// ../node_modules/@babel/runtime/helpers/esm/getPrototypeOf.js
function _getPrototypeOf(t2) {
  return _getPrototypeOf = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(t3) {
    return t3.__proto__ || Object.getPrototypeOf(t3);
  }, _getPrototypeOf(t2);
}

// ../node_modules/@babel/runtime/helpers/esm/isNativeFunction.js
function _isNativeFunction(t2) {
  try {
    return Function.toString.call(t2).indexOf("[native code]") !== -1;
  } catch {
    return typeof t2 == "function";
  }
}

// ../node_modules/@babel/runtime/helpers/esm/isNativeReflectConstruct.js
function _isNativeReflectConstruct() {
  try {
    var t2 = !Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
    }));
  } catch {
  }
  return (_isNativeReflectConstruct = function() {
    return !!t2;
  })();
}

// ../node_modules/@babel/runtime/helpers/esm/construct.js
function _construct(t2, e2, r3) {
  if (_isNativeReflectConstruct()) return Reflect.construct.apply(null, arguments);
  var o3 = [null];
  o3.push.apply(o3, e2);
  var p2 = new (t2.bind.apply(t2, o3))();
  return r3 && _setPrototypeOf(p2, r3.prototype), p2;
}

// ../node_modules/@babel/runtime/helpers/esm/wrapNativeSuper.js
function _wrapNativeSuper(t2) {
  var r3 = typeof Map == "function" ? /* @__PURE__ */ new Map() : void 0;
  return _wrapNativeSuper = function(t3) {
    if (t3 === null || !_isNativeFunction(t3)) return t3;
    if (typeof t3 != "function") throw new TypeError("Super expression must either be null or a function");
    if (r3 !== void 0) {
      if (r3.has(t3)) return r3.get(t3);
      r3.set(t3, Wrapper6);
    }
    function Wrapper6() {
      return _construct(t3, arguments, _getPrototypeOf(this).constructor);
    }
    return Wrapper6.prototype = Object.create(t3.prototype, {
      constructor: {
        value: Wrapper6,
        enumerable: !1,
        writable: !0,
        configurable: !0
      }
    }), _setPrototypeOf(Wrapper6, t3);
  }, _wrapNativeSuper(t2);
}

// ../node_modules/polished/dist/polished.esm.js
var PolishedError = (function(_Error) {
  _inheritsLoose(PolishedError2, _Error);
  function PolishedError2(code) {
    var _this;
    if (1)
      _this = _Error.call(this, "An error occurred. See https://github.com/styled-components/polished/blob/main/src/internalHelpers/errors.md#" + code + " for more information.") || this;
    else
      for (var _len2, args, _key2; _key2 < _len2; _key2++)
        ;
    return _assertThisInitialized(_this);
  }
  return PolishedError2;
})(_wrapNativeSuper(Error));
function endsWith(string, suffix) {
  return string.substr(-suffix.length) === suffix;
}
var cssRegex$1 = /^([+-]?(?:\d+|\d*\.\d+))([a-z]*|%)$/;
function stripUnit(value) {
  if (typeof value != "string") return value;
  var matchedValue = value.match(cssRegex$1);
  return matchedValue ? parseFloat(value) : value;
}
var pxtoFactory = function(to) {
  return function(pxval, base) {
    base === void 0 && (base = "16px");
    var newPxval = pxval, newBase = base;
    if (typeof pxval == "string") {
      if (!endsWith(pxval, "px"))
        throw new PolishedError(69, to, pxval);
      newPxval = stripUnit(pxval);
    }
    if (typeof base == "string") {
      if (!endsWith(base, "px"))
        throw new PolishedError(70, to, base);
      newBase = stripUnit(base);
    }
    if (typeof newPxval == "string")
      throw new PolishedError(71, pxval, to);
    if (typeof newBase == "string")
      throw new PolishedError(72, base, to);
    return "" + newPxval / newBase + to;
  };
}, pixelsto = pxtoFactory, em = pixelsto("em");
var rem = pixelsto("rem");
function colorToInt(color2) {
  return Math.round(color2 * 255);
}
function convertToInt(red, green, blue) {
  return colorToInt(red) + "," + colorToInt(green) + "," + colorToInt(blue);
}
function hslToRgb(hue, saturation, lightness, convert2) {
  if (convert2 === void 0 && (convert2 = convertToInt), saturation === 0)
    return convert2(lightness, lightness, lightness);
  var huePrime = (hue % 360 + 360) % 360 / 60, chroma = (1 - Math.abs(2 * lightness - 1)) * saturation, secondComponent = chroma * (1 - Math.abs(huePrime % 2 - 1)), red = 0, green = 0, blue = 0;
  huePrime >= 0 && huePrime < 1 ? (red = chroma, green = secondComponent) : huePrime >= 1 && huePrime < 2 ? (red = secondComponent, green = chroma) : huePrime >= 2 && huePrime < 3 ? (green = chroma, blue = secondComponent) : huePrime >= 3 && huePrime < 4 ? (green = secondComponent, blue = chroma) : huePrime >= 4 && huePrime < 5 ? (red = secondComponent, blue = chroma) : huePrime >= 5 && huePrime < 6 && (red = chroma, blue = secondComponent);
  var lightnessModification = lightness - chroma / 2, finalRed = red + lightnessModification, finalGreen = green + lightnessModification, finalBlue = blue + lightnessModification;
  return convert2(finalRed, finalGreen, finalBlue);
}
var namedColorMap = {
  aliceblue: "f0f8ff",
  antiquewhite: "faebd7",
  aqua: "00ffff",
  aquamarine: "7fffd4",
  azure: "f0ffff",
  beige: "f5f5dc",
  bisque: "ffe4c4",
  black: "000",
  blanchedalmond: "ffebcd",
  blue: "0000ff",
  blueviolet: "8a2be2",
  brown: "a52a2a",
  burlywood: "deb887",
  cadetblue: "5f9ea0",
  chartreuse: "7fff00",
  chocolate: "d2691e",
  coral: "ff7f50",
  cornflowerblue: "6495ed",
  cornsilk: "fff8dc",
  crimson: "dc143c",
  cyan: "00ffff",
  darkblue: "00008b",
  darkcyan: "008b8b",
  darkgoldenrod: "b8860b",
  darkgray: "a9a9a9",
  darkgreen: "006400",
  darkgrey: "a9a9a9",
  darkkhaki: "bdb76b",
  darkmagenta: "8b008b",
  darkolivegreen: "556b2f",
  darkorange: "ff8c00",
  darkorchid: "9932cc",
  darkred: "8b0000",
  darksalmon: "e9967a",
  darkseagreen: "8fbc8f",
  darkslateblue: "483d8b",
  darkslategray: "2f4f4f",
  darkslategrey: "2f4f4f",
  darkturquoise: "00ced1",
  darkviolet: "9400d3",
  deeppink: "ff1493",
  deepskyblue: "00bfff",
  dimgray: "696969",
  dimgrey: "696969",
  dodgerblue: "1e90ff",
  firebrick: "b22222",
  floralwhite: "fffaf0",
  forestgreen: "228b22",
  fuchsia: "ff00ff",
  gainsboro: "dcdcdc",
  ghostwhite: "f8f8ff",
  gold: "ffd700",
  goldenrod: "daa520",
  gray: "808080",
  green: "008000",
  greenyellow: "adff2f",
  grey: "808080",
  honeydew: "f0fff0",
  hotpink: "ff69b4",
  indianred: "cd5c5c",
  indigo: "4b0082",
  ivory: "fffff0",
  khaki: "f0e68c",
  lavender: "e6e6fa",
  lavenderblush: "fff0f5",
  lawngreen: "7cfc00",
  lemonchiffon: "fffacd",
  lightblue: "add8e6",
  lightcoral: "f08080",
  lightcyan: "e0ffff",
  lightgoldenrodyellow: "fafad2",
  lightgray: "d3d3d3",
  lightgreen: "90ee90",
  lightgrey: "d3d3d3",
  lightpink: "ffb6c1",
  lightsalmon: "ffa07a",
  lightseagreen: "20b2aa",
  lightskyblue: "87cefa",
  lightslategray: "789",
  lightslategrey: "789",
  lightsteelblue: "b0c4de",
  lightyellow: "ffffe0",
  lime: "0f0",
  limegreen: "32cd32",
  linen: "faf0e6",
  magenta: "f0f",
  maroon: "800000",
  mediumaquamarine: "66cdaa",
  mediumblue: "0000cd",
  mediumorchid: "ba55d3",
  mediumpurple: "9370db",
  mediumseagreen: "3cb371",
  mediumslateblue: "7b68ee",
  mediumspringgreen: "00fa9a",
  mediumturquoise: "48d1cc",
  mediumvioletred: "c71585",
  midnightblue: "191970",
  mintcream: "f5fffa",
  mistyrose: "ffe4e1",
  moccasin: "ffe4b5",
  navajowhite: "ffdead",
  navy: "000080",
  oldlace: "fdf5e6",
  olive: "808000",
  olivedrab: "6b8e23",
  orange: "ffa500",
  orangered: "ff4500",
  orchid: "da70d6",
  palegoldenrod: "eee8aa",
  palegreen: "98fb98",
  paleturquoise: "afeeee",
  palevioletred: "db7093",
  papayawhip: "ffefd5",
  peachpuff: "ffdab9",
  peru: "cd853f",
  pink: "ffc0cb",
  plum: "dda0dd",
  powderblue: "b0e0e6",
  purple: "800080",
  rebeccapurple: "639",
  red: "f00",
  rosybrown: "bc8f8f",
  royalblue: "4169e1",
  saddlebrown: "8b4513",
  salmon: "fa8072",
  sandybrown: "f4a460",
  seagreen: "2e8b57",
  seashell: "fff5ee",
  sienna: "a0522d",
  silver: "c0c0c0",
  skyblue: "87ceeb",
  slateblue: "6a5acd",
  slategray: "708090",
  slategrey: "708090",
  snow: "fffafa",
  springgreen: "00ff7f",
  steelblue: "4682b4",
  tan: "d2b48c",
  teal: "008080",
  thistle: "d8bfd8",
  tomato: "ff6347",
  turquoise: "40e0d0",
  violet: "ee82ee",
  wheat: "f5deb3",
  white: "fff",
  whitesmoke: "f5f5f5",
  yellow: "ff0",
  yellowgreen: "9acd32"
};
function nameToHex(color2) {
  if (typeof color2 != "string") return color2;
  var normalizedColorName = color2.toLowerCase();
  return namedColorMap[normalizedColorName] ? "#" + namedColorMap[normalizedColorName] : color2;
}
var hexRegex = /^#[a-fA-F0-9]{6}$/, hexRgbaRegex = /^#[a-fA-F0-9]{8}$/, reducedHexRegex = /^#[a-fA-F0-9]{3}$/, reducedRgbaHexRegex = /^#[a-fA-F0-9]{4}$/, rgbRegex = /^rgb\(\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*\)$/i, rgbaRegex = /^rgb(?:a)?\(\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,)?\s*(\d{1,3})\s*(?:,|\/)\s*([-+]?\d*[.]?\d+[%]?)\s*\)$/i, hslRegex = /^hsl\(\s*(\d{0,3}[.]?[0-9]+(?:deg)?)\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*\)$/i, hslaRegex = /^hsl(?:a)?\(\s*(\d{0,3}[.]?[0-9]+(?:deg)?)\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,)?\s*(\d{1,3}[.]?[0-9]?)%\s*(?:,|\/)\s*([-+]?\d*[.]?\d+[%]?)\s*\)$/i;
function parseToRgb(color2) {
  if (typeof color2 != "string")
    throw new PolishedError(3);
  var normalizedColor = nameToHex(color2);
  if (normalizedColor.match(hexRegex))
    return {
      red: parseInt("" + normalizedColor[1] + normalizedColor[2], 16),
      green: parseInt("" + normalizedColor[3] + normalizedColor[4], 16),
      blue: parseInt("" + normalizedColor[5] + normalizedColor[6], 16)
    };
  if (normalizedColor.match(hexRgbaRegex)) {
    var alpha = parseFloat((parseInt("" + normalizedColor[7] + normalizedColor[8], 16) / 255).toFixed(2));
    return {
      red: parseInt("" + normalizedColor[1] + normalizedColor[2], 16),
      green: parseInt("" + normalizedColor[3] + normalizedColor[4], 16),
      blue: parseInt("" + normalizedColor[5] + normalizedColor[6], 16),
      alpha
    };
  }
  if (normalizedColor.match(reducedHexRegex))
    return {
      red: parseInt("" + normalizedColor[1] + normalizedColor[1], 16),
      green: parseInt("" + normalizedColor[2] + normalizedColor[2], 16),
      blue: parseInt("" + normalizedColor[3] + normalizedColor[3], 16)
    };
  if (normalizedColor.match(reducedRgbaHexRegex)) {
    var _alpha = parseFloat((parseInt("" + normalizedColor[4] + normalizedColor[4], 16) / 255).toFixed(2));
    return {
      red: parseInt("" + normalizedColor[1] + normalizedColor[1], 16),
      green: parseInt("" + normalizedColor[2] + normalizedColor[2], 16),
      blue: parseInt("" + normalizedColor[3] + normalizedColor[3], 16),
      alpha: _alpha
    };
  }
  var rgbMatched = rgbRegex.exec(normalizedColor);
  if (rgbMatched)
    return {
      red: parseInt("" + rgbMatched[1], 10),
      green: parseInt("" + rgbMatched[2], 10),
      blue: parseInt("" + rgbMatched[3], 10)
    };
  var rgbaMatched = rgbaRegex.exec(normalizedColor.substring(0, 50));
  if (rgbaMatched)
    return {
      red: parseInt("" + rgbaMatched[1], 10),
      green: parseInt("" + rgbaMatched[2], 10),
      blue: parseInt("" + rgbaMatched[3], 10),
      alpha: parseFloat("" + rgbaMatched[4]) > 1 ? parseFloat("" + rgbaMatched[4]) / 100 : parseFloat("" + rgbaMatched[4])
    };
  var hslMatched = hslRegex.exec(normalizedColor);
  if (hslMatched) {
    var hue = parseInt("" + hslMatched[1], 10), saturation = parseInt("" + hslMatched[2], 10) / 100, lightness = parseInt("" + hslMatched[3], 10) / 100, rgbColorString = "rgb(" + hslToRgb(hue, saturation, lightness) + ")", hslRgbMatched = rgbRegex.exec(rgbColorString);
    if (!hslRgbMatched)
      throw new PolishedError(4, normalizedColor, rgbColorString);
    return {
      red: parseInt("" + hslRgbMatched[1], 10),
      green: parseInt("" + hslRgbMatched[2], 10),
      blue: parseInt("" + hslRgbMatched[3], 10)
    };
  }
  var hslaMatched = hslaRegex.exec(normalizedColor.substring(0, 50));
  if (hslaMatched) {
    var _hue = parseInt("" + hslaMatched[1], 10), _saturation = parseInt("" + hslaMatched[2], 10) / 100, _lightness = parseInt("" + hslaMatched[3], 10) / 100, _rgbColorString = "rgb(" + hslToRgb(_hue, _saturation, _lightness) + ")", _hslRgbMatched = rgbRegex.exec(_rgbColorString);
    if (!_hslRgbMatched)
      throw new PolishedError(4, normalizedColor, _rgbColorString);
    return {
      red: parseInt("" + _hslRgbMatched[1], 10),
      green: parseInt("" + _hslRgbMatched[2], 10),
      blue: parseInt("" + _hslRgbMatched[3], 10),
      alpha: parseFloat("" + hslaMatched[4]) > 1 ? parseFloat("" + hslaMatched[4]) / 100 : parseFloat("" + hslaMatched[4])
    };
  }
  throw new PolishedError(5);
}
function rgbToHsl(color2) {
  var red = color2.red / 255, green = color2.green / 255, blue = color2.blue / 255, max = Math.max(red, green, blue), min = Math.min(red, green, blue), lightness = (max + min) / 2;
  if (max === min)
    return color2.alpha !== void 0 ? {
      hue: 0,
      saturation: 0,
      lightness,
      alpha: color2.alpha
    } : {
      hue: 0,
      saturation: 0,
      lightness
    };
  var hue, delta = max - min, saturation = lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  switch (max) {
    case red:
      hue = (green - blue) / delta + (green < blue ? 6 : 0);
      break;
    case green:
      hue = (blue - red) / delta + 2;
      break;
    default:
      hue = (red - green) / delta + 4;
      break;
  }
  return hue *= 60, color2.alpha !== void 0 ? {
    hue,
    saturation,
    lightness,
    alpha: color2.alpha
  } : {
    hue,
    saturation,
    lightness
  };
}
function parseToHsl(color2) {
  return rgbToHsl(parseToRgb(color2));
}
var reduceHexValue = function(value) {
  return value.length === 7 && value[1] === value[2] && value[3] === value[4] && value[5] === value[6] ? "#" + value[1] + value[3] + value[5] : value;
}, reduceHexValue$1 = reduceHexValue;
function numberToHex(value) {
  var hex = value.toString(16);
  return hex.length === 1 ? "0" + hex : hex;
}
function colorToHex(color2) {
  return numberToHex(Math.round(color2 * 255));
}
function convertToHex(red, green, blue) {
  return reduceHexValue$1("#" + colorToHex(red) + colorToHex(green) + colorToHex(blue));
}
function hslToHex(hue, saturation, lightness) {
  return hslToRgb(hue, saturation, lightness, convertToHex);
}
function hsl(value, saturation, lightness) {
  if (typeof value == "number" && typeof saturation == "number" && typeof lightness == "number")
    return hslToHex(value, saturation, lightness);
  if (typeof value == "object" && saturation === void 0 && lightness === void 0)
    return hslToHex(value.hue, value.saturation, value.lightness);
  throw new PolishedError(1);
}
function hsla(value, saturation, lightness, alpha) {
  if (typeof value == "number" && typeof saturation == "number" && typeof lightness == "number" && typeof alpha == "number")
    return alpha >= 1 ? hslToHex(value, saturation, lightness) : "rgba(" + hslToRgb(value, saturation, lightness) + "," + alpha + ")";
  if (typeof value == "object" && saturation === void 0 && lightness === void 0 && alpha === void 0)
    return value.alpha >= 1 ? hslToHex(value.hue, value.saturation, value.lightness) : "rgba(" + hslToRgb(value.hue, value.saturation, value.lightness) + "," + value.alpha + ")";
  throw new PolishedError(2);
}
function rgb(value, green, blue) {
  if (typeof value == "number" && typeof green == "number" && typeof blue == "number")
    return reduceHexValue$1("#" + numberToHex(value) + numberToHex(green) + numberToHex(blue));
  if (typeof value == "object" && green === void 0 && blue === void 0)
    return reduceHexValue$1("#" + numberToHex(value.red) + numberToHex(value.green) + numberToHex(value.blue));
  throw new PolishedError(6);
}
function rgba(firstValue, secondValue, thirdValue, fourthValue) {
  if (typeof firstValue == "string" && typeof secondValue == "number") {
    var rgbValue = parseToRgb(firstValue);
    return "rgba(" + rgbValue.red + "," + rgbValue.green + "," + rgbValue.blue + "," + secondValue + ")";
  } else {
    if (typeof firstValue == "number" && typeof secondValue == "number" && typeof thirdValue == "number" && typeof fourthValue == "number")
      return fourthValue >= 1 ? rgb(firstValue, secondValue, thirdValue) : "rgba(" + firstValue + "," + secondValue + "," + thirdValue + "," + fourthValue + ")";
    if (typeof firstValue == "object" && secondValue === void 0 && thirdValue === void 0 && fourthValue === void 0)
      return firstValue.alpha >= 1 ? rgb(firstValue.red, firstValue.green, firstValue.blue) : "rgba(" + firstValue.red + "," + firstValue.green + "," + firstValue.blue + "," + firstValue.alpha + ")";
  }
  throw new PolishedError(7);
}
var isRgb = function(color2) {
  return typeof color2.red == "number" && typeof color2.green == "number" && typeof color2.blue == "number" && (typeof color2.alpha != "number" || typeof color2.alpha > "u");
}, isRgba = function(color2) {
  return typeof color2.red == "number" && typeof color2.green == "number" && typeof color2.blue == "number" && typeof color2.alpha == "number";
}, isHsl = function(color2) {
  return typeof color2.hue == "number" && typeof color2.saturation == "number" && typeof color2.lightness == "number" && (typeof color2.alpha != "number" || typeof color2.alpha > "u");
}, isHsla = function(color2) {
  return typeof color2.hue == "number" && typeof color2.saturation == "number" && typeof color2.lightness == "number" && typeof color2.alpha == "number";
};
function toColorString(color2) {
  if (typeof color2 != "object") throw new PolishedError(8);
  if (isRgba(color2)) return rgba(color2);
  if (isRgb(color2)) return rgb(color2);
  if (isHsla(color2)) return hsla(color2);
  if (isHsl(color2)) return hsl(color2);
  throw new PolishedError(8);
}
function curried(f2, length, acc) {
  return function() {
    var combined = acc.concat(Array.prototype.slice.call(arguments));
    return combined.length >= length ? f2.apply(this, combined) : curried(f2, length, combined);
  };
}
function curry(f2) {
  return curried(f2, f2.length, []);
}
function adjustHue(degree, color2) {
  if (color2 === "transparent") return color2;
  var hslColor = parseToHsl(color2);
  return toColorString(_extends({}, hslColor, {
    hue: hslColor.hue + parseFloat(degree)
  }));
}
var curriedAdjustHue = curry(adjustHue);
function guard(lowerBoundary, upperBoundary, value) {
  return Math.max(lowerBoundary, Math.min(upperBoundary, value));
}
function darken2(amount, color2) {
  if (color2 === "transparent") return color2;
  var hslColor = parseToHsl(color2);
  return toColorString(_extends({}, hslColor, {
    lightness: guard(0, 1, hslColor.lightness - parseFloat(amount))
  }));
}
var curriedDarken = curry(darken2), curriedDarken$1 = curriedDarken;
function desaturate(amount, color2) {
  if (color2 === "transparent") return color2;
  var hslColor = parseToHsl(color2);
  return toColorString(_extends({}, hslColor, {
    saturation: guard(0, 1, hslColor.saturation - parseFloat(amount))
  }));
}
var curriedDesaturate = curry(desaturate);
function lighten2(amount, color2) {
  if (color2 === "transparent") return color2;
  var hslColor = parseToHsl(color2);
  return toColorString(_extends({}, hslColor, {
    lightness: guard(0, 1, hslColor.lightness + parseFloat(amount))
  }));
}
var curriedLighten = curry(lighten2), curriedLighten$1 = curriedLighten;
function mix(weight, color2, otherColor) {
  if (color2 === "transparent") return otherColor;
  if (otherColor === "transparent") return color2;
  if (weight === 0) return otherColor;
  var parsedColor1 = parseToRgb(color2), color1 = _extends({}, parsedColor1, {
    alpha: typeof parsedColor1.alpha == "number" ? parsedColor1.alpha : 1
  }), parsedColor2 = parseToRgb(otherColor), color22 = _extends({}, parsedColor2, {
    alpha: typeof parsedColor2.alpha == "number" ? parsedColor2.alpha : 1
  }), alphaDelta = color1.alpha - color22.alpha, x2 = parseFloat(weight) * 2 - 1, y2 = x2 * alphaDelta === -1 ? x2 : x2 + alphaDelta, z2 = 1 + x2 * alphaDelta, weight1 = (y2 / z2 + 1) / 2, weight2 = 1 - weight1, mixedColor = {
    red: Math.floor(color1.red * weight1 + color22.red * weight2),
    green: Math.floor(color1.green * weight1 + color22.green * weight2),
    blue: Math.floor(color1.blue * weight1 + color22.blue * weight2),
    alpha: color1.alpha * parseFloat(weight) + color22.alpha * (1 - parseFloat(weight))
  };
  return rgba(mixedColor);
}
var curriedMix = curry(mix), mix$1 = curriedMix;
function opacify(amount, color2) {
  if (color2 === "transparent") return color2;
  var parsedColor = parseToRgb(color2), alpha = typeof parsedColor.alpha == "number" ? parsedColor.alpha : 1, colorWithAlpha = _extends({}, parsedColor, {
    alpha: guard(0, 1, (alpha * 100 + parseFloat(amount) * 100) / 100)
  });
  return rgba(colorWithAlpha);
}
var curriedOpacify = curry(opacify);
function saturate(amount, color2) {
  if (color2 === "transparent") return color2;
  var hslColor = parseToHsl(color2);
  return toColorString(_extends({}, hslColor, {
    saturation: guard(0, 1, hslColor.saturation + parseFloat(amount))
  }));
}
var curriedSaturate = curry(saturate);
function setHue(hue, color2) {
  return color2 === "transparent" ? color2 : toColorString(_extends({}, parseToHsl(color2), {
    hue: parseFloat(hue)
  }));
}
var curriedSetHue = curry(setHue);
function setLightness(lightness, color2) {
  return color2 === "transparent" ? color2 : toColorString(_extends({}, parseToHsl(color2), {
    lightness: parseFloat(lightness)
  }));
}
var curriedSetLightness = curry(setLightness);
function setSaturation(saturation, color2) {
  return color2 === "transparent" ? color2 : toColorString(_extends({}, parseToHsl(color2), {
    saturation: parseFloat(saturation)
  }));
}
var curriedSetSaturation = curry(setSaturation);
function shade(percentage, color2) {
  return color2 === "transparent" ? color2 : mix$1(parseFloat(percentage), "rgb(0, 0, 0)", color2);
}
var curriedShade = curry(shade);
function tint(percentage, color2) {
  return color2 === "transparent" ? color2 : mix$1(parseFloat(percentage), "rgb(255, 255, 255)", color2);
}
var curriedTint = curry(tint);
function transparentize(amount, color2) {
  if (color2 === "transparent") return color2;
  var parsedColor = parseToRgb(color2), alpha = typeof parsedColor.alpha == "number" ? parsedColor.alpha : 1, colorWithAlpha = _extends({}, parsedColor, {
    alpha: guard(0, 1, +(alpha * 100 - parseFloat(amount) * 100).toFixed(2) / 100)
  });
  return rgba(colorWithAlpha);
}
var curriedTransparentize = curry(transparentize), curriedTransparentize$1 = curriedTransparentize;

// src/manager/components/notifications/NotificationItem.tsx
var slideIn = keyframes({
  "0%": {
    opacity: 0,
    transform: "translateY(30px)"
  },
  "100%": {
    opacity: 1,
    transform: "translateY(0)"
  }
}), grow = keyframes({
  "0%": {
    width: "0%"
  },
  "100%": {
    width: "100%"
  }
}), Notification = styled.div(
  ({ theme }) => ({
    position: "relative",
    display: "flex",
    border: `1px solid ${theme.appBorderColor}`,
    padding: "12px 6px 12px 12px",
    borderRadius: theme.appBorderRadius + 1,
    alignItems: "center",
    animation: `${slideIn} 500ms`,
    background: theme.base === "light" ? "hsla(203, 50%, 20%, .97)" : "hsla(203, 30%, 95%, .97)",
    boxShadow: "0 2px 5px 0 rgba(0, 0, 0, 0.05), 0 5px 15px 0 rgba(0, 0, 0, 0.1)",
    color: theme.color.inverseText,
    textDecoration: "none",
    overflow: "hidden",
    [MEDIA_DESKTOP_BREAKPOINT]: {
      boxShadow: `0 1px 2px 0 rgba(0, 0, 0, 0.05), 0px -5px 20px 10px ${theme.background.app}`
    }
  }),
  ({ duration, theme }) => duration && {
    "&::after": {
      content: '""',
      display: "block",
      position: "absolute",
      bottom: 0,
      left: 0,
      height: 3,
      background: theme.color.secondary,
      animation: `${grow} ${duration}ms linear forwards reverse`
    }
  }
), NotificationWithInteractiveStates = styled(Notification)({
  cursor: "pointer",
  border: "none",
  outline: "none",
  textAlign: "left",
  transition: "all 150ms ease-out",
  transform: "translate3d(0, 0, 0)",
  "&:hover": {
    transform: "translate3d(0, -3px, 0)",
    boxShadow: "0 1px 3px 0 rgba(30,167,253,0.5), 0 2px 5px 0 rgba(0,0,0,0.05), 0 5px 15px 0 rgba(0,0,0,0.1)"
  },
  "&:active": {
    transform: "translate3d(0, 0, 0)",
    boxShadow: "0 1px 3px 0 rgba(30,167,253,0.5), 0 2px 5px 0 rgba(0,0,0,0.05), 0 5px 15px 0 rgba(0,0,0,0.1)"
  },
  "&:focus": {
    boxShadow: "rgba(2,156,253,1) 0 0 0 1px inset, 0 1px 3px 0 rgba(30,167,253,0.5), 0 2px 5px 0 rgba(0,0,0,0.05), 0 5px 15px 0 rgba(0,0,0,0.1)"
  }
}), NotificationButton = NotificationWithInteractiveStates.withComponent("div"), NotificationLink = NotificationWithInteractiveStates.withComponent(Link2), NotificationIconWrapper = styled.div({
  display: "flex",
  marginRight: 10,
  alignItems: "center",
  svg: {
    width: 16,
    height: 16
  }
}), NotificationTextWrapper = styled.div(({ theme }) => ({
  width: "100%",
  display: "flex",
  flexDirection: "column",
  color: theme.color.inverseText
})), Headline = styled.div(({ theme }) => ({
  height: "100%",
  alignItems: "center",
  whiteSpace: "balance",
  overflow: "hidden",
  textOverflow: "ellipsis",
  fontSize: theme.typography.size.s1,
  lineHeight: "16px",
  fontWeight: theme.typography.weight.bold
})), SubHeadline = styled.div(({ theme }) => ({
  color: curriedTransparentize$1(0.25, theme.color.inverseText),
  fontSize: theme.typography.size.s1 - 1,
  lineHeight: "14px",
  marginTop: 2,
  whiteSpace: "balance"
})), ItemContent = ({
  icon,
  content: { headline, subHeadline }
}) => react_default.createElement(react_default.Fragment, null, !icon || react_default.createElement(NotificationIconWrapper, null, icon), react_default.createElement(NotificationTextWrapper, null, react_default.createElement(Headline, { title: headline }, headline), subHeadline && react_default.createElement(SubHeadline, null, subHeadline))), DismissButtonWrapper = styled(Button)(({ theme }) => ({
  width: 28,
  alignSelf: "center",
  marginTop: 0,
  color: theme.base === "light" ? "rgba(255,255,255,0.7)" : " #999999"
})), DismissNotificationItem = ({ onDismiss }) => react_default.createElement(
  DismissButtonWrapper,
  {
    padding: "small",
    variant: "ghost",
    ariaLabel: "Dismiss notification",
    onClick: (e2) => {
      e2.preventDefault(), e2.stopPropagation(), onDismiss();
    }
  },
  react_default.createElement(CloseAltIcon, { size: 12 })
), NotificationItemSpacer = styled.div({
  height: 48
}), NotificationItem = ({
  notification: { content, duration, link, onClear, onClick, id, icon },
  onDismissNotification,
  zIndex
}) => {
  let onTimeout = useCallback(() => {
    onDismissNotification(id), onClear && onClear({ dismissed: !1, timeout: !0 });
  }, [id, onDismissNotification, onClear]), timer = useRef(null);
  useEffect(() => {
    if (duration)
      return timer.current = setTimeout(onTimeout, duration), () => clearTimeout(timer.current);
  }, [duration, onTimeout]);
  let onDismiss = useCallback(() => {
    clearTimeout(timer.current), onDismissNotification(id), onClear && onClear({ dismissed: !0, timeout: !1 });
  }, [id, onDismissNotification, onClear]);
  return link ? react_default.createElement(NotificationLink, { to: link, duration, style: { zIndex } }, react_default.createElement(ItemContent, { icon, content }), react_default.createElement(DismissNotificationItem, { onDismiss })) : onClick ? react_default.createElement(
    NotificationButton,
    {
      duration,
      onClick: () => onClick({ onDismiss }),
      style: { zIndex }
    },
    react_default.createElement(ItemContent, { icon, content }),
    react_default.createElement(DismissNotificationItem, { onDismiss })
  ) : react_default.createElement(Notification, { duration, style: { zIndex } }, react_default.createElement(ItemContent, { icon, content }), react_default.createElement(DismissNotificationItem, { onDismiss }));
}, NotificationItem_default = NotificationItem;

// src/manager/components/notifications/NotificationList.tsx
var NotificationList = ({
  notifications,
  clearNotification
}) => {
  let { isMobile: isMobile2 } = useLayout();
  return react_default.createElement(List, { isMobile: isMobile2 }, notifications && notifications.map((notification, index) => react_default.createElement(
    NotificationItem_default,
    {
      key: notification.id,
      onDismissNotification: (id) => clearNotification(id),
      notification,
      zIndex: notifications.length - index
    }
  )));
}, List = styled.div(
  {
    zIndex: 200,
    "> * + *": {
      marginTop: 12
    },
    "&:empty": {
      display: "none"
    }
  },
  ({ isMobile: isMobile2 }) => isMobile2 && {
    position: "fixed",
    bottom: 40,
    margin: 20
  }
);

// src/manager/container/Notifications.tsx
var mapper = ({ state, api }) => ({
  notifications: state.notifications,
  clearNotification: api.clearNotification
}), Notifications = (props) => react_default.createElement(Consumer, { filter: mapper }, (fromState) => react_default.createElement(NotificationList, { ...props, ...fromState }));

// ../node_modules/@react-aria/utils/dist/useLayoutEffect.mjs
var $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c = typeof document < "u" ? react_default.useLayoutEffect : () => {
};

// ../node_modules/@react-aria/utils/dist/useEffectEvent.mjs
var $8ae05eaa5c114e9c$var$_React_useInsertionEffect, $8ae05eaa5c114e9c$var$useEarlyEffect = ($8ae05eaa5c114e9c$var$_React_useInsertionEffect = react_default.useInsertionEffect) !== null && $8ae05eaa5c114e9c$var$_React_useInsertionEffect !== void 0 ? $8ae05eaa5c114e9c$var$_React_useInsertionEffect : $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c;

// ../node_modules/@react-aria/ssr/dist/SSRProvider.mjs
var $b5e257d569688ac6$var$defaultContext = {
  prefix: String(Math.round(Math.random() * 1e10)),
  current: 0
}, $b5e257d569688ac6$var$SSRContext = react_default.createContext($b5e257d569688ac6$var$defaultContext), $b5e257d569688ac6$var$IsSSRContext = react_default.createContext(!1);
var $b5e257d569688ac6$var$canUseDOM = !!(typeof window < "u" && window.document && window.document.createElement), $b5e257d569688ac6$var$componentIds = /* @__PURE__ */ new WeakMap();
function $b5e257d569688ac6$var$useCounter(isDisabled = !1) {
  let ctx = useContext($b5e257d569688ac6$var$SSRContext), ref = useRef(null);
  if (ref.current === null && !isDisabled) {
    var _React___SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_ReactCurrentOwner, _React___SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
    let currentOwner = (_React___SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = react_default.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED) === null || _React___SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED === void 0 || (_React___SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_ReactCurrentOwner = _React___SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner) === null || _React___SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_ReactCurrentOwner === void 0 ? void 0 : _React___SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED_ReactCurrentOwner.current;
    if (currentOwner) {
      let prevComponentValue = $b5e257d569688ac6$var$componentIds.get(currentOwner);
      prevComponentValue == null ? $b5e257d569688ac6$var$componentIds.set(currentOwner, {
        id: ctx.current,
        state: currentOwner.memoizedState
      }) : currentOwner.memoizedState !== prevComponentValue.state && (ctx.current = prevComponentValue.id, $b5e257d569688ac6$var$componentIds.delete(currentOwner));
    }
    ref.current = ++ctx.current;
  }
  return ref.current;
}
function $b5e257d569688ac6$var$useLegacySSRSafeId(defaultId) {
  let ctx = useContext($b5e257d569688ac6$var$SSRContext), counter = $b5e257d569688ac6$var$useCounter(!!defaultId), prefix = `react-aria${ctx.prefix}`;
  return defaultId || `${prefix}-${counter}`;
}
function $b5e257d569688ac6$var$useModernSSRSafeId(defaultId) {
  let id = react_default.useId(), [didSSR] = useState($b5e257d569688ac6$export$535bd6ca7f90a273()), prefix = didSSR ? "react-aria" : `react-aria${$b5e257d569688ac6$var$defaultContext.prefix}`;
  return defaultId || `${prefix}-${id}`;
}
var $b5e257d569688ac6$export$619500959fc48b26 = typeof react_default.useId == "function" ? $b5e257d569688ac6$var$useModernSSRSafeId : $b5e257d569688ac6$var$useLegacySSRSafeId;
function $b5e257d569688ac6$var$getSnapshot() {
  return !1;
}
function $b5e257d569688ac6$var$getServerSnapshot() {
  return !0;
}
function $b5e257d569688ac6$var$subscribe(onStoreChange) {
  return () => {
  };
}
function $b5e257d569688ac6$export$535bd6ca7f90a273() {
  return typeof react_default.useSyncExternalStore == "function" ? react_default.useSyncExternalStore($b5e257d569688ac6$var$subscribe, $b5e257d569688ac6$var$getSnapshot, $b5e257d569688ac6$var$getServerSnapshot) : useContext($b5e257d569688ac6$var$IsSSRContext);
}

// ../node_modules/@react-aria/utils/dist/useId.mjs
var $bdb11010cef70236$var$canUseDOM = !!(typeof window < "u" && window.document && window.document.createElement), $bdb11010cef70236$export$d41a04c74483c6ef = /* @__PURE__ */ new Map(), $bdb11010cef70236$var$registry;
typeof FinalizationRegistry < "u" && ($bdb11010cef70236$var$registry = new FinalizationRegistry((heldValue) => {
  $bdb11010cef70236$export$d41a04c74483c6ef.delete(heldValue);
}));
function $bdb11010cef70236$export$f680877a34711e37(defaultId) {
  let [value, setValue] = useState(defaultId), nextId = useRef(null), res = $b5e257d569688ac6$export$619500959fc48b26(value), cleanupRef = useRef(null);
  if ($bdb11010cef70236$var$registry && $bdb11010cef70236$var$registry.register(cleanupRef, res), $bdb11010cef70236$var$canUseDOM) {
    let cacheIdRef = $bdb11010cef70236$export$d41a04c74483c6ef.get(res);
    cacheIdRef && !cacheIdRef.includes(nextId) ? cacheIdRef.push(nextId) : $bdb11010cef70236$export$d41a04c74483c6ef.set(res, [
      nextId
    ]);
  }
  return $f0a04ccd8dbdd83b$export$e5c5a5f917a5871c(() => {
    let r3 = res;
    return () => {
      $bdb11010cef70236$var$registry && $bdb11010cef70236$var$registry.unregister(cleanupRef), $bdb11010cef70236$export$d41a04c74483c6ef.delete(r3);
    };
  }, [
    res
  ]), useEffect(() => {
    let newId = nextId.current;
    return newId && setValue(newId), () => {
      newId && (nextId.current = null);
    };
  }), res;
}

// ../node_modules/@react-aria/utils/dist/focusWithoutScrolling.mjs
function $7215afc6de606d6b$export$de79e2c695e052f3(element) {
  if ($7215afc6de606d6b$var$supportsPreventScroll()) element.focus({
    preventScroll: !0
  });
  else {
    let scrollableElements = $7215afc6de606d6b$var$getScrollableElements(element);
    element.focus(), $7215afc6de606d6b$var$restoreScrollPosition(scrollableElements);
  }
}
var $7215afc6de606d6b$var$supportsPreventScrollCached = null;
function $7215afc6de606d6b$var$supportsPreventScroll() {
  if ($7215afc6de606d6b$var$supportsPreventScrollCached == null) {
    $7215afc6de606d6b$var$supportsPreventScrollCached = !1;
    try {
      document.createElement("div").focus({
        get preventScroll() {
          return $7215afc6de606d6b$var$supportsPreventScrollCached = !0, !0;
        }
      });
    } catch {
    }
  }
  return $7215afc6de606d6b$var$supportsPreventScrollCached;
}
function $7215afc6de606d6b$var$getScrollableElements(element) {
  let parent = element.parentNode, scrollableElements = [], rootScrollingElement = document.scrollingElement || document.documentElement;
  for (; parent instanceof HTMLElement && parent !== rootScrollingElement; )
    (parent.offsetHeight < parent.scrollHeight || parent.offsetWidth < parent.scrollWidth) && scrollableElements.push({
      element: parent,
      scrollTop: parent.scrollTop,
      scrollLeft: parent.scrollLeft
    }), parent = parent.parentNode;
  return rootScrollingElement instanceof HTMLElement && scrollableElements.push({
    element: rootScrollingElement,
    scrollTop: rootScrollingElement.scrollTop,
    scrollLeft: rootScrollingElement.scrollLeft
  }), scrollableElements;
}
function $7215afc6de606d6b$var$restoreScrollPosition(scrollableElements) {
  for (let { element, scrollTop, scrollLeft } of scrollableElements)
    element.scrollTop = scrollTop, element.scrollLeft = scrollLeft;
}

// ../node_modules/@react-aria/utils/dist/platform.mjs
function $c87311424ea30a05$var$testUserAgent(re) {
  var _window_navigator_userAgentData;
  if (typeof window > "u" || window.navigator == null) return !1;
  let brands = (_window_navigator_userAgentData = window.navigator.userAgentData) === null || _window_navigator_userAgentData === void 0 ? void 0 : _window_navigator_userAgentData.brands;
  return Array.isArray(brands) && brands.some((brand) => re.test(brand.brand)) || re.test(window.navigator.userAgent);
}
function $c87311424ea30a05$var$testPlatform(re) {
  var _window_navigator_userAgentData;
  return typeof window < "u" && window.navigator != null ? re.test(((_window_navigator_userAgentData = window.navigator.userAgentData) === null || _window_navigator_userAgentData === void 0 ? void 0 : _window_navigator_userAgentData.platform) || window.navigator.platform) : !1;
}
function $c87311424ea30a05$var$cached(fn) {
  let res = null;
  return () => (res == null && (res = fn()), res);
}
var $c87311424ea30a05$export$9ac100e40613ea10 = $c87311424ea30a05$var$cached(function() {
  return $c87311424ea30a05$var$testPlatform(/^Mac/i);
}), $c87311424ea30a05$export$186c6964ca17d99 = $c87311424ea30a05$var$cached(function() {
  return $c87311424ea30a05$var$testPlatform(/^iPhone/i);
}), $c87311424ea30a05$export$7bef049ce92e4224 = $c87311424ea30a05$var$cached(function() {
  return $c87311424ea30a05$var$testPlatform(/^iPad/i) || // iPadOS 13 lies and says it's a Mac, but we can distinguish by detecting touch support.
  $c87311424ea30a05$export$9ac100e40613ea10() && navigator.maxTouchPoints > 1;
}), $c87311424ea30a05$export$fedb369cb70207f1 = $c87311424ea30a05$var$cached(function() {
  return $c87311424ea30a05$export$186c6964ca17d99() || $c87311424ea30a05$export$7bef049ce92e4224();
}), $c87311424ea30a05$export$e1865c3bedcd822b = $c87311424ea30a05$var$cached(function() {
  return $c87311424ea30a05$export$9ac100e40613ea10() || $c87311424ea30a05$export$fedb369cb70207f1();
}), $c87311424ea30a05$export$78551043582a6a98 = $c87311424ea30a05$var$cached(function() {
  return $c87311424ea30a05$var$testUserAgent(/AppleWebKit/i) && !$c87311424ea30a05$export$6446a186d09e379e();
}), $c87311424ea30a05$export$6446a186d09e379e = $c87311424ea30a05$var$cached(function() {
  return $c87311424ea30a05$var$testUserAgent(/Chrome/i);
}), $c87311424ea30a05$export$a11b0059900ceec8 = $c87311424ea30a05$var$cached(function() {
  return $c87311424ea30a05$var$testUserAgent(/Android/i);
}), $c87311424ea30a05$export$b7d78993b74f766d = $c87311424ea30a05$var$cached(function() {
  return $c87311424ea30a05$var$testUserAgent(/Firefox/i);
});

// ../node_modules/@react-aria/utils/dist/openLink.mjs
var $ea8dcbcb9ea1b556$var$RouterContext = createContext({
  isNative: !0,
  open: $ea8dcbcb9ea1b556$var$openSyntheticLink,
  useHref: (href) => href
});
function $ea8dcbcb9ea1b556$export$95185d699e05d4d7(target, modifiers2, setOpening = !0) {
  var _window_event_type, _window_event;
  let { metaKey, ctrlKey, altKey, shiftKey } = modifiers2;
  $c87311424ea30a05$export$b7d78993b74f766d() && (!((_window_event = window.event) === null || _window_event === void 0 || (_window_event_type = _window_event.type) === null || _window_event_type === void 0) && _window_event_type.startsWith("key")) && target.target === "_blank" && ($c87311424ea30a05$export$9ac100e40613ea10() ? metaKey = !0 : ctrlKey = !0);
  let event = $c87311424ea30a05$export$78551043582a6a98() && $c87311424ea30a05$export$9ac100e40613ea10() && !$c87311424ea30a05$export$7bef049ce92e4224() ? new KeyboardEvent("keydown", {
    keyIdentifier: "Enter",
    metaKey,
    ctrlKey,
    altKey,
    shiftKey
  }) : new MouseEvent("click", {
    metaKey,
    ctrlKey,
    altKey,
    shiftKey,
    bubbles: !0,
    cancelable: !0
  });
  $ea8dcbcb9ea1b556$export$95185d699e05d4d7.isOpening = setOpening, $7215afc6de606d6b$export$de79e2c695e052f3(target), target.dispatchEvent(event), $ea8dcbcb9ea1b556$export$95185d699e05d4d7.isOpening = !1;
}
$ea8dcbcb9ea1b556$export$95185d699e05d4d7.isOpening = !1;
function $ea8dcbcb9ea1b556$var$getSyntheticLink(target, open) {
  if (target instanceof HTMLAnchorElement) open(target);
  else if (target.hasAttribute("data-href")) {
    let link = document.createElement("a");
    link.href = target.getAttribute("data-href"), target.hasAttribute("data-target") && (link.target = target.getAttribute("data-target")), target.hasAttribute("data-rel") && (link.rel = target.getAttribute("data-rel")), target.hasAttribute("data-download") && (link.download = target.getAttribute("data-download")), target.hasAttribute("data-ping") && (link.ping = target.getAttribute("data-ping")), target.hasAttribute("data-referrer-policy") && (link.referrerPolicy = target.getAttribute("data-referrer-policy")), target.appendChild(link), open(link), target.removeChild(link);
  }
}
function $ea8dcbcb9ea1b556$var$openSyntheticLink(target, modifiers2) {
  $ea8dcbcb9ea1b556$var$getSyntheticLink(target, (link) => $ea8dcbcb9ea1b556$export$95185d699e05d4d7(link, modifiers2));
}

// ../node_modules/@react-aria/utils/dist/runAfterTransition.mjs
var $bbed8b41f857bcc0$var$transitionsByElement = /* @__PURE__ */ new Map(), $bbed8b41f857bcc0$var$transitionCallbacks = /* @__PURE__ */ new Set();
function $bbed8b41f857bcc0$var$setupGlobalEvents() {
  if (typeof window > "u") return;
  function isTransitionEvent(event) {
    return "propertyName" in event;
  }
  let onTransitionStart = (e2) => {
    if (!isTransitionEvent(e2) || !e2.target) return;
    let transitions = $bbed8b41f857bcc0$var$transitionsByElement.get(e2.target);
    transitions || (transitions = /* @__PURE__ */ new Set(), $bbed8b41f857bcc0$var$transitionsByElement.set(e2.target, transitions), e2.target.addEventListener("transitioncancel", onTransitionEnd, {
      once: !0
    })), transitions.add(e2.propertyName);
  }, onTransitionEnd = (e2) => {
    if (!isTransitionEvent(e2) || !e2.target) return;
    let properties = $bbed8b41f857bcc0$var$transitionsByElement.get(e2.target);
    if (properties && (properties.delete(e2.propertyName), properties.size === 0 && (e2.target.removeEventListener("transitioncancel", onTransitionEnd), $bbed8b41f857bcc0$var$transitionsByElement.delete(e2.target)), $bbed8b41f857bcc0$var$transitionsByElement.size === 0)) {
      for (let cb of $bbed8b41f857bcc0$var$transitionCallbacks) cb();
      $bbed8b41f857bcc0$var$transitionCallbacks.clear();
    }
  };
  document.body.addEventListener("transitionrun", onTransitionStart), document.body.addEventListener("transitionend", onTransitionEnd);
}
typeof document < "u" && (document.readyState !== "loading" ? $bbed8b41f857bcc0$var$setupGlobalEvents() : document.addEventListener("DOMContentLoaded", $bbed8b41f857bcc0$var$setupGlobalEvents));

// ../node_modules/@react-aria/utils/dist/useViewportSize.mjs
var $5df64b3807dc15ee$var$visualViewport = typeof document < "u" && window.visualViewport;

// global-externals:react-dom
var react_dom_default = __REACT_DOM__, { __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED: __SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED2, createPortal, createRoot: createRoot2, findDOMNode, flushSync, hydrate, hydrateRoot: hydrateRoot2, render, unmountComponentAtNode, unstable_batchedUpdates, unstable_renderSubtreeIntoContainer, version: version2 } = __REACT_DOM__;

// ../node_modules/@react-aria/utils/dist/isElementVisible.mjs
var $7d2416ea0959daaa$var$supportsCheckVisibility = typeof Element < "u" && "checkVisibility" in Element.prototype;

// ../node_modules/@react-aria/utils/dist/isFocusable.mjs
var $b4b717babfbb907b$var$focusableElements = [
  "input:not([disabled]):not([type=hidden])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "button:not([disabled])",
  "a[href]",
  "area[href]",
  "summary",
  "iframe",
  "object",
  "embed",
  "audio[controls]",
  "video[controls]",
  '[contenteditable]:not([contenteditable^="false"])',
  "permission"
], $b4b717babfbb907b$var$FOCUSABLE_ELEMENT_SELECTOR = $b4b717babfbb907b$var$focusableElements.join(":not([hidden]),") + ",[tabindex]:not([disabled]):not([hidden])";
$b4b717babfbb907b$var$focusableElements.push('[tabindex]:not([tabindex="-1"]):not([disabled])');
var $b4b717babfbb907b$var$TABBABLE_ELEMENT_SELECTOR = $b4b717babfbb907b$var$focusableElements.join(':not([hidden]):not([tabindex="-1"]),');

// src/manager/components/mobile/navigation/MobileAddonsDrawer.tsx
var StyledModal = styled(Modal)(({ theme }) => ({
  background: theme.background.content,
  borderRadius: "10px 10px 0 0",
  border: "none"
})), MobileAddonsDrawer = ({
  children,
  id,
  isOpen,
  onOpenChange
}) => react_default.createElement(
  StyledModal,
  {
    ariaLabel: "Addon panel",
    transitionDuration: 300,
    variant: "bottom-drawer",
    height: "42vh",
    id,
    open: isOpen,
    onOpenChange
  },
  children
);

// ../node_modules/react-transition-state/dist/esm/hooks/utils.mjs
var STATUS = ["preEnter", "entering", "entered", "preExit", "exiting", "exited", "unmounted"], getState = (status) => ({
  _s: status,
  status: STATUS[status],
  isEnter: status < 3,
  isMounted: status !== 6,
  isResolved: status === 2 || status > 4
}), startOrEnd = (unmounted) => unmounted ? 6 : 5, getEndStatus = (status, unmountOnExit) => {
  switch (status) {
    case 1:
    case 0:
      return 2;
    case 4:
    case 3:
      return startOrEnd(unmountOnExit);
  }
}, getTimeout = (timeout) => typeof timeout == "object" ? [timeout.enter, timeout.exit] : [timeout, timeout], nextTick = (transitState, status) => setTimeout(() => {
  isNaN(document.body.offsetTop) || transitState(status + 1);
}, 0);

// ../node_modules/react-transition-state/dist/esm/hooks/useTransitionState.mjs
var updateState = (status, setState, latestState, timeoutId, onChange) => {
  clearTimeout(timeoutId.current);
  let state = getState(status);
  setState(state), latestState.current = state, onChange && onChange({
    current: state
  });
}, useTransitionState = ({
  enter = !0,
  exit = !0,
  preEnter,
  preExit,
  timeout,
  initialEntered,
  mountOnEnter,
  unmountOnExit,
  onStateChange: onChange
} = {}) => {
  let [state, setState] = useState(() => getState(initialEntered ? 2 : startOrEnd(mountOnEnter))), latestState = useRef(state), timeoutId = useRef(), [enterTimeout, exitTimeout] = getTimeout(timeout), endTransition = useCallback(() => {
    let status = getEndStatus(latestState.current._s, unmountOnExit);
    status && updateState(status, setState, latestState, timeoutId, onChange);
  }, [onChange, unmountOnExit]), toggle = useCallback((toEnter) => {
    let transitState = (status) => {
      switch (updateState(status, setState, latestState, timeoutId, onChange), status) {
        case 1:
          enterTimeout >= 0 && (timeoutId.current = setTimeout(endTransition, enterTimeout));
          break;
        case 4:
          exitTimeout >= 0 && (timeoutId.current = setTimeout(endTransition, exitTimeout));
          break;
        case 0:
        case 3:
          timeoutId.current = nextTick(transitState, status);
          break;
      }
    }, enterStage = latestState.current.isEnter;
    typeof toEnter != "boolean" && (toEnter = !enterStage), toEnter ? !enterStage && transitState(enter ? preEnter ? 0 : 1 : 2) : enterStage && transitState(exit ? preExit ? 3 : 4 : startOrEnd(unmountOnExit));
  }, [endTransition, onChange, enter, exit, preEnter, preExit, enterTimeout, exitTimeout, unmountOnExit]);
  return [state, toggle, endTransition];
};

// ../node_modules/react-transition-state/dist/esm/hooks/useTransitionMap.mjs
var updateState2 = (key, status, setStateMap, latestStateMap, timeoutId, onChange) => {
  clearTimeout(timeoutId);
  let state = getState(status), stateMap = new Map(latestStateMap.current);
  stateMap.set(key, state), setStateMap(stateMap), latestStateMap.current = stateMap, onChange && onChange({
    key,
    current: state
  });
}, useTransitionMap = ({
  allowMultiple,
  enter = !0,
  exit = !0,
  preEnter,
  preExit,
  timeout,
  initialEntered,
  mountOnEnter,
  unmountOnExit,
  onStateChange: onChange
} = {}) => {
  let [stateMap, setStateMap] = useState(/* @__PURE__ */ new Map()), latestStateMap = useRef(stateMap), configMap = useRef(/* @__PURE__ */ new Map()), [enterTimeout, exitTimeout] = getTimeout(timeout), setItem = useCallback((key, config) => {
    let {
      initialEntered: _initialEntered = initialEntered
    } = config || {}, status = _initialEntered ? 2 : startOrEnd(mountOnEnter);
    updateState2(key, status, setStateMap, latestStateMap), configMap.current.set(key, {});
  }, [initialEntered, mountOnEnter]), deleteItem = useCallback((key) => {
    let newStateMap = new Map(latestStateMap.current);
    return newStateMap.delete(key) ? (setStateMap(newStateMap), latestStateMap.current = newStateMap, configMap.current.delete(key), !0) : !1;
  }, []), endTransition = useCallback((key) => {
    let stateObj = latestStateMap.current.get(key);
    if (!stateObj)
      return;
    let {
      timeoutId
    } = configMap.current.get(key), status = getEndStatus(stateObj._s, unmountOnExit);
    status && updateState2(key, status, setStateMap, latestStateMap, timeoutId, onChange);
  }, [onChange, unmountOnExit]), toggle = useCallback((key, toEnter) => {
    let stateObj = latestStateMap.current.get(key);
    if (!stateObj)
      return;
    let config = configMap.current.get(key), transitState = (status) => {
      switch (updateState2(key, status, setStateMap, latestStateMap, config.timeoutId, onChange), status) {
        case 1:
          enterTimeout >= 0 && (config.timeoutId = setTimeout(() => endTransition(key), enterTimeout));
          break;
        case 4:
          exitTimeout >= 0 && (config.timeoutId = setTimeout(() => endTransition(key), exitTimeout));
          break;
        case 0:
        case 3:
          config.timeoutId = nextTick(transitState, status);
          break;
      }
    }, enterStage = stateObj.isEnter;
    typeof toEnter != "boolean" && (toEnter = !enterStage), toEnter ? enterStage || (transitState(enter ? preEnter ? 0 : 1 : 2), !allowMultiple && latestStateMap.current.forEach((_2, _key) => _key !== key && toggle(_key, !1))) : enterStage && transitState(exit ? preExit ? 3 : 4 : startOrEnd(unmountOnExit));
  }, [onChange, endTransition, allowMultiple, enter, exit, preEnter, preExit, enterTimeout, exitTimeout, unmountOnExit]), toggleAll = useCallback((toEnter) => {
    if (!(!allowMultiple && toEnter !== !1))
      for (let key of latestStateMap.current.keys()) toggle(key, toEnter);
  }, [allowMultiple, toggle]);
  return {
    stateMap,
    toggle,
    toggleAll,
    endTransition,
    setItem,
    deleteItem
  };
};

// src/manager/components/upgrade/UpgradeBlock.tsx
var UpgradeBlock = ({ onNavigateToWhatsNew }) => {
  let api = useStorybookApi(), [activeTab, setActiveTab] = useState("npm");
  return react_default.createElement(Container, null, react_default.createElement("strong", null, "You are on Storybook ", api.getCurrentVersion().version), react_default.createElement("p", null, "Run the following script to check for updates and upgrade to the latest version."), react_default.createElement(Tabs2, null, react_default.createElement(ButtonTab, { active: activeTab === "npm", onClick: () => setActiveTab("npm") }, "npm"), react_default.createElement(ButtonTab, { active: activeTab === "yarn", onClick: () => setActiveTab("yarn") }, "yarn"), react_default.createElement(ButtonTab, { active: activeTab === "pnpm", onClick: () => setActiveTab("pnpm") }, "pnpm")), react_default.createElement(Code2, null, activeTab === "npm" ? "npx storybook@latest upgrade" : `${activeTab} dlx storybook@latest upgrade`), onNavigateToWhatsNew && react_default.createElement(Link, { onClick: onNavigateToWhatsNew }, "See what's new in Storybook"));
}, Container = styled.div(({ theme }) => ({
  border: "1px solid",
  borderRadius: 5,
  padding: 20,
  marginTop: 0,
  borderColor: theme.appBorderColor,
  fontSize: theme.typography.size.s2,
  width: "100%",
  [MEDIA_DESKTOP_BREAKPOINT]: {
    maxWidth: 400
  }
})), Tabs2 = styled.div({
  display: "flex",
  gap: 2
}), Code2 = styled.pre(({ theme }) => ({
  background: theme.base === "light" ? "rgba(0, 0, 0, 0.05)" : theme.appBorderColor,
  fontSize: theme.typography.size.s2 - 1,
  margin: "4px 0 16px"
})), ButtonTab = styled.button(({ theme, active }) => ({
  all: "unset",
  alignItems: "center",
  gap: 10,
  color: theme.color.defaultText,
  fontSize: theme.typography.size.s2 - 1,
  borderBottom: "2px solid transparent",
  borderBottomColor: active ? theme.color.secondary : "none",
  padding: "0 10px 5px",
  marginBottom: "5px",
  cursor: "pointer"
}));

// src/manager/components/mobile/about/MobileAbout.tsx
var MobileAbout = () => {
  let { isMobileAboutOpen, setMobileAboutOpen } = useLayout(), aboutRef = useRef(null), [state, toggle] = useTransitionState({
    timeout: 300,
    mountOnEnter: !0,
    unmountOnExit: !0
  });
  return useEffect(() => {
    toggle(isMobileAboutOpen);
  }, [isMobileAboutOpen, toggle]), state.isMounted ? react_default.createElement(
    Container2,
    {
      ref: aboutRef,
      $status: state.status,
      $transitionDuration: 300
    },
    react_default.createElement(ScrollArea, { vertical: !0, offset: 3, scrollbarSize: 6 }, react_default.createElement(InnerArea, null, react_default.createElement(
      CloseButton,
      {
        onClick: () => setMobileAboutOpen(!1),
        ariaLabel: "Close about section",
        tooltip: "Close about section",
        variant: "ghost"
      },
      react_default.createElement(ArrowLeftIcon, null),
      "Back"
    ), react_default.createElement(LinkContainer, null, react_default.createElement(
      LinkLine,
      {
        href: "https://github.com/storybookjs/storybook",
        target: "_blank",
        rel: "noopener noreferrer"
      },
      react_default.createElement(LinkLeft, null, react_default.createElement(GithubIcon, null), react_default.createElement("span", null, "Github")),
      react_default.createElement(ShareAltIcon, { width: 12 })
    ), react_default.createElement(
      LinkLine,
      {
        href: "https://storybook.js.org/docs/react/get-started/install/?ref=ui",
        target: "_blank",
        rel: "noopener noreferrer"
      },
      react_default.createElement(LinkLeft, null, react_default.createElement(StorybookIcon, null), react_default.createElement("span", null, "Documentation")),
      react_default.createElement(ShareAltIcon, { width: 12 })
    )), react_default.createElement(UpgradeBlock, null), react_default.createElement(BottomText, null, "Open source software maintained by", " ", react_default.createElement(Link, { href: "https://chromatic.com", target: "_blank", rel: "noopener noreferrer" }, "Chromatic"), " ", "and the", " ", react_default.createElement(
      Link,
      {
        href: "https://github.com/storybookjs/storybook/graphs/contributors",
        rel: "noopener noreferrer"
      },
      "Storybook Community"
    ))))
  ) : null;
}, slideFromRight = keyframes({
  from: {
    opacity: 0,
    transform: "translate(20px, 0)"
  },
  to: {
    opacity: 1,
    transform: "translate(0, 0)"
  }
}), slideToRight = keyframes({
  from: {
    opacity: 1,
    transform: "translate(0, 0)"
  },
  to: {
    opacity: 0,
    transform: "translate(20px, 0)"
  }
}), Container2 = styled.div(
  ({ theme, $status, $transitionDuration }) => ({
    position: "absolute",
    width: "100%",
    height: "100%",
    top: 0,
    left: 0,
    zIndex: 11,
    overflow: "auto",
    color: theme.color.defaultText,
    background: theme.background.content,
    animation: $status === "exiting" ? `${slideToRight} ${$transitionDuration}ms` : `${slideFromRight} ${$transitionDuration}ms`
  })
), InnerArea = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: 20,
  padding: "25px 12px 20px"
}), LinkContainer = styled.div({}), LinkLine = styled.a(({ theme }) => ({
  all: "unset",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: theme.typography.size.s2 - 1,
  borderBottom: `1px solid ${theme.appBorderColor}`,
  cursor: "pointer",
  padding: "0 10px",
  "&:last-child": {
    borderBottom: "none"
  }
})), LinkLeft = styled.div(({ theme }) => ({
  display: "flex",
  alignItems: "center",
  fontSize: theme.typography.size.s2 - 1,
  height: 40,
  gap: 5
})), BottomText = styled.div(({ theme }) => ({
  fontSize: theme.typography.size.s2 - 1,
  marginTop: 30
})), CloseButton = styled(Button)({
  alignSelf: "start"
});

// src/manager/components/mobile/navigation/MobileMenuDrawer.tsx
var StyledModal2 = styled(Modal)(({ theme }) => ({
  background: theme.background.content,
  borderRadius: "10px 10px 0 0",
  border: "none"
})), MobileMenuDrawer = ({
  children,
  id,
  isOpen,
  onOpenChange
}) => react_default.createElement(
  StyledModal2,
  {
    ariaLabel: "Menu",
    transitionDuration: 300,
    variant: "bottom-drawer",
    height: "80vh",
    id,
    open: isOpen,
    onOpenChange
  },
  children,
  react_default.createElement(MobileAbout, null)
);

// src/manager/components/mobile/navigation/MobileNavigation.tsx
function combineIndexes(rootIndex, refs) {
  let combinedIndex = { ...rootIndex || {} };
  return Object.values(refs).forEach((ref) => {
    ref.index && Object.assign(combinedIndex, ref.index);
  }), combinedIndex;
}
var useFullStoryName = () => {
  let { index, refs } = useStorybookState(), api = useStorybookApi(), currentStory = api.getCurrentStoryData();
  if (!currentStory)
    return "";
  let combinedIndex = combineIndexes(index, refs || {}), fullStoryName = currentStory.renderLabel?.(currentStory, api) || currentStory.name, node = combinedIndex[currentStory.id];
  for (; node && "parent" in node && node.parent && combinedIndex[node.parent] && fullStoryName.length < 24; )
    node = combinedIndex[node.parent], fullStoryName = `${node.renderLabel?.(node, api) || node.name}/${fullStoryName}`;
  return fullStoryName;
}, MobileNavigation = ({
  menu,
  panel,
  showPanel,
  ...props
}) => {
  let { isMobileMenuOpen, isMobilePanelOpen, setMobileMenuOpen, setMobilePanelOpen } = useLayout(), fullStoryName = useFullStoryName(), headingId = $bdb11010cef70236$export$f680877a34711e37();
  return react_default.createElement(Container3, { ...props }, react_default.createElement(
    MobileMenuDrawer,
    {
      id: "storybook-mobile-menu",
      isOpen: isMobileMenuOpen,
      onOpenChange: setMobileMenuOpen
    },
    menu
  ), react_default.createElement(
    MobileAddonsDrawer,
    {
      id: "storybook-mobile-addon-panel",
      isOpen: isMobilePanelOpen,
      onOpenChange: setMobilePanelOpen
    },
    panel
  ), !isMobilePanelOpen && react_default.createElement(MobileBottomBar, { className: "sb-bar", "aria-labelledby": headingId }, react_default.createElement("h2", { id: headingId, className: "sb-sr-only" }, "Navigation controls"), react_default.createElement(
    BottomBarButton,
    {
      padding: "small",
      variant: "ghost",
      onClick: () => setMobileMenuOpen(!isMobileMenuOpen),
      ariaLabel: "Open navigation menu",
      "aria-expanded": isMobileMenuOpen,
      "aria-controls": "storybook-mobile-menu"
    },
    react_default.createElement(MenuIcon, null),
    react_default.createElement(Text, null, fullStoryName)
  ), react_default.createElement("span", { className: "sb-sr-only", "aria-current": "page" }, fullStoryName), showPanel && react_default.createElement(
    BottomBarButton,
    {
      padding: "small",
      variant: "ghost",
      onClick: () => setMobilePanelOpen(!0),
      ariaLabel: "Open addon panel",
      "aria-expanded": isMobilePanelOpen,
      "aria-controls": "storybook-mobile-addon-panel"
    },
    react_default.createElement(BottomBarToggleIcon, null)
  )));
}, Container3 = styled.div(({ theme }) => ({
  bottom: 0,
  left: 0,
  width: "100%",
  zIndex: 10,
  background: theme.barBg,
  borderTop: `1px solid ${theme.appBorderColor}`
})), MobileBottomBar = styled.section({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  width: "100%",
  height: 40,
  padding: "0 6px",
  /* Because Popper.js's tooltip is creating extra div layers, we have to
   * punch through them to configure the button to ellipsize. */
  "& > *:first-child": {
    /* 6px padding * 2 + 28px for the orientation button */
    maxWidth: "calc(100% - 40px)",
    "& > button": {
      maxWidth: "100%"
    },
    "& > button p": {
      textOverflow: "ellipsis"
    }
  }
}), BottomBarButton = styled(Button)({
  WebkitLineClamp: 1,
  flexShrink: 1,
  p: {
    textOverflow: "ellipsis"
  }
}), Text = styled.p({
  display: "-webkit-box",
  WebkitLineClamp: 1,
  WebkitBoxOrient: "vertical",
  overflow: "hidden"
});

// src/manager/components/layout/useDragging.ts
var SNAP_THRESHOLD_PX = 30, SIDEBAR_MIN_WIDTH_PX = 240, RIGHT_PANEL_MIN_WIDTH_PX = 270, MIN_WIDTH_STIFFNESS = 0.9;
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}
function interpolate(relativeValue, min, max) {
  return min + (max - min) * relativeValue;
}
function useDragging({
  setState,
  isPanelShown,
  isDesktop
}) {
  let panelResizerRef = useRef(null), sidebarResizerRef = useRef(null);
  return useEffect(() => {
    let panelResizer = panelResizerRef.current, sidebarResizer = sidebarResizerRef.current, previewIframe = document.querySelector("#storybook-preview-wrapper"), draggedElement = null, onDragStart = (e2) => {
      e2.preventDefault(), setState((state) => ({
        ...state,
        isDragging: !0
      })), e2.currentTarget === panelResizer ? draggedElement = panelResizer : e2.currentTarget === sidebarResizer && (draggedElement = sidebarResizer), window.addEventListener("mousemove", onDrag), window.addEventListener("mouseup", onDragEnd), previewIframe && (previewIframe.style.pointerEvents = "none");
    }, onDragEnd = (e2) => {
      setState((state) => draggedElement === sidebarResizer && state.navSize < SIDEBAR_MIN_WIDTH_PX && state.navSize > 0 ? {
        ...state,
        isDragging: !1,
        navSize: SIDEBAR_MIN_WIDTH_PX
      } : draggedElement === panelResizer && state.panelPosition === "right" && state.rightPanelWidth < RIGHT_PANEL_MIN_WIDTH_PX && state.rightPanelWidth > 0 ? {
        ...state,
        isDragging: !1,
        rightPanelWidth: RIGHT_PANEL_MIN_WIDTH_PX
      } : {
        ...state,
        isDragging: !1
      }), window.removeEventListener("mousemove", onDrag), window.removeEventListener("mouseup", onDragEnd), previewIframe?.removeAttribute("style"), draggedElement = null;
    }, onDrag = (e2) => {
      if (e2.buttons === 0) {
        onDragEnd(e2);
        return;
      }
      setState((state) => {
        if (draggedElement === sidebarResizer) {
          let sidebarDragX = e2.clientX;
          return sidebarDragX === state.navSize ? state : sidebarDragX <= SNAP_THRESHOLD_PX ? {
            ...state,
            navSize: 0
          } : sidebarDragX <= SIDEBAR_MIN_WIDTH_PX ? {
            ...state,
            navSize: interpolate(MIN_WIDTH_STIFFNESS, sidebarDragX, SIDEBAR_MIN_WIDTH_PX)
          } : {
            ...state,
            // @ts-expect-error (non strict)
            navSize: clamp(sidebarDragX, 0, e2.view.innerWidth)
          };
        }
        if (draggedElement === panelResizer) {
          let sizeAxisState = state.panelPosition === "bottom" ? "bottomPanelHeight" : "rightPanelWidth", panelDragSize = state.panelPosition === "bottom" ? (
            // @ts-expect-error (non strict)
            e2.view.innerHeight - e2.clientY
          ) : (
            // @ts-expect-error (non strict)
            e2.view.innerWidth - e2.clientX
          );
          if (panelDragSize === state[sizeAxisState])
            return state;
          if (panelDragSize <= SNAP_THRESHOLD_PX)
            return {
              ...state,
              [sizeAxisState]: 0
            };
          if (state.panelPosition === "right" && panelDragSize <= RIGHT_PANEL_MIN_WIDTH_PX)
            return {
              ...state,
              [sizeAxisState]: interpolate(
                MIN_WIDTH_STIFFNESS,
                panelDragSize,
                RIGHT_PANEL_MIN_WIDTH_PX
              )
            };
          let sizeAxisMax = (
            // @ts-expect-error (non strict)
            state.panelPosition === "bottom" ? e2.view.innerHeight : e2.view.innerWidth
          );
          return {
            ...state,
            [sizeAxisState]: clamp(panelDragSize, 0, sizeAxisMax)
          };
        }
        return state;
      });
    };
    return panelResizer?.addEventListener("mousedown", onDragStart), sidebarResizer?.addEventListener("mousedown", onDragStart), () => {
      panelResizer?.removeEventListener("mousedown", onDragStart), sidebarResizer?.removeEventListener("mousedown", onDragStart), previewIframe?.removeAttribute("style");
    };
  }, [
    // we need to rerun this effect when the panel is shown/hidden or when changing between mobile/desktop to re-attach the event listeners
    isPanelShown,
    isDesktop,
    setState
  ]), { panelResizerRef, sidebarResizerRef };
}

// src/manager/components/layout/Layout.tsx
var MINIMUM_CONTENT_WIDTH_PX = 100, layoutStateIsEqual = (state, other) => state.navSize === other.navSize && state.bottomPanelHeight === other.bottomPanelHeight && state.rightPanelWidth === other.rightPanelWidth && state.panelPosition === other.panelPosition, useLayoutSyncingState = ({
  api,
  managerLayoutState,
  setManagerLayoutState,
  isDesktop,
  hasTab
}) => {
  let prevManagerLayoutStateRef = react_default.useRef(managerLayoutState), [internalDraggingSizeState, setInternalDraggingSizeState] = useState({
    ...managerLayoutState,
    isDragging: !1
  });
  useEffect(() => {
    internalDraggingSizeState.isDragging || // don't interrupt user's drag
    layoutStateIsEqual(managerLayoutState, prevManagerLayoutStateRef.current) || (prevManagerLayoutStateRef.current = managerLayoutState, setInternalDraggingSizeState((state) => ({ ...state, ...managerLayoutState })));
  }, [internalDraggingSizeState.isDragging, managerLayoutState, setInternalDraggingSizeState]), useLayoutEffect(() => {
    if (internalDraggingSizeState.isDragging || // wait with syncing managerLayoutState until user is done dragging
    layoutStateIsEqual(managerLayoutState, internalDraggingSizeState))
      return;
    let nextState = {
      navSize: internalDraggingSizeState.navSize,
      bottomPanelHeight: internalDraggingSizeState.bottomPanelHeight,
      rightPanelWidth: internalDraggingSizeState.rightPanelWidth
    };
    prevManagerLayoutStateRef.current = {
      ...prevManagerLayoutStateRef.current,
      ...nextState
    }, setManagerLayoutState(nextState);
  }, [internalDraggingSizeState, setManagerLayoutState]);
  let isPagesShown = managerLayoutState.viewMode !== "story" && managerLayoutState.viewMode !== "docs", isPanelShown = managerLayoutState.viewMode === "story" && !hasTab, { panelResizerRef, sidebarResizerRef } = useDragging({
    setState: setInternalDraggingSizeState,
    isPanelShown,
    isDesktop
  }), { navSize, rightPanelWidth, bottomPanelHeight } = internalDraggingSizeState.isDragging ? internalDraggingSizeState : managerLayoutState, customisedNavSize = api.getNavSizeWithCustomisations?.(navSize) ?? navSize, customisedShowPanel = api.getShowPanelWithCustomisations?.(isPanelShown) ?? isPanelShown;
  return {
    navSize: customisedNavSize,
    rightPanelWidth,
    bottomPanelHeight,
    panelPosition: managerLayoutState.panelPosition,
    panelResizerRef,
    sidebarResizerRef,
    showPages: isPagesShown,
    showPanel: customisedShowPanel,
    isDragging: internalDraggingSizeState.isDragging
  };
}, MainContentMatcher = ({ children }) => react_default.createElement(Match, { path: /(^\/story|docs|onboarding\/|^\/$)/, startsWith: !1 }, ({ match }) => react_default.createElement(ContentContainer, { shown: !!match }, children)), OrderedMobileNavigation = styled(MobileNavigation)({
  order: 1
}), Layout = ({ managerLayoutState, setManagerLayoutState, hasTab, ...slots }) => {
  let { isDesktop, isMobile: isMobile2 } = useLayout(), api = useStorybookApi(), {
    navSize,
    rightPanelWidth,
    bottomPanelHeight,
    panelPosition,
    panelResizerRef,
    sidebarResizerRef,
    showPages,
    showPanel,
    isDragging
  } = useLayoutSyncingState({ api, managerLayoutState, setManagerLayoutState, isDesktop, hasTab });
  return react_default.createElement(
    LayoutContainer,
    {
      navSize,
      rightPanelWidth,
      bottomPanelHeight,
      panelPosition: managerLayoutState.panelPosition,
      isDragging,
      viewMode: managerLayoutState.viewMode,
      showPanel
    },
    showPages && react_default.createElement(PagesContainer, null, slots.slotPages),
    isDesktop && react_default.createElement(react_default.Fragment, null, react_default.createElement(SidebarContainer, null, react_default.createElement(Drag, { ref: sidebarResizerRef }), slots.slotSidebar), react_default.createElement(MainContentMatcher, null, slots.slotMain), showPanel && react_default.createElement(PanelContainer, { position: panelPosition }, react_default.createElement(
      Drag,
      {
        orientation: panelPosition === "bottom" ? "horizontal" : "vertical",
        position: panelPosition === "bottom" ? "left" : "right",
        ref: panelResizerRef
      }
    ), slots.slotPanel)),
    isMobile2 && react_default.createElement(react_default.Fragment, null, react_default.createElement(
      OrderedMobileNavigation,
      {
        menu: slots.slotSidebar,
        panel: slots.slotPanel,
        showPanel
      }
    ), react_default.createElement(MainContentMatcher, null, slots.slotMain), react_default.createElement(Notifications, null))
  );
}, LayoutContainer = styled.div(
  ({ navSize, rightPanelWidth, bottomPanelHeight, viewMode, panelPosition, showPanel }) => ({
    width: "100%",
    height: ["100vh", "100dvh"],
    // This array is a special Emotion syntax to set a fallback if 100dvh is not supported
    overflow: "hidden",
    display: "flex",
    flexDirection: "column",
    colorScheme: "light dark",
    [MEDIA_DESKTOP_BREAKPOINT]: {
      display: "grid",
      gap: 0,
      gridTemplateColumns: `minmax(0, ${navSize}px) minmax(${MINIMUM_CONTENT_WIDTH_PX}px, 1fr) minmax(0, ${rightPanelWidth}px)`,
      gridTemplateRows: `1fr minmax(0, ${bottomPanelHeight}px)`,
      gridTemplateAreas: showPanel ? panelPosition === "right" ? `"sidebar content panel"
                  "sidebar content panel"` : `"sidebar content content"
                "sidebar panel   panel"` : `"sidebar content content"
                  "sidebar content content"`
    }
  })
), SidebarContainer = styled.div(({ theme }) => ({
  backgroundColor: theme.appBg,
  gridArea: "sidebar",
  position: "relative",
  borderRight: `1px solid ${theme.appBorderColor}`
})), ContentContainer = styled.div(({ theme, shown }) => ({
  flex: 1,
  position: "relative",
  backgroundColor: theme.appContentBg,
  display: shown ? "grid" : "none",
  // This is needed to make the content container fill the available space
  overflow: "auto",
  [MEDIA_DESKTOP_BREAKPOINT]: {
    flex: "auto",
    gridArea: "content"
  }
})), PagesContainer = styled.div(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gridRowStart: "sidebar-start",
  gridRowEnd: "-1",
  gridColumnStart: "sidebar-end",
  gridColumnEnd: "-1",
  backgroundColor: theme.appContentBg,
  zIndex: 1
})), PanelContainer = styled.div(
  ({ theme, position }) => ({
    gridArea: "panel",
    position: "relative",
    backgroundColor: theme.appContentBg,
    borderTop: position === "bottom" ? `1px solid ${theme.appBorderColor}` : void 0,
    borderLeft: position === "right" ? `1px solid ${theme.appBorderColor}` : void 0
  })
), Drag = styled.div(
  ({ theme }) => ({
    position: "absolute",
    opacity: 0,
    transition: "opacity 0.2s ease-in-out",
    zIndex: 100,
    "&:after": {
      content: '""',
      display: "block",
      backgroundColor: theme.color.secondary
    },
    "&:hover": {
      opacity: 1
    }
  }),
  ({ orientation = "vertical", position = "left" }) => orientation === "vertical" ? {
    width: position === "left" ? 10 : 13,
    height: "100%",
    top: 0,
    right: position === "left" ? "-7px" : void 0,
    left: position === "right" ? "-7px" : void 0,
    "&:after": {
      width: 1,
      height: "100%",
      marginLeft: position === "left" ? 3 : 6
    },
    "&:hover": {
      cursor: "col-resize"
    }
  } : {
    width: "100%",
    height: "13px",
    top: "-7px",
    left: 0,
    "&:after": {
      width: "100%",
      height: 1,
      marginTop: 6
    },
    "&:hover": {
      cursor: "row-resize"
    }
  }
);

// global-externals:storybook/internal/types
var types_default = __STORYBOOK_TYPES__, { Addon_TypesEnum, CoreWebpackCompiler, Feature, SupportedBuilder, SupportedFramework, SupportedLanguage, SupportedRenderer } = __STORYBOOK_TYPES__;

// src/core-events/index.ts
var events = /* @__PURE__ */ ((events2) => (events2.CHANNEL_WS_DISCONNECT = "channelWSDisconnect", events2.CHANNEL_CREATED = "channelCreated", events2.CONFIG_ERROR = "configError", events2.STORY_INDEX_INVALIDATED = "storyIndexInvalidated", events2.STORY_SPECIFIED = "storySpecified", events2.SET_CONFIG = "setConfig", events2.SET_STORIES = "setStories", events2.SET_INDEX = "setIndex", events2.SET_CURRENT_STORY = "setCurrentStory", events2.CURRENT_STORY_WAS_SET = "currentStoryWasSet", events2.FORCE_RE_RENDER = "forceReRender", events2.FORCE_REMOUNT = "forceRemount", events2.PRELOAD_ENTRIES = "preloadStories", events2.STORY_PREPARED = "storyPrepared", events2.DOCS_PREPARED = "docsPrepared", events2.STORY_CHANGED = "storyChanged", events2.STORY_UNCHANGED = "storyUnchanged", events2.STORY_RENDERED = "storyRendered", events2.STORY_FINISHED = "storyFinished", events2.STORY_MISSING = "storyMissing", events2.STORY_ERRORED = "storyErrored", events2.STORY_THREW_EXCEPTION = "storyThrewException", events2.STORY_RENDER_PHASE_CHANGED = "storyRenderPhaseChanged", events2.STORY_HOT_UPDATED = "storyHotUpdated", events2.PLAY_FUNCTION_THREW_EXCEPTION = "playFunctionThrewException", events2.UNHANDLED_ERRORS_WHILE_PLAYING = "unhandledErrorsWhilePlaying", events2.UPDATE_STORY_ARGS = "updateStoryArgs", events2.STORY_ARGS_UPDATED = "storyArgsUpdated", events2.RESET_STORY_ARGS = "resetStoryArgs", events2.SET_FILTER = "setFilter", events2.SET_GLOBALS = "setGlobals", events2.UPDATE_GLOBALS = "updateGlobals", events2.GLOBALS_UPDATED = "globalsUpdated", events2.REGISTER_SUBSCRIPTION = "registerSubscription", events2.PREVIEW_INITIALIZED = "previewInitialized", events2.PREVIEW_KEYDOWN = "previewKeydown", events2.PREVIEW_BUILDER_PROGRESS = "preview_builder_progress", events2.SELECT_STORY = "selectStory", events2.STORIES_COLLAPSE_ALL = "storiesCollapseAll", events2.STORIES_EXPAND_ALL = "storiesExpandAll", events2.DOCS_RENDERED = "docsRendered", events2.SHARED_STATE_CHANGED = "sharedStateChanged", events2.SHARED_STATE_SET = "sharedStateSet", events2.NAVIGATE_URL = "navigateUrl", events2.UPDATE_QUERY_PARAMS = "updateQueryParams", events2.REQUEST_WHATS_NEW_DATA = "requestWhatsNewData", events2.RESULT_WHATS_NEW_DATA = "resultWhatsNewData", events2.SET_WHATS_NEW_CACHE = "setWhatsNewCache", events2.TOGGLE_WHATS_NEW_NOTIFICATIONS = "toggleWhatsNewNotifications", events2.TELEMETRY_ERROR = "telemetryError", events2.FILE_COMPONENT_SEARCH_REQUEST = "fileComponentSearchRequest", events2.FILE_COMPONENT_SEARCH_RESPONSE = "fileComponentSearchResponse", events2.SAVE_STORY_REQUEST = "saveStoryRequest", events2.SAVE_STORY_RESPONSE = "saveStoryResponse", events2.ARGTYPES_INFO_REQUEST = "argtypesInfoRequest", events2.ARGTYPES_INFO_RESPONSE = "argtypesInfoResponse", events2.CREATE_NEW_STORYFILE_REQUEST = "createNewStoryfileRequest", events2.CREATE_NEW_STORYFILE_RESPONSE = "createNewStoryfileResponse", events2.OPEN_IN_EDITOR_REQUEST = "openInEditorRequest", events2.OPEN_IN_EDITOR_RESPONSE = "openInEditorResponse", events2.MANAGER_INERT_ATTRIBUTE_CHANGED = "managerInertAttributeChanged", events2))(events || {});
var {
  CHANNEL_WS_DISCONNECT: CHANNEL_WS_DISCONNECT2,
  CHANNEL_CREATED: CHANNEL_CREATED2,
  CONFIG_ERROR: CONFIG_ERROR2,
  CREATE_NEW_STORYFILE_REQUEST: CREATE_NEW_STORYFILE_REQUEST2,
  CREATE_NEW_STORYFILE_RESPONSE: CREATE_NEW_STORYFILE_RESPONSE2,
  CURRENT_STORY_WAS_SET: CURRENT_STORY_WAS_SET2,
  DOCS_PREPARED: DOCS_PREPARED2,
  DOCS_RENDERED: DOCS_RENDERED2,
  FILE_COMPONENT_SEARCH_REQUEST: FILE_COMPONENT_SEARCH_REQUEST2,
  FILE_COMPONENT_SEARCH_RESPONSE: FILE_COMPONENT_SEARCH_RESPONSE2,
  FORCE_RE_RENDER: FORCE_RE_RENDER2,
  FORCE_REMOUNT: FORCE_REMOUNT2,
  GLOBALS_UPDATED: GLOBALS_UPDATED2,
  NAVIGATE_URL: NAVIGATE_URL2,
  PLAY_FUNCTION_THREW_EXCEPTION: PLAY_FUNCTION_THREW_EXCEPTION2,
  UNHANDLED_ERRORS_WHILE_PLAYING: UNHANDLED_ERRORS_WHILE_PLAYING2,
  PRELOAD_ENTRIES: PRELOAD_ENTRIES2,
  PREVIEW_INITIALIZED: PREVIEW_INITIALIZED2,
  PREVIEW_BUILDER_PROGRESS: PREVIEW_BUILDER_PROGRESS2,
  PREVIEW_KEYDOWN: PREVIEW_KEYDOWN2,
  REGISTER_SUBSCRIPTION: REGISTER_SUBSCRIPTION2,
  RESET_STORY_ARGS: RESET_STORY_ARGS2,
  SELECT_STORY: SELECT_STORY2,
  SET_CONFIG: SET_CONFIG2,
  SET_CURRENT_STORY: SET_CURRENT_STORY2,
  SET_FILTER: SET_FILTER2,
  SET_GLOBALS: SET_GLOBALS2,
  SET_INDEX: SET_INDEX2,
  SET_STORIES: SET_STORIES2,
  SHARED_STATE_CHANGED: SHARED_STATE_CHANGED2,
  SHARED_STATE_SET: SHARED_STATE_SET2,
  STORIES_COLLAPSE_ALL: STORIES_COLLAPSE_ALL2,
  STORIES_EXPAND_ALL: STORIES_EXPAND_ALL2,
  STORY_ARGS_UPDATED: STORY_ARGS_UPDATED2,
  STORY_CHANGED: STORY_CHANGED2,
  STORY_ERRORED: STORY_ERRORED2,
  STORY_INDEX_INVALIDATED: STORY_INDEX_INVALIDATED2,
  STORY_MISSING: STORY_MISSING2,
  STORY_PREPARED: STORY_PREPARED2,
  STORY_RENDER_PHASE_CHANGED: STORY_RENDER_PHASE_CHANGED2,
  STORY_RENDERED: STORY_RENDERED2,
  STORY_FINISHED: STORY_FINISHED2,
  STORY_SPECIFIED: STORY_SPECIFIED2,
  STORY_THREW_EXCEPTION: STORY_THREW_EXCEPTION2,
  STORY_UNCHANGED: STORY_UNCHANGED2,
  STORY_HOT_UPDATED: STORY_HOT_UPDATED2,
  UPDATE_GLOBALS: UPDATE_GLOBALS2,
  UPDATE_QUERY_PARAMS: UPDATE_QUERY_PARAMS2,
  UPDATE_STORY_ARGS: UPDATE_STORY_ARGS2,
  REQUEST_WHATS_NEW_DATA: REQUEST_WHATS_NEW_DATA2,
  RESULT_WHATS_NEW_DATA: RESULT_WHATS_NEW_DATA2,
  SET_WHATS_NEW_CACHE: SET_WHATS_NEW_CACHE2,
  TOGGLE_WHATS_NEW_NOTIFICATIONS: TOGGLE_WHATS_NEW_NOTIFICATIONS2,
  TELEMETRY_ERROR: TELEMETRY_ERROR2,
  SAVE_STORY_REQUEST: SAVE_STORY_REQUEST2,
  SAVE_STORY_RESPONSE: SAVE_STORY_RESPONSE2,
  ARGTYPES_INFO_REQUEST: ARGTYPES_INFO_REQUEST2,
  ARGTYPES_INFO_RESPONSE: ARGTYPES_INFO_RESPONSE2,
  OPEN_IN_EDITOR_REQUEST: OPEN_IN_EDITOR_REQUEST2,
  OPEN_IN_EDITOR_RESPONSE: OPEN_IN_EDITOR_RESPONSE2,
  MANAGER_INERT_ATTRIBUTE_CHANGED: MANAGER_INERT_ATTRIBUTE_CHANGED2
} = events;

// src/manager/components/panel/Panel.tsx
var TabErrorBoundary = class extends Component {
  constructor(props) {
    super(props), this.state = { hasError: !1 };
  }
  static getDerivedStateFromError() {
    return { hasError: !0 };
  }
  componentDidCatch(error, info) {
    console.error("Error rendering addon panel"), console.error(error), console.error(info.componentStack);
  }
  render() {
    let { hasError } = this.state;
    if (hasError)
      return react_default.createElement(
        EmptyTabContent,
        {
          title: "This addon has errors",
          description: "Check your browser logs and addon code to pinpoint what went wrong. This issue was not caused by Storybook."
        }
      );
    let { children } = this.props;
    return children;
  }
}, Section = styled.section({
  height: "100%",
  display: "flex",
  flexDirection: "column"
});
function renderChild(RenderProp) {
  return react_default.createElement(RenderProp, { active: !0 });
}
var PreRenderAddons = ({ panels }) => Object.entries(panels).map(([k2, v2]) => react_default.createElement(StatelessTabPanel, { key: k2, name: k2, hasScrollbar: !1 }, react_default.createElement(TabErrorBoundary, { key: k2 }, renderChild(v2.render)))), AddonPanel2 = react_default.memo(({ panels, shortcuts, actions, selectedPanel = null, panelPosition = "right" }) => {
  let { isDesktop, setMobilePanelOpen } = useLayout(), emptyState = react_default.createElement(
    EmptyTabContent,
    {
      title: "Storybook add-ons",
      description: react_default.createElement(react_default.Fragment, null, "Integrate your tools with Storybook to connect workflows and unlock advanced features."),
      footer: react_default.createElement(Link, { href: "https://storybook.js.org/addons?ref=ui", target: "_blank", withArrow: !0 }, react_default.createElement(DocumentIcon, null), " Explore integrations catalog")
    }
  ), tools = useMemo(
    () => react_default.createElement(ActionsWrapper, null, isDesktop ? react_default.createElement(react_default.Fragment, null, react_default.createElement(
      Button,
      {
        key: "position",
        padding: "small",
        variant: "ghost",
        onClick: actions.togglePosition,
        ariaLabel: panelPosition === "bottom" ? "Move addon panel to right" : "Move addon panel to bottom",
        ariaDescription: "Changes the location of the addon panel to the bottom or right of the screen, but does not have any effect on its content.",
        shortcut: shortcuts.panelPosition
      },
      panelPosition === "bottom" ? react_default.createElement(SidebarAltIcon, null) : react_default.createElement(BottomBarIcon, null)
    ), react_default.createElement(
      Button,
      {
        key: "visibility",
        padding: "small",
        variant: "ghost",
        onClick: actions.toggleVisibility,
        ariaLabel: "Hide addon panel",
        shortcut: shortcuts.togglePanel
      },
      react_default.createElement(CloseIcon, null)
    )) : react_default.createElement(
      Button,
      {
        padding: "small",
        variant: "ghost",
        onClick: () => setMobilePanelOpen(!1),
        ariaLabel: "Close addon panel"
      },
      react_default.createElement(CloseIcon, null)
    )),
    [actions, isDesktop, panelPosition, setMobilePanelOpen, shortcuts]
  );
  return react_default.createElement(Section, { "aria-labelledby": "storybook-panel-heading" }, react_default.createElement("h2", { id: "storybook-panel-heading", className: "sb-sr-only" }, "Addon panel"), react_default.createElement(
    StatelessTabsView,
    {
      id: "storybook-panel-root",
      showToolsWhenEmpty: !0,
      emptyState,
      selected: selectedPanel ?? void 0,
      onSelectionChange: (id) => actions.onSelect(id),
      tools
    },
    react_default.createElement(StatelessTabList, { "aria-label": "Available addons" }, Object.entries(panels).map(([k2, v2]) => react_default.createElement(StatelessTab, { key: k2, name: k2 }, typeof v2.title == "function" ? react_default.createElement(v2.title, null) : v2.title))),
    Object.keys(panels).length ? react_default.createElement(PreRenderAddons, { panels }) : null
  ));
});
AddonPanel2.displayName = "AddonPanel";
var ActionsWrapper = styled.div({
  display: "flex",
  alignItems: "center",
  gap: 6
});

// src/manager/container/Panel.tsx
var Panel = (props) => {
  let api = useStorybookApi(), state = useStorybookState(), [story, setStory] = useState(api.getCurrentStoryData());
  useChannel(
    {
      [STORY_PREPARED2]: () => {
        setStory(api.getCurrentStoryData());
      }
    },
    []
  );
  let { parameters, type } = story ?? {}, panelActions = useMemo(
    () => ({
      onSelect: (panel) => api.setSelectedPanel(panel),
      toggleVisibility: () => api.togglePanel(),
      togglePosition: () => api.togglePanelPosition()
    }),
    [api]
  ), panels = useMemo(() => {
    let allPanels = api.getElements(Addon_TypesEnum.PANEL);
    if (!allPanels || type !== "story")
      return allPanels;
    let filteredPanels = {};
    return Object.entries(allPanels).forEach(([id, p2]) => {
      let { paramKey } = p2;
      paramKey && parameters && parameters[paramKey] && parameters[paramKey].disable || p2.disabled === !0 || typeof p2.disabled == "function" && p2.disabled(parameters) || (filteredPanels[id] = p2);
    }), filteredPanels;
  }, [api, type, parameters]);
  return react_default.createElement(
    AddonPanel2,
    {
      panels,
      selectedPanel: api.getSelectedPanel(),
      panelPosition: state.layout.panelPosition,
      actions: panelActions,
      shortcuts: api.getShortcutKeys(),
      ...props
    }
  );
}, Panel_default = Panel;

// src/manager/container/Preview.tsx
var import_memoizerific = __toESM(require_memoizerific(), 1);

// src/manager/components/preview/Iframe.tsx
var StyledIframe = styled.iframe(({ theme }) => ({
  backgroundColor: theme.background.preview,
  display: "block",
  boxSizing: "content-box",
  height: "100%",
  width: "100%",
  border: "0 none",
  transition: "background-position 0s, visibility 0s",
  backgroundPosition: "-1px -1px, -1px -1px, -1px -1px, -1px -1px",
  margin: "auto",
  boxShadow: "0 0 100px 100vw rgba(0,0,0,0.5)"
}));
function IFrame(props) {
  let { active, id, title: title2, src, allowFullScreen, scale, ...rest2 } = props, iFrameRef = react_default.useRef(null);
  return react_default.createElement(Zoom.IFrame, { scale, active, iFrameRef }, react_default.createElement(
    StyledIframe,
    {
      "data-is-storybook": active ? "true" : "false",
      onLoad: (e2) => e2.currentTarget.setAttribute("data-is-loaded", "true"),
      id,
      title: title2,
      src,
      allow: "clipboard-write;",
      allowFullScreen,
      ref: iFrameRef,
      ...rest2
    }
  ));
}

// src/manager/components/preview/utils/stringifyQueryParams.tsx
var import_picoquery = __toESM(require_main(), 1), stringifyQueryParams = (queryParams) => {
  let result = (0, import_picoquery.stringify)(queryParams);
  return result === "" ? "" : `&${result}`;
};

// src/manager/components/preview/FramesRenderer.tsx
var getActive = (refId, refs) => refId && refs[refId] ? `storybook-ref-${refId}` : "storybook-preview-iframe", SkipToSidebarLink = styled(Button)(({ theme }) => ({
  display: "none",
  "@media (min-width: 600px)": {
    position: "absolute",
    display: "block",
    top: 10,
    right: 15,
    padding: "10px 15px",
    fontSize: theme.typography.size.s1,
    transform: "translateY(-100px)",
    "&:focus": {
      transform: "translateY(0)",
      zIndex: 1
    }
  }
})), whenSidebarIsVisible = ({ api, state }) => ({
  isFullscreen: api.getIsFullscreen(),
  isNavShown: api.getIsNavShown(),
  selectedStoryId: state.storyId
}), styles = {
  '#root [data-is-storybook="false"]': {
    display: "none"
  },
  '#root [data-is-storybook="true"]': {
    display: "block"
  }
}, FramesRenderer = ({
  refs,
  scale,
  viewMode = "story",
  refId,
  queryParams = {},
  baseUrl,
  storyId = "*"
}) => {
  let version3 = refs[refId]?.version, stringifiedQueryParams = stringifyQueryParams({
    ...queryParams,
    ...version3 && { version: version3 }
  }), active = getActive(refId, refs), { current: frames } = useRef({}), refsToLoad = Object.values(refs).filter((ref) => ref.type === "auto-inject" || ref.id === refId, {});
  return frames["storybook-preview-iframe"] || (frames["storybook-preview-iframe"] = getStoryHref(baseUrl, storyId, {
    ...queryParams,
    ...version3 && { version: version3 },
    viewMode
  })), refsToLoad.forEach((ref) => {
    let id = `storybook-ref-${ref.id}`, existingUrl = frames[id]?.split("/iframe.html")[0];
    if (!existingUrl || ref.url !== existingUrl) {
      let newUrl = `${ref.url}/iframe.html?id=${storyId}&viewMode=${viewMode}&refId=${ref.id}${stringifiedQueryParams}`;
      frames[id] = newUrl;
    }
  }), react_default.createElement(Fragment, null, react_default.createElement(Global, { styles }), react_default.createElement(Consumer, { filter: whenSidebarIsVisible }, ({ isFullscreen, isNavShown, selectedStoryId }) => isFullscreen || !isNavShown || !selectedStoryId ? null : react_default.createElement(SkipToSidebarLink, { ariaLabel: !1, asChild: !0 }, react_default.createElement("a", { href: `#${selectedStoryId}`, tabIndex: 0, title: "Skip to sidebar" }, "Skip to sidebar"))), Object.entries(frames).map(([id, src]) => react_default.createElement(Fragment, { key: id }, react_default.createElement(
    IFrame,
    {
      active: id === active,
      key: id,
      id,
      title: id,
      src,
      allowFullScreen: !0,
      scale
    }
  ))));
};

// src/manager/components/preview/Toolbar.tsx
var fullScreenMapper = ({ api, state }) => ({
  toggle: api.toggleFullscreen,
  isFullscreen: api.getIsFullscreen(),
  shortcut: api.getShortcutKeys().fullScreen,
  hasPanel: Object.keys(api.getElements(Addon_TypesEnum.PANEL)).length > 0,
  singleStory: state.singleStory
}), fullScreenTool = {
  title: "fullscreen",
  id: "fullscreen",
  type: types.TOOL,
  // @ts-expect-error (non strict)
  match: (p2) => ["story", "docs"].includes(p2.viewMode),
  render: () => {
    let { isMobile: isMobile2 } = useLayout();
    return isMobile2 ? null : react_default.createElement(Consumer, { filter: fullScreenMapper }, ({ toggle, isFullscreen, shortcut, hasPanel, singleStory }) => (!singleStory || singleStory && hasPanel) && react_default.createElement(
      Button,
      {
        key: "full",
        padding: "small",
        variant: "ghost",
        onClick: () => toggle(),
        ariaLabel: isFullscreen ? "Exit full screen" : "Enter full screen",
        shortcut
      },
      isFullscreen ? react_default.createElement(CloseIcon, null) : react_default.createElement(ExpandIcon, null)
    ));
  }
}, ToolbarComp = react_default.memo(function({
  isShown,
  tools,
  toolsExtra,
  tabs,
  tabState
}) {
  return isShown && (tabs || tools || toolsExtra) ? react_default.createElement(
    StyledSection,
    {
      className: "sb-bar",
      key: "toolbar",
      "data-testid": "sb-preview-toolbar",
      "aria-labelledby": "sb-preview-toolbar-title"
    },
    react_default.createElement("h2", { id: "sb-preview-toolbar-title", className: "sb-sr-only" }, "Toolbar"),
    tabs.length > 1 ? react_default.createElement(react_default.Fragment, null, react_default.createElement(TabList, { state: tabState }), react_default.createElement(Separator, null)) : null,
    react_default.createElement(StyledToolbar, null, react_default.createElement(Tools, { key: "left", list: tools }), react_default.createElement(Tools, { key: "right", list: toolsExtra }))
  ) : null;
}), Tools = react_default.memo(function({ list }) {
  return react_default.createElement(ToolGroup, null, list.filter(Boolean).map(({ render: Render, id, ...t2 }, index) => (
    // @ts-expect-error (Converted from ts-ignore)
    react_default.createElement(Render, { key: id || t2.key || `f-${index}` })
  )));
});
function toolbarItemHasBeenExcluded(item, entry) {
  let parameters = entry?.type === "story" && entry?.prepared ? entry?.parameters : {}, toolbarItemsFromStoryParameters = "toolbar" in parameters ? parameters.toolbar : void 0, { toolbar: toolbarItemsFromAddonsConfig } = addons.getConfig(), toolbarItems = merge(
    toolbarItemsFromAddonsConfig || {},
    toolbarItemsFromStoryParameters || {}
  );
  return toolbarItems ? !!toolbarItems[item?.id]?.hidden : !1;
}
function filterToolsSide(tools, entry, viewMode, location2, path, tabId) {
  let filter = (item) => item && (!item.match || item.match({
    storyId: entry?.id,
    refId: entry?.refId,
    viewMode,
    location: location2,
    path,
    tabId
  })) && !toolbarItemHasBeenExcluded(item, entry);
  return tools.filter(filter);
}
var StyledSection = styled.section(({ theme }) => ({
  position: "relative",
  display: "flex",
  alignItems: "center",
  color: theme.barTextColor,
  width: "100%",
  flexShrink: 0,
  overflowX: "auto",
  overflowY: "hidden",
  boxShadow: `${theme.appBorderColor}  0 -1px 0 0 inset`,
  background: theme.barBg,
  scrollbarColor: `${theme.barTextColor} ${theme.barBg}`,
  scrollbarWidth: "thin",
  zIndex: 4
})), StyledToolbar = styled(AbstractToolbar)({
  flex: 1,
  display: "flex",
  justifyContent: "space-between",
  flexWrap: "nowrap",
  flexShrink: 0,
  height: 40,
  marginInline: 10,
  gap: 30
}), ToolGroup = styled.div({
  display: "flex",
  whiteSpace: "nowrap",
  flexBasis: "auto",
  gap: 6,
  alignItems: "center"
});

// src/manager/components/preview/utils/components.ts
var PreviewContainer = styled.main({
  display: "flex",
  flexDirection: "column",
  width: "100%",
  height: "100%",
  overflow: "hidden"
}), FrameWrap = styled.section({
  overflow: "auto",
  width: "100%",
  zIndex: 3,
  background: "transparent",
  flex: 1
}), CanvasWrap = styled.div(
  {
    alignContent: "center",
    alignItems: "center",
    justifyContent: "center",
    justifyItems: "center",
    overflow: "auto",
    gridTemplateColumns: "100%",
    gridTemplateRows: "100%",
    position: "relative",
    width: "100%",
    height: "100%"
  },
  ({ show }) => ({ display: show ? "grid" : "none" })
), UnstyledLink = styled(Link2)({
  color: "inherit",
  textDecoration: "inherit",
  display: "inline-block"
}), DesktopOnly = styled.span({
  // Hides full screen icon at mobile breakpoint defined in app.js
  "@media (max-width: 599px)": {
    display: "none"
  }
}), IframeWrapper = styled.div(({ theme }) => ({
  alignContent: "center",
  alignItems: "center",
  justifyContent: "center",
  justifyItems: "center",
  overflow: "auto",
  display: "grid",
  gridTemplateColumns: "100%",
  gridTemplateRows: "100%",
  position: "relative",
  width: "100%",
  height: "100%"
})), LoaderWrapper = styled.div(({ theme }) => ({
  position: "absolute",
  top: 0,
  left: 0,
  bottom: 0,
  right: 0,
  background: theme.background.preview,
  zIndex: 1
}));

// src/manager/components/preview/Wrappers.tsx
var ApplyWrappers = ({
  wrappers,
  id,
  storyId,
  children
}) => react_default.createElement(Fragment, null, wrappers.reduceRight(
  (acc, wrapper, index) => react_default.createElement(wrapper.render, { index, children: acc, id, storyId }),
  children
)), defaultWrappers = [
  {
    id: "iframe-wrapper",
    type: Addon_TypesEnum.PREVIEW,
    render: (p2) => react_default.createElement(IframeWrapper, { id: "storybook-preview-wrapper" }, p2.children)
  }
];

// src/manager/components/preview/tools/zoom.tsx
var initialZoom = 1, Context = createContext({ value: initialZoom, set: (v2) => {
} }), ZoomProvider = class extends Component {
  constructor() {
    super(...arguments);
    this.state = {
      value: initialZoom
    };
    this.set = (value) => this.setState({ value });
  }
  render() {
    let { children, shouldScale } = this.props, { set } = this, { value } = this.state;
    return react_default.createElement(Context.Provider, { value: { value: shouldScale ? value : initialZoom, set } }, children);
  }
}, { Consumer: ZoomConsumer } = Context, Zoom2 = memo(function({ zoomIn, zoomOut, reset }) {
  return react_default.createElement(react_default.Fragment, null, react_default.createElement(Button, { key: "zoomin", padding: "small", variant: "ghost", onClick: zoomIn, ariaLabel: "Zoom in" }, react_default.createElement(ZoomIcon, null)), react_default.createElement(Button, { key: "zoomout", padding: "small", variant: "ghost", onClick: zoomOut, ariaLabel: "Zoom out" }, react_default.createElement(ZoomOutIcon, null)), react_default.createElement(
    Button,
    {
      key: "zoomreset",
      padding: "small",
      variant: "ghost",
      onClick: reset,
      ariaLabel: "Reset zoom"
    },
    react_default.createElement(ZoomResetIcon, null)
  ));
});
var ZoomWrapper = memo(function({
  set,
  value
}) {
  let zoomIn = useCallback(
    (e2) => {
      e2.preventDefault(), set(0.8 * value);
    },
    [set, value]
  ), zoomOut = useCallback(
    (e2) => {
      e2.preventDefault(), set(1.25 * value);
    },
    [set, value]
  ), reset = useCallback(
    (e2) => {
      e2.preventDefault(), set(initialZoom);
    },
    [set, initialZoom]
  );
  return react_default.createElement(Zoom2, { key: "zoom", zoomIn, zoomOut, reset });
});
function ZoomToolRenderer() {
  return react_default.createElement(react_default.Fragment, null, react_default.createElement(ZoomConsumer, null, ({ set, value }) => react_default.createElement(ZoomWrapper, { set, value })), react_default.createElement(Separator, null));
}
var zoomTool = {
  title: "zoom",
  id: "zoom",
  type: types.TOOL,
  match: ({ viewMode, tabId }) => viewMode === "story" && !tabId,
  render: ZoomToolRenderer
};

// src/manager/components/preview/Preview.tsx
var canvasMapper = ({ state, api }) => ({
  storyId: state.storyId,
  refId: state.refId,
  viewMode: state.viewMode,
  customCanvas: api.renderPreview,
  queryParams: state.customQueryParams,
  getElements: api.getElements,
  entry: api.getData(state.storyId, state.refId),
  previewInitialized: state.previewInitialized,
  refs: state.refs
}), createCanvasTab = () => ({
  id: "canvas",
  type: types.TAB,
  title: "Canvas",
  route: ({ storyId, refId }) => refId ? `/story/${refId}_${storyId}` : `/story/${storyId}`,
  match: ({ viewMode }) => !!(viewMode && viewMode.match(/^(story|docs)$/)),
  render: () => null
}), Preview = react_default.memo(function(props) {
  let {
    api,
    id: previewId,
    options: options2,
    viewMode,
    storyId,
    entry = void 0,
    description,
    baseUrl,
    withLoader = !0,
    tools,
    toolsExtra,
    tabs,
    wrappers,
    tabId
  } = props, tabState = useTabsState({
    selected: tabId ?? "canvas",
    onSelectionChange: (key) => {
      api.applyQueryParams({ tab: key === "canvas" ? void 0 : key });
    },
    tabs: tabs.map((tab, index) => ({
      id: tab.id ?? `tab-${index}`,
      title: tab.title,
      isDisabled: !!tab.disabled,
      children: () => tab.render({ active: !0 })
    }))
  });
  tabs.length > 1 && deprecate("Addon tabs are deprecated and will be removed in Storybook 11.");
  let tabContent = tabs.find((tab) => tab.id === tabId)?.render, shouldScale = viewMode === "story", { showToolbar } = options2, customisedShowToolbar = api.getShowToolbarWithCustomisations(showToolbar), previousStoryId = useRef(storyId);
  return useEffect(() => {
    if (entry && viewMode) {
      if (storyId === previousStoryId.current)
        return;
      if (previousStoryId.current = storyId, viewMode.match(/docs|story/)) {
        let { refId, id } = entry;
        api.emit(SET_CURRENT_STORY, {
          storyId: id,
          viewMode,
          options: { target: refId }
        });
      }
    }
  }, [entry, viewMode, storyId, api]), react_default.createElement(Fragment, null, previewId === "main" && react_default.createElement(W, { key: "description" }, react_default.createElement("title", null, description)), react_default.createElement(ZoomProvider, { shouldScale }, react_default.createElement(PreviewContainer, null, react_default.createElement(
    ToolbarComp,
    {
      key: "tools",
      isShown: customisedShowToolbar,
      tabs,
      tabState,
      tools,
      toolsExtra
    }
  ), react_default.createElement(FrameWrap, { "aria-labelledby": "main-preview-heading" }, react_default.createElement("h2", { id: "main-preview-heading", className: "sb-sr-only" }, "Main preview area"), tabContent && react_default.createElement(IframeWrapper, null, tabContent({ active: !0 })), react_default.createElement(CanvasWrap, { show: !tabId || tabId === "canvas" }, react_default.createElement(Canvas, { withLoader, baseUrl, wrappers }))))));
});
var Canvas = ({ baseUrl, withLoader, wrappers }) => react_default.createElement(Consumer, { filter: canvasMapper }, ({
  entry,
  refs,
  customCanvas,
  storyId,
  refId,
  viewMode,
  queryParams,
  previewInitialized
}) => {
  let id = "canvas", [progress, setProgress] = useState(void 0);
  useEffect(() => {
    if (scope.CONFIG_TYPE === "DEVELOPMENT")
      try {
        addons.getChannel().on(PREVIEW_BUILDER_PROGRESS, (options2) => {
          setProgress(options2);
        });
      } catch {
      }
  }, []);
  let refLoading = !!refs[refId] && !refs[refId].previewInitialized, isBuilding = !(progress?.value === 1 || progress === void 0), rootLoading = !refId && (!previewInitialized || isBuilding), isLoading = entry && refLoading || rootLoading;
  return react_default.createElement(ZoomConsumer, null, ({ value: scale }) => react_default.createElement(react_default.Fragment, null, withLoader && isLoading && react_default.createElement(LoaderWrapper, null, react_default.createElement(Loader, { id: "preview-loader", role: "progressbar", progress })), react_default.createElement(ApplyWrappers, { id, storyId, viewMode, wrappers }, customCanvas ? customCanvas(storyId, viewMode, id, baseUrl, scale, queryParams) : react_default.createElement(
    FramesRenderer,
    {
      baseUrl,
      refs,
      scale,
      entry,
      viewMode,
      refId,
      queryParams,
      storyId
    }
  ))));
});
function filterTabs(panels, parameters) {
  let { previewTabs } = addons.getConfig(), parametersTabs = parameters ? parameters.previewTabs : void 0;
  if (previewTabs || parametersTabs) {
    let tabs = merge(previewTabs || {}, parametersTabs || {}), arrTabs = Object.keys(tabs).map((key, index) => ({
      index,
      ...typeof tabs[key] == "string" ? { title: tabs[key] } : tabs[key],
      id: key
    }));
    return panels.filter((panel) => {
      let t2 = arrTabs.find((tab) => tab.id === panel.id);
      return t2 === void 0 || t2.id === "canvas" || !t2.hidden;
    }).map((panel, index) => ({ ...panel, index })).sort((p1, p2) => {
      let tab_1 = arrTabs.find((tab) => tab.id === p1.id), index_1 = tab_1 ? tab_1.index : arrTabs.length + p1.index, tab_2 = arrTabs.find((tab) => tab.id === p2.id), index_2 = tab_2 ? tab_2.index : arrTabs.length + p2.index;
      return index_1 - index_2;
    }).map((panel) => {
      let t2 = arrTabs.find((tab) => tab.id === panel.id);
      return t2 ? {
        ...panel,
        title: t2.title || panel.title,
        disabled: t2.disabled,
        hidden: t2.hidden
      } : panel;
    });
  }
  return panels;
}

// src/manager/components/preview/tools/addons.tsx
var menuMapper = ({ api, state }) => ({
  isVisible: api.getIsPanelShown(),
  singleStory: state.singleStory,
  panelPosition: state.layout.panelPosition,
  toggle: () => api.togglePanel()
}), addonsTool = {
  title: "addons",
  id: "addons",
  type: types.TOOL,
  match: ({ viewMode, tabId }) => viewMode === "story" && !tabId,
  render: () => react_default.createElement(Consumer, { filter: menuMapper }, ({ isVisible, toggle, singleStory, panelPosition }) => !singleStory && !isVisible && react_default.createElement(react_default.Fragment, null, react_default.createElement(
    Button,
    {
      padding: "small",
      variant: "ghost",
      ariaLabel: "Show addon panel",
      key: "addons",
      onClick: toggle
    },
    panelPosition === "bottom" ? react_default.createElement(BottomBarIcon, null) : react_default.createElement(SidebarAltIcon, null)
  )))
};

// src/manager/components/preview/tools/menu.tsx
var menuMapper2 = ({ api, state }) => ({
  isVisible: api.getIsNavShown(),
  singleStory: state.singleStory,
  toggle: () => api.toggleNav()
}), menuTool = {
  title: "menu",
  id: "menu",
  type: types.TOOL,
  // @ts-expect-error (non strict)
  match: ({ viewMode }) => ["story", "docs"].includes(viewMode),
  render: () => react_default.createElement(Consumer, { filter: menuMapper2 }, ({ isVisible, toggle, singleStory }) => !singleStory && !isVisible && react_default.createElement(react_default.Fragment, null, react_default.createElement(
    Button,
    {
      padding: "small",
      variant: "ghost",
      ariaLabel: "Show sidebar",
      key: "menu",
      onClick: toggle
    },
    react_default.createElement(MenuIcon, null)
  ), react_default.createElement(Separator, null)))
};

// src/manager/components/preview/tools/open-in-editor.tsx
var mapper2 = ({ state, api }) => {
  let { storyId, refId } = state, entry = api.getData(storyId, refId);
  return {
    storyId,
    isCompositionStory: !!refId,
    importPath: entry?.importPath
  };
}, openInEditorTool = {
  title: "open-in-editor",
  id: "open-in-editor",
  type: types.TOOL,
  match: ({ viewMode, tabId }) => scope.CONFIG_TYPE === "DEVELOPMENT" && (viewMode === "story" || viewMode === "docs") && !tabId,
  render: () => react_default.createElement(Consumer, { filter: mapper2 }, ({ importPath, isCompositionStory }) => {
    let api = useStorybookApi();
    return isCompositionStory || !importPath ? null : react_default.createElement(
      Button,
      {
        key: "open-in-editor",
        onClick: () => api.openInEditor({
          file: importPath
        }),
        ariaLabel: "Open in editor",
        padding: "small",
        variant: "ghost"
      },
      react_default.createElement(EditorIcon, null)
    );
  })
};

// src/manager/components/preview/tools/remount.tsx
var StyledAnimatedButton = styled(Button)(({ theme, animating, disabled }) => ({
  opacity: disabled ? 0.5 : 1,
  svg: {
    animation: animating ? `${theme.animation.rotate360} 1000ms ease-out` : void 0
  }
})), menuMapper3 = ({ api, state }) => {
  let { storyId } = state;
  return {
    storyId,
    remount: () => api.emit(FORCE_REMOUNT, { storyId: state.storyId }),
    api
  };
}, remountTool = {
  title: "remount",
  id: "remount",
  type: types.TOOL,
  match: ({ viewMode, tabId }) => viewMode === "story" && !tabId,
  render: () => react_default.createElement(Consumer, { filter: menuMapper3 }, ({ remount, storyId, api }) => {
    let [isAnimating, setIsAnimating] = useState(!1), remountComponent = () => {
      storyId && remount();
    };
    return useEffect(() => {
      let handler = () => setIsAnimating(!0);
      return api.on(FORCE_REMOUNT, handler), () => api.off?.(FORCE_REMOUNT, handler);
    }, [api]), react_default.createElement(
      StyledAnimatedButton,
      {
        key: "remount",
        padding: "small",
        variant: "ghost",
        ariaLabel: "Reload story",
        onClick: remountComponent,
        onAnimationEnd: () => setIsAnimating(!1),
        animating: isAnimating,
        disabled: !storyId
      },
      react_default.createElement(SyncIcon, null)
    );
  })
};

// src/manager/components/preview/tools/share.tsx
var import_copy_to_clipboard = __toESM(require_copy_to_clipboard(), 1);

// ../node_modules/qrcode.react/lib/esm/index.js
var __defProp2 = Object.defineProperty, __getOwnPropSymbols = Object.getOwnPropertySymbols, __hasOwnProp2 = Object.prototype.hasOwnProperty, __propIsEnum = Object.prototype.propertyIsEnumerable, __defNormalProp = (obj, key, value) => key in obj ? __defProp2(obj, key, { enumerable: !0, configurable: !0, writable: !0, value }) : obj[key] = value, __spreadValues = (a2, b2) => {
  for (var prop in b2 || (b2 = {}))
    __hasOwnProp2.call(b2, prop) && __defNormalProp(a2, prop, b2[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b2))
      __propIsEnum.call(b2, prop) && __defNormalProp(a2, prop, b2[prop]);
  return a2;
}, __objRest = (source, exclude) => {
  var target = {};
  for (var prop in source)
    __hasOwnProp2.call(source, prop) && exclude.indexOf(prop) < 0 && (target[prop] = source[prop]);
  if (source != null && __getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(source))
      exclude.indexOf(prop) < 0 && __propIsEnum.call(source, prop) && (target[prop] = source[prop]);
  return target;
};
var qrcodegen;
((qrcodegen2) => {
  let _QrCode = class _QrCode2 {
    /*-- Constructor (low level) and fields --*/
    // Creates a new QR Code with the given version number,
    // error correction level, data codeword bytes, and mask number.
    // This is a low-level API that most users should not use directly.
    // A mid-level API is the encodeSegments() function.
    constructor(version3, errorCorrectionLevel, dataCodewords, msk) {
      if (this.version = version3, this.errorCorrectionLevel = errorCorrectionLevel, this.modules = [], this.isFunction = [], version3 < _QrCode2.MIN_VERSION || version3 > _QrCode2.MAX_VERSION)
        throw new RangeError("Version value out of range");
      if (msk < -1 || msk > 7)
        throw new RangeError("Mask value out of range");
      this.size = version3 * 4 + 17;
      let row = [];
      for (let i2 = 0; i2 < this.size; i2++)
        row.push(!1);
      for (let i2 = 0; i2 < this.size; i2++)
        this.modules.push(row.slice()), this.isFunction.push(row.slice());
      this.drawFunctionPatterns();
      let allCodewords = this.addEccAndInterleave(dataCodewords);
      if (this.drawCodewords(allCodewords), msk == -1) {
        let minPenalty = 1e9;
        for (let i2 = 0; i2 < 8; i2++) {
          this.applyMask(i2), this.drawFormatBits(i2);
          let penalty = this.getPenaltyScore();
          penalty < minPenalty && (msk = i2, minPenalty = penalty), this.applyMask(i2);
        }
      }
      assert(0 <= msk && msk <= 7), this.mask = msk, this.applyMask(msk), this.drawFormatBits(msk), this.isFunction = [];
    }
    /*-- Static factory functions (high level) --*/
    // Returns a QR Code representing the given Unicode text string at the given error correction level.
    // As a conservative upper bound, this function is guaranteed to succeed for strings that have 738 or fewer
    // Unicode code points (not UTF-16 code units) if the low error correction level is used. The smallest possible
    // QR Code version is automatically chosen for the output. The ECC level of the result may be higher than the
    // ecl argument if it can be done without increasing the version.
    static encodeText(text, ecl) {
      let segs = qrcodegen2.QrSegment.makeSegments(text);
      return _QrCode2.encodeSegments(segs, ecl);
    }
    // Returns a QR Code representing the given binary data at the given error correction level.
    // This function always encodes using the binary segment mode, not any text mode. The maximum number of
    // bytes allowed is 2953. The smallest possible QR Code version is automatically chosen for the output.
    // The ECC level of the result may be higher than the ecl argument if it can be done without increasing the version.
    static encodeBinary(data, ecl) {
      let seg = qrcodegen2.QrSegment.makeBytes(data);
      return _QrCode2.encodeSegments([seg], ecl);
    }
    /*-- Static factory functions (mid level) --*/
    // Returns a QR Code representing the given segments with the given encoding parameters.
    // The smallest possible QR Code version within the given range is automatically
    // chosen for the output. Iff boostEcl is true, then the ECC level of the result
    // may be higher than the ecl argument if it can be done without increasing the
    // version. The mask number is either between 0 to 7 (inclusive) to force that
    // mask, or -1 to automatically choose an appropriate mask (which may be slow).
    // This function allows the user to create a custom sequence of segments that switches
    // between modes (such as alphanumeric and byte) to encode text in less space.
    // This is a mid-level API; the high-level API is encodeText() and encodeBinary().
    static encodeSegments(segs, ecl, minVersion = 1, maxVersion = 40, mask = -1, boostEcl = !0) {
      if (!(_QrCode2.MIN_VERSION <= minVersion && minVersion <= maxVersion && maxVersion <= _QrCode2.MAX_VERSION) || mask < -1 || mask > 7)
        throw new RangeError("Invalid value");
      let version3, dataUsedBits;
      for (version3 = minVersion; ; version3++) {
        let dataCapacityBits2 = _QrCode2.getNumDataCodewords(version3, ecl) * 8, usedBits = QrSegment.getTotalBits(segs, version3);
        if (usedBits <= dataCapacityBits2) {
          dataUsedBits = usedBits;
          break;
        }
        if (version3 >= maxVersion)
          throw new RangeError("Data too long");
      }
      for (let newEcl of [_QrCode2.Ecc.MEDIUM, _QrCode2.Ecc.QUARTILE, _QrCode2.Ecc.HIGH])
        boostEcl && dataUsedBits <= _QrCode2.getNumDataCodewords(version3, newEcl) * 8 && (ecl = newEcl);
      let bb = [];
      for (let seg of segs) {
        appendBits(seg.mode.modeBits, 4, bb), appendBits(seg.numChars, seg.mode.numCharCountBits(version3), bb);
        for (let b2 of seg.getData())
          bb.push(b2);
      }
      assert(bb.length == dataUsedBits);
      let dataCapacityBits = _QrCode2.getNumDataCodewords(version3, ecl) * 8;
      assert(bb.length <= dataCapacityBits), appendBits(0, Math.min(4, dataCapacityBits - bb.length), bb), appendBits(0, (8 - bb.length % 8) % 8, bb), assert(bb.length % 8 == 0);
      for (let padByte = 236; bb.length < dataCapacityBits; padByte ^= 253)
        appendBits(padByte, 8, bb);
      let dataCodewords = [];
      for (; dataCodewords.length * 8 < bb.length; )
        dataCodewords.push(0);
      return bb.forEach((b2, i2) => dataCodewords[i2 >>> 3] |= b2 << 7 - (i2 & 7)), new _QrCode2(version3, ecl, dataCodewords, mask);
    }
    /*-- Accessor methods --*/
    // Returns the color of the module (pixel) at the given coordinates, which is false
    // for light or true for dark. The top left corner has the coordinates (x=0, y=0).
    // If the given coordinates are out of bounds, then false (light) is returned.
    getModule(x2, y2) {
      return 0 <= x2 && x2 < this.size && 0 <= y2 && y2 < this.size && this.modules[y2][x2];
    }
    // Modified to expose modules for easy access
    getModules() {
      return this.modules;
    }
    /*-- Private helper methods for constructor: Drawing function modules --*/
    // Reads this object's version field, and draws and marks all function modules.
    drawFunctionPatterns() {
      for (let i2 = 0; i2 < this.size; i2++)
        this.setFunctionModule(6, i2, i2 % 2 == 0), this.setFunctionModule(i2, 6, i2 % 2 == 0);
      this.drawFinderPattern(3, 3), this.drawFinderPattern(this.size - 4, 3), this.drawFinderPattern(3, this.size - 4);
      let alignPatPos = this.getAlignmentPatternPositions(), numAlign = alignPatPos.length;
      for (let i2 = 0; i2 < numAlign; i2++)
        for (let j2 = 0; j2 < numAlign; j2++)
          i2 == 0 && j2 == 0 || i2 == 0 && j2 == numAlign - 1 || i2 == numAlign - 1 && j2 == 0 || this.drawAlignmentPattern(alignPatPos[i2], alignPatPos[j2]);
      this.drawFormatBits(0), this.drawVersion();
    }
    // Draws two copies of the format bits (with its own error correction code)
    // based on the given mask and this object's error correction level field.
    drawFormatBits(mask) {
      let data = this.errorCorrectionLevel.formatBits << 3 | mask, rem2 = data;
      for (let i2 = 0; i2 < 10; i2++)
        rem2 = rem2 << 1 ^ (rem2 >>> 9) * 1335;
      let bits = (data << 10 | rem2) ^ 21522;
      assert(bits >>> 15 == 0);
      for (let i2 = 0; i2 <= 5; i2++)
        this.setFunctionModule(8, i2, getBit(bits, i2));
      this.setFunctionModule(8, 7, getBit(bits, 6)), this.setFunctionModule(8, 8, getBit(bits, 7)), this.setFunctionModule(7, 8, getBit(bits, 8));
      for (let i2 = 9; i2 < 15; i2++)
        this.setFunctionModule(14 - i2, 8, getBit(bits, i2));
      for (let i2 = 0; i2 < 8; i2++)
        this.setFunctionModule(this.size - 1 - i2, 8, getBit(bits, i2));
      for (let i2 = 8; i2 < 15; i2++)
        this.setFunctionModule(8, this.size - 15 + i2, getBit(bits, i2));
      this.setFunctionModule(8, this.size - 8, !0);
    }
    // Draws two copies of the version bits (with its own error correction code),
    // based on this object's version field, iff 7 <= version <= 40.
    drawVersion() {
      if (this.version < 7)
        return;
      let rem2 = this.version;
      for (let i2 = 0; i2 < 12; i2++)
        rem2 = rem2 << 1 ^ (rem2 >>> 11) * 7973;
      let bits = this.version << 12 | rem2;
      assert(bits >>> 18 == 0);
      for (let i2 = 0; i2 < 18; i2++) {
        let color2 = getBit(bits, i2), a2 = this.size - 11 + i2 % 3, b2 = Math.floor(i2 / 3);
        this.setFunctionModule(a2, b2, color2), this.setFunctionModule(b2, a2, color2);
      }
    }
    // Draws a 9*9 finder pattern including the border separator,
    // with the center module at (x, y). Modules can be out of bounds.
    drawFinderPattern(x2, y2) {
      for (let dy = -4; dy <= 4; dy++)
        for (let dx = -4; dx <= 4; dx++) {
          let dist = Math.max(Math.abs(dx), Math.abs(dy)), xx = x2 + dx, yy = y2 + dy;
          0 <= xx && xx < this.size && 0 <= yy && yy < this.size && this.setFunctionModule(xx, yy, dist != 2 && dist != 4);
        }
    }
    // Draws a 5*5 alignment pattern, with the center module
    // at (x, y). All modules must be in bounds.
    drawAlignmentPattern(x2, y2) {
      for (let dy = -2; dy <= 2; dy++)
        for (let dx = -2; dx <= 2; dx++)
          this.setFunctionModule(x2 + dx, y2 + dy, Math.max(Math.abs(dx), Math.abs(dy)) != 1);
    }
    // Sets the color of a module and marks it as a function module.
    // Only used by the constructor. Coordinates must be in bounds.
    setFunctionModule(x2, y2, isDark) {
      this.modules[y2][x2] = isDark, this.isFunction[y2][x2] = !0;
    }
    /*-- Private helper methods for constructor: Codewords and masking --*/
    // Returns a new byte string representing the given data with the appropriate error correction
    // codewords appended to it, based on this object's version and error correction level.
    addEccAndInterleave(data) {
      let ver = this.version, ecl = this.errorCorrectionLevel;
      if (data.length != _QrCode2.getNumDataCodewords(ver, ecl))
        throw new RangeError("Invalid argument");
      let numBlocks = _QrCode2.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver], blockEccLen = _QrCode2.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver], rawCodewords = Math.floor(_QrCode2.getNumRawDataModules(ver) / 8), numShortBlocks = numBlocks - rawCodewords % numBlocks, shortBlockLen = Math.floor(rawCodewords / numBlocks), blocks = [], rsDiv = _QrCode2.reedSolomonComputeDivisor(blockEccLen);
      for (let i2 = 0, k2 = 0; i2 < numBlocks; i2++) {
        let dat = data.slice(k2, k2 + shortBlockLen - blockEccLen + (i2 < numShortBlocks ? 0 : 1));
        k2 += dat.length;
        let ecc = _QrCode2.reedSolomonComputeRemainder(dat, rsDiv);
        i2 < numShortBlocks && dat.push(0), blocks.push(dat.concat(ecc));
      }
      let result = [];
      for (let i2 = 0; i2 < blocks[0].length; i2++)
        blocks.forEach((block, j2) => {
          (i2 != shortBlockLen - blockEccLen || j2 >= numShortBlocks) && result.push(block[i2]);
        });
      return assert(result.length == rawCodewords), result;
    }
    // Draws the given sequence of 8-bit codewords (data and error correction) onto the entire
    // data area of this QR Code. Function modules need to be marked off before this is called.
    drawCodewords(data) {
      if (data.length != Math.floor(_QrCode2.getNumRawDataModules(this.version) / 8))
        throw new RangeError("Invalid argument");
      let i2 = 0;
      for (let right = this.size - 1; right >= 1; right -= 2) {
        right == 6 && (right = 5);
        for (let vert = 0; vert < this.size; vert++)
          for (let j2 = 0; j2 < 2; j2++) {
            let x2 = right - j2, y2 = (right + 1 & 2) == 0 ? this.size - 1 - vert : vert;
            !this.isFunction[y2][x2] && i2 < data.length * 8 && (this.modules[y2][x2] = getBit(data[i2 >>> 3], 7 - (i2 & 7)), i2++);
          }
      }
      assert(i2 == data.length * 8);
    }
    // XORs the codeword modules in this QR Code with the given mask pattern.
    // The function modules must be marked and the codeword bits must be drawn
    // before masking. Due to the arithmetic of XOR, calling applyMask() with
    // the same mask value a second time will undo the mask. A final well-formed
    // QR Code needs exactly one (not zero, two, etc.) mask applied.
    applyMask(mask) {
      if (mask < 0 || mask > 7)
        throw new RangeError("Mask value out of range");
      for (let y2 = 0; y2 < this.size; y2++)
        for (let x2 = 0; x2 < this.size; x2++) {
          let invert;
          switch (mask) {
            case 0:
              invert = (x2 + y2) % 2 == 0;
              break;
            case 1:
              invert = y2 % 2 == 0;
              break;
            case 2:
              invert = x2 % 3 == 0;
              break;
            case 3:
              invert = (x2 + y2) % 3 == 0;
              break;
            case 4:
              invert = (Math.floor(x2 / 3) + Math.floor(y2 / 2)) % 2 == 0;
              break;
            case 5:
              invert = x2 * y2 % 2 + x2 * y2 % 3 == 0;
              break;
            case 6:
              invert = (x2 * y2 % 2 + x2 * y2 % 3) % 2 == 0;
              break;
            case 7:
              invert = ((x2 + y2) % 2 + x2 * y2 % 3) % 2 == 0;
              break;
            default:
              throw new Error("Unreachable");
          }
          !this.isFunction[y2][x2] && invert && (this.modules[y2][x2] = !this.modules[y2][x2]);
        }
    }
    // Calculates and returns the penalty score based on state of this QR Code's current modules.
    // This is used by the automatic mask choice algorithm to find the mask pattern that yields the lowest score.
    getPenaltyScore() {
      let result = 0;
      for (let y2 = 0; y2 < this.size; y2++) {
        let runColor = !1, runX = 0, runHistory = [0, 0, 0, 0, 0, 0, 0];
        for (let x2 = 0; x2 < this.size; x2++)
          this.modules[y2][x2] == runColor ? (runX++, runX == 5 ? result += _QrCode2.PENALTY_N1 : runX > 5 && result++) : (this.finderPenaltyAddHistory(runX, runHistory), runColor || (result += this.finderPenaltyCountPatterns(runHistory) * _QrCode2.PENALTY_N3), runColor = this.modules[y2][x2], runX = 1);
        result += this.finderPenaltyTerminateAndCount(runColor, runX, runHistory) * _QrCode2.PENALTY_N3;
      }
      for (let x2 = 0; x2 < this.size; x2++) {
        let runColor = !1, runY = 0, runHistory = [0, 0, 0, 0, 0, 0, 0];
        for (let y2 = 0; y2 < this.size; y2++)
          this.modules[y2][x2] == runColor ? (runY++, runY == 5 ? result += _QrCode2.PENALTY_N1 : runY > 5 && result++) : (this.finderPenaltyAddHistory(runY, runHistory), runColor || (result += this.finderPenaltyCountPatterns(runHistory) * _QrCode2.PENALTY_N3), runColor = this.modules[y2][x2], runY = 1);
        result += this.finderPenaltyTerminateAndCount(runColor, runY, runHistory) * _QrCode2.PENALTY_N3;
      }
      for (let y2 = 0; y2 < this.size - 1; y2++)
        for (let x2 = 0; x2 < this.size - 1; x2++) {
          let color2 = this.modules[y2][x2];
          color2 == this.modules[y2][x2 + 1] && color2 == this.modules[y2 + 1][x2] && color2 == this.modules[y2 + 1][x2 + 1] && (result += _QrCode2.PENALTY_N2);
        }
      let dark = 0;
      for (let row of this.modules)
        dark = row.reduce((sum, color2) => sum + (color2 ? 1 : 0), dark);
      let total = this.size * this.size, k2 = Math.ceil(Math.abs(dark * 20 - total * 10) / total) - 1;
      return assert(0 <= k2 && k2 <= 9), result += k2 * _QrCode2.PENALTY_N4, assert(0 <= result && result <= 2568888), result;
    }
    /*-- Private helper functions --*/
    // Returns an ascending list of positions of alignment patterns for this version number.
    // Each position is in the range [0,177), and are used on both the x and y axes.
    // This could be implemented as lookup table of 40 variable-length lists of integers.
    getAlignmentPatternPositions() {
      if (this.version == 1)
        return [];
      {
        let numAlign = Math.floor(this.version / 7) + 2, step = this.version == 32 ? 26 : Math.ceil((this.version * 4 + 4) / (numAlign * 2 - 2)) * 2, result = [6];
        for (let pos = this.size - 7; result.length < numAlign; pos -= step)
          result.splice(1, 0, pos);
        return result;
      }
    }
    // Returns the number of data bits that can be stored in a QR Code of the given version number, after
    // all function modules are excluded. This includes remainder bits, so it might not be a multiple of 8.
    // The result is in the range [208, 29648]. This could be implemented as a 40-entry lookup table.
    static getNumRawDataModules(ver) {
      if (ver < _QrCode2.MIN_VERSION || ver > _QrCode2.MAX_VERSION)
        throw new RangeError("Version number out of range");
      let result = (16 * ver + 128) * ver + 64;
      if (ver >= 2) {
        let numAlign = Math.floor(ver / 7) + 2;
        result -= (25 * numAlign - 10) * numAlign - 55, ver >= 7 && (result -= 36);
      }
      return assert(208 <= result && result <= 29648), result;
    }
    // Returns the number of 8-bit data (i.e. not error correction) codewords contained in any
    // QR Code of the given version number and error correction level, with remainder bits discarded.
    // This stateless pure function could be implemented as a (40*4)-cell lookup table.
    static getNumDataCodewords(ver, ecl) {
      return Math.floor(_QrCode2.getNumRawDataModules(ver) / 8) - _QrCode2.ECC_CODEWORDS_PER_BLOCK[ecl.ordinal][ver] * _QrCode2.NUM_ERROR_CORRECTION_BLOCKS[ecl.ordinal][ver];
    }
    // Returns a Reed-Solomon ECC generator polynomial for the given degree. This could be
    // implemented as a lookup table over all possible parameter values, instead of as an algorithm.
    static reedSolomonComputeDivisor(degree) {
      if (degree < 1 || degree > 255)
        throw new RangeError("Degree out of range");
      let result = [];
      for (let i2 = 0; i2 < degree - 1; i2++)
        result.push(0);
      result.push(1);
      let root2 = 1;
      for (let i2 = 0; i2 < degree; i2++) {
        for (let j2 = 0; j2 < result.length; j2++)
          result[j2] = _QrCode2.reedSolomonMultiply(result[j2], root2), j2 + 1 < result.length && (result[j2] ^= result[j2 + 1]);
        root2 = _QrCode2.reedSolomonMultiply(root2, 2);
      }
      return result;
    }
    // Returns the Reed-Solomon error correction codeword for the given data and divisor polynomials.
    static reedSolomonComputeRemainder(data, divisor) {
      let result = divisor.map((_2) => 0);
      for (let b2 of data) {
        let factor = b2 ^ result.shift();
        result.push(0), divisor.forEach((coef, i2) => result[i2] ^= _QrCode2.reedSolomonMultiply(coef, factor));
      }
      return result;
    }
    // Returns the product of the two given field elements modulo GF(2^8/0x11D). The arguments and result
    // are unsigned 8-bit integers. This could be implemented as a lookup table of 256*256 entries of uint8.
    static reedSolomonMultiply(x2, y2) {
      if (x2 >>> 8 || y2 >>> 8)
        throw new RangeError("Byte out of range");
      let z2 = 0;
      for (let i2 = 7; i2 >= 0; i2--)
        z2 = z2 << 1 ^ (z2 >>> 7) * 285, z2 ^= (y2 >>> i2 & 1) * x2;
      return assert(z2 >>> 8 == 0), z2;
    }
    // Can only be called immediately after a light run is added, and
    // returns either 0, 1, or 2. A helper function for getPenaltyScore().
    finderPenaltyCountPatterns(runHistory) {
      let n3 = runHistory[1];
      assert(n3 <= this.size * 3);
      let core = n3 > 0 && runHistory[2] == n3 && runHistory[3] == n3 * 3 && runHistory[4] == n3 && runHistory[5] == n3;
      return (core && runHistory[0] >= n3 * 4 && runHistory[6] >= n3 ? 1 : 0) + (core && runHistory[6] >= n3 * 4 && runHistory[0] >= n3 ? 1 : 0);
    }
    // Must be called at the end of a line (row or column) of modules. A helper function for getPenaltyScore().
    finderPenaltyTerminateAndCount(currentRunColor, currentRunLength, runHistory) {
      return currentRunColor && (this.finderPenaltyAddHistory(currentRunLength, runHistory), currentRunLength = 0), currentRunLength += this.size, this.finderPenaltyAddHistory(currentRunLength, runHistory), this.finderPenaltyCountPatterns(runHistory);
    }
    // Pushes the given value to the front and drops the last value. A helper function for getPenaltyScore().
    finderPenaltyAddHistory(currentRunLength, runHistory) {
      runHistory[0] == 0 && (currentRunLength += this.size), runHistory.pop(), runHistory.unshift(currentRunLength);
    }
  };
  _QrCode.MIN_VERSION = 1, _QrCode.MAX_VERSION = 40, _QrCode.PENALTY_N1 = 3, _QrCode.PENALTY_N2 = 3, _QrCode.PENALTY_N3 = 40, _QrCode.PENALTY_N4 = 10, _QrCode.ECC_CODEWORDS_PER_BLOCK = [
    // Version: (note that index 0 is for padding, and is set to an illegal value)
    //0,  1,  2,  3,  4,  5,  6,  7,  8,  9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40    Error correction level
    [-1, 7, 10, 15, 20, 26, 18, 20, 24, 30, 18, 20, 24, 26, 30, 22, 24, 28, 30, 28, 28, 28, 28, 30, 30, 26, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    // Low
    [-1, 10, 16, 26, 18, 24, 16, 18, 22, 22, 26, 30, 22, 22, 24, 24, 28, 28, 26, 26, 26, 26, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28, 28],
    // Medium
    [-1, 13, 22, 18, 26, 18, 24, 18, 22, 20, 24, 28, 26, 24, 20, 30, 24, 28, 28, 26, 30, 28, 30, 30, 30, 30, 28, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30],
    // Quartile
    [-1, 17, 28, 22, 16, 22, 28, 26, 26, 24, 28, 24, 28, 22, 24, 24, 30, 28, 28, 26, 28, 30, 24, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30, 30]
    // High
  ], _QrCode.NUM_ERROR_CORRECTION_BLOCKS = [
    // Version: (note that index 0 is for padding, and is set to an illegal value)
    //0, 1, 2, 3, 4, 5, 6, 7, 8, 9,10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40    Error correction level
    [-1, 1, 1, 1, 1, 1, 2, 2, 2, 2, 4, 4, 4, 4, 4, 6, 6, 6, 6, 7, 8, 8, 9, 9, 10, 12, 12, 12, 13, 14, 15, 16, 17, 18, 19, 19, 20, 21, 22, 24, 25],
    // Low
    [-1, 1, 1, 1, 2, 2, 4, 4, 4, 5, 5, 5, 8, 9, 9, 10, 10, 11, 13, 14, 16, 17, 17, 18, 20, 21, 23, 25, 26, 28, 29, 31, 33, 35, 37, 38, 40, 43, 45, 47, 49],
    // Medium
    [-1, 1, 1, 2, 2, 4, 4, 6, 6, 8, 8, 8, 10, 12, 16, 12, 17, 16, 18, 21, 20, 23, 23, 25, 27, 29, 34, 34, 35, 38, 40, 43, 45, 48, 51, 53, 56, 59, 62, 65, 68],
    // Quartile
    [-1, 1, 1, 2, 4, 4, 4, 5, 6, 8, 8, 11, 11, 16, 16, 18, 16, 19, 21, 25, 25, 25, 34, 30, 32, 35, 37, 40, 42, 45, 48, 51, 54, 57, 60, 63, 66, 70, 74, 77, 81]
    // High
  ];
  let QrCode = _QrCode;
  qrcodegen2.QrCode = _QrCode;
  function appendBits(val, len, bb) {
    if (len < 0 || len > 31 || val >>> len)
      throw new RangeError("Value out of range");
    for (let i2 = len - 1; i2 >= 0; i2--)
      bb.push(val >>> i2 & 1);
  }
  function getBit(x2, i2) {
    return (x2 >>> i2 & 1) != 0;
  }
  function assert(cond) {
    if (!cond)
      throw new Error("Assertion error");
  }
  let _QrSegment = class _QrSegment2 {
    /*-- Constructor (low level) and fields --*/
    // Creates a new QR Code segment with the given attributes and data.
    // The character count (numChars) must agree with the mode and the bit buffer length,
    // but the constraint isn't checked. The given bit buffer is cloned and stored.
    constructor(mode, numChars, bitData) {
      if (this.mode = mode, this.numChars = numChars, this.bitData = bitData, numChars < 0)
        throw new RangeError("Invalid argument");
      this.bitData = bitData.slice();
    }
    /*-- Static factory functions (mid level) --*/
    // Returns a segment representing the given binary data encoded in
    // byte mode. All input byte arrays are acceptable. Any text string
    // can be converted to UTF-8 bytes and encoded as a byte mode segment.
    static makeBytes(data) {
      let bb = [];
      for (let b2 of data)
        appendBits(b2, 8, bb);
      return new _QrSegment2(_QrSegment2.Mode.BYTE, data.length, bb);
    }
    // Returns a segment representing the given string of decimal digits encoded in numeric mode.
    static makeNumeric(digits) {
      if (!_QrSegment2.isNumeric(digits))
        throw new RangeError("String contains non-numeric characters");
      let bb = [];
      for (let i2 = 0; i2 < digits.length; ) {
        let n3 = Math.min(digits.length - i2, 3);
        appendBits(parseInt(digits.substring(i2, i2 + n3), 10), n3 * 3 + 1, bb), i2 += n3;
      }
      return new _QrSegment2(_QrSegment2.Mode.NUMERIC, digits.length, bb);
    }
    // Returns a segment representing the given text string encoded in alphanumeric mode.
    // The characters allowed are: 0 to 9, A to Z (uppercase only), space,
    // dollar, percent, asterisk, plus, hyphen, period, slash, colon.
    static makeAlphanumeric(text) {
      if (!_QrSegment2.isAlphanumeric(text))
        throw new RangeError("String contains unencodable characters in alphanumeric mode");
      let bb = [], i2;
      for (i2 = 0; i2 + 2 <= text.length; i2 += 2) {
        let temp = _QrSegment2.ALPHANUMERIC_CHARSET.indexOf(text.charAt(i2)) * 45;
        temp += _QrSegment2.ALPHANUMERIC_CHARSET.indexOf(text.charAt(i2 + 1)), appendBits(temp, 11, bb);
      }
      return i2 < text.length && appendBits(_QrSegment2.ALPHANUMERIC_CHARSET.indexOf(text.charAt(i2)), 6, bb), new _QrSegment2(_QrSegment2.Mode.ALPHANUMERIC, text.length, bb);
    }
    // Returns a new mutable list of zero or more segments to represent the given Unicode text string.
    // The result may use various segment modes and switch modes to optimize the length of the bit stream.
    static makeSegments(text) {
      return text == "" ? [] : _QrSegment2.isNumeric(text) ? [_QrSegment2.makeNumeric(text)] : _QrSegment2.isAlphanumeric(text) ? [_QrSegment2.makeAlphanumeric(text)] : [_QrSegment2.makeBytes(_QrSegment2.toUtf8ByteArray(text))];
    }
    // Returns a segment representing an Extended Channel Interpretation
    // (ECI) designator with the given assignment value.
    static makeEci(assignVal) {
      let bb = [];
      if (assignVal < 0)
        throw new RangeError("ECI assignment value out of range");
      if (assignVal < 128)
        appendBits(assignVal, 8, bb);
      else if (assignVal < 16384)
        appendBits(2, 2, bb), appendBits(assignVal, 14, bb);
      else if (assignVal < 1e6)
        appendBits(6, 3, bb), appendBits(assignVal, 21, bb);
      else
        throw new RangeError("ECI assignment value out of range");
      return new _QrSegment2(_QrSegment2.Mode.ECI, 0, bb);
    }
    // Tests whether the given string can be encoded as a segment in numeric mode.
    // A string is encodable iff each character is in the range 0 to 9.
    static isNumeric(text) {
      return _QrSegment2.NUMERIC_REGEX.test(text);
    }
    // Tests whether the given string can be encoded as a segment in alphanumeric mode.
    // A string is encodable iff each character is in the following set: 0 to 9, A to Z
    // (uppercase only), space, dollar, percent, asterisk, plus, hyphen, period, slash, colon.
    static isAlphanumeric(text) {
      return _QrSegment2.ALPHANUMERIC_REGEX.test(text);
    }
    /*-- Methods --*/
    // Returns a new copy of the data bits of this segment.
    getData() {
      return this.bitData.slice();
    }
    // (Package-private) Calculates and returns the number of bits needed to encode the given segments at
    // the given version. The result is infinity if a segment has too many characters to fit its length field.
    static getTotalBits(segs, version3) {
      let result = 0;
      for (let seg of segs) {
        let ccbits = seg.mode.numCharCountBits(version3);
        if (seg.numChars >= 1 << ccbits)
          return 1 / 0;
        result += 4 + ccbits + seg.bitData.length;
      }
      return result;
    }
    // Returns a new array of bytes representing the given string encoded in UTF-8.
    static toUtf8ByteArray(str) {
      str = encodeURI(str);
      let result = [];
      for (let i2 = 0; i2 < str.length; i2++)
        str.charAt(i2) != "%" ? result.push(str.charCodeAt(i2)) : (result.push(parseInt(str.substring(i2 + 1, i2 + 3), 16)), i2 += 2);
      return result;
    }
  };
  _QrSegment.NUMERIC_REGEX = /^[0-9]*$/, _QrSegment.ALPHANUMERIC_REGEX = /^[A-Z0-9 $%*+.\/:-]*$/, _QrSegment.ALPHANUMERIC_CHARSET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ $%*+-./:";
  let QrSegment = _QrSegment;
  qrcodegen2.QrSegment = _QrSegment;
})(qrcodegen || (qrcodegen = {}));
((qrcodegen2) => {
  let QrCode;
  ((QrCode2) => {
    let _Ecc = class {
      // The QR Code can tolerate about 30% erroneous codewords
      /*-- Constructor and fields --*/
      constructor(ordinal, formatBits) {
        this.ordinal = ordinal, this.formatBits = formatBits;
      }
    };
    _Ecc.LOW = new _Ecc(0, 1), _Ecc.MEDIUM = new _Ecc(1, 0), _Ecc.QUARTILE = new _Ecc(2, 3), _Ecc.HIGH = new _Ecc(3, 2);
    let Ecc = _Ecc;
    QrCode2.Ecc = _Ecc;
  })(QrCode = qrcodegen2.QrCode || (qrcodegen2.QrCode = {}));
})(qrcodegen || (qrcodegen = {}));
((qrcodegen2) => {
  let QrSegment;
  ((QrSegment2) => {
    let _Mode = class {
      /*-- Constructor and fields --*/
      constructor(modeBits, numBitsCharCount) {
        this.modeBits = modeBits, this.numBitsCharCount = numBitsCharCount;
      }
      /*-- Method --*/
      // (Package-private) Returns the bit width of the character count field for a segment in
      // this mode in a QR Code at the given version number. The result is in the range [0, 16].
      numCharCountBits(ver) {
        return this.numBitsCharCount[Math.floor((ver + 7) / 17)];
      }
    };
    _Mode.NUMERIC = new _Mode(1, [10, 12, 14]), _Mode.ALPHANUMERIC = new _Mode(2, [9, 11, 13]), _Mode.BYTE = new _Mode(4, [8, 16, 16]), _Mode.KANJI = new _Mode(8, [8, 10, 12]), _Mode.ECI = new _Mode(7, [0, 0, 0]);
    let Mode = _Mode;
    QrSegment2.Mode = _Mode;
  })(QrSegment = qrcodegen2.QrSegment || (qrcodegen2.QrSegment = {}));
})(qrcodegen || (qrcodegen = {}));
var qrcodegen_default = qrcodegen;
var ERROR_LEVEL_MAP = {
  L: qrcodegen_default.QrCode.Ecc.LOW,
  M: qrcodegen_default.QrCode.Ecc.MEDIUM,
  Q: qrcodegen_default.QrCode.Ecc.QUARTILE,
  H: qrcodegen_default.QrCode.Ecc.HIGH
}, DEFAULT_SIZE = 128, DEFAULT_LEVEL = "L", DEFAULT_BGCOLOR = "#FFFFFF", DEFAULT_FGCOLOR = "#000000", DEFAULT_INCLUDEMARGIN = !1, DEFAULT_MINVERSION = 1, SPEC_MARGIN_SIZE = 4, DEFAULT_MARGIN_SIZE = 0, DEFAULT_IMG_SCALE = 0.1;
function generatePath(modules, margin = 0) {
  let ops = [];
  return modules.forEach(function(row, y2) {
    let start = null;
    row.forEach(function(cell, x2) {
      if (!cell && start !== null) {
        ops.push(
          `M${start + margin} ${y2 + margin}h${x2 - start}v1H${start + margin}z`
        ), start = null;
        return;
      }
      if (x2 === row.length - 1) {
        if (!cell)
          return;
        start === null ? ops.push(`M${x2 + margin},${y2 + margin} h1v1H${x2 + margin}z`) : ops.push(
          `M${start + margin},${y2 + margin} h${x2 + 1 - start}v1H${start + margin}z`
        );
        return;
      }
      cell && start === null && (start = x2);
    });
  }), ops.join("");
}
function excavateModules(modules, excavation) {
  return modules.slice().map((row, y2) => y2 < excavation.y || y2 >= excavation.y + excavation.h ? row : row.map((cell, x2) => x2 < excavation.x || x2 >= excavation.x + excavation.w ? cell : !1));
}
function getImageSettings(cells, size, margin, imageSettings) {
  if (imageSettings == null)
    return null;
  let numCells = cells.length + margin * 2, defaultSize = Math.floor(size * DEFAULT_IMG_SCALE), scale = numCells / size, w2 = (imageSettings.width || defaultSize) * scale, h2 = (imageSettings.height || defaultSize) * scale, x2 = imageSettings.x == null ? cells.length / 2 - w2 / 2 : imageSettings.x * scale, y2 = imageSettings.y == null ? cells.length / 2 - h2 / 2 : imageSettings.y * scale, opacity = imageSettings.opacity == null ? 1 : imageSettings.opacity, excavation = null;
  if (imageSettings.excavate) {
    let floorX = Math.floor(x2), floorY = Math.floor(y2), ceilW = Math.ceil(w2 + x2 - floorX), ceilH = Math.ceil(h2 + y2 - floorY);
    excavation = { x: floorX, y: floorY, w: ceilW, h: ceilH };
  }
  let crossOrigin = imageSettings.crossOrigin;
  return { x: x2, y: y2, h: h2, w: w2, excavation, opacity, crossOrigin };
}
function getMarginSize(includeMargin, marginSize) {
  return marginSize != null ? Math.max(Math.floor(marginSize), 0) : includeMargin ? SPEC_MARGIN_SIZE : DEFAULT_MARGIN_SIZE;
}
function useQRCode({
  value,
  level,
  minVersion,
  includeMargin,
  marginSize,
  imageSettings,
  size,
  boostLevel
}) {
  let qrcode = react_default.useMemo(() => {
    let segments = (Array.isArray(value) ? value : [value]).reduce((accum, v2) => (accum.push(...qrcodegen_default.QrSegment.makeSegments(v2)), accum), []);
    return qrcodegen_default.QrCode.encodeSegments(
      segments,
      ERROR_LEVEL_MAP[level],
      minVersion,
      void 0,
      void 0,
      boostLevel
    );
  }, [value, level, minVersion, boostLevel]), { cells, margin, numCells, calculatedImageSettings } = react_default.useMemo(() => {
    let cells2 = qrcode.getModules(), margin2 = getMarginSize(includeMargin, marginSize), numCells2 = cells2.length + margin2 * 2, calculatedImageSettings2 = getImageSettings(
      cells2,
      size,
      margin2,
      imageSettings
    );
    return {
      cells: cells2,
      margin: margin2,
      numCells: numCells2,
      calculatedImageSettings: calculatedImageSettings2
    };
  }, [qrcode, size, imageSettings, includeMargin, marginSize]);
  return {
    qrcode,
    margin,
    cells,
    numCells,
    calculatedImageSettings
  };
}
var SUPPORTS_PATH2D = (function() {
  try {
    new Path2D().addPath(new Path2D());
  } catch {
    return !1;
  }
  return !0;
})(), QRCodeCanvas = react_default.forwardRef(
  function(props, forwardedRef) {
    let _a = props, {
      value,
      size = DEFAULT_SIZE,
      level = DEFAULT_LEVEL,
      bgColor = DEFAULT_BGCOLOR,
      fgColor = DEFAULT_FGCOLOR,
      includeMargin = DEFAULT_INCLUDEMARGIN,
      minVersion = DEFAULT_MINVERSION,
      boostLevel,
      marginSize,
      imageSettings
    } = _a, _b = __objRest(_a, [
      "value",
      "size",
      "level",
      "bgColor",
      "fgColor",
      "includeMargin",
      "minVersion",
      "boostLevel",
      "marginSize",
      "imageSettings"
    ]), { style } = _b, otherProps = __objRest(_b, ["style"]), imgSrc = imageSettings?.src, _canvas = react_default.useRef(null), _image = react_default.useRef(null), setCanvasRef = react_default.useCallback(
      (node) => {
        _canvas.current = node, typeof forwardedRef == "function" ? forwardedRef(node) : forwardedRef && (forwardedRef.current = node);
      },
      [forwardedRef]
    ), [isImgLoaded, setIsImageLoaded] = react_default.useState(!1), { margin, cells, numCells, calculatedImageSettings } = useQRCode({
      value,
      level,
      minVersion,
      boostLevel,
      includeMargin,
      marginSize,
      imageSettings,
      size
    });
    react_default.useEffect(() => {
      if (_canvas.current != null) {
        let canvas = _canvas.current, ctx = canvas.getContext("2d");
        if (!ctx)
          return;
        let cellsToDraw = cells, image = _image.current, haveImageToRender = calculatedImageSettings != null && image !== null && image.complete && image.naturalHeight !== 0 && image.naturalWidth !== 0;
        haveImageToRender && calculatedImageSettings.excavation != null && (cellsToDraw = excavateModules(
          cells,
          calculatedImageSettings.excavation
        ));
        let pixelRatio = window.devicePixelRatio || 1;
        canvas.height = canvas.width = size * pixelRatio;
        let scale = size / numCells * pixelRatio;
        ctx.scale(scale, scale), ctx.fillStyle = bgColor, ctx.fillRect(0, 0, numCells, numCells), ctx.fillStyle = fgColor, SUPPORTS_PATH2D ? ctx.fill(new Path2D(generatePath(cellsToDraw, margin))) : cells.forEach(function(row, rdx) {
          row.forEach(function(cell, cdx) {
            cell && ctx.fillRect(cdx + margin, rdx + margin, 1, 1);
          });
        }), calculatedImageSettings && (ctx.globalAlpha = calculatedImageSettings.opacity), haveImageToRender && ctx.drawImage(
          image,
          calculatedImageSettings.x + margin,
          calculatedImageSettings.y + margin,
          calculatedImageSettings.w,
          calculatedImageSettings.h
        );
      }
    }), react_default.useEffect(() => {
      setIsImageLoaded(!1);
    }, [imgSrc]);
    let canvasStyle = __spreadValues({ height: size, width: size }, style), img = null;
    return imgSrc != null && (img = react_default.createElement(
      "img",
      {
        src: imgSrc,
        key: imgSrc,
        style: { display: "none" },
        onLoad: () => {
          setIsImageLoaded(!0);
        },
        ref: _image,
        crossOrigin: calculatedImageSettings?.crossOrigin
      }
    )), react_default.createElement(react_default.Fragment, null, react_default.createElement(
      "canvas",
      __spreadValues({
        style: canvasStyle,
        height: size,
        width: size,
        ref: setCanvasRef,
        role: "img"
      }, otherProps)
    ), img);
  }
);
QRCodeCanvas.displayName = "QRCodeCanvas";
var QRCodeSVG = react_default.forwardRef(
  function(props, forwardedRef) {
    let _a = props, {
      value,
      size = DEFAULT_SIZE,
      level = DEFAULT_LEVEL,
      bgColor = DEFAULT_BGCOLOR,
      fgColor = DEFAULT_FGCOLOR,
      includeMargin = DEFAULT_INCLUDEMARGIN,
      minVersion = DEFAULT_MINVERSION,
      boostLevel,
      title: title2,
      marginSize,
      imageSettings
    } = _a, otherProps = __objRest(_a, [
      "value",
      "size",
      "level",
      "bgColor",
      "fgColor",
      "includeMargin",
      "minVersion",
      "boostLevel",
      "title",
      "marginSize",
      "imageSettings"
    ]), { margin, cells, numCells, calculatedImageSettings } = useQRCode({
      value,
      level,
      minVersion,
      boostLevel,
      includeMargin,
      marginSize,
      imageSettings,
      size
    }), cellsToDraw = cells, image = null;
    imageSettings != null && calculatedImageSettings != null && (calculatedImageSettings.excavation != null && (cellsToDraw = excavateModules(
      cells,
      calculatedImageSettings.excavation
    )), image = react_default.createElement(
      "image",
      {
        href: imageSettings.src,
        height: calculatedImageSettings.h,
        width: calculatedImageSettings.w,
        x: calculatedImageSettings.x + margin,
        y: calculatedImageSettings.y + margin,
        preserveAspectRatio: "none",
        opacity: calculatedImageSettings.opacity,
        crossOrigin: calculatedImageSettings.crossOrigin
      }
    ));
    let fgPath = generatePath(cellsToDraw, margin);
    return react_default.createElement(
      "svg",
      __spreadValues({
        height: size,
        width: size,
        viewBox: `0 0 ${numCells} ${numCells}`,
        ref: forwardedRef,
        role: "img"
      }, otherProps),
      !!title2 && react_default.createElement("title", null, title2),
      react_default.createElement(
        "path",
        {
          fill: bgColor,
          d: `M0,0 h${numCells}v${numCells}H0z`,
          shapeRendering: "crispEdges"
        }
      ),
      react_default.createElement("path", { fill: fgColor, d: fgPath, shapeRendering: "crispEdges" }),
      image
    );
  }
);
QRCodeSVG.displayName = "QRCodeSVG";

// ../node_modules/es-toolkit/dist/function/debounce.mjs
function debounce(func, debounceMs, { signal, edges } = {}) {
  let pendingThis, pendingArgs = null, leading = edges != null && edges.includes("leading"), trailing = edges == null || edges.includes("trailing"), invoke = () => {
    pendingArgs !== null && (func.apply(pendingThis, pendingArgs), pendingThis = void 0, pendingArgs = null);
  }, onTimerEnd = () => {
    trailing && invoke(), cancel();
  }, timeoutId = null, schedule = () => {
    timeoutId != null && clearTimeout(timeoutId), timeoutId = setTimeout(() => {
      timeoutId = null, onTimerEnd();
    }, debounceMs);
  }, cancelTimer = () => {
    timeoutId !== null && (clearTimeout(timeoutId), timeoutId = null);
  }, cancel = () => {
    cancelTimer(), pendingThis = void 0, pendingArgs = null;
  }, flush = () => {
    invoke();
  }, debounced = function(...args) {
    if (signal?.aborted)
      return;
    pendingThis = this, pendingArgs = args;
    let isFirstCall = timeoutId == null;
    schedule(), leading && isFirstCall && invoke();
  };
  return debounced.schedule = schedule, debounced.cancel = cancel, debounced.flush = flush, signal?.addEventListener("abort", cancel, { once: !0 }), debounced;
}

// ../node_modules/es-toolkit/dist/function/partial.mjs
function partial(func, ...partialArgs) {
  return partialImpl(func, placeholderSymbol, ...partialArgs);
}
function partialImpl(func, placeholder, ...partialArgs) {
  let partialed = function(...providedArgs) {
    let providedArgsIndex = 0, substitutedArgs = partialArgs.slice().map((arg) => arg === placeholder ? providedArgs[providedArgsIndex++] : arg), remainingArgs = providedArgs.slice(providedArgsIndex);
    return func.apply(this, substitutedArgs.concat(remainingArgs));
  };
  return func.prototype && (partialed.prototype = Object.create(func.prototype)), partialed;
}
var placeholderSymbol = Symbol("partial.placeholder");
partial.placeholder = placeholderSymbol;

// ../node_modules/es-toolkit/dist/function/partialRight.mjs
function partialRight(func, ...partialArgs) {
  return partialRightImpl(func, placeholderSymbol2, ...partialArgs);
}
function partialRightImpl(func, placeholder, ...partialArgs) {
  let partialedRight = function(...providedArgs) {
    let placeholderLength = partialArgs.filter((arg) => arg === placeholder).length, rangeLength = Math.max(providedArgs.length - placeholderLength, 0), remainingArgs = providedArgs.slice(0, rangeLength), providedArgsIndex = rangeLength, substitutedArgs = partialArgs.slice().map((arg) => arg === placeholder ? providedArgs[providedArgsIndex++] : arg);
    return func.apply(this, remainingArgs.concat(substitutedArgs));
  };
  return func.prototype && (partialedRight.prototype = Object.create(func.prototype)), partialedRight;
}
var placeholderSymbol2 = Symbol("partialRight.placeholder");
partialRight.placeholder = placeholderSymbol2;

// ../node_modules/es-toolkit/dist/function/retry.mjs
var DEFAULT_RETRIES = Number.POSITIVE_INFINITY;

// ../node_modules/es-toolkit/dist/function/throttle.mjs
function throttle(func, throttleMs, { signal, edges = ["leading", "trailing"] } = {}) {
  let pendingAt = null, debounced = debounce(func, throttleMs, { signal, edges }), throttled = function(...args) {
    pendingAt == null ? pendingAt = Date.now() : Date.now() - pendingAt >= throttleMs && (pendingAt = Date.now(), debounced.cancel()), debounced.apply(this, args);
  };
  return throttled.cancel = debounced.cancel, throttled.flush = debounced.flush, throttled;
}

// ../addons/a11y/src/constants.ts
var ADDON_ID = "storybook/a11y", PANEL_ID = `${ADDON_ID}/panel`;
var UI_STATE_ID = `${ADDON_ID}/ui`, RESULT = `${ADDON_ID}/result`, REQUEST = `${ADDON_ID}/request`, RUNNING = `${ADDON_ID}/running`, ERROR = `${ADDON_ID}/error`, MANUAL = `${ADDON_ID}/manual`, SELECT = `${ADDON_ID}/select`, DOCUMENTATION_LINK = "writing-tests/accessibility-testing", DOCUMENTATION_DISCREPANCY_LINK = `${DOCUMENTATION_LINK}#why-are-my-tests-failing-in-different-environments`;

// ../addons/onboarding/src/constants.ts
var ADDON_ID2 = "storybook/onboarding", ADDON_ONBOARDING_CHANNEL = `${ADDON_ID2}/channel`;

// src/component-testing/constants.ts
var ADDON_ID3 = "storybook/interactions", PANEL_ID2 = `${ADDON_ID3}/panel`, DOCUMENTATION_LINK2 = "writing-tests/integrations/vitest-addon", DOCUMENTATION_DISCREPANCY_LINK2 = `${DOCUMENTATION_LINK2}#what-happens-when-there-are-different-test-results-in-multiple-environments`;

// ../addons/vitest/src/constants.ts
var ADDON_ID4 = "storybook/test", TEST_PROVIDER_ID = `${ADDON_ID4}/test-provider`, STORYBOOK_ADDON_TEST_CHANNEL = `${ADDON_ID4}/channel`;
var DOCUMENTATION_LINK3 = "writing-tests/integrations/vitest-addon", DOCUMENTATION_FATAL_ERROR_LINK = `${DOCUMENTATION_LINK3}#what-happens-if-vitest-itself-has-an-error`;
var storeOptions = {
  id: ADDON_ID4,
  initialState: {
    config: {
      coverage: !1,
      a11y: !1
    },
    watching: !1,
    cancelling: !1,
    fatalError: void 0,
    indexUrl: void 0,
    previewAnnotations: [],
    currentRun: {
      triggeredBy: void 0,
      config: {
        coverage: !1,
        a11y: !1
      },
      componentTestCount: {
        success: 0,
        error: 0
      },
      a11yCount: {
        success: 0,
        warning: 0,
        error: 0
      },
      storyIds: void 0,
      totalTestCount: void 0,
      startedAt: void 0,
      finishedAt: void 0,
      unhandledErrors: [],
      coverageSummary: void 0
    }
  }
};
var STORE_CHANNEL_EVENT_NAME = `UNIVERSAL_STORE:${storeOptions.id}`;

// src/cli/AddonVitestService.constants.ts
var SUPPORTED_FRAMEWORKS = [
  "html-vite" /* HTML_VITE */,
  "nextjs-vite" /* NEXTJS_VITE */,
  "preact-vite" /* PREACT_VITE */,
  "react-native-web-vite" /* REACT_NATIVE_WEB_VITE */,
  "react-vite" /* REACT_VITE */,
  "solid" /* SOLID */,
  "svelte-vite" /* SVELTE_VITE */,
  "sveltekit" /* SVELTEKIT */,
  "vue3-vite" /* VUE3_VITE */,
  "web-components-vite" /* WEB_COMPONENTS_VITE */
];

// src/docs-tools/shared.ts
var ADDON_ID5 = "storybook/docs", PANEL_ID3 = `${ADDON_ID5}/panel`;
var SNIPPET_RENDERED = `${ADDON_ID5}/snippet-rendered`;

// ../node_modules/@gilbarbara/deep-equal/dist/index.mjs
function isOfType(type) {
  return (value) => typeof value === type;
}
var isFunction = isOfType("function"), isNull = (value) => value === null, isRegex = (value) => Object.prototype.toString.call(value).slice(8, -1) === "RegExp", isObject = (value) => !isUndefined(value) && !isNull(value) && (isFunction(value) || typeof value == "object"), isUndefined = isOfType("undefined");
function equalArray(left, right) {
  let { length } = left;
  if (length !== right.length)
    return !1;
  for (let index = length; index-- !== 0; )
    if (!equal(left[index], right[index]))
      return !1;
  return !0;
}
function equalArrayBuffer(left, right) {
  if (left.byteLength !== right.byteLength)
    return !1;
  let view1 = new DataView(left.buffer), view2 = new DataView(right.buffer), index = left.byteLength;
  for (; index--; )
    if (view1.getUint8(index) !== view2.getUint8(index))
      return !1;
  return !0;
}
function equalMap(left, right) {
  if (left.size !== right.size)
    return !1;
  for (let index of left.entries())
    if (!right.has(index[0]))
      return !1;
  for (let index of left.entries())
    if (!equal(index[1], right.get(index[0])))
      return !1;
  return !0;
}
function equalSet(left, right) {
  if (left.size !== right.size)
    return !1;
  for (let index of left.entries())
    if (!right.has(index[0]))
      return !1;
  return !0;
}
function equal(left, right) {
  if (left === right)
    return !0;
  if (left && isObject(left) && right && isObject(right)) {
    if (left.constructor !== right.constructor)
      return !1;
    if (Array.isArray(left) && Array.isArray(right))
      return equalArray(left, right);
    if (left instanceof Map && right instanceof Map)
      return equalMap(left, right);
    if (left instanceof Set && right instanceof Set)
      return equalSet(left, right);
    if (ArrayBuffer.isView(left) && ArrayBuffer.isView(right))
      return equalArrayBuffer(left, right);
    if (isRegex(left) && isRegex(right))
      return left.source === right.source && left.flags === right.flags;
    if (left.valueOf !== Object.prototype.valueOf)
      return left.valueOf() === right.valueOf();
    if (left.toString !== Object.prototype.toString)
      return left.toString() === right.toString();
    let leftKeys = Object.keys(left), rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length)
      return !1;
    for (let index = leftKeys.length; index-- !== 0; )
      if (!Object.prototype.hasOwnProperty.call(right, leftKeys[index]))
        return !1;
    for (let index = leftKeys.length; index-- !== 0; ) {
      let key = leftKeys[index];
      if (!(key === "_owner" && left.$$typeof) && !equal(left[key], right[key]))
        return !1;
    }
    return !0;
  }
  return Number.isNaN(left) && Number.isNaN(right) ? !0 : left === right;
}

// ../node_modules/is-lite/dist/index.mjs
var objectTypes = [
  "Array",
  "ArrayBuffer",
  "AsyncFunction",
  "AsyncGenerator",
  "AsyncGeneratorFunction",
  "Date",
  "Error",
  "Function",
  "Generator",
  "GeneratorFunction",
  "HTMLElement",
  "Map",
  "Object",
  "Promise",
  "RegExp",
  "Set",
  "WeakMap",
  "WeakSet"
], primitiveTypes = [
  "bigint",
  "boolean",
  "null",
  "number",
  "string",
  "symbol",
  "undefined"
];
function getObjectType(value) {
  let objectTypeName = Object.prototype.toString.call(value).slice(8, -1);
  if (/HTML\w+Element/.test(objectTypeName))
    return "HTMLElement";
  if (isObjectType(objectTypeName))
    return objectTypeName;
}
function isObjectOfType(type) {
  return (value) => getObjectType(value) === type;
}
function isObjectType(name) {
  return objectTypes.includes(name);
}
function isOfType2(type) {
  return (value) => typeof value === type;
}
function isPrimitiveType(name) {
  return primitiveTypes.includes(name);
}
var DOM_PROPERTIES_TO_CHECK = [
  "innerHTML",
  "ownerDocument",
  "style",
  "attributes",
  "nodeValue"
];
function is(value) {
  if (value === null)
    return "null";
  switch (typeof value) {
    case "bigint":
      return "bigint";
    case "boolean":
      return "boolean";
    case "number":
      return "number";
    case "string":
      return "string";
    case "symbol":
      return "symbol";
    case "undefined":
      return "undefined";
    default:
  }
  if (is.array(value))
    return "Array";
  if (is.plainFunction(value))
    return "Function";
  let tagType = getObjectType(value);
  return tagType || "Object";
}
is.array = Array.isArray;
is.arrayOf = (target, predicate) => !is.array(target) && !is.function(predicate) ? !1 : target.every((d2) => predicate(d2));
is.asyncGeneratorFunction = (value) => getObjectType(value) === "AsyncGeneratorFunction";
is.asyncFunction = isObjectOfType("AsyncFunction");
is.bigint = isOfType2("bigint");
is.boolean = (value) => value === !0 || value === !1;
is.date = isObjectOfType("Date");
is.defined = (value) => !is.undefined(value);
is.domElement = (value) => is.object(value) && !is.plainObject(value) && value.nodeType === 1 && is.string(value.nodeName) && DOM_PROPERTIES_TO_CHECK.every((property) => property in value);
is.empty = (value) => is.string(value) && value.length === 0 || is.array(value) && value.length === 0 || is.object(value) && !is.map(value) && !is.set(value) && Object.keys(value).length === 0 || is.set(value) && value.size === 0 || is.map(value) && value.size === 0;
is.error = isObjectOfType("Error");
is.function = isOfType2("function");
is.generator = (value) => is.iterable(value) && is.function(value.next) && is.function(value.throw);
is.generatorFunction = isObjectOfType("GeneratorFunction");
is.instanceOf = (instance, class_) => !instance || !class_ ? !1 : Object.getPrototypeOf(instance) === class_.prototype;
is.iterable = (value) => !is.nullOrUndefined(value) && is.function(value[Symbol.iterator]);
is.map = isObjectOfType("Map");
is.nan = (value) => Number.isNaN(value);
is.null = (value) => value === null;
is.nullOrUndefined = (value) => is.null(value) || is.undefined(value);
is.number = (value) => isOfType2("number")(value) && !is.nan(value);
is.numericString = (value) => is.string(value) && value.length > 0 && !Number.isNaN(Number(value));
is.object = (value) => !is.nullOrUndefined(value) && (is.function(value) || typeof value == "object");
is.oneOf = (target, value) => is.array(target) ? target.indexOf(value) > -1 : !1;
is.plainFunction = isObjectOfType("Function");
is.plainObject = (value) => {
  if (getObjectType(value) !== "Object")
    return !1;
  let prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.getPrototypeOf({});
};
is.primitive = (value) => is.null(value) || isPrimitiveType(typeof value);
is.promise = isObjectOfType("Promise");
is.propertyOf = (target, key, predicate) => {
  if (!is.object(target) || !key)
    return !1;
  let value = target[key];
  return is.function(predicate) ? predicate(value) : is.defined(value);
};
is.regexp = isObjectOfType("RegExp");
is.set = isObjectOfType("Set");
is.string = isOfType2("string");
is.symbol = isOfType2("symbol");
is.undefined = isOfType2("undefined");
is.weakMap = isObjectOfType("WeakMap");
is.weakSet = isObjectOfType("WeakSet");
var src_default = is;

// ../node_modules/react-joyride/node_modules/tree-changes/dist/index.mjs
function canHaveLength(...arguments_) {
  return arguments_.every((d2) => src_default.string(d2) || src_default.array(d2) || src_default.plainObject(d2));
}
function checkEquality(left, right, value) {
  return isSameType(left, right) ? [left, right].every(src_default.array) ? !left.some(hasValue(value)) && right.some(hasValue(value)) : [left, right].every(src_default.plainObject) ? !Object.entries(left).some(hasEntry(value)) && Object.entries(right).some(hasEntry(value)) : right === value : !1;
}
function compareNumbers(previousData, data, options2) {
  let { actual, key, previous, type } = options2, left = nested(previousData, key), right = nested(data, key), changed = [left, right].every(src_default.number) && (type === "increased" ? left < right : left > right);
  return src_default.undefined(actual) || (changed = changed && right === actual), src_default.undefined(previous) || (changed = changed && left === previous), changed;
}
function compareValues(previousData, data, options2) {
  let { key, type, value } = options2, left = nested(previousData, key), right = nested(data, key), primary = type === "added" ? left : right, secondary = type === "added" ? right : left;
  if (!src_default.nullOrUndefined(value)) {
    if (src_default.defined(primary)) {
      if (src_default.array(primary) || src_default.plainObject(primary))
        return checkEquality(primary, secondary, value);
    } else
      return equal(secondary, value);
    return !1;
  }
  return [left, right].every(src_default.array) ? !secondary.every(isEqualPredicate(primary)) : [left, right].every(src_default.plainObject) ? hasExtraKeys(Object.keys(primary), Object.keys(secondary)) : ![left, right].every((d2) => src_default.primitive(d2) && src_default.defined(d2)) && (type === "added" ? !src_default.defined(left) && src_default.defined(right) : src_default.defined(left) && !src_default.defined(right));
}
function getIterables(previousData, data, { key } = {}) {
  let left = nested(previousData, key), right = nested(data, key);
  if (!isSameType(left, right))
    throw new TypeError("Inputs have different types");
  if (!canHaveLength(left, right))
    throw new TypeError("Inputs don't have length");
  return [left, right].every(src_default.plainObject) && (left = Object.keys(left), right = Object.keys(right)), [left, right];
}
function hasEntry(input) {
  return ([key, value]) => src_default.array(input) ? equal(input, value) || input.some((d2) => equal(d2, value) || src_default.array(value) && isEqualPredicate(value)(d2)) : src_default.plainObject(input) && input[key] ? !!input[key] && equal(input[key], value) : equal(input, value);
}
function hasExtraKeys(left, right) {
  return right.some((d2) => !left.includes(d2));
}
function hasValue(input) {
  return (value) => src_default.array(input) ? input.some((d2) => equal(d2, value) || src_default.array(value) && isEqualPredicate(value)(d2)) : equal(input, value);
}
function includesOrEqualsTo(previousValue, value) {
  return src_default.array(previousValue) ? previousValue.some((d2) => equal(d2, value)) : equal(previousValue, value);
}
function isEqualPredicate(data) {
  return (value) => data.some((d2) => equal(d2, value));
}
function isSameType(...arguments_) {
  return arguments_.every(src_default.array) || arguments_.every(src_default.number) || arguments_.every(src_default.plainObject) || arguments_.every(src_default.string);
}
function nested(data, property) {
  return src_default.plainObject(data) || src_default.array(data) ? src_default.string(property) ? property.split(".").reduce((acc, d2) => acc && acc[d2], data) : src_default.number(property) ? data[property] : data : data;
}
function treeChanges(previousData, data) {
  if ([previousData, data].some(src_default.nullOrUndefined))
    throw new Error("Missing required parameters");
  if (![previousData, data].every((d2) => src_default.plainObject(d2) || src_default.array(d2)))
    throw new Error("Expected plain objects or array");
  return { added: (key, value) => {
    try {
      return compareValues(previousData, data, { key, type: "added", value });
    } catch {
      return !1;
    }
  }, changed: (key, actual, previous) => {
    try {
      let left = nested(previousData, key), right = nested(data, key), hasActual = src_default.defined(actual), hasPrevious = src_default.defined(previous);
      if (hasActual || hasPrevious) {
        let leftComparator = hasPrevious ? includesOrEqualsTo(previous, left) : !includesOrEqualsTo(actual, left), rightComparator = includesOrEqualsTo(actual, right);
        return leftComparator && rightComparator;
      }
      return [left, right].every(src_default.array) || [left, right].every(src_default.plainObject) ? !equal(left, right) : left !== right;
    } catch {
      return !1;
    }
  }, changedFrom: (key, previous, actual) => {
    if (!src_default.defined(key))
      return !1;
    try {
      let left = nested(previousData, key), right = nested(data, key), hasActual = src_default.defined(actual);
      return includesOrEqualsTo(previous, left) && (hasActual ? includesOrEqualsTo(actual, right) : !hasActual);
    } catch {
      return !1;
    }
  }, decreased: (key, actual, previous) => {
    if (!src_default.defined(key))
      return !1;
    try {
      return compareNumbers(previousData, data, { key, actual, previous, type: "decreased" });
    } catch {
      return !1;
    }
  }, emptied: (key) => {
    try {
      let [left, right] = getIterables(previousData, data, { key });
      return !!left.length && !right.length;
    } catch {
      return !1;
    }
  }, filled: (key) => {
    try {
      let [left, right] = getIterables(previousData, data, { key });
      return !left.length && !!right.length;
    } catch {
      return !1;
    }
  }, increased: (key, actual, previous) => {
    if (!src_default.defined(key))
      return !1;
    try {
      return compareNumbers(previousData, data, { key, actual, previous, type: "increased" });
    } catch {
      return !1;
    }
  }, removed: (key, value) => {
    try {
      return compareValues(previousData, data, { key, type: "removed", value });
    } catch {
      return !1;
    }
  } };
}

// ../node_modules/react-joyride/dist/index.mjs
var import_scroll = __toESM(require_scroll(), 1), import_scrollparent = __toESM(require_scrollparent(), 1);
var import_react_innertext = __toESM(require_react_innertext(), 1);
var import_deepmerge2 = __toESM(require_cjs(), 1);
var import_deepmerge3 = __toESM(require_cjs(), 1);

// ../node_modules/react-floater/es/index.js
var import_prop_types2 = __toESM(require_prop_types());

// ../node_modules/popper.js/dist/esm/popper.js
var isBrowser = typeof window < "u" && typeof document < "u" && typeof navigator < "u", timeoutDuration = (function() {
  for (var longerTimeoutBrowsers = ["Edge", "Trident", "Firefox"], i2 = 0; i2 < longerTimeoutBrowsers.length; i2 += 1)
    if (isBrowser && navigator.userAgent.indexOf(longerTimeoutBrowsers[i2]) >= 0)
      return 1;
  return 0;
})();
function microtaskDebounce(fn) {
  var called = !1;
  return function() {
    called || (called = !0, window.Promise.resolve().then(function() {
      called = !1, fn();
    }));
  };
}
function taskDebounce(fn) {
  var scheduled = !1;
  return function() {
    scheduled || (scheduled = !0, setTimeout(function() {
      scheduled = !1, fn();
    }, timeoutDuration));
  };
}
var supportsMicroTasks = isBrowser && window.Promise, debounce2 = supportsMicroTasks ? microtaskDebounce : taskDebounce;
function isFunction2(functionToCheck) {
  var getType = {};
  return functionToCheck && getType.toString.call(functionToCheck) === "[object Function]";
}
function getStyleComputedProperty(element, property) {
  if (element.nodeType !== 1)
    return [];
  var window2 = element.ownerDocument.defaultView, css2 = window2.getComputedStyle(element, null);
  return property ? css2[property] : css2;
}
function getParentNode(element) {
  return element.nodeName === "HTML" ? element : element.parentNode || element.host;
}
function getScrollParent(element) {
  if (!element)
    return document.body;
  switch (element.nodeName) {
    case "HTML":
    case "BODY":
      return element.ownerDocument.body;
    case "#document":
      return element.body;
  }
  var _getStyleComputedProp = getStyleComputedProperty(element), overflow = _getStyleComputedProp.overflow, overflowX = _getStyleComputedProp.overflowX, overflowY = _getStyleComputedProp.overflowY;
  return /(auto|scroll|overlay)/.test(overflow + overflowY + overflowX) ? element : getScrollParent(getParentNode(element));
}
function getReferenceNode(reference) {
  return reference && reference.referenceNode ? reference.referenceNode : reference;
}
var isIE11 = isBrowser && !!(window.MSInputMethodContext && document.documentMode), isIE10 = isBrowser && /MSIE 10/.test(navigator.userAgent);
function isIE(version3) {
  return version3 === 11 ? isIE11 : version3 === 10 ? isIE10 : isIE11 || isIE10;
}
function getOffsetParent(element) {
  if (!element)
    return document.documentElement;
  for (var noOffsetParent = isIE(10) ? document.body : null, offsetParent = element.offsetParent || null; offsetParent === noOffsetParent && element.nextElementSibling; )
    offsetParent = (element = element.nextElementSibling).offsetParent;
  var nodeName = offsetParent && offsetParent.nodeName;
  return !nodeName || nodeName === "BODY" || nodeName === "HTML" ? element ? element.ownerDocument.documentElement : document.documentElement : ["TH", "TD", "TABLE"].indexOf(offsetParent.nodeName) !== -1 && getStyleComputedProperty(offsetParent, "position") === "static" ? getOffsetParent(offsetParent) : offsetParent;
}
function isOffsetContainer(element) {
  var nodeName = element.nodeName;
  return nodeName === "BODY" ? !1 : nodeName === "HTML" || getOffsetParent(element.firstElementChild) === element;
}
function getRoot(node) {
  return node.parentNode !== null ? getRoot(node.parentNode) : node;
}
function findCommonOffsetParent(element1, element2) {
  if (!element1 || !element1.nodeType || !element2 || !element2.nodeType)
    return document.documentElement;
  var order = element1.compareDocumentPosition(element2) & Node.DOCUMENT_POSITION_FOLLOWING, start = order ? element1 : element2, end = order ? element2 : element1, range = document.createRange();
  range.setStart(start, 0), range.setEnd(end, 0);
  var commonAncestorContainer = range.commonAncestorContainer;
  if (element1 !== commonAncestorContainer && element2 !== commonAncestorContainer || start.contains(end))
    return isOffsetContainer(commonAncestorContainer) ? commonAncestorContainer : getOffsetParent(commonAncestorContainer);
  var element1root = getRoot(element1);
  return element1root.host ? findCommonOffsetParent(element1root.host, element2) : findCommonOffsetParent(element1, getRoot(element2).host);
}
function getScroll(element) {
  var side = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : "top", upperSide = side === "top" ? "scrollTop" : "scrollLeft", nodeName = element.nodeName;
  if (nodeName === "BODY" || nodeName === "HTML") {
    var html = element.ownerDocument.documentElement, scrollingElement = element.ownerDocument.scrollingElement || html;
    return scrollingElement[upperSide];
  }
  return element[upperSide];
}
function includeScroll(rect, element) {
  var subtract = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : !1, scrollTop = getScroll(element, "top"), scrollLeft = getScroll(element, "left"), modifier = subtract ? -1 : 1;
  return rect.top += scrollTop * modifier, rect.bottom += scrollTop * modifier, rect.left += scrollLeft * modifier, rect.right += scrollLeft * modifier, rect;
}
function getBordersSize(styles2, axis) {
  var sideA = axis === "x" ? "Left" : "Top", sideB = sideA === "Left" ? "Right" : "Bottom";
  return parseFloat(styles2["border" + sideA + "Width"]) + parseFloat(styles2["border" + sideB + "Width"]);
}
function getSize(axis, body, html, computedStyle) {
  return Math.max(body["offset" + axis], body["scroll" + axis], html["client" + axis], html["offset" + axis], html["scroll" + axis], isIE(10) ? parseInt(html["offset" + axis]) + parseInt(computedStyle["margin" + (axis === "Height" ? "Top" : "Left")]) + parseInt(computedStyle["margin" + (axis === "Height" ? "Bottom" : "Right")]) : 0);
}
function getWindowSizes(document11) {
  var body = document11.body, html = document11.documentElement, computedStyle = isIE(10) && getComputedStyle(html);
  return {
    height: getSize("Height", body, html, computedStyle),
    width: getSize("Width", body, html, computedStyle)
  };
}
var classCallCheck = function(instance, Constructor) {
  if (!(instance instanceof Constructor))
    throw new TypeError("Cannot call a class as a function");
}, createClass = /* @__PURE__ */ (function() {
  function defineProperties(target, props) {
    for (var i2 = 0; i2 < props.length; i2++) {
      var descriptor = props[i2];
      descriptor.enumerable = descriptor.enumerable || !1, descriptor.configurable = !0, "value" in descriptor && (descriptor.writable = !0), Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  return function(Constructor, protoProps, staticProps) {
    return protoProps && defineProperties(Constructor.prototype, protoProps), staticProps && defineProperties(Constructor, staticProps), Constructor;
  };
})(), defineProperty = function(obj, key, value) {
  return key in obj ? Object.defineProperty(obj, key, {
    value,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : obj[key] = value, obj;
}, _extends2 = Object.assign || function(target) {
  for (var i2 = 1; i2 < arguments.length; i2++) {
    var source = arguments[i2];
    for (var key in source)
      Object.prototype.hasOwnProperty.call(source, key) && (target[key] = source[key]);
  }
  return target;
};
function getClientRect(offsets) {
  return _extends2({}, offsets, {
    right: offsets.left + offsets.width,
    bottom: offsets.top + offsets.height
  });
}
function getBoundingClientRect(element) {
  var rect = {};
  try {
    if (isIE(10)) {
      rect = element.getBoundingClientRect();
      var scrollTop = getScroll(element, "top"), scrollLeft = getScroll(element, "left");
      rect.top += scrollTop, rect.left += scrollLeft, rect.bottom += scrollTop, rect.right += scrollLeft;
    } else
      rect = element.getBoundingClientRect();
  } catch {
  }
  var result = {
    left: rect.left,
    top: rect.top,
    width: rect.right - rect.left,
    height: rect.bottom - rect.top
  }, sizes = element.nodeName === "HTML" ? getWindowSizes(element.ownerDocument) : {}, width = sizes.width || element.clientWidth || result.width, height = sizes.height || element.clientHeight || result.height, horizScrollbar = element.offsetWidth - width, vertScrollbar = element.offsetHeight - height;
  if (horizScrollbar || vertScrollbar) {
    var styles2 = getStyleComputedProperty(element);
    horizScrollbar -= getBordersSize(styles2, "x"), vertScrollbar -= getBordersSize(styles2, "y"), result.width -= horizScrollbar, result.height -= vertScrollbar;
  }
  return getClientRect(result);
}
function getOffsetRectRelativeToArbitraryNode(children, parent) {
  var fixedPosition = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : !1, isIE102 = isIE(10), isHTML = parent.nodeName === "HTML", childrenRect = getBoundingClientRect(children), parentRect = getBoundingClientRect(parent), scrollParent2 = getScrollParent(children), styles2 = getStyleComputedProperty(parent), borderTopWidth = parseFloat(styles2.borderTopWidth), borderLeftWidth = parseFloat(styles2.borderLeftWidth);
  fixedPosition && isHTML && (parentRect.top = Math.max(parentRect.top, 0), parentRect.left = Math.max(parentRect.left, 0));
  var offsets = getClientRect({
    top: childrenRect.top - parentRect.top - borderTopWidth,
    left: childrenRect.left - parentRect.left - borderLeftWidth,
    width: childrenRect.width,
    height: childrenRect.height
  });
  if (offsets.marginTop = 0, offsets.marginLeft = 0, !isIE102 && isHTML) {
    var marginTop = parseFloat(styles2.marginTop), marginLeft = parseFloat(styles2.marginLeft);
    offsets.top -= borderTopWidth - marginTop, offsets.bottom -= borderTopWidth - marginTop, offsets.left -= borderLeftWidth - marginLeft, offsets.right -= borderLeftWidth - marginLeft, offsets.marginTop = marginTop, offsets.marginLeft = marginLeft;
  }
  return (isIE102 && !fixedPosition ? parent.contains(scrollParent2) : parent === scrollParent2 && scrollParent2.nodeName !== "BODY") && (offsets = includeScroll(offsets, parent)), offsets;
}
function getViewportOffsetRectRelativeToArtbitraryNode(element) {
  var excludeScroll = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1, html = element.ownerDocument.documentElement, relativeOffset = getOffsetRectRelativeToArbitraryNode(element, html), width = Math.max(html.clientWidth, window.innerWidth || 0), height = Math.max(html.clientHeight, window.innerHeight || 0), scrollTop = excludeScroll ? 0 : getScroll(html), scrollLeft = excludeScroll ? 0 : getScroll(html, "left"), offset2 = {
    top: scrollTop - relativeOffset.top + relativeOffset.marginTop,
    left: scrollLeft - relativeOffset.left + relativeOffset.marginLeft,
    width,
    height
  };
  return getClientRect(offset2);
}
function isFixed(element) {
  var nodeName = element.nodeName;
  if (nodeName === "BODY" || nodeName === "HTML")
    return !1;
  if (getStyleComputedProperty(element, "position") === "fixed")
    return !0;
  var parentNode = getParentNode(element);
  return parentNode ? isFixed(parentNode) : !1;
}
function getFixedPositionOffsetParent(element) {
  if (!element || !element.parentElement || isIE())
    return document.documentElement;
  for (var el = element.parentElement; el && getStyleComputedProperty(el, "transform") === "none"; )
    el = el.parentElement;
  return el || document.documentElement;
}
function getBoundaries(popper, reference, padding, boundariesElement) {
  var fixedPosition = arguments.length > 4 && arguments[4] !== void 0 ? arguments[4] : !1, boundaries = { top: 0, left: 0 }, offsetParent = fixedPosition ? getFixedPositionOffsetParent(popper) : findCommonOffsetParent(popper, getReferenceNode(reference));
  if (boundariesElement === "viewport")
    boundaries = getViewportOffsetRectRelativeToArtbitraryNode(offsetParent, fixedPosition);
  else {
    var boundariesNode = void 0;
    boundariesElement === "scrollParent" ? (boundariesNode = getScrollParent(getParentNode(reference)), boundariesNode.nodeName === "BODY" && (boundariesNode = popper.ownerDocument.documentElement)) : boundariesElement === "window" ? boundariesNode = popper.ownerDocument.documentElement : boundariesNode = boundariesElement;
    var offsets = getOffsetRectRelativeToArbitraryNode(boundariesNode, offsetParent, fixedPosition);
    if (boundariesNode.nodeName === "HTML" && !isFixed(offsetParent)) {
      var _getWindowSizes = getWindowSizes(popper.ownerDocument), height = _getWindowSizes.height, width = _getWindowSizes.width;
      boundaries.top += offsets.top - offsets.marginTop, boundaries.bottom = height + offsets.top, boundaries.left += offsets.left - offsets.marginLeft, boundaries.right = width + offsets.left;
    } else
      boundaries = offsets;
  }
  padding = padding || 0;
  var isPaddingNumber = typeof padding == "number";
  return boundaries.left += isPaddingNumber ? padding : padding.left || 0, boundaries.top += isPaddingNumber ? padding : padding.top || 0, boundaries.right -= isPaddingNumber ? padding : padding.right || 0, boundaries.bottom -= isPaddingNumber ? padding : padding.bottom || 0, boundaries;
}
function getArea(_ref) {
  var width = _ref.width, height = _ref.height;
  return width * height;
}
function computeAutoPlacement(placement, refRect, popper, reference, boundariesElement) {
  var padding = arguments.length > 5 && arguments[5] !== void 0 ? arguments[5] : 0;
  if (placement.indexOf("auto") === -1)
    return placement;
  var boundaries = getBoundaries(popper, reference, padding, boundariesElement), rects = {
    top: {
      width: boundaries.width,
      height: refRect.top - boundaries.top
    },
    right: {
      width: boundaries.right - refRect.right,
      height: boundaries.height
    },
    bottom: {
      width: boundaries.width,
      height: boundaries.bottom - refRect.bottom
    },
    left: {
      width: refRect.left - boundaries.left,
      height: boundaries.height
    }
  }, sortedAreas = Object.keys(rects).map(function(key) {
    return _extends2({
      key
    }, rects[key], {
      area: getArea(rects[key])
    });
  }).sort(function(a2, b2) {
    return b2.area - a2.area;
  }), filteredAreas = sortedAreas.filter(function(_ref2) {
    var width = _ref2.width, height = _ref2.height;
    return width >= popper.clientWidth && height >= popper.clientHeight;
  }), computedPlacement = filteredAreas.length > 0 ? filteredAreas[0].key : sortedAreas[0].key, variation = placement.split("-")[1];
  return computedPlacement + (variation ? "-" + variation : "");
}
function getReferenceOffsets(state, popper, reference) {
  var fixedPosition = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : null, commonOffsetParent = fixedPosition ? getFixedPositionOffsetParent(popper) : findCommonOffsetParent(popper, getReferenceNode(reference));
  return getOffsetRectRelativeToArbitraryNode(reference, commonOffsetParent, fixedPosition);
}
function getOuterSizes(element) {
  var window2 = element.ownerDocument.defaultView, styles2 = window2.getComputedStyle(element), x2 = parseFloat(styles2.marginTop || 0) + parseFloat(styles2.marginBottom || 0), y2 = parseFloat(styles2.marginLeft || 0) + parseFloat(styles2.marginRight || 0), result = {
    width: element.offsetWidth + y2,
    height: element.offsetHeight + x2
  };
  return result;
}
function getOppositePlacement(placement) {
  var hash = { left: "right", right: "left", bottom: "top", top: "bottom" };
  return placement.replace(/left|right|bottom|top/g, function(matched) {
    return hash[matched];
  });
}
function getPopperOffsets(popper, referenceOffsets, placement) {
  placement = placement.split("-")[0];
  var popperRect = getOuterSizes(popper), popperOffsets = {
    width: popperRect.width,
    height: popperRect.height
  }, isHoriz = ["right", "left"].indexOf(placement) !== -1, mainSide = isHoriz ? "top" : "left", secondarySide = isHoriz ? "left" : "top", measurement = isHoriz ? "height" : "width", secondaryMeasurement = isHoriz ? "width" : "height";
  return popperOffsets[mainSide] = referenceOffsets[mainSide] + referenceOffsets[measurement] / 2 - popperRect[measurement] / 2, placement === secondarySide ? popperOffsets[secondarySide] = referenceOffsets[secondarySide] - popperRect[secondaryMeasurement] : popperOffsets[secondarySide] = referenceOffsets[getOppositePlacement(secondarySide)], popperOffsets;
}
function find(arr, check) {
  return Array.prototype.find ? arr.find(check) : arr.filter(check)[0];
}
function findIndex(arr, prop, value) {
  if (Array.prototype.findIndex)
    return arr.findIndex(function(cur) {
      return cur[prop] === value;
    });
  var match = find(arr, function(obj) {
    return obj[prop] === value;
  });
  return arr.indexOf(match);
}
function runModifiers(modifiers2, data, ends) {
  var modifiersToRun = ends === void 0 ? modifiers2 : modifiers2.slice(0, findIndex(modifiers2, "name", ends));
  return modifiersToRun.forEach(function(modifier) {
    modifier.function && console.warn("`modifier.function` is deprecated, use `modifier.fn`!");
    var fn = modifier.function || modifier.fn;
    modifier.enabled && isFunction2(fn) && (data.offsets.popper = getClientRect(data.offsets.popper), data.offsets.reference = getClientRect(data.offsets.reference), data = fn(data, modifier));
  }), data;
}
function update() {
  if (!this.state.isDestroyed) {
    var data = {
      instance: this,
      styles: {},
      arrowStyles: {},
      attributes: {},
      flipped: !1,
      offsets: {}
    };
    data.offsets.reference = getReferenceOffsets(this.state, this.popper, this.reference, this.options.positionFixed), data.placement = computeAutoPlacement(this.options.placement, data.offsets.reference, this.popper, this.reference, this.options.modifiers.flip.boundariesElement, this.options.modifiers.flip.padding), data.originalPlacement = data.placement, data.positionFixed = this.options.positionFixed, data.offsets.popper = getPopperOffsets(this.popper, data.offsets.reference, data.placement), data.offsets.popper.position = this.options.positionFixed ? "fixed" : "absolute", data = runModifiers(this.modifiers, data), this.state.isCreated ? this.options.onUpdate(data) : (this.state.isCreated = !0, this.options.onCreate(data));
  }
}
function isModifierEnabled(modifiers2, modifierName) {
  return modifiers2.some(function(_ref) {
    var name = _ref.name, enabled = _ref.enabled;
    return enabled && name === modifierName;
  });
}
function getSupportedPropertyName(property) {
  for (var prefixes = [!1, "ms", "Webkit", "Moz", "O"], upperProp = property.charAt(0).toUpperCase() + property.slice(1), i2 = 0; i2 < prefixes.length; i2++) {
    var prefix = prefixes[i2], toCheck = prefix ? "" + prefix + upperProp : property;
    if (typeof document.body.style[toCheck] < "u")
      return toCheck;
  }
  return null;
}
function destroy() {
  return this.state.isDestroyed = !0, isModifierEnabled(this.modifiers, "applyStyle") && (this.popper.removeAttribute("x-placement"), this.popper.style.position = "", this.popper.style.top = "", this.popper.style.left = "", this.popper.style.right = "", this.popper.style.bottom = "", this.popper.style.willChange = "", this.popper.style[getSupportedPropertyName("transform")] = ""), this.disableEventListeners(), this.options.removeOnDestroy && this.popper.parentNode.removeChild(this.popper), this;
}
function getWindow(element) {
  var ownerDocument = element.ownerDocument;
  return ownerDocument ? ownerDocument.defaultView : window;
}
function attachToScrollParents(scrollParent2, event, callback, scrollParents) {
  var isBody = scrollParent2.nodeName === "BODY", target = isBody ? scrollParent2.ownerDocument.defaultView : scrollParent2;
  target.addEventListener(event, callback, { passive: !0 }), isBody || attachToScrollParents(getScrollParent(target.parentNode), event, callback, scrollParents), scrollParents.push(target);
}
function setupEventListeners(reference, options2, state, updateBound) {
  state.updateBound = updateBound, getWindow(reference).addEventListener("resize", state.updateBound, { passive: !0 });
  var scrollElement = getScrollParent(reference);
  return attachToScrollParents(scrollElement, "scroll", state.updateBound, state.scrollParents), state.scrollElement = scrollElement, state.eventsEnabled = !0, state;
}
function enableEventListeners() {
  this.state.eventsEnabled || (this.state = setupEventListeners(this.reference, this.options, this.state, this.scheduleUpdate));
}
function removeEventListeners(reference, state) {
  return getWindow(reference).removeEventListener("resize", state.updateBound), state.scrollParents.forEach(function(target) {
    target.removeEventListener("scroll", state.updateBound);
  }), state.updateBound = null, state.scrollParents = [], state.scrollElement = null, state.eventsEnabled = !1, state;
}
function disableEventListeners() {
  this.state.eventsEnabled && (cancelAnimationFrame(this.scheduleUpdate), this.state = removeEventListeners(this.reference, this.state));
}
function isNumeric(n3) {
  return n3 !== "" && !isNaN(parseFloat(n3)) && isFinite(n3);
}
function setStyles(element, styles2) {
  Object.keys(styles2).forEach(function(prop) {
    var unit = "";
    ["width", "height", "top", "right", "bottom", "left"].indexOf(prop) !== -1 && isNumeric(styles2[prop]) && (unit = "px"), element.style[prop] = styles2[prop] + unit;
  });
}
function setAttributes(element, attributes) {
  Object.keys(attributes).forEach(function(prop) {
    var value = attributes[prop];
    value !== !1 ? element.setAttribute(prop, attributes[prop]) : element.removeAttribute(prop);
  });
}
function applyStyle(data) {
  return setStyles(data.instance.popper, data.styles), setAttributes(data.instance.popper, data.attributes), data.arrowElement && Object.keys(data.arrowStyles).length && setStyles(data.arrowElement, data.arrowStyles), data;
}
function applyStyleOnLoad(reference, popper, options2, modifierOptions, state) {
  var referenceOffsets = getReferenceOffsets(state, popper, reference, options2.positionFixed), placement = computeAutoPlacement(options2.placement, referenceOffsets, popper, reference, options2.modifiers.flip.boundariesElement, options2.modifiers.flip.padding);
  return popper.setAttribute("x-placement", placement), setStyles(popper, { position: options2.positionFixed ? "fixed" : "absolute" }), options2;
}
function getRoundedOffsets(data, shouldRound) {
  var _data$offsets = data.offsets, popper = _data$offsets.popper, reference = _data$offsets.reference, round = Math.round, floor = Math.floor, noRound = function(v2) {
    return v2;
  }, referenceWidth = round(reference.width), popperWidth = round(popper.width), isVertical = ["left", "right"].indexOf(data.placement) !== -1, isVariation = data.placement.indexOf("-") !== -1, sameWidthParity = referenceWidth % 2 === popperWidth % 2, bothOddWidth = referenceWidth % 2 === 1 && popperWidth % 2 === 1, horizontalToInteger = shouldRound ? isVertical || isVariation || sameWidthParity ? round : floor : noRound, verticalToInteger = shouldRound ? round : noRound;
  return {
    left: horizontalToInteger(bothOddWidth && !isVariation && shouldRound ? popper.left - 1 : popper.left),
    top: verticalToInteger(popper.top),
    bottom: verticalToInteger(popper.bottom),
    right: horizontalToInteger(popper.right)
  };
}
var isFirefox = isBrowser && /Firefox/i.test(navigator.userAgent);
function computeStyle(data, options2) {
  var x2 = options2.x, y2 = options2.y, popper = data.offsets.popper, legacyGpuAccelerationOption = find(data.instance.modifiers, function(modifier) {
    return modifier.name === "applyStyle";
  }).gpuAcceleration;
  legacyGpuAccelerationOption !== void 0 && console.warn("WARNING: `gpuAcceleration` option moved to `computeStyle` modifier and will not be supported in future versions of Popper.js!");
  var gpuAcceleration = legacyGpuAccelerationOption !== void 0 ? legacyGpuAccelerationOption : options2.gpuAcceleration, offsetParent = getOffsetParent(data.instance.popper), offsetParentRect = getBoundingClientRect(offsetParent), styles2 = {
    position: popper.position
  }, offsets = getRoundedOffsets(data, window.devicePixelRatio < 2 || !isFirefox), sideA = x2 === "bottom" ? "top" : "bottom", sideB = y2 === "right" ? "left" : "right", prefixedProperty = getSupportedPropertyName("transform"), left = void 0, top = void 0;
  if (sideA === "bottom" ? offsetParent.nodeName === "HTML" ? top = -offsetParent.clientHeight + offsets.bottom : top = -offsetParentRect.height + offsets.bottom : top = offsets.top, sideB === "right" ? offsetParent.nodeName === "HTML" ? left = -offsetParent.clientWidth + offsets.right : left = -offsetParentRect.width + offsets.right : left = offsets.left, gpuAcceleration && prefixedProperty)
    styles2[prefixedProperty] = "translate3d(" + left + "px, " + top + "px, 0)", styles2[sideA] = 0, styles2[sideB] = 0, styles2.willChange = "transform";
  else {
    var invertTop = sideA === "bottom" ? -1 : 1, invertLeft = sideB === "right" ? -1 : 1;
    styles2[sideA] = top * invertTop, styles2[sideB] = left * invertLeft, styles2.willChange = sideA + ", " + sideB;
  }
  var attributes = {
    "x-placement": data.placement
  };
  return data.attributes = _extends2({}, attributes, data.attributes), data.styles = _extends2({}, styles2, data.styles), data.arrowStyles = _extends2({}, data.offsets.arrow, data.arrowStyles), data;
}
function isModifierRequired(modifiers2, requestingName, requestedName) {
  var requesting = find(modifiers2, function(_ref) {
    var name = _ref.name;
    return name === requestingName;
  }), isRequired = !!requesting && modifiers2.some(function(modifier) {
    return modifier.name === requestedName && modifier.enabled && modifier.order < requesting.order;
  });
  if (!isRequired) {
    var _requesting = "`" + requestingName + "`", requested = "`" + requestedName + "`";
    console.warn(requested + " modifier is required by " + _requesting + " modifier in order to work, be sure to include it before " + _requesting + "!");
  }
  return isRequired;
}
function arrow(data, options2) {
  var _data$offsets$arrow;
  if (!isModifierRequired(data.instance.modifiers, "arrow", "keepTogether"))
    return data;
  var arrowElement = options2.element;
  if (typeof arrowElement == "string") {
    if (arrowElement = data.instance.popper.querySelector(arrowElement), !arrowElement)
      return data;
  } else if (!data.instance.popper.contains(arrowElement))
    return console.warn("WARNING: `arrow.element` must be child of its popper element!"), data;
  var placement = data.placement.split("-")[0], _data$offsets = data.offsets, popper = _data$offsets.popper, reference = _data$offsets.reference, isVertical = ["left", "right"].indexOf(placement) !== -1, len = isVertical ? "height" : "width", sideCapitalized = isVertical ? "Top" : "Left", side = sideCapitalized.toLowerCase(), altSide = isVertical ? "left" : "top", opSide = isVertical ? "bottom" : "right", arrowElementSize = getOuterSizes(arrowElement)[len];
  reference[opSide] - arrowElementSize < popper[side] && (data.offsets.popper[side] -= popper[side] - (reference[opSide] - arrowElementSize)), reference[side] + arrowElementSize > popper[opSide] && (data.offsets.popper[side] += reference[side] + arrowElementSize - popper[opSide]), data.offsets.popper = getClientRect(data.offsets.popper);
  var center = reference[side] + reference[len] / 2 - arrowElementSize / 2, css2 = getStyleComputedProperty(data.instance.popper), popperMarginSide = parseFloat(css2["margin" + sideCapitalized]), popperBorderSide = parseFloat(css2["border" + sideCapitalized + "Width"]), sideValue = center - data.offsets.popper[side] - popperMarginSide - popperBorderSide;
  return sideValue = Math.max(Math.min(popper[len] - arrowElementSize, sideValue), 0), data.arrowElement = arrowElement, data.offsets.arrow = (_data$offsets$arrow = {}, defineProperty(_data$offsets$arrow, side, Math.round(sideValue)), defineProperty(_data$offsets$arrow, altSide, ""), _data$offsets$arrow), data;
}
function getOppositeVariation(variation) {
  return variation === "end" ? "start" : variation === "start" ? "end" : variation;
}
var placements = ["auto-start", "auto", "auto-end", "top-start", "top", "top-end", "right-start", "right", "right-end", "bottom-end", "bottom", "bottom-start", "left-end", "left", "left-start"], validPlacements = placements.slice(3);
function clockwise(placement) {
  var counter = arguments.length > 1 && arguments[1] !== void 0 ? arguments[1] : !1, index = validPlacements.indexOf(placement), arr = validPlacements.slice(index + 1).concat(validPlacements.slice(0, index));
  return counter ? arr.reverse() : arr;
}
var BEHAVIORS = {
  FLIP: "flip",
  CLOCKWISE: "clockwise",
  COUNTERCLOCKWISE: "counterclockwise"
};
function flip(data, options2) {
  if (isModifierEnabled(data.instance.modifiers, "inner") || data.flipped && data.placement === data.originalPlacement)
    return data;
  var boundaries = getBoundaries(data.instance.popper, data.instance.reference, options2.padding, options2.boundariesElement, data.positionFixed), placement = data.placement.split("-")[0], placementOpposite = getOppositePlacement(placement), variation = data.placement.split("-")[1] || "", flipOrder = [];
  switch (options2.behavior) {
    case BEHAVIORS.FLIP:
      flipOrder = [placement, placementOpposite];
      break;
    case BEHAVIORS.CLOCKWISE:
      flipOrder = clockwise(placement);
      break;
    case BEHAVIORS.COUNTERCLOCKWISE:
      flipOrder = clockwise(placement, !0);
      break;
    default:
      flipOrder = options2.behavior;
  }
  return flipOrder.forEach(function(step, index) {
    if (placement !== step || flipOrder.length === index + 1)
      return data;
    placement = data.placement.split("-")[0], placementOpposite = getOppositePlacement(placement);
    var popperOffsets = data.offsets.popper, refOffsets = data.offsets.reference, floor = Math.floor, overlapsRef = placement === "left" && floor(popperOffsets.right) > floor(refOffsets.left) || placement === "right" && floor(popperOffsets.left) < floor(refOffsets.right) || placement === "top" && floor(popperOffsets.bottom) > floor(refOffsets.top) || placement === "bottom" && floor(popperOffsets.top) < floor(refOffsets.bottom), overflowsLeft = floor(popperOffsets.left) < floor(boundaries.left), overflowsRight = floor(popperOffsets.right) > floor(boundaries.right), overflowsTop = floor(popperOffsets.top) < floor(boundaries.top), overflowsBottom = floor(popperOffsets.bottom) > floor(boundaries.bottom), overflowsBoundaries = placement === "left" && overflowsLeft || placement === "right" && overflowsRight || placement === "top" && overflowsTop || placement === "bottom" && overflowsBottom, isVertical = ["top", "bottom"].indexOf(placement) !== -1, flippedVariationByRef = !!options2.flipVariations && (isVertical && variation === "start" && overflowsLeft || isVertical && variation === "end" && overflowsRight || !isVertical && variation === "start" && overflowsTop || !isVertical && variation === "end" && overflowsBottom), flippedVariationByContent = !!options2.flipVariationsByContent && (isVertical && variation === "start" && overflowsRight || isVertical && variation === "end" && overflowsLeft || !isVertical && variation === "start" && overflowsBottom || !isVertical && variation === "end" && overflowsTop), flippedVariation = flippedVariationByRef || flippedVariationByContent;
    (overlapsRef || overflowsBoundaries || flippedVariation) && (data.flipped = !0, (overlapsRef || overflowsBoundaries) && (placement = flipOrder[index + 1]), flippedVariation && (variation = getOppositeVariation(variation)), data.placement = placement + (variation ? "-" + variation : ""), data.offsets.popper = _extends2({}, data.offsets.popper, getPopperOffsets(data.instance.popper, data.offsets.reference, data.placement)), data = runModifiers(data.instance.modifiers, data, "flip"));
  }), data;
}
function keepTogether(data) {
  var _data$offsets = data.offsets, popper = _data$offsets.popper, reference = _data$offsets.reference, placement = data.placement.split("-")[0], floor = Math.floor, isVertical = ["top", "bottom"].indexOf(placement) !== -1, side = isVertical ? "right" : "bottom", opSide = isVertical ? "left" : "top", measurement = isVertical ? "width" : "height";
  return popper[side] < floor(reference[opSide]) && (data.offsets.popper[opSide] = floor(reference[opSide]) - popper[measurement]), popper[opSide] > floor(reference[side]) && (data.offsets.popper[opSide] = floor(reference[side])), data;
}
function toValue(str, measurement, popperOffsets, referenceOffsets) {
  var split = str.match(/((?:\-|\+)?\d*\.?\d*)(.*)/), value = +split[1], unit = split[2];
  if (!value)
    return str;
  if (unit.indexOf("%") === 0) {
    var element = void 0;
    switch (unit) {
      case "%p":
        element = popperOffsets;
        break;
      case "%":
      case "%r":
      default:
        element = referenceOffsets;
    }
    var rect = getClientRect(element);
    return rect[measurement] / 100 * value;
  } else if (unit === "vh" || unit === "vw") {
    var size = void 0;
    return unit === "vh" ? size = Math.max(document.documentElement.clientHeight, window.innerHeight || 0) : size = Math.max(document.documentElement.clientWidth, window.innerWidth || 0), size / 100 * value;
  } else
    return value;
}
function parseOffset(offset2, popperOffsets, referenceOffsets, basePlacement) {
  var offsets = [0, 0], useHeight = ["right", "left"].indexOf(basePlacement) !== -1, fragments = offset2.split(/(\+|\-)/).map(function(frag) {
    return frag.trim();
  }), divider = fragments.indexOf(find(fragments, function(frag) {
    return frag.search(/,|\s/) !== -1;
  }));
  fragments[divider] && fragments[divider].indexOf(",") === -1 && console.warn("Offsets separated by white space(s) are deprecated, use a comma (,) instead.");
  var splitRegex = /\s*,\s*|\s+/, ops = divider !== -1 ? [fragments.slice(0, divider).concat([fragments[divider].split(splitRegex)[0]]), [fragments[divider].split(splitRegex)[1]].concat(fragments.slice(divider + 1))] : [fragments];
  return ops = ops.map(function(op, index) {
    var measurement = (index === 1 ? !useHeight : useHeight) ? "height" : "width", mergeWithPrevious = !1;
    return op.reduce(function(a2, b2) {
      return a2[a2.length - 1] === "" && ["+", "-"].indexOf(b2) !== -1 ? (a2[a2.length - 1] = b2, mergeWithPrevious = !0, a2) : mergeWithPrevious ? (a2[a2.length - 1] += b2, mergeWithPrevious = !1, a2) : a2.concat(b2);
    }, []).map(function(str) {
      return toValue(str, measurement, popperOffsets, referenceOffsets);
    });
  }), ops.forEach(function(op, index) {
    op.forEach(function(frag, index2) {
      isNumeric(frag) && (offsets[index] += frag * (op[index2 - 1] === "-" ? -1 : 1));
    });
  }), offsets;
}
function offset(data, _ref) {
  var offset2 = _ref.offset, placement = data.placement, _data$offsets = data.offsets, popper = _data$offsets.popper, reference = _data$offsets.reference, basePlacement = placement.split("-")[0], offsets = void 0;
  return isNumeric(+offset2) ? offsets = [+offset2, 0] : offsets = parseOffset(offset2, popper, reference, basePlacement), basePlacement === "left" ? (popper.top += offsets[0], popper.left -= offsets[1]) : basePlacement === "right" ? (popper.top += offsets[0], popper.left += offsets[1]) : basePlacement === "top" ? (popper.left += offsets[0], popper.top -= offsets[1]) : basePlacement === "bottom" && (popper.left += offsets[0], popper.top += offsets[1]), data.popper = popper, data;
}
function preventOverflow(data, options2) {
  var boundariesElement = options2.boundariesElement || getOffsetParent(data.instance.popper);
  data.instance.reference === boundariesElement && (boundariesElement = getOffsetParent(boundariesElement));
  var transformProp = getSupportedPropertyName("transform"), popperStyles = data.instance.popper.style, top = popperStyles.top, left = popperStyles.left, transform = popperStyles[transformProp];
  popperStyles.top = "", popperStyles.left = "", popperStyles[transformProp] = "";
  var boundaries = getBoundaries(data.instance.popper, data.instance.reference, options2.padding, boundariesElement, data.positionFixed);
  popperStyles.top = top, popperStyles.left = left, popperStyles[transformProp] = transform, options2.boundaries = boundaries;
  var order = options2.priority, popper = data.offsets.popper, check = {
    primary: function(placement) {
      var value = popper[placement];
      return popper[placement] < boundaries[placement] && !options2.escapeWithReference && (value = Math.max(popper[placement], boundaries[placement])), defineProperty({}, placement, value);
    },
    secondary: function(placement) {
      var mainSide = placement === "right" ? "left" : "top", value = popper[mainSide];
      return popper[placement] > boundaries[placement] && !options2.escapeWithReference && (value = Math.min(popper[mainSide], boundaries[placement] - (placement === "right" ? popper.width : popper.height))), defineProperty({}, mainSide, value);
    }
  };
  return order.forEach(function(placement) {
    var side = ["left", "top"].indexOf(placement) !== -1 ? "primary" : "secondary";
    popper = _extends2({}, popper, check[side](placement));
  }), data.offsets.popper = popper, data;
}
function shift(data) {
  var placement = data.placement, basePlacement = placement.split("-")[0], shiftvariation = placement.split("-")[1];
  if (shiftvariation) {
    var _data$offsets = data.offsets, reference = _data$offsets.reference, popper = _data$offsets.popper, isVertical = ["bottom", "top"].indexOf(basePlacement) !== -1, side = isVertical ? "left" : "top", measurement = isVertical ? "width" : "height", shiftOffsets = {
      start: defineProperty({}, side, reference[side]),
      end: defineProperty({}, side, reference[side] + reference[measurement] - popper[measurement])
    };
    data.offsets.popper = _extends2({}, popper, shiftOffsets[shiftvariation]);
  }
  return data;
}
function hide(data) {
  if (!isModifierRequired(data.instance.modifiers, "hide", "preventOverflow"))
    return data;
  var refRect = data.offsets.reference, bound = find(data.instance.modifiers, function(modifier) {
    return modifier.name === "preventOverflow";
  }).boundaries;
  if (refRect.bottom < bound.top || refRect.left > bound.right || refRect.top > bound.bottom || refRect.right < bound.left) {
    if (data.hide === !0)
      return data;
    data.hide = !0, data.attributes["x-out-of-boundaries"] = "";
  } else {
    if (data.hide === !1)
      return data;
    data.hide = !1, data.attributes["x-out-of-boundaries"] = !1;
  }
  return data;
}
function inner(data) {
  var placement = data.placement, basePlacement = placement.split("-")[0], _data$offsets = data.offsets, popper = _data$offsets.popper, reference = _data$offsets.reference, isHoriz = ["left", "right"].indexOf(basePlacement) !== -1, subtractLength = ["top", "left"].indexOf(basePlacement) === -1;
  return popper[isHoriz ? "left" : "top"] = reference[basePlacement] - (subtractLength ? popper[isHoriz ? "width" : "height"] : 0), data.placement = getOppositePlacement(placement), data.offsets.popper = getClientRect(popper), data;
}
var modifiers = {
  /**
   * Modifier used to shift the popper on the start or end of its reference
   * element.<br />
   * It will read the variation of the `placement` property.<br />
   * It can be one either `-end` or `-start`.
   * @memberof modifiers
   * @inner
   */
  shift: {
    /** @prop {number} order=100 - Index used to define the order of execution */
    order: 100,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: !0,
    /** @prop {ModifierFn} */
    fn: shift
  },
  /**
   * The `offset` modifier can shift your popper on both its axis.
   *
   * It accepts the following units:
   * - `px` or unit-less, interpreted as pixels
   * - `%` or `%r`, percentage relative to the length of the reference element
   * - `%p`, percentage relative to the length of the popper element
   * - `vw`, CSS viewport width unit
   * - `vh`, CSS viewport height unit
   *
   * For length is intended the main axis relative to the placement of the popper.<br />
   * This means that if the placement is `top` or `bottom`, the length will be the
   * `width`. In case of `left` or `right`, it will be the `height`.
   *
   * You can provide a single value (as `Number` or `String`), or a pair of values
   * as `String` divided by a comma or one (or more) white spaces.<br />
   * The latter is a deprecated method because it leads to confusion and will be
   * removed in v2.<br />
   * Additionally, it accepts additions and subtractions between different units.
   * Note that multiplications and divisions aren't supported.
   *
   * Valid examples are:
   * ```
   * 10
   * '10%'
   * '10, 10'
   * '10%, 10'
   * '10 + 10%'
   * '10 - 5vh + 3%'
   * '-10px + 5vh, 5px - 6%'
   * ```
   * > **NB**: If you desire to apply offsets to your poppers in a way that may make them overlap
   * > with their reference element, unfortunately, you will have to disable the `flip` modifier.
   * > You can read more on this at this [issue](https://github.com/FezVrasta/popper.js/issues/373).
   *
   * @memberof modifiers
   * @inner
   */
  offset: {
    /** @prop {number} order=200 - Index used to define the order of execution */
    order: 200,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: !0,
    /** @prop {ModifierFn} */
    fn: offset,
    /** @prop {Number|String} offset=0
     * The offset value as described in the modifier description
     */
    offset: 0
  },
  /**
   * Modifier used to prevent the popper from being positioned outside the boundary.
   *
   * A scenario exists where the reference itself is not within the boundaries.<br />
   * We can say it has "escaped the boundaries" — or just "escaped".<br />
   * In this case we need to decide whether the popper should either:
   *
   * - detach from the reference and remain "trapped" in the boundaries, or
   * - if it should ignore the boundary and "escape with its reference"
   *
   * When `escapeWithReference` is set to`true` and reference is completely
   * outside its boundaries, the popper will overflow (or completely leave)
   * the boundaries in order to remain attached to the edge of the reference.
   *
   * @memberof modifiers
   * @inner
   */
  preventOverflow: {
    /** @prop {number} order=300 - Index used to define the order of execution */
    order: 300,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: !0,
    /** @prop {ModifierFn} */
    fn: preventOverflow,
    /**
     * @prop {Array} [priority=['left','right','top','bottom']]
     * Popper will try to prevent overflow following these priorities by default,
     * then, it could overflow on the left and on top of the `boundariesElement`
     */
    priority: ["left", "right", "top", "bottom"],
    /**
     * @prop {number} padding=5
     * Amount of pixel used to define a minimum distance between the boundaries
     * and the popper. This makes sure the popper always has a little padding
     * between the edges of its container
     */
    padding: 5,
    /**
     * @prop {String|HTMLElement} boundariesElement='scrollParent'
     * Boundaries used by the modifier. Can be `scrollParent`, `window`,
     * `viewport` or any DOM element.
     */
    boundariesElement: "scrollParent"
  },
  /**
   * Modifier used to make sure the reference and its popper stay near each other
   * without leaving any gap between the two. Especially useful when the arrow is
   * enabled and you want to ensure that it points to its reference element.
   * It cares only about the first axis. You can still have poppers with margin
   * between the popper and its reference element.
   * @memberof modifiers
   * @inner
   */
  keepTogether: {
    /** @prop {number} order=400 - Index used to define the order of execution */
    order: 400,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: !0,
    /** @prop {ModifierFn} */
    fn: keepTogether
  },
  /**
   * This modifier is used to move the `arrowElement` of the popper to make
   * sure it is positioned between the reference element and its popper element.
   * It will read the outer size of the `arrowElement` node to detect how many
   * pixels of conjunction are needed.
   *
   * It has no effect if no `arrowElement` is provided.
   * @memberof modifiers
   * @inner
   */
  arrow: {
    /** @prop {number} order=500 - Index used to define the order of execution */
    order: 500,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: !0,
    /** @prop {ModifierFn} */
    fn: arrow,
    /** @prop {String|HTMLElement} element='[x-arrow]' - Selector or node used as arrow */
    element: "[x-arrow]"
  },
  /**
   * Modifier used to flip the popper's placement when it starts to overlap its
   * reference element.
   *
   * Requires the `preventOverflow` modifier before it in order to work.
   *
   * **NOTE:** this modifier will interrupt the current update cycle and will
   * restart it if it detects the need to flip the placement.
   * @memberof modifiers
   * @inner
   */
  flip: {
    /** @prop {number} order=600 - Index used to define the order of execution */
    order: 600,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: !0,
    /** @prop {ModifierFn} */
    fn: flip,
    /**
     * @prop {String|Array} behavior='flip'
     * The behavior used to change the popper's placement. It can be one of
     * `flip`, `clockwise`, `counterclockwise` or an array with a list of valid
     * placements (with optional variations)
     */
    behavior: "flip",
    /**
     * @prop {number} padding=5
     * The popper will flip if it hits the edges of the `boundariesElement`
     */
    padding: 5,
    /**
     * @prop {String|HTMLElement} boundariesElement='viewport'
     * The element which will define the boundaries of the popper position.
     * The popper will never be placed outside of the defined boundaries
     * (except if `keepTogether` is enabled)
     */
    boundariesElement: "viewport",
    /**
     * @prop {Boolean} flipVariations=false
     * The popper will switch placement variation between `-start` and `-end` when
     * the reference element overlaps its boundaries.
     *
     * The original placement should have a set variation.
     */
    flipVariations: !1,
    /**
     * @prop {Boolean} flipVariationsByContent=false
     * The popper will switch placement variation between `-start` and `-end` when
     * the popper element overlaps its reference boundaries.
     *
     * The original placement should have a set variation.
     */
    flipVariationsByContent: !1
  },
  /**
   * Modifier used to make the popper flow toward the inner of the reference element.
   * By default, when this modifier is disabled, the popper will be placed outside
   * the reference element.
   * @memberof modifiers
   * @inner
   */
  inner: {
    /** @prop {number} order=700 - Index used to define the order of execution */
    order: 700,
    /** @prop {Boolean} enabled=false - Whether the modifier is enabled or not */
    enabled: !1,
    /** @prop {ModifierFn} */
    fn: inner
  },
  /**
   * Modifier used to hide the popper when its reference element is outside of the
   * popper boundaries. It will set a `x-out-of-boundaries` attribute which can
   * be used to hide with a CSS selector the popper when its reference is
   * out of boundaries.
   *
   * Requires the `preventOverflow` modifier before it in order to work.
   * @memberof modifiers
   * @inner
   */
  hide: {
    /** @prop {number} order=800 - Index used to define the order of execution */
    order: 800,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: !0,
    /** @prop {ModifierFn} */
    fn: hide
  },
  /**
   * Computes the style that will be applied to the popper element to gets
   * properly positioned.
   *
   * Note that this modifier will not touch the DOM, it just prepares the styles
   * so that `applyStyle` modifier can apply it. This separation is useful
   * in case you need to replace `applyStyle` with a custom implementation.
   *
   * This modifier has `850` as `order` value to maintain backward compatibility
   * with previous versions of Popper.js. Expect the modifiers ordering method
   * to change in future major versions of the library.
   *
   * @memberof modifiers
   * @inner
   */
  computeStyle: {
    /** @prop {number} order=850 - Index used to define the order of execution */
    order: 850,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: !0,
    /** @prop {ModifierFn} */
    fn: computeStyle,
    /**
     * @prop {Boolean} gpuAcceleration=true
     * If true, it uses the CSS 3D transformation to position the popper.
     * Otherwise, it will use the `top` and `left` properties
     */
    gpuAcceleration: !0,
    /**
     * @prop {string} [x='bottom']
     * Where to anchor the X axis (`bottom` or `top`). AKA X offset origin.
     * Change this if your popper should grow in a direction different from `bottom`
     */
    x: "bottom",
    /**
     * @prop {string} [x='left']
     * Where to anchor the Y axis (`left` or `right`). AKA Y offset origin.
     * Change this if your popper should grow in a direction different from `right`
     */
    y: "right"
  },
  /**
   * Applies the computed styles to the popper element.
   *
   * All the DOM manipulations are limited to this modifier. This is useful in case
   * you want to integrate Popper.js inside a framework or view library and you
   * want to delegate all the DOM manipulations to it.
   *
   * Note that if you disable this modifier, you must make sure the popper element
   * has its position set to `absolute` before Popper.js can do its work!
   *
   * Just disable this modifier and define your own to achieve the desired effect.
   *
   * @memberof modifiers
   * @inner
   */
  applyStyle: {
    /** @prop {number} order=900 - Index used to define the order of execution */
    order: 900,
    /** @prop {Boolean} enabled=true - Whether the modifier is enabled or not */
    enabled: !0,
    /** @prop {ModifierFn} */
    fn: applyStyle,
    /** @prop {Function} */
    onLoad: applyStyleOnLoad,
    /**
     * @deprecated since version 1.10.0, the property moved to `computeStyle` modifier
     * @prop {Boolean} gpuAcceleration=true
     * If true, it uses the CSS 3D transformation to position the popper.
     * Otherwise, it will use the `top` and `left` properties
     */
    gpuAcceleration: void 0
  }
}, Defaults = {
  /**
   * Popper's placement.
   * @prop {Popper.placements} placement='bottom'
   */
  placement: "bottom",
  /**
   * Set this to true if you want popper to position it self in 'fixed' mode
   * @prop {Boolean} positionFixed=false
   */
  positionFixed: !1,
  /**
   * Whether events (resize, scroll) are initially enabled.
   * @prop {Boolean} eventsEnabled=true
   */
  eventsEnabled: !0,
  /**
   * Set to true if you want to automatically remove the popper when
   * you call the `destroy` method.
   * @prop {Boolean} removeOnDestroy=false
   */
  removeOnDestroy: !1,
  /**
   * Callback called when the popper is created.<br />
   * By default, it is set to no-op.<br />
   * Access Popper.js instance with `data.instance`.
   * @prop {onCreate}
   */
  onCreate: function() {
  },
  /**
   * Callback called when the popper is updated. This callback is not called
   * on the initialization/creation of the popper, but only on subsequent
   * updates.<br />
   * By default, it is set to no-op.<br />
   * Access Popper.js instance with `data.instance`.
   * @prop {onUpdate}
   */
  onUpdate: function() {
  },
  /**
   * List of modifiers used to modify the offsets before they are applied to the popper.
   * They provide most of the functionalities of Popper.js.
   * @prop {modifiers}
   */
  modifiers
}, Popper = (function() {
  function Popper2(reference, popper) {
    var _this = this, options2 = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    classCallCheck(this, Popper2), this.scheduleUpdate = function() {
      return requestAnimationFrame(_this.update);
    }, this.update = debounce2(this.update.bind(this)), this.options = _extends2({}, Popper2.Defaults, options2), this.state = {
      isDestroyed: !1,
      isCreated: !1,
      scrollParents: []
    }, this.reference = reference && reference.jquery ? reference[0] : reference, this.popper = popper && popper.jquery ? popper[0] : popper, this.options.modifiers = {}, Object.keys(_extends2({}, Popper2.Defaults.modifiers, options2.modifiers)).forEach(function(name) {
      _this.options.modifiers[name] = _extends2({}, Popper2.Defaults.modifiers[name] || {}, options2.modifiers ? options2.modifiers[name] : {});
    }), this.modifiers = Object.keys(this.options.modifiers).map(function(name) {
      return _extends2({
        name
      }, _this.options.modifiers[name]);
    }).sort(function(a2, b2) {
      return a2.order - b2.order;
    }), this.modifiers.forEach(function(modifierOptions) {
      modifierOptions.enabled && isFunction2(modifierOptions.onLoad) && modifierOptions.onLoad(_this.reference, _this.popper, _this.options, modifierOptions, _this.state);
    }), this.update();
    var eventsEnabled = this.options.eventsEnabled;
    eventsEnabled && this.enableEventListeners(), this.state.eventsEnabled = eventsEnabled;
  }
  return createClass(Popper2, [{
    key: "update",
    value: function() {
      return update.call(this);
    }
  }, {
    key: "destroy",
    value: function() {
      return destroy.call(this);
    }
  }, {
    key: "enableEventListeners",
    value: function() {
      return enableEventListeners.call(this);
    }
  }, {
    key: "disableEventListeners",
    value: function() {
      return disableEventListeners.call(this);
    }
    /**
     * Schedules an update. It will run on the next UI update available.
     * @method scheduleUpdate
     * @memberof Popper
     */
    /**
     * Collection of utilities useful when writing custom modifiers.
     * Starting from version 1.7, this method is available only if you
     * include `popper-utils.js` before `popper.js`.
     *
     * **DEPRECATION**: This way to access PopperUtils is deprecated
     * and will be removed in v2! Use the PopperUtils module directly instead.
     * Due to the high instability of the methods contained in Utils, we can't
     * guarantee them to follow semver. Use them at your own risk!
     * @static
     * @private
     * @type {Object}
     * @deprecated since version 1.8
     * @member Utils
     * @memberof Popper
     */
  }]), Popper2;
})();
Popper.Utils = (typeof window < "u" ? window : global).PopperUtils;
Popper.placements = placements;
Popper.Defaults = Defaults;
var popper_default = Popper;

// ../node_modules/react-floater/es/index.js
var import_deepmerge = __toESM(require_cjs());

// ../node_modules/react-floater/node_modules/is-lite/esm/index.js
var DOM_PROPERTIES_TO_CHECK2 = [
  "innerHTML",
  "ownerDocument",
  "style",
  "attributes",
  "nodeValue"
], objectTypes2 = [
  "Array",
  "ArrayBuffer",
  "AsyncFunction",
  "AsyncGenerator",
  "AsyncGeneratorFunction",
  "Date",
  "Error",
  "Function",
  "Generator",
  "GeneratorFunction",
  "HTMLElement",
  "Map",
  "Object",
  "Promise",
  "RegExp",
  "Set",
  "WeakMap",
  "WeakSet"
], primitiveTypes2 = [
  "bigint",
  "boolean",
  "null",
  "number",
  "string",
  "symbol",
  "undefined"
];
function getObjectType2(value) {
  var objectTypeName = Object.prototype.toString.call(value).slice(8, -1);
  if (/HTML\w+Element/.test(objectTypeName))
    return "HTMLElement";
  if (isObjectType2(objectTypeName))
    return objectTypeName;
}
function isObjectOfType2(type) {
  return function(value) {
    return getObjectType2(value) === type;
  };
}
function isObjectType2(name) {
  return objectTypes2.includes(name);
}
function isOfType3(type) {
  return function(value) {
    return typeof value === type;
  };
}
function isPrimitiveType2(name) {
  return primitiveTypes2.includes(name);
}
function is2(value) {
  if (value === null)
    return "null";
  switch (typeof value) {
    case "bigint":
      return "bigint";
    case "boolean":
      return "boolean";
    case "number":
      return "number";
    case "string":
      return "string";
    case "symbol":
      return "symbol";
    case "undefined":
      return "undefined";
    default:
  }
  if (is2.array(value))
    return "Array";
  if (is2.plainFunction(value))
    return "Function";
  var tagType = getObjectType2(value);
  return tagType || "Object";
}
is2.array = Array.isArray;
is2.arrayOf = function(target, predicate) {
  return !is2.array(target) && !is2.function(predicate) ? !1 : target.every(function(d2) {
    return predicate(d2);
  });
};
is2.asyncGeneratorFunction = function(value) {
  return getObjectType2(value) === "AsyncGeneratorFunction";
};
is2.asyncFunction = isObjectOfType2("AsyncFunction");
is2.bigint = isOfType3("bigint");
is2.boolean = function(value) {
  return value === !0 || value === !1;
};
is2.date = isObjectOfType2("Date");
is2.defined = function(value) {
  return !is2.undefined(value);
};
is2.domElement = function(value) {
  return is2.object(value) && !is2.plainObject(value) && value.nodeType === 1 && is2.string(value.nodeName) && DOM_PROPERTIES_TO_CHECK2.every(function(property) {
    return property in value;
  });
};
is2.empty = function(value) {
  return is2.string(value) && value.length === 0 || is2.array(value) && value.length === 0 || is2.object(value) && !is2.map(value) && !is2.set(value) && Object.keys(value).length === 0 || is2.set(value) && value.size === 0 || is2.map(value) && value.size === 0;
};
is2.error = isObjectOfType2("Error");
is2.function = isOfType3("function");
is2.generator = function(value) {
  return is2.iterable(value) && is2.function(value.next) && is2.function(value.throw);
};
is2.generatorFunction = isObjectOfType2("GeneratorFunction");
is2.instanceOf = function(instance, class_) {
  return !instance || !class_ ? !1 : Object.getPrototypeOf(instance) === class_.prototype;
};
is2.iterable = function(value) {
  return !is2.nullOrUndefined(value) && is2.function(value[Symbol.iterator]);
};
is2.map = isObjectOfType2("Map");
is2.nan = function(value) {
  return Number.isNaN(value);
};
is2.null = function(value) {
  return value === null;
};
is2.nullOrUndefined = function(value) {
  return is2.null(value) || is2.undefined(value);
};
is2.number = function(value) {
  return isOfType3("number")(value) && !is2.nan(value);
};
is2.numericString = function(value) {
  return is2.string(value) && value.length > 0 && !Number.isNaN(Number(value));
};
is2.object = function(value) {
  return !is2.nullOrUndefined(value) && (is2.function(value) || typeof value == "object");
};
is2.oneOf = function(target, value) {
  return is2.array(target) ? target.indexOf(value) > -1 : !1;
};
is2.plainFunction = isObjectOfType2("Function");
is2.plainObject = function(value) {
  if (getObjectType2(value) !== "Object")
    return !1;
  var prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.getPrototypeOf({});
};
is2.primitive = function(value) {
  return is2.null(value) || isPrimitiveType2(typeof value);
};
is2.promise = isObjectOfType2("Promise");
is2.propertyOf = function(target, key, predicate) {
  if (!is2.object(target) || !key)
    return !1;
  var value = target[key];
  return is2.function(predicate) ? predicate(value) : is2.defined(value);
};
is2.regexp = isObjectOfType2("RegExp");
is2.set = isObjectOfType2("Set");
is2.string = isOfType3("string");
is2.symbol = isOfType3("symbol");
is2.undefined = isOfType3("undefined");
is2.weakMap = isObjectOfType2("WeakMap");
is2.weakSet = isObjectOfType2("WeakSet");
var esm_default = is2;

// ../node_modules/tree-changes/node_modules/@gilbarbara/deep-equal/esm/helpers.js
function isOfType4(type) {
  return function(value) {
    return typeof value === type;
  };
}
var isFunction3 = isOfType4("function"), isNull2 = function(value) {
  return value === null;
}, isRegex2 = function(value) {
  return Object.prototype.toString.call(value).slice(8, -1) === "RegExp";
}, isObject2 = function(value) {
  return !isUndefined2(value) && !isNull2(value) && (isFunction3(value) || typeof value == "object");
}, isUndefined2 = isOfType4("undefined");

// ../node_modules/tree-changes/node_modules/@gilbarbara/deep-equal/esm/index.js
var __values = function(o3) {
  var s2 = typeof Symbol == "function" && Symbol.iterator, m2 = s2 && o3[s2], i2 = 0;
  if (m2) return m2.call(o3);
  if (o3 && typeof o3.length == "number") return {
    next: function() {
      return o3 && i2 >= o3.length && (o3 = void 0), { value: o3 && o3[i2++], done: !o3 };
    }
  };
  throw new TypeError(s2 ? "Object is not iterable." : "Symbol.iterator is not defined.");
};
function equalArray2(left, right) {
  var length = left.length;
  if (length !== right.length)
    return !1;
  for (var index = length; index-- !== 0; )
    if (!equal2(left[index], right[index]))
      return !1;
  return !0;
}
function equalArrayBuffer2(left, right) {
  if (left.byteLength !== right.byteLength)
    return !1;
  for (var view1 = new DataView(left.buffer), view2 = new DataView(right.buffer), index = left.byteLength; index--; )
    if (view1.getUint8(index) !== view2.getUint8(index))
      return !1;
  return !0;
}
function equalMap2(left, right) {
  var e_1, _a, e_2, _b;
  if (left.size !== right.size)
    return !1;
  try {
    for (var _c = __values(left.entries()), _d = _c.next(); !_d.done; _d = _c.next()) {
      var index = _d.value;
      if (!right.has(index[0]))
        return !1;
    }
  } catch (e_1_1) {
    e_1 = { error: e_1_1 };
  } finally {
    try {
      _d && !_d.done && (_a = _c.return) && _a.call(_c);
    } finally {
      if (e_1) throw e_1.error;
    }
  }
  try {
    for (var _e = __values(left.entries()), _f = _e.next(); !_f.done; _f = _e.next()) {
      var index = _f.value;
      if (!equal2(index[1], right.get(index[0])))
        return !1;
    }
  } catch (e_2_1) {
    e_2 = { error: e_2_1 };
  } finally {
    try {
      _f && !_f.done && (_b = _e.return) && _b.call(_e);
    } finally {
      if (e_2) throw e_2.error;
    }
  }
  return !0;
}
function equalSet2(left, right) {
  var e_3, _a;
  if (left.size !== right.size)
    return !1;
  try {
    for (var _b = __values(left.entries()), _c = _b.next(); !_c.done; _c = _b.next()) {
      var index = _c.value;
      if (!right.has(index[0]))
        return !1;
    }
  } catch (e_3_1) {
    e_3 = { error: e_3_1 };
  } finally {
    try {
      _c && !_c.done && (_a = _b.return) && _a.call(_b);
    } finally {
      if (e_3) throw e_3.error;
    }
  }
  return !0;
}
function equal2(left, right) {
  if (left === right)
    return !0;
  if (left && isObject2(left) && right && isObject2(right)) {
    if (left.constructor !== right.constructor)
      return !1;
    if (Array.isArray(left) && Array.isArray(right))
      return equalArray2(left, right);
    if (left instanceof Map && right instanceof Map)
      return equalMap2(left, right);
    if (left instanceof Set && right instanceof Set)
      return equalSet2(left, right);
    if (ArrayBuffer.isView(left) && ArrayBuffer.isView(right))
      return equalArrayBuffer2(left, right);
    if (isRegex2(left) && isRegex2(right))
      return left.source === right.source && left.flags === right.flags;
    if (left.valueOf !== Object.prototype.valueOf)
      return left.valueOf() === right.valueOf();
    if (left.toString !== Object.prototype.toString)
      return left.toString() === right.toString();
    var leftKeys = Object.keys(left), rightKeys = Object.keys(right);
    if (leftKeys.length !== rightKeys.length)
      return !1;
    for (var index = leftKeys.length; index-- !== 0; )
      if (!Object.prototype.hasOwnProperty.call(right, leftKeys[index]))
        return !1;
    for (var index = leftKeys.length; index-- !== 0; ) {
      var key = leftKeys[index];
      if (!(key === "_owner" && left.$$typeof) && !equal2(left[key], right[key]))
        return !1;
    }
    return !0;
  }
  return Number.isNaN(left) && Number.isNaN(right) ? !0 : left === right;
}

// ../node_modules/tree-changes/node_modules/is-lite/esm/index.js
var DOM_PROPERTIES_TO_CHECK3 = [
  "innerHTML",
  "ownerDocument",
  "style",
  "attributes",
  "nodeValue"
], objectTypes3 = [
  "Array",
  "ArrayBuffer",
  "AsyncFunction",
  "AsyncGenerator",
  "AsyncGeneratorFunction",
  "Date",
  "Error",
  "Function",
  "Generator",
  "GeneratorFunction",
  "HTMLElement",
  "Map",
  "Object",
  "Promise",
  "RegExp",
  "Set",
  "WeakMap",
  "WeakSet"
], primitiveTypes3 = [
  "bigint",
  "boolean",
  "null",
  "number",
  "string",
  "symbol",
  "undefined"
];
function getObjectType3(value) {
  var objectTypeName = Object.prototype.toString.call(value).slice(8, -1);
  if (/HTML\w+Element/.test(objectTypeName))
    return "HTMLElement";
  if (isObjectType3(objectTypeName))
    return objectTypeName;
}
function isObjectOfType3(type) {
  return function(value) {
    return getObjectType3(value) === type;
  };
}
function isObjectType3(name) {
  return objectTypes3.includes(name);
}
function isOfType5(type) {
  return function(value) {
    return typeof value === type;
  };
}
function isPrimitiveType3(name) {
  return primitiveTypes3.includes(name);
}
function is3(value) {
  if (value === null)
    return "null";
  switch (typeof value) {
    case "bigint":
      return "bigint";
    case "boolean":
      return "boolean";
    case "number":
      return "number";
    case "string":
      return "string";
    case "symbol":
      return "symbol";
    case "undefined":
      return "undefined";
    default:
  }
  if (is3.array(value))
    return "Array";
  if (is3.plainFunction(value))
    return "Function";
  var tagType = getObjectType3(value);
  return tagType || "Object";
}
is3.array = Array.isArray;
is3.arrayOf = function(target, predicate) {
  return !is3.array(target) && !is3.function(predicate) ? !1 : target.every(function(d2) {
    return predicate(d2);
  });
};
is3.asyncGeneratorFunction = function(value) {
  return getObjectType3(value) === "AsyncGeneratorFunction";
};
is3.asyncFunction = isObjectOfType3("AsyncFunction");
is3.bigint = isOfType5("bigint");
is3.boolean = function(value) {
  return value === !0 || value === !1;
};
is3.date = isObjectOfType3("Date");
is3.defined = function(value) {
  return !is3.undefined(value);
};
is3.domElement = function(value) {
  return is3.object(value) && !is3.plainObject(value) && value.nodeType === 1 && is3.string(value.nodeName) && DOM_PROPERTIES_TO_CHECK3.every(function(property) {
    return property in value;
  });
};
is3.empty = function(value) {
  return is3.string(value) && value.length === 0 || is3.array(value) && value.length === 0 || is3.object(value) && !is3.map(value) && !is3.set(value) && Object.keys(value).length === 0 || is3.set(value) && value.size === 0 || is3.map(value) && value.size === 0;
};
is3.error = isObjectOfType3("Error");
is3.function = isOfType5("function");
is3.generator = function(value) {
  return is3.iterable(value) && is3.function(value.next) && is3.function(value.throw);
};
is3.generatorFunction = isObjectOfType3("GeneratorFunction");
is3.instanceOf = function(instance, class_) {
  return !instance || !class_ ? !1 : Object.getPrototypeOf(instance) === class_.prototype;
};
is3.iterable = function(value) {
  return !is3.nullOrUndefined(value) && is3.function(value[Symbol.iterator]);
};
is3.map = isObjectOfType3("Map");
is3.nan = function(value) {
  return Number.isNaN(value);
};
is3.null = function(value) {
  return value === null;
};
is3.nullOrUndefined = function(value) {
  return is3.null(value) || is3.undefined(value);
};
is3.number = function(value) {
  return isOfType5("number")(value) && !is3.nan(value);
};
is3.numericString = function(value) {
  return is3.string(value) && value.length > 0 && !Number.isNaN(Number(value));
};
is3.object = function(value) {
  return !is3.nullOrUndefined(value) && (is3.function(value) || typeof value == "object");
};
is3.oneOf = function(target, value) {
  return is3.array(target) ? target.indexOf(value) > -1 : !1;
};
is3.plainFunction = isObjectOfType3("Function");
is3.plainObject = function(value) {
  if (getObjectType3(value) !== "Object")
    return !1;
  var prototype = Object.getPrototypeOf(value);
  return prototype === null || prototype === Object.getPrototypeOf({});
};
is3.primitive = function(value) {
  return is3.null(value) || isPrimitiveType3(typeof value);
};
is3.promise = isObjectOfType3("Promise");
is3.propertyOf = function(target, key, predicate) {
  if (!is3.object(target) || !key)
    return !1;
  var value = target[key];
  return is3.function(predicate) ? predicate(value) : is3.defined(value);
};
is3.regexp = isObjectOfType3("RegExp");
is3.set = isObjectOfType3("Set");
is3.string = isOfType5("string");
is3.symbol = isOfType5("symbol");
is3.undefined = isOfType5("undefined");
is3.weakMap = isObjectOfType3("WeakMap");
is3.weakSet = isObjectOfType3("WeakSet");
var esm_default2 = is3;

// ../node_modules/tree-changes/esm/helpers.js
function canHaveLength2() {
  for (var arguments_ = [], _i = 0; _i < arguments.length; _i++)
    arguments_[_i] = arguments[_i];
  return arguments_.every(function(d2) {
    return esm_default2.string(d2) || esm_default2.array(d2) || esm_default2.plainObject(d2);
  });
}
function checkEquality2(left, right, value) {
  return isSameType2(left, right) ? [left, right].every(esm_default2.array) ? !left.some(hasValue2(value)) && right.some(hasValue2(value)) : [left, right].every(esm_default2.plainObject) ? !Object.entries(left).some(hasEntry2(value)) && Object.entries(right).some(hasEntry2(value)) : right === value : !1;
}
function compareNumbers2(previousData, data, options2) {
  var actual = options2.actual, key = options2.key, previous = options2.previous, type = options2.type, left = nested2(previousData, key), right = nested2(data, key), changed = [left, right].every(esm_default2.number) && (type === "increased" ? left < right : left > right);
  return esm_default2.undefined(actual) || (changed = changed && right === actual), esm_default2.undefined(previous) || (changed = changed && left === previous), changed;
}
function compareValues2(previousData, data, options2) {
  var key = options2.key, type = options2.type, value = options2.value, left = nested2(previousData, key), right = nested2(data, key), primary = type === "added" ? left : right, secondary = type === "added" ? right : left;
  if (!esm_default2.nullOrUndefined(value)) {
    if (esm_default2.defined(primary)) {
      if (esm_default2.array(primary) || esm_default2.plainObject(primary))
        return checkEquality2(primary, secondary, value);
    } else
      return equal2(secondary, value);
    return !1;
  }
  return [left, right].every(esm_default2.array) ? !secondary.every(isEqualPredicate2(primary)) : [left, right].every(esm_default2.plainObject) ? hasExtraKeys2(Object.keys(primary), Object.keys(secondary)) : ![left, right].every(function(d2) {
    return esm_default2.primitive(d2) && esm_default2.defined(d2);
  }) && (type === "added" ? !esm_default2.defined(left) && esm_default2.defined(right) : esm_default2.defined(left) && !esm_default2.defined(right));
}
function getIterables2(previousData, data, _a) {
  var _b = _a === void 0 ? {} : _a, key = _b.key, left = nested2(previousData, key), right = nested2(data, key);
  if (!isSameType2(left, right))
    throw new TypeError("Inputs have different types");
  if (!canHaveLength2(left, right))
    throw new TypeError("Inputs don't have length");
  return [left, right].every(esm_default2.plainObject) && (left = Object.keys(left), right = Object.keys(right)), [left, right];
}
function hasEntry2(input) {
  return function(_a) {
    var key = _a[0], value = _a[1];
    return esm_default2.array(input) ? equal2(input, value) || input.some(function(d2) {
      return equal2(d2, value) || esm_default2.array(value) && isEqualPredicate2(value)(d2);
    }) : esm_default2.plainObject(input) && input[key] ? !!input[key] && equal2(input[key], value) : equal2(input, value);
  };
}
function hasExtraKeys2(left, right) {
  return right.some(function(d2) {
    return !left.includes(d2);
  });
}
function hasValue2(input) {
  return function(value) {
    return esm_default2.array(input) ? input.some(function(d2) {
      return equal2(d2, value) || esm_default2.array(value) && isEqualPredicate2(value)(d2);
    }) : equal2(input, value);
  };
}
function includesOrEqualsTo2(previousValue, value) {
  return esm_default2.array(previousValue) ? previousValue.some(function(d2) {
    return equal2(d2, value);
  }) : equal2(previousValue, value);
}
function isEqualPredicate2(data) {
  return function(value) {
    return data.some(function(d2) {
      return equal2(d2, value);
    });
  };
}
function isSameType2() {
  for (var arguments_ = [], _i = 0; _i < arguments.length; _i++)
    arguments_[_i] = arguments[_i];
  return arguments_.every(esm_default2.array) || arguments_.every(esm_default2.number) || arguments_.every(esm_default2.plainObject) || arguments_.every(esm_default2.string);
}
function nested2(data, property) {
  if (esm_default2.plainObject(data) || esm_default2.array(data)) {
    if (esm_default2.string(property)) {
      var props = property.split(".");
      return props.reduce(function(acc, d2) {
        return acc && acc[d2];
      }, data);
    }
    return esm_default2.number(property) ? data[property] : data;
  }
  return data;
}

// ../node_modules/tree-changes/esm/index.js
function treeChanges2(previousData, data) {
  if ([previousData, data].some(esm_default2.nullOrUndefined))
    throw new Error("Missing required parameters");
  if (![previousData, data].every(function(d2) {
    return esm_default2.plainObject(d2) || esm_default2.array(d2);
  }))
    throw new Error("Expected plain objects or array");
  var added = function(key, value) {
    try {
      return compareValues2(previousData, data, { key, type: "added", value });
    } catch {
      return !1;
    }
  }, changed = function(key, actual, previous) {
    try {
      var left = nested2(previousData, key), right = nested2(data, key), hasActual = esm_default2.defined(actual), hasPrevious = esm_default2.defined(previous);
      if (hasActual || hasPrevious) {
        var leftComparator = hasPrevious ? includesOrEqualsTo2(previous, left) : !includesOrEqualsTo2(actual, left), rightComparator = includesOrEqualsTo2(actual, right);
        return leftComparator && rightComparator;
      }
      return [left, right].every(esm_default2.array) || [left, right].every(esm_default2.plainObject) ? !equal2(left, right) : left !== right;
    } catch {
      return !1;
    }
  }, changedFrom = function(key, previous, actual) {
    if (!esm_default2.defined(key))
      return !1;
    try {
      var left = nested2(previousData, key), right = nested2(data, key), hasActual = esm_default2.defined(actual);
      return includesOrEqualsTo2(previous, left) && (hasActual ? includesOrEqualsTo2(actual, right) : !hasActual);
    } catch {
      return !1;
    }
  }, changedTo = function(key, actual) {
    return esm_default2.defined(key) ? changed(key, actual) : !1;
  }, decreased = function(key, actual, previous) {
    if (!esm_default2.defined(key))
      return !1;
    try {
      return compareNumbers2(previousData, data, { key, actual, previous, type: "decreased" });
    } catch {
      return !1;
    }
  }, emptied = function(key) {
    try {
      var _a = getIterables2(previousData, data, { key }), left = _a[0], right = _a[1];
      return !!left.length && !right.length;
    } catch {
      return !1;
    }
  }, filled = function(key) {
    try {
      var _a = getIterables2(previousData, data, { key }), left = _a[0], right = _a[1];
      return !left.length && !!right.length;
    } catch {
      return !1;
    }
  }, increased = function(key, actual, previous) {
    if (!esm_default2.defined(key))
      return !1;
    try {
      return compareNumbers2(previousData, data, { key, actual, previous, type: "increased" });
    } catch {
      return !1;
    }
  }, removed = function(key, value) {
    try {
      return compareValues2(previousData, data, { key, type: "removed", value });
    } catch {
      return !1;
    }
  };
  return { added, changed, changedFrom, changedTo, decreased, emptied, filled, increased, removed };
}

// ../node_modules/react-floater/es/index.js
function ownKeys(e2, r3) {
  var t2 = Object.keys(e2);
  if (Object.getOwnPropertySymbols) {
    var o3 = Object.getOwnPropertySymbols(e2);
    r3 && (o3 = o3.filter(function(r4) {
      return Object.getOwnPropertyDescriptor(e2, r4).enumerable;
    })), t2.push.apply(t2, o3);
  }
  return t2;
}
function _objectSpread2(e2) {
  for (var r3 = 1; r3 < arguments.length; r3++) {
    var t2 = arguments[r3] != null ? arguments[r3] : {};
    r3 % 2 ? ownKeys(Object(t2), !0).forEach(function(r4) {
      _defineProperty(e2, r4, t2[r4]);
    }) : Object.getOwnPropertyDescriptors ? Object.defineProperties(e2, Object.getOwnPropertyDescriptors(t2)) : ownKeys(Object(t2)).forEach(function(r4) {
      Object.defineProperty(e2, r4, Object.getOwnPropertyDescriptor(t2, r4));
    });
  }
  return e2;
}
function _classCallCheck(instance, Constructor) {
  if (!(instance instanceof Constructor))
    throw new TypeError("Cannot call a class as a function");
}
function _defineProperties(target, props) {
  for (var i2 = 0; i2 < props.length; i2++) {
    var descriptor = props[i2];
    descriptor.enumerable = descriptor.enumerable || !1, descriptor.configurable = !0, "value" in descriptor && (descriptor.writable = !0), Object.defineProperty(target, _toPropertyKey(descriptor.key), descriptor);
  }
}
function _createClass(Constructor, protoProps, staticProps) {
  return protoProps && _defineProperties(Constructor.prototype, protoProps), staticProps && _defineProperties(Constructor, staticProps), Object.defineProperty(Constructor, "prototype", {
    writable: !1
  }), Constructor;
}
function _defineProperty(obj, key, value) {
  return key = _toPropertyKey(key), key in obj ? Object.defineProperty(obj, key, {
    value,
    enumerable: !0,
    configurable: !0,
    writable: !0
  }) : obj[key] = value, obj;
}
function _inherits(subClass, superClass) {
  if (typeof superClass != "function" && superClass !== null)
    throw new TypeError("Super expression must either be null or a function");
  subClass.prototype = Object.create(superClass && superClass.prototype, {
    constructor: {
      value: subClass,
      writable: !0,
      configurable: !0
    }
  }), Object.defineProperty(subClass, "prototype", {
    writable: !1
  }), superClass && _setPrototypeOf2(subClass, superClass);
}
function _getPrototypeOf2(o3) {
  return _getPrototypeOf2 = Object.setPrototypeOf ? Object.getPrototypeOf.bind() : function(o4) {
    return o4.__proto__ || Object.getPrototypeOf(o4);
  }, _getPrototypeOf2(o3);
}
function _setPrototypeOf2(o3, p2) {
  return _setPrototypeOf2 = Object.setPrototypeOf ? Object.setPrototypeOf.bind() : function(o4, p3) {
    return o4.__proto__ = p3, o4;
  }, _setPrototypeOf2(o3, p2);
}
function _isNativeReflectConstruct2() {
  if (typeof Reflect > "u" || !Reflect.construct || Reflect.construct.sham) return !1;
  if (typeof Proxy == "function") return !0;
  try {
    return Boolean.prototype.valueOf.call(Reflect.construct(Boolean, [], function() {
    })), !0;
  } catch {
    return !1;
  }
}
function _objectWithoutPropertiesLoose(source, excluded) {
  if (source == null) return {};
  var target = {}, sourceKeys = Object.keys(source), key, i2;
  for (i2 = 0; i2 < sourceKeys.length; i2++)
    key = sourceKeys[i2], !(excluded.indexOf(key) >= 0) && (target[key] = source[key]);
  return target;
}
function _objectWithoutProperties(source, excluded) {
  if (source == null) return {};
  var target = _objectWithoutPropertiesLoose(source, excluded), key, i2;
  if (Object.getOwnPropertySymbols) {
    var sourceSymbolKeys = Object.getOwnPropertySymbols(source);
    for (i2 = 0; i2 < sourceSymbolKeys.length; i2++)
      key = sourceSymbolKeys[i2], !(excluded.indexOf(key) >= 0) && Object.prototype.propertyIsEnumerable.call(source, key) && (target[key] = source[key]);
  }
  return target;
}
function _assertThisInitialized2(self2) {
  if (self2 === void 0)
    throw new ReferenceError("this hasn't been initialised - super() hasn't been called");
  return self2;
}
function _possibleConstructorReturn(self2, call) {
  if (call && (typeof call == "object" || typeof call == "function"))
    return call;
  if (call !== void 0)
    throw new TypeError("Derived constructors may only return object or undefined");
  return _assertThisInitialized2(self2);
}
function _createSuper(Derived) {
  var hasNativeReflectConstruct = _isNativeReflectConstruct2();
  return function() {
    var Super = _getPrototypeOf2(Derived), result;
    if (hasNativeReflectConstruct) {
      var NewTarget = _getPrototypeOf2(this).constructor;
      result = Reflect.construct(Super, arguments, NewTarget);
    } else
      result = Super.apply(this, arguments);
    return _possibleConstructorReturn(this, result);
  };
}
function _toPrimitive(input, hint) {
  if (typeof input != "object" || input === null) return input;
  var prim = input[Symbol.toPrimitive];
  if (prim !== void 0) {
    var res = prim.call(input, hint || "default");
    if (typeof res != "object") return res;
    throw new TypeError("@@toPrimitive must return a primitive value.");
  }
  return (hint === "string" ? String : Number)(input);
}
function _toPropertyKey(arg) {
  var key = _toPrimitive(arg, "string");
  return typeof key == "symbol" ? key : String(key);
}
var DEFAULTS = { flip: { padding: 20 }, preventOverflow: { padding: 10 } }, VALIDATOR_ARG_ERROR_MESSAGE = "The typeValidator argument must be a function with the signature function(props, propName, componentName).", MESSAGE_ARG_ERROR_MESSAGE = "The error message is optional, but must be a string if provided.";
function propIsRequired(condition, props, propName, componentName) {
  return typeof condition == "boolean" ? condition : typeof condition == "function" ? condition(props, propName, componentName) : condition ? !!condition : !1;
}
function propExists(props, propName) {
  return Object.hasOwnProperty.call(props, propName);
}
function missingPropError(props, propName, componentName, message) {
  return message ? new Error(message) : new Error("Required ".concat(props[propName], " `").concat(propName, "` was not specified in `").concat(componentName, "`."));
}
function guardAgainstInvalidArgTypes(typeValidator, message) {
  if (typeof typeValidator != "function")
    throw new TypeError(VALIDATOR_ARG_ERROR_MESSAGE);
  if (message && typeof message != "string")
    throw new TypeError(MESSAGE_ARG_ERROR_MESSAGE);
}
function isRequiredIf(typeValidator, condition, message) {
  return guardAgainstInvalidArgTypes(typeValidator, message), function(props, propName, componentName) {
    for (var _len = arguments.length, rest2 = new Array(_len > 3 ? _len - 3 : 0), _key = 3; _key < _len; _key++)
      rest2[_key - 3] = arguments[_key];
    return propIsRequired(condition, props, propName, componentName) ? propExists(props, propName) ? typeValidator.apply(void 0, [props, propName, componentName].concat(rest2)) : missingPropError(props, propName, componentName, message) : typeValidator.apply(void 0, [props, propName, componentName].concat(rest2));
  };
}
var STATUS2 = { INIT: "init", IDLE: "idle", OPENING: "opening", OPEN: "open", CLOSING: "closing", ERROR: "error" }, isReact16 = react_dom_default.createPortal !== void 0;
function canUseDOM() {
  return !!(typeof window < "u" && window.document && window.document.createElement);
}
function isMobile() {
  return "ontouchstart" in window && /Mobi/.test(navigator.userAgent);
}
function log(_ref) {
  var title2 = _ref.title, data = _ref.data, _ref$warn = _ref.warn, warn = _ref$warn === void 0 ? !1 : _ref$warn, _ref$debug = _ref.debug, debug = _ref$debug === void 0 ? !1 : _ref$debug, logFn = warn ? console.warn || console.error : console.log;
  debug && title2 && data && (console.groupCollapsed("%creact-floater: ".concat(title2), "color: #9b00ff; font-weight: bold; font-size: 12px;"), Array.isArray(data) ? data.forEach(function(d2) {
    esm_default.plainObject(d2) && d2.key ? logFn.apply(console, [d2.key, d2.value]) : logFn.apply(console, [d2]);
  }) : logFn.apply(console, [data]), console.groupEnd());
}
function on(element, event, cb) {
  var capture = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : !1;
  element.addEventListener(event, cb, capture);
}
function off(element, event, cb) {
  var capture = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : !1;
  element.removeEventListener(event, cb, capture);
}
function once3(element, event, cb) {
  var capture = arguments.length > 3 && arguments[3] !== void 0 ? arguments[3] : !1, _nextCB;
  _nextCB = function(e2) {
    cb(e2), off(element, event, _nextCB);
  }, on(element, event, _nextCB, capture);
}
function noop2() {
}
var ReactFloaterPortal = (function(_React$Component) {
  _inherits(ReactFloaterPortal2, _React$Component);
  var _super = _createSuper(ReactFloaterPortal2);
  function ReactFloaterPortal2() {
    return _classCallCheck(this, ReactFloaterPortal2), _super.apply(this, arguments);
  }
  return _createClass(ReactFloaterPortal2, [{ key: "componentDidMount", value: function() {
    canUseDOM() && (this.node || this.appendNode(), isReact16 || this.renderPortal());
  } }, { key: "componentDidUpdate", value: function() {
    canUseDOM() && (isReact16 || this.renderPortal());
  } }, { key: "componentWillUnmount", value: function() {
    !canUseDOM() || !this.node || (isReact16 || react_dom_default.unmountComponentAtNode(this.node), this.node && this.node.parentNode === document.body && (document.body.removeChild(this.node), this.node = void 0));
  } }, { key: "appendNode", value: function() {
    var _this$props = this.props, id = _this$props.id, zIndex = _this$props.zIndex;
    this.node || (this.node = document.createElement("div"), id && (this.node.id = id), zIndex && (this.node.style.zIndex = zIndex), document.body.appendChild(this.node));
  } }, { key: "renderPortal", value: function() {
    if (!canUseDOM()) return null;
    var _this$props2 = this.props, children = _this$props2.children, setRef = _this$props2.setRef;
    if (this.node || this.appendNode(), isReact16)
      return react_dom_default.createPortal(children, this.node);
    var portal = react_dom_default.unstable_renderSubtreeIntoContainer(this, children.length > 1 ? react_default.createElement("div", null, children) : children[0], this.node);
    return setRef(portal), null;
  } }, { key: "renderReact16", value: function() {
    var _this$props3 = this.props, hasChildren = _this$props3.hasChildren, placement = _this$props3.placement, target = _this$props3.target;
    return hasChildren ? this.renderPortal() : target || placement === "center" ? this.renderPortal() : null;
  } }, { key: "render", value: function() {
    return isReact16 ? this.renderReact16() : null;
  } }]), ReactFloaterPortal2;
})(react_default.Component);
_defineProperty(ReactFloaterPortal, "propTypes", { children: import_prop_types2.default.oneOfType([import_prop_types2.default.element, import_prop_types2.default.array]), hasChildren: import_prop_types2.default.bool, id: import_prop_types2.default.oneOfType([import_prop_types2.default.string, import_prop_types2.default.number]), placement: import_prop_types2.default.string, setRef: import_prop_types2.default.func.isRequired, target: import_prop_types2.default.oneOfType([import_prop_types2.default.object, import_prop_types2.default.string]), zIndex: import_prop_types2.default.number });
var FloaterArrow = (function(_React$Component) {
  _inherits(FloaterArrow2, _React$Component);
  var _super = _createSuper(FloaterArrow2);
  function FloaterArrow2() {
    return _classCallCheck(this, FloaterArrow2), _super.apply(this, arguments);
  }
  return _createClass(FloaterArrow2, [{ key: "parentStyle", get: function() {
    var _this$props = this.props, placement = _this$props.placement, styles2 = _this$props.styles, length = styles2.arrow.length, arrow2 = { pointerEvents: "none", position: "absolute", width: "100%" };
    return placement.startsWith("top") ? (arrow2.bottom = 0, arrow2.left = 0, arrow2.right = 0, arrow2.height = length) : placement.startsWith("bottom") ? (arrow2.left = 0, arrow2.right = 0, arrow2.top = 0, arrow2.height = length) : placement.startsWith("left") ? (arrow2.right = 0, arrow2.top = 0, arrow2.bottom = 0) : placement.startsWith("right") && (arrow2.left = 0, arrow2.top = 0), arrow2;
  } }, { key: "render", value: function() {
    var _this$props2 = this.props, placement = _this$props2.placement, setArrowRef = _this$props2.setArrowRef, styles2 = _this$props2.styles, _styles$arrow = styles2.arrow, color2 = _styles$arrow.color, display = _styles$arrow.display, length = _styles$arrow.length, margin = _styles$arrow.margin, position = _styles$arrow.position, spread2 = _styles$arrow.spread, arrowStyles = { display, position }, points, x2 = spread2, y2 = length;
    return placement.startsWith("top") ? (points = "0,0 ".concat(x2 / 2, ",").concat(y2, " ").concat(x2, ",0"), arrowStyles.bottom = 0, arrowStyles.marginLeft = margin, arrowStyles.marginRight = margin) : placement.startsWith("bottom") ? (points = "".concat(x2, ",").concat(y2, " ").concat(x2 / 2, ",0 0,").concat(y2), arrowStyles.top = 0, arrowStyles.marginLeft = margin, arrowStyles.marginRight = margin) : placement.startsWith("left") ? (y2 = spread2, x2 = length, points = "0,0 ".concat(x2, ",").concat(y2 / 2, " 0,").concat(y2), arrowStyles.right = 0, arrowStyles.marginTop = margin, arrowStyles.marginBottom = margin) : placement.startsWith("right") && (y2 = spread2, x2 = length, points = "".concat(x2, ",").concat(y2, " ").concat(x2, ",0 0,").concat(y2 / 2), arrowStyles.left = 0, arrowStyles.marginTop = margin, arrowStyles.marginBottom = margin), react_default.createElement("div", { className: "__floater__arrow", style: this.parentStyle }, react_default.createElement("span", { ref: setArrowRef, style: arrowStyles }, react_default.createElement("svg", { width: x2, height: y2, version: "1.1", xmlns: "http://www.w3.org/2000/svg" }, react_default.createElement("polygon", { points, fill: color2 }))));
  } }]), FloaterArrow2;
})(react_default.Component);
_defineProperty(FloaterArrow, "propTypes", { placement: import_prop_types2.default.string.isRequired, setArrowRef: import_prop_types2.default.func.isRequired, styles: import_prop_types2.default.object.isRequired });
var _excluded$1 = ["color", "height", "width"];
function FloaterCloseBtn(_ref) {
  var handleClick = _ref.handleClick, styles2 = _ref.styles, color2 = styles2.color, height = styles2.height, width = styles2.width, style = _objectWithoutProperties(styles2, _excluded$1);
  return react_default.createElement("button", { "aria-label": "close", onClick: handleClick, style, type: "button" }, react_default.createElement("svg", { width: "".concat(width, "px"), height: "".concat(height, "px"), viewBox: "0 0 18 18", version: "1.1", xmlns: "http://www.w3.org/2000/svg", preserveAspectRatio: "xMidYMid" }, react_default.createElement("g", null, react_default.createElement("path", { d: "M8.13911129,9.00268191 L0.171521827,17.0258467 C-0.0498027049,17.248715 -0.0498027049,17.6098394 0.171521827,17.8327545 C0.28204354,17.9443526 0.427188206,17.9998706 0.572051765,17.9998706 C0.71714958,17.9998706 0.862013139,17.9443526 0.972581703,17.8327545 L9.0000937,9.74924618 L17.0276057,17.8327545 C17.1384085,17.9443526 17.2832721,17.9998706 17.4281356,17.9998706 C17.5729992,17.9998706 17.718097,17.9443526 17.8286656,17.8327545 C18.0499901,17.6098862 18.0499901,17.2487618 17.8286656,17.0258467 L9.86135722,9.00268191 L17.8340066,0.973848225 C18.0553311,0.750979934 18.0553311,0.389855532 17.8340066,0.16694039 C17.6126821,-0.0556467968 17.254037,-0.0556467968 17.0329467,0.16694039 L9.00042166,8.25611765 L0.967006424,0.167268345 C0.745681892,-0.0553188426 0.387317931,-0.0553188426 0.165993399,0.167268345 C-0.0553311331,0.390136635 -0.0553311331,0.751261038 0.165993399,0.974176179 L8.13920499,9.00268191 L8.13911129,9.00268191 Z", fill: color2 }))));
}
FloaterCloseBtn.propTypes = { handleClick: import_prop_types2.default.func.isRequired, styles: import_prop_types2.default.object.isRequired };
function FloaterContainer(_ref) {
  var content = _ref.content, footer = _ref.footer, handleClick = _ref.handleClick, open = _ref.open, positionWrapper = _ref.positionWrapper, showCloseButton = _ref.showCloseButton, title2 = _ref.title, styles2 = _ref.styles, output = { content: react_default.isValidElement(content) ? content : react_default.createElement("div", { className: "__floater__content", style: styles2.content }, content) };
  return title2 && (output.title = react_default.isValidElement(title2) ? title2 : react_default.createElement("div", { className: "__floater__title", style: styles2.title }, title2)), footer && (output.footer = react_default.isValidElement(footer) ? footer : react_default.createElement("div", { className: "__floater__footer", style: styles2.footer }, footer)), (showCloseButton || positionWrapper) && !esm_default.boolean(open) && (output.close = react_default.createElement(FloaterCloseBtn, { styles: styles2.close, handleClick })), react_default.createElement("div", { className: "__floater__container", style: styles2.container }, output.close, output.title, output.content, output.footer);
}
FloaterContainer.propTypes = { content: import_prop_types2.default.node.isRequired, footer: import_prop_types2.default.node, handleClick: import_prop_types2.default.func.isRequired, open: import_prop_types2.default.bool, positionWrapper: import_prop_types2.default.bool.isRequired, showCloseButton: import_prop_types2.default.bool.isRequired, styles: import_prop_types2.default.object.isRequired, title: import_prop_types2.default.node };
var Floater = (function(_React$Component) {
  _inherits(Floater2, _React$Component);
  var _super = _createSuper(Floater2);
  function Floater2() {
    return _classCallCheck(this, Floater2), _super.apply(this, arguments);
  }
  return _createClass(Floater2, [{ key: "style", get: function() {
    var _this$props = this.props, disableAnimation = _this$props.disableAnimation, component = _this$props.component, placement = _this$props.placement, hideArrow = _this$props.hideArrow, status = _this$props.status, styles2 = _this$props.styles, length = styles2.arrow.length, floater = styles2.floater, floaterCentered = styles2.floaterCentered, floaterClosing = styles2.floaterClosing, floaterOpening = styles2.floaterOpening, floaterWithAnimation = styles2.floaterWithAnimation, floaterWithComponent = styles2.floaterWithComponent, element = {};
    return hideArrow || (placement.startsWith("top") ? element.padding = "0 0 ".concat(length, "px") : placement.startsWith("bottom") ? element.padding = "".concat(length, "px 0 0") : placement.startsWith("left") ? element.padding = "0 ".concat(length, "px 0 0") : placement.startsWith("right") && (element.padding = "0 0 0 ".concat(length, "px"))), [STATUS2.OPENING, STATUS2.OPEN].indexOf(status) !== -1 && (element = _objectSpread2(_objectSpread2({}, element), floaterOpening)), status === STATUS2.CLOSING && (element = _objectSpread2(_objectSpread2({}, element), floaterClosing)), status === STATUS2.OPEN && !disableAnimation && (element = _objectSpread2(_objectSpread2({}, element), floaterWithAnimation)), placement === "center" && (element = _objectSpread2(_objectSpread2({}, element), floaterCentered)), component && (element = _objectSpread2(_objectSpread2({}, element), floaterWithComponent)), _objectSpread2(_objectSpread2({}, floater), element);
  } }, { key: "render", value: function() {
    var _this$props2 = this.props, component = _this$props2.component, closeFn = _this$props2.handleClick, hideArrow = _this$props2.hideArrow, setFloaterRef = _this$props2.setFloaterRef, status = _this$props2.status, output = {}, classes = ["__floater"];
    return component ? react_default.isValidElement(component) ? output.content = react_default.cloneElement(component, { closeFn }) : output.content = component({ closeFn }) : output.content = react_default.createElement(FloaterContainer, this.props), status === STATUS2.OPEN && classes.push("__floater__open"), hideArrow || (output.arrow = react_default.createElement(FloaterArrow, this.props)), react_default.createElement("div", { ref: setFloaterRef, className: classes.join(" "), style: this.style }, react_default.createElement("div", { className: "__floater__body" }, output.content, output.arrow));
  } }]), Floater2;
})(react_default.Component);
_defineProperty(Floater, "propTypes", { component: import_prop_types2.default.oneOfType([import_prop_types2.default.func, import_prop_types2.default.element]), content: import_prop_types2.default.node, disableAnimation: import_prop_types2.default.bool.isRequired, footer: import_prop_types2.default.node, handleClick: import_prop_types2.default.func.isRequired, hideArrow: import_prop_types2.default.bool.isRequired, open: import_prop_types2.default.bool, placement: import_prop_types2.default.string.isRequired, positionWrapper: import_prop_types2.default.bool.isRequired, setArrowRef: import_prop_types2.default.func.isRequired, setFloaterRef: import_prop_types2.default.func.isRequired, showCloseButton: import_prop_types2.default.bool, status: import_prop_types2.default.string.isRequired, styles: import_prop_types2.default.object.isRequired, title: import_prop_types2.default.node });
var ReactFloaterWrapper = (function(_React$Component) {
  _inherits(ReactFloaterWrapper2, _React$Component);
  var _super = _createSuper(ReactFloaterWrapper2);
  function ReactFloaterWrapper2() {
    return _classCallCheck(this, ReactFloaterWrapper2), _super.apply(this, arguments);
  }
  return _createClass(ReactFloaterWrapper2, [{ key: "render", value: function() {
    var _this$props = this.props, children = _this$props.children, handleClick = _this$props.handleClick, handleMouseEnter = _this$props.handleMouseEnter, handleMouseLeave = _this$props.handleMouseLeave, setChildRef = _this$props.setChildRef, setWrapperRef = _this$props.setWrapperRef, style = _this$props.style, styles2 = _this$props.styles, element;
    if (children)
      if (react_default.Children.count(children) === 1)
        if (!react_default.isValidElement(children))
          element = react_default.createElement("span", null, children);
        else {
          var refProp = esm_default.function(children.type) ? "innerRef" : "ref";
          element = react_default.cloneElement(react_default.Children.only(children), _defineProperty({}, refProp, setChildRef));
        }
      else
        element = children;
    return element ? react_default.createElement("span", { ref: setWrapperRef, style: _objectSpread2(_objectSpread2({}, styles2), style), onClick: handleClick, onMouseEnter: handleMouseEnter, onMouseLeave: handleMouseLeave }, element) : null;
  } }]), ReactFloaterWrapper2;
})(react_default.Component);
_defineProperty(ReactFloaterWrapper, "propTypes", { children: import_prop_types2.default.node, handleClick: import_prop_types2.default.func.isRequired, handleMouseEnter: import_prop_types2.default.func.isRequired, handleMouseLeave: import_prop_types2.default.func.isRequired, setChildRef: import_prop_types2.default.func.isRequired, setWrapperRef: import_prop_types2.default.func.isRequired, style: import_prop_types2.default.object, styles: import_prop_types2.default.object.isRequired });
var defaultOptions = { zIndex: 100 };
function getStyles(styles2) {
  var options2 = (0, import_deepmerge.default)(defaultOptions, styles2.options || {});
  return { wrapper: { cursor: "help", display: "inline-flex", flexDirection: "column", zIndex: options2.zIndex }, wrapperPosition: { left: -1e3, position: "absolute", top: -1e3, visibility: "hidden" }, floater: { display: "inline-block", filter: "drop-shadow(0 0 3px rgba(0, 0, 0, 0.3))", maxWidth: 300, opacity: 0, position: "relative", transition: "opacity 0.3s", visibility: "hidden", zIndex: options2.zIndex }, floaterOpening: { opacity: 1, visibility: "visible" }, floaterWithAnimation: { opacity: 1, transition: "opacity 0.3s, transform 0.2s", visibility: "visible" }, floaterWithComponent: { maxWidth: "100%" }, floaterClosing: { opacity: 0, visibility: "visible" }, floaterCentered: { left: "50%", position: "fixed", top: "50%", transform: "translate(-50%, -50%)" }, container: { backgroundColor: "#fff", color: "#666", minHeight: 60, minWidth: 200, padding: 20, position: "relative", zIndex: 10 }, title: { borderBottom: "1px solid #555", color: "#555", fontSize: 18, marginBottom: 5, paddingBottom: 6, paddingRight: 18 }, content: { fontSize: 15 }, close: { backgroundColor: "transparent", border: 0, borderRadius: 0, color: "#555", fontSize: 0, height: 15, outline: "none", padding: 10, position: "absolute", right: 0, top: 0, width: 15, WebkitAppearance: "none" }, footer: { borderTop: "1px solid #ccc", fontSize: 13, marginTop: 10, paddingTop: 5 }, arrow: { color: "#fff", display: "inline-flex", length: 16, margin: 8, position: "absolute", spread: 32 }, options: options2 };
}
var _excluded = ["arrow", "flip", "offset"], POSITIONING_PROPS = ["position", "top", "right", "bottom", "left"], ReactFloater = (function(_React$Component) {
  _inherits(ReactFloater2, _React$Component);
  var _super = _createSuper(ReactFloater2);
  function ReactFloater2(props) {
    var _this;
    return _classCallCheck(this, ReactFloater2), _this = _super.call(this, props), _defineProperty(_assertThisInitialized2(_this), "setArrowRef", function(ref) {
      _this.arrowRef = ref;
    }), _defineProperty(_assertThisInitialized2(_this), "setChildRef", function(ref) {
      _this.childRef = ref;
    }), _defineProperty(_assertThisInitialized2(_this), "setFloaterRef", function(ref) {
      _this.floaterRef = ref;
    }), _defineProperty(_assertThisInitialized2(_this), "setWrapperRef", function(ref) {
      _this.wrapperRef = ref;
    }), _defineProperty(_assertThisInitialized2(_this), "handleTransitionEnd", function() {
      var status = _this.state.status, callback = _this.props.callback;
      _this.wrapperPopper && _this.wrapperPopper.instance.update(), _this.setState({ status: status === STATUS2.OPENING ? STATUS2.OPEN : STATUS2.IDLE }, function() {
        var newStatus = _this.state.status;
        callback(newStatus === STATUS2.OPEN ? "open" : "close", _this.props);
      });
    }), _defineProperty(_assertThisInitialized2(_this), "handleClick", function() {
      var _this$props = _this.props, event = _this$props.event, open = _this$props.open;
      if (!esm_default.boolean(open)) {
        var _this$state = _this.state, positionWrapper = _this$state.positionWrapper, status = _this$state.status;
        (_this.event === "click" || _this.event === "hover" && positionWrapper) && (log({ title: "click", data: [{ event, status: status === STATUS2.OPEN ? "closing" : "opening" }], debug: _this.debug }), _this.toggle());
      }
    }), _defineProperty(_assertThisInitialized2(_this), "handleMouseEnter", function() {
      var _this$props2 = _this.props, event = _this$props2.event, open = _this$props2.open;
      if (!(esm_default.boolean(open) || isMobile())) {
        var status = _this.state.status;
        _this.event === "hover" && status === STATUS2.IDLE && (log({ title: "mouseEnter", data: [{ key: "originalEvent", value: event }], debug: _this.debug }), clearTimeout(_this.eventDelayTimeout), _this.toggle());
      }
    }), _defineProperty(_assertThisInitialized2(_this), "handleMouseLeave", function() {
      var _this$props3 = _this.props, event = _this$props3.event, eventDelay = _this$props3.eventDelay, open = _this$props3.open;
      if (!(esm_default.boolean(open) || isMobile())) {
        var _this$state2 = _this.state, status = _this$state2.status, positionWrapper = _this$state2.positionWrapper;
        _this.event === "hover" && (log({ title: "mouseLeave", data: [{ key: "originalEvent", value: event }], debug: _this.debug }), eventDelay ? [STATUS2.OPENING, STATUS2.OPEN].indexOf(status) !== -1 && !positionWrapper && !_this.eventDelayTimeout && (_this.eventDelayTimeout = setTimeout(function() {
          delete _this.eventDelayTimeout, _this.toggle();
        }, eventDelay * 1e3)) : _this.toggle(STATUS2.IDLE));
      }
    }), _this.state = { currentPlacement: props.placement, needsUpdate: !1, positionWrapper: props.wrapperOptions.position && !!props.target, status: STATUS2.INIT, statusWrapper: STATUS2.INIT }, _this._isMounted = !1, _this.hasMounted = !1, canUseDOM() && window.addEventListener("load", function() {
      _this.popper && _this.popper.instance.update(), _this.wrapperPopper && _this.wrapperPopper.instance.update();
    }), _this;
  }
  return _createClass(ReactFloater2, [{ key: "componentDidMount", value: function() {
    if (canUseDOM()) {
      var positionWrapper = this.state.positionWrapper, _this$props5 = this.props, children = _this$props5.children, open = _this$props5.open, target = _this$props5.target;
      this._isMounted = !0, log({ title: "init", data: { hasChildren: !!children, hasTarget: !!target, isControlled: esm_default.boolean(open), positionWrapper, target: this.target, floater: this.floaterRef }, debug: this.debug }), this.hasMounted || (this.initPopper(), this.hasMounted = !0), !children && target && esm_default.boolean(open);
    }
  } }, { key: "componentDidUpdate", value: function(prevProps, prevState) {
    if (canUseDOM()) {
      var _this$props6 = this.props, autoOpen = _this$props6.autoOpen, open = _this$props6.open, target = _this$props6.target, wrapperOptions = _this$props6.wrapperOptions, _treeChanges = treeChanges2(prevState, this.state), changedFrom = _treeChanges.changedFrom, changed = _treeChanges.changed;
      if (prevProps.open !== open) {
        var forceStatus;
        esm_default.boolean(open) && (forceStatus = open ? STATUS2.OPENING : STATUS2.CLOSING), this.toggle(forceStatus);
      }
      (prevProps.wrapperOptions.position !== wrapperOptions.position || prevProps.target !== target) && this.changeWrapperPosition(this.props), changed("status", STATUS2.IDLE) && open ? this.toggle(STATUS2.OPEN) : changedFrom("status", STATUS2.INIT, STATUS2.IDLE) && autoOpen && this.toggle(STATUS2.OPEN), this.popper && changed("status", STATUS2.OPENING) && this.popper.instance.update(), this.floaterRef && (changed("status", STATUS2.OPENING) || changed("status", STATUS2.CLOSING)) && once3(this.floaterRef, "transitionend", this.handleTransitionEnd), changed("needsUpdate", !0) && this.rebuildPopper();
    }
  } }, { key: "componentWillUnmount", value: function() {
    canUseDOM() && (this._isMounted = !1, this.popper && this.popper.instance.destroy(), this.wrapperPopper && this.wrapperPopper.instance.destroy());
  } }, { key: "initPopper", value: function() {
    var _this2 = this, target = arguments.length > 0 && arguments[0] !== void 0 ? arguments[0] : this.target, positionWrapper = this.state.positionWrapper, _this$props7 = this.props, disableFlip = _this$props7.disableFlip, getPopper = _this$props7.getPopper, hideArrow = _this$props7.hideArrow, offset2 = _this$props7.offset, placement = _this$props7.placement, wrapperOptions = _this$props7.wrapperOptions, flipBehavior = placement === "top" || placement === "bottom" ? "flip" : ["right", "bottom-end", "top-end", "left", "top-start", "bottom-start"];
    if (placement === "center")
      this.setState({ status: STATUS2.IDLE });
    else if (target && this.floaterRef) {
      var _this$options = this.options, arrow2 = _this$options.arrow, flip2 = _this$options.flip, offsetOptions = _this$options.offset, rest2 = _objectWithoutProperties(_this$options, _excluded);
      new popper_default(target, this.floaterRef, { placement, modifiers: _objectSpread2({ arrow: _objectSpread2({ enabled: !hideArrow, element: this.arrowRef }, arrow2), flip: _objectSpread2({ enabled: !disableFlip, behavior: flipBehavior }, flip2), offset: _objectSpread2({ offset: "0, ".concat(offset2, "px") }, offsetOptions) }, rest2), onCreate: function(data) {
        var _this2$floaterRef;
        if (_this2.popper = data, !((_this2$floaterRef = _this2.floaterRef) !== null && _this2$floaterRef !== void 0 && _this2$floaterRef.isConnected)) {
          _this2.setState({ needsUpdate: !0 });
          return;
        }
        getPopper(data, "floater"), _this2._isMounted && _this2.setState({ currentPlacement: data.placement, status: STATUS2.IDLE }), placement !== data.placement && setTimeout(function() {
          data.instance.update();
        }, 1);
      }, onUpdate: function(data) {
        _this2.popper = data;
        var currentPlacement = _this2.state.currentPlacement;
        _this2._isMounted && data.placement !== currentPlacement && _this2.setState({ currentPlacement: data.placement });
      } });
    }
    if (positionWrapper) {
      var wrapperOffset = esm_default.undefined(wrapperOptions.offset) ? 0 : wrapperOptions.offset;
      new popper_default(this.target, this.wrapperRef, { placement: wrapperOptions.placement || placement, modifiers: { arrow: { enabled: !1 }, offset: { offset: "0, ".concat(wrapperOffset, "px") }, flip: { enabled: !1 } }, onCreate: function(data) {
        _this2.wrapperPopper = data, _this2._isMounted && _this2.setState({ statusWrapper: STATUS2.IDLE }), getPopper(data, "wrapper"), placement !== data.placement && setTimeout(function() {
          data.instance.update();
        }, 1);
      } });
    }
  } }, { key: "rebuildPopper", value: function() {
    var _this3 = this;
    this.floaterRefInterval = setInterval(function() {
      var _this3$floaterRef;
      (_this3$floaterRef = _this3.floaterRef) !== null && _this3$floaterRef !== void 0 && _this3$floaterRef.isConnected && (clearInterval(_this3.floaterRefInterval), _this3.setState({ needsUpdate: !1 }), _this3.initPopper());
    }, 50);
  } }, { key: "changeWrapperPosition", value: function(_ref) {
    var target = _ref.target, wrapperOptions = _ref.wrapperOptions;
    this.setState({ positionWrapper: wrapperOptions.position && !!target });
  } }, { key: "toggle", value: function(forceStatus) {
    var status = this.state.status, nextStatus = status === STATUS2.OPEN ? STATUS2.CLOSING : STATUS2.OPENING;
    esm_default.undefined(forceStatus) || (nextStatus = forceStatus), this.setState({ status: nextStatus });
  } }, { key: "debug", get: function() {
    var debug = this.props.debug;
    return debug || canUseDOM() && "ReactFloaterDebug" in window && !!window.ReactFloaterDebug;
  } }, { key: "event", get: function() {
    var _this$props8 = this.props, disableHoverToClick = _this$props8.disableHoverToClick, event = _this$props8.event;
    return event === "hover" && isMobile() && !disableHoverToClick ? "click" : event;
  } }, { key: "options", get: function() {
    var options2 = this.props.options;
    return (0, import_deepmerge.default)(DEFAULTS, options2 || {});
  } }, { key: "styles", get: function() {
    var _this4 = this, _this$state3 = this.state, status = _this$state3.status, positionWrapper = _this$state3.positionWrapper, statusWrapper = _this$state3.statusWrapper, styles2 = this.props.styles, nextStyles = (0, import_deepmerge.default)(getStyles(styles2), styles2);
    if (positionWrapper) {
      var wrapperStyles;
      [STATUS2.IDLE].indexOf(status) === -1 || [STATUS2.IDLE].indexOf(statusWrapper) === -1 ? wrapperStyles = nextStyles.wrapperPosition : wrapperStyles = this.wrapperPopper.styles, nextStyles.wrapper = _objectSpread2(_objectSpread2({}, nextStyles.wrapper), wrapperStyles);
    }
    if (this.target) {
      var targetStyles = window.getComputedStyle(this.target);
      this.wrapperStyles ? nextStyles.wrapper = _objectSpread2(_objectSpread2({}, nextStyles.wrapper), this.wrapperStyles) : ["relative", "static"].indexOf(targetStyles.position) === -1 && (this.wrapperStyles = {}, positionWrapper || (POSITIONING_PROPS.forEach(function(d2) {
        _this4.wrapperStyles[d2] = targetStyles[d2];
      }), nextStyles.wrapper = _objectSpread2(_objectSpread2({}, nextStyles.wrapper), this.wrapperStyles), this.target.style.position = "relative", this.target.style.top = "auto", this.target.style.right = "auto", this.target.style.bottom = "auto", this.target.style.left = "auto"));
    }
    return nextStyles;
  } }, { key: "target", get: function() {
    if (!canUseDOM()) return null;
    var target = this.props.target;
    return target ? esm_default.domElement(target) ? target : document.querySelector(target) : this.childRef || this.wrapperRef;
  } }, { key: "render", value: function() {
    var _this$state4 = this.state, currentPlacement = _this$state4.currentPlacement, positionWrapper = _this$state4.positionWrapper, status = _this$state4.status, _this$props9 = this.props, children = _this$props9.children, component = _this$props9.component, content = _this$props9.content, disableAnimation = _this$props9.disableAnimation, footer = _this$props9.footer, hideArrow = _this$props9.hideArrow, id = _this$props9.id, open = _this$props9.open, showCloseButton = _this$props9.showCloseButton, style = _this$props9.style, target = _this$props9.target, title2 = _this$props9.title, wrapper = react_default.createElement(ReactFloaterWrapper, { handleClick: this.handleClick, handleMouseEnter: this.handleMouseEnter, handleMouseLeave: this.handleMouseLeave, setChildRef: this.setChildRef, setWrapperRef: this.setWrapperRef, style, styles: this.styles.wrapper }, children), output = {};
    return positionWrapper ? output.wrapperInPortal = wrapper : output.wrapperAsChildren = wrapper, react_default.createElement("span", null, react_default.createElement(ReactFloaterPortal, { hasChildren: !!children, id, placement: currentPlacement, setRef: this.setFloaterRef, target, zIndex: this.styles.options.zIndex }, react_default.createElement(Floater, { component, content, disableAnimation, footer, handleClick: this.handleClick, hideArrow: hideArrow || currentPlacement === "center", open, placement: currentPlacement, positionWrapper, setArrowRef: this.setArrowRef, setFloaterRef: this.setFloaterRef, showCloseButton, status, styles: this.styles, title: title2 }), output.wrapperInPortal), output.wrapperAsChildren);
  } }]), ReactFloater2;
})(react_default.Component);
_defineProperty(ReactFloater, "propTypes", { autoOpen: import_prop_types2.default.bool, callback: import_prop_types2.default.func, children: import_prop_types2.default.node, component: isRequiredIf(import_prop_types2.default.oneOfType([import_prop_types2.default.func, import_prop_types2.default.element]), function(props) {
  return !props.content;
}), content: isRequiredIf(import_prop_types2.default.node, function(props) {
  return !props.component;
}), debug: import_prop_types2.default.bool, disableAnimation: import_prop_types2.default.bool, disableFlip: import_prop_types2.default.bool, disableHoverToClick: import_prop_types2.default.bool, event: import_prop_types2.default.oneOf(["hover", "click"]), eventDelay: import_prop_types2.default.number, footer: import_prop_types2.default.node, getPopper: import_prop_types2.default.func, hideArrow: import_prop_types2.default.bool, id: import_prop_types2.default.oneOfType([import_prop_types2.default.string, import_prop_types2.default.number]), offset: import_prop_types2.default.number, open: import_prop_types2.default.bool, options: import_prop_types2.default.object, placement: import_prop_types2.default.oneOf(["top", "top-start", "top-end", "bottom", "bottom-start", "bottom-end", "left", "left-start", "left-end", "right", "right-start", "right-end", "auto", "center"]), showCloseButton: import_prop_types2.default.bool, style: import_prop_types2.default.object, styles: import_prop_types2.default.object, target: import_prop_types2.default.oneOfType([import_prop_types2.default.object, import_prop_types2.default.string]), title: import_prop_types2.default.node, wrapperOptions: import_prop_types2.default.shape({ offset: import_prop_types2.default.number, placement: import_prop_types2.default.oneOf(["top", "top-start", "top-end", "bottom", "bottom-start", "bottom-end", "left", "left-start", "left-end", "right", "right-start", "right-end", "auto"]), position: import_prop_types2.default.bool }) });
_defineProperty(ReactFloater, "defaultProps", { autoOpen: !1, callback: noop2, debug: !1, disableAnimation: !1, disableFlip: !1, disableHoverToClick: !1, event: "click", eventDelay: 0.4, getPopper: noop2, hideArrow: !1, offset: 15, placement: "bottom", showCloseButton: !1, styles: {}, target: null, wrapperOptions: { position: !1 } });

// ../node_modules/react-joyride/dist/index.mjs
var __defProp3 = Object.defineProperty, __defNormalProp2 = (obj, key, value) => key in obj ? __defProp3(obj, key, { enumerable: !0, configurable: !0, writable: !0, value }) : obj[key] = value, __publicField = (obj, key, value) => __defNormalProp2(obj, typeof key != "symbol" ? key + "" : key, value), ACTIONS = {
  INIT: "init",
  START: "start",
  STOP: "stop",
  RESET: "reset",
  PREV: "prev",
  NEXT: "next",
  GO: "go",
  CLOSE: "close",
  SKIP: "skip",
  UPDATE: "update"
}, EVENTS = {
  TOUR_START: "tour:start",
  STEP_BEFORE: "step:before",
  BEACON: "beacon",
  TOOLTIP: "tooltip",
  STEP_AFTER: "step:after",
  TOUR_END: "tour:end",
  TOUR_STATUS: "tour:status",
  TARGET_NOT_FOUND: "error:target_not_found",
  ERROR: "error"
}, LIFECYCLE = {
  INIT: "init",
  READY: "ready",
  BEACON: "beacon",
  TOOLTIP: "tooltip",
  COMPLETE: "complete",
  ERROR: "error"
};
var STATUS3 = {
  IDLE: "idle",
  READY: "ready",
  WAITING: "waiting",
  RUNNING: "running",
  PAUSED: "paused",
  SKIPPED: "skipped",
  FINISHED: "finished",
  ERROR: "error"
};
function canUseDOM2() {
  var _a;
  return !!(typeof window < "u" && ((_a = window.document) != null && _a.createElement));
}
function getClientRect2(element) {
  return element ? element.getBoundingClientRect() : null;
}
function getDocumentHeight(median = !1) {
  let { body, documentElement } = document;
  if (!body || !documentElement)
    return 0;
  if (median) {
    let heights = [
      body.scrollHeight,
      body.offsetHeight,
      documentElement.clientHeight,
      documentElement.scrollHeight,
      documentElement.offsetHeight
    ].sort((a2, b2) => a2 - b2), middle = Math.floor(heights.length / 2);
    return heights.length % 2 === 0 ? (heights[middle - 1] + heights[middle]) / 2 : heights[middle];
  }
  return Math.max(
    body.scrollHeight,
    body.offsetHeight,
    documentElement.clientHeight,
    documentElement.scrollHeight,
    documentElement.offsetHeight
  );
}
function getElement(element) {
  if (typeof element == "string")
    try {
      return document.querySelector(element);
    } catch {
      return null;
    }
  return element;
}
function getStyleComputedProperty2(el) {
  return !el || el.nodeType !== 1 ? null : getComputedStyle(el);
}
function getScrollParent2(element, skipFix, forListener) {
  if (!element)
    return scrollDocument();
  let parent = (0, import_scrollparent.default)(element);
  if (parent) {
    if (parent.isSameNode(scrollDocument()))
      return forListener ? document : scrollDocument();
    if (!(parent.scrollHeight > parent.offsetHeight) && !skipFix)
      return parent.style.overflow = "initial", scrollDocument();
  }
  return parent;
}
function hasCustomScrollParent(element, skipFix) {
  if (!element)
    return !1;
  let parent = getScrollParent2(element, skipFix);
  return parent ? !parent.isSameNode(scrollDocument()) : !1;
}
function hasCustomOffsetParent(element) {
  return element.offsetParent !== document.body;
}
function hasPosition(el, type = "fixed") {
  if (!el || !(el instanceof HTMLElement))
    return !1;
  let { nodeName } = el, styles2 = getStyleComputedProperty2(el);
  return nodeName === "BODY" || nodeName === "HTML" ? !1 : styles2 && styles2.position === type ? !0 : el.parentNode ? hasPosition(el.parentNode, type) : !1;
}
function isElementVisible(element) {
  var _a;
  if (!element)
    return !1;
  let parentElement = element;
  for (; parentElement && parentElement !== document.body; ) {
    if (parentElement instanceof HTMLElement) {
      let { display, visibility } = getComputedStyle(parentElement);
      if (display === "none" || visibility === "hidden")
        return !1;
    }
    parentElement = (_a = parentElement.parentElement) != null ? _a : null;
  }
  return !0;
}
function getElementPosition(element, offset2, skipFix) {
  var _a, _b, _c;
  let elementRect = getClientRect2(element), parent = getScrollParent2(element, skipFix), hasScrollParent = hasCustomScrollParent(element, skipFix), isFixedTarget = hasPosition(element), parentTop = 0, top = (_a = elementRect?.top) != null ? _a : 0;
  if (hasScrollParent && isFixedTarget) {
    let offsetTop = (_b = element?.offsetTop) != null ? _b : 0, parentScrollTop = (_c = parent?.scrollTop) != null ? _c : 0;
    top = offsetTop - parentScrollTop;
  } else parent instanceof HTMLElement && (parentTop = parent.scrollTop, !hasScrollParent && !hasPosition(element) && (top += parentTop), parent.isSameNode(scrollDocument()) || (top += scrollDocument().scrollTop));
  return Math.floor(top - offset2);
}
function getScrollTo(element, offset2, skipFix) {
  var _a;
  if (!element)
    return 0;
  let { offsetTop = 0, scrollTop = 0 } = (_a = (0, import_scrollparent.default)(element)) != null ? _a : {}, top = element.getBoundingClientRect().top + scrollTop;
  offsetTop && (hasCustomScrollParent(element, skipFix) || hasCustomOffsetParent(element)) && (top -= offsetTop);
  let output = Math.floor(top - offset2);
  return output < 0 ? 0 : output;
}
function scrollDocument() {
  var _a;
  return (_a = document.scrollingElement) != null ? _a : document.documentElement;
}
function scrollTo(value, options2) {
  let { duration, element } = options2;
  return new Promise((resolve, reject) => {
    let { scrollTop } = element, limit = value > scrollTop ? value - scrollTop : scrollTop - value;
    import_scroll.default.top(element, value, { duration: limit < 100 ? 50 : duration }, (error) => error && error.message !== "Element already at target scroll position" ? reject(error) : resolve());
  });
}
var isReact162 = createPortal !== void 0;
function getBrowser(userAgent = navigator.userAgent) {
  let browser = userAgent;
  return typeof window > "u" ? browser = "node" : document.documentMode ? browser = "ie" : /Edge/.test(userAgent) ? browser = "edge" : window.opera || userAgent.includes(" OPR/") ? browser = "opera" : typeof window.InstallTrigger < "u" ? browser = "firefox" : window.chrome ? browser = "chrome" : /(Version\/([\d._]+).*Safari|CriOS|FxiOS| Mobile\/)/.test(userAgent) && (browser = "safari"), browser;
}
function getObjectType4(value) {
  return Object.prototype.toString.call(value).slice(8, -1).toLowerCase();
}
function getReactNodeText(input, options2 = {}) {
  let { defaultValue, step, steps } = options2, text = (0, import_react_innertext.default)(input);
  if (text)
    (text.includes("{step}") || text.includes("{steps}")) && step && steps && (text = text.replace("{step}", step.toString()).replace("{steps}", steps.toString()));
  else if (isValidElement(input) && !Object.values(input.props).length && getObjectType4(input.type) === "function") {
    let component = input.type({});
    text = getReactNodeText(component, options2);
  } else
    text = (0, import_react_innertext.default)(defaultValue);
  return text;
}
function hasValidKeys(object, keys) {
  return !src_default.plainObject(object) || !src_default.array(keys) ? !1 : Object.keys(object).every((d2) => keys.includes(d2));
}
function hexToRGB(hex) {
  let shorthandRegex = /^#?([\da-f])([\da-f])([\da-f])$/i, properHex = hex.replace(shorthandRegex, (_m, r3, g2, b2) => r3 + r3 + g2 + g2 + b2 + b2), result = /^#?([\da-f]{2})([\da-f]{2})([\da-f]{2})$/i.exec(properHex);
  return result ? [parseInt(result[1], 16), parseInt(result[2], 16), parseInt(result[3], 16)] : [];
}
function hideBeacon(step) {
  return step.disableBeacon || step.placement === "center";
}
function isLegacy() {
  return !["chrome", "safari", "firefox", "opera"].includes(getBrowser());
}
function log2({ data, debug = !1, title: title2, warn = !1 }) {
  let logFn = warn ? console.warn || console.error : console.log;
  debug && (title2 && data ? (console.groupCollapsed(
    `%creact-joyride: ${title2}`,
    "color: #ff0044; font-weight: bold; font-size: 12px;"
  ), Array.isArray(data) ? data.forEach((d2) => {
    src_default.plainObject(d2) && d2.key ? logFn.apply(console, [d2.key, d2.value]) : logFn.apply(console, [d2]);
  }) : logFn.apply(console, [data]), console.groupEnd()) : console.error("Missing title or data props"));
}
function objectKeys(input) {
  return Object.keys(input);
}
function omit(input, ...filter) {
  if (!src_default.plainObject(input))
    throw new TypeError("Expected an object");
  let output = {};
  for (let key in input)
    ({}).hasOwnProperty.call(input, key) && (filter.includes(key) || (output[key] = input[key]));
  return output;
}
function pick(input, ...filter) {
  if (!src_default.plainObject(input))
    throw new TypeError("Expected an object");
  if (!filter.length)
    return input;
  let output = {};
  for (let key in input)
    ({}).hasOwnProperty.call(input, key) && filter.includes(key) && (output[key] = input[key]);
  return output;
}
function replaceLocaleContent(input, step, steps) {
  let replacer = (text) => text.replace("{step}", String(step)).replace("{steps}", String(steps));
  if (getObjectType4(input) === "string")
    return replacer(input);
  if (!isValidElement(input))
    return input;
  let { children } = input.props;
  if (getObjectType4(children) === "string" && children.includes("{step}"))
    return cloneElement(input, {
      children: replacer(children)
    });
  if (Array.isArray(children))
    return cloneElement(input, {
      children: children.map((child) => typeof child == "string" ? replacer(child) : replaceLocaleContent(child, step, steps))
    });
  if (getObjectType4(input.type) === "function" && !Object.values(input.props).length) {
    let component = input.type({});
    return replaceLocaleContent(component, step, steps);
  }
  return input;
}
function shouldScroll(options2) {
  let { isFirstStep, lifecycle, previousLifecycle, scrollToFirstStep, step, target } = options2;
  return !step.disableScrolling && (!isFirstStep || scrollToFirstStep || lifecycle === LIFECYCLE.TOOLTIP) && step.placement !== "center" && (!step.isFixed || !hasPosition(target)) && // fixed steps don't need to scroll
  previousLifecycle !== lifecycle && [LIFECYCLE.BEACON, LIFECYCLE.TOOLTIP].includes(lifecycle);
}
var defaultFloaterProps = {
  options: {
    preventOverflow: {
      boundariesElement: "scrollParent"
    }
  },
  wrapperOptions: {
    offset: -18,
    position: !0
  }
}, defaultLocale = {
  back: "Back",
  close: "Close",
  last: "Last",
  next: "Next",
  nextLabelWithProgress: "Next (Step {step} of {steps})",
  open: "Open the dialog",
  skip: "Skip"
}, defaultStep = {
  event: "click",
  placement: "bottom",
  offset: 10,
  disableBeacon: !1,
  disableCloseOnEsc: !1,
  disableOverlay: !1,
  disableOverlayClose: !1,
  disableScrollParentFix: !1,
  disableScrolling: !1,
  hideBackButton: !1,
  hideCloseButton: !1,
  hideFooter: !1,
  isFixed: !1,
  locale: defaultLocale,
  showProgress: !1,
  showSkipButton: !1,
  spotlightClicks: !1,
  spotlightPadding: 10
}, defaultProps = {
  continuous: !1,
  debug: !1,
  disableCloseOnEsc: !1,
  disableOverlay: !1,
  disableOverlayClose: !1,
  disableScrolling: !1,
  disableScrollParentFix: !1,
  getHelpers: void 0,
  hideBackButton: !1,
  run: !0,
  scrollOffset: 20,
  scrollDuration: 300,
  scrollToFirstStep: !1,
  showSkipButton: !1,
  showProgress: !1,
  spotlightClicks: !1,
  spotlightPadding: 10,
  steps: []
}, defaultOptions2 = {
  arrowColor: "#fff",
  backgroundColor: "#fff",
  beaconSize: 36,
  overlayColor: "rgba(0, 0, 0, 0.5)",
  primaryColor: "#f04",
  spotlightShadow: "0 0 15px rgba(0, 0, 0, 0.5)",
  textColor: "#333",
  width: 380,
  zIndex: 100
}, buttonBase = {
  backgroundColor: "transparent",
  border: 0,
  borderRadius: 0,
  color: "#555",
  cursor: "pointer",
  fontSize: 16,
  lineHeight: 1,
  padding: 8,
  WebkitAppearance: "none"
}, spotlight = {
  borderRadius: 4,
  position: "absolute"
};
function getStyles2(props, step) {
  var _a, _b, _c, _d, _e;
  let { floaterProps, styles: styles2 } = props, mergedFloaterProps = (0, import_deepmerge3.default)((_a = step.floaterProps) != null ? _a : {}, floaterProps ?? {}), mergedStyles = (0, import_deepmerge3.default)(styles2 ?? {}, (_b = step.styles) != null ? _b : {}), options2 = (0, import_deepmerge3.default)(defaultOptions2, mergedStyles.options || {}), hideBeacon2 = step.placement === "center" || step.disableBeacon, { width } = options2;
  window.innerWidth > 480 && (width = 380), "width" in options2 && (width = typeof options2.width == "number" && window.innerWidth < options2.width ? window.innerWidth - 30 : options2.width);
  let overlay = {
    bottom: 0,
    left: 0,
    overflow: "hidden",
    position: "absolute",
    right: 0,
    top: 0,
    zIndex: options2.zIndex
  }, defaultStyles = {
    beacon: {
      ...buttonBase,
      display: hideBeacon2 ? "none" : "inline-block",
      height: options2.beaconSize,
      position: "relative",
      width: options2.beaconSize,
      zIndex: options2.zIndex
    },
    beaconInner: {
      animation: "joyride-beacon-inner 1.2s infinite ease-in-out",
      backgroundColor: options2.primaryColor,
      borderRadius: "50%",
      display: "block",
      height: "50%",
      left: "50%",
      opacity: 0.7,
      position: "absolute",
      top: "50%",
      transform: "translate(-50%, -50%)",
      width: "50%"
    },
    beaconOuter: {
      animation: "joyride-beacon-outer 1.2s infinite ease-in-out",
      backgroundColor: `rgba(${hexToRGB(options2.primaryColor).join(",")}, 0.2)`,
      border: `2px solid ${options2.primaryColor}`,
      borderRadius: "50%",
      boxSizing: "border-box",
      display: "block",
      height: "100%",
      left: 0,
      opacity: 0.9,
      position: "absolute",
      top: 0,
      transformOrigin: "center",
      width: "100%"
    },
    tooltip: {
      backgroundColor: options2.backgroundColor,
      borderRadius: 5,
      boxSizing: "border-box",
      color: options2.textColor,
      fontSize: 16,
      maxWidth: "100%",
      padding: 15,
      position: "relative",
      width
    },
    tooltipContainer: {
      lineHeight: 1.4,
      textAlign: "center"
    },
    tooltipTitle: {
      fontSize: 18,
      margin: 0
    },
    tooltipContent: {
      padding: "20px 10px"
    },
    tooltipFooter: {
      alignItems: "center",
      display: "flex",
      justifyContent: "flex-end",
      marginTop: 15
    },
    tooltipFooterSpacer: {
      flex: 1
    },
    buttonNext: {
      ...buttonBase,
      backgroundColor: options2.primaryColor,
      borderRadius: 4,
      color: "#fff"
    },
    buttonBack: {
      ...buttonBase,
      color: options2.primaryColor,
      marginLeft: "auto",
      marginRight: 5
    },
    buttonClose: {
      ...buttonBase,
      color: options2.textColor,
      height: 14,
      padding: 15,
      position: "absolute",
      right: 0,
      top: 0,
      width: 14
    },
    buttonSkip: {
      ...buttonBase,
      color: options2.textColor,
      fontSize: 14
    },
    overlay: {
      ...overlay,
      backgroundColor: options2.overlayColor,
      mixBlendMode: "hard-light"
    },
    overlayLegacy: {
      ...overlay
    },
    overlayLegacyCenter: {
      ...overlay,
      backgroundColor: options2.overlayColor
    },
    spotlight: {
      ...spotlight,
      backgroundColor: "gray"
    },
    spotlightLegacy: {
      ...spotlight,
      boxShadow: `0 0 0 9999px ${options2.overlayColor}, ${options2.spotlightShadow}`
    },
    floaterStyles: {
      arrow: {
        color: (_e = (_d = (_c = mergedFloaterProps?.styles) == null ? void 0 : _c.arrow) == null ? void 0 : _d.color) != null ? _e : options2.arrowColor
      },
      options: {
        zIndex: options2.zIndex + 100
      }
    },
    options: options2
  };
  return (0, import_deepmerge3.default)(defaultStyles, mergedStyles);
}
function getTourProps(props) {
  return pick(
    props,
    "beaconComponent",
    "disableCloseOnEsc",
    "disableOverlay",
    "disableOverlayClose",
    "disableScrolling",
    "disableScrollParentFix",
    "floaterProps",
    "hideBackButton",
    "hideCloseButton",
    "locale",
    "showProgress",
    "showSkipButton",
    "spotlightClicks",
    "spotlightPadding",
    "styles",
    "tooltipComponent"
  );
}
function getMergedStep(props, currentStep) {
  var _a, _b, _c, _d, _e, _f;
  let step = currentStep ?? {}, mergedStep = import_deepmerge2.default.all([defaultStep, getTourProps(props), step], {
    isMergeableObject: src_default.plainObject
  }), mergedStyles = getStyles2(props, mergedStep), scrollParent2 = hasCustomScrollParent(
    getElement(mergedStep.target),
    mergedStep.disableScrollParentFix
  ), floaterProps = import_deepmerge2.default.all([
    defaultFloaterProps,
    (_a = props.floaterProps) != null ? _a : {},
    (_b = mergedStep.floaterProps) != null ? _b : {}
  ]);
  return floaterProps.offset = mergedStep.offset, floaterProps.styles = (0, import_deepmerge2.default)((_c = floaterProps.styles) != null ? _c : {}, mergedStyles.floaterStyles), floaterProps.offset += (_e = (_d = props.spotlightPadding) != null ? _d : mergedStep.spotlightPadding) != null ? _e : 0, mergedStep.placementBeacon && floaterProps.wrapperOptions && (floaterProps.wrapperOptions.placement = mergedStep.placementBeacon), scrollParent2 && floaterProps.options.preventOverflow && (floaterProps.options.preventOverflow.boundariesElement = "window"), {
    ...mergedStep,
    locale: import_deepmerge2.default.all([defaultLocale, (_f = props.locale) != null ? _f : {}, mergedStep.locale || {}]),
    floaterProps,
    styles: omit(mergedStyles, "floaterStyles")
  };
}
function validateStep(step, debug = !1) {
  return src_default.plainObject(step) ? step.target ? !0 : (log2({
    title: "validateStep",
    data: "target is missing from the step",
    warn: !0,
    debug
  }), !1) : (log2({
    title: "validateStep",
    data: "step must be an object",
    warn: !0,
    debug
  }), !1);
}
function validateSteps(steps, debug = !1) {
  return src_default.array(steps) ? steps.every((d2) => validateStep(d2, debug)) : (log2({
    title: "validateSteps",
    data: "steps must be an array",
    warn: !0,
    debug
  }), !1);
}
var defaultState = {
  action: "init",
  controlled: !1,
  index: 0,
  lifecycle: LIFECYCLE.INIT,
  origin: null,
  size: 0,
  status: STATUS3.IDLE
}, validKeys = objectKeys(omit(defaultState, "controlled", "size")), Store = class {
  constructor(options2) {
    __publicField(this, "beaconPopper"), __publicField(this, "tooltipPopper"), __publicField(this, "data", /* @__PURE__ */ new Map()), __publicField(this, "listener"), __publicField(this, "store", /* @__PURE__ */ new Map()), __publicField(this, "addListener", (listener) => {
      this.listener = listener;
    }), __publicField(this, "setSteps", (steps2) => {
      let { size, status } = this.getState(), state = {
        size: steps2.length,
        status
      };
      this.data.set("steps", steps2), status === STATUS3.WAITING && !size && steps2.length && (state.status = STATUS3.RUNNING), this.setState(state);
    }), __publicField(this, "getPopper", (name) => name === "beacon" ? this.beaconPopper : this.tooltipPopper), __publicField(this, "setPopper", (name, popper) => {
      name === "beacon" ? this.beaconPopper = popper : this.tooltipPopper = popper;
    }), __publicField(this, "cleanupPoppers", () => {
      this.beaconPopper = null, this.tooltipPopper = null;
    }), __publicField(this, "close", (origin = null) => {
      let { index, status } = this.getState();
      status === STATUS3.RUNNING && this.setState({
        ...this.getNextState({ action: ACTIONS.CLOSE, index: index + 1, origin })
      });
    }), __publicField(this, "go", (nextIndex) => {
      let { controlled, status } = this.getState();
      if (controlled || status !== STATUS3.RUNNING)
        return;
      let step = this.getSteps()[nextIndex];
      this.setState({
        ...this.getNextState({ action: ACTIONS.GO, index: nextIndex }),
        status: step ? status : STATUS3.FINISHED
      });
    }), __publicField(this, "info", () => this.getState()), __publicField(this, "next", () => {
      let { index, status } = this.getState();
      status === STATUS3.RUNNING && this.setState(this.getNextState({ action: ACTIONS.NEXT, index: index + 1 }));
    }), __publicField(this, "open", () => {
      let { status } = this.getState();
      status === STATUS3.RUNNING && this.setState({
        ...this.getNextState({ action: ACTIONS.UPDATE, lifecycle: LIFECYCLE.TOOLTIP })
      });
    }), __publicField(this, "prev", () => {
      let { index, status } = this.getState();
      status === STATUS3.RUNNING && this.setState({
        ...this.getNextState({ action: ACTIONS.PREV, index: index - 1 })
      });
    }), __publicField(this, "reset", (restart = !1) => {
      let { controlled } = this.getState();
      controlled || this.setState({
        ...this.getNextState({ action: ACTIONS.RESET, index: 0 }),
        status: restart ? STATUS3.RUNNING : STATUS3.READY
      });
    }), __publicField(this, "skip", () => {
      let { status } = this.getState();
      status === STATUS3.RUNNING && this.setState({
        action: ACTIONS.SKIP,
        lifecycle: LIFECYCLE.INIT,
        status: STATUS3.SKIPPED
      });
    }), __publicField(this, "start", (nextIndex) => {
      let { index, size } = this.getState();
      this.setState({
        ...this.getNextState(
          {
            action: ACTIONS.START,
            index: src_default.number(nextIndex) ? nextIndex : index
          },
          !0
        ),
        status: size ? STATUS3.RUNNING : STATUS3.WAITING
      });
    }), __publicField(this, "stop", (advance = !1) => {
      let { index, status } = this.getState();
      [STATUS3.FINISHED, STATUS3.SKIPPED].includes(status) || this.setState({
        ...this.getNextState({ action: ACTIONS.STOP, index: index + (advance ? 1 : 0) }),
        status: STATUS3.PAUSED
      });
    }), __publicField(this, "update", (state) => {
      var _a, _b;
      if (!hasValidKeys(state, validKeys))
        throw new Error(`State is not valid. Valid keys: ${validKeys.join(", ")}`);
      this.setState({
        ...this.getNextState(
          {
            ...this.getState(),
            ...state,
            action: (_a = state.action) != null ? _a : ACTIONS.UPDATE,
            origin: (_b = state.origin) != null ? _b : null
          },
          !0
        )
      });
    });
    let { continuous = !1, stepIndex, steps = [] } = options2 ?? {};
    this.setState(
      {
        action: ACTIONS.INIT,
        controlled: src_default.number(stepIndex),
        continuous,
        index: src_default.number(stepIndex) ? stepIndex : 0,
        lifecycle: LIFECYCLE.INIT,
        origin: null,
        status: steps.length ? STATUS3.READY : STATUS3.IDLE
      },
      !0
    ), this.beaconPopper = null, this.tooltipPopper = null, this.listener = null, this.setSteps(steps);
  }
  getState() {
    return this.store.size ? {
      action: this.store.get("action") || "",
      controlled: this.store.get("controlled") || !1,
      index: parseInt(this.store.get("index"), 10),
      lifecycle: this.store.get("lifecycle") || "",
      origin: this.store.get("origin") || null,
      size: this.store.get("size") || 0,
      status: this.store.get("status") || ""
    } : { ...defaultState };
  }
  getNextState(state, force = !1) {
    var _a, _b, _c, _d, _e;
    let { action, controlled, index, size, status } = this.getState(), newIndex = src_default.number(state.index) ? state.index : index, nextIndex = controlled && !force ? index : Math.min(Math.max(newIndex, 0), size);
    return {
      action: (_a = state.action) != null ? _a : action,
      controlled,
      index: nextIndex,
      lifecycle: (_b = state.lifecycle) != null ? _b : LIFECYCLE.INIT,
      origin: (_c = state.origin) != null ? _c : null,
      size: (_d = state.size) != null ? _d : size,
      status: nextIndex === size ? STATUS3.FINISHED : (_e = state.status) != null ? _e : status
    };
  }
  getSteps() {
    let steps = this.data.get("steps");
    return Array.isArray(steps) ? steps : [];
  }
  hasUpdatedState(oldState) {
    let before2 = JSON.stringify(oldState), after2 = JSON.stringify(this.getState());
    return before2 !== after2;
  }
  setState(nextState, initial = !1) {
    let state = this.getState(), {
      action,
      index,
      lifecycle,
      origin = null,
      size,
      status
    } = {
      ...state,
      ...nextState
    };
    this.store.set("action", action), this.store.set("index", index), this.store.set("lifecycle", lifecycle), this.store.set("origin", origin), this.store.set("size", size), this.store.set("status", status), initial && (this.store.set("controlled", nextState.controlled), this.store.set("continuous", nextState.continuous)), this.listener && this.hasUpdatedState(state) && this.listener(this.getState());
  }
  getHelpers() {
    return {
      close: this.close,
      go: this.go,
      info: this.info,
      next: this.next,
      open: this.open,
      prev: this.prev,
      reset: this.reset,
      skip: this.skip
    };
  }
};
function createStore(options2) {
  return new Store(options2);
}
function JoyrideSpotlight({ styles: styles2 }) {
  return createElement(
    "div",
    {
      key: "JoyrideSpotlight",
      className: "react-joyride__spotlight",
      "data-test-id": "spotlight",
      style: styles2
    }
  );
}
var Spotlight_default = JoyrideSpotlight, JoyrideOverlay = class extends Component {
  constructor() {
    super(...arguments), __publicField(this, "isActive", !1), __publicField(this, "resizeTimeout"), __publicField(this, "scrollTimeout"), __publicField(this, "scrollParent"), __publicField(this, "state", {
      isScrolling: !1,
      mouseOverSpotlight: !1,
      showSpotlight: !0
    }), __publicField(this, "hideSpotlight", () => {
      let { continuous, disableOverlay, lifecycle } = this.props, hiddenLifecycles = [
        LIFECYCLE.INIT,
        LIFECYCLE.BEACON,
        LIFECYCLE.COMPLETE,
        LIFECYCLE.ERROR
      ];
      return disableOverlay || (continuous ? hiddenLifecycles.includes(lifecycle) : lifecycle !== LIFECYCLE.TOOLTIP);
    }), __publicField(this, "handleMouseMove", (event) => {
      let { mouseOverSpotlight } = this.state, { height, left, position, top, width } = this.spotlightStyles, offsetY = position === "fixed" ? event.clientY : event.pageY, offsetX = position === "fixed" ? event.clientX : event.pageX, inSpotlightHeight = offsetY >= top && offsetY <= top + height, inSpotlight = offsetX >= left && offsetX <= left + width && inSpotlightHeight;
      inSpotlight !== mouseOverSpotlight && this.updateState({ mouseOverSpotlight: inSpotlight });
    }), __publicField(this, "handleScroll", () => {
      let { target } = this.props, element = getElement(target);
      if (this.scrollParent !== document) {
        let { isScrolling } = this.state;
        isScrolling || this.updateState({ isScrolling: !0, showSpotlight: !1 }), clearTimeout(this.scrollTimeout), this.scrollTimeout = window.setTimeout(() => {
          this.updateState({ isScrolling: !1, showSpotlight: !0 });
        }, 50);
      } else hasPosition(element, "sticky") && this.updateState({});
    }), __publicField(this, "handleResize", () => {
      clearTimeout(this.resizeTimeout), this.resizeTimeout = window.setTimeout(() => {
        this.isActive && this.forceUpdate();
      }, 100);
    });
  }
  componentDidMount() {
    let { debug, disableScrolling, disableScrollParentFix = !1, target } = this.props, element = getElement(target);
    this.scrollParent = getScrollParent2(element ?? document.body, disableScrollParentFix, !0), this.isActive = !0, window.addEventListener("resize", this.handleResize);
  }
  componentDidUpdate(previousProps) {
    var _a;
    let { disableScrollParentFix, lifecycle, spotlightClicks, target } = this.props, { changed } = treeChanges(previousProps, this.props);
    if (changed("target") || changed("disableScrollParentFix")) {
      let element = getElement(target);
      this.scrollParent = getScrollParent2(element ?? document.body, disableScrollParentFix, !0);
    }
    changed("lifecycle", LIFECYCLE.TOOLTIP) && ((_a = this.scrollParent) == null || _a.addEventListener("scroll", this.handleScroll, { passive: !0 }), setTimeout(() => {
      let { isScrolling } = this.state;
      isScrolling || this.updateState({ showSpotlight: !0 });
    }, 100)), (changed("spotlightClicks") || changed("disableOverlay") || changed("lifecycle")) && (spotlightClicks && lifecycle === LIFECYCLE.TOOLTIP ? window.addEventListener("mousemove", this.handleMouseMove, !1) : lifecycle !== LIFECYCLE.TOOLTIP && window.removeEventListener("mousemove", this.handleMouseMove));
  }
  componentWillUnmount() {
    var _a;
    this.isActive = !1, window.removeEventListener("mousemove", this.handleMouseMove), window.removeEventListener("resize", this.handleResize), clearTimeout(this.resizeTimeout), clearTimeout(this.scrollTimeout), (_a = this.scrollParent) == null || _a.removeEventListener("scroll", this.handleScroll);
  }
  get overlayStyles() {
    let { mouseOverSpotlight } = this.state, { disableOverlayClose, placement, styles: styles2 } = this.props, baseStyles = styles2.overlay;
    return isLegacy() && (baseStyles = placement === "center" ? styles2.overlayLegacyCenter : styles2.overlayLegacy), {
      cursor: disableOverlayClose ? "default" : "pointer",
      height: getDocumentHeight(),
      pointerEvents: mouseOverSpotlight ? "none" : "auto",
      ...baseStyles
    };
  }
  get spotlightStyles() {
    var _a, _b, _c;
    let { showSpotlight } = this.state, {
      disableScrollParentFix = !1,
      spotlightClicks,
      spotlightPadding = 0,
      styles: styles2,
      target
    } = this.props, element = getElement(target), elementRect = getClientRect2(element), isFixedTarget = hasPosition(element), top = getElementPosition(element, spotlightPadding, disableScrollParentFix);
    return {
      ...isLegacy() ? styles2.spotlightLegacy : styles2.spotlight,
      height: Math.round(((_a = elementRect?.height) != null ? _a : 0) + spotlightPadding * 2),
      left: Math.round(((_b = elementRect?.left) != null ? _b : 0) - spotlightPadding),
      opacity: showSpotlight ? 1 : 0,
      pointerEvents: spotlightClicks ? "none" : "auto",
      position: isFixedTarget ? "fixed" : "absolute",
      top,
      transition: "opacity 0.2s",
      width: Math.round(((_c = elementRect?.width) != null ? _c : 0) + spotlightPadding * 2)
    };
  }
  updateState(state) {
    this.isActive && this.setState((previousState) => ({ ...previousState, ...state }));
  }
  render() {
    let { showSpotlight } = this.state, { onClickOverlay, placement } = this.props, { hideSpotlight, overlayStyles, spotlightStyles } = this;
    if (hideSpotlight())
      return null;
    let spotlight2 = placement !== "center" && showSpotlight && createElement(Spotlight_default, { styles: spotlightStyles });
    if (getBrowser() === "safari") {
      let { mixBlendMode, zIndex, ...safariOverlay } = overlayStyles;
      spotlight2 = createElement("div", { style: { ...safariOverlay } }, spotlight2), delete overlayStyles.backgroundColor;
    }
    return createElement(
      "div",
      {
        className: "react-joyride__overlay",
        "data-test-id": "overlay",
        onClick: onClickOverlay,
        role: "presentation",
        style: overlayStyles
      },
      spotlight2
    );
  }
}, JoyridePortal = class extends Component {
  constructor() {
    super(...arguments), __publicField(this, "node", null);
  }
  componentDidMount() {
    let { id } = this.props;
    canUseDOM2() && (this.node = document.createElement("div"), this.node.id = id, document.body.appendChild(this.node), isReact162 || this.renderReact15());
  }
  componentDidUpdate() {
    canUseDOM2() && (isReact162 || this.renderReact15());
  }
  componentWillUnmount() {
    !canUseDOM2() || !this.node || (isReact162 || unmountComponentAtNode(this.node), this.node.parentNode === document.body && (document.body.removeChild(this.node), this.node = null));
  }
  renderReact15() {
    if (!canUseDOM2())
      return;
    let { children } = this.props;
    this.node && unstable_renderSubtreeIntoContainer(this, children, this.node);
  }
  renderReact16() {
    if (!canUseDOM2() || !isReact162)
      return null;
    let { children } = this.props;
    return this.node ? createPortal(children, this.node) : null;
  }
  render() {
    return isReact162 ? this.renderReact16() : null;
  }
}, Scope = class {
  constructor(element, options2) {
    if (__publicField(this, "element"), __publicField(this, "options"), __publicField(this, "canBeTabbed", (element2) => {
      let { tabIndex } = element2;
      return tabIndex === null || tabIndex < 0 ? !1 : this.canHaveFocus(element2);
    }), __publicField(this, "canHaveFocus", (element2) => {
      let validTabNodes = /input|select|textarea|button|object/, nodeName = element2.nodeName.toLowerCase();
      return (validTabNodes.test(nodeName) && !element2.getAttribute("disabled") || nodeName === "a" && !!element2.getAttribute("href")) && this.isVisible(element2);
    }), __publicField(this, "findValidTabElements", () => [].slice.call(this.element.querySelectorAll("*"), 0).filter(this.canBeTabbed)), __publicField(this, "handleKeyDown", (event) => {
      let { code = "Tab" } = this.options;
      event.code === code && this.interceptTab(event);
    }), __publicField(this, "interceptTab", (event) => {
      event.preventDefault();
      let elements = this.findValidTabElements(), { shiftKey } = event;
      if (!elements.length)
        return;
      let x2 = document.activeElement ? elements.indexOf(document.activeElement) : 0;
      x2 === -1 || !shiftKey && x2 + 1 === elements.length ? x2 = 0 : shiftKey && x2 === 0 ? x2 = elements.length - 1 : x2 += shiftKey ? -1 : 1, elements[x2].focus();
    }), __publicField(this, "isHidden", (element2) => {
      let noSize = element2.offsetWidth <= 0 && element2.offsetHeight <= 0, style = window.getComputedStyle(element2);
      return noSize && !element2.innerHTML ? !0 : noSize && style.getPropertyValue("overflow") !== "visible" || style.getPropertyValue("display") === "none";
    }), __publicField(this, "isVisible", (element2) => {
      let parentElement = element2;
      for (; parentElement; )
        if (parentElement instanceof HTMLElement) {
          if (parentElement === document.body)
            break;
          if (this.isHidden(parentElement))
            return !1;
          parentElement = parentElement.parentNode;
        }
      return !0;
    }), __publicField(this, "removeScope", () => {
      window.removeEventListener("keydown", this.handleKeyDown);
    }), __publicField(this, "checkFocus", (target) => {
      document.activeElement !== target && (target.focus(), window.requestAnimationFrame(() => this.checkFocus(target)));
    }), __publicField(this, "setFocus", () => {
      let { selector } = this.options;
      if (!selector)
        return;
      let target = this.element.querySelector(selector);
      target && window.requestAnimationFrame(() => this.checkFocus(target));
    }), !(element instanceof HTMLElement))
      throw new TypeError("Invalid parameter: element must be an HTMLElement");
    this.element = element, this.options = options2, window.addEventListener("keydown", this.handleKeyDown, !1), this.setFocus();
  }
}, JoyrideBeacon = class extends Component {
  constructor(props) {
    if (super(props), __publicField(this, "beacon", null), __publicField(this, "setBeaconRef", (c2) => {
      this.beacon = c2;
    }), props.beaconComponent)
      return;
    let head = document.head || document.getElementsByTagName("head")[0], style = document.createElement("style");
    style.id = "joyride-beacon-animation", props.nonce && style.setAttribute("nonce", props.nonce), style.appendChild(document.createTextNode(`
        @keyframes joyride-beacon-inner {
          20% {
            opacity: 0.9;
          }
        
          90% {
            opacity: 0.7;
          }
        }
        
        @keyframes joyride-beacon-outer {
          0% {
            transform: scale(1);
          }
        
          45% {
            opacity: 0.7;
            transform: scale(0.75);
          }
        
          100% {
            opacity: 0.9;
            transform: scale(1);
          }
        }
      `)), head.appendChild(style);
  }
  componentDidMount() {
    let { shouldFocus } = this.props;
    setTimeout(() => {
      src_default.domElement(this.beacon) && shouldFocus && this.beacon.focus();
    }, 0);
  }
  componentWillUnmount() {
    let style = document.getElementById("joyride-beacon-animation");
    style?.parentNode && style.parentNode.removeChild(style);
  }
  render() {
    let {
      beaconComponent,
      continuous,
      index,
      isLastStep,
      locale,
      onClickOrHover,
      size,
      step,
      styles: styles2
    } = this.props, title2 = getReactNodeText(locale.open), sharedProps = {
      "aria-label": title2,
      onClick: onClickOrHover,
      onMouseEnter: onClickOrHover,
      ref: this.setBeaconRef,
      title: title2
    }, component;
    return beaconComponent ? component = createElement(
      beaconComponent,
      {
        continuous,
        index,
        isLastStep,
        size,
        step,
        ...sharedProps
      }
    ) : component = createElement(
      "button",
      {
        key: "JoyrideBeacon",
        className: "react-joyride__beacon",
        "data-test-id": "button-beacon",
        style: styles2.beacon,
        type: "button",
        ...sharedProps
      },
      createElement("span", { style: styles2.beaconInner }),
      createElement("span", { style: styles2.beaconOuter })
    ), component;
  }
};
function JoyrideTooltipCloseButton({ styles: styles2, ...props }) {
  let { color: color2, height, width, ...style } = styles2;
  return react_default.createElement("button", { style, type: "button", ...props }, react_default.createElement(
    "svg",
    {
      height: typeof height == "number" ? `${height}px` : height,
      preserveAspectRatio: "xMidYMid",
      version: "1.1",
      viewBox: "0 0 18 18",
      width: typeof width == "number" ? `${width}px` : width,
      xmlns: "http://www.w3.org/2000/svg"
    },
    react_default.createElement("g", null, react_default.createElement(
      "path",
      {
        d: "M8.13911129,9.00268191 L0.171521827,17.0258467 C-0.0498027049,17.248715 -0.0498027049,17.6098394 0.171521827,17.8327545 C0.28204354,17.9443526 0.427188206,17.9998706 0.572051765,17.9998706 C0.71714958,17.9998706 0.862013139,17.9443526 0.972581703,17.8327545 L9.0000937,9.74924618 L17.0276057,17.8327545 C17.1384085,17.9443526 17.2832721,17.9998706 17.4281356,17.9998706 C17.5729992,17.9998706 17.718097,17.9443526 17.8286656,17.8327545 C18.0499901,17.6098862 18.0499901,17.2487618 17.8286656,17.0258467 L9.86135722,9.00268191 L17.8340066,0.973848225 C18.0553311,0.750979934 18.0553311,0.389855532 17.8340066,0.16694039 C17.6126821,-0.0556467968 17.254037,-0.0556467968 17.0329467,0.16694039 L9.00042166,8.25611765 L0.967006424,0.167268345 C0.745681892,-0.0553188426 0.387317931,-0.0553188426 0.165993399,0.167268345 C-0.0553311331,0.390136635 -0.0553311331,0.751261038 0.165993399,0.974176179 L8.13920499,9.00268191 L8.13911129,9.00268191 Z",
        fill: color2
      }
    ))
  ));
}
var CloseButton_default = JoyrideTooltipCloseButton;
function JoyrideTooltipContainer(props) {
  let { backProps, closeProps, index, isLastStep, primaryProps, skipProps, step, tooltipProps } = props, { content, hideBackButton, hideCloseButton, hideFooter, showSkipButton, styles: styles2, title: title2 } = step, output = {};
  return output.primary = createElement(
    "button",
    {
      "data-test-id": "button-primary",
      style: styles2.buttonNext,
      type: "button",
      ...primaryProps
    }
  ), showSkipButton && !isLastStep && (output.skip = createElement(
    "button",
    {
      "aria-live": "off",
      "data-test-id": "button-skip",
      style: styles2.buttonSkip,
      type: "button",
      ...skipProps
    }
  )), !hideBackButton && index > 0 && (output.back = createElement("button", { "data-test-id": "button-back", style: styles2.buttonBack, type: "button", ...backProps })), output.close = !hideCloseButton && createElement(CloseButton_default, { "data-test-id": "button-close", styles: styles2.buttonClose, ...closeProps }), createElement(
    "div",
    {
      key: "JoyrideTooltip",
      "aria-label": getReactNodeText(title2 ?? content),
      className: "react-joyride__tooltip",
      style: styles2.tooltip,
      ...tooltipProps
    },
    createElement("div", { style: styles2.tooltipContainer }, title2 && createElement("h1", { "aria-label": getReactNodeText(title2), style: styles2.tooltipTitle }, title2), createElement("div", { style: styles2.tooltipContent }, content)),
    !hideFooter && createElement("div", { style: styles2.tooltipFooter }, createElement("div", { style: styles2.tooltipFooterSpacer }, output.skip), output.back, output.primary),
    output.close
  );
}
var Container_default = JoyrideTooltipContainer, JoyrideTooltip = class extends Component {
  constructor() {
    super(...arguments), __publicField(this, "handleClickBack", (event) => {
      event.preventDefault();
      let { helpers } = this.props;
      helpers.prev();
    }), __publicField(this, "handleClickClose", (event) => {
      event.preventDefault();
      let { helpers } = this.props;
      helpers.close("button_close");
    }), __publicField(this, "handleClickPrimary", (event) => {
      event.preventDefault();
      let { continuous, helpers } = this.props;
      if (!continuous) {
        helpers.close("button_primary");
        return;
      }
      helpers.next();
    }), __publicField(this, "handleClickSkip", (event) => {
      event.preventDefault();
      let { helpers } = this.props;
      helpers.skip();
    }), __publicField(this, "getElementsProps", () => {
      let { continuous, index, isLastStep, setTooltipRef, size, step } = this.props, { back, close, last, next, nextLabelWithProgress, skip } = step.locale, backText = getReactNodeText(back), closeText = getReactNodeText(close), lastText = getReactNodeText(last), nextText = getReactNodeText(next), skipText = getReactNodeText(skip), primary = close, primaryText = closeText;
      if (continuous) {
        if (primary = next, primaryText = nextText, step.showProgress && !isLastStep) {
          let labelWithProgress = getReactNodeText(nextLabelWithProgress, {
            step: index + 1,
            steps: size
          });
          primary = replaceLocaleContent(nextLabelWithProgress, index + 1, size), primaryText = labelWithProgress;
        }
        isLastStep && (primary = last, primaryText = lastText);
      }
      return {
        backProps: {
          "aria-label": backText,
          children: back,
          "data-action": "back",
          onClick: this.handleClickBack,
          role: "button",
          title: backText
        },
        closeProps: {
          "aria-label": closeText,
          children: close,
          "data-action": "close",
          onClick: this.handleClickClose,
          role: "button",
          title: closeText
        },
        primaryProps: {
          "aria-label": primaryText,
          children: primary,
          "data-action": "primary",
          onClick: this.handleClickPrimary,
          role: "button",
          title: primaryText
        },
        skipProps: {
          "aria-label": skipText,
          children: skip,
          "data-action": "skip",
          onClick: this.handleClickSkip,
          role: "button",
          title: skipText
        },
        tooltipProps: {
          "aria-modal": !0,
          ref: setTooltipRef,
          role: "alertdialog"
        }
      };
    });
  }
  render() {
    let { continuous, index, isLastStep, setTooltipRef, size, step } = this.props, { beaconComponent, tooltipComponent, ...cleanStep } = step, component;
    if (tooltipComponent) {
      let renderProps = {
        ...this.getElementsProps(),
        continuous,
        index,
        isLastStep,
        size,
        step: cleanStep,
        setTooltipRef
      };
      component = createElement(tooltipComponent, { ...renderProps });
    } else
      component = createElement(
        Container_default,
        {
          ...this.getElementsProps(),
          continuous,
          index,
          isLastStep,
          size,
          step
        }
      );
    return component;
  }
}, JoyrideStep = class extends Component {
  constructor() {
    super(...arguments), __publicField(this, "scope", null), __publicField(this, "tooltip", null), __publicField(this, "handleClickHoverBeacon", (event) => {
      let { step, store: store2 } = this.props;
      event.type === "mouseenter" && step.event !== "hover" || store2.update({ lifecycle: LIFECYCLE.TOOLTIP });
    }), __publicField(this, "setTooltipRef", (element) => {
      this.tooltip = element;
    }), __publicField(this, "setPopper", (popper, type) => {
      var _a;
      let { action, lifecycle, step, store: store2 } = this.props;
      type === "wrapper" ? store2.setPopper("beacon", popper) : store2.setPopper("tooltip", popper), store2.getPopper("beacon") && (store2.getPopper("tooltip") || step.placement === "center") && lifecycle === LIFECYCLE.INIT && store2.update({
        action,
        lifecycle: LIFECYCLE.READY
      }), (_a = step.floaterProps) != null && _a.getPopper && step.floaterProps.getPopper(popper, type);
    }), __publicField(this, "renderTooltip", (renderProps) => {
      let { continuous, helpers, index, size, step } = this.props;
      return createElement(
        JoyrideTooltip,
        {
          continuous,
          helpers,
          index,
          isLastStep: index + 1 === size,
          setTooltipRef: this.setTooltipRef,
          size,
          step,
          ...renderProps
        }
      );
    });
  }
  componentDidMount() {
    let { debug, index } = this.props;
    log2({
      title: `step:${index}`,
      data: [{ key: "props", value: this.props }],
      debug
    });
  }
  componentDidUpdate(previousProps) {
    var _a;
    let {
      action,
      callback,
      continuous,
      controlled,
      debug,
      helpers,
      index,
      lifecycle,
      shouldScroll: shouldScroll2,
      status,
      step,
      store: store2
    } = this.props, { changed, changedFrom } = treeChanges(previousProps, this.props), state = helpers.info(), skipBeacon = continuous && action !== ACTIONS.CLOSE && (index > 0 || action === ACTIONS.PREV), hasStoreChanged = changed("action") || changed("index") || changed("lifecycle") || changed("status"), isInitial = changedFrom("lifecycle", [LIFECYCLE.TOOLTIP, LIFECYCLE.INIT], LIFECYCLE.INIT), isAfterAction = changed("action", [
      ACTIONS.NEXT,
      ACTIONS.PREV,
      ACTIONS.SKIP,
      ACTIONS.CLOSE
    ]), isControlled = controlled && index === previousProps.index;
    if (isAfterAction && (isInitial || isControlled) && callback({
      ...state,
      index: previousProps.index,
      lifecycle: LIFECYCLE.COMPLETE,
      step: previousProps.step,
      type: EVENTS.STEP_AFTER
    }), step.placement === "center" && status === STATUS3.RUNNING && changed("index") && action !== ACTIONS.START && lifecycle === LIFECYCLE.INIT && store2.update({ lifecycle: LIFECYCLE.READY }), hasStoreChanged) {
      let element = getElement(step.target), elementExists = !!element;
      elementExists && isElementVisible(element) ? (changedFrom("status", STATUS3.READY, STATUS3.RUNNING) || changedFrom("lifecycle", LIFECYCLE.INIT, LIFECYCLE.READY)) && callback({
        ...state,
        step,
        type: EVENTS.STEP_BEFORE
      }) : (console.warn(elementExists ? "Target not visible" : "Target not mounted", step), callback({
        ...state,
        type: EVENTS.TARGET_NOT_FOUND,
        step
      }), controlled || store2.update({ index: index + (action === ACTIONS.PREV ? -1 : 1) }));
    }
    changedFrom("lifecycle", LIFECYCLE.INIT, LIFECYCLE.READY) && store2.update({
      lifecycle: hideBeacon(step) || skipBeacon ? LIFECYCLE.TOOLTIP : LIFECYCLE.BEACON
    }), changed("index") && log2({
      title: `step:${lifecycle}`,
      data: [{ key: "props", value: this.props }],
      debug
    }), changed("lifecycle", LIFECYCLE.BEACON) && callback({
      ...state,
      step,
      type: EVENTS.BEACON
    }), changed("lifecycle", LIFECYCLE.TOOLTIP) && (callback({
      ...state,
      step,
      type: EVENTS.TOOLTIP
    }), shouldScroll2 && this.tooltip && (this.scope = new Scope(this.tooltip, { selector: "[data-action=primary]" }), this.scope.setFocus())), changedFrom("lifecycle", [LIFECYCLE.TOOLTIP, LIFECYCLE.INIT], LIFECYCLE.INIT) && ((_a = this.scope) == null || _a.removeScope(), store2.cleanupPoppers());
  }
  componentWillUnmount() {
    var _a;
    (_a = this.scope) == null || _a.removeScope();
  }
  get open() {
    let { lifecycle, step } = this.props;
    return hideBeacon(step) || lifecycle === LIFECYCLE.TOOLTIP;
  }
  render() {
    let { continuous, debug, index, nonce, shouldScroll: shouldScroll2, size, step } = this.props, target = getElement(step.target);
    return !validateStep(step) || !src_default.domElement(target) ? null : createElement("div", { key: `JoyrideStep-${index}`, className: "react-joyride__step" }, createElement(
      ReactFloater,
      {
        ...step.floaterProps,
        component: this.renderTooltip,
        debug,
        getPopper: this.setPopper,
        id: `react-joyride-step-${index}`,
        open: this.open,
        placement: step.placement,
        target: step.target
      },
      createElement(
        JoyrideBeacon,
        {
          beaconComponent: step.beaconComponent,
          continuous,
          index,
          isLastStep: index + 1 === size,
          locale: step.locale,
          nonce,
          onClickOrHover: this.handleClickHoverBeacon,
          shouldFocus: shouldScroll2,
          size,
          step,
          styles: step.styles
        }
      )
    ));
  }
}, Joyride = class extends Component {
  constructor(props) {
    super(props), __publicField(this, "helpers"), __publicField(this, "store"), __publicField(this, "callback", (data) => {
      let { callback } = this.props;
      src_default.function(callback) && callback(data);
    }), __publicField(this, "handleKeyboard", (event) => {
      let { index, lifecycle } = this.state, { steps } = this.props, step = steps[index];
      lifecycle === LIFECYCLE.TOOLTIP && event.code === "Escape" && step && !step.disableCloseOnEsc && this.store.close("keyboard");
    }), __publicField(this, "handleClickOverlay", () => {
      let { index } = this.state, { steps } = this.props;
      getMergedStep(this.props, steps[index]).disableOverlayClose || this.helpers.close("overlay");
    }), __publicField(this, "syncState", (state) => {
      this.setState(state);
    });
    let { debug, getHelpers, run = !0, stepIndex } = props;
    this.store = createStore({
      ...props,
      controlled: run && src_default.number(stepIndex)
    }), this.helpers = this.store.getHelpers();
    let { addListener } = this.store;
    log2({
      title: "init",
      data: [
        { key: "props", value: this.props },
        { key: "state", value: this.state }
      ],
      debug
    }), addListener(this.syncState), getHelpers && getHelpers(this.helpers), this.state = this.store.getState();
  }
  componentDidMount() {
    if (!canUseDOM2())
      return;
    let { debug, disableCloseOnEsc, run, steps } = this.props, { start } = this.store;
    validateSteps(steps, debug) && run && start(), disableCloseOnEsc || document.body.addEventListener("keydown", this.handleKeyboard, { passive: !0 });
  }
  componentDidUpdate(previousProps, previousState) {
    if (!canUseDOM2())
      return;
    let { action, controlled, index, status } = this.state, { debug, run, stepIndex, steps } = this.props, { stepIndex: previousStepIndex, steps: previousSteps } = previousProps, { reset, setSteps, start, stop, update: update2 } = this.store, { changed: changedProps } = treeChanges(previousProps, this.props), { changed, changedFrom } = treeChanges(previousState, this.state), step = getMergedStep(this.props, steps[index]), stepsChanged = !equal(previousSteps, steps), stepIndexChanged = src_default.number(stepIndex) && changedProps("stepIndex"), target = getElement(step.target);
    if (stepsChanged && (validateSteps(steps, debug) ? setSteps(steps) : console.warn("Steps are not valid", steps)), changedProps("run") && (run ? start(stepIndex) : stop()), stepIndexChanged) {
      let nextAction = src_default.number(previousStepIndex) && previousStepIndex < stepIndex ? ACTIONS.NEXT : ACTIONS.PREV;
      action === ACTIONS.STOP && (nextAction = ACTIONS.START), [STATUS3.FINISHED, STATUS3.SKIPPED].includes(status) || update2({
        action: action === ACTIONS.CLOSE ? ACTIONS.CLOSE : nextAction,
        index: stepIndex,
        lifecycle: LIFECYCLE.INIT
      });
    }
    !controlled && status === STATUS3.RUNNING && index === 0 && !target && (this.store.update({ index: index + 1 }), this.callback({
      ...this.state,
      type: EVENTS.TARGET_NOT_FOUND,
      step
    }));
    let callbackData = {
      ...this.state,
      index,
      step
    };
    if (changed("action", [
      ACTIONS.NEXT,
      ACTIONS.PREV,
      ACTIONS.SKIP,
      ACTIONS.CLOSE
    ]) && changed("status", STATUS3.PAUSED)) {
      let previousStep = getMergedStep(this.props, steps[previousState.index]);
      this.callback({
        ...callbackData,
        index: previousState.index,
        lifecycle: LIFECYCLE.COMPLETE,
        step: previousStep,
        type: EVENTS.STEP_AFTER
      });
    }
    if (changed("status", [STATUS3.FINISHED, STATUS3.SKIPPED])) {
      let previousStep = getMergedStep(this.props, steps[previousState.index]);
      controlled || this.callback({
        ...callbackData,
        index: previousState.index,
        lifecycle: LIFECYCLE.COMPLETE,
        step: previousStep,
        type: EVENTS.STEP_AFTER
      }), this.callback({
        ...callbackData,
        type: EVENTS.TOUR_END,
        // Return the last step when the tour is finished
        step: previousStep,
        index: previousState.index
      }), reset();
    } else changedFrom("status", [STATUS3.IDLE, STATUS3.READY], STATUS3.RUNNING) ? this.callback({
      ...callbackData,
      type: EVENTS.TOUR_START
    }) : (changed("status") || changed("action", ACTIONS.RESET)) && this.callback({
      ...callbackData,
      type: EVENTS.TOUR_STATUS
    });
    this.scrollToStep(previousState);
  }
  componentWillUnmount() {
    let { disableCloseOnEsc } = this.props;
    disableCloseOnEsc || document.body.removeEventListener("keydown", this.handleKeyboard);
  }
  scrollToStep(previousState) {
    let { index, lifecycle, status } = this.state, {
      debug,
      disableScrollParentFix = !1,
      scrollDuration,
      scrollOffset = 20,
      scrollToFirstStep = !1,
      steps
    } = this.props, step = getMergedStep(this.props, steps[index]), target = getElement(step.target), shouldScrollToStep = shouldScroll({
      isFirstStep: index === 0,
      lifecycle,
      previousLifecycle: previousState.lifecycle,
      scrollToFirstStep,
      step,
      target
    });
    if (status === STATUS3.RUNNING && shouldScrollToStep) {
      let hasCustomScroll = hasCustomScrollParent(target, disableScrollParentFix), scrollParent2 = getScrollParent2(target, disableScrollParentFix), scrollY = Math.floor(getScrollTo(target, scrollOffset, disableScrollParentFix)) || 0;
      log2({
        title: "scrollToStep",
        data: [
          { key: "index", value: index },
          { key: "lifecycle", value: lifecycle },
          { key: "status", value: status }
        ],
        debug
      });
      let beaconPopper = this.store.getPopper("beacon"), tooltipPopper = this.store.getPopper("tooltip");
      if (lifecycle === LIFECYCLE.BEACON && beaconPopper) {
        let { offsets, placement } = beaconPopper;
        !["bottom"].includes(placement) && !hasCustomScroll && (scrollY = Math.floor(offsets.popper.top - scrollOffset));
      } else if (lifecycle === LIFECYCLE.TOOLTIP && tooltipPopper) {
        let { flipped, offsets, placement } = tooltipPopper;
        ["top", "right", "left"].includes(placement) && !flipped && !hasCustomScroll ? scrollY = Math.floor(offsets.popper.top - scrollOffset) : scrollY -= step.spotlightPadding;
      }
      scrollY = scrollY >= 0 ? scrollY : 0, status === STATUS3.RUNNING && scrollTo(scrollY, { element: scrollParent2, duration: scrollDuration }).then(
        () => {
          setTimeout(() => {
            var _a;
            (_a = this.store.getPopper("tooltip")) == null || _a.instance.update();
          }, 10);
        }
      );
    }
  }
  render() {
    if (!canUseDOM2())
      return null;
    let { index, lifecycle, status } = this.state, {
      continuous = !1,
      debug = !1,
      nonce,
      scrollToFirstStep = !1,
      steps
    } = this.props, isRunning = status === STATUS3.RUNNING, content = {};
    if (isRunning && steps[index]) {
      let step = getMergedStep(this.props, steps[index]);
      content.step = createElement(
        JoyrideStep,
        {
          ...this.state,
          callback: this.callback,
          continuous,
          debug,
          helpers: this.helpers,
          nonce,
          shouldScroll: !step.disableScrolling && (index !== 0 || scrollToFirstStep),
          step,
          store: this.store
        }
      ), content.overlay = createElement(JoyridePortal, { id: "react-joyride-portal" }, createElement(
        JoyrideOverlay,
        {
          ...step,
          continuous,
          debug,
          lifecycle,
          onClickOverlay: this.handleClickOverlay
        }
      ));
    }
    return createElement("div", { className: "react-joyride" }, content.step, content.overlay);
  }
};
__publicField(Joyride, "defaultProps", defaultProps);
var components_default2 = Joyride;

// src/manager/components/TourGuide/HighlightElement.tsx
var HIGHLIGHT_KEYFRAMES_ID = "storybook-highlight-element-keyframes", keyframes2 = `
  @keyframes sb-highlight-pulsate {
    0% {
      box-shadow: rgba(2,156,253,1) 0 0 2px 1px, 0 0 0 0 rgba(2, 156, 253, 0.7), 0 0 0 0 rgba(2, 156, 253, 0.4);
    }
    50% {
      box-shadow: rgba(2,156,253,1) 0 0 2px 1px, 0 0 0 20px rgba(2, 156, 253, 0), 0 0 0 40px rgba(2, 156, 253, 0);
    }
    100% {
      box-shadow: rgba(2,156,253,1) 0 0 2px 1px, 0 0 0 0 rgba(2, 156, 253, 0), 0 0 0 0 rgba(2, 156, 253, 0);
    }
  }
`, createOverlay = (element) => {
  let overlay = document.createElement("div");
  return overlay.id = "storybook-highlight-element", overlay.style.position = "fixed", overlay.style.pointerEvents = "none", overlay.style.zIndex = "2147483647", overlay.style.transition = "opacity 0.2s ease-in-out", requestAnimationFrame(() => {
    updateOverlayStyles(element, overlay), element.scrollIntoView({ behavior: "smooth", block: "center" });
  }), overlay;
}, updateOverlayStyles = (element, overlay) => {
  let rect = element.getBoundingClientRect(), computedStyle = window.getComputedStyle(element);
  overlay.style.top = `${rect.top}px`, overlay.style.left = `${rect.left}px`, overlay.style.width = `${rect.width}px`, overlay.style.height = `${rect.height}px`, overlay.style.borderRadius = computedStyle.borderRadius;
}, findScrollableAncestors = (element) => {
  let scrollableAncestors = [window], parent = element.parentElement;
  for (; parent; ) {
    let style = window.getComputedStyle(parent);
    (style.overflow === "auto" || style.overflow === "scroll" || style.overflowX === "auto" || style.overflowX === "scroll" || style.overflowY === "auto" || style.overflowY === "scroll") && scrollableAncestors.push(parent), parent = parent.parentElement;
  }
  return scrollableAncestors;
};
function HighlightElement({
  targetSelector,
  pulsating = !1
}) {
  return useEffect(() => {
    let element = document.querySelector(targetSelector);
    if (!element || !element.parentElement)
      return;
    let overlay = document.body.appendChild(createOverlay(element));
    if (pulsating) {
      if (!document.getElementById(HIGHLIGHT_KEYFRAMES_ID)) {
        let style = document.createElement("style");
        style.id = HIGHLIGHT_KEYFRAMES_ID, style.innerHTML = keyframes2, document.head.appendChild(style);
      }
      overlay.style.animation = "sb-highlight-pulsate 3s infinite", overlay.style.transformOrigin = "center", overlay.style.animationTimingFunction = "ease-in-out";
    } else
      overlay.style.boxShadow = "rgba(2,156,253,1) 0 0 2px 1px";
    let scrollTimeout = null, handleScroll = () => {
      overlay.parentElement && overlay.remove(), scrollTimeout !== null && clearTimeout(scrollTimeout), scrollTimeout = window.setTimeout(() => {
        element && (updateOverlayStyles(element, overlay), overlay.style.opacity = "0", document.body.appendChild(overlay), requestAnimationFrame(() => overlay.style.opacity = "1"));
      }, 150);
    }, resizeObserver = new ResizeObserver(
      () => overlay.parentElement && updateOverlayStyles(element, overlay)
    );
    resizeObserver.observe(window.document.body), resizeObserver.observe(element);
    let scrollContainers = findScrollableAncestors(element);
    return scrollContainers.forEach(
      (el) => el.addEventListener("scroll", handleScroll, { passive: !0 })
    ), scrollContainers.filter((el) => el !== window).forEach((el) => resizeObserver.observe(el)), () => {
      scrollTimeout !== null && clearTimeout(scrollTimeout), overlay.parentElement && overlay.remove(), scrollContainers.forEach((el) => el.removeEventListener("scroll", handleScroll)), resizeObserver.disconnect();
    };
  }, [targetSelector, pulsating]), null;
}

// src/manager/components/TourGuide/TourTooltip.tsx
var ONBOARDING_ARROW_STYLE_ID = "storybook-onboarding-arrow-style", TooltipBody = styled.div`
  padding: 15px;
  border-radius: 5px;
`, Wrapper = styled.div`
  display: flex;
  flex-direction: column;
  align-items: flex-start;
`, TooltipHeader = styled.div`
  display: flex;
  align-items: center;
  align-self: stretch;
  justify-content: space-between;
  margin: -5px -5px 5px 0;
`, TooltipTitle = styled.div`
  line-height: 18px;
  font-weight: 700;
  font-size: 14px;
  margin: 5px 5px 5px 0;
`, TooltipContent = styled.p`
  font-size: 14px;
  line-height: 18px;
  text-align: start;
  text-wrap: balance;
  margin: 0;
  margin-top: 5px;
`, TooltipFooter = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 15px;
`, Count = styled.span`
  font-size: 13px;
`, NextButton = styled(Button)(({ theme }) => ({
  background: theme.color.lightest,
  border: "none",
  boxShadow: "none",
  color: theme.base === "light" ? theme.color.secondary : curriedDarken$1(0.18, theme.color.secondary),
  "&:hover, &:focus": {
    background: curriedTransparentize$1(0.1, theme.color.lightest),
    color: theme.base === "light" ? curriedLighten$1(0.1, theme.color.secondary) : curriedDarken$1(0.3, theme.color.secondary)
  }
})), TourTooltip = ({
  index,
  size,
  step,
  closeProps,
  primaryProps,
  tooltipProps
}) => (useEffect(() => {
  let style = document.createElement("style");
  return style.id = ONBOARDING_ARROW_STYLE_ID, style.innerHTML = `
      .__floater__arrow { container-type: size; }
      .__floater__arrow span { background: ${color.secondary}; }
      .__floater__arrow span::before, .__floater__arrow span::after {
        content: '';
        display: block;
        width: 2px;
        height: 2px;
        background: ${color.secondary};
        box-shadow: 0 0 0 2px ${color.secondary};
        border-radius: 3px;
        flex: 0 0 2px;
      }
      @container (min-height: 1px) {
        .__floater__arrow span { flex-direction: column; }
      }
    `, document.head.appendChild(style), () => document.getElementById(ONBOARDING_ARROW_STYLE_ID)?.remove();
}, []), react_default.createElement(TooltipBody, { ...tooltipProps, style: step.styles?.tooltip }, react_default.createElement(Wrapper, null, react_default.createElement(TooltipHeader, null, step.title && react_default.createElement(TooltipTitle, null, step.title), react_default.createElement(
  Button,
  {
    ...closeProps,
    onClick: closeProps.onClick,
    variant: "solid",
    padding: "small",
    ariaLabel: "Close"
  },
  react_default.createElement(CloseAltIcon, null)
)), react_default.createElement(TooltipContent, null, step.content)), react_default.createElement(TooltipFooter, { id: "buttonNext" }, react_default.createElement(Count, null, index + 1, " of ", size), !step.hideNextButton && react_default.createElement(NextButton, { ...primaryProps }, index + 1 === size ? "Done" : "Next"))));

// src/manager/components/TourGuide/TourGuide.tsx
var TourGuide = ({
  step,
  steps,
  onNext,
  onComplete,
  onDismiss
}) => {
  let [stepIndex, setStepIndex] = useState(step ? null : 0), theme = useTheme(), timeoutRef = useRef(void 0), updateStepIndex = useCallback((index) => {
    clearTimeout(timeoutRef.current), setStepIndex((current) => index === -1 ? null : current === null || current === index ? index : (timeoutRef.current = setTimeout(setStepIndex, 300, index), null));
  }, []);
  useEffect(
    () => step ? updateStepIndex(steps.findIndex(({ key }) => key === step)) : void 0,
    [step, steps, updateStepIndex]
  );
  let mappedSteps = useMemo(() => steps.map((step2, index) => {
    let next = () => updateStepIndex(index + 1);
    return {
      disableBeacon: !0,
      disableOverlay: !0,
      spotlightClicks: !0,
      offset: 0,
      ...step2,
      content: react_default.createElement(react_default.Fragment, null, step2.content, step2.highlight && react_default.createElement(HighlightElement, { targetSelector: step2.highlight, pulsating: !0 })),
      onNext: step2.onNext ? () => step2.onNext?.({ next }) : onNext && (() => onNext?.({ next }))
    };
  }), [steps, onNext, updateStepIndex]), callback = useCallback(
    (data) => {
      data.action === ACTIONS.NEXT && data.lifecycle === "complete" && (data.index === data.size - 1 ? onComplete?.() : data.step?.onNext ? data.step.onNext() : updateStepIndex(data.index + 1)), data.action === ACTIONS.CLOSE && onDismiss?.();
    },
    [onComplete, onDismiss, updateStepIndex]
  );
  return stepIndex === null ? null : react_default.createElement(
    components_default2,
    {
      continuous: !0,
      steps: mappedSteps,
      stepIndex,
      spotlightPadding: 0,
      disableCloseOnEsc: !0,
      disableOverlayClose: !0,
      disableScrolling: !0,
      callback,
      tooltipComponent: TourTooltip,
      floaterProps: {
        disableAnimation: !0,
        styles: {
          arrow: {
            length: 20,
            spread: 2
          },
          floater: {
            filter: theme.base === "light" ? "drop-shadow(0px 5px 5px rgba(0,0,0,0.05)) drop-shadow(0 1px 3px rgba(0,0,0,0.1))" : "drop-shadow(#fff5 0px 0px 0.5px) drop-shadow(#fff5 0px 0px 0.5px)"
          }
        }
      },
      styles: {
        overlay: {
          mixBlendMode: "unset",
          backgroundColor: steps[stepIndex]?.target === "body" ? "rgba(27, 28, 29, 0.2)" : "none"
        },
        spotlight: {
          backgroundColor: "none",
          border: `solid 2px ${theme.base === "light" ? theme.color.secondary : curriedDarken$1(0.18, theme.color.secondary)}`,
          boxShadow: "0px 0px 0px 9999px rgba(27, 28, 29, 0.2)"
        },
        tooltip: {
          width: 280,
          color: theme.color.lightest,
          background: theme.base === "light" ? theme.color.secondary : curriedDarken$1(0.18, theme.color.secondary)
        },
        options: {
          zIndex: 9998,
          primaryColor: theme.base === "light" ? theme.color.secondary : curriedDarken$1(0.18, theme.color.secondary),
          arrowColor: theme.base === "light" ? theme.color.secondary : curriedDarken$1(0.18, theme.color.secondary)
        }
      }
    }
  );
}, root = null;
TourGuide.render = (props) => {
  let container = document.getElementById("storybook-tour");
  container || (container = document.createElement("div"), container.id = "storybook-tour", document.body.appendChild(container)), root = root ?? createRoot(container), root.render(
    react_default.createElement(ThemeProvider, { theme: convert(themes.light) }, react_default.createElement(
      TourGuide,
      {
        ...props,
        onComplete: () => {
          props.onComplete?.(), root?.render(null), root = null;
        },
        onDismiss: () => {
          props.onDismiss?.(), root?.render(null), root = null;
        }
      }
    ))
  );
};

// src/manager/hooks/useLocation.ts
var LocationMonitor = {
  _currentHref: globalThis.window?.location.href ?? "",
  _intervalId: null,
  _listeners: /* @__PURE__ */ new Set(),
  start() {
    this._intervalId === null && (this._intervalId = setInterval(() => {
      let newLocation = globalThis.window.location;
      newLocation.href !== this._currentHref && (this._currentHref = newLocation.href, this._listeners.forEach((listener) => listener(newLocation)));
    }, 100));
  },
  stop() {
    this._intervalId !== null && (clearInterval(this._intervalId), this._intervalId = null);
  },
  subscribe(...listeners) {
    return listeners.forEach((listener) => this._listeners.add(listener)), this.start(), () => {
      listeners.forEach((listener) => this._listeners.delete(listener)), this._listeners.size === 0 && this.stop();
    };
  }
}, useLocationHash = () => {
  let [hash, setHash] = useState(globalThis.window?.location.hash ?? "");
  return useEffect(() => LocationMonitor.subscribe((location2) => setHash(location2.hash)), []), hash.slice(1);
};

// src/shared/checklist-store/checklistData.tsx
var CodeWrapper = styled.div(({ theme }) => ({
  alignSelf: "stretch",
  background: theme.background.content,
  borderRadius: theme.appBorderRadius,
  margin: "5px 0",
  padding: 10,
  fontSize: theme.typography.size.s1,
  ".linenumber": {
    opacity: 0.5
  }
})), CodeSnippet = (props) => react_default.createElement(ThemeProvider, { theme: convert(themes.dark) }, react_default.createElement(CodeWrapper, null, react_default.createElement(SyntaxHighlighter, { ...props }))), isExample = (id) => id.startsWith("example-") || id.startsWith("configure-your-project--"), subscribeToIndex = (condition) => ({ api, done }) => {
  let check = () => condition(
    Object.entries(api.getIndex()?.entries || {}).reduce(
      (acc, [id, entry]) => isExample(entry.id) ? acc : Object.assign(acc, { [id]: entry }),
      {}
    )
  );
  if (check())
    done();
  else
    return api.once(PREVIEW_INITIALIZED, () => check() && done()), api.on(STORY_INDEX_INVALIDATED, () => check() && done());
}, checklistData = {
  sections: [
    {
      id: "basics",
      title: "Storybook basics",
      items: [
        {
          id: "guidedTour",
          label: "Take the guided tour",
          available: ({ index }) => !!index && "example-button--primary" in index && !!globalThis?.FEATURES?.controls && addons.experimental_getRegisteredAddons().includes(ADDON_ID2),
          criteria: "Guided tour is completed",
          subscribe: ({ api, accept }) => api.on(ADDON_ONBOARDING_CHANNEL, ({ step, type }) => {
            type !== "dismiss" && ["6:IntentSurvey", "7:FinishedOnboarding"].includes(step) && accept();
          }),
          action: {
            label: "Start",
            onClick: ({ api }) => {
              let path = api.getUrlState().path || "";
              path.startsWith("/story/") ? document.location.href = `/?path=${path}&onboarding=true` : document.location.href = "/?onboarding=true";
            }
          }
        },
        {
          id: "onboardingSurvey",
          label: "Complete the onboarding survey",
          available: () => addons.experimental_getRegisteredAddons().includes(ADDON_ID2),
          afterCompletion: "immutable",
          criteria: "Onboarding survey is completed",
          subscribe: ({ api, accept }) => api.on(ADDON_ONBOARDING_CHANNEL, ({ type }) => type === "survey" && accept()),
          action: {
            label: "Open",
            onClick: ({ api }) => {
              let path = api.getUrlState().path || "";
              document.location.href = `/?path=${path}&onboarding=survey`;
            }
          }
        },
        {
          id: "renderComponent",
          label: "Render your first component",
          criteria: "A story finished rendering successfully",
          subscribe: ({ api, done }) => api.on(
            STORY_FINISHED,
            ({ storyId, status }) => status === "success" && !isExample(storyId) && done()
          ),
          content: ({ api }) => react_default.createElement(react_default.Fragment, null, react_default.createElement("p", null, "Storybook renders your components in isolation, using stories. That allows you to work on the bit of UI you need, without worrying about the rest of the app."), react_default.createElement("p", null, "Rendering your components can often require", " ", react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "writing-stories/decorators",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank"
            },
            "setting up surrounding context in decorators"
          ), " ", "or", " ", react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "configure/styling-and-css",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank"
            },
            "applying global styles"
          ), ". Once you've got it working for one component, you're ready to make Storybook the home for all of your UI."), react_default.createElement("p", null, "Stories are written in CSF, a format specifically designed to help with UI development. Here's an example:"), react_default.createElement(CodeSnippet, { language: "typescript" }, `// Button.stories.ts
// Replace your-framework with the framework you are using, e.g. react-vite, nextjs, nextjs-vite, etc.
import type { Meta, StoryObj } from '@storybook/your-framework';
 
import { Button } from './Button';
 
const meta = {
  // \u{1F447} The component you're working on
  component: Button,
} satisfies Meta<typeof Button>;
 
export default meta;
// \u{1F447} Type helper to reduce boilerplate 
type Story = StoryObj<typeof meta>;

// \u{1F447} A story named Primary that renders \`<Button primary label="Button" />\`
export const Primary: Story = {
  args: {
    primary: true,
    label: 'Button',
  },
};`), react_default.createElement("p", null, react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "writing-stories",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank",
              withArrow: !0
            },
            "Learn more about stories"
          )))
        },
        {
          id: "moreComponents",
          label: "Add 5 components",
          content: ({ api }) => react_default.createElement(react_default.Fragment, null, react_default.createElement("p", null, "Storybook gets better as you add more components. Start with the easy ones, like Button or Avatar, and work your way up to more complex components, like Select, Autocomplete, or even full pages."), react_default.createElement(
            "img",
            {
              src: api.getDocsUrl({
                asset: "onboarding/sidebar-components.png",
                ref: "guide"
              }),
              alt: "Components in the sidebar"
            }
          ), react_default.createElement("p", null, react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "get-started/whats-a-story#create-a-new-story",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank",
              withArrow: !0
            },
            "Learn how to add components without writing any code"
          ))),
          criteria: "At least 5 components exist in the index",
          subscribe: subscribeToIndex((entries) => {
            let stories = Object.values(entries).filter(
              (entry) => entry.type === "story"
            );
            return new Set(stories.map(({ title: title2 }) => title2)).size >= 5;
          })
        },
        {
          id: "moreStories",
          label: "Add 20 stories",
          content: ({ api }) => react_default.createElement(react_default.Fragment, null, react_default.createElement("p", null, "More stories for your components means better documentation and more test coverage."), react_default.createElement(
            "img",
            {
              src: api.getDocsUrl({
                asset: "onboarding/sidebar-many-stories.png",
                ref: "guide"
              }),
              alt: "Stories in the sidebar"
            }
          ), react_default.createElement("p", null, react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "essentials/controls#creating-and-editing-stories-from-controls",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank",
              withArrow: !0
            },
            "Learn how to use Controls to add stories without writing any code"
          ))),
          criteria: "At least 20 stories exist in the index",
          subscribe: subscribeToIndex((entries) => Object.values(entries).filter(
            (entry) => entry.type === "story"
          ).length >= 20)
        },
        {
          id: "whatsNewStorybook10",
          label: "See what's new",
          criteria: "What's New page is opened",
          action: {
            label: "Go",
            onClick: ({ api }) => api.navigate("/settings/whats-new")
          },
          subscribe: ({ accept }) => LocationMonitor.subscribe((l3) => l3.search.endsWith("/settings/whats-new") && accept())
        }
      ]
    },
    {
      id: "development",
      title: "Development",
      items: [
        {
          id: "controls",
          label: "Change a story with Controls",
          available: () => !!globalThis?.FEATURES?.controls,
          criteria: "Story args are updated",
          subscribe: ({ api, done }) => api.on(STORY_ARGS_UPDATED, done),
          content: ({ api }) => react_default.createElement(react_default.Fragment, null, react_default.createElement("p", null, "When you change the value of one of the inputs in the Controls table, the story automatically updates to reflect that change. It's a great way to explore how a component handles various inputs."), react_default.createElement(
            "img",
            {
              src: api.getDocsUrl({
                asset: "api/doc-block-controls.png",
                ref: "guide"
              }),
              alt: "Screenshot of Controls block"
            }
          ), react_default.createElement("strong", null, "Take it further"), react_default.createElement("p", null, "Read the", " ", react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "essentials/controls",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank"
            },
            "Controls documentation"
          ), " ", "to learn:"), react_default.createElement("ul", null, react_default.createElement("li", null, "How to use the Controls panel to edit or save a new story"), react_default.createElement("li", null, "How to configure the table")))
        },
        {
          id: "viewports",
          label: "Check responsiveness with Viewports",
          available: () => !!globalThis?.FEATURES?.viewport,
          criteria: "Viewport global is updated",
          subscribe: ({ api, done }) => api.on(UPDATE_GLOBALS, ({ globals }) => globals?.viewport && done()),
          content: ({ api }) => react_default.createElement(react_default.Fragment, null, react_default.createElement("p", null, "Many UI components need to be responsive to the viewport size. Storybook has built-in support for previewing stories in various device sizes."), react_default.createElement(
            "img",
            {
              src: api.getDocsUrl({
                asset: "onboarding/viewports-menu.png",
                ref: "guide"
              }),
              alt: "Screenshot of Viewports menu"
            }
          ), react_default.createElement("strong", null, "Take it further"), react_default.createElement("p", null, "Read the", " ", react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "essentials/viewport",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank"
            },
            "Viewports documentation"
          ), " ", "to learn:"), react_default.createElement("ul", null, react_default.createElement("li", null, "How to configure which viewports are available"), react_default.createElement("li", null, "How to force a story to ", react_default.createElement("em", null, "always"), " render in a specific viewport")))
        },
        {
          id: "organizeStories",
          label: "Group your components",
          criteria: "A root node exists in the index",
          subscribe: subscribeToIndex(
            (entries) => Object.values(entries).some(({ title: title2 }) => title2.includes("/"))
          ),
          content: ({ api }) => react_default.createElement(react_default.Fragment, null, react_default.createElement("p", null, "It's helpful for projects to organize their sidebar into groups. We're big fans of Atomic Design (atoms, molecules, organisms, pages), but we've also seen organization by domain (profile, billing, dashboard, etc). Being organized helps everyone use your Storybook more effectively."), react_default.createElement("p", null, "You can create a section like so:"), react_default.createElement(CodeSnippet, { language: "typescript" }, `// Button.stories.js

export default {
  component: Button,
-  title: 'Button', // You may not have this
+  title: 'Atoms/Button',
}`), react_default.createElement("p", null, "Which would look like:"), react_default.createElement(
            "img",
            {
              src: api.getDocsUrl({
                asset: "onboarding/sidebar-with-groups.png",
                ref: "guide"
              }),
              alt: "Grouped components in the sidebar"
            }
          ), react_default.createElement("strong", null, "Take it further"), react_default.createElement("p", null, "Read the", " ", react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "writing-stories/naming-components-and-hierarchy",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank"
            },
            "story organization documentation"
          ), " ", "to learn:"), react_default.createElement("ul", null, react_default.createElement("li", null, "The full hierarchy available"), react_default.createElement("li", null, "How to configure the sorting of your stories")))
        }
      ]
    },
    {
      id: "testing",
      title: "Testing",
      items: [
        {
          id: "installVitest",
          label: "Install Vitest addon",
          afterCompletion: "unavailable",
          available: () => !!globalThis.STORYBOOK_FRAMEWORK && SUPPORTED_FRAMEWORKS.includes(globalThis.STORYBOOK_FRAMEWORK),
          criteria: "@storybook/addon-vitest registered in .storybook/main.js|ts",
          subscribe: ({ done }) => {
            addons.experimental_getRegisteredAddons().includes(ADDON_ID4) && done();
          },
          content: ({ api }) => react_default.createElement(react_default.Fragment, null, react_default.createElement("p", null, "Run this command to install the Vitest addon, enabling you to run component tests on your stories inside Storybook\u2019s UI:"), react_default.createElement(CodeSnippet, { language: "bash" }, "npx storybook add @storybook/addon-vitest"), react_default.createElement("p", null, react_default.createElement("em", null, "Restart your Storybook after installing the addon.")), react_default.createElement(
            "img",
            {
              src: api.getDocsUrl({
                asset: "writing-tests/testing-ui-overview.png",
                ref: "guide"
              }),
              alt: "Storybook app with story status indicators, testing widget, and addon panel annotated"
            }
          ), react_default.createElement("p", null, react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "writing-tests/integrations/vitest-addon",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank",
              withArrow: !0
            },
            "Learn more about the Vitest addon"
          )))
        },
        {
          id: "runTests",
          after: ["installVitest"],
          label: "Test your components",
          criteria: "Component tests are run from the test widget in the sidebar",
          subscribe: ({ done }) => internal_universalTestProviderStore.onStateChange(
            (state) => state["storybook/test"] === "test-provider-state:succeeded" && done()
          ),
          action: {
            label: "Start",
            onClick: () => TourGuide.render({
              // eslint-disable-next-line @typescript-eslint/ban-ts-comment
              // @ts-ignore Circular reference in Step type
              steps: [
                {
                  title: "Testing widget",
                  content: "Run tests right from your Storybook sidebar using the testing widget.",
                  placement: "right-end",
                  target: "#storybook-testing-module",
                  highlight: "#storybook-testing-module",
                  onNext: ({ next }) => {
                    let toggle = document.getElementById("testing-module-collapse-toggle");
                    toggle?.getAttribute("aria-label") === "Expand testing module" ? (toggle.click(), setTimeout(next, 300)) : next();
                  }
                },
                {
                  title: "Start a test run",
                  content: "Start a test run at the click of a button using Vitest.",
                  placement: "right",
                  target: '[data-module-id="storybook/test/test-provider"] button[aria-label="Start test run"]',
                  highlight: '[data-module-id="storybook/test/test-provider"] button[aria-label="Start test run"]',
                  hideNextButton: !0
                }
              ]
            })
          },
          content: ({ api }) => react_default.createElement(react_default.Fragment, null, react_default.createElement("p", null, "Stories make great test cases. You can quickly test all of your stories directly from the test widget, at the bottom of the sidebar."), react_default.createElement(
            "img",
            {
              src: api.getDocsUrl({
                asset: "onboarding/test-widget-with-failures.png",
                ref: "guide"
              }),
              alt: "Test widget showing test failures"
            }
          ), react_default.createElement("p", null, "Use the menu on a story or component to see details about a test failure or run tests for just that selection."), react_default.createElement(
            "img",
            {
              src: api.getDocsUrl({
                asset: "writing-tests/context-menu.png",
                ref: "guide"
              }),
              alt: "Screenshot of story sidebar item with open menu"
            }
          ), react_default.createElement("strong", null, "Take it further"), react_default.createElement("p", null, "Read the", " ", react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "writing-tests#component-tests",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank"
            },
            "component testing documentation"
          ), " ", "to learn:"), react_default.createElement("ul", null, react_default.createElement("li", null, "About helpful features, like watch mode and sidebar filtering"), react_default.createElement("li", null, "How to run tests via CLI and in CI"), react_default.createElement("li", null, "About other capabilities, like accessibility checks and code coverage reporting")))
        },
        {
          id: "writeInteractions",
          label: "Test functionality with interactions",
          available: () => !!globalThis?.FEATURES?.interactions,
          criteria: "At least one story with a play or test function",
          subscribe: subscribeToIndex(
            (entries) => Object.values(entries).some(
              (entry) => entry.tags?.includes("play-fn") || entry.tags?.includes("test-fn")
            )
          ),
          content: ({ api }) => react_default.createElement(react_default.Fragment, null, react_default.createElement("p", null, "When you need to test non-visual or particularly complex behavior of a component, add a play function."), react_default.createElement(CodeSnippet, { language: "typescript" }, `// Button.stories.ts
// Replace your-framework with the framework you are using, e.g. react-vite, nextjs, nextjs-vite, etc.
import type { Meta, StoryObj } from '@storybook/your-framework';
import { expect, fn } from 'storybook/test';
 
import { Button } from './Button';
 
const meta = {
  component: Button,
  args: {
    // \u{1F447} Provide a mock function to spy on
    onClick: fn(),
  },
} satisfies Meta<typeof Button>;
 
export default meta;
type Story = StoryObj<typeof meta>;

export const Disabled: Story = {
  args: {
    disabled: true,
    label: 'Button',
  },
  play: async function({ args, canvas, userEvent }) {
    const button = canvas.getByRole('button', { name: /button/i });
		
    // \u{1F447} Simulate behavior
    await userEvent.click(button);
    
    // \u{1F447} Make assertions
    await expect(button).toBeDisabled();
    await expect(args.onClick).not.toHaveBeenCalled();
  }
};`), react_default.createElement("p", null, "You can interact with and debug each step defined in a play function within the Interactions panel."), react_default.createElement(
            "img",
            {
              src: api.getDocsUrl({
                asset: "writing-tests/interaction-test-pass.png",
                ref: "guide"
              }),
              alt: "Storybook with a LoginForm component and passing interactions in the Interactions panel"
            }
          ), react_default.createElement("strong", null, "Take it further"), react_default.createElement("p", null, "Read the", " ", react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "writing-tests/interaction-testing",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank"
            },
            "interaction testing documentation"
          ), " ", "to learn:"), react_default.createElement("ul", null, react_default.createElement("li", null, "The full ", react_default.createElement("code", null, "play"), " function API"), react_default.createElement("li", null, "How to run code before and after tests"), react_default.createElement("li", null, "How to group interactions into steps")))
        },
        {
          id: "installA11y",
          label: "Install Accessibility addon",
          afterCompletion: "unavailable",
          criteria: "@storybook/addon-a11y registered in .storybook/main.js|ts",
          subscribe: ({ done }) => {
            addons.experimental_getRegisteredAddons().includes(ADDON_ID) && done();
          },
          content: ({ api }) => react_default.createElement(react_default.Fragment, null, react_default.createElement("p", null, "Accessibility tests help ensure your UI is usable by everyone, no matter their ability."), react_default.createElement("p", null, "If you are not yet using the accessibility addon, run this command to install and set it up, enabling you to run accessibility checks alongside your component tests:"), react_default.createElement(CodeSnippet, { language: "bash" }, "npx storybook add @storybook/addon-a11y"), react_default.createElement("p", null, react_default.createElement("em", null, "Restart your Storybook after installing the addon.")), react_default.createElement("p", null, react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "writing-tests/accessibility-testing",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank",
              withArrow: !0
            },
            "Learn more about the Accessibility addon"
          )))
        },
        {
          id: "accessibilityTests",
          after: ["installA11y"],
          label: "Run accessibility tests",
          criteria: "Accessibility tests are run from the test widget in the sidebar",
          subscribe: ({ api, done }) => api.on(
            STORYBOOK_ADDON_TEST_CHANNEL,
            ({ type, payload }) => type === "test-run-completed" && payload.config.a11y && done()
          ),
          content: ({ api }) => react_default.createElement(react_default.Fragment, null, react_default.createElement("p", null, "Expand the test widget, check the Accessibility checkbox, and click the Run component tests button."), react_default.createElement(
            "img",
            {
              src: api.getDocsUrl({
                asset: "writing-tests/test-widget-a11y-enabled.png",
                ref: "guide"
              }),
              alt: "Testing widget with accessibility activated"
            }
          ), react_default.createElement("p", null, "If there are any failures, you can use the Accessibility panel to debug any violations."), react_default.createElement(
            "img",
            {
              src: api.getDocsUrl({
                asset: "writing-tests/addon-a11y-debug-violations.png",
                ref: "guide"
              }),
              alt: "Storybook app with accessibility panel open, showing violations and an interactive popover on the violating elements in the preview"
            }
          ), react_default.createElement("strong", null, "Take it further"), react_default.createElement("p", null, "Read the", " ", react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "writing-tests/accessibility-testing",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank"
            },
            "accessibility testing documentation"
          ), " ", "to learn:"), react_default.createElement("ul", null, react_default.createElement("li", null, "The recommended workflow"), react_default.createElement("li", null, "How to run accessibility tests via CLI and in CI"), react_default.createElement("li", null, "How to configure accessibility checks")))
        },
        {
          id: "installChromatic",
          label: "Install Visual Tests addon",
          afterCompletion: "unavailable",
          available: () => !0,
          // TODO check for compatibility with the project (not React Native)
          criteria: "@chromatic-com/storybook registered in .storybook/main.js|ts",
          subscribe: ({ done }) => {
            addons.experimental_getRegisteredAddons().includes("chromaui/addon-visual-tests") && done();
          },
          content: ({ api }) => react_default.createElement(react_default.Fragment, null, react_default.createElement("p", null, "Visual tests verify the appearance of your UI components."), react_default.createElement("p", null, "If you are not yet using the visual tests addon, run this command to install and set it up, enabling you to run visual tests on your stories (this requires a free Chromatic account):"), react_default.createElement(CodeSnippet, { language: "bash" }, "npx storybook add @chromatic-com/storybook"), react_default.createElement("p", null, react_default.createElement("em", null, "Restart your Storybook after installing the addon.")), react_default.createElement("p", null, react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "writing-tests/visual-testing",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank",
              withArrow: !0
            },
            "Learn more about the Visual Tests addon"
          )))
        },
        {
          id: "visualTests",
          after: ["installChromatic"],
          label: "Run visual tests",
          criteria: "Visual tests are run from the test widget in the sidebar or the Visual Tests panel",
          subscribe: ({ api, done }) => api.on("chromaui/addon-visual-tests/startBuild", done),
          content: ({ api }) => react_default.createElement(react_default.Fragment, null, react_default.createElement("p", null, "Expand the test widget and click the Run visual tests button."), react_default.createElement(
            "img",
            {
              src: api.getDocsUrl({
                asset: "writing-tests/test-widget-expanded-with-vta.png",
                ref: "guide"
              }),
              alt: "Expanded testing widget, showing the Visual tests section"
            }
          ), react_default.createElement("p", null, "You can use the Visual tests panel to verify the resulting diffs as either an unexpected change which needs fixed or an expected change which can then be accepted and become the new baseline."), react_default.createElement(
            "img",
            {
              src: api.getDocsUrl({
                asset: "writing-tests/vta-run-from-panel.png",
                ref: "guide"
              }),
              alt: "Visual tests addon panel showing a diff from the baseline"
            }
          ), react_default.createElement("strong", null, "Take it further"), react_default.createElement("p", null, "Read the", " ", react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "writing-tests/visual-testing",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank"
            },
            "visual testing documentation"
          ), " ", "to learn:"), react_default.createElement("ul", null, react_default.createElement("li", null, "How to automate your visual tests in CI")))
        },
        {
          id: "coverage",
          after: ["installVitest"],
          label: "Generate a coverage report",
          criteria: "Generate a coverage report",
          subscribe: ({ api, done }) => api.on(
            STORYBOOK_ADDON_TEST_CHANNEL,
            ({ type, payload }) => type === "test-run-completed" && payload.config.coverage && done()
          ),
          content: ({ api }) => react_default.createElement(react_default.Fragment, null, react_default.createElement("p", null, "Coverage reports show you which code is\u2014and, more importantly\u2014isn't executed while running your component tests. You use it to be sure you're testing the right things."), react_default.createElement("p", null, "To generate a coverage report, expand the test widget in the sidebar and check the Coverage checkbox. The next time you run component tests, it will generate an interactive report, which you can view by clicking the results summary in the test widget."), react_default.createElement(
            "img",
            {
              src: api.getDocsUrl({
                asset: "writing-tests/test-widget-coverage-summary.png",
                ref: "guide"
              }),
              alt: "Test widget with coverage summary"
            }
          ), react_default.createElement("strong", null, "Take it further"), react_default.createElement("p", null, "Read the", " ", react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "writing-tests/test-coverage",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank"
            },
            "test coverage documentation"
          ), " ", "to learn:"), react_default.createElement("ul", null, react_default.createElement("li", null, "How to automate reporting in CI"), react_default.createElement("li", null, "How to configure the coverage results")))
        },
        {
          id: "ciTests",
          label: "Automate tests in CI",
          criteria: "Have a CI workflow that runs component tests, either with Vitest or Chromatic",
          content: ({ api }) => react_default.createElement(react_default.Fragment, null, react_default.createElement("p", null, "Automating component tests in CI is the best tool ensuring the quality and reliability of your project."), react_default.createElement("p", null, "You can automate all of Storybook's tests by using Chromatic or by running the", react_default.createElement("code", null, "vitest --project storybook"), " command in your CI scripts."), react_default.createElement(
            "img",
            {
              src: api.getDocsUrl({
                asset: "writing-tests/test-ci-workflow-pr-status-checks.png",
                ref: "guide"
              }),
              alt: 'GitHub pull request status checks, with a failing "UI Tests / test" check'
            }
          ), react_default.createElement("strong", null, "Take it further"), react_default.createElement("p", null, "Read the", " ", react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "writing-tests/in-ci",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank"
            },
            "testing in CI documentation"
          ), " ", "to learn:"), react_default.createElement("ul", null, react_default.createElement("li", null, "How to test in your CI platform (GitHub Actions, Circle CI, etc.)"), react_default.createElement("li", null, "How to debug test failures in a published Storybook"), react_default.createElement("li", null, "How to run your other Vitest tests alongside your Storybook tests")))
        }
      ]
    },
    {
      id: "document",
      title: "Document",
      items: [
        {
          id: "installDocs",
          label: "Install Docs addon",
          afterCompletion: "unavailable",
          criteria: "@storybook/addon-docs registered in .storybook/main.js|ts",
          subscribe: ({ done }) => {
            addons.experimental_getRegisteredAddons().includes(ADDON_ID5) && done();
          },
          content: ({ api }) => react_default.createElement(react_default.Fragment, null, react_default.createElement("p", null, "Storybook Docs transforms your Storybook stories into component documentation. Add the Docs addon to your Storybook project to get started:"), react_default.createElement(CodeSnippet, { language: "bash" }, "npx storybook add @storybook/addon-docs"), react_default.createElement("p", null, react_default.createElement("em", null, "Restart your Storybook after installing the addon.")), react_default.createElement("p", null, react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "writing-docs",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank",
              withArrow: !0
            },
            "Learn more about Storybook Docs"
          )))
        },
        {
          id: "autodocs",
          after: ["installDocs"],
          label: "Automatically document your components",
          criteria: "At least one component with the autodocs tag applied",
          subscribe: subscribeToIndex(
            (entries) => Object.values(entries).some((entry) => entry.tags?.includes("autodocs"))
          ),
          content: ({ api }) => react_default.createElement(react_default.Fragment, null, react_default.createElement("p", null, "Add the autodocs tag to a component's meta to automatically generate documentation for that component, complete with examples, source code, an API table, and a description."), react_default.createElement(CodeSnippet, { language: "typescript" }, `// Button.stories.js

const meta = {
  component: Button,
  tags: ['autodocs'], // \u{1F448} Add this tag
}
  
export default meta;`), react_default.createElement("p", null, "That tag can also be applied in ", react_default.createElement("code", null, ".storybook/preview.ts"), ", to generate documentation for ", react_default.createElement("em", null, "all"), " components."), react_default.createElement(
            "img",
            {
              src: api.getDocsUrl({
                asset: "writing-docs/autodocs.png",
                ref: "guide"
              }),
              alt: "Storybook autodocs page, showing a title, description, primary story, controls table, and additional stories"
            }
          ), react_default.createElement("strong", null, "Take it further"), react_default.createElement("p", null, "Read the", " ", react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "writing-docs/autodocs",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank"
            },
            "autodocs documentation"
          ), " ", "to learn:"), react_default.createElement("ul", null, react_default.createElement("li", null, "How to generate a table of contents"), react_default.createElement("li", null, "How to enhance your component documentation with JSDoc comments"), react_default.createElement("li", null, "How to customize the generated page")))
        },
        {
          id: "mdxDocs",
          after: ["installDocs"],
          label: "Custom content with MDX",
          criteria: "At least one MDX page",
          subscribe: subscribeToIndex(
            (entries) => Object.values(entries).some((entry) => entry.type === "docs")
          ),
          content: ({ api }) => react_default.createElement(react_default.Fragment, null, react_default.createElement("p", null, "You can use MDX (markdown + React components) to provide an introduction to your project, document things like design tokens, or go beyond the automatic documentation for your components."), react_default.createElement("p", null, "For a start, create an ", react_default.createElement("code", null, "introduction.mdx"), " file and (using markdown and Storybook's", " ", react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "writing-docs/doc-blocks",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank"
            },
            "doc blocks"
          ), ") write a usage guide for your project."), react_default.createElement(CodeSnippet, { language: "jsx" }, `{ /* introduction.mdx */ }
import { Meta, Title, Subtitle, Description } from '@storybook/addon-docs/blocks';

<Meta title="Get started" />
 
<Title>Get started with My Awesome Project</Title>

<Subtitle>It's really awesome</Subtitle>

<Description>
  My Awesome Project is designed to work with Your Awesome Project seamlessly.
  Follow this guide and you'll be ready in no time.
</Description>

## Install

\`\`\`sh
npm install @my/awesome-project
\`\`\``), react_default.createElement("strong", null, "Take it further"), react_default.createElement("p", null, "Read the", " ", react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "writing-docs/mdx",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank"
            },
            "MDX documentation"
          ), " ", "to learn:"), react_default.createElement("ul", null, react_default.createElement("li", null, "How to reference stories in your content"), react_default.createElement("li", null, "How to import and display markdown files, such as READMEs")))
        },
        {
          id: "publishStorybook",
          label: "Publish your Storybook to share",
          criteria: "Have some form of `storybook build` in the project's CI config",
          content: ({ api }) => react_default.createElement(react_default.Fragment, null, react_default.createElement("p", null, "Publishing your Storybook is easy and unlocks super clear review cycles and other collaborative workflows."), react_default.createElement("p", null, "Run ", react_default.createElement("code", null, "npx storybook build"), " in CI and deploy it using services like", " ", react_default.createElement(Link, { href: "https://chromatic.com", target: "_blank" }, "Chromatic"), ",", " ", react_default.createElement(Link, { href: "https://vercel.com", target: "_blank", rel: "noopener noreferrer" }, "Vercel"), ", or", " ", react_default.createElement(Link, { href: "https://www.netlify.com", target: "_blank", rel: "noopener noreferrer" }, "Netlify"), "."), react_default.createElement(
            "img",
            {
              src: api.getDocsUrl({
                asset: "sharing/prbadge-publish.png",
                ref: "guide"
              }),
              alt: "PR check for publish action"
            }
          ), react_default.createElement("strong", null, "Take it further"), react_default.createElement("p", null, "Read the", " ", react_default.createElement(
            Link,
            {
              href: api.getDocsUrl({
                subpath: "sharing/publish-storybook",
                renderer: !0,
                ref: "guide"
              }),
              target: "_blank"
            },
            "publishing documentation"
          ), " ", "to learn:"), react_default.createElement("ul", null, react_default.createElement("li", null, "How to configure the built Storybook (e.g. performance optimizations)"), react_default.createElement("li", null, "How to use your published Storybook to collaborate with colleagues")))
        }
      ]
    }
  ]
};

// src/manager/components/sidebar/useChecklist.ts
var subscriptions = /* @__PURE__ */ new Map(), useStoryIndex = () => {
  let state = useStorybookState(), [index, setIndex] = useState(() => state.index), updateIndex = useMemo(() => throttle(setIndex, 500), []);
  return useEffect(() => updateIndex(state.index), [state.index, updateIndex]), useEffect(() => () => updateIndex.cancel?.(), [updateIndex]), index;
}, checkAvailable = (item, itemsById, context) => {
  if (item.available && !item.available(context))
    return !1;
  for (let afterId of item.after ?? [])
    if (itemsById[afterId] && !checkAvailable(itemsById[afterId], itemsById, context))
      return !1;
  return !0;
}, checkSkipped = (item, itemsById, state) => {
  if (state[item.id].status === "skipped")
    return !0;
  for (let afterId of item.after ?? [])
    if (itemsById[afterId] && checkSkipped(itemsById[afterId], itemsById, state))
      return !0;
  return !1;
}, getAncestorIds = (item, itemsById) => !item.after || item.after.length === 0 ? [] : item.after.flatMap((afterId) => {
  let afterItem = itemsById[afterId];
  return afterItem ? [...getAncestorIds(afterItem, itemsById), afterId] : [];
}), checkLockedBy = (item, itemsById, state) => getAncestorIds(item, itemsById).find(
  (id) => state[id].status !== "accepted" && state[id].status !== "done"
), useChecklist = () => {
  let api = useStorybookApi(), index = useStoryIndex(), [checklistState] = experimental_useUniversalStore(internal_universalChecklistStore), { loaded, items, widget } = checklistState, itemsById = useMemo(() => Object.fromEntries(
    checklistData.sections.flatMap(
      ({ items: items2, id: sectionId, title: sectionTitle }, sectionIndex) => items2.map(({ id, ...item }, itemIndex) => [id, { id, itemIndex, sectionId, sectionIndex, sectionTitle, ...item }])
    )
  ), []), allItems = useMemo(() => Object.values(itemsById).map((item) => {
    let { status, mutedAt } = items[item.id], isOpen = status === "open", isAccepted = status === "accepted", isDone = status === "done", isCompleted = isAccepted || isDone, isSkipped = !isCompleted && checkSkipped(item, itemsById, items), isMuted = !!mutedAt || !!widget.disable, isAvailable = isCompleted ? item.afterCompletion !== "unavailable" : checkAvailable(item, itemsById, { api, index, item }), isLockedBy = checkLockedBy(item, itemsById, items), isImmutable = isCompleted && item.afterCompletion === "immutable";
    return {
      ...item,
      isAvailable,
      isOpen,
      isLockedBy,
      isImmutable,
      isReady: isOpen && isAvailable && !isMuted && !isLockedBy,
      isCompleted,
      isAccepted,
      isDone,
      isSkipped,
      isMuted
    };
  }), [itemsById, items, widget, api, index]), itemCollections = useMemo(() => {
    let availableItems = allItems.filter((item) => item.isAvailable), openItems = availableItems.filter((item) => item.isOpen), readyItems = openItems.filter((item) => item.isReady), nextItems = Object.values(
      readyItems.reduce((acc, item) => (acc[item.sectionId] ??= [], acc[item.sectionId].push({ ...item, itemIndex: acc[item.sectionId].length }), acc), {})
    ).flat().sort((a2, b2) => a2.itemIndex - b2.itemIndex).slice(0, 3).sort((a2, b2) => a2.sectionIndex - b2.sectionIndex), progress = availableItems.length ? Math.round((availableItems.length - openItems.length) / availableItems.length * 100) : 100;
    return { availableItems, openItems, readyItems, nextItems, progress };
  }, [allItems]);
  return useEffect(() => {
    if (loaded)
      for (let item of allItems) {
        if (!item.subscribe)
          continue;
        let subscribed = subscriptions.has(item.id);
        if (item.isOpen && item.isAvailable && !subscribed)
          subscriptions.set(
            item.id,
            item.subscribe({
              api,
              item,
              accept: () => internal_checklistStore.accept(item.id),
              done: () => internal_checklistStore.done(item.id),
              skip: () => internal_checklistStore.skip(item.id)
            })
          );
        else if (subscribed && !(item.isOpen && item.isAvailable)) {
          let unsubscribe = subscriptions.get(item.id);
          subscriptions.delete(item.id), typeof unsubscribe == "function" && unsubscribe();
        }
      }
  }, [api, loaded, allItems]), {
    allItems,
    ...itemCollections,
    ...internal_checklistStore,
    ...checklistState
  };
};

// src/manager/container/Menu.tsx
var Key = styled.span(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  height: 16,
  fontSize: "11px",
  fontWeight: theme.typography.weight.regular,
  background: theme.base === "light" ? "rgba(0,0,0,0.05)" : "rgba(255,255,255,0.05)",
  color: theme.base === "light" ? theme.color.dark : theme.textMutedColor,
  borderRadius: 2,
  userSelect: "none",
  pointerEvents: "none",
  padding: "0 4px"
})), KeyChild = styled.code(({ theme }) => ({
  padding: 0,
  fontFamily: theme.typography.fonts.base,
  verticalAlign: "middle",
  "& + &": {
    marginLeft: 6
  }
})), ProgressCircle = styled(ProgressSpinner)(({ theme }) => ({
  color: theme.color.secondary
})), Shortcut = ({ keys }) => react_default.createElement(Key, null, keys.map((key) => react_default.createElement(KeyChild, { key }, shortcutToHumanString([key])))), useMenu = ({
  api,
  showToolbar,
  isPanelShown,
  isNavShown,
  enableShortcuts
}) => {
  let shortcutKeys = api.getShortcutKeys(), { progress } = useChecklist(), about = useMemo(
    () => ({
      id: "about",
      title: "About your Storybook",
      onClick: () => api.changeSettingsTab("about"),
      closeOnClick: !0,
      icon: react_default.createElement(InfoIcon, null)
    }),
    [api]
  ), guide = useMemo(
    () => ({
      id: "guide",
      title: "Onboarding guide",
      onClick: () => api.changeSettingsTab("guide"),
      closeOnClick: !0,
      icon: react_default.createElement(ListUnorderedIcon, null),
      right: progress < 100 && react_default.createElement(ActionList.Button, { as: "div", readOnly: !0, padding: "none", ariaLabel: `${progress}% completed` }, react_default.createElement(ProgressCircle, { percentage: progress, running: !1, size: 16, width: 1.5 }), progress, "%")
    }),
    [api, progress]
  ), shortcuts = useMemo(
    () => ({
      id: "shortcuts",
      title: "Keyboard shortcuts",
      onClick: () => api.changeSettingsTab("shortcuts"),
      closeOnClick: !0,
      right: enableShortcuts ? react_default.createElement(Shortcut, { keys: shortcutKeys.shortcutsPage }) : null,
      icon: react_default.createElement(CommandIcon, null)
    }),
    [api, enableShortcuts, shortcutKeys.shortcutsPage]
  ), sidebarToggle = useMemo(
    () => ({
      id: "S",
      title: "Show sidebar",
      onClick: () => api.toggleNav(),
      closeOnClick: !0,
      active: isNavShown,
      right: enableShortcuts ? react_default.createElement(Shortcut, { keys: shortcutKeys.toggleNav }) : null,
      icon: isNavShown ? react_default.createElement(CheckIcon, null) : react_default.createElement(react_default.Fragment, null)
    }),
    [api, enableShortcuts, shortcutKeys, isNavShown]
  ), toolbarToogle = useMemo(
    () => ({
      id: "T",
      title: "Show toolbar",
      onClick: () => api.toggleToolbar(),
      active: showToolbar,
      right: enableShortcuts ? react_default.createElement(Shortcut, { keys: shortcutKeys.toolbar }) : null,
      icon: showToolbar ? react_default.createElement(CheckIcon, null) : react_default.createElement(react_default.Fragment, null)
    }),
    [api, enableShortcuts, shortcutKeys, showToolbar]
  ), addonsToggle = useMemo(
    () => ({
      id: "A",
      title: "Show addons panel",
      onClick: () => api.togglePanel(),
      active: isPanelShown,
      right: enableShortcuts ? react_default.createElement(Shortcut, { keys: shortcutKeys.togglePanel }) : null,
      icon: isPanelShown ? react_default.createElement(CheckIcon, null) : react_default.createElement(react_default.Fragment, null)
    }),
    [api, enableShortcuts, shortcutKeys, isPanelShown]
  ), up = useMemo(
    () => ({
      id: "up",
      title: "Previous component",
      onClick: () => api.jumpToComponent(-1),
      right: enableShortcuts ? react_default.createElement(Shortcut, { keys: shortcutKeys.prevComponent }) : null,
      icon: react_default.createElement(react_default.Fragment, null)
    }),
    [api, enableShortcuts, shortcutKeys]
  ), down = useMemo(
    () => ({
      id: "down",
      title: "Next component",
      onClick: () => api.jumpToComponent(1),
      right: enableShortcuts ? react_default.createElement(Shortcut, { keys: shortcutKeys.nextComponent }) : null,
      icon: react_default.createElement(react_default.Fragment, null)
    }),
    [api, enableShortcuts, shortcutKeys]
  ), prev = useMemo(
    () => ({
      id: "prev",
      title: "Previous story",
      onClick: () => api.jumpToStory(-1),
      right: enableShortcuts ? react_default.createElement(Shortcut, { keys: shortcutKeys.prevStory }) : null,
      icon: react_default.createElement(react_default.Fragment, null)
    }),
    [api, enableShortcuts, shortcutKeys]
  ), next = useMemo(
    () => ({
      id: "next",
      title: "Next story",
      onClick: () => api.jumpToStory(1),
      right: enableShortcuts ? react_default.createElement(Shortcut, { keys: shortcutKeys.nextStory }) : null,
      icon: react_default.createElement(react_default.Fragment, null)
    }),
    [api, enableShortcuts, shortcutKeys]
  ), collapse = useMemo(
    () => ({
      id: "collapse",
      title: "Collapse all",
      onClick: () => api.emit(STORIES_COLLAPSE_ALL),
      right: enableShortcuts ? react_default.createElement(Shortcut, { keys: shortcutKeys.collapseAll }) : null,
      icon: react_default.createElement(react_default.Fragment, null)
    }),
    [api, enableShortcuts, shortcutKeys]
  ), documentation = useMemo(() => ({
    id: "documentation",
    title: "Documentation",
    closeOnClick: !0,
    href: api.getDocsUrl({ versioned: !0, renderer: !0 }),
    right: react_default.createElement(ActionList.Icon, null, react_default.createElement(ShareAltIcon, null)),
    icon: react_default.createElement(DocumentIcon, null)
  }), [api]), getAddonsShortcuts = useCallback(() => {
    let addonsShortcuts = api.getAddonsShortcuts(), keys = shortcutKeys;
    return Object.entries(addonsShortcuts).filter(([_2, { showInMenu }]) => showInMenu).map(([actionName, { label, action }]) => ({
      id: actionName,
      title: label,
      onClick: () => action(),
      right: enableShortcuts ? react_default.createElement(Shortcut, { keys: keys[actionName] }) : null
    }));
  }, [api, enableShortcuts, shortcutKeys]);
  return useMemo(
    () => [
      [
        about,
        ...scope.CONFIG_TYPE === "DEVELOPMENT" ? [guide] : [],
        ...enableShortcuts ? [shortcuts] : []
      ],
      [sidebarToggle, toolbarToogle, addonsToggle, up, down, prev, next, collapse],
      getAddonsShortcuts(),
      [documentation]
    ],
    [
      about,
      guide,
      documentation,
      shortcuts,
      sidebarToggle,
      toolbarToogle,
      addonsToggle,
      up,
      down,
      prev,
      next,
      collapse,
      getAddonsShortcuts,
      enableShortcuts
    ]
  );
};

// src/manager/components/preview/tools/share.tsx
var { PREVIEW_URL, document: document2 } = scope, mapper3 = ({ state }) => {
  let { storyId, refId, refs } = state, { location: location2 } = document2, ref = refs[refId], baseUrl = `${location2.origin}${location2.pathname}`;
  return baseUrl.endsWith("/") || (baseUrl += "/"), {
    refId,
    baseUrl: ref ? `${ref.url}/iframe.html` : PREVIEW_URL || `${baseUrl}iframe.html`,
    storyId,
    queryParams: state.customQueryParams
  };
}, QRContainer = styled.div(() => ({
  display: "flex",
  alignItems: "center",
  padding: 8,
  maxWidth: 200
})), QRImageContainer = styled.div(() => ({
  width: 64,
  height: 64,
  marginRight: 12,
  backgroundColor: "white",
  padding: 2
})), QRImage = ({ value }) => {
  let theme = useTheme();
  return react_default.createElement(QRImageContainer, null, react_default.createElement(QRCodeSVG, { value, marginSize: 0, size: 60, fgColor: theme.color.darkest }));
}, QRContent = styled.div(() => ({})), QRTitle = styled.div(({ theme }) => ({
  fontWeight: theme.typography.weight.bold,
  fontSize: theme.typography.size.s1,
  marginBottom: 4
})), QRDescription = styled.div(({ theme }) => ({
  fontSize: theme.typography.size.s1,
  color: theme.textMutedColor
}));
function ShareMenu({
  baseUrl,
  storyId,
  queryParams,
  qrUrl,
  isDevelopment
}) {
  let shortcutKeys = useStorybookApi().getShortcutKeys(), enableShortcuts = !!shortcutKeys, [copied, setCopied] = useState(!1), copyStoryLink = shortcutKeys?.copyStoryLink, links = useMemo(() => {
    let baseLinks = [
      [
        {
          id: "copy-link",
          title: copied ? "Copied!" : "Copy story link",
          icon: react_default.createElement(LinkIcon, null),
          right: enableShortcuts ? react_default.createElement(Shortcut, { keys: copyStoryLink }) : null,
          onClick: () => {
            (0, import_copy_to_clipboard.default)(window.location.href), setCopied(!0), setTimeout(() => setCopied(!1), 2e3);
          }
        },
        {
          id: "open-new-tab",
          title: "Open in isolation mode",
          icon: react_default.createElement(BugIcon, null),
          onClick: () => {
            let href = getStoryHref(baseUrl, storyId, queryParams);
            window.open(href, "_blank", "noopener,noreferrer");
          }
        }
      ]
    ];
    return baseLinks.push([
      {
        id: "qr-section",
        // @ts-expect-error (non strict)
        content: react_default.createElement(QRContainer, null, react_default.createElement(QRImage, { value: qrUrl }), react_default.createElement(QRContent, null, react_default.createElement(QRTitle, null, "Scan to open"), react_default.createElement(QRDescription, null, isDevelopment ? "Device must be on the same network." : "View story on another device.")))
      }
    ]), baseLinks;
  }, [baseUrl, storyId, queryParams, copied, qrUrl, enableShortcuts, copyStoryLink, isDevelopment]);
  return react_default.createElement(TooltipLinkList, { links, style: { width: 210 } });
}
var shareTool = {
  title: "share",
  id: "share",
  type: types.TOOL,
  match: ({ viewMode, tabId }) => viewMode === "story" && !tabId,
  render: () => react_default.createElement(Consumer, { filter: mapper3 }, ({ baseUrl, storyId, queryParams }) => {
    let isDevelopment = scope.CONFIG_TYPE === "DEVELOPMENT", storyUrl = scope.STORYBOOK_NETWORK_ADDRESS ? new URL(window.location.search, scope.STORYBOOK_NETWORK_ADDRESS).href : window.location.href;
    return storyId ? react_default.createElement(
      PopoverProvider,
      {
        hasChrome: !0,
        placement: "bottom",
        padding: 0,
        popover: react_default.createElement(ShareMenu, { baseUrl, storyId, queryParams, qrUrl: storyUrl, isDevelopment })
      },
      react_default.createElement(Button, { padding: "small", variant: "ghost", ariaLabel: "Share", tooltip: "Share..." }, react_default.createElement(ShareIcon, null))
    ) : null;
  })
};

// src/manager/container/Preview.tsx
var defaultTabs = [createCanvasTab()], defaultTools = [menuTool, remountTool, zoomTool], defaultToolsExtra = [addonsTool, fullScreenTool, shareTool, openInEditorTool], emptyTabsList = [], memoizedTabs = (0, import_memoizerific.default)(1)(
  (_2, tabElements, parameters, showTabs) => showTabs ? filterTabs([...defaultTabs, ...Object.values(tabElements)], parameters) : emptyTabsList
), memoizedTools = (0, import_memoizerific.default)(1)(
  (_2, toolElements, filterProps) => filterToolsSide([...defaultTools, ...Object.values(toolElements)], ...filterProps)
), memoizedExtra = (0, import_memoizerific.default)(1)(
  (_2, extraElements, filterProps) => filterToolsSide([...defaultToolsExtra, ...Object.values(extraElements)], ...filterProps)
), memoizedWrapper = (0, import_memoizerific.default)(1)((_2, previewElements) => [
  ...defaultWrappers,
  ...Object.values(previewElements)
]), { PREVIEW_URL: PREVIEW_URL2 } = scope, splitTitleAddExtraSpace = (input) => input.split("/").join(" / ").replace(/\s\s/, " "), getDescription = (item) => {
  if (item?.type === "story" || item?.type === "docs") {
    let { title: title2, name } = item;
    return title2 && name ? splitTitleAddExtraSpace(`${title2} - ${name} \u22C5 Storybook`) : "Storybook";
  }
  return item?.name ? `${item.name} \u22C5 Storybook` : "Storybook";
}, mapper4 = ({
  api,
  state
  // @ts-expect-error (non strict)
}) => {
  let { layout, location: location2, customQueryParams, storyId, refs, viewMode, path, refId } = state, entry = api.getData(storyId, refId), tabsList = Object.values(api.getElements(Addon_TypesEnum.TAB)), wrapperList = Object.values(api.getElements(Addon_TypesEnum.PREVIEW)), toolsList = Object.values(api.getElements(Addon_TypesEnum.TOOL)), toolsExtraList = Object.values(api.getElements(Addon_TypesEnum.TOOLEXTRA)), tabId = api.getQueryParam("tab"), tools = memoizedTools(toolsList.length, api.getElements(Addon_TypesEnum.TOOL), [
    entry,
    viewMode,
    location2,
    path,
    // @ts-expect-error (non strict)
    tabId
  ]), toolsExtra = memoizedExtra(
    toolsExtraList.length,
    api.getElements(Addon_TypesEnum.TOOLEXTRA),
    // @ts-expect-error (non strict)
    [entry, viewMode, location2, path, tabId]
  );
  return {
    api,
    entry,
    options: layout,
    description: getDescription(entry),
    viewMode,
    refs,
    storyId,
    baseUrl: PREVIEW_URL2 || "iframe.html",
    queryParams: customQueryParams,
    tools,
    toolsExtra,
    tabs: memoizedTabs(
      tabsList.length,
      api.getElements(Addon_TypesEnum.TAB),
      entry ? entry.parameters : void 0,
      layout.showTabs
    ),
    wrappers: memoizedWrapper(
      wrapperList.length,
      api.getElements(Addon_TypesEnum.PREVIEW)
    ),
    tabId
  };
}, PreviewConnected = react_default.memo(function(props) {
  return react_default.createElement(Consumer, { filter: mapper4 }, (fromState) => react_default.createElement(Preview, { ...props, ...fromState }));
}), Preview_default = PreviewConnected;

// src/manager/components/Optional/Optional.tsx
var Wrapper2 = styled.div({
  display: "inline-grid",
  gridTemplateColumns: "max-content",
  overflow: "hidden"
}), Content = styled.div(({ isHidden }) => ({
  display: "inline-block",
  gridArea: "1/1",
  opacity: isHidden === null ? 0 : 1,
  visibility: isHidden ? "hidden" : "visible"
})), Optional = ({
  content,
  fallback
}) => {
  let contentRef = useRef(null), wrapperRef = useRef(null), [hidden, setHidden] = useState(null), contentWidth = useRef(contentRef.current?.offsetWidth ?? 0), wrapperWidth = useRef(wrapperRef.current?.offsetWidth ?? 0);
  return useEffect(() => {
    if (contentRef.current && wrapperRef.current) {
      let resizeObserver = new ResizeObserver(() => {
        wrapperWidth.current = wrapperRef.current?.offsetWidth || wrapperWidth.current, contentWidth.current = contentRef.current?.offsetWidth || contentWidth.current, setHidden(contentWidth.current > wrapperWidth.current);
      });
      return resizeObserver.observe(wrapperRef.current), () => resizeObserver.disconnect();
    }
  }, []), react_default.createElement(Wrapper2, { ref: wrapperRef }, react_default.createElement(Content, { isHidden: hidden, ref: contentRef }, content), fallback && react_default.createElement(Content, { isHidden: !hidden }, fallback));
};

// src/manager/components/Particles/Particles.tsx
var Shape = styled.svg(({ color: color2 }) => ({
  fill: color2,
  position: "absolute",
  inset: "0",
  margin: "auto",
  width: "12px",
  height: "12px",
  pointerEvents: "none"
})), Donut = (props) => react_default.createElement(Shape, { viewBox: "0 0 90 90", xmlns: "http://www.w3.org/2000/svg", color: "red", ...props }, react_default.createElement("path", { d: "M45 0c24.853 0 45 20.147 45 45S69.853 90 45 90 0 69.853 0 45 20.147 0 45 0zm.5 27C35.283 27 27 35.283 27 45.5S35.283 64 45.5 64 64 55.717 64 45.5 55.717 27 45.5 27z" })), L2 = (props) => react_default.createElement(Shape, { viewBox: "0 0 55 89", xmlns: "http://www.w3.org/2000/svg", color: "#66BF3C", ...props }, react_default.createElement("path", { d: "M55 3v83a3 3 0 01-3 3H3a3 3 0 01-3-3V64a3 3 0 013-3h21a3 3 0 003-3V3a3 3 0 013-3h22a3 3 0 013 3z" })), Slice = (props) => react_default.createElement(Shape, { viewBox: "0 0 92 92", xmlns: "http://www.w3.org/2000/svg", color: "#FF4785", ...props }, react_default.createElement("path", { d: "M92 89V3c0-3-2.056-3-3-3C39.294 0 0 39.294 0 89c0 0 0 3 3 3h86a3 3 0 003-3z" })), Square = ({ style, ...props }) => react_default.createElement(
  Shape,
  {
    viewBox: "0 0 90 90",
    xmlns: "http://www.w3.org/2000/svg",
    color: "#1EA7FD",
    ...props,
    style: { borderRadius: 5, ...style }
  },
  react_default.createElement("path", { d: "M0 0h90v90H0z" })
), Triangle = (props) => react_default.createElement(Shape, { viewBox: "0 0 96 88", xmlns: "http://www.w3.org/2000/svg", color: "#FFAE00", ...props }, react_default.createElement("path", { d: "M50.63 1.785l44.928 81.77A3 3 0 0192.928 88H3.072a3 3 0 01-2.629-4.445l44.929-81.77a3 3 0 015.258 0z" })), T2 = (props) => react_default.createElement(Shape, { viewBox: "0 0 92 62", xmlns: "http://www.w3.org/2000/svg", color: "#FC521F", ...props }, react_default.createElement("path", { d: "M63 3v25a3 3 0 003 3h23a3 3 0 013 3v25a3 3 0 01-3 3H3a3 3 0 01-3-3V34a3 3 0 013-3h24a3 3 0 003-3V3a3 3 0 013-3h27a3 3 0 013 3z" })), Z = (props) => react_default.createElement(Shape, { viewBox: "0 0 56 90", xmlns: "http://www.w3.org/2000/svg", color: "#6F2CAC", ...props }, react_default.createElement("path", { d: "M28 3v25a3 3 0 003 3h22a3 3 0 013 3v53a3 3 0 01-3 3H31a3 3 0 01-3-3V62a3 3 0 00-3-3H3a3 3 0 01-3-3V3a3 3 0 013-3h22a3 3 0 013 3z" })), fadeToTransparent = keyframes`
  to {
    opacity: 0;
  }
`, disperse = keyframes`
  to {
    transform: translate(
      calc(cos(var(--angle)) * var(--distance)),
      calc(sin(var(--angle)) * var(--distance))
    ) rotate(var(--rotation));
  }
`, slideDown = keyframes`
  to {
    transform: translateY(50px);
  }
`, Container4 = styled.div({
  position: "absolute",
  display: "flex",
  flexDirection: "row",
  flexWrap: "wrap",
  gap: 10,
  "--particle-curve": "cubic-bezier(0.2, 0.56, 0, 1)",
  animation: `${slideDown} 1000ms forwards cubic-bezier(0.587, -0.381, 0.583, 0.599)`,
  animationDelay: "150ms",
  zIndex: 999,
  svg: {
    width: 15,
    height: 15,
    animation: `${fadeToTransparent} var(--fade-duration) forwards, ${disperse} 1000ms forwards var(--particle-curve)`
  }
}), FADE_DURATION = 1200, NUM_OF_PARTICLES = 8, JITTER = 15, random = (min, max) => Math.random() * (max - min) + min, sortRandomly = (array) => array.sort(() => Math.random() - 0.5), Particles = memo(function({
  anchor: Anchor
}) {
  let anchorRef = useRef(null), [left, setLeft] = useState(0), [top, setTop] = useState(0), shapes = sortRandomly([Donut, L2, Slice, Square, Triangle, T2, Z]), colors = sortRandomly([
    "#FF0000",
    "#FF4787",
    "#66BF3C",
    "#1EA7FD",
    "#FC521F",
    "#6F2CAC",
    "#FFAE00"
  ]);
  return useLayoutEffect(() => {
    let rect = anchorRef.current?.getBoundingClientRect();
    rect && (setLeft(rect.left + rect.width / 2), setTop(rect.top + rect.height / 2));
  }, []), react_default.createElement("div", { ref: anchorRef }, react_default.createElement(Anchor, null), createPortal(
    react_default.createElement(Container4, { style: { top: top + "px", left: left + "px" } }, shapes.map((Particle, index) => {
      let angle = 360 / NUM_OF_PARTICLES * index + random(-JITTER, JITTER), distance = random(50, 80), rotation = random(-360, 360), style = {
        "--angle": angle + "deg",
        "--distance": distance + "px",
        "--rotation": rotation + "deg",
        "--fade-duration": FADE_DURATION + "ms"
      };
      return react_default.createElement(Particle, { key: Particle.name, style, color: colors[index] });
    })),
    document.getElementById("root") ?? document.body
  ));
});

// src/manager/components/TextFlip.tsx
var slideIn2 = keyframes({
  from: {
    transform: "translateY(var(--slide-in-from))",
    opacity: 0
  }
}), slideOut = keyframes({
  to: {
    transform: "translateY(var(--slide-out-to))",
    opacity: 0
  }
}), Container5 = styled.div({
  display: "inline-grid",
  gridTemplateColumns: "1fr",
  justifyContent: "center",
  alignItems: "center"
}), Placeholder2 = styled.div({
  gridArea: "1 / 1",
  userSelect: "none",
  visibility: "hidden"
}), Text2 = styled.span(({ duration, isExiting, isEntering, reverse }) => {
  let animation;
  return isExiting ? animation = `${slideOut} ${duration}ms forwards` : isEntering && (animation = `${slideIn2} ${duration}ms forwards`), {
    gridArea: "1 / 1",
    animation,
    pointerEvents: isExiting ? "none" : "auto",
    userSelect: isExiting ? "none" : "text",
    "--slide-in-from": reverse ? "-100%" : "100%",
    "--slide-out-to": reverse ? "100%" : "-100%",
    "@media (prefers-reduced-motion: reduce)": {
      animation: "none",
      opacity: isExiting ? 0 : 1,
      transform: "translateY(0)"
    }
  };
}), TextFlip = ({
  text,
  duration = 250,
  placeholder,
  ...props
}) => {
  let textRef = useRef(text), [staleValue, setStaleValue] = useState(text), isAnimating = text !== staleValue, reverse = isAnimating && numericCompare(staleValue, text);
  return textRef.current = text, react_default.createElement(Container5, { ...props }, isAnimating && react_default.createElement(
    Text2,
    {
      "aria-hidden": !0,
      duration,
      reverse,
      isExiting: !0,
      onAnimationEnd: () => setStaleValue(textRef.current)
    },
    staleValue
  ), react_default.createElement(Text2, { duration, reverse, isEntering: isAnimating }, text), placeholder && react_default.createElement(Placeholder2, { "aria-hidden": !0 }, placeholder));
};
function numericCompare(a2, b2) {
  let na = Number(a2), nb = Number(b2);
  return Number.isNaN(na) || Number.isNaN(nb) ? a2.localeCompare(b2, void 0, { numeric: !0 }) > 0 : na > nb;
}

// src/manager/components/sidebar/ChecklistWidget.tsx
var fadeScaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.7);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
`, expand = keyframes`
  from {
    transform: scaleX(0);
  }
  to {
    transform: scaleX(1);
  }
`, useTransitionArray = (array, subset, options2) => {
  let keyFnRef = useRef(options2.keyFn), { setItem, toggle, stateMap } = useTransitionMap({
    allowMultiple: !0,
    mountOnEnter: !0,
    unmountOnExit: !0,
    preEnter: !0,
    ...options2
  });
  return useEffect(() => {
    let keyFn = keyFnRef.current;
    array.forEach((task) => setItem(keyFn(task)));
  }, [array, setItem]), useEffect(() => {
    let keyFn = keyFnRef.current;
    array.forEach((task) => toggle(keyFn(task), subset.map(keyFn).includes(keyFn(task))));
  }, [array, subset, toggle]), Array.from(stateMap).map(
    ([key, value]) => [array.find((item) => keyFnRef.current(item) === key), value]
  );
}, CollapsibleWithMargin = styled(Collapsible)(({ collapsed }) => ({
  marginTop: collapsed ? 0 : 16
})), HoverCard = styled(Card)({
  "&:hover #checklist-module-collapse-toggle": {
    opacity: 1
  }
}), CollapseToggle = styled(ActionList.Button)({
  opacity: 0,
  transition: "opacity var(--transition-duration, 0.2s)",
  "&:focus, &:hover": {
    opacity: 1
  }
}), ProgressCircle2 = styled(ProgressSpinner)(({ theme }) => ({
  color: theme.color.secondary
})), Checked = styled(StatusPassIcon)(({ theme }) => ({
  padding: 1,
  borderRadius: "50%",
  background: theme.color.positive,
  color: theme.background.content,
  animation: `${fadeScaleIn} 500ms forwards`
})), ItemLabel = styled.span(
  ({ theme, isCompleted, isSkipped }) => ({
    position: "relative",
    margin: "0 -2px",
    padding: "0 2px",
    color: isSkipped ? theme.color.mediumdark : isCompleted ? theme.base === "dark" ? theme.color.positive : theme.color.positiveText : theme.color.defaultText,
    transition: "color 500ms"
  }),
  ({ theme, isSkipped }) => isSkipped && {
    "&:after": {
      content: '""',
      position: "absolute",
      top: "50%",
      left: 0,
      width: "100%",
      height: 1,
      background: theme.color.mediumdark,
      animation: `${expand} 500ms forwards`,
      transformOrigin: "left"
    }
  }
), title = (progress) => {
  switch (!0) {
    case progress < 50:
      return "Get started";
    case progress < 75:
      return "Level up";
    default:
      return "Become an expert";
  }
}, OpenGuideButton = ({
  children,
  afterClick
}) => {
  let api = useStorybookApi();
  return react_default.createElement(
    ActionList.Action,
    {
      ariaLabel: "Open onboarding guide",
      onClick: (e2) => {
        e2.stopPropagation(), api.navigate("/settings/guide"), afterClick?.();
      }
    },
    react_default.createElement(ActionList.Icon, null, react_default.createElement(ListUnorderedIcon, null)),
    children
  );
}, ChecklistWidget = () => {
  let api = useStorybookApi(), { loaded, allItems, nextItems, progress, accept, mute, items } = useChecklist(), [renderItems, setItems] = useState([]), hasItems = renderItems.length > 0, transitionItems = useTransitionArray(allItems, renderItems, {
    keyFn: (item) => item.id,
    timeout: 300
  });
  return useEffect(() => {
    setItems(
      (current) => current.map((item) => ({
        ...item,
        isCompleted: items[item.id].status === "accepted" || items[item.id].status === "done",
        isSkipped: items[item.id].status === "skipped"
      }))
    );
    let timeout = setTimeout(setItems, 2e3, nextItems);
    return () => clearTimeout(timeout);
  }, [nextItems, items]), react_default.createElement(CollapsibleWithMargin, { collapsed: !hasItems || !loaded }, react_default.createElement(HoverCard, { id: "storybook-checklist-widget", outlineAnimation: "rainbow" }, react_default.createElement(
    Collapsible,
    {
      collapsed: !hasItems,
      disabled: !hasItems,
      summary: ({ isCollapsed, toggleCollapsed, toggleProps }) => react_default.createElement(ActionList, { as: "div", onClick: toggleCollapsed }, react_default.createElement(ActionList.Item, { as: "div" }, react_default.createElement(ActionList.Item, { as: "div", style: { flexShrink: 1 } }, loaded && react_default.createElement(
        Optional,
        {
          content: react_default.createElement(OpenGuideButton, null, react_default.createElement("strong", null, title(progress))),
          fallback: react_default.createElement(OpenGuideButton, null)
        }
      )), react_default.createElement(ActionList.Item, { as: "div" }, react_default.createElement(
        CollapseToggle,
        {
          ...toggleProps,
          id: "checklist-module-collapse-toggle",
          ariaLabel: `${isCollapsed ? "Expand" : "Collapse"} onboarding checklist`
        },
        react_default.createElement(
          ChevronSmallUpIcon,
          {
            style: {
              transform: isCollapsed ? "rotate(180deg)" : "none",
              transition: "transform 250ms",
              willChange: "auto"
            }
          }
        )
      ), loaded && react_default.createElement(
        PopoverProvider,
        {
          padding: 0,
          popover: ({ onHide }) => react_default.createElement(ActionList, null, react_default.createElement(ActionList.Item, null, react_default.createElement(OpenGuideButton, { afterClick: onHide }, react_default.createElement(ActionList.Text, null, "Open full guide"))), react_default.createElement(ActionList.Item, null, react_default.createElement(
            ActionList.Action,
            {
              ariaLabel: !1,
              onClick: (e2) => {
                e2.stopPropagation(), mute(allItems.map(({ id }) => id)), onHide();
              }
            },
            react_default.createElement(ActionList.Icon, null, react_default.createElement(EyeCloseIcon, null)),
            react_default.createElement(ActionList.Text, null, "Remove from sidebar")
          )))
        },
        react_default.createElement(
          ActionList.Button,
          {
            ariaLabel: `${progress}% completed`,
            onClick: (e2) => e2.stopPropagation()
          },
          react_default.createElement(
            ProgressCircle2,
            {
              percentage: progress,
              running: !1,
              size: 16,
              width: 1.5
            }
          ),
          react_default.createElement(TextFlip, { text: `${progress}%`, placeholder: "00%" })
        )
      ))))
    },
    react_default.createElement(ActionList, null, transitionItems.map(
      ([item, { status, isMounted }]) => isMounted && react_default.createElement(ActionList.HoverItem, { key: item.id, targetId: item.id, transitionStatus: status }, react_default.createElement(
        ActionList.Action,
        {
          ariaLabel: `Open onboarding guide for ${item.label}`,
          onClick: () => api.navigate(`/settings/guide#${item.id}`)
        },
        react_default.createElement(ActionList.Icon, null, item.isCompleted ? react_default.createElement(Particles, { anchor: Checked, key: item.id }) : react_default.createElement(StatusFailIcon, null)),
        react_default.createElement(ActionList.Text, null, react_default.createElement(ItemLabel, { isCompleted: item.isCompleted, isSkipped: item.isSkipped }, item.label))
      ), item.action && react_default.createElement(
        ActionList.Button,
        {
          "data-target-id": item.id,
          ariaLabel: !1,
          onClick: (e2) => {
            e2.stopPropagation(), item.action?.onClick({
              api,
              accept: () => accept(item.id)
            });
          }
        },
        item.action.label
      ))
    ))
  )));
};

// src/manager/hooks/useDebounce.ts
function useDebounce(value, delay2) {
  let [debouncedValue, setDebouncedValue] = useState(value);
  return useEffect(() => {
    let handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay2);
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay2]), debouncedValue;
}

// src/manager/hooks/useMeasure.tsx
function useMeasure() {
  let [dimensions, setDimensions] = react_default.useState({
    width: null,
    height: null
  }), prevObserver = react_default.useRef(null);
  return [react_default.useCallback((node) => {
    if (prevObserver.current && (prevObserver.current.disconnect(), prevObserver.current = null), node?.nodeType === Node.ELEMENT_NODE) {
      let observer = new ResizeObserver(([entry]) => {
        if (entry && entry.borderBoxSize) {
          let { inlineSize: width, blockSize: height } = entry.borderBoxSize[0];
          setDimensions({ width, height });
        }
      });
      observer.observe(node), prevObserver.current = observer;
    }
  }, []), dimensions];
}

// ../node_modules/@tanstack/virtual-core/dist/esm/utils.js
function memo2(getDeps, fn, opts) {
  let deps = opts.initialDeps ?? [], result;
  function memoizedFunction() {
    var _a, _b, _c, _d;
    let depTime;
    opts.key && ((_a = opts.debug) != null && _a.call(opts)) && (depTime = Date.now());
    let newDeps = getDeps();
    if (!(newDeps.length !== deps.length || newDeps.some((dep, index) => deps[index] !== dep)))
      return result;
    deps = newDeps;
    let resultTime;
    if (opts.key && ((_b = opts.debug) != null && _b.call(opts)) && (resultTime = Date.now()), result = fn(...newDeps), opts.key && ((_c = opts.debug) != null && _c.call(opts))) {
      let depEndTime = Math.round((Date.now() - depTime) * 100) / 100, resultEndTime = Math.round((Date.now() - resultTime) * 100) / 100, resultFpsPercentage = resultEndTime / 16, pad = (str, num) => {
        for (str = String(str); str.length < num; )
          str = " " + str;
        return str;
      };
      console.info(
        `%c\u23F1 ${pad(resultEndTime, 5)} /${pad(depEndTime, 5)} ms`,
        `
            font-size: .6rem;
            font-weight: bold;
            color: hsl(${Math.max(
          0,
          Math.min(120 - 120 * resultFpsPercentage, 120)
        )}deg 100% 31%);`,
        opts?.key
      );
    }
    return (_d = opts?.onChange) == null || _d.call(opts, result), result;
  }
  return memoizedFunction.updateDeps = (newDeps) => {
    deps = newDeps;
  }, memoizedFunction;
}
function notUndefined(value, msg) {
  if (value === void 0)
    throw new Error(`Unexpected undefined${msg ? `: ${msg}` : ""}`);
  return value;
}
var approxEqual = (a2, b2) => Math.abs(a2 - b2) < 1.01, debounce3 = (targetWindow, fn, ms) => {
  let timeoutId;
  return function(...args) {
    targetWindow.clearTimeout(timeoutId), timeoutId = targetWindow.setTimeout(() => fn.apply(this, args), ms);
  };
};

// ../node_modules/@tanstack/virtual-core/dist/esm/index.js
var getRect = (element) => {
  let { offsetWidth, offsetHeight } = element;
  return { width: offsetWidth, height: offsetHeight };
}, defaultKeyExtractor = (index) => index, defaultRangeExtractor = (range) => {
  let start = Math.max(range.startIndex - range.overscan, 0), end = Math.min(range.endIndex + range.overscan, range.count - 1), arr = [];
  for (let i2 = start; i2 <= end; i2++)
    arr.push(i2);
  return arr;
}, observeElementRect = (instance, cb) => {
  let element = instance.scrollElement;
  if (!element)
    return;
  let targetWindow = instance.targetWindow;
  if (!targetWindow)
    return;
  let handler = (rect) => {
    let { width, height } = rect;
    cb({ width: Math.round(width), height: Math.round(height) });
  };
  if (handler(getRect(element)), !targetWindow.ResizeObserver)
    return () => {
    };
  let observer = new targetWindow.ResizeObserver((entries) => {
    let run = () => {
      let entry = entries[0];
      if (entry?.borderBoxSize) {
        let box = entry.borderBoxSize[0];
        if (box) {
          handler({ width: box.inlineSize, height: box.blockSize });
          return;
        }
      }
      handler(getRect(element));
    };
    instance.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(run) : run();
  });
  return observer.observe(element, { box: "border-box" }), () => {
    observer.unobserve(element);
  };
}, addEventListenerOptions = {
  passive: !0
};
var supportsScrollend = typeof window > "u" ? !0 : "onscrollend" in window, observeElementOffset = (instance, cb) => {
  let element = instance.scrollElement;
  if (!element)
    return;
  let targetWindow = instance.targetWindow;
  if (!targetWindow)
    return;
  let offset2 = 0, fallback = instance.options.useScrollendEvent && supportsScrollend ? () => {
  } : debounce3(
    targetWindow,
    () => {
      cb(offset2, !1);
    },
    instance.options.isScrollingResetDelay
  ), createHandler = (isScrolling) => () => {
    let { horizontal, isRtl } = instance.options;
    offset2 = horizontal ? element.scrollLeft * (isRtl && -1 || 1) : element.scrollTop, fallback(), cb(offset2, isScrolling);
  }, handler = createHandler(!0), endHandler = createHandler(!1);
  endHandler(), element.addEventListener("scroll", handler, addEventListenerOptions);
  let registerScrollendEvent = instance.options.useScrollendEvent && supportsScrollend;
  return registerScrollendEvent && element.addEventListener("scrollend", endHandler, addEventListenerOptions), () => {
    element.removeEventListener("scroll", handler), registerScrollendEvent && element.removeEventListener("scrollend", endHandler);
  };
};
var measureElement = (element, entry, instance) => {
  if (entry?.borderBoxSize) {
    let box = entry.borderBoxSize[0];
    if (box)
      return Math.round(
        box[instance.options.horizontal ? "inlineSize" : "blockSize"]
      );
  }
  return element[instance.options.horizontal ? "offsetWidth" : "offsetHeight"];
};
var elementScroll = (offset2, {
  adjustments = 0,
  behavior
}, instance) => {
  var _a, _b;
  let toOffset = offset2 + adjustments;
  (_b = (_a = instance.scrollElement) == null ? void 0 : _a.scrollTo) == null || _b.call(_a, {
    [instance.options.horizontal ? "left" : "top"]: toOffset,
    behavior
  });
}, Virtualizer = class {
  constructor(opts) {
    this.unsubs = [], this.scrollElement = null, this.targetWindow = null, this.isScrolling = !1, this.measurementsCache = [], this.itemSizeCache = /* @__PURE__ */ new Map(), this.pendingMeasuredCacheIndexes = [], this.scrollRect = null, this.scrollOffset = null, this.scrollDirection = null, this.scrollAdjustments = 0, this.elementsCache = /* @__PURE__ */ new Map(), this.observer = /* @__PURE__ */ (() => {
      let _ro = null, get2 = () => _ro || (!this.targetWindow || !this.targetWindow.ResizeObserver ? null : _ro = new this.targetWindow.ResizeObserver((entries) => {
        entries.forEach((entry) => {
          let run = () => {
            this._measureElement(entry.target, entry);
          };
          this.options.useAnimationFrameWithResizeObserver ? requestAnimationFrame(run) : run();
        });
      }));
      return {
        disconnect: () => {
          var _a;
          (_a = get2()) == null || _a.disconnect(), _ro = null;
        },
        observe: (target) => {
          var _a;
          return (_a = get2()) == null ? void 0 : _a.observe(target, { box: "border-box" });
        },
        unobserve: (target) => {
          var _a;
          return (_a = get2()) == null ? void 0 : _a.unobserve(target);
        }
      };
    })(), this.range = null, this.setOptions = (opts2) => {
      Object.entries(opts2).forEach(([key, value]) => {
        typeof value > "u" && delete opts2[key];
      }), this.options = {
        debug: !1,
        initialOffset: 0,
        overscan: 1,
        paddingStart: 0,
        paddingEnd: 0,
        scrollPaddingStart: 0,
        scrollPaddingEnd: 0,
        horizontal: !1,
        getItemKey: defaultKeyExtractor,
        rangeExtractor: defaultRangeExtractor,
        onChange: () => {
        },
        measureElement,
        initialRect: { width: 0, height: 0 },
        scrollMargin: 0,
        gap: 0,
        indexAttribute: "data-index",
        initialMeasurementsCache: [],
        lanes: 1,
        isScrollingResetDelay: 150,
        enabled: !0,
        isRtl: !1,
        useScrollendEvent: !1,
        useAnimationFrameWithResizeObserver: !1,
        ...opts2
      };
    }, this.notify = (sync) => {
      var _a, _b;
      (_b = (_a = this.options).onChange) == null || _b.call(_a, this, sync);
    }, this.maybeNotify = memo2(
      () => (this.calculateRange(), [
        this.isScrolling,
        this.range ? this.range.startIndex : null,
        this.range ? this.range.endIndex : null
      ]),
      (isScrolling) => {
        this.notify(isScrolling);
      },
      {
        key: !1,
        debug: () => this.options.debug,
        initialDeps: [
          this.isScrolling,
          this.range ? this.range.startIndex : null,
          this.range ? this.range.endIndex : null
        ]
      }
    ), this.cleanup = () => {
      this.unsubs.filter(Boolean).forEach((d2) => d2()), this.unsubs = [], this.observer.disconnect(), this.scrollElement = null, this.targetWindow = null;
    }, this._didMount = () => () => {
      this.cleanup();
    }, this._willUpdate = () => {
      var _a;
      let scrollElement = this.options.enabled ? this.options.getScrollElement() : null;
      if (this.scrollElement !== scrollElement) {
        if (this.cleanup(), !scrollElement) {
          this.maybeNotify();
          return;
        }
        this.scrollElement = scrollElement, this.scrollElement && "ownerDocument" in this.scrollElement ? this.targetWindow = this.scrollElement.ownerDocument.defaultView : this.targetWindow = ((_a = this.scrollElement) == null ? void 0 : _a.window) ?? null, this.elementsCache.forEach((cached) => {
          this.observer.observe(cached);
        }), this._scrollToOffset(this.getScrollOffset(), {
          adjustments: void 0,
          behavior: void 0
        }), this.unsubs.push(
          this.options.observeElementRect(this, (rect) => {
            this.scrollRect = rect, this.maybeNotify();
          })
        ), this.unsubs.push(
          this.options.observeElementOffset(this, (offset2, isScrolling) => {
            this.scrollAdjustments = 0, this.scrollDirection = isScrolling ? this.getScrollOffset() < offset2 ? "forward" : "backward" : null, this.scrollOffset = offset2, this.isScrolling = isScrolling, this.maybeNotify();
          })
        );
      }
    }, this.getSize = () => this.options.enabled ? (this.scrollRect = this.scrollRect ?? this.options.initialRect, this.scrollRect[this.options.horizontal ? "width" : "height"]) : (this.scrollRect = null, 0), this.getScrollOffset = () => this.options.enabled ? (this.scrollOffset = this.scrollOffset ?? (typeof this.options.initialOffset == "function" ? this.options.initialOffset() : this.options.initialOffset), this.scrollOffset) : (this.scrollOffset = null, 0), this.getFurthestMeasurement = (measurements, index) => {
      let furthestMeasurementsFound = /* @__PURE__ */ new Map(), furthestMeasurements = /* @__PURE__ */ new Map();
      for (let m2 = index - 1; m2 >= 0; m2--) {
        let measurement = measurements[m2];
        if (furthestMeasurementsFound.has(measurement.lane))
          continue;
        let previousFurthestMeasurement = furthestMeasurements.get(
          measurement.lane
        );
        if (previousFurthestMeasurement == null || measurement.end > previousFurthestMeasurement.end ? furthestMeasurements.set(measurement.lane, measurement) : measurement.end < previousFurthestMeasurement.end && furthestMeasurementsFound.set(measurement.lane, !0), furthestMeasurementsFound.size === this.options.lanes)
          break;
      }
      return furthestMeasurements.size === this.options.lanes ? Array.from(furthestMeasurements.values()).sort((a2, b2) => a2.end === b2.end ? a2.index - b2.index : a2.end - b2.end)[0] : void 0;
    }, this.getMeasurementOptions = memo2(
      () => [
        this.options.count,
        this.options.paddingStart,
        this.options.scrollMargin,
        this.options.getItemKey,
        this.options.enabled
      ],
      (count, paddingStart, scrollMargin, getItemKey, enabled) => (this.pendingMeasuredCacheIndexes = [], {
        count,
        paddingStart,
        scrollMargin,
        getItemKey,
        enabled
      }),
      {
        key: !1
      }
    ), this.getMeasurements = memo2(
      () => [this.getMeasurementOptions(), this.itemSizeCache],
      ({ count, paddingStart, scrollMargin, getItemKey, enabled }, itemSizeCache) => {
        if (!enabled)
          return this.measurementsCache = [], this.itemSizeCache.clear(), [];
        this.measurementsCache.length === 0 && (this.measurementsCache = this.options.initialMeasurementsCache, this.measurementsCache.forEach((item) => {
          this.itemSizeCache.set(item.key, item.size);
        }));
        let min = this.pendingMeasuredCacheIndexes.length > 0 ? Math.min(...this.pendingMeasuredCacheIndexes) : 0;
        this.pendingMeasuredCacheIndexes = [];
        let measurements = this.measurementsCache.slice(0, min);
        for (let i2 = min; i2 < count; i2++) {
          let key = getItemKey(i2), furthestMeasurement = this.options.lanes === 1 ? measurements[i2 - 1] : this.getFurthestMeasurement(measurements, i2), start = furthestMeasurement ? furthestMeasurement.end + this.options.gap : paddingStart + scrollMargin, measuredSize = itemSizeCache.get(key), size = typeof measuredSize == "number" ? measuredSize : this.options.estimateSize(i2), end = start + size, lane = furthestMeasurement ? furthestMeasurement.lane : i2 % this.options.lanes;
          measurements[i2] = {
            index: i2,
            start,
            size,
            end,
            key,
            lane
          };
        }
        return this.measurementsCache = measurements, measurements;
      },
      {
        key: !1,
        debug: () => this.options.debug
      }
    ), this.calculateRange = memo2(
      () => [
        this.getMeasurements(),
        this.getSize(),
        this.getScrollOffset(),
        this.options.lanes
      ],
      (measurements, outerSize, scrollOffset, lanes) => this.range = measurements.length > 0 && outerSize > 0 ? calculateRange({
        measurements,
        outerSize,
        scrollOffset,
        lanes
      }) : null,
      {
        key: !1,
        debug: () => this.options.debug
      }
    ), this.getVirtualIndexes = memo2(
      () => {
        let startIndex = null, endIndex = null, range = this.calculateRange();
        return range && (startIndex = range.startIndex, endIndex = range.endIndex), this.maybeNotify.updateDeps([this.isScrolling, startIndex, endIndex]), [
          this.options.rangeExtractor,
          this.options.overscan,
          this.options.count,
          startIndex,
          endIndex
        ];
      },
      (rangeExtractor, overscan, count, startIndex, endIndex) => startIndex === null || endIndex === null ? [] : rangeExtractor({
        startIndex,
        endIndex,
        overscan,
        count
      }),
      {
        key: !1,
        debug: () => this.options.debug
      }
    ), this.indexFromElement = (node) => {
      let attributeName = this.options.indexAttribute, indexStr = node.getAttribute(attributeName);
      return indexStr ? parseInt(indexStr, 10) : (console.warn(
        `Missing attribute name '${attributeName}={index}' on measured element.`
      ), -1);
    }, this._measureElement = (node, entry) => {
      let index = this.indexFromElement(node), item = this.measurementsCache[index];
      if (!item)
        return;
      let key = item.key, prevNode = this.elementsCache.get(key);
      prevNode !== node && (prevNode && this.observer.unobserve(prevNode), this.observer.observe(node), this.elementsCache.set(key, node)), node.isConnected && this.resizeItem(index, this.options.measureElement(node, entry, this));
    }, this.resizeItem = (index, size) => {
      let item = this.measurementsCache[index];
      if (!item)
        return;
      let itemSize = this.itemSizeCache.get(item.key) ?? item.size, delta = size - itemSize;
      delta !== 0 && ((this.shouldAdjustScrollPositionOnItemSizeChange !== void 0 ? this.shouldAdjustScrollPositionOnItemSizeChange(item, delta, this) : item.start < this.getScrollOffset() + this.scrollAdjustments) && this._scrollToOffset(this.getScrollOffset(), {
        adjustments: this.scrollAdjustments += delta,
        behavior: void 0
      }), this.pendingMeasuredCacheIndexes.push(item.index), this.itemSizeCache = new Map(this.itemSizeCache.set(item.key, size)), this.notify(!1));
    }, this.measureElement = (node) => {
      if (!node) {
        this.elementsCache.forEach((cached, key) => {
          cached.isConnected || (this.observer.unobserve(cached), this.elementsCache.delete(key));
        });
        return;
      }
      this._measureElement(node, void 0);
    }, this.getVirtualItems = memo2(
      () => [this.getVirtualIndexes(), this.getMeasurements()],
      (indexes, measurements) => {
        let virtualItems = [];
        for (let k2 = 0, len = indexes.length; k2 < len; k2++) {
          let i2 = indexes[k2], measurement = measurements[i2];
          virtualItems.push(measurement);
        }
        return virtualItems;
      },
      {
        key: !1,
        debug: () => this.options.debug
      }
    ), this.getVirtualItemForOffset = (offset2) => {
      let measurements = this.getMeasurements();
      if (measurements.length !== 0)
        return notUndefined(
          measurements[findNearestBinarySearch(
            0,
            measurements.length - 1,
            (index) => notUndefined(measurements[index]).start,
            offset2
          )]
        );
    }, this.getOffsetForAlignment = (toOffset, align, itemSize = 0) => {
      let size = this.getSize(), scrollOffset = this.getScrollOffset();
      align === "auto" && (align = toOffset >= scrollOffset + size ? "end" : "start"), align === "center" ? toOffset += (itemSize - size) / 2 : align === "end" && (toOffset -= size);
      let maxOffset = this.getTotalSize() + this.options.scrollMargin - size;
      return Math.max(Math.min(maxOffset, toOffset), 0);
    }, this.getOffsetForIndex = (index, align = "auto") => {
      index = Math.max(0, Math.min(index, this.options.count - 1));
      let item = this.measurementsCache[index];
      if (!item)
        return;
      let size = this.getSize(), scrollOffset = this.getScrollOffset();
      if (align === "auto")
        if (item.end >= scrollOffset + size - this.options.scrollPaddingEnd)
          align = "end";
        else if (item.start <= scrollOffset + this.options.scrollPaddingStart)
          align = "start";
        else
          return [scrollOffset, align];
      let toOffset = align === "end" ? item.end + this.options.scrollPaddingEnd : item.start - this.options.scrollPaddingStart;
      return [
        this.getOffsetForAlignment(toOffset, align, item.size),
        align
      ];
    }, this.isDynamicMode = () => this.elementsCache.size > 0, this.scrollToOffset = (toOffset, { align = "start", behavior } = {}) => {
      behavior === "smooth" && this.isDynamicMode() && console.warn(
        "The `smooth` scroll behavior is not fully supported with dynamic size."
      ), this._scrollToOffset(this.getOffsetForAlignment(toOffset, align), {
        adjustments: void 0,
        behavior
      });
    }, this.scrollToIndex = (index, { align: initialAlign = "auto", behavior } = {}) => {
      behavior === "smooth" && this.isDynamicMode() && console.warn(
        "The `smooth` scroll behavior is not fully supported with dynamic size."
      ), index = Math.max(0, Math.min(index, this.options.count - 1));
      let attempts = 0, maxAttempts = 10, tryScroll = (currentAlign) => {
        if (!this.targetWindow) return;
        let offsetInfo = this.getOffsetForIndex(index, currentAlign);
        if (!offsetInfo) {
          console.warn("Failed to get offset for index:", index);
          return;
        }
        let [offset2, align] = offsetInfo;
        this._scrollToOffset(offset2, { adjustments: void 0, behavior }), this.targetWindow.requestAnimationFrame(() => {
          let currentOffset = this.getScrollOffset(), afterInfo = this.getOffsetForIndex(index, align);
          if (!afterInfo) {
            console.warn("Failed to get offset for index:", index);
            return;
          }
          approxEqual(afterInfo[0], currentOffset) || scheduleRetry(align);
        });
      }, scheduleRetry = (align) => {
        this.targetWindow && (attempts++, attempts < maxAttempts ? this.targetWindow.requestAnimationFrame(() => tryScroll(align)) : console.warn(
          `Failed to scroll to index ${index} after ${maxAttempts} attempts.`
        ));
      };
      tryScroll(initialAlign);
    }, this.scrollBy = (delta, { behavior } = {}) => {
      behavior === "smooth" && this.isDynamicMode() && console.warn(
        "The `smooth` scroll behavior is not fully supported with dynamic size."
      ), this._scrollToOffset(this.getScrollOffset() + delta, {
        adjustments: void 0,
        behavior
      });
    }, this.getTotalSize = () => {
      var _a;
      let measurements = this.getMeasurements(), end;
      if (measurements.length === 0)
        end = this.options.paddingStart;
      else if (this.options.lanes === 1)
        end = ((_a = measurements[measurements.length - 1]) == null ? void 0 : _a.end) ?? 0;
      else {
        let endByLane = Array(this.options.lanes).fill(null), endIndex = measurements.length - 1;
        for (; endIndex >= 0 && endByLane.some((val) => val === null); ) {
          let item = measurements[endIndex];
          endByLane[item.lane] === null && (endByLane[item.lane] = item.end), endIndex--;
        }
        end = Math.max(...endByLane.filter((val) => val !== null));
      }
      return Math.max(
        end - this.options.scrollMargin + this.options.paddingEnd,
        0
      );
    }, this._scrollToOffset = (offset2, {
      adjustments,
      behavior
    }) => {
      this.options.scrollToFn(offset2, { behavior, adjustments }, this);
    }, this.measure = () => {
      this.itemSizeCache = /* @__PURE__ */ new Map(), this.notify(!1);
    }, this.setOptions(opts);
  }
}, findNearestBinarySearch = (low, high, getCurrentValue, value) => {
  for (; low <= high; ) {
    let middle = (low + high) / 2 | 0, currentValue = getCurrentValue(middle);
    if (currentValue < value)
      low = middle + 1;
    else if (currentValue > value)
      high = middle - 1;
    else
      return middle;
  }
  return low > 0 ? low - 1 : 0;
};
function calculateRange({
  measurements,
  outerSize,
  scrollOffset,
  lanes
}) {
  let lastIndex = measurements.length - 1, getOffset = (index) => measurements[index].start;
  if (measurements.length <= lanes)
    return {
      startIndex: 0,
      endIndex: lastIndex
    };
  let startIndex = findNearestBinarySearch(
    0,
    lastIndex,
    getOffset,
    scrollOffset
  ), endIndex = startIndex;
  if (lanes === 1)
    for (; endIndex < lastIndex && measurements[endIndex].end < scrollOffset + outerSize; )
      endIndex++;
  else if (lanes > 1) {
    let endPerLane = Array(lanes).fill(0);
    for (; endIndex < lastIndex && endPerLane.some((pos) => pos < scrollOffset + outerSize); ) {
      let item = measurements[endIndex];
      endPerLane[item.lane] = item.end, endIndex++;
    }
    let startPerLane = Array(lanes).fill(scrollOffset + outerSize);
    for (; startIndex >= 0 && startPerLane.some((pos) => pos >= scrollOffset); ) {
      let item = measurements[startIndex];
      startPerLane[item.lane] = item.start, startIndex--;
    }
    startIndex = Math.max(0, startIndex - startIndex % lanes), endIndex = Math.min(lastIndex, endIndex + (lanes - 1 - endIndex % lanes));
  }
  return { startIndex, endIndex };
}

// ../node_modules/@tanstack/react-virtual/dist/esm/index.js
var useIsomorphicLayoutEffect = typeof document < "u" ? useLayoutEffect : useEffect;
function useVirtualizerBase(options2) {
  let rerender = useReducer(() => ({}), {})[1], resolvedOptions = {
    ...options2,
    onChange: (instance2, sync) => {
      var _a;
      sync ? flushSync(rerender) : rerender(), (_a = options2.onChange) == null || _a.call(options2, instance2, sync);
    }
  }, [instance] = useState(
    () => new Virtualizer(resolvedOptions)
  );
  return instance.setOptions(resolvedOptions), useIsomorphicLayoutEffect(() => instance._didMount(), []), useIsomorphicLayoutEffect(() => instance._willUpdate()), instance;
}
function useVirtualizer(options2) {
  return useVirtualizerBase({
    observeElementRect,
    observeElementOffset,
    scrollToFn: elementScroll,
    ...options2
  });
}

// src/manager/components/sidebar/FIleSearchList.utils.tsx
var useArrowKeyNavigation = ({
  parentRef,
  rowVirtualizer,
  selectedItem
}) => {
  useEffect(() => {
    let handleArrowKeys = (event) => {
      if (!parentRef.current)
        return;
      let maxIndex = rowVirtualizer.options.count, activeElement = document.activeElement, rowIndex = parseInt(activeElement.getAttribute("data-index") || "-1", 10), isActiveElementInput = activeElement.tagName === "INPUT", getFirstElement = () => document.querySelector('[data-index="0"]'), getLastElement = () => document.querySelector(`[data-index="${maxIndex - 1}"]`);
      if (event.code === "ArrowDown" && activeElement) {
        if (event.stopPropagation(), isActiveElementInput) {
          getFirstElement()?.focus();
          return;
        }
        if (rowIndex === maxIndex - 1) {
          flushSync(() => {
            rowVirtualizer.scrollToIndex(0, { align: "start" });
          }), setTimeout(() => {
            getFirstElement()?.focus();
          }, 100);
          return;
        }
        if (selectedItem === rowIndex) {
          document.querySelector(
            `[data-index-position="${selectedItem}_first"]`
          )?.focus();
          return;
        }
        if (selectedItem !== null && activeElement.getAttribute("data-index-position")?.includes("last")) {
          document.querySelector(
            `[data-index="${selectedItem + 1}"]`
          )?.focus();
          return;
        }
        activeElement.nextElementSibling?.focus();
      }
      if (event.code === "ArrowUp" && activeElement) {
        if (isActiveElementInput) {
          flushSync(() => {
            rowVirtualizer.scrollToIndex(maxIndex - 1, { align: "start" });
          }), setTimeout(() => {
            getLastElement()?.focus();
          }, 100);
          return;
        }
        if (selectedItem !== null && activeElement.getAttribute("data-index-position")?.includes("first")) {
          document.querySelector(
            `[data-index="${selectedItem}"]`
          )?.focus();
          return;
        }
        activeElement.previousElementSibling?.focus();
      }
    };
    return document.addEventListener("keydown", handleArrowKeys, { capture: !0 }), () => {
      document.removeEventListener("keydown", handleArrowKeys, { capture: !0 });
    };
  }, [rowVirtualizer, selectedItem, parentRef]);
};

// src/manager/components/sidebar/FileList.tsx
var FileListWrapper = styled("div")(({ theme }) => ({
  marginTop: "-16px",
  // after element which fades out the list
  "&::after": {
    content: '""',
    position: "fixed",
    pointerEvents: "none",
    bottom: 0,
    left: 0,
    right: 0,
    height: "80px",
    background: `linear-gradient(${rgba(theme.barBg, 0)} 10%, ${theme.barBg} 80%)`
  }
})), FileList = styled("div")({
  height: "280px",
  overflow: "auto",
  msOverflowStyle: "none",
  scrollbarWidth: "none",
  position: "relative",
  "::-webkit-scrollbar": {
    display: "none"
  }
}), FileListLi = styled("li")(({ theme }) => ({
  ":focus-visible": {
    outline: "none",
    ".file-list-item": {
      borderRadius: "4px",
      background: theme.base === "dark" ? "rgba(255,255,255,.1)" : theme.color.mediumlight,
      "> svg": {
        display: "flex"
      }
    }
  }
})), FileListItem = styled("div")({
  display: "flex",
  flexDirection: "column",
  position: "relative"
}), FileListItemContentWrapper = styled.div(({ theme, selected, disabled, error }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
  alignSelf: "stretch",
  padding: "8px 16px",
  cursor: "pointer",
  borderRadius: "4px",
  ...selected && {
    borderRadius: "4px",
    background: theme.base === "dark" ? "rgba(255,255,255,.1)" : theme.color.mediumlight,
    "> svg": {
      display: "flex"
    }
  },
  ...disabled && {
    cursor: "not-allowed",
    div: {
      color: `${theme.textMutedColor} !important`
    }
  },
  ...error && {
    background: theme.base === "light" ? "#00000011" : "#00000033"
  },
  "&:hover": {
    background: error ? "#00000022" : theme.base === "dark" ? "rgba(255,255,255,.1)" : theme.color.mediumlight,
    "> svg": {
      display: "flex"
    }
  }
})), FileListUl = styled("ul")({
  margin: 0,
  padding: "0 0 0 0",
  width: "100%",
  position: "relative"
}), FileListItemContent = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  width: "calc(100% - 50px)"
}), FileListIconWrapper = styled("div")(({ theme, error }) => ({
  color: error ? theme.color.negativeText : theme.color.secondary
})), FileListItemLabel = styled("div")(({ theme, error }) => ({
  color: error ? theme.color.negativeText : theme.base === "dark" ? theme.color.lighter : theme.color.darkest,
  fontSize: "14px",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  overflow: "hidden",
  maxWidth: "100%"
})), FileListItemPath = styled("div")(({ theme }) => ({
  color: theme.textMutedColor,
  fontSize: "14px",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  overflow: "hidden",
  maxWidth: "100%"
})), FileListExport = styled("ul")({
  margin: 0,
  padding: 0
}), FileListItemExport = styled("li")(({ theme, error }) => ({
  padding: "8px 16px 8px 58px",
  display: "flex",
  gap: "8px",
  alignItems: "center",
  justifyContent: "space-between",
  fontSize: "14px",
  cursor: "pointer",
  borderRadius: "4px",
  ":focus-visible": {
    outline: "none"
  },
  ...error && {
    background: "#F9ECEC",
    color: theme.color.negativeText
  },
  "&:hover,:focus-visible": {
    background: error ? "#F9ECEC" : theme.base === "dark" ? "rgba(255, 255, 255, 0.1)" : theme.color.mediumlight,
    "> svg": {
      display: "flex"
    }
  },
  "> div > svg": {
    color: error ? theme.color.negativeText : theme.color.secondary
  }
})), FileListItemExportName = styled("div")({
  display: "flex",
  alignItems: "center",
  gap: "8px",
  width: "calc(100% - 20px)"
}), FileListItemExportNameContent = styled("span")(({ theme }) => ({
  whiteSpace: "nowrap",
  textOverflow: "ellipsis",
  overflow: "hidden",
  display: "inline-block",
  color: theme.base === "dark" ? theme.color.lightest : theme.color.darkest
})), FileListItemExportNameContentWithExport = styled(FileListItemExportNameContent)({
  maxWidth: "calc(100% - 120px)"
}), DefaultExport = styled("span")(({ theme }) => ({
  display: "inline-block",
  padding: `1px ${theme.appBorderRadius}px`,
  borderRadius: "2px",
  fontSize: "10px",
  color: theme.color.defaultText,
  backgroundColor: theme.base === "dark" ? "rgba(255, 255, 255, 0.1)" : "#F2F4F5"
})), NoResults = styled("div")(({ theme }) => ({
  textAlign: "center",
  maxWidth: "334px",
  margin: "16px auto 50px auto",
  fontSize: "14px",
  color: theme.base === "dark" ? theme.color.lightest : "#000"
})), NoResultsDescription = styled("p")(({ theme }) => ({
  margin: 0,
  color: theme.textMutedColor
}));

// src/manager/components/sidebar/FileSearchListSkeleton.tsx
var FileListItemContentWrapperSkeleton = styled("div")(({ theme }) => ({
  display: "flex",
  alignItems: "flex-start",
  gap: "8px",
  alignSelf: "stretch",
  padding: "8px 16px"
})), FileListItemContentSkeleton = styled("div")({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  width: "100%",
  borderRadius: "3px"
}), FileListIconWrapperSkeleton = styled.div(({ theme }) => ({
  width: "14px",
  height: "14px",
  borderRadius: "3px",
  marginTop: "1px",
  background: theme.base === "dark" ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.1)",
  animation: `${theme.animation.glow} 1.5s ease-in-out infinite`
})), FileListItemSkeleton = styled.div(({ theme }) => ({
  height: "16px",
  borderRadius: "3px",
  background: theme.base === "dark" ? "rgba(255,255,255,.1)" : "rgba(0,0,0,.1)",
  animation: `${theme.animation.glow} 1.5s ease-in-out infinite`,
  width: "100%",
  maxWidth: "100%",
  "+ div": {
    marginTop: "6px"
  }
})), FileSearchListLoadingSkeleton = () => react_default.createElement(FileList, null, [1, 2, 3].map((result) => react_default.createElement(FileListItem, { key: result }, react_default.createElement(FileListItemContentWrapperSkeleton, null, react_default.createElement(FileListIconWrapperSkeleton, null), react_default.createElement(FileListItemContentSkeleton, null, react_default.createElement(FileListItemSkeleton, { style: { width: "90px" } }), react_default.createElement(FileListItemSkeleton, { style: { width: "300px" } }))))));

// src/manager/components/sidebar/FileSearchList.tsx
var TreeExpandIconStyled = styled(ChevronSmallRightIcon)(({ theme }) => ({
  color: theme.textMutedColor,
  marginTop: 2
})), TreeCollapseIconStyled = styled(ChevronSmallDownIcon)(({ theme }) => ({
  color: theme.textMutedColor,
  marginTop: 2
})), FileSearchList = memo(function({
  isLoading,
  searchResults,
  onNewStory,
  errorItemId
}) {
  let [selectedItem, setSelectedItem] = useState(null), parentRef = react_default.useRef(), sortedSearchResults = useMemo(() => [...searchResults ?? []].sort((a2, b2) => {
    let isALowPriority = a2.exportedComponents === null || a2.exportedComponents?.length === 0, hasAStory = a2.storyFileExists, isBLowPriority = b2.exportedComponents === null || b2.exportedComponents?.length === 0, hasBStory = b2.storyFileExists;
    return hasAStory && !hasBStory ? -1 : hasBStory && !hasAStory || isALowPriority && !isBLowPriority ? 1 : !isALowPriority && isBLowPriority ? -1 : 0;
  }), [searchResults]), count = searchResults?.length || 0, rowVirtualizer = useVirtualizer({
    count,
    // @ts-expect-error (non strict)
    getScrollElement: () => parentRef.current,
    paddingStart: 16,
    paddingEnd: 40,
    estimateSize: () => 54,
    overscan: 2
  });
  useArrowKeyNavigation({ rowVirtualizer, parentRef, selectedItem });
  let handleFileItemSelection = useCallback(
    ({ virtualItem, searchResult, itemId }) => {
      searchResult?.exportedComponents?.length > 1 ? setSelectedItem((sItem) => sItem === virtualItem.index ? null : virtualItem.index) : searchResult?.exportedComponents?.length === 1 && onNewStory({
        componentExportName: searchResult.exportedComponents[0].name,
        componentFilePath: searchResult.filepath,
        componentIsDefaultExport: searchResult.exportedComponents[0].default,
        selectedItemId: itemId,
        componentExportCount: 1
      });
    },
    [onNewStory]
  ), handleFileItemComponentSelection = useCallback(
    ({ searchResult, component, id }) => {
      onNewStory({
        componentExportName: component.name,
        componentFilePath: searchResult.filepath,
        componentIsDefaultExport: component.default,
        selectedItemId: id,
        // @ts-expect-error (non strict)
        componentExportCount: searchResult.exportedComponents.length
      });
    },
    [onNewStory]
  ), ListItem2 = useCallback(
    ({
      virtualItem,
      selected,
      searchResult,
      noExports
    }) => {
      let itemError = errorItemId === searchResult.filepath, itemSelected = selected === virtualItem.index, tooltip = noExports ? "We can't evaluate exports for this file. Automatic story creation is disabled." : void 0;
      return react_default.createElement(
        FileListItem,
        {
          "aria-expanded": itemSelected,
          "aria-controls": `file-list-export-${virtualItem.index}`,
          id: `file-list-item-wrapper-${virtualItem.index}`
        },
        react_default.createElement(
          TooltipProvider,
          {
            tooltip: tooltip ? react_default.createElement(TooltipNote, { note: tooltip }) : void 0,
            placement: "top-start",
            delayHide: 100,
            delayShow: 200
          },
          react_default.createElement(
            FileListItemContentWrapper,
            {
              className: "file-list-item",
              selected: itemSelected,
              error: itemError,
              disabled: noExports
            },
            itemSelected ? react_default.createElement(TreeCollapseIconStyled, { size: 14 }) : react_default.createElement(TreeExpandIconStyled, { size: 14 }),
            react_default.createElement(FileListIconWrapper, { error: itemError }, react_default.createElement(ComponentIcon, null)),
            react_default.createElement(FileListItemContent, null, react_default.createElement(FileListItemLabel, { error: itemError }, searchResult.filepath.split("/").at(-1)), react_default.createElement(FileListItemPath, null, searchResult.filepath))
          )
        ),
        searchResult?.exportedComponents?.length > 1 && itemSelected && react_default.createElement(
          FileListExport,
          {
            role: "region",
            id: `file-list-export-${virtualItem.index}`,
            "aria-labelledby": `file-list-item-wrapper-${virtualItem.index}`,
            onClick: (e2) => {
              e2.stopPropagation();
            },
            onKeyUp: (e2) => {
              e2.key === "Enter" && e2.stopPropagation();
            }
          },
          searchResult.exportedComponents?.map((component, itemExportId) => {
            let itemExportError = errorItemId === `${searchResult.filepath}_${itemExportId}`, position = itemExportId === 0 ? "first" : (
              // @ts-expect-error (non strict)
              itemExportId === searchResult.exportedComponents.length - 1 ? "last" : "middle"
            );
            return react_default.createElement(
              FileListItemExport,
              {
                tabIndex: 0,
                "data-index-position": `${virtualItem.index}_${position}`,
                key: component.name,
                error: itemExportError,
                onClick: () => {
                  handleFileItemComponentSelection({
                    searchResult,
                    component,
                    id: `${searchResult.filepath}_${itemExportId}`
                  });
                },
                onKeyUp: (event) => {
                  event.key === "Enter" && handleFileItemComponentSelection({
                    searchResult,
                    component,
                    id: `${searchResult.filepath}_${itemExportId}`
                  });
                }
              },
              react_default.createElement(FileListItemExportName, null, react_default.createElement(BookmarkHollowIcon, null), component.default ? react_default.createElement(react_default.Fragment, null, react_default.createElement(FileListItemExportNameContentWithExport, null, searchResult.filepath.split("/").at(-1)?.split(".")?.at(0)), react_default.createElement(DefaultExport, null, "Default export")) : react_default.createElement(FileListItemExportNameContent, null, component.name))
            );
          })
        )
      );
    },
    [handleFileItemComponentSelection, errorItemId]
  );
  return isLoading && (searchResults === null || searchResults?.length === 0) ? react_default.createElement(FileSearchListLoadingSkeleton, null) : searchResults?.length === 0 ? react_default.createElement(NoResults, null, react_default.createElement("p", null, "We could not find any file with that name"), react_default.createElement(NoResultsDescription, null, "You may want to try using different keywords, check for typos, and adjust your filters")) : sortedSearchResults?.length > 0 ? react_default.createElement(FileListWrapper, null, react_default.createElement(FileList, { ref: parentRef }, react_default.createElement(
    FileListUl,
    {
      style: {
        height: `${rowVirtualizer.getTotalSize()}px`
      }
    },
    rowVirtualizer.getVirtualItems().map((virtualItem) => {
      let searchResult = sortedSearchResults[virtualItem.index], noExports = searchResult.exportedComponents === null || searchResult.exportedComponents?.length === 0, itemProps = {};
      return react_default.createElement(
        FileListLi,
        {
          key: virtualItem.key,
          "data-index": virtualItem.index,
          ref: rowVirtualizer.measureElement,
          onClick: () => {
            handleFileItemSelection({
              virtualItem,
              itemId: searchResult.filepath,
              searchResult
            });
          },
          onKeyUp: (event) => {
            event.key === "Enter" && handleFileItemSelection({
              virtualItem,
              itemId: searchResult.filepath,
              searchResult
            });
          },
          style: {
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            transform: `translateY(${virtualItem.start}px)`
          },
          tabIndex: 0
        },
        react_default.createElement(
          ListItem2,
          {
            ...itemProps,
            key: virtualItem.index,
            searchResult,
            selected: selectedItem,
            virtualItem,
            noExports
          }
        )
      );
    })
  ))) : null;
});

// src/manager/components/sidebar/FileSearchModal.tsx
var MODAL_HEIGHT = 418, ModalStyled = styled(Modal)(() => ({
  boxShadow: "none",
  background: "transparent",
  overflow: "visible"
})), ModalChild = styled.div(({ theme, height }) => ({
  backgroundColor: theme.background.bar,
  borderRadius: 6,
  boxShadow: "rgba(255, 255, 255, 0.05) 0 0 0 1px inset, rgba(14, 18, 22, 0.35) 0px 10px 18px -10px",
  padding: "16px",
  transition: "height 0.3s",
  height: height ? `${height + 32}px` : "auto",
  overflow: "hidden"
})), ModalContent = styled(Modal.Content)(({ theme }) => ({
  margin: 0,
  color: theme.color.defaultText
})), ModalInput = styled(Form.Input)(({ theme }) => ({
  paddingLeft: 40,
  paddingRight: 28,
  fontSize: 14,
  height: 40,
  ...theme.base === "light" && {
    color: theme.color.darkest
  },
  "::placeholder": {
    color: theme.color.mediumdark
  },
  "&:invalid:not(:placeholder-shown)": {
    boxShadow: `${theme.color.negative} 0 0 0 1px inset`
  },
  "&::-webkit-search-decoration, &::-webkit-search-cancel-button, &::-webkit-search-results-button, &::-webkit-search-results-decoration": {
    display: "none"
  }
})), SearchField = styled.div({
  display: "flex",
  flexDirection: "column",
  flexGrow: 1,
  position: "relative"
}), SearchIconWrapper = styled.div(({ theme }) => ({
  position: "absolute",
  top: 0,
  left: 16,
  zIndex: 1,
  pointerEvents: "none",
  color: theme.darkest,
  display: "flex",
  alignItems: "center",
  height: "100%"
})), LoadingIcon = styled.div(({ theme }) => ({
  position: "absolute",
  top: 0,
  right: 16,
  zIndex: 1,
  color: theme.darkest,
  display: "flex",
  alignItems: "center",
  height: "100%",
  "@keyframes spin": {
    from: { transform: "rotate(0deg)" },
    to: { transform: "rotate(360deg)" }
  },
  animation: "spin 1s linear infinite"
})), ModalError = styled(Modal.Error)({
  position: "absolute",
  padding: "8px 40px 8px 16px",
  bottom: 0,
  maxHeight: "initial",
  width: "100%",
  div: {
    wordBreak: "break-word"
  },
  "> div": {
    padding: 0
  }
}), ModalErrorCloseIcon = styled(CloseAltIcon)({
  position: "absolute",
  top: 4,
  right: -24,
  cursor: "pointer"
}), FileSearchModal = ({
  open,
  onOpenChange,
  fileSearchQuery,
  setFileSearchQuery,
  isLoading,
  error,
  searchResults,
  onCreateNewStory,
  setError
}) => {
  let [modalContentRef, modalContentDimensions] = useMeasure(), [modalMaxHeight, setModalMaxHeight] = useState(modalContentDimensions.height), [, startTransition2] = useTransition(), [searchInputValue, setSearchInputValue] = useState(fileSearchQuery);
  return useEffect(() => {
    modalMaxHeight < modalContentDimensions.height && setModalMaxHeight(modalContentDimensions.height);
  }, [modalContentDimensions.height, modalMaxHeight]), react_default.createElement(
    ModalStyled,
    {
      ariaLabel: "Add a new story",
      height: MODAL_HEIGHT,
      width: 440,
      open,
      onOpenChange
    },
    react_default.createElement(ModalChild, { height: fileSearchQuery === "" ? modalContentDimensions.height : modalMaxHeight }, react_default.createElement(ModalContent, { ref: modalContentRef }, react_default.createElement(Modal.Header, null, react_default.createElement(Modal.Title, null, "Add a new story"), react_default.createElement(Modal.Description, null, "We will create a new story for your component")), react_default.createElement(SearchField, null, react_default.createElement(SearchIconWrapper, null, react_default.createElement(SearchIcon, null)), react_default.createElement(
      ModalInput,
      {
        placeholder: "./components/**/*.tsx",
        type: "search",
        required: !0,
        autoFocus: !0,
        value: searchInputValue,
        onChange: (e2) => {
          let newValue = e2.target.value;
          setSearchInputValue(newValue), startTransition2(() => {
            setFileSearchQuery(newValue);
          });
        }
      }
    ), isLoading && react_default.createElement(LoadingIcon, null, react_default.createElement(SyncIcon, null))), react_default.createElement(
      FileSearchList,
      {
        errorItemId: error?.selectedItemId,
        isLoading,
        searchResults,
        onNewStory: onCreateNewStory
      }
    ))),
    error && fileSearchQuery !== "" && react_default.createElement(ModalError, null, react_default.createElement("div", null, error.error), react_default.createElement(
      ModalErrorCloseIcon,
      {
        onClick: () => {
          setError(null);
        }
      }
    ))
  );
};

// src/manager/components/sidebar/FileSearchModal.utils.tsx
function extractSeededRequiredArgs(argTypes) {
  return Object.keys(argTypes).reduce(
    (acc, key) => {
      let argType = argTypes[key];
      if (typeof argType.control == "object" && "type" in argType.control)
        switch (argType.control.type) {
          case "object":
            acc[key] = {};
            break;
          case "inline-radio":
          case "radio":
          case "inline-check":
          case "check":
          case "select":
          case "multi-select":
            acc[key] = argType.control.options?.[0];
            break;
          case "color":
            acc[key] = "#000000";
            break;
          default:
            break;
        }
      return setArgType(argType.type, acc, key), acc;
    },
    {}
  );
}
function setArgType(type, obj, objKey) {
  if (!(typeof type == "string" || !type.required))
    switch (type.name) {
      case "boolean":
        obj[objKey] = !0;
        break;
      case "number":
        obj[objKey] = 0;
        break;
      case "string":
        obj[objKey] = objKey;
        break;
      case "array":
        obj[objKey] = [];
        break;
      case "object":
        obj[objKey] = {}, Object.entries(type.value ?? {}).forEach(([typeKey, typeVal]) => {
          setArgType(typeVal, obj[objKey], typeKey);
        });
        break;
      case "function":
        obj[objKey] = () => {
        };
        break;
      case "intersection":
        type.value?.every((v2) => v2.name === "object") && (obj[objKey] = {}, type.value?.forEach((typeVal) => {
          typeVal.name === "object" && Object.entries(typeVal.value ?? {}).forEach(([typeValKey, typeValVal]) => {
            setArgType(typeValVal, obj[objKey], typeValKey);
          });
        }));
        break;
      case "union":
        type.value?.[0] !== void 0 && setArgType(type.value[0], obj, objKey);
        break;
      case "enum":
        type.value?.[0] !== void 0 && (obj[objKey] = type.value?.[0]);
        break;
      case "other":
        typeof type.value == "string" && type.value === "tuple" && (obj[objKey] = []);
        break;
      default:
        break;
    }
}
async function trySelectNewStory(selectStory, storyId, attempt = 1) {
  if (attempt > 10)
    throw new Error("We could not select the new story. Please try again.");
  try {
    await selectStory(storyId);
  } catch {
    return await new Promise((resolve) => setTimeout(resolve, 500)), trySelectNewStory(selectStory, storyId, attempt + 1);
  }
}

// src/manager/components/sidebar/CreateNewStoryFileModal.tsx
var stringifyArgs = (args) => JSON.stringify(args, (_2, value) => typeof value == "function" ? "__sb_empty_function_arg__" : value), CreateNewStoryFileModal = ({ open, onOpenChange }) => {
  let [isLoading, setLoading] = useState(!1), [fileSearchQuery, setFileSearchQuery] = useState(""), fileSearchQueryDebounced = useDebounce(fileSearchQuery, 600), fileSearchQueryDeferred = useDeferredValue(fileSearchQueryDebounced), emittedValue = useRef(null), [error, setError] = useState(
    null
  ), api = useStorybookApi(), [searchResults, setSearchResults] = useState(null), handleSuccessfullyCreatedStory = useCallback(
    (componentExportName) => {
      api.addNotification({
        id: "create-new-story-file-success",
        content: {
          headline: "Story file created",
          subHeadline: `${componentExportName} was created`
        },
        duration: 8e3,
        icon: react_default.createElement(CheckIcon, null)
      }), onOpenChange(!1);
    },
    [api, onOpenChange]
  ), handleStoryAlreadyExists = useCallback(() => {
    api.addNotification({
      id: "create-new-story-file-error",
      content: {
        headline: "Story already exists",
        subHeadline: "Successfully navigated to existing story"
      },
      duration: 8e3,
      icon: react_default.createElement(CheckIcon, null)
    }), onOpenChange(!1);
  }, [api, onOpenChange]), handleFileSearch = useCallback(() => {
    setLoading(!0);
    let channel = addons.getChannel(), set = (data) => {
      data.id === fileSearchQueryDeferred && (data.success ? setSearchResults(data.payload.files) : setError({ error: data.error }), channel.off(FILE_COMPONENT_SEARCH_RESPONSE, set), setLoading(!1), emittedValue.current = null);
    };
    return channel.on(FILE_COMPONENT_SEARCH_RESPONSE, set), fileSearchQueryDeferred !== "" && emittedValue.current !== fileSearchQueryDeferred ? (emittedValue.current = fileSearchQueryDeferred, channel.emit(FILE_COMPONENT_SEARCH_REQUEST, {
      id: fileSearchQueryDeferred,
      payload: {}
    })) : (setSearchResults(null), setLoading(!1)), () => {
      channel.off(FILE_COMPONENT_SEARCH_RESPONSE, set);
    };
  }, [fileSearchQueryDeferred]), handleCreateNewStory = useCallback(
    async ({
      componentExportName,
      componentFilePath,
      componentIsDefaultExport,
      componentExportCount,
      selectedItemId
    }) => {
      try {
        let channel = addons.getChannel(), createNewStoryResult = await experimental_requestResponse(channel, CREATE_NEW_STORYFILE_REQUEST, CREATE_NEW_STORYFILE_RESPONSE, {
          componentExportName,
          componentFilePath,
          componentIsDefaultExport,
          componentExportCount
        });
        setError(null);
        let storyId = createNewStoryResult.storyId;
        await trySelectNewStory(api.selectStory, storyId);
        try {
          let argTypes = (await experimental_requestResponse(channel, ARGTYPES_INFO_REQUEST, ARGTYPES_INFO_RESPONSE, {
            storyId
          })).argTypes, requiredArgs = extractSeededRequiredArgs(argTypes);
          await experimental_requestResponse(
            channel,
            SAVE_STORY_REQUEST,
            SAVE_STORY_RESPONSE,
            {
              args: stringifyArgs(requiredArgs),
              importPath: createNewStoryResult.storyFilePath,
              csfId: storyId
            }
          );
        } catch {
        }
        handleSuccessfullyCreatedStory(componentExportName), handleFileSearch();
      } catch (e2) {
        switch (e2?.payload?.type) {
          case "STORY_FILE_EXISTS":
            let err = e2;
            await trySelectNewStory(api.selectStory, err.payload.kind), handleStoryAlreadyExists();
            break;
          default:
            setError({ selectedItemId, error: e2?.message });
            break;
        }
      }
    },
    [api?.selectStory, handleSuccessfullyCreatedStory, handleFileSearch, handleStoryAlreadyExists]
  );
  return useEffect(() => {
    setError(null);
  }, [fileSearchQueryDeferred]), useEffect(() => handleFileSearch(), [handleFileSearch]), react_default.createElement(
    FileSearchModal,
    {
      error,
      fileSearchQuery,
      fileSearchQueryDeferred,
      onCreateNewStory: handleCreateNewStory,
      isLoading,
      onOpenChange,
      open,
      searchResults,
      setError,
      setFileSearchQuery
    }
  );
};

// src/manager/components/sidebar/HighlightStyles.tsx
var HighlightStyles = ({ refId, itemId }) => react_default.createElement(
  Global,
  {
    styles: ({ color: color2 }) => {
      let background2 = curriedTransparentize$1(0.85, color2.secondary);
      return {
        [`[data-ref-id="${refId}"][data-item-id="${itemId}"]:not([data-selected="true"])`]: {
          '&[data-nodetype="component"], &[data-nodetype="group"]': {
            background: background2,
            "&:hover, &:focus": { background: background2 }
          },
          '&[data-nodetype="story"], &[data-nodetype="document"], &[data-nodetype="test"]': {
            color: color2.defaultText,
            background: background2,
            "&:hover, &:focus": { background: background2 }
          }
        }
      };
    }
  }
);

// src/manager/utils/tree.ts
var import_memoizerific2 = __toESM(require_memoizerific(), 1);
var { document: document3, window: globalWindow } = scope, createId = (itemId, refId) => !refId || refId === DEFAULT_REF_ID ? itemId : `${refId}_${itemId}`, getLink = (item, refId) => `${document3.location.pathname}?path=/${item.type}/${createId(item.id, refId)}`;
var get = (0, import_memoizerific2.default)(1e3)((id, dataset) => dataset[id]), getParent = (0, import_memoizerific2.default)(1e3)((id, dataset) => {
  let item = get(id, dataset);
  return item && item.type !== "root" ? get(item.parent, dataset) : void 0;
}), getParents = (0, import_memoizerific2.default)(1e3)((id, dataset) => {
  let parent = getParent(id, dataset);
  return parent ? [parent, ...getParents(parent.id, dataset)] : [];
}), getAncestorIds2 = (0, import_memoizerific2.default)(1e3)(
  (data, id) => getParents(id, data).map((item) => item.id)
), getDescendantIds = (0, import_memoizerific2.default)(1e3)((data, id, skipLeafs) => {
  let entry = data[id];
  return !entry || !("children" in entry) || !entry.children ? [] : entry.children.reduce((acc, childId) => {
    let child = data[childId];
    return !child || skipLeafs && (child.type === "story" || child.type === "docs") || acc.push(childId, ...getDescendantIds(data, childId, skipLeafs)), acc;
  }, []);
});
function getPath(item, ref) {
  let parent = item.type !== "root" && item.parent ? ref.index[item.parent] : null;
  return parent ? [...getPath(parent, ref), parent.name] : ref.id === DEFAULT_REF_ID ? [] : [ref.title || ref.id];
}
var searchItem = (item, ref) => ({ ...item, refId: ref.id, path: getPath(item, ref) });
function cycle(array, index, delta) {
  let next = index + delta % array.length;
  return next < 0 && (next = array.length + next), next >= array.length && (next -= array.length), next;
}
var scrollIntoView = (element, center = !1) => {
  if (!element)
    return;
  let { top, bottom } = element.getBoundingClientRect();
  if (!top || !bottom)
    return;
  let bottomOffset = document3?.querySelector("#sidebar-bottom-wrapper")?.getBoundingClientRect().top || globalWindow.innerHeight || document3.documentElement.clientHeight;
  bottom > bottomOffset && element.scrollIntoView({ block: center ? "center" : "nearest" });
}, getStateType = (isLoading, isAuthRequired, isError, isEmpty) => {
  switch (!0) {
    case isAuthRequired:
      return "auth";
    case isError:
      return "error";
    case isLoading:
      return "loading";
    case isEmpty:
      return "empty";
    default:
      return "ready";
  }
}, isAncestor = (element, maybeAncestor) => !element || !maybeAncestor ? !1 : element === maybeAncestor ? !0 : isAncestor(element.parentElement || void 0, maybeAncestor), removeNoiseFromName = (storyName) => storyName.replaceAll(/(\s|-|_)/gi, ""), isStoryHoistable = (storyName, componentName) => removeNoiseFromName(storyName) === removeNoiseFromName(componentName);

// src/manager/components/sidebar/Loader.tsx
var LOADER_SEQUENCE = [0, 0, 1, 1, 2, 3, 3, 3, 1, 1, 1, 2, 2, 2, 3], Loadingitem = styled.div(
  {
    cursor: "progress",
    fontSize: 13,
    height: "16px",
    marginTop: 4,
    marginBottom: 4,
    alignItems: "center",
    overflow: "hidden"
  },
  ({ depth = 0 }) => ({
    marginLeft: depth * 15,
    maxWidth: 85 - depth * 5
  }),
  ({ theme }) => theme.animation.inlineGlow,
  ({ theme }) => ({
    background: theme.appBorderColor
  })
), Contained = styled.div({
  display: "flex",
  flexDirection: "column",
  paddingLeft: 20,
  paddingRight: 20
}), Loader2 = ({ size }) => {
  let repeats = Math.ceil(size / LOADER_SEQUENCE.length), sequence = Array.from(Array(repeats)).fill(LOADER_SEQUENCE).flat().slice(0, size);
  return react_default.createElement(Fragment, null, sequence.map((depth, index) => react_default.createElement(Loadingitem, { depth, key: index })));
};

// src/manager/components/sidebar/NoResults.tsx
var NoResults2 = styled.div(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  textAlign: "center",
  textWrap: "balance",
  gap: 4,
  padding: "20px 0",
  lineHeight: "18px",
  fontSize: `${theme.typography.size.s2}px`,
  color: theme.color.defaultText,
  small: {
    color: theme.textMutedColor,
    fontSize: `${theme.typography.size.s1}px`
  }
}));

// src/manager/components/sidebar/RefBlocks.tsx
var { window: globalWindow2 } = scope, TextStyle = styled.div(({ theme }) => ({
  fontSize: theme.typography.size.s2,
  lineHeight: "20px",
  margin: 0
})), Text3 = styled.div(({ theme }) => ({
  fontSize: theme.typography.size.s2,
  lineHeight: "20px",
  margin: 0,
  code: {
    fontSize: theme.typography.size.s1
  },
  ul: {
    paddingLeft: 20,
    marginTop: 8,
    marginBottom: 8
  }
})), ErrorDisplay = styled.pre(
  {
    boxSizing: "border-box",
    borderRadius: 8,
    overflow: "auto",
    whiteSpace: "pre"
  },
  ({ isMobile: isMobile2 }) => isMobile2 ? {
    maxWidth: "calc(100vw - 40px)"
  } : {
    minWidth: 420,
    maxWidth: 640
  },
  ({ theme }) => ({
    color: theme.color.dark
  })
), AuthBlock = ({ loginUrl, id }) => {
  let [isAuthAttempted, setAuthAttempted] = useState(!1), refresh = useCallback(() => {
    globalWindow2.document.location.reload();
  }, []), open = useCallback((e2) => {
    e2.preventDefault();
    let childWindow = globalWindow2.open(loginUrl, `storybook_auth_${id}`, "resizable,scrollbars"), timer = setInterval(() => {
      childWindow ? childWindow.closed && (clearInterval(timer), setAuthAttempted(!0)) : (logger.error("unable to access loginUrl window"), clearInterval(timer));
    }, 1e3);
  }, []);
  return react_default.createElement(Contained, null, react_default.createElement(Spaced, null, isAuthAttempted ? react_default.createElement(Fragment, null, react_default.createElement(Text3, null, "Authentication on ", react_default.createElement("strong", null, loginUrl), " concluded. Refresh the page to fetch this Storybook."), react_default.createElement("div", null, react_default.createElement(Button, { ariaLabel: !1, size: "small", variant: "outline", onClick: refresh }, react_default.createElement(SyncIcon, null), "Refresh now"))) : react_default.createElement(Fragment, null, react_default.createElement(Text3, null, "Sign in to browse this Storybook."), react_default.createElement("div", null, react_default.createElement(Button, { size: "small", variant: "outline", onClick: open }, react_default.createElement(LockIcon, null), "Sign in")))));
}, ErrorBlock = ({ error }) => {
  let { isMobile: isMobile2 } = useLayout();
  return react_default.createElement(Contained, null, react_default.createElement(Spaced, null, react_default.createElement(TextStyle, null, "Oh no! Something went wrong loading this Storybook.", react_default.createElement("br", null), react_default.createElement(
    PopoverProvider,
    {
      hasCloseButton: !0,
      offset: isMobile2 ? 0 : 8,
      placement: isMobile2 ? "bottom-end" : "bottom-start",
      popover: react_default.createElement(ErrorDisplay, { isMobile: isMobile2 }, react_default.createElement(ErrorFormatter, { error }))
    },
    react_default.createElement(Link, { isButton: !0 }, "View error ", react_default.createElement(ChevronDownIcon, null))
  ), " ", react_default.createElement(Link, { href: "https://storybook.js.org/docs?ref=ui", cancel: !1, target: "_blank" }, "View docs"))));
}, FlexSpaced = styled(Spaced)({
  display: "flex"
}), WideSpaced = styled(Spaced)({
  flex: 1
}), EmptyBlock = ({ isMain, hasEntries }) => react_default.createElement(Contained, null, react_default.createElement(FlexSpaced, { col: 1 }, react_default.createElement(WideSpaced, null, hasEntries ? react_default.createElement(NoResults2, null, react_default.createElement("strong", null, "No stories found"), react_default.createElement("small", null, "Your selected filters did not match any stories.")) : isMain ? react_default.createElement(Text3, null, "Oh no! Your Storybook is empty. This can happen when:", react_default.createElement("ul", null, react_default.createElement("li", null, "Your", " ", react_default.createElement(
  Link,
  {
    href: "https://storybook.js.org/docs/api/main-config/main-config-stories?ref=ui",
    cancel: !1,
    target: "_blank"
  },
  "stories glob configuration"
), " ", "does not match any files.", " "), react_default.createElement("li", null, "You have", " ", react_default.createElement(
  Link,
  {
    href: "https://storybook.js.org/docs/writing-stories?ref=ui",
    cancel: !1,
    target: "_blank"
  },
  "no stories defined"
), " ", "in your story files.", " "))) : react_default.createElement(Text3, null, "This composed Storybook is empty. Perhaps no stories match your selected filters.")))), LoaderBlock = ({ isMain }) => react_default.createElement(Contained, null, react_default.createElement(Loader2, { size: isMain ? 17 : 5 }));

// src/manager/components/sidebar/RefIndicator.tsx
var { document: document4, window: globalWindow3 } = scope, IndicatorPlacement = styled.div(({ theme }) => ({
  height: 16,
  display: "flex",
  alignItems: "center",
  "& > * + *": {
    marginLeft: theme.layoutMargin
  }
})), IndicatorClickTarget = styled(Button)(({ theme }) => ({
  color: theme.textMutedColor,
  svg: {
    height: 14,
    width: 14,
    padding: 2,
    transition: "all 150ms ease-out",
    color: "inherit"
  }
})), MessageTitle = styled.span(({ theme }) => ({
  fontWeight: theme.typography.weight.bold
})), StyledMessage = styled.a(({ theme }) => ({
  textDecoration: "none",
  lineHeight: "16px",
  padding: 15,
  display: "flex",
  flexDirection: "row",
  alignItems: "flex-start",
  color: theme.color.defaultText,
  "&:not(:last-child)": {
    borderBottom: `1px solid ${theme.appBorderColor}`
  },
  "&:hover": {
    background: theme.background.hoverable,
    color: theme.color.defaultText
  },
  "&:link, &:active, &:focus": {
    color: theme.color.defaultText
  },
  "&:focus-visible": {
    background: theme.background.hoverable,
    borderRadius: 8,
    boxShadow: `inset 0 0 0 2px ${theme.color.secondary}`,
    outline: "none"
  },
  "& > *": {
    flex: 1
  },
  "& > svg": {
    marginTop: 3,
    width: 16,
    height: 16,
    marginRight: 10,
    flex: "unset"
  }
})), Message = ({ href, blank = !0, children, onClick }) => react_default.createElement(StyledMessage, { href, target: blank ? "_blank" : void 0, onClick }, children), MessageWrapper = styled.div(
  ({ isMobile: isMobile2 }) => ({
    width: isMobile2 ? "calc(100vw - 20px)" : 280,
    boxSizing: "border-box",
    borderRadius: 8,
    overflow: "hidden"
  }),
  ({ theme }) => ({
    color: theme.color.dark
  })
), SubtleSelect = styled(Select)(({ theme }) => ({
  background: "transparent",
  color: theme.color.defaultText,
  fontSize: theme.typography.size.s1,
  fontWeight: theme.typography.weight.regular
})), RefIndicator = react_default.memo(
  forwardRef(
    ({ state, ...ref }, forwardedRef) => {
      let api = useStorybookApi(), { isMobile: isMobile2 } = useLayout(), list = useMemo(() => Object.values(ref.index || {}), [ref.index]), componentCount = useMemo(
        () => list.filter((v2) => v2.type === "component").length,
        [list]
      ), leafCount = useMemo(
        () => list.filter((v2) => v2.type === "docs" || v2.type === "story").length,
        [list]
      ), currentVersion = useMemo(() => {
        if (ref.versions)
          return Object.entries(ref.versions).find(([, v2]) => v2 === ref.url)?.[0];
      }, [ref.versions, ref.url]);
      return react_default.createElement(IndicatorPlacement, { ref: forwardedRef }, react_default.createElement(
        PopoverProvider,
        {
          placement: isMobile2 ? "bottom" : "bottom-start",
          padding: 0,
          popover: () => react_default.createElement(MessageWrapper, { isMobile: isMobile2 }, react_default.createElement(Spaced, { row: 0 }, state === "loading" && react_default.createElement(LoadingMessage, { url: ref.url }), (state === "error" || state === "empty") && react_default.createElement(ErrorOccurredMessage, { url: ref.url }), state === "ready" && react_default.createElement(react_default.Fragment, null, react_default.createElement(ReadyMessage, { url: ref.url, componentCount, leafCount }), ref.sourceUrl && react_default.createElement(SourceCodeMessage, { url: ref.sourceUrl })), state === "auth" && react_default.createElement(LoginRequiredMessage, { ...ref }), ref.type === "auto-inject" && state !== "error" && react_default.createElement(PerformanceDegradedMessage, null), state !== "loading" && react_default.createElement(ReadDocsMessage, null)))
        },
        react_default.createElement(
          IndicatorClickTarget,
          {
            variant: "ghost",
            padding: "small",
            size: "small",
            "data-action": "toggle-indicator",
            ariaLabel: "Extra actions"
          },
          react_default.createElement(GlobeIcon, null)
        )
      ), ref.versions && Object.keys(ref.versions).length ? react_default.createElement(react_default.Fragment, null, react_default.createElement(
        SubtleSelect,
        {
          padding: "small",
          size: "small",
          ariaLabel: "Version",
          tooltip: "Choose version",
          defaultOptions: currentVersion,
          onSelect: (item) => {
            let href = ref.versions?.[item];
            href && api.changeRefVersion(ref.id, href);
          },
          options: Object.entries(ref.versions).map(([id, href]) => ({
            value: id,
            title: id,
            href
          }))
        },
        "version"
      )) : null);
    }
  )
), ReadyMessage = ({ url, componentCount, leafCount }) => {
  let theme = useTheme();
  return react_default.createElement(Message, { href: url.replace(/\/?$/, "/index.html") }, react_default.createElement(GlobeIcon, { color: theme.color.secondary }), react_default.createElement("div", null, react_default.createElement(MessageTitle, null, "View external Storybook"), react_default.createElement("div", null, "Explore ", componentCount, " components and ", leafCount, " stories in a new browser tab.")));
}, SourceCodeMessage = ({ url }) => {
  let theme = useTheme();
  return react_default.createElement(Message, { href: url }, react_default.createElement(MarkupIcon, { color: theme.color.secondary }), react_default.createElement("div", null, react_default.createElement(MessageTitle, null, "View source code")));
}, LoginRequiredMessage = ({ loginUrl, id }) => {
  let theme = useTheme(), open = useCallback(
    (e2) => {
      e2.preventDefault();
      let childWindow = globalWindow3.open(
        loginUrl,
        `storybook_auth_${id}`,
        "resizable,scrollbars"
      ), timer = setInterval(() => {
        childWindow ? childWindow.closed && (clearInterval(timer), document4.location.reload()) : clearInterval(timer);
      }, 1e3);
    },
    [id, loginUrl]
  );
  return react_default.createElement(Message, { onClick: open, blank: !1 }, react_default.createElement(LockIcon, { color: theme.color.gold }), react_default.createElement("div", null, react_default.createElement(MessageTitle, null, "Log in required"), react_default.createElement("div", null, "You need to authenticate to view this Storybook's components.")));
}, ReadDocsMessage = () => {
  let theme = useTheme();
  return react_default.createElement(Message, { href: "https://storybook.js.org/docs/sharing/storybook-composition?ref=ui" }, react_default.createElement(DocumentIcon, { color: theme.color.green }), react_default.createElement("div", null, react_default.createElement(MessageTitle, null, "Read Composition docs"), react_default.createElement("div", null, "Learn how to combine multiple Storybooks into one.")));
}, ErrorOccurredMessage = ({ url }) => {
  let theme = useTheme();
  return react_default.createElement(Message, { href: url.replace(/\/?$/, "/index.html") }, react_default.createElement(AlertIcon, { color: theme.color.negative }), react_default.createElement("div", null, react_default.createElement(MessageTitle, null, "Something went wrong"), react_default.createElement("div", null, "This external Storybook didn't load. Debug it in a new tab now.")));
}, LoadingMessage = ({ url }) => {
  let theme = useTheme();
  return react_default.createElement(Message, { href: url.replace(/\/?$/, "/index.html") }, react_default.createElement(TimeIcon, { color: theme.color.secondary }), react_default.createElement("div", null, react_default.createElement(MessageTitle, null, "Please wait"), react_default.createElement("div", null, "This Storybook is loading.")));
}, PerformanceDegradedMessage = () => {
  let theme = useTheme();
  return react_default.createElement(Message, { href: "https://storybook.js.org/docs/sharing/storybook-composition?ref=ui" }, react_default.createElement(LightningIcon, { color: theme.color.gold }), react_default.createElement("div", null, react_default.createElement(MessageTitle, null, "Reduce lag"), react_default.createElement("div", null, "Learn how to speed up Composition performance.")));
};

// src/manager/utils/status.tsx
var import_memoizerific3 = __toESM(require_memoizerific(), 1);

// src/manager/components/sidebar/IconSymbols.tsx
var Svg2 = styled.svg`
  position: absolute;
  width: 0;
  height: 0;
  display: inline-block;
  shape-rendering: inherit;
  vertical-align: middle;
`, GROUP_ID = "icon--group", COMPONENT_ID = "icon--component", DOCUMENT_ID = "icon--document", STORY_ID = "icon--story", TEST_ID = "icon--test", SUCCESS_ID = "icon--success", ERROR_ID = "icon--error", WARNING_ID = "icon--warning", DOT_ID = "icon--dot", IconSymbols = () => react_default.createElement(Svg2, { "data-chromatic": "ignore" }, react_default.createElement("symbol", { id: GROUP_ID }, react_default.createElement(
  "path",
  {
    fillRule: "evenodd",
    clipRule: "evenodd",
    d: "M6.586 3.504l-1.5-1.5H1v9h12v-7.5H6.586zm.414-1L5.793 1.297a1 1 0 00-.707-.293H.5a.5.5 0 00-.5.5v10a.5.5 0 00.5.5h13a.5.5 0 00.5-.5v-8.5a.5.5 0 00-.5-.5H7z",
    fill: "currentColor"
  }
)), react_default.createElement("symbol", { id: COMPONENT_ID }, react_default.createElement(
  "path",
  {
    fillRule: "evenodd",
    clipRule: "evenodd",
    d: "M3.5 1.004a2.5 2.5 0 00-2.5 2.5v7a2.5 2.5 0 002.5 2.5h7a2.5 2.5 0 002.5-2.5v-7a2.5 2.5 0 00-2.5-2.5h-7zm8.5 5.5H7.5v-4.5h3a1.5 1.5 0 011.5 1.5v3zm0 1v3a1.5 1.5 0 01-1.5 1.5h-3v-4.5H12zm-5.5 4.5v-4.5H2v3a1.5 1.5 0 001.5 1.5h3zM2 6.504h4.5v-4.5h-3a1.5 1.5 0 00-1.5 1.5v3z",
    fill: "currentColor"
  }
)), react_default.createElement("symbol", { id: DOCUMENT_ID }, react_default.createElement(
  "path",
  {
    d: "M4 5.5a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5a.5.5 0 01-.5-.5zM4.5 7.5a.5.5 0 000 1h5a.5.5 0 000-1h-5zM4 10.5a.5.5 0 01.5-.5h5a.5.5 0 010 1h-5a.5.5 0 01-.5-.5z",
    fill: "currentColor"
  }
), react_default.createElement(
  "path",
  {
    fillRule: "evenodd",
    clipRule: "evenodd",
    d: "M1.5 0a.5.5 0 00-.5.5v13a.5.5 0 00.5.5h11a.5.5 0 00.5-.5V3.207a.5.5 0 00-.146-.353L10.146.146A.5.5 0 009.793 0H1.5zM2 1h7.5v2a.5.5 0 00.5.5h2V13H2V1z",
    fill: "currentColor"
  }
)), react_default.createElement("symbol", { id: STORY_ID }, react_default.createElement(
  "path",
  {
    fillRule: "evenodd",
    clipRule: "evenodd",
    d: "M3.5 0h7a.5.5 0 01.5.5v13a.5.5 0 01-.454.498.462.462 0 01-.371-.118L7 11.159l-3.175 2.72a.46.46 0 01-.379.118A.5.5 0 013 13.5V.5a.5.5 0 01.5-.5zM4 12.413l2.664-2.284a.454.454 0 01.377-.128.498.498 0 01.284.12L10 12.412V1H4v11.413z",
    fill: "currentColor"
  }
)), react_default.createElement("symbol", { id: TEST_ID }, react_default.createElement(
  "path",
  {
    fillRule: "evenodd",
    clipRule: "evenodd",
    d: "M4.5 2h.75v3.866l-3.034 5.26A1.25 1.25 0 003.299 13H10.7a1.25 1.25 0 001.083-1.875L8.75 5.866V2h.75a.5.5 0 100-1h-5a.5.5 0 000 1zm1.75 4V2h1.5v4.134l.067.116L8.827 8H5.173l1.01-1.75.067-.116V6zM4.597 9l-1.515 2.625A.25.25 0 003.3 12H10.7a.25.25 0 00.217-.375L9.404 9H4.597z",
    fill: "currentColor"
  }
)), react_default.createElement("symbol", { id: SUCCESS_ID }, react_default.createElement(
  "path",
  {
    fillRule: "evenodd",
    clipRule: "evenodd",
    d: "M10.854 4.146a.5.5 0 010 .708l-5 5a.5.5 0 01-.708 0l-2-2a.5.5 0 11.708-.708L5.5 8.793l4.646-4.647a.5.5 0 01.708 0z",
    fill: "currentColor"
  }
)), react_default.createElement("symbol", { id: ERROR_ID }, react_default.createElement(
  "path",
  {
    fillRule: "evenodd",
    clipRule: "evenodd",
    d: "M7 4a3 3 0 100 6 3 3 0 000-6zM3 7a4 4 0 118 0 4 4 0 01-8 0z",
    fill: "currentColor"
  }
)), react_default.createElement("symbol", { id: WARNING_ID }, react_default.createElement(
  "path",
  {
    fillRule: "evenodd",
    clipRule: "evenodd",
    d: "M7.206 3.044a.498.498 0 01.23.212l3.492 5.985a.494.494 0 01.006.507.497.497 0 01-.443.252H3.51a.499.499 0 01-.437-.76l3.492-5.984a.497.497 0 01.642-.212zM7 4.492L4.37 9h5.26L7 4.492z",
    fill: "currentColor"
  }
)), react_default.createElement("symbol", { id: DOT_ID }, react_default.createElement("circle", { cx: "3", cy: "3", r: "3", fill: "currentColor" }))), UseSymbol = ({ type }) => type === "group" ? react_default.createElement("use", { xlinkHref: `#${GROUP_ID}` }) : type === "component" ? react_default.createElement("use", { xlinkHref: `#${COMPONENT_ID}` }) : type === "document" ? react_default.createElement("use", { xlinkHref: `#${DOCUMENT_ID}` }) : type === "story" ? react_default.createElement("use", { xlinkHref: `#${STORY_ID}` }) : type === "test" ? react_default.createElement("use", { xlinkHref: `#${TEST_ID}` }) : type === "success" ? react_default.createElement("use", { xlinkHref: `#${SUCCESS_ID}` }) : type === "error" ? react_default.createElement("use", { xlinkHref: `#${ERROR_ID}` }) : type === "warning" ? react_default.createElement("use", { xlinkHref: `#${WARNING_ID}` }) : type === "dot" ? react_default.createElement("use", { xlinkHref: `#${DOT_ID}` }) : null;

// src/manager/utils/status.tsx
var SmallIcons = styled(CircleIcon)({
  // specificity hack
  "&&&": {
    width: 6,
    height: 6
  }
}), LoadingIcons = styled(SmallIcons)(({ theme: { animation } }) => ({
  // specificity hack
  animation: `${animation.glow} 1.5s ease-in-out infinite`
})), statusPriority = [
  "status-value:unknown",
  "status-value:pending",
  "status-value:success",
  "status-value:warning",
  "status-value:error"
], getStatus = (0, import_memoizerific3.default)(5)((theme, status) => ({
  "status-value:unknown": [null, null],
  "status-value:pending": [react_default.createElement(LoadingIcons, { key: "icon" }), "currentColor"],
  "status-value:success": [
    react_default.createElement("svg", { key: "icon", viewBox: "0 0 14 14", width: "14", height: "14" }, react_default.createElement(UseSymbol, { type: "success" })),
    "currentColor"
  ],
  "status-value:warning": [
    react_default.createElement("svg", { key: "icon", viewBox: "0 0 14 14", width: "14", height: "14" }, react_default.createElement(UseSymbol, { type: "warning" })),
    theme.fgColor.warning
  ],
  "status-value:error": [
    react_default.createElement("svg", { key: "icon", viewBox: "0 0 14 14", width: "14", height: "14" }, react_default.createElement(UseSymbol, { type: "error" })),
    theme.fgColor.negative
  ]
})[status]), getMostCriticalStatusValue = (statusValues) => statusPriority.reduce(
  (acc, value) => statusValues.includes(value) ? value : acc,
  "status-value:unknown"
);
function getGroupStatus(collapsedData, allStatuses) {
  return Object.values(collapsedData).reduce((acc, item) => {
    if (item.type === "group" || item.type === "component" || item.type === "story") {
      let leafs = getDescendantIds(collapsedData, item.id, !1).map((id) => collapsedData[id]).filter((i2) => i2.type === "story"), combinedStatus = getMostCriticalStatusValue(
        // @ts-expect-error (non strict)
        leafs.flatMap((story) => Object.values(allStatuses[story.id] || {})).map((s2) => s2.value)
      );
      combinedStatus && (acc[item.id] = combinedStatus);
    }
    return acc;
  }, {});
}

// src/manager/components/sidebar/ContextMenu.tsx
var import_copy_to_clipboard2 = __toESM(require_copy_to_clipboard(), 1);

// src/manager/components/sidebar/StatusButton.tsx
var withStatusColor = ({ theme, status }) => {
  let defaultColor = theme.base === "light" ? curriedTransparentize$1(0.3, theme.color.defaultText) : curriedTransparentize$1(0.6, theme.color.defaultText);
  return {
    color: {
      "status-value:pending": defaultColor,
      "status-value:success": theme.color.positive,
      "status-value:error": theme.color.negative,
      "status-value:warning": theme.color.warning,
      "status-value:unknown": defaultColor
    }[status]
  };
}, StatusLabel = styled.div(withStatusColor, {
  margin: 3
}), StyledButton = styled(Button)(
  withStatusColor,
  ({ theme, height, width }) => ({
    transition: "none",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: width || 28,
    height: height || 28,
    "&:hover": {
      color: theme.color.secondary,
      background: theme.base === "dark" ? curriedDarken$1(0.3, theme.color.secondary) : curriedLighten$1(0.4, theme.color.secondary)
    },
    '[data-selected="true"] &': {
      background: theme.base === "dark" ? curriedDarken$1(0.18, theme.color.secondary) : theme.color.secondary,
      boxShadow: `0 0 5px 5px ${theme.base === "dark" ? curriedDarken$1(0.18, theme.color.secondary) : theme.color.secondary}`,
      "&:hover": {
        background: theme.base === "dark" ? curriedDarken$1(0.1, theme.color.secondary) : theme.color.secondary
      }
    },
    "&:focus": {
      color: theme.color.secondary,
      borderColor: theme.color.secondary,
      outlineOffset: -2,
      "&:not(:focus-visible)": {
        borderColor: "transparent"
      }
    }
  }),
  ({ theme, selectedItem }) => selectedItem && {
    "&:hover": {
      boxShadow: `inset 0 0 0 2px ${theme.color.secondary}`,
      background: "rgba(255, 255, 255, 0.2)"
    }
  }
), StatusButton = forwardRef((props, ref) => react_default.createElement(StyledButton, { variant: "ghost", padding: "small", ...props, ref }));
StatusButton.displayName = "StatusButton";

// src/manager/components/sidebar/StatusContext.tsx
var StatusContext = createContext({});

// src/manager/components/sidebar/ContextMenu.tsx
var empty = {
  onMouseEnter: () => {
  },
  node: null
}, FloatingStatusButton = styled(StatusButton)({
  background: "var(--tree-node-background-hover)",
  boxShadow: "0 0 5px 5px var(--tree-node-background-hover)",
  position: "absolute",
  right: 0,
  zIndex: 1,
  "&:focus-visible": {
    outlineOffset: -2
  }
}), useContextMenu = (context, links, api) => {
  let [hoverCount, setHoverCount] = useState(0), [isOpen, setIsOpen] = useState(!1), [copyText, setCopyText] = react_default.useState("Copy story name"), { allStatuses, groupStatus } = useContext(StatusContext), shortcutKeys = api.getShortcutKeys(), enableShortcuts = !!shortcutKeys, topLinks = useMemo(() => {
    let defaultLinks = [];
    return context && "importPath" in context && defaultLinks.push({
      id: "open-in-editor",
      title: "Open in editor",
      icon: react_default.createElement(EditorIcon, null),
      right: enableShortcuts ? react_default.createElement(Shortcut, { keys: shortcutKeys.openInEditor }) : null,
      onClick: (e2) => {
        e2.preventDefault(), api.openInEditor({
          file: context.importPath
        });
      }
    }), context.type === "story" && defaultLinks.push({
      id: "copy-story-name",
      title: copyText,
      icon: react_default.createElement(CopyIcon, null),
      // TODO: bring this back once we want to add shortcuts for this
      // right:
      //   enableShortcuts && shortcutKeys.copyStoryName ? (
      //     <Shortcut keys={shortcutKeys.copyStoryName} />
      //   ) : null,
      onClick: (e2) => {
        e2.preventDefault(), (0, import_copy_to_clipboard2.default)(context.exportName), setCopyText("Copied!"), setTimeout(() => {
          setCopyText("Copy story name");
        }, 2e3);
      }
    }), defaultLinks;
  }, [api, context, copyText, enableShortcuts, shortcutKeys]), handlers = useMemo(() => ({
    onMouseEnter: () => {
      setHoverCount((c2) => c2 + 1);
    },
    onOpen: (event) => {
      event.stopPropagation(), setIsOpen(!0);
    },
    onClose: () => {
      setIsOpen(!1);
    }
  }), []), providerLinks = useMemo(() => {
    let registeredTestProviders = api.getElements(Addon_TypesEnum.experimental_TEST_PROVIDER);
    return hoverCount ? generateTestProviderLinks(registeredTestProviders, context) : [];
  }, [api, context, hoverCount]), shouldRender = !context.refId && (providerLinks.length > 0 || links.length > 0 || topLinks.length > 0), isLeafNode = context.type === "story" || context.type === "docs", itemStatus = useMemo(() => {
    let status = "status-value:unknown";
    if (!context)
      return status;
    if (isLeafNode) {
      let values = Object.values(allStatuses?.[context.id] || {}).map((s2) => s2.value);
      status = getMostCriticalStatusValue(values);
    }
    if (!isLeafNode) {
      let groupValue = groupStatus && groupStatus[context.id];
      status = groupValue === "status-value:success" || groupValue === void 0 ? "status-value:unknown" : groupValue;
    }
    return status;
  }, [allStatuses, groupStatus, context, isLeafNode]), MenuIcon2 = useMemo(() => context.type !== "story" && context.type !== "docs" ? itemStatus !== "status-value:success" && itemStatus !== "status-value:unknown" ? react_default.createElement("svg", { key: "icon", viewBox: "0 0 6 6", width: "6", height: "6" }, react_default.createElement(UseSymbol, { type: "dot" })) : react_default.createElement(EllipsisIcon, null) : itemStatus === "status-value:error" ? react_default.createElement("svg", { key: "icon", viewBox: "0 0 14 14", width: "14", height: "14" }, react_default.createElement(UseSymbol, { type: "error" })) : itemStatus === "status-value:warning" ? react_default.createElement("svg", { key: "icon", viewBox: "0 0 14 14", width: "14", height: "14" }, react_default.createElement(UseSymbol, { type: "warning" })) : itemStatus === "status-value:success" ? react_default.createElement("svg", { key: "icon", viewBox: "0 0 14 14", width: "14", height: "14" }, react_default.createElement(UseSymbol, { type: "success" })) : react_default.createElement(EllipsisIcon, null), [itemStatus, context.type]);
  return useMemo(() => globalThis.CONFIG_TYPE !== "DEVELOPMENT" ? empty : {
    onMouseEnter: handlers.onMouseEnter,
    node: shouldRender ? react_default.createElement(
      PopoverProvider,
      {
        placement: "bottom-end",
        defaultVisible: !1,
        visible: isOpen,
        onVisibleChange: setIsOpen,
        popover: react_default.createElement(LiveContextMenu, { context, links: [...topLinks, ...links] }),
        hasChrome: !0,
        padding: 0
      },
      react_default.createElement(
        FloatingStatusButton,
        {
          "data-displayed": isOpen ? "on" : "off",
          "data-testid": "context-menu",
          ariaLabel: "Open context menu",
          type: "button",
          status: itemStatus,
          onClick: handlers.onOpen
        },
        MenuIcon2
      )
    ) : null
  }, [context, handlers, isOpen, shouldRender, links, topLinks, itemStatus, MenuIcon2]);
}, LiveContextMenu = ({
  context,
  links,
  ...rest2
}) => {
  let registeredTestProviders = useStorybookApi().getElements(
    Addon_TypesEnum.experimental_TEST_PROVIDER
  ), providerLinks = generateTestProviderLinks(registeredTestProviders, context), all = (Array.isArray(links[0]) || links.length === 0 ? links : [links]).concat([providerLinks]);
  return react_default.createElement(TooltipLinkList, { ...rest2, links: all });
};
function generateTestProviderLinks(registeredTestProviders, context) {
  return Object.entries(registeredTestProviders).map(([testProviderId, state]) => {
    if (!state)
      return null;
    let content = state.sidebarContextMenu?.({ context });
    return content ? {
      id: testProviderId,
      content
    } : null;
  }).filter(Boolean);
}

// src/manager/components/sidebar/components/CollapseIcon.tsx
var CollapseIconWrapper = styled.div(({ theme, isExpanded }) => ({
  width: 8,
  height: 8,
  display: "flex",
  justifyContent: "center",
  alignItems: "center",
  transform: isExpanded ? "rotateZ(90deg)" : "none",
  transition: "transform .1s ease-out",
  color: theme.textMutedColor
})), CollapseIcon2 = (props) => react_default.createElement(CollapseIconWrapper, { ...props }, react_default.createElement("svg", { xmlns: "http://www.w3.org/2000/svg", width: "8", height: "8", fill: "none" }, react_default.createElement(
  "path",
  {
    fill: "currentColor",
    fillRule: "evenodd",
    clipRule: "evenodd",
    d: "M1.896 7.146a.5.5 0 1 0 .708.708l3.5-3.5a.5.5 0 0 0 0-.708l-3.5-3.5a.5.5 0 1 0-.708.708L5.043 4 1.896 7.146Z"
  }
)));

// src/manager/components/sidebar/TreeNode.tsx
var TypeIcon2 = styled.svg(
  ({ theme, type }) => ({
    width: 14,
    height: 14,
    flex: "0 0 auto",
    color: type === "group" ? theme.base === "dark" ? theme.color.primary : theme.color.ultraviolet : type === "component" ? theme.color.secondary : type === "document" ? theme.base === "dark" ? theme.color.gold : "#ff8300" : type === "story" ? theme.color.seafoam : type === "test" ? theme.color.green : "currentColor"
  })
), commonNodeStyles = ({
  theme,
  depth = 0,
  isExpandable = !1
}) => ({
  flex: 1,
  width: "100%",
  cursor: "pointer",
  display: "flex",
  alignItems: "start",
  textAlign: "left",
  textDecoration: "none",
  border: "none",
  color: "inherit",
  fontSize: `${theme.typography.size.s2}px`,
  fontWeight: "inherit",
  background: "transparent",
  minHeight: 28,
  borderRadius: 4,
  gap: 6,
  paddingLeft: `${(isExpandable ? 8 : 22) + depth * 18}px`,
  paddingTop: 5,
  paddingBottom: 4,
  overflowWrap: "break-word",
  wordWrap: "break-word",
  wordBreak: "break-word"
}), BranchNode = styled.button(commonNodeStyles), LeafNode = styled.a(commonNodeStyles), RootNode = styled.div({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  marginTop: 16,
  marginBottom: 4,
  "&:first-of-type": {
    marginTop: 0
  }
}), Wrapper3 = styled.div({
  display: "flex",
  alignItems: "center",
  gap: 6,
  marginTop: 2
}), GroupNode = react_default.memo(function({
  children,
  isExpanded = !1,
  isExpandable = !1,
  ...props
}) {
  return react_default.createElement(BranchNode, { isExpandable, tabIndex: -1, ...props }, react_default.createElement(Wrapper3, null, isExpandable && react_default.createElement(CollapseIcon2, { isExpanded }), react_default.createElement(TypeIcon2, { viewBox: "0 0 14 14", width: "14", height: "14", type: "group" }, react_default.createElement(UseSymbol, { type: "group" }))), children);
}), ComponentNode = react_default.memo(
  function({
    theme,
    children,
    isExpanded = !1,
    isExpandable = !1,
    isSelected,
    ...props
  }) {
    return react_default.createElement(BranchNode, { isExpandable, tabIndex: -1, ...props }, react_default.createElement(Wrapper3, null, isExpandable && react_default.createElement(CollapseIcon2, { isExpanded }), react_default.createElement(TypeIcon2, { viewBox: "0 0 14 14", width: "12", height: "12", type: "component" }, react_default.createElement(UseSymbol, { type: "component" }))), children);
  }
), DocumentNode = react_default.memo(function({ theme, children, docsMode, ...props }) {
  return react_default.createElement(LeafNode, { tabIndex: -1, ...props }, react_default.createElement(Wrapper3, null, react_default.createElement(TypeIcon2, { viewBox: "0 0 14 14", width: "12", height: "12", type: "document" }, react_default.createElement(UseSymbol, { type: "document" }))), children);
}), StoryNode = react_default.memo(function({
  theme,
  children,
  isExpandable = !1,
  isExpanded = !1,
  isSelected,
  ...props
}) {
  return react_default.createElement(BranchNode, { isExpandable, tabIndex: -1, ...props }, react_default.createElement(Wrapper3, null, isExpandable && react_default.createElement(CollapseIcon2, { isExpanded }), react_default.createElement(TypeIcon2, { viewBox: "0 0 14 14", width: "12", height: "12", type: "story" }, react_default.createElement(UseSymbol, { type: "story" }))), children);
}), TestNode = react_default.memo(function({
  theme,
  children,
  ...props
}) {
  return react_default.createElement(LeafNode, { tabIndex: -1, ...props }, react_default.createElement(Wrapper3, null, react_default.createElement(TypeIcon2, { viewBox: "0 0 14 14", width: "12", height: "12", type: "test" }, react_default.createElement(UseSymbol, { type: "test" }))), children);
});

// src/manager/keybinding.ts
var codeToKeyMap = {
  // event.code => event.key
  Space: " ",
  Slash: "/",
  ArrowLeft: "ArrowLeft",
  ArrowUp: "ArrowUp",
  ArrowRight: "ArrowRight",
  ArrowDown: "ArrowDown",
  Escape: "Escape",
  Enter: "Enter"
}, allFalse = { alt: !1, ctrl: !1, meta: !1, shift: !1 }, matchesModifiers = (modifiers2, event) => {
  let { alt, ctrl, meta, shift: shift2 } = modifiers2 === !1 ? allFalse : modifiers2;
  return !(typeof alt == "boolean" && alt !== event.altKey || typeof ctrl == "boolean" && ctrl !== event.ctrlKey || typeof meta == "boolean" && meta !== event.metaKey || typeof shift2 == "boolean" && shift2 !== event.shiftKey);
}, matchesKeyCode = (code, event) => event.code ? event.code === code : event.key === codeToKeyMap[code];

// src/manager/components/sidebar/useExpanded.ts
var { document: document5 } = scope, initializeExpanded = ({
  refId,
  data,
  initialExpanded,
  highlightedRef,
  rootIds,
  selectedStoryId
}) => {
  let selectedStory = selectedStoryId && data[selectedStoryId], candidates = [...rootIds];
  return highlightedRef.current?.refId === refId && candidates.push(...getAncestorIds2(data, highlightedRef.current?.itemId)), selectedStory && "children" in selectedStory && selectedStory.children?.length && candidates.push(selectedStoryId), candidates.reduce(
    // @ts-expect-error (non strict)
    (acc, id) => Object.assign(acc, { [id]: id in initialExpanded ? initialExpanded[id] : !0 }),
    {}
  );
}, noop3 = () => {
}, useExpanded = ({
  containerRef,
  isBrowsing,
  refId,
  data,
  initialExpanded,
  rootIds,
  highlightedRef,
  setHighlightedItemId,
  selectedStoryId,
  onSelectStoryId
}) => {
  let api = useStorybookApi(), [expanded, setExpanded] = useReducer(
    (state, { ids, value }) => ids.reduce((acc, id) => Object.assign(acc, { [id]: value }), { ...state }),
    // @ts-expect-error (non strict)
    { refId, data, highlightedRef, rootIds, initialExpanded, selectedStoryId },
    initializeExpanded
  ), getElementByDataItemId = useCallback(
    (id) => containerRef.current?.querySelector(`[data-item-id="${id}"]`),
    [containerRef]
  ), highlightElement = useCallback(
    (element) => {
      setHighlightedItemId(element.getAttribute("data-item-id")), scrollIntoView(element);
    },
    [setHighlightedItemId]
  ), updateExpanded = useCallback(
    ({ ids, value }) => {
      if (setExpanded({ ids, value }), ids.length === 1) {
        let element = containerRef.current?.querySelector(
          `[data-item-id="${ids[0]}"][data-ref-id="${refId}"]`
        );
        element && highlightElement(element);
      }
    },
    [containerRef, highlightElement, refId]
  );
  useEffect(() => {
    setExpanded({ ids: getAncestorIds2(data, selectedStoryId), value: !0 });
  }, [data, selectedStoryId]);
  let collapseAll = useCallback(() => {
    let ids = Object.keys(data).filter((id) => !rootIds.includes(id));
    setExpanded({ ids, value: !1 });
  }, [data, rootIds]), expandAll = useCallback(() => {
    setExpanded({ ids: Object.keys(data), value: !0 });
  }, [data]);
  return useEffect(() => api ? (api.on(STORIES_COLLAPSE_ALL, collapseAll), api.on(STORIES_EXPAND_ALL, expandAll), () => {
    api.off(STORIES_COLLAPSE_ALL, collapseAll), api.off(STORIES_EXPAND_ALL, expandAll);
  }) : noop3, [api, collapseAll, expandAll]), useEffect(() => {
    let menuElement = document5.getElementById("storybook-explorer-menu"), navigateTree = throttle((event) => {
      let highlightedItemId = highlightedRef.current?.refId === refId && highlightedRef.current?.itemId;
      if (!isBrowsing || !containerRef.current || !highlightedItemId || event.repeat || !matchesModifiers(!1, event))
        return;
      let isEnter = matchesKeyCode("Enter", event), isSpace = matchesKeyCode("Space", event), isArrowLeft = matchesKeyCode("ArrowLeft", event), isArrowRight = matchesKeyCode("ArrowRight", event);
      if (!(isEnter || isSpace || isArrowLeft || isArrowRight))
        return;
      let highlightedElement = getElementByDataItemId(highlightedItemId);
      if (!highlightedElement || highlightedElement.getAttribute("data-ref-id") !== refId)
        return;
      let target = event.target;
      if (!isAncestor(menuElement, target) && !isAncestor(target, menuElement))
        return;
      if (target.hasAttribute("data-action")) {
        if (isEnter || isSpace)
          return;
        target.blur();
      }
      let type = highlightedElement.getAttribute("data-nodetype");
      type && (isEnter || isSpace) && ["component", "story", "document", "test"].includes(type) && onSelectStoryId(highlightedItemId);
      let isExpanded = highlightedElement.getAttribute("aria-expanded");
      if (isArrowLeft) {
        if (isExpanded === "true") {
          setExpanded({ ids: [highlightedItemId], value: !1 });
          return;
        }
        let parentId = highlightedElement.getAttribute("data-parent-id"), parentElement = parentId && getElementByDataItemId(parentId);
        if (parentElement && parentElement.getAttribute("data-highlightable") === "true") {
          highlightElement(parentElement);
          return;
        }
        setExpanded({ ids: getDescendantIds(data, highlightedItemId, !0), value: !1 });
        return;
      }
      isArrowRight && (isExpanded === "false" ? updateExpanded({ ids: [highlightedItemId], value: !0 }) : isExpanded === "true" && updateExpanded({ ids: getDescendantIds(data, highlightedItemId, !0), value: !0 }));
    }, 60);
    return document5.addEventListener("keydown", navigateTree), () => document5.removeEventListener("keydown", navigateTree);
  }, [
    containerRef,
    isBrowsing,
    refId,
    data,
    highlightedRef,
    setHighlightedItemId,
    onSelectStoryId
  ]), [expanded, updateExpanded];
};

// src/manager/components/sidebar/Tree.tsx
var CollapseButton = styled(Button)(({ theme }) => ({
  fontSize: `${theme.typography.size.s1 - 1}px`,
  fontWeight: theme.typography.weight.bold,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: theme.textMutedColor,
  padding: "0 8px"
})), LeafNodeStyleWrapper = styled.div(({ theme }) => ({
  position: "relative",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "flex-start",
  color: theme.color.defaultText,
  background: "transparent",
  minHeight: 28,
  borderRadius: 4,
  overflow: "hidden",
  "--tree-node-background-hover": theme.background.content,
  [MEDIA_DESKTOP_BREAKPOINT]: {
    "--tree-node-background-hover": theme.background.app
  },
  "&:hover, &:focus": {
    "--tree-node-background-hover": theme.background.hoverable,
    background: "var(--tree-node-background-hover)",
    outline: "none"
  },
  '& [data-displayed="off"]': {
    visibility: "hidden"
  },
  '&:hover [data-displayed="off"]': {
    visibility: "visible"
  },
  '& [data-displayed="on"] + *': {
    visibility: "hidden"
  },
  '&:hover [data-displayed="off"] + *': {
    visibility: "hidden"
  },
  '&[data-selected="true"]': {
    color: theme.color.lightest,
    background: theme.base === "dark" ? curriedDarken$1(0.18, theme.color.secondary) : theme.color.secondary,
    fontWeight: theme.typography.weight.bold,
    "&&:hover, &&:focus": {
      background: theme.base === "dark" ? curriedDarken$1(0.18, theme.color.secondary) : theme.color.secondary
    },
    svg: { color: theme.color.lightest }
  },
  a: { color: "currentColor" }
})), SkipToContentLink = styled(Button)(({ theme }) => ({
  display: "none",
  "@media (min-width: 600px)": {
    display: "block",
    fontSize: "10px",
    overflow: "hidden",
    width: 1,
    height: "20px",
    boxSizing: "border-box",
    opacity: 0,
    padding: 0,
    "&:focus": {
      opacity: 1,
      padding: "5px 10px",
      background: "white",
      color: theme.color.secondary,
      width: "auto"
    }
  }
})), SuccessStatusIcon = (props) => {
  let theme = useTheme();
  return react_default.createElement(StatusPassIcon, { ...props, color: theme.color.positive });
}, ErrorStatusIcon = (props) => {
  let theme = useTheme();
  return react_default.createElement(StatusFailIcon, { ...props, color: theme.color.negative });
}, WarnStatusIcon = (props) => {
  let theme = useTheme();
  return react_default.createElement(StatusWarnIcon, { ...props, color: theme.color.warning });
}, PendingStatusIcon = (props) => {
  let theme = useTheme();
  return react_default.createElement(SyncIcon, { ...props, size: 12, color: theme.color.defaultText });
}, StatusIconMap = {
  "status-value:success": react_default.createElement(SuccessStatusIcon, null),
  "status-value:error": react_default.createElement(ErrorStatusIcon, null),
  "status-value:warning": react_default.createElement(WarnStatusIcon, null),
  "status-value:pending": react_default.createElement(PendingStatusIcon, null),
  "status-value:unknown": null
};
var statusOrder = [
  "status-value:success",
  "status-value:error",
  "status-value:warning",
  "status-value:pending",
  "status-value:unknown"
], Node2 = react_default.memo(function(props) {
  let {
    item,
    statuses,
    groupStatus,
    refId,
    docsMode,
    isOrphan,
    isDisplayed,
    isSelected,
    isFullyExpanded,
    setFullyExpanded,
    isExpanded,
    setExpanded,
    onSelectStoryId,
    api
  } = props, theme = useTheme(), { isDesktop, isMobile: isMobile2, setMobileMenuOpen } = useLayout();
  if (!isDisplayed)
    return null;
  let statusLinks = useMemo(() => item.type === "story" || item.type === "docs" ? Object.entries(statuses).filter(([, status]) => status.sidebarContextMenu !== !1).sort((a2, b2) => statusOrder.indexOf(a2[1].value) - statusOrder.indexOf(b2[1].value)).map(([typeId, status]) => ({
    id: typeId,
    title: status.title,
    description: status.description,
    "aria-label": `Test status for ${status.title}: ${status.value}`,
    icon: StatusIconMap[status.value],
    onClick: () => {
      onSelectStoryId(item.id), internal_fullStatusStore.selectStatuses([status]);
    }
  })) : [], [item.id, item.type, onSelectStoryId, statuses]), id = createId(item.id, refId), contextMenu = refId === "storybook_internal" ? useContextMenu(item, statusLinks, api) : { node: null, onMouseEnter: () => {
  } };
  if (item.type === "story" && !("children" in item && item.children) && (!("subtype" in item) || item.subtype !== "test") || item.type === "docs") {
    let LeafNode3 = item.type === "docs" ? DocumentNode : StoryNode, statusValue = getMostCriticalStatusValue(
      Object.values(statuses || {}).map((s2) => s2.value)
    ), [icon, textColor] = getStatus(theme, statusValue);
    return react_default.createElement(
      LeafNodeStyleWrapper,
      {
        key: id,
        className: "sidebar-item",
        "data-selected": isSelected,
        "data-ref-id": refId,
        "data-item-id": item.id,
        "data-parent-id": item.parent,
        "data-nodetype": item.type === "docs" ? "document" : "story",
        "data-highlightable": isDisplayed,
        onMouseEnter: contextMenu.onMouseEnter
      },
      react_default.createElement(
        LeafNode3,
        {
          style: isSelected ? {} : { color: textColor },
          href: getLink(item, refId),
          id,
          depth: isOrphan ? item.depth : item.depth - 1,
          onClick: (event) => {
            event.preventDefault(), onSelectStoryId(item.id), isMobile2 && setMobileMenuOpen(!1);
          },
          ...item.type === "docs" && { docsMode }
        },
        item.renderLabel?.(item, api) || item.name
      ),
      isSelected && react_default.createElement(SkipToContentLink, { asChild: !0, ariaLabel: !1 }, react_default.createElement("a", { href: "#storybook-preview-wrapper" }, "Skip to canvas")),
      contextMenu.node,
      icon ? react_default.createElement(
        StatusButton,
        {
          ariaLabel: `Test status: ${statusValue.replace("status-value:", "")}`,
          "data-testid": "tree-status-button",
          type: "button",
          status: statusValue,
          selectedItem: isSelected
        },
        icon
      ) : null
    );
  }
  if (item.type === "root")
    return react_default.createElement(
      RootNode,
      {
        key: id,
        id,
        className: "sidebar-subheading",
        "data-ref-id": refId,
        "data-item-id": item.id,
        "data-nodetype": "root"
      },
      react_default.createElement(
        CollapseButton,
        {
          variant: "ghost",
          ariaLabel: isExpanded ? "Collapse" : "Expand",
          "data-action": "collapse-root",
          onClick: (event) => {
            event.preventDefault(), setExpanded({ ids: [item.id], value: !isExpanded });
          },
          "aria-expanded": isExpanded
        },
        react_default.createElement(CollapseIcon2, { isExpanded }),
        item.renderLabel?.(item, api) || item.name
      ),
      isExpanded && react_default.createElement(
        Button,
        {
          padding: "small",
          variant: "ghost",
          className: "sidebar-subheading-action",
          ariaLabel: isFullyExpanded ? "Collapse all" : "Expand all",
          "data-action": "expand-all",
          "data-expanded": isFullyExpanded,
          onClick: (event) => {
            event.preventDefault(), setFullyExpanded();
          }
        },
        isFullyExpanded ? react_default.createElement(CollapseIcon, null) : react_default.createElement(ExpandAltIcon, null)
      )
    );
  let itemStatus = getMostCriticalStatusValue(Object.values(statuses || {}).map((s2) => s2.value)), [itemIcon, itemColor] = getStatus(theme, itemStatus), itemStatusButton = itemIcon ? react_default.createElement(
    StatusButton,
    {
      ariaLabel: `Test status: ${itemStatus.replace("status-value:", "")}`,
      "data-testid": "tree-status-button",
      role: "status",
      type: "button",
      status: itemStatus,
      selectedItem: isSelected
    },
    itemIcon
  ) : null;
  if (item.type === "component" || item.type === "group" || item.type === "story" && "children" in item && item.children) {
    let { children = [] } = item, BranchNode2 = { component: ComponentNode, group: GroupNode, story: StoryNode }[item.type], status = getMostCriticalStatusValue([itemStatus, groupStatus?.[item.id]]), color2 = status ? getStatus(theme, status)[1] : null, showBranchStatus = status === "status-value:error" || status === "status-value:warning";
    return react_default.createElement(
      LeafNodeStyleWrapper,
      {
        key: id,
        className: "sidebar-item",
        "data-selected": isSelected,
        "data-ref-id": refId,
        "data-item-id": item.id,
        "data-parent-id": item.parent,
        "data-nodetype": item.type,
        "data-highlightable": isDisplayed,
        onMouseEnter: contextMenu.onMouseEnter
      },
      react_default.createElement(
        BranchNode2,
        {
          id,
          style: color2 && !isSelected ? { color: color2 } : {},
          "aria-controls": children.join(" "),
          "aria-expanded": isExpanded,
          depth: isOrphan ? item.depth : item.depth - 1,
          isExpandable: children.length > 0,
          isExpanded,
          onClick: (event) => {
            event.preventDefault(), item.type === "story" ? (onSelectStoryId(item.id), (!isExpanded || isSelected) && setExpanded({ ids: [item.id], value: !isExpanded })) : item.type === "component" ? (!isExpanded && isDesktop && onSelectStoryId(item.id), setExpanded({ ids: [item.id], value: !isExpanded })) : setExpanded({ ids: [item.id], value: !isExpanded });
          },
          onMouseEnter: () => {
            (item.type === "component" || item.type === "story") && api.emit(PRELOAD_ENTRIES, {
              ids: [children[0]],
              options: { target: refId }
            });
          }
        },
        item.renderLabel?.(item, api) || item.name
      ),
      isSelected && react_default.createElement(SkipToContentLink, { asChild: !0, ariaLabel: !1 }, react_default.createElement("a", { href: "#storybook-preview-wrapper" }, "Skip to canvas")),
      contextMenu.node,
      showBranchStatus ? react_default.createElement(
        StatusButton,
        {
          ariaLabel: `Test status: ${status.replace("status-value:", "")}`,
          "data-testid": "tree-status-button",
          type: "button",
          status,
          selectedItem: isSelected
        },
        react_default.createElement("svg", { key: "icon", viewBox: "0 0 6 6", width: "6", height: "6", type: "dot" }, react_default.createElement(UseSymbol, { type: "dot" }))
      ) : itemStatusButton
    );
  }
  let isTest = item.type === "story" && item.subtype === "test", LeafNode2 = isTest ? TestNode : { docs: DocumentNode, story: StoryNode }[item.type], nodeType = isTest ? "test" : { docs: "document", story: "story" }[item.type];
  return react_default.createElement(
    LeafNodeStyleWrapper,
    {
      key: id,
      className: "sidebar-item",
      "data-selected": isSelected,
      "data-ref-id": refId,
      "data-item-id": item.id,
      "data-parent-id": item.parent,
      "data-nodetype": nodeType,
      "data-highlightable": isDisplayed,
      onMouseEnter: contextMenu.onMouseEnter
    },
    react_default.createElement(
      LeafNode2,
      {
        style: itemColor && !isSelected ? { color: itemColor } : {},
        href: getLink(item, refId),
        id,
        depth: isOrphan ? item.depth : item.depth - 1,
        onClick: (event) => {
          event.preventDefault(), onSelectStoryId(item.id), isMobile2 && setMobileMenuOpen(!1);
        }
      },
      item.renderLabel?.(item, api) || item.name
    ),
    isSelected && react_default.createElement(SkipToContentLink, { ariaLabel: !1, asChild: !0 }, react_default.createElement("a", { href: "#storybook-preview-wrapper" }, "Skip to canvas")),
    contextMenu.node,
    itemStatusButton
  );
}), Root = react_default.memo(function({
  setExpanded,
  isFullyExpanded,
  expandableDescendants,
  ...props
}) {
  let setFullyExpanded = useCallback(
    () => setExpanded({ ids: expandableDescendants, value: !isFullyExpanded }),
    [setExpanded, isFullyExpanded, expandableDescendants]
  );
  return react_default.createElement(
    Node2,
    {
      ...props,
      setExpanded,
      isFullyExpanded,
      setFullyExpanded
    }
  );
}), Tree = react_default.memo(function({
  isBrowsing,
  refId,
  data,
  allStatuses,
  docsMode,
  highlightedRef,
  setHighlightedItemId,
  selectedStoryId,
  onSelectStoryId
}) {
  let containerRef = useRef(null), api = useStorybookApi(), [rootIds, orphanIds, initialExpanded] = useMemo(
    () => Object.keys(data).reduce(
      (acc, id) => {
        let item = data[id];
        return item.type === "root" ? acc[0].push(id) : item.parent || acc[1].push(id), item.type === "root" && item.startCollapsed && (acc[2][id] = !1), acc;
      },
      [[], [], {}]
    ),
    [data]
  ), { expandableDescendants } = useMemo(() => [...orphanIds, ...rootIds].reduce(
    (acc, nodeId) => (acc.expandableDescendants[nodeId] = getDescendantIds(data, nodeId, !1).filter(
      (d2) => !["story", "docs"].includes(data[d2].type)
    ), acc),
    { orphansFirst: [], expandableDescendants: {} }
  ), [data, rootIds, orphanIds]), singleStoryComponentIds = useMemo(() => Object.keys(data).filter((id) => {
    let entry = data[id];
    if (entry.type !== "component")
      return !1;
    let { children = [], name } = entry;
    if (children.length !== 1)
      return !1;
    let onlyChild = data[children[0]];
    return onlyChild.type === "docs" ? !0 : onlyChild.type === "story" && onlyChild.subtype === "story" ? isStoryHoistable(onlyChild.name, name) : !1;
  }), [data]), collapsedItems = useMemo(
    () => Object.keys(data).filter((id) => !singleStoryComponentIds.includes(id)),
    [data, singleStoryComponentIds]
  ), collapsedData = useMemo(() => singleStoryComponentIds.reduce(
    (acc, id) => {
      let { children, parent, name } = data[id], [childId] = children;
      if (parent) {
        let siblings = [...data[parent].children];
        siblings[siblings.indexOf(id)] = childId, acc[parent] = { ...data[parent], children: siblings };
      }
      return acc[childId] = {
        ...data[childId],
        name,
        parent,
        depth: data[childId].depth - 1
      }, acc;
    },
    { ...data }
  ), [data, singleStoryComponentIds]), ancestry = useMemo(() => collapsedItems.reduce(
    (acc, id) => Object.assign(acc, { [id]: getAncestorIds2(collapsedData, id) }),
    {}
  ), [collapsedItems, collapsedData]), [expanded, setExpanded] = useExpanded({
    // @ts-expect-error (non strict)
    containerRef,
    isBrowsing,
    refId,
    data: collapsedData,
    initialExpanded,
    rootIds,
    highlightedRef,
    setHighlightedItemId,
    selectedStoryId,
    onSelectStoryId
  }), groupStatus = useMemo(
    () => getGroupStatus(collapsedData, allStatuses ?? {}),
    [collapsedData, allStatuses]
  ), treeItems = useMemo(() => collapsedItems.map((itemId) => {
    let item = collapsedData[itemId], id = createId(itemId, refId);
    if (item.type === "root") {
      let descendants = expandableDescendants[item.id], isFullyExpanded = descendants.every((d2) => expanded[d2]);
      return (
        // @ts-expect-error (TODO)
        react_default.createElement(
          Root,
          {
            api,
            key: id,
            item,
            refId,
            collapsedData,
            isOrphan: !1,
            isDisplayed: !0,
            isSelected: selectedStoryId === itemId,
            isExpanded: !!expanded[itemId],
            setExpanded,
            isFullyExpanded,
            expandableDescendants: descendants,
            onSelectStoryId
          }
        )
      );
    }
    let isDisplayed = !item.parent || ancestry[itemId].every((a2) => expanded[a2]);
    return isDisplayed === !1 ? null : react_default.createElement(
      Node2,
      {
        api,
        collapsedData,
        key: id,
        item,
        statuses: allStatuses?.[itemId] ?? {},
        groupStatus,
        refId,
        docsMode,
        isOrphan: orphanIds.some((oid) => itemId === oid || itemId.startsWith(`${oid}-`)),
        isDisplayed,
        isSelected: selectedStoryId === itemId,
        isExpanded: !!expanded[itemId],
        setExpanded,
        onSelectStoryId
      }
    );
  }), [
    ancestry,
    api,
    collapsedData,
    collapsedItems,
    docsMode,
    expandableDescendants,
    expanded,
    groupStatus,
    onSelectStoryId,
    orphanIds,
    refId,
    selectedStoryId,
    setExpanded,
    allStatuses
  ]);
  return react_default.createElement(StatusContext.Provider, { value: { data, allStatuses, groupStatus } }, react_default.createElement("div", { ref: containerRef }, react_default.createElement(IconSymbols, null), treeItems));
});

// src/manager/components/sidebar/Refs.tsx
var Wrapper4 = styled.div(({ isMain }) => ({
  position: "relative",
  marginTop: isMain ? void 0 : 0
})), RefHead = styled.div(({ theme }) => ({
  fontWeight: theme.typography.weight.bold,
  fontSize: theme.typography.size.s2,
  // Similar to ListItem.tsx
  textDecoration: "none",
  lineHeight: "16px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  background: "transparent",
  width: "100%",
  marginTop: 20,
  paddingTop: 16,
  paddingBottom: 12,
  borderTop: `1px solid ${theme.appBorderColor}`,
  color: theme.color.defaultText
})), RefTitle = styled.div({
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  flex: 1,
  overflow: "hidden",
  marginLeft: 2
}), CollapseButton2 = styled.button(({ theme }) => ({
  all: "unset",
  display: "flex",
  padding: "0px 8px",
  gap: 6,
  alignItems: "center",
  cursor: "pointer",
  overflow: "hidden",
  "&:focus": {
    borderColor: theme.color.secondary,
    "span:first-of-type": {
      borderLeftColor: theme.color.secondary
    }
  }
})), Ref = react_default.memo(function(props) {
  let { docsOptions } = useStorybookState(), api = useStorybookApi(), {
    filteredIndex: index,
    id: refId,
    title: title2 = refId,
    isLoading: isLoadingMain,
    isBrowsing,
    hasEntries,
    selectedStoryId,
    highlightedRef,
    setHighlighted,
    loginUrl,
    type,
    expanded = !0,
    indexError,
    previewInitialized,
    allStatuses
  } = props, length = useMemo(() => index ? Object.keys(index).length : 0, [index]), indicatorRef = useRef(null), isMain = refId === DEFAULT_REF_ID, isLoading = isLoadingMain || (type === "auto-inject" && !previewInitialized || type === "server-checked") || type === "unknown", state = getStateType(isLoading, !!loginUrl && length === 0, !!indexError, !isLoading && length === 0), [isExpanded, setExpanded] = useState(expanded);
  useEffect(() => {
    index && selectedStoryId && index[selectedStoryId] && setExpanded(!0);
  }, [setExpanded, index, selectedStoryId]);
  let handleClick = useCallback(() => setExpanded((value) => !value), [setExpanded]), setHighlightedItemId = useCallback(
    (itemId) => setHighlighted({ itemId, refId }),
    [setHighlighted, refId]
  ), onSelectStoryId = useCallback(
    (storyId) => api?.selectStory(storyId, void 0, { ref: isMain ? void 0 : refId }),
    [api, isMain, refId]
  );
  return react_default.createElement(react_default.Fragment, null, isMain || react_default.createElement(
    RefHead,
    {
      "aria-label": `${isExpanded ? "Hide" : "Show"} ${title2} stories`,
      "aria-expanded": isExpanded
    },
    react_default.createElement(CollapseButton2, { "data-action": "collapse-ref", onClick: handleClick }, react_default.createElement(CollapseIcon2, { isExpanded }), react_default.createElement(RefTitle, { title: title2 }, title2)),
    react_default.createElement(RefIndicator, { ...props, state, ref: indicatorRef })
  ), isExpanded && react_default.createElement(Wrapper4, { "data-title": title2, isMain }, state === "auth" && react_default.createElement(AuthBlock, { id: refId, loginUrl }), state === "error" && react_default.createElement(ErrorBlock, { error: indexError }), state === "loading" && react_default.createElement(LoaderBlock, { isMain }), state === "empty" && react_default.createElement(EmptyBlock, { isMain, hasEntries }), state === "ready" && react_default.createElement(
    Tree,
    {
      allStatuses,
      isBrowsing,
      isMain,
      refId,
      data: index,
      docsMode: docsOptions.docsMode,
      selectedStoryId,
      onSelectStoryId,
      highlightedRef,
      setHighlightedItemId
    }
  )));
});

// src/manager/components/sidebar/useHighlighted.ts
var { document: document6, window: globalWindow4 } = scope, fromSelection = (selection) => selection ? { itemId: selection.storyId, refId: selection.refId } : null, scrollToSelector = (selector, options2 = {}, _attempt = 1) => {
  let { containerRef, center = !1, attempts = 3, delay: delay2 = 500 } = options2, element = (containerRef ? containerRef.current : document6)?.querySelector(selector);
  element ? scrollIntoView(element, center) : _attempt <= attempts && setTimeout(scrollToSelector, delay2, selector, options2, _attempt + 1);
}, useHighlighted = ({
  containerRef,
  isLoading,
  isBrowsing,
  selected
}) => {
  let initialHighlight = fromSelection(selected), highlightedRef = useRef(initialHighlight), [highlighted, setHighlighted] = useState(initialHighlight), api = useStorybookApi(), updateHighlighted = useCallback(
    (highlight) => {
      highlightedRef.current = highlight, setHighlighted(highlight);
    },
    [highlightedRef]
  ), highlightElement = useCallback(
    (element, center = !1) => {
      let itemId = element.getAttribute("data-item-id"), refId = element.getAttribute("data-ref-id");
      !itemId || !refId || (updateHighlighted({ itemId, refId }), scrollIntoView(element, center));
    },
    [updateHighlighted]
  );
  return useEffect(() => {
    let highlight = fromSelection(selected);
    updateHighlighted(highlight), highlight && scrollToSelector(`[data-item-id="${highlight.itemId}"][data-ref-id="${highlight.refId}"]`, {
      containerRef,
      center: !0
    });
  }, [containerRef, selected, updateHighlighted]), useEffect(() => {
    let menuElement = document6.getElementById("storybook-explorer-menu"), lastRequestId, navigateTree = (event) => {
      if (isLoading || !isBrowsing || !containerRef.current || !matchesModifiers(!1, event))
        return;
      let isArrowUp = matchesKeyCode("ArrowUp", event), isArrowDown = matchesKeyCode("ArrowDown", event);
      if (!(isArrowUp || isArrowDown))
        return;
      let requestId = globalWindow4.requestAnimationFrame(() => {
        globalWindow4.cancelAnimationFrame(lastRequestId), lastRequestId = requestId;
        let target = event.target;
        if (!isAncestor(menuElement, target) && !isAncestor(target, menuElement))
          return;
        target.hasAttribute("data-action") && target.blur();
        let highlightable = Array.from(
          containerRef.current?.querySelectorAll("[data-highlightable=true]") || []
        ), currentIndex = highlightable.findIndex(
          (el) => el.getAttribute("data-item-id") === highlightedRef.current?.itemId && el.getAttribute("data-ref-id") === highlightedRef.current?.refId
        ), nextIndex = cycle(highlightable, currentIndex, isArrowUp ? -1 : 1), didRunAround = isArrowUp ? nextIndex === highlightable.length - 1 : nextIndex === 0;
        if (highlightElement(highlightable[nextIndex], didRunAround), highlightable[nextIndex].getAttribute("data-nodetype") === "component") {
          let { itemId, refId } = highlightedRef.current, item = api.resolveStory(itemId, refId === "storybook_internal" ? void 0 : refId);
          item?.type === "component" && api.emit(PRELOAD_ENTRIES, {
            ids: [item.children[0]],
            options: { target: refId }
          });
        }
      });
    };
    return document6.addEventListener("keydown", navigateTree), () => document6.removeEventListener("keydown", navigateTree);
  }, [api, containerRef, isLoading, isBrowsing, highlightedRef, highlightElement]), [highlighted, updateHighlighted, highlightedRef];
};

// src/manager/components/sidebar/Explorer.tsx
var Explorer = react_default.memo(function({
  hasEntries,
  isLoading,
  isBrowsing,
  dataset,
  selected
}) {
  let containerRef = useRef(null), [highlighted, setHighlighted, highlightedRef] = useHighlighted({
    containerRef,
    isLoading,
    isBrowsing,
    selected
  });
  return react_default.createElement(
    "div",
    {
      ref: containerRef,
      id: "storybook-explorer-tree",
      "data-highlighted-ref-id": highlighted?.refId,
      "data-highlighted-item-id": highlighted?.itemId
    },
    highlighted && react_default.createElement(HighlightStyles, { ...highlighted }),
    dataset.entries.map(([refId, ref]) => react_default.createElement(
      Ref,
      {
        ...ref,
        key: refId,
        isLoading,
        isBrowsing,
        hasEntries,
        selectedStoryId: selected?.refId === ref.id ? selected.storyId : null,
        highlightedRef,
        setHighlighted
      }
    ))
  );
});

// src/manager/components/sidebar/Brand.tsx
var StorybookLogoStyled = styled(StorybookLogo)(({ theme }) => ({
  width: "auto",
  height: "22px !important",
  display: "block",
  color: theme.base === "light" ? theme.color.defaultText : theme.color.lightest
})), Img2 = styled.img({
  display: "block",
  maxWidth: "150px !important",
  maxHeight: "100px"
}), LogoLink = styled.a(({ theme }) => ({
  display: "inline-flex",
  alignItems: "center",
  height: "100%",
  margin: "-3px -4px",
  padding: "2px 3px",
  border: "1px solid transparent",
  borderRadius: 3,
  color: "inherit",
  textDecoration: "none",
  "&:focus-visible": {
    outline: `2px solid ${theme.color.secondary}`,
    outlineOffset: 2
  }
})), Brand = withTheme(({ theme }) => {
  let { title: title2 = "Storybook", url = "./", image, target } = theme.brand, targetValue = target || (url === "./" ? "" : "_blank");
  if (image === null)
    return title2 === null ? null : url ? react_default.createElement(LogoLink, { href: url, target: targetValue, dangerouslySetInnerHTML: { __html: title2 } }) : react_default.createElement("div", { dangerouslySetInnerHTML: { __html: title2 } });
  let logo = image ? react_default.createElement(Img2, { src: image, alt: title2 }) : react_default.createElement(StorybookLogoStyled, { alt: title2 });
  return url ? react_default.createElement(LogoLink, { title: title2, href: url, target: targetValue }, logo) : react_default.createElement("div", null, logo);
});

// src/manager/components/sidebar/Menu.tsx
var buttonStyleAdditions = ({
  highlighted,
  isMobile: isMobile2,
  theme
}) => css`
  position: relative;
  overflow: visible;
  margin-top: 0;
  z-index: 1;
  ${isMobile2 && `
    width: 36px;
    height: 36px;
  `}
  ${highlighted && `
    &:before,
    &:after {
      content: '';
      position: absolute;
      top: 6px;
      right: 6px;
      width: 5px;
      height: 5px;
      z-index: 2;
      border-radius: 50%;
      background: ${theme.background.app};
      border: 1px solid ${theme.background.app};
      box-shadow: 0 0 0 2px ${theme.background.app};
    }
    &:after {
      background: ${theme.color.positive};
      border: 1px solid rgba(0, 0, 0, 0.1);
      box-shadow: 0 0 0 2px ${theme.background.app};
    }
    &:hover:after,
    &:focus-visible:after {
      box-shadow: 0 0 0 2px ${curriedTransparentize$1(0.88, theme.color.secondary)};
    }
  `}
`, Container6 = styled.div({
  minWidth: 250
}), SidebarButton = styled(Button)(buttonStyleAdditions), SidebarToggleButton = styled(ToggleButton)(buttonStyleAdditions), MenuButtonGroup = styled.div({
  display: "flex",
  gap: 6
}), SidebarMenuList = ({ menu, onHide }) => react_default.createElement(Container6, null, menu.filter((links) => links.length).flatMap((links) => react_default.createElement(ActionList, { key: links.map((link) => link.id).join("_") }, links.map((link) => react_default.createElement(ActionList.Item, { key: link.id, active: link.active }, react_default.createElement(
  ActionList.Action,
  {
    ...link.href && { as: "a", href: link.href, target: "_blank" },
    ariaLabel: !1,
    id: `list-item-${link.id}`,
    disabled: link.disabled,
    onClick: (e2) => {
      if (link.disabled) {
        e2.preventDefault();
        return;
      }
      link.onClick?.(e2, {
        id: link.id,
        active: link.active,
        disabled: link.disabled,
        title: link.title,
        href: link.href
      }), link.closeOnClick && onHide();
    }
  },
  (link.icon || link.input) && react_default.createElement(ActionList.Icon, null, link.icon || link.input),
  (link.title || link.center) && react_default.createElement(ActionList.Text, null, link.title || link.center),
  link.right
)))))), SidebarMenu = ({ menu, isHighlighted, onClick }) => {
  let [isTooltipVisible, setIsTooltipVisible] = useState(!1), { isMobile: isMobile2, setMobileMenuOpen } = useLayout();
  return isMobile2 ? react_default.createElement(MenuButtonGroup, null, react_default.createElement(
    SidebarButton,
    {
      padding: "small",
      variant: "ghost",
      ariaLabel: "About Storybook",
      highlighted: !!isHighlighted,
      onClick,
      isMobile: !0
    },
    react_default.createElement(CogIcon, null)
  ), react_default.createElement(
    SidebarButton,
    {
      padding: "small",
      variant: "ghost",
      ariaLabel: "Close menu",
      highlighted: !1,
      onClick: () => setMobileMenuOpen(!1),
      isMobile: !0
    },
    react_default.createElement(CloseIcon, null)
  )) : react_default.createElement(
    PopoverProvider,
    {
      placement: "bottom-start",
      padding: 0,
      popover: ({ onHide }) => react_default.createElement(SidebarMenuList, { onHide, menu }),
      onVisibleChange: setIsTooltipVisible
    },
    react_default.createElement(
      SidebarToggleButton,
      {
        ariaLabel: "Settings",
        pressed: isTooltipVisible,
        highlighted: !!isHighlighted,
        padding: "small",
        variant: "ghost",
        size: "medium",
        isMobile: !1
      },
      react_default.createElement(CogIcon, null)
    )
  );
};

// src/manager/components/sidebar/Heading.tsx
var BrandArea = styled.div(({ theme }) => ({
  fontSize: theme.typography.size.s2,
  fontWeight: theme.typography.weight.bold,
  color: theme.color.defaultText,
  marginRight: 20,
  display: "flex",
  width: "100%",
  alignItems: "center",
  minHeight: 22,
  "& > * > *": {
    maxWidth: "100%"
  },
  "& > *": {
    maxWidth: "100%",
    height: "auto",
    display: "block",
    flex: "1 1 auto"
  }
})), HeadingWrapper = styled.div({
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  position: "relative",
  minHeight: 42,
  paddingLeft: 8
}), SkipToCanvasLink = styled(Button)(({ theme }) => ({
  display: "none",
  "@media (min-width: 600px)": {
    display: "block",
    position: "absolute",
    fontSize: theme.typography.size.s1,
    border: 0,
    width: 1,
    height: 1,
    padding: 0,
    margin: -1,
    overflow: "hidden",
    clip: "rect(0, 0, 0, 0)",
    whiteSpace: "nowrap",
    wordWrap: "normal",
    opacity: 0,
    transition: "opacity 150ms ease-out",
    "&:focus": {
      width: "100%",
      height: "inherit",
      padding: "10px 15px",
      margin: 0,
      clip: "unset",
      overflow: "unset",
      opacity: 1,
      zIndex: 3
    }
  }
})), Heading = ({
  menuHighlighted = !1,
  menu,
  skipLinkHref,
  isLoading,
  onMenuClick,
  ...props
}) => react_default.createElement(HeadingWrapper, { ...props }, skipLinkHref && react_default.createElement(SkipToCanvasLink, { ariaLabel: !1, asChild: !0 }, react_default.createElement("a", { href: skipLinkHref, tabIndex: 0 }, "Skip to canvas")), react_default.createElement(BrandArea, null, react_default.createElement(Brand, null)), react_default.createElement(SidebarMenu, { menu, isHighlighted: menuHighlighted, onClick: onMenuClick }));

// ../node_modules/@babel/runtime/helpers/esm/objectWithoutPropertiesLoose.js
function _objectWithoutPropertiesLoose2(r3, e2) {
  if (r3 == null) return {};
  var t2 = {};
  for (var n3 in r3) if ({}.hasOwnProperty.call(r3, n3)) {
    if (e2.indexOf(n3) !== -1) continue;
    t2[n3] = r3[n3];
  }
  return t2;
}

// ../node_modules/downshift/dist/downshift.esm.js
var import_prop_types3 = __toESM(require_prop_types());
var import_react_is = __toESM(require_react_is());

// ../node_modules/compute-scroll-into-view/dist/index.js
var t = (t2) => typeof t2 == "object" && t2 != null && t2.nodeType === 1, e = (t2, e2) => (!e2 || t2 !== "hidden") && t2 !== "visible" && t2 !== "clip", n2 = (t2, n3) => {
  if (t2.clientHeight < t2.scrollHeight || t2.clientWidth < t2.scrollWidth) {
    let o3 = getComputedStyle(t2, null);
    return e(o3.overflowY, n3) || e(o3.overflowX, n3) || ((t3) => {
      let e2 = ((t4) => {
        if (!t4.ownerDocument || !t4.ownerDocument.defaultView) return null;
        try {
          return t4.ownerDocument.defaultView.frameElement;
        } catch {
          return null;
        }
      })(t3);
      return !!e2 && (e2.clientHeight < t3.scrollHeight || e2.clientWidth < t3.scrollWidth);
    })(t2);
  }
  return !1;
}, o2 = (t2, e2, n3, o3, l3, r3, i2, s2) => r3 < t2 && i2 > e2 || r3 > t2 && i2 < e2 ? 0 : r3 <= t2 && s2 <= n3 || i2 >= e2 && s2 >= n3 ? r3 - t2 - o3 : i2 > e2 && s2 < n3 || r3 < t2 && s2 > n3 ? i2 - e2 + l3 : 0, l2 = (t2) => {
  let e2 = t2.parentElement;
  return e2 ?? (t2.getRootNode().host || null);
}, r2 = (e2, r3) => {
  var i2, s2, d2, h2;
  if (typeof document > "u") return [];
  let { scrollMode: c2, block: f2, inline: u2, boundary: a2, skipOverflowHiddenElements: g2 } = r3, p2 = typeof a2 == "function" ? a2 : (t2) => t2 !== a2;
  if (!t(e2)) throw new TypeError("Invalid target");
  let m2 = document.scrollingElement || document.documentElement, w2 = [], W2 = e2;
  for (; t(W2) && p2(W2); ) {
    if (W2 = l2(W2), W2 === m2) {
      w2.push(W2);
      break;
    }
    W2 != null && W2 === document.body && n2(W2) && !n2(document.documentElement) || W2 != null && n2(W2, g2) && w2.push(W2);
  }
  let b2 = (s2 = (i2 = window.visualViewport) == null ? void 0 : i2.width) != null ? s2 : innerWidth, H7 = (h2 = (d2 = window.visualViewport) == null ? void 0 : d2.height) != null ? h2 : innerHeight, { scrollX: y2, scrollY: M2 } = window, { height: v2, width: E2, top: x2, right: C2, bottom: I2, left: R2 } = e2.getBoundingClientRect(), { top: T3, right: B2, bottom: F2, left: V } = ((t2) => {
    let e3 = window.getComputedStyle(t2);
    return { top: parseFloat(e3.scrollMarginTop) || 0, right: parseFloat(e3.scrollMarginRight) || 0, bottom: parseFloat(e3.scrollMarginBottom) || 0, left: parseFloat(e3.scrollMarginLeft) || 0 };
  })(e2), k2 = f2 === "start" || f2 === "nearest" ? x2 - T3 : f2 === "end" ? I2 + F2 : x2 + v2 / 2 - T3 + F2, D2 = u2 === "center" ? R2 + E2 / 2 - V + B2 : u2 === "end" ? C2 + B2 : R2 - V, L3 = [];
  for (let t2 = 0; t2 < w2.length; t2++) {
    let e3 = w2[t2], { height: l3, width: r4, top: i3, right: s3, bottom: d3, left: h3 } = e3.getBoundingClientRect();
    if (c2 === "if-needed" && x2 >= 0 && R2 >= 0 && I2 <= H7 && C2 <= b2 && (e3 === m2 && !n2(e3) || x2 >= i3 && I2 <= d3 && R2 >= h3 && C2 <= s3)) return L3;
    let a3 = getComputedStyle(e3), g3 = parseInt(a3.borderLeftWidth, 10), p3 = parseInt(a3.borderTopWidth, 10), W3 = parseInt(a3.borderRightWidth, 10), T4 = parseInt(a3.borderBottomWidth, 10), B3 = 0, F3 = 0, V2 = "offsetWidth" in e3 ? e3.offsetWidth - e3.clientWidth - g3 - W3 : 0, S2 = "offsetHeight" in e3 ? e3.offsetHeight - e3.clientHeight - p3 - T4 : 0, X = "offsetWidth" in e3 ? e3.offsetWidth === 0 ? 0 : r4 / e3.offsetWidth : 0, Y2 = "offsetHeight" in e3 ? e3.offsetHeight === 0 ? 0 : l3 / e3.offsetHeight : 0;
    if (m2 === e3) B3 = f2 === "start" ? k2 : f2 === "end" ? k2 - H7 : f2 === "nearest" ? o2(M2, M2 + H7, H7, p3, T4, M2 + k2, M2 + k2 + v2, v2) : k2 - H7 / 2, F3 = u2 === "start" ? D2 : u2 === "center" ? D2 - b2 / 2 : u2 === "end" ? D2 - b2 : o2(y2, y2 + b2, b2, g3, W3, y2 + D2, y2 + D2 + E2, E2), B3 = Math.max(0, B3 + M2), F3 = Math.max(0, F3 + y2);
    else {
      B3 = f2 === "start" ? k2 - i3 - p3 : f2 === "end" ? k2 - d3 + T4 + S2 : f2 === "nearest" ? o2(i3, d3, l3, p3, T4 + S2, k2, k2 + v2, v2) : k2 - (i3 + l3 / 2) + S2 / 2, F3 = u2 === "start" ? D2 - h3 - g3 : u2 === "center" ? D2 - (h3 + r4 / 2) + V2 / 2 : u2 === "end" ? D2 - s3 + W3 + V2 : o2(h3, s3, r4, g3, W3 + V2, D2, D2 + E2, E2);
      let { scrollLeft: t3, scrollTop: n3 } = e3;
      B3 = Y2 === 0 ? 0 : Math.max(0, Math.min(n3 + B3 / Y2, e3.scrollHeight - l3 / Y2 + S2)), F3 = X === 0 ? 0 : Math.max(0, Math.min(t3 + F3 / X, e3.scrollWidth - r4 / X + V2)), k2 += n3 - B3, D2 += t3 - F3;
    }
    L3.push({ el: e3, top: B3, left: F3 });
  }
  return L3;
};

// ../node_modules/tslib/tslib.es6.mjs
var __assign = function() {
  return __assign = Object.assign || function(t2) {
    for (var s2, i2 = 1, n3 = arguments.length; i2 < n3; i2++) {
      s2 = arguments[i2];
      for (var p2 in s2) Object.prototype.hasOwnProperty.call(s2, p2) && (t2[p2] = s2[p2]);
    }
    return t2;
  }, __assign.apply(this, arguments);
};

// ../node_modules/downshift/dist/downshift.esm.js
var idCounter = 0;
function cbToCb(cb) {
  return typeof cb == "function" ? cb : noop4;
}
function noop4() {
}
function scrollIntoView2(node, menuNode) {
  if (node) {
    var actions = r2(node, {
      boundary: menuNode,
      block: "nearest",
      scrollMode: "if-needed"
    });
    actions.forEach(function(_ref) {
      var el = _ref.el, top = _ref.top, left = _ref.left;
      el.scrollTop = top, el.scrollLeft = left;
    });
  }
}
function isOrContainsNode(parent, child, environment) {
  var result = parent === child || child instanceof environment.Node && parent.contains && parent.contains(child);
  return result;
}
function debounce4(fn, time) {
  var timeoutId;
  function cancel() {
    timeoutId && clearTimeout(timeoutId);
  }
  function wrapper() {
    for (var _len = arguments.length, args = new Array(_len), _key = 0; _key < _len; _key++)
      args[_key] = arguments[_key];
    cancel(), timeoutId = setTimeout(function() {
      timeoutId = null, fn.apply(void 0, args);
    }, time);
  }
  return wrapper.cancel = cancel, wrapper;
}
function callAllEventHandlers() {
  for (var _len2 = arguments.length, fns = new Array(_len2), _key2 = 0; _key2 < _len2; _key2++)
    fns[_key2] = arguments[_key2];
  return function(event) {
    for (var _len3 = arguments.length, args = new Array(_len3 > 1 ? _len3 - 1 : 0), _key3 = 1; _key3 < _len3; _key3++)
      args[_key3 - 1] = arguments[_key3];
    return fns.some(function(fn) {
      return fn && fn.apply(void 0, [event].concat(args)), event.preventDownshiftDefault || event.hasOwnProperty("nativeEvent") && event.nativeEvent.preventDownshiftDefault;
    });
  };
}
function handleRefs() {
  for (var _len4 = arguments.length, refs = new Array(_len4), _key4 = 0; _key4 < _len4; _key4++)
    refs[_key4] = arguments[_key4];
  return function(node) {
    refs.forEach(function(ref) {
      typeof ref == "function" ? ref(node) : ref && (ref.current = node);
    });
  };
}
function generateId() {
  return String(idCounter++);
}
function getA11yStatusMessage(_ref2) {
  var isOpen = _ref2.isOpen, resultCount = _ref2.resultCount, previousResultCount = _ref2.previousResultCount;
  return isOpen ? resultCount ? resultCount !== previousResultCount ? resultCount + " result" + (resultCount === 1 ? " is" : "s are") + " available, use up and down arrow keys to navigate. Press Enter key to select." : "" : "No results are available." : "";
}
function unwrapArray(arg, defaultValue) {
  return arg = Array.isArray(arg) ? (
    /* istanbul ignore next (preact) */
    arg[0]
  ) : arg, !arg && defaultValue ? defaultValue : arg;
}
function isDOMElement(element) {
  return typeof element.type == "string";
}
function getElementProps(element) {
  return element.props;
}
var stateKeys = ["highlightedIndex", "inputValue", "isOpen", "selectedItem", "type"];
function pickState(state) {
  state === void 0 && (state = {});
  var result = {};
  return stateKeys.forEach(function(k2) {
    state.hasOwnProperty(k2) && (result[k2] = state[k2]);
  }), result;
}
function getState2(state, props) {
  return !state || !props ? state : Object.keys(state).reduce(function(prevState, key) {
    return prevState[key] = isControlledProp(props, key) ? props[key] : state[key], prevState;
  }, {});
}
function isControlledProp(props, key) {
  return props[key] !== void 0;
}
function normalizeArrowKey(event) {
  var key = event.key, keyCode = event.keyCode;
  return keyCode >= 37 && keyCode <= 40 && key.indexOf("Arrow") !== 0 ? "Arrow" + key : key;
}
function getHighlightedIndex(start, offset2, items, isItemDisabled2, circular) {
  circular === void 0 && (circular = !1);
  var count = items.length;
  if (count === 0)
    return -1;
  var itemsLastIndex = count - 1;
  (typeof start != "number" || start < 0 || start > itemsLastIndex) && (start = offset2 > 0 ? -1 : itemsLastIndex + 1);
  var current = start + offset2;
  current < 0 ? current = circular ? itemsLastIndex : 0 : current > itemsLastIndex && (current = circular ? 0 : itemsLastIndex);
  var highlightedIndex = getNonDisabledIndex(current, offset2 < 0, items, isItemDisabled2, circular);
  return highlightedIndex === -1 ? start >= count ? -1 : start : highlightedIndex;
}
function getNonDisabledIndex(start, backwards, items, isItemDisabled2, circular) {
  circular === void 0 && (circular = !1);
  var count = items.length;
  if (backwards) {
    for (var index = start; index >= 0; index--)
      if (!isItemDisabled2(items[index], index))
        return index;
  } else
    for (var _index = start; _index < count; _index++)
      if (!isItemDisabled2(items[_index], _index))
        return _index;
  return circular ? getNonDisabledIndex(backwards ? count - 1 : 0, backwards, items, isItemDisabled2) : -1;
}
function targetWithinDownshift(target, downshiftElements, environment, checkActiveElement) {
  return checkActiveElement === void 0 && (checkActiveElement = !0), environment && downshiftElements.some(function(contextNode) {
    return contextNode && (isOrContainsNode(contextNode, target, environment) || checkActiveElement && isOrContainsNode(contextNode, environment.document.activeElement, environment));
  });
}
var cleanupStatus = debounce4(function(documentProp) {
  getStatusDiv(documentProp).textContent = "";
}, 500);
function getStatusDiv(documentProp) {
  var statusDiv = documentProp.getElementById("a11y-status-message");
  return statusDiv || (statusDiv = documentProp.createElement("div"), statusDiv.setAttribute("id", "a11y-status-message"), statusDiv.setAttribute("role", "status"), statusDiv.setAttribute("aria-live", "polite"), statusDiv.setAttribute("aria-relevant", "additions text"), Object.assign(statusDiv.style, {
    border: "0",
    clip: "rect(0 0 0 0)",
    height: "1px",
    margin: "-1px",
    overflow: "hidden",
    padding: "0",
    position: "absolute",
    width: "1px"
  }), documentProp.body.appendChild(statusDiv), statusDiv);
}
function setStatus(status, documentProp) {
  if (!(!status || !documentProp)) {
    var div = getStatusDiv(documentProp);
    div.textContent = status, cleanupStatus(documentProp);
  }
}
function cleanupStatusDiv(documentProp) {
  var statusDiv = documentProp?.getElementById("a11y-status-message");
  statusDiv && statusDiv.remove();
}
var unknown = 0, mouseUp = 1, itemMouseEnter = 2, keyDownArrowUp = 3, keyDownArrowDown = 4, keyDownEscape = 5, keyDownEnter = 6, keyDownHome = 7, keyDownEnd = 8, clickItem = 9, blurInput = 10, changeInput = 11, keyDownSpaceButton = 12, clickButton = 13, blurButton = 14, controlledPropUpdatedSelectedItem = 15, touchEnd = 16, stateChangeTypes$3 = Object.freeze({
  __proto__: null,
  blurButton,
  blurInput,
  changeInput,
  clickButton,
  clickItem,
  controlledPropUpdatedSelectedItem,
  itemMouseEnter,
  keyDownArrowDown,
  keyDownArrowUp,
  keyDownEnd,
  keyDownEnter,
  keyDownEscape,
  keyDownHome,
  keyDownSpaceButton,
  mouseUp,
  touchEnd,
  unknown
}), _excluded$3 = ["refKey", "ref"], _excluded2$3 = ["onClick", "onPress", "onKeyDown", "onKeyUp", "onBlur"], _excluded3$2 = ["onKeyDown", "onBlur", "onChange", "onInput", "onChangeText"], _excluded4$2 = ["refKey", "ref"], _excluded5 = ["onMouseMove", "onMouseDown", "onClick", "onPress", "index", "item"], Downshift = (function() {
  var Downshift2 = (function(_Component) {
    function Downshift3(_props) {
      var _this;
      _this = _Component.call(this, _props) || this, _this.id = _this.props.id || "downshift-" + generateId(), _this.menuId = _this.props.menuId || _this.id + "-menu", _this.labelId = _this.props.labelId || _this.id + "-label", _this.inputId = _this.props.inputId || _this.id + "-input", _this.getItemId = _this.props.getItemId || function(index) {
        return _this.id + "-item-" + index;
      }, _this.items = [], _this.itemCount = null, _this.previousResultCount = 0, _this.timeoutIds = [], _this.internalSetTimeout = function(fn, time) {
        var id = setTimeout(function() {
          _this.timeoutIds = _this.timeoutIds.filter(function(i2) {
            return i2 !== id;
          }), fn();
        }, time);
        _this.timeoutIds.push(id);
      }, _this.setItemCount = function(count) {
        _this.itemCount = count;
      }, _this.unsetItemCount = function() {
        _this.itemCount = null;
      }, _this.isItemDisabled = function(_item, index) {
        var currentElementNode = _this.getItemNodeFromIndex(index);
        return currentElementNode && currentElementNode.hasAttribute("disabled");
      }, _this.setHighlightedIndex = function(highlightedIndex, otherStateToSet) {
        highlightedIndex === void 0 && (highlightedIndex = _this.props.defaultHighlightedIndex), otherStateToSet === void 0 && (otherStateToSet = {}), otherStateToSet = pickState(otherStateToSet), _this.internalSetState(_extends({
          highlightedIndex
        }, otherStateToSet));
      }, _this.clearSelection = function(cb) {
        _this.internalSetState({
          selectedItem: null,
          inputValue: "",
          highlightedIndex: _this.props.defaultHighlightedIndex,
          isOpen: _this.props.defaultIsOpen
        }, cb);
      }, _this.selectItem = function(item, otherStateToSet, cb) {
        otherStateToSet = pickState(otherStateToSet), _this.internalSetState(_extends({
          isOpen: _this.props.defaultIsOpen,
          highlightedIndex: _this.props.defaultHighlightedIndex,
          selectedItem: item,
          inputValue: _this.props.itemToString(item)
        }, otherStateToSet), cb);
      }, _this.selectItemAtIndex = function(itemIndex, otherStateToSet, cb) {
        var item = _this.items[itemIndex];
        item != null && _this.selectItem(item, otherStateToSet, cb);
      }, _this.selectHighlightedItem = function(otherStateToSet, cb) {
        return _this.selectItemAtIndex(_this.getState().highlightedIndex, otherStateToSet, cb);
      }, _this.internalSetState = function(stateToSet, cb) {
        var isItemSelected, onChangeArg, onStateChangeArg = {}, isStateToSetFunction = typeof stateToSet == "function";
        return !isStateToSetFunction && stateToSet.hasOwnProperty("inputValue") && _this.props.onInputValueChange(stateToSet.inputValue, _extends({}, _this.getStateAndHelpers(), stateToSet)), _this.setState(function(state) {
          var _newStateToSet;
          state = _this.getState(state);
          var newStateToSet = isStateToSetFunction ? stateToSet(state) : stateToSet;
          newStateToSet = _this.props.stateReducer(state, newStateToSet), isItemSelected = newStateToSet.hasOwnProperty("selectedItem");
          var nextState = {};
          return isItemSelected && newStateToSet.selectedItem !== state.selectedItem && (onChangeArg = newStateToSet.selectedItem), (_newStateToSet = newStateToSet).type || (_newStateToSet.type = unknown), Object.keys(newStateToSet).forEach(function(key) {
            state[key] !== newStateToSet[key] && (onStateChangeArg[key] = newStateToSet[key]), key !== "type" && (newStateToSet[key], isControlledProp(_this.props, key) || (nextState[key] = newStateToSet[key]));
          }), isStateToSetFunction && newStateToSet.hasOwnProperty("inputValue") && _this.props.onInputValueChange(newStateToSet.inputValue, _extends({}, _this.getStateAndHelpers(), newStateToSet)), nextState;
        }, function() {
          cbToCb(cb)();
          var hasMoreStateThanType = Object.keys(onStateChangeArg).length > 1;
          hasMoreStateThanType && _this.props.onStateChange(onStateChangeArg, _this.getStateAndHelpers()), isItemSelected && _this.props.onSelect(stateToSet.selectedItem, _this.getStateAndHelpers()), onChangeArg !== void 0 && _this.props.onChange(onChangeArg, _this.getStateAndHelpers()), _this.props.onUserAction(onStateChangeArg, _this.getStateAndHelpers());
        });
      }, _this.rootRef = function(node) {
        return _this._rootNode = node;
      }, _this.getRootProps = function(_temp, _temp2) {
        var _extends22, _ref = _temp === void 0 ? {} : _temp, _ref$refKey = _ref.refKey, refKey = _ref$refKey === void 0 ? "ref" : _ref$refKey, ref = _ref.ref, rest2 = _objectWithoutPropertiesLoose2(_ref, _excluded$3), _ref2 = _temp2 === void 0 ? {} : _temp2, _ref2$suppressRefErro = _ref2.suppressRefError, suppressRefError = _ref2$suppressRefErro === void 0 ? !1 : _ref2$suppressRefErro;
        _this.getRootProps.called = !0, _this.getRootProps.refKey = refKey, _this.getRootProps.suppressRefError = suppressRefError;
        var _this$getState = _this.getState(), isOpen = _this$getState.isOpen;
        return _extends((_extends22 = {}, _extends22[refKey] = handleRefs(ref, _this.rootRef), _extends22.role = "combobox", _extends22["aria-expanded"] = isOpen, _extends22["aria-haspopup"] = "listbox", _extends22["aria-owns"] = isOpen ? _this.menuId : void 0, _extends22["aria-labelledby"] = _this.labelId, _extends22), rest2);
      }, _this.keyDownHandlers = {
        ArrowDown: function(event) {
          var _this2 = this;
          if (event.preventDefault(), this.getState().isOpen) {
            var amount = event.shiftKey ? 5 : 1;
            this.moveHighlightedIndex(amount, {
              type: keyDownArrowDown
            });
          } else
            this.internalSetState({
              isOpen: !0,
              type: keyDownArrowDown
            }, function() {
              var itemCount = _this2.getItemCount();
              if (itemCount > 0) {
                var _this2$getState = _this2.getState(), highlightedIndex = _this2$getState.highlightedIndex, nextHighlightedIndex = getHighlightedIndex(highlightedIndex, 1, {
                  length: itemCount
                }, _this2.isItemDisabled, !0);
                _this2.setHighlightedIndex(nextHighlightedIndex, {
                  type: keyDownArrowDown
                });
              }
            });
        },
        ArrowUp: function(event) {
          var _this3 = this;
          if (event.preventDefault(), this.getState().isOpen) {
            var amount = event.shiftKey ? -5 : -1;
            this.moveHighlightedIndex(amount, {
              type: keyDownArrowUp
            });
          } else
            this.internalSetState({
              isOpen: !0,
              type: keyDownArrowUp
            }, function() {
              var itemCount = _this3.getItemCount();
              if (itemCount > 0) {
                var _this3$getState = _this3.getState(), highlightedIndex = _this3$getState.highlightedIndex, nextHighlightedIndex = getHighlightedIndex(highlightedIndex, -1, {
                  length: itemCount
                }, _this3.isItemDisabled, !0);
                _this3.setHighlightedIndex(nextHighlightedIndex, {
                  type: keyDownArrowUp
                });
              }
            });
        },
        Enter: function(event) {
          if (event.which !== 229) {
            var _this$getState2 = this.getState(), isOpen = _this$getState2.isOpen, highlightedIndex = _this$getState2.highlightedIndex;
            if (isOpen && highlightedIndex != null) {
              event.preventDefault();
              var item = this.items[highlightedIndex], itemNode = this.getItemNodeFromIndex(highlightedIndex);
              if (item == null || itemNode && itemNode.hasAttribute("disabled"))
                return;
              this.selectHighlightedItem({
                type: keyDownEnter
              });
            }
          }
        },
        Escape: function(event) {
          event.preventDefault(), this.reset(_extends({
            type: keyDownEscape
          }, !this.state.isOpen && {
            selectedItem: null,
            inputValue: ""
          }));
        }
      }, _this.buttonKeyDownHandlers = _extends({}, _this.keyDownHandlers, {
        " ": function(event) {
          event.preventDefault(), this.toggleMenu({
            type: keyDownSpaceButton
          });
        }
      }), _this.inputKeyDownHandlers = _extends({}, _this.keyDownHandlers, {
        Home: function(event) {
          var _this$getState3 = this.getState(), isOpen = _this$getState3.isOpen;
          if (isOpen) {
            event.preventDefault();
            var itemCount = this.getItemCount();
            if (!(itemCount <= 0 || !isOpen)) {
              var newHighlightedIndex = getNonDisabledIndex(0, !1, {
                length: itemCount
              }, this.isItemDisabled);
              this.setHighlightedIndex(newHighlightedIndex, {
                type: keyDownHome
              });
            }
          }
        },
        End: function(event) {
          var _this$getState4 = this.getState(), isOpen = _this$getState4.isOpen;
          if (isOpen) {
            event.preventDefault();
            var itemCount = this.getItemCount();
            if (!(itemCount <= 0 || !isOpen)) {
              var newHighlightedIndex = getNonDisabledIndex(itemCount - 1, !0, {
                length: itemCount
              }, this.isItemDisabled);
              this.setHighlightedIndex(newHighlightedIndex, {
                type: keyDownEnd
              });
            }
          }
        }
      }), _this.getToggleButtonProps = function(_temp3) {
        var _ref3 = _temp3 === void 0 ? {} : _temp3, onClick = _ref3.onClick;
        _ref3.onPress;
        var onKeyDown = _ref3.onKeyDown, onKeyUp = _ref3.onKeyUp, onBlur = _ref3.onBlur, rest2 = _objectWithoutPropertiesLoose2(_ref3, _excluded2$3), _this$getState5 = _this.getState(), isOpen = _this$getState5.isOpen, enabledEventHandlers = {
          onClick: callAllEventHandlers(onClick, _this.buttonHandleClick),
          onKeyDown: callAllEventHandlers(onKeyDown, _this.buttonHandleKeyDown),
          onKeyUp: callAllEventHandlers(onKeyUp, _this.buttonHandleKeyUp),
          onBlur: callAllEventHandlers(onBlur, _this.buttonHandleBlur)
        }, eventHandlers = rest2.disabled ? {} : enabledEventHandlers;
        return _extends({
          type: "button",
          role: "button",
          "aria-label": isOpen ? "close menu" : "open menu",
          "aria-haspopup": !0,
          "data-toggle": !0
        }, eventHandlers, rest2);
      }, _this.buttonHandleKeyUp = function(event) {
        event.preventDefault();
      }, _this.buttonHandleKeyDown = function(event) {
        var key = normalizeArrowKey(event);
        _this.buttonKeyDownHandlers[key] && _this.buttonKeyDownHandlers[key].call(_this, event);
      }, _this.buttonHandleClick = function(event) {
        if (event.preventDefault(), _this.props.environment) {
          var _this$props$environme = _this.props.environment.document, body = _this$props$environme.body, activeElement = _this$props$environme.activeElement;
          body && body === activeElement && event.target.focus();
        }
        _this.internalSetTimeout(function() {
          return _this.toggleMenu({
            type: clickButton
          });
        });
      }, _this.buttonHandleBlur = function(event) {
        var blurTarget = event.target;
        _this.internalSetTimeout(function() {
          if (!(_this.isMouseDown || !_this.props.environment)) {
            var activeElement = _this.props.environment.document.activeElement;
            (activeElement == null || activeElement.id !== _this.inputId) && activeElement !== blurTarget && _this.reset({
              type: blurButton
            });
          }
        });
      }, _this.getLabelProps = function(props) {
        return _extends({
          htmlFor: _this.inputId,
          id: _this.labelId
        }, props);
      }, _this.getInputProps = function(_temp4) {
        var _ref4 = _temp4 === void 0 ? {} : _temp4, onKeyDown = _ref4.onKeyDown, onBlur = _ref4.onBlur, onChange = _ref4.onChange, onInput = _ref4.onInput;
        _ref4.onChangeText;
        var rest2 = _objectWithoutPropertiesLoose2(_ref4, _excluded3$2), onChangeKey, eventHandlers = {};
        onChangeKey = "onChange";
        var _this$getState6 = _this.getState(), inputValue = _this$getState6.inputValue, isOpen = _this$getState6.isOpen, highlightedIndex = _this$getState6.highlightedIndex;
        if (!rest2.disabled) {
          var _eventHandlers;
          eventHandlers = (_eventHandlers = {}, _eventHandlers[onChangeKey] = callAllEventHandlers(onChange, onInput, _this.inputHandleChange), _eventHandlers.onKeyDown = callAllEventHandlers(onKeyDown, _this.inputHandleKeyDown), _eventHandlers.onBlur = callAllEventHandlers(onBlur, _this.inputHandleBlur), _eventHandlers);
        }
        return _extends({
          "aria-autocomplete": "list",
          "aria-activedescendant": isOpen && typeof highlightedIndex == "number" && highlightedIndex >= 0 ? _this.getItemId(highlightedIndex) : void 0,
          "aria-controls": isOpen ? _this.menuId : void 0,
          "aria-labelledby": rest2 && rest2["aria-label"] ? void 0 : _this.labelId,
          // https://developer.mozilla.org/en-US/docs/Web/Security/Securing_your_site/Turning_off_form_autocompletion
          // revert back since autocomplete="nope" is ignored on latest Chrome and Opera
          autoComplete: "off",
          value: inputValue,
          id: _this.inputId
        }, eventHandlers, rest2);
      }, _this.inputHandleKeyDown = function(event) {
        var key = normalizeArrowKey(event);
        key && _this.inputKeyDownHandlers[key] && _this.inputKeyDownHandlers[key].call(_this, event);
      }, _this.inputHandleChange = function(event) {
        _this.internalSetState({
          type: changeInput,
          isOpen: !0,
          inputValue: event.target.value,
          highlightedIndex: _this.props.defaultHighlightedIndex
        });
      }, _this.inputHandleBlur = function() {
        _this.internalSetTimeout(function() {
          var _activeElement$datase;
          if (!(_this.isMouseDown || !_this.props.environment)) {
            var activeElement = _this.props.environment.document.activeElement, downshiftButtonIsActive = (activeElement == null || (_activeElement$datase = activeElement.dataset) == null ? void 0 : _activeElement$datase.toggle) && _this._rootNode && _this._rootNode.contains(activeElement);
            downshiftButtonIsActive || _this.reset({
              type: blurInput
            });
          }
        });
      }, _this.menuRef = function(node) {
        _this._menuNode = node;
      }, _this.getMenuProps = function(_temp5, _temp6) {
        var _extends3, _ref5 = _temp5 === void 0 ? {} : _temp5, _ref5$refKey = _ref5.refKey, refKey = _ref5$refKey === void 0 ? "ref" : _ref5$refKey, ref = _ref5.ref, props = _objectWithoutPropertiesLoose2(_ref5, _excluded4$2), _ref6 = _temp6 === void 0 ? {} : _temp6, _ref6$suppressRefErro = _ref6.suppressRefError, suppressRefError = _ref6$suppressRefErro === void 0 ? !1 : _ref6$suppressRefErro;
        return _this.getMenuProps.called = !0, _this.getMenuProps.refKey = refKey, _this.getMenuProps.suppressRefError = suppressRefError, _extends((_extends3 = {}, _extends3[refKey] = handleRefs(ref, _this.menuRef), _extends3.role = "listbox", _extends3["aria-labelledby"] = props && props["aria-label"] ? void 0 : _this.labelId, _extends3.id = _this.menuId, _extends3), props);
      }, _this.getItemProps = function(_temp7) {
        var _enabledEventHandlers, _ref7 = _temp7 === void 0 ? {} : _temp7, onMouseMove = _ref7.onMouseMove, onMouseDown = _ref7.onMouseDown, onClick = _ref7.onClick;
        _ref7.onPress;
        var index = _ref7.index, _ref7$item = _ref7.item, item = _ref7$item === void 0 ? (
          /* istanbul ignore next */
          void 0
        ) : _ref7$item, rest2 = _objectWithoutPropertiesLoose2(_ref7, _excluded5);
        index === void 0 ? (_this.items.push(item), index = _this.items.indexOf(item)) : _this.items[index] = item;
        var onSelectKey = "onClick", customClickHandler = onClick, enabledEventHandlers = (_enabledEventHandlers = {
          // onMouseMove is used over onMouseEnter here. onMouseMove
          // is only triggered on actual mouse movement while onMouseEnter
          // can fire on DOM changes, interrupting keyboard navigation
          onMouseMove: callAllEventHandlers(onMouseMove, function() {
            index !== _this.getState().highlightedIndex && (_this.setHighlightedIndex(index, {
              type: itemMouseEnter
            }), _this.avoidScrolling = !0, _this.internalSetTimeout(function() {
              return _this.avoidScrolling = !1;
            }, 250));
          }),
          onMouseDown: callAllEventHandlers(onMouseDown, function(event) {
            event.preventDefault();
          })
        }, _enabledEventHandlers[onSelectKey] = callAllEventHandlers(customClickHandler, function() {
          _this.selectItemAtIndex(index, {
            type: clickItem
          });
        }), _enabledEventHandlers), eventHandlers = rest2.disabled ? {
          onMouseDown: enabledEventHandlers.onMouseDown
        } : enabledEventHandlers;
        return _extends({
          id: _this.getItemId(index),
          role: "option",
          "aria-selected": _this.getState().highlightedIndex === index
        }, eventHandlers, rest2);
      }, _this.clearItems = function() {
        _this.items = [];
      }, _this.reset = function(otherStateToSet, cb) {
        otherStateToSet === void 0 && (otherStateToSet = {}), otherStateToSet = pickState(otherStateToSet), _this.internalSetState(function(_ref8) {
          var selectedItem = _ref8.selectedItem;
          return _extends({
            isOpen: _this.props.defaultIsOpen,
            highlightedIndex: _this.props.defaultHighlightedIndex,
            inputValue: _this.props.itemToString(selectedItem)
          }, otherStateToSet);
        }, cb);
      }, _this.toggleMenu = function(otherStateToSet, cb) {
        otherStateToSet === void 0 && (otherStateToSet = {}), otherStateToSet = pickState(otherStateToSet), _this.internalSetState(function(_ref9) {
          var isOpen = _ref9.isOpen;
          return _extends({
            isOpen: !isOpen
          }, isOpen && {
            highlightedIndex: _this.props.defaultHighlightedIndex
          }, otherStateToSet);
        }, function() {
          var _this$getState7 = _this.getState(), isOpen = _this$getState7.isOpen, highlightedIndex = _this$getState7.highlightedIndex;
          isOpen && _this.getItemCount() > 0 && typeof highlightedIndex == "number" && _this.setHighlightedIndex(highlightedIndex, otherStateToSet), cbToCb(cb)();
        });
      }, _this.openMenu = function(cb) {
        _this.internalSetState({
          isOpen: !0
        }, cb);
      }, _this.closeMenu = function(cb) {
        _this.internalSetState({
          isOpen: !1
        }, cb);
      }, _this.updateStatus = debounce4(function() {
        var _this$props;
        if ((_this$props = _this.props) != null && (_this$props = _this$props.environment) != null && _this$props.document) {
          var state = _this.getState(), item = _this.items[state.highlightedIndex], resultCount = _this.getItemCount(), status = _this.props.getA11yStatusMessage(_extends({
            itemToString: _this.props.itemToString,
            previousResultCount: _this.previousResultCount,
            resultCount,
            highlightedItem: item
          }, state));
          _this.previousResultCount = resultCount, setStatus(status, _this.props.environment.document);
        }
      }, 200);
      var _this$props2 = _this.props, defaultHighlightedIndex = _this$props2.defaultHighlightedIndex, _this$props2$initialH = _this$props2.initialHighlightedIndex, _highlightedIndex = _this$props2$initialH === void 0 ? defaultHighlightedIndex : _this$props2$initialH, defaultIsOpen = _this$props2.defaultIsOpen, _this$props2$initialI = _this$props2.initialIsOpen, _isOpen = _this$props2$initialI === void 0 ? defaultIsOpen : _this$props2$initialI, _this$props2$initialI2 = _this$props2.initialInputValue, _inputValue = _this$props2$initialI2 === void 0 ? "" : _this$props2$initialI2, _this$props2$initialS = _this$props2.initialSelectedItem, _selectedItem = _this$props2$initialS === void 0 ? null : _this$props2$initialS, _state = _this.getState({
        highlightedIndex: _highlightedIndex,
        isOpen: _isOpen,
        inputValue: _inputValue,
        selectedItem: _selectedItem
      });
      return _state.selectedItem != null && _this.props.initialInputValue === void 0 && (_state.inputValue = _this.props.itemToString(_state.selectedItem)), _this.state = _state, _this;
    }
    _inheritsLoose(Downshift3, _Component);
    var _proto = Downshift3.prototype;
    return _proto.internalClearTimeouts = function() {
      this.timeoutIds.forEach(function(id) {
        clearTimeout(id);
      }), this.timeoutIds = [];
    }, _proto.getState = function(stateToMerge) {
      return stateToMerge === void 0 && (stateToMerge = this.state), getState2(stateToMerge, this.props);
    }, _proto.getItemCount = function() {
      var itemCount = this.items.length;
      return this.itemCount != null ? itemCount = this.itemCount : this.props.itemCount !== void 0 && (itemCount = this.props.itemCount), itemCount;
    }, _proto.getItemNodeFromIndex = function(index) {
      return this.props.environment ? this.props.environment.document.getElementById(this.getItemId(index)) : null;
    }, _proto.scrollHighlightedItemIntoView = function() {
      {
        var node = this.getItemNodeFromIndex(this.getState().highlightedIndex);
        this.props.scrollIntoView(node, this._menuNode);
      }
    }, _proto.moveHighlightedIndex = function(amount, otherStateToSet) {
      var itemCount = this.getItemCount(), _this$getState8 = this.getState(), highlightedIndex = _this$getState8.highlightedIndex;
      if (itemCount > 0) {
        var nextHighlightedIndex = getHighlightedIndex(highlightedIndex, amount, {
          length: itemCount
        }, this.isItemDisabled, !0);
        this.setHighlightedIndex(nextHighlightedIndex, otherStateToSet);
      }
    }, _proto.getStateAndHelpers = function() {
      var _this$getState9 = this.getState(), highlightedIndex = _this$getState9.highlightedIndex, inputValue = _this$getState9.inputValue, selectedItem = _this$getState9.selectedItem, isOpen = _this$getState9.isOpen, itemToString2 = this.props.itemToString, id = this.id, getRootProps = this.getRootProps, getToggleButtonProps = this.getToggleButtonProps, getLabelProps = this.getLabelProps, getMenuProps = this.getMenuProps, getInputProps = this.getInputProps, getItemProps = this.getItemProps, openMenu = this.openMenu, closeMenu = this.closeMenu, toggleMenu = this.toggleMenu, selectItem = this.selectItem, selectItemAtIndex = this.selectItemAtIndex, selectHighlightedItem = this.selectHighlightedItem, setHighlightedIndex = this.setHighlightedIndex, clearSelection = this.clearSelection, clearItems = this.clearItems, reset = this.reset, setItemCount = this.setItemCount, unsetItemCount = this.unsetItemCount, setState = this.internalSetState;
      return {
        // prop getters
        getRootProps,
        getToggleButtonProps,
        getLabelProps,
        getMenuProps,
        getInputProps,
        getItemProps,
        // actions
        reset,
        openMenu,
        closeMenu,
        toggleMenu,
        selectItem,
        selectItemAtIndex,
        selectHighlightedItem,
        setHighlightedIndex,
        clearSelection,
        clearItems,
        setItemCount,
        unsetItemCount,
        setState,
        // props
        itemToString: itemToString2,
        // derived
        id,
        // state
        highlightedIndex,
        inputValue,
        isOpen,
        selectedItem
      };
    }, _proto.componentDidMount = function() {
      var _this4 = this;
      if (!this.props.environment)
        this.cleanup = function() {
          _this4.internalClearTimeouts();
        };
      else {
        var onMouseDown = function() {
          _this4.isMouseDown = !0;
        }, onMouseUp = function(event) {
          _this4.isMouseDown = !1;
          var contextWithinDownshift = targetWithinDownshift(event.target, [_this4._rootNode, _this4._menuNode], _this4.props.environment);
          !contextWithinDownshift && _this4.getState().isOpen && _this4.reset({
            type: mouseUp
          }, function() {
            return _this4.props.onOuterClick(_this4.getStateAndHelpers());
          });
        }, onTouchStart = function() {
          _this4.isTouchMove = !1;
        }, onTouchMove = function() {
          _this4.isTouchMove = !0;
        }, onTouchEnd = function(event) {
          var contextWithinDownshift = targetWithinDownshift(event.target, [_this4._rootNode, _this4._menuNode], _this4.props.environment, !1);
          !_this4.isTouchMove && !contextWithinDownshift && _this4.getState().isOpen && _this4.reset({
            type: touchEnd
          }, function() {
            return _this4.props.onOuterClick(_this4.getStateAndHelpers());
          });
        }, environment = this.props.environment;
        environment.addEventListener("mousedown", onMouseDown), environment.addEventListener("mouseup", onMouseUp), environment.addEventListener("touchstart", onTouchStart), environment.addEventListener("touchmove", onTouchMove), environment.addEventListener("touchend", onTouchEnd), this.cleanup = function() {
          _this4.internalClearTimeouts(), _this4.updateStatus.cancel(), environment.removeEventListener("mousedown", onMouseDown), environment.removeEventListener("mouseup", onMouseUp), environment.removeEventListener("touchstart", onTouchStart), environment.removeEventListener("touchmove", onTouchMove), environment.removeEventListener("touchend", onTouchEnd);
        };
      }
    }, _proto.shouldScroll = function(prevState, prevProps) {
      var _ref0 = this.props.highlightedIndex === void 0 ? this.getState() : this.props, currentHighlightedIndex = _ref0.highlightedIndex, _ref1 = prevProps.highlightedIndex === void 0 ? prevState : prevProps, prevHighlightedIndex = _ref1.highlightedIndex, scrollWhenOpen = currentHighlightedIndex && this.getState().isOpen && !prevState.isOpen, scrollWhenNavigating = currentHighlightedIndex !== prevHighlightedIndex;
      return scrollWhenOpen || scrollWhenNavigating;
    }, _proto.componentDidUpdate = function(prevProps, prevState) {
      isControlledProp(this.props, "selectedItem") && this.props.selectedItemChanged(prevProps.selectedItem, this.props.selectedItem) && this.internalSetState({
        type: controlledPropUpdatedSelectedItem,
        inputValue: this.props.itemToString(this.props.selectedItem)
      }), !this.avoidScrolling && this.shouldScroll(prevState, prevProps) && this.scrollHighlightedItemIntoView(), this.updateStatus();
    }, _proto.componentWillUnmount = function() {
      this.cleanup();
    }, _proto.render = function() {
      var children = unwrapArray(this.props.children, noop4);
      this.clearItems(), this.getRootProps.called = !1, this.getRootProps.refKey = void 0, this.getRootProps.suppressRefError = void 0, this.getMenuProps.called = !1, this.getMenuProps.refKey = void 0, this.getMenuProps.suppressRefError = void 0, this.getLabelProps.called = !1, this.getInputProps.called = !1;
      var element = unwrapArray(children(this.getStateAndHelpers()));
      if (!element)
        return null;
      if (this.getRootProps.called || this.props.suppressRefError)
        return element;
      if (isDOMElement(element))
        return cloneElement(element, this.getRootProps(getElementProps(element)));
    }, Downshift3;
  })(Component);
  return Downshift2.defaultProps = {
    defaultHighlightedIndex: null,
    defaultIsOpen: !1,
    getA11yStatusMessage,
    itemToString: function(i2) {
      return i2 == null ? "" : String(i2);
    },
    onStateChange: noop4,
    onInputValueChange: noop4,
    onUserAction: noop4,
    onChange: noop4,
    onSelect: noop4,
    onOuterClick: noop4,
    selectedItemChanged: function(prevItem, item) {
      return prevItem !== item;
    },
    environment: (
      /* istanbul ignore next (ssr) */
      typeof window > "u" ? void 0 : window
    ),
    stateReducer: function(state, stateToSet) {
      return stateToSet;
    },
    suppressRefError: !1,
    scrollIntoView: scrollIntoView2
  }, Downshift2.stateChangeTypes = stateChangeTypes$3, Downshift2;
})();
var dropdownDefaultStateValues = {
  highlightedIndex: -1,
  isOpen: !1,
  selectedItem: null,
  inputValue: ""
};
function callOnChangeProps(action, state, newState) {
  var props = action.props, type = action.type, changes = {};
  Object.keys(state).forEach(function(key) {
    invokeOnChangeHandler(key, action, state, newState), newState[key] !== state[key] && (changes[key] = newState[key]);
  }), props.onStateChange && Object.keys(changes).length && props.onStateChange(_extends({
    type
  }, changes));
}
function invokeOnChangeHandler(key, action, state, newState) {
  var props = action.props, type = action.type, handler = "on" + capitalizeString(key) + "Change";
  props[handler] && newState[key] !== void 0 && newState[key] !== state[key] && props[handler](_extends({
    type
  }, newState));
}
function stateReducer(s2, a2) {
  return a2.changes;
}
var updateA11yStatus = debounce4(function(status, document11) {
  setStatus(status, document11);
}, 200), useIsomorphicLayoutEffect2 = typeof window < "u" && typeof window.document < "u" && typeof window.document.createElement < "u" ? useLayoutEffect : useEffect, useElementIds = "useId" in react_default ? function(_ref) {
  var id = _ref.id, labelId = _ref.labelId, menuId = _ref.menuId, getItemId = _ref.getItemId, toggleButtonId = _ref.toggleButtonId, inputId = _ref.inputId, reactId = "downshift-" + react_default.useId();
  id || (id = reactId);
  var elementIdsRef = useRef({
    labelId: labelId || id + "-label",
    menuId: menuId || id + "-menu",
    getItemId: getItemId || function(index) {
      return id + "-item-" + index;
    },
    toggleButtonId: toggleButtonId || id + "-toggle-button",
    inputId: inputId || id + "-input"
  });
  return elementIdsRef.current;
} : function(_ref2) {
  var _ref2$id = _ref2.id, id = _ref2$id === void 0 ? "downshift-" + generateId() : _ref2$id, labelId = _ref2.labelId, menuId = _ref2.menuId, getItemId = _ref2.getItemId, toggleButtonId = _ref2.toggleButtonId, inputId = _ref2.inputId, elementIdsRef = useRef({
    labelId: labelId || id + "-label",
    menuId: menuId || id + "-menu",
    getItemId: getItemId || function(index) {
      return id + "-item-" + index;
    },
    toggleButtonId: toggleButtonId || id + "-toggle-button",
    inputId: inputId || id + "-input"
  });
  return elementIdsRef.current;
};
function getItemAndIndex(itemProp, indexProp, items, errorMessage) {
  var item, index;
  if (itemProp === void 0) {
    if (indexProp === void 0)
      throw new Error(errorMessage);
    item = items[indexProp], index = indexProp;
  } else
    index = indexProp === void 0 ? items.indexOf(itemProp) : indexProp, item = itemProp;
  return [item, index];
}
function isAcceptedCharacterKey(key) {
  return /^\S{1}$/.test(key);
}
function capitalizeString(string) {
  return "" + string.slice(0, 1).toUpperCase() + string.slice(1);
}
function useLatestRef(val) {
  var ref = useRef(val);
  return ref.current = val, ref;
}
function useEnhancedReducer(reducer, props, createInitialState, isStateEqual2) {
  var prevStateRef = useRef(), actionRef = useRef(), enhancedReducer = useCallback(function(state2, action2) {
    actionRef.current = action2, state2 = getState2(state2, action2.props);
    var changes = reducer(state2, action2), newState = action2.props.stateReducer(state2, _extends({}, action2, {
      changes
    }));
    return newState;
  }, [reducer]), _useReducer = useReducer(enhancedReducer, props, createInitialState), state = _useReducer[0], dispatch = _useReducer[1], propsRef = useLatestRef(props), dispatchWithProps = useCallback(function(action2) {
    return dispatch(_extends({
      props: propsRef.current
    }, action2));
  }, [propsRef]), action = actionRef.current;
  return useEffect(function() {
    var prevState = getState2(prevStateRef.current, action?.props), shouldCallOnChangeProps = action && prevStateRef.current && !isStateEqual2(prevState, state);
    shouldCallOnChangeProps && callOnChangeProps(action, prevState, state), prevStateRef.current = state;
  }, [state, action, isStateEqual2]), [state, dispatchWithProps];
}
function useControlledReducer$1(reducer, props, createInitialState, isStateEqual2) {
  var _useEnhancedReducer = useEnhancedReducer(reducer, props, createInitialState, isStateEqual2), state = _useEnhancedReducer[0], dispatch = _useEnhancedReducer[1];
  return [getState2(state, props), dispatch];
}
var defaultProps$3 = {
  itemToString: function(item) {
    return item ? String(item) : "";
  },
  itemToKey: function(item) {
    return item;
  },
  stateReducer,
  scrollIntoView: scrollIntoView2,
  environment: (
    /* istanbul ignore next (ssr) */
    typeof window > "u" ? void 0 : window
  )
};
function getDefaultValue$1(props, propKey, defaultStateValues2) {
  defaultStateValues2 === void 0 && (defaultStateValues2 = dropdownDefaultStateValues);
  var defaultValue = props["default" + capitalizeString(propKey)];
  return defaultValue !== void 0 ? defaultValue : defaultStateValues2[propKey];
}
function getInitialValue$1(props, propKey, defaultStateValues2) {
  defaultStateValues2 === void 0 && (defaultStateValues2 = dropdownDefaultStateValues);
  var value = props[propKey];
  if (value !== void 0)
    return value;
  var initialValue = props["initial" + capitalizeString(propKey)];
  return initialValue !== void 0 ? initialValue : getDefaultValue$1(props, propKey, defaultStateValues2);
}
function getInitialState$2(props) {
  var selectedItem = getInitialValue$1(props, "selectedItem"), isOpen = getInitialValue$1(props, "isOpen"), highlightedIndex = getInitialHighlightedIndex(props), inputValue = getInitialValue$1(props, "inputValue");
  return {
    highlightedIndex: highlightedIndex < 0 && selectedItem && isOpen ? props.items.findIndex(function(item) {
      return props.itemToKey(item) === props.itemToKey(selectedItem);
    }) : highlightedIndex,
    isOpen,
    selectedItem,
    inputValue
  };
}
function getHighlightedIndexOnOpen(props, state, offset2) {
  var items = props.items, initialHighlightedIndex = props.initialHighlightedIndex, defaultHighlightedIndex = props.defaultHighlightedIndex, isItemDisabled2 = props.isItemDisabled, itemToKey2 = props.itemToKey, selectedItem = state.selectedItem, highlightedIndex = state.highlightedIndex;
  return items.length === 0 ? -1 : initialHighlightedIndex !== void 0 && highlightedIndex === initialHighlightedIndex && !isItemDisabled2(items[initialHighlightedIndex], initialHighlightedIndex) ? initialHighlightedIndex : defaultHighlightedIndex !== void 0 && !isItemDisabled2(items[defaultHighlightedIndex], defaultHighlightedIndex) ? defaultHighlightedIndex : selectedItem ? items.findIndex(function(item) {
    return itemToKey2(selectedItem) === itemToKey2(item);
  }) : offset2 < 0 && !isItemDisabled2(items[items.length - 1], items.length - 1) ? items.length - 1 : offset2 > 0 && !isItemDisabled2(items[0], 0) ? 0 : -1;
}
function useMouseAndTouchTracker(environment, handleBlur, downshiftElementsRefs) {
  var mouseAndTouchTrackersRef = useRef({
    isMouseDown: !1,
    isTouchMove: !1,
    isTouchEnd: !1
  });
  return useEffect(function() {
    if (!environment)
      return noop4;
    var downshiftElements = downshiftElementsRefs.map(function(ref) {
      return ref.current;
    });
    function onMouseDown() {
      mouseAndTouchTrackersRef.current.isTouchEnd = !1, mouseAndTouchTrackersRef.current.isMouseDown = !0;
    }
    function onMouseUp(event) {
      mouseAndTouchTrackersRef.current.isMouseDown = !1, targetWithinDownshift(event.target, downshiftElements, environment) || handleBlur();
    }
    function onTouchStart() {
      mouseAndTouchTrackersRef.current.isTouchEnd = !1, mouseAndTouchTrackersRef.current.isTouchMove = !1;
    }
    function onTouchMove() {
      mouseAndTouchTrackersRef.current.isTouchMove = !0;
    }
    function onTouchEnd(event) {
      mouseAndTouchTrackersRef.current.isTouchEnd = !0, !mouseAndTouchTrackersRef.current.isTouchMove && !targetWithinDownshift(event.target, downshiftElements, environment, !1) && handleBlur();
    }
    return environment.addEventListener("mousedown", onMouseDown), environment.addEventListener("mouseup", onMouseUp), environment.addEventListener("touchstart", onTouchStart), environment.addEventListener("touchmove", onTouchMove), environment.addEventListener("touchend", onTouchEnd), function() {
      environment.removeEventListener("mousedown", onMouseDown), environment.removeEventListener("mouseup", onMouseUp), environment.removeEventListener("touchstart", onTouchStart), environment.removeEventListener("touchmove", onTouchMove), environment.removeEventListener("touchend", onTouchEnd);
    };
  }, [downshiftElementsRefs, environment, handleBlur]), mouseAndTouchTrackersRef.current;
}
var useGetterPropsCalledChecker = function() {
  return noop4;
};
function useA11yMessageStatus(getA11yStatusMessage2, options2, dependencyArray, environment) {
  environment === void 0 && (environment = {});
  var document11 = environment.document, isInitialMount = useIsInitialMount();
  useEffect(function() {
    if (!(!getA11yStatusMessage2 || isInitialMount || !document11)) {
      var status = getA11yStatusMessage2(options2);
      updateA11yStatus(status, document11);
    }
  }, dependencyArray), useEffect(function() {
    return function() {
      updateA11yStatus.cancel(), cleanupStatusDiv(document11);
    };
  }, [document11]);
}
function useScrollIntoView(_ref3) {
  var highlightedIndex = _ref3.highlightedIndex, isOpen = _ref3.isOpen, itemRefs = _ref3.itemRefs, getItemNodeFromIndex = _ref3.getItemNodeFromIndex, menuElement = _ref3.menuElement, scrollIntoViewProp = _ref3.scrollIntoView, shouldScrollRef = useRef(!0);
  return useIsomorphicLayoutEffect2(function() {
    highlightedIndex < 0 || !isOpen || !Object.keys(itemRefs.current).length || (shouldScrollRef.current === !1 ? shouldScrollRef.current = !0 : scrollIntoViewProp(getItemNodeFromIndex(highlightedIndex), menuElement));
  }, [highlightedIndex]), shouldScrollRef;
}
var useControlPropsValidator = noop4;
function getChangesOnSelection(props, highlightedIndex, inputValue) {
  var _props$items;
  inputValue === void 0 && (inputValue = !0);
  var shouldSelect = ((_props$items = props.items) == null ? void 0 : _props$items.length) && highlightedIndex >= 0;
  return _extends({
    isOpen: !1,
    highlightedIndex: -1
  }, shouldSelect && _extends({
    selectedItem: props.items[highlightedIndex],
    isOpen: getDefaultValue$1(props, "isOpen"),
    highlightedIndex: getDefaultValue$1(props, "highlightedIndex")
  }, inputValue && {
    inputValue: props.itemToString(props.items[highlightedIndex])
  }));
}
function isDropdownsStateEqual(prevState, newState) {
  return prevState.isOpen === newState.isOpen && prevState.inputValue === newState.inputValue && prevState.highlightedIndex === newState.highlightedIndex && prevState.selectedItem === newState.selectedItem;
}
function useIsInitialMount() {
  var isInitialMountRef = react_default.useRef(!0);
  return react_default.useEffect(function() {
    return isInitialMountRef.current = !1, function() {
      isInitialMountRef.current = !0;
    };
  }, []), isInitialMountRef.current;
}
function getDefaultHighlightedIndex(props) {
  var highlightedIndex = getDefaultValue$1(props, "highlightedIndex");
  return highlightedIndex > -1 && props.isItemDisabled(props.items[highlightedIndex], highlightedIndex) ? -1 : highlightedIndex;
}
function getInitialHighlightedIndex(props) {
  var highlightedIndex = getInitialValue$1(props, "highlightedIndex");
  return highlightedIndex > -1 && props.isItemDisabled(props.items[highlightedIndex], highlightedIndex) ? -1 : highlightedIndex;
}
var commonPropTypes = {
  environment: import_prop_types3.default.shape({
    addEventListener: import_prop_types3.default.func.isRequired,
    removeEventListener: import_prop_types3.default.func.isRequired,
    document: import_prop_types3.default.shape({
      createElement: import_prop_types3.default.func.isRequired,
      getElementById: import_prop_types3.default.func.isRequired,
      activeElement: import_prop_types3.default.any.isRequired,
      body: import_prop_types3.default.any.isRequired
    }).isRequired,
    Node: import_prop_types3.default.func.isRequired
  }),
  itemToString: import_prop_types3.default.func,
  itemToKey: import_prop_types3.default.func,
  stateReducer: import_prop_types3.default.func
}, commonDropdownPropTypes = _extends({}, commonPropTypes, {
  getA11yStatusMessage: import_prop_types3.default.func,
  highlightedIndex: import_prop_types3.default.number,
  defaultHighlightedIndex: import_prop_types3.default.number,
  initialHighlightedIndex: import_prop_types3.default.number,
  isOpen: import_prop_types3.default.bool,
  defaultIsOpen: import_prop_types3.default.bool,
  initialIsOpen: import_prop_types3.default.bool,
  selectedItem: import_prop_types3.default.any,
  initialSelectedItem: import_prop_types3.default.any,
  defaultSelectedItem: import_prop_types3.default.any,
  id: import_prop_types3.default.string,
  labelId: import_prop_types3.default.string,
  menuId: import_prop_types3.default.string,
  getItemId: import_prop_types3.default.func,
  toggleButtonId: import_prop_types3.default.string,
  onSelectedItemChange: import_prop_types3.default.func,
  onHighlightedIndexChange: import_prop_types3.default.func,
  onStateChange: import_prop_types3.default.func,
  onIsOpenChange: import_prop_types3.default.func,
  scrollIntoView: import_prop_types3.default.func
});
function downshiftCommonReducer(state, action, stateChangeTypes2) {
  var type = action.type, props = action.props, changes;
  switch (type) {
    case stateChangeTypes2.ItemMouseMove:
      changes = {
        highlightedIndex: action.disabled ? -1 : action.index
      };
      break;
    case stateChangeTypes2.MenuMouseLeave:
      changes = {
        highlightedIndex: -1
      };
      break;
    case stateChangeTypes2.ToggleButtonClick:
    case stateChangeTypes2.FunctionToggleMenu:
      changes = {
        isOpen: !state.isOpen,
        highlightedIndex: state.isOpen ? -1 : getHighlightedIndexOnOpen(props, state, 0)
      };
      break;
    case stateChangeTypes2.FunctionOpenMenu:
      changes = {
        isOpen: !0,
        highlightedIndex: getHighlightedIndexOnOpen(props, state, 0)
      };
      break;
    case stateChangeTypes2.FunctionCloseMenu:
      changes = {
        isOpen: !1
      };
      break;
    case stateChangeTypes2.FunctionSetHighlightedIndex:
      changes = {
        highlightedIndex: props.isItemDisabled(props.items[action.highlightedIndex], action.highlightedIndex) ? -1 : action.highlightedIndex
      };
      break;
    case stateChangeTypes2.FunctionSetInputValue:
      changes = {
        inputValue: action.inputValue
      };
      break;
    case stateChangeTypes2.FunctionReset:
      changes = {
        highlightedIndex: getDefaultHighlightedIndex(props),
        isOpen: getDefaultValue$1(props, "isOpen"),
        selectedItem: getDefaultValue$1(props, "selectedItem"),
        inputValue: getDefaultValue$1(props, "inputValue")
      };
      break;
    default:
      throw new Error("Reducer called without proper action type.");
  }
  return _extends({}, state, changes);
}
function getItemIndexByCharacterKey(_a) {
  for (var keysSoFar = _a.keysSoFar, highlightedIndex = _a.highlightedIndex, items = _a.items, itemToString2 = _a.itemToString, isItemDisabled2 = _a.isItemDisabled, lowerCasedKeysSoFar = keysSoFar.toLowerCase(), index = 0; index < items.length; index++) {
    var offsetIndex = (index + highlightedIndex + (keysSoFar.length < 2 ? 1 : 0)) % items.length, item = items[offsetIndex];
    if (item !== void 0 && itemToString2(item).toLowerCase().startsWith(lowerCasedKeysSoFar) && !isItemDisabled2(item, offsetIndex))
      return offsetIndex;
  }
  return highlightedIndex;
}
var propTypes$2 = __assign(__assign({}, commonDropdownPropTypes), { items: import_prop_types3.default.array.isRequired, isItemDisabled: import_prop_types3.default.func }), defaultProps$2 = __assign(__assign({}, defaultProps$3), { isItemDisabled: function() {
  return !1;
} }), validatePropTypes$2 = noop4, ToggleButtonClick$1 = 0, ToggleButtonKeyDownArrowDown = 1, ToggleButtonKeyDownArrowUp = 2, ToggleButtonKeyDownCharacter = 3, ToggleButtonKeyDownEscape = 4, ToggleButtonKeyDownHome = 5, ToggleButtonKeyDownEnd = 6, ToggleButtonKeyDownEnter = 7, ToggleButtonKeyDownSpaceButton = 8, ToggleButtonKeyDownPageUp = 9, ToggleButtonKeyDownPageDown = 10, ToggleButtonBlur = 11, MenuMouseLeave$1 = 12, ItemMouseMove$1 = 13, ItemClick$1 = 14, FunctionToggleMenu$1 = 15, FunctionOpenMenu$1 = 16, FunctionCloseMenu$1 = 17, FunctionSetHighlightedIndex$1 = 18, FunctionSelectItem$1 = 19, FunctionSetInputValue$1 = 20, FunctionReset$2 = 21, stateChangeTypes$2 = Object.freeze({
  __proto__: null,
  FunctionCloseMenu: FunctionCloseMenu$1,
  FunctionOpenMenu: FunctionOpenMenu$1,
  FunctionReset: FunctionReset$2,
  FunctionSelectItem: FunctionSelectItem$1,
  FunctionSetHighlightedIndex: FunctionSetHighlightedIndex$1,
  FunctionSetInputValue: FunctionSetInputValue$1,
  FunctionToggleMenu: FunctionToggleMenu$1,
  ItemClick: ItemClick$1,
  ItemMouseMove: ItemMouseMove$1,
  MenuMouseLeave: MenuMouseLeave$1,
  ToggleButtonBlur,
  ToggleButtonClick: ToggleButtonClick$1,
  ToggleButtonKeyDownArrowDown,
  ToggleButtonKeyDownArrowUp,
  ToggleButtonKeyDownCharacter,
  ToggleButtonKeyDownEnd,
  ToggleButtonKeyDownEnter,
  ToggleButtonKeyDownEscape,
  ToggleButtonKeyDownHome,
  ToggleButtonKeyDownPageDown,
  ToggleButtonKeyDownPageUp,
  ToggleButtonKeyDownSpaceButton
});
function downshiftSelectReducer(state, action) {
  var _props$items, type = action.type, props = action.props, altKey = action.altKey, changes;
  switch (type) {
    case ItemClick$1:
      changes = {
        isOpen: getDefaultValue$1(props, "isOpen"),
        highlightedIndex: getDefaultHighlightedIndex(props),
        selectedItem: props.items[action.index]
      };
      break;
    case ToggleButtonKeyDownCharacter:
      {
        var lowercasedKey = action.key, inputValue = "" + state.inputValue + lowercasedKey, prevHighlightedIndex = !state.isOpen && state.selectedItem ? props.items.findIndex(function(item) {
          return props.itemToKey(item) === props.itemToKey(state.selectedItem);
        }) : state.highlightedIndex, highlightedIndex = getItemIndexByCharacterKey({
          keysSoFar: inputValue,
          highlightedIndex: prevHighlightedIndex,
          items: props.items,
          itemToString: props.itemToString,
          isItemDisabled: props.isItemDisabled
        });
        changes = {
          inputValue,
          highlightedIndex,
          isOpen: !0
        };
      }
      break;
    case ToggleButtonKeyDownArrowDown:
      {
        var _highlightedIndex = state.isOpen ? getHighlightedIndex(state.highlightedIndex, 1, props.items, props.isItemDisabled) : altKey && state.selectedItem == null ? -1 : getHighlightedIndexOnOpen(props, state, 1);
        changes = {
          highlightedIndex: _highlightedIndex,
          isOpen: !0
        };
      }
      break;
    case ToggleButtonKeyDownArrowUp:
      if (state.isOpen && altKey)
        changes = getChangesOnSelection(props, state.highlightedIndex, !1);
      else {
        var _highlightedIndex2 = state.isOpen ? getHighlightedIndex(state.highlightedIndex, -1, props.items, props.isItemDisabled) : getHighlightedIndexOnOpen(props, state, -1);
        changes = {
          highlightedIndex: _highlightedIndex2,
          isOpen: !0
        };
      }
      break;
    // only triggered when menu is open.
    case ToggleButtonKeyDownEnter:
    case ToggleButtonKeyDownSpaceButton:
      changes = getChangesOnSelection(props, state.highlightedIndex, !1);
      break;
    case ToggleButtonKeyDownHome:
      changes = {
        highlightedIndex: getNonDisabledIndex(0, !1, props.items, props.isItemDisabled),
        isOpen: !0
      };
      break;
    case ToggleButtonKeyDownEnd:
      changes = {
        highlightedIndex: getNonDisabledIndex(props.items.length - 1, !0, props.items, props.isItemDisabled),
        isOpen: !0
      };
      break;
    case ToggleButtonKeyDownPageUp:
      changes = {
        highlightedIndex: getHighlightedIndex(state.highlightedIndex, -10, props.items, props.isItemDisabled)
      };
      break;
    case ToggleButtonKeyDownPageDown:
      changes = {
        highlightedIndex: getHighlightedIndex(state.highlightedIndex, 10, props.items, props.isItemDisabled)
      };
      break;
    case ToggleButtonKeyDownEscape:
      changes = {
        isOpen: !1,
        highlightedIndex: -1
      };
      break;
    case ToggleButtonBlur:
      changes = _extends({
        isOpen: !1,
        highlightedIndex: -1
      }, state.highlightedIndex >= 0 && ((_props$items = props.items) == null ? void 0 : _props$items.length) && {
        selectedItem: props.items[state.highlightedIndex]
      });
      break;
    case FunctionSelectItem$1:
      changes = {
        selectedItem: action.selectedItem
      };
      break;
    default:
      return downshiftCommonReducer(state, action, stateChangeTypes$2);
  }
  return _extends({}, state, changes);
}
var _excluded$2 = ["onClick"], _excluded2$2 = ["onMouseLeave", "refKey", "ref"], _excluded3$1 = ["onBlur", "onClick", "onPress", "onKeyDown", "refKey", "ref"], _excluded4$1 = ["item", "index", "onMouseMove", "onClick", "onMouseDown", "onPress", "refKey", "disabled", "ref"];
useSelect.stateChangeTypes = stateChangeTypes$2;
function useSelect(userProps) {
  userProps === void 0 && (userProps = {}), validatePropTypes$2(userProps, useSelect);
  var props = _extends({}, defaultProps$2, userProps), scrollIntoView3 = props.scrollIntoView, environment = props.environment, getA11yStatusMessage2 = props.getA11yStatusMessage, _useControlledReducer = useControlledReducer$1(downshiftSelectReducer, props, getInitialState$2, isDropdownsStateEqual), state = _useControlledReducer[0], dispatch = _useControlledReducer[1], isOpen = state.isOpen, highlightedIndex = state.highlightedIndex, selectedItem = state.selectedItem, inputValue = state.inputValue, toggleButtonRef = useRef(null), menuRef = useRef(null), itemRefs = useRef({}), clearTimeoutRef = useRef(null), elementIds = useElementIds(props), latest = useLatestRef({
    state,
    props
  }), getItemNodeFromIndex = useCallback(function(index) {
    return itemRefs.current[elementIds.getItemId(index)];
  }, [elementIds]);
  useA11yMessageStatus(getA11yStatusMessage2, state, [isOpen, highlightedIndex, selectedItem, inputValue], environment);
  var shouldScrollRef = useScrollIntoView({
    menuElement: menuRef.current,
    highlightedIndex,
    isOpen,
    itemRefs,
    scrollIntoView: scrollIntoView3,
    getItemNodeFromIndex
  });
  useEffect(function() {
    return clearTimeoutRef.current = debounce4(function(outerDispatch) {
      outerDispatch({
        type: FunctionSetInputValue$1,
        inputValue: ""
      });
    }, 500), function() {
      clearTimeoutRef.current.cancel();
    };
  }, []), useEffect(function() {
    inputValue && clearTimeoutRef.current(dispatch);
  }, [dispatch, inputValue]), useControlPropsValidator({
    props,
    state
  }), useEffect(function() {
    var focusOnOpen = getInitialValue$1(props, "isOpen");
    focusOnOpen && toggleButtonRef.current && toggleButtonRef.current.focus();
  }, []);
  var mouseAndTouchTrackers = useMouseAndTouchTracker(environment, useCallback(function() {
    latest.current.state.isOpen && dispatch({
      type: ToggleButtonBlur
    });
  }, [dispatch, latest]), useMemo(function() {
    return [menuRef, toggleButtonRef];
  }, [menuRef.current, toggleButtonRef.current])), setGetterPropCallInfo = useGetterPropsCalledChecker("getMenuProps", "getToggleButtonProps");
  useEffect(function() {
    isOpen || (itemRefs.current = {});
  }, [isOpen]);
  var toggleButtonKeyDownHandlers = useMemo(function() {
    return {
      ArrowDown: function(event) {
        event.preventDefault(), dispatch({
          type: ToggleButtonKeyDownArrowDown,
          altKey: event.altKey
        });
      },
      ArrowUp: function(event) {
        event.preventDefault(), dispatch({
          type: ToggleButtonKeyDownArrowUp,
          altKey: event.altKey
        });
      },
      Home: function(event) {
        event.preventDefault(), dispatch({
          type: ToggleButtonKeyDownHome
        });
      },
      End: function(event) {
        event.preventDefault(), dispatch({
          type: ToggleButtonKeyDownEnd
        });
      },
      Escape: function() {
        latest.current.state.isOpen && dispatch({
          type: ToggleButtonKeyDownEscape
        });
      },
      Enter: function(event) {
        event.preventDefault(), dispatch({
          type: latest.current.state.isOpen ? ToggleButtonKeyDownEnter : ToggleButtonClick$1
        });
      },
      PageUp: function(event) {
        latest.current.state.isOpen && (event.preventDefault(), dispatch({
          type: ToggleButtonKeyDownPageUp
        }));
      },
      PageDown: function(event) {
        latest.current.state.isOpen && (event.preventDefault(), dispatch({
          type: ToggleButtonKeyDownPageDown
        }));
      },
      " ": function(event) {
        event.preventDefault();
        var currentState = latest.current.state;
        if (!currentState.isOpen) {
          dispatch({
            type: ToggleButtonClick$1
          });
          return;
        }
        currentState.inputValue ? dispatch({
          type: ToggleButtonKeyDownCharacter,
          key: " "
        }) : dispatch({
          type: ToggleButtonKeyDownSpaceButton
        });
      }
    };
  }, [dispatch, latest]), toggleMenu = useCallback(function() {
    dispatch({
      type: FunctionToggleMenu$1
    });
  }, [dispatch]), closeMenu = useCallback(function() {
    dispatch({
      type: FunctionCloseMenu$1
    });
  }, [dispatch]), openMenu = useCallback(function() {
    dispatch({
      type: FunctionOpenMenu$1
    });
  }, [dispatch]), setHighlightedIndex = useCallback(function(newHighlightedIndex) {
    dispatch({
      type: FunctionSetHighlightedIndex$1,
      highlightedIndex: newHighlightedIndex
    });
  }, [dispatch]), selectItem = useCallback(function(newSelectedItem) {
    dispatch({
      type: FunctionSelectItem$1,
      selectedItem: newSelectedItem
    });
  }, [dispatch]), reset = useCallback(function() {
    dispatch({
      type: FunctionReset$2
    });
  }, [dispatch]), setInputValue = useCallback(function(newInputValue) {
    dispatch({
      type: FunctionSetInputValue$1,
      inputValue: newInputValue
    });
  }, [dispatch]), getLabelProps = useCallback(function(_temp) {
    var _ref = _temp === void 0 ? {} : _temp, onClick = _ref.onClick, labelProps = _objectWithoutPropertiesLoose2(_ref, _excluded$2), labelHandleClick = function() {
      var _toggleButtonRef$curr;
      (_toggleButtonRef$curr = toggleButtonRef.current) == null || _toggleButtonRef$curr.focus();
    };
    return _extends({
      id: elementIds.labelId,
      htmlFor: elementIds.toggleButtonId,
      onClick: callAllEventHandlers(onClick, labelHandleClick)
    }, labelProps);
  }, [elementIds]), getMenuProps = useCallback(function(_temp2, _temp3) {
    var _extends22, _ref2 = _temp2 === void 0 ? {} : _temp2, onMouseLeave = _ref2.onMouseLeave, _ref2$refKey = _ref2.refKey, refKey = _ref2$refKey === void 0 ? "ref" : _ref2$refKey, ref = _ref2.ref, rest2 = _objectWithoutPropertiesLoose2(_ref2, _excluded2$2), _ref3 = _temp3 === void 0 ? {} : _temp3, _ref3$suppressRefErro = _ref3.suppressRefError, suppressRefError = _ref3$suppressRefErro === void 0 ? !1 : _ref3$suppressRefErro, menuHandleMouseLeave = function() {
      dispatch({
        type: MenuMouseLeave$1
      });
    };
    return setGetterPropCallInfo("getMenuProps", suppressRefError, refKey, menuRef), _extends((_extends22 = {}, _extends22[refKey] = handleRefs(ref, function(menuNode) {
      menuRef.current = menuNode;
    }), _extends22.id = elementIds.menuId, _extends22.role = "listbox", _extends22["aria-labelledby"] = rest2 && rest2["aria-label"] ? void 0 : "" + elementIds.labelId, _extends22.onMouseLeave = callAllEventHandlers(onMouseLeave, menuHandleMouseLeave), _extends22), rest2);
  }, [dispatch, setGetterPropCallInfo, elementIds]), getToggleButtonProps = useCallback(function(_temp4, _temp5) {
    var _extends3, _ref4 = _temp4 === void 0 ? {} : _temp4, onBlur = _ref4.onBlur, onClick = _ref4.onClick;
    _ref4.onPress;
    var onKeyDown = _ref4.onKeyDown, _ref4$refKey = _ref4.refKey, refKey = _ref4$refKey === void 0 ? "ref" : _ref4$refKey, ref = _ref4.ref, rest2 = _objectWithoutPropertiesLoose2(_ref4, _excluded3$1), _ref5 = _temp5 === void 0 ? {} : _temp5, _ref5$suppressRefErro = _ref5.suppressRefError, suppressRefError = _ref5$suppressRefErro === void 0 ? !1 : _ref5$suppressRefErro, latestState = latest.current.state, toggleButtonHandleClick = function() {
      dispatch({
        type: ToggleButtonClick$1
      });
    }, toggleButtonHandleBlur = function() {
      latestState.isOpen && !mouseAndTouchTrackers.isMouseDown && dispatch({
        type: ToggleButtonBlur
      });
    }, toggleButtonHandleKeyDown = function(event) {
      var key = normalizeArrowKey(event);
      key && toggleButtonKeyDownHandlers[key] ? toggleButtonKeyDownHandlers[key](event) : isAcceptedCharacterKey(key) && dispatch({
        type: ToggleButtonKeyDownCharacter,
        key
      });
    }, toggleProps = _extends((_extends3 = {}, _extends3[refKey] = handleRefs(ref, function(toggleButtonNode) {
      toggleButtonRef.current = toggleButtonNode;
    }), _extends3["aria-activedescendant"] = latestState.isOpen && latestState.highlightedIndex > -1 ? elementIds.getItemId(latestState.highlightedIndex) : "", _extends3["aria-controls"] = elementIds.menuId, _extends3["aria-expanded"] = latest.current.state.isOpen, _extends3["aria-haspopup"] = "listbox", _extends3["aria-labelledby"] = rest2 && rest2["aria-label"] ? void 0 : "" + elementIds.labelId, _extends3.id = elementIds.toggleButtonId, _extends3.role = "combobox", _extends3.tabIndex = 0, _extends3.onBlur = callAllEventHandlers(onBlur, toggleButtonHandleBlur), _extends3), rest2);
    return rest2.disabled || (toggleProps.onClick = callAllEventHandlers(onClick, toggleButtonHandleClick), toggleProps.onKeyDown = callAllEventHandlers(onKeyDown, toggleButtonHandleKeyDown)), setGetterPropCallInfo("getToggleButtonProps", suppressRefError, refKey, toggleButtonRef), toggleProps;
  }, [dispatch, elementIds, latest, mouseAndTouchTrackers, setGetterPropCallInfo, toggleButtonKeyDownHandlers]), getItemProps = useCallback(function(_temp6) {
    var _extends4, _ref6 = _temp6 === void 0 ? {} : _temp6, itemProp = _ref6.item, indexProp = _ref6.index, onMouseMove = _ref6.onMouseMove, onClick = _ref6.onClick, onMouseDown = _ref6.onMouseDown;
    _ref6.onPress;
    var _ref6$refKey = _ref6.refKey, refKey = _ref6$refKey === void 0 ? "ref" : _ref6$refKey, disabledProp = _ref6.disabled, ref = _ref6.ref, rest2 = _objectWithoutPropertiesLoose2(_ref6, _excluded4$1);
    disabledProp !== void 0 && console.warn('Passing "disabled" as an argument to getItemProps is not supported anymore. Please use the isItemDisabled prop from useSelect.');
    var _latest$current = latest.current, latestState = _latest$current.state, latestProps = _latest$current.props, _getItemAndIndex = getItemAndIndex(itemProp, indexProp, latestProps.items, "Pass either item or index to getItemProps!"), item = _getItemAndIndex[0], index = _getItemAndIndex[1], disabled = latestProps.isItemDisabled(item, index), itemHandleMouseMove = function() {
      mouseAndTouchTrackers.isTouchEnd || index === latestState.highlightedIndex || (shouldScrollRef.current = !1, dispatch({
        type: ItemMouseMove$1,
        index,
        disabled
      }));
    }, itemHandleClick = function() {
      dispatch({
        type: ItemClick$1,
        index
      });
    }, itemHandleMouseDown = function(e2) {
      return e2.preventDefault();
    }, itemProps = _extends((_extends4 = {}, _extends4[refKey] = handleRefs(ref, function(itemNode) {
      itemNode && (itemRefs.current[elementIds.getItemId(index)] = itemNode);
    }), _extends4["aria-disabled"] = disabled, _extends4["aria-selected"] = item === latestState.selectedItem, _extends4.id = elementIds.getItemId(index), _extends4.role = "option", _extends4), rest2);
    return disabled || (itemProps.onClick = callAllEventHandlers(onClick, itemHandleClick)), itemProps.onMouseMove = callAllEventHandlers(onMouseMove, itemHandleMouseMove), itemProps.onMouseDown = callAllEventHandlers(onMouseDown, itemHandleMouseDown), itemProps;
  }, [latest, elementIds, mouseAndTouchTrackers, shouldScrollRef, dispatch]);
  return {
    // prop getters.
    getToggleButtonProps,
    getLabelProps,
    getMenuProps,
    getItemProps,
    // actions.
    toggleMenu,
    openMenu,
    closeMenu,
    setHighlightedIndex,
    selectItem,
    reset,
    setInputValue,
    // state.
    highlightedIndex,
    isOpen,
    selectedItem,
    inputValue
  };
}
var InputKeyDownArrowDown = 0, InputKeyDownArrowUp = 1, InputKeyDownEscape = 2, InputKeyDownHome = 3, InputKeyDownEnd = 4, InputKeyDownPageUp = 5, InputKeyDownPageDown = 6, InputKeyDownEnter = 7, InputChange = 8, InputBlur = 9, InputClick = 10, MenuMouseLeave = 11, ItemMouseMove = 12, ItemClick = 13, ToggleButtonClick = 14, FunctionToggleMenu = 15, FunctionOpenMenu = 16, FunctionCloseMenu = 17, FunctionSetHighlightedIndex = 18, FunctionSelectItem = 19, FunctionSetInputValue = 20, FunctionReset$1 = 21, ControlledPropUpdatedSelectedItem = 22, stateChangeTypes$1 = Object.freeze({
  __proto__: null,
  ControlledPropUpdatedSelectedItem,
  FunctionCloseMenu,
  FunctionOpenMenu,
  FunctionReset: FunctionReset$1,
  FunctionSelectItem,
  FunctionSetHighlightedIndex,
  FunctionSetInputValue,
  FunctionToggleMenu,
  InputBlur,
  InputChange,
  InputClick,
  InputKeyDownArrowDown,
  InputKeyDownArrowUp,
  InputKeyDownEnd,
  InputKeyDownEnter,
  InputKeyDownEscape,
  InputKeyDownHome,
  InputKeyDownPageDown,
  InputKeyDownPageUp,
  ItemClick,
  ItemMouseMove,
  MenuMouseLeave,
  ToggleButtonClick
});
function getInitialState$1(props) {
  var initialState = getInitialState$2(props), selectedItem = initialState.selectedItem, inputValue = initialState.inputValue;
  return inputValue === "" && selectedItem && props.defaultInputValue === void 0 && props.initialInputValue === void 0 && props.inputValue === void 0 && (inputValue = props.itemToString(selectedItem)), _extends({}, initialState, {
    inputValue
  });
}
var propTypes$1 = _extends({}, commonDropdownPropTypes, {
  items: import_prop_types3.default.array.isRequired,
  isItemDisabled: import_prop_types3.default.func,
  inputValue: import_prop_types3.default.string,
  defaultInputValue: import_prop_types3.default.string,
  initialInputValue: import_prop_types3.default.string,
  inputId: import_prop_types3.default.string,
  onInputValueChange: import_prop_types3.default.func
});
function useControlledReducer(reducer, props, createInitialState, isStateEqual2) {
  var previousSelectedItemRef = useRef(), _useEnhancedReducer = useEnhancedReducer(reducer, props, createInitialState, isStateEqual2), state = _useEnhancedReducer[0], dispatch = _useEnhancedReducer[1], isInitialMount = useIsInitialMount();
  return useEffect(function() {
    if (isControlledProp(props, "selectedItem")) {
      if (!isInitialMount) {
        var shouldCallDispatch = props.itemToKey(props.selectedItem) !== props.itemToKey(previousSelectedItemRef.current);
        shouldCallDispatch && dispatch({
          type: ControlledPropUpdatedSelectedItem,
          inputValue: props.itemToString(props.selectedItem)
        });
      }
      previousSelectedItemRef.current = state.selectedItem === previousSelectedItemRef.current ? props.selectedItem : state.selectedItem;
    }
  }, [state.selectedItem, props.selectedItem]), [getState2(state, props), dispatch];
}
var validatePropTypes$1 = noop4, defaultProps$1 = _extends({}, defaultProps$3, {
  isItemDisabled: function() {
    return !1;
  }
});
function downshiftUseComboboxReducer(state, action) {
  var _props$items, type = action.type, props = action.props, altKey = action.altKey, changes;
  switch (type) {
    case ItemClick:
      changes = {
        isOpen: getDefaultValue$1(props, "isOpen"),
        highlightedIndex: getDefaultHighlightedIndex(props),
        selectedItem: props.items[action.index],
        inputValue: props.itemToString(props.items[action.index])
      };
      break;
    case InputKeyDownArrowDown:
      state.isOpen ? changes = {
        highlightedIndex: getHighlightedIndex(state.highlightedIndex, 1, props.items, props.isItemDisabled, !0)
      } : changes = {
        highlightedIndex: altKey && state.selectedItem == null ? -1 : getHighlightedIndexOnOpen(props, state, 1),
        isOpen: props.items.length >= 0
      };
      break;
    case InputKeyDownArrowUp:
      state.isOpen ? altKey ? changes = getChangesOnSelection(props, state.highlightedIndex) : changes = {
        highlightedIndex: getHighlightedIndex(state.highlightedIndex, -1, props.items, props.isItemDisabled, !0)
      } : changes = {
        highlightedIndex: getHighlightedIndexOnOpen(props, state, -1),
        isOpen: props.items.length >= 0
      };
      break;
    case InputKeyDownEnter:
      changes = getChangesOnSelection(props, state.highlightedIndex);
      break;
    case InputKeyDownEscape:
      changes = _extends({
        isOpen: !1,
        highlightedIndex: -1
      }, !state.isOpen && {
        selectedItem: null,
        inputValue: ""
      });
      break;
    case InputKeyDownPageUp:
      changes = {
        highlightedIndex: getHighlightedIndex(state.highlightedIndex, -10, props.items, props.isItemDisabled, !0)
      };
      break;
    case InputKeyDownPageDown:
      changes = {
        highlightedIndex: getHighlightedIndex(state.highlightedIndex, 10, props.items, props.isItemDisabled, !0)
      };
      break;
    case InputKeyDownHome:
      changes = {
        highlightedIndex: getNonDisabledIndex(0, !1, props.items, props.isItemDisabled)
      };
      break;
    case InputKeyDownEnd:
      changes = {
        highlightedIndex: getNonDisabledIndex(props.items.length - 1, !0, props.items, props.isItemDisabled)
      };
      break;
    case InputBlur:
      changes = _extends({
        isOpen: !1,
        highlightedIndex: -1
      }, state.highlightedIndex >= 0 && ((_props$items = props.items) == null ? void 0 : _props$items.length) && action.selectItem && {
        selectedItem: props.items[state.highlightedIndex],
        inputValue: props.itemToString(props.items[state.highlightedIndex])
      });
      break;
    case InputChange:
      changes = {
        isOpen: !0,
        highlightedIndex: getDefaultHighlightedIndex(props),
        inputValue: action.inputValue
      };
      break;
    case InputClick:
      changes = {
        isOpen: !state.isOpen,
        highlightedIndex: state.isOpen ? -1 : getHighlightedIndexOnOpen(props, state, 0)
      };
      break;
    case FunctionSelectItem:
      changes = {
        selectedItem: action.selectedItem,
        inputValue: props.itemToString(action.selectedItem)
      };
      break;
    case ControlledPropUpdatedSelectedItem:
      changes = {
        inputValue: action.inputValue
      };
      break;
    default:
      return downshiftCommonReducer(state, action, stateChangeTypes$1);
  }
  return _extends({}, state, changes);
}
var _excluded$12 = ["onMouseLeave", "refKey", "ref"], _excluded2$1 = ["item", "index", "refKey", "ref", "onMouseMove", "onMouseDown", "onClick", "onPress", "disabled"], _excluded3 = ["onClick", "onPress", "refKey", "ref"], _excluded4 = ["onKeyDown", "onChange", "onInput", "onBlur", "onChangeText", "onClick", "refKey", "ref"];
useCombobox.stateChangeTypes = stateChangeTypes$1;
function useCombobox(userProps) {
  userProps === void 0 && (userProps = {}), validatePropTypes$1(userProps, useCombobox);
  var props = _extends({}, defaultProps$1, userProps), items = props.items, scrollIntoView3 = props.scrollIntoView, environment = props.environment, getA11yStatusMessage2 = props.getA11yStatusMessage, _useControlledReducer = useControlledReducer(downshiftUseComboboxReducer, props, getInitialState$1, isDropdownsStateEqual), state = _useControlledReducer[0], dispatch = _useControlledReducer[1], isOpen = state.isOpen, highlightedIndex = state.highlightedIndex, selectedItem = state.selectedItem, inputValue = state.inputValue, menuRef = useRef(null), itemRefs = useRef({}), inputRef = useRef(null), toggleButtonRef = useRef(null), isInitialMount = useIsInitialMount(), elementIds = useElementIds(props), previousResultCountRef = useRef(), latest = useLatestRef({
    state,
    props
  }), getItemNodeFromIndex = useCallback(function(index) {
    return itemRefs.current[elementIds.getItemId(index)];
  }, [elementIds]);
  useA11yMessageStatus(getA11yStatusMessage2, state, [isOpen, highlightedIndex, selectedItem, inputValue], environment);
  var shouldScrollRef = useScrollIntoView({
    menuElement: menuRef.current,
    highlightedIndex,
    isOpen,
    itemRefs,
    scrollIntoView: scrollIntoView3,
    getItemNodeFromIndex
  });
  useControlPropsValidator({
    props,
    state
  }), useEffect(function() {
    var focusOnOpen = getInitialValue$1(props, "isOpen");
    focusOnOpen && inputRef.current && inputRef.current.focus();
  }, []), useEffect(function() {
    isInitialMount || (previousResultCountRef.current = items.length);
  });
  var mouseAndTouchTrackers = useMouseAndTouchTracker(environment, useCallback(function() {
    latest.current.state.isOpen && dispatch({
      type: InputBlur,
      selectItem: !1
    });
  }, [dispatch, latest]), useMemo(function() {
    return [menuRef, toggleButtonRef, inputRef];
  }, [menuRef.current, toggleButtonRef.current, inputRef.current])), setGetterPropCallInfo = useGetterPropsCalledChecker("getInputProps", "getMenuProps");
  useEffect(function() {
    isOpen || (itemRefs.current = {});
  }, [isOpen]), useEffect(function() {
    var _inputRef$current;
    !isOpen || !(environment != null && environment.document) || !(inputRef != null && (_inputRef$current = inputRef.current) != null && _inputRef$current.focus) || environment.document.activeElement !== inputRef.current && inputRef.current.focus();
  }, [isOpen, environment]);
  var inputKeyDownHandlers = useMemo(function() {
    return {
      ArrowDown: function(event) {
        event.preventDefault(), dispatch({
          type: InputKeyDownArrowDown,
          altKey: event.altKey
        });
      },
      ArrowUp: function(event) {
        event.preventDefault(), dispatch({
          type: InputKeyDownArrowUp,
          altKey: event.altKey
        });
      },
      Home: function(event) {
        latest.current.state.isOpen && (event.preventDefault(), dispatch({
          type: InputKeyDownHome
        }));
      },
      End: function(event) {
        latest.current.state.isOpen && (event.preventDefault(), dispatch({
          type: InputKeyDownEnd
        }));
      },
      Escape: function(event) {
        var latestState = latest.current.state;
        (latestState.isOpen || latestState.inputValue || latestState.selectedItem || latestState.highlightedIndex > -1) && (event.preventDefault(), dispatch({
          type: InputKeyDownEscape
        }));
      },
      Enter: function(event) {
        var latestState = latest.current.state;
        !latestState.isOpen || event.which === 229 || (event.preventDefault(), dispatch({
          type: InputKeyDownEnter
        }));
      },
      PageUp: function(event) {
        latest.current.state.isOpen && (event.preventDefault(), dispatch({
          type: InputKeyDownPageUp
        }));
      },
      PageDown: function(event) {
        latest.current.state.isOpen && (event.preventDefault(), dispatch({
          type: InputKeyDownPageDown
        }));
      }
    };
  }, [dispatch, latest]), getLabelProps = useCallback(function(labelProps) {
    return _extends({
      id: elementIds.labelId,
      htmlFor: elementIds.inputId
    }, labelProps);
  }, [elementIds]), getMenuProps = useCallback(function(_temp, _temp2) {
    var _extends22, _ref = _temp === void 0 ? {} : _temp, onMouseLeave = _ref.onMouseLeave, _ref$refKey = _ref.refKey, refKey = _ref$refKey === void 0 ? "ref" : _ref$refKey, ref = _ref.ref, rest2 = _objectWithoutPropertiesLoose2(_ref, _excluded$12), _ref2 = _temp2 === void 0 ? {} : _temp2, _ref2$suppressRefErro = _ref2.suppressRefError, suppressRefError = _ref2$suppressRefErro === void 0 ? !1 : _ref2$suppressRefErro;
    return setGetterPropCallInfo("getMenuProps", suppressRefError, refKey, menuRef), _extends((_extends22 = {}, _extends22[refKey] = handleRefs(ref, function(menuNode) {
      menuRef.current = menuNode;
    }), _extends22.id = elementIds.menuId, _extends22.role = "listbox", _extends22["aria-labelledby"] = rest2 && rest2["aria-label"] ? void 0 : "" + elementIds.labelId, _extends22.onMouseLeave = callAllEventHandlers(onMouseLeave, function() {
      dispatch({
        type: MenuMouseLeave
      });
    }), _extends22), rest2);
  }, [dispatch, setGetterPropCallInfo, elementIds]), getItemProps = useCallback(function(_temp3) {
    var _extends3, _ref4, _ref3 = _temp3 === void 0 ? {} : _temp3, itemProp = _ref3.item, indexProp = _ref3.index, _ref3$refKey = _ref3.refKey, refKey = _ref3$refKey === void 0 ? "ref" : _ref3$refKey, ref = _ref3.ref, onMouseMove = _ref3.onMouseMove, onMouseDown = _ref3.onMouseDown, onClick = _ref3.onClick;
    _ref3.onPress;
    var disabledProp = _ref3.disabled, rest2 = _objectWithoutPropertiesLoose2(_ref3, _excluded2$1);
    disabledProp !== void 0 && console.warn('Passing "disabled" as an argument to getItemProps is not supported anymore. Please use the isItemDisabled prop from useCombobox.');
    var _latest$current = latest.current, latestProps = _latest$current.props, latestState = _latest$current.state, _getItemAndIndex = getItemAndIndex(itemProp, indexProp, latestProps.items, "Pass either item or index to getItemProps!"), item = _getItemAndIndex[0], index = _getItemAndIndex[1], disabled = latestProps.isItemDisabled(item, index), onSelectKey = "onClick", customClickHandler = onClick, itemHandleMouseMove = function() {
      mouseAndTouchTrackers.isTouchEnd || index === latestState.highlightedIndex || (shouldScrollRef.current = !1, dispatch({
        type: ItemMouseMove,
        index,
        disabled
      }));
    }, itemHandleClick = function() {
      dispatch({
        type: ItemClick,
        index
      });
    }, itemHandleMouseDown = function(e2) {
      return e2.preventDefault();
    };
    return _extends((_extends3 = {}, _extends3[refKey] = handleRefs(ref, function(itemNode) {
      itemNode && (itemRefs.current[elementIds.getItemId(index)] = itemNode);
    }), _extends3["aria-disabled"] = disabled, _extends3["aria-selected"] = index === latestState.highlightedIndex, _extends3.id = elementIds.getItemId(index), _extends3.role = "option", _extends3), !disabled && (_ref4 = {}, _ref4[onSelectKey] = callAllEventHandlers(customClickHandler, itemHandleClick), _ref4), {
      onMouseMove: callAllEventHandlers(onMouseMove, itemHandleMouseMove),
      onMouseDown: callAllEventHandlers(onMouseDown, itemHandleMouseDown)
    }, rest2);
  }, [dispatch, elementIds, latest, mouseAndTouchTrackers, shouldScrollRef]), getToggleButtonProps = useCallback(function(_temp4) {
    var _extends4, _ref5 = _temp4 === void 0 ? {} : _temp4, onClick = _ref5.onClick;
    _ref5.onPress;
    var _ref5$refKey = _ref5.refKey, refKey = _ref5$refKey === void 0 ? "ref" : _ref5$refKey, ref = _ref5.ref, rest2 = _objectWithoutPropertiesLoose2(_ref5, _excluded3), latestState = latest.current.state, toggleButtonHandleClick = function() {
      dispatch({
        type: ToggleButtonClick
      });
    };
    return _extends((_extends4 = {}, _extends4[refKey] = handleRefs(ref, function(toggleButtonNode) {
      toggleButtonRef.current = toggleButtonNode;
    }), _extends4["aria-controls"] = elementIds.menuId, _extends4["aria-expanded"] = latestState.isOpen, _extends4.id = elementIds.toggleButtonId, _extends4.tabIndex = -1, _extends4), !rest2.disabled && _extends({}, {
      onClick: callAllEventHandlers(onClick, toggleButtonHandleClick)
    }), rest2);
  }, [dispatch, latest, elementIds]), getInputProps = useCallback(function(_temp5, _temp6) {
    var _extends5, _ref6 = _temp5 === void 0 ? {} : _temp5, onKeyDown = _ref6.onKeyDown, onChange = _ref6.onChange, onInput = _ref6.onInput, onBlur = _ref6.onBlur;
    _ref6.onChangeText;
    var onClick = _ref6.onClick, _ref6$refKey = _ref6.refKey, refKey = _ref6$refKey === void 0 ? "ref" : _ref6$refKey, ref = _ref6.ref, rest2 = _objectWithoutPropertiesLoose2(_ref6, _excluded4), _ref7 = _temp6 === void 0 ? {} : _temp6, _ref7$suppressRefErro = _ref7.suppressRefError, suppressRefError = _ref7$suppressRefErro === void 0 ? !1 : _ref7$suppressRefErro;
    setGetterPropCallInfo("getInputProps", suppressRefError, refKey, inputRef);
    var latestState = latest.current.state, inputHandleKeyDown = function(event) {
      var key = normalizeArrowKey(event);
      key && inputKeyDownHandlers[key] && inputKeyDownHandlers[key](event);
    }, inputHandleChange = function(event) {
      dispatch({
        type: InputChange,
        inputValue: event.target.value
      });
    }, inputHandleBlur = function(event) {
      if (environment != null && environment.document && latestState.isOpen && !mouseAndTouchTrackers.isMouseDown) {
        var isBlurByTabChange = event.relatedTarget === null && environment.document.activeElement !== environment.document.body;
        dispatch({
          type: InputBlur,
          selectItem: !isBlurByTabChange
        });
      }
    }, inputHandleClick = function() {
      dispatch({
        type: InputClick
      });
    }, onChangeKey = "onChange", eventHandlers = {};
    if (!rest2.disabled) {
      var _eventHandlers;
      eventHandlers = (_eventHandlers = {}, _eventHandlers[onChangeKey] = callAllEventHandlers(onChange, onInput, inputHandleChange), _eventHandlers.onKeyDown = callAllEventHandlers(onKeyDown, inputHandleKeyDown), _eventHandlers.onBlur = callAllEventHandlers(onBlur, inputHandleBlur), _eventHandlers.onClick = callAllEventHandlers(onClick, inputHandleClick), _eventHandlers);
    }
    return _extends((_extends5 = {}, _extends5[refKey] = handleRefs(ref, function(inputNode) {
      inputRef.current = inputNode;
    }), _extends5["aria-activedescendant"] = latestState.isOpen && latestState.highlightedIndex > -1 ? elementIds.getItemId(latestState.highlightedIndex) : "", _extends5["aria-autocomplete"] = "list", _extends5["aria-controls"] = elementIds.menuId, _extends5["aria-expanded"] = latestState.isOpen, _extends5["aria-labelledby"] = rest2 && rest2["aria-label"] ? void 0 : elementIds.labelId, _extends5.autoComplete = "off", _extends5.id = elementIds.inputId, _extends5.role = "combobox", _extends5.value = latestState.inputValue, _extends5), eventHandlers, rest2);
  }, [dispatch, elementIds, environment, inputKeyDownHandlers, latest, mouseAndTouchTrackers, setGetterPropCallInfo]), toggleMenu = useCallback(function() {
    dispatch({
      type: FunctionToggleMenu
    });
  }, [dispatch]), closeMenu = useCallback(function() {
    dispatch({
      type: FunctionCloseMenu
    });
  }, [dispatch]), openMenu = useCallback(function() {
    dispatch({
      type: FunctionOpenMenu
    });
  }, [dispatch]), setHighlightedIndex = useCallback(function(newHighlightedIndex) {
    dispatch({
      type: FunctionSetHighlightedIndex,
      highlightedIndex: newHighlightedIndex
    });
  }, [dispatch]), selectItem = useCallback(function(newSelectedItem) {
    dispatch({
      type: FunctionSelectItem,
      selectedItem: newSelectedItem
    });
  }, [dispatch]), setInputValue = useCallback(function(newInputValue) {
    dispatch({
      type: FunctionSetInputValue,
      inputValue: newInputValue
    });
  }, [dispatch]), reset = useCallback(function() {
    dispatch({
      type: FunctionReset$1
    });
  }, [dispatch]);
  return {
    // prop getters.
    getItemProps,
    getLabelProps,
    getMenuProps,
    getInputProps,
    getToggleButtonProps,
    // actions.
    toggleMenu,
    openMenu,
    closeMenu,
    setHighlightedIndex,
    setInputValue,
    selectItem,
    reset,
    // state.
    highlightedIndex,
    isOpen,
    selectedItem,
    inputValue
  };
}
var defaultStateValues = {
  activeIndex: -1,
  selectedItems: []
};
function getInitialValue(props, propKey) {
  return getInitialValue$1(props, propKey, defaultStateValues);
}
function getDefaultValue(props, propKey) {
  return getDefaultValue$1(props, propKey, defaultStateValues);
}
function getInitialState(props) {
  var activeIndex = getInitialValue(props, "activeIndex"), selectedItems = getInitialValue(props, "selectedItems");
  return {
    activeIndex,
    selectedItems
  };
}
function isKeyDownOperationPermitted(event) {
  if (event.shiftKey || event.metaKey || event.ctrlKey || event.altKey)
    return !1;
  var element = event.target;
  return !(element instanceof HTMLInputElement && // if element is a text input
  element.value !== "" && // and we have text in it
  // and cursor is either not at the start or is currently highlighting text.
  (element.selectionStart !== 0 || element.selectionEnd !== 0));
}
function isStateEqual(prevState, newState) {
  return prevState.selectedItems === newState.selectedItems && prevState.activeIndex === newState.activeIndex;
}
var propTypes = {
  stateReducer: commonPropTypes.stateReducer,
  itemToKey: commonPropTypes.itemToKey,
  environment: commonPropTypes.environment,
  selectedItems: import_prop_types3.default.array,
  initialSelectedItems: import_prop_types3.default.array,
  defaultSelectedItems: import_prop_types3.default.array,
  getA11yStatusMessage: import_prop_types3.default.func,
  activeIndex: import_prop_types3.default.number,
  initialActiveIndex: import_prop_types3.default.number,
  defaultActiveIndex: import_prop_types3.default.number,
  onActiveIndexChange: import_prop_types3.default.func,
  onSelectedItemsChange: import_prop_types3.default.func,
  keyNavigationNext: import_prop_types3.default.string,
  keyNavigationPrevious: import_prop_types3.default.string
}, defaultProps2 = {
  itemToKey: defaultProps$3.itemToKey,
  stateReducer: defaultProps$3.stateReducer,
  environment: defaultProps$3.environment,
  keyNavigationNext: "ArrowRight",
  keyNavigationPrevious: "ArrowLeft"
}, validatePropTypes = noop4, SelectedItemClick = 0, SelectedItemKeyDownDelete = 1, SelectedItemKeyDownBackspace = 2, SelectedItemKeyDownNavigationNext = 3, SelectedItemKeyDownNavigationPrevious = 4, DropdownKeyDownNavigationPrevious = 5, DropdownKeyDownBackspace = 6, DropdownClick = 7, FunctionAddSelectedItem = 8, FunctionRemoveSelectedItem = 9, FunctionSetSelectedItems = 10, FunctionSetActiveIndex = 11, FunctionReset = 12, stateChangeTypes = Object.freeze({
  __proto__: null,
  DropdownClick,
  DropdownKeyDownBackspace,
  DropdownKeyDownNavigationPrevious,
  FunctionAddSelectedItem,
  FunctionRemoveSelectedItem,
  FunctionReset,
  FunctionSetActiveIndex,
  FunctionSetSelectedItems,
  SelectedItemClick,
  SelectedItemKeyDownBackspace,
  SelectedItemKeyDownDelete,
  SelectedItemKeyDownNavigationNext,
  SelectedItemKeyDownNavigationPrevious
});
function downshiftMultipleSelectionReducer(state, action) {
  var type = action.type, index = action.index, props = action.props, selectedItem = action.selectedItem, activeIndex = state.activeIndex, selectedItems = state.selectedItems, changes;
  switch (type) {
    case SelectedItemClick:
      changes = {
        activeIndex: index
      };
      break;
    case SelectedItemKeyDownNavigationPrevious:
      changes = {
        activeIndex: activeIndex - 1 < 0 ? 0 : activeIndex - 1
      };
      break;
    case SelectedItemKeyDownNavigationNext:
      changes = {
        activeIndex: activeIndex + 1 >= selectedItems.length ? -1 : activeIndex + 1
      };
      break;
    case SelectedItemKeyDownBackspace:
    case SelectedItemKeyDownDelete: {
      if (activeIndex < 0)
        break;
      var newActiveIndex = activeIndex;
      selectedItems.length === 1 ? newActiveIndex = -1 : activeIndex === selectedItems.length - 1 && (newActiveIndex = selectedItems.length - 2), changes = _extends({
        selectedItems: [].concat(selectedItems.slice(0, activeIndex), selectedItems.slice(activeIndex + 1))
      }, {
        activeIndex: newActiveIndex
      });
      break;
    }
    case DropdownKeyDownNavigationPrevious:
      changes = {
        activeIndex: selectedItems.length - 1
      };
      break;
    case DropdownKeyDownBackspace:
      changes = {
        selectedItems: selectedItems.slice(0, selectedItems.length - 1)
      };
      break;
    case FunctionAddSelectedItem:
      changes = {
        selectedItems: [].concat(selectedItems, [selectedItem])
      };
      break;
    case DropdownClick:
      changes = {
        activeIndex: -1
      };
      break;
    case FunctionRemoveSelectedItem: {
      var _newActiveIndex = activeIndex, selectedItemIndex = selectedItems.findIndex(function(item) {
        return props.itemToKey(item) === props.itemToKey(selectedItem);
      });
      if (selectedItemIndex < 0)
        break;
      selectedItems.length === 1 ? _newActiveIndex = -1 : selectedItemIndex === selectedItems.length - 1 && (_newActiveIndex = selectedItems.length - 2), changes = {
        selectedItems: [].concat(selectedItems.slice(0, selectedItemIndex), selectedItems.slice(selectedItemIndex + 1)),
        activeIndex: _newActiveIndex
      };
      break;
    }
    case FunctionSetSelectedItems: {
      var newSelectedItems = action.selectedItems;
      changes = {
        selectedItems: newSelectedItems
      };
      break;
    }
    case FunctionSetActiveIndex: {
      var _newActiveIndex2 = action.activeIndex;
      changes = {
        activeIndex: _newActiveIndex2
      };
      break;
    }
    case FunctionReset:
      changes = {
        activeIndex: getDefaultValue(props, "activeIndex"),
        selectedItems: getDefaultValue(props, "selectedItems")
      };
      break;
    default:
      throw new Error("Reducer called without proper action type.");
  }
  return _extends({}, state, changes);
}
var _excluded2 = ["refKey", "ref", "onClick", "onKeyDown", "selectedItem", "index"], _excluded22 = ["refKey", "ref", "onKeyDown", "onClick", "preventKeyAction"];
useMultipleSelection.stateChangeTypes = stateChangeTypes;
function useMultipleSelection(userProps) {
  userProps === void 0 && (userProps = {}), validatePropTypes(userProps, useMultipleSelection);
  var props = _extends({}, defaultProps2, userProps), getA11yStatusMessage2 = props.getA11yStatusMessage, environment = props.environment, keyNavigationNext = props.keyNavigationNext, keyNavigationPrevious = props.keyNavigationPrevious, _useControlledReducer = useControlledReducer$1(downshiftMultipleSelectionReducer, props, getInitialState, isStateEqual), state = _useControlledReducer[0], dispatch = _useControlledReducer[1], activeIndex = state.activeIndex, selectedItems = state.selectedItems, isInitialMount = useIsInitialMount(), dropdownRef = useRef(null), selectedItemRefs = useRef();
  selectedItemRefs.current = [];
  var latest = useLatestRef({
    state,
    props
  });
  useA11yMessageStatus(getA11yStatusMessage2, state, [activeIndex, selectedItems], environment), useEffect(function() {
    isInitialMount || (activeIndex === -1 && dropdownRef.current ? dropdownRef.current.focus() : selectedItemRefs.current[activeIndex] && selectedItemRefs.current[activeIndex].focus());
  }, [activeIndex]), useControlPropsValidator({
    props,
    state
  });
  var setGetterPropCallInfo = useGetterPropsCalledChecker("getDropdownProps"), selectedItemKeyDownHandlers = useMemo(function() {
    var _ref;
    return _ref = {}, _ref[keyNavigationPrevious] = function() {
      dispatch({
        type: SelectedItemKeyDownNavigationPrevious
      });
    }, _ref[keyNavigationNext] = function() {
      dispatch({
        type: SelectedItemKeyDownNavigationNext
      });
    }, _ref.Delete = function() {
      dispatch({
        type: SelectedItemKeyDownDelete
      });
    }, _ref.Backspace = function() {
      dispatch({
        type: SelectedItemKeyDownBackspace
      });
    }, _ref;
  }, [dispatch, keyNavigationNext, keyNavigationPrevious]), dropdownKeyDownHandlers = useMemo(function() {
    var _ref2;
    return _ref2 = {}, _ref2[keyNavigationPrevious] = function(event) {
      isKeyDownOperationPermitted(event) && dispatch({
        type: DropdownKeyDownNavigationPrevious
      });
    }, _ref2.Backspace = function(event) {
      isKeyDownOperationPermitted(event) && dispatch({
        type: DropdownKeyDownBackspace
      });
    }, _ref2;
  }, [dispatch, keyNavigationPrevious]), getSelectedItemProps = useCallback(function(_temp) {
    var _extends22, _ref3 = _temp === void 0 ? {} : _temp, _ref3$refKey = _ref3.refKey, refKey = _ref3$refKey === void 0 ? "ref" : _ref3$refKey, ref = _ref3.ref, onClick = _ref3.onClick, onKeyDown = _ref3.onKeyDown, selectedItemProp = _ref3.selectedItem, indexProp = _ref3.index, rest2 = _objectWithoutPropertiesLoose2(_ref3, _excluded2), latestState = latest.current.state, _getItemAndIndex = getItemAndIndex(selectedItemProp, indexProp, latestState.selectedItems, "Pass either item or index to getSelectedItemProps!"), index = _getItemAndIndex[1], isFocusable = index > -1 && index === latestState.activeIndex, selectedItemHandleClick = function() {
      dispatch({
        type: SelectedItemClick,
        index
      });
    }, selectedItemHandleKeyDown = function(event) {
      var key = normalizeArrowKey(event);
      key && selectedItemKeyDownHandlers[key] && selectedItemKeyDownHandlers[key](event);
    };
    return _extends((_extends22 = {}, _extends22[refKey] = handleRefs(ref, function(selectedItemNode) {
      selectedItemNode && selectedItemRefs.current.push(selectedItemNode);
    }), _extends22.tabIndex = isFocusable ? 0 : -1, _extends22.onClick = callAllEventHandlers(onClick, selectedItemHandleClick), _extends22.onKeyDown = callAllEventHandlers(onKeyDown, selectedItemHandleKeyDown), _extends22), rest2);
  }, [dispatch, latest, selectedItemKeyDownHandlers]), getDropdownProps = useCallback(function(_temp2, _temp3) {
    var _extends3, _ref4 = _temp2 === void 0 ? {} : _temp2, _ref4$refKey = _ref4.refKey, refKey = _ref4$refKey === void 0 ? "ref" : _ref4$refKey, ref = _ref4.ref, onKeyDown = _ref4.onKeyDown, onClick = _ref4.onClick, _ref4$preventKeyActio = _ref4.preventKeyAction, preventKeyAction = _ref4$preventKeyActio === void 0 ? !1 : _ref4$preventKeyActio, rest2 = _objectWithoutPropertiesLoose2(_ref4, _excluded22), _ref5 = _temp3 === void 0 ? {} : _temp3, _ref5$suppressRefErro = _ref5.suppressRefError, suppressRefError = _ref5$suppressRefErro === void 0 ? !1 : _ref5$suppressRefErro;
    setGetterPropCallInfo("getDropdownProps", suppressRefError, refKey, dropdownRef);
    var dropdownHandleKeyDown = function(event) {
      var key = normalizeArrowKey(event);
      key && dropdownKeyDownHandlers[key] && dropdownKeyDownHandlers[key](event);
    }, dropdownHandleClick = function() {
      dispatch({
        type: DropdownClick
      });
    };
    return _extends((_extends3 = {}, _extends3[refKey] = handleRefs(ref, function(dropdownNode) {
      dropdownNode && (dropdownRef.current = dropdownNode);
    }), _extends3), !preventKeyAction && {
      onKeyDown: callAllEventHandlers(onKeyDown, dropdownHandleKeyDown),
      onClick: callAllEventHandlers(onClick, dropdownHandleClick)
    }, rest2);
  }, [dispatch, dropdownKeyDownHandlers, setGetterPropCallInfo]), addSelectedItem = useCallback(function(selectedItem) {
    dispatch({
      type: FunctionAddSelectedItem,
      selectedItem
    });
  }, [dispatch]), removeSelectedItem = useCallback(function(selectedItem) {
    dispatch({
      type: FunctionRemoveSelectedItem,
      selectedItem
    });
  }, [dispatch]), setSelectedItems = useCallback(function(newSelectedItems) {
    dispatch({
      type: FunctionSetSelectedItems,
      selectedItems: newSelectedItems
    });
  }, [dispatch]), setActiveIndex = useCallback(function(newActiveIndex) {
    dispatch({
      type: FunctionSetActiveIndex,
      activeIndex: newActiveIndex
    });
  }, [dispatch]), reset = useCallback(function() {
    dispatch({
      type: FunctionReset
    });
  }, [dispatch]);
  return {
    getSelectedItemProps,
    getDropdownProps,
    addSelectedItem,
    removeSelectedItem,
    setSelectedItems,
    setActiveIndex,
    reset,
    selectedItems,
    activeIndex
  };
}

// src/manager/components/sidebar/Search.tsx
var import_fuse = __toESM(require_fuse(), 1);

// src/manager/components/sidebar/types.ts
function isExpandType(x2) {
  return !!(x2 && x2.showAll);
}
function isSearchResult(x2) {
  return !!(x2 && x2.item);
}

// src/manager/components/sidebar/Search.tsx
var { document: document7 } = scope, DEFAULT_MAX_SEARCH_RESULTS = 50, options = {
  shouldSort: !0,
  tokenize: !0,
  findAllMatches: !0,
  includeScore: !0,
  includeMatches: !0,
  threshold: 0.2,
  location: 0,
  distance: 100,
  maxPatternLength: 32,
  minMatchCharLength: 1,
  keys: [
    { name: "name", weight: 0.7 },
    { name: "path", weight: 0.3 }
  ]
}, SearchBar = styled.div({
  display: "flex",
  flexDirection: "row",
  columnGap: 6
}), ScreenReaderLabel = styled.label({
  position: "absolute",
  left: -1e4,
  top: "auto",
  width: 1,
  height: 1,
  overflow: "hidden"
}), SearchField2 = styled.div(({ theme, isMobile: isMobile2 }) => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  padding: isMobile2 ? 4 : 2,
  flexGrow: 1,
  height: isMobile2 ? 36 : 32,
  width: "100%",
  boxShadow: `${theme.button.border} 0 0 0 1px inset`,
  borderRadius: theme.appBorderRadius + 2,
  "&:has(input:focus), &:has(input:active)": {
    background: theme.background.app,
    outline: `2px solid ${theme.color.secondary}`,
    outlineOffset: 2
  }
})), IconWrapper = styled.div(({ theme, onClick }) => ({
  cursor: onClick ? "pointer" : "default",
  flex: "0 0 28px",
  height: "100%",
  pointerEvents: onClick ? "auto" : "none",
  color: theme.textMutedColor,
  display: "flex",
  alignItems: "center",
  justifyContent: "center"
})), Input = styled.input(({ theme, isMobile: isMobile2 }) => ({
  appearance: "none",
  height: 28,
  width: "100%",
  padding: 0,
  border: 0,
  background: "transparent",
  fontSize: isMobile2 ? "16px" : `${theme.typography.size.s1 + 1}px`,
  fontFamily: "inherit",
  transition: "all 150ms",
  color: theme.color.defaultText,
  outline: 0,
  "&::placeholder": {
    color: theme.textMutedColor,
    opacity: 1
  },
  "&:valid ~ code, &:focus ~ code": {
    display: "none"
  },
  "&:invalid ~ svg": {
    display: "none"
  },
  "&:valid ~ svg": {
    display: "block"
  },
  "&::-ms-clear": {
    display: "none"
  },
  "&::-webkit-search-decoration, &::-webkit-search-cancel-button, &::-webkit-search-results-button, &::-webkit-search-results-decoration": {
    display: "none"
  }
})), FocusKey = styled.code(({ theme }) => ({
  margin: 5,
  marginTop: 6,
  height: 16,
  fontFamily: theme.typography.fonts.base,
  lineHeight: "16px",
  textAlign: "center",
  fontSize: "11px",
  color: theme.base === "light" ? theme.color.dark : theme.textMutedColor,
  userSelect: "none",
  pointerEvents: "none",
  display: "flex",
  alignItems: "center",
  gap: 4,
  flexShrink: 0
})), FocusKeyCmd = styled.span({
  fontSize: "14px"
}), Actions = styled.div({
  display: "flex",
  alignItems: "center",
  gap: 2
}), FocusContainer = styled.div({ outline: 0 }), Search = react_default.memo(function({
  children,
  dataset,
  enableShortcuts = !0,
  getLastViewed,
  initialQuery = "",
  searchBarContent,
  searchFieldContent
}) {
  let api = useStorybookApi(), inputRef = useRef(null), [inputPlaceholder, setPlaceholder] = useState("Find components"), [allComponents, showAllComponents] = useState(!1), searchShortcut = api ? shortcutToHumanString(api.getShortcutKeys().search) : "/", makeFuse = useCallback(() => {
    let list = dataset.entries.reduce((acc, [refId, { index, allStatuses }]) => {
      let groupStatus = getGroupStatus(index || {}, allStatuses ?? {});
      return index && acc.push(
        ...Object.values(index).map((item) => {
          let storyStatuses = allStatuses?.[item.id], mostCriticalStatusValue = storyStatuses ? getMostCriticalStatusValue(Object.values(storyStatuses).map((s2) => s2.value)) : null;
          return {
            ...searchItem(item, dataset.hash[refId]),
            status: mostCriticalStatusValue ?? groupStatus[item.id] ?? null
          };
        })
      ), acc;
    }, []);
    return new import_fuse.default(list, options);
  }, [dataset]), getResults = useCallback(
    (input) => {
      let fuse = makeFuse();
      if (!input)
        return [];
      let results = [], resultIds = /* @__PURE__ */ new Set(), distinctResults = fuse.search(input).filter(({ item }) => !(item.type === "component" || item.type === "docs" || item.type === "story") || // @ts-expect-error (non strict)
      resultIds.has(item.parent) ? !1 : (resultIds.add(item.id), !0));
      return distinctResults.length && (results = distinctResults.slice(0, allComponents ? 1e3 : DEFAULT_MAX_SEARCH_RESULTS), distinctResults.length > DEFAULT_MAX_SEARCH_RESULTS && !allComponents && results.push({
        showAll: () => showAllComponents(!0),
        totalCount: distinctResults.length,
        moreCount: distinctResults.length - DEFAULT_MAX_SEARCH_RESULTS
      })), results;
    },
    [allComponents, makeFuse]
  ), onSelect = useCallback(
    (selectedItem) => {
      if (isSearchResult(selectedItem)) {
        let { id, refId } = selectedItem.item;
        api?.selectStory(id, void 0, { ref: refId !== DEFAULT_REF_ID && refId }), inputRef.current.blur(), showAllComponents(!1);
        return;
      }
      isExpandType(selectedItem) && selectedItem.showAll();
    },
    [api]
  ), onInputValueChange = useCallback((inputValue, stateAndHelpers) => {
    showAllComponents(!1);
  }, []), stateReducer2 = useCallback(
    (state, changes) => {
      switch (changes.type) {
        case Downshift.stateChangeTypes.blurInput:
          return {
            ...changes,
            // Prevent clearing the input on blur
            inputValue: state.inputValue,
            // Return to the tree view after selecting an item
            isOpen: state.inputValue && !state.selectedItem
          };
        case Downshift.stateChangeTypes.mouseUp:
          return state;
        case Downshift.stateChangeTypes.keyDownEscape:
          return state.inputValue ? { ...changes, inputValue: "", isOpen: !0, selectedItem: null } : { ...changes, isOpen: !1, selectedItem: null };
        case Downshift.stateChangeTypes.clickItem:
        case Downshift.stateChangeTypes.keyDownEnter:
          return isSearchResult(changes.selectedItem) ? { ...changes, inputValue: state.inputValue } : isExpandType(changes.selectedItem) ? state : changes;
        default:
          return changes;
      }
    },
    []
  ), { isMobile: isMobile2 } = useLayout();
  return (
    // @ts-expect-error (non strict)
    react_default.createElement(
      Downshift,
      {
        initialInputValue: initialQuery,
        stateReducer: stateReducer2,
        itemToString: (result) => result?.item?.name || "",
        scrollIntoView: (e2) => scrollIntoView(e2),
        onSelect,
        onInputValueChange
      },
      ({
        isOpen,
        openMenu,
        closeMenu,
        inputValue,
        getInputProps,
        getItemProps,
        getLabelProps,
        getMenuProps,
        getRootProps,
        highlightedIndex,
        reset
      }) => {
        let input = inputValue ? inputValue.trim() : "", results = input ? getResults(input) : [], lastViewed = !input && getLastViewed();
        lastViewed && lastViewed.length && (results = lastViewed.reduce((acc, { storyId, refId }) => {
          let data = dataset.hash[refId];
          if (data && data.index && data.index[storyId]) {
            let story = data.index[storyId], item = story.type === "story" ? data.index[story.parent] : story;
            acc.some((res) => res.item.refId === refId && res.item.id === item.id) || acc.push({ item: searchItem(item, dataset.hash[refId]), matches: [], score: 0 });
          }
          return acc;
        }, []));
        let inputId = "storybook-explorer-searchfield", inputProps = getInputProps({
          id: inputId,
          ref: inputRef,
          required: !0,
          type: "search",
          placeholder: inputPlaceholder,
          onFocus: () => {
            openMenu(), setPlaceholder("Type to find...");
          },
          onBlur: () => setPlaceholder("Find components"),
          onKeyDown: (e2) => {
            e2.key === "Escape" && inputValue.length === 0 && inputRef.current.blur();
          }
        }), labelProps = getLabelProps({
          htmlFor: inputId
        });
        return react_default.createElement(react_default.Fragment, null, react_default.createElement(ScreenReaderLabel, { ...labelProps }, "Search for components"), react_default.createElement(SearchBar, null, react_default.createElement(
          SearchField2,
          {
            ...getRootProps({ refKey: "" }, { suppressRefError: !0 }),
            isMobile: isMobile2,
            className: "search-field"
          },
          react_default.createElement(IconWrapper, null, react_default.createElement(SearchIcon, null)),
          react_default.createElement(Input, { ...inputProps, isMobile: isMobile2 }),
          !isMobile2 && enableShortcuts && !isOpen && react_default.createElement(FocusKey, null, searchShortcut === "\u2318 K" ? react_default.createElement(react_default.Fragment, null, react_default.createElement(FocusKeyCmd, null, "\u2318"), "K") : searchShortcut),
          react_default.createElement(Actions, null, input && react_default.createElement(
            Button,
            {
              padding: "small",
              variant: "ghost",
              ariaLabel: "Clear search",
              onClick: () => {
                reset({ inputValue: "" }), closeMenu(), inputRef.current?.focus();
              }
            },
            react_default.createElement(CloseIcon, null)
          ), searchFieldContent)
        ), searchBarContent), react_default.createElement(FocusContainer, { tabIndex: 0, id: "storybook-explorer-menu" }, children({
          query: input,
          results,
          isBrowsing: !isOpen && document7.activeElement !== inputRef.current,
          closeMenu,
          getMenuProps,
          getItemProps,
          highlightedIndex
        })));
      }
    )
  );
});

// src/manager/components/sidebar/SearchResults.tsx
var { document: document8 } = scope, ResultsList = styled.ol({
  listStyle: "none",
  margin: 0,
  padding: 0
}), ResultRow = styled.li(({ theme, isHighlighted }) => ({
  width: "100%",
  border: "none",
  cursor: "pointer",
  display: "flex",
  alignItems: "start",
  justifyContent: "space-between",
  textAlign: "left",
  color: "inherit",
  fontSize: `${theme.typography.size.s2}px`,
  background: isHighlighted ? theme.background.hoverable : "transparent",
  minHeight: 28,
  borderRadius: 4,
  gap: 6,
  paddingTop: 7,
  paddingBottom: 7,
  paddingLeft: 8,
  paddingRight: 8,
  "&:hover, &:focus": {
    background: curriedTransparentize$1(0.93, theme.color.secondary),
    outline: "none"
  }
})), IconWrapper2 = styled.div({
  marginTop: 2
}), ResultRowContent = styled.div({
  flex: 1,
  display: "flex",
  flexDirection: "column"
}), Mark = styled.mark(({ theme }) => ({
  background: "transparent",
  color: theme.color.secondary
})), MoreWrapper = styled.div({
  marginTop: 8
}), RecentlyOpenedTitle = styled.div(({ theme }) => ({
  display: "flex",
  justifyContent: "space-between",
  fontSize: `${theme.typography.size.s1 - 1}px`,
  fontWeight: theme.typography.weight.bold,
  minHeight: 28,
  letterSpacing: "0.16em",
  textTransform: "uppercase",
  color: theme.textMutedColor,
  marginBottom: 4,
  alignItems: "center",
  ".search-result-recentlyOpened-clear": {
    visibility: "hidden"
  },
  "&:hover": {
    ".search-result-recentlyOpened-clear": {
      visibility: "visible"
    }
  }
})), Highlight = react_default.memo(function({
  children,
  match
}) {
  if (!match)
    return children;
  let { value, indices } = match, { nodes: result } = indices.reduce(
    ({ cursor, nodes }, [start, end], index, { length }) => (nodes.push(react_default.createElement("span", { key: `${index}-1` }, value.slice(cursor, start))), nodes.push(react_default.createElement(Mark, { key: `${index}-2` }, value.slice(start, end + 1))), index === length - 1 && nodes.push(react_default.createElement("span", { key: `${index}-3` }, value.slice(end + 1))), { cursor: end + 1, nodes }),
    { cursor: 0, nodes: [] }
  );
  return react_default.createElement("span", null, result);
}), Title = styled.div({
  display: "grid",
  justifyContent: "start",
  gridAutoColumns: "auto",
  gridAutoFlow: "column",
  "& > span": {
    display: "block",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  }
}), Path = styled.div(({ theme }) => ({
  display: "grid",
  justifyContent: "start",
  gridAutoColumns: "auto",
  gridAutoFlow: "column",
  fontSize: `${theme.typography.size.s1 - 1}px`,
  "& > span": {
    display: "block",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis"
  },
  "& > span + span": {
    "&:before": {
      content: "' / '"
    }
  }
})), Result = react_default.memo(function({ item, matches, onClick, ...props }) {
  let theme = useTheme(), click = useCallback(
    (event) => {
      event.preventDefault(), onClick?.(event);
    },
    [onClick]
  ), api = useStorybookApi();
  useEffect(() => {
    api && props.isHighlighted && item.type === "component" && api.emit(PRELOAD_ENTRIES, { ids: [item.children[0]] }, { options: { target: item.refId } });
  }, [api, props.isHighlighted, item]);
  let nameMatch = matches.find((match) => match.key === "name"), pathMatches = matches.filter((match) => match.key === "path"), [icon] = item.status ? getStatus(theme, item.status) : [];
  return react_default.createElement(ResultRow, { ...props, onClick: click }, react_default.createElement(IconWrapper2, null, item.type === "component" && react_default.createElement(TypeIcon2, { viewBox: "0 0 14 14", width: "14", height: "14", type: "component" }, react_default.createElement(UseSymbol, { type: "component" })), item.type === "story" && react_default.createElement(TypeIcon2, { viewBox: "0 0 14 14", width: "14", height: "14", type: item.subtype }, react_default.createElement(UseSymbol, { type: item.subtype })), !(item.type === "component" || item.type === "story") && react_default.createElement(TypeIcon2, { viewBox: "0 0 14 14", width: "14", height: "14", type: "document" }, react_default.createElement(UseSymbol, { type: "document" }))), react_default.createElement(ResultRowContent, { className: "search-result-item--label" }, react_default.createElement(Title, null, react_default.createElement(Highlight, { match: nameMatch }, item.name)), react_default.createElement(Path, null, item.path.map((group, index) => react_default.createElement("span", { key: index }, react_default.createElement(Highlight, { match: pathMatches.find((match) => match.arrayIndex === index) }, group))))), item.status ? react_default.createElement(StatusLabel, { status: item.status }, icon) : null);
}), SearchResults = react_default.memo(function({
  query,
  results,
  closeMenu,
  getMenuProps,
  getItemProps,
  highlightedIndex,
  isLoading = !1,
  enableShortcuts = !0,
  clearLastViewed
}) {
  let api = useStorybookApi();
  useEffect(() => {
    let handleEscape = (event) => {
      if (!(!enableShortcuts || isLoading || event.repeat) && matchesModifiers(!1, event) && matchesKeyCode("Escape", event)) {
        if (event.target?.id === "storybook-explorer-searchfield")
          return;
        event.preventDefault(), closeMenu();
      }
    };
    return document8.addEventListener("keydown", handleEscape), () => document8.removeEventListener("keydown", handleEscape);
  }, [closeMenu, enableShortcuts, isLoading]);
  let mouseOverHandler = useCallback((event) => {
    if (!api)
      return;
    let currentTarget = event.currentTarget, storyId = currentTarget.getAttribute("data-id"), refId = currentTarget.getAttribute("data-refid"), item = api.resolveStory(storyId, refId === "storybook_internal" ? void 0 : refId);
    item?.type === "component" && api.emit(PRELOAD_ENTRIES, {
      // @ts-expect-error (TODO)
      ids: [item.isLeaf ? item.id : item.children[0]],
      options: { target: refId }
    });
  }, []), handleClearLastViewed = () => {
    clearLastViewed(), closeMenu();
  };
  return react_default.createElement(ResultsList, { ...getMenuProps(), key: "results-list" }, results.length > 0 && !query && react_default.createElement(RecentlyOpenedTitle, { className: "search-result-recentlyOpened" }, "Recently opened", react_default.createElement(
    Button,
    {
      padding: "small",
      variant: "ghost",
      className: "search-result-recentlyOpened-clear",
      onClick: handleClearLastViewed,
      ariaLabel: "Clear recently opened items"
    },
    react_default.createElement(TrashIcon, null)
  )), results.length === 0 && query && react_default.createElement("li", null, react_default.createElement(NoResults2, null, react_default.createElement("strong", null, "No components found"), react_default.createElement("small", null, "Find components by name or path."))), results.map((result, index) => {
    if (isExpandType(result)) {
      let props = { ...results, ...getItemProps({ key: index, index, item: result }) }, { key: key2, ...rest2 } = props;
      return react_default.createElement(MoreWrapper, { key: "search-result-expand" }, react_default.createElement(Button, { key: key2, ...rest2, size: "small" }, "Show ", result.moreCount, " more results"));
    }
    let { item } = result, key = `${item.refId}::${item.id}`;
    return react_default.createElement(
      Result,
      {
        ...result,
        ...getItemProps({ key, index, item: result }),
        isHighlighted: highlightedIndex === index,
        key,
        "data-id": result.item.id,
        "data-refid": result.item.refId,
        onMouseOver: mouseOverHandler,
        className: "search-result-item"
      }
    );
  }));
});

// src/manager/components/sidebar/useDynamicFavicon.ts
var STATUSES = ["active", "critical", "negative", "positive", "warning"], initialIcon, getFaviconUrl = (initialHref = "./favicon.svg", status) => {
  initialIcon ??= initialHref;
  let href = initialIcon + (status && STATUSES.includes(status) ? `?status=${status}` : "");
  return new Promise((resolve) => {
    let img = new Image();
    img.onload = () => resolve({ href, status }), img.onerror = () => resolve({ href: initialIcon, status }), img.src = href;
  });
}, useDynamicFavicon = (status) => {
  let links = useRef(document.head.querySelectorAll("link[rel*='icon']"));
  useEffect(() => {
    let isMounted = !0, [element, ...others] = links.current;
    if (element && !others.length)
      return getFaviconUrl(element.href, status).then(
        (result) => {
          isMounted && result.status === status && element.dataset.status !== status && (element.href = result.href, result.status ? element.dataset.status = result.status : delete element.dataset.status);
        },
        () => {
          isMounted && (element.href = initialIcon);
        }
      ), () => {
        isMounted = !1, element.href = initialIcon;
      };
  }, [status]);
};

// src/manager/components/sidebar/TestingWidget.tsx
var DEFAULT_HEIGHT = 500, HoverCard2 = styled(Card)({
  display: "flex",
  flexDirection: "column-reverse",
  "&:hover #testing-module-collapse-toggle": {
    opacity: 1
  }
}), Collapsible2 = styled.div(({ theme }) => ({
  overflow: "hidden",
  boxShadow: `inset 0 -1px 0 ${theme.appBorderColor}`
})), Content2 = styled.div({
  display: "flex",
  flexDirection: "column"
}), Bar2 = styled.div(({ onClick }) => ({
  display: "flex",
  width: "100%",
  cursor: onClick ? "pointer" : "default",
  userSelect: "none",
  alignItems: "center",
  justifyContent: "space-between",
  overflow: "hidden",
  padding: 4,
  gap: 4
})), Action = styled.div({
  display: "flex",
  flexBasis: "100%",
  containerType: "inline-size"
}), Filters = styled.div({
  display: "flex",
  justifyContent: "flex-end",
  gap: 4
}), CollapseToggle2 = styled(ActionList.Button)({
  opacity: 0,
  transition: "opacity 250ms",
  "&:focus, &:hover": {
    opacity: 1
  }
}), RunButton = ({
  children,
  isRunning,
  onRunAll,
  ...props
}) => react_default.createElement(
  ActionList.Button,
  {
    ariaLabel: isRunning ? "Running..." : "Run tests",
    tooltip: isRunning ? "Running tests..." : "Start all tests",
    disabled: isRunning,
    onClick: (e2) => {
      e2.stopPropagation(), onRunAll();
    },
    ...props
  },
  react_default.createElement(ActionList.Icon, null, react_default.createElement(PlayAllHollowIcon, null)),
  children
), StatusButton2 = styled(ActionList.Toggle)(
  { minWidth: 28, outlineOffset: -2 },
  ({ pressed, status, theme }) => !pressed && (theme.base === "light" ? {
    background: {
      negative: theme.background.negative,
      warning: theme.background.warning
    }[status],
    color: {
      negative: theme.color.negativeText,
      warning: theme.color.warningText
    }[status]
  } : {
    background: {
      negative: `${theme.color.negative}22`,
      warning: `${theme.color.warning}22`
    }[status],
    color: {
      negative: theme.color.negative,
      warning: theme.color.warning
    }[status]
  })
), TestProvider = styled.div(({ theme }) => ({
  padding: 4,
  "&:not(:last-child)": {
    boxShadow: `inset 0 -1px 0 ${theme.appBorderColor}`
  }
})), TestingWidget = ({
  registeredTestProviders,
  testProviderStates,
  hasStatuses,
  clearStatuses,
  onRunAll,
  errorCount,
  errorsActive,
  setErrorsActive,
  warningCount,
  warningsActive,
  setWarningsActive,
  successCount
}) => {
  let timeoutRef = useRef(null), contentRef = useRef(null), [maxHeight, setMaxHeight] = useState(DEFAULT_HEIGHT), [isCollapsed, setCollapsed] = useState(!0), [isChangingCollapse, setChangingCollapse] = useState(!1), [isUpdated, setIsUpdated] = useState(!1), settingsUpdatedTimeoutRef = useRef();
  useEffect(() => {
    let unsubscribe = internal_fullTestProviderStore.onSettingsChanged(() => {
      setIsUpdated(!0), clearTimeout(settingsUpdatedTimeoutRef.current), settingsUpdatedTimeoutRef.current = setTimeout(() => {
        setIsUpdated(!1);
      }, 1e3);
    });
    return () => {
      unsubscribe(), clearTimeout(settingsUpdatedTimeoutRef.current);
    };
  }, []), useEffect(() => {
    if (contentRef.current) {
      setMaxHeight(contentRef.current?.getBoundingClientRect().height || DEFAULT_HEIGHT);
      let resizeObserver = new ResizeObserver(() => {
        requestAnimationFrame(() => {
          if (contentRef.current && !isCollapsed) {
            let height = contentRef.current?.getBoundingClientRect().height || DEFAULT_HEIGHT;
            setMaxHeight(height);
          }
        });
      });
      return resizeObserver.observe(contentRef.current), () => resizeObserver.disconnect();
    }
  }, [isCollapsed]);
  let toggleCollapsed = useCallback((event, value) => {
    event?.stopPropagation(), setChangingCollapse(!0), setCollapsed((s2) => value ?? !s2), timeoutRef.current && clearTimeout(timeoutRef.current), timeoutRef.current = setTimeout(() => {
      setChangingCollapse(!1);
    }, 250);
  }, []), isRunning = Object.values(testProviderStates).some(
    (testProviderState) => testProviderState === "test-provider-state:running"
  ), isCrashed = Object.values(testProviderStates).some(
    (testProviderState) => testProviderState === "test-provider-state:crashed"
  ), hasTestProviders = Object.values(registeredTestProviders).length > 0;
  return useEffect(() => {
    isCrashed && isCollapsed && toggleCollapsed(void 0, !1);
  }, [isCrashed, isCollapsed, toggleCollapsed]), useDynamicFavicon(
    isCrashed ? "critical" : errorCount > 0 ? "negative" : warningCount > 0 ? "warning" : isRunning ? "active" : successCount > 0 ? "positive" : void 0
  ), !hasTestProviders && !errorCount && !warningCount ? null : react_default.createElement(
    HoverCard2,
    {
      id: "storybook-testing-module",
      "data-updated": isUpdated,
      outlineAnimation: isRunning ? "spin" : "none",
      outlineColor: isCrashed || isRunning && errorCount > 0 ? "negative" : isUpdated ? "positive" : void 0
    },
    react_default.createElement(Bar2, { ...hasTestProviders ? { onClick: (e2) => toggleCollapsed(e2) } : {} }, react_default.createElement(Action, null, hasTestProviders && react_default.createElement(
      Optional,
      {
        content: react_default.createElement(RunButton, { isRunning, onRunAll }, isRunning ? "Running..." : "Run tests"),
        fallback: react_default.createElement(RunButton, { isRunning, onRunAll })
      }
    )), react_default.createElement(Filters, null, hasTestProviders && react_default.createElement(
      CollapseToggle2,
      {
        onClick: (e2) => toggleCollapsed(e2),
        id: "testing-module-collapse-toggle",
        ariaLabel: isCollapsed ? "Expand testing module" : "Collapse testing module"
      },
      react_default.createElement(
        ChevronSmallUpIcon,
        {
          style: {
            transform: isCollapsed ? "none" : "rotate(180deg)",
            transition: "transform 250ms"
          }
        }
      )
    ), errorCount > 0 && react_default.createElement(
      StatusButton2,
      {
        id: "errors-found-filter",
        size: "medium",
        variant: "ghost",
        padding: errorCount < 10 ? "medium" : "small",
        status: "negative",
        pressed: errorsActive,
        onClick: (e2) => {
          e2.stopPropagation(), setErrorsActive(!errorsActive);
        },
        ariaLabel: `Filter main navigation to show ${errorCount} tests with errors`,
        tooltip: errorsActive ? "Clear test error filter" : `Filter sidebar to show ${errorCount} tests with errors`
      },
      errorCount < 1e3 ? errorCount : "999+"
    ), warningCount > 0 && react_default.createElement(
      StatusButton2,
      {
        id: "warnings-found-filter",
        size: "medium",
        variant: "ghost",
        padding: warningCount < 10 ? "medium" : "small",
        status: "warning",
        pressed: warningsActive,
        onClick: (e2) => {
          e2.stopPropagation(), setWarningsActive(!warningsActive);
        },
        ariaLabel: `Filter main navigation to show ${warningCount} tests with warnings`,
        tooltip: warningsActive ? "Clear test warning filter" : `Filter sidebar to show ${warningCount} tests with warnings`
      },
      warningCount < 1e3 ? warningCount : "999+"
    ), hasStatuses && react_default.createElement(
      ActionList.Button,
      {
        id: "clear-statuses",
        onClick: (e2) => {
          e2.stopPropagation(), clearStatuses();
        },
        disabled: isRunning,
        ariaLabel: isRunning ? "Can't clear statuses while tests are running" : "Clear all statuses"
      },
      react_default.createElement(SweepIcon, null)
    ))),
    hasTestProviders && react_default.createElement(
      Collapsible2,
      {
        "data-testid": "collapse",
        ...isCollapsed && { inert: "" },
        style: {
          transition: isChangingCollapse ? "max-height 250ms" : "max-height 0ms",
          display: hasTestProviders ? "block" : "none",
          maxHeight: isCollapsed ? 0 : maxHeight
        }
      },
      react_default.createElement(Content2, { ref: contentRef }, Object.values(registeredTestProviders).map((registeredTestProvider) => {
        let { render: Render, id } = registeredTestProvider;
        return Render ? react_default.createElement(TestProvider, { key: id, "data-module-id": id }, react_default.createElement(Render, null)) : (once.warn(
          `No render function found for test provider with id '${id}', skipping...`
        ), null);
      }))
    )
  );
};

// src/manager/components/sidebar/SidebarBottom.tsx
var SIDEBAR_BOTTOM_SPACER_ID = "sidebar-bottom-spacer", SIDEBAR_BOTTOM_WRAPPER_ID = "sidebar-bottom-wrapper", filterNone = () => !0, filterWarn = ({ statuses = {} }) => Object.values(statuses).some(({ value }) => value === "status-value:warning"), filterError = ({ statuses = {} }) => Object.values(statuses).some(({ value }) => value === "status-value:error"), filterBoth = ({ statuses = {} }) => Object.values(statuses).some(
  ({ value }) => ["status-value:warning", "status-value:error"].includes(value)
), getFilter = (warningsActive = !1, errorsActive = !1) => warningsActive && errorsActive ? filterBoth : warningsActive ? filterWarn : errorsActive ? filterError : filterNone, Spacer = styled.div({
  pointerEvents: "none"
}), Content3 = styled.div(({ theme }) => ({
  position: "absolute",
  zIndex: 1,
  bottom: 0,
  left: 0,
  right: 0,
  padding: 12,
  display: "flex",
  flexDirection: "column",
  gap: 12,
  color: theme.color.defaultText,
  fontSize: theme.typography.size.s1,
  "&:empty": {
    display: "none"
  },
  "--card-box-shadow": `0 1px 2px 0 rgba(0, 0, 0, 0.05), 0px -5px 20px 10px ${theme.background.app}`,
  // Integrators can use these to style their custom additions
  "--sb-sidebar-bottom-card-background": theme.background.content,
  "--sb-sidebar-bottom-card-border": `1px solid ${theme.appBorderColor}`,
  "--sb-sidebar-bottom-card-border-radius": `${theme.appBorderRadius + 1}px`,
  "--sb-sidebar-bottom-card-box-shadow": `0 1px 2px 0 rgba(0, 0, 0, 0.05), 0px -5px 20px 10px ${theme.background.app}`
})), SidebarBottomBase = ({
  api,
  notifications = [],
  errorCount,
  warningCount,
  successCount,
  hasStatuses,
  isDevelopment,
  testProviderStates,
  registeredTestProviders,
  onRunAll
}) => {
  let spacerRef = useRef(null), wrapperRef = useRef(null), [warningsActive, setWarningsActive] = useState(!1), [errorsActive, setErrorsActive] = useState(!1);
  return useEffect(() => {
    if (spacerRef.current && wrapperRef.current) {
      let resizeObserver = new ResizeObserver(() => {
        spacerRef.current && wrapperRef.current && (spacerRef.current.style.height = `${wrapperRef.current.scrollHeight}px`);
      });
      return resizeObserver.observe(wrapperRef.current), () => resizeObserver.disconnect();
    }
  }, []), useEffect(() => {
    let filter = getFilter(warningCount > 0 && warningsActive, errorCount > 0 && errorsActive);
    api.experimental_setFilter("sidebar-bottom-filter", filter);
  }, [api, warningCount, errorCount, warningsActive, errorsActive]), !warningCount && !errorCount && Object.values(registeredTestProviders).length === 0 && notifications.length === 0 ? null : react_default.createElement(Fragment, null, react_default.createElement(Spacer, { id: SIDEBAR_BOTTOM_SPACER_ID, ref: spacerRef }), react_default.createElement(Content3, { id: SIDEBAR_BOTTOM_WRAPPER_ID, ref: wrapperRef }, react_default.createElement(NotificationList, { notifications, clearNotification: api.clearNotification }), isDevelopment && react_default.createElement(
    TestingWidget,
    {
      registeredTestProviders,
      testProviderStates,
      onRunAll: () => {
        onRunAll(), setErrorsActive(!1), setWarningsActive(!1);
      },
      hasStatuses,
      clearStatuses: () => {
        internal_fullStatusStore.unset(), internal_fullTestProviderStore.clearAll(), setErrorsActive(!1), setWarningsActive(!1);
      },
      errorCount,
      errorsActive,
      setErrorsActive,
      warningCount,
      warningsActive,
      setWarningsActive,
      successCount
    }
  )));
}, SidebarBottom = ({ isDevelopment }) => {
  let api = useStorybookApi(), registeredTestProviders = api.getElements(Addon_TypesEnum.experimental_TEST_PROVIDER), { notifications } = useStorybookState(), { hasStatuses, errorCount, warningCount, successCount } = experimental_useStatusStore(
    (statuses) => Object.values(statuses).reduce(
      (result, storyStatuses) => (Object.values(storyStatuses).forEach((status) => {
        result.hasStatuses = !0, status.value === "status-value:error" && (result.errorCount += 1), status.value === "status-value:warning" && (result.warningCount += 1), status.value === "status-value:success" && (result.successCount += 1);
      }), result),
      { errorCount: 0, warningCount: 0, successCount: 0, hasStatuses: !1 }
    )
  ), testProviderStates = experimental_useTestProviderStore();
  return react_default.createElement(
    SidebarBottomBase,
    {
      api,
      notifications,
      hasStatuses,
      errorCount,
      warningCount,
      successCount,
      isDevelopment,
      testProviderStates,
      registeredTestProviders,
      onRunAll: internal_fullTestProviderStore.runAll
    }
  );
};

// src/manager/components/sidebar/TagsFilterPanel.tsx
var groupByType = (filters) => filters.reduce(
  (acc, filter) => (acc[filter.type] = acc[filter.type] || [], acc[filter.type].push(filter), acc),
  {}
), Wrapper5 = styled.div({
  minWidth: 240,
  maxWidth: 300,
  maxHeight: 15.5 * 32 + 8,
  // 15.5 items at 32px each + 8px padding
  overflow: "hidden",
  overflowY: "auto",
  scrollbarWidth: "thin"
}), MutedText = styled.span(({ theme }) => ({
  color: theme.textMutedColor
})), TagsFilterPanel = ({
  api,
  filtersById,
  includedFilters,
  excludedFilters,
  toggleFilter,
  setAllFilters,
  resetFilters,
  isDefaultSelection,
  hasDefaultSelection
}) => {
  let ref = useRef(null), renderLink = ({
    id,
    type,
    title: title2,
    icon,
    count
  }) => {
    let onToggle = (selected, excluded) => toggleFilter(id, selected, excluded), isIncluded = includedFilters.has(id), isExcluded = excludedFilters.has(id), isChecked = isIncluded || isExcluded, toggleLabel = `${type} filter: ${isExcluded ? `exclude ${title2}` : title2}`, toggleTooltip = `${isChecked ? "Remove" : "Add"} ${type} filter: ${title2}`, invertButtonLabel = `${isExcluded ? "Include" : "Exclude"} ${type}: ${title2}`;
    if (!(count === 0 && type === "built-in"))
      return {
        id: `filter-${type}-${id}`,
        content: react_default.createElement(ActionList.HoverItem, { targetId: `filter-${type}-${id}` }, react_default.createElement(ActionList.Action, { as: "label", ariaLabel: !1, tabIndex: -1, tooltip: toggleTooltip }, react_default.createElement(ActionList.Icon, null, isExcluded ? react_default.createElement(DeleteIcon, null) : isIncluded ? null : icon, react_default.createElement(
          Form.Checkbox,
          {
            checked: isChecked,
            onChange: () => onToggle(!isChecked),
            "data-tag": title2,
            "aria-label": toggleLabel
          }
        )), react_default.createElement(ActionList.Text, null, react_default.createElement("span", null, title2, isExcluded && react_default.createElement(MutedText, null, " (excluded)"))), isExcluded ? react_default.createElement("s", null, count) : react_default.createElement("span", null, count)), react_default.createElement(
          ActionList.Button,
          {
            "data-target-id": `filter-${type}-${id}`,
            ariaLabel: invertButtonLabel,
            onClick: () => onToggle(!0, !isExcluded)
          },
          react_default.createElement("span", { style: { minWidth: 45 } }, isExcluded ? "Include" : "Exclude")
        ))
      };
  }, groups = groupByType(Object.values(filtersById)), links = Object.values(groups).map(
    (group) => group.sort((a2, b2) => a2.id.localeCompare(b2.id)).map((filter) => renderLink(filter)).filter((value) => !!value)
  ).filter((value) => value.length > 0), hasItems = links.length > 0, hasUserTags = Object.values(filtersById).some(({ type }) => type === "tag"), isNothingSelectedYet = includedFilters.size === 0 && excludedFilters.size === 0;
  return react_default.createElement(Wrapper5, { ref }, hasItems && react_default.createElement(ActionList, { as: "div" }, react_default.createElement(ActionList.Item, { as: "div" }, isNothingSelectedYet ? react_default.createElement(
    ActionList.Button,
    {
      ariaLabel: !1,
      id: "select-all",
      key: "select-all",
      onClick: () => setAllFilters(!0)
    },
    react_default.createElement(BatchAcceptIcon, null),
    react_default.createElement(ActionList.Text, null, "Select all")
  ) : react_default.createElement(
    ActionList.Button,
    {
      ariaLabel: !1,
      id: "deselect-all",
      key: "deselect-all",
      onClick: () => setAllFilters(!1)
    },
    react_default.createElement(SweepIcon, null),
    react_default.createElement(ActionList.Text, null, "Clear filters")
  ), hasDefaultSelection && react_default.createElement(
    ActionList.Button,
    {
      id: "reset-filters",
      key: "reset-filters",
      onClick: resetFilters,
      ariaLabel: "Reset filters",
      tooltip: "Reset to default selection",
      disabled: isDefaultSelection
    },
    react_default.createElement(UndoIcon, null)
  ))), links.map((group) => react_default.createElement(ActionList, { key: group.map((link) => link.id).join("_") }, group.map((link) => react_default.createElement(Fragment, { key: link.id }, link.content)))), !hasUserTags && react_default.createElement(ActionList, { as: "div" }, react_default.createElement(ActionList.Item, { as: "div" }, react_default.createElement(
    ActionList.Link,
    {
      ariaLabel: !1,
      href: api.getDocsUrl({ subpath: "writing-stories/tags#custom-tags" }),
      target: "_blank"
    },
    react_default.createElement(ActionList.Icon, null, react_default.createElement(DocumentIcon, null)),
    react_default.createElement(ActionList.Text, null, react_default.createElement("span", null, "Learn how to add tags")),
    react_default.createElement(ActionList.Icon, null, react_default.createElement(ShareAltIcon, null))
  ))));
};

// src/manager/components/sidebar/TagsFilter.tsx
var TAGS_FILTER = "tags-filter", BUILT_IN_TAGS = /* @__PURE__ */ new Set([
  "dev",
  "test",
  "autodocs",
  "attached-mdx",
  "unattached-mdx",
  "play-fn",
  "test-fn"
]), StyledButton2 = styled(Button)(({ isHighlighted, theme }) => ({
  "&:focus-visible": {
    outlineOffset: 4
  },
  ...isHighlighted && {
    background: theme.background.hoverable,
    color: theme.color.secondary
  }
})), add = (set, id) => {
  let copy3 = new Set(set);
  return copy3.add(id), copy3;
}, remove = (set, id) => {
  let copy3 = new Set(set);
  return copy3.delete(id), copy3;
}, equal3 = (left, right) => left.size === right.size && (/* @__PURE__ */ new Set([...left, ...right])).size === left.size, TagSelected = styled(Badge)(({ theme }) => ({
  position: "absolute",
  top: 7,
  right: 7,
  transform: "translate(50%, -50%)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 3,
  height: 6,
  minWidth: 6,
  lineHeight: "px",
  boxShadow: `${theme.barSelectedColor} 0 0 0 1px inset`,
  fontSize: theme.typography.size.s1 - 1,
  background: theme.barSelectedColor,
  color: theme.color.inverseText
})), TagsFilter = ({ api, indexJson, tagPresets }) => {
  let filtersById = useMemo(() => {
    let userTagsCounts = Object.values(indexJson.entries).reduce(
      (acc, entry) => (entry.tags?.forEach((tag) => {
        BUILT_IN_TAGS.has(tag) || (acc[tag] = (acc[tag] || 0) + 1);
      }), acc),
      {}
    ), userFilters = Object.fromEntries(
      Object.entries(userTagsCounts).map(([tag, count]) => [tag, { id: tag, type: "tag", title: tag, count, filterFn: (entry, excluded) => excluded ? !entry.tags?.includes(tag) : !!entry.tags?.includes(tag) }])
    ), withCount = (filterFn) => ({
      count: Object.values(indexJson.entries).filter((entry) => filterFn(entry)).length,
      filterFn
    }), builtInFilters = {
      _docs: {
        id: "_docs",
        type: "built-in",
        title: "Documentation",
        icon: react_default.createElement(DocumentIcon, { color: color.gold }),
        ...withCount(
          (entry, excluded) => excluded ? entry.type !== "docs" : entry.type === "docs"
        )
      },
      _play: {
        id: "_play",
        type: "built-in",
        title: "Play",
        icon: react_default.createElement(PlayHollowIcon, { color: color.seafoam }),
        ...withCount(
          (entry, excluded) => excluded ? entry.type !== "story" || !entry.tags?.includes("play-fn") : entry.type === "story" && !!entry.tags?.includes("play-fn")
        )
      },
      _test: {
        id: "_test",
        type: "built-in",
        title: "Testing",
        icon: react_default.createElement(BeakerIcon, { color: color.green }),
        ...withCount(
          (entry, excluded) => excluded ? entry.type !== "story" || entry.subtype !== "test" : entry.type === "story" && entry.subtype === "test"
        )
      }
    };
    return { ...userFilters, ...builtInFilters };
  }, [indexJson.entries]), { defaultIncluded, defaultExcluded } = useMemo(() => Object.entries(tagPresets).reduce(
    (acc, [tag, { defaultFilterSelection }]) => (defaultFilterSelection === "include" ? acc.defaultIncluded.add(tag) : defaultFilterSelection === "exclude" && acc.defaultExcluded.add(tag), acc),
    { defaultIncluded: /* @__PURE__ */ new Set(), defaultExcluded: /* @__PURE__ */ new Set() }
  ), [tagPresets]), [includedFilters, setIncludedFilters] = useState(new Set(defaultIncluded)), [excludedFilters, setExcludedFilters] = useState(new Set(defaultExcluded)), [expanded, setExpanded] = useState(!1), tagsActive = includedFilters.size > 0 || excludedFilters.size > 0, resetFilters = useCallback(() => {
    setIncludedFilters(new Set(defaultIncluded)), setExcludedFilters(new Set(defaultExcluded));
  }, [defaultIncluded, defaultExcluded]);
  useEffect(resetFilters, [resetFilters]), useEffect(() => {
    api.experimental_setFilter(TAGS_FILTER, (item) => {
      let included = Object.values(
        groupByType(Array.from(includedFilters).map((id) => filtersById[id]))
      ), excluded = Object.values(
        groupByType(Array.from(excludedFilters).map((id) => filtersById[id]))
      );
      return (!included.length || included.every((group) => group.some(({ filterFn }) => filterFn(item, !1)))) && (!excluded.length || excluded.every((group) => group.every(({ filterFn }) => filterFn(item, !0))));
    });
  }, [api, includedFilters, excludedFilters, filtersById]);
  let toggleFilter = useCallback(
    (id, selected, excluded) => {
      excluded === !0 ? (setExcludedFilters(add(excludedFilters, id)), setIncludedFilters(remove(includedFilters, id))) : excluded === !1 || selected ? (setIncludedFilters(add(includedFilters, id)), setExcludedFilters(remove(excludedFilters, id))) : (setIncludedFilters(remove(includedFilters, id)), setExcludedFilters(remove(excludedFilters, id)));
    },
    [includedFilters, excludedFilters]
  ), setAllFilters = useCallback(
    (selected) => {
      setIncludedFilters(selected ? new Set(Object.keys(filtersById)) : /* @__PURE__ */ new Set()), setExcludedFilters(/* @__PURE__ */ new Set());
    },
    [filtersById]
  ), handleToggleExpand = useCallback(
    (event) => {
      event.preventDefault(), setExpanded(!expanded);
    },
    [expanded, setExpanded]
  );
  return react_default.createElement(
    PopoverProvider,
    {
      placement: "bottom",
      onVisibleChange: setExpanded,
      offset: 8,
      padding: 0,
      popover: () => react_default.createElement(
        TagsFilterPanel,
        {
          api,
          filtersById,
          includedFilters,
          excludedFilters,
          toggleFilter,
          setAllFilters,
          resetFilters,
          isDefaultSelection: equal3(includedFilters, defaultIncluded) && equal3(excludedFilters, defaultExcluded),
          hasDefaultSelection: defaultIncluded.size > 0 || defaultExcluded.size > 0
        }
      )
    },
    react_default.createElement(
      StyledButton2,
      {
        key: "tags",
        ariaLabel: "Tag filters",
        ariaDescription: "Filter the items shown in a sidebar based on the tags applied to them.",
        "aria-haspopup": "dialog",
        variant: "ghost",
        padding: "small",
        isHighlighted: tagsActive,
        onClick: handleToggleExpand
      },
      react_default.createElement(FilterIcon, null),
      includedFilters.size + excludedFilters.size > 0 && react_default.createElement(TagSelected, null)
    )
  );
};

// src/manager/components/sidebar/useLastViewed.ts
var import_store2 = __toESM(require_store2(), 1), save = debounce((value) => import_store2.default.set("lastViewedStoryIds", value), 1e3), useLastViewed = (selection) => {
  let initialLastViewedStoryIds = useMemo(() => {
    let items = import_store2.default.get("lastViewedStoryIds");
    return !items || !Array.isArray(items) ? [] : items.some((item) => typeof item == "object" && item.storyId && item.refId) ? items : [];
  }, [import_store2.default]), lastViewedRef = useRef(initialLastViewedStoryIds), updateLastViewed = useCallback(
    (story) => {
      let items = lastViewedRef.current, index = items.findIndex(
        ({ storyId, refId }) => storyId === story.storyId && refId === story.refId
      );
      index !== 0 && (index === -1 ? lastViewedRef.current = [story, ...items] : lastViewedRef.current = [story, ...items.slice(0, index), ...items.slice(index + 1)], save(lastViewedRef.current));
    },
    [lastViewedRef]
  );
  return useEffect(() => {
    selection && updateLastViewed(selection);
  }, [selection]), {
    getLastViewed: useCallback(() => lastViewedRef.current, [lastViewedRef]),
    clearLastViewed: useCallback(() => {
      lastViewedRef.current = lastViewedRef.current.slice(0, 1), save(lastViewedRef.current);
    }, [lastViewedRef])
  };
};

// src/manager/components/sidebar/Sidebar.tsx
var DEFAULT_REF_ID = "storybook_internal", Container7 = styled.nav(({ theme }) => ({
  position: "absolute",
  zIndex: 1,
  left: 0,
  top: 0,
  bottom: 0,
  right: 0,
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  background: theme.background.content,
  [MEDIA_DESKTOP_BREAKPOINT]: {
    background: theme.background.app
  }
})), Stack = styled.div({
  display: "flex",
  flexDirection: "column",
  gap: 16,
  padding: "16px 12px 20px 12px"
}), CreateNewStoryButton = styled(Button)(({ theme, isMobile: isMobile2 }) => ({
  color: theme.textMutedColor,
  width: isMobile2 ? 36 : 32,
  height: isMobile2 ? 36 : 32,
  borderRadius: theme.appBorderRadius + 2
})), Swap = react_default.memo(function({
  children,
  condition
}) {
  let [a2, b2] = react_default.Children.toArray(children);
  return react_default.createElement(react_default.Fragment, null, react_default.createElement("div", { style: { display: condition ? "block" : "none" } }, a2), react_default.createElement("div", { style: { display: condition ? "none" : "block" } }, b2));
}), useCombination = (index, indexError, previewInitialized, allStatuses, refs) => {
  let hash = useMemo(
    () => ({
      [DEFAULT_REF_ID]: {
        index,
        filteredIndex: index,
        indexError,
        previewInitialized,
        allStatuses,
        title: null,
        id: DEFAULT_REF_ID,
        url: "iframe.html"
      },
      ...refs
    }),
    [refs, index, indexError, previewInitialized, allStatuses]
  );
  return useMemo(() => ({ hash, entries: Object.entries(hash) }), [hash]);
}, isRendererReact = scope.STORYBOOK_RENDERER === "react", Sidebar = react_default.memo(function({
  // @ts-expect-error (non strict)
  storyId = null,
  refId = DEFAULT_REF_ID,
  index,
  indexJson,
  indexError,
  allStatuses,
  previewInitialized,
  menu,
  menuHighlighted = !1,
  enableShortcuts = !0,
  isDevelopment = scope.CONFIG_TYPE === "DEVELOPMENT",
  refs = {},
  onMenuClick,
  showCreateStoryButton = isDevelopment && isRendererReact
}) {
  let [isFileSearchModalOpen, setIsFileSearchModalOpen] = useState(!1), selected = useMemo(() => storyId && { storyId, refId }, [storyId, refId]), dataset = useCombination(index, indexError, previewInitialized, allStatuses, refs), isLoading = !index && !indexError, hasEntries = Object.keys(indexJson?.entries ?? {}).length > 0, lastViewedProps = useLastViewed(selected), { isMobile: isMobile2 } = useLayout(), api = useStorybookApi(), tagPresets = useMemo(
    () => Object.entries(scope.TAGS_OPTIONS ?? {}).reduce((acc, entry) => {
      let [tag, option] = entry;
      return acc[tag] = option, acc;
    }, {}),
    []
  );
  return react_default.createElement(Container7, { className: "container sidebar-container", "aria-label": "Global" }, react_default.createElement(ScrollArea, { vertical: !0, offset: 3, scrollbarSize: 6, scrollPadding: "4rem" }, react_default.createElement(Stack, null, react_default.createElement("div", null, react_default.createElement(
    Heading,
    {
      className: "sidebar-header",
      menuHighlighted,
      menu,
      skipLinkHref: "#storybook-preview-wrapper",
      isLoading,
      onMenuClick
    }
  ), !isLoading && scope.CONFIG_TYPE === "DEVELOPMENT" && react_default.createElement(ChecklistWidget, null)), react_default.createElement(
    Search,
    {
      dataset,
      enableShortcuts,
      searchBarContent: showCreateStoryButton && react_default.createElement(react_default.Fragment, null, react_default.createElement(
        CreateNewStoryButton,
        {
          isMobile: isMobile2,
          onClick: () => {
            setIsFileSearchModalOpen(!0);
          },
          ariaLabel: "Create a new story",
          variant: "outline",
          padding: "small"
        },
        react_default.createElement(PlusIcon, null)
      ), react_default.createElement(
        CreateNewStoryFileModal,
        {
          open: isFileSearchModalOpen,
          onOpenChange: setIsFileSearchModalOpen
        }
      )),
      searchFieldContent: indexJson && react_default.createElement(TagsFilter, { api, indexJson, tagPresets }),
      ...lastViewedProps
    },
    ({
      query,
      results,
      isBrowsing,
      closeMenu,
      getMenuProps,
      getItemProps,
      highlightedIndex
    }) => react_default.createElement(Swap, { condition: isBrowsing }, react_default.createElement(
      Explorer,
      {
        dataset,
        selected,
        isLoading,
        isBrowsing,
        hasEntries
      }
    ), react_default.createElement(
      SearchResults,
      {
        query,
        results,
        closeMenu,
        getMenuProps,
        getItemProps,
        highlightedIndex,
        enableShortcuts,
        isLoading,
        clearLastViewed: lastViewedProps.clearLastViewed
      }
    ))
  )), isMobile2 || isLoading ? null : react_default.createElement(SidebarBottom, { isDevelopment })));
});

// src/manager/container/Sidebar.tsx
var Sidebar3 = react_default.memo(function({ onMenuClick }) {
  return react_default.createElement(Consumer, { filter: ({ state, api }) => {
    let {
      ui: { name, url, enableShortcuts },
      viewMode,
      storyId,
      refId,
      layout: { showToolbar },
      // FIXME: This is the actual `index.json` index where the `index` below
      // is actually the stories hash. We should fix this up and make it consistent.
      internal_index,
      filteredIndex: index,
      indexError,
      previewInitialized,
      refs
    } = state, whatsNewNotificationsEnabled = state.whatsNewData?.status === "SUCCESS" && !state.disableWhatsNewNotifications;
    return {
      api,
      title: name,
      url,
      indexJson: internal_index,
      index,
      indexError,
      previewInitialized,
      refs,
      storyId,
      refId,
      viewMode,
      showToolbar,
      isPanelShown: api.getIsPanelShown(),
      isNavShown: api.getIsNavShown(),
      menuHighlighted: whatsNewNotificationsEnabled && api.isWhatsNewUnread(),
      enableShortcuts
    };
  } }, ({ api, showToolbar, isPanelShown, isNavShown, enableShortcuts, ...state }) => {
    let menu = useMenu({ api, showToolbar, isPanelShown, isNavShown, enableShortcuts }), allStatuses = experimental_useStatusStore();
    return react_default.createElement(
      Sidebar,
      {
        ...state,
        menu,
        onMenuClick,
        allStatuses,
        enableShortcuts
      }
    );
  });
}), Sidebar_default = Sidebar3;

// src/manager/App.tsx
var App = ({ managerLayoutState, setManagerLayoutState, pages, hasTab }) => {
  let { setMobileAboutOpen } = useLayout(), { enableShortcuts = !0 } = addons.getConfig();
  return useEffect(() => {
    document.body.setAttribute("data-shortcuts-enabled", enableShortcuts ? "true" : "false");
  }, [enableShortcuts]), useEffect(() => {
    let rootElement = document.getElementById("root");
    if (!rootElement)
      return;
    let observer = new MutationObserver(() => {
      let hasInert = rootElement.hasAttribute("inert");
      addons.getChannel().emit(core_events_default.MANAGER_INERT_ATTRIBUTE_CHANGED, hasInert);
    });
    return observer.observe(rootElement, {
      attributes: !0,
      attributeFilter: ["inert"]
    }), () => observer.disconnect();
  }, []), react_default.createElement(react_default.Fragment, null, react_default.createElement(Global, { styles: createGlobal }), react_default.createElement(
    Layout,
    {
      hasTab,
      managerLayoutState,
      setManagerLayoutState,
      slotMain: react_default.createElement(Preview_default, { id: "main", withLoader: !0 }),
      slotSidebar: react_default.createElement(Sidebar_default, { onMenuClick: () => setMobileAboutOpen((state) => !state) }),
      slotPanel: react_default.createElement(Panel_default, null),
      slotPages: pages.map(({ id, render: Content5 }) => react_default.createElement(Content5, { key: id }))
    }
  ));
};

// src/manager/provider.ts
var Provider2 = class {
  getElements(_type) {
    throw new Error("Provider.getElements() is not implemented!");
  }
  handleAPI(_api) {
    throw new Error("Provider.handleAPI() is not implemented!");
  }
  getConfig() {
    return console.error("Provider.getConfig() is not implemented!"), {};
  }
};

// src/manager/settings/About.tsx
var Container8 = styled.div({
  display: "flex",
  alignItems: "center",
  flexDirection: "column",
  marginTop: 40
}), Header = styled.header({
  marginBottom: 32,
  alignItems: "center",
  display: "flex",
  "> svg": {
    height: 48,
    width: "auto",
    marginRight: 8
  }
}), Footer = styled.div(({ theme }) => ({
  marginBottom: 24,
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  color: theme.base === "light" ? theme.color.dark : theme.color.lightest,
  fontWeight: theme.typography.weight.regular,
  fontSize: theme.typography.size.s2
})), Actions2 = styled.div({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  marginBottom: 24,
  marginTop: 24,
  gap: 16
}), StyledLink = styled(Link)(({ theme }) => ({
  "&&": {
    fontWeight: theme.typography.weight.bold,
    color: theme.base === "light" ? theme.color.dark : theme.color.light
  },
  "&:hover": {
    color: theme.base === "light" ? theme.color.darkest : theme.color.lightest
  }
})), AboutScreen = ({ onNavigateToWhatsNew }) => react_default.createElement(Container8, null, react_default.createElement(Header, null, react_default.createElement(StorybookLogo, { alt: "Storybook" })), react_default.createElement(UpgradeBlock, { onNavigateToWhatsNew }), react_default.createElement(Footer, null, react_default.createElement(Actions2, null, react_default.createElement(Button, { ariaLabel: !1, asChild: !0 }, react_default.createElement("a", { href: "https://github.com/storybookjs/storybook" }, react_default.createElement(GithubIcon, null), "GitHub")), react_default.createElement(Button, { ariaLabel: !1, asChild: !0 }, react_default.createElement("a", { href: "https://storybook.js.org/docs?ref=ui" }, react_default.createElement(DocumentIcon, { style: { display: "inline", marginRight: 5 } }), "Documentation"))), react_default.createElement("div", null, "Open source software maintained by", " ", react_default.createElement(StyledLink, { href: "https://www.chromatic.com/" }, "Chromatic"), " and the", " ", react_default.createElement(StyledLink, { href: "https://github.com/storybookjs/storybook/graphs/contributors" }, "Storybook Community"))));

// src/manager/settings/AboutPage.tsx
var NotificationClearer = class extends Component {
  componentDidMount() {
    let { api, notificationId } = this.props;
    api.clearNotification(notificationId);
  }
  render() {
    let { children } = this.props;
    return children;
  }
}, AboutPage = () => {
  let api = useStorybookApi(), state = useStorybookState(), onNavigateToWhatsNew = useCallback(() => {
    api.changeSettingsTab("whats-new");
  }, [api]);
  return react_default.createElement(NotificationClearer, { api, notificationId: "update" }, react_default.createElement(
    AboutScreen,
    {
      onNavigateToWhatsNew: state.whatsNewData?.status === "SUCCESS" ? onNavigateToWhatsNew : void 0
    }
  ));
};

// src/manager/components/Focus/Focus.tsx
var FocusOutline = styled.div(
  ({ theme, active = !1, outlineOffset = 0 }) => ({
    width: "100%",
    borderRadius: "inherit",
    transition: "outline-color var(--transition-duration, 0.2s)",
    outline: `2px solid ${active ? theme.color.secondary : "transparent"}`,
    outlineOffset
  })
), FocusProxy = styled(FocusOutline)(({ theme, targetId }) => ({
  [`&:has([data-target-id="${targetId}"]:focus-visible)`]: {
    outlineColor: theme.color.secondary
  }
})), FocusRing = ({
  active = !1,
  highlightDuration,
  nodeRef,
  ...props
}) => {
  let [visible, setVisible] = useState(active);
  return useEffect(() => {
    if (highlightDuration) {
      setVisible(active);
      let timeout = setTimeout(setVisible, highlightDuration, !1);
      return () => clearTimeout(timeout);
    }
  }, [active, highlightDuration]), react_default.createElement(FocusOutline, { ...props, active: highlightDuration ? visible : active, ref: nodeRef });
}, FocusTarget = ({
  targetHash,
  highlightDuration,
  ...props
}) => {
  let nodeRef = useRef(null), locationHash = useLocationHash(), [active, setActive] = useState(locationHash === targetHash);
  return useEffect(() => {
    let timeouts = [];
    return setActive(!1), locationHash === targetHash && (timeouts.push(
      setTimeout(() => {
        setActive(!0), nodeRef.current?.focus({ preventScroll: !0 }), nodeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      }, 0)
    ), highlightDuration && timeouts.push(setTimeout(setActive, highlightDuration, !1))), () => timeouts.forEach(clearTimeout);
  }, [locationHash, targetHash, highlightDuration]), react_default.createElement(FocusRing, { ...props, active, nodeRef, tabIndex: -1 });
}, Focus = {
  Outline: FocusOutline,
  Proxy: FocusProxy,
  Ring: FocusRing,
  Target: FocusTarget
};

// src/manager/settings/Checklist/Checklist.tsx
var Sections = styled.ol(({ theme }) => ({
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: 20,
  margin: 0,
  padding: 0,
  "& > li": {
    background: theme.background.content,
    border: `1px solid ${theme.base === "dark" ? theme.color.darker : theme.color.border}`,
    borderRadius: 8
  }
})), Items = styled.ol(({ theme }) => ({
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  margin: 0,
  padding: 0,
  "& > li:not(:last-child)": {
    boxShadow: `inset 0 -1px 0 ${theme.base === "dark" ? theme.color.darker : theme.color.border}`
  },
  "& > li:last-child": {
    borderBottomLeftRadius: 7,
    borderBottomRightRadius: 7
  }
})), SectionSummary = styled.div(
  ({ theme, progress, isCollapsed, onClick }) => ({
    position: "relative",
    fontWeight: "bold",
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "10px 10px 10px 15px",
    borderBottom: `5px solid ${theme.base === "dark" ? theme.color.darker : theme.color.light}`,
    borderBottomLeftRadius: isCollapsed ? 7 : 0,
    borderBottomRightRadius: isCollapsed ? 7 : 0,
    transition: "border-radius var(--transition-duration, 0.2s)",
    cursor: onClick ? "pointer" : "default",
    "--toggle-button-rotate": isCollapsed ? "0deg" : "180deg",
    "--toggle-button-opacity": 0,
    "&:hover, &:focus-visible": {
      outline: "none",
      "--toggle-button-opacity": 1
    },
    "&::after": {
      pointerEvents: "none",
      position: "absolute",
      top: 0,
      bottom: -5,
      left: 0,
      right: 0,
      content: '""',
      display: "block",
      width: `${progress}%`,
      borderBottom: `5px solid ${theme.color.positive}`,
      borderBottomLeftRadius: "inherit",
      borderBottomRightRadius: progress === 100 ? "inherit" : 0,
      transition: "width var(--transition-duration, 0.2s)"
    }
  })
), SectionHeading = styled.h2(({ theme }) => ({
  flex: 1,
  margin: 0,
  fontSize: theme.typography.size.s3,
  fontWeight: theme.typography.weight.bold
})), ItemSummary = styled.div(
  ({ theme, isCollapsed, onClick }) => ({
    fontWeight: theme.typography.weight.regular,
    fontSize: theme.typography.size.s2,
    display: "flex",
    alignItems: "center",
    minHeight: 40,
    gap: 10,
    padding: isCollapsed ? "6px 10px 6px 15px" : "10px 10px 10px 15px",
    transition: "padding var(--transition-duration, 0.2s)",
    cursor: onClick ? "pointer" : "default",
    "--toggle-button-rotate": isCollapsed ? "0deg" : "180deg",
    "&:focus-visible": {
      outline: "none"
    }
  })
), ItemHeading = styled.h3(({ theme, skipped }) => ({
  flex: 1,
  margin: 0,
  color: skipped ? theme.textMutedColor : theme.color.defaultText,
  overflow: "hidden",
  textOverflow: "ellipsis",
  whiteSpace: "nowrap",
  fontSize: theme.typography.size.s2,
  fontWeight: theme.typography.weight.bold
})), ItemContent2 = styled.div(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  alignItems: "flex-start",
  gap: 8,
  padding: "0 15px 15px 41px",
  fontSize: theme.typography.size.s2,
  code: {
    fontSize: "0.9em",
    backgroundColor: theme.background.app,
    borderRadius: theme.appBorderRadius,
    padding: "1px 3px"
  },
  img: {
    maxWidth: "100%",
    margin: "15px auto"
  },
  p: {
    margin: 0,
    lineHeight: 1.4
  },
  "ol, ul": {
    paddingLeft: 25,
    listStyleType: "disc",
    "li::marker": {
      color: theme.color.mediumdark
    }
  }
})), StatusIcon2 = styled.div(({ theme }) => ({
  position: "relative",
  flex: "0 0 auto",
  minHeight: 16,
  minWidth: 16,
  margin: 0,
  background: theme.base === "dark" ? theme.color.darkest : theme.background.app,
  borderRadius: 9,
  outline: `1px solid ${theme.base === "dark" ? theme.color.darker : theme.color.border}`,
  outlineOffset: -1
})), Checked2 = styled(StatusPassIcon)(
  ({ theme, "data-visible": visible }) => ({
    position: "absolute",
    width: "inherit",
    height: "inherit",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
    padding: 1,
    borderRadius: "50%",
    background: theme.color.positive,
    color: theme.background.content,
    opacity: visible ? 1 : 0,
    transform: visible ? "scale(1)" : "scale(0.7)",
    transition: "all var(--transition-duration, 0.2s)"
  })
), Skipped = styled.span(({ theme, visible }) => ({
  display: "flex",
  alignItems: "center",
  color: theme.textMutedColor,
  fontSize: "12px",
  fontWeight: "bold",
  overflow: "hidden",
  padding: visible ? "0 10px" : 0,
  opacity: visible ? 1 : 0,
  width: visible ? "auto" : 0,
  height: visible ? 18 : 16,
  transition: "all var(--transition-duration, 0.2s)"
})), Actions3 = styled.div({
  alignSelf: "flex-end",
  flexDirection: "row-reverse",
  display: "flex",
  gap: 4
}), ToggleButton2 = styled(Button)({
  opacity: "var(--toggle-button-opacity)",
  transition: "opacity var(--transition-duration, 0.2s)",
  "&:hover, &:focus": {
    opacity: 1
  },
  svg: {
    transform: "rotate(var(--toggle-button-rotate))",
    transition: "transform var(--transition-duration, 0.2s)"
  }
}), Checklist = ({
  availableItems,
  accept,
  skip,
  reset
}) => {
  let api = useStorybookApi(), locationHash = useLocationHash(), { itemsById, sectionsById } = useMemo(
    () => availableItems.reduce(
      (acc, item) => {
        acc.itemsById[item.id] = item;
        let { sectionId: id, sectionTitle: title2 } = item;
        return acc.sectionsById[id] = acc.sectionsById[id] ?? { id, title: title2, itemIds: [] }, acc.sectionsById[id].itemIds.push(item.id), acc;
      },
      { itemsById: {}, sectionsById: {} }
    ),
    [availableItems]
  ), sections = useMemo(
    () => Object.values(sectionsById).map(({ id, title: title2, itemIds }) => {
      let items = itemIds.map((id2) => itemsById[id2]), progress = items.reduce((acc, item) => item.isOpen ? acc : acc + 1, 0) / items.length * 100;
      return { id, title: title2, items, progress };
    }),
    [itemsById, sectionsById]
  );
  return react_default.createElement(Sections, null, sections.map(({ id, title: title2, items, progress }) => {
    let collapsed = progress === 100 && items.every((item) => item.id !== locationHash);
    return react_default.createElement("li", { key: id }, react_default.createElement(Focus.Proxy, { targetId: `toggle-${id}` }, react_default.createElement(
      Collapsible,
      {
        collapsed,
        summary: ({ isCollapsed, toggleCollapsed, toggleProps }) => react_default.createElement(
          SectionSummary,
          {
            progress,
            isCollapsed,
            onClick: toggleCollapsed
          },
          react_default.createElement(StatusIcon2, null, react_default.createElement(Checked2, { "data-visible": progress === 100 })),
          react_default.createElement(SectionHeading, null, title2),
          react_default.createElement(Actions3, null, react_default.createElement(
            ToggleButton2,
            {
              ...toggleProps,
              "data-target-id": `toggle-${id}`,
              variant: "ghost",
              padding: "small",
              "aria-label": title2
            },
            react_default.createElement(ChevronSmallDownIcon, null)
          ))
        )
      },
      react_default.createElement(Items, null, items.map(
        ({
          content,
          isOpen,
          isAccepted,
          isDone,
          isLockedBy,
          isImmutable,
          isSkipped,
          ...item
        }) => {
          let isChecked = isAccepted || isDone, isCollapsed = item.id !== locationHash, isLocked = !!isLockedBy, itemContent = content?.({ api });
          return react_default.createElement(ActionList.Item, { key: item.id }, react_default.createElement(
            Focus.Target,
            {
              targetHash: item.id,
              highlightDuration: 2e3,
              outlineOffset: -2
            },
            react_default.createElement(Focus.Proxy, { targetId: `toggle-${item.id}`, outlineOffset: -2 }, react_default.createElement(
              Collapsible,
              {
                collapsed: isCollapsed,
                summary: ({ isCollapsed: isCollapsed2, toggleCollapsed, toggleProps }) => react_default.createElement(
                  ItemSummary,
                  {
                    isCollapsed: isCollapsed2 || !itemContent,
                    onClick: itemContent ? toggleCollapsed : void 0
                  },
                  react_default.createElement(StatusIcon2, null, react_default.createElement(Checked2, { "data-visible": isChecked }), react_default.createElement(Skipped, { visible: isSkipped }, "Skipped")),
                  react_default.createElement(ItemHeading, { skipped: isSkipped }, item.label),
                  react_default.createElement(Actions3, null, itemContent && react_default.createElement(
                    ToggleButton2,
                    {
                      ...toggleProps,
                      "data-target-id": `toggle-${item.id}`,
                      variant: "ghost",
                      padding: "small",
                      ariaLabel: `${isCollapsed2 ? "Expand" : "Collapse"} ${item.label}`
                    },
                    react_default.createElement(ChevronSmallDownIcon, null)
                  ), isLocked && react_default.createElement(
                    Button,
                    {
                      variant: "ghost",
                      padding: "small",
                      ariaLabel: "Locked",
                      tooltip: `Complete \u201C${itemsById[isLockedBy].label}\u201D first`,
                      disabled: !0,
                      readOnly: !0
                    },
                    react_default.createElement(LockIcon, null)
                  ), isOpen && !isLocked && item.action && react_default.createElement(
                    Button,
                    {
                      ariaLabel: !1,
                      variant: "solid",
                      size: "small",
                      onClick: (e2) => {
                        e2.stopPropagation(), item.action?.onClick({
                          api,
                          accept: () => accept(item.id)
                        });
                      }
                    },
                    item.action.label
                  ), isOpen && !isLocked && !item.action && !item.subscribe && react_default.createElement(
                    Button,
                    {
                      ariaLabel: !1,
                      variant: "outline",
                      size: "small",
                      onClick: (e2) => {
                        e2.stopPropagation(), accept(item.id);
                      }
                    },
                    react_default.createElement(CheckIcon, null),
                    "Mark as complete"
                  ), isOpen && !isLocked && react_default.createElement(
                    Button,
                    {
                      ariaLabel: !1,
                      variant: "ghost",
                      size: "small",
                      onClick: (e2) => {
                        e2.stopPropagation(), skip(item.id);
                      }
                    },
                    "Skip"
                  ), (isAccepted && !isImmutable || isSkipped) && !isLocked && react_default.createElement(
                    Button,
                    {
                      ariaLabel: "Undo",
                      variant: "ghost",
                      padding: "small",
                      onClick: (e2) => {
                        e2.stopPropagation(), reset(item.id);
                      }
                    },
                    react_default.createElement(UndoIcon, null)
                  ))
                )
              },
              itemContent && react_default.createElement(ItemContent2, null, itemContent)
            ))
          ));
        }
      ))
    )));
  }));
};

// src/manager/settings/GuidePage.tsx
var Container9 = styled.div(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  maxWidth: 600,
  margin: "0 auto",
  padding: "48px 20px",
  gap: 32,
  fontSize: theme.typography.size.s2,
  "--transition-duration": "0.2s"
})), Intro = styled.div(({ theme }) => ({
  display: "flex",
  flexDirection: "column",
  gap: 8,
  "& h1": {
    fontSize: theme.typography.size.m3,
    fontWeight: theme.typography.weight.bold,
    margin: 0
  },
  "& > p": {
    margin: 0
  }
})), GuidePage = () => {
  let checklist = useChecklist();
  return react_default.createElement(Container9, null, react_default.createElement(Intro, null, react_default.createElement("h1", null, "Guide"), react_default.createElement("p", null, "Whether you're just getting started or looking for ways to level up, this checklist will help you make the most of your Storybook.")), react_default.createElement(Checklist, { ...checklist }), checklist.openItems.length === 0 ? react_default.createElement("center", null, "Your work here is done!") : checklist.widget.disable || checklist.openItems.every((item) => item.isMuted) ? react_default.createElement("center", null, "Want to see this in the sidebar?", " ", react_default.createElement(Link, { onClick: () => checklist.disable(!1) }, "Show in sidebar")) : react_default.createElement("center", null, "Don't want to see this in the sidebar?", " ", react_default.createElement(Link, { onClick: () => checklist.mute(checklist.allItems.map(({ id }) => id)) }, "Remove from sidebar")));
};

// src/manager/settings/SettingsFooter.tsx
var Footer2 = styled.div(({ theme }) => ({
  display: "flex",
  paddingTop: 20,
  marginTop: 20,
  borderTop: `1px solid ${theme.appBorderColor}`,
  fontWeight: theme.typography.weight.bold,
  "& > * + *": {
    marginLeft: 20
  }
})), SettingsFooter = (props) => react_default.createElement(Footer2, { ...props }, react_default.createElement(Link, { secondary: !0, href: "https://storybook.js.org?ref=ui", cancel: !1, target: "_blank" }, "Docs"), react_default.createElement(Link, { secondary: !0, href: "https://github.com/storybookjs/storybook", cancel: !1, target: "_blank" }, "GitHub"), react_default.createElement(
  Link,
  {
    secondary: !0,
    href: "https://storybook.js.org/community?ref=ui#support",
    cancel: !1,
    target: "_blank"
  },
  "Support"
)), SettingsFooter_default = SettingsFooter;

// src/manager/settings/shortcuts.tsx
var Header2 = styled.header(({ theme }) => ({
  marginBottom: 20,
  fontSize: theme.typography.size.m3,
  fontWeight: theme.typography.weight.bold,
  alignItems: "center",
  display: "flex"
})), HeaderItem = styled.div(({ theme }) => ({
  fontWeight: theme.typography.weight.bold
})), GridHeaderRow = styled.div({
  alignSelf: "flex-end",
  display: "grid",
  margin: "10px 0",
  gridTemplateColumns: "1fr 1fr 12px",
  "& > *:last-of-type": {
    gridColumn: "2 / 2",
    justifySelf: "flex-end",
    gridRow: "1"
  }
}), Row = styled.div(({ theme }) => ({
  padding: "6px 0",
  borderTop: `1px solid ${theme.appBorderColor}`,
  display: "grid",
  gridTemplateColumns: "1fr 1fr 0px"
})), GridWrapper = styled.div({
  display: "grid",
  gridTemplateColumns: "1fr",
  gridAutoRows: "minmax(auto, auto)",
  marginBottom: 20
}), Description = styled.div({
  alignSelf: "center"
}), TextInput = styled(Form.Input)(
  ({ valid, theme }) => valid === "error" ? {
    animation: `${theme.animation.jiggle} 700ms ease-out`
  } : {},
  {
    display: "flex",
    width: 80,
    flexDirection: "column",
    justifySelf: "flex-end",
    paddingLeft: 4,
    paddingRight: 4,
    textAlign: "center"
  }
), Fade = keyframes`
0%,100% { opacity: 0; }
  50% { opacity: 1; }
`, SuccessIcon = styled(CheckIcon)(
  ({ valid, theme }) => valid === "valid" ? {
    color: theme.color.positive,
    animation: `${Fade} 2s ease forwards`
  } : {
    opacity: 0
  },
  {
    alignSelf: "center",
    display: "flex",
    marginLeft: 10,
    height: 14,
    width: 14
  }
), Container10 = styled.div(({ theme }) => ({
  fontSize: theme.typography.size.s2,
  padding: "3rem 20px",
  maxWidth: 600,
  margin: "0 auto"
})), shortcutLabels = {
  fullScreen: "Go full screen",
  togglePanel: "Toggle addons",
  panelPosition: "Toggle addons orientation",
  toggleNav: "Toggle sidebar",
  toolbar: "Toggle toolbar",
  search: "Focus search",
  focusNav: "Focus sidebar",
  focusIframe: "Focus canvas",
  focusPanel: "Focus addons",
  prevComponent: "Previous component",
  nextComponent: "Next component",
  prevStory: "Previous story",
  nextStory: "Next story",
  shortcutsPage: "Go to shortcuts page",
  aboutPage: "Go to about page",
  collapseAll: "Collapse all items on sidebar",
  expandAll: "Expand all items on sidebar",
  remount: "Reload story",
  openInEditor: "Open story in editor",
  copyStoryLink: "Copy story link to clipboard"
  // TODO: bring this back once we want to add shortcuts for this
  // copyStoryName: 'Copy story name to clipboard',
}, fixedShortcuts = ["escape"];
function toShortcutState(shortcutKeys) {
  return Object.entries(shortcutKeys).reduce(
    // @ts-expect-error (non strict)
    (acc, [feature, shortcut]) => fixedShortcuts.includes(feature) ? acc : { ...acc, [feature]: { shortcut, error: !1 } },
    {}
  );
}
var ShortcutsScreen = class extends Component {
  constructor(props) {
    super(props);
    this.onKeyDown = (e2) => {
      let { activeFeature, shortcutKeys } = this.state;
      if (e2.key === "Backspace")
        return this.restoreDefault();
      let shortcut = eventToShortcut(e2);
      if (!shortcut)
        return !1;
      let normalizedShortcut = shortcut.map(
        (key) => Array.isArray(key) ? key.at(-1) : key
      ), error = !!Object.entries(shortcutKeys).find(
        ([feature, { shortcut: existingShortcut }]) => feature !== activeFeature && existingShortcut && shortcutMatchesShortcut(normalizedShortcut, existingShortcut)
      );
      return this.setState({
        shortcutKeys: { ...shortcutKeys, [activeFeature]: { shortcut: normalizedShortcut, error } }
      });
    };
    this.onFocus = (focusedInput) => () => {
      let { shortcutKeys } = this.state;
      this.setState({
        activeFeature: focusedInput,
        shortcutKeys: {
          ...shortcutKeys,
          [focusedInput]: { shortcut: null, error: !1 }
        }
      });
    };
    this.onBlur = async () => {
      let { shortcutKeys, activeFeature } = this.state;
      if (shortcutKeys[activeFeature]) {
        let { shortcut, error } = shortcutKeys[activeFeature];
        return !shortcut || error ? this.restoreDefault() : this.saveShortcut();
      }
      return !1;
    };
    this.saveShortcut = async () => {
      let { activeFeature, shortcutKeys } = this.state, { setShortcut } = this.props;
      await setShortcut(activeFeature, shortcutKeys[activeFeature].shortcut), this.setState({ successField: activeFeature });
    };
    this.restoreDefaults = async () => {
      let { restoreAllDefaultShortcuts } = this.props, defaultShortcuts = await restoreAllDefaultShortcuts();
      return this.setState({ shortcutKeys: toShortcutState(defaultShortcuts) });
    };
    this.restoreDefault = async () => {
      let { activeFeature, shortcutKeys } = this.state, { restoreDefaultShortcut } = this.props, defaultShortcut = await restoreDefaultShortcut(activeFeature);
      return this.setState({
        shortcutKeys: {
          ...shortcutKeys,
          ...toShortcutState({ [activeFeature]: defaultShortcut })
        }
      });
    };
    this.displaySuccessMessage = (activeElement) => {
      let { successField, shortcutKeys } = this.state;
      return activeElement === successField && shortcutKeys[activeElement].error === !1 ? "valid" : void 0;
    };
    this.displayError = (activeElement) => {
      let { activeFeature, shortcutKeys } = this.state;
      return activeElement === activeFeature && shortcutKeys[activeElement].error === !0 ? "error" : void 0;
    };
    this.renderKeyInput = () => {
      let { shortcutKeys, addonsShortcutLabels } = this.state;
      return Object.entries(shortcutKeys).filter(
        ([feature]) => shortcutLabels[feature] !== void 0 || addonsShortcutLabels && addonsShortcutLabels[feature]
      ).map(([feature, { shortcut }]) => react_default.createElement(Row, { key: feature }, react_default.createElement(Description, null, shortcutLabels[feature] || addonsShortcutLabels[feature]), react_default.createElement(
        TextInput,
        {
          spellCheck: "false",
          valid: this.displayError(feature),
          className: "modalInput",
          onBlur: this.onBlur,
          onFocus: this.onFocus(feature),
          onKeyDown: this.onKeyDown,
          value: shortcut ? shortcutToHumanString(shortcut) : "",
          placeholder: "Type keys",
          readOnly: !0
        }
      ), react_default.createElement(SuccessIcon, { valid: this.displaySuccessMessage(feature) })));
    };
    this.renderKeyForm = () => react_default.createElement(GridWrapper, null, react_default.createElement(GridHeaderRow, null, react_default.createElement(HeaderItem, null, "Commands"), react_default.createElement(HeaderItem, null, "Shortcut")), this.renderKeyInput());
    this.state = {
      // @ts-expect-error (non strict)
      activeFeature: void 0,
      // @ts-expect-error (non strict)
      successField: void 0,
      // The initial shortcutKeys that come from props are the defaults/what was saved
      // As the user interacts with the page, the state stores the temporary, unsaved shortcuts
      // This object also includes the error attached to each shortcut
      // @ts-expect-error (non strict)
      shortcutKeys: toShortcutState(props.shortcutKeys),
      addonsShortcutLabels: props.addonsShortcutLabels
    };
  }
  render() {
    let layout = this.renderKeyForm();
    return react_default.createElement(Container10, null, react_default.createElement(Header2, null, "Keyboard shortcuts"), layout, react_default.createElement(
      Button,
      {
        ariaLabel: !1,
        variant: "outline",
        size: "small",
        id: "restoreDefaultsHotkeys",
        onClick: this.restoreDefaults
      },
      "Restore defaults"
    ), react_default.createElement(SettingsFooter_default, null));
  }
};

// src/manager/settings/ShortcutsPage.tsx
var ShortcutsPage = () => react_default.createElement(Consumer, null, ({
  api: {
    getShortcutKeys,
    getAddonsShortcutLabels,
    setShortcut,
    restoreDefaultShortcut,
    restoreAllDefaultShortcuts
  }
}) => react_default.createElement(
  ShortcutsScreen,
  {
    shortcutKeys: getShortcutKeys(),
    addonsShortcutLabels: getAddonsShortcutLabels(),
    setShortcut,
    restoreDefaultShortcut,
    restoreAllDefaultShortcuts
  }
));

// src/manager/settings/whats_new.tsx
var Centered = styled.div({
  top: "50%",
  position: "absolute",
  transform: "translateY(-50%)",
  width: "100%",
  textAlign: "center"
}), LoaderWrapper2 = styled.div({
  position: "relative",
  height: "32px"
}), Message2 = styled.div(({ theme }) => ({
  paddingTop: "12px",
  color: theme.textMutedColor,
  maxWidth: "295px",
  margin: "0 auto",
  fontSize: `${theme.typography.size.s1}px`,
  lineHeight: "16px"
})), Container11 = styled.div(({ theme }) => ({
  position: "absolute",
  width: "100%",
  height: 40,
  bottom: 0,
  background: theme.background.bar,
  fontSize: theme.typography.size.s2,
  borderTop: `1px solid ${theme.color.border}`,
  padding: "0 10px 0 15px",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between"
})), WhatsNewFooter = ({
  isNotificationsEnabled,
  onToggleNotifications,
  onCopyLink
}) => {
  let theme = useTheme(), [copyText, setCopyText] = useState("Copy Link"), copyLink = () => {
    onCopyLink(), setCopyText("Copied!"), setTimeout(() => setCopyText("Copy Link"), 4e3);
  };
  return react_default.createElement(Container11, null, react_default.createElement("div", { style: { display: "flex", alignItems: "center", gap: 10 } }, react_default.createElement(HeartIcon, { color: theme.color.mediumdark }), react_default.createElement("div", null, "Share this with your team."), react_default.createElement(Button, { ariaLabel: !1, onClick: copyLink, size: "small", variant: "ghost" }, copyText)), isNotificationsEnabled ? react_default.createElement(Button, { ariaLabel: !1, size: "small", variant: "ghost", onClick: onToggleNotifications }, react_default.createElement(EyeCloseIcon, null), "Hide notifications") : react_default.createElement(Button, { ariaLabel: !1, size: "small", variant: "ghost", onClick: onToggleNotifications }, react_default.createElement(EyeIcon, null), "Show notifications"));
}, Iframe = styled.iframe(
  {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    border: 0,
    margin: 0,
    padding: 0,
    width: "100%",
    height: "calc(100% - 40px)",
    background: "white"
  },
  ({ isLoaded }) => ({ visibility: isLoaded ? "visible" : "hidden" })
), AlertIcon2 = styled(((props) => react_default.createElement(AlertIcon, { ...props })))(({ theme }) => ({
  color: theme.textMutedColor,
  width: 32,
  height: 32,
  margin: "0 auto"
})), WhatsNewLoader = () => react_default.createElement(Centered, null, react_default.createElement(LoaderWrapper2, null, react_default.createElement(Loader, null)), react_default.createElement(Message2, null, "Loading...")), MaxWaitTimeMessaging = () => react_default.createElement(Centered, null, react_default.createElement(AlertIcon2, null), react_default.createElement(Message2, null, "The page couldn't be loaded. Check your internet connection and try again.")), PureWhatsNewScreen = ({
  didHitMaxWaitTime,
  isLoaded,
  onLoad,
  url,
  onCopyLink,
  onToggleNotifications,
  isNotificationsEnabled
}) => react_default.createElement(Fragment, null, !isLoaded && !didHitMaxWaitTime && react_default.createElement(WhatsNewLoader, null), didHitMaxWaitTime ? react_default.createElement(MaxWaitTimeMessaging, null) : react_default.createElement(react_default.Fragment, null, react_default.createElement(Iframe, { isLoaded, onLoad, src: url, title: "What's new?" }), react_default.createElement(
  WhatsNewFooter,
  {
    isNotificationsEnabled,
    onToggleNotifications,
    onCopyLink
  }
))), MAX_WAIT_TIME = 1e4, WhatsNewScreen = () => {
  let api = useStorybookApi(), state = useStorybookState(), { whatsNewData } = state, [isLoaded, setLoaded] = useState(!1), [didHitMaxWaitTime, setDidHitMaxWaitTime] = useState(!1);
  if (useEffect(() => {
    let timer = setTimeout(() => !isLoaded && setDidHitMaxWaitTime(!0), MAX_WAIT_TIME);
    return () => clearTimeout(timer);
  }, [isLoaded]), whatsNewData?.status !== "SUCCESS")
    return null;
  let isNotificationsEnabled = !whatsNewData.disableWhatsNewNotifications;
  return react_default.createElement(
    PureWhatsNewScreen,
    {
      didHitMaxWaitTime,
      isLoaded,
      onLoad: () => {
        api.whatsNewHasBeenRead(), setLoaded(!0);
      },
      url: whatsNewData.url,
      isNotificationsEnabled,
      onCopyLink: () => {
        navigator.clipboard?.writeText(whatsNewData.blogUrl ?? whatsNewData.url);
      },
      onToggleNotifications: () => {
        isNotificationsEnabled ? scope.confirm("All update notifications will no longer be shown. Are you sure?") && api.toggleWhatsNewNotifications() : api.toggleWhatsNewNotifications();
      }
    }
  );
};

// src/manager/settings/whats_new_page.tsx
var WhatsNewPage = () => react_default.createElement(WhatsNewScreen, null);

// src/manager/settings/index.tsx
var { document: document9 } = scope, Content4 = styled(ScrollArea)(({ theme }) => ({
  background: theme.background.content
})), RouteWrapper = ({ children, path }) => react_default.createElement(Content4, { vertical: !0, horizontal: !1 }, react_default.createElement(Route, { path }, children)), Pages = ({ changeTab, onClose, enableShortcuts = !0, enableWhatsNew }) => {
  react_default.useEffect(() => {
    let handleEscape = (event) => {
      !enableShortcuts || event.repeat || matchesModifiers(!1, event) && matchesKeyCode("Escape", event) && (event.preventDefault(), onClose());
    };
    return document9.addEventListener("keydown", handleEscape), () => document9.removeEventListener("keydown", handleEscape);
  }, [enableShortcuts, onClose]);
  let tabs = useMemo(() => {
    let tabsToInclude = [
      {
        id: "about",
        title: "About",
        children: react_default.createElement(RouteWrapper, { path: "about" }, react_default.createElement(AboutPage, { key: "about" }))
      }
    ];
    return scope.CONFIG_TYPE === "DEVELOPMENT" && tabsToInclude.push({
      id: "guide",
      title: "Guide",
      children: react_default.createElement(RouteWrapper, { path: "guide" }, react_default.createElement(GuidePage, { key: "guide" }))
    }), tabsToInclude.push({
      id: "shortcuts",
      title: "Keyboard shortcuts",
      children: react_default.createElement(RouteWrapper, { path: "shortcuts" }, react_default.createElement(ShortcutsPage, { key: "shortcuts" }))
    }), enableWhatsNew && tabsToInclude.push({
      id: "whats-new",
      title: "What's new?",
      children: react_default.createElement(RouteWrapper, { path: "whats-new" }, react_default.createElement(WhatsNewPage, { key: "whats-new" }))
    }), tabsToInclude;
  }, [enableWhatsNew]);
  return react_default.createElement(Location, null, ({ path }) => {
    let selected = tabs.find((tab) => path.includes(`settings/${tab.id}`))?.id;
    return react_default.createElement(
      TabsView,
      {
        tabs,
        tools: react_default.createElement(
          Button,
          {
            padding: "small",
            variant: "ghost",
            onClick: (e2) => (e2.preventDefault(), onClose()),
            ariaLabel: "Close settings page"
          },
          react_default.createElement(CloseIcon, null)
        ),
        selected,
        onSelectionChange: changeTab
      }
    );
  });
}, SettingsPages = () => {
  let api = useStorybookApi(), state = useStorybookState(), changeTab = (tab) => api.changeSettingsTab(tab);
  return react_default.createElement(
    Pages,
    {
      enableWhatsNew: state.whatsNewData?.status === "SUCCESS",
      enableShortcuts: state.ui.enableShortcuts,
      changeTab,
      onClose: api.closeSettings
    }
  );
}, settingsPageAddon = {
  id: "settings",
  url: "/settings/",
  title: "Settings",
  type: types.experimental_PAGE,
  render: () => react_default.createElement(Route, { path: "/settings/", startsWith: !0 }, react_default.createElement(SettingsPages, null))
};

// src/manager/index.tsx
ThemeProvider.displayName = "ThemeProvider";
q.displayName = "HelmetProvider";
var Root3 = ({ provider }) => react_default.createElement(q, { key: "helmet.Provider" }, react_default.createElement(LocationProvider, { key: "location.provider" }, react_default.createElement(Main, { provider }))), Main = ({ provider }) => {
  let navigate = useNavigate();
  return react_default.createElement(Location, { key: "location.consumer" }, (locationData) => react_default.createElement(
    Provider,
    {
      key: "manager",
      provider,
      ...locationData,
      navigate,
      docsOptions: scope?.DOCS_OPTIONS || {}
    },
    (combo) => {
      let { state, api } = combo, setManagerLayoutState = useCallback(
        (sizes) => {
          api.setSizes(sizes);
        },
        [api]
      ), pages = useMemo(
        () => [settingsPageAddon, ...Object.values(api.getElements(types.experimental_PAGE))],
        [Object.keys(api.getElements(types.experimental_PAGE)).join()]
      );
      return react_default.createElement(ThemeProvider, { key: "theme.provider", theme: ensure(state.theme) }, react_default.createElement(LayoutProvider, null, react_default.createElement(
        App,
        {
          key: "app",
          pages,
          managerLayoutState: {
            ...state.layout,
            viewMode: state.viewMode
          },
          hasTab: !!api.getQueryParam("tab"),
          setManagerLayoutState
        }
      )));
    }
  ));
};
function renderStorybookUI(domNode, provider) {
  if (!(provider instanceof Provider2))
    throw new ProviderDoesNotExtendBaseProviderError();
  createRoot(domNode).render(react_default.createElement(Root3, { key: "root", provider }));
}

// src/manager/runtime.tsx
var WS_DISCONNECTED_NOTIFICATION_ID = "CORE/WS_DISCONNECTED";
addons.register(
  TOOLBAR_ID,
  () => addons.add(TOOLBAR_ID, {
    title: TOOLBAR_ID,
    type: types.TOOL,
    match: ({ tabId }) => !tabId,
    render: () => react_default.createElement(ToolbarManager, null)
  })
);
var ReactProvider = class extends Provider2 {
  constructor() {
    super();
    this.wsDisconnected = !1;
    let channel = createBrowserChannel({ page: "manager" });
    addons.setChannel(channel), channel.emit(CHANNEL_CREATED), this.addons = addons, this.channel = channel, scope.__STORYBOOK_ADDONS_CHANNEL__ = channel;
  }
  getElements(type) {
    return this.addons.getElements(type);
  }
  getConfig() {
    return this.addons.getConfig();
  }
  handleAPI(api) {
    this.addons.loadAddons(api), this.channel.on(CHANNEL_WS_DISCONNECT, (ev) => {
      this.wsDisconnected = !0, api.addNotification({
        id: WS_DISCONNECTED_NOTIFICATION_ID,
        content: {
          headline: ev.code === 3008 ? "Server timed out" : "Connection lost",
          subHeadline: "Please restart your Storybook server and reload the page"
        },
        icon: react_default.createElement(FailedIcon, { color: color.negative }),
        link: void 0
      });
    });
  }
}, { document: document10 } = scope, rootEl = document10.getElementById("root");
setTimeout(() => {
  renderStorybookUI(rootEl, new ReactProvider());
}, 0);

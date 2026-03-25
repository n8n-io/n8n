import {
  getControlId,
  getControlSetterButtonId
} from "./_browser-chunks/chunk-CYSK6WYR.js";
import {
  EmptyBlock,
  Source,
  curriedDarken$1,
  curriedLighten$1,
  curriedOpacify$1,
  curriedTransparentize$1,
  rgba
} from "./_browser-chunks/chunk-DDRHE7EB.js";
import {
  __commonJS,
  __require,
  __toESM
} from "./_browser-chunks/chunk-A242L54C.js";

// ../../node_modules/memoizerific/memoizerific.js
var require_memoizerific = __commonJS({
  "../../node_modules/memoizerific/memoizerific.js"(exports, module) {
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
      return (function e2(t, n2, r2) {
        function s2(o3, u2) {
          if (!n2[o3]) {
            if (!t[o3]) {
              var a2 = typeof __require == "function" && __require;
              if (!u2 && a2) return a2(o3, !0);
              if (i2) return i2(o3, !0);
              var f2 = new Error("Cannot find module '" + o3 + "'");
              throw f2.code = "MODULE_NOT_FOUND", f2;
            }
            var l2 = n2[o3] = { exports: {} };
            t[o3][0].call(l2.exports, function(e3) {
              var n3 = t[o3][1][e3];
              return s2(n3 || e3);
            }, l2, l2.exports, e2, t, n2, r2);
          }
          return n2[o3].exports;
        }
        for (var i2 = typeof __require == "function" && __require, o2 = 0; o2 < r2.length; o2++) s2(r2[o2]);
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
            var memoizerific = function() {
              var currentCache = cache, newMap, fnResult, argsLengthMinusOne = arguments.length - 1, lruPath = Array(argsLengthMinusOne + 1), isMemoized = !0, i2;
              if ((memoizerific.numArgs || memoizerific.numArgs === 0) && memoizerific.numArgs !== argsLengthMinusOne + 1)
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
              }, isMemoized ? moveToMostRecentLru(lru, lruPath) : lru.push(lruPath), lru.length > limit && removeCachedResult(lru.shift())), memoizerific.wasMemoized = isMemoized, memoizerific.numArgs = argsLengthMinusOne + 1, fnResult;
            };
            return memoizerific.limit = limit, memoizerific.wasMemoized = !1, memoizerific.cache = cache, memoizerific.lru = lru, memoizerific;
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

// src/blocks/components/ArgsTable/ArgsTable.tsx
import React23 from "react";
import { once } from "storybook/internal/client-logger";
import { Button as Button5, Link as Link3, ResetWrapper } from "storybook/internal/components";
import { includeConditionalArg } from "storybook/internal/csf";
import { DocumentIcon as DocumentIcon2, UndoIcon } from "@storybook/icons";

// ../../node_modules/es-toolkit/dist/predicate/isPrimitive.mjs
function isPrimitive(value2) {
  return value2 == null || typeof value2 != "object" && typeof value2 != "function";
}

// ../../node_modules/es-toolkit/dist/predicate/isTypedArray.mjs
function isTypedArray(x2) {
  return ArrayBuffer.isView(x2) && !(x2 instanceof DataView);
}

// ../../node_modules/es-toolkit/dist/compat/_internal/getSymbols.mjs
function getSymbols(object2) {
  return Object.getOwnPropertySymbols(object2).filter((symbol) => Object.prototype.propertyIsEnumerable.call(object2, symbol));
}

// ../../node_modules/es-toolkit/dist/compat/_internal/getTag.mjs
function getTag(value2) {
  return value2 == null ? value2 === void 0 ? "[object Undefined]" : "[object Null]" : Object.prototype.toString.call(value2);
}

// ../../node_modules/es-toolkit/dist/compat/_internal/tags.mjs
var regexpTag = "[object RegExp]", stringTag = "[object String]", numberTag = "[object Number]", booleanTag = "[object Boolean]", argumentsTag = "[object Arguments]", symbolTag = "[object Symbol]", dateTag = "[object Date]", mapTag = "[object Map]", setTag = "[object Set]", arrayTag = "[object Array]";
var arrayBufferTag = "[object ArrayBuffer]", objectTag = "[object Object]";
var dataViewTag = "[object DataView]", uint8ArrayTag = "[object Uint8Array]", uint8ClampedArrayTag = "[object Uint8ClampedArray]", uint16ArrayTag = "[object Uint16Array]", uint32ArrayTag = "[object Uint32Array]";
var int8ArrayTag = "[object Int8Array]", int16ArrayTag = "[object Int16Array]", int32ArrayTag = "[object Int32Array]";
var float32ArrayTag = "[object Float32Array]", float64ArrayTag = "[object Float64Array]";

// ../../node_modules/es-toolkit/dist/object/cloneDeepWith.mjs
function cloneDeepWithImpl(valueToClone, keyToClone, objectToClone, stack = /* @__PURE__ */ new Map(), cloneValue = void 0) {
  let cloned = cloneValue?.(valueToClone, keyToClone, objectToClone, stack);
  if (cloned !== void 0)
    return cloned;
  if (isPrimitive(valueToClone))
    return valueToClone;
  if (stack.has(valueToClone))
    return stack.get(valueToClone);
  if (Array.isArray(valueToClone)) {
    let result = new Array(valueToClone.length);
    stack.set(valueToClone, result);
    for (let i2 = 0; i2 < valueToClone.length; i2++)
      result[i2] = cloneDeepWithImpl(valueToClone[i2], i2, objectToClone, stack, cloneValue);
    return Object.hasOwn(valueToClone, "index") && (result.index = valueToClone.index), Object.hasOwn(valueToClone, "input") && (result.input = valueToClone.input), result;
  }
  if (valueToClone instanceof Date)
    return new Date(valueToClone.getTime());
  if (valueToClone instanceof RegExp) {
    let result = new RegExp(valueToClone.source, valueToClone.flags);
    return result.lastIndex = valueToClone.lastIndex, result;
  }
  if (valueToClone instanceof Map) {
    let result = /* @__PURE__ */ new Map();
    stack.set(valueToClone, result);
    for (let [key, value2] of valueToClone)
      result.set(key, cloneDeepWithImpl(value2, key, objectToClone, stack, cloneValue));
    return result;
  }
  if (valueToClone instanceof Set) {
    let result = /* @__PURE__ */ new Set();
    stack.set(valueToClone, result);
    for (let value2 of valueToClone)
      result.add(cloneDeepWithImpl(value2, void 0, objectToClone, stack, cloneValue));
    return result;
  }
  if (typeof Buffer < "u" && Buffer.isBuffer(valueToClone))
    return valueToClone.subarray();
  if (isTypedArray(valueToClone)) {
    let result = new (Object.getPrototypeOf(valueToClone)).constructor(valueToClone.length);
    stack.set(valueToClone, result);
    for (let i2 = 0; i2 < valueToClone.length; i2++)
      result[i2] = cloneDeepWithImpl(valueToClone[i2], i2, objectToClone, stack, cloneValue);
    return result;
  }
  if (valueToClone instanceof ArrayBuffer || typeof SharedArrayBuffer < "u" && valueToClone instanceof SharedArrayBuffer)
    return valueToClone.slice(0);
  if (valueToClone instanceof DataView) {
    let result = new DataView(valueToClone.buffer.slice(0), valueToClone.byteOffset, valueToClone.byteLength);
    return stack.set(valueToClone, result), copyProperties(result, valueToClone, objectToClone, stack, cloneValue), result;
  }
  if (typeof File < "u" && valueToClone instanceof File) {
    let result = new File([valueToClone], valueToClone.name, {
      type: valueToClone.type
    });
    return stack.set(valueToClone, result), copyProperties(result, valueToClone, objectToClone, stack, cloneValue), result;
  }
  if (typeof Blob < "u" && valueToClone instanceof Blob) {
    let result = new Blob([valueToClone], { type: valueToClone.type });
    return stack.set(valueToClone, result), copyProperties(result, valueToClone, objectToClone, stack, cloneValue), result;
  }
  if (valueToClone instanceof Error) {
    let result = new valueToClone.constructor();
    return stack.set(valueToClone, result), result.message = valueToClone.message, result.name = valueToClone.name, result.stack = valueToClone.stack, result.cause = valueToClone.cause, copyProperties(result, valueToClone, objectToClone, stack, cloneValue), result;
  }
  if (valueToClone instanceof Boolean) {
    let result = new Boolean(valueToClone.valueOf());
    return stack.set(valueToClone, result), copyProperties(result, valueToClone, objectToClone, stack, cloneValue), result;
  }
  if (valueToClone instanceof Number) {
    let result = new Number(valueToClone.valueOf());
    return stack.set(valueToClone, result), copyProperties(result, valueToClone, objectToClone, stack, cloneValue), result;
  }
  if (valueToClone instanceof String) {
    let result = new String(valueToClone.valueOf());
    return stack.set(valueToClone, result), copyProperties(result, valueToClone, objectToClone, stack, cloneValue), result;
  }
  if (typeof valueToClone == "object" && isCloneableObject(valueToClone)) {
    let result = Object.create(Object.getPrototypeOf(valueToClone));
    return stack.set(valueToClone, result), copyProperties(result, valueToClone, objectToClone, stack, cloneValue), result;
  }
  return valueToClone;
}
function copyProperties(target, source, objectToClone = target, stack, cloneValue) {
  let keys = [...Object.keys(source), ...getSymbols(source)];
  for (let i2 = 0; i2 < keys.length; i2++) {
    let key = keys[i2], descriptor = Object.getOwnPropertyDescriptor(target, key);
    (descriptor == null || descriptor.writable) && (target[key] = cloneDeepWithImpl(source[key], key, objectToClone, stack, cloneValue));
  }
}
function isCloneableObject(object2) {
  switch (getTag(object2)) {
    case argumentsTag:
    case arrayTag:
    case arrayBufferTag:
    case dataViewTag:
    case booleanTag:
    case dateTag:
    case float32ArrayTag:
    case float64ArrayTag:
    case int8ArrayTag:
    case int16ArrayTag:
    case int32ArrayTag:
    case mapTag:
    case numberTag:
    case objectTag:
    case regexpTag:
    case setTag:
    case stringTag:
    case symbolTag:
    case uint8ArrayTag:
    case uint8ClampedArrayTag:
    case uint16ArrayTag:
    case uint32ArrayTag:
      return !0;
    default:
      return !1;
  }
}

// ../../node_modules/es-toolkit/dist/object/cloneDeep.mjs
function cloneDeep(obj) {
  return cloneDeepWithImpl(obj, void 0, obj, /* @__PURE__ */ new Map(), void 0);
}

// ../../node_modules/es-toolkit/dist/object/pickBy.mjs
function pickBy(obj, shouldPick) {
  let result = {}, keys = Object.keys(obj);
  for (let i2 = 0; i2 < keys.length; i2++) {
    let key = keys[i2], value2 = obj[key];
    shouldPick(value2, key) && (result[key] = value2);
  }
  return result;
}

// ../../node_modules/es-toolkit/dist/string/words.mjs
var CASE_SPLIT_PATTERN = new RegExp("\\p{Lu}?\\p{Ll}+|[0-9]+|\\p{Lu}+(?!\\p{Ll})|\\p{Emoji_Presentation}|\\p{Extended_Pictographic}|\\p{L}+", "gu");

// src/blocks/components/ArgsTable/ArgsTable.tsx
import { styled as styled18 } from "storybook/theming";

// src/blocks/components/ArgsTable/ArgRow.tsx
import React19, { useState as useState8 } from "react";
import { codeCommon as codeCommon3 } from "storybook/internal/components";

// ../../node_modules/markdown-to-jsx/dist/index.modern.js
import * as e from "react";
function n() {
  return n = Object.assign ? Object.assign.bind() : function(e2) {
    for (var n2 = 1; n2 < arguments.length; n2++) {
      var r2 = arguments[n2];
      for (var t in r2) Object.prototype.hasOwnProperty.call(r2, t) && (e2[t] = r2[t]);
    }
    return e2;
  }, n.apply(this, arguments);
}
var r = ["children", "options"];
var o = ["allowFullScreen", "allowTransparency", "autoComplete", "autoFocus", "autoPlay", "cellPadding", "cellSpacing", "charSet", "classId", "colSpan", "contentEditable", "contextMenu", "crossOrigin", "encType", "formAction", "formEncType", "formMethod", "formNoValidate", "formTarget", "frameBorder", "hrefLang", "inputMode", "keyParams", "keyType", "marginHeight", "marginWidth", "maxLength", "mediaGroup", "minLength", "noValidate", "radioGroup", "readOnly", "rowSpan", "spellCheck", "srcDoc", "srcLang", "srcSet", "tabIndex", "useMap"].reduce((e2, n2) => (e2[n2.toLowerCase()] = n2, e2), { class: "className", for: "htmlFor" }), a = { amp: "&", apos: "'", gt: ">", lt: "<", nbsp: "\xA0", quot: "\u201C" }, c = ["style", "script", "pre"], i = ["src", "href", "data", "formAction", "srcDoc", "action"], u = /([-A-Z0-9_:]+)(?:\s*=\s*(?:(?:"((?:\\.|[^"])*)")|(?:'((?:\\.|[^'])*)')|(?:\{((?:\\.|{[^}]*?}|[^}])*)\})))?/gi, l = /\n{2,}$/, s = /^(\s*>[\s\S]*?)(?=\n\n|$)/, f = /^ *> ?/gm, _ = /^(?:\[!([^\]]*)\]\n)?([\s\S]*)/, d = /^ {2,}\n/, p = /^(?:([-*_])( *\1){2,}) *(?:\n *)+\n/, y = /^(?: {1,3})?(`{3,}|~{3,}) *(\S+)? *([^\n]*?)?\n([\s\S]*?)(?:\1\n?|$)/, h = /^(?: {4}[^\n]+\n*)+(?:\n *)+\n?/, g = /^(`+)((?:\\`|(?!\1)`|[^`])+)\1/, m = /^(?:\n *)*\n/, k = /\r\n?/g, x = /^\[\^([^\]]+)](:(.*)((\n+ {4,}.*)|(\n(?!\[\^).+))*)/, q = /^\[\^([^\]]+)]/, v = /\f/g, b = /^---[ \t]*\n(.|\n)*\n---[ \t]*\n/, $ = /^\s*?\[(x|\s)\]/, S = /^ *(#{1,6}) *([^\n]+?)(?: +#*)?(?:\n *)*(?:\n|$)/, z = /^ *(#{1,6}) +([^\n]+?)(?: +#*)?(?:\n *)*(?:\n|$)/, E = /^([^\n]+)\n *(=|-)\2{2,} *\n/, A = /^ *(?!<[a-z][^ >/]* ?\/>)<([a-z][^ >/]*) ?((?:[^>]*[^/])?)>\n?(\s*(?:<\1[^>]*?>[\s\S]*?<\/\1>|(?!<\1\b)[\s\S])*?)<\/\1>(?!<\/\1>)\n*/i, R = /&([a-z0-9]+|#[0-9]{1,6}|#x[0-9a-fA-F]{1,6});/gi, B = /^<!--[\s\S]*?(?:-->)/, L = /^(data|aria|x)-[a-z_][a-z\d_.-]*$/, O = /^ *<([a-z][a-z0-9:]*)(?:\s+((?:<.*?>|[^>])*))?\/?>(?!<\/\1>)(\s*\n)?/i, j = /^\{.*\}$/, C = /^(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/, I = /^<([^ >]+[:@\/][^ >]+)>/, T = /-([a-z])?/gi, M = /^(\|.*)\n(?: *(\|? *[-:]+ *\|[-| :]*)\n((?:.*\|.*\n)*))?\n?/, w = /^[^\n]+(?:  \n|\n{2,})/, D = /^\[([^\]]*)\]:\s+<?([^\s>]+)>?\s*("([^"]*)")?/, F = /^!\[([^\]]*)\] ?\[([^\]]*)\]/, P = /^\[([^\]]*)\] ?\[([^\]]*)\]/, Z = /(\n|^[-*]\s|^#|^ {2,}|^-{2,}|^>\s)/, N = /\t/g, G = /(^ *\||\| *$)/g, U = /^ *:-+: *$/, V = /^ *:-+ *$/, H = /^ *-+: *$/, Q = (e2) => `(?=[\\s\\S]+?\\1${e2 ? "\\1" : ""})`, W = "((?:\\[.*?\\][([].*?[)\\]]|<.*?>(?:.*?<.*?>)?|`.*?`|\\\\\\1|[\\s\\S])+?)", J = RegExp(`^([*_])\\1${Q(1)}${W}\\1\\1(?!\\1)`), K = RegExp(`^([*_])${Q(0)}${W}\\1(?!\\1)`), X = RegExp(`^(==)${Q(0)}${W}\\1`), Y = RegExp(`^(~~)${Q(0)}${W}\\1`), ee = /^(:[a-zA-Z0-9-_]+:)/, ne = /^\\([^0-9A-Za-z\s])/, re = /\\([^0-9A-Za-z\s])/g, te = /^[\s\S](?:(?!  \n|[0-9]\.|http)[^=*_~\-\n:<`\\\[!])*/, oe = /^\n+/, ae = /^([ \t]*)/, ce = /(?:^|\n)( *)$/, ie = "(?:\\d+\\.)", ue = "(?:[*+-])";
function le(e2) {
  return "( *)(" + (e2 === 1 ? ie : ue) + ") +";
}
var se = le(1), fe = le(2);
function _e(e2) {
  return RegExp("^" + (e2 === 1 ? se : fe));
}
var de = _e(1), pe = _e(2);
function ye(e2) {
  return RegExp("^" + (e2 === 1 ? se : fe) + "[^\\n]*(?:\\n(?!\\1" + (e2 === 1 ? ie : ue) + " )[^\\n]*)*(\\n|$)", "gm");
}
var he = ye(1), ge = ye(2);
function me(e2) {
  let n2 = e2 === 1 ? ie : ue;
  return RegExp("^( *)(" + n2 + ") [\\s\\S]+?(?:\\n{2,}(?! )(?!\\1" + n2 + " (?!" + n2 + " ))\\n*|\\s*\\n*$)");
}
var ke = me(1), xe = me(2);
function qe(e2, n2) {
  let r2 = n2 === 1, t = r2 ? ke : xe, o2 = r2 ? he : ge, a2 = r2 ? de : pe;
  return { t: (e3) => a2.test(e3), o: je(function(e3, n3) {
    let r3 = ce.exec(n3.prevCapture);
    return r3 && (n3.list || !n3.inline && !n3.simple) ? t.exec(e3 = r3[1] + e3) : null;
  }), i: 1, u(e3, n3, t2) {
    let c2 = r2 ? +e3[2] : void 0, i2 = e3[0].replace(l, `
`).match(o2), u2 = !1;
    return { items: i2.map(function(e4, r3) {
      let o3 = a2.exec(e4)[0].length, c3 = RegExp("^ {1," + o3 + "}", "gm"), l2 = e4.replace(c3, "").replace(a2, ""), s2 = r3 === i2.length - 1, f2 = l2.indexOf(`

`) !== -1 || s2 && u2;
      u2 = f2;
      let _2 = t2.inline, d2 = t2.list, p2;
      t2.list = !0, f2 ? (t2.inline = !1, p2 = Se(l2) + `

`) : (t2.inline = !0, p2 = Se(l2));
      let y2 = n3(p2, t2);
      return t2.inline = _2, t2.list = d2, y2;
    }), ordered: r2, start: c2 };
  }, l: (n3, r3, t2) => e2(n3.ordered ? "ol" : "ul", { key: t2.key, start: n3.type === "20" ? n3.start : void 0 }, n3.items.map(function(n4, o3) {
    return e2("li", { key: o3 }, r3(n4, t2));
  })) };
}
var ve = RegExp(`^\\[((?:\\[[^\\[\\]]*(?:\\[[^\\[\\]]*\\][^\\[\\]]*)*\\]|[^\\[\\]])*)\\]\\(\\s*<?((?:\\([^)]*\\)|[^\\s\\\\]|\\\\.)*?)>?(?:\\s+['"]([\\s\\S]*?)['"])?\\s*\\)`), be = /^!\[(.*?)\]\( *((?:\([^)]*\)|[^() ])*) *"?([^)"]*)?"?\)/;
function $e(e2) {
  return typeof e2 == "string";
}
function Se(e2) {
  let n2 = e2.length;
  for (; n2 > 0 && e2[n2 - 1] <= " "; ) n2--;
  return e2.slice(0, n2);
}
function ze(e2, n2) {
  return e2.startsWith(n2);
}
function Ee(e2, n2, r2) {
  if (Array.isArray(r2)) {
    for (let n3 = 0; n3 < r2.length; n3++) if (ze(e2, r2[n3])) return !0;
    return !1;
  }
  return r2(e2, n2);
}
function Ae(e2) {
  return e2.replace(/[ÀÁÂÃÄÅàáâãäåæÆ]/g, "a").replace(/[çÇ]/g, "c").replace(/[ðÐ]/g, "d").replace(/[ÈÉÊËéèêë]/g, "e").replace(/[ÏïÎîÍíÌì]/g, "i").replace(/[Ññ]/g, "n").replace(/[øØœŒÕõÔôÓóÒò]/g, "o").replace(/[ÜüÛûÚúÙù]/g, "u").replace(/[ŸÿÝý]/g, "y").replace(/[^a-z0-9- ]/gi, "").replace(/ /gi, "-").toLowerCase();
}
function Re(e2) {
  return H.test(e2) ? "right" : U.test(e2) ? "center" : V.test(e2) ? "left" : null;
}
function Be(e2, n2, r2, t) {
  let o2 = r2.inTable;
  r2.inTable = !0;
  let a2 = [[]], c2 = "";
  function i2() {
    if (!c2) return;
    let e3 = a2[a2.length - 1];
    e3.push.apply(e3, n2(c2, r2)), c2 = "";
  }
  return e2.trim().split(/(`[^`]*`|\\\||\|)/).filter(Boolean).forEach((e3, n3, r3) => {
    e3.trim() === "|" && (i2(), t) ? n3 !== 0 && n3 !== r3.length - 1 && a2.push([]) : c2 += e3;
  }), i2(), r2.inTable = o2, a2;
}
function Le(e2, n2, r2) {
  r2.inline = !0;
  let t = e2[2] ? e2[2].replace(G, "").split("|").map(Re) : [], o2 = e2[3] ? (function(e3, n3, r3) {
    return e3.trim().split(`
`).map(function(e4) {
      return Be(e4, n3, r3, !0);
    });
  })(e2[3], n2, r2) : [], a2 = Be(e2[1], n2, r2, !!o2.length);
  return r2.inline = !1, o2.length ? { align: t, cells: o2, header: a2, type: "25" } : { children: a2, type: "21" };
}
function Oe(e2, n2) {
  return e2.align[n2] == null ? {} : { textAlign: e2.align[n2] };
}
function je(e2) {
  return e2.inline = 1, e2;
}
function Ce(e2) {
  return je(function(n2, r2) {
    return r2.inline ? e2.exec(n2) : null;
  });
}
function Ie(e2) {
  return je(function(n2, r2) {
    return r2.inline || r2.simple ? e2.exec(n2) : null;
  });
}
function Te(e2) {
  return function(n2, r2) {
    return r2.inline || r2.simple ? null : e2.exec(n2);
  };
}
function Me(e2) {
  return je(function(n2) {
    return e2.exec(n2);
  });
}
var we = /(javascript|vbscript|data(?!:image)):/i;
function De(e2) {
  try {
    let n2 = decodeURIComponent(e2).replace(/[^A-Za-z0-9/:]/g, "");
    if (we.test(n2)) return null;
  } catch {
    return null;
  }
  return e2;
}
function Fe(e2) {
  return e2 && e2.replace(re, "$1");
}
function Pe(e2, n2, r2) {
  let t = r2.inline || !1, o2 = r2.simple || !1;
  r2.inline = !0, r2.simple = !0;
  let a2 = e2(n2, r2);
  return r2.inline = t, r2.simple = o2, a2;
}
function Ze(e2, n2, r2) {
  let t = r2.inline || !1, o2 = r2.simple || !1;
  r2.inline = !1, r2.simple = !0;
  let a2 = e2(n2, r2);
  return r2.inline = t, r2.simple = o2, a2;
}
function Ne(e2, n2, r2) {
  let t = r2.inline || !1;
  r2.inline = !1;
  let o2 = e2(n2, r2);
  return r2.inline = t, o2;
}
var Ge = (e2, n2, r2) => ({ children: Pe(n2, e2[2], r2) });
function Ue() {
  return {};
}
function Ve() {
  return null;
}
function He(...e2) {
  return e2.filter(Boolean).join(" ");
}
function Qe(e2, n2, r2) {
  let t = e2, o2 = n2.split(".");
  for (; o2.length && (t = t[o2[0]], t !== void 0); ) o2.shift();
  return t || r2;
}
function We(r2 = "", t = {}) {
  t.overrides = t.overrides || {}, t.namedCodesToUnicode = t.namedCodesToUnicode ? n({}, a, t.namedCodesToUnicode) : a;
  let l2 = t.slugify || Ae, G2 = t.sanitizer || De, U2 = t.createElement || e.createElement, V2 = [s, y, h, t.enforceAtxHeadings ? z : S, E, M, ke, xe], H4 = [...V2, w, A, B, O];
  function Q2(e2, n2) {
    for (let r3 = 0; r3 < e2.length; r3++) if (e2[r3].test(n2)) return !0;
    return !1;
  }
  function W2(e2, r3, ...o2) {
    let a2 = Qe(t.overrides, e2 + ".props", {});
    return U2((function(e3, n2) {
      let r4 = Qe(n2, e3);
      return r4 ? typeof r4 == "function" || typeof r4 == "object" && "render" in r4 ? r4 : Qe(n2, e3 + ".component", e3) : e3;
    })(e2, t.overrides), n({}, r3, a2, { className: He(r3?.className, a2.className) || void 0 }), ...o2);
  }
  function re2(e2) {
    e2 = e2.replace(b, "");
    let n2 = !1;
    t.forceInline ? n2 = !0 : t.forceBlock || (n2 = Z.test(e2) === !1);
    let r3 = fe2(se2(n2 ? e2 : Se(e2).replace(oe, "") + `

`, { inline: n2 }));
    for (; $e(r3[r3.length - 1]) && !r3[r3.length - 1].trim(); ) r3.pop();
    if (t.wrapper === null) return r3;
    let o2 = t.wrapper || (n2 ? "span" : "div"), a2;
    if (r3.length > 1 || t.forceWrapper) a2 = r3;
    else {
      if (r3.length === 1) return a2 = r3[0], typeof a2 == "string" ? W2("span", { key: "outer" }, a2) : a2;
      a2 = null;
    }
    return U2(o2, { key: "outer" }, a2);
  }
  function ce2(e2, n2) {
    if (!n2 || !n2.trim()) return null;
    let r3 = n2.match(u);
    return r3 ? r3.reduce(function(n3, r4) {
      let t2 = r4.indexOf("=");
      if (t2 !== -1) {
        let a2 = (function(e3) {
          return e3.indexOf("-") !== -1 && e3.match(L) === null && (e3 = e3.replace(T, function(e4, n4) {
            return n4.toUpperCase();
          })), e3;
        })(r4.slice(0, t2)).trim(), c2 = (function(e3) {
          let n4 = e3[0];
          return (n4 === '"' || n4 === "'") && e3.length >= 2 && e3[e3.length - 1] === n4 ? e3.slice(1, -1) : e3;
        })(r4.slice(t2 + 1).trim()), u2 = o[a2] || a2;
        if (u2 === "ref") return n3;
        let l3 = n3[u2] = (function(e3, n4, r5, t3) {
          return n4 === "style" ? (function(e4) {
            let n5 = [], r6 = "", t4 = !1, o2 = !1, a3 = "";
            if (!e4) return n5;
            for (let c4 = 0; c4 < e4.length; c4++) {
              let i2 = e4[c4];
              if (i2 !== '"' && i2 !== "'" || t4 || (o2 ? i2 === a3 && (o2 = !1, a3 = "") : (o2 = !0, a3 = i2)), i2 === "(" && r6.endsWith("url") ? t4 = !0 : i2 === ")" && t4 && (t4 = !1), i2 !== ";" || o2 || t4) r6 += i2;
              else {
                let e5 = r6.trim();
                if (e5) {
                  let r7 = e5.indexOf(":");
                  if (r7 > 0) {
                    let t5 = e5.slice(0, r7).trim(), o3 = e5.slice(r7 + 1).trim();
                    n5.push([t5, o3]);
                  }
                }
                r6 = "";
              }
            }
            let c3 = r6.trim();
            if (c3) {
              let e5 = c3.indexOf(":");
              if (e5 > 0) {
                let r7 = c3.slice(0, e5).trim(), t5 = c3.slice(e5 + 1).trim();
                n5.push([r7, t5]);
              }
            }
            return n5;
          })(r5).reduce(function(n5, [r6, o2]) {
            return n5[r6.replace(/(-[a-z])/g, (e4) => e4[1].toUpperCase())] = t3(o2, e3, r6), n5;
          }, {}) : i.indexOf(n4) !== -1 ? t3(Fe(r5), e3, n4) : (r5.match(j) && (r5 = Fe(r5.slice(1, r5.length - 1))), r5 === "true" || r5 !== "false" && r5);
        })(e2, a2, c2, G2);
        typeof l3 == "string" && (A.test(l3) || O.test(l3)) && (n3[u2] = re2(l3.trim()));
      } else r4 !== "style" && (n3[o[r4] || r4] = !0);
      return n3;
    }, {}) : null;
  }
  let ie2 = [], ue2 = {}, le2 = { 0: { t: [">"], o: Te(s), i: 1, u(e2, n2, r3) {
    let [, t2, o2] = e2[0].replace(f, "").match(_);
    return { alert: t2, children: n2(o2, r3) };
  }, l(e2, n2, r3) {
    let t2 = { key: r3.key };
    return e2.alert && (t2.className = "markdown-alert-" + l2(e2.alert.toLowerCase(), Ae), e2.children.unshift({ attrs: {}, children: [{ type: "27", text: e2.alert }], noInnerParse: !0, type: "11", tag: "header" })), W2("blockquote", t2, n2(e2.children, r3));
  } }, 1: { t: ["  "], o: Me(d), i: 1, u: Ue, l: (e2, n2, r3) => W2("br", { key: r3.key }) }, 2: { t: ["--", "__", "**", "- ", "* ", "_ "], o: Te(p), i: 1, u: Ue, l: (e2, n2, r3) => W2("hr", { key: r3.key }) }, 3: { t: ["    "], o: Te(h), i: 0, u: (e2) => ({ lang: void 0, text: Fe(Se(e2[0].replace(/^ {4}/gm, ""))) }), l: (e2, r3, t2) => W2("pre", { key: t2.key }, W2("code", n({}, e2.attrs, { className: e2.lang ? "lang-" + e2.lang : "" }), e2.text)) }, 4: { t: ["```", "~~~"], o: Te(y), i: 0, u: (e2) => ({ attrs: ce2("code", e2[3] || ""), lang: e2[2] || void 0, text: e2[4], type: "3" }) }, 5: { t: ["`"], o: Ie(g), i: 3, u: (e2) => ({ text: Fe(e2[2]) }), l: (e2, n2, r3) => W2("code", { key: r3.key }, e2.text) }, 6: { t: ["[^"], o: Te(x), i: 0, u: (e2) => (ie2.push({ footnote: e2[2], identifier: e2[1] }), {}), l: Ve }, 7: { t: ["[^"], o: Ce(q), i: 1, u: (e2) => ({ target: "#" + l2(e2[1], Ae), text: e2[1] }), l: (e2, n2, r3) => W2("a", { key: r3.key, href: G2(e2.target, "a", "href") }, W2("sup", { key: r3.key }, e2.text)) }, 8: { t: ["[ ]", "[x]"], o: Ce($), i: 1, u: (e2) => ({ completed: e2[1].toLowerCase() === "x" }), l: (e2, n2, r3) => W2("input", { checked: e2.completed, key: r3.key, readOnly: !0, type: "checkbox" }) }, 9: { t: ["#"], o: Te(t.enforceAtxHeadings ? z : S), i: 1, u: (e2, n2, r3) => ({ children: Pe(n2, e2[2], r3), id: l2(e2[2], Ae), level: e2[1].length }), l: (e2, n2, r3) => W2("h" + e2.level, { id: e2.id, key: r3.key }, n2(e2.children, r3)) }, 10: { t: (e2) => {
    let n2 = e2.indexOf(`
`);
    return n2 > 0 && n2 < e2.length - 1 && (e2[n2 + 1] === "=" || e2[n2 + 1] === "-");
  }, o: Te(E), i: 1, u: (e2, n2, r3) => ({ children: Pe(n2, e2[1], r3), level: e2[2] === "=" ? 1 : 2, type: "9" }) }, 11: { t: ["<"], o: Me(A), i: 1, u(e2, n2, r3) {
    let [, t2] = e2[3].match(ae), o2 = RegExp("^" + t2, "gm"), a2 = e2[3].replace(o2, ""), i2 = Q2(H4, a2) ? Ne : Pe, u2 = e2[1].toLowerCase(), l3 = c.indexOf(u2) !== -1, s2 = (l3 ? u2 : e2[1]).trim(), f2 = { attrs: ce2(s2, e2[2]), noInnerParse: l3, tag: s2 };
    if (r3.inAnchor = r3.inAnchor || u2 === "a", l3) f2.text = e2[3];
    else {
      let e3 = r3.inHTML;
      r3.inHTML = !0, f2.children = i2(n2, a2, r3), r3.inHTML = e3;
    }
    return r3.inAnchor = !1, f2;
  }, l: (e2, r3, t2) => W2(e2.tag, n({ key: t2.key }, e2.attrs), e2.text || (e2.children ? r3(e2.children, t2) : "")) }, 13: { t: ["<"], o: Me(O), i: 1, u(e2) {
    let n2 = e2[1].trim();
    return { attrs: ce2(n2, e2[2] || ""), tag: n2 };
  }, l: (e2, r3, t2) => W2(e2.tag, n({}, e2.attrs, { key: t2.key })) }, 12: { t: ["<!--"], o: Me(B), i: 1, u: () => ({}), l: Ve }, 14: { t: ["!["], o: Ie(be), i: 1, u: (e2) => ({ alt: Fe(e2[1]), target: Fe(e2[2]), title: Fe(e2[3]) }), l: (e2, n2, r3) => W2("img", { key: r3.key, alt: e2.alt || void 0, title: e2.title || void 0, src: G2(e2.target, "img", "src") }) }, 15: { t: ["["], o: Ce(ve), i: 3, u: (e2, n2, r3) => ({ children: Ze(n2, e2[1], r3), target: Fe(e2[2]), title: Fe(e2[3]) }), l: (e2, n2, r3) => W2("a", { key: r3.key, href: G2(e2.target, "a", "href"), title: e2.title }, n2(e2.children, r3)) }, 16: { t: ["<"], o: Ce(I), i: 0, u(e2) {
    let n2 = e2[1], r3 = !1;
    return n2.indexOf("@") !== -1 && n2.indexOf("//") === -1 && (r3 = !0, n2 = n2.replace("mailto:", "")), { children: [{ text: n2, type: "27" }], target: r3 ? "mailto:" + n2 : n2, type: "15" };
  } }, 17: { t: (e2, n2) => !n2.inAnchor && !t.disableAutoLink && (ze(e2, "http://") || ze(e2, "https://")), o: Ce(C), i: 0, u: (e2) => ({ children: [{ text: e2[1], type: "27" }], target: e2[1], title: void 0, type: "15" }) }, 20: qe(W2, 1), 33: qe(W2, 2), 19: { t: [`
`], o: Te(m), i: 3, u: Ue, l: () => `
` }, 21: { o: je(function(e2, n2) {
    if (n2.inline || n2.simple || n2.inHTML && e2.indexOf(`

`) === -1 && n2.prevCapture.indexOf(`

`) === -1) return null;
    let r3 = "", t2 = 0;
    for (; ; ) {
      let n3 = e2.indexOf(`
`, t2), o3 = e2.slice(t2, n3 === -1 ? void 0 : n3 + 1);
      if (Q2(V2, o3) || (r3 += o3, n3 === -1 || !o3.trim())) break;
      t2 = n3 + 1;
    }
    let o2 = Se(r3);
    return o2 === "" ? null : [r3, , o2];
  }), i: 3, u: Ge, l: (e2, n2, r3) => W2("p", { key: r3.key }, n2(e2.children, r3)) }, 22: { t: ["["], o: Ce(D), i: 0, u: (e2) => (ue2[e2[1]] = { target: e2[2], title: e2[4] }, {}), l: Ve }, 23: { t: ["!["], o: Ie(F), i: 0, u: (e2) => ({ alt: e2[1] ? Fe(e2[1]) : void 0, ref: e2[2] }), l: (e2, n2, r3) => ue2[e2.ref] ? W2("img", { key: r3.key, alt: e2.alt, src: G2(ue2[e2.ref].target, "img", "src"), title: ue2[e2.ref].title }) : null }, 24: { t: (e2) => e2[0] === "[" && e2.indexOf("](") === -1, o: Ce(P), i: 0, u: (e2, n2, r3) => ({ children: n2(e2[1], r3), fallbackChildren: e2[0], ref: e2[2] }), l: (e2, n2, r3) => ue2[e2.ref] ? W2("a", { key: r3.key, href: G2(ue2[e2.ref].target, "a", "href"), title: ue2[e2.ref].title }, n2(e2.children, r3)) : W2("span", { key: r3.key }, e2.fallbackChildren) }, 25: { t: ["|"], o: Te(M), i: 1, u: Le, l(e2, n2, r3) {
    let t2 = e2;
    return W2("table", { key: r3.key }, W2("thead", null, W2("tr", null, t2.header.map(function(e3, o2) {
      return W2("th", { key: o2, style: Oe(t2, o2) }, n2(e3, r3));
    }))), W2("tbody", null, t2.cells.map(function(e3, o2) {
      return W2("tr", { key: o2 }, e3.map(function(e4, o3) {
        return W2("td", { key: o3, style: Oe(t2, o3) }, n2(e4, r3));
      }));
    })));
  } }, 27: { o: je(function(e2, n2) {
    let r3;
    return ze(e2, ":") && (r3 = ee.exec(e2)), r3 || te.exec(e2);
  }), i: 4, u(e2) {
    let n2 = e2[0];
    return { text: n2.indexOf("&") === -1 ? n2 : n2.replace(R, (e3, n3) => t.namedCodesToUnicode[n3] || e3) };
  }, l: (e2) => e2.text }, 28: { t: ["**", "__"], o: Ie(J), i: 2, u: (e2, n2, r3) => ({ children: n2(e2[2], r3) }), l: (e2, n2, r3) => W2("strong", { key: r3.key }, n2(e2.children, r3)) }, 29: { t: (e2) => {
    let n2 = e2[0];
    return (n2 === "*" || n2 === "_") && e2[1] !== n2;
  }, o: Ie(K), i: 3, u: (e2, n2, r3) => ({ children: n2(e2[2], r3) }), l: (e2, n2, r3) => W2("em", { key: r3.key }, n2(e2.children, r3)) }, 30: { t: ["\\"], o: Ie(ne), i: 1, u: (e2) => ({ text: e2[1], type: "27" }) }, 31: { t: ["=="], o: Ie(X), i: 3, u: Ge, l: (e2, n2, r3) => W2("mark", { key: r3.key }, n2(e2.children, r3)) }, 32: { t: ["~~"], o: Ie(Y), i: 3, u: Ge, l: (e2, n2, r3) => W2("del", { key: r3.key }, n2(e2.children, r3)) } };
  t.disableParsingRawHTML === !0 && (delete le2[11], delete le2[13]);
  let se2 = (function(e2) {
    var n2 = Object.keys(e2);
    function r3(t2, o2) {
      var a2 = [];
      if (o2.prevCapture = o2.prevCapture || "", t2.trim()) for (; t2; ) for (var c2 = 0; c2 < n2.length; ) {
        var i2 = n2[c2], u2 = e2[i2];
        if (!u2.t || Ee(t2, o2, u2.t)) {
          var l3 = u2.o(t2, o2);
          if (l3 && l3[0]) {
            t2 = t2.substring(l3[0].length);
            var s2 = u2.u(l3, r3, o2);
            o2.prevCapture += l3[0], s2.type || (s2.type = i2), a2.push(s2);
            break;
          }
          c2++;
        } else c2++;
      }
      return o2.prevCapture = "", a2;
    }
    return n2.sort(function(n3, r4) {
      return e2[n3].i - e2[r4].i || (n3 < r4 ? -1 : 1);
    }), function(e3, n3) {
      return r3((function(e4) {
        return e4.replace(k, `
`).replace(v, "").replace(N, "    ");
      })(e3), n3);
    };
  })(le2), fe2 = /* @__PURE__ */ (function(e2, n2) {
    return function r3(t2, o2 = {}) {
      if (Array.isArray(t2)) {
        let e3 = o2.key, n3 = [], a2 = !1;
        for (let e4 = 0; e4 < t2.length; e4++) {
          o2.key = e4;
          let c2 = r3(t2[e4], o2), i2 = $e(c2);
          i2 && a2 ? n3[n3.length - 1] += c2 : c2 !== null && n3.push(c2), a2 = i2;
        }
        return o2.key = e3, n3;
      }
      return (function(r4, t3, o3) {
        let a2 = e2[r4.type].l;
        return n2 ? n2(() => a2(r4, t3, o3), r4, t3, o3) : a2(r4, t3, o3);
      })(t2, r3, o2);
    };
  })(le2, t.renderRule), _e2 = re2(r2);
  return ie2.length ? W2("div", null, _e2, W2("footer", { key: "footer" }, ie2.map(function(e2) {
    return W2("div", { id: l2(e2.identifier, Ae), key: e2.identifier }, e2.identifier, fe2(se2(e2.footnote, { inline: !0 })));
  }))) : _e2;
}
var index_modern_default = (n2) => {
  let { children: t, options: o2 } = n2, a2 = (function(e2, n3) {
    if (e2 == null) return {};
    var r2, t2, o3 = {}, a3 = Object.keys(e2);
    for (t2 = 0; t2 < a3.length; t2++) n3.indexOf(r2 = a3[t2]) >= 0 || (o3[r2] = e2[r2]);
    return o3;
  })(n2, r);
  return e.cloneElement(We(t ?? "", o2), a2);
};

// src/blocks/components/ArgsTable/ArgRow.tsx
import { styled as styled14 } from "storybook/theming";

// src/blocks/components/ArgsTable/ArgControl.tsx
import React16, { useCallback as useCallback5, useEffect as useEffect6, useState as useState6 } from "react";
import { Link } from "storybook/internal/components";

// src/blocks/controls/index.tsx
import React15, { Suspense, lazy } from "react";

// src/blocks/controls/Boolean.tsx
import React, { useCallback } from "react";
import { Button } from "storybook/internal/components";
import { styled } from "storybook/theming";
var Label = styled.label(({ theme }) => ({
  lineHeight: "18px",
  alignItems: "center",
  marginBottom: 8,
  display: "inline-block",
  position: "relative",
  whiteSpace: "nowrap",
  background: theme.boolean.background,
  borderRadius: "3em",
  padding: 1,
  '&[aria-disabled="true"]': {
    opacity: 0.5,
    input: {
      cursor: "not-allowed"
    }
  },
  input: {
    appearance: "none",
    width: "100%",
    height: "100%",
    position: "absolute",
    left: 0,
    top: 0,
    margin: 0,
    padding: 0,
    border: "none",
    background: "transparent",
    cursor: "pointer",
    borderRadius: "3em",
    "&:focus": {
      outline: "none",
      boxShadow: `${theme.color.secondary} 0 0 0 1px inset !important`
    },
    "@media (forced-colors: active)": {
      "&:focus": {
        outline: "1px solid highlight"
      }
    }
  },
  span: {
    textAlign: "center",
    fontSize: theme.typography.size.s1,
    fontWeight: theme.typography.weight.bold,
    lineHeight: "1",
    cursor: "pointer",
    display: "inline-block",
    padding: "7px 15px",
    transition: "all 100ms ease-out",
    userSelect: "none",
    borderRadius: "3em",
    color: curriedTransparentize$1(0.5, theme.color.defaultText),
    background: "transparent",
    "&:hover": {
      boxShadow: `${curriedOpacify$1(0.3, theme.appBorderColor)} 0 0 0 1px inset`
    },
    "&:active": {
      boxShadow: `${curriedOpacify$1(0.05, theme.appBorderColor)} 0 0 0 2px inset`,
      color: curriedOpacify$1(1, theme.appBorderColor)
    },
    "&:first-of-type": {
      paddingRight: 8
    },
    "&:last-of-type": {
      paddingLeft: 8
    }
  },
  "input:checked ~ span:last-of-type, input:not(:checked) ~ span:first-of-type": {
    background: theme.boolean.selectedBackground,
    boxShadow: theme.base === "light" ? `${curriedOpacify$1(0.1, theme.appBorderColor)} 0 0 2px` : `${theme.appBorderColor} 0 0 0 1px`,
    color: theme.color.defaultText,
    padding: "7px 15px",
    "@media (forced-colors: active)": {
      textDecoration: "underline"
    }
  }
})), parse = (value2) => value2 === "true", BooleanControl = ({
  name,
  value: value2,
  onChange,
  onBlur,
  onFocus,
  argType
}) => {
  let onSetFalse = useCallback(() => onChange(!1), [onChange]), readonly = !!argType?.table?.readonly;
  if (value2 === void 0)
    return React.createElement(
      Button,
      {
        ariaLabel: !1,
        variant: "outline",
        size: "medium",
        id: getControlSetterButtonId(name),
        onClick: onSetFalse,
        disabled: readonly
      },
      "Set boolean"
    );
  let controlId = getControlId(name), parsedValue = typeof value2 == "string" ? parse(value2) : value2;
  return React.createElement(Label, { "aria-disabled": readonly, htmlFor: controlId, "aria-label": name }, React.createElement(
    "input",
    {
      id: controlId,
      type: "checkbox",
      onChange: (e2) => onChange(e2.target.checked),
      checked: parsedValue,
      role: "switch",
      disabled: readonly,
      name,
      onBlur,
      onFocus
    }
  ), React.createElement("span", { "aria-hidden": "true" }, "False"), React.createElement("span", { "aria-hidden": "true" }, "True"));
};

// src/blocks/controls/Date.tsx
import React2, { useEffect, useRef, useState } from "react";
import { Form } from "storybook/internal/components";
import { styled as styled2 } from "storybook/theming";
var parseDate = (value2) => {
  let [year, month, day] = value2.split("-"), result = /* @__PURE__ */ new Date();
  return result.setFullYear(parseInt(year, 10), parseInt(month, 10) - 1, parseInt(day, 10)), result;
}, parseTime = (value2) => {
  let [hours, minutes] = value2.split(":"), result = /* @__PURE__ */ new Date();
  return result.setHours(parseInt(hours, 10)), result.setMinutes(parseInt(minutes, 10)), result;
}, formatDate = (value2) => {
  let date = new Date(value2), year = `000${date.getFullYear()}`.slice(-4), month = `0${date.getMonth() + 1}`.slice(-2), day = `0${date.getDate()}`.slice(-2);
  return `${year}-${month}-${day}`;
}, formatTime = (value2) => {
  let date = new Date(value2), hours = `0${date.getHours()}`.slice(-2), minutes = `0${date.getMinutes()}`.slice(-2);
  return `${hours}:${minutes}`;
}, FormInput = styled2(Form.Input)(
  ({ theme, readOnly }) => readOnly ? {
    background: theme.base === "light" ? theme.color.lighter : "transparent"
  } : {}
), FlexSpaced = styled2.fieldset(({ theme }) => ({
  flex: 1,
  display: "flex",
  border: 0,
  marginInline: 0,
  padding: 0,
  input: {
    marginLeft: 10,
    flex: 1,
    height: 32,
    // hardcode height bc Chromium bug https://bugs.chromium.org/p/chromium/issues/detail?id=417606
    "&::-webkit-calendar-picker-indicator": {
      opacity: 0.5,
      height: 12,
      filter: theme.base === "light" ? void 0 : "invert(1)"
    }
  },
  "input:first-of-type": {
    marginLeft: 0,
    flexGrow: 4
  },
  "input:last-of-type": {
    flexGrow: 3
  }
})), DateControl = ({ name, value: value2, onChange, onFocus, onBlur, argType }) => {
  let [valid, setValid] = useState(!0), dateRef = useRef(), timeRef = useRef(), readonly = !!argType?.table?.readonly;
  useEffect(() => {
    valid !== !1 && (dateRef && dateRef.current && (dateRef.current.value = value2 ? formatDate(value2) : ""), timeRef && timeRef.current && (timeRef.current.value = value2 ? formatTime(value2) : ""));
  }, [value2]);
  let onDateChange = (e2) => {
    if (!e2.target.value)
      return onChange();
    let parsed = parseDate(e2.target.value), result = new Date(value2 ?? "");
    result.setFullYear(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
    let time = result.getTime();
    time && onChange(time), setValid(!!time);
  }, onTimeChange = (e2) => {
    if (!e2.target.value)
      return onChange();
    let parsed = parseTime(e2.target.value), result = new Date(value2 ?? "");
    result.setHours(parsed.getHours()), result.setMinutes(parsed.getMinutes());
    let time = result.getTime();
    time && onChange(time), setValid(!!time);
  }, controlId = getControlId(name);
  return React2.createElement(FlexSpaced, null, React2.createElement("legend", { className: "sb-sr-only" }, name), React2.createElement("label", { htmlFor: `${controlId}-date`, className: "sb-sr-only" }, "Date"), React2.createElement(
    FormInput,
    {
      type: "date",
      max: "9999-12-31",
      ref: dateRef,
      id: `${controlId}-date`,
      name: `${controlId}-date`,
      readOnly: readonly,
      onChange: onDateChange,
      onFocus,
      onBlur
    }
  ), React2.createElement("label", { htmlFor: `${controlId}-time`, className: "sb-sr-only" }, "Time"), React2.createElement(
    FormInput,
    {
      type: "time",
      id: `${controlId}-time`,
      name: `${controlId}-time`,
      ref: timeRef,
      onChange: onTimeChange,
      readOnly: readonly,
      onFocus,
      onBlur
    }
  ), valid ? null : React2.createElement("div", null, "invalid"));
};

// src/blocks/controls/Number.tsx
import React3, { useCallback as useCallback2, useEffect as useEffect2, useRef as useRef2, useState as useState2 } from "react";
import { Button as Button2, Form as Form2 } from "storybook/internal/components";
import { styled as styled3 } from "storybook/theming";
var Wrapper = styled3.label({
  display: "flex"
}), parse2 = (value2) => {
  let result = parseFloat(value2);
  return Number.isNaN(result) ? void 0 : result;
}, format = (value2) => value2 != null ? String(value2) : "", FormInput2 = styled3(Form2.Input)(({ theme }) => ({
  background: theme.base === "light" ? theme.color.lighter : "transparent"
})), NumberControl = ({
  name,
  value: value2,
  onChange,
  min,
  max,
  step,
  onBlur,
  onFocus,
  argType
}) => {
  let [inputValue, setInputValue] = useState2(typeof value2 == "number" ? value2 : ""), [forceVisible, setForceVisible] = useState2(!1), [parseError, setParseError] = useState2(null), readonly = !!argType?.table?.readonly, handleChange = useCallback2(
    (event) => {
      setInputValue(event.target.value);
      let result = parseFloat(event.target.value);
      if (Number.isNaN(result))
        setParseError(new Error(`'${event.target.value}' is not a number`));
      else {
        let finalValue = result;
        typeof min == "number" && finalValue < min && (finalValue = min), typeof max == "number" && finalValue > max && (finalValue = max), onChange(finalValue), setParseError(null), finalValue !== result && setInputValue(String(finalValue));
      }
    },
    [onChange, setParseError, min, max]
  ), onForceVisible = useCallback2(() => {
    setInputValue("0"), onChange(0), setForceVisible(!0);
  }, [setForceVisible]), htmlElRef = useRef2(null);
  return useEffect2(() => {
    forceVisible && htmlElRef.current && htmlElRef.current.select();
  }, [forceVisible]), useEffect2(() => {
    let newInputValue = typeof value2 == "number" ? value2 : "";
    inputValue !== newInputValue && setInputValue(newInputValue);
  }, [value2]), value2 === void 0 ? React3.createElement(
    Button2,
    {
      ariaLabel: !1,
      variant: "outline",
      size: "medium",
      id: getControlSetterButtonId(name),
      onClick: onForceVisible,
      disabled: readonly
    },
    "Set number"
  ) : React3.createElement(Wrapper, null, React3.createElement(
    FormInput2,
    {
      ref: htmlElRef,
      id: getControlId(name),
      type: "number",
      onChange: handleChange,
      size: "flex",
      placeholder: "Edit number...",
      value: inputValue,
      valid: parseError ? "error" : void 0,
      autoFocus: forceVisible,
      readOnly: readonly,
      name,
      min,
      max,
      step,
      onFocus,
      onBlur
    }
  ));
};

// src/blocks/controls/options/Options.tsx
import React7 from "react";

// src/blocks/controls/options/Checkbox.tsx
import React4, { useEffect as useEffect3, useState as useState3 } from "react";
import { logger } from "storybook/internal/client-logger";
import { styled as styled4 } from "storybook/theming";

// src/blocks/controls/options/helpers.ts
var selectedKey = (value2, options) => {
  let entry = options && Object.entries(options).find(([_key, val]) => val === value2);
  return entry ? entry[0] : void 0;
}, selectedKeys = (value2, options) => value2 && options ? Object.entries(options).filter((entry) => value2.includes(entry[1])).map((entry) => entry[0]) : [], selectedValues = (keys, options) => keys && options && keys.map((key) => options[key]);

// src/blocks/controls/options/Checkbox.tsx
var Wrapper2 = styled4.fieldset(
  {
    border: "none",
    marginInline: 0,
    padding: 0,
    display: "flex",
    alignItems: "flex-start"
  },
  ({ $isInline: isInline }) => isInline ? {
    flexWrap: "wrap",
    gap: 15,
    label: {
      display: "inline-flex"
    }
  } : {
    flexDirection: "column",
    gap: 8,
    label: {
      display: "flex"
    }
  }
), Text = styled4.span(({ $readOnly }) => ({
  opacity: $readOnly ? 0.5 : 1
})), Label2 = styled4.label(({ $readOnly }) => ({
  lineHeight: "20px",
  alignItems: "center",
  cursor: $readOnly ? "not-allowed" : "pointer",
  input: {
    cursor: $readOnly ? "not-allowed" : "pointer",
    margin: 0,
    marginRight: 6
  }
})), CheckboxControl = ({
  name,
  options,
  value: value2,
  onChange,
  isInline,
  argType
}) => {
  if (!options)
    return logger.warn(`Checkbox with no options: ${name}`), React4.createElement(React4.Fragment, null, "-");
  let initial2 = selectedKeys(value2 || [], options), [selected, setSelected] = useState3(initial2), readonly = !!argType?.table?.readonly, handleChange = (e2) => {
    let option = e2.target.value, updated = [...selected];
    updated.includes(option) ? updated.splice(updated.indexOf(option), 1) : updated.push(option), onChange(selectedValues(updated, options)), setSelected(updated);
  };
  useEffect3(() => {
    setSelected(selectedKeys(value2 || [], options));
  }, [value2]);
  let controlId = getControlId(name);
  return React4.createElement(Wrapper2, { $isInline: isInline }, React4.createElement("legend", { className: "sb-sr-only" }, name), Object.keys(options).map((key, index) => {
    let id = `${controlId}-${index}`;
    return React4.createElement(Label2, { key: id, htmlFor: id, $readOnly: readonly }, React4.createElement(
      "input",
      {
        type: "checkbox",
        disabled: readonly,
        id,
        name: id,
        value: key,
        onChange: handleChange,
        checked: selected?.includes(key)
      }
    ), React4.createElement(Text, { $readOnly: readonly }, key));
  }));
};

// src/blocks/controls/options/Radio.tsx
import React5 from "react";
import { logger as logger2 } from "storybook/internal/client-logger";
import { styled as styled5 } from "storybook/theming";
var Wrapper3 = styled5.fieldset(
  {
    border: "none",
    marginInline: 0,
    padding: 0,
    display: "flex",
    alignItems: "flex-start"
  },
  ({ isInline }) => isInline ? {
    flexWrap: "wrap",
    gap: 15,
    label: {
      display: "inline-flex"
    }
  } : {
    flexDirection: "column",
    gap: 8,
    label: {
      display: "flex"
    }
  }
), Text2 = styled5.span(({ $readOnly }) => ({
  opacity: $readOnly ? 0.5 : 1
})), Label3 = styled5.label(({ $readOnly }) => ({
  lineHeight: "20px",
  alignItems: "center",
  cursor: $readOnly ? "not-allowed" : "pointer",
  input: {
    cursor: $readOnly ? "not-allowed" : "pointer",
    margin: 0,
    marginRight: 6
  }
})), RadioControl = ({
  name,
  options,
  value: value2,
  onChange,
  isInline,
  argType
}) => {
  if (!options)
    return logger2.warn(`Radio with no options: ${name}`), React5.createElement(React5.Fragment, null, "-");
  let selection = selectedKey(value2, options), controlId = getControlId(name), readonly = !!argType?.table?.readonly;
  return React5.createElement(Wrapper3, { isInline }, React5.createElement("legend", { className: "sb-sr-only" }, name), Object.keys(options).map((key, index) => {
    let id = `${controlId}-${index}`;
    return React5.createElement(Label3, { key: id, htmlFor: id, $readOnly: readonly }, React5.createElement(
      "input",
      {
        type: "radio",
        id,
        name: controlId,
        disabled: readonly,
        value: key,
        onChange: (e2) => onChange(options[e2.currentTarget.value]),
        checked: key === selection
      }
    ), React5.createElement(Text2, { $readOnly: readonly }, key));
  }));
};

// src/blocks/controls/options/Select.tsx
import React6 from "react";
import { logger as logger3 } from "storybook/internal/client-logger";
import { ChevronSmallDownIcon } from "@storybook/icons";
import { styled as styled6 } from "storybook/theming";
var styleResets = {
  // resets
  appearance: "none",
  border: "0 none",
  boxSizing: "inherit",
  display: " block",
  margin: " 0",
  background: "transparent",
  padding: 0,
  fontSize: "inherit",
  position: "relative"
}, OptionsSelect = styled6.select(styleResets, ({ theme }) => ({
  boxSizing: "border-box",
  position: "relative",
  padding: "6px 10px",
  width: "100%",
  color: theme.input.color || "inherit",
  background: theme.input.background,
  borderRadius: theme.input.borderRadius,
  boxShadow: `${theme.input.border} 0 0 0 1px inset`,
  fontSize: theme.typography.size.s2 - 1,
  lineHeight: "20px",
  "&:focus": {
    boxShadow: `${theme.color.secondary} 0 0 0 1px inset`,
    outline: "none"
  },
  "&[disabled]": {
    cursor: "not-allowed",
    opacity: 0.5
  },
  "::placeholder": {
    color: theme.textMutedColor
  },
  "&[multiple]": {
    overflow: "auto",
    padding: 0,
    option: {
      display: "block",
      padding: "6px 10px",
      marginLeft: 1,
      marginRight: 1,
      "&:hover": {
        background: theme.background.hoverable
      },
      "&:checked": {
        background: "transparent",
        color: theme.color.secondary,
        fontWeight: theme.typography.weight.bold
      }
    }
  }
})), SelectWrapper = styled6.span(({ theme }) => ({
  display: "inline-block",
  lineHeight: "normal",
  overflow: "hidden",
  position: "relative",
  verticalAlign: "top",
  width: "100%",
  svg: {
    position: "absolute",
    zIndex: 1,
    pointerEvents: "none",
    height: "12px",
    marginTop: "-6px",
    right: "12px",
    top: "50%",
    fill: theme.textMutedColor,
    path: {
      fill: theme.textMutedColor
    }
  }
})), NO_SELECTION = "Choose option...", SingleSelect = ({ name, value: value2, options, onChange, argType }) => {
  let handleChange = (e2) => {
    onChange(options[e2.currentTarget.value]);
  }, selection = selectedKey(value2, options) || NO_SELECTION, controlId = getControlId(name), readonly = !!argType?.table?.readonly;
  return React6.createElement(SelectWrapper, null, React6.createElement(ChevronSmallDownIcon, null), React6.createElement("label", { htmlFor: controlId, className: "sb-sr-only" }, name), React6.createElement(OptionsSelect, { disabled: readonly, id: controlId, value: selection, onChange: handleChange }, React6.createElement("option", { key: "no-selection", disabled: !0 }, NO_SELECTION), Object.keys(options).map((key) => React6.createElement("option", { key, value: key }, key))));
}, MultiSelect = ({ name, value: value2, options, onChange, argType }) => {
  let handleChange = (e2) => {
    let selection2 = Array.from(e2.currentTarget.options).filter((option) => option.selected).map((option) => option.value);
    onChange(selectedValues(selection2, options));
  }, selection = selectedKeys(value2, options), controlId = getControlId(name), readonly = !!argType?.table?.readonly;
  return React6.createElement(SelectWrapper, null, React6.createElement("label", { htmlFor: controlId, className: "sb-sr-only" }, name), React6.createElement(
    OptionsSelect,
    {
      disabled: readonly,
      id: controlId,
      multiple: !0,
      value: selection,
      onChange: handleChange
    },
    Object.keys(options).map((key) => React6.createElement("option", { key, value: key }, key))
  ));
}, SelectControl = (props) => {
  let { name, options } = props;
  return options ? props.isMulti ? React6.createElement(MultiSelect, { ...props }) : React6.createElement(SingleSelect, { ...props }) : (logger3.warn(`Select with no options: ${name}`), React6.createElement(React6.Fragment, null, "-"));
};

// src/blocks/controls/options/Options.tsx
var normalizeOptions = (options, labels) => Array.isArray(options) ? options.reduce((acc, item) => (acc[labels?.[item] || String(item)] = item, acc), {}) : options, Controls = {
  check: CheckboxControl,
  "inline-check": CheckboxControl,
  radio: RadioControl,
  "inline-radio": RadioControl,
  select: SelectControl,
  "multi-select": SelectControl
}, OptionsControl = (props) => {
  let { type = "select", labels, argType } = props, normalized = {
    ...props,
    argType,
    options: argType ? normalizeOptions(argType.options, labels) : {},
    isInline: type.includes("inline"),
    isMulti: type.includes("multi")
  }, Control = Controls[type];
  if (Control)
    return React7.createElement(Control, { ...normalized });
  throw new Error(`Unknown options type: ${type}`);
};

// src/blocks/controls/Object.tsx
import React11, { useCallback as useCallback3, useEffect as useEffect4, useMemo, useRef as useRef3, useState as useState4 } from "react";
import { Button as Button3, Form as Form3, ToggleButton } from "storybook/internal/components";
import { AddIcon, SubtractIcon } from "@storybook/icons";
import { styled as styled8, useTheme } from "storybook/theming";

// src/blocks/controls/react-editable-json-tree/index.tsx
import React10, { Component as Component2 } from "react";

// src/blocks/controls/react-editable-json-tree/JsonNodes.tsx
import React9, { Component, cloneElement as cloneElement2 } from "react";

// src/blocks/controls/react-editable-json-tree/JsonNodeAccordion.tsx
import React8 from "react";
import { styled as styled7 } from "storybook/theming";
var Container = styled7.div(({ theme }) => ({
  position: "relative",
  ":hover": {
    "& > .rejt-accordion-button::after": {
      background: theme.color.secondary
    },
    "& > .rejt-accordion-region > :is(.rejt-plus-menu, .rejt-minus-menu)": {
      opacity: 1
    }
  }
})), Trigger = styled7.button(({ theme }) => ({
  padding: 0,
  background: "transparent",
  border: "none",
  marginRight: "3px",
  lineHeight: "22px",
  color: theme.color.secondary,
  "::after": {
    content: '""',
    position: "absolute",
    top: 0,
    display: "block",
    width: "100%",
    marginLeft: "-1rem",
    height: "22px",
    background: "transparent",
    borderRadius: 4,
    transition: "background 0.2s",
    opacity: 0.1,
    paddingRight: "20px"
  },
  "::before": {
    content: '""',
    position: "absolute"
  },
  '&[aria-expanded="true"]::before': {
    left: -10,
    top: 10,
    borderTop: "3px solid rgba(153,153,153,0.6)",
    borderLeft: "3px solid transparent",
    borderRight: "3px solid transparent"
  },
  '&[aria-expanded="false"]::before': {
    left: -8,
    top: 8,
    borderTop: "3px solid transparent",
    borderBottom: "3px solid transparent",
    borderLeft: "3px solid rgba(153,153,153,0.6)"
  }
})), Region = styled7.div({
  display: "inline"
});
function JsonNodeAccordion({
  children,
  name,
  collapsed,
  keyPath,
  deep,
  ...props
}) {
  let accordionKey = `${keyPath.at(-1) ?? "root"}-${name}-${deep}`, ids = {
    trigger: `${accordionKey}-trigger`,
    region: `${accordionKey}-region`
  }, containerTag = keyPath.length > 0 ? "li" : "div";
  return React8.createElement(Container, { as: containerTag }, React8.createElement(
    Trigger,
    {
      type: "button",
      "aria-expanded": !collapsed,
      id: ids.trigger,
      "aria-controls": ids.region,
      className: "rejt-accordion-button",
      ...props
    },
    name,
    " :"
  ), React8.createElement(
    Region,
    {
      role: "region",
      id: ids.region,
      "aria-labelledby": ids.trigger,
      className: "rejt-accordion-region"
    },
    children
  ));
}

// src/blocks/controls/react-editable-json-tree/types/dataTypes.ts
var ERROR = "Error", OBJECT = "Object", ARRAY = "Array", STRING = "String", NUMBER = "Number", BOOLEAN = "Boolean", DATE = "Date", NULL = "Null", UNDEFINED = "Undefined", FUNCTION = "Function", SYMBOL = "Symbol";

// src/blocks/controls/react-editable-json-tree/types/deltaTypes.ts
var ADD_DELTA_TYPE = "ADD_DELTA_TYPE", REMOVE_DELTA_TYPE = "REMOVE_DELTA_TYPE", UPDATE_DELTA_TYPE = "UPDATE_DELTA_TYPE";

// src/blocks/controls/react-editable-json-tree/types/inputUsageTypes.ts
var VALUE = "value";

// src/blocks/controls/react-editable-json-tree/utils/objectTypes.ts
function getObjectType(obj) {
  return obj !== null && typeof obj == "object" && !Array.isArray(obj) && typeof obj[Symbol.iterator] == "function" ? "Iterable" : Object.prototype.toString.call(obj).slice(8, -1);
}
function isComponentWillChange(oldValue, newValue) {
  let oldType = getObjectType(oldValue), newType = getObjectType(newValue);
  return (oldType === "Function" || newType === "Function") && newType !== oldType;
}

// src/blocks/controls/react-editable-json-tree/JsonNodes.tsx
var JsonAddValue = class extends Component {
  constructor(props) {
    super(props), this.state = {
      inputRefKey: null,
      inputRefValue: null
    }, this.refInputValue = this.refInputValue.bind(this), this.refInputKey = this.refInputKey.bind(this), this.onKeydown = this.onKeydown.bind(this), this.onSubmit = this.onSubmit.bind(this);
  }
  componentDidMount() {
    let { inputRefKey, inputRefValue } = this.state, { onlyValue } = this.props;
    inputRefKey && typeof inputRefKey.focus == "function" && inputRefKey.focus(), onlyValue && inputRefValue && typeof inputRefValue.focus == "function" && inputRefValue.focus();
  }
  onKeydown(event) {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat)
      return;
    let { inputRefKey, inputRefValue } = this.state, { addButtonElement, handleCancel } = this.props;
    [inputRefKey, inputRefValue, addButtonElement].some(
      (elm) => elm === event.target
    ) && ((event.code === "Enter" || event.key === "Enter") && (event.preventDefault(), this.onSubmit()), (event.code === "Escape" || event.key === "Escape") && (event.preventDefault(), handleCancel()));
  }
  onSubmit() {
    let { handleAdd, onlyValue, onSubmitValueParser, keyPath, deep } = this.props, { inputRefKey, inputRefValue } = this.state, result = {};
    if (!onlyValue) {
      if (!inputRefKey.value)
        return;
      result.key = inputRefKey.value;
    }
    result.newValue = onSubmitValueParser(!1, keyPath, deep, result.key, inputRefValue.value), handleAdd(result);
  }
  refInputKey(node) {
    this.state.inputRefKey = node;
  }
  refInputValue(node) {
    this.state.inputRefValue = node;
  }
  render() {
    let {
      handleCancel,
      onlyValue,
      addButtonElement,
      cancelButtonElement,
      inputElementGenerator,
      keyPath,
      deep
    } = this.props, addButtonElementLayout = addButtonElement && cloneElement2(addButtonElement, {
      onClick: this.onSubmit
    }), cancelButtonElementLayout = cancelButtonElement && cloneElement2(cancelButtonElement, {
      onClick: handleCancel
    }), inputElementValue = inputElementGenerator(VALUE, keyPath, deep), inputElementValueLayout = cloneElement2(inputElementValue, {
      placeholder: "Value",
      ref: this.refInputValue,
      onKeyDown: this.onKeydown
    }), inputElementKeyLayout = null;
    if (!onlyValue) {
      let inputElementKey = inputElementGenerator("key", keyPath, deep);
      inputElementKeyLayout = cloneElement2(inputElementKey, {
        placeholder: "Key",
        ref: this.refInputKey,
        onKeyDown: this.onKeydown
      });
    }
    return React9.createElement("span", { className: "rejt-add-value-node" }, inputElementKeyLayout, inputElementValueLayout, addButtonElementLayout, cancelButtonElementLayout);
  }
};
JsonAddValue.defaultProps = {
  onlyValue: !1,
  addButtonElement: React9.createElement("button", null, "+"),
  cancelButtonElement: React9.createElement("button", null, "c")
};
var JsonArray = class extends Component {
  constructor(props) {
    super(props);
    let keyPath = [...props.keyPath || [], props.name];
    this.state = {
      data: props.data,
      name: props.name,
      keyPath: keyPath ?? [],
      deep: props.deep ?? 0,
      nextDeep: (props.deep ?? 0) + 1,
      collapsed: props.isCollapsed(keyPath, props.deep ?? 0, props.data),
      addFormVisible: !1
    }, this.handleCollapseMode = this.handleCollapseMode.bind(this), this.handleRemoveItem = this.handleRemoveItem.bind(this), this.handleAddMode = this.handleAddMode.bind(this), this.handleAddValueAdd = this.handleAddValueAdd.bind(this), this.handleAddValueCancel = this.handleAddValueCancel.bind(this), this.handleEditValue = this.handleEditValue.bind(this), this.onChildUpdate = this.onChildUpdate.bind(this), this.renderCollapsed = this.renderCollapsed.bind(this), this.renderNotCollapsed = this.renderNotCollapsed.bind(this);
  }
  static getDerivedStateFromProps(props, state) {
    return props.data !== state.data ? { data: props.data } : null;
  }
  onChildUpdate(childKey, childData) {
    let { data, keyPath = [] } = this.state;
    data[childKey] = childData, this.setState({
      data
    });
    let { onUpdate } = this.props, size = keyPath.length;
    onUpdate(keyPath[size - 1], data);
  }
  handleAddMode() {
    this.setState({
      addFormVisible: !0
    });
  }
  handleCollapseMode() {
    this.setState((state) => ({
      collapsed: !state.collapsed
    }));
  }
  handleRemoveItem(index) {
    return () => {
      let { beforeRemoveAction, logger: logger4 } = this.props, { data, keyPath, nextDeep: deep } = this.state, oldValue = data[index];
      (beforeRemoveAction || Promise.resolve.bind(Promise))(index, keyPath, deep, oldValue).then(() => {
        let deltaUpdateResult = {
          keyPath,
          deep,
          key: index,
          oldValue,
          type: REMOVE_DELTA_TYPE
        };
        data.splice(index, 1), this.setState({ data });
        let { onUpdate, onDeltaUpdate } = this.props;
        onUpdate(keyPath[keyPath.length - 1], data), onDeltaUpdate(deltaUpdateResult);
      }).catch(logger4.error);
    };
  }
  handleAddValueAdd({ newValue }) {
    let { data, keyPath = [], nextDeep: deep } = this.state, { beforeAddAction, logger: logger4 } = this.props, key = data.length;
    (beforeAddAction || Promise.resolve.bind(Promise))(key, keyPath, deep, newValue).then(() => {
      data[key] = newValue, this.setState({
        data
      }), this.handleAddValueCancel();
      let { onUpdate, onDeltaUpdate } = this.props;
      onUpdate(keyPath[keyPath.length - 1], data), onDeltaUpdate({
        type: ADD_DELTA_TYPE,
        keyPath,
        deep,
        key,
        newValue
      });
    }).catch(logger4.error);
  }
  handleAddValueCancel() {
    this.setState({
      addFormVisible: !1
    });
  }
  handleEditValue({ key, value: value2 }) {
    return new Promise((resolve, reject) => {
      let { beforeUpdateAction } = this.props, { data, keyPath, nextDeep: deep } = this.state, oldValue = data[key];
      (beforeUpdateAction || Promise.resolve.bind(Promise))(key, keyPath, deep, oldValue, value2).then(() => {
        data[key] = value2, this.setState({
          data
        });
        let { onUpdate, onDeltaUpdate } = this.props;
        onUpdate(keyPath[keyPath.length - 1], data), onDeltaUpdate({
          type: UPDATE_DELTA_TYPE,
          keyPath,
          deep,
          key,
          newValue: value2,
          oldValue
        }), resolve(void 0);
      }).catch(reject);
    });
  }
  renderCollapsed() {
    let { name, data, keyPath, deep } = this.state, { handleRemove, readOnly, getStyle, dataType, minusMenuElement } = this.props, { minus, collapsed } = getStyle(name, data, keyPath, deep, dataType), isReadOnly = readOnly(name, data, keyPath, deep, dataType), removeItemButton = minusMenuElement && cloneElement2(minusMenuElement, {
      onClick: handleRemove,
      className: "rejt-minus-menu",
      style: minus,
      "aria-label": `remove the array '${String(name)}'`
    });
    return React9.createElement(React9.Fragment, null, React9.createElement("span", { style: collapsed }, "[...] ", data.length, " ", data.length === 1 ? "item" : "items"), !isReadOnly && removeItemButton);
  }
  renderNotCollapsed() {
    let { name, data, keyPath, deep, addFormVisible, nextDeep } = this.state, {
      isCollapsed,
      handleRemove,
      onDeltaUpdate,
      readOnly,
      getStyle,
      dataType,
      addButtonElement,
      cancelButtonElement,
      inputElementGenerator,
      textareaElementGenerator,
      minusMenuElement,
      plusMenuElement,
      beforeRemoveAction,
      beforeAddAction,
      beforeUpdateAction,
      logger: logger4,
      onSubmitValueParser
    } = this.props, { minus, plus, delimiter, ul, addForm } = getStyle(name, data, keyPath, deep, dataType), isReadOnly = readOnly(name, data, keyPath, deep, dataType), addItemButton = plusMenuElement && cloneElement2(plusMenuElement, {
      onClick: this.handleAddMode,
      className: "rejt-plus-menu",
      style: plus,
      "aria-label": `add a new item to the '${String(name)}' array`
    }), removeItemButton = minusMenuElement && cloneElement2(minusMenuElement, {
      onClick: handleRemove,
      className: "rejt-minus-menu",
      style: minus,
      "aria-label": `remove the array '${String(name)}'`
    });
    return React9.createElement(React9.Fragment, null, React9.createElement("span", { className: "rejt-not-collapsed-delimiter", style: delimiter }, "["), !addFormVisible && addItemButton, React9.createElement("ul", { className: "rejt-not-collapsed-list", style: ul }, data.map((item, index) => React9.createElement(
      JsonNode,
      {
        key: index,
        name: index.toString(),
        data: item,
        keyPath,
        deep: nextDeep,
        isCollapsed,
        handleRemove: this.handleRemoveItem(index),
        handleUpdateValue: this.handleEditValue,
        onUpdate: this.onChildUpdate,
        onDeltaUpdate,
        readOnly,
        getStyle,
        addButtonElement,
        cancelButtonElement,
        inputElementGenerator,
        textareaElementGenerator,
        minusMenuElement,
        plusMenuElement,
        beforeRemoveAction,
        beforeAddAction,
        beforeUpdateAction,
        logger: logger4,
        onSubmitValueParser
      }
    ))), !isReadOnly && addFormVisible && React9.createElement("div", { className: "rejt-add-form", style: addForm }, React9.createElement(
      JsonAddValue,
      {
        handleAdd: this.handleAddValueAdd,
        handleCancel: this.handleAddValueCancel,
        onlyValue: !0,
        addButtonElement,
        cancelButtonElement,
        inputElementGenerator,
        keyPath,
        deep,
        onSubmitValueParser
      }
    )), React9.createElement("span", { className: "rejt-not-collapsed-delimiter", style: delimiter }, "]"), !isReadOnly && removeItemButton);
  }
  render() {
    let { name, collapsed, keyPath, deep } = this.state, value2 = collapsed ? this.renderCollapsed() : this.renderNotCollapsed();
    return React9.createElement(
      JsonNodeAccordion,
      {
        name,
        collapsed,
        deep,
        keyPath,
        onClick: this.handleCollapseMode
      },
      value2
    );
  }
};
JsonArray.defaultProps = {
  keyPath: [],
  deep: 0,
  minusMenuElement: React9.createElement("span", null, " - "),
  plusMenuElement: React9.createElement("span", null, " + ")
};
var JsonFunctionValue = class extends Component {
  constructor(props) {
    super(props);
    let keyPath = [...props.keyPath || [], props.name];
    this.state = {
      value: props.value,
      name: props.name,
      keyPath: keyPath ?? [],
      deep: props.deep ?? 0,
      editEnabled: !1,
      inputRef: null
    }, this.handleEditMode = this.handleEditMode.bind(this), this.refInput = this.refInput.bind(this), this.handleCancelEdit = this.handleCancelEdit.bind(this), this.handleEdit = this.handleEdit.bind(this), this.onKeydown = this.onKeydown.bind(this);
  }
  static getDerivedStateFromProps(props, state) {
    return props.value !== state.value ? { value: props.value } : null;
  }
  componentDidUpdate() {
    let { editEnabled, inputRef, name, value: value2, keyPath, deep } = this.state, { readOnly, dataType } = this.props, readOnlyResult = readOnly(name, value2, keyPath, deep, dataType);
    editEnabled && !readOnlyResult && typeof inputRef.focus == "function" && inputRef.focus();
  }
  onKeydown(event) {
    let { inputRef } = this.state;
    event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat || inputRef !== event.target || ((event.code === "Enter" || event.key === "Enter") && (event.preventDefault(), this.handleEdit()), (event.code === "Escape" || event.key === "Escape") && (event.preventDefault(), this.handleCancelEdit()));
  }
  handleEdit() {
    let { handleUpdateValue, originalValue, logger: logger4, onSubmitValueParser, keyPath } = this.props, { inputRef, name, deep } = this.state;
    if (!inputRef)
      return;
    let newValue = onSubmitValueParser(!0, keyPath, deep, name, inputRef.value), result = {
      value: newValue,
      key: name
    };
    (handleUpdateValue || Promise.resolve.bind(Promise))(result).then(() => {
      isComponentWillChange(originalValue, newValue) || this.handleCancelEdit();
    }).catch(logger4.error);
  }
  handleEditMode() {
    this.setState({
      editEnabled: !0
    });
  }
  refInput(node) {
    this.state.inputRef = node;
  }
  handleCancelEdit() {
    this.setState({
      editEnabled: !1
    });
  }
  render() {
    let { name, value: value2, editEnabled, keyPath, deep } = this.state, {
      handleRemove,
      originalValue,
      readOnly,
      dataType,
      getStyle,
      textareaElementGenerator,
      minusMenuElement,
      keyPath: comeFromKeyPath = []
    } = this.props, style = getStyle(name, originalValue, keyPath, deep, dataType), result = null, minusElement = null, resultOnlyResult = readOnly(name, originalValue, keyPath, deep, dataType);
    if (editEnabled && !resultOnlyResult) {
      let textareaElement = textareaElementGenerator(
        VALUE,
        comeFromKeyPath,
        deep,
        name,
        originalValue,
        dataType
      ), textareaElementLayout = cloneElement2(textareaElement, {
        ref: this.refInput,
        defaultValue: value2,
        onKeyDown: this.onKeydown
      });
      result = React9.createElement("span", { className: "rejt-edit-form", style: style.editForm }, textareaElementLayout), minusElement = null;
    } else {
      result = React9.createElement(
        "span",
        {
          className: "rejt-value",
          style: style.value,
          onClick: resultOnlyResult ? void 0 : this.handleEditMode
        },
        value2
      );
      let parentPropertyName = comeFromKeyPath.at(-1), minusMenuLayout = minusMenuElement && cloneElement2(minusMenuElement, {
        onClick: handleRemove,
        className: "rejt-minus-menu",
        style: style.minus,
        "aria-label": `remove the function '${String(name)}'${String(parentPropertyName) ? ` from '${String(parentPropertyName)}'` : ""}`
      });
      minusElement = resultOnlyResult ? null : minusMenuLayout;
    }
    return React9.createElement("li", { className: "rejt-value-node", style: style.li }, React9.createElement("span", { className: "rejt-name", style: style.name }, name, " :", " "), result, minusElement);
  }
};
JsonFunctionValue.defaultProps = {
  keyPath: [],
  deep: 0,
  handleUpdateValue: () => {
  },
  cancelButtonElement: React9.createElement("button", null, "c"),
  minusMenuElement: React9.createElement("span", null, " - ")
};
var JsonNode = class extends Component {
  constructor(props) {
    super(props), this.state = {
      data: props.data,
      name: props.name,
      keyPath: props.keyPath ?? [],
      deep: props.deep ?? 0
    };
  }
  static getDerivedStateFromProps(props, state) {
    return props.data !== state.data ? { data: props.data } : null;
  }
  render() {
    let { data, name, keyPath, deep } = this.state, {
      isCollapsed,
      handleRemove,
      handleUpdateValue,
      onUpdate,
      onDeltaUpdate,
      readOnly,
      getStyle,
      addButtonElement,
      cancelButtonElement,
      inputElementGenerator,
      textareaElementGenerator,
      minusMenuElement,
      plusMenuElement,
      beforeRemoveAction,
      beforeAddAction,
      beforeUpdateAction,
      logger: logger4,
      onSubmitValueParser
    } = this.props, readOnlyTrue = () => !0, dataType = getObjectType(data);
    switch (dataType) {
      case ERROR:
        return React9.createElement(
          JsonObject,
          {
            data,
            name,
            isCollapsed,
            keyPath,
            deep,
            handleRemove,
            onUpdate,
            onDeltaUpdate,
            readOnly: readOnlyTrue,
            dataType,
            getStyle,
            addButtonElement,
            cancelButtonElement,
            inputElementGenerator,
            textareaElementGenerator,
            minusMenuElement,
            plusMenuElement,
            beforeRemoveAction,
            beforeAddAction,
            beforeUpdateAction,
            logger: logger4,
            onSubmitValueParser
          }
        );
      case OBJECT:
        return React9.createElement(
          JsonObject,
          {
            data,
            name,
            isCollapsed,
            keyPath,
            deep,
            handleRemove,
            onUpdate,
            onDeltaUpdate,
            readOnly,
            dataType,
            getStyle,
            addButtonElement,
            cancelButtonElement,
            inputElementGenerator,
            textareaElementGenerator,
            minusMenuElement,
            plusMenuElement,
            beforeRemoveAction,
            beforeAddAction,
            beforeUpdateAction,
            logger: logger4,
            onSubmitValueParser
          }
        );
      case ARRAY:
        return React9.createElement(
          JsonArray,
          {
            data,
            name,
            isCollapsed,
            keyPath,
            deep,
            handleRemove,
            onUpdate,
            onDeltaUpdate,
            readOnly,
            dataType,
            getStyle,
            addButtonElement,
            cancelButtonElement,
            inputElementGenerator,
            textareaElementGenerator,
            minusMenuElement,
            plusMenuElement,
            beforeRemoveAction,
            beforeAddAction,
            beforeUpdateAction,
            logger: logger4,
            onSubmitValueParser
          }
        );
      case STRING:
        return React9.createElement(
          JsonValue,
          {
            name,
            value: `"${data}"`,
            originalValue: data,
            keyPath,
            deep,
            handleRemove,
            handleUpdateValue,
            readOnly,
            dataType,
            getStyle,
            cancelButtonElement,
            inputElementGenerator,
            minusMenuElement,
            logger: logger4,
            onSubmitValueParser
          }
        );
      case NUMBER:
        return React9.createElement(
          JsonValue,
          {
            name,
            value: data,
            originalValue: data,
            keyPath,
            deep,
            handleRemove,
            handleUpdateValue,
            readOnly,
            dataType,
            getStyle,
            cancelButtonElement,
            inputElementGenerator,
            minusMenuElement,
            logger: logger4,
            onSubmitValueParser
          }
        );
      case BOOLEAN:
        return React9.createElement(
          JsonValue,
          {
            name,
            value: data ? "true" : "false",
            originalValue: data,
            keyPath,
            deep,
            handleRemove,
            handleUpdateValue,
            readOnly,
            dataType,
            getStyle,
            cancelButtonElement,
            inputElementGenerator,
            minusMenuElement,
            logger: logger4,
            onSubmitValueParser
          }
        );
      case DATE:
        return React9.createElement(
          JsonValue,
          {
            name,
            value: data.toISOString(),
            originalValue: data,
            keyPath,
            deep,
            handleRemove,
            handleUpdateValue,
            readOnly: readOnlyTrue,
            dataType,
            getStyle,
            cancelButtonElement,
            inputElementGenerator,
            minusMenuElement,
            logger: logger4,
            onSubmitValueParser
          }
        );
      case NULL:
        return React9.createElement(
          JsonValue,
          {
            name,
            value: "null",
            originalValue: "null",
            keyPath,
            deep,
            handleRemove,
            handleUpdateValue,
            readOnly,
            dataType,
            getStyle,
            cancelButtonElement,
            inputElementGenerator,
            minusMenuElement,
            logger: logger4,
            onSubmitValueParser
          }
        );
      case UNDEFINED:
        return React9.createElement(
          JsonValue,
          {
            name,
            value: "undefined",
            originalValue: "undefined",
            keyPath,
            deep,
            handleRemove,
            handleUpdateValue,
            readOnly,
            dataType,
            getStyle,
            cancelButtonElement,
            inputElementGenerator,
            minusMenuElement,
            logger: logger4,
            onSubmitValueParser
          }
        );
      case FUNCTION:
        return React9.createElement(
          JsonFunctionValue,
          {
            name,
            value: data.toString(),
            originalValue: data,
            keyPath,
            deep,
            handleRemove,
            handleUpdateValue,
            readOnly,
            dataType,
            getStyle,
            cancelButtonElement,
            textareaElementGenerator,
            minusMenuElement,
            logger: logger4,
            onSubmitValueParser
          }
        );
      case SYMBOL:
        return React9.createElement(
          JsonValue,
          {
            name,
            value: data.toString(),
            originalValue: data,
            keyPath,
            deep,
            handleRemove,
            handleUpdateValue,
            readOnly: readOnlyTrue,
            dataType,
            getStyle,
            cancelButtonElement,
            inputElementGenerator,
            minusMenuElement,
            logger: logger4,
            onSubmitValueParser
          }
        );
      default:
        return null;
    }
  }
};
JsonNode.defaultProps = {
  keyPath: [],
  deep: 0
};
var JsonObject = class extends Component {
  constructor(props) {
    super(props);
    let keyPath = props.deep === -1 ? [] : [...props.keyPath || [], props.name];
    this.state = {
      name: props.name,
      data: props.data,
      keyPath: keyPath ?? [],
      deep: props.deep ?? 0,
      nextDeep: (props.deep ?? 0) + 1,
      collapsed: props.isCollapsed(keyPath, props.deep ?? 0, props.data),
      addFormVisible: !1
    }, this.handleCollapseMode = this.handleCollapseMode.bind(this), this.handleRemoveValue = this.handleRemoveValue.bind(this), this.handleAddMode = this.handleAddMode.bind(this), this.handleAddValueAdd = this.handleAddValueAdd.bind(this), this.handleAddValueCancel = this.handleAddValueCancel.bind(this), this.handleEditValue = this.handleEditValue.bind(this), this.onChildUpdate = this.onChildUpdate.bind(this), this.renderCollapsed = this.renderCollapsed.bind(this), this.renderNotCollapsed = this.renderNotCollapsed.bind(this);
  }
  static getDerivedStateFromProps(props, state) {
    return props.data !== state.data ? { data: props.data } : null;
  }
  onChildUpdate(childKey, childData) {
    let { data, keyPath = [] } = this.state;
    data[childKey] = childData, this.setState({
      data
    });
    let { onUpdate } = this.props, size = keyPath.length;
    onUpdate(keyPath[size - 1], data);
  }
  handleAddMode() {
    this.setState({
      addFormVisible: !0
    });
  }
  handleAddValueCancel() {
    this.setState({
      addFormVisible: !1
    });
  }
  handleAddValueAdd({ key, newValue }) {
    let { data, keyPath = [], nextDeep: deep } = this.state, { beforeAddAction, logger: logger4 } = this.props;
    (beforeAddAction || Promise.resolve.bind(Promise))(key, keyPath, deep, newValue).then(() => {
      data[key] = newValue, this.setState({
        data
      }), this.handleAddValueCancel();
      let { onUpdate, onDeltaUpdate } = this.props;
      onUpdate(keyPath[keyPath.length - 1], data), onDeltaUpdate({
        type: ADD_DELTA_TYPE,
        keyPath,
        deep,
        key,
        newValue
      });
    }).catch(logger4.error);
  }
  handleRemoveValue(key) {
    return () => {
      let { beforeRemoveAction, logger: logger4 } = this.props, { data, keyPath = [], nextDeep: deep } = this.state, oldValue = data[key];
      (beforeRemoveAction || Promise.resolve.bind(Promise))(key, keyPath, deep, oldValue).then(() => {
        let deltaUpdateResult = {
          keyPath,
          deep,
          key,
          oldValue,
          type: REMOVE_DELTA_TYPE
        };
        delete data[key], this.setState({ data });
        let { onUpdate, onDeltaUpdate } = this.props;
        onUpdate(keyPath[keyPath.length - 1], data), onDeltaUpdate(deltaUpdateResult);
      }).catch(logger4.error);
    };
  }
  handleCollapseMode() {
    this.setState((state) => ({
      collapsed: !state.collapsed
    }));
  }
  handleEditValue({ key, value: value2 }) {
    return new Promise((resolve, reject) => {
      let { beforeUpdateAction } = this.props, { data, keyPath = [], nextDeep: deep } = this.state, oldValue = data[key];
      (beforeUpdateAction || Promise.resolve.bind(Promise))(key, keyPath, deep, oldValue, value2).then(() => {
        data[key] = value2, this.setState({
          data
        });
        let { onUpdate, onDeltaUpdate } = this.props;
        onUpdate(keyPath[keyPath.length - 1], data), onDeltaUpdate({
          type: UPDATE_DELTA_TYPE,
          keyPath,
          deep,
          key,
          newValue: value2,
          oldValue
        }), resolve();
      }).catch(reject);
    });
  }
  renderCollapsed() {
    let { name, keyPath, deep, data } = this.state, { handleRemove, readOnly, dataType, getStyle, minusMenuElement } = this.props, { minus, collapsed } = getStyle(name, data, keyPath, deep, dataType), keyList = Object.getOwnPropertyNames(data), isReadOnly = readOnly(name, data, keyPath, deep, dataType), removeItemButton = minusMenuElement && cloneElement2(minusMenuElement, {
      onClick: handleRemove,
      className: "rejt-minus-menu",
      style: minus,
      "aria-label": `remove the object '${String(name)}'`
    });
    return React9.createElement(React9.Fragment, null, React9.createElement("span", { style: collapsed }, "{...}", " ", keyList.length, " ", keyList.length === 1 ? "key" : "keys"), !isReadOnly && removeItemButton);
  }
  renderNotCollapsed() {
    let { name, data, keyPath, deep, nextDeep, addFormVisible } = this.state, {
      isCollapsed,
      handleRemove,
      onDeltaUpdate,
      readOnly,
      getStyle,
      dataType,
      addButtonElement,
      cancelButtonElement,
      inputElementGenerator,
      textareaElementGenerator,
      minusMenuElement,
      plusMenuElement,
      beforeRemoveAction,
      beforeAddAction,
      beforeUpdateAction,
      logger: logger4,
      onSubmitValueParser
    } = this.props, { minus, plus, addForm, ul, delimiter } = getStyle(name, data, keyPath, deep, dataType), keyList = Object.getOwnPropertyNames(data), isReadOnly = readOnly(name, data, keyPath, deep, dataType), addItemButton = plusMenuElement && cloneElement2(plusMenuElement, {
      onClick: this.handleAddMode,
      className: "rejt-plus-menu",
      style: plus,
      "aria-label": `add a new property to the object '${String(name)}'`
    }), removeItemButton = minusMenuElement && cloneElement2(minusMenuElement, {
      onClick: handleRemove,
      className: "rejt-minus-menu",
      style: minus,
      "aria-label": `remove the object '${String(name)}'`
    }), list = keyList.map((key) => React9.createElement(
      JsonNode,
      {
        key,
        name: key,
        data: data[key],
        keyPath,
        deep: nextDeep,
        isCollapsed,
        handleRemove: this.handleRemoveValue(key),
        handleUpdateValue: this.handleEditValue,
        onUpdate: this.onChildUpdate,
        onDeltaUpdate,
        readOnly,
        getStyle,
        addButtonElement,
        cancelButtonElement,
        inputElementGenerator,
        textareaElementGenerator,
        minusMenuElement,
        plusMenuElement,
        beforeRemoveAction,
        beforeAddAction,
        beforeUpdateAction,
        logger: logger4,
        onSubmitValueParser
      }
    ));
    return React9.createElement(React9.Fragment, null, React9.createElement("span", { className: "rejt-not-collapsed-delimiter", style: delimiter }, "{"), !isReadOnly && addItemButton, React9.createElement("ul", { className: "rejt-not-collapsed-list", style: ul }, list), !isReadOnly && addFormVisible && React9.createElement("div", { className: "rejt-add-form", style: addForm }, React9.createElement(
      JsonAddValue,
      {
        handleAdd: this.handleAddValueAdd,
        handleCancel: this.handleAddValueCancel,
        addButtonElement,
        cancelButtonElement,
        inputElementGenerator,
        keyPath,
        deep,
        onSubmitValueParser
      }
    )), React9.createElement("span", { className: "rejt-not-collapsed-delimiter", style: delimiter }, "}"), !isReadOnly && removeItemButton);
  }
  render() {
    let { name, collapsed, keyPath, deep = 0 } = this.state, value2 = collapsed ? this.renderCollapsed() : this.renderNotCollapsed();
    return React9.createElement(
      JsonNodeAccordion,
      {
        name,
        collapsed,
        deep,
        keyPath,
        onClick: this.handleCollapseMode
      },
      value2
    );
  }
};
JsonObject.defaultProps = {
  keyPath: [],
  deep: 0,
  minusMenuElement: React9.createElement("span", null, " - "),
  plusMenuElement: React9.createElement("span", null, " + ")
};
var JsonValue = class extends Component {
  constructor(props) {
    super(props);
    let keyPath = [...props.keyPath || [], props.name];
    this.state = {
      value: props.value,
      name: props.name,
      keyPath: keyPath ?? [],
      deep: props.deep ?? 0,
      editEnabled: !1,
      inputRef: null
    }, this.handleEditMode = this.handleEditMode.bind(this), this.refInput = this.refInput.bind(this), this.handleCancelEdit = this.handleCancelEdit.bind(this), this.handleEdit = this.handleEdit.bind(this), this.onKeydown = this.onKeydown.bind(this);
  }
  static getDerivedStateFromProps(props, state) {
    return props.value !== state.value ? { value: props.value } : null;
  }
  componentDidUpdate() {
    let { editEnabled, inputRef, name, value: value2, keyPath, deep } = this.state, { readOnly, dataType } = this.props, isReadOnly = readOnly(name, value2, keyPath, deep, dataType);
    editEnabled && !isReadOnly && typeof inputRef.focus == "function" && inputRef.focus();
  }
  onKeydown(event) {
    let { inputRef } = this.state;
    event.altKey || event.ctrlKey || event.metaKey || event.shiftKey || event.repeat || inputRef !== event.target || ((event.code === "Enter" || event.key === "Enter") && (event.preventDefault(), this.handleEdit()), (event.code === "Escape" || event.key === "Escape") && (event.preventDefault(), this.handleCancelEdit()));
  }
  handleEdit() {
    let { handleUpdateValue, originalValue, logger: logger4, onSubmitValueParser, keyPath } = this.props, { inputRef, name, deep } = this.state;
    if (!inputRef)
      return;
    let newValue = onSubmitValueParser(!0, keyPath, deep, name, inputRef.value), result = {
      value: newValue,
      key: name
    };
    (handleUpdateValue || Promise.resolve.bind(Promise))(result).then(() => {
      isComponentWillChange(originalValue, newValue) || this.handleCancelEdit();
    }).catch(logger4.error);
  }
  handleEditMode() {
    this.setState({
      editEnabled: !0
    });
  }
  refInput(node) {
    this.state.inputRef = node;
  }
  handleCancelEdit() {
    this.setState({
      editEnabled: !1
    });
  }
  render() {
    let { name, value: value2, editEnabled, keyPath, deep } = this.state, {
      handleRemove,
      originalValue,
      readOnly,
      dataType,
      getStyle,
      inputElementGenerator,
      minusMenuElement,
      keyPath: comeFromKeyPath
    } = this.props, style = getStyle(name, originalValue, keyPath, deep, dataType), isReadOnly = readOnly(name, originalValue, keyPath, deep, dataType), isEditing = editEnabled && !isReadOnly, inputElement = inputElementGenerator(
      VALUE,
      comeFromKeyPath,
      deep,
      name,
      originalValue,
      dataType
    ), inputElementLayout = cloneElement2(inputElement, {
      ref: this.refInput,
      defaultValue: JSON.stringify(originalValue),
      onKeyDown: this.onKeydown
    }), parentPropertyName = keyPath.at(-2), minusMenuLayout = minusMenuElement && cloneElement2(minusMenuElement, {
      onClick: handleRemove,
      className: "rejt-minus-menu",
      style: style.minus,
      "aria-label": `remove the property '${String(name)}' with value '${String(originalValue)}'${String(parentPropertyName) ? ` from '${String(parentPropertyName)}'` : ""}`
    });
    return React9.createElement("li", { className: "rejt-value-node", style: style.li }, React9.createElement("span", { className: "rejt-name", style: style.name }, name, " : "), isEditing ? React9.createElement("span", { className: "rejt-edit-form", style: style.editForm }, inputElementLayout) : React9.createElement(
      "span",
      {
        className: "rejt-value",
        style: style.value,
        onClick: isReadOnly ? void 0 : this.handleEditMode
      },
      String(value2)
    ), !isReadOnly && !isEditing && minusMenuLayout);
  }
};
JsonValue.defaultProps = {
  keyPath: [],
  deep: 0,
  handleUpdateValue: () => Promise.resolve(),
  cancelButtonElement: React9.createElement("button", null, "c"),
  minusMenuElement: React9.createElement("span", null, " - ")
};

// src/blocks/controls/react-editable-json-tree/utils/parse.ts
function parse3(string) {
  let result = string;
  if (result.indexOf("function") === 0)
    return (0, eval)(`(${result})`);
  try {
    result = JSON.parse(string);
  } catch {
  }
  return result;
}

// src/blocks/controls/react-editable-json-tree/utils/styles.ts
var object = {
  minus: {
    color: "red"
  },
  plus: {
    color: "green"
  },
  collapsed: {
    color: "grey"
  },
  delimiter: {},
  ul: {
    padding: "0px",
    margin: "0 0 0 25px",
    listStyle: "none"
  },
  name: {
    color: "#2287CD"
  },
  addForm: {}
}, array = {
  minus: {
    color: "red"
  },
  plus: {
    color: "green"
  },
  collapsed: {
    color: "grey"
  },
  delimiter: {},
  ul: {
    padding: "0px",
    margin: "0 0 0 25px",
    listStyle: "none"
  },
  name: {
    color: "#2287CD"
  },
  addForm: {}
}, value = {
  minus: {
    color: "red"
  },
  editForm: {},
  value: {
    color: "#7bba3d"
  },
  li: {
    minHeight: "22px",
    lineHeight: "22px",
    outline: "0px"
  },
  name: {
    color: "#2287CD"
  }
};

// src/blocks/controls/react-editable-json-tree/index.tsx
var JsonTree = class extends Component2 {
  constructor(props) {
    super(props), this.state = {
      data: props.data,
      rootName: props.rootName
    }, this.onUpdate = this.onUpdate.bind(this), this.removeRoot = this.removeRoot.bind(this);
  }
  static getDerivedStateFromProps(props, state) {
    return props.data !== state.data || props.rootName !== state.rootName ? {
      data: props.data,
      rootName: props.rootName
    } : null;
  }
  onUpdate(key, data) {
    this.setState({ data }), this.props.onFullyUpdate?.(data);
  }
  removeRoot() {
    this.onUpdate(null, null);
  }
  render() {
    let { data, rootName } = this.state, {
      isCollapsed,
      onDeltaUpdate,
      readOnly,
      getStyle,
      addButtonElement,
      cancelButtonElement,
      inputElement,
      textareaElement,
      minusMenuElement,
      plusMenuElement,
      beforeRemoveAction,
      beforeAddAction,
      beforeUpdateAction,
      logger: logger4,
      onSubmitValueParser,
      fallback = null
    } = this.props, dataType = getObjectType(data), readOnlyFunction = readOnly;
    getObjectType(readOnly) === "Boolean" && (readOnlyFunction = () => readOnly);
    let inputElementFunction = inputElement;
    inputElement && getObjectType(inputElement) !== "Function" && (inputElementFunction = () => inputElement);
    let textareaElementFunction = textareaElement;
    return textareaElement && getObjectType(textareaElement) !== "Function" && (textareaElementFunction = () => textareaElement), dataType === "Object" || dataType === "Array" ? React10.createElement("div", { className: "rejt-tree" }, React10.createElement(
      JsonNode,
      {
        data,
        name: rootName || "root",
        deep: -1,
        isCollapsed: isCollapsed ?? (() => !1),
        onUpdate: this.onUpdate,
        onDeltaUpdate: onDeltaUpdate ?? (() => {
        }),
        readOnly: readOnlyFunction,
        getStyle: getStyle ?? (() => ({})),
        addButtonElement,
        cancelButtonElement,
        inputElementGenerator: inputElementFunction,
        textareaElementGenerator: textareaElementFunction,
        minusMenuElement,
        plusMenuElement,
        handleRemove: this.removeRoot,
        beforeRemoveAction,
        beforeAddAction,
        beforeUpdateAction,
        logger: logger4 ?? {},
        onSubmitValueParser: onSubmitValueParser ?? ((val) => val)
      }
    )) : fallback;
  }
};
JsonTree.defaultProps = {
  rootName: "root",
  isCollapsed: (keyPath, deep) => deep !== -1,
  getStyle: (keyName, data, keyPath, deep, dataType) => {
    switch (dataType) {
      case "Object":
      case "Error":
        return object;
      case "Array":
        return array;
      default:
        return value;
    }
  },
  readOnly: () => !1,
  onFullyUpdate: () => {
  },
  onDeltaUpdate: () => {
  },
  beforeRemoveAction: () => Promise.resolve(),
  beforeAddAction: () => Promise.resolve(),
  beforeUpdateAction: () => Promise.resolve(),
  logger: { error: () => {
  } },
  onSubmitValueParser: (isEditMode, keyPath, deep, name, rawValue) => parse3(rawValue),
  inputElement: () => React10.createElement("input", null),
  textareaElement: () => React10.createElement("textarea", null),
  fallback: null
};

// src/blocks/controls/Object.tsx
var { window: globalWindow } = globalThis, Wrapper4 = styled8.div(({ theme }) => ({
  position: "relative",
  display: "flex",
  isolation: "isolate",
  ".rejt-tree": {
    marginLeft: "1rem",
    fontSize: "13px",
    listStyleType: "none"
  },
  ".rejt-value-node:hover": {
    "& > button": {
      opacity: 1
    }
  },
  ".rejt-add-form": {
    marginLeft: 10
  },
  ".rejt-add-value-node": {
    display: "inline-flex",
    alignItems: "center"
  },
  ".rejt-name": {
    lineHeight: "22px"
  },
  ".rejt-not-collapsed-delimiter": {
    lineHeight: "22px"
  },
  ".rejt-value": {
    display: "inline-block",
    border: "1px solid transparent",
    borderRadius: 4,
    margin: "1px 0",
    padding: "0 4px",
    cursor: "text",
    color: theme.color.defaultText
  },
  ".rejt-value-node:hover > .rejt-value": {
    background: theme.base === "light" ? theme.color.lighter : "hsl(0 0 100 / 0.02)",
    borderColor: theme.appBorderColor
  }
})), ButtonInline = styled8.button(({ theme, primary }) => ({
  border: 0,
  height: 20,
  margin: 1,
  borderRadius: 4,
  background: primary ? theme.color.secondary : "transparent",
  color: primary ? theme.color.lightest : theme.color.dark,
  fontWeight: primary ? "bold" : "normal",
  cursor: "pointer"
})), ActionButton = styled8.button(({ theme }) => ({
  background: "none",
  border: 0,
  display: "inline-flex",
  verticalAlign: "middle",
  padding: 3,
  marginLeft: 5,
  color: theme.textMutedColor,
  opacity: 0,
  transition: "opacity 0.2s",
  cursor: "pointer",
  position: "relative",
  svg: {
    width: 9,
    height: 9
  },
  ":disabled": {
    cursor: "not-allowed"
  },
  ":hover, :focus-visible": {
    opacity: 1
  },
  "&:hover:not(:disabled), &:focus-visible:not(:disabled)": {
    "&.rejt-plus-menu": {
      color: theme.color.ancillary
    },
    "&.rejt-minus-menu": {
      color: theme.color.negative
    }
  }
})), Input = styled8.input(({ theme, placeholder }) => ({
  outline: 0,
  margin: placeholder ? 1 : "1px 0",
  padding: "3px 4px",
  color: theme.color.defaultText,
  background: theme.background.app,
  border: `1px solid ${theme.appBorderColor}`,
  borderRadius: 4,
  lineHeight: "14px",
  width: placeholder === "Key" ? 80 : 120,
  "&:focus": {
    border: `1px solid ${theme.color.secondary}`
  }
})), RawButton = styled8(ToggleButton)({
  position: "absolute",
  zIndex: 2,
  top: 2,
  right: 2
}), RawInput = styled8(Form3.Textarea)(({ theme }) => ({
  flex: 1,
  padding: "7px 6px",
  fontFamily: theme.typography.fonts.mono,
  fontSize: "12px",
  lineHeight: "18px",
  "&::placeholder": {
    fontFamily: theme.typography.fonts.base,
    fontSize: "13px"
  },
  "&:placeholder-shown": {
    padding: "7px 10px"
  }
})), ENTER_EVENT = {
  bubbles: !0,
  cancelable: !0,
  key: "Enter",
  code: "Enter",
  keyCode: 13
}, dispatchEnterKey = (event) => {
  event.currentTarget.dispatchEvent(new globalWindow.KeyboardEvent("keydown", ENTER_EVENT));
}, selectValue = (event) => {
  event.currentTarget.select();
}, getCustomStyleFunction = (theme) => () => ({
  name: {
    color: theme.color.secondary
  },
  collapsed: {
    color: theme.color.dark
  },
  ul: {
    listStyle: "none",
    margin: "0 0 0 1rem",
    padding: 0
  },
  li: {
    outline: 0
  }
}), ObjectControl = ({ name, value: value2, onChange, argType }) => {
  let theme = useTheme(), data = useMemo(() => value2 && cloneDeep(value2), [value2]), hasData = data != null, [showRaw, setShowRaw] = useState4(!hasData), [parseError, setParseError] = useState4(null), readonly = !!argType?.table?.readonly, updateRaw = useCallback3(
    (raw) => {
      try {
        raw && onChange(JSON.parse(raw)), setParseError(null);
      } catch (e2) {
        setParseError(e2);
      }
    },
    [onChange]
  ), [forceVisible, setForceVisible] = useState4(!1), onForceVisible = useCallback3(() => {
    onChange({}), setForceVisible(!0);
  }, [setForceVisible]), htmlElRef = useRef3(null);
  if (useEffect4(() => {
    forceVisible && htmlElRef.current && htmlElRef.current.select();
  }, [forceVisible]), !hasData)
    return React11.createElement(
      Button3,
      {
        ariaLabel: !1,
        disabled: readonly,
        id: getControlSetterButtonId(name),
        onClick: onForceVisible
      },
      "Set object"
    );
  let rawJSONForm = React11.createElement(
    RawInput,
    {
      ref: htmlElRef,
      id: getControlId(name),
      minRows: 3,
      name,
      defaultValue: value2 === null ? "" : JSON.stringify(value2, null, 2),
      onBlur: (event) => updateRaw(event.target.value),
      placeholder: "Edit JSON string...",
      autoFocus: forceVisible,
      valid: parseError ? "error" : void 0,
      readOnly: readonly
    }
  ), isObjectOrArray = Array.isArray(value2) || typeof value2 == "object" && value2?.constructor === Object;
  return React11.createElement(Wrapper4, null, isObjectOrArray && React11.createElement(
    RawButton,
    {
      disabled: readonly,
      pressed: showRaw,
      ariaLabel: `Edit the ${name} properties in JSON format`,
      onClick: (e2) => {
        e2.preventDefault(), setShowRaw((isRaw) => !isRaw);
      }
    },
    "Edit JSON"
  ), showRaw ? rawJSONForm : React11.createElement(
    JsonTree,
    {
      readOnly: readonly || !isObjectOrArray,
      isCollapsed: isObjectOrArray ? (
        /* default value */
        void 0
      ) : () => !0,
      data,
      rootName: name,
      onFullyUpdate: onChange,
      getStyle: getCustomStyleFunction(theme),
      cancelButtonElement: React11.createElement(ButtonInline, { type: "button" }, "Cancel"),
      addButtonElement: React11.createElement(ButtonInline, { type: "submit", primary: !0 }, "Save"),
      plusMenuElement: React11.createElement(ActionButton, { type: "button" }, React11.createElement(AddIcon, null)),
      minusMenuElement: React11.createElement(ActionButton, { type: "button" }, React11.createElement(SubtractIcon, null)),
      inputElement: (_2, __, ___, key) => key ? React11.createElement(Input, { onFocus: selectValue, onBlur: dispatchEnterKey }) : React11.createElement(Input, null),
      fallback: rawJSONForm
    }
  ));
};

// src/blocks/controls/Range.tsx
import React12, { useMemo as useMemo2 } from "react";
import { styled as styled9 } from "storybook/theming";
var RangeInput = styled9.input(
  ({ theme, min, max, value: value2, disabled }) => {
    let trackBaseStyles = {
      background: theme.base === "light" ? `linear-gradient(to right, 
          ${theme.color.green} 0%, ${theme.color.green} ${(value2 - min) / (max - min) * 100}%, 
          ${curriedDarken$1(0.02, theme.input.background)} ${(value2 - min) / (max - min) * 100}%, 
          ${curriedDarken$1(0.02, theme.input.background)} 100%)` : `linear-gradient(to right, 
          ${theme.color.green} 0%, ${theme.color.green} ${(value2 - min) / (max - min) * 100}%, 
          ${curriedLighten$1(0.02, theme.input.background)} ${(value2 - min) / (max - min) * 100}%, 
          ${curriedLighten$1(0.02, theme.input.background)} 100%)`,
      borderRadius: 6,
      boxShadow: `${theme.base == "dark" ? "hsl(0 0 100 / 0.4)" : "hsl(0 0 0 / 0.44)"} 0 0 0 1px inset`,
      cursor: disabled ? "not-allowed" : "pointer",
      height: 6,
      width: "100%"
    }, trackFocusStyles = {
      borderColor: rgba(theme.color.secondary, 0.4)
    }, thumbBaseStyles = {
      width: 16,
      height: 16,
      borderRadius: 50,
      cursor: disabled ? "not-allowed" : "grab",
      background: theme.input.background,
      border: `1px solid ${theme.base == "dark" ? "hsl(0 0 100 / 0.4)" : "hsl(0 0 0 / 0.44)"}`,
      boxShadow: theme.base === "light" ? `0 1px 3px 0px ${rgba(theme.appBorderColor, 0.2)}` : "unset",
      transition: "all 150ms ease-out"
    }, thumbHoverStyles = {
      background: `${curriedDarken$1(0.05, theme.input.background)}`,
      transform: "scale3d(1.1, 1.1, 1.1) translateY(-1px)",
      transition: "all 50ms ease-out"
    }, thumbActiveStyles = {
      background: `${theme.input.background}`,
      transform: "scale3d(1, 1, 1) translateY(0px)"
    }, thumbFocusStyles = {
      borderColor: theme.color.secondary,
      boxShadow: theme.base === "light" ? `0 0px 5px 0px ${theme.color.secondary}` : "unset"
    };
    return {
      // Restyled using http://danielstern.ca/range.css/#/
      appearance: "none",
      backgroundColor: "transparent",
      width: "100%",
      // Track styles
      "&::-webkit-slider-runnable-track": trackBaseStyles,
      "&::-moz-range-track": trackBaseStyles,
      "&::-ms-track": {
        ...trackBaseStyles,
        color: "transparent"
      },
      // Thumb styles
      "&::-moz-range-thumb": {
        ...thumbBaseStyles,
        "&:hover": thumbHoverStyles,
        "&:active": thumbActiveStyles
      },
      "&::-webkit-slider-thumb": {
        ...thumbBaseStyles,
        marginTop: "-6px",
        appearance: "none",
        "&:hover": thumbHoverStyles,
        "&:active": thumbActiveStyles
      },
      "&::-ms-thumb": {
        ...thumbBaseStyles,
        marginTop: 0,
        "&:hover": thumbHoverStyles,
        "&:active": thumbActiveStyles
      },
      "&:focus": {
        outline: "none",
        "&::-webkit-slider-runnable-track": trackFocusStyles,
        "&::-moz-range-track": trackFocusStyles,
        "&::-ms-track": trackFocusStyles,
        "&::-webkit-slider-thumb": thumbFocusStyles,
        "&::-moz-range-thumb": thumbFocusStyles,
        "&::-ms-thumb": thumbFocusStyles
      },
      "&::-ms-fill-lower": {
        borderRadius: 6
      },
      "&::-ms-fill-upper": {
        borderRadius: 6
      },
      "@supports (-ms-ime-align:auto)": { "input[type=range]": { margin: "0" } }
    };
  }
), RangeLabel = styled9.span({
  paddingLeft: 5,
  paddingRight: 5,
  fontSize: 12,
  whiteSpace: "nowrap",
  fontFeatureSettings: "tnum",
  fontVariantNumeric: "tabular-nums"
}), RangeCurrentAndMaxLabel = styled9(RangeLabel)(({ numberOFDecimalsPlaces, max }) => ({
  // Fixed width of "current / max" label to avoid slider width changes
  // 3 = size of separator " / "
  width: `${numberOFDecimalsPlaces + max.toString().length * 2 + 3}ch`,
  textAlign: "right",
  flexShrink: 0
})), RangeWrapper = styled9.div(({ readOnly }) => ({
  display: "flex",
  alignItems: "center",
  width: "100%",
  opacity: readOnly ? 0.5 : 1
}));
function getNumberOfDecimalPlaces(number) {
  let match = number.toString().match(/(?:\.(\d+))?(?:[eE]([+-]?\d+))?$/);
  return match ? Math.max(
    0,
    // Number of digits right of decimal point.
    (match[1] ? match[1].length : 0) - // Adjust for scientific notation.
    (match[2] ? +match[2] : 0)
  ) : 0;
}
var RangeControl = ({
  name,
  value: value2,
  onChange,
  min = 0,
  max = 100,
  step = 1,
  onBlur,
  onFocus,
  argType
}) => {
  let handleChange = (event) => {
    onChange(parse2(event.target.value));
  }, hasValue = value2 !== void 0, numberOFDecimalsPlaces = useMemo2(() => getNumberOfDecimalPlaces(step), [step]), readonly = !!argType?.table?.readonly, controlId = getControlId(name);
  return React12.createElement(RangeWrapper, { readOnly: readonly }, React12.createElement("label", { htmlFor: controlId, className: "sb-sr-only" }, name), React12.createElement(RangeLabel, null, min), React12.createElement(
    RangeInput,
    {
      id: controlId,
      type: "range",
      disabled: readonly,
      onChange: handleChange,
      name,
      min,
      max,
      step,
      onFocus,
      onBlur,
      value: value2 ?? min
    }
  ), React12.createElement(RangeCurrentAndMaxLabel, { numberOFDecimalsPlaces, max }, hasValue ? value2.toFixed(numberOFDecimalsPlaces) : "--", " / ", max));
};

// src/blocks/controls/Text.tsx
import React13, { useCallback as useCallback4, useState as useState5 } from "react";
import { Button as Button4, Form as Form4 } from "storybook/internal/components";
import { styled as styled10 } from "storybook/theming";
var Wrapper5 = styled10.label({
  display: "flex"
}), MaxLength = styled10.div(({ isMaxed }) => ({
  marginLeft: "0.75rem",
  paddingTop: "0.35rem",
  color: isMaxed ? "red" : void 0
})), TextControl = ({
  name,
  value: value2,
  onChange,
  onFocus,
  onBlur,
  maxLength,
  argType
}) => {
  let handleChange = (event) => {
    onChange(event.target.value);
  }, readonly = !!argType?.table?.readonly, [forceVisible, setForceVisible] = useState5(!1), onForceVisible = useCallback4(() => {
    onChange(""), setForceVisible(!0);
  }, [setForceVisible]);
  if (value2 === void 0)
    return React13.createElement(
      Button4,
      {
        ariaLabel: !1,
        variant: "outline",
        size: "medium",
        disabled: readonly,
        id: getControlSetterButtonId(name),
        onClick: onForceVisible
      },
      "Set string"
    );
  let isValid = typeof value2 == "string";
  return React13.createElement(Wrapper5, null, React13.createElement(
    Form4.Textarea,
    {
      id: getControlId(name),
      maxLength,
      onChange: handleChange,
      disabled: readonly,
      size: "flex",
      placeholder: "Edit string...",
      autoFocus: forceVisible,
      valid: isValid ? void 0 : "error",
      name,
      value: isValid ? value2 : "",
      onFocus,
      onBlur
    }
  ), maxLength && React13.createElement(MaxLength, { isMaxed: value2?.length === maxLength }, value2?.length ?? 0, " / ", maxLength));
};

// src/blocks/controls/Files.tsx
import React14, { useEffect as useEffect5, useRef as useRef4 } from "react";
import { Form as Form5 } from "storybook/internal/components";
import { styled as styled11 } from "storybook/theming";
var FileInput = styled11(Form5.Input)({
  padding: 10
});
function revokeOldUrls(urls) {
  urls.forEach((url) => {
    url.startsWith("blob:") && URL.revokeObjectURL(url);
  });
}
var FilesControl = ({
  onChange,
  name,
  accept = "image/*",
  value: value2,
  argType
}) => {
  let inputElement = useRef4(null), readonly = argType?.control?.readOnly;
  function handleFileChange(e2) {
    if (!e2.target.files)
      return;
    let fileUrls = Array.from(e2.target.files).map((file) => URL.createObjectURL(file));
    onChange(fileUrls), revokeOldUrls(value2 || []);
  }
  useEffect5(() => {
    value2 == null && inputElement.current && (inputElement.current.value = "");
  }, [value2, name]);
  let controlId = getControlId(name);
  return React14.createElement(React14.Fragment, null, React14.createElement("label", { htmlFor: controlId, className: "sb-sr-only" }, name), React14.createElement(
    FileInput,
    {
      ref: inputElement,
      id: controlId,
      type: "file",
      name,
      multiple: !0,
      disabled: readonly,
      onChange: handleFileChange,
      accept,
      size: "flex"
    }
  ));
};

// src/blocks/controls/index.tsx
var LazyColorControl = lazy(() => import("./_browser-chunks/Color-ASIRERSW.js")), ColorControl = (props) => React15.createElement(Suspense, { fallback: React15.createElement("div", null) }, React15.createElement(LazyColorControl, { ...props }));

// src/blocks/components/ArgsTable/ArgControl.tsx
var Controls2 = {
  array: ObjectControl,
  object: ObjectControl,
  boolean: BooleanControl,
  color: ColorControl,
  date: DateControl,
  number: NumberControl,
  check: OptionsControl,
  "inline-check": OptionsControl,
  radio: OptionsControl,
  "inline-radio": OptionsControl,
  select: OptionsControl,
  "multi-select": OptionsControl,
  range: RangeControl,
  text: TextControl,
  file: FilesControl
}, NoControl = () => React16.createElement(React16.Fragment, null, "-"), ArgControl = ({ row, arg, updateArgs, isHovered }) => {
  let { key, control } = row, [isFocused, setFocused] = useState6(!1), [boxedValue, setBoxedValue] = useState6({ value: arg });
  useEffect6(() => {
    isFocused || setBoxedValue({ value: arg });
  }, [isFocused, arg]);
  let onChange = useCallback5(
    (argVal) => (setBoxedValue({ value: argVal }), updateArgs({ [key]: argVal }), argVal),
    [updateArgs, key]
  ), onBlur = useCallback5(() => setFocused(!1), []), onFocus = useCallback5(() => setFocused(!0), []);
  if (!control || control.disable) {
    let canBeSetup = control?.disable !== !0 && row?.type?.name !== "function";
    return isHovered && canBeSetup ? React16.createElement(
      Link,
      {
        href: "https://storybook.js.org/docs/essentials/controls?ref=ui",
        target: "_blank",
        withArrow: !0
      },
      "Setup controls"
    ) : React16.createElement(NoControl, null);
  }
  let props = { name: key, argType: row, value: boxedValue.value, onChange, onBlur, onFocus }, Control = Controls2[control.type] || NoControl;
  return React16.createElement(Control, { ...props, ...control, controlType: control.type });
};

// src/blocks/components/ArgsTable/ArgJsDoc.tsx
import React17 from "react";
import { codeCommon } from "storybook/internal/components";
import { styled as styled12 } from "storybook/theming";
var Table = styled12.table(({ theme }) => ({
  "&&": {
    // Escape default table styles
    borderCollapse: "collapse",
    borderSpacing: 0,
    border: "none",
    tr: {
      border: "none !important",
      background: "none"
    },
    "td, th": {
      padding: 0,
      border: "none",
      width: "auto!important"
    },
    // End escape
    marginTop: 0,
    marginBottom: 0,
    "th:first-of-type, td:first-of-type": {
      paddingLeft: 0
    },
    "th:last-of-type, td:last-of-type": {
      paddingRight: 0
    },
    td: {
      paddingTop: 0,
      paddingBottom: 4,
      "&:not(:first-of-type)": {
        paddingLeft: 10,
        paddingRight: 0
      }
    },
    tbody: {
      boxShadow: "none",
      border: "none"
    },
    code: codeCommon({ theme }),
    div: {
      span: {
        fontWeight: "bold"
      }
    },
    "& code": {
      margin: 0,
      display: "inline-block",
      fontSize: theme.typography.size.s1
    }
  }
})), ArgJsDoc = ({ tags }) => {
  let params = (tags.params || []).filter((x2) => x2.description), hasDisplayableParams = params.length !== 0, hasDisplayableDeprecated = tags.deprecated != null, hasDisplayableReturns = tags.returns != null && tags.returns.description != null;
  return !hasDisplayableParams && !hasDisplayableReturns && !hasDisplayableDeprecated ? null : React17.createElement(React17.Fragment, null, React17.createElement(Table, null, React17.createElement("tbody", null, hasDisplayableDeprecated && React17.createElement("tr", { key: "deprecated" }, React17.createElement("td", { colSpan: 2 }, React17.createElement("strong", null, "Deprecated"), ": ", tags.deprecated?.toString())), hasDisplayableParams && params.map((x2) => React17.createElement("tr", { key: x2.name }, React17.createElement("td", null, React17.createElement("code", null, x2.name)), React17.createElement("td", null, x2.description))), hasDisplayableReturns && React17.createElement("tr", { key: "returns" }, React17.createElement("td", null, React17.createElement("code", null, "Returns")), React17.createElement("td", null, tags.returns?.description)))));
};

// src/blocks/components/ArgsTable/ArgValue.tsx
import React18, { useState as useState7 } from "react";
import { SyntaxHighlighter, TooltipProvider, codeCommon as codeCommon2 } from "storybook/internal/components";
import { ChevronSmallDownIcon as ChevronSmallDownIcon2, ChevronSmallUpIcon } from "@storybook/icons";

// ../../node_modules/es-toolkit/dist/array/uniq.mjs
function uniq(arr) {
  return [...new Set(arr)];
}

// src/blocks/components/ArgsTable/ArgValue.tsx
var import_memoizerific = __toESM(require_memoizerific(), 1);
import { styled as styled13 } from "storybook/theming";
var ITEMS_BEFORE_EXPANSION = 8, Summary = styled13.div(({ isExpanded }) => ({
  display: "flex",
  flexDirection: isExpanded ? "column" : "row",
  flexWrap: "wrap",
  alignItems: "flex-start",
  marginBottom: "-4px",
  minWidth: 100
})), Text3 = styled13.span(codeCommon2, ({ theme, simple = !1 }) => ({
  flex: "0 0 auto",
  fontFamily: theme.typography.fonts.mono,
  fontSize: theme.typography.size.s1,
  wordBreak: "break-word",
  whiteSpace: "normal",
  maxWidth: "100%",
  margin: 0,
  marginRight: "4px",
  marginBottom: "4px",
  paddingTop: "2px",
  paddingBottom: "2px",
  lineHeight: "13px",
  ...simple && {
    background: "transparent",
    border: "0 none",
    paddingLeft: 0
  }
})), ExpandButton = styled13.button(({ theme }) => ({
  fontFamily: theme.typography.fonts.mono,
  color: theme.color.secondary,
  marginBottom: "4px",
  background: "none",
  border: "none"
})), Expandable = styled13.div(codeCommon2, ({ theme }) => ({
  fontFamily: theme.typography.fonts.mono,
  color: theme.color.secondary,
  fontSize: theme.typography.size.s1,
  // overrides codeCommon
  margin: 0,
  whiteSpace: "nowrap",
  display: "flex",
  alignItems: "center"
})), Detail = styled13.div(({ theme, width }) => ({
  width,
  minWidth: 200,
  maxWidth: 800,
  padding: 15,
  // Don't remove the mono fontFamily here even if it seems useless, this is used by the browser to calculate the length of a "ch" unit.
  fontFamily: theme.typography.fonts.mono,
  fontSize: theme.typography.size.s1,
  // Most custom stylesheet will reset the box-sizing to "border-box" and will break the tooltip.
  boxSizing: "content-box",
  "& code": {
    padding: "0 !important"
  }
})), ChevronUpIcon = styled13(ChevronSmallUpIcon)({
  marginLeft: 4
}), ChevronDownIcon = styled13(ChevronSmallDownIcon2)({
  marginLeft: 4
}), EmptyArg = () => React18.createElement("span", null, "-"), ArgText = ({ text, simple }) => React18.createElement(Text3, { simple }, text), calculateDetailWidth = (0, import_memoizerific.default)(1e3)((detail) => {
  let lines = detail.split(/\r?\n/);
  return `${Math.max(...lines.map((x2) => x2.length))}ch`;
}), getSummaryItems = (summary) => {
  if (!summary)
    return [summary];
  let summaryItems = summary.split("|").map((value2) => value2.trim());
  return uniq(summaryItems);
}, renderSummaryItems = (summaryItems, isExpanded = !0) => {
  let items = summaryItems;
  return isExpanded || (items = summaryItems.slice(0, ITEMS_BEFORE_EXPANSION)), items.map((item) => React18.createElement(ArgText, { key: item, text: item === "" ? '""' : item }));
}, ArgSummary = ({ value: value2, initialExpandedArgs }) => {
  let { summary, detail } = value2, [isOpen, setIsOpen] = useState7(!1), [isExpanded, setIsExpanded] = useState7(initialExpandedArgs || !1);
  if (summary == null)
    return null;
  let summaryAsString = typeof summary.toString == "function" ? summary.toString() : summary;
  if (detail == null) {
    if (/[(){}[\]<>]/.test(summaryAsString))
      return React18.createElement(ArgText, { text: summaryAsString });
    let summaryItems = getSummaryItems(summaryAsString), itemsCount = summaryItems.length;
    return itemsCount > ITEMS_BEFORE_EXPANSION ? React18.createElement(Summary, { isExpanded }, renderSummaryItems(summaryItems, isExpanded), React18.createElement(ExpandButton, { onClick: () => setIsExpanded(!isExpanded) }, isExpanded ? "Show less..." : `Show ${itemsCount - ITEMS_BEFORE_EXPANSION} more...`)) : React18.createElement(Summary, null, renderSummaryItems(summaryItems));
  }
  return React18.createElement(
    TooltipProvider,
    {
      placement: "bottom",
      visible: isOpen,
      onVisibleChange: (isVisible) => {
        setIsOpen(isVisible);
      },
      tooltip: React18.createElement(Detail, { width: calculateDetailWidth(detail) }, React18.createElement(SyntaxHighlighter, { language: "jsx", format: !1 }, detail))
    },
    React18.createElement(Expandable, { className: "sbdocs-expandable" }, React18.createElement("span", null, summaryAsString), isOpen ? React18.createElement(ChevronUpIcon, null) : React18.createElement(ChevronDownIcon, null))
  );
}, ArgValue = ({ value: value2, initialExpandedArgs }) => value2 == null ? React18.createElement(EmptyArg, null) : React18.createElement(ArgSummary, { value: value2, initialExpandedArgs });

// src/blocks/components/ArgsTable/ArgRow.tsx
var Name = styled14.span({ fontWeight: "bold" }), Required = styled14.span(({ theme }) => ({
  color: theme.color.negative,
  fontFamily: theme.typography.fonts.mono,
  cursor: "help"
})), Description = styled14.div(({ theme }) => ({
  "&&": {
    p: {
      margin: "0 0 10px 0"
    },
    a: {
      color: theme.color.secondary
    }
  },
  code: {
    ...codeCommon3({ theme }),
    fontSize: 12,
    fontFamily: theme.typography.fonts.mono
  },
  "& code": {
    margin: 0,
    display: "inline-block"
  },
  "& pre > code": {
    whiteSpace: "pre-wrap"
  }
})), Type = styled14.div(({ theme, hasDescription }) => ({
  color: theme.base === "light" ? curriedTransparentize$1(0.1, theme.color.defaultText) : curriedTransparentize$1(0.2, theme.color.defaultText),
  marginTop: hasDescription ? 4 : 0
})), TypeWithJsDoc = styled14.div(({ theme, hasDescription }) => ({
  color: theme.base === "light" ? curriedTransparentize$1(0.1, theme.color.defaultText) : curriedTransparentize$1(0.2, theme.color.defaultText),
  marginTop: hasDescription ? 12 : 0,
  marginBottom: 12
})), StyledTd = styled14.td(({ expandable }) => ({
  paddingLeft: expandable ? "40px !important" : "20px !important"
})), toSummary = (value2) => value2 && { summary: typeof value2 == "string" ? value2 : value2.name }, ArgRow = (props) => {
  let [isHovered, setIsHovered] = useState8(!1), { row, updateArgs, compact: compact2, expandable, initialExpandedArgs } = props, { name, description } = row, table = row.table || {}, type = table.type || toSummary(row.type), defaultValue = table.defaultValue || row.defaultValue, required = row.type?.required, hasDescription = description != null && description !== "";
  return React19.createElement("tr", { onMouseEnter: () => setIsHovered(!0), onMouseLeave: () => setIsHovered(!1) }, React19.createElement(StyledTd, { expandable: expandable ?? !1 }, React19.createElement(Name, null, name), required ? React19.createElement(Required, { title: "Required" }, "*") : null), compact2 ? null : React19.createElement("td", null, hasDescription && React19.createElement(Description, null, React19.createElement(index_modern_default, null, description)), table.jsDocTags != null ? React19.createElement(React19.Fragment, null, React19.createElement(TypeWithJsDoc, { hasDescription }, React19.createElement(ArgValue, { value: type, initialExpandedArgs })), React19.createElement(ArgJsDoc, { tags: table.jsDocTags })) : React19.createElement(Type, { hasDescription }, React19.createElement(ArgValue, { value: type, initialExpandedArgs }))), compact2 ? null : React19.createElement("td", null, React19.createElement(ArgValue, { value: defaultValue, initialExpandedArgs })), updateArgs ? React19.createElement("td", null, React19.createElement(ArgControl, { ...props, isHovered })) : null);
};

// src/blocks/components/ArgsTable/Empty.tsx
import React20, { useEffect as useEffect7, useState as useState9 } from "react";
import { EmptyTabContent, Link as Link2 } from "storybook/internal/components";
import { DocumentIcon } from "@storybook/icons";
import { styled as styled15 } from "storybook/theming";
var Wrapper6 = styled15.div(({ inAddonPanel, theme }) => ({
  height: inAddonPanel ? "100%" : "auto",
  display: "flex",
  border: inAddonPanel ? "none" : `1px solid ${theme.appBorderColor}`,
  borderRadius: inAddonPanel ? 0 : theme.appBorderRadius,
  padding: inAddonPanel ? 0 : 40,
  alignItems: "center",
  justifyContent: "center",
  flexDirection: "column",
  gap: 15,
  background: theme.background.content
})), Links = styled15.div(({ theme }) => ({
  display: "flex",
  fontSize: theme.typography.size.s2 - 1,
  gap: 25
})), Empty = ({ inAddonPanel }) => {
  let [isLoading, setIsLoading] = useState9(!0);
  return useEffect7(() => {
    let load = setTimeout(() => {
      setIsLoading(!1);
    }, 100);
    return () => clearTimeout(load);
  }, []), isLoading ? null : React20.createElement(Wrapper6, { inAddonPanel }, React20.createElement(
    EmptyTabContent,
    {
      title: inAddonPanel ? "Interactive story playground" : "Args table with interactive controls couldn't be auto-generated",
      description: React20.createElement(React20.Fragment, null, "Controls give you an easy to use interface to test your components. Set your story args and you'll see controls appearing here automatically."),
      footer: React20.createElement(Links, null, inAddonPanel && React20.createElement(React20.Fragment, null, React20.createElement(
        Link2,
        {
          href: "https://storybook.js.org/docs/essentials/controls?ref=ui",
          target: "_blank",
          withArrow: !0
        },
        React20.createElement(DocumentIcon, null),
        " Read docs"
      )), !inAddonPanel && React20.createElement(
        Link2,
        {
          href: "https://storybook.js.org/docs/essentials/controls?ref=ui",
          target: "_blank",
          withArrow: !0
        },
        React20.createElement(DocumentIcon, null),
        " Learn how to set that up"
      ))
    }
  ));
};

// src/blocks/components/ArgsTable/SectionRow.tsx
import React21, { useState as useState10 } from "react";
import { ChevronDownIcon as ChevronDownIcon2, ChevronRightIcon } from "@storybook/icons";
import { styled as styled16 } from "storybook/theming";
var ExpanderIconDown = styled16(ChevronDownIcon2)(({ theme }) => ({
  marginRight: 8,
  marginLeft: -10,
  marginTop: -2,
  // optical alignment
  height: 12,
  width: 12,
  color: theme.base === "light" ? curriedTransparentize$1(0.25, theme.color.defaultText) : curriedTransparentize$1(0.3, theme.color.defaultText),
  border: "none",
  display: "inline-block"
})), ExpanderIconRight = styled16(ChevronRightIcon)(({ theme }) => ({
  marginRight: 8,
  marginLeft: -10,
  marginTop: -2,
  // optical alignment
  height: 12,
  width: 12,
  color: theme.base === "light" ? curriedTransparentize$1(0.25, theme.color.defaultText) : curriedTransparentize$1(0.3, theme.color.defaultText),
  border: "none",
  display: "inline-block"
})), FlexWrapper = styled16.span(({ theme }) => ({
  display: "flex",
  lineHeight: "20px",
  alignItems: "center"
})), Section = styled16.td(({ theme }) => ({
  position: "relative",
  letterSpacing: "0.35em",
  textTransform: "uppercase",
  fontWeight: theme.typography.weight.bold,
  fontSize: theme.typography.size.s1 - 1,
  color: theme.base === "light" ? curriedTransparentize$1(0.4, theme.color.defaultText) : curriedTransparentize$1(0.6, theme.color.defaultText),
  background: `${theme.background.app} !important`,
  "& ~ td": {
    background: `${theme.background.app} !important`
  }
})), Subsection = styled16.td(({ theme }) => ({
  position: "relative",
  fontWeight: theme.typography.weight.bold,
  fontSize: theme.typography.size.s2 - 1,
  background: theme.background.app
})), StyledTd2 = styled16.td({
  position: "relative"
}), StyledTr = styled16.tr(({ theme }) => ({
  "&:hover > td": {
    backgroundColor: `${curriedLighten$1(5e-3, theme.background.app)} !important`,
    boxShadow: `${theme.color.mediumlight} 0 - 1px 0 0 inset`,
    cursor: "row-resize"
  }
})), ClickIntercept = styled16.button({
  // reset button style
  background: "none",
  border: "none",
  padding: "0",
  font: "inherit",
  // add custom style
  position: "absolute",
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  height: "100%",
  width: "100%",
  color: "transparent",
  cursor: "row-resize !important"
}), SectionRow = ({
  level = "section",
  label,
  children,
  initialExpanded = !0,
  colSpan = 3
}) => {
  let [expanded, setExpanded] = useState10(initialExpanded), Level = level === "subsection" ? Subsection : Section, itemCount = children?.length || 0, caption = level === "subsection" ? `${itemCount} item${itemCount !== 1 ? "s" : ""}` : "", helperText = `${expanded ? "Hide" : "Show"} ${level === "subsection" ? itemCount : label} item${itemCount !== 1 ? "s" : ""}`;
  return React21.createElement(React21.Fragment, null, React21.createElement(StyledTr, { title: helperText }, React21.createElement(Level, { colSpan: 1 }, React21.createElement(ClickIntercept, { onClick: (e2) => setExpanded(!expanded), tabIndex: 0 }, helperText), React21.createElement(FlexWrapper, null, expanded ? React21.createElement(ExpanderIconDown, null) : React21.createElement(ExpanderIconRight, null), label)), React21.createElement(StyledTd2, { colSpan: colSpan - 1 }, React21.createElement(
    ClickIntercept,
    {
      onClick: (e2) => setExpanded(!expanded),
      tabIndex: -1,
      style: { outline: "none" }
    },
    helperText
  ), expanded ? null : caption)), expanded ? children : null);
};

// src/blocks/components/ArgsTable/Skeleton.tsx
import React22 from "react";
import { styled as styled17 } from "storybook/theming";
var TableWrapper = styled17.div(({ theme }) => ({
  width: "100%",
  borderSpacing: 0,
  color: theme.color.defaultText
})), Row = styled17.div(({ theme }) => ({
  display: "flex",
  borderBottom: `1px solid ${theme.appBorderColor}`,
  "&:last-child": {
    borderBottom: 0
  }
})), Column = styled17.div(
  ({ position, theme }) => {
    let baseStyles = {
      display: "flex",
      flexDirection: "column",
      gap: 5,
      padding: "10px 15px",
      alignItems: "flex-start"
    };
    switch (position) {
      case "first":
        return {
          ...baseStyles,
          width: "25%",
          paddingLeft: 20
        };
      case "second":
        return {
          ...baseStyles,
          width: "35%"
        };
      case "third":
        return {
          ...baseStyles,
          width: "15%"
        };
      case "last":
        return {
          ...baseStyles,
          width: "25%",
          paddingRight: 20
        };
    }
  }
), SkeletonText = styled17.div(
  ({ theme, width, height }) => ({
    animation: `${theme.animation.glow} 1.5s ease-in-out infinite`,
    background: theme.appBorderColor,
    width: width || "100%",
    height: height || 16,
    borderRadius: 3
  })
), Skeleton = () => React22.createElement(TableWrapper, null, React22.createElement(Row, null, React22.createElement(Column, { position: "first" }, React22.createElement(SkeletonText, { width: "60%" })), React22.createElement(Column, { position: "second" }, React22.createElement(SkeletonText, { width: "30%" })), React22.createElement(Column, { position: "third" }, React22.createElement(SkeletonText, { width: "60%" })), React22.createElement(Column, { position: "last" }, React22.createElement(SkeletonText, { width: "60%" }))), React22.createElement(Row, null, React22.createElement(Column, { position: "first" }, React22.createElement(SkeletonText, { width: "60%" })), React22.createElement(Column, { position: "second" }, React22.createElement(SkeletonText, { width: "80%" }), React22.createElement(SkeletonText, { width: "30%" })), React22.createElement(Column, { position: "third" }, React22.createElement(SkeletonText, { width: "60%" })), React22.createElement(Column, { position: "last" }, React22.createElement(SkeletonText, { width: "60%" }))), React22.createElement(Row, null, React22.createElement(Column, { position: "first" }, React22.createElement(SkeletonText, { width: "60%" })), React22.createElement(Column, { position: "second" }, React22.createElement(SkeletonText, { width: "80%" }), React22.createElement(SkeletonText, { width: "30%" })), React22.createElement(Column, { position: "third" }, React22.createElement(SkeletonText, { width: "60%" })), React22.createElement(Column, { position: "last" }, React22.createElement(SkeletonText, { width: "60%" }))), React22.createElement(Row, null, React22.createElement(Column, { position: "first" }, React22.createElement(SkeletonText, { width: "60%" })), React22.createElement(Column, { position: "second" }, React22.createElement(SkeletonText, { width: "80%" }), React22.createElement(SkeletonText, { width: "30%" })), React22.createElement(Column, { position: "third" }, React22.createElement(SkeletonText, { width: "60%" })), React22.createElement(Column, { position: "last" }, React22.createElement(SkeletonText, { width: "60%" }))));

// src/blocks/components/ArgsTable/ArgsTable.tsx
var TableWrapper2 = styled18.table(({ theme, compact: compact2, inAddonPanel, inTabPanel }) => ({
  "&&": {
    // Resets for cascading/system styles
    borderSpacing: 0,
    color: theme.color.defaultText,
    "td, th": {
      padding: 0,
      border: "none",
      verticalAlign: "top",
      textOverflow: "ellipsis"
    },
    // End Resets
    fontSize: theme.typography.size.s2 - 1,
    lineHeight: "20px",
    textAlign: "left",
    width: "100%",
    // Margin collapse
    marginTop: inAddonPanel ? 0 : 25,
    marginBottom: inAddonPanel ? 0 : 40,
    "thead th:first-of-type, td:first-of-type": {
      // intentionally specify thead here
      width: "25%"
    },
    "th:first-of-type, td:first-of-type": {
      paddingLeft: 20
    },
    "th:nth-of-type(2), td:nth-of-type(2)": {
      ...compact2 ? null : {
        // Description column
        width: "35%"
      }
    },
    "td:nth-of-type(3)": {
      ...compact2 ? null : {
        // Defaults column
        width: "15%"
      }
    },
    "th:last-of-type, td:last-of-type": {
      paddingRight: 20,
      ...compact2 ? null : {
        // Controls column
        width: "25%"
      }
    },
    th: {
      color: theme.textMutedColor,
      paddingTop: 10,
      paddingBottom: 10,
      paddingLeft: 15,
      paddingRight: 15
    },
    td: {
      paddingTop: "10px",
      paddingBottom: "10px",
      "&:not(:first-of-type)": {
        paddingLeft: 15,
        paddingRight: 15
      },
      "&:last-of-type": {
        paddingRight: 20
      }
    },
    // Makes border alignment consistent w/other DocBlocks
    marginInline: inAddonPanel || inTabPanel ? 0 : 1,
    paddingInline: inTabPanel ? 3 : 0,
    tbody: {
      // Safari doesn't love shadows on tbody so we need to use a shadow filter. In order to do this,
      // the table cells all need to be solid so they have a background color applied.
      // I wasn't sure what kinds of content go in these tables so I was extra specific with selectors
      // to avoid unexpected surprises.
      ...inAddonPanel ? null : {
        filter: theme.base === "light" ? "drop-shadow(0px 1px 3px rgba(0, 0, 0, 0.10))" : "drop-shadow(0px 1px 3px rgba(0, 0, 0, 0.20))"
      },
      "> tr > *": {
        // For filter to work properly, the table cells all need to be opaque.
        background: theme.background.content,
        borderTop: `1px solid ${theme.appBorderColor}`
      },
      ...inAddonPanel ? null : {
        // This works and I don't know why. :)
        "> tr:first-of-type > *": {
          borderBlockStart: `1px solid ${theme.appBorderColor}`
        },
        "> tr:last-of-type > *": {
          borderBlockEnd: `1px solid ${theme.appBorderColor}`
        },
        "> tr > *:first-of-type": {
          borderInlineStart: `1px solid ${theme.appBorderColor}`
        },
        "> tr > *:last-of-type": {
          borderInlineEnd: `1px solid ${theme.appBorderColor}`
        },
        // Thank you, Safari, for making me write code like this.
        "> tr:first-of-type > td:first-of-type": {
          borderTopLeftRadius: theme.appBorderRadius
        },
        "> tr:first-of-type > td:last-of-type": {
          borderTopRightRadius: theme.appBorderRadius
        },
        "> tr:last-of-type > td:first-of-type": {
          borderBottomLeftRadius: theme.appBorderRadius
        },
        "> tr:last-of-type > td:last-of-type": {
          borderBottomRightRadius: theme.appBorderRadius
        }
      }
    }
    // End awesome table styling
  }
})), TablePositionWrapper = styled18.div({
  position: "relative"
}), ButtonPositionWrapper = styled18.div({
  position: "absolute",
  right: 22,
  top: 10
}), StyledButton = styled18(Button5)({
  margin: "-4px -12px -4px 0"
});
var sortFns = {
  alpha: (a2, b2) => (a2.name ?? "").localeCompare(b2.name ?? ""),
  requiredFirst: (a2, b2) => +!!b2.type?.required - +!!a2.type?.required || (a2.name ?? "").localeCompare(b2.name ?? ""),
  none: null
}, groupRows = (rows, sort) => {
  let sections = { ungrouped: [], ungroupedSubsections: {}, sections: {} };
  if (!rows)
    return sections;
  Object.entries(rows).forEach(([key, row]) => {
    let { category, subcategory } = row?.table || {};
    if (category) {
      let section = sections.sections[category] || { ungrouped: [], subsections: {} };
      if (!subcategory)
        section.ungrouped.push({ key, ...row });
      else {
        let subsection = section.subsections[subcategory] || [];
        subsection.push({ key, ...row }), section.subsections[subcategory] = subsection;
      }
      sections.sections[category] = section;
    } else if (subcategory) {
      let subsection = sections.ungroupedSubsections[subcategory] || [];
      subsection.push({ key, ...row }), sections.ungroupedSubsections[subcategory] = subsection;
    } else
      sections.ungrouped.push({ key, ...row });
  });
  let sortFn = sortFns[sort], sortSubsection = (record) => sortFn ? Object.keys(record).reduce(
    (acc, cur) => ({
      ...acc,
      [cur]: record[cur].sort(sortFn)
    }),
    {}
  ) : record;
  return {
    ungrouped: sortFn ? sections.ungrouped.sort(sortFn) : sections.ungrouped,
    ungroupedSubsections: sortSubsection(sections.ungroupedSubsections),
    sections: Object.keys(sections.sections).reduce(
      (acc, cur) => ({
        ...acc,
        [cur]: {
          ungrouped: sortFn ? sections.sections[cur].ungrouped.sort(sortFn) : sections.sections[cur].ungrouped,
          subsections: sortSubsection(sections.sections[cur].subsections)
        }
      }),
      {}
    )
  };
}, safeIncludeConditionalArg = (row, args, globals) => {
  try {
    return includeConditionalArg(row, args, globals);
  } catch (err) {
    return once.warn(err.message), !1;
  }
}, ArgsTable = (props) => {
  let {
    updateArgs,
    resetArgs,
    compact: compact2,
    inAddonPanel,
    inTabPanel,
    initialExpandedArgs,
    sort = "none",
    isLoading
  } = props;
  if ("error" in props) {
    let { error } = props;
    return React23.createElement(EmptyBlock, null, error, "\xA0", React23.createElement(Link3, { href: "http://storybook.js.org/docs/?ref=ui", target: "_blank", withArrow: !0 }, React23.createElement(DocumentIcon2, null), " Read the docs"));
  }
  if (isLoading)
    return React23.createElement(Skeleton, null);
  let { rows, args, globals } = "rows" in props ? props : { rows: void 0, args: void 0, globals: void 0 }, groups = groupRows(
    pickBy(
      rows || {},
      (row) => !row?.table?.disable && safeIncludeConditionalArg(row, args || {}, globals || {})
    ),
    sort
  ), hasNoUngrouped = groups.ungrouped.length === 0, hasNoSections = Object.entries(groups.sections).length === 0, hasNoUngroupedSubsections = Object.entries(groups.ungroupedSubsections).length === 0;
  if (hasNoUngrouped && hasNoSections && hasNoUngroupedSubsections)
    return React23.createElement(Empty, { inAddonPanel });
  let colSpan = 1;
  updateArgs && (colSpan += 1), compact2 || (colSpan += 2);
  let expandable = Object.keys(groups.sections).length > 0, common = { updateArgs, compact: compact2, inAddonPanel, initialExpandedArgs };
  return React23.createElement(ResetWrapper, null, React23.createElement(TablePositionWrapper, null, updateArgs && !isLoading && resetArgs && React23.createElement(ButtonPositionWrapper, null, React23.createElement(
    StyledButton,
    {
      variant: "ghost",
      padding: "small",
      onClick: () => resetArgs(),
      ariaLabel: "Reset controls"
    },
    React23.createElement(UndoIcon, null)
  )), React23.createElement(
    TableWrapper2,
    {
      compact: compact2,
      inAddonPanel,
      inTabPanel,
      className: "docblock-argstable sb-unstyled"
    },
    React23.createElement("thead", { className: "docblock-argstable-head" }, React23.createElement("tr", null, React23.createElement("th", null, React23.createElement("span", null, "Name")), compact2 ? null : React23.createElement("th", null, React23.createElement("span", null, "Description")), compact2 ? null : React23.createElement("th", null, React23.createElement("span", null, "Default")), updateArgs ? React23.createElement("th", null, React23.createElement("span", null, "Control")) : null)),
    React23.createElement("tbody", { className: "docblock-argstable-body" }, groups.ungrouped.map((row) => React23.createElement(ArgRow, { key: row.key, row, arg: args && args[row.key], ...common })), Object.entries(groups.ungroupedSubsections).map(([subcategory, subsection]) => React23.createElement(
      SectionRow,
      {
        key: subcategory,
        label: subcategory,
        level: "subsection",
        colSpan
      },
      subsection.map((row) => React23.createElement(
        ArgRow,
        {
          key: row.key,
          row,
          arg: args && args[row.key],
          expandable,
          ...common
        }
      ))
    )), Object.entries(groups.sections).map(([category, section]) => React23.createElement(SectionRow, { key: category, label: category, level: "section", colSpan }, section.ungrouped.map((row) => React23.createElement(ArgRow, { key: row.key, row, arg: args && args[row.key], ...common })), Object.entries(section.subsections).map(([subcategory, subsection]) => React23.createElement(
      SectionRow,
      {
        key: subcategory,
        label: subcategory,
        level: "subsection",
        colSpan
      },
      subsection.map((row) => React23.createElement(
        ArgRow,
        {
          key: row.key,
          row,
          arg: args && args[row.key],
          expandable,
          ...common
        }
      ))
    )))))
  )));
};

// src/blocks/components/DocsPage.tsx
import React24 from "react";
import { withReset } from "storybook/internal/components";
import { styled as styled19 } from "storybook/theming";
var toGlobalSelector = (element) => `& :where(${element}:not(.sb-anchor, .sb-unstyled, .sb-unstyled ${element}))`, breakpoint = 600, Title = styled19.h1(withReset, ({ theme }) => ({
  color: theme.color.defaultText,
  fontSize: theme.typography.size.m3,
  fontWeight: theme.typography.weight.bold,
  lineHeight: "32px",
  [`@media (min-width: ${breakpoint}px)`]: {
    fontSize: theme.typography.size.l1,
    lineHeight: "36px",
    marginBottom: "16px"
  }
})), Subtitle = styled19.h2(withReset, ({ theme }) => ({
  fontWeight: theme.typography.weight.regular,
  fontSize: theme.typography.size.s3,
  lineHeight: "20px",
  borderBottom: "none",
  marginBottom: 15,
  [`@media (min-width: ${breakpoint}px)`]: {
    fontSize: theme.typography.size.m1,
    lineHeight: "28px",
    marginBottom: 24
  },
  color: curriedTransparentize$1(0.25, theme.color.defaultText)
})), DocsContent = styled19.div(({ theme }) => {
  let reset = {
    fontFamily: theme.typography.fonts.base,
    fontSize: theme.typography.size.s3,
    margin: 0,
    WebkitFontSmoothing: "antialiased",
    MozOsxFontSmoothing: "grayscale",
    WebkitTapHighlightColor: "rgba(0, 0, 0, 0)",
    WebkitOverflowScrolling: "touch"
  }, headers = {
    margin: "20px 0 8px",
    padding: 0,
    cursor: "text",
    position: "relative",
    color: theme.color.defaultText,
    "&:first-of-type": {
      marginTop: 0,
      paddingTop: 0
    },
    "&:hover a.anchor": {
      textDecoration: "none"
    },
    "& code": {
      fontSize: "inherit"
    }
  }, code = {
    lineHeight: 1,
    margin: "0 2px",
    padding: "3px 5px",
    whiteSpace: "nowrap",
    borderRadius: 3,
    fontSize: theme.typography.size.s2 - 1,
    border: theme.base === "light" ? `1px solid ${theme.color.mediumlight}` : `1px solid ${theme.color.darker}`,
    color: theme.base === "light" ? curriedTransparentize$1(0.1, theme.color.defaultText) : curriedTransparentize$1(0.3, theme.color.defaultText),
    backgroundColor: theme.base === "light" ? theme.color.lighter : theme.color.border
  };
  return {
    maxWidth: 1e3,
    width: "100%",
    minWidth: 0,
    [toGlobalSelector("a")]: {
      ...reset,
      fontSize: "inherit",
      lineHeight: "24px",
      color: theme.color.secondary,
      textDecoration: "none",
      "&.absent": {
        color: "#cc0000"
      },
      "&.anchor": {
        display: "block",
        paddingLeft: 30,
        marginLeft: -30,
        cursor: "pointer",
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0
      }
    },
    [toGlobalSelector("blockquote")]: {
      ...reset,
      margin: "16px 0",
      borderLeft: `4px solid ${theme.color.medium}`,
      padding: "0 15px",
      color: theme.color.dark,
      "& > :first-of-type": {
        marginTop: 0
      },
      "& > :last-child": {
        marginBottom: 0
      }
    },
    [toGlobalSelector("div")]: reset,
    [toGlobalSelector("dl")]: {
      ...reset,
      margin: "16px 0",
      padding: 0,
      "& dt": {
        fontSize: "14px",
        fontWeight: "bold",
        fontStyle: "italic",
        padding: 0,
        margin: "16px 0 4px"
      },
      "& dt:first-of-type": {
        padding: 0
      },
      "& dt > :first-of-type": {
        marginTop: 0
      },
      "& dt > :last-child": {
        marginBottom: 0
      },
      "& dd": {
        margin: "0 0 16px",
        padding: "0 15px"
      },
      "& dd > :first-of-type": {
        marginTop: 0
      },
      "& dd > :last-child": {
        marginBottom: 0
      }
    },
    [toGlobalSelector("h1")]: {
      ...reset,
      ...headers,
      fontSize: `${theme.typography.size.l1}px`,
      fontWeight: theme.typography.weight.bold
    },
    [toGlobalSelector("h2")]: {
      ...reset,
      ...headers,
      fontSize: `${theme.typography.size.m2}px`,
      paddingBottom: 4,
      borderBottom: `1px solid ${theme.appBorderColor}`
    },
    [toGlobalSelector("h3")]: {
      ...reset,
      ...headers,
      fontSize: `${theme.typography.size.m1}px`,
      fontWeight: theme.typography.weight.bold
    },
    [toGlobalSelector("h4")]: {
      ...reset,
      ...headers,
      fontSize: `${theme.typography.size.s3}px`
    },
    [toGlobalSelector("h5")]: {
      ...reset,
      ...headers,
      fontSize: `${theme.typography.size.s2}px`
    },
    [toGlobalSelector("h6")]: {
      ...reset,
      ...headers,
      fontSize: `${theme.typography.size.s2}px`,
      color: theme.color.dark
    },
    [toGlobalSelector("hr")]: {
      border: "0 none",
      borderTop: `1px solid ${theme.appBorderColor}`,
      height: 4,
      padding: 0
    },
    [toGlobalSelector("img")]: {
      maxWidth: "100%"
    },
    [toGlobalSelector("li")]: {
      ...reset,
      fontSize: theme.typography.size.s2,
      color: theme.color.defaultText,
      lineHeight: "24px",
      "& + li": {
        marginTop: ".25em"
      },
      "& ul, & ol": {
        marginTop: ".25em",
        marginBottom: 0
      },
      "& code": code
    },
    [toGlobalSelector("ol")]: {
      ...reset,
      margin: "16px 0",
      paddingLeft: 30,
      "& :first-of-type": {
        marginTop: 0
      },
      "& :last-child": {
        marginBottom: 0
      }
    },
    [toGlobalSelector("p")]: {
      ...reset,
      margin: "16px 0",
      fontSize: theme.typography.size.s2,
      lineHeight: "24px",
      color: theme.color.defaultText,
      "& code": code
    },
    [toGlobalSelector("pre")]: {
      ...reset,
      // reset
      fontFamily: theme.typography.fonts.mono,
      WebkitFontSmoothing: "antialiased",
      MozOsxFontSmoothing: "grayscale",
      lineHeight: "18px",
      padding: "11px 1rem",
      whiteSpace: "pre-wrap",
      color: "inherit",
      borderRadius: 3,
      margin: "1rem 0",
      "&:not(.prismjs)": {
        background: "transparent",
        border: "none",
        borderRadius: 0,
        padding: 0,
        margin: 0
      },
      "& pre, &.prismjs": {
        padding: 15,
        margin: 0,
        whiteSpace: "pre-wrap",
        color: "inherit",
        fontSize: "13px",
        lineHeight: "19px",
        code: {
          color: "inherit",
          fontSize: "inherit"
        }
      },
      "& code": {
        whiteSpace: "pre"
      },
      "& code, & tt": {
        border: "none"
      }
    },
    [toGlobalSelector("span")]: {
      ...reset,
      "&.frame": {
        display: "block",
        overflow: "hidden",
        "& > span": {
          border: `1px solid ${theme.color.medium}`,
          display: "block",
          float: "left",
          overflow: "hidden",
          margin: "13px 0 0",
          padding: 7,
          width: "auto"
        },
        "& span img": {
          display: "block",
          float: "left"
        },
        "& span span": {
          clear: "both",
          color: theme.color.darkest,
          display: "block",
          padding: "5px 0 0"
        }
      },
      "&.align-center": {
        display: "block",
        overflow: "hidden",
        clear: "both",
        "& > span": {
          display: "block",
          overflow: "hidden",
          margin: "13px auto 0",
          textAlign: "center"
        },
        "& span img": {
          margin: "0 auto",
          textAlign: "center"
        }
      },
      "&.align-right": {
        display: "block",
        overflow: "hidden",
        clear: "both",
        "& > span": {
          display: "block",
          overflow: "hidden",
          margin: "13px 0 0",
          textAlign: "right"
        },
        "& span img": {
          margin: 0,
          textAlign: "right"
        }
      },
      "&.float-left": {
        display: "block",
        marginRight: 13,
        overflow: "hidden",
        float: "left",
        "& span": {
          margin: "13px 0 0"
        }
      },
      "&.float-right": {
        display: "block",
        marginLeft: 13,
        overflow: "hidden",
        float: "right",
        "& > span": {
          display: "block",
          overflow: "hidden",
          margin: "13px auto 0",
          textAlign: "right"
        }
      }
    },
    [toGlobalSelector("table")]: {
      ...reset,
      margin: "16px 0",
      fontSize: theme.typography.size.s2,
      lineHeight: "24px",
      padding: 0,
      borderCollapse: "collapse",
      "& tr": {
        borderTop: `1px solid ${theme.appBorderColor}`,
        backgroundColor: theme.appContentBg,
        margin: 0,
        padding: 0
      },
      "& tr:nth-of-type(2n)": {
        backgroundColor: theme.base === "dark" ? theme.color.darker : theme.color.lighter
      },
      "& tr th": {
        fontWeight: "bold",
        color: theme.color.defaultText,
        border: `1px solid ${theme.appBorderColor}`,
        margin: 0,
        padding: "6px 13px"
      },
      "& tr td": {
        border: `1px solid ${theme.appBorderColor}`,
        color: theme.color.defaultText,
        margin: 0,
        padding: "6px 13px"
      },
      "& tr th :first-of-type, & tr td :first-of-type": {
        marginTop: 0
      },
      "& tr th :last-child, & tr td :last-child": {
        marginBottom: 0
      }
    },
    [toGlobalSelector("ul")]: {
      ...reset,
      margin: "16px 0",
      paddingLeft: 30,
      "& :first-of-type": {
        marginTop: 0
      },
      "& :last-child": {
        marginBottom: 0
      },
      listStyle: "disc"
    }
  };
}), DocsWrapper = styled19.div(({ theme }) => ({
  background: theme.background.content,
  display: "flex",
  flexDirection: "row-reverse",
  justifyContent: "center",
  padding: "4rem 20px",
  minHeight: "100vh",
  boxSizing: "border-box",
  gap: "3rem",
  [`@media (min-width: ${breakpoint}px)`]: {}
})), DocsPageWrapper = ({ children, toc }) => React24.createElement(DocsWrapper, { className: "sbdocs sbdocs-wrapper" }, toc, React24.createElement(DocsContent, { className: "sbdocs sbdocs-content" }, children));

// src/blocks/components/Preview.tsx
import React29, { Children, useCallback as useCallback6, useContext as useContext2, useState as useState13 } from "react";
import { ActionBar, Zoom } from "storybook/internal/components";
import { styled as styled22 } from "storybook/theming";

// src/blocks/blocks/DocsContext.ts
import { createContext } from "react";
globalThis && globalThis.__DOCS_CONTEXT__ === void 0 && (globalThis.__DOCS_CONTEXT__ = createContext(null), globalThis.__DOCS_CONTEXT__.displayName = "DocsContext");
var DocsContext = globalThis ? globalThis.__DOCS_CONTEXT__ : createContext(null);

// src/blocks/blocks/Story.tsx
import React25, { useContext } from "react";

// src/blocks/blocks/useStory.ts
import { useEffect as useEffect8, useState as useState11 } from "react";
function useStory(storyId, context) {
  let stories = useStories([storyId], context);
  return stories && stories[0];
}
function useStories(storyIds, context) {
  let [storiesById, setStories] = useState11({});
  return useEffect8(() => {
    Promise.all(
      storyIds.map(async (storyId) => {
        let story = await context.loadStory(storyId);
        setStories(
          (current) => current[storyId] === story ? current : { ...current, [storyId]: story }
        );
      })
    );
  }), storyIds.map((storyId) => {
    if (storiesById[storyId])
      return storiesById[storyId];
    try {
      return context.storyById(storyId);
    } catch {
      return;
    }
  });
}

// src/blocks/blocks/Story.tsx
var getStoryId = (props, context) => {
  let { of, meta } = props;
  if ("of" in props && of === void 0)
    throw new Error("Unexpected `of={undefined}`, did you mistype a CSF file reference?");
  return meta && context.referenceMeta(meta, !1), context.resolveOf(of || "story", ["story"]).story.id;
}, getStoryProps = (props, story, context) => {
  let { parameters = {} } = story || {}, { docs = {} } = parameters, storyParameters = docs.story || {};
  if (docs.disable)
    return null;
  if (props.inline ?? storyParameters.inline ?? !1) {
    let height2 = props.height ?? storyParameters.height, autoplay = props.autoplay ?? storyParameters.autoplay ?? !1;
    return {
      story,
      inline: !0,
      height: height2,
      autoplay,
      forceInitialArgs: !!props.__forceInitialArgs,
      primary: !!props.__primary,
      renderStoryToElement: context.renderStoryToElement
    };
  }
  let height = props.height ?? storyParameters.height ?? storyParameters.iframeHeight ?? "100px";
  return {
    story,
    inline: !1,
    height,
    primary: !!props.__primary
  };
}, Story2 = (props = { __forceInitialArgs: !1, __primary: !1 }) => {
  let context = useContext(DocsContext), storyId = getStoryId(props, context), story = useStory(storyId, context);
  if (!story)
    return React25.createElement(StorySkeleton, null);
  let storyProps = getStoryProps(props, story, context);
  return storyProps ? React25.createElement(Story, { ...storyProps }) : null;
};

// src/blocks/components/BlockBackgroundStyles.tsx
var getBlockBackgroundStyle = (theme) => ({
  borderRadius: theme.appBorderRadius,
  background: theme.background.content,
  boxShadow: theme.base === "light" ? "rgba(0, 0, 0, 0.10) 0 1px 3px 0" : "rgba(0, 0, 0, 0.20) 0 2px 5px 0",
  border: `1px solid ${theme.appBorderColor}`
});

// src/blocks/components/Story.tsx
import React27, { useEffect as useEffect9, useRef as useRef5, useState as useState12 } from "react";
import { ErrorFormatter, Loader, getStoryHref } from "storybook/internal/components";
import { styled as styled20 } from "storybook/theming";

// src/blocks/components/IFrame.tsx
import React26, { Component as Component3 } from "react";
var { window: globalWindow2 } = globalThis, IFrame = class extends Component3 {
  constructor() {
    super(...arguments);
    this.iframe = null;
  }
  componentDidMount() {
    let { id } = this.props;
    this.iframe = globalWindow2.document.getElementById(id);
  }
  shouldComponentUpdate(nextProps) {
    let { scale } = nextProps;
    return scale !== this.props.scale && this.setIframeBodyStyle({
      width: `${scale * 100}%`,
      height: `${scale * 100}%`,
      transform: `scale(${1 / scale})`,
      transformOrigin: "top left"
    }), !1;
  }
  setIframeBodyStyle(style) {
    return Object.assign(this.iframe.contentDocument.body.style, style);
  }
  render() {
    let { id, title, src, allowFullScreen, scale, ...rest } = this.props;
    return React26.createElement(
      "iframe",
      {
        id,
        title,
        src,
        ...allowFullScreen ? { allow: "fullscreen" } : {},
        loading: "lazy",
        ...rest
      }
    );
  }
};

// src/blocks/components/ZoomContext.tsx
import { createContext as createContext2 } from "react";
var ZoomContext = createContext2({
  scale: 1
});

// src/blocks/components/Story.tsx
var { PREVIEW_URL } = globalThis, BASE_URL = PREVIEW_URL || "iframe.html", storyBlockIdFromId = ({ story, primary }) => `story--${story.id}${primary ? "--primary" : ""}`, InlineStory = (props) => {
  let storyRef = useRef5(), [showLoader, setShowLoader] = useState12(!0), [error, setError] = useState12(), { story, height, autoplay, forceInitialArgs, renderStoryToElement } = props;
  return useEffect9(() => {
    if (!(story && storyRef.current))
      return () => {
      };
    let element = storyRef.current, cleanup = renderStoryToElement(
      story,
      element,
      {
        showMain: () => {
        },
        showError: ({ title, description }) => setError(new Error(`${title} - ${description}`)),
        showException: (err) => setError(err)
      },
      { autoplay, forceInitialArgs }
    );
    return setShowLoader(!1), () => {
      Promise.resolve().then(() => cleanup());
    };
  }, [autoplay, renderStoryToElement, story]), error ? React27.createElement("pre", null, React27.createElement(ErrorFormatter, { error })) : React27.createElement(React27.Fragment, null, height ? React27.createElement("style", null, `#${storyBlockIdFromId(
    props
  )} { min-height: ${height}; transform: translateZ(0); overflow: auto }`) : null, showLoader && React27.createElement(StorySkeleton, null), React27.createElement("div", { ref: storyRef, id: `${storyBlockIdFromId(props)}-inner`, "data-name": story.name }));
}, IFrameStory = ({ story, height = "500px" }) => React27.createElement("div", { style: { width: "100%", height } }, React27.createElement(ZoomContext.Consumer, null, ({ scale }) => React27.createElement(
  IFrame,
  {
    key: "iframe",
    id: `iframe--${story.id}`,
    title: story.name,
    src: getStoryHref(BASE_URL, story.id, { viewMode: "story" }),
    allowFullScreen: !0,
    scale,
    style: {
      width: "100%",
      height: "100%",
      border: "0 none"
    }
  }
))), ErrorMessage = styled20.strong(({ theme }) => ({
  color: theme.color.orange
})), Story = (props) => {
  let { inline, story } = props;
  return inline && !props.autoplay && story.usesMount ? React27.createElement(ErrorMessage, null, "This story mounts inside of play. Set", " ", React27.createElement("a", { href: "https://storybook.js.org/docs/api/doc-blocks/doc-block-story?ref=ui#autoplay" }, "autoplay"), " ", "to true to view this story.") : React27.createElement("div", { id: storyBlockIdFromId(props), className: "sb-story sb-unstyled", "data-story-block": "true" }, inline ? React27.createElement(InlineStory, { ...props }) : React27.createElement(IFrameStory, { ...props }));
}, StorySkeleton = () => React27.createElement(Loader, null);

// src/blocks/components/Toolbar.tsx
import React28 from "react";
import { Button as Button6, Toolbar as SharedToolbar, getStoryHref as getStoryHref2 } from "storybook/internal/components";
import { ShareAltIcon, ZoomIcon, ZoomOutIcon, ZoomResetIcon } from "@storybook/icons";
import { styled as styled21 } from "storybook/theming";
var AbsoluteBar = styled21(SharedToolbar)({
  position: "absolute",
  left: 0,
  right: 0,
  top: 0,
  transition: "transform .2s linear",
  display: "flex",
  alignItems: "center"
}), Wrapper7 = styled21.div({
  display: "flex",
  alignItems: "center",
  gap: 4
}), IconPlaceholder = styled21.div(({ theme }) => ({
  width: 14,
  height: 14,
  borderRadius: 2,
  margin: "0 7px",
  backgroundColor: theme.appBorderColor,
  animation: `${theme.animation.glow} 1.5s ease-in-out infinite`
})), Toolbar = ({
  isLoading,
  storyId,
  baseUrl,
  zoom,
  resetZoom,
  ...rest
}) => React28.createElement(AbsoluteBar, { innerStyle: { gap: 4, paddingInline: 7, justifyContent: "space-between" }, ...rest }, React28.createElement(Wrapper7, { key: "left" }, isLoading ? [1, 2, 3].map((key) => React28.createElement(IconPlaceholder, { key })) : React28.createElement(React28.Fragment, null, React28.createElement(
  Button6,
  {
    padding: "small",
    variant: "ghost",
    key: "zoomin",
    onClick: (e2) => {
      e2.preventDefault(), zoom(0.8);
    },
    ariaLabel: "Zoom in"
  },
  React28.createElement(ZoomIcon, null)
), React28.createElement(
  Button6,
  {
    padding: "small",
    variant: "ghost",
    key: "zoomout",
    onClick: (e2) => {
      e2.preventDefault(), zoom(1.25);
    },
    ariaLabel: "Zoom out"
  },
  React28.createElement(ZoomOutIcon, null)
), React28.createElement(
  Button6,
  {
    padding: "small",
    variant: "ghost",
    key: "zoomreset",
    onClick: (e2) => {
      e2.preventDefault(), resetZoom();
    },
    ariaLabel: "Reset zoom"
  },
  React28.createElement(ZoomResetIcon, null)
))), isLoading ? React28.createElement(Wrapper7, { key: "right" }, React28.createElement(IconPlaceholder, null)) : baseUrl && storyId && React28.createElement(Wrapper7, { key: "right" }, React28.createElement(
  Button6,
  {
    asChild: !0,
    padding: "small",
    variant: "ghost",
    key: "opener",
    ariaLabel: "Open canvas in new tab"
  },
  React28.createElement("a", { href: getStoryHref2(baseUrl, storyId), target: "_blank", rel: "noopener noreferrer" }, React28.createElement(ShareAltIcon, null))
)));

// src/blocks/components/Preview.tsx
var ChildrenContainer = styled22.div(
  ({ isColumn, columns, layout }) => ({
    display: isColumn || !columns ? "block" : "flex",
    position: "relative",
    flexWrap: "wrap",
    overflow: "auto",
    flexDirection: isColumn ? "column" : "row",
    "& .innerZoomElementWrapper > *": isColumn ? {
      width: layout !== "fullscreen" ? "calc(100% - 20px)" : "100%",
      display: "block"
    } : {
      maxWidth: layout !== "fullscreen" ? "calc(100% - 20px)" : "100%",
      display: "inline-block"
    }
  }),
  ({ layout = "padded", inline }) => layout === "centered" || layout === "padded" ? {
    padding: inline ? "32px 22px" : "0px",
    "& .innerZoomElementWrapper > *": {
      width: "auto",
      border: "8px solid transparent!important"
    }
  } : {},
  ({ layout = "padded", inline }) => layout === "centered" && inline ? {
    display: "flex",
    justifyContent: "center",
    justifyItems: "center",
    alignContent: "center",
    alignItems: "center"
  } : {},
  ({ columns }) => columns && columns > 1 ? { ".innerZoomElementWrapper > *": { minWidth: `calc(100% / ${columns} - 20px)` } } : {}
), StyledSource = styled22(Source)(({ theme }) => ({
  margin: 0,
  borderTopLeftRadius: 0,
  borderTopRightRadius: 0,
  borderBottomLeftRadius: theme.appBorderRadius,
  borderBottomRightRadius: theme.appBorderRadius,
  border: "none",
  background: theme.base === "light" ? "rgba(0, 0, 0, 0.85)" : curriedDarken$1(0.05, theme.background.content),
  color: theme.color.lightest,
  button: {
    background: theme.base === "light" ? "rgba(0, 0, 0, 0.85)" : curriedDarken$1(0.05, theme.background.content)
  }
})), PreviewContainer = styled22.div(
  ({ theme, withSource, isExpanded }) => ({
    position: "relative",
    overflow: "hidden",
    margin: "25px 0 40px",
    ...getBlockBackgroundStyle(theme),
    borderBottomLeftRadius: withSource && isExpanded && 0,
    borderBottomRightRadius: withSource && isExpanded && 0,
    borderBottomWidth: isExpanded && 0,
    "h3 + &": {
      marginTop: "16px"
    }
  }),
  ({ withToolbar }) => withToolbar && { paddingTop: 40 }
), getSource = (withSource, expanded, setExpanded) => {
  switch (!0) {
    case !!(withSource && withSource.error):
      return {
        source: null,
        actionItem: {
          title: "No code available",
          className: "docblock-code-toggle docblock-code-toggle--disabled",
          disabled: !0,
          onClick: () => setExpanded(!1)
        }
      };
    case expanded:
      return {
        source: React29.createElement(StyledSource, { ...withSource, dark: !0 }),
        actionItem: {
          title: "Hide code",
          className: "docblock-code-toggle docblock-code-toggle--expanded",
          onClick: () => setExpanded(!1)
        }
      };
    default:
      return {
        source: React29.createElement(StyledSource, { ...withSource, dark: !0 }),
        actionItem: {
          title: "Show code",
          className: "docblock-code-toggle",
          onClick: () => setExpanded(!0)
        }
      };
  }
};
function getChildProps(children) {
  if (Children.count(children) === 1) {
    let elt = children;
    if (elt.props)
      return elt.props;
  }
  return null;
}
var PositionedToolbar = styled22(Toolbar)({
  position: "absolute",
  top: 0,
  left: 0,
  right: 0,
  height: 40
}), Relative = styled22.div({
  overflow: "hidden",
  position: "relative"
}), Preview = ({
  isLoading,
  isColumn,
  columns,
  children,
  withSource,
  withToolbar = !1,
  isExpanded = !1,
  additionalActions,
  className,
  layout = "padded",
  inline = !1,
  ...props
}) => {
  let [expanded, setExpanded] = useState13(isExpanded), { source, actionItem } = getSource(withSource, expanded, setExpanded), [scale, setScale] = useState13(1), previewClasses = [className].concat(["sbdocs", "sbdocs-preview", "sb-unstyled"]), defaultActionItems = withSource ? [actionItem] : [], [additionalActionItems, setAdditionalActionItems] = useState13(
    additionalActions ? [...additionalActions] : []
  ), actionItems = [...defaultActionItems, ...additionalActionItems], { window: globalWindow4 } = globalThis, context = useContext2(DocsContext), copyToClipboard = useCallback6(async (text) => {
    let { createCopyToClipboardFunction } = await import("storybook/internal/components");
    createCopyToClipboardFunction();
  }, []), onCopyCapture = (e2) => {
    let selection = globalWindow4.getSelection();
    selection && selection.type === "Range" || (e2.preventDefault(), additionalActionItems.filter((item) => item.title === "Copied").length === 0 && copyToClipboard(source?.props.code ?? "").then(() => {
      setAdditionalActionItems([
        ...additionalActionItems,
        {
          title: "Copied",
          onClick: () => {
          }
        }
      ]), globalWindow4.setTimeout(
        () => setAdditionalActionItems(
          additionalActionItems.filter((item) => item.title !== "Copied")
        ),
        1500
      );
    }));
  }, childProps = getChildProps(children);
  return React29.createElement(
    PreviewContainer,
    {
      withSource,
      withToolbar,
      ...props,
      className: previewClasses.join(" ")
    },
    withToolbar && React29.createElement(
      PositionedToolbar,
      {
        isLoading,
        border: !0,
        zoom: (z2) => setScale(scale * z2),
        resetZoom: () => setScale(1),
        storyId: !isLoading && childProps ? getStoryId(childProps, context) : void 0,
        baseUrl: "./iframe.html"
      }
    ),
    React29.createElement(ZoomContext.Provider, { value: { scale } }, React29.createElement(Relative, { className: "docs-story", onCopyCapture: withSource && onCopyCapture }, React29.createElement(
      ChildrenContainer,
      {
        isColumn: isColumn || !Array.isArray(children),
        columns,
        layout,
        inline
      },
      React29.createElement(Zoom.Element, { centered: layout === "centered", scale: inline ? scale : 1 }, Array.isArray(children) ? children.map((child, i2) => React29.createElement("div", { key: i2 }, child)) : React29.createElement("div", null, children))
    ), React29.createElement(ActionBar, { actionItems }))),
    withSource && expanded && source
  );
}, StyledPreview = styled22(Preview)(() => ({
  ".docs-story": {
    paddingTop: 32,
    paddingBottom: 40
  }
}));

// src/blocks/components/ArgsTable/TabbedArgsTable.tsx
import React30 from "react";
import { TabsView } from "storybook/internal/components";
import { styled as styled23 } from "storybook/theming";
var StyledTabsView = styled23(TabsView)({
  height: "fit-content"
}), TabbedArgsTable = ({ tabs, ...props }) => {
  let entries = Object.entries(tabs);
  if (entries.length === 1)
    return React30.createElement(ArgsTable, { ...entries[0][1], ...props });
  let tabsFromEntries = entries.map(([label, table], index) => ({
    id: `prop_table_div_${label}`,
    title: label,
    children: () => {
      let argsTableProps = index === 0 ? props : { sort: props.sort };
      return React30.createElement(ArgsTable, { inTabPanel: !0, key: `prop_table_${label}`, ...table, ...argsTableProps });
    }
  }));
  return React30.createElement(StyledTabsView, { tabs: tabsFromEntries });
};

// src/blocks/components/Typeset.tsx
import React31 from "react";
import { withReset as withReset2 } from "storybook/internal/components";
import { styled as styled24 } from "storybook/theming";
var Label4 = styled24.div(({ theme }) => ({
  marginRight: 30,
  fontSize: `${theme.typography.size.s1}px`,
  color: theme.base === "light" ? curriedTransparentize$1(0.4, theme.color.defaultText) : curriedTransparentize$1(0.6, theme.color.defaultText)
})), Sample = styled24.div({
  overflow: "hidden",
  whiteSpace: "nowrap",
  textOverflow: "ellipsis"
}), TypeSpecimen = styled24.div({
  display: "flex",
  flexDirection: "row",
  alignItems: "baseline",
  "&:not(:last-child)": { marginBottom: "1rem" }
}), Wrapper8 = styled24.div(withReset2, ({ theme }) => ({
  ...getBlockBackgroundStyle(theme),
  margin: "25px 0 40px",
  padding: "30px 20px"
})), Typeset = ({
  fontFamily,
  fontSizes,
  fontWeight,
  sampleText,
  ...props
}) => React31.createElement(Wrapper8, { ...props, className: "docblock-typeset sb-unstyled" }, fontSizes.map((size) => React31.createElement(TypeSpecimen, { key: size }, React31.createElement(Label4, null, size), React31.createElement(
  Sample,
  {
    style: {
      fontFamily,
      fontSize: size,
      fontWeight,
      lineHeight: 1.2
    }
  },
  sampleText || "Was he a beast if music could move him so?"
))));

// src/blocks/components/ColorPalette.tsx
import React32 from "react";
import { ResetWrapper as ResetWrapper2 } from "storybook/internal/components";
import { styled as styled25 } from "storybook/theming";
var ItemTitle = styled25.div(({ theme }) => ({
  fontWeight: theme.typography.weight.bold,
  color: theme.color.defaultText
})), ItemSubtitle = styled25.div(({ theme }) => ({
  color: curriedTransparentize$1(0.3, theme.color.defaultText)
})), ItemDescription = styled25.div({
  flex: "0 0 30%",
  lineHeight: "20px",
  marginTop: 5
}), SwatchLabel = styled25.div(({ theme }) => ({
  flex: 1,
  textAlign: "center",
  fontFamily: theme.typography.fonts.mono,
  fontSize: theme.typography.size.s1,
  lineHeight: 1,
  overflow: "hidden",
  color: curriedTransparentize$1(0.3, theme.color.defaultText),
  "> div": {
    display: "inline-block",
    overflow: "hidden",
    maxWidth: "100%",
    textOverflow: "ellipsis"
  },
  span: {
    display: "block",
    marginTop: 2
  }
})), SwatchLabels = styled25.div({
  display: "flex",
  flexDirection: "row"
}), Swatch = styled25.div(({ background }) => ({
  position: "relative",
  flex: 1,
  "&::before": {
    position: "absolute",
    top: 0,
    left: 0,
    width: "100%",
    height: "100%",
    background,
    content: '""'
  }
})), SwatchColors = styled25.div(({ theme }) => ({
  ...getBlockBackgroundStyle(theme),
  display: "flex",
  flexDirection: "row",
  height: 50,
  marginBottom: 5,
  overflow: "hidden",
  backgroundColor: "white",
  backgroundImage: "repeating-linear-gradient(-45deg, #ccc, #ccc 1px, #fff 1px, #fff 16px)",
  backgroundClip: "padding-box"
})), SwatchSpecimen = styled25.div({
  display: "flex",
  flexDirection: "column",
  flex: 1,
  position: "relative",
  marginBottom: 30
}), Swatches = styled25.div({
  flex: 1,
  display: "flex",
  flexDirection: "row"
}), Item = styled25.div({
  display: "flex",
  alignItems: "flex-start"
}), ListName = styled25.div({
  flex: "0 0 30%"
}), ListSwatches = styled25.div({
  flex: 1
}), ListHeading = styled25.div(({ theme }) => ({
  display: "flex",
  flexDirection: "row",
  alignItems: "center",
  paddingBottom: 20,
  fontWeight: theme.typography.weight.bold,
  color: curriedTransparentize$1(0.3, theme.color.defaultText)
})), List = styled25.div(({ theme }) => ({
  fontSize: theme.typography.size.s2,
  lineHeight: "20px",
  display: "flex",
  flexDirection: "column"
}));
function renderSwatch(color, index) {
  return React32.createElement(Swatch, { key: `${color}-${index}`, title: color, background: color });
}
function renderSwatchLabel(color, index, colorDescription) {
  return React32.createElement(SwatchLabel, { key: `${color}-${index}`, title: color }, React32.createElement("div", null, color, colorDescription && React32.createElement("span", null, colorDescription)));
}
function renderSwatchSpecimen(colors) {
  if (Array.isArray(colors))
    return React32.createElement(SwatchSpecimen, null, React32.createElement(SwatchColors, null, colors.map((color, index) => renderSwatch(color, index))), React32.createElement(SwatchLabels, null, colors.map((color, index) => renderSwatchLabel(color, index))));
  let swatchElements = [], labelElements = [];
  for (let colorKey in colors) {
    let colorValue = colors[colorKey];
    swatchElements.push(renderSwatch(colorValue, swatchElements.length)), labelElements.push(renderSwatchLabel(colorKey, labelElements.length, colorValue));
  }
  return React32.createElement(SwatchSpecimen, null, React32.createElement(SwatchColors, null, swatchElements), React32.createElement(SwatchLabels, null, labelElements));
}
var ColorItem = ({ title, subtitle, colors }) => React32.createElement(Item, null, React32.createElement(ItemDescription, null, React32.createElement(ItemTitle, null, title), React32.createElement(ItemSubtitle, null, subtitle)), React32.createElement(Swatches, null, renderSwatchSpecimen(colors))), ColorPalette = ({ children, ...props }) => React32.createElement(ResetWrapper2, null, React32.createElement(List, { ...props, className: "docblock-colorpalette sb-unstyled" }, React32.createElement(ListHeading, null, React32.createElement(ListName, null, "Name"), React32.createElement(ListSwatches, null, "Swatches")), children));

// src/blocks/components/IconGallery.tsx
import React33 from "react";
import { ResetWrapper as ResetWrapper3 } from "storybook/internal/components";
import { styled as styled26 } from "storybook/theming";
var ItemLabel = styled26.div(({ theme }) => ({
  fontFamily: theme.typography.fonts.base,
  fontSize: theme.typography.size.s1,
  color: theme.color.defaultText,
  marginLeft: 10,
  lineHeight: 1.2,
  display: "-webkit-box",
  overflow: "hidden",
  wordBreak: "break-word",
  textOverflow: "ellipsis",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical"
})), ItemSpecimen = styled26.div(({ theme }) => ({
  ...getBlockBackgroundStyle(theme),
  overflow: "hidden",
  height: 40,
  width: 40,
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flex: "none",
  "> img, > svg": {
    width: 20,
    height: 20
  }
})), Item2 = styled26.div({
  display: "inline-flex",
  flexDirection: "row",
  alignItems: "center",
  width: "100%"
}), List2 = styled26.div({
  display: "grid",
  gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
  gridGap: "8px 16px",
  gridAutoFlow: "row dense",
  gridAutoRows: 50
}), IconItem = ({ name, children }) => React33.createElement(Item2, null, React33.createElement(ItemSpecimen, null, children), React33.createElement(ItemLabel, null, name)), IconGallery = ({ children, ...props }) => React33.createElement(ResetWrapper3, null, React33.createElement(List2, { ...props, className: "docblock-icongallery sb-unstyled" }, children));

// src/blocks/components/TableOfContents.tsx
import React34, { useEffect as useEffect10 } from "react";
import { NAVIGATE_URL } from "storybook/internal/core-events";
import { styled as styled27 } from "storybook/theming";

// ../../node_modules/tocbot/src/js/build-html.js
function build_html_default(options) {
  let forEach = [].forEach, some = [].some, body = typeof window < "u" && document.body, SPACE_CHAR = " ", tocElement, currentlyHighlighting = !0, eventCount = 0;
  function createEl(d2, container) {
    let link = container.appendChild(createLink(d2));
    if (d2.children.length) {
      let list = createList(d2.isCollapsed);
      d2.children.forEach((child) => {
        createEl(child, list);
      }), link.appendChild(list);
    }
  }
  function render(parent, data) {
    let container = createList(!1);
    if (data.forEach((d2) => {
      createEl(d2, container);
    }), tocElement = parent || tocElement, tocElement !== null)
      return tocElement.firstChild && tocElement.removeChild(tocElement.firstChild), data.length === 0 ? tocElement : tocElement.appendChild(container);
  }
  function createLink(data) {
    let item = document.createElement("li"), a2 = document.createElement("a");
    return options.listItemClass && item.setAttribute("class", options.listItemClass), options.onClick && (a2.onclick = options.onClick), options.includeTitleTags && a2.setAttribute("title", data.textContent), options.includeHtml && data.childNodes.length ? forEach.call(data.childNodes, (node) => {
      a2.appendChild(node.cloneNode(!0));
    }) : a2.textContent = data.textContent, a2.setAttribute("href", `${options.basePath}#${data.id}`), a2.setAttribute(
      "class",
      `${options.linkClass + SPACE_CHAR}node-name--${data.nodeName}${SPACE_CHAR}${options.extraLinkClasses}`
    ), item.appendChild(a2), item;
  }
  function createList(isCollapsed) {
    let listElement = options.orderedList ? "ol" : "ul", list = document.createElement(listElement), classes = options.listClass + SPACE_CHAR + options.extraListClasses;
    return isCollapsed && (classes = classes + SPACE_CHAR + options.collapsibleClass, classes = classes + SPACE_CHAR + options.isCollapsedClass), list.setAttribute("class", classes), list;
  }
  function updateFixedSidebarClass() {
    let scrollTop = getScrollTop(), posFixedEl = document.querySelector(options.positionFixedSelector);
    options.fixedSidebarOffset === "auto" && (options.fixedSidebarOffset = tocElement.offsetTop), scrollTop > options.fixedSidebarOffset ? posFixedEl.className.indexOf(options.positionFixedClass) === -1 && (posFixedEl.className += SPACE_CHAR + options.positionFixedClass) : posFixedEl.className = posFixedEl.className.replace(
      SPACE_CHAR + options.positionFixedClass,
      ""
    );
  }
  function getHeadingTopPos(obj) {
    let position = 0;
    return obj !== null && (position = obj.offsetTop, options.hasInnerContainers && (position += getHeadingTopPos(obj.offsetParent))), position;
  }
  function updateClassname(obj, className) {
    return obj && obj.className !== className && (obj.className = className), obj;
  }
  function updateToc(headingsArray, event) {
    options.positionFixedSelector && updateFixedSidebarClass();
    let headings = headingsArray, clickedHref = event?.target?.getAttribute ? event?.target?.getAttribute("href") : null, isBottomMode = clickedHref && clickedHref.charAt(0) === "#" ? getIsHeaderBottomMode(clickedHref.replace("#", "")) : !1, shouldUpdate = currentlyHighlighting || isBottomMode;
    if (event && eventCount < 5 && eventCount++, shouldUpdate && tocElement && headings.length > 0) {
      let topHeader = getTopHeader(headings), oldActiveTocLink = tocElement.querySelector(
        `.${options.activeLinkClass}`
      ), topHeaderId = topHeader.id.replace(
        /([ #;&,.+*~':"!^$[\]()=>|/\\@])/g,
        "\\$1"
      ), hashId = window.location.hash.replace("#", ""), activeId = topHeaderId, isPageBottomMode = getIsPageBottomMode();
      clickedHref && isBottomMode ? activeId = clickedHref.replace("#", "") : hashId && hashId !== topHeaderId && isPageBottomMode && (getIsHeaderBottomMode(topHeaderId) || eventCount <= 2) && (activeId = hashId);
      let activeTocLink = tocElement.querySelector(
        `.${options.linkClass}[href="${options.basePath}#${activeId}"]`
      );
      if (oldActiveTocLink === activeTocLink)
        return;
      let tocLinks = tocElement.querySelectorAll(`.${options.linkClass}`);
      forEach.call(tocLinks, (tocLink) => {
        updateClassname(
          tocLink,
          tocLink.className.replace(SPACE_CHAR + options.activeLinkClass, "")
        );
      });
      let tocLis = tocElement.querySelectorAll(`.${options.listItemClass}`);
      forEach.call(tocLis, (tocLi) => {
        updateClassname(
          tocLi,
          tocLi.className.replace(SPACE_CHAR + options.activeListItemClass, "")
        );
      }), activeTocLink && activeTocLink.className.indexOf(options.activeLinkClass) === -1 && (activeTocLink.className += SPACE_CHAR + options.activeLinkClass);
      let li = activeTocLink?.parentNode;
      li && li.className.indexOf(options.activeListItemClass) === -1 && (li.className += SPACE_CHAR + options.activeListItemClass);
      let tocLists = tocElement.querySelectorAll(
        `.${options.listClass}.${options.collapsibleClass}`
      );
      forEach.call(tocLists, (list) => {
        list.className.indexOf(options.isCollapsedClass) === -1 && (list.className += SPACE_CHAR + options.isCollapsedClass);
      }), activeTocLink?.nextSibling && activeTocLink.nextSibling.className.indexOf(
        options.isCollapsedClass
      ) !== -1 && updateClassname(
        activeTocLink.nextSibling,
        activeTocLink.nextSibling.className.replace(
          SPACE_CHAR + options.isCollapsedClass,
          ""
        )
      ), removeCollapsedFromParents(activeTocLink?.parentNode.parentNode);
    }
  }
  function removeCollapsedFromParents(element) {
    return element && element.className.indexOf(options.collapsibleClass) !== -1 && element.className.indexOf(options.isCollapsedClass) !== -1 ? (updateClassname(
      element,
      element.className.replace(SPACE_CHAR + options.isCollapsedClass, "")
    ), removeCollapsedFromParents(element.parentNode.parentNode)) : element;
  }
  function disableTocAnimation(event) {
    let target = event.target || event.srcElement;
    typeof target.className != "string" || target.className.indexOf(options.linkClass) === -1 || (currentlyHighlighting = !1);
  }
  function enableTocAnimation() {
    currentlyHighlighting = !0;
  }
  function getCurrentlyHighlighting() {
    return currentlyHighlighting;
  }
  function getIsHeaderBottomMode(headerId) {
    let scrollEl = getScrollEl();
    return (document?.getElementById(headerId)).offsetTop > scrollEl.offsetHeight - scrollEl.clientHeight * 1.4 - options.bottomModeThreshold;
  }
  function getIsPageBottomMode() {
    let scrollEl = getScrollEl(), isScrollable = scrollEl.scrollHeight > scrollEl.clientHeight, isBottomMode = getScrollTop() + scrollEl.clientHeight > scrollEl.offsetHeight - options.bottomModeThreshold;
    return isScrollable && isBottomMode;
  }
  function getScrollEl() {
    let el;
    return options.scrollContainer && document.querySelector(options.scrollContainer) ? el = document.querySelector(options.scrollContainer) : el = document.documentElement || body, el;
  }
  function getScrollTop() {
    return getScrollEl()?.scrollTop || 0;
  }
  function getTopHeader(headings, scrollTop = getScrollTop()) {
    let topHeader;
    return some.call(headings, (heading, i2) => {
      if (getHeadingTopPos(heading) > scrollTop + options.headingsOffset + 10) {
        let index = i2 === 0 ? i2 : i2 - 1;
        return topHeader = headings[index], !0;
      }
      if (i2 === headings.length - 1)
        return topHeader = headings[headings.length - 1], !0;
    }), topHeader;
  }
  function updateUrlHashForHeader(headingsArray) {
    let scrollTop = getScrollTop(), topHeader = getTopHeader(headingsArray, scrollTop), isPageBottomMode = getIsPageBottomMode();
    if ((!topHeader || scrollTop < 5) && !isPageBottomMode)
      window.location.hash === "#" || window.location.hash === "" || window.history.pushState(null, null, "#");
    else if (topHeader && !isPageBottomMode) {
      let newHash = `#${topHeader.id}`;
      window.location.hash !== newHash && window.history.pushState(null, null, newHash);
    }
  }
  return {
    enableTocAnimation,
    disableTocAnimation,
    render,
    updateToc,
    getCurrentlyHighlighting,
    getTopHeader,
    getScrollTop,
    updateUrlHashForHeader
  };
}

// ../../node_modules/tocbot/src/js/default-options.js
var default_options_default = {
  // Where to render the table of contents.
  tocSelector: ".js-toc",
  // Or, you can pass in a DOM node instead
  tocElement: null,
  // Where to grab the headings to build the table of contents.
  contentSelector: ".js-toc-content",
  // Or, you can pass in a DOM node instead
  contentElement: null,
  // Which headings to grab inside of the contentSelector element.
  headingSelector: "h1, h2, h3",
  // Headings that match the ignoreSelector will be skipped.
  ignoreSelector: ".js-toc-ignore",
  // For headings inside relative or absolute positioned
  // containers within content.
  hasInnerContainers: !1,
  // Main class to add to links.
  linkClass: "toc-link",
  // Extra classes to add to links.
  extraLinkClasses: "",
  // Class to add to active links,
  // the link corresponding to the top most heading on the page.
  activeLinkClass: "is-active-link",
  // Main class to add to lists.
  listClass: "toc-list",
  // Extra classes to add to lists.
  extraListClasses: "",
  // Class that gets added when a list should be collapsed.
  isCollapsedClass: "is-collapsed",
  // Class that gets added when a list should be able
  // to be collapsed but isn't necessarily collapsed.
  collapsibleClass: "is-collapsible",
  // Class to add to list items.
  listItemClass: "toc-list-item",
  // Class to add to active list items.
  activeListItemClass: "is-active-li",
  // How many heading levels should not be collapsed.
  // For example, number 6 will show everything since
  // there are only 6 heading levels and number 0 will collapse them all.
  // The sections that are hidden will open
  // and close as you scroll to headings within them.
  collapseDepth: 0,
  // Smooth scrolling enabled.
  scrollSmooth: !0,
  // Smooth scroll duration.
  scrollSmoothDuration: 420,
  // Smooth scroll offset.
  scrollSmoothOffset: 0,
  // Callback for scroll end.
  scrollEndCallback: function(e2) {
  },
  // Headings offset between the headings and the top of
  // the document (this is meant for minor adjustments).
  headingsOffset: 1,
  // Enable the URL hash to update with the proper heading ID as
  // a user scrolls the page.
  enableUrlHashUpdateOnScroll: !1,
  // type of scroll handler to use. to make scroll event not too rapid.
  // Options are: "debounce" or "throttle"
  // when set auto , use debounce less than 333ms , other use throttle.
  // for ios browser can't use history.pushState() more than 100 times per 30 seconds reason
  scrollHandlerType: "auto",
  //  scrollHandler delay in ms.
  scrollHandlerTimeout: 50,
  // Timeout between events firing to make sure it's
  // not too rapid (for performance reasons).
  throttleTimeout: 50,
  // Element to add the positionFixedClass to.
  positionFixedSelector: null,
  // Fixed position class to add to make sidebar fixed after scrolling
  // down past the fixedSidebarOffset.
  positionFixedClass: "is-position-fixed",
  // fixedSidebarOffset can be any number but by default is set
  // to auto which sets the fixedSidebarOffset to the sidebar
  // element's offsetTop from the top of the document on init.
  fixedSidebarOffset: "auto",
  // includeHtml can be set to true to include the HTML markup from the
  // heading node instead of just including the innerText.
  includeHtml: !1,
  // includeTitleTags automatically sets the html title tag of the link
  // to match the title. This can be useful for SEO purposes or
  // when truncating titles.
  includeTitleTags: !1,
  // onclick function to apply to all links in toc. will be called with
  // the event as the first parameter, and this can be used to stop,
  // propagation, prevent default or perform action
  onClick: function(e2) {
  },
  // orderedList can be set to false to generate unordered lists (ul)
  // instead of ordered lists (ol)
  orderedList: !0,
  // If there is a fixed article scroll container, set to calculate offset.
  scrollContainer: null,
  // prevent ToC DOM rendering if it's already rendered by an external system.
  skipRendering: !1,
  // Optional callback to change heading labels.
  // For example it can be used to cut down and put ellipses on multiline headings you deem too long.
  // Called each time a heading is parsed. Expects a string and returns the modified label to display.
  // Additionally, the attribute `data-heading-label` may be used on a heading to specify
  // a shorter string to be used in the TOC.
  // function (string) => string
  headingLabelCallback: !1,
  // ignore headings that are hidden in DOM
  ignoreHiddenElements: !1,
  // Optional callback to modify properties of parsed headings.
  // The heading element is passed in node parameter and information
  // parsed by default parser is provided in obj parameter.
  // Function has to return the same or modified obj.
  // The heading will be excluded from TOC if nothing is returned.
  // function (object, HTMLElement) => object | void
  headingObjectCallback: null,
  // Set the base path, useful if you use a `base` tag in `head`.
  basePath: "",
  // Only takes affect when `tocSelector` is scrolling,
  // keep the toc scroll position in sync with the content.
  disableTocScrollSync: !1,
  // If this is null then just use `tocElement` or `tocSelector` instead
  // assuming `disableTocScrollSync` is set to false. This allows for
  // scrolling an outer element (like a nav panel w/ search) containing the toc.
  // Please pass an element, not a selector here.
  tocScrollingWrapper: null,
  // Offset for the toc scroll (top) position when scrolling the page.
  // Only effective if `disableTocScrollSync` is false.
  tocScrollOffset: 30,
  // Threshold for when bottom mode should be enabled to handle
  // highlighting links that cannot be scrolled to.
  bottomModeThreshold: 30
};

// ../../node_modules/tocbot/src/js/parse-content.js
function parseContent(options) {
  let reduce = [].reduce;
  function getLastItem(array2) {
    return array2[array2.length - 1];
  }
  function getHeadingLevel(heading) {
    return +heading.nodeName.toUpperCase().replace("H", "");
  }
  function isHTMLElement(maybeElement) {
    try {
      return maybeElement instanceof window.HTMLElement || maybeElement instanceof window.parent.HTMLElement;
    } catch {
      return maybeElement instanceof window.HTMLElement;
    }
  }
  function getHeadingObject(heading) {
    if (!isHTMLElement(heading)) return heading;
    if (options.ignoreHiddenElements && (!heading.offsetHeight || !heading.offsetParent))
      return null;
    let headingLabel = heading.getAttribute("data-heading-label") || (options.headingLabelCallback ? String(options.headingLabelCallback(heading.innerText)) : (heading.innerText || heading.textContent).trim()), obj = {
      id: heading.id,
      children: [],
      nodeName: heading.nodeName,
      headingLevel: getHeadingLevel(heading),
      textContent: headingLabel
    };
    return options.includeHtml && (obj.childNodes = heading.childNodes), options.headingObjectCallback ? options.headingObjectCallback(obj, heading) : obj;
  }
  function addNode(node, nest) {
    let obj = getHeadingObject(node), level = obj.headingLevel, array2 = nest, lastItem = getLastItem(array2), lastItemLevel = lastItem ? lastItem.headingLevel : 0, counter = level - lastItemLevel;
    for (; counter > 0 && (lastItem = getLastItem(array2), !(lastItem && level === lastItem.headingLevel)); )
      lastItem && lastItem.children !== void 0 && (array2 = lastItem.children), counter--;
    return level >= options.collapseDepth && (obj.isCollapsed = !0), array2.push(obj), array2;
  }
  function selectHeadings(contentElement, headingSelector) {
    let selectors = headingSelector;
    options.ignoreSelector && (selectors = headingSelector.split(",").map(function(selector) {
      return `${selector.trim()}:not(${options.ignoreSelector})`;
    }));
    try {
      return contentElement.querySelectorAll(selectors);
    } catch {
      return console.warn(`Headers not found with selector: ${selectors}`), null;
    }
  }
  function nestHeadingsArray(headingsArray) {
    return reduce.call(
      headingsArray,
      function(prev, curr) {
        let currentHeading = getHeadingObject(curr);
        return currentHeading && addNode(currentHeading, prev.nest), prev;
      },
      {
        nest: []
      }
    );
  }
  return {
    nestHeadingsArray,
    selectHeadings
  };
}

// ../../node_modules/tocbot/src/js/scroll-smooth/index.js
function initSmoothScrolling(options) {
  var duration = options.duration, offset = options.offset;
  if (typeof window > "u" || typeof location > "u") return;
  var pageUrl = location.hash ? stripHash(location.href) : location.href;
  delegatedLinkHijacking();
  function delegatedLinkHijacking() {
    document.body.addEventListener("click", onClick, !1);
    function onClick(e2) {
      !isInPageLink(e2.target) || e2.target.className.indexOf("no-smooth-scroll") > -1 || e2.target.href.charAt(e2.target.href.length - 2) === "#" && e2.target.href.charAt(e2.target.href.length - 1) === "!" || e2.target.className.indexOf(options.linkClass) === -1 || jump(e2.target.hash, {
        duration,
        offset,
        callback: function() {
          setFocus(e2.target.hash);
        }
      });
    }
  }
  function isInPageLink(n2) {
    return n2.tagName.toLowerCase() === "a" && (n2.hash.length > 0 || n2.href.charAt(n2.href.length - 1) === "#") && (stripHash(n2.href) === pageUrl || stripHash(n2.href) + "#" === pageUrl);
  }
  function stripHash(url) {
    return url.slice(0, url.lastIndexOf("#"));
  }
  function setFocus(hash) {
    var element = document.getElementById(hash.substring(1));
    element && (/^(?:a|select|input|button|textarea)$/i.test(element.tagName) || (element.tabIndex = -1), element.focus());
  }
}
function jump(target, options) {
  var start = window.pageYOffset, opt = {
    duration: options.duration,
    offset: options.offset || 0,
    callback: options.callback,
    easing: options.easing || easeInOutQuad
  }, tgt = document.querySelector(
    '[id="' + decodeURI(target).split("#").join("") + '"]'
  ) || document.querySelector('[id="' + target.split("#").join("") + '"]'), distance = typeof target == "string" ? opt.offset + (target ? tgt && tgt.getBoundingClientRect().top || 0 : -(document.documentElement.scrollTop || document.body.scrollTop)) : target, duration = typeof opt.duration == "function" ? opt.duration(distance) : opt.duration, timeStart, timeElapsed;
  requestAnimationFrame(function(time) {
    timeStart = time, loop(time);
  });
  function loop(time) {
    timeElapsed = time - timeStart, window.scrollTo(0, opt.easing(timeElapsed, start, distance, duration)), timeElapsed < duration ? requestAnimationFrame(loop) : end();
  }
  function end() {
    window.scrollTo(0, start + distance), typeof opt.callback == "function" && opt.callback();
  }
  function easeInOutQuad(t, b2, c2, d2) {
    return t /= d2 / 2, t < 1 ? c2 / 2 * t * t + b2 : (t--, -c2 / 2 * (t * (t - 2) - 1) + b2);
  }
}

// ../../node_modules/tocbot/src/js/update-toc-scroll.js
function updateTocScroll(options) {
  let toc = options.tocScrollingWrapper || options.tocElement || document.querySelector(options.tocSelector);
  if (toc && toc.scrollHeight > toc.clientHeight) {
    let activeItem = toc.querySelector(`.${options.activeListItemClass}`);
    if (activeItem) {
      let scrollAmount = activeItem.offsetTop - options.tocScrollOffset;
      toc.scrollTop = scrollAmount > 0 ? scrollAmount : 0;
    }
  }
}

// ../../node_modules/tocbot/src/js/index-esm.js
var _options = {}, _buildHtml, _parseContent, _headingsArray, _scrollListener, clickListener;
function init(customOptions) {
  let hasInitialized = !1;
  _options = extend(default_options_default, customOptions || {}), _options.scrollSmooth && (_options.duration = _options.scrollSmoothDuration, _options.offset = _options.scrollSmoothOffset, initSmoothScrolling(_options)), _buildHtml = build_html_default(_options), _parseContent = parseContent(_options), destroy();
  let contentElement = getContentElement(_options);
  if (contentElement === null)
    return;
  let tocElement = getTocElement(_options);
  if (tocElement === null || (_headingsArray = _parseContent.selectHeadings(
    contentElement,
    _options.headingSelector
  ), _headingsArray === null))
    return;
  let nestedHeadings = _parseContent.nestHeadingsArray(_headingsArray).nest;
  if (!_options.skipRendering)
    _buildHtml.render(tocElement, nestedHeadings);
  else
    return this;
  let isClick = !1, scrollHandlerTimeout = _options.scrollHandlerTimeout || _options.throttleTimeout;
  _scrollListener = ((fn, delay) => getScrollHandler(fn, delay, _options.scrollHandlerType))((e2) => {
    _buildHtml.updateToc(_headingsArray, e2), !_options.disableTocScrollSync && !isClick && updateTocScroll(_options), _options.enableUrlHashUpdateOnScroll && hasInitialized && _buildHtml.getCurrentlyHighlighting() && _buildHtml.updateUrlHashForHeader(_headingsArray);
    let isTop = e2?.target?.scrollingElement?.scrollTop === 0;
    (e2 && (e2.eventPhase === 0 || e2.currentTarget === null) || isTop) && (_buildHtml.updateToc(_headingsArray), _options.scrollEndCallback?.(e2));
  }, scrollHandlerTimeout), hasInitialized || (_scrollListener(), hasInitialized = !0), window.onhashchange = window.onscrollend = (e2) => {
    _scrollListener(e2);
  }, _options.scrollContainer && document.querySelector(_options.scrollContainer) ? (document.querySelector(_options.scrollContainer).addEventListener("scroll", _scrollListener, !1), document.querySelector(_options.scrollContainer).addEventListener("resize", _scrollListener, !1)) : (document.addEventListener("scroll", _scrollListener, !1), document.addEventListener("resize", _scrollListener, !1));
  let timeout = null;
  clickListener = throttle((event) => {
    isClick = !0, _options.scrollSmooth && _buildHtml.disableTocAnimation(event), _buildHtml.updateToc(_headingsArray, event), timeout && clearTimeout(timeout), timeout = setTimeout(() => {
      _buildHtml.enableTocAnimation();
    }, _options.scrollSmoothDuration), setTimeout(() => {
      isClick = !1;
    }, _options.scrollSmoothDuration + 100);
  }, _options.throttleTimeout), _options.scrollContainer && document.querySelector(_options.scrollContainer) ? document.querySelector(_options.scrollContainer).addEventListener("click", clickListener, !1) : document.addEventListener("click", clickListener, !1);
}
function destroy() {
  let tocElement = getTocElement(_options);
  tocElement !== null && (_options.skipRendering || tocElement && (tocElement.innerHTML = ""), _options.scrollContainer && document.querySelector(_options.scrollContainer) ? (document.querySelector(_options.scrollContainer).removeEventListener("scroll", _scrollListener, !1), document.querySelector(_options.scrollContainer).removeEventListener("resize", _scrollListener, !1), _buildHtml && document.querySelector(_options.scrollContainer).removeEventListener("click", clickListener, !1)) : (document.removeEventListener("scroll", _scrollListener, !1), document.removeEventListener("resize", _scrollListener, !1), _buildHtml && document.removeEventListener("click", clickListener, !1)));
}
function refresh(customOptions) {
  destroy(), init(customOptions || _options);
}
var hasOwnProp = Object.prototype.hasOwnProperty;
function extend(...args) {
  let target = {};
  for (let i2 = 0; i2 < args.length; i2++) {
    let source = args[i2];
    for (let key in source)
      hasOwnProp.call(source, key) && (target[key] = source[key]);
  }
  return target;
}
function throttle(fn, threshold, scope) {
  threshold || (threshold = 250);
  let last2, deferTimer;
  return function(...args) {
    let context = scope || this, now = +/* @__PURE__ */ new Date();
    last2 && now < last2 + threshold ? (clearTimeout(deferTimer), deferTimer = setTimeout(() => {
      last2 = now, fn.apply(context, args);
    }, threshold)) : (last2 = now, fn.apply(context, args));
  };
}
function debounce(func, wait) {
  let timeout;
  return (...args) => {
    clearTimeout(timeout), timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
function getScrollHandler(func, timeout, type = "auto") {
  switch (type) {
    case "debounce":
      return debounce(func, timeout);
    case "throttle":
      return throttle(func, timeout);
    default:
      return timeout < 334 ? debounce(func, timeout) : throttle(func, timeout);
  }
}
function getContentElement(options) {
  try {
    return options.contentElement || document.querySelector(options.contentSelector);
  } catch {
    return console.warn(`Contents element not found: ${options.contentSelector}`), null;
  }
}
function getTocElement(options) {
  try {
    return options.tocElement || document.querySelector(options.tocSelector);
  } catch {
    return console.warn(`TOC element not found: ${options.tocSelector}`), null;
  }
}

// ../../node_modules/tocbot/index.js
var tocbot = { destroy, init, refresh };
var tocbot_default = tocbot;

// src/blocks/components/TableOfContents.tsx
var Aside = styled27.aside(() => ({
  width: "10rem",
  "@media (max-width: 768px)": {
    display: "none"
  }
})), Nav = styled27.nav(({ theme }) => ({
  position: "fixed",
  bottom: 0,
  top: 0,
  width: "10rem",
  paddingTop: "4rem",
  paddingBottom: "2rem",
  overflowY: "auto",
  fontFamily: theme.typography.fonts.base,
  fontSize: theme.typography.size.s2,
  WebkitFontSmoothing: "antialiased",
  MozOsxFontSmoothing: "grayscale",
  WebkitTapHighlightColor: "rgba(0, 0, 0, 0)",
  WebkitOverflowScrolling: "touch",
  "& *": {
    boxSizing: "border-box"
  },
  "& > .toc-wrapper > .toc-list": {
    paddingLeft: 0,
    borderLeft: `solid 2px ${theme.color.mediumlight}`,
    ".toc-list": {
      paddingLeft: 0,
      borderLeft: `solid 2px ${theme.color.mediumlight}`,
      ".toc-list": {
        paddingLeft: 0,
        borderLeft: `solid 2px ${theme.color.mediumlight}`
      }
    }
  },
  "& .toc-list-item": {
    position: "relative",
    listStyleType: "none",
    marginLeft: 20,
    paddingTop: 3,
    paddingBottom: 3
  },
  "& .toc-list-item::before": {
    content: '""',
    position: "absolute",
    height: "100%",
    top: 0,
    left: 0,
    transform: "translateX(calc(-2px - 20px))",
    borderLeft: `solid 2px ${theme.color.mediumdark}`,
    opacity: 0,
    transition: "opacity 0.2s"
  },
  "& .toc-list-item.is-active-li::before": {
    opacity: 1
  },
  "& .toc-list-item > a": {
    color: theme.color.defaultText,
    textDecoration: "none"
  },
  "& .toc-list-item.is-active-li > a": {
    fontWeight: 600,
    color: theme.color.secondary,
    textDecoration: "none"
  }
})), Heading = styled27.p(({ theme }) => ({
  fontWeight: 600,
  fontSize: "0.875em",
  color: theme.color.defaultText,
  textTransform: "uppercase",
  marginBottom: 10
})), Title2 = ({ headingId, title }) => typeof title == "string" || !title ? React34.createElement(Heading, { as: "h2", id: headingId, className: title ? "" : "sb-sr-only" }, title || "Table of contents") : React34.createElement("div", { id: headingId }, title), TableOfContents = ({
  title,
  disable,
  headingSelector,
  contentsSelector,
  ignoreSelector,
  unsafeTocbotOptions,
  channel,
  className
}) => {
  useEffect10(() => {
    if (disable)
      return () => {
      };
    let configuration = {
      tocSelector: ".toc-wrapper",
      contentSelector: contentsSelector ?? ".sbdocs-content",
      headingSelector: headingSelector ?? "h3",
      /** Ignore headings that did not come from the main markdown code. */
      ignoreSelector: ignoreSelector ?? ".docs-story *, .skip-toc",
      headingsOffset: 40,
      scrollSmoothOffset: -40,
      orderedList: !1,
      /** Prevent default linking behavior, leaving only the smooth scrolling. */
      onClick: (e2) => {
        if (e2.preventDefault(), e2.currentTarget instanceof HTMLAnchorElement) {
          let [, headerId] = e2.currentTarget.href.split("#");
          headerId && channel.emit(NAVIGATE_URL, `#${headerId}`);
        }
      },
      ...unsafeTocbotOptions
    }, timeout = setTimeout(() => tocbot_default.init(configuration), 100);
    return () => {
      clearTimeout(timeout), tocbot_default.destroy();
    };
  }, [channel, disable, ignoreSelector, contentsSelector, headingSelector, unsafeTocbotOptions]);
  let headingId = "table-of-contents";
  return React34.createElement(Aside, { className }, disable ? null : React34.createElement(Nav, { "aria-labelledby": headingId }, React34.createElement(Title2, { headingId, title }), React34.createElement("div", { className: "toc-wrapper" })));
};

// src/blocks/blocks/Anchor.tsx
import React35 from "react";
var anchorBlockIdFromId = (storyId) => `anchor--${storyId}`, Anchor = ({ storyId, children }) => React35.createElement("div", { id: anchorBlockIdFromId(storyId), className: "sb-anchor" }, children);

// src/blocks/blocks/ArgTypes.tsx
import React36 from "react";
import { filterArgTypes } from "storybook/preview-api";

// src/blocks/blocks/useOf.ts
import { useContext as useContext3 } from "react";
var useOf = (moduleExportOrType, validTypes) => useContext3(DocsContext).resolveOf(moduleExportOrType, validTypes);

// src/blocks/blocks/utils.ts
var titleCase = (str) => str.split("-").map((part) => part.charAt(0).toUpperCase() + part.slice(1)).join(""), getComponentName = (component) => {
  if (component)
    return typeof component == "string" ? component.includes("-") ? titleCase(component) : component : component.__docgenInfo && component.__docgenInfo.displayName ? component.__docgenInfo.displayName : component.name;
};
function scrollToElement(element, block = "start") {
  element.scrollIntoView({
    behavior: "smooth",
    block,
    inline: "nearest"
  });
}

// src/blocks/blocks/ArgTypes.tsx
function extractComponentArgTypes(component, parameters) {
  let { extractArgTypes } = parameters.docs || {};
  if (!extractArgTypes)
    throw new Error("Args unsupported. See Args documentation for your framework." /* ARGS_UNSUPPORTED */);
  return extractArgTypes(component);
}
function getArgTypesFromResolved(resolved) {
  if (resolved.type === "component") {
    let {
      component: component2,
      projectAnnotations: { parameters: parameters2 }
    } = resolved;
    return {
      argTypes: extractComponentArgTypes(component2, parameters2),
      parameters: parameters2,
      component: component2
    };
  }
  if (resolved.type === "meta") {
    let {
      preparedMeta: { argTypes: argTypes2, parameters: parameters2, component: component2, subcomponents: subcomponents2 }
    } = resolved;
    return { argTypes: argTypes2, parameters: parameters2, component: component2, subcomponents: subcomponents2 };
  }
  let {
    story: { argTypes, parameters, component, subcomponents }
  } = resolved;
  return { argTypes, parameters, component, subcomponents };
}
var ArgTypes = (props) => {
  let { of } = props;
  if ("of" in props && of === void 0)
    throw new Error("Unexpected `of={undefined}`, did you mistype a CSF file reference?");
  let resolved = useOf(of || "meta"), { argTypes, parameters, component, subcomponents } = getArgTypesFromResolved(resolved), argTypesParameters = parameters?.docs?.argTypes || {}, include = props.include ?? argTypesParameters.include, exclude = props.exclude ?? argTypesParameters.exclude, sort = props.sort ?? argTypesParameters.sort, filteredArgTypes = filterArgTypes(argTypes, include, exclude);
  if (!(!!subcomponents && Object.keys(subcomponents || {}).length > 0))
    return React36.createElement(ArgsTable, { rows: filteredArgTypes, sort });
  let mainComponentName = getComponentName(component) || "Main", subcomponentTabs = Object.fromEntries(
    Object.entries(subcomponents || {}).map(([key, comp]) => [
      key,
      {
        rows: filterArgTypes(
          extractComponentArgTypes(comp, parameters),
          include,
          exclude
        ),
        sort
      }
    ])
  ), tabs = {
    [mainComponentName]: { rows: filteredArgTypes, sort },
    ...subcomponentTabs
  };
  return React36.createElement(TabbedArgsTable, { tabs, sort });
};

// src/blocks/blocks/Canvas.tsx
import React39, { useContext as useContext5 } from "react";

// src/blocks/blocks/Source.tsx
import React38, { useContext as useContext4, useMemo as useMemo3 } from "react";
import { SourceType } from "storybook/internal/docs-tools";

// src/blocks/blocks/SourceContainer.tsx
import React37, { createContext as createContext3, useEffect as useEffect11, useState as useState14 } from "react";
import { SNIPPET_RENDERED } from "storybook/internal/docs-tools";

// ../../node_modules/telejson/dist/chunk-EAFQLD22.mjs
var __create = Object.create, __defProp = Object.defineProperty, __getOwnPropDesc = Object.getOwnPropertyDescriptor, __getOwnPropNames = Object.getOwnPropertyNames, __getProtoOf = Object.getPrototypeOf, __hasOwnProp = Object.prototype.hasOwnProperty, __commonJS2 = (cb, mod) => function() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
}, __copyProps = (to, from, except, desc) => {
  if (from && typeof from == "object" || typeof from == "function")
    for (let key of __getOwnPropNames(from))
      !__hasOwnProp.call(to, key) && key !== except && __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  return to;
}, __toESM2 = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: !0 }) : target,
  mod
)), eventProperties = [
  "bubbles",
  "cancelBubble",
  "cancelable",
  "composed",
  "currentTarget",
  "defaultPrevented",
  "eventPhase",
  "isTrusted",
  "returnValue",
  "srcElement",
  "target",
  "timeStamp",
  "type"
], customEventSpecificProperties = ["detail"];
function extractEventHiddenProperties(event) {
  let rebuildEvent = eventProperties.filter((value2) => event[value2] !== void 0).reduce((acc, value2) => (acc[value2] = event[value2], acc), {});
  if (event instanceof CustomEvent)
    for (let value2 of customEventSpecificProperties.filter(
      (value22) => event[value22] !== void 0
    ))
      rebuildEvent[value2] = event[value2];
  return rebuildEvent;
}

// ../../node_modules/telejson/dist/index.mjs
var require_es_object_atoms = __commonJS2({
  "node_modules/.pnpm/es-object-atoms@1.1.1/node_modules/es-object-atoms/index.js"(exports, module) {
    "use strict";
    module.exports = Object;
  }
}), require_es_errors = __commonJS2({
  "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/index.js"(exports, module) {
    "use strict";
    module.exports = Error;
  }
}), require_eval = __commonJS2({
  "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/eval.js"(exports, module) {
    "use strict";
    module.exports = EvalError;
  }
}), require_range = __commonJS2({
  "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/range.js"(exports, module) {
    "use strict";
    module.exports = RangeError;
  }
}), require_ref = __commonJS2({
  "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/ref.js"(exports, module) {
    "use strict";
    module.exports = ReferenceError;
  }
}), require_syntax = __commonJS2({
  "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/syntax.js"(exports, module) {
    "use strict";
    module.exports = SyntaxError;
  }
}), require_type = __commonJS2({
  "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/type.js"(exports, module) {
    "use strict";
    module.exports = TypeError;
  }
}), require_uri = __commonJS2({
  "node_modules/.pnpm/es-errors@1.3.0/node_modules/es-errors/uri.js"(exports, module) {
    "use strict";
    module.exports = URIError;
  }
}), require_abs = __commonJS2({
  "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/abs.js"(exports, module) {
    "use strict";
    module.exports = Math.abs;
  }
}), require_floor = __commonJS2({
  "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/floor.js"(exports, module) {
    "use strict";
    module.exports = Math.floor;
  }
}), require_max = __commonJS2({
  "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/max.js"(exports, module) {
    "use strict";
    module.exports = Math.max;
  }
}), require_min = __commonJS2({
  "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/min.js"(exports, module) {
    "use strict";
    module.exports = Math.min;
  }
}), require_pow = __commonJS2({
  "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/pow.js"(exports, module) {
    "use strict";
    module.exports = Math.pow;
  }
}), require_round = __commonJS2({
  "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/round.js"(exports, module) {
    "use strict";
    module.exports = Math.round;
  }
}), require_isNaN = __commonJS2({
  "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/isNaN.js"(exports, module) {
    "use strict";
    module.exports = Number.isNaN || function(a2) {
      return a2 !== a2;
    };
  }
}), require_sign = __commonJS2({
  "node_modules/.pnpm/math-intrinsics@1.1.0/node_modules/math-intrinsics/sign.js"(exports, module) {
    "use strict";
    var $isNaN = require_isNaN();
    module.exports = function(number) {
      return $isNaN(number) || number === 0 ? number : number < 0 ? -1 : 1;
    };
  }
}), require_gOPD = __commonJS2({
  "node_modules/.pnpm/gopd@1.2.0/node_modules/gopd/gOPD.js"(exports, module) {
    "use strict";
    module.exports = Object.getOwnPropertyDescriptor;
  }
}), require_gopd = __commonJS2({
  "node_modules/.pnpm/gopd@1.2.0/node_modules/gopd/index.js"(exports, module) {
    "use strict";
    var $gOPD = require_gOPD();
    if ($gOPD)
      try {
        $gOPD([], "length");
      } catch {
        $gOPD = null;
      }
    module.exports = $gOPD;
  }
}), require_es_define_property = __commonJS2({
  "node_modules/.pnpm/es-define-property@1.0.1/node_modules/es-define-property/index.js"(exports, module) {
    "use strict";
    var $defineProperty = Object.defineProperty || !1;
    if ($defineProperty)
      try {
        $defineProperty({}, "a", { value: 1 });
      } catch {
        $defineProperty = !1;
      }
    module.exports = $defineProperty;
  }
}), require_shams = __commonJS2({
  "node_modules/.pnpm/has-symbols@1.1.0/node_modules/has-symbols/shams.js"(exports, module) {
    "use strict";
    module.exports = function() {
      if (typeof Symbol != "function" || typeof Object.getOwnPropertySymbols != "function")
        return !1;
      if (typeof Symbol.iterator == "symbol")
        return !0;
      var obj = {}, sym = Symbol("test"), symObj = Object(sym);
      if (typeof sym == "string" || Object.prototype.toString.call(sym) !== "[object Symbol]" || Object.prototype.toString.call(symObj) !== "[object Symbol]")
        return !1;
      var symVal = 42;
      obj[sym] = symVal;
      for (var _2 in obj)
        return !1;
      if (typeof Object.keys == "function" && Object.keys(obj).length !== 0 || typeof Object.getOwnPropertyNames == "function" && Object.getOwnPropertyNames(obj).length !== 0)
        return !1;
      var syms = Object.getOwnPropertySymbols(obj);
      if (syms.length !== 1 || syms[0] !== sym || !Object.prototype.propertyIsEnumerable.call(obj, sym))
        return !1;
      if (typeof Object.getOwnPropertyDescriptor == "function") {
        var descriptor = (
          /** @type {PropertyDescriptor} */
          Object.getOwnPropertyDescriptor(obj, sym)
        );
        if (descriptor.value !== symVal || descriptor.enumerable !== !0)
          return !1;
      }
      return !0;
    };
  }
}), require_has_symbols = __commonJS2({
  "node_modules/.pnpm/has-symbols@1.1.0/node_modules/has-symbols/index.js"(exports, module) {
    "use strict";
    var origSymbol = typeof Symbol < "u" && Symbol, hasSymbolSham = require_shams();
    module.exports = function() {
      return typeof origSymbol != "function" || typeof Symbol != "function" || typeof origSymbol("foo") != "symbol" || typeof Symbol("bar") != "symbol" ? !1 : hasSymbolSham();
    };
  }
}), require_Reflect_getPrototypeOf = __commonJS2({
  "node_modules/.pnpm/get-proto@1.0.1/node_modules/get-proto/Reflect.getPrototypeOf.js"(exports, module) {
    "use strict";
    module.exports = typeof Reflect < "u" && Reflect.getPrototypeOf || null;
  }
}), require_Object_getPrototypeOf = __commonJS2({
  "node_modules/.pnpm/get-proto@1.0.1/node_modules/get-proto/Object.getPrototypeOf.js"(exports, module) {
    "use strict";
    var $Object = require_es_object_atoms();
    module.exports = $Object.getPrototypeOf || null;
  }
}), require_implementation = __commonJS2({
  "node_modules/.pnpm/function-bind@1.1.2/node_modules/function-bind/implementation.js"(exports, module) {
    "use strict";
    var ERROR_MESSAGE = "Function.prototype.bind called on incompatible ", toStr = Object.prototype.toString, max = Math.max, funcType = "[object Function]", concatty = function(a2, b2) {
      for (var arr = [], i2 = 0; i2 < a2.length; i2 += 1)
        arr[i2] = a2[i2];
      for (var j2 = 0; j2 < b2.length; j2 += 1)
        arr[j2 + a2.length] = b2[j2];
      return arr;
    }, slicy = function(arrLike, offset) {
      for (var arr = [], i2 = offset || 0, j2 = 0; i2 < arrLike.length; i2 += 1, j2 += 1)
        arr[j2] = arrLike[i2];
      return arr;
    }, joiny = function(arr, joiner) {
      for (var str = "", i2 = 0; i2 < arr.length; i2 += 1)
        str += arr[i2], i2 + 1 < arr.length && (str += joiner);
      return str;
    };
    module.exports = function(that) {
      var target = this;
      if (typeof target != "function" || toStr.apply(target) !== funcType)
        throw new TypeError(ERROR_MESSAGE + target);
      for (var args = slicy(arguments, 1), bound, binder = function() {
        if (this instanceof bound) {
          var result = target.apply(
            this,
            concatty(args, arguments)
          );
          return Object(result) === result ? result : this;
        }
        return target.apply(
          that,
          concatty(args, arguments)
        );
      }, boundLength = max(0, target.length - args.length), boundArgs = [], i2 = 0; i2 < boundLength; i2++)
        boundArgs[i2] = "$" + i2;
      if (bound = Function("binder", "return function (" + joiny(boundArgs, ",") + "){ return binder.apply(this,arguments); }")(binder), target.prototype) {
        var Empty2 = function() {
        };
        Empty2.prototype = target.prototype, bound.prototype = new Empty2(), Empty2.prototype = null;
      }
      return bound;
    };
  }
}), require_function_bind = __commonJS2({
  "node_modules/.pnpm/function-bind@1.1.2/node_modules/function-bind/index.js"(exports, module) {
    "use strict";
    var implementation = require_implementation();
    module.exports = Function.prototype.bind || implementation;
  }
}), require_functionCall = __commonJS2({
  "node_modules/.pnpm/call-bind-apply-helpers@1.0.2/node_modules/call-bind-apply-helpers/functionCall.js"(exports, module) {
    "use strict";
    module.exports = Function.prototype.call;
  }
}), require_functionApply = __commonJS2({
  "node_modules/.pnpm/call-bind-apply-helpers@1.0.2/node_modules/call-bind-apply-helpers/functionApply.js"(exports, module) {
    "use strict";
    module.exports = Function.prototype.apply;
  }
}), require_reflectApply = __commonJS2({
  "node_modules/.pnpm/call-bind-apply-helpers@1.0.2/node_modules/call-bind-apply-helpers/reflectApply.js"(exports, module) {
    "use strict";
    module.exports = typeof Reflect < "u" && Reflect && Reflect.apply;
  }
}), require_actualApply = __commonJS2({
  "node_modules/.pnpm/call-bind-apply-helpers@1.0.2/node_modules/call-bind-apply-helpers/actualApply.js"(exports, module) {
    "use strict";
    var bind = require_function_bind(), $apply = require_functionApply(), $call = require_functionCall(), $reflectApply = require_reflectApply();
    module.exports = $reflectApply || bind.call($call, $apply);
  }
}), require_call_bind_apply_helpers = __commonJS2({
  "node_modules/.pnpm/call-bind-apply-helpers@1.0.2/node_modules/call-bind-apply-helpers/index.js"(exports, module) {
    "use strict";
    var bind = require_function_bind(), $TypeError = require_type(), $call = require_functionCall(), $actualApply = require_actualApply();
    module.exports = function(args) {
      if (args.length < 1 || typeof args[0] != "function")
        throw new $TypeError("a function is required");
      return $actualApply(bind, $call, args);
    };
  }
}), require_get = __commonJS2({
  "node_modules/.pnpm/dunder-proto@1.0.1/node_modules/dunder-proto/get.js"(exports, module) {
    "use strict";
    var callBind = require_call_bind_apply_helpers(), gOPD = require_gopd(), hasProtoAccessor;
    try {
      hasProtoAccessor = /** @type {{ __proto__?: typeof Array.prototype }} */
      [].__proto__ === Array.prototype;
    } catch (e2) {
      if (!e2 || typeof e2 != "object" || !("code" in e2) || e2.code !== "ERR_PROTO_ACCESS")
        throw e2;
    }
    var desc = !!hasProtoAccessor && gOPD && gOPD(
      Object.prototype,
      /** @type {keyof typeof Object.prototype} */
      "__proto__"
    ), $Object = Object, $getPrototypeOf = $Object.getPrototypeOf;
    module.exports = desc && typeof desc.get == "function" ? callBind([desc.get]) : typeof $getPrototypeOf == "function" ? (
      /** @type {import('./get')} */
      (function(value2) {
        return $getPrototypeOf(value2 == null ? value2 : $Object(value2));
      })
    ) : !1;
  }
}), require_get_proto = __commonJS2({
  "node_modules/.pnpm/get-proto@1.0.1/node_modules/get-proto/index.js"(exports, module) {
    "use strict";
    var reflectGetProto = require_Reflect_getPrototypeOf(), originalGetProto = require_Object_getPrototypeOf(), getDunderProto = require_get();
    module.exports = reflectGetProto ? function(O2) {
      return reflectGetProto(O2);
    } : originalGetProto ? function(O2) {
      if (!O2 || typeof O2 != "object" && typeof O2 != "function")
        throw new TypeError("getProto: not an object");
      return originalGetProto(O2);
    } : getDunderProto ? function(O2) {
      return getDunderProto(O2);
    } : null;
  }
}), require_hasown = __commonJS2({
  "node_modules/.pnpm/hasown@2.0.2/node_modules/hasown/index.js"(exports, module) {
    "use strict";
    var call = Function.prototype.call, $hasOwn = Object.prototype.hasOwnProperty, bind = require_function_bind();
    module.exports = bind.call(call, $hasOwn);
  }
}), require_get_intrinsic = __commonJS2({
  "node_modules/.pnpm/get-intrinsic@1.3.0/node_modules/get-intrinsic/index.js"(exports, module) {
    "use strict";
    var undefined2, $Object = require_es_object_atoms(), $Error = require_es_errors(), $EvalError = require_eval(), $RangeError = require_range(), $ReferenceError = require_ref(), $SyntaxError = require_syntax(), $TypeError = require_type(), $URIError = require_uri(), abs = require_abs(), floor = require_floor(), max = require_max(), min = require_min(), pow = require_pow(), round = require_round(), sign = require_sign(), $Function = Function, getEvalledConstructor = function(expressionSyntax) {
      try {
        return $Function('"use strict"; return (' + expressionSyntax + ").constructor;")();
      } catch {
      }
    }, $gOPD = require_gopd(), $defineProperty = require_es_define_property(), throwTypeError = function() {
      throw new $TypeError();
    }, ThrowTypeError = $gOPD ? (function() {
      try {
        return arguments.callee, throwTypeError;
      } catch {
        try {
          return $gOPD(arguments, "callee").get;
        } catch {
          return throwTypeError;
        }
      }
    })() : throwTypeError, hasSymbols = require_has_symbols()(), getProto = require_get_proto(), $ObjectGPO = require_Object_getPrototypeOf(), $ReflectGPO = require_Reflect_getPrototypeOf(), $apply = require_functionApply(), $call = require_functionCall(), needsEval = {}, TypedArray = typeof Uint8Array > "u" || !getProto ? undefined2 : getProto(Uint8Array), INTRINSICS = {
      __proto__: null,
      "%AggregateError%": typeof AggregateError > "u" ? undefined2 : AggregateError,
      "%Array%": Array,
      "%ArrayBuffer%": typeof ArrayBuffer > "u" ? undefined2 : ArrayBuffer,
      "%ArrayIteratorPrototype%": hasSymbols && getProto ? getProto([][Symbol.iterator]()) : undefined2,
      "%AsyncFromSyncIteratorPrototype%": undefined2,
      "%AsyncFunction%": needsEval,
      "%AsyncGenerator%": needsEval,
      "%AsyncGeneratorFunction%": needsEval,
      "%AsyncIteratorPrototype%": needsEval,
      "%Atomics%": typeof Atomics > "u" ? undefined2 : Atomics,
      "%BigInt%": typeof BigInt > "u" ? undefined2 : BigInt,
      "%BigInt64Array%": typeof BigInt64Array > "u" ? undefined2 : BigInt64Array,
      "%BigUint64Array%": typeof BigUint64Array > "u" ? undefined2 : BigUint64Array,
      "%Boolean%": Boolean,
      "%DataView%": typeof DataView > "u" ? undefined2 : DataView,
      "%Date%": Date,
      "%decodeURI%": decodeURI,
      "%decodeURIComponent%": decodeURIComponent,
      "%encodeURI%": encodeURI,
      "%encodeURIComponent%": encodeURIComponent,
      "%Error%": $Error,
      "%eval%": eval,
      // eslint-disable-line no-eval
      "%EvalError%": $EvalError,
      "%Float16Array%": typeof Float16Array > "u" ? undefined2 : Float16Array,
      "%Float32Array%": typeof Float32Array > "u" ? undefined2 : Float32Array,
      "%Float64Array%": typeof Float64Array > "u" ? undefined2 : Float64Array,
      "%FinalizationRegistry%": typeof FinalizationRegistry > "u" ? undefined2 : FinalizationRegistry,
      "%Function%": $Function,
      "%GeneratorFunction%": needsEval,
      "%Int8Array%": typeof Int8Array > "u" ? undefined2 : Int8Array,
      "%Int16Array%": typeof Int16Array > "u" ? undefined2 : Int16Array,
      "%Int32Array%": typeof Int32Array > "u" ? undefined2 : Int32Array,
      "%isFinite%": isFinite,
      "%isNaN%": isNaN,
      "%IteratorPrototype%": hasSymbols && getProto ? getProto(getProto([][Symbol.iterator]())) : undefined2,
      "%JSON%": typeof JSON == "object" ? JSON : undefined2,
      "%Map%": typeof Map > "u" ? undefined2 : Map,
      "%MapIteratorPrototype%": typeof Map > "u" || !hasSymbols || !getProto ? undefined2 : getProto((/* @__PURE__ */ new Map())[Symbol.iterator]()),
      "%Math%": Math,
      "%Number%": Number,
      "%Object%": $Object,
      "%Object.getOwnPropertyDescriptor%": $gOPD,
      "%parseFloat%": parseFloat,
      "%parseInt%": parseInt,
      "%Promise%": typeof Promise > "u" ? undefined2 : Promise,
      "%Proxy%": typeof Proxy > "u" ? undefined2 : Proxy,
      "%RangeError%": $RangeError,
      "%ReferenceError%": $ReferenceError,
      "%Reflect%": typeof Reflect > "u" ? undefined2 : Reflect,
      "%RegExp%": RegExp,
      "%Set%": typeof Set > "u" ? undefined2 : Set,
      "%SetIteratorPrototype%": typeof Set > "u" || !hasSymbols || !getProto ? undefined2 : getProto((/* @__PURE__ */ new Set())[Symbol.iterator]()),
      "%SharedArrayBuffer%": typeof SharedArrayBuffer > "u" ? undefined2 : SharedArrayBuffer,
      "%String%": String,
      "%StringIteratorPrototype%": hasSymbols && getProto ? getProto(""[Symbol.iterator]()) : undefined2,
      "%Symbol%": hasSymbols ? Symbol : undefined2,
      "%SyntaxError%": $SyntaxError,
      "%ThrowTypeError%": ThrowTypeError,
      "%TypedArray%": TypedArray,
      "%TypeError%": $TypeError,
      "%Uint8Array%": typeof Uint8Array > "u" ? undefined2 : Uint8Array,
      "%Uint8ClampedArray%": typeof Uint8ClampedArray > "u" ? undefined2 : Uint8ClampedArray,
      "%Uint16Array%": typeof Uint16Array > "u" ? undefined2 : Uint16Array,
      "%Uint32Array%": typeof Uint32Array > "u" ? undefined2 : Uint32Array,
      "%URIError%": $URIError,
      "%WeakMap%": typeof WeakMap > "u" ? undefined2 : WeakMap,
      "%WeakRef%": typeof WeakRef > "u" ? undefined2 : WeakRef,
      "%WeakSet%": typeof WeakSet > "u" ? undefined2 : WeakSet,
      "%Function.prototype.call%": $call,
      "%Function.prototype.apply%": $apply,
      "%Object.defineProperty%": $defineProperty,
      "%Object.getPrototypeOf%": $ObjectGPO,
      "%Math.abs%": abs,
      "%Math.floor%": floor,
      "%Math.max%": max,
      "%Math.min%": min,
      "%Math.pow%": pow,
      "%Math.round%": round,
      "%Math.sign%": sign,
      "%Reflect.getPrototypeOf%": $ReflectGPO
    };
    if (getProto)
      try {
        null.error;
      } catch (e2) {
        errorProto = getProto(getProto(e2)), INTRINSICS["%Error.prototype%"] = errorProto;
      }
    var errorProto, doEval = function doEval2(name) {
      var value2;
      if (name === "%AsyncFunction%")
        value2 = getEvalledConstructor("async function () {}");
      else if (name === "%GeneratorFunction%")
        value2 = getEvalledConstructor("function* () {}");
      else if (name === "%AsyncGeneratorFunction%")
        value2 = getEvalledConstructor("async function* () {}");
      else if (name === "%AsyncGenerator%") {
        var fn = doEval2("%AsyncGeneratorFunction%");
        fn && (value2 = fn.prototype);
      } else if (name === "%AsyncIteratorPrototype%") {
        var gen = doEval2("%AsyncGenerator%");
        gen && getProto && (value2 = getProto(gen.prototype));
      }
      return INTRINSICS[name] = value2, value2;
    }, LEGACY_ALIASES = {
      __proto__: null,
      "%ArrayBufferPrototype%": ["ArrayBuffer", "prototype"],
      "%ArrayPrototype%": ["Array", "prototype"],
      "%ArrayProto_entries%": ["Array", "prototype", "entries"],
      "%ArrayProto_forEach%": ["Array", "prototype", "forEach"],
      "%ArrayProto_keys%": ["Array", "prototype", "keys"],
      "%ArrayProto_values%": ["Array", "prototype", "values"],
      "%AsyncFunctionPrototype%": ["AsyncFunction", "prototype"],
      "%AsyncGenerator%": ["AsyncGeneratorFunction", "prototype"],
      "%AsyncGeneratorPrototype%": ["AsyncGeneratorFunction", "prototype", "prototype"],
      "%BooleanPrototype%": ["Boolean", "prototype"],
      "%DataViewPrototype%": ["DataView", "prototype"],
      "%DatePrototype%": ["Date", "prototype"],
      "%ErrorPrototype%": ["Error", "prototype"],
      "%EvalErrorPrototype%": ["EvalError", "prototype"],
      "%Float32ArrayPrototype%": ["Float32Array", "prototype"],
      "%Float64ArrayPrototype%": ["Float64Array", "prototype"],
      "%FunctionPrototype%": ["Function", "prototype"],
      "%Generator%": ["GeneratorFunction", "prototype"],
      "%GeneratorPrototype%": ["GeneratorFunction", "prototype", "prototype"],
      "%Int8ArrayPrototype%": ["Int8Array", "prototype"],
      "%Int16ArrayPrototype%": ["Int16Array", "prototype"],
      "%Int32ArrayPrototype%": ["Int32Array", "prototype"],
      "%JSONParse%": ["JSON", "parse"],
      "%JSONStringify%": ["JSON", "stringify"],
      "%MapPrototype%": ["Map", "prototype"],
      "%NumberPrototype%": ["Number", "prototype"],
      "%ObjectPrototype%": ["Object", "prototype"],
      "%ObjProto_toString%": ["Object", "prototype", "toString"],
      "%ObjProto_valueOf%": ["Object", "prototype", "valueOf"],
      "%PromisePrototype%": ["Promise", "prototype"],
      "%PromiseProto_then%": ["Promise", "prototype", "then"],
      "%Promise_all%": ["Promise", "all"],
      "%Promise_reject%": ["Promise", "reject"],
      "%Promise_resolve%": ["Promise", "resolve"],
      "%RangeErrorPrototype%": ["RangeError", "prototype"],
      "%ReferenceErrorPrototype%": ["ReferenceError", "prototype"],
      "%RegExpPrototype%": ["RegExp", "prototype"],
      "%SetPrototype%": ["Set", "prototype"],
      "%SharedArrayBufferPrototype%": ["SharedArrayBuffer", "prototype"],
      "%StringPrototype%": ["String", "prototype"],
      "%SymbolPrototype%": ["Symbol", "prototype"],
      "%SyntaxErrorPrototype%": ["SyntaxError", "prototype"],
      "%TypedArrayPrototype%": ["TypedArray", "prototype"],
      "%TypeErrorPrototype%": ["TypeError", "prototype"],
      "%Uint8ArrayPrototype%": ["Uint8Array", "prototype"],
      "%Uint8ClampedArrayPrototype%": ["Uint8ClampedArray", "prototype"],
      "%Uint16ArrayPrototype%": ["Uint16Array", "prototype"],
      "%Uint32ArrayPrototype%": ["Uint32Array", "prototype"],
      "%URIErrorPrototype%": ["URIError", "prototype"],
      "%WeakMapPrototype%": ["WeakMap", "prototype"],
      "%WeakSetPrototype%": ["WeakSet", "prototype"]
    }, bind = require_function_bind(), hasOwn = require_hasown(), $concat = bind.call($call, Array.prototype.concat), $spliceApply = bind.call($apply, Array.prototype.splice), $replace = bind.call($call, String.prototype.replace), $strSlice = bind.call($call, String.prototype.slice), $exec = bind.call($call, RegExp.prototype.exec), rePropName2 = /[^%.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|%$))/g, reEscapeChar2 = /\\(\\)?/g, stringToPath2 = function(string) {
      var first = $strSlice(string, 0, 1), last2 = $strSlice(string, -1);
      if (first === "%" && last2 !== "%")
        throw new $SyntaxError("invalid intrinsic syntax, expected closing `%`");
      if (last2 === "%" && first !== "%")
        throw new $SyntaxError("invalid intrinsic syntax, expected opening `%`");
      var result = [];
      return $replace(string, rePropName2, function(match, number, quote, subString) {
        result[result.length] = quote ? $replace(subString, reEscapeChar2, "$1") : number || match;
      }), result;
    }, getBaseIntrinsic = function(name, allowMissing) {
      var intrinsicName = name, alias;
      if (hasOwn(LEGACY_ALIASES, intrinsicName) && (alias = LEGACY_ALIASES[intrinsicName], intrinsicName = "%" + alias[0] + "%"), hasOwn(INTRINSICS, intrinsicName)) {
        var value2 = INTRINSICS[intrinsicName];
        if (value2 === needsEval && (value2 = doEval(intrinsicName)), typeof value2 > "u" && !allowMissing)
          throw new $TypeError("intrinsic " + name + " exists, but is not available. Please file an issue!");
        return {
          alias,
          name: intrinsicName,
          value: value2
        };
      }
      throw new $SyntaxError("intrinsic " + name + " does not exist!");
    };
    module.exports = function(name, allowMissing) {
      if (typeof name != "string" || name.length === 0)
        throw new $TypeError("intrinsic name must be a non-empty string");
      if (arguments.length > 1 && typeof allowMissing != "boolean")
        throw new $TypeError('"allowMissing" argument must be a boolean');
      if ($exec(/^%?[^%]*%?$/, name) === null)
        throw new $SyntaxError("`%` may not be present anywhere but at the beginning and end of the intrinsic name");
      var parts = stringToPath2(name), intrinsicBaseName = parts.length > 0 ? parts[0] : "", intrinsic = getBaseIntrinsic("%" + intrinsicBaseName + "%", allowMissing), intrinsicRealName = intrinsic.name, value2 = intrinsic.value, skipFurtherCaching = !1, alias = intrinsic.alias;
      alias && (intrinsicBaseName = alias[0], $spliceApply(parts, $concat([0, 1], alias)));
      for (var i2 = 1, isOwn = !0; i2 < parts.length; i2 += 1) {
        var part = parts[i2], first = $strSlice(part, 0, 1), last2 = $strSlice(part, -1);
        if ((first === '"' || first === "'" || first === "`" || last2 === '"' || last2 === "'" || last2 === "`") && first !== last2)
          throw new $SyntaxError("property names with quotes must have matching quotes");
        if ((part === "constructor" || !isOwn) && (skipFurtherCaching = !0), intrinsicBaseName += "." + part, intrinsicRealName = "%" + intrinsicBaseName + "%", hasOwn(INTRINSICS, intrinsicRealName))
          value2 = INTRINSICS[intrinsicRealName];
        else if (value2 != null) {
          if (!(part in value2)) {
            if (!allowMissing)
              throw new $TypeError("base intrinsic for " + name + " exists, but the property is not available.");
            return;
          }
          if ($gOPD && i2 + 1 >= parts.length) {
            var desc = $gOPD(value2, part);
            isOwn = !!desc, isOwn && "get" in desc && !("originalValue" in desc.get) ? value2 = desc.get : value2 = value2[part];
          } else
            isOwn = hasOwn(value2, part), value2 = value2[part];
          isOwn && !skipFurtherCaching && (INTRINSICS[intrinsicRealName] = value2);
        }
      }
      return value2;
    };
  }
}), require_call_bound = __commonJS2({
  "node_modules/.pnpm/call-bound@1.0.4/node_modules/call-bound/index.js"(exports, module) {
    "use strict";
    var GetIntrinsic = require_get_intrinsic(), callBindBasic = require_call_bind_apply_helpers(), $indexOf = callBindBasic([GetIntrinsic("%String.prototype.indexOf%")]);
    module.exports = function(name, allowMissing) {
      var intrinsic = (
        /** @type {(this: unknown, ...args: unknown[]) => unknown} */
        GetIntrinsic(name, !!allowMissing)
      );
      return typeof intrinsic == "function" && $indexOf(name, ".prototype.") > -1 ? callBindBasic(
        /** @type {const} */
        [intrinsic]
      ) : intrinsic;
    };
  }
}), require_shams2 = __commonJS2({
  "node_modules/.pnpm/has-tostringtag@1.0.2/node_modules/has-tostringtag/shams.js"(exports, module) {
    "use strict";
    var hasSymbols = require_shams();
    module.exports = function() {
      return hasSymbols() && !!Symbol.toStringTag;
    };
  }
}), require_is_regex = __commonJS2({
  "node_modules/.pnpm/is-regex@1.2.1/node_modules/is-regex/index.js"(exports, module) {
    "use strict";
    var callBound = require_call_bound(), hasToStringTag = require_shams2()(), hasOwn = require_hasown(), gOPD = require_gopd(), fn;
    hasToStringTag ? ($exec = callBound("RegExp.prototype.exec"), isRegexMarker = {}, throwRegexMarker = function() {
      throw isRegexMarker;
    }, badStringifier = {
      toString: throwRegexMarker,
      valueOf: throwRegexMarker
    }, typeof Symbol.toPrimitive == "symbol" && (badStringifier[Symbol.toPrimitive] = throwRegexMarker), fn = function(value2) {
      if (!value2 || typeof value2 != "object")
        return !1;
      var descriptor = (
        /** @type {NonNullable<typeof gOPD>} */
        gOPD(
          /** @type {{ lastIndex?: unknown }} */
          value2,
          "lastIndex"
        )
      ), hasLastIndexDataProperty = descriptor && hasOwn(descriptor, "value");
      if (!hasLastIndexDataProperty)
        return !1;
      try {
        $exec(
          value2,
          /** @type {string} */
          /** @type {unknown} */
          badStringifier
        );
      } catch (e2) {
        return e2 === isRegexMarker;
      }
    }) : ($toString = callBound("Object.prototype.toString"), regexClass = "[object RegExp]", fn = function(value2) {
      return !value2 || typeof value2 != "object" && typeof value2 != "function" ? !1 : $toString(value2) === regexClass;
    });
    var $exec, isRegexMarker, throwRegexMarker, badStringifier, $toString, regexClass;
    module.exports = fn;
  }
}), require_is_function = __commonJS2({
  "node_modules/.pnpm/is-function@1.0.2/node_modules/is-function/index.js"(exports, module) {
    module.exports = isFunction3;
    var toString2 = Object.prototype.toString;
    function isFunction3(fn) {
      if (!fn)
        return !1;
      var string = toString2.call(fn);
      return string === "[object Function]" || typeof fn == "function" && string !== "[object RegExp]" || typeof window < "u" && // IE8 and below
      (fn === window.setTimeout || fn === window.alert || fn === window.confirm || fn === window.prompt);
    }
  }
}), require_safe_regex_test = __commonJS2({
  "node_modules/.pnpm/safe-regex-test@1.1.0/node_modules/safe-regex-test/index.js"(exports, module) {
    "use strict";
    var callBound = require_call_bound(), isRegex = require_is_regex(), $exec = callBound("RegExp.prototype.exec"), $TypeError = require_type();
    module.exports = function(regex2) {
      if (!isRegex(regex2))
        throw new $TypeError("`regex` must be a RegExp");
      return function(s2) {
        return $exec(regex2, s2) !== null;
      };
    };
  }
}), require_is_symbol = __commonJS2({
  "node_modules/.pnpm/is-symbol@1.1.1/node_modules/is-symbol/index.js"(exports, module) {
    "use strict";
    var callBound = require_call_bound(), $toString = callBound("Object.prototype.toString"), hasSymbols = require_has_symbols()(), safeRegexTest = require_safe_regex_test();
    hasSymbols ? ($symToStr = callBound("Symbol.prototype.toString"), isSymString = safeRegexTest(/^Symbol\(.*\)$/), isSymbolObject = function(value2) {
      return typeof value2.valueOf() != "symbol" ? !1 : isSymString($symToStr(value2));
    }, module.exports = function(value2) {
      if (typeof value2 == "symbol")
        return !0;
      if (!value2 || typeof value2 != "object" || $toString(value2) !== "[object Symbol]")
        return !1;
      try {
        return isSymbolObject(value2);
      } catch {
        return !1;
      }
    }) : module.exports = function(value2) {
      return !1;
    };
    var $symToStr, isSymString, isSymbolObject;
  }
}), import_is_regex = __toESM2(require_is_regex()), import_is_function = __toESM2(require_is_function()), import_is_symbol = __toESM2(require_is_symbol());
function isObject(val) {
  return val != null && typeof val == "object" && Array.isArray(val) === !1;
}
var freeGlobal = typeof global == "object" && global && global.Object === Object && global, freeGlobal_default = freeGlobal, freeSelf = typeof self == "object" && self && self.Object === Object && self, root = freeGlobal_default || freeSelf || Function("return this")(), root_default = root, Symbol2 = root_default.Symbol, Symbol_default = Symbol2, objectProto = Object.prototype, hasOwnProperty = objectProto.hasOwnProperty, nativeObjectToString = objectProto.toString, symToStringTag = Symbol_default ? Symbol_default.toStringTag : void 0;
function getRawTag(value2) {
  var isOwn = hasOwnProperty.call(value2, symToStringTag), tag = value2[symToStringTag];
  try {
    value2[symToStringTag] = void 0;
    var unmasked = !0;
  } catch {
  }
  var result = nativeObjectToString.call(value2);
  return unmasked && (isOwn ? value2[symToStringTag] = tag : delete value2[symToStringTag]), result;
}
var getRawTag_default = getRawTag, objectProto2 = Object.prototype, nativeObjectToString2 = objectProto2.toString;
function objectToString(value2) {
  return nativeObjectToString2.call(value2);
}
var objectToString_default = objectToString, nullTag = "[object Null]", undefinedTag = "[object Undefined]", symToStringTag2 = Symbol_default ? Symbol_default.toStringTag : void 0;
function baseGetTag(value2) {
  return value2 == null ? value2 === void 0 ? undefinedTag : nullTag : symToStringTag2 && symToStringTag2 in Object(value2) ? getRawTag_default(value2) : objectToString_default(value2);
}
var baseGetTag_default = baseGetTag;
var symbolProto = Symbol_default ? Symbol_default.prototype : void 0, symbolToString = symbolProto ? symbolProto.toString : void 0;
function isObject2(value2) {
  var type = typeof value2;
  return value2 != null && (type == "object" || type == "function");
}
var isObject_default = isObject2, asyncTag = "[object AsyncFunction]", funcTag = "[object Function]", genTag = "[object GeneratorFunction]", proxyTag = "[object Proxy]";
function isFunction(value2) {
  if (!isObject_default(value2))
    return !1;
  var tag = baseGetTag_default(value2);
  return tag == funcTag || tag == genTag || tag == asyncTag || tag == proxyTag;
}
var isFunction_default = isFunction, coreJsData = root_default["__core-js_shared__"], coreJsData_default = coreJsData, maskSrcKey = (function() {
  var uid = /[^.]+$/.exec(coreJsData_default && coreJsData_default.keys && coreJsData_default.keys.IE_PROTO || "");
  return uid ? "Symbol(src)_1." + uid : "";
})();
function isMasked(func) {
  return !!maskSrcKey && maskSrcKey in func;
}
var isMasked_default = isMasked, funcProto = Function.prototype, funcToString = funcProto.toString;
function toSource(func) {
  if (func != null) {
    try {
      return funcToString.call(func);
    } catch {
    }
    try {
      return func + "";
    } catch {
    }
  }
  return "";
}
var toSource_default = toSource, reRegExpChar = /[\\^$.*+?()[\]{}|]/g, reIsHostCtor = /^\[object .+?Constructor\]$/, funcProto2 = Function.prototype, objectProto3 = Object.prototype, funcToString2 = funcProto2.toString, hasOwnProperty2 = objectProto3.hasOwnProperty, reIsNative = RegExp(
  "^" + funcToString2.call(hasOwnProperty2).replace(reRegExpChar, "\\$&").replace(/hasOwnProperty|(function).*?(?=\\\()| for .+?(?=\\\])/g, "$1.*?") + "$"
);
function baseIsNative(value2) {
  if (!isObject_default(value2) || isMasked_default(value2))
    return !1;
  var pattern = isFunction_default(value2) ? reIsNative : reIsHostCtor;
  return pattern.test(toSource_default(value2));
}
var baseIsNative_default = baseIsNative;
function getValue(object2, key) {
  return object2?.[key];
}
var getValue_default = getValue;
function getNative(object2, key) {
  var value2 = getValue_default(object2, key);
  return baseIsNative_default(value2) ? value2 : void 0;
}
var getNative_default = getNative;
function eq(value2, other) {
  return value2 === other || value2 !== value2 && other !== other;
}
var eq_default = eq;
var nativeCreate = getNative_default(Object, "create"), nativeCreate_default = nativeCreate;
function hashClear() {
  this.__data__ = nativeCreate_default ? nativeCreate_default(null) : {}, this.size = 0;
}
var hashClear_default = hashClear;
function hashDelete(key) {
  var result = this.has(key) && delete this.__data__[key];
  return this.size -= result ? 1 : 0, result;
}
var hashDelete_default = hashDelete, HASH_UNDEFINED = "__lodash_hash_undefined__", objectProto4 = Object.prototype, hasOwnProperty3 = objectProto4.hasOwnProperty;
function hashGet(key) {
  var data = this.__data__;
  if (nativeCreate_default) {
    var result = data[key];
    return result === HASH_UNDEFINED ? void 0 : result;
  }
  return hasOwnProperty3.call(data, key) ? data[key] : void 0;
}
var hashGet_default = hashGet, objectProto5 = Object.prototype, hasOwnProperty4 = objectProto5.hasOwnProperty;
function hashHas(key) {
  var data = this.__data__;
  return nativeCreate_default ? data[key] !== void 0 : hasOwnProperty4.call(data, key);
}
var hashHas_default = hashHas, HASH_UNDEFINED2 = "__lodash_hash_undefined__";
function hashSet(key, value2) {
  var data = this.__data__;
  return this.size += this.has(key) ? 0 : 1, data[key] = nativeCreate_default && value2 === void 0 ? HASH_UNDEFINED2 : value2, this;
}
var hashSet_default = hashSet;
function Hash(entries) {
  var index = -1, length = entries == null ? 0 : entries.length;
  for (this.clear(); ++index < length; ) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}
Hash.prototype.clear = hashClear_default;
Hash.prototype.delete = hashDelete_default;
Hash.prototype.get = hashGet_default;
Hash.prototype.has = hashHas_default;
Hash.prototype.set = hashSet_default;
var Hash_default = Hash;
function listCacheClear() {
  this.__data__ = [], this.size = 0;
}
var listCacheClear_default = listCacheClear;
function assocIndexOf(array2, key) {
  for (var length = array2.length; length--; )
    if (eq_default(array2[length][0], key))
      return length;
  return -1;
}
var assocIndexOf_default = assocIndexOf, arrayProto = Array.prototype, splice = arrayProto.splice;
function listCacheDelete(key) {
  var data = this.__data__, index = assocIndexOf_default(data, key);
  if (index < 0)
    return !1;
  var lastIndex = data.length - 1;
  return index == lastIndex ? data.pop() : splice.call(data, index, 1), --this.size, !0;
}
var listCacheDelete_default = listCacheDelete;
function listCacheGet(key) {
  var data = this.__data__, index = assocIndexOf_default(data, key);
  return index < 0 ? void 0 : data[index][1];
}
var listCacheGet_default = listCacheGet;
function listCacheHas(key) {
  return assocIndexOf_default(this.__data__, key) > -1;
}
var listCacheHas_default = listCacheHas;
function listCacheSet(key, value2) {
  var data = this.__data__, index = assocIndexOf_default(data, key);
  return index < 0 ? (++this.size, data.push([key, value2])) : data[index][1] = value2, this;
}
var listCacheSet_default = listCacheSet;
function ListCache(entries) {
  var index = -1, length = entries == null ? 0 : entries.length;
  for (this.clear(); ++index < length; ) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}
ListCache.prototype.clear = listCacheClear_default;
ListCache.prototype.delete = listCacheDelete_default;
ListCache.prototype.get = listCacheGet_default;
ListCache.prototype.has = listCacheHas_default;
ListCache.prototype.set = listCacheSet_default;
var ListCache_default = ListCache, Map2 = getNative_default(root_default, "Map"), Map_default = Map2;
function mapCacheClear() {
  this.size = 0, this.__data__ = {
    hash: new Hash_default(),
    map: new (Map_default || ListCache_default)(),
    string: new Hash_default()
  };
}
var mapCacheClear_default = mapCacheClear;
function isKeyable(value2) {
  var type = typeof value2;
  return type == "string" || type == "number" || type == "symbol" || type == "boolean" ? value2 !== "__proto__" : value2 === null;
}
var isKeyable_default = isKeyable;
function getMapData(map, key) {
  var data = map.__data__;
  return isKeyable_default(key) ? data[typeof key == "string" ? "string" : "hash"] : data.map;
}
var getMapData_default = getMapData;
function mapCacheDelete(key) {
  var result = getMapData_default(this, key).delete(key);
  return this.size -= result ? 1 : 0, result;
}
var mapCacheDelete_default = mapCacheDelete;
function mapCacheGet(key) {
  return getMapData_default(this, key).get(key);
}
var mapCacheGet_default = mapCacheGet;
function mapCacheHas(key) {
  return getMapData_default(this, key).has(key);
}
var mapCacheHas_default = mapCacheHas;
function mapCacheSet(key, value2) {
  var data = getMapData_default(this, key), size = data.size;
  return data.set(key, value2), this.size += data.size == size ? 0 : 1, this;
}
var mapCacheSet_default = mapCacheSet;
function MapCache(entries) {
  var index = -1, length = entries == null ? 0 : entries.length;
  for (this.clear(); ++index < length; ) {
    var entry = entries[index];
    this.set(entry[0], entry[1]);
  }
}
MapCache.prototype.clear = mapCacheClear_default;
MapCache.prototype.delete = mapCacheDelete_default;
MapCache.prototype.get = mapCacheGet_default;
MapCache.prototype.has = mapCacheHas_default;
MapCache.prototype.set = mapCacheSet_default;
var MapCache_default = MapCache, FUNC_ERROR_TEXT = "Expected a function";
function memoize2(func, resolver) {
  if (typeof func != "function" || resolver != null && typeof resolver != "function")
    throw new TypeError(FUNC_ERROR_TEXT);
  var memoized = function() {
    var args = arguments, key = resolver ? resolver.apply(this, args) : args[0], cache = memoized.cache;
    if (cache.has(key))
      return cache.get(key);
    var result = func.apply(this, args);
    return memoized.cache = cache.set(key, result) || cache, result;
  };
  return memoized.cache = new (memoize2.Cache || MapCache_default)(), memoized;
}
memoize2.Cache = MapCache_default;
var memoize_default = memoize2, MAX_MEMOIZE_SIZE = 500;
function memoizeCapped(func) {
  var result = memoize_default(func, function(key) {
    return cache.size === MAX_MEMOIZE_SIZE && cache.clear(), key;
  }), cache = result.cache;
  return result;
}
var memoizeCapped_default = memoizeCapped, rePropName = /[^.[\]]+|\[(?:(-?\d+(?:\.\d+)?)|(["'])((?:(?!\2)[^\\]|\\.)*?)\2)\]|(?=(?:\.|\[\])(?:\.|\[\]|$))/g, reEscapeChar = /\\(\\)?/g, stringToPath = memoizeCapped_default(function(string) {
  var result = [];
  return string.charCodeAt(0) === 46 && result.push(""), string.replace(rePropName, function(match, number, quote, subString) {
    result.push(quote ? subString.replace(reEscapeChar, "$1") : number || match);
  }), result;
});
var isObject3 = isObject, dateFormat = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/;
function convertUnconventionalData(data) {
  if (!isObject3(data))
    return data;
  let result = data, wasMutated = !1;
  return typeof Event < "u" && data instanceof Event && (result = extractEventHiddenProperties(result), wasMutated = !0), result = Object.keys(result).reduce((acc, key) => {
    try {
      result[key] && result[key].toJSON, acc[key] = result[key];
    } catch {
      wasMutated = !0;
    }
    return acc;
  }, {}), wasMutated ? result : data;
}
var replacer = function(options) {
  let objects, map, stack, keys;
  return function(key, value2) {
    try {
      if (key === "")
        return keys = [], objects = /* @__PURE__ */ new Map([[value2, "[]"]]), map = /* @__PURE__ */ new Map(), stack = [], value2;
      let origin = map.get(this) || this;
      for (; stack.length && origin !== stack[0]; )
        stack.shift(), keys.pop();
      if (typeof value2 == "boolean")
        return value2;
      if (value2 === void 0)
        return options.allowUndefined ? "_undefined_" : void 0;
      if (value2 === null)
        return null;
      if (typeof value2 == "number")
        return value2 === Number.NEGATIVE_INFINITY ? "_-Infinity_" : value2 === Number.POSITIVE_INFINITY ? "_Infinity_" : Number.isNaN(value2) ? "_NaN_" : value2;
      if (typeof value2 == "bigint")
        return `_bigint_${value2.toString()}`;
      if (typeof value2 == "string")
        return dateFormat.test(value2) ? options.allowDate ? `_date_${value2}` : void 0 : value2;
      if ((0, import_is_regex.default)(value2))
        return options.allowRegExp ? `_regexp_${value2.flags}|${value2.source}` : void 0;
      if ((0, import_is_function.default)(value2))
        return;
      if ((0, import_is_symbol.default)(value2)) {
        if (!options.allowSymbol)
          return;
        let globalRegistryKey = Symbol.keyFor(value2);
        return globalRegistryKey !== void 0 ? `_gsymbol_${globalRegistryKey}` : `_symbol_${value2.toString().slice(7, -1)}`;
      }
      if (stack.length >= options.maxDepth)
        return Array.isArray(value2) ? `[Array(${value2.length})]` : "[Object]";
      if (value2 === this)
        return `_duplicate_${JSON.stringify(keys)}`;
      if (value2 instanceof Error && options.allowError)
        return {
          __isConvertedError__: !0,
          errorProperties: {
            // @ts-expect-error cause is not defined in the current tsconfig target(es2020)
            ...value2.cause ? { cause: value2.cause } : {},
            ...value2,
            name: value2.name,
            message: value2.message,
            stack: value2.stack,
            "_constructor-name_": value2.constructor.name
          }
        };
      if (value2?.constructor?.name && value2.constructor.name !== "Object" && !Array.isArray(value2)) {
        let found2 = objects.get(value2);
        if (!found2) {
          let plainObject = {
            __isClassInstance__: !0,
            __className__: value2.constructor.name,
            ...Object.getOwnPropertyNames(value2).reduce(
              (acc, prop) => {
                try {
                  acc[prop] = value2[prop];
                } catch {
                }
                return acc;
              },
              {}
            )
          };
          return keys.push(key), stack.unshift(plainObject), objects.set(value2, JSON.stringify(keys)), value2 !== plainObject && map.set(value2, plainObject), plainObject;
        }
        return `_duplicate_${found2}`;
      }
      let found = objects.get(value2);
      if (!found) {
        let converted = Array.isArray(value2) ? value2 : convertUnconventionalData(value2);
        return keys.push(key), stack.unshift(converted), objects.set(value2, JSON.stringify(keys)), value2 !== converted && map.set(value2, converted), converted;
      }
      return `_duplicate_${found}`;
    } catch {
      return;
    }
  };
};
var defaultOptions = {
  maxDepth: 10,
  space: void 0,
  allowRegExp: !0,
  allowDate: !0,
  allowError: !0,
  allowUndefined: !0,
  allowSymbol: !0
}, stringify = (data, options = {}) => {
  let mergedOptions = { ...defaultOptions, ...options };
  return JSON.stringify(convertUnconventionalData(data), replacer(mergedOptions), options.space);
};

// src/blocks/blocks/SourceContainer.tsx
function argsHash(args) {
  return stringify(args, { maxDepth: 50 });
}
var SourceContext = createContext3({ sources: {} }), UNKNOWN_ARGS_HASH = "--unknown--", SourceContainer = ({
  children,
  channel
}) => {
  let [sources, setSources] = useState14({});
  return useEffect11(() => {
    let handleSnippetRendered = (idOrEvent, inputSource = null, inputFormat = !1) => {
      let {
        id,
        args = void 0,
        source,
        format: format2
      } = typeof idOrEvent == "string" ? {
        id: idOrEvent,
        source: inputSource,
        format: inputFormat
      } : idOrEvent, hash = args ? argsHash(args) : UNKNOWN_ARGS_HASH;
      setSources((current) => ({
        ...current,
        [id]: {
          ...current[id],
          [hash]: { code: source || "", format: format2 }
        }
      }));
    };
    return channel.on(SNIPPET_RENDERED, handleSnippetRendered), () => channel.off(SNIPPET_RENDERED, handleSnippetRendered);
  }, []), React37.createElement(SourceContext.Provider, { value: { sources } }, children);
};

// src/blocks/blocks/useTransformCode.tsx
import { useEffect as useEffect12, useState as useState15 } from "react";
function useTransformCode(source, transform, storyContext) {
  let [transformedCode, setTransformedCode] = useState15("Transforming..."), transformed = transform ? transform?.(source, storyContext) : source;
  return useEffect12(() => {
    async function getTransformedCode() {
      let transformResult = await transformed;
      transformResult !== transformedCode && setTransformedCode(transformResult);
    }
    getTransformedCode();
  }), typeof transformed == "object" && typeof transformed.then == "function" ? transformedCode : transformed;
}

// src/blocks/blocks/Source.tsx
var getStorySource = (storyId, args, sourceContext) => {
  let { sources } = sourceContext, sourceMap = sources?.[storyId];
  return sourceMap?.[argsHash(args)] || sourceMap?.[UNKNOWN_ARGS_HASH] || { code: "" };
}, useCode = ({
  snippet,
  storyContext,
  typeFromProps,
  transformFromProps
}) => {
  let parameters = storyContext.parameters ?? {}, { __isArgsStory: isArgsStory } = parameters, sourceParameters = parameters.docs?.source || {}, type = typeFromProps || sourceParameters.type || SourceType.AUTO, code = /* if user has explicitly set this as dynamic, use snippet */ type === SourceType.DYNAMIC || // if this is an args story and there's a snippet
  type === SourceType.AUTO && snippet && isArgsStory ? snippet : sourceParameters.originalSource || "", transformer = transformFromProps ?? sourceParameters.transform, transformedCode = transformer ? useTransformCode(code, transformer, storyContext) : code;
  return sourceParameters.code !== void 0 ? sourceParameters.code : transformedCode;
}, useSourceProps = (props, docsContext, sourceContext) => {
  let { of } = props, story = useMemo3(() => {
    if (of)
      return docsContext.resolveOf(of, ["story"]).story;
    try {
      return docsContext.storyById();
    } catch {
    }
  }, [docsContext, of]), storyContext = story ? docsContext.getStoryContext(story) : {}, argsForSource = props.__forceInitialArgs ? storyContext.initialArgs : storyContext.unmappedArgs, source = story ? getStorySource(story.id, argsForSource, sourceContext) : null, transformedCode = useCode({
    snippet: source ? source.code : "",
    storyContext: { ...storyContext, args: argsForSource },
    typeFromProps: props.type,
    transformFromProps: props.transform
  });
  if ("of" in props && of === void 0)
    throw new Error("Unexpected `of={undefined}`, did you mistype a CSF file reference?");
  let sourceParameters = story?.parameters?.docs?.source || {}, format2 = props.format, language = props.language ?? sourceParameters.language ?? "jsx", dark = props.dark ?? sourceParameters.dark ?? !1;
  return !props.code && !story ? { error: "Oh no! The source is not available." /* SOURCE_UNAVAILABLE */ } : props.code ? {
    code: props.code,
    format: format2,
    language,
    dark
  } : (format2 = source?.format ?? !0, {
    code: transformedCode,
    format: format2,
    language,
    dark
  });
}, Source2 = (props) => {
  let sourceContext = useContext4(SourceContext), docsContext = useContext4(DocsContext), sourceProps = useSourceProps(props, docsContext, sourceContext);
  return React38.createElement(Source, { ...sourceProps });
};

// src/blocks/blocks/Canvas.tsx
var Canvas = (props) => {
  let docsContext = useContext5(DocsContext), sourceContext = useContext5(SourceContext), { of, source } = props;
  if ("of" in props && of === void 0)
    throw new Error("Unexpected `of={undefined}`, did you mistype a CSF file reference?");
  let { story } = useOf(of || "story", ["story"]), sourceProps = useSourceProps({ ...source, ...of && { of } }, docsContext, sourceContext), layout = props.layout ?? story.parameters.layout ?? story.parameters.docs?.canvas?.layout ?? "padded", withToolbar = props.withToolbar ?? story.parameters.docs?.canvas?.withToolbar ?? !1, additionalActions = props.additionalActions ?? story.parameters.docs?.canvas?.additionalActions, sourceState = props.sourceState ?? story.parameters.docs?.canvas?.sourceState ?? "hidden", className = props.className ?? story.parameters.docs?.canvas?.className, inline = props.story?.inline ?? story.parameters?.docs?.story?.inline ?? !1;
  return React39.createElement(
    Preview,
    {
      withSource: sourceState === "none" ? void 0 : sourceProps,
      isExpanded: sourceState === "shown",
      withToolbar,
      additionalActions,
      className,
      layout,
      inline
    },
    React39.createElement(Story2, { of: of || story.moduleExport, meta: props.meta, ...props.story })
  );
};

// src/blocks/blocks/Controls.tsx
import React40, { useContext as useContext6 } from "react";
import { filterArgTypes as filterArgTypes2 } from "storybook/preview-api";

// src/blocks/blocks/useArgs.ts
import { useCallback as useCallback7, useEffect as useEffect13, useState as useState16 } from "react";
import {
  RESET_STORY_ARGS,
  STORY_ARGS_UPDATED,
  UPDATE_STORY_ARGS
} from "storybook/internal/core-events";
var useArgs = (story, context) => {
  let result = useArgsIfDefined(story, context);
  if (!result)
    throw new Error("No result when story was defined");
  return result;
}, useArgsIfDefined = (story, context) => {
  let storyContext = story ? context.getStoryContext(story) : { args: {} }, { id: storyId } = story || { id: "none" }, [args, setArgs] = useState16(storyContext.args);
  useEffect13(() => {
    let onArgsUpdated = (changed) => {
      changed.storyId === storyId && setArgs(changed.args);
    };
    return context.channel.on(STORY_ARGS_UPDATED, onArgsUpdated), () => context.channel.off(STORY_ARGS_UPDATED, onArgsUpdated);
  }, [storyId, context.channel]);
  let updateArgs = useCallback7(
    (updatedArgs) => context.channel.emit(UPDATE_STORY_ARGS, { storyId, updatedArgs }),
    [storyId, context.channel]
  ), resetArgs = useCallback7(
    (argNames) => context.channel.emit(RESET_STORY_ARGS, { storyId, argNames }),
    [storyId, context.channel]
  );
  return story && [args, updateArgs, resetArgs];
};

// src/blocks/blocks/useGlobals.ts
import { useEffect as useEffect14, useState as useState17 } from "react";
import { GLOBALS_UPDATED } from "storybook/internal/core-events";
var useGlobals = (story, context) => {
  let storyContext = context.getStoryContext(story), [globals, setGlobals] = useState17(storyContext.globals);
  return useEffect14(() => {
    let onGlobalsUpdated = (changed) => {
      setGlobals(changed.globals);
    };
    return context.channel.on(GLOBALS_UPDATED, onGlobalsUpdated), () => context.channel.off(GLOBALS_UPDATED, onGlobalsUpdated);
  }, [context.channel]), [globals];
};

// src/blocks/blocks/Controls.tsx
function extractComponentArgTypes2(component, parameters) {
  let { extractArgTypes } = parameters.docs || {};
  if (!extractArgTypes)
    throw new Error("Args unsupported. See Args documentation for your framework." /* ARGS_UNSUPPORTED */);
  return extractArgTypes(component);
}
var Controls3 = (props) => {
  let { of } = props;
  if ("of" in props && of === void 0)
    throw new Error("Unexpected `of={undefined}`, did you mistype a CSF file reference?");
  let context = useContext6(DocsContext), { story } = context.resolveOf(of || "story", ["story"]), { parameters, argTypes, component, subcomponents } = story, controlsParameters = parameters.docs?.controls || {}, include = props.include ?? controlsParameters.include, exclude = props.exclude ?? controlsParameters.exclude, sort = props.sort ?? controlsParameters.sort, [args, updateArgs, resetArgs] = useArgs(story, context), [globals] = useGlobals(story, context), filteredArgTypes = filterArgTypes2(argTypes, include, exclude);
  if (!(!!subcomponents && Object.keys(subcomponents || {}).length > 0))
    return Object.keys(filteredArgTypes).length > 0 || Object.keys(args).length > 0 ? React40.createElement(
      ArgsTable,
      {
        rows: filteredArgTypes,
        sort,
        args,
        globals,
        updateArgs,
        resetArgs
      }
    ) : null;
  let mainComponentName = getComponentName(component) || "Story", subcomponentTabs = Object.fromEntries(
    Object.entries(subcomponents || {}).map(([key, comp]) => [
      key,
      {
        rows: filterArgTypes2(extractComponentArgTypes2(comp, parameters), include, exclude),
        sort
      }
    ])
  ), tabs = {
    [mainComponentName]: { rows: filteredArgTypes, sort },
    ...subcomponentTabs
  };
  return React40.createElement(
    TabbedArgsTable,
    {
      tabs,
      sort,
      args,
      globals,
      updateArgs,
      resetArgs
    }
  );
};

// src/blocks/blocks/Description.tsx
import React43 from "react";

// src/blocks/blocks/Markdown.tsx
import React42 from "react";
import { dedent } from "ts-dedent";

// src/blocks/blocks/mdx.tsx
import React41, { useContext as useContext7 } from "react";
import { Code, components, nameSpaceClassNames } from "storybook/internal/components";
import { NAVIGATE_URL as NAVIGATE_URL2 } from "storybook/internal/core-events";
import { LinkIcon } from "@storybook/icons";
import { styled as styled28 } from "storybook/theming";
var { document: document2 } = globalThis, assertIsFn = (val) => {
  if (typeof val != "function")
    throw new Error(`Expected story function, got: ${val}`);
  return val;
}, AddContext = (props) => {
  let { children, ...rest } = props, parentContext = React41.useContext(DocsContext);
  return React41.createElement(DocsContext.Provider, { value: { ...parentContext, ...rest } }, children);
}, CodeOrSourceMdx = ({
  className,
  children,
  ...rest
}) => {
  if (typeof className != "string" && (typeof children != "string" || !children.match(/[\n\r]/g)))
    return React41.createElement(Code, null, children);
  let language = className && className.split("-");
  return React41.createElement(
    Source,
    {
      language: language && language[1] || "text",
      format: !1,
      code: children,
      ...rest
    }
  );
};
function navigate(context, url) {
  context.channel.emit(NAVIGATE_URL2, url);
}
var A2 = components.a, AnchorInPage = ({ hash, children }) => {
  let context = useContext7(DocsContext);
  return React41.createElement(
    A2,
    {
      href: hash,
      target: "_self",
      onClick: (event) => {
        let id = hash.substring(1);
        document2.getElementById(id) && navigate(context, hash);
      }
    },
    children
  );
}, AnchorMdx = (props) => {
  let { href, target, children, ...rest } = props, context = useContext7(DocsContext);
  return !href || target === "_blank" || /^https?:\/\//.test(href) ? React41.createElement(A2, { ...props }) : href.startsWith("#") ? React41.createElement(AnchorInPage, { hash: href }, children) : React41.createElement(
    A2,
    {
      href,
      onClick: (event) => {
        event.button === 0 && !event.altKey && !event.ctrlKey && !event.metaKey && !event.shiftKey && (event.preventDefault(), navigate(context, event.currentTarget.getAttribute("href") || ""));
      },
      target,
      ...rest
    },
    children
  );
}, SUPPORTED_MDX_HEADERS = ["h1", "h2", "h3", "h4", "h5", "h6"], OcticonHeaders = SUPPORTED_MDX_HEADERS.reduce(
  (acc, headerType) => ({
    ...acc,
    [headerType]: styled28(headerType)({
      "& svg": {
        position: "relative",
        top: "-0.1em",
        visibility: "hidden"
      },
      "&:hover svg": {
        visibility: "visible"
      }
    })
  }),
  {}
), OcticonAnchor = styled28.a(
  () => ({
    float: "left",
    lineHeight: "inherit",
    paddingRight: "10px",
    marginLeft: "-24px",
    // Allow the theme's text color to override the default link color.
    color: "inherit"
  })
), HeaderWithOcticonAnchor = ({
  as,
  id,
  children,
  ...rest
}) => {
  let context = useContext7(DocsContext), OcticonHeader = OcticonHeaders[as], hash = `#${id}`;
  return React41.createElement(OcticonHeader, { id, ...rest }, React41.createElement(
    OcticonAnchor,
    {
      "aria-hidden": "true",
      href: hash,
      tabIndex: -1,
      target: "_self",
      onClick: (event) => {
        document2.getElementById(id) && navigate(context, hash);
      }
    },
    React41.createElement(LinkIcon, null)
  ), children);
}, HeaderMdx = (props) => {
  let { as, id, children, ...rest } = props;
  if (id)
    return React41.createElement(HeaderWithOcticonAnchor, { as, id, ...rest }, children);
  let Component4 = as, { as: omittedAs, ...withoutAs } = props;
  return React41.createElement(Component4, { ...nameSpaceClassNames(withoutAs, as) });
}, HeadersMdx = SUPPORTED_MDX_HEADERS.reduce(
  (acc, headerType) => ({
    ...acc,
    // @ts-expect-error (Converted from ts-ignore)
    [headerType]: (props) => React41.createElement(HeaderMdx, { as: headerType, ...props })
  }),
  {}
);

// src/blocks/blocks/Markdown.tsx
var Markdown = (props) => {
  if (!props.children)
    return null;
  if (typeof props.children != "string")
    throw new Error(
      dedent`The Markdown block only accepts children as a single string, but children were of type: '${typeof props.children}'
        This is often caused by not wrapping the child in a template string.
        
        This is invalid:
        <Markdown>
          # Some heading
          A paragraph
        </Markdown>

        Instead do:
        <Markdown>
        {\`
          # Some heading
          A paragraph
        \`}
        </Markdown>
      `
    );
  return React42.createElement(
    index_modern_default,
    {
      ...props,
      options: {
        forceBlock: !0,
        overrides: {
          code: CodeOrSourceMdx,
          a: AnchorMdx,
          ...HeadersMdx,
          ...props?.options?.overrides
        },
        ...props?.options
      }
    }
  );
};

// src/blocks/blocks/Description.tsx
var DescriptionType = /* @__PURE__ */ ((DescriptionType2) => (DescriptionType2.INFO = "info", DescriptionType2.NOTES = "notes", DescriptionType2.DOCGEN = "docgen", DescriptionType2.AUTO = "auto", DescriptionType2))(DescriptionType || {}), getDescriptionFromResolvedOf = (resolvedOf) => {
  switch (resolvedOf.type) {
    case "story":
      return resolvedOf.story.parameters.docs?.description?.story || null;
    case "meta": {
      let { parameters, component } = resolvedOf.preparedMeta, metaDescription = parameters.docs?.description?.component;
      return metaDescription || parameters.docs?.extractComponentDescription?.(component, {
        component,
        parameters
      }) || null;
    }
    case "component": {
      let {
        component,
        projectAnnotations: { parameters }
      } = resolvedOf;
      return parameters?.docs?.extractComponentDescription?.(component, {
        component,
        parameters
      }) || null;
    }
    default:
      throw new Error(
        `Unrecognized module type resolved from 'useOf', got: ${resolvedOf.type}`
      );
  }
}, DescriptionContainer = (props) => {
  let { of } = props;
  if ("of" in props && of === void 0)
    throw new Error("Unexpected `of={undefined}`, did you mistype a CSF file reference?");
  let resolvedOf = useOf(of || "meta"), markdown = getDescriptionFromResolvedOf(resolvedOf);
  return markdown ? React43.createElement(Markdown, null, markdown) : null;
};

// src/blocks/blocks/Docs.tsx
import React53 from "react";

// src/blocks/blocks/DocsContainer.tsx
import React44, { useEffect as useEffect15 } from "react";
import { ThemeProvider, ensure as ensureTheme } from "storybook/theming";
var { document: document3, window: globalWindow3 } = globalThis, DocsContainer = ({
  context,
  theme,
  children
}) => {
  let toc;
  try {
    toc = context.resolveOf("meta", ["meta"]).preparedMeta.parameters?.docs?.toc;
  } catch {
    toc = context?.projectAnnotations?.parameters?.docs?.toc;
  }
  return useEffect15(() => {
    let url;
    try {
      if (url = new URL(globalWindow3.parent.location.toString()), url.hash) {
        let element = document3.getElementById(decodeURIComponent(url.hash.substring(1)));
        element && setTimeout(() => {
          scrollToElement(element);
        }, 200);
      }
    } catch {
    }
  }), React44.createElement(DocsContext.Provider, { value: context }, React44.createElement(SourceContainer, { channel: context.channel }, React44.createElement(ThemeProvider, { theme: ensureTheme(theme) }, React44.createElement(
    DocsPageWrapper,
    {
      toc: toc ? React44.createElement(
        TableOfContents,
        {
          className: "sbdocs sbdocs-toc--custom",
          channel: context.channel,
          ...toc
        }
      ) : null
    },
    children
  ))));
};

// src/blocks/blocks/DocsPage.tsx
import React52 from "react";

// src/blocks/blocks/Primary.tsx
import React48, { useContext as useContext8 } from "react";

// src/blocks/blocks/DocsStory.tsx
import React47 from "react";

// src/blocks/blocks/Subheading.tsx
import React46 from "react";
import { H3 } from "storybook/internal/components";

// src/blocks/blocks/Heading.tsx
import React45 from "react";
import { H2 } from "storybook/internal/components";

// ../../node_modules/github-slugger/regex.js
var regex = /[\0-\x1F!-,\.\/:-@\[-\^`\{-\xA9\xAB-\xB4\xB6-\xB9\xBB-\xBF\xD7\xF7\u02C2-\u02C5\u02D2-\u02DF\u02E5-\u02EB\u02ED\u02EF-\u02FF\u0375\u0378\u0379\u037E\u0380-\u0385\u0387\u038B\u038D\u03A2\u03F6\u0482\u0530\u0557\u0558\u055A-\u055F\u0589-\u0590\u05BE\u05C0\u05C3\u05C6\u05C8-\u05CF\u05EB-\u05EE\u05F3-\u060F\u061B-\u061F\u066A-\u066D\u06D4\u06DD\u06DE\u06E9\u06FD\u06FE\u0700-\u070F\u074B\u074C\u07B2-\u07BF\u07F6-\u07F9\u07FB\u07FC\u07FE\u07FF\u082E-\u083F\u085C-\u085F\u086B-\u089F\u08B5\u08C8-\u08D2\u08E2\u0964\u0965\u0970\u0984\u098D\u098E\u0991\u0992\u09A9\u09B1\u09B3-\u09B5\u09BA\u09BB\u09C5\u09C6\u09C9\u09CA\u09CF-\u09D6\u09D8-\u09DB\u09DE\u09E4\u09E5\u09F2-\u09FB\u09FD\u09FF\u0A00\u0A04\u0A0B-\u0A0E\u0A11\u0A12\u0A29\u0A31\u0A34\u0A37\u0A3A\u0A3B\u0A3D\u0A43-\u0A46\u0A49\u0A4A\u0A4E-\u0A50\u0A52-\u0A58\u0A5D\u0A5F-\u0A65\u0A76-\u0A80\u0A84\u0A8E\u0A92\u0AA9\u0AB1\u0AB4\u0ABA\u0ABB\u0AC6\u0ACA\u0ACE\u0ACF\u0AD1-\u0ADF\u0AE4\u0AE5\u0AF0-\u0AF8\u0B00\u0B04\u0B0D\u0B0E\u0B11\u0B12\u0B29\u0B31\u0B34\u0B3A\u0B3B\u0B45\u0B46\u0B49\u0B4A\u0B4E-\u0B54\u0B58-\u0B5B\u0B5E\u0B64\u0B65\u0B70\u0B72-\u0B81\u0B84\u0B8B-\u0B8D\u0B91\u0B96-\u0B98\u0B9B\u0B9D\u0BA0-\u0BA2\u0BA5-\u0BA7\u0BAB-\u0BAD\u0BBA-\u0BBD\u0BC3-\u0BC5\u0BC9\u0BCE\u0BCF\u0BD1-\u0BD6\u0BD8-\u0BE5\u0BF0-\u0BFF\u0C0D\u0C11\u0C29\u0C3A-\u0C3C\u0C45\u0C49\u0C4E-\u0C54\u0C57\u0C5B-\u0C5F\u0C64\u0C65\u0C70-\u0C7F\u0C84\u0C8D\u0C91\u0CA9\u0CB4\u0CBA\u0CBB\u0CC5\u0CC9\u0CCE-\u0CD4\u0CD7-\u0CDD\u0CDF\u0CE4\u0CE5\u0CF0\u0CF3-\u0CFF\u0D0D\u0D11\u0D45\u0D49\u0D4F-\u0D53\u0D58-\u0D5E\u0D64\u0D65\u0D70-\u0D79\u0D80\u0D84\u0D97-\u0D99\u0DB2\u0DBC\u0DBE\u0DBF\u0DC7-\u0DC9\u0DCB-\u0DCE\u0DD5\u0DD7\u0DE0-\u0DE5\u0DF0\u0DF1\u0DF4-\u0E00\u0E3B-\u0E3F\u0E4F\u0E5A-\u0E80\u0E83\u0E85\u0E8B\u0EA4\u0EA6\u0EBE\u0EBF\u0EC5\u0EC7\u0ECE\u0ECF\u0EDA\u0EDB\u0EE0-\u0EFF\u0F01-\u0F17\u0F1A-\u0F1F\u0F2A-\u0F34\u0F36\u0F38\u0F3A-\u0F3D\u0F48\u0F6D-\u0F70\u0F85\u0F98\u0FBD-\u0FC5\u0FC7-\u0FFF\u104A-\u104F\u109E\u109F\u10C6\u10C8-\u10CC\u10CE\u10CF\u10FB\u1249\u124E\u124F\u1257\u1259\u125E\u125F\u1289\u128E\u128F\u12B1\u12B6\u12B7\u12BF\u12C1\u12C6\u12C7\u12D7\u1311\u1316\u1317\u135B\u135C\u1360-\u137F\u1390-\u139F\u13F6\u13F7\u13FE-\u1400\u166D\u166E\u1680\u169B-\u169F\u16EB-\u16ED\u16F9-\u16FF\u170D\u1715-\u171F\u1735-\u173F\u1754-\u175F\u176D\u1771\u1774-\u177F\u17D4-\u17D6\u17D8-\u17DB\u17DE\u17DF\u17EA-\u180A\u180E\u180F\u181A-\u181F\u1879-\u187F\u18AB-\u18AF\u18F6-\u18FF\u191F\u192C-\u192F\u193C-\u1945\u196E\u196F\u1975-\u197F\u19AC-\u19AF\u19CA-\u19CF\u19DA-\u19FF\u1A1C-\u1A1F\u1A5F\u1A7D\u1A7E\u1A8A-\u1A8F\u1A9A-\u1AA6\u1AA8-\u1AAF\u1AC1-\u1AFF\u1B4C-\u1B4F\u1B5A-\u1B6A\u1B74-\u1B7F\u1BF4-\u1BFF\u1C38-\u1C3F\u1C4A-\u1C4C\u1C7E\u1C7F\u1C89-\u1C8F\u1CBB\u1CBC\u1CC0-\u1CCF\u1CD3\u1CFB-\u1CFF\u1DFA\u1F16\u1F17\u1F1E\u1F1F\u1F46\u1F47\u1F4E\u1F4F\u1F58\u1F5A\u1F5C\u1F5E\u1F7E\u1F7F\u1FB5\u1FBD\u1FBF-\u1FC1\u1FC5\u1FCD-\u1FCF\u1FD4\u1FD5\u1FDC-\u1FDF\u1FED-\u1FF1\u1FF5\u1FFD-\u203E\u2041-\u2053\u2055-\u2070\u2072-\u207E\u2080-\u208F\u209D-\u20CF\u20F1-\u2101\u2103-\u2106\u2108\u2109\u2114\u2116-\u2118\u211E-\u2123\u2125\u2127\u2129\u212E\u213A\u213B\u2140-\u2144\u214A-\u214D\u214F-\u215F\u2189-\u24B5\u24EA-\u2BFF\u2C2F\u2C5F\u2CE5-\u2CEA\u2CF4-\u2CFF\u2D26\u2D28-\u2D2C\u2D2E\u2D2F\u2D68-\u2D6E\u2D70-\u2D7E\u2D97-\u2D9F\u2DA7\u2DAF\u2DB7\u2DBF\u2DC7\u2DCF\u2DD7\u2DDF\u2E00-\u2E2E\u2E30-\u3004\u3008-\u3020\u3030\u3036\u3037\u303D-\u3040\u3097\u3098\u309B\u309C\u30A0\u30FB\u3100-\u3104\u3130\u318F-\u319F\u31C0-\u31EF\u3200-\u33FF\u4DC0-\u4DFF\u9FFD-\u9FFF\uA48D-\uA4CF\uA4FE\uA4FF\uA60D-\uA60F\uA62C-\uA63F\uA673\uA67E\uA6F2-\uA716\uA720\uA721\uA789\uA78A\uA7C0\uA7C1\uA7CB-\uA7F4\uA828-\uA82B\uA82D-\uA83F\uA874-\uA87F\uA8C6-\uA8CF\uA8DA-\uA8DF\uA8F8-\uA8FA\uA8FC\uA92E\uA92F\uA954-\uA95F\uA97D-\uA97F\uA9C1-\uA9CE\uA9DA-\uA9DF\uA9FF\uAA37-\uAA3F\uAA4E\uAA4F\uAA5A-\uAA5F\uAA77-\uAA79\uAAC3-\uAADA\uAADE\uAADF\uAAF0\uAAF1\uAAF7-\uAB00\uAB07\uAB08\uAB0F\uAB10\uAB17-\uAB1F\uAB27\uAB2F\uAB5B\uAB6A-\uAB6F\uABEB\uABEE\uABEF\uABFA-\uABFF\uD7A4-\uD7AF\uD7C7-\uD7CA\uD7FC-\uD7FF\uE000-\uF8FF\uFA6E\uFA6F\uFADA-\uFAFF\uFB07-\uFB12\uFB18-\uFB1C\uFB29\uFB37\uFB3D\uFB3F\uFB42\uFB45\uFBB2-\uFBD2\uFD3E-\uFD4F\uFD90\uFD91\uFDC8-\uFDEF\uFDFC-\uFDFF\uFE10-\uFE1F\uFE30-\uFE32\uFE35-\uFE4C\uFE50-\uFE6F\uFE75\uFEFD-\uFF0F\uFF1A-\uFF20\uFF3B-\uFF3E\uFF40\uFF5B-\uFF65\uFFBF-\uFFC1\uFFC8\uFFC9\uFFD0\uFFD1\uFFD8\uFFD9\uFFDD-\uFFFF]|\uD800[\uDC0C\uDC27\uDC3B\uDC3E\uDC4E\uDC4F\uDC5E-\uDC7F\uDCFB-\uDD3F\uDD75-\uDDFC\uDDFE-\uDE7F\uDE9D-\uDE9F\uDED1-\uDEDF\uDEE1-\uDEFF\uDF20-\uDF2C\uDF4B-\uDF4F\uDF7B-\uDF7F\uDF9E\uDF9F\uDFC4-\uDFC7\uDFD0\uDFD6-\uDFFF]|\uD801[\uDC9E\uDC9F\uDCAA-\uDCAF\uDCD4-\uDCD7\uDCFC-\uDCFF\uDD28-\uDD2F\uDD64-\uDDFF\uDF37-\uDF3F\uDF56-\uDF5F\uDF68-\uDFFF]|\uD802[\uDC06\uDC07\uDC09\uDC36\uDC39-\uDC3B\uDC3D\uDC3E\uDC56-\uDC5F\uDC77-\uDC7F\uDC9F-\uDCDF\uDCF3\uDCF6-\uDCFF\uDD16-\uDD1F\uDD3A-\uDD7F\uDDB8-\uDDBD\uDDC0-\uDDFF\uDE04\uDE07-\uDE0B\uDE14\uDE18\uDE36\uDE37\uDE3B-\uDE3E\uDE40-\uDE5F\uDE7D-\uDE7F\uDE9D-\uDEBF\uDEC8\uDEE7-\uDEFF\uDF36-\uDF3F\uDF56-\uDF5F\uDF73-\uDF7F\uDF92-\uDFFF]|\uD803[\uDC49-\uDC7F\uDCB3-\uDCBF\uDCF3-\uDCFF\uDD28-\uDD2F\uDD3A-\uDE7F\uDEAA\uDEAD-\uDEAF\uDEB2-\uDEFF\uDF1D-\uDF26\uDF28-\uDF2F\uDF51-\uDFAF\uDFC5-\uDFDF\uDFF7-\uDFFF]|\uD804[\uDC47-\uDC65\uDC70-\uDC7E\uDCBB-\uDCCF\uDCE9-\uDCEF\uDCFA-\uDCFF\uDD35\uDD40-\uDD43\uDD48-\uDD4F\uDD74\uDD75\uDD77-\uDD7F\uDDC5-\uDDC8\uDDCD\uDDDB\uDDDD-\uDDFF\uDE12\uDE38-\uDE3D\uDE3F-\uDE7F\uDE87\uDE89\uDE8E\uDE9E\uDEA9-\uDEAF\uDEEB-\uDEEF\uDEFA-\uDEFF\uDF04\uDF0D\uDF0E\uDF11\uDF12\uDF29\uDF31\uDF34\uDF3A\uDF45\uDF46\uDF49\uDF4A\uDF4E\uDF4F\uDF51-\uDF56\uDF58-\uDF5C\uDF64\uDF65\uDF6D-\uDF6F\uDF75-\uDFFF]|\uD805[\uDC4B-\uDC4F\uDC5A-\uDC5D\uDC62-\uDC7F\uDCC6\uDCC8-\uDCCF\uDCDA-\uDD7F\uDDB6\uDDB7\uDDC1-\uDDD7\uDDDE-\uDDFF\uDE41-\uDE43\uDE45-\uDE4F\uDE5A-\uDE7F\uDEB9-\uDEBF\uDECA-\uDEFF\uDF1B\uDF1C\uDF2C-\uDF2F\uDF3A-\uDFFF]|\uD806[\uDC3B-\uDC9F\uDCEA-\uDCFE\uDD07\uDD08\uDD0A\uDD0B\uDD14\uDD17\uDD36\uDD39\uDD3A\uDD44-\uDD4F\uDD5A-\uDD9F\uDDA8\uDDA9\uDDD8\uDDD9\uDDE2\uDDE5-\uDDFF\uDE3F-\uDE46\uDE48-\uDE4F\uDE9A-\uDE9C\uDE9E-\uDEBF\uDEF9-\uDFFF]|\uD807[\uDC09\uDC37\uDC41-\uDC4F\uDC5A-\uDC71\uDC90\uDC91\uDCA8\uDCB7-\uDCFF\uDD07\uDD0A\uDD37-\uDD39\uDD3B\uDD3E\uDD48-\uDD4F\uDD5A-\uDD5F\uDD66\uDD69\uDD8F\uDD92\uDD99-\uDD9F\uDDAA-\uDEDF\uDEF7-\uDFAF\uDFB1-\uDFFF]|\uD808[\uDF9A-\uDFFF]|\uD809[\uDC6F-\uDC7F\uDD44-\uDFFF]|[\uD80A\uD80B\uD80E-\uD810\uD812-\uD819\uD824-\uD82B\uD82D\uD82E\uD830-\uD833\uD837\uD839\uD83D\uD83F\uD87B-\uD87D\uD87F\uD885-\uDB3F\uDB41-\uDBFF][\uDC00-\uDFFF]|\uD80D[\uDC2F-\uDFFF]|\uD811[\uDE47-\uDFFF]|\uD81A[\uDE39-\uDE3F\uDE5F\uDE6A-\uDECF\uDEEE\uDEEF\uDEF5-\uDEFF\uDF37-\uDF3F\uDF44-\uDF4F\uDF5A-\uDF62\uDF78-\uDF7C\uDF90-\uDFFF]|\uD81B[\uDC00-\uDE3F\uDE80-\uDEFF\uDF4B-\uDF4E\uDF88-\uDF8E\uDFA0-\uDFDF\uDFE2\uDFE5-\uDFEF\uDFF2-\uDFFF]|\uD821[\uDFF8-\uDFFF]|\uD823[\uDCD6-\uDCFF\uDD09-\uDFFF]|\uD82C[\uDD1F-\uDD4F\uDD53-\uDD63\uDD68-\uDD6F\uDEFC-\uDFFF]|\uD82F[\uDC6B-\uDC6F\uDC7D-\uDC7F\uDC89-\uDC8F\uDC9A-\uDC9C\uDC9F-\uDFFF]|\uD834[\uDC00-\uDD64\uDD6A-\uDD6C\uDD73-\uDD7A\uDD83\uDD84\uDD8C-\uDDA9\uDDAE-\uDE41\uDE45-\uDFFF]|\uD835[\uDC55\uDC9D\uDCA0\uDCA1\uDCA3\uDCA4\uDCA7\uDCA8\uDCAD\uDCBA\uDCBC\uDCC4\uDD06\uDD0B\uDD0C\uDD15\uDD1D\uDD3A\uDD3F\uDD45\uDD47-\uDD49\uDD51\uDEA6\uDEA7\uDEC1\uDEDB\uDEFB\uDF15\uDF35\uDF4F\uDF6F\uDF89\uDFA9\uDFC3\uDFCC\uDFCD]|\uD836[\uDC00-\uDDFF\uDE37-\uDE3A\uDE6D-\uDE74\uDE76-\uDE83\uDE85-\uDE9A\uDEA0\uDEB0-\uDFFF]|\uD838[\uDC07\uDC19\uDC1A\uDC22\uDC25\uDC2B-\uDCFF\uDD2D-\uDD2F\uDD3E\uDD3F\uDD4A-\uDD4D\uDD4F-\uDEBF\uDEFA-\uDFFF]|\uD83A[\uDCC5-\uDCCF\uDCD7-\uDCFF\uDD4C-\uDD4F\uDD5A-\uDFFF]|\uD83B[\uDC00-\uDDFF\uDE04\uDE20\uDE23\uDE25\uDE26\uDE28\uDE33\uDE38\uDE3A\uDE3C-\uDE41\uDE43-\uDE46\uDE48\uDE4A\uDE4C\uDE50\uDE53\uDE55\uDE56\uDE58\uDE5A\uDE5C\uDE5E\uDE60\uDE63\uDE65\uDE66\uDE6B\uDE73\uDE78\uDE7D\uDE7F\uDE8A\uDE9C-\uDEA0\uDEA4\uDEAA\uDEBC-\uDFFF]|\uD83C[\uDC00-\uDD2F\uDD4A-\uDD4F\uDD6A-\uDD6F\uDD8A-\uDFFF]|\uD83E[\uDC00-\uDFEF\uDFFA-\uDFFF]|\uD869[\uDEDE-\uDEFF]|\uD86D[\uDF35-\uDF3F]|\uD86E[\uDC1E\uDC1F]|\uD873[\uDEA2-\uDEAF]|\uD87A[\uDFE1-\uDFFF]|\uD87E[\uDE1E-\uDFFF]|\uD884[\uDF4B-\uDFFF]|\uDB40[\uDC00-\uDCFF\uDDF0-\uDFFF]/g;

// ../../node_modules/github-slugger/index.js
var own = Object.hasOwnProperty, BananaSlug = class {
  /**
   * Create a new slug class.
   */
  constructor() {
    this.occurrences, this.reset();
  }
  /**
   * Generate a unique slug.
  *
  * Tracks previously generated slugs: repeated calls with the same value
  * will result in different slugs.
  * Use the `slug` function to get same slugs.
   *
   * @param  {string} value
   *   String of text to slugify
   * @param  {boolean} [maintainCase=false]
   *   Keep the current case, otherwise make all lowercase
   * @return {string}
   *   A unique slug string
   */
  slug(value2, maintainCase) {
    let self2 = this, result = slug(value2, maintainCase === !0), originalSlug = result;
    for (; own.call(self2.occurrences, result); )
      self2.occurrences[originalSlug]++, result = originalSlug + "-" + self2.occurrences[originalSlug];
    return self2.occurrences[result] = 0, result;
  }
  /**
   * Reset - Forget all previous slugs
   *
   * @return void
   */
  reset() {
    this.occurrences = /* @__PURE__ */ Object.create(null);
  }
};
function slug(value2, maintainCase) {
  return typeof value2 != "string" ? "" : (maintainCase || (value2 = value2.toLowerCase()), value2.replace(regex, "").replace(/ /g, "-"));
}

// src/blocks/blocks/Heading.tsx
var slugs = new BananaSlug(), Heading2 = ({
  children,
  disableAnchor,
  ...props
}) => {
  if (disableAnchor || typeof children != "string")
    return React45.createElement(H2, null, children);
  let tagID = slugs.slug(children.toLowerCase());
  return React45.createElement(HeaderMdx, { as: "h2", id: tagID, ...props }, children);
};

// src/blocks/blocks/Subheading.tsx
var Subheading = ({ children, disableAnchor }) => {
  if (disableAnchor || typeof children != "string")
    return React46.createElement(H3, null, children);
  let tagID = slugs.slug(children.toLowerCase());
  return React46.createElement(HeaderMdx, { as: "h3", id: tagID }, children);
};

// src/blocks/blocks/DocsStory.tsx
var DocsStory = ({
  of,
  expanded = !0,
  withToolbar: withToolbarProp = !1,
  __forceInitialArgs = !1,
  __primary = !1
}) => {
  let { story } = useOf(of || "story", ["story"]), withToolbar = story.parameters.docs?.canvas?.withToolbar ?? withToolbarProp;
  return React47.createElement(Anchor, { storyId: story.id }, expanded && React47.createElement(React47.Fragment, null, React47.createElement(Subheading, null, story.name), React47.createElement(DescriptionContainer, { of })), React47.createElement(
    Canvas,
    {
      of,
      withToolbar,
      story: { __forceInitialArgs, __primary },
      source: { __forceInitialArgs }
    }
  ));
};

// src/blocks/blocks/Primary.tsx
var Primary = (props) => {
  let { of } = props;
  if ("of" in props && of === void 0)
    throw new Error("Unexpected `of={undefined}`, did you mistype a CSF file reference?");
  let { csfFile } = useOf(of || "meta", ["meta"]), primaryStory = useContext8(DocsContext).componentStoriesFromCSFFile(csfFile)[0];
  return primaryStory ? React48.createElement(DocsStory, { of: primaryStory.moduleExport, expanded: !1, __primary: !0, withToolbar: !0 }) : null;
};

// src/blocks/blocks/Stories.tsx
import React49, { useContext as useContext9 } from "react";
import { styled as styled29 } from "storybook/theming";
var StyledHeading = styled29(Heading2)(({ theme }) => ({
  fontSize: `${theme.typography.size.s2 - 1}px`,
  fontWeight: theme.typography.weight.bold,
  lineHeight: "16px",
  letterSpacing: "0.35em",
  textTransform: "uppercase",
  color: theme.textMutedColor,
  border: 0,
  marginBottom: "12px",
  "&:first-of-type": {
    // specificity issue
    marginTop: "56px"
  }
})), Stories = ({ title = "Stories", includePrimary = !0 }) => {
  let { componentStories, projectAnnotations, getStoryContext } = useContext9(DocsContext), stories = componentStories(), { stories: { filter } = { filter: void 0 } } = projectAnnotations.parameters?.docs || {};
  return filter && (stories = stories.filter((story) => filter(story, getStoryContext(story)))), stories.some((story) => story.tags?.includes("autodocs")) && (stories = stories.filter((story) => story.tags?.includes("autodocs") && !story.usesMount)), includePrimary || (stories = stories.slice(1)), !stories || stories.length === 0 ? null : React49.createElement(React49.Fragment, null, typeof title == "string" ? React49.createElement(StyledHeading, null, title) : title, stories.map(
    (story) => story && React49.createElement(DocsStory, { key: story.id, of: story.moduleExport, expanded: !0, __forceInitialArgs: !0 })
  ));
};

// src/blocks/blocks/Subtitle.tsx
import React50 from "react";
import { deprecate } from "storybook/internal/client-logger";
var DEPRECATION_MIGRATION_LINK = "https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#subtitle-block-and-parameterscomponentsubtitle", Subtitle2 = (props) => {
  let { of, children } = props;
  if ("of" in props && of === void 0)
    throw new Error("Unexpected `of={undefined}`, did you mistype a CSF file reference?");
  let preparedMeta;
  try {
    preparedMeta = useOf(of || "meta", ["meta"]).preparedMeta;
  } catch (error) {
    if (children && !error.message.includes("did you forget to use <Meta of={} />?"))
      throw error;
  }
  let { componentSubtitle, docs } = preparedMeta?.parameters || {};
  componentSubtitle && deprecate(
    `Using 'parameters.componentSubtitle' property to subtitle stories is deprecated. See ${DEPRECATION_MIGRATION_LINK}`
  );
  let content = children || docs?.subtitle || componentSubtitle;
  return content ? React50.createElement(Subtitle, { className: "sbdocs-subtitle sb-unstyled" }, content) : null;
};

// src/blocks/blocks/Title.tsx
import React51 from "react";
var STORY_KIND_PATH_SEPARATOR = /\s*\/\s*/, extractTitle = (title) => {
  let groups = title.trim().split(STORY_KIND_PATH_SEPARATOR);
  return groups?.[groups?.length - 1] || title;
}, Title3 = (props) => {
  let { children, of } = props;
  if ("of" in props && of === void 0)
    throw new Error("Unexpected `of={undefined}`, did you mistype a CSF file reference?");
  let preparedMeta;
  try {
    preparedMeta = useOf(of || "meta", ["meta"]).preparedMeta;
  } catch (error) {
    if (children && error instanceof Error && !error.message.includes("did you forget to use <Meta of={} />?"))
      throw error;
  }
  let content = children || extractTitle(preparedMeta?.title || "");
  return content ? React51.createElement(Title, { className: "sbdocs-title sb-unstyled" }, content) : null;
};

// src/blocks/blocks/DocsPage.tsx
var DocsPage = () => {
  let resolvedOf = useOf("meta", ["meta"]), { stories } = resolvedOf.csfFile, isSingleStory = Object.keys(stories).length === 1;
  return React52.createElement(React52.Fragment, null, React52.createElement(Title3, null), React52.createElement(Subtitle2, null), React52.createElement(DescriptionContainer, { of: "meta" }), isSingleStory ? React52.createElement(DescriptionContainer, { of: "story" }) : null, React52.createElement(Primary, null), React52.createElement(Controls3, null), isSingleStory ? null : React52.createElement(Stories, null));
};

// src/blocks/blocks/Docs.tsx
function Docs({
  context,
  docsParameter
}) {
  let Container2 = docsParameter.container || DocsContainer, Page = docsParameter.page || DocsPage;
  return React53.createElement(Container2, { context, theme: docsParameter.theme }, React53.createElement(Page, null));
}

// src/blocks/blocks/external/ExternalDocs.tsx
import React54, { useRef as useRef6 } from "react";
import { composeConfigs as composeConfigs2 } from "storybook/preview-api";

// src/blocks/blocks/external/ExternalPreview.ts
import { Channel } from "storybook/internal/channels";
import { Preview as Preview2, composeConfigs } from "storybook/preview-api";

// src/blocks/blocks/external/ExternalDocsContext.ts
import { DocsContext as DocsContext2 } from "storybook/preview-api";
var ExternalDocsContext = class extends DocsContext2 {
  constructor(channel, store, renderStoryToElement, processMetaExports) {
    super(
      channel,
      store,
      renderStoryToElement,
      []
    );
    this.channel = channel;
    this.store = store;
    this.renderStoryToElement = renderStoryToElement;
    this.processMetaExports = processMetaExports;
    this.referenceMeta = (metaExports, attach) => {
      let csfFile = this.processMetaExports(metaExports);
      this.referenceCSFFile(csfFile), super.referenceMeta(metaExports, attach);
    };
  }
};

// src/blocks/blocks/external/ExternalPreview.ts
var ConstantMap = class {
  constructor(prefix) {
    this.prefix = prefix;
    this.entries = /* @__PURE__ */ new Map();
  }
  get(key) {
    return this.entries.has(key) || this.entries.set(key, `${this.prefix}${this.entries.size}`), this.entries.get(key);
  }
}, ExternalPreview = class extends Preview2 {
  constructor(projectAnnotations) {
    super((path) => Promise.resolve(this.moduleExportsByImportPath[path]), () => composeConfigs([
      { parameters: { docs: { story: { inline: !0 } } } },
      this.projectAnnotations
    ]), new Channel({}));
    this.projectAnnotations = projectAnnotations;
    this.importPaths = new ConstantMap("./importPath/");
    this.titles = new ConstantMap("title-");
    this.storyIndex = { v: 5, entries: {} };
    this.moduleExportsByImportPath = {};
    this.processMetaExports = (metaExports) => {
      let importPath = this.importPaths.get(metaExports);
      this.moduleExportsByImportPath[importPath] = metaExports;
      let title = metaExports.default.title || this.titles.get(metaExports), csfFile = this.storyStoreValue.processCSFFileWithCache(
        metaExports,
        importPath,
        title
      );
      return Object.values(csfFile.stories).forEach(({ id, name }) => {
        this.storyIndex.entries[id] = {
          id,
          importPath,
          title,
          name,
          type: "story",
          subtype: "story"
        };
      }), this.onStoriesChanged({ storyIndex: this.storyIndex }), csfFile;
    };
    this.docsContext = () => new ExternalDocsContext(
      this.channel,
      this.storyStoreValue,
      this.renderStoryToElement.bind(this),
      this.processMetaExports.bind(this)
    );
  }
  async getStoryIndexFromServer() {
    return this.storyIndex;
  }
};

// src/blocks/blocks/external/ExternalDocs.tsx
function usePreview(projectAnnotations) {
  let previewRef = useRef6();
  return previewRef.current || (previewRef.current = new ExternalPreview(projectAnnotations)), previewRef.current;
}
function ExternalDocs({
  projectAnnotationsList,
  children
}) {
  let projectAnnotations = composeConfigs2(projectAnnotationsList), preview2 = usePreview(projectAnnotations), docsParameter = {
    ...projectAnnotations.parameters?.docs,
    page: () => children
  };
  return React54.createElement(Docs, { docsParameter, context: preview2.docsContext() });
}

// src/blocks/blocks/external/ExternalDocsContainer.tsx
import React55 from "react";
import { ThemeProvider as ThemeProvider2, ensure, themes } from "storybook/theming";
var preview, ExternalDocsContainer = ({ projectAnnotations, children }) => (preview || (preview = new ExternalPreview(projectAnnotations)), React55.createElement(DocsContext.Provider, { value: preview.docsContext() }, React55.createElement(ThemeProvider2, { theme: ensure(themes.light) }, children)));

// src/blocks/blocks/Meta.tsx
import React56, { useContext as useContext10 } from "react";
var Meta = ({ of }) => {
  let context = useContext10(DocsContext);
  of && context.referenceMeta(of, !0);
  try {
    let primary = context.storyById();
    return React56.createElement(Anchor, { storyId: primary.id });
  } catch {
    return null;
  }
};

// src/blocks/blocks/Unstyled.tsx
import React57 from "react";
var Unstyled = (props) => React57.createElement("div", { ...props, className: "sb-unstyled" });

// src/blocks/blocks/Wrapper.tsx
import React58 from "react";
var Wrapper9 = ({ children }) => React58.createElement("div", { style: { fontFamily: "sans-serif" } }, children);

// src/blocks/blocks/types.ts
var PRIMARY_STORY = "^";
export {
  AddContext,
  Anchor,
  AnchorMdx,
  ArgTypes,
  BooleanControl,
  Canvas,
  CodeOrSourceMdx,
  ColorControl,
  ColorItem,
  ColorPalette,
  Controls3 as Controls,
  DateControl,
  DescriptionContainer as Description,
  DescriptionType,
  Docs,
  DocsContainer,
  DocsContext,
  DocsPage,
  DocsStory,
  ExternalDocs,
  ExternalDocsContainer,
  FilesControl,
  HeaderMdx,
  HeadersMdx,
  Heading2 as Heading,
  IconGallery,
  IconItem,
  Markdown,
  Meta,
  NumberControl,
  ObjectControl,
  OptionsControl,
  PRIMARY_STORY,
  Primary,
  ArgsTable as PureArgsTable,
  RangeControl,
  Source2 as Source,
  SourceContainer,
  SourceContext,
  Stories,
  Story2 as Story,
  Subheading,
  Subtitle2 as Subtitle,
  TableOfContents,
  TextControl,
  Title3 as Title,
  Typeset,
  UNKNOWN_ARGS_HASH,
  Unstyled,
  Wrapper9 as Wrapper,
  anchorBlockIdFromId,
  argsHash,
  assertIsFn,
  extractTitle,
  format,
  formatDate,
  formatTime,
  getStoryId,
  getStoryProps,
  parse2 as parse,
  parseDate,
  parseTime,
  slugs,
  useOf,
  useSourceProps
};

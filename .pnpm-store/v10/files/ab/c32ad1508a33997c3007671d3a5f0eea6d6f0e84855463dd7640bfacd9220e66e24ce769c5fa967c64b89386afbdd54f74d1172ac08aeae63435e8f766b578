import { createRequire as __prettierCreateRequire } from "module";
import { fileURLToPath as __prettierFileUrlToPath } from "url";
import { dirname as __prettierDirname } from "path";
const require = __prettierCreateRequire(import.meta.url);
const __filename = __prettierFileUrlToPath(import.meta.url);
const __dirname = __prettierDirname(__filename);

var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __typeError = (msg) => {
  throw TypeError(msg);
};
var __defNormalProp = (obj, key2, value) => key2 in obj ? __defProp(obj, key2, { enumerable: true, configurable: true, writable: true, value }) : obj[key2] = value;
var __require = /* @__PURE__ */ ((x) => typeof require !== "undefined" ? require : typeof Proxy !== "undefined" ? new Proxy(x, {
  get: (a, b) => (typeof require !== "undefined" ? require : a)[b]
}) : x)(function(x) {
  if (typeof require !== "undefined") return require.apply(this, arguments);
  throw Error('Dynamic require of "' + x + '" is not supported');
});
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __commonJS = (cb, mod) => function __require2() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key2 of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key2) && key2 !== except)
        __defProp(to, key2, { get: () => from[key2], enumerable: !(desc = __getOwnPropDesc(from, key2)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __publicField = (obj, key2, value) => __defNormalProp(obj, typeof key2 !== "symbol" ? key2 + "" : key2, value);
var __accessCheck = (obj, member, msg) => member.has(obj) || __typeError("Cannot " + msg);
var __privateGet = (obj, member, getter) => (__accessCheck(obj, member, "read from private field"), getter ? getter.call(obj) : member.get(obj));
var __privateAdd = (obj, member, value) => member.has(obj) ? __typeError("Cannot add the same private member more than once") : member instanceof WeakSet ? member.add(obj) : member.set(obj, value);
var __privateSet = (obj, member, value, setter) => (__accessCheck(obj, member, "write to private field"), setter ? setter.call(obj, value) : member.set(obj, value), value);
var __privateMethod = (obj, member, method) => (__accessCheck(obj, member, "access private method"), method);

// node_modules/fast-glob/out/utils/array.js
var require_array = __commonJS({
  "node_modules/fast-glob/out/utils/array.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.splitWhen = exports.flatten = void 0;
    function flatten(items) {
      return items.reduce((collection, item) => [].concat(collection, item), []);
    }
    exports.flatten = flatten;
    function splitWhen(items, predicate) {
      const result = [[]];
      let groupIndex = 0;
      for (const item of items) {
        if (predicate(item)) {
          groupIndex++;
          result[groupIndex] = [];
        } else {
          result[groupIndex].push(item);
        }
      }
      return result;
    }
    exports.splitWhen = splitWhen;
  }
});

// node_modules/fast-glob/out/utils/errno.js
var require_errno = __commonJS({
  "node_modules/fast-glob/out/utils/errno.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isEnoentCodeError = void 0;
    function isEnoentCodeError(error) {
      return error.code === "ENOENT";
    }
    exports.isEnoentCodeError = isEnoentCodeError;
  }
});

// node_modules/fast-glob/out/utils/fs.js
var require_fs = __commonJS({
  "node_modules/fast-glob/out/utils/fs.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createDirentFromStats = void 0;
    var DirentFromStats = class {
      constructor(name, stats) {
        this.name = name;
        this.isBlockDevice = stats.isBlockDevice.bind(stats);
        this.isCharacterDevice = stats.isCharacterDevice.bind(stats);
        this.isDirectory = stats.isDirectory.bind(stats);
        this.isFIFO = stats.isFIFO.bind(stats);
        this.isFile = stats.isFile.bind(stats);
        this.isSocket = stats.isSocket.bind(stats);
        this.isSymbolicLink = stats.isSymbolicLink.bind(stats);
      }
    };
    function createDirentFromStats(name, stats) {
      return new DirentFromStats(name, stats);
    }
    exports.createDirentFromStats = createDirentFromStats;
  }
});

// node_modules/fast-glob/out/utils/path.js
var require_path = __commonJS({
  "node_modules/fast-glob/out/utils/path.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.convertPosixPathToPattern = exports.convertWindowsPathToPattern = exports.convertPathToPattern = exports.escapePosixPath = exports.escapeWindowsPath = exports.escape = exports.removeLeadingDotSegment = exports.makeAbsolute = exports.unixify = void 0;
    var os2 = __require("os");
    var path13 = __require("path");
    var IS_WINDOWS_PLATFORM = os2.platform() === "win32";
    var LEADING_DOT_SEGMENT_CHARACTERS_COUNT = 2;
    var POSIX_UNESCAPED_GLOB_SYMBOLS_RE = /(\\?)([()*?[\]{|}]|^!|[!+@](?=\()|\\(?![!()*+?@[\]{|}]))/g;
    var WINDOWS_UNESCAPED_GLOB_SYMBOLS_RE = /(\\?)([()[\]{}]|^!|[!+@](?=\())/g;
    var DOS_DEVICE_PATH_RE = /^\\\\([.?])/;
    var WINDOWS_BACKSLASHES_RE = /\\(?![!()+@[\]{}])/g;
    function unixify(filepath) {
      return filepath.replace(/\\/g, "/");
    }
    exports.unixify = unixify;
    function makeAbsolute(cwd, filepath) {
      return path13.resolve(cwd, filepath);
    }
    exports.makeAbsolute = makeAbsolute;
    function removeLeadingDotSegment(entry) {
      if (entry.charAt(0) === ".") {
        const secondCharactery = entry.charAt(1);
        if (secondCharactery === "/" || secondCharactery === "\\") {
          return entry.slice(LEADING_DOT_SEGMENT_CHARACTERS_COUNT);
        }
      }
      return entry;
    }
    exports.removeLeadingDotSegment = removeLeadingDotSegment;
    exports.escape = IS_WINDOWS_PLATFORM ? escapeWindowsPath : escapePosixPath;
    function escapeWindowsPath(pattern) {
      return pattern.replace(WINDOWS_UNESCAPED_GLOB_SYMBOLS_RE, "\\$2");
    }
    exports.escapeWindowsPath = escapeWindowsPath;
    function escapePosixPath(pattern) {
      return pattern.replace(POSIX_UNESCAPED_GLOB_SYMBOLS_RE, "\\$2");
    }
    exports.escapePosixPath = escapePosixPath;
    exports.convertPathToPattern = IS_WINDOWS_PLATFORM ? convertWindowsPathToPattern : convertPosixPathToPattern;
    function convertWindowsPathToPattern(filepath) {
      return escapeWindowsPath(filepath).replace(DOS_DEVICE_PATH_RE, "//$1").replace(WINDOWS_BACKSLASHES_RE, "/");
    }
    exports.convertWindowsPathToPattern = convertWindowsPathToPattern;
    function convertPosixPathToPattern(filepath) {
      return escapePosixPath(filepath);
    }
    exports.convertPosixPathToPattern = convertPosixPathToPattern;
  }
});

// node_modules/is-extglob/index.js
var require_is_extglob = __commonJS({
  "node_modules/is-extglob/index.js"(exports, module) {
    module.exports = function isExtglob(str2) {
      if (typeof str2 !== "string" || str2 === "") {
        return false;
      }
      var match;
      while (match = /(\\).|([@?!+*]\(.*\))/g.exec(str2)) {
        if (match[2]) return true;
        str2 = str2.slice(match.index + match[0].length);
      }
      return false;
    };
  }
});

// node_modules/is-glob/index.js
var require_is_glob = __commonJS({
  "node_modules/is-glob/index.js"(exports, module) {
    var isExtglob = require_is_extglob();
    var chars = { "{": "}", "(": ")", "[": "]" };
    var strictCheck = function(str2) {
      if (str2[0] === "!") {
        return true;
      }
      var index = 0;
      var pipeIndex = -2;
      var closeSquareIndex = -2;
      var closeCurlyIndex = -2;
      var closeParenIndex = -2;
      var backSlashIndex = -2;
      while (index < str2.length) {
        if (str2[index] === "*") {
          return true;
        }
        if (str2[index + 1] === "?" && /[\].+)]/.test(str2[index])) {
          return true;
        }
        if (closeSquareIndex !== -1 && str2[index] === "[" && str2[index + 1] !== "]") {
          if (closeSquareIndex < index) {
            closeSquareIndex = str2.indexOf("]", index);
          }
          if (closeSquareIndex > index) {
            if (backSlashIndex === -1 || backSlashIndex > closeSquareIndex) {
              return true;
            }
            backSlashIndex = str2.indexOf("\\", index);
            if (backSlashIndex === -1 || backSlashIndex > closeSquareIndex) {
              return true;
            }
          }
        }
        if (closeCurlyIndex !== -1 && str2[index] === "{" && str2[index + 1] !== "}") {
          closeCurlyIndex = str2.indexOf("}", index);
          if (closeCurlyIndex > index) {
            backSlashIndex = str2.indexOf("\\", index);
            if (backSlashIndex === -1 || backSlashIndex > closeCurlyIndex) {
              return true;
            }
          }
        }
        if (closeParenIndex !== -1 && str2[index] === "(" && str2[index + 1] === "?" && /[:!=]/.test(str2[index + 2]) && str2[index + 3] !== ")") {
          closeParenIndex = str2.indexOf(")", index);
          if (closeParenIndex > index) {
            backSlashIndex = str2.indexOf("\\", index);
            if (backSlashIndex === -1 || backSlashIndex > closeParenIndex) {
              return true;
            }
          }
        }
        if (pipeIndex !== -1 && str2[index] === "(" && str2[index + 1] !== "|") {
          if (pipeIndex < index) {
            pipeIndex = str2.indexOf("|", index);
          }
          if (pipeIndex !== -1 && str2[pipeIndex + 1] !== ")") {
            closeParenIndex = str2.indexOf(")", pipeIndex);
            if (closeParenIndex > pipeIndex) {
              backSlashIndex = str2.indexOf("\\", pipeIndex);
              if (backSlashIndex === -1 || backSlashIndex > closeParenIndex) {
                return true;
              }
            }
          }
        }
        if (str2[index] === "\\") {
          var open = str2[index + 1];
          index += 2;
          var close = chars[open];
          if (close) {
            var n = str2.indexOf(close, index);
            if (n !== -1) {
              index = n + 1;
            }
          }
          if (str2[index] === "!") {
            return true;
          }
        } else {
          index++;
        }
      }
      return false;
    };
    var relaxedCheck = function(str2) {
      if (str2[0] === "!") {
        return true;
      }
      var index = 0;
      while (index < str2.length) {
        if (/[*?{}()[\]]/.test(str2[index])) {
          return true;
        }
        if (str2[index] === "\\") {
          var open = str2[index + 1];
          index += 2;
          var close = chars[open];
          if (close) {
            var n = str2.indexOf(close, index);
            if (n !== -1) {
              index = n + 1;
            }
          }
          if (str2[index] === "!") {
            return true;
          }
        } else {
          index++;
        }
      }
      return false;
    };
    module.exports = function isGlob(str2, options8) {
      if (typeof str2 !== "string" || str2 === "") {
        return false;
      }
      if (isExtglob(str2)) {
        return true;
      }
      var check2 = strictCheck;
      if (options8 && options8.strict === false) {
        check2 = relaxedCheck;
      }
      return check2(str2);
    };
  }
});

// node_modules/glob-parent/index.js
var require_glob_parent = __commonJS({
  "node_modules/glob-parent/index.js"(exports, module) {
    "use strict";
    var isGlob = require_is_glob();
    var pathPosixDirname = __require("path").posix.dirname;
    var isWin32 = __require("os").platform() === "win32";
    var slash2 = "/";
    var backslash = /\\/g;
    var enclosure = /[\{\[].*[\}\]]$/;
    var globby = /(^|[^\\])([\{\[]|\([^\)]+$)/;
    var escaped = /\\([\!\*\?\|\[\]\(\)\{\}])/g;
    module.exports = function globParent(str2, opts) {
      var options8 = Object.assign({ flipBackslashes: true }, opts);
      if (options8.flipBackslashes && isWin32 && str2.indexOf(slash2) < 0) {
        str2 = str2.replace(backslash, slash2);
      }
      if (enclosure.test(str2)) {
        str2 += slash2;
      }
      str2 += "a";
      do {
        str2 = pathPosixDirname(str2);
      } while (isGlob(str2) || globby.test(str2));
      return str2.replace(escaped, "$1");
    };
  }
});

// node_modules/braces/lib/utils.js
var require_utils = __commonJS({
  "node_modules/braces/lib/utils.js"(exports) {
    "use strict";
    exports.isInteger = (num) => {
      if (typeof num === "number") {
        return Number.isInteger(num);
      }
      if (typeof num === "string" && num.trim() !== "") {
        return Number.isInteger(Number(num));
      }
      return false;
    };
    exports.find = (node, type2) => node.nodes.find((node2) => node2.type === type2);
    exports.exceedsLimit = (min, max, step = 1, limit) => {
      if (limit === false) return false;
      if (!exports.isInteger(min) || !exports.isInteger(max)) return false;
      return (Number(max) - Number(min)) / Number(step) >= limit;
    };
    exports.escapeNode = (block, n = 0, type2) => {
      const node = block.nodes[n];
      if (!node) return;
      if (type2 && node.type === type2 || node.type === "open" || node.type === "close") {
        if (node.escaped !== true) {
          node.value = "\\" + node.value;
          node.escaped = true;
        }
      }
    };
    exports.encloseBrace = (node) => {
      if (node.type !== "brace") return false;
      if (node.commas >> 0 + node.ranges >> 0 === 0) {
        node.invalid = true;
        return true;
      }
      return false;
    };
    exports.isInvalidBrace = (block) => {
      if (block.type !== "brace") return false;
      if (block.invalid === true || block.dollar) return true;
      if (block.commas >> 0 + block.ranges >> 0 === 0) {
        block.invalid = true;
        return true;
      }
      if (block.open !== true || block.close !== true) {
        block.invalid = true;
        return true;
      }
      return false;
    };
    exports.isOpenOrClose = (node) => {
      if (node.type === "open" || node.type === "close") {
        return true;
      }
      return node.open === true || node.close === true;
    };
    exports.reduce = (nodes) => nodes.reduce((acc, node) => {
      if (node.type === "text") acc.push(node.value);
      if (node.type === "range") node.type = "text";
      return acc;
    }, []);
    exports.flatten = (...args) => {
      const result = [];
      const flat = (arr) => {
        for (let i = 0; i < arr.length; i++) {
          const ele = arr[i];
          if (Array.isArray(ele)) {
            flat(ele);
            continue;
          }
          if (ele !== void 0) {
            result.push(ele);
          }
        }
        return result;
      };
      flat(args);
      return result;
    };
  }
});

// node_modules/braces/lib/stringify.js
var require_stringify = __commonJS({
  "node_modules/braces/lib/stringify.js"(exports, module) {
    "use strict";
    var utils = require_utils();
    module.exports = (ast, options8 = {}) => {
      const stringify = (node, parent = {}) => {
        const invalidBlock = options8.escapeInvalid && utils.isInvalidBrace(parent);
        const invalidNode = node.invalid === true && options8.escapeInvalid === true;
        let output = "";
        if (node.value) {
          if ((invalidBlock || invalidNode) && utils.isOpenOrClose(node)) {
            return "\\" + node.value;
          }
          return node.value;
        }
        if (node.value) {
          return node.value;
        }
        if (node.nodes) {
          for (const child of node.nodes) {
            output += stringify(child);
          }
        }
        return output;
      };
      return stringify(ast);
    };
  }
});

// node_modules/is-number/index.js
var require_is_number = __commonJS({
  "node_modules/is-number/index.js"(exports, module) {
    "use strict";
    module.exports = function(num) {
      if (typeof num === "number") {
        return num - num === 0;
      }
      if (typeof num === "string" && num.trim() !== "") {
        return Number.isFinite ? Number.isFinite(+num) : isFinite(+num);
      }
      return false;
    };
  }
});

// node_modules/to-regex-range/index.js
var require_to_regex_range = __commonJS({
  "node_modules/to-regex-range/index.js"(exports, module) {
    "use strict";
    var isNumber = require_is_number();
    var toRegexRange = (min, max, options8) => {
      if (isNumber(min) === false) {
        throw new TypeError("toRegexRange: expected the first argument to be a number");
      }
      if (max === void 0 || min === max) {
        return String(min);
      }
      if (isNumber(max) === false) {
        throw new TypeError("toRegexRange: expected the second argument to be a number.");
      }
      let opts = { relaxZeros: true, ...options8 };
      if (typeof opts.strictZeros === "boolean") {
        opts.relaxZeros = opts.strictZeros === false;
      }
      let relax = String(opts.relaxZeros);
      let shorthand = String(opts.shorthand);
      let capture = String(opts.capture);
      let wrap = String(opts.wrap);
      let cacheKey = min + ":" + max + "=" + relax + shorthand + capture + wrap;
      if (toRegexRange.cache.hasOwnProperty(cacheKey)) {
        return toRegexRange.cache[cacheKey].result;
      }
      let a = Math.min(min, max);
      let b = Math.max(min, max);
      if (Math.abs(a - b) === 1) {
        let result = min + "|" + max;
        if (opts.capture) {
          return `(${result})`;
        }
        if (opts.wrap === false) {
          return result;
        }
        return `(?:${result})`;
      }
      let isPadded = hasPadding(min) || hasPadding(max);
      let state = { min, max, a, b };
      let positives = [];
      let negatives = [];
      if (isPadded) {
        state.isPadded = isPadded;
        state.maxLen = String(state.max).length;
      }
      if (a < 0) {
        let newMin = b < 0 ? Math.abs(b) : 1;
        negatives = splitToPatterns(newMin, Math.abs(a), state, opts);
        a = state.a = 0;
      }
      if (b >= 0) {
        positives = splitToPatterns(a, b, state, opts);
      }
      state.negatives = negatives;
      state.positives = positives;
      state.result = collatePatterns(negatives, positives, opts);
      if (opts.capture === true) {
        state.result = `(${state.result})`;
      } else if (opts.wrap !== false && positives.length + negatives.length > 1) {
        state.result = `(?:${state.result})`;
      }
      toRegexRange.cache[cacheKey] = state;
      return state.result;
    };
    function collatePatterns(neg, pos2, options8) {
      let onlyNegative = filterPatterns(neg, pos2, "-", false, options8) || [];
      let onlyPositive = filterPatterns(pos2, neg, "", false, options8) || [];
      let intersected = filterPatterns(neg, pos2, "-?", true, options8) || [];
      let subpatterns = onlyNegative.concat(intersected).concat(onlyPositive);
      return subpatterns.join("|");
    }
    function splitToRanges(min, max) {
      let nines = 1;
      let zeros = 1;
      let stop = countNines(min, nines);
      let stops = /* @__PURE__ */ new Set([max]);
      while (min <= stop && stop <= max) {
        stops.add(stop);
        nines += 1;
        stop = countNines(min, nines);
      }
      stop = countZeros(max + 1, zeros) - 1;
      while (min < stop && stop <= max) {
        stops.add(stop);
        zeros += 1;
        stop = countZeros(max + 1, zeros) - 1;
      }
      stops = [...stops];
      stops.sort(compare);
      return stops;
    }
    function rangeToPattern(start, stop, options8) {
      if (start === stop) {
        return { pattern: start, count: [], digits: 0 };
      }
      let zipped = zip(start, stop);
      let digits = zipped.length;
      let pattern = "";
      let count = 0;
      for (let i = 0; i < digits; i++) {
        let [startDigit, stopDigit] = zipped[i];
        if (startDigit === stopDigit) {
          pattern += startDigit;
        } else if (startDigit !== "0" || stopDigit !== "9") {
          pattern += toCharacterClass(startDigit, stopDigit, options8);
        } else {
          count++;
        }
      }
      if (count) {
        pattern += options8.shorthand === true ? "\\d" : "[0-9]";
      }
      return { pattern, count: [count], digits };
    }
    function splitToPatterns(min, max, tok, options8) {
      let ranges = splitToRanges(min, max);
      let tokens = [];
      let start = min;
      let prev;
      for (let i = 0; i < ranges.length; i++) {
        let max2 = ranges[i];
        let obj = rangeToPattern(String(start), String(max2), options8);
        let zeros = "";
        if (!tok.isPadded && prev && prev.pattern === obj.pattern) {
          if (prev.count.length > 1) {
            prev.count.pop();
          }
          prev.count.push(obj.count[0]);
          prev.string = prev.pattern + toQuantifier(prev.count);
          start = max2 + 1;
          continue;
        }
        if (tok.isPadded) {
          zeros = padZeros(max2, tok, options8);
        }
        obj.string = zeros + obj.pattern + toQuantifier(obj.count);
        tokens.push(obj);
        start = max2 + 1;
        prev = obj;
      }
      return tokens;
    }
    function filterPatterns(arr, comparison, prefix, intersection, options8) {
      let result = [];
      for (let ele of arr) {
        let { string } = ele;
        if (!intersection && !contains(comparison, "string", string)) {
          result.push(prefix + string);
        }
        if (intersection && contains(comparison, "string", string)) {
          result.push(prefix + string);
        }
      }
      return result;
    }
    function zip(a, b) {
      let arr = [];
      for (let i = 0; i < a.length; i++) arr.push([a[i], b[i]]);
      return arr;
    }
    function compare(a, b) {
      return a > b ? 1 : b > a ? -1 : 0;
    }
    function contains(arr, key2, val) {
      return arr.some((ele) => ele[key2] === val);
    }
    function countNines(min, len) {
      return Number(String(min).slice(0, -len) + "9".repeat(len));
    }
    function countZeros(integer, zeros) {
      return integer - integer % Math.pow(10, zeros);
    }
    function toQuantifier(digits) {
      let [start = 0, stop = ""] = digits;
      if (stop || start > 1) {
        return `{${start + (stop ? "," + stop : "")}}`;
      }
      return "";
    }
    function toCharacterClass(a, b, options8) {
      return `[${a}${b - a === 1 ? "" : "-"}${b}]`;
    }
    function hasPadding(str2) {
      return /^-?(0+)\d/.test(str2);
    }
    function padZeros(value, tok, options8) {
      if (!tok.isPadded) {
        return value;
      }
      let diff2 = Math.abs(tok.maxLen - String(value).length);
      let relax = options8.relaxZeros !== false;
      switch (diff2) {
        case 0:
          return "";
        case 1:
          return relax ? "0?" : "0";
        case 2:
          return relax ? "0{0,2}" : "00";
        default: {
          return relax ? `0{0,${diff2}}` : `0{${diff2}}`;
        }
      }
    }
    toRegexRange.cache = {};
    toRegexRange.clearCache = () => toRegexRange.cache = {};
    module.exports = toRegexRange;
  }
});

// node_modules/fill-range/index.js
var require_fill_range = __commonJS({
  "node_modules/fill-range/index.js"(exports, module) {
    "use strict";
    var util2 = __require("util");
    var toRegexRange = require_to_regex_range();
    var isObject3 = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
    var transform = (toNumber) => {
      return (value) => toNumber === true ? Number(value) : String(value);
    };
    var isValidValue = (value) => {
      return typeof value === "number" || typeof value === "string" && value !== "";
    };
    var isNumber = (num) => Number.isInteger(+num);
    var zeros = (input) => {
      let value = `${input}`;
      let index = -1;
      if (value[0] === "-") value = value.slice(1);
      if (value === "0") return false;
      while (value[++index] === "0") ;
      return index > 0;
    };
    var stringify = (start, end, options8) => {
      if (typeof start === "string" || typeof end === "string") {
        return true;
      }
      return options8.stringify === true;
    };
    var pad = (input, maxLength, toNumber) => {
      if (maxLength > 0) {
        let dash = input[0] === "-" ? "-" : "";
        if (dash) input = input.slice(1);
        input = dash + input.padStart(dash ? maxLength - 1 : maxLength, "0");
      }
      if (toNumber === false) {
        return String(input);
      }
      return input;
    };
    var toMaxLen = (input, maxLength) => {
      let negative = input[0] === "-" ? "-" : "";
      if (negative) {
        input = input.slice(1);
        maxLength--;
      }
      while (input.length < maxLength) input = "0" + input;
      return negative ? "-" + input : input;
    };
    var toSequence = (parts, options8, maxLen) => {
      parts.negatives.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
      parts.positives.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
      let prefix = options8.capture ? "" : "?:";
      let positives = "";
      let negatives = "";
      let result;
      if (parts.positives.length) {
        positives = parts.positives.map((v) => toMaxLen(String(v), maxLen)).join("|");
      }
      if (parts.negatives.length) {
        negatives = `-(${prefix}${parts.negatives.map((v) => toMaxLen(String(v), maxLen)).join("|")})`;
      }
      if (positives && negatives) {
        result = `${positives}|${negatives}`;
      } else {
        result = positives || negatives;
      }
      if (options8.wrap) {
        return `(${prefix}${result})`;
      }
      return result;
    };
    var toRange = (a, b, isNumbers, options8) => {
      if (isNumbers) {
        return toRegexRange(a, b, { wrap: false, ...options8 });
      }
      let start = String.fromCharCode(a);
      if (a === b) return start;
      let stop = String.fromCharCode(b);
      return `[${start}-${stop}]`;
    };
    var toRegex = (start, end, options8) => {
      if (Array.isArray(start)) {
        let wrap = options8.wrap === true;
        let prefix = options8.capture ? "" : "?:";
        return wrap ? `(${prefix}${start.join("|")})` : start.join("|");
      }
      return toRegexRange(start, end, options8);
    };
    var rangeError = (...args) => {
      return new RangeError("Invalid range arguments: " + util2.inspect(...args));
    };
    var invalidRange = (start, end, options8) => {
      if (options8.strictRanges === true) throw rangeError([start, end]);
      return [];
    };
    var invalidStep = (step, options8) => {
      if (options8.strictRanges === true) {
        throw new TypeError(`Expected step "${step}" to be a number`);
      }
      return [];
    };
    var fillNumbers = (start, end, step = 1, options8 = {}) => {
      let a = Number(start);
      let b = Number(end);
      if (!Number.isInteger(a) || !Number.isInteger(b)) {
        if (options8.strictRanges === true) throw rangeError([start, end]);
        return [];
      }
      if (a === 0) a = 0;
      if (b === 0) b = 0;
      let descending = a > b;
      let startString = String(start);
      let endString = String(end);
      let stepString = String(step);
      step = Math.max(Math.abs(step), 1);
      let padded = zeros(startString) || zeros(endString) || zeros(stepString);
      let maxLen = padded ? Math.max(startString.length, endString.length, stepString.length) : 0;
      let toNumber = padded === false && stringify(start, end, options8) === false;
      let format3 = options8.transform || transform(toNumber);
      if (options8.toRegex && step === 1) {
        return toRange(toMaxLen(start, maxLen), toMaxLen(end, maxLen), true, options8);
      }
      let parts = { negatives: [], positives: [] };
      let push2 = (num) => parts[num < 0 ? "negatives" : "positives"].push(Math.abs(num));
      let range = [];
      let index = 0;
      while (descending ? a >= b : a <= b) {
        if (options8.toRegex === true && step > 1) {
          push2(a);
        } else {
          range.push(pad(format3(a, index), maxLen, toNumber));
        }
        a = descending ? a - step : a + step;
        index++;
      }
      if (options8.toRegex === true) {
        return step > 1 ? toSequence(parts, options8, maxLen) : toRegex(range, null, { wrap: false, ...options8 });
      }
      return range;
    };
    var fillLetters = (start, end, step = 1, options8 = {}) => {
      if (!isNumber(start) && start.length > 1 || !isNumber(end) && end.length > 1) {
        return invalidRange(start, end, options8);
      }
      let format3 = options8.transform || ((val) => String.fromCharCode(val));
      let a = `${start}`.charCodeAt(0);
      let b = `${end}`.charCodeAt(0);
      let descending = a > b;
      let min = Math.min(a, b);
      let max = Math.max(a, b);
      if (options8.toRegex && step === 1) {
        return toRange(min, max, false, options8);
      }
      let range = [];
      let index = 0;
      while (descending ? a >= b : a <= b) {
        range.push(format3(a, index));
        a = descending ? a - step : a + step;
        index++;
      }
      if (options8.toRegex === true) {
        return toRegex(range, null, { wrap: false, options: options8 });
      }
      return range;
    };
    var fill2 = (start, end, step, options8 = {}) => {
      if (end == null && isValidValue(start)) {
        return [start];
      }
      if (!isValidValue(start) || !isValidValue(end)) {
        return invalidRange(start, end, options8);
      }
      if (typeof step === "function") {
        return fill2(start, end, 1, { transform: step });
      }
      if (isObject3(step)) {
        return fill2(start, end, 0, step);
      }
      let opts = { ...options8 };
      if (opts.capture === true) opts.wrap = true;
      step = step || opts.step || 1;
      if (!isNumber(step)) {
        if (step != null && !isObject3(step)) return invalidStep(step, opts);
        return fill2(start, end, 1, step);
      }
      if (isNumber(start) && isNumber(end)) {
        return fillNumbers(start, end, step, opts);
      }
      return fillLetters(start, end, Math.max(Math.abs(step), 1), opts);
    };
    module.exports = fill2;
  }
});

// node_modules/braces/lib/compile.js
var require_compile = __commonJS({
  "node_modules/braces/lib/compile.js"(exports, module) {
    "use strict";
    var fill2 = require_fill_range();
    var utils = require_utils();
    var compile = (ast, options8 = {}) => {
      const walk = (node, parent = {}) => {
        const invalidBlock = utils.isInvalidBrace(parent);
        const invalidNode = node.invalid === true && options8.escapeInvalid === true;
        const invalid = invalidBlock === true || invalidNode === true;
        const prefix = options8.escapeInvalid === true ? "\\" : "";
        let output = "";
        if (node.isOpen === true) {
          return prefix + node.value;
        }
        if (node.isClose === true) {
          console.log("node.isClose", prefix, node.value);
          return prefix + node.value;
        }
        if (node.type === "open") {
          return invalid ? prefix + node.value : "(";
        }
        if (node.type === "close") {
          return invalid ? prefix + node.value : ")";
        }
        if (node.type === "comma") {
          return node.prev.type === "comma" ? "" : invalid ? node.value : "|";
        }
        if (node.value) {
          return node.value;
        }
        if (node.nodes && node.ranges > 0) {
          const args = utils.reduce(node.nodes);
          const range = fill2(...args, { ...options8, wrap: false, toRegex: true, strictZeros: true });
          if (range.length !== 0) {
            return args.length > 1 && range.length > 1 ? `(${range})` : range;
          }
        }
        if (node.nodes) {
          for (const child of node.nodes) {
            output += walk(child, node);
          }
        }
        return output;
      };
      return walk(ast);
    };
    module.exports = compile;
  }
});

// node_modules/braces/lib/expand.js
var require_expand = __commonJS({
  "node_modules/braces/lib/expand.js"(exports, module) {
    "use strict";
    var fill2 = require_fill_range();
    var stringify = require_stringify();
    var utils = require_utils();
    var append = (queue = "", stash = "", enclose = false) => {
      const result = [];
      queue = [].concat(queue);
      stash = [].concat(stash);
      if (!stash.length) return queue;
      if (!queue.length) {
        return enclose ? utils.flatten(stash).map((ele) => `{${ele}}`) : stash;
      }
      for (const item of queue) {
        if (Array.isArray(item)) {
          for (const value of item) {
            result.push(append(value, stash, enclose));
          }
        } else {
          for (let ele of stash) {
            if (enclose === true && typeof ele === "string") ele = `{${ele}}`;
            result.push(Array.isArray(ele) ? append(item, ele, enclose) : item + ele);
          }
        }
      }
      return utils.flatten(result);
    };
    var expand = (ast, options8 = {}) => {
      const rangeLimit = options8.rangeLimit === void 0 ? 1e3 : options8.rangeLimit;
      const walk = (node, parent = {}) => {
        node.queue = [];
        let p = parent;
        let q = parent.queue;
        while (p.type !== "brace" && p.type !== "root" && p.parent) {
          p = p.parent;
          q = p.queue;
        }
        if (node.invalid || node.dollar) {
          q.push(append(q.pop(), stringify(node, options8)));
          return;
        }
        if (node.type === "brace" && node.invalid !== true && node.nodes.length === 2) {
          q.push(append(q.pop(), ["{}"]));
          return;
        }
        if (node.nodes && node.ranges > 0) {
          const args = utils.reduce(node.nodes);
          if (utils.exceedsLimit(...args, options8.step, rangeLimit)) {
            throw new RangeError("expanded array length exceeds range limit. Use options.rangeLimit to increase or disable the limit.");
          }
          let range = fill2(...args, options8);
          if (range.length === 0) {
            range = stringify(node, options8);
          }
          q.push(append(q.pop(), range));
          node.nodes = [];
          return;
        }
        const enclose = utils.encloseBrace(node);
        let queue = node.queue;
        let block = node;
        while (block.type !== "brace" && block.type !== "root" && block.parent) {
          block = block.parent;
          queue = block.queue;
        }
        for (let i = 0; i < node.nodes.length; i++) {
          const child = node.nodes[i];
          if (child.type === "comma" && node.type === "brace") {
            if (i === 1) queue.push("");
            queue.push("");
            continue;
          }
          if (child.type === "close") {
            q.push(append(q.pop(), queue, enclose));
            continue;
          }
          if (child.value && child.type !== "open") {
            queue.push(append(queue.pop(), child.value));
            continue;
          }
          if (child.nodes) {
            walk(child, node);
          }
        }
        return queue;
      };
      return utils.flatten(walk(ast));
    };
    module.exports = expand;
  }
});

// node_modules/braces/lib/constants.js
var require_constants = __commonJS({
  "node_modules/braces/lib/constants.js"(exports, module) {
    "use strict";
    module.exports = {
      MAX_LENGTH: 1e4,
      // Digits
      CHAR_0: "0",
      /* 0 */
      CHAR_9: "9",
      /* 9 */
      // Alphabet chars.
      CHAR_UPPERCASE_A: "A",
      /* A */
      CHAR_LOWERCASE_A: "a",
      /* a */
      CHAR_UPPERCASE_Z: "Z",
      /* Z */
      CHAR_LOWERCASE_Z: "z",
      /* z */
      CHAR_LEFT_PARENTHESES: "(",
      /* ( */
      CHAR_RIGHT_PARENTHESES: ")",
      /* ) */
      CHAR_ASTERISK: "*",
      /* * */
      // Non-alphabetic chars.
      CHAR_AMPERSAND: "&",
      /* & */
      CHAR_AT: "@",
      /* @ */
      CHAR_BACKSLASH: "\\",
      /* \ */
      CHAR_BACKTICK: "`",
      /* ` */
      CHAR_CARRIAGE_RETURN: "\r",
      /* \r */
      CHAR_CIRCUMFLEX_ACCENT: "^",
      /* ^ */
      CHAR_COLON: ":",
      /* : */
      CHAR_COMMA: ",",
      /* , */
      CHAR_DOLLAR: "$",
      /* . */
      CHAR_DOT: ".",
      /* . */
      CHAR_DOUBLE_QUOTE: '"',
      /* " */
      CHAR_EQUAL: "=",
      /* = */
      CHAR_EXCLAMATION_MARK: "!",
      /* ! */
      CHAR_FORM_FEED: "\f",
      /* \f */
      CHAR_FORWARD_SLASH: "/",
      /* / */
      CHAR_HASH: "#",
      /* # */
      CHAR_HYPHEN_MINUS: "-",
      /* - */
      CHAR_LEFT_ANGLE_BRACKET: "<",
      /* < */
      CHAR_LEFT_CURLY_BRACE: "{",
      /* { */
      CHAR_LEFT_SQUARE_BRACKET: "[",
      /* [ */
      CHAR_LINE_FEED: "\n",
      /* \n */
      CHAR_NO_BREAK_SPACE: "\xA0",
      /* \u00A0 */
      CHAR_PERCENT: "%",
      /* % */
      CHAR_PLUS: "+",
      /* + */
      CHAR_QUESTION_MARK: "?",
      /* ? */
      CHAR_RIGHT_ANGLE_BRACKET: ">",
      /* > */
      CHAR_RIGHT_CURLY_BRACE: "}",
      /* } */
      CHAR_RIGHT_SQUARE_BRACKET: "]",
      /* ] */
      CHAR_SEMICOLON: ";",
      /* ; */
      CHAR_SINGLE_QUOTE: "'",
      /* ' */
      CHAR_SPACE: " ",
      /*   */
      CHAR_TAB: "	",
      /* \t */
      CHAR_UNDERSCORE: "_",
      /* _ */
      CHAR_VERTICAL_LINE: "|",
      /* | */
      CHAR_ZERO_WIDTH_NOBREAK_SPACE: "\uFEFF"
      /* \uFEFF */
    };
  }
});

// node_modules/braces/lib/parse.js
var require_parse = __commonJS({
  "node_modules/braces/lib/parse.js"(exports, module) {
    "use strict";
    var stringify = require_stringify();
    var {
      MAX_LENGTH,
      CHAR_BACKSLASH,
      /* \ */
      CHAR_BACKTICK,
      /* ` */
      CHAR_COMMA,
      /* , */
      CHAR_DOT,
      /* . */
      CHAR_LEFT_PARENTHESES,
      /* ( */
      CHAR_RIGHT_PARENTHESES,
      /* ) */
      CHAR_LEFT_CURLY_BRACE,
      /* { */
      CHAR_RIGHT_CURLY_BRACE,
      /* } */
      CHAR_LEFT_SQUARE_BRACKET,
      /* [ */
      CHAR_RIGHT_SQUARE_BRACKET,
      /* ] */
      CHAR_DOUBLE_QUOTE,
      /* " */
      CHAR_SINGLE_QUOTE,
      /* ' */
      CHAR_NO_BREAK_SPACE,
      CHAR_ZERO_WIDTH_NOBREAK_SPACE
    } = require_constants();
    var parse6 = (input, options8 = {}) => {
      if (typeof input !== "string") {
        throw new TypeError("Expected a string");
      }
      const opts = options8 || {};
      const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
      if (input.length > max) {
        throw new SyntaxError(`Input length (${input.length}), exceeds max characters (${max})`);
      }
      const ast = { type: "root", input, nodes: [] };
      const stack2 = [ast];
      let block = ast;
      let prev = ast;
      let brackets = 0;
      const length = input.length;
      let index = 0;
      let depth = 0;
      let value;
      const advance = () => input[index++];
      const push2 = (node) => {
        if (node.type === "text" && prev.type === "dot") {
          prev.type = "text";
        }
        if (prev && prev.type === "text" && node.type === "text") {
          prev.value += node.value;
          return;
        }
        block.nodes.push(node);
        node.parent = block;
        node.prev = prev;
        prev = node;
        return node;
      };
      push2({ type: "bos" });
      while (index < length) {
        block = stack2[stack2.length - 1];
        value = advance();
        if (value === CHAR_ZERO_WIDTH_NOBREAK_SPACE || value === CHAR_NO_BREAK_SPACE) {
          continue;
        }
        if (value === CHAR_BACKSLASH) {
          push2({ type: "text", value: (options8.keepEscaping ? value : "") + advance() });
          continue;
        }
        if (value === CHAR_RIGHT_SQUARE_BRACKET) {
          push2({ type: "text", value: "\\" + value });
          continue;
        }
        if (value === CHAR_LEFT_SQUARE_BRACKET) {
          brackets++;
          let next;
          while (index < length && (next = advance())) {
            value += next;
            if (next === CHAR_LEFT_SQUARE_BRACKET) {
              brackets++;
              continue;
            }
            if (next === CHAR_BACKSLASH) {
              value += advance();
              continue;
            }
            if (next === CHAR_RIGHT_SQUARE_BRACKET) {
              brackets--;
              if (brackets === 0) {
                break;
              }
            }
          }
          push2({ type: "text", value });
          continue;
        }
        if (value === CHAR_LEFT_PARENTHESES) {
          block = push2({ type: "paren", nodes: [] });
          stack2.push(block);
          push2({ type: "text", value });
          continue;
        }
        if (value === CHAR_RIGHT_PARENTHESES) {
          if (block.type !== "paren") {
            push2({ type: "text", value });
            continue;
          }
          block = stack2.pop();
          push2({ type: "text", value });
          block = stack2[stack2.length - 1];
          continue;
        }
        if (value === CHAR_DOUBLE_QUOTE || value === CHAR_SINGLE_QUOTE || value === CHAR_BACKTICK) {
          const open = value;
          let next;
          if (options8.keepQuotes !== true) {
            value = "";
          }
          while (index < length && (next = advance())) {
            if (next === CHAR_BACKSLASH) {
              value += next + advance();
              continue;
            }
            if (next === open) {
              if (options8.keepQuotes === true) value += next;
              break;
            }
            value += next;
          }
          push2({ type: "text", value });
          continue;
        }
        if (value === CHAR_LEFT_CURLY_BRACE) {
          depth++;
          const dollar = prev.value && prev.value.slice(-1) === "$" || block.dollar === true;
          const brace = {
            type: "brace",
            open: true,
            close: false,
            dollar,
            depth,
            commas: 0,
            ranges: 0,
            nodes: []
          };
          block = push2(brace);
          stack2.push(block);
          push2({ type: "open", value });
          continue;
        }
        if (value === CHAR_RIGHT_CURLY_BRACE) {
          if (block.type !== "brace") {
            push2({ type: "text", value });
            continue;
          }
          const type2 = "close";
          block = stack2.pop();
          block.close = true;
          push2({ type: type2, value });
          depth--;
          block = stack2[stack2.length - 1];
          continue;
        }
        if (value === CHAR_COMMA && depth > 0) {
          if (block.ranges > 0) {
            block.ranges = 0;
            const open = block.nodes.shift();
            block.nodes = [open, { type: "text", value: stringify(block) }];
          }
          push2({ type: "comma", value });
          block.commas++;
          continue;
        }
        if (value === CHAR_DOT && depth > 0 && block.commas === 0) {
          const siblings = block.nodes;
          if (depth === 0 || siblings.length === 0) {
            push2({ type: "text", value });
            continue;
          }
          if (prev.type === "dot") {
            block.range = [];
            prev.value += value;
            prev.type = "range";
            if (block.nodes.length !== 3 && block.nodes.length !== 5) {
              block.invalid = true;
              block.ranges = 0;
              prev.type = "text";
              continue;
            }
            block.ranges++;
            block.args = [];
            continue;
          }
          if (prev.type === "range") {
            siblings.pop();
            const before = siblings[siblings.length - 1];
            before.value += prev.value + value;
            prev = before;
            block.ranges--;
            continue;
          }
          push2({ type: "dot", value });
          continue;
        }
        push2({ type: "text", value });
      }
      do {
        block = stack2.pop();
        if (block.type !== "root") {
          block.nodes.forEach((node) => {
            if (!node.nodes) {
              if (node.type === "open") node.isOpen = true;
              if (node.type === "close") node.isClose = true;
              if (!node.nodes) node.type = "text";
              node.invalid = true;
            }
          });
          const parent = stack2[stack2.length - 1];
          const index2 = parent.nodes.indexOf(block);
          parent.nodes.splice(index2, 1, ...block.nodes);
        }
      } while (stack2.length > 0);
      push2({ type: "eos" });
      return ast;
    };
    module.exports = parse6;
  }
});

// node_modules/braces/index.js
var require_braces = __commonJS({
  "node_modules/braces/index.js"(exports, module) {
    "use strict";
    var stringify = require_stringify();
    var compile = require_compile();
    var expand = require_expand();
    var parse6 = require_parse();
    var braces = (input, options8 = {}) => {
      let output = [];
      if (Array.isArray(input)) {
        for (const pattern of input) {
          const result = braces.create(pattern, options8);
          if (Array.isArray(result)) {
            output.push(...result);
          } else {
            output.push(result);
          }
        }
      } else {
        output = [].concat(braces.create(input, options8));
      }
      if (options8 && options8.expand === true && options8.nodupes === true) {
        output = [...new Set(output)];
      }
      return output;
    };
    braces.parse = (input, options8 = {}) => parse6(input, options8);
    braces.stringify = (input, options8 = {}) => {
      if (typeof input === "string") {
        return stringify(braces.parse(input, options8), options8);
      }
      return stringify(input, options8);
    };
    braces.compile = (input, options8 = {}) => {
      if (typeof input === "string") {
        input = braces.parse(input, options8);
      }
      return compile(input, options8);
    };
    braces.expand = (input, options8 = {}) => {
      if (typeof input === "string") {
        input = braces.parse(input, options8);
      }
      let result = expand(input, options8);
      if (options8.noempty === true) {
        result = result.filter(Boolean);
      }
      if (options8.nodupes === true) {
        result = [...new Set(result)];
      }
      return result;
    };
    braces.create = (input, options8 = {}) => {
      if (input === "" || input.length < 3) {
        return [input];
      }
      return options8.expand !== true ? braces.compile(input, options8) : braces.expand(input, options8);
    };
    module.exports = braces;
  }
});

// node_modules/picomatch/lib/constants.js
var require_constants2 = __commonJS({
  "node_modules/picomatch/lib/constants.js"(exports, module) {
    "use strict";
    var path13 = __require("path");
    var WIN_SLASH = "\\\\/";
    var WIN_NO_SLASH = `[^${WIN_SLASH}]`;
    var DOT_LITERAL = "\\.";
    var PLUS_LITERAL = "\\+";
    var QMARK_LITERAL = "\\?";
    var SLASH_LITERAL = "\\/";
    var ONE_CHAR = "(?=.)";
    var QMARK = "[^/]";
    var END_ANCHOR = `(?:${SLASH_LITERAL}|$)`;
    var START_ANCHOR = `(?:^|${SLASH_LITERAL})`;
    var DOTS_SLASH = `${DOT_LITERAL}{1,2}${END_ANCHOR}`;
    var NO_DOT = `(?!${DOT_LITERAL})`;
    var NO_DOTS = `(?!${START_ANCHOR}${DOTS_SLASH})`;
    var NO_DOT_SLASH = `(?!${DOT_LITERAL}{0,1}${END_ANCHOR})`;
    var NO_DOTS_SLASH = `(?!${DOTS_SLASH})`;
    var QMARK_NO_DOT = `[^.${SLASH_LITERAL}]`;
    var STAR = `${QMARK}*?`;
    var POSIX_CHARS = {
      DOT_LITERAL,
      PLUS_LITERAL,
      QMARK_LITERAL,
      SLASH_LITERAL,
      ONE_CHAR,
      QMARK,
      END_ANCHOR,
      DOTS_SLASH,
      NO_DOT,
      NO_DOTS,
      NO_DOT_SLASH,
      NO_DOTS_SLASH,
      QMARK_NO_DOT,
      STAR,
      START_ANCHOR
    };
    var WINDOWS_CHARS = {
      ...POSIX_CHARS,
      SLASH_LITERAL: `[${WIN_SLASH}]`,
      QMARK: WIN_NO_SLASH,
      STAR: `${WIN_NO_SLASH}*?`,
      DOTS_SLASH: `${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$)`,
      NO_DOT: `(?!${DOT_LITERAL})`,
      NO_DOTS: `(?!(?:^|[${WIN_SLASH}])${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
      NO_DOT_SLASH: `(?!${DOT_LITERAL}{0,1}(?:[${WIN_SLASH}]|$))`,
      NO_DOTS_SLASH: `(?!${DOT_LITERAL}{1,2}(?:[${WIN_SLASH}]|$))`,
      QMARK_NO_DOT: `[^.${WIN_SLASH}]`,
      START_ANCHOR: `(?:^|[${WIN_SLASH}])`,
      END_ANCHOR: `(?:[${WIN_SLASH}]|$)`
    };
    var POSIX_REGEX_SOURCE = {
      alnum: "a-zA-Z0-9",
      alpha: "a-zA-Z",
      ascii: "\\x00-\\x7F",
      blank: " \\t",
      cntrl: "\\x00-\\x1F\\x7F",
      digit: "0-9",
      graph: "\\x21-\\x7E",
      lower: "a-z",
      print: "\\x20-\\x7E ",
      punct: "\\-!\"#$%&'()\\*+,./:;<=>?@[\\]^_`{|}~",
      space: " \\t\\r\\n\\v\\f",
      upper: "A-Z",
      word: "A-Za-z0-9_",
      xdigit: "A-Fa-f0-9"
    };
    module.exports = {
      MAX_LENGTH: 1024 * 64,
      POSIX_REGEX_SOURCE,
      // regular expressions
      REGEX_BACKSLASH: /\\(?![*+?^${}(|)[\]])/g,
      REGEX_NON_SPECIAL_CHARS: /^[^@![\].,$*+?^{}()|\\/]+/,
      REGEX_SPECIAL_CHARS: /[-*+?.^${}(|)[\]]/,
      REGEX_SPECIAL_CHARS_BACKREF: /(\\?)((\W)(\3*))/g,
      REGEX_SPECIAL_CHARS_GLOBAL: /([-*+?.^${}(|)[\]])/g,
      REGEX_REMOVE_BACKSLASH: /(?:\[.*?[^\\]\]|\\(?=.))/g,
      // Replace globs with equivalent patterns to reduce parsing time.
      REPLACEMENTS: {
        "***": "*",
        "**/**": "**",
        "**/**/**": "**"
      },
      // Digits
      CHAR_0: 48,
      /* 0 */
      CHAR_9: 57,
      /* 9 */
      // Alphabet chars.
      CHAR_UPPERCASE_A: 65,
      /* A */
      CHAR_LOWERCASE_A: 97,
      /* a */
      CHAR_UPPERCASE_Z: 90,
      /* Z */
      CHAR_LOWERCASE_Z: 122,
      /* z */
      CHAR_LEFT_PARENTHESES: 40,
      /* ( */
      CHAR_RIGHT_PARENTHESES: 41,
      /* ) */
      CHAR_ASTERISK: 42,
      /* * */
      // Non-alphabetic chars.
      CHAR_AMPERSAND: 38,
      /* & */
      CHAR_AT: 64,
      /* @ */
      CHAR_BACKWARD_SLASH: 92,
      /* \ */
      CHAR_CARRIAGE_RETURN: 13,
      /* \r */
      CHAR_CIRCUMFLEX_ACCENT: 94,
      /* ^ */
      CHAR_COLON: 58,
      /* : */
      CHAR_COMMA: 44,
      /* , */
      CHAR_DOT: 46,
      /* . */
      CHAR_DOUBLE_QUOTE: 34,
      /* " */
      CHAR_EQUAL: 61,
      /* = */
      CHAR_EXCLAMATION_MARK: 33,
      /* ! */
      CHAR_FORM_FEED: 12,
      /* \f */
      CHAR_FORWARD_SLASH: 47,
      /* / */
      CHAR_GRAVE_ACCENT: 96,
      /* ` */
      CHAR_HASH: 35,
      /* # */
      CHAR_HYPHEN_MINUS: 45,
      /* - */
      CHAR_LEFT_ANGLE_BRACKET: 60,
      /* < */
      CHAR_LEFT_CURLY_BRACE: 123,
      /* { */
      CHAR_LEFT_SQUARE_BRACKET: 91,
      /* [ */
      CHAR_LINE_FEED: 10,
      /* \n */
      CHAR_NO_BREAK_SPACE: 160,
      /* \u00A0 */
      CHAR_PERCENT: 37,
      /* % */
      CHAR_PLUS: 43,
      /* + */
      CHAR_QUESTION_MARK: 63,
      /* ? */
      CHAR_RIGHT_ANGLE_BRACKET: 62,
      /* > */
      CHAR_RIGHT_CURLY_BRACE: 125,
      /* } */
      CHAR_RIGHT_SQUARE_BRACKET: 93,
      /* ] */
      CHAR_SEMICOLON: 59,
      /* ; */
      CHAR_SINGLE_QUOTE: 39,
      /* ' */
      CHAR_SPACE: 32,
      /*   */
      CHAR_TAB: 9,
      /* \t */
      CHAR_UNDERSCORE: 95,
      /* _ */
      CHAR_VERTICAL_LINE: 124,
      /* | */
      CHAR_ZERO_WIDTH_NOBREAK_SPACE: 65279,
      /* \uFEFF */
      SEP: path13.sep,
      /**
       * Create EXTGLOB_CHARS
       */
      extglobChars(chars) {
        return {
          "!": { type: "negate", open: "(?:(?!(?:", close: `))${chars.STAR})` },
          "?": { type: "qmark", open: "(?:", close: ")?" },
          "+": { type: "plus", open: "(?:", close: ")+" },
          "*": { type: "star", open: "(?:", close: ")*" },
          "@": { type: "at", open: "(?:", close: ")" }
        };
      },
      /**
       * Create GLOB_CHARS
       */
      globChars(win32) {
        return win32 === true ? WINDOWS_CHARS : POSIX_CHARS;
      }
    };
  }
});

// node_modules/picomatch/lib/utils.js
var require_utils2 = __commonJS({
  "node_modules/picomatch/lib/utils.js"(exports) {
    "use strict";
    var path13 = __require("path");
    var win32 = process.platform === "win32";
    var {
      REGEX_BACKSLASH,
      REGEX_REMOVE_BACKSLASH,
      REGEX_SPECIAL_CHARS,
      REGEX_SPECIAL_CHARS_GLOBAL
    } = require_constants2();
    exports.isObject = (val) => val !== null && typeof val === "object" && !Array.isArray(val);
    exports.hasRegexChars = (str2) => REGEX_SPECIAL_CHARS.test(str2);
    exports.isRegexChar = (str2) => str2.length === 1 && exports.hasRegexChars(str2);
    exports.escapeRegex = (str2) => str2.replace(REGEX_SPECIAL_CHARS_GLOBAL, "\\$1");
    exports.toPosixSlashes = (str2) => str2.replace(REGEX_BACKSLASH, "/");
    exports.removeBackslashes = (str2) => {
      return str2.replace(REGEX_REMOVE_BACKSLASH, (match) => {
        return match === "\\" ? "" : match;
      });
    };
    exports.supportsLookbehinds = () => {
      const segs = process.version.slice(1).split(".").map(Number);
      if (segs.length === 3 && segs[0] >= 9 || segs[0] === 8 && segs[1] >= 10) {
        return true;
      }
      return false;
    };
    exports.isWindows = (options8) => {
      if (options8 && typeof options8.windows === "boolean") {
        return options8.windows;
      }
      return win32 === true || path13.sep === "\\";
    };
    exports.escapeLast = (input, char, lastIdx) => {
      const idx = input.lastIndexOf(char, lastIdx);
      if (idx === -1) return input;
      if (input[idx - 1] === "\\") return exports.escapeLast(input, char, idx - 1);
      return `${input.slice(0, idx)}\\${input.slice(idx)}`;
    };
    exports.removePrefix = (input, state = {}) => {
      let output = input;
      if (output.startsWith("./")) {
        output = output.slice(2);
        state.prefix = "./";
      }
      return output;
    };
    exports.wrapOutput = (input, state = {}, options8 = {}) => {
      const prepend = options8.contains ? "" : "^";
      const append = options8.contains ? "" : "$";
      let output = `${prepend}(?:${input})${append}`;
      if (state.negated === true) {
        output = `(?:^(?!${output}).*$)`;
      }
      return output;
    };
  }
});

// node_modules/picomatch/lib/scan.js
var require_scan = __commonJS({
  "node_modules/picomatch/lib/scan.js"(exports, module) {
    "use strict";
    var utils = require_utils2();
    var {
      CHAR_ASTERISK,
      /* * */
      CHAR_AT,
      /* @ */
      CHAR_BACKWARD_SLASH,
      /* \ */
      CHAR_COMMA,
      /* , */
      CHAR_DOT,
      /* . */
      CHAR_EXCLAMATION_MARK,
      /* ! */
      CHAR_FORWARD_SLASH,
      /* / */
      CHAR_LEFT_CURLY_BRACE,
      /* { */
      CHAR_LEFT_PARENTHESES,
      /* ( */
      CHAR_LEFT_SQUARE_BRACKET,
      /* [ */
      CHAR_PLUS,
      /* + */
      CHAR_QUESTION_MARK,
      /* ? */
      CHAR_RIGHT_CURLY_BRACE,
      /* } */
      CHAR_RIGHT_PARENTHESES,
      /* ) */
      CHAR_RIGHT_SQUARE_BRACKET
      /* ] */
    } = require_constants2();
    var isPathSeparator = (code) => {
      return code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH;
    };
    var depth = (token2) => {
      if (token2.isPrefix !== true) {
        token2.depth = token2.isGlobstar ? Infinity : 1;
      }
    };
    var scan = (input, options8) => {
      const opts = options8 || {};
      const length = input.length - 1;
      const scanToEnd = opts.parts === true || opts.scanToEnd === true;
      const slashes = [];
      const tokens = [];
      const parts = [];
      let str2 = input;
      let index = -1;
      let start = 0;
      let lastIndex = 0;
      let isBrace = false;
      let isBracket = false;
      let isGlob = false;
      let isExtglob = false;
      let isGlobstar = false;
      let braceEscaped = false;
      let backslashes = false;
      let negated = false;
      let negatedExtglob = false;
      let finished = false;
      let braces = 0;
      let prev;
      let code;
      let token2 = { value: "", depth: 0, isGlob: false };
      const eos = () => index >= length;
      const peek2 = () => str2.charCodeAt(index + 1);
      const advance = () => {
        prev = code;
        return str2.charCodeAt(++index);
      };
      while (index < length) {
        code = advance();
        let next;
        if (code === CHAR_BACKWARD_SLASH) {
          backslashes = token2.backslashes = true;
          code = advance();
          if (code === CHAR_LEFT_CURLY_BRACE) {
            braceEscaped = true;
          }
          continue;
        }
        if (braceEscaped === true || code === CHAR_LEFT_CURLY_BRACE) {
          braces++;
          while (eos() !== true && (code = advance())) {
            if (code === CHAR_BACKWARD_SLASH) {
              backslashes = token2.backslashes = true;
              advance();
              continue;
            }
            if (code === CHAR_LEFT_CURLY_BRACE) {
              braces++;
              continue;
            }
            if (braceEscaped !== true && code === CHAR_DOT && (code = advance()) === CHAR_DOT) {
              isBrace = token2.isBrace = true;
              isGlob = token2.isGlob = true;
              finished = true;
              if (scanToEnd === true) {
                continue;
              }
              break;
            }
            if (braceEscaped !== true && code === CHAR_COMMA) {
              isBrace = token2.isBrace = true;
              isGlob = token2.isGlob = true;
              finished = true;
              if (scanToEnd === true) {
                continue;
              }
              break;
            }
            if (code === CHAR_RIGHT_CURLY_BRACE) {
              braces--;
              if (braces === 0) {
                braceEscaped = false;
                isBrace = token2.isBrace = true;
                finished = true;
                break;
              }
            }
          }
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
        if (code === CHAR_FORWARD_SLASH) {
          slashes.push(index);
          tokens.push(token2);
          token2 = { value: "", depth: 0, isGlob: false };
          if (finished === true) continue;
          if (prev === CHAR_DOT && index === start + 1) {
            start += 2;
            continue;
          }
          lastIndex = index + 1;
          continue;
        }
        if (opts.noext !== true) {
          const isExtglobChar = code === CHAR_PLUS || code === CHAR_AT || code === CHAR_ASTERISK || code === CHAR_QUESTION_MARK || code === CHAR_EXCLAMATION_MARK;
          if (isExtglobChar === true && peek2() === CHAR_LEFT_PARENTHESES) {
            isGlob = token2.isGlob = true;
            isExtglob = token2.isExtglob = true;
            finished = true;
            if (code === CHAR_EXCLAMATION_MARK && index === start) {
              negatedExtglob = true;
            }
            if (scanToEnd === true) {
              while (eos() !== true && (code = advance())) {
                if (code === CHAR_BACKWARD_SLASH) {
                  backslashes = token2.backslashes = true;
                  code = advance();
                  continue;
                }
                if (code === CHAR_RIGHT_PARENTHESES) {
                  isGlob = token2.isGlob = true;
                  finished = true;
                  break;
                }
              }
              continue;
            }
            break;
          }
        }
        if (code === CHAR_ASTERISK) {
          if (prev === CHAR_ASTERISK) isGlobstar = token2.isGlobstar = true;
          isGlob = token2.isGlob = true;
          finished = true;
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
        if (code === CHAR_QUESTION_MARK) {
          isGlob = token2.isGlob = true;
          finished = true;
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
        if (code === CHAR_LEFT_SQUARE_BRACKET) {
          while (eos() !== true && (next = advance())) {
            if (next === CHAR_BACKWARD_SLASH) {
              backslashes = token2.backslashes = true;
              advance();
              continue;
            }
            if (next === CHAR_RIGHT_SQUARE_BRACKET) {
              isBracket = token2.isBracket = true;
              isGlob = token2.isGlob = true;
              finished = true;
              break;
            }
          }
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
        if (opts.nonegate !== true && code === CHAR_EXCLAMATION_MARK && index === start) {
          negated = token2.negated = true;
          start++;
          continue;
        }
        if (opts.noparen !== true && code === CHAR_LEFT_PARENTHESES) {
          isGlob = token2.isGlob = true;
          if (scanToEnd === true) {
            while (eos() !== true && (code = advance())) {
              if (code === CHAR_LEFT_PARENTHESES) {
                backslashes = token2.backslashes = true;
                code = advance();
                continue;
              }
              if (code === CHAR_RIGHT_PARENTHESES) {
                finished = true;
                break;
              }
            }
            continue;
          }
          break;
        }
        if (isGlob === true) {
          finished = true;
          if (scanToEnd === true) {
            continue;
          }
          break;
        }
      }
      if (opts.noext === true) {
        isExtglob = false;
        isGlob = false;
      }
      let base = str2;
      let prefix = "";
      let glob = "";
      if (start > 0) {
        prefix = str2.slice(0, start);
        str2 = str2.slice(start);
        lastIndex -= start;
      }
      if (base && isGlob === true && lastIndex > 0) {
        base = str2.slice(0, lastIndex);
        glob = str2.slice(lastIndex);
      } else if (isGlob === true) {
        base = "";
        glob = str2;
      } else {
        base = str2;
      }
      if (base && base !== "" && base !== "/" && base !== str2) {
        if (isPathSeparator(base.charCodeAt(base.length - 1))) {
          base = base.slice(0, -1);
        }
      }
      if (opts.unescape === true) {
        if (glob) glob = utils.removeBackslashes(glob);
        if (base && backslashes === true) {
          base = utils.removeBackslashes(base);
        }
      }
      const state = {
        prefix,
        input,
        start,
        base,
        glob,
        isBrace,
        isBracket,
        isGlob,
        isExtglob,
        isGlobstar,
        negated,
        negatedExtglob
      };
      if (opts.tokens === true) {
        state.maxDepth = 0;
        if (!isPathSeparator(code)) {
          tokens.push(token2);
        }
        state.tokens = tokens;
      }
      if (opts.parts === true || opts.tokens === true) {
        let prevIndex;
        for (let idx = 0; idx < slashes.length; idx++) {
          const n = prevIndex ? prevIndex + 1 : start;
          const i = slashes[idx];
          const value = input.slice(n, i);
          if (opts.tokens) {
            if (idx === 0 && start !== 0) {
              tokens[idx].isPrefix = true;
              tokens[idx].value = prefix;
            } else {
              tokens[idx].value = value;
            }
            depth(tokens[idx]);
            state.maxDepth += tokens[idx].depth;
          }
          if (idx !== 0 || value !== "") {
            parts.push(value);
          }
          prevIndex = i;
        }
        if (prevIndex && prevIndex + 1 < input.length) {
          const value = input.slice(prevIndex + 1);
          parts.push(value);
          if (opts.tokens) {
            tokens[tokens.length - 1].value = value;
            depth(tokens[tokens.length - 1]);
            state.maxDepth += tokens[tokens.length - 1].depth;
          }
        }
        state.slashes = slashes;
        state.parts = parts;
      }
      return state;
    };
    module.exports = scan;
  }
});

// node_modules/picomatch/lib/parse.js
var require_parse2 = __commonJS({
  "node_modules/picomatch/lib/parse.js"(exports, module) {
    "use strict";
    var constants = require_constants2();
    var utils = require_utils2();
    var {
      MAX_LENGTH,
      POSIX_REGEX_SOURCE,
      REGEX_NON_SPECIAL_CHARS,
      REGEX_SPECIAL_CHARS_BACKREF,
      REPLACEMENTS
    } = constants;
    var expandRange = (args, options8) => {
      if (typeof options8.expandRange === "function") {
        return options8.expandRange(...args, options8);
      }
      args.sort();
      const value = `[${args.join("-")}]`;
      try {
        new RegExp(value);
      } catch (ex) {
        return args.map((v) => utils.escapeRegex(v)).join("..");
      }
      return value;
    };
    var syntaxError2 = (type2, char) => {
      return `Missing ${type2}: "${char}" - use "\\\\${char}" to match literal characters`;
    };
    var parse6 = (input, options8) => {
      if (typeof input !== "string") {
        throw new TypeError("Expected a string");
      }
      input = REPLACEMENTS[input] || input;
      const opts = { ...options8 };
      const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
      let len = input.length;
      if (len > max) {
        throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
      }
      const bos = { type: "bos", value: "", output: opts.prepend || "" };
      const tokens = [bos];
      const capture = opts.capture ? "" : "?:";
      const win32 = utils.isWindows(options8);
      const PLATFORM_CHARS = constants.globChars(win32);
      const EXTGLOB_CHARS = constants.extglobChars(PLATFORM_CHARS);
      const {
        DOT_LITERAL,
        PLUS_LITERAL,
        SLASH_LITERAL,
        ONE_CHAR,
        DOTS_SLASH,
        NO_DOT,
        NO_DOT_SLASH,
        NO_DOTS_SLASH,
        QMARK,
        QMARK_NO_DOT,
        STAR,
        START_ANCHOR
      } = PLATFORM_CHARS;
      const globstar = (opts2) => {
        return `(${capture}(?:(?!${START_ANCHOR}${opts2.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
      };
      const nodot = opts.dot ? "" : NO_DOT;
      const qmarkNoDot = opts.dot ? QMARK : QMARK_NO_DOT;
      let star = opts.bash === true ? globstar(opts) : STAR;
      if (opts.capture) {
        star = `(${star})`;
      }
      if (typeof opts.noext === "boolean") {
        opts.noextglob = opts.noext;
      }
      const state = {
        input,
        index: -1,
        start: 0,
        dot: opts.dot === true,
        consumed: "",
        output: "",
        prefix: "",
        backtrack: false,
        negated: false,
        brackets: 0,
        braces: 0,
        parens: 0,
        quotes: 0,
        globstar: false,
        tokens
      };
      input = utils.removePrefix(input, state);
      len = input.length;
      const extglobs = [];
      const braces = [];
      const stack2 = [];
      let prev = bos;
      let value;
      const eos = () => state.index === len - 1;
      const peek2 = state.peek = (n = 1) => input[state.index + n];
      const advance = state.advance = () => input[++state.index] || "";
      const remaining = () => input.slice(state.index + 1);
      const consume = (value2 = "", num = 0) => {
        state.consumed += value2;
        state.index += num;
      };
      const append = (token2) => {
        state.output += token2.output != null ? token2.output : token2.value;
        consume(token2.value);
      };
      const negate = () => {
        let count = 1;
        while (peek2() === "!" && (peek2(2) !== "(" || peek2(3) === "?")) {
          advance();
          state.start++;
          count++;
        }
        if (count % 2 === 0) {
          return false;
        }
        state.negated = true;
        state.start++;
        return true;
      };
      const increment = (type2) => {
        state[type2]++;
        stack2.push(type2);
      };
      const decrement = (type2) => {
        state[type2]--;
        stack2.pop();
      };
      const push2 = (tok) => {
        if (prev.type === "globstar") {
          const isBrace = state.braces > 0 && (tok.type === "comma" || tok.type === "brace");
          const isExtglob = tok.extglob === true || extglobs.length && (tok.type === "pipe" || tok.type === "paren");
          if (tok.type !== "slash" && tok.type !== "paren" && !isBrace && !isExtglob) {
            state.output = state.output.slice(0, -prev.output.length);
            prev.type = "star";
            prev.value = "*";
            prev.output = star;
            state.output += prev.output;
          }
        }
        if (extglobs.length && tok.type !== "paren") {
          extglobs[extglobs.length - 1].inner += tok.value;
        }
        if (tok.value || tok.output) append(tok);
        if (prev && prev.type === "text" && tok.type === "text") {
          prev.value += tok.value;
          prev.output = (prev.output || "") + tok.value;
          return;
        }
        tok.prev = prev;
        tokens.push(tok);
        prev = tok;
      };
      const extglobOpen = (type2, value2) => {
        const token2 = { ...EXTGLOB_CHARS[value2], conditions: 1, inner: "" };
        token2.prev = prev;
        token2.parens = state.parens;
        token2.output = state.output;
        const output = (opts.capture ? "(" : "") + token2.open;
        increment("parens");
        push2({ type: type2, value: value2, output: state.output ? "" : ONE_CHAR });
        push2({ type: "paren", extglob: true, value: advance(), output });
        extglobs.push(token2);
      };
      const extglobClose = (token2) => {
        let output = token2.close + (opts.capture ? ")" : "");
        let rest;
        if (token2.type === "negate") {
          let extglobStar = star;
          if (token2.inner && token2.inner.length > 1 && token2.inner.includes("/")) {
            extglobStar = globstar(opts);
          }
          if (extglobStar !== star || eos() || /^\)+$/.test(remaining())) {
            output = token2.close = `)$))${extglobStar}`;
          }
          if (token2.inner.includes("*") && (rest = remaining()) && /^\.[^\\/.]+$/.test(rest)) {
            const expression = parse6(rest, { ...options8, fastpaths: false }).output;
            output = token2.close = `)${expression})${extglobStar})`;
          }
          if (token2.prev.type === "bos") {
            state.negatedExtglob = true;
          }
        }
        push2({ type: "paren", extglob: true, value, output });
        decrement("parens");
      };
      if (opts.fastpaths !== false && !/(^[*!]|[/()[\]{}"])/.test(input)) {
        let backslashes = false;
        let output = input.replace(REGEX_SPECIAL_CHARS_BACKREF, (m, esc, chars, first, rest, index) => {
          if (first === "\\") {
            backslashes = true;
            return m;
          }
          if (first === "?") {
            if (esc) {
              return esc + first + (rest ? QMARK.repeat(rest.length) : "");
            }
            if (index === 0) {
              return qmarkNoDot + (rest ? QMARK.repeat(rest.length) : "");
            }
            return QMARK.repeat(chars.length);
          }
          if (first === ".") {
            return DOT_LITERAL.repeat(chars.length);
          }
          if (first === "*") {
            if (esc) {
              return esc + first + (rest ? star : "");
            }
            return star;
          }
          return esc ? m : `\\${m}`;
        });
        if (backslashes === true) {
          if (opts.unescape === true) {
            output = output.replace(/\\/g, "");
          } else {
            output = output.replace(/\\+/g, (m) => {
              return m.length % 2 === 0 ? "\\\\" : m ? "\\" : "";
            });
          }
        }
        if (output === input && opts.contains === true) {
          state.output = input;
          return state;
        }
        state.output = utils.wrapOutput(output, state, options8);
        return state;
      }
      while (!eos()) {
        value = advance();
        if (value === "\0") {
          continue;
        }
        if (value === "\\") {
          const next = peek2();
          if (next === "/" && opts.bash !== true) {
            continue;
          }
          if (next === "." || next === ";") {
            continue;
          }
          if (!next) {
            value += "\\";
            push2({ type: "text", value });
            continue;
          }
          const match = /^\\+/.exec(remaining());
          let slashes = 0;
          if (match && match[0].length > 2) {
            slashes = match[0].length;
            state.index += slashes;
            if (slashes % 2 !== 0) {
              value += "\\";
            }
          }
          if (opts.unescape === true) {
            value = advance();
          } else {
            value += advance();
          }
          if (state.brackets === 0) {
            push2({ type: "text", value });
            continue;
          }
        }
        if (state.brackets > 0 && (value !== "]" || prev.value === "[" || prev.value === "[^")) {
          if (opts.posix !== false && value === ":") {
            const inner = prev.value.slice(1);
            if (inner.includes("[")) {
              prev.posix = true;
              if (inner.includes(":")) {
                const idx = prev.value.lastIndexOf("[");
                const pre = prev.value.slice(0, idx);
                const rest2 = prev.value.slice(idx + 2);
                const posix = POSIX_REGEX_SOURCE[rest2];
                if (posix) {
                  prev.value = pre + posix;
                  state.backtrack = true;
                  advance();
                  if (!bos.output && tokens.indexOf(prev) === 1) {
                    bos.output = ONE_CHAR;
                  }
                  continue;
                }
              }
            }
          }
          if (value === "[" && peek2() !== ":" || value === "-" && peek2() === "]") {
            value = `\\${value}`;
          }
          if (value === "]" && (prev.value === "[" || prev.value === "[^")) {
            value = `\\${value}`;
          }
          if (opts.posix === true && value === "!" && prev.value === "[") {
            value = "^";
          }
          prev.value += value;
          append({ value });
          continue;
        }
        if (state.quotes === 1 && value !== '"') {
          value = utils.escapeRegex(value);
          prev.value += value;
          append({ value });
          continue;
        }
        if (value === '"') {
          state.quotes = state.quotes === 1 ? 0 : 1;
          if (opts.keepQuotes === true) {
            push2({ type: "text", value });
          }
          continue;
        }
        if (value === "(") {
          increment("parens");
          push2({ type: "paren", value });
          continue;
        }
        if (value === ")") {
          if (state.parens === 0 && opts.strictBrackets === true) {
            throw new SyntaxError(syntaxError2("opening", "("));
          }
          const extglob = extglobs[extglobs.length - 1];
          if (extglob && state.parens === extglob.parens + 1) {
            extglobClose(extglobs.pop());
            continue;
          }
          push2({ type: "paren", value, output: state.parens ? ")" : "\\)" });
          decrement("parens");
          continue;
        }
        if (value === "[") {
          if (opts.nobracket === true || !remaining().includes("]")) {
            if (opts.nobracket !== true && opts.strictBrackets === true) {
              throw new SyntaxError(syntaxError2("closing", "]"));
            }
            value = `\\${value}`;
          } else {
            increment("brackets");
          }
          push2({ type: "bracket", value });
          continue;
        }
        if (value === "]") {
          if (opts.nobracket === true || prev && prev.type === "bracket" && prev.value.length === 1) {
            push2({ type: "text", value, output: `\\${value}` });
            continue;
          }
          if (state.brackets === 0) {
            if (opts.strictBrackets === true) {
              throw new SyntaxError(syntaxError2("opening", "["));
            }
            push2({ type: "text", value, output: `\\${value}` });
            continue;
          }
          decrement("brackets");
          const prevValue = prev.value.slice(1);
          if (prev.posix !== true && prevValue[0] === "^" && !prevValue.includes("/")) {
            value = `/${value}`;
          }
          prev.value += value;
          append({ value });
          if (opts.literalBrackets === false || utils.hasRegexChars(prevValue)) {
            continue;
          }
          const escaped = utils.escapeRegex(prev.value);
          state.output = state.output.slice(0, -prev.value.length);
          if (opts.literalBrackets === true) {
            state.output += escaped;
            prev.value = escaped;
            continue;
          }
          prev.value = `(${capture}${escaped}|${prev.value})`;
          state.output += prev.value;
          continue;
        }
        if (value === "{" && opts.nobrace !== true) {
          increment("braces");
          const open = {
            type: "brace",
            value,
            output: "(",
            outputIndex: state.output.length,
            tokensIndex: state.tokens.length
          };
          braces.push(open);
          push2(open);
          continue;
        }
        if (value === "}") {
          const brace = braces[braces.length - 1];
          if (opts.nobrace === true || !brace) {
            push2({ type: "text", value, output: value });
            continue;
          }
          let output = ")";
          if (brace.dots === true) {
            const arr = tokens.slice();
            const range = [];
            for (let i = arr.length - 1; i >= 0; i--) {
              tokens.pop();
              if (arr[i].type === "brace") {
                break;
              }
              if (arr[i].type !== "dots") {
                range.unshift(arr[i].value);
              }
            }
            output = expandRange(range, opts);
            state.backtrack = true;
          }
          if (brace.comma !== true && brace.dots !== true) {
            const out = state.output.slice(0, brace.outputIndex);
            const toks = state.tokens.slice(brace.tokensIndex);
            brace.value = brace.output = "\\{";
            value = output = "\\}";
            state.output = out;
            for (const t of toks) {
              state.output += t.output || t.value;
            }
          }
          push2({ type: "brace", value, output });
          decrement("braces");
          braces.pop();
          continue;
        }
        if (value === "|") {
          if (extglobs.length > 0) {
            extglobs[extglobs.length - 1].conditions++;
          }
          push2({ type: "text", value });
          continue;
        }
        if (value === ",") {
          let output = value;
          const brace = braces[braces.length - 1];
          if (brace && stack2[stack2.length - 1] === "braces") {
            brace.comma = true;
            output = "|";
          }
          push2({ type: "comma", value, output });
          continue;
        }
        if (value === "/") {
          if (prev.type === "dot" && state.index === state.start + 1) {
            state.start = state.index + 1;
            state.consumed = "";
            state.output = "";
            tokens.pop();
            prev = bos;
            continue;
          }
          push2({ type: "slash", value, output: SLASH_LITERAL });
          continue;
        }
        if (value === ".") {
          if (state.braces > 0 && prev.type === "dot") {
            if (prev.value === ".") prev.output = DOT_LITERAL;
            const brace = braces[braces.length - 1];
            prev.type = "dots";
            prev.output += value;
            prev.value += value;
            brace.dots = true;
            continue;
          }
          if (state.braces + state.parens === 0 && prev.type !== "bos" && prev.type !== "slash") {
            push2({ type: "text", value, output: DOT_LITERAL });
            continue;
          }
          push2({ type: "dot", value, output: DOT_LITERAL });
          continue;
        }
        if (value === "?") {
          const isGroup = prev && prev.value === "(";
          if (!isGroup && opts.noextglob !== true && peek2() === "(" && peek2(2) !== "?") {
            extglobOpen("qmark", value);
            continue;
          }
          if (prev && prev.type === "paren") {
            const next = peek2();
            let output = value;
            if (next === "<" && !utils.supportsLookbehinds()) {
              throw new Error("Node.js v10 or higher is required for regex lookbehinds");
            }
            if (prev.value === "(" && !/[!=<:]/.test(next) || next === "<" && !/<([!=]|\w+>)/.test(remaining())) {
              output = `\\${value}`;
            }
            push2({ type: "text", value, output });
            continue;
          }
          if (opts.dot !== true && (prev.type === "slash" || prev.type === "bos")) {
            push2({ type: "qmark", value, output: QMARK_NO_DOT });
            continue;
          }
          push2({ type: "qmark", value, output: QMARK });
          continue;
        }
        if (value === "!") {
          if (opts.noextglob !== true && peek2() === "(") {
            if (peek2(2) !== "?" || !/[!=<:]/.test(peek2(3))) {
              extglobOpen("negate", value);
              continue;
            }
          }
          if (opts.nonegate !== true && state.index === 0) {
            negate();
            continue;
          }
        }
        if (value === "+") {
          if (opts.noextglob !== true && peek2() === "(" && peek2(2) !== "?") {
            extglobOpen("plus", value);
            continue;
          }
          if (prev && prev.value === "(" || opts.regex === false) {
            push2({ type: "plus", value, output: PLUS_LITERAL });
            continue;
          }
          if (prev && (prev.type === "bracket" || prev.type === "paren" || prev.type === "brace") || state.parens > 0) {
            push2({ type: "plus", value });
            continue;
          }
          push2({ type: "plus", value: PLUS_LITERAL });
          continue;
        }
        if (value === "@") {
          if (opts.noextglob !== true && peek2() === "(" && peek2(2) !== "?") {
            push2({ type: "at", extglob: true, value, output: "" });
            continue;
          }
          push2({ type: "text", value });
          continue;
        }
        if (value !== "*") {
          if (value === "$" || value === "^") {
            value = `\\${value}`;
          }
          const match = REGEX_NON_SPECIAL_CHARS.exec(remaining());
          if (match) {
            value += match[0];
            state.index += match[0].length;
          }
          push2({ type: "text", value });
          continue;
        }
        if (prev && (prev.type === "globstar" || prev.star === true)) {
          prev.type = "star";
          prev.star = true;
          prev.value += value;
          prev.output = star;
          state.backtrack = true;
          state.globstar = true;
          consume(value);
          continue;
        }
        let rest = remaining();
        if (opts.noextglob !== true && /^\([^?]/.test(rest)) {
          extglobOpen("star", value);
          continue;
        }
        if (prev.type === "star") {
          if (opts.noglobstar === true) {
            consume(value);
            continue;
          }
          const prior = prev.prev;
          const before = prior.prev;
          const isStart = prior.type === "slash" || prior.type === "bos";
          const afterStar = before && (before.type === "star" || before.type === "globstar");
          if (opts.bash === true && (!isStart || rest[0] && rest[0] !== "/")) {
            push2({ type: "star", value, output: "" });
            continue;
          }
          const isBrace = state.braces > 0 && (prior.type === "comma" || prior.type === "brace");
          const isExtglob = extglobs.length && (prior.type === "pipe" || prior.type === "paren");
          if (!isStart && prior.type !== "paren" && !isBrace && !isExtglob) {
            push2({ type: "star", value, output: "" });
            continue;
          }
          while (rest.slice(0, 3) === "/**") {
            const after = input[state.index + 4];
            if (after && after !== "/") {
              break;
            }
            rest = rest.slice(3);
            consume("/**", 3);
          }
          if (prior.type === "bos" && eos()) {
            prev.type = "globstar";
            prev.value += value;
            prev.output = globstar(opts);
            state.output = prev.output;
            state.globstar = true;
            consume(value);
            continue;
          }
          if (prior.type === "slash" && prior.prev.type !== "bos" && !afterStar && eos()) {
            state.output = state.output.slice(0, -(prior.output + prev.output).length);
            prior.output = `(?:${prior.output}`;
            prev.type = "globstar";
            prev.output = globstar(opts) + (opts.strictSlashes ? ")" : "|$)");
            prev.value += value;
            state.globstar = true;
            state.output += prior.output + prev.output;
            consume(value);
            continue;
          }
          if (prior.type === "slash" && prior.prev.type !== "bos" && rest[0] === "/") {
            const end = rest[1] !== void 0 ? "|$" : "";
            state.output = state.output.slice(0, -(prior.output + prev.output).length);
            prior.output = `(?:${prior.output}`;
            prev.type = "globstar";
            prev.output = `${globstar(opts)}${SLASH_LITERAL}|${SLASH_LITERAL}${end})`;
            prev.value += value;
            state.output += prior.output + prev.output;
            state.globstar = true;
            consume(value + advance());
            push2({ type: "slash", value: "/", output: "" });
            continue;
          }
          if (prior.type === "bos" && rest[0] === "/") {
            prev.type = "globstar";
            prev.value += value;
            prev.output = `(?:^|${SLASH_LITERAL}|${globstar(opts)}${SLASH_LITERAL})`;
            state.output = prev.output;
            state.globstar = true;
            consume(value + advance());
            push2({ type: "slash", value: "/", output: "" });
            continue;
          }
          state.output = state.output.slice(0, -prev.output.length);
          prev.type = "globstar";
          prev.output = globstar(opts);
          prev.value += value;
          state.output += prev.output;
          state.globstar = true;
          consume(value);
          continue;
        }
        const token2 = { type: "star", value, output: star };
        if (opts.bash === true) {
          token2.output = ".*?";
          if (prev.type === "bos" || prev.type === "slash") {
            token2.output = nodot + token2.output;
          }
          push2(token2);
          continue;
        }
        if (prev && (prev.type === "bracket" || prev.type === "paren") && opts.regex === true) {
          token2.output = value;
          push2(token2);
          continue;
        }
        if (state.index === state.start || prev.type === "slash" || prev.type === "dot") {
          if (prev.type === "dot") {
            state.output += NO_DOT_SLASH;
            prev.output += NO_DOT_SLASH;
          } else if (opts.dot === true) {
            state.output += NO_DOTS_SLASH;
            prev.output += NO_DOTS_SLASH;
          } else {
            state.output += nodot;
            prev.output += nodot;
          }
          if (peek2() !== "*") {
            state.output += ONE_CHAR;
            prev.output += ONE_CHAR;
          }
        }
        push2(token2);
      }
      while (state.brackets > 0) {
        if (opts.strictBrackets === true) throw new SyntaxError(syntaxError2("closing", "]"));
        state.output = utils.escapeLast(state.output, "[");
        decrement("brackets");
      }
      while (state.parens > 0) {
        if (opts.strictBrackets === true) throw new SyntaxError(syntaxError2("closing", ")"));
        state.output = utils.escapeLast(state.output, "(");
        decrement("parens");
      }
      while (state.braces > 0) {
        if (opts.strictBrackets === true) throw new SyntaxError(syntaxError2("closing", "}"));
        state.output = utils.escapeLast(state.output, "{");
        decrement("braces");
      }
      if (opts.strictSlashes !== true && (prev.type === "star" || prev.type === "bracket")) {
        push2({ type: "maybe_slash", value: "", output: `${SLASH_LITERAL}?` });
      }
      if (state.backtrack === true) {
        state.output = "";
        for (const token2 of state.tokens) {
          state.output += token2.output != null ? token2.output : token2.value;
          if (token2.suffix) {
            state.output += token2.suffix;
          }
        }
      }
      return state;
    };
    parse6.fastpaths = (input, options8) => {
      const opts = { ...options8 };
      const max = typeof opts.maxLength === "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
      const len = input.length;
      if (len > max) {
        throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
      }
      input = REPLACEMENTS[input] || input;
      const win32 = utils.isWindows(options8);
      const {
        DOT_LITERAL,
        SLASH_LITERAL,
        ONE_CHAR,
        DOTS_SLASH,
        NO_DOT,
        NO_DOTS,
        NO_DOTS_SLASH,
        STAR,
        START_ANCHOR
      } = constants.globChars(win32);
      const nodot = opts.dot ? NO_DOTS : NO_DOT;
      const slashDot = opts.dot ? NO_DOTS_SLASH : NO_DOT;
      const capture = opts.capture ? "" : "?:";
      const state = { negated: false, prefix: "" };
      let star = opts.bash === true ? ".*?" : STAR;
      if (opts.capture) {
        star = `(${star})`;
      }
      const globstar = (opts2) => {
        if (opts2.noglobstar === true) return star;
        return `(${capture}(?:(?!${START_ANCHOR}${opts2.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`;
      };
      const create = (str2) => {
        switch (str2) {
          case "*":
            return `${nodot}${ONE_CHAR}${star}`;
          case ".*":
            return `${DOT_LITERAL}${ONE_CHAR}${star}`;
          case "*.*":
            return `${nodot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
          case "*/*":
            return `${nodot}${star}${SLASH_LITERAL}${ONE_CHAR}${slashDot}${star}`;
          case "**":
            return nodot + globstar(opts);
          case "**/*":
            return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${ONE_CHAR}${star}`;
          case "**/*.*":
            return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${slashDot}${star}${DOT_LITERAL}${ONE_CHAR}${star}`;
          case "**/.*":
            return `(?:${nodot}${globstar(opts)}${SLASH_LITERAL})?${DOT_LITERAL}${ONE_CHAR}${star}`;
          default: {
            const match = /^(.*?)\.(\w+)$/.exec(str2);
            if (!match) return;
            const source3 = create(match[1]);
            if (!source3) return;
            return source3 + DOT_LITERAL + match[2];
          }
        }
      };
      const output = utils.removePrefix(input, state);
      let source2 = create(output);
      if (source2 && opts.strictSlashes !== true) {
        source2 += `${SLASH_LITERAL}?`;
      }
      return source2;
    };
    module.exports = parse6;
  }
});

// node_modules/picomatch/lib/picomatch.js
var require_picomatch = __commonJS({
  "node_modules/picomatch/lib/picomatch.js"(exports, module) {
    "use strict";
    var path13 = __require("path");
    var scan = require_scan();
    var parse6 = require_parse2();
    var utils = require_utils2();
    var constants = require_constants2();
    var isObject3 = (val) => val && typeof val === "object" && !Array.isArray(val);
    var picomatch = (glob, options8, returnState = false) => {
      if (Array.isArray(glob)) {
        const fns = glob.map((input) => picomatch(input, options8, returnState));
        const arrayMatcher = (str2) => {
          for (const isMatch of fns) {
            const state2 = isMatch(str2);
            if (state2) return state2;
          }
          return false;
        };
        return arrayMatcher;
      }
      const isState = isObject3(glob) && glob.tokens && glob.input;
      if (glob === "" || typeof glob !== "string" && !isState) {
        throw new TypeError("Expected pattern to be a non-empty string");
      }
      const opts = options8 || {};
      const posix = utils.isWindows(options8);
      const regex = isState ? picomatch.compileRe(glob, options8) : picomatch.makeRe(glob, options8, false, true);
      const state = regex.state;
      delete regex.state;
      let isIgnored2 = () => false;
      if (opts.ignore) {
        const ignoreOpts = { ...options8, ignore: null, onMatch: null, onResult: null };
        isIgnored2 = picomatch(opts.ignore, ignoreOpts, returnState);
      }
      const matcher = (input, returnObject = false) => {
        const { isMatch, match, output } = picomatch.test(input, regex, options8, { glob, posix });
        const result = { glob, state, regex, posix, input, output, match, isMatch };
        if (typeof opts.onResult === "function") {
          opts.onResult(result);
        }
        if (isMatch === false) {
          result.isMatch = false;
          return returnObject ? result : false;
        }
        if (isIgnored2(input)) {
          if (typeof opts.onIgnore === "function") {
            opts.onIgnore(result);
          }
          result.isMatch = false;
          return returnObject ? result : false;
        }
        if (typeof opts.onMatch === "function") {
          opts.onMatch(result);
        }
        return returnObject ? result : true;
      };
      if (returnState) {
        matcher.state = state;
      }
      return matcher;
    };
    picomatch.test = (input, regex, options8, { glob, posix } = {}) => {
      if (typeof input !== "string") {
        throw new TypeError("Expected input to be a string");
      }
      if (input === "") {
        return { isMatch: false, output: "" };
      }
      const opts = options8 || {};
      const format3 = opts.format || (posix ? utils.toPosixSlashes : null);
      let match = input === glob;
      let output = match && format3 ? format3(input) : input;
      if (match === false) {
        output = format3 ? format3(input) : input;
        match = output === glob;
      }
      if (match === false || opts.capture === true) {
        if (opts.matchBase === true || opts.basename === true) {
          match = picomatch.matchBase(input, regex, options8, posix);
        } else {
          match = regex.exec(output);
        }
      }
      return { isMatch: Boolean(match), match, output };
    };
    picomatch.matchBase = (input, glob, options8, posix = utils.isWindows(options8)) => {
      const regex = glob instanceof RegExp ? glob : picomatch.makeRe(glob, options8);
      return regex.test(path13.basename(input));
    };
    picomatch.isMatch = (str2, patterns, options8) => picomatch(patterns, options8)(str2);
    picomatch.parse = (pattern, options8) => {
      if (Array.isArray(pattern)) return pattern.map((p) => picomatch.parse(p, options8));
      return parse6(pattern, { ...options8, fastpaths: false });
    };
    picomatch.scan = (input, options8) => scan(input, options8);
    picomatch.compileRe = (state, options8, returnOutput = false, returnState = false) => {
      if (returnOutput === true) {
        return state.output;
      }
      const opts = options8 || {};
      const prepend = opts.contains ? "" : "^";
      const append = opts.contains ? "" : "$";
      let source2 = `${prepend}(?:${state.output})${append}`;
      if (state && state.negated === true) {
        source2 = `^(?!${source2}).*$`;
      }
      const regex = picomatch.toRegex(source2, options8);
      if (returnState === true) {
        regex.state = state;
      }
      return regex;
    };
    picomatch.makeRe = (input, options8 = {}, returnOutput = false, returnState = false) => {
      if (!input || typeof input !== "string") {
        throw new TypeError("Expected a non-empty string");
      }
      let parsed = { negated: false, fastpaths: true };
      if (options8.fastpaths !== false && (input[0] === "." || input[0] === "*")) {
        parsed.output = parse6.fastpaths(input, options8);
      }
      if (!parsed.output) {
        parsed = parse6(input, options8);
      }
      return picomatch.compileRe(parsed, options8, returnOutput, returnState);
    };
    picomatch.toRegex = (source2, options8) => {
      try {
        const opts = options8 || {};
        return new RegExp(source2, opts.flags || (opts.nocase ? "i" : ""));
      } catch (err) {
        if (options8 && options8.debug === true) throw err;
        return /$^/;
      }
    };
    picomatch.constants = constants;
    module.exports = picomatch;
  }
});

// node_modules/picomatch/index.js
var require_picomatch2 = __commonJS({
  "node_modules/picomatch/index.js"(exports, module) {
    "use strict";
    module.exports = require_picomatch();
  }
});

// node_modules/micromatch/index.js
var require_micromatch = __commonJS({
  "node_modules/micromatch/index.js"(exports, module) {
    "use strict";
    var util2 = __require("util");
    var braces = require_braces();
    var picomatch = require_picomatch2();
    var utils = require_utils2();
    var isEmptyString = (val) => val === "" || val === "./";
    var micromatch2 = (list, patterns, options8) => {
      patterns = [].concat(patterns);
      list = [].concat(list);
      let omit2 = /* @__PURE__ */ new Set();
      let keep = /* @__PURE__ */ new Set();
      let items = /* @__PURE__ */ new Set();
      let negatives = 0;
      let onResult = (state) => {
        items.add(state.output);
        if (options8 && options8.onResult) {
          options8.onResult(state);
        }
      };
      for (let i = 0; i < patterns.length; i++) {
        let isMatch = picomatch(String(patterns[i]), { ...options8, onResult }, true);
        let negated = isMatch.state.negated || isMatch.state.negatedExtglob;
        if (negated) negatives++;
        for (let item of list) {
          let matched = isMatch(item, true);
          let match = negated ? !matched.isMatch : matched.isMatch;
          if (!match) continue;
          if (negated) {
            omit2.add(matched.output);
          } else {
            omit2.delete(matched.output);
            keep.add(matched.output);
          }
        }
      }
      let result = negatives === patterns.length ? [...items] : [...keep];
      let matches = result.filter((item) => !omit2.has(item));
      if (options8 && matches.length === 0) {
        if (options8.failglob === true) {
          throw new Error(`No matches found for "${patterns.join(", ")}"`);
        }
        if (options8.nonull === true || options8.nullglob === true) {
          return options8.unescape ? patterns.map((p) => p.replace(/\\/g, "")) : patterns;
        }
      }
      return matches;
    };
    micromatch2.match = micromatch2;
    micromatch2.matcher = (pattern, options8) => picomatch(pattern, options8);
    micromatch2.isMatch = (str2, patterns, options8) => picomatch(patterns, options8)(str2);
    micromatch2.any = micromatch2.isMatch;
    micromatch2.not = (list, patterns, options8 = {}) => {
      patterns = [].concat(patterns).map(String);
      let result = /* @__PURE__ */ new Set();
      let items = [];
      let onResult = (state) => {
        if (options8.onResult) options8.onResult(state);
        items.push(state.output);
      };
      let matches = new Set(micromatch2(list, patterns, { ...options8, onResult }));
      for (let item of items) {
        if (!matches.has(item)) {
          result.add(item);
        }
      }
      return [...result];
    };
    micromatch2.contains = (str2, pattern, options8) => {
      if (typeof str2 !== "string") {
        throw new TypeError(`Expected a string: "${util2.inspect(str2)}"`);
      }
      if (Array.isArray(pattern)) {
        return pattern.some((p) => micromatch2.contains(str2, p, options8));
      }
      if (typeof pattern === "string") {
        if (isEmptyString(str2) || isEmptyString(pattern)) {
          return false;
        }
        if (str2.includes(pattern) || str2.startsWith("./") && str2.slice(2).includes(pattern)) {
          return true;
        }
      }
      return micromatch2.isMatch(str2, pattern, { ...options8, contains: true });
    };
    micromatch2.matchKeys = (obj, patterns, options8) => {
      if (!utils.isObject(obj)) {
        throw new TypeError("Expected the first argument to be an object");
      }
      let keys = micromatch2(Object.keys(obj), patterns, options8);
      let res = {};
      for (let key2 of keys) res[key2] = obj[key2];
      return res;
    };
    micromatch2.some = (list, patterns, options8) => {
      let items = [].concat(list);
      for (let pattern of [].concat(patterns)) {
        let isMatch = picomatch(String(pattern), options8);
        if (items.some((item) => isMatch(item))) {
          return true;
        }
      }
      return false;
    };
    micromatch2.every = (list, patterns, options8) => {
      let items = [].concat(list);
      for (let pattern of [].concat(patterns)) {
        let isMatch = picomatch(String(pattern), options8);
        if (!items.every((item) => isMatch(item))) {
          return false;
        }
      }
      return true;
    };
    micromatch2.all = (str2, patterns, options8) => {
      if (typeof str2 !== "string") {
        throw new TypeError(`Expected a string: "${util2.inspect(str2)}"`);
      }
      return [].concat(patterns).every((p) => picomatch(p, options8)(str2));
    };
    micromatch2.capture = (glob, input, options8) => {
      let posix = utils.isWindows(options8);
      let regex = picomatch.makeRe(String(glob), { ...options8, capture: true });
      let match = regex.exec(posix ? utils.toPosixSlashes(input) : input);
      if (match) {
        return match.slice(1).map((v) => v === void 0 ? "" : v);
      }
    };
    micromatch2.makeRe = (...args) => picomatch.makeRe(...args);
    micromatch2.scan = (...args) => picomatch.scan(...args);
    micromatch2.parse = (patterns, options8) => {
      let res = [];
      for (let pattern of [].concat(patterns || [])) {
        for (let str2 of braces(String(pattern), options8)) {
          res.push(picomatch.parse(str2, options8));
        }
      }
      return res;
    };
    micromatch2.braces = (pattern, options8) => {
      if (typeof pattern !== "string") throw new TypeError("Expected a string");
      if (options8 && options8.nobrace === true || !/\{.*\}/.test(pattern)) {
        return [pattern];
      }
      return braces(pattern, options8);
    };
    micromatch2.braceExpand = (pattern, options8) => {
      if (typeof pattern !== "string") throw new TypeError("Expected a string");
      return micromatch2.braces(pattern, { ...options8, expand: true });
    };
    module.exports = micromatch2;
  }
});

// node_modules/fast-glob/out/utils/pattern.js
var require_pattern = __commonJS({
  "node_modules/fast-glob/out/utils/pattern.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.removeDuplicateSlashes = exports.matchAny = exports.convertPatternsToRe = exports.makeRe = exports.getPatternParts = exports.expandBraceExpansion = exports.expandPatternsWithBraceExpansion = exports.isAffectDepthOfReadingPattern = exports.endsWithSlashGlobStar = exports.hasGlobStar = exports.getBaseDirectory = exports.isPatternRelatedToParentDirectory = exports.getPatternsOutsideCurrentDirectory = exports.getPatternsInsideCurrentDirectory = exports.getPositivePatterns = exports.getNegativePatterns = exports.isPositivePattern = exports.isNegativePattern = exports.convertToNegativePattern = exports.convertToPositivePattern = exports.isDynamicPattern = exports.isStaticPattern = void 0;
    var path13 = __require("path");
    var globParent = require_glob_parent();
    var micromatch2 = require_micromatch();
    var GLOBSTAR = "**";
    var ESCAPE_SYMBOL = "\\";
    var COMMON_GLOB_SYMBOLS_RE = /[*?]|^!/;
    var REGEX_CHARACTER_CLASS_SYMBOLS_RE = /\[[^[]*]/;
    var REGEX_GROUP_SYMBOLS_RE = /(?:^|[^!*+?@])\([^(]*\|[^|]*\)/;
    var GLOB_EXTENSION_SYMBOLS_RE = /[!*+?@]\([^(]*\)/;
    var BRACE_EXPANSION_SEPARATORS_RE = /,|\.\./;
    var DOUBLE_SLASH_RE = /(?!^)\/{2,}/g;
    function isStaticPattern(pattern, options8 = {}) {
      return !isDynamicPattern(pattern, options8);
    }
    exports.isStaticPattern = isStaticPattern;
    function isDynamicPattern(pattern, options8 = {}) {
      if (pattern === "") {
        return false;
      }
      if (options8.caseSensitiveMatch === false || pattern.includes(ESCAPE_SYMBOL)) {
        return true;
      }
      if (COMMON_GLOB_SYMBOLS_RE.test(pattern) || REGEX_CHARACTER_CLASS_SYMBOLS_RE.test(pattern) || REGEX_GROUP_SYMBOLS_RE.test(pattern)) {
        return true;
      }
      if (options8.extglob !== false && GLOB_EXTENSION_SYMBOLS_RE.test(pattern)) {
        return true;
      }
      if (options8.braceExpansion !== false && hasBraceExpansion(pattern)) {
        return true;
      }
      return false;
    }
    exports.isDynamicPattern = isDynamicPattern;
    function hasBraceExpansion(pattern) {
      const openingBraceIndex = pattern.indexOf("{");
      if (openingBraceIndex === -1) {
        return false;
      }
      const closingBraceIndex = pattern.indexOf("}", openingBraceIndex + 1);
      if (closingBraceIndex === -1) {
        return false;
      }
      const braceContent = pattern.slice(openingBraceIndex, closingBraceIndex);
      return BRACE_EXPANSION_SEPARATORS_RE.test(braceContent);
    }
    function convertToPositivePattern(pattern) {
      return isNegativePattern(pattern) ? pattern.slice(1) : pattern;
    }
    exports.convertToPositivePattern = convertToPositivePattern;
    function convertToNegativePattern(pattern) {
      return "!" + pattern;
    }
    exports.convertToNegativePattern = convertToNegativePattern;
    function isNegativePattern(pattern) {
      return pattern.startsWith("!") && pattern[1] !== "(";
    }
    exports.isNegativePattern = isNegativePattern;
    function isPositivePattern(pattern) {
      return !isNegativePattern(pattern);
    }
    exports.isPositivePattern = isPositivePattern;
    function getNegativePatterns(patterns) {
      return patterns.filter(isNegativePattern);
    }
    exports.getNegativePatterns = getNegativePatterns;
    function getPositivePatterns(patterns) {
      return patterns.filter(isPositivePattern);
    }
    exports.getPositivePatterns = getPositivePatterns;
    function getPatternsInsideCurrentDirectory(patterns) {
      return patterns.filter((pattern) => !isPatternRelatedToParentDirectory(pattern));
    }
    exports.getPatternsInsideCurrentDirectory = getPatternsInsideCurrentDirectory;
    function getPatternsOutsideCurrentDirectory(patterns) {
      return patterns.filter(isPatternRelatedToParentDirectory);
    }
    exports.getPatternsOutsideCurrentDirectory = getPatternsOutsideCurrentDirectory;
    function isPatternRelatedToParentDirectory(pattern) {
      return pattern.startsWith("..") || pattern.startsWith("./..");
    }
    exports.isPatternRelatedToParentDirectory = isPatternRelatedToParentDirectory;
    function getBaseDirectory(pattern) {
      return globParent(pattern, { flipBackslashes: false });
    }
    exports.getBaseDirectory = getBaseDirectory;
    function hasGlobStar(pattern) {
      return pattern.includes(GLOBSTAR);
    }
    exports.hasGlobStar = hasGlobStar;
    function endsWithSlashGlobStar(pattern) {
      return pattern.endsWith("/" + GLOBSTAR);
    }
    exports.endsWithSlashGlobStar = endsWithSlashGlobStar;
    function isAffectDepthOfReadingPattern(pattern) {
      const basename = path13.basename(pattern);
      return endsWithSlashGlobStar(pattern) || isStaticPattern(basename);
    }
    exports.isAffectDepthOfReadingPattern = isAffectDepthOfReadingPattern;
    function expandPatternsWithBraceExpansion(patterns) {
      return patterns.reduce((collection, pattern) => {
        return collection.concat(expandBraceExpansion(pattern));
      }, []);
    }
    exports.expandPatternsWithBraceExpansion = expandPatternsWithBraceExpansion;
    function expandBraceExpansion(pattern) {
      const patterns = micromatch2.braces(pattern, { expand: true, nodupes: true, keepEscaping: true });
      patterns.sort((a, b) => a.length - b.length);
      return patterns.filter((pattern2) => pattern2 !== "");
    }
    exports.expandBraceExpansion = expandBraceExpansion;
    function getPatternParts(pattern, options8) {
      let { parts } = micromatch2.scan(pattern, Object.assign(Object.assign({}, options8), { parts: true }));
      if (parts.length === 0) {
        parts = [pattern];
      }
      if (parts[0].startsWith("/")) {
        parts[0] = parts[0].slice(1);
        parts.unshift("");
      }
      return parts;
    }
    exports.getPatternParts = getPatternParts;
    function makeRe(pattern, options8) {
      return micromatch2.makeRe(pattern, options8);
    }
    exports.makeRe = makeRe;
    function convertPatternsToRe(patterns, options8) {
      return patterns.map((pattern) => makeRe(pattern, options8));
    }
    exports.convertPatternsToRe = convertPatternsToRe;
    function matchAny(entry, patternsRe) {
      return patternsRe.some((patternRe) => patternRe.test(entry));
    }
    exports.matchAny = matchAny;
    function removeDuplicateSlashes(pattern) {
      return pattern.replace(DOUBLE_SLASH_RE, "/");
    }
    exports.removeDuplicateSlashes = removeDuplicateSlashes;
  }
});

// node_modules/merge2/index.js
var require_merge2 = __commonJS({
  "node_modules/merge2/index.js"(exports, module) {
    "use strict";
    var Stream = __require("stream");
    var PassThrough = Stream.PassThrough;
    var slice = Array.prototype.slice;
    module.exports = merge2;
    function merge2() {
      const streamsQueue = [];
      const args = slice.call(arguments);
      let merging = false;
      let options8 = args[args.length - 1];
      if (options8 && !Array.isArray(options8) && options8.pipe == null) {
        args.pop();
      } else {
        options8 = {};
      }
      const doEnd = options8.end !== false;
      const doPipeError = options8.pipeError === true;
      if (options8.objectMode == null) {
        options8.objectMode = true;
      }
      if (options8.highWaterMark == null) {
        options8.highWaterMark = 64 * 1024;
      }
      const mergedStream = PassThrough(options8);
      function addStream() {
        for (let i = 0, len = arguments.length; i < len; i++) {
          streamsQueue.push(pauseStreams(arguments[i], options8));
        }
        mergeStream();
        return this;
      }
      function mergeStream() {
        if (merging) {
          return;
        }
        merging = true;
        let streams = streamsQueue.shift();
        if (!streams) {
          process.nextTick(endStream);
          return;
        }
        if (!Array.isArray(streams)) {
          streams = [streams];
        }
        let pipesCount = streams.length + 1;
        function next() {
          if (--pipesCount > 0) {
            return;
          }
          merging = false;
          mergeStream();
        }
        function pipe(stream) {
          function onend() {
            stream.removeListener("merge2UnpipeEnd", onend);
            stream.removeListener("end", onend);
            if (doPipeError) {
              stream.removeListener("error", onerror);
            }
            next();
          }
          function onerror(err) {
            mergedStream.emit("error", err);
          }
          if (stream._readableState.endEmitted) {
            return next();
          }
          stream.on("merge2UnpipeEnd", onend);
          stream.on("end", onend);
          if (doPipeError) {
            stream.on("error", onerror);
          }
          stream.pipe(mergedStream, { end: false });
          stream.resume();
        }
        for (let i = 0; i < streams.length; i++) {
          pipe(streams[i]);
        }
        next();
      }
      function endStream() {
        merging = false;
        mergedStream.emit("queueDrain");
        if (doEnd) {
          mergedStream.end();
        }
      }
      mergedStream.setMaxListeners(0);
      mergedStream.add = addStream;
      mergedStream.on("unpipe", function(stream) {
        stream.emit("merge2UnpipeEnd");
      });
      if (args.length) {
        addStream.apply(null, args);
      }
      return mergedStream;
    }
    function pauseStreams(streams, options8) {
      if (!Array.isArray(streams)) {
        if (!streams._readableState && streams.pipe) {
          streams = streams.pipe(PassThrough(options8));
        }
        if (!streams._readableState || !streams.pause || !streams.pipe) {
          throw new Error("Only readable stream can be merged.");
        }
        streams.pause();
      } else {
        for (let i = 0, len = streams.length; i < len; i++) {
          streams[i] = pauseStreams(streams[i], options8);
        }
      }
      return streams;
    }
  }
});

// node_modules/fast-glob/out/utils/stream.js
var require_stream = __commonJS({
  "node_modules/fast-glob/out/utils/stream.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.merge = void 0;
    var merge2 = require_merge2();
    function merge3(streams) {
      const mergedStream = merge2(streams);
      streams.forEach((stream) => {
        stream.once("error", (error) => mergedStream.emit("error", error));
      });
      mergedStream.once("close", () => propagateCloseEventToSources(streams));
      mergedStream.once("end", () => propagateCloseEventToSources(streams));
      return mergedStream;
    }
    exports.merge = merge3;
    function propagateCloseEventToSources(streams) {
      streams.forEach((stream) => stream.emit("close"));
    }
  }
});

// node_modules/fast-glob/out/utils/string.js
var require_string = __commonJS({
  "node_modules/fast-glob/out/utils/string.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.isEmpty = exports.isString = void 0;
    function isString(input) {
      return typeof input === "string";
    }
    exports.isString = isString;
    function isEmpty(input) {
      return input === "";
    }
    exports.isEmpty = isEmpty;
  }
});

// node_modules/fast-glob/out/utils/index.js
var require_utils3 = __commonJS({
  "node_modules/fast-glob/out/utils/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.string = exports.stream = exports.pattern = exports.path = exports.fs = exports.errno = exports.array = void 0;
    var array2 = require_array();
    exports.array = array2;
    var errno = require_errno();
    exports.errno = errno;
    var fs7 = require_fs();
    exports.fs = fs7;
    var path13 = require_path();
    exports.path = path13;
    var pattern = require_pattern();
    exports.pattern = pattern;
    var stream = require_stream();
    exports.stream = stream;
    var string = require_string();
    exports.string = string;
  }
});

// node_modules/fast-glob/out/managers/tasks.js
var require_tasks = __commonJS({
  "node_modules/fast-glob/out/managers/tasks.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.convertPatternGroupToTask = exports.convertPatternGroupsToTasks = exports.groupPatternsByBaseDirectory = exports.getNegativePatternsAsPositive = exports.getPositivePatterns = exports.convertPatternsToTasks = exports.generate = void 0;
    var utils = require_utils3();
    function generate(input, settings) {
      const patterns = processPatterns(input, settings);
      const ignore = processPatterns(settings.ignore, settings);
      const positivePatterns = getPositivePatterns(patterns);
      const negativePatterns = getNegativePatternsAsPositive(patterns, ignore);
      const staticPatterns = positivePatterns.filter((pattern) => utils.pattern.isStaticPattern(pattern, settings));
      const dynamicPatterns = positivePatterns.filter((pattern) => utils.pattern.isDynamicPattern(pattern, settings));
      const staticTasks = convertPatternsToTasks(
        staticPatterns,
        negativePatterns,
        /* dynamic */
        false
      );
      const dynamicTasks = convertPatternsToTasks(
        dynamicPatterns,
        negativePatterns,
        /* dynamic */
        true
      );
      return staticTasks.concat(dynamicTasks);
    }
    exports.generate = generate;
    function processPatterns(input, settings) {
      let patterns = input;
      if (settings.braceExpansion) {
        patterns = utils.pattern.expandPatternsWithBraceExpansion(patterns);
      }
      if (settings.baseNameMatch) {
        patterns = patterns.map((pattern) => pattern.includes("/") ? pattern : `**/${pattern}`);
      }
      return patterns.map((pattern) => utils.pattern.removeDuplicateSlashes(pattern));
    }
    function convertPatternsToTasks(positive, negative, dynamic) {
      const tasks = [];
      const patternsOutsideCurrentDirectory = utils.pattern.getPatternsOutsideCurrentDirectory(positive);
      const patternsInsideCurrentDirectory = utils.pattern.getPatternsInsideCurrentDirectory(positive);
      const outsideCurrentDirectoryGroup = groupPatternsByBaseDirectory(patternsOutsideCurrentDirectory);
      const insideCurrentDirectoryGroup = groupPatternsByBaseDirectory(patternsInsideCurrentDirectory);
      tasks.push(...convertPatternGroupsToTasks(outsideCurrentDirectoryGroup, negative, dynamic));
      if ("." in insideCurrentDirectoryGroup) {
        tasks.push(convertPatternGroupToTask(".", patternsInsideCurrentDirectory, negative, dynamic));
      } else {
        tasks.push(...convertPatternGroupsToTasks(insideCurrentDirectoryGroup, negative, dynamic));
      }
      return tasks;
    }
    exports.convertPatternsToTasks = convertPatternsToTasks;
    function getPositivePatterns(patterns) {
      return utils.pattern.getPositivePatterns(patterns);
    }
    exports.getPositivePatterns = getPositivePatterns;
    function getNegativePatternsAsPositive(patterns, ignore) {
      const negative = utils.pattern.getNegativePatterns(patterns).concat(ignore);
      const positive = negative.map(utils.pattern.convertToPositivePattern);
      return positive;
    }
    exports.getNegativePatternsAsPositive = getNegativePatternsAsPositive;
    function groupPatternsByBaseDirectory(patterns) {
      const group = {};
      return patterns.reduce((collection, pattern) => {
        const base = utils.pattern.getBaseDirectory(pattern);
        if (base in collection) {
          collection[base].push(pattern);
        } else {
          collection[base] = [pattern];
        }
        return collection;
      }, group);
    }
    exports.groupPatternsByBaseDirectory = groupPatternsByBaseDirectory;
    function convertPatternGroupsToTasks(positive, negative, dynamic) {
      return Object.keys(positive).map((base) => {
        return convertPatternGroupToTask(base, positive[base], negative, dynamic);
      });
    }
    exports.convertPatternGroupsToTasks = convertPatternGroupsToTasks;
    function convertPatternGroupToTask(base, positive, negative, dynamic) {
      return {
        dynamic,
        positive,
        negative,
        base,
        patterns: [].concat(positive, negative.map(utils.pattern.convertToNegativePattern))
      };
    }
    exports.convertPatternGroupToTask = convertPatternGroupToTask;
  }
});

// node_modules/@nodelib/fs.stat/out/providers/async.js
var require_async = __commonJS({
  "node_modules/@nodelib/fs.stat/out/providers/async.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.read = void 0;
    function read3(path13, settings, callback) {
      settings.fs.lstat(path13, (lstatError, lstat) => {
        if (lstatError !== null) {
          callFailureCallback(callback, lstatError);
          return;
        }
        if (!lstat.isSymbolicLink() || !settings.followSymbolicLink) {
          callSuccessCallback(callback, lstat);
          return;
        }
        settings.fs.stat(path13, (statError, stat) => {
          if (statError !== null) {
            if (settings.throwErrorOnBrokenSymbolicLink) {
              callFailureCallback(callback, statError);
              return;
            }
            callSuccessCallback(callback, lstat);
            return;
          }
          if (settings.markSymbolicLink) {
            stat.isSymbolicLink = () => true;
          }
          callSuccessCallback(callback, stat);
        });
      });
    }
    exports.read = read3;
    function callFailureCallback(callback, error) {
      callback(error);
    }
    function callSuccessCallback(callback, result) {
      callback(null, result);
    }
  }
});

// node_modules/@nodelib/fs.stat/out/providers/sync.js
var require_sync = __commonJS({
  "node_modules/@nodelib/fs.stat/out/providers/sync.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.read = void 0;
    function read3(path13, settings) {
      const lstat = settings.fs.lstatSync(path13);
      if (!lstat.isSymbolicLink() || !settings.followSymbolicLink) {
        return lstat;
      }
      try {
        const stat = settings.fs.statSync(path13);
        if (settings.markSymbolicLink) {
          stat.isSymbolicLink = () => true;
        }
        return stat;
      } catch (error) {
        if (!settings.throwErrorOnBrokenSymbolicLink) {
          return lstat;
        }
        throw error;
      }
    }
    exports.read = read3;
  }
});

// node_modules/@nodelib/fs.stat/out/adapters/fs.js
var require_fs2 = __commonJS({
  "node_modules/@nodelib/fs.stat/out/adapters/fs.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createFileSystemAdapter = exports.FILE_SYSTEM_ADAPTER = void 0;
    var fs7 = __require("fs");
    exports.FILE_SYSTEM_ADAPTER = {
      lstat: fs7.lstat,
      stat: fs7.stat,
      lstatSync: fs7.lstatSync,
      statSync: fs7.statSync
    };
    function createFileSystemAdapter(fsMethods) {
      if (fsMethods === void 0) {
        return exports.FILE_SYSTEM_ADAPTER;
      }
      return Object.assign(Object.assign({}, exports.FILE_SYSTEM_ADAPTER), fsMethods);
    }
    exports.createFileSystemAdapter = createFileSystemAdapter;
  }
});

// node_modules/@nodelib/fs.stat/out/settings.js
var require_settings = __commonJS({
  "node_modules/@nodelib/fs.stat/out/settings.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var fs7 = require_fs2();
    var Settings = class {
      constructor(_options = {}) {
        this._options = _options;
        this.followSymbolicLink = this._getValue(this._options.followSymbolicLink, true);
        this.fs = fs7.createFileSystemAdapter(this._options.fs);
        this.markSymbolicLink = this._getValue(this._options.markSymbolicLink, false);
        this.throwErrorOnBrokenSymbolicLink = this._getValue(this._options.throwErrorOnBrokenSymbolicLink, true);
      }
      _getValue(option, value) {
        return option !== null && option !== void 0 ? option : value;
      }
    };
    exports.default = Settings;
  }
});

// node_modules/@nodelib/fs.stat/out/index.js
var require_out = __commonJS({
  "node_modules/@nodelib/fs.stat/out/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.statSync = exports.stat = exports.Settings = void 0;
    var async = require_async();
    var sync = require_sync();
    var settings_1 = require_settings();
    exports.Settings = settings_1.default;
    function stat(path13, optionsOrSettingsOrCallback, callback) {
      if (typeof optionsOrSettingsOrCallback === "function") {
        async.read(path13, getSettings(), optionsOrSettingsOrCallback);
        return;
      }
      async.read(path13, getSettings(optionsOrSettingsOrCallback), callback);
    }
    exports.stat = stat;
    function statSync2(path13, optionsOrSettings) {
      const settings = getSettings(optionsOrSettings);
      return sync.read(path13, settings);
    }
    exports.statSync = statSync2;
    function getSettings(settingsOrOptions = {}) {
      if (settingsOrOptions instanceof settings_1.default) {
        return settingsOrOptions;
      }
      return new settings_1.default(settingsOrOptions);
    }
  }
});

// node_modules/queue-microtask/index.js
var require_queue_microtask = __commonJS({
  "node_modules/queue-microtask/index.js"(exports, module) {
    var promise;
    module.exports = typeof queueMicrotask === "function" ? queueMicrotask.bind(typeof window !== "undefined" ? window : global) : (cb) => (promise || (promise = Promise.resolve())).then(cb).catch((err) => setTimeout(() => {
      throw err;
    }, 0));
  }
});

// node_modules/run-parallel/index.js
var require_run_parallel = __commonJS({
  "node_modules/run-parallel/index.js"(exports, module) {
    module.exports = runParallel;
    var queueMicrotask2 = require_queue_microtask();
    function runParallel(tasks, cb) {
      let results, pending, keys;
      let isSync = true;
      if (Array.isArray(tasks)) {
        results = [];
        pending = tasks.length;
      } else {
        keys = Object.keys(tasks);
        results = {};
        pending = keys.length;
      }
      function done(err) {
        function end() {
          if (cb) cb(err, results);
          cb = null;
        }
        if (isSync) queueMicrotask2(end);
        else end();
      }
      function each(i, err, result) {
        results[i] = result;
        if (--pending === 0 || err) {
          done(err);
        }
      }
      if (!pending) {
        done(null);
      } else if (keys) {
        keys.forEach(function(key2) {
          tasks[key2](function(err, result) {
            each(key2, err, result);
          });
        });
      } else {
        tasks.forEach(function(task, i) {
          task(function(err, result) {
            each(i, err, result);
          });
        });
      }
      isSync = false;
    }
  }
});

// node_modules/@nodelib/fs.scandir/out/constants.js
var require_constants3 = __commonJS({
  "node_modules/@nodelib/fs.scandir/out/constants.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.IS_SUPPORT_READDIR_WITH_FILE_TYPES = void 0;
    var NODE_PROCESS_VERSION_PARTS = process.versions.node.split(".");
    if (NODE_PROCESS_VERSION_PARTS[0] === void 0 || NODE_PROCESS_VERSION_PARTS[1] === void 0) {
      throw new Error(`Unexpected behavior. The 'process.versions.node' variable has invalid value: ${process.versions.node}`);
    }
    var MAJOR_VERSION = Number.parseInt(NODE_PROCESS_VERSION_PARTS[0], 10);
    var MINOR_VERSION = Number.parseInt(NODE_PROCESS_VERSION_PARTS[1], 10);
    var SUPPORTED_MAJOR_VERSION = 10;
    var SUPPORTED_MINOR_VERSION = 10;
    var IS_MATCHED_BY_MAJOR = MAJOR_VERSION > SUPPORTED_MAJOR_VERSION;
    var IS_MATCHED_BY_MAJOR_AND_MINOR = MAJOR_VERSION === SUPPORTED_MAJOR_VERSION && MINOR_VERSION >= SUPPORTED_MINOR_VERSION;
    exports.IS_SUPPORT_READDIR_WITH_FILE_TYPES = IS_MATCHED_BY_MAJOR || IS_MATCHED_BY_MAJOR_AND_MINOR;
  }
});

// node_modules/@nodelib/fs.scandir/out/utils/fs.js
var require_fs3 = __commonJS({
  "node_modules/@nodelib/fs.scandir/out/utils/fs.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createDirentFromStats = void 0;
    var DirentFromStats = class {
      constructor(name, stats) {
        this.name = name;
        this.isBlockDevice = stats.isBlockDevice.bind(stats);
        this.isCharacterDevice = stats.isCharacterDevice.bind(stats);
        this.isDirectory = stats.isDirectory.bind(stats);
        this.isFIFO = stats.isFIFO.bind(stats);
        this.isFile = stats.isFile.bind(stats);
        this.isSocket = stats.isSocket.bind(stats);
        this.isSymbolicLink = stats.isSymbolicLink.bind(stats);
      }
    };
    function createDirentFromStats(name, stats) {
      return new DirentFromStats(name, stats);
    }
    exports.createDirentFromStats = createDirentFromStats;
  }
});

// node_modules/@nodelib/fs.scandir/out/utils/index.js
var require_utils4 = __commonJS({
  "node_modules/@nodelib/fs.scandir/out/utils/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.fs = void 0;
    var fs7 = require_fs3();
    exports.fs = fs7;
  }
});

// node_modules/@nodelib/fs.scandir/out/providers/common.js
var require_common = __commonJS({
  "node_modules/@nodelib/fs.scandir/out/providers/common.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.joinPathSegments = void 0;
    function joinPathSegments(a, b, separator) {
      if (a.endsWith(separator)) {
        return a + b;
      }
      return a + separator + b;
    }
    exports.joinPathSegments = joinPathSegments;
  }
});

// node_modules/@nodelib/fs.scandir/out/providers/async.js
var require_async2 = __commonJS({
  "node_modules/@nodelib/fs.scandir/out/providers/async.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.readdir = exports.readdirWithFileTypes = exports.read = void 0;
    var fsStat = require_out();
    var rpl = require_run_parallel();
    var constants_1 = require_constants3();
    var utils = require_utils4();
    var common2 = require_common();
    function read3(directory, settings, callback) {
      if (!settings.stats && constants_1.IS_SUPPORT_READDIR_WITH_FILE_TYPES) {
        readdirWithFileTypes(directory, settings, callback);
        return;
      }
      readdir(directory, settings, callback);
    }
    exports.read = read3;
    function readdirWithFileTypes(directory, settings, callback) {
      settings.fs.readdir(directory, { withFileTypes: true }, (readdirError, dirents) => {
        if (readdirError !== null) {
          callFailureCallback(callback, readdirError);
          return;
        }
        const entries = dirents.map((dirent) => ({
          dirent,
          name: dirent.name,
          path: common2.joinPathSegments(directory, dirent.name, settings.pathSegmentSeparator)
        }));
        if (!settings.followSymbolicLinks) {
          callSuccessCallback(callback, entries);
          return;
        }
        const tasks = entries.map((entry) => makeRplTaskEntry(entry, settings));
        rpl(tasks, (rplError, rplEntries) => {
          if (rplError !== null) {
            callFailureCallback(callback, rplError);
            return;
          }
          callSuccessCallback(callback, rplEntries);
        });
      });
    }
    exports.readdirWithFileTypes = readdirWithFileTypes;
    function makeRplTaskEntry(entry, settings) {
      return (done) => {
        if (!entry.dirent.isSymbolicLink()) {
          done(null, entry);
          return;
        }
        settings.fs.stat(entry.path, (statError, stats) => {
          if (statError !== null) {
            if (settings.throwErrorOnBrokenSymbolicLink) {
              done(statError);
              return;
            }
            done(null, entry);
            return;
          }
          entry.dirent = utils.fs.createDirentFromStats(entry.name, stats);
          done(null, entry);
        });
      };
    }
    function readdir(directory, settings, callback) {
      settings.fs.readdir(directory, (readdirError, names) => {
        if (readdirError !== null) {
          callFailureCallback(callback, readdirError);
          return;
        }
        const tasks = names.map((name) => {
          const path13 = common2.joinPathSegments(directory, name, settings.pathSegmentSeparator);
          return (done) => {
            fsStat.stat(path13, settings.fsStatSettings, (error, stats) => {
              if (error !== null) {
                done(error);
                return;
              }
              const entry = {
                name,
                path: path13,
                dirent: utils.fs.createDirentFromStats(name, stats)
              };
              if (settings.stats) {
                entry.stats = stats;
              }
              done(null, entry);
            });
          };
        });
        rpl(tasks, (rplError, entries) => {
          if (rplError !== null) {
            callFailureCallback(callback, rplError);
            return;
          }
          callSuccessCallback(callback, entries);
        });
      });
    }
    exports.readdir = readdir;
    function callFailureCallback(callback, error) {
      callback(error);
    }
    function callSuccessCallback(callback, result) {
      callback(null, result);
    }
  }
});

// node_modules/@nodelib/fs.scandir/out/providers/sync.js
var require_sync2 = __commonJS({
  "node_modules/@nodelib/fs.scandir/out/providers/sync.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.readdir = exports.readdirWithFileTypes = exports.read = void 0;
    var fsStat = require_out();
    var constants_1 = require_constants3();
    var utils = require_utils4();
    var common2 = require_common();
    function read3(directory, settings) {
      if (!settings.stats && constants_1.IS_SUPPORT_READDIR_WITH_FILE_TYPES) {
        return readdirWithFileTypes(directory, settings);
      }
      return readdir(directory, settings);
    }
    exports.read = read3;
    function readdirWithFileTypes(directory, settings) {
      const dirents = settings.fs.readdirSync(directory, { withFileTypes: true });
      return dirents.map((dirent) => {
        const entry = {
          dirent,
          name: dirent.name,
          path: common2.joinPathSegments(directory, dirent.name, settings.pathSegmentSeparator)
        };
        if (entry.dirent.isSymbolicLink() && settings.followSymbolicLinks) {
          try {
            const stats = settings.fs.statSync(entry.path);
            entry.dirent = utils.fs.createDirentFromStats(entry.name, stats);
          } catch (error) {
            if (settings.throwErrorOnBrokenSymbolicLink) {
              throw error;
            }
          }
        }
        return entry;
      });
    }
    exports.readdirWithFileTypes = readdirWithFileTypes;
    function readdir(directory, settings) {
      const names = settings.fs.readdirSync(directory);
      return names.map((name) => {
        const entryPath = common2.joinPathSegments(directory, name, settings.pathSegmentSeparator);
        const stats = fsStat.statSync(entryPath, settings.fsStatSettings);
        const entry = {
          name,
          path: entryPath,
          dirent: utils.fs.createDirentFromStats(name, stats)
        };
        if (settings.stats) {
          entry.stats = stats;
        }
        return entry;
      });
    }
    exports.readdir = readdir;
  }
});

// node_modules/@nodelib/fs.scandir/out/adapters/fs.js
var require_fs4 = __commonJS({
  "node_modules/@nodelib/fs.scandir/out/adapters/fs.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createFileSystemAdapter = exports.FILE_SYSTEM_ADAPTER = void 0;
    var fs7 = __require("fs");
    exports.FILE_SYSTEM_ADAPTER = {
      lstat: fs7.lstat,
      stat: fs7.stat,
      lstatSync: fs7.lstatSync,
      statSync: fs7.statSync,
      readdir: fs7.readdir,
      readdirSync: fs7.readdirSync
    };
    function createFileSystemAdapter(fsMethods) {
      if (fsMethods === void 0) {
        return exports.FILE_SYSTEM_ADAPTER;
      }
      return Object.assign(Object.assign({}, exports.FILE_SYSTEM_ADAPTER), fsMethods);
    }
    exports.createFileSystemAdapter = createFileSystemAdapter;
  }
});

// node_modules/@nodelib/fs.scandir/out/settings.js
var require_settings2 = __commonJS({
  "node_modules/@nodelib/fs.scandir/out/settings.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path13 = __require("path");
    var fsStat = require_out();
    var fs7 = require_fs4();
    var Settings = class {
      constructor(_options = {}) {
        this._options = _options;
        this.followSymbolicLinks = this._getValue(this._options.followSymbolicLinks, false);
        this.fs = fs7.createFileSystemAdapter(this._options.fs);
        this.pathSegmentSeparator = this._getValue(this._options.pathSegmentSeparator, path13.sep);
        this.stats = this._getValue(this._options.stats, false);
        this.throwErrorOnBrokenSymbolicLink = this._getValue(this._options.throwErrorOnBrokenSymbolicLink, true);
        this.fsStatSettings = new fsStat.Settings({
          followSymbolicLink: this.followSymbolicLinks,
          fs: this.fs,
          throwErrorOnBrokenSymbolicLink: this.throwErrorOnBrokenSymbolicLink
        });
      }
      _getValue(option, value) {
        return option !== null && option !== void 0 ? option : value;
      }
    };
    exports.default = Settings;
  }
});

// node_modules/@nodelib/fs.scandir/out/index.js
var require_out2 = __commonJS({
  "node_modules/@nodelib/fs.scandir/out/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Settings = exports.scandirSync = exports.scandir = void 0;
    var async = require_async2();
    var sync = require_sync2();
    var settings_1 = require_settings2();
    exports.Settings = settings_1.default;
    function scandir(path13, optionsOrSettingsOrCallback, callback) {
      if (typeof optionsOrSettingsOrCallback === "function") {
        async.read(path13, getSettings(), optionsOrSettingsOrCallback);
        return;
      }
      async.read(path13, getSettings(optionsOrSettingsOrCallback), callback);
    }
    exports.scandir = scandir;
    function scandirSync(path13, optionsOrSettings) {
      const settings = getSettings(optionsOrSettings);
      return sync.read(path13, settings);
    }
    exports.scandirSync = scandirSync;
    function getSettings(settingsOrOptions = {}) {
      if (settingsOrOptions instanceof settings_1.default) {
        return settingsOrOptions;
      }
      return new settings_1.default(settingsOrOptions);
    }
  }
});

// node_modules/reusify/reusify.js
var require_reusify = __commonJS({
  "node_modules/reusify/reusify.js"(exports, module) {
    "use strict";
    function reusify(Constructor) {
      var head = new Constructor();
      var tail = head;
      function get() {
        var current = head;
        if (current.next) {
          head = current.next;
        } else {
          head = new Constructor();
          tail = head;
        }
        current.next = null;
        return current;
      }
      function release(obj) {
        tail.next = obj;
        tail = obj;
      }
      return {
        get,
        release
      };
    }
    module.exports = reusify;
  }
});

// node_modules/fastq/queue.js
var require_queue = __commonJS({
  "node_modules/fastq/queue.js"(exports, module) {
    "use strict";
    var reusify = require_reusify();
    function fastqueue(context, worker, _concurrency) {
      if (typeof context === "function") {
        _concurrency = worker;
        worker = context;
        context = null;
      }
      if (!(_concurrency >= 1)) {
        throw new Error("fastqueue concurrency must be equal to or greater than 1");
      }
      var cache3 = reusify(Task);
      var queueHead = null;
      var queueTail = null;
      var _running = 0;
      var errorHandler = null;
      var self = {
        push: push2,
        drain: noop2,
        saturated: noop2,
        pause,
        paused: false,
        get concurrency() {
          return _concurrency;
        },
        set concurrency(value) {
          if (!(value >= 1)) {
            throw new Error("fastqueue concurrency must be equal to or greater than 1");
          }
          _concurrency = value;
          if (self.paused) return;
          for (; queueHead && _running < _concurrency; ) {
            _running++;
            release();
          }
        },
        running,
        resume,
        idle,
        length,
        getQueue,
        unshift,
        empty: noop2,
        kill,
        killAndDrain,
        error
      };
      return self;
      function running() {
        return _running;
      }
      function pause() {
        self.paused = true;
      }
      function length() {
        var current = queueHead;
        var counter = 0;
        while (current) {
          current = current.next;
          counter++;
        }
        return counter;
      }
      function getQueue() {
        var current = queueHead;
        var tasks = [];
        while (current) {
          tasks.push(current.value);
          current = current.next;
        }
        return tasks;
      }
      function resume() {
        if (!self.paused) return;
        self.paused = false;
        if (queueHead === null) {
          _running++;
          release();
          return;
        }
        for (; queueHead && _running < _concurrency; ) {
          _running++;
          release();
        }
      }
      function idle() {
        return _running === 0 && self.length() === 0;
      }
      function push2(value, done) {
        var current = cache3.get();
        current.context = context;
        current.release = release;
        current.value = value;
        current.callback = done || noop2;
        current.errorHandler = errorHandler;
        if (_running >= _concurrency || self.paused) {
          if (queueTail) {
            queueTail.next = current;
            queueTail = current;
          } else {
            queueHead = current;
            queueTail = current;
            self.saturated();
          }
        } else {
          _running++;
          worker.call(context, current.value, current.worked);
        }
      }
      function unshift(value, done) {
        var current = cache3.get();
        current.context = context;
        current.release = release;
        current.value = value;
        current.callback = done || noop2;
        current.errorHandler = errorHandler;
        if (_running >= _concurrency || self.paused) {
          if (queueHead) {
            current.next = queueHead;
            queueHead = current;
          } else {
            queueHead = current;
            queueTail = current;
            self.saturated();
          }
        } else {
          _running++;
          worker.call(context, current.value, current.worked);
        }
      }
      function release(holder) {
        if (holder) {
          cache3.release(holder);
        }
        var next = queueHead;
        if (next && _running <= _concurrency) {
          if (!self.paused) {
            if (queueTail === queueHead) {
              queueTail = null;
            }
            queueHead = next.next;
            next.next = null;
            worker.call(context, next.value, next.worked);
            if (queueTail === null) {
              self.empty();
            }
          } else {
            _running--;
          }
        } else if (--_running === 0) {
          self.drain();
        }
      }
      function kill() {
        queueHead = null;
        queueTail = null;
        self.drain = noop2;
      }
      function killAndDrain() {
        queueHead = null;
        queueTail = null;
        self.drain();
        self.drain = noop2;
      }
      function error(handler) {
        errorHandler = handler;
      }
    }
    function noop2() {
    }
    function Task() {
      this.value = null;
      this.callback = noop2;
      this.next = null;
      this.release = noop2;
      this.context = null;
      this.errorHandler = null;
      var self = this;
      this.worked = function worked(err, result) {
        var callback = self.callback;
        var errorHandler = self.errorHandler;
        var val = self.value;
        self.value = null;
        self.callback = noop2;
        if (self.errorHandler) {
          errorHandler(err, val);
        }
        callback.call(self.context, err, result);
        self.release(self);
      };
    }
    function queueAsPromised(context, worker, _concurrency) {
      if (typeof context === "function") {
        _concurrency = worker;
        worker = context;
        context = null;
      }
      function asyncWrapper(arg, cb) {
        worker.call(this, arg).then(function(res) {
          cb(null, res);
        }, cb);
      }
      var queue = fastqueue(context, asyncWrapper, _concurrency);
      var pushCb = queue.push;
      var unshiftCb = queue.unshift;
      queue.push = push2;
      queue.unshift = unshift;
      queue.drained = drained;
      return queue;
      function push2(value) {
        var p = new Promise(function(resolve3, reject) {
          pushCb(value, function(err, result) {
            if (err) {
              reject(err);
              return;
            }
            resolve3(result);
          });
        });
        p.catch(noop2);
        return p;
      }
      function unshift(value) {
        var p = new Promise(function(resolve3, reject) {
          unshiftCb(value, function(err, result) {
            if (err) {
              reject(err);
              return;
            }
            resolve3(result);
          });
        });
        p.catch(noop2);
        return p;
      }
      function drained() {
        if (queue.idle()) {
          return new Promise(function(resolve3) {
            resolve3();
          });
        }
        var previousDrain = queue.drain;
        var p = new Promise(function(resolve3) {
          queue.drain = function() {
            previousDrain();
            resolve3();
          };
        });
        return p;
      }
    }
    module.exports = fastqueue;
    module.exports.promise = queueAsPromised;
  }
});

// node_modules/@nodelib/fs.walk/out/readers/common.js
var require_common2 = __commonJS({
  "node_modules/@nodelib/fs.walk/out/readers/common.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.joinPathSegments = exports.replacePathSegmentSeparator = exports.isAppliedFilter = exports.isFatalError = void 0;
    function isFatalError(settings, error) {
      if (settings.errorFilter === null) {
        return true;
      }
      return !settings.errorFilter(error);
    }
    exports.isFatalError = isFatalError;
    function isAppliedFilter(filter2, value) {
      return filter2 === null || filter2(value);
    }
    exports.isAppliedFilter = isAppliedFilter;
    function replacePathSegmentSeparator(filepath, separator) {
      return filepath.split(/[/\\]/).join(separator);
    }
    exports.replacePathSegmentSeparator = replacePathSegmentSeparator;
    function joinPathSegments(a, b, separator) {
      if (a === "") {
        return b;
      }
      if (a.endsWith(separator)) {
        return a + b;
      }
      return a + separator + b;
    }
    exports.joinPathSegments = joinPathSegments;
  }
});

// node_modules/@nodelib/fs.walk/out/readers/reader.js
var require_reader = __commonJS({
  "node_modules/@nodelib/fs.walk/out/readers/reader.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var common2 = require_common2();
    var Reader = class {
      constructor(_root, _settings) {
        this._root = _root;
        this._settings = _settings;
        this._root = common2.replacePathSegmentSeparator(_root, _settings.pathSegmentSeparator);
      }
    };
    exports.default = Reader;
  }
});

// node_modules/@nodelib/fs.walk/out/readers/async.js
var require_async3 = __commonJS({
  "node_modules/@nodelib/fs.walk/out/readers/async.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var events_1 = __require("events");
    var fsScandir = require_out2();
    var fastq = require_queue();
    var common2 = require_common2();
    var reader_1 = require_reader();
    var AsyncReader = class extends reader_1.default {
      constructor(_root, _settings) {
        super(_root, _settings);
        this._settings = _settings;
        this._scandir = fsScandir.scandir;
        this._emitter = new events_1.EventEmitter();
        this._queue = fastq(this._worker.bind(this), this._settings.concurrency);
        this._isFatalError = false;
        this._isDestroyed = false;
        this._queue.drain = () => {
          if (!this._isFatalError) {
            this._emitter.emit("end");
          }
        };
      }
      read() {
        this._isFatalError = false;
        this._isDestroyed = false;
        setImmediate(() => {
          this._pushToQueue(this._root, this._settings.basePath);
        });
        return this._emitter;
      }
      get isDestroyed() {
        return this._isDestroyed;
      }
      destroy() {
        if (this._isDestroyed) {
          throw new Error("The reader is already destroyed");
        }
        this._isDestroyed = true;
        this._queue.killAndDrain();
      }
      onEntry(callback) {
        this._emitter.on("entry", callback);
      }
      onError(callback) {
        this._emitter.once("error", callback);
      }
      onEnd(callback) {
        this._emitter.once("end", callback);
      }
      _pushToQueue(directory, base) {
        const queueItem = { directory, base };
        this._queue.push(queueItem, (error) => {
          if (error !== null) {
            this._handleError(error);
          }
        });
      }
      _worker(item, done) {
        this._scandir(item.directory, this._settings.fsScandirSettings, (error, entries) => {
          if (error !== null) {
            done(error, void 0);
            return;
          }
          for (const entry of entries) {
            this._handleEntry(entry, item.base);
          }
          done(null, void 0);
        });
      }
      _handleError(error) {
        if (this._isDestroyed || !common2.isFatalError(this._settings, error)) {
          return;
        }
        this._isFatalError = true;
        this._isDestroyed = true;
        this._emitter.emit("error", error);
      }
      _handleEntry(entry, base) {
        if (this._isDestroyed || this._isFatalError) {
          return;
        }
        const fullpath = entry.path;
        if (base !== void 0) {
          entry.path = common2.joinPathSegments(base, entry.name, this._settings.pathSegmentSeparator);
        }
        if (common2.isAppliedFilter(this._settings.entryFilter, entry)) {
          this._emitEntry(entry);
        }
        if (entry.dirent.isDirectory() && common2.isAppliedFilter(this._settings.deepFilter, entry)) {
          this._pushToQueue(fullpath, base === void 0 ? void 0 : entry.path);
        }
      }
      _emitEntry(entry) {
        this._emitter.emit("entry", entry);
      }
    };
    exports.default = AsyncReader;
  }
});

// node_modules/@nodelib/fs.walk/out/providers/async.js
var require_async4 = __commonJS({
  "node_modules/@nodelib/fs.walk/out/providers/async.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var async_1 = require_async3();
    var AsyncProvider = class {
      constructor(_root, _settings) {
        this._root = _root;
        this._settings = _settings;
        this._reader = new async_1.default(this._root, this._settings);
        this._storage = [];
      }
      read(callback) {
        this._reader.onError((error) => {
          callFailureCallback(callback, error);
        });
        this._reader.onEntry((entry) => {
          this._storage.push(entry);
        });
        this._reader.onEnd(() => {
          callSuccessCallback(callback, this._storage);
        });
        this._reader.read();
      }
    };
    exports.default = AsyncProvider;
    function callFailureCallback(callback, error) {
      callback(error);
    }
    function callSuccessCallback(callback, entries) {
      callback(null, entries);
    }
  }
});

// node_modules/@nodelib/fs.walk/out/providers/stream.js
var require_stream2 = __commonJS({
  "node_modules/@nodelib/fs.walk/out/providers/stream.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var stream_1 = __require("stream");
    var async_1 = require_async3();
    var StreamProvider = class {
      constructor(_root, _settings) {
        this._root = _root;
        this._settings = _settings;
        this._reader = new async_1.default(this._root, this._settings);
        this._stream = new stream_1.Readable({
          objectMode: true,
          read: () => {
          },
          destroy: () => {
            if (!this._reader.isDestroyed) {
              this._reader.destroy();
            }
          }
        });
      }
      read() {
        this._reader.onError((error) => {
          this._stream.emit("error", error);
        });
        this._reader.onEntry((entry) => {
          this._stream.push(entry);
        });
        this._reader.onEnd(() => {
          this._stream.push(null);
        });
        this._reader.read();
        return this._stream;
      }
    };
    exports.default = StreamProvider;
  }
});

// node_modules/@nodelib/fs.walk/out/readers/sync.js
var require_sync3 = __commonJS({
  "node_modules/@nodelib/fs.walk/out/readers/sync.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var fsScandir = require_out2();
    var common2 = require_common2();
    var reader_1 = require_reader();
    var SyncReader = class extends reader_1.default {
      constructor() {
        super(...arguments);
        this._scandir = fsScandir.scandirSync;
        this._storage = [];
        this._queue = /* @__PURE__ */ new Set();
      }
      read() {
        this._pushToQueue(this._root, this._settings.basePath);
        this._handleQueue();
        return this._storage;
      }
      _pushToQueue(directory, base) {
        this._queue.add({ directory, base });
      }
      _handleQueue() {
        for (const item of this._queue.values()) {
          this._handleDirectory(item.directory, item.base);
        }
      }
      _handleDirectory(directory, base) {
        try {
          const entries = this._scandir(directory, this._settings.fsScandirSettings);
          for (const entry of entries) {
            this._handleEntry(entry, base);
          }
        } catch (error) {
          this._handleError(error);
        }
      }
      _handleError(error) {
        if (!common2.isFatalError(this._settings, error)) {
          return;
        }
        throw error;
      }
      _handleEntry(entry, base) {
        const fullpath = entry.path;
        if (base !== void 0) {
          entry.path = common2.joinPathSegments(base, entry.name, this._settings.pathSegmentSeparator);
        }
        if (common2.isAppliedFilter(this._settings.entryFilter, entry)) {
          this._pushToStorage(entry);
        }
        if (entry.dirent.isDirectory() && common2.isAppliedFilter(this._settings.deepFilter, entry)) {
          this._pushToQueue(fullpath, base === void 0 ? void 0 : entry.path);
        }
      }
      _pushToStorage(entry) {
        this._storage.push(entry);
      }
    };
    exports.default = SyncReader;
  }
});

// node_modules/@nodelib/fs.walk/out/providers/sync.js
var require_sync4 = __commonJS({
  "node_modules/@nodelib/fs.walk/out/providers/sync.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var sync_1 = require_sync3();
    var SyncProvider = class {
      constructor(_root, _settings) {
        this._root = _root;
        this._settings = _settings;
        this._reader = new sync_1.default(this._root, this._settings);
      }
      read() {
        return this._reader.read();
      }
    };
    exports.default = SyncProvider;
  }
});

// node_modules/@nodelib/fs.walk/out/settings.js
var require_settings3 = __commonJS({
  "node_modules/@nodelib/fs.walk/out/settings.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path13 = __require("path");
    var fsScandir = require_out2();
    var Settings = class {
      constructor(_options = {}) {
        this._options = _options;
        this.basePath = this._getValue(this._options.basePath, void 0);
        this.concurrency = this._getValue(this._options.concurrency, Number.POSITIVE_INFINITY);
        this.deepFilter = this._getValue(this._options.deepFilter, null);
        this.entryFilter = this._getValue(this._options.entryFilter, null);
        this.errorFilter = this._getValue(this._options.errorFilter, null);
        this.pathSegmentSeparator = this._getValue(this._options.pathSegmentSeparator, path13.sep);
        this.fsScandirSettings = new fsScandir.Settings({
          followSymbolicLinks: this._options.followSymbolicLinks,
          fs: this._options.fs,
          pathSegmentSeparator: this._options.pathSegmentSeparator,
          stats: this._options.stats,
          throwErrorOnBrokenSymbolicLink: this._options.throwErrorOnBrokenSymbolicLink
        });
      }
      _getValue(option, value) {
        return option !== null && option !== void 0 ? option : value;
      }
    };
    exports.default = Settings;
  }
});

// node_modules/@nodelib/fs.walk/out/index.js
var require_out3 = __commonJS({
  "node_modules/@nodelib/fs.walk/out/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.Settings = exports.walkStream = exports.walkSync = exports.walk = void 0;
    var async_1 = require_async4();
    var stream_1 = require_stream2();
    var sync_1 = require_sync4();
    var settings_1 = require_settings3();
    exports.Settings = settings_1.default;
    function walk(directory, optionsOrSettingsOrCallback, callback) {
      if (typeof optionsOrSettingsOrCallback === "function") {
        new async_1.default(directory, getSettings()).read(optionsOrSettingsOrCallback);
        return;
      }
      new async_1.default(directory, getSettings(optionsOrSettingsOrCallback)).read(callback);
    }
    exports.walk = walk;
    function walkSync(directory, optionsOrSettings) {
      const settings = getSettings(optionsOrSettings);
      const provider = new sync_1.default(directory, settings);
      return provider.read();
    }
    exports.walkSync = walkSync;
    function walkStream(directory, optionsOrSettings) {
      const settings = getSettings(optionsOrSettings);
      const provider = new stream_1.default(directory, settings);
      return provider.read();
    }
    exports.walkStream = walkStream;
    function getSettings(settingsOrOptions = {}) {
      if (settingsOrOptions instanceof settings_1.default) {
        return settingsOrOptions;
      }
      return new settings_1.default(settingsOrOptions);
    }
  }
});

// node_modules/fast-glob/out/readers/reader.js
var require_reader2 = __commonJS({
  "node_modules/fast-glob/out/readers/reader.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path13 = __require("path");
    var fsStat = require_out();
    var utils = require_utils3();
    var Reader = class {
      constructor(_settings) {
        this._settings = _settings;
        this._fsStatSettings = new fsStat.Settings({
          followSymbolicLink: this._settings.followSymbolicLinks,
          fs: this._settings.fs,
          throwErrorOnBrokenSymbolicLink: this._settings.followSymbolicLinks
        });
      }
      _getFullEntryPath(filepath) {
        return path13.resolve(this._settings.cwd, filepath);
      }
      _makeEntry(stats, pattern) {
        const entry = {
          name: pattern,
          path: pattern,
          dirent: utils.fs.createDirentFromStats(pattern, stats)
        };
        if (this._settings.stats) {
          entry.stats = stats;
        }
        return entry;
      }
      _isFatalError(error) {
        return !utils.errno.isEnoentCodeError(error) && !this._settings.suppressErrors;
      }
    };
    exports.default = Reader;
  }
});

// node_modules/fast-glob/out/readers/stream.js
var require_stream3 = __commonJS({
  "node_modules/fast-glob/out/readers/stream.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var stream_1 = __require("stream");
    var fsStat = require_out();
    var fsWalk = require_out3();
    var reader_1 = require_reader2();
    var ReaderStream = class extends reader_1.default {
      constructor() {
        super(...arguments);
        this._walkStream = fsWalk.walkStream;
        this._stat = fsStat.stat;
      }
      dynamic(root2, options8) {
        return this._walkStream(root2, options8);
      }
      static(patterns, options8) {
        const filepaths = patterns.map(this._getFullEntryPath, this);
        const stream = new stream_1.PassThrough({ objectMode: true });
        stream._write = (index, _enc, done) => {
          return this._getEntry(filepaths[index], patterns[index], options8).then((entry) => {
            if (entry !== null && options8.entryFilter(entry)) {
              stream.push(entry);
            }
            if (index === filepaths.length - 1) {
              stream.end();
            }
            done();
          }).catch(done);
        };
        for (let i = 0; i < filepaths.length; i++) {
          stream.write(i);
        }
        return stream;
      }
      _getEntry(filepath, pattern, options8) {
        return this._getStat(filepath).then((stats) => this._makeEntry(stats, pattern)).catch((error) => {
          if (options8.errorFilter(error)) {
            return null;
          }
          throw error;
        });
      }
      _getStat(filepath) {
        return new Promise((resolve3, reject) => {
          this._stat(filepath, this._fsStatSettings, (error, stats) => {
            return error === null ? resolve3(stats) : reject(error);
          });
        });
      }
    };
    exports.default = ReaderStream;
  }
});

// node_modules/fast-glob/out/readers/async.js
var require_async5 = __commonJS({
  "node_modules/fast-glob/out/readers/async.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var fsWalk = require_out3();
    var reader_1 = require_reader2();
    var stream_1 = require_stream3();
    var ReaderAsync = class extends reader_1.default {
      constructor() {
        super(...arguments);
        this._walkAsync = fsWalk.walk;
        this._readerStream = new stream_1.default(this._settings);
      }
      dynamic(root2, options8) {
        return new Promise((resolve3, reject) => {
          this._walkAsync(root2, options8, (error, entries) => {
            if (error === null) {
              resolve3(entries);
            } else {
              reject(error);
            }
          });
        });
      }
      async static(patterns, options8) {
        const entries = [];
        const stream = this._readerStream.static(patterns, options8);
        return new Promise((resolve3, reject) => {
          stream.once("error", reject);
          stream.on("data", (entry) => entries.push(entry));
          stream.once("end", () => resolve3(entries));
        });
      }
    };
    exports.default = ReaderAsync;
  }
});

// node_modules/fast-glob/out/providers/matchers/matcher.js
var require_matcher = __commonJS({
  "node_modules/fast-glob/out/providers/matchers/matcher.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var utils = require_utils3();
    var Matcher = class {
      constructor(_patterns, _settings, _micromatchOptions) {
        this._patterns = _patterns;
        this._settings = _settings;
        this._micromatchOptions = _micromatchOptions;
        this._storage = [];
        this._fillStorage();
      }
      _fillStorage() {
        for (const pattern of this._patterns) {
          const segments = this._getPatternSegments(pattern);
          const sections = this._splitSegmentsIntoSections(segments);
          this._storage.push({
            complete: sections.length <= 1,
            pattern,
            segments,
            sections
          });
        }
      }
      _getPatternSegments(pattern) {
        const parts = utils.pattern.getPatternParts(pattern, this._micromatchOptions);
        return parts.map((part) => {
          const dynamic = utils.pattern.isDynamicPattern(part, this._settings);
          if (!dynamic) {
            return {
              dynamic: false,
              pattern: part
            };
          }
          return {
            dynamic: true,
            pattern: part,
            patternRe: utils.pattern.makeRe(part, this._micromatchOptions)
          };
        });
      }
      _splitSegmentsIntoSections(segments) {
        return utils.array.splitWhen(segments, (segment) => segment.dynamic && utils.pattern.hasGlobStar(segment.pattern));
      }
    };
    exports.default = Matcher;
  }
});

// node_modules/fast-glob/out/providers/matchers/partial.js
var require_partial = __commonJS({
  "node_modules/fast-glob/out/providers/matchers/partial.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var matcher_1 = require_matcher();
    var PartialMatcher = class extends matcher_1.default {
      match(filepath) {
        const parts = filepath.split("/");
        const levels = parts.length;
        const patterns = this._storage.filter((info) => !info.complete || info.segments.length > levels);
        for (const pattern of patterns) {
          const section = pattern.sections[0];
          if (!pattern.complete && levels > section.length) {
            return true;
          }
          const match = parts.every((part, index) => {
            const segment = pattern.segments[index];
            if (segment.dynamic && segment.patternRe.test(part)) {
              return true;
            }
            if (!segment.dynamic && segment.pattern === part) {
              return true;
            }
            return false;
          });
          if (match) {
            return true;
          }
        }
        return false;
      }
    };
    exports.default = PartialMatcher;
  }
});

// node_modules/fast-glob/out/providers/filters/deep.js
var require_deep = __commonJS({
  "node_modules/fast-glob/out/providers/filters/deep.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var utils = require_utils3();
    var partial_1 = require_partial();
    var DeepFilter = class {
      constructor(_settings, _micromatchOptions) {
        this._settings = _settings;
        this._micromatchOptions = _micromatchOptions;
      }
      getFilter(basePath, positive, negative) {
        const matcher = this._getMatcher(positive);
        const negativeRe = this._getNegativePatternsRe(negative);
        return (entry) => this._filter(basePath, entry, matcher, negativeRe);
      }
      _getMatcher(patterns) {
        return new partial_1.default(patterns, this._settings, this._micromatchOptions);
      }
      _getNegativePatternsRe(patterns) {
        const affectDepthOfReadingPatterns = patterns.filter(utils.pattern.isAffectDepthOfReadingPattern);
        return utils.pattern.convertPatternsToRe(affectDepthOfReadingPatterns, this._micromatchOptions);
      }
      _filter(basePath, entry, matcher, negativeRe) {
        if (this._isSkippedByDeep(basePath, entry.path)) {
          return false;
        }
        if (this._isSkippedSymbolicLink(entry)) {
          return false;
        }
        const filepath = utils.path.removeLeadingDotSegment(entry.path);
        if (this._isSkippedByPositivePatterns(filepath, matcher)) {
          return false;
        }
        return this._isSkippedByNegativePatterns(filepath, negativeRe);
      }
      _isSkippedByDeep(basePath, entryPath) {
        if (this._settings.deep === Infinity) {
          return false;
        }
        return this._getEntryLevel(basePath, entryPath) >= this._settings.deep;
      }
      _getEntryLevel(basePath, entryPath) {
        const entryPathDepth = entryPath.split("/").length;
        if (basePath === "") {
          return entryPathDepth;
        }
        const basePathDepth = basePath.split("/").length;
        return entryPathDepth - basePathDepth;
      }
      _isSkippedSymbolicLink(entry) {
        return !this._settings.followSymbolicLinks && entry.dirent.isSymbolicLink();
      }
      _isSkippedByPositivePatterns(entryPath, matcher) {
        return !this._settings.baseNameMatch && !matcher.match(entryPath);
      }
      _isSkippedByNegativePatterns(entryPath, patternsRe) {
        return !utils.pattern.matchAny(entryPath, patternsRe);
      }
    };
    exports.default = DeepFilter;
  }
});

// node_modules/fast-glob/out/providers/filters/entry.js
var require_entry = __commonJS({
  "node_modules/fast-glob/out/providers/filters/entry.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var utils = require_utils3();
    var EntryFilter = class {
      constructor(_settings, _micromatchOptions) {
        this._settings = _settings;
        this._micromatchOptions = _micromatchOptions;
        this.index = /* @__PURE__ */ new Map();
      }
      getFilter(positive, negative) {
        const positiveRe = utils.pattern.convertPatternsToRe(positive, this._micromatchOptions);
        const negativeRe = utils.pattern.convertPatternsToRe(negative, Object.assign(Object.assign({}, this._micromatchOptions), { dot: true }));
        return (entry) => this._filter(entry, positiveRe, negativeRe);
      }
      _filter(entry, positiveRe, negativeRe) {
        const filepath = utils.path.removeLeadingDotSegment(entry.path);
        if (this._settings.unique && this._isDuplicateEntry(filepath)) {
          return false;
        }
        if (this._onlyFileFilter(entry) || this._onlyDirectoryFilter(entry)) {
          return false;
        }
        if (this._isSkippedByAbsoluteNegativePatterns(filepath, negativeRe)) {
          return false;
        }
        const isDirectory2 = entry.dirent.isDirectory();
        const isMatched = this._isMatchToPatterns(filepath, positiveRe, isDirectory2) && !this._isMatchToPatterns(filepath, negativeRe, isDirectory2);
        if (this._settings.unique && isMatched) {
          this._createIndexRecord(filepath);
        }
        return isMatched;
      }
      _isDuplicateEntry(filepath) {
        return this.index.has(filepath);
      }
      _createIndexRecord(filepath) {
        this.index.set(filepath, void 0);
      }
      _onlyFileFilter(entry) {
        return this._settings.onlyFiles && !entry.dirent.isFile();
      }
      _onlyDirectoryFilter(entry) {
        return this._settings.onlyDirectories && !entry.dirent.isDirectory();
      }
      _isSkippedByAbsoluteNegativePatterns(entryPath, patternsRe) {
        if (!this._settings.absolute) {
          return false;
        }
        const fullpath = utils.path.makeAbsolute(this._settings.cwd, entryPath);
        return utils.pattern.matchAny(fullpath, patternsRe);
      }
      _isMatchToPatterns(filepath, patternsRe, isDirectory2) {
        const isMatched = utils.pattern.matchAny(filepath, patternsRe);
        if (!isMatched && isDirectory2) {
          return utils.pattern.matchAny(filepath + "/", patternsRe);
        }
        return isMatched;
      }
    };
    exports.default = EntryFilter;
  }
});

// node_modules/fast-glob/out/providers/filters/error.js
var require_error = __commonJS({
  "node_modules/fast-glob/out/providers/filters/error.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var utils = require_utils3();
    var ErrorFilter = class {
      constructor(_settings) {
        this._settings = _settings;
      }
      getFilter() {
        return (error) => this._isNonFatalError(error);
      }
      _isNonFatalError(error) {
        return utils.errno.isEnoentCodeError(error) || this._settings.suppressErrors;
      }
    };
    exports.default = ErrorFilter;
  }
});

// node_modules/fast-glob/out/providers/transformers/entry.js
var require_entry2 = __commonJS({
  "node_modules/fast-glob/out/providers/transformers/entry.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var utils = require_utils3();
    var EntryTransformer = class {
      constructor(_settings) {
        this._settings = _settings;
      }
      getTransformer() {
        return (entry) => this._transform(entry);
      }
      _transform(entry) {
        let filepath = entry.path;
        if (this._settings.absolute) {
          filepath = utils.path.makeAbsolute(this._settings.cwd, filepath);
          filepath = utils.path.unixify(filepath);
        }
        if (this._settings.markDirectories && entry.dirent.isDirectory()) {
          filepath += "/";
        }
        if (!this._settings.objectMode) {
          return filepath;
        }
        return Object.assign(Object.assign({}, entry), { path: filepath });
      }
    };
    exports.default = EntryTransformer;
  }
});

// node_modules/fast-glob/out/providers/provider.js
var require_provider = __commonJS({
  "node_modules/fast-glob/out/providers/provider.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var path13 = __require("path");
    var deep_1 = require_deep();
    var entry_1 = require_entry();
    var error_1 = require_error();
    var entry_2 = require_entry2();
    var Provider = class {
      constructor(_settings) {
        this._settings = _settings;
        this.errorFilter = new error_1.default(this._settings);
        this.entryFilter = new entry_1.default(this._settings, this._getMicromatchOptions());
        this.deepFilter = new deep_1.default(this._settings, this._getMicromatchOptions());
        this.entryTransformer = new entry_2.default(this._settings);
      }
      _getRootDirectory(task) {
        return path13.resolve(this._settings.cwd, task.base);
      }
      _getReaderOptions(task) {
        const basePath = task.base === "." ? "" : task.base;
        return {
          basePath,
          pathSegmentSeparator: "/",
          concurrency: this._settings.concurrency,
          deepFilter: this.deepFilter.getFilter(basePath, task.positive, task.negative),
          entryFilter: this.entryFilter.getFilter(task.positive, task.negative),
          errorFilter: this.errorFilter.getFilter(),
          followSymbolicLinks: this._settings.followSymbolicLinks,
          fs: this._settings.fs,
          stats: this._settings.stats,
          throwErrorOnBrokenSymbolicLink: this._settings.throwErrorOnBrokenSymbolicLink,
          transform: this.entryTransformer.getTransformer()
        };
      }
      _getMicromatchOptions() {
        return {
          dot: this._settings.dot,
          matchBase: this._settings.baseNameMatch,
          nobrace: !this._settings.braceExpansion,
          nocase: !this._settings.caseSensitiveMatch,
          noext: !this._settings.extglob,
          noglobstar: !this._settings.globstar,
          posix: true,
          strictSlashes: false
        };
      }
    };
    exports.default = Provider;
  }
});

// node_modules/fast-glob/out/providers/async.js
var require_async6 = __commonJS({
  "node_modules/fast-glob/out/providers/async.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var async_1 = require_async5();
    var provider_1 = require_provider();
    var ProviderAsync = class extends provider_1.default {
      constructor() {
        super(...arguments);
        this._reader = new async_1.default(this._settings);
      }
      async read(task) {
        const root2 = this._getRootDirectory(task);
        const options8 = this._getReaderOptions(task);
        const entries = await this.api(root2, task, options8);
        return entries.map((entry) => options8.transform(entry));
      }
      api(root2, task, options8) {
        if (task.dynamic) {
          return this._reader.dynamic(root2, options8);
        }
        return this._reader.static(task.patterns, options8);
      }
    };
    exports.default = ProviderAsync;
  }
});

// node_modules/fast-glob/out/providers/stream.js
var require_stream4 = __commonJS({
  "node_modules/fast-glob/out/providers/stream.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var stream_1 = __require("stream");
    var stream_2 = require_stream3();
    var provider_1 = require_provider();
    var ProviderStream = class extends provider_1.default {
      constructor() {
        super(...arguments);
        this._reader = new stream_2.default(this._settings);
      }
      read(task) {
        const root2 = this._getRootDirectory(task);
        const options8 = this._getReaderOptions(task);
        const source2 = this.api(root2, task, options8);
        const destination = new stream_1.Readable({ objectMode: true, read: () => {
        } });
        source2.once("error", (error) => destination.emit("error", error)).on("data", (entry) => destination.emit("data", options8.transform(entry))).once("end", () => destination.emit("end"));
        destination.once("close", () => source2.destroy());
        return destination;
      }
      api(root2, task, options8) {
        if (task.dynamic) {
          return this._reader.dynamic(root2, options8);
        }
        return this._reader.static(task.patterns, options8);
      }
    };
    exports.default = ProviderStream;
  }
});

// node_modules/fast-glob/out/readers/sync.js
var require_sync5 = __commonJS({
  "node_modules/fast-glob/out/readers/sync.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var fsStat = require_out();
    var fsWalk = require_out3();
    var reader_1 = require_reader2();
    var ReaderSync = class extends reader_1.default {
      constructor() {
        super(...arguments);
        this._walkSync = fsWalk.walkSync;
        this._statSync = fsStat.statSync;
      }
      dynamic(root2, options8) {
        return this._walkSync(root2, options8);
      }
      static(patterns, options8) {
        const entries = [];
        for (const pattern of patterns) {
          const filepath = this._getFullEntryPath(pattern);
          const entry = this._getEntry(filepath, pattern, options8);
          if (entry === null || !options8.entryFilter(entry)) {
            continue;
          }
          entries.push(entry);
        }
        return entries;
      }
      _getEntry(filepath, pattern, options8) {
        try {
          const stats = this._getStat(filepath);
          return this._makeEntry(stats, pattern);
        } catch (error) {
          if (options8.errorFilter(error)) {
            return null;
          }
          throw error;
        }
      }
      _getStat(filepath) {
        return this._statSync(filepath, this._fsStatSettings);
      }
    };
    exports.default = ReaderSync;
  }
});

// node_modules/fast-glob/out/providers/sync.js
var require_sync6 = __commonJS({
  "node_modules/fast-glob/out/providers/sync.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    var sync_1 = require_sync5();
    var provider_1 = require_provider();
    var ProviderSync = class extends provider_1.default {
      constructor() {
        super(...arguments);
        this._reader = new sync_1.default(this._settings);
      }
      read(task) {
        const root2 = this._getRootDirectory(task);
        const options8 = this._getReaderOptions(task);
        const entries = this.api(root2, task, options8);
        return entries.map(options8.transform);
      }
      api(root2, task, options8) {
        if (task.dynamic) {
          return this._reader.dynamic(root2, options8);
        }
        return this._reader.static(task.patterns, options8);
      }
    };
    exports.default = ProviderSync;
  }
});

// node_modules/fast-glob/out/settings.js
var require_settings4 = __commonJS({
  "node_modules/fast-glob/out/settings.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.DEFAULT_FILE_SYSTEM_ADAPTER = void 0;
    var fs7 = __require("fs");
    var os2 = __require("os");
    var CPU_COUNT = Math.max(os2.cpus().length, 1);
    exports.DEFAULT_FILE_SYSTEM_ADAPTER = {
      lstat: fs7.lstat,
      lstatSync: fs7.lstatSync,
      stat: fs7.stat,
      statSync: fs7.statSync,
      readdir: fs7.readdir,
      readdirSync: fs7.readdirSync
    };
    var Settings = class {
      constructor(_options = {}) {
        this._options = _options;
        this.absolute = this._getValue(this._options.absolute, false);
        this.baseNameMatch = this._getValue(this._options.baseNameMatch, false);
        this.braceExpansion = this._getValue(this._options.braceExpansion, true);
        this.caseSensitiveMatch = this._getValue(this._options.caseSensitiveMatch, true);
        this.concurrency = this._getValue(this._options.concurrency, CPU_COUNT);
        this.cwd = this._getValue(this._options.cwd, process.cwd());
        this.deep = this._getValue(this._options.deep, Infinity);
        this.dot = this._getValue(this._options.dot, false);
        this.extglob = this._getValue(this._options.extglob, true);
        this.followSymbolicLinks = this._getValue(this._options.followSymbolicLinks, true);
        this.fs = this._getFileSystemMethods(this._options.fs);
        this.globstar = this._getValue(this._options.globstar, true);
        this.ignore = this._getValue(this._options.ignore, []);
        this.markDirectories = this._getValue(this._options.markDirectories, false);
        this.objectMode = this._getValue(this._options.objectMode, false);
        this.onlyDirectories = this._getValue(this._options.onlyDirectories, false);
        this.onlyFiles = this._getValue(this._options.onlyFiles, true);
        this.stats = this._getValue(this._options.stats, false);
        this.suppressErrors = this._getValue(this._options.suppressErrors, false);
        this.throwErrorOnBrokenSymbolicLink = this._getValue(this._options.throwErrorOnBrokenSymbolicLink, false);
        this.unique = this._getValue(this._options.unique, true);
        if (this.onlyDirectories) {
          this.onlyFiles = false;
        }
        if (this.stats) {
          this.objectMode = true;
        }
        this.ignore = [].concat(this.ignore);
      }
      _getValue(option, value) {
        return option === void 0 ? value : option;
      }
      _getFileSystemMethods(methods = {}) {
        return Object.assign(Object.assign({}, exports.DEFAULT_FILE_SYSTEM_ADAPTER), methods);
      }
    };
    exports.default = Settings;
  }
});

// node_modules/fast-glob/out/index.js
var require_out4 = __commonJS({
  "node_modules/fast-glob/out/index.js"(exports, module) {
    "use strict";
    var taskManager = require_tasks();
    var async_1 = require_async6();
    var stream_1 = require_stream4();
    var sync_1 = require_sync6();
    var settings_1 = require_settings4();
    var utils = require_utils3();
    async function FastGlob(source2, options8) {
      assertPatternsInput(source2);
      const works = getWorks(source2, async_1.default, options8);
      const result = await Promise.all(works);
      return utils.array.flatten(result);
    }
    (function(FastGlob2) {
      FastGlob2.glob = FastGlob2;
      FastGlob2.globSync = sync;
      FastGlob2.globStream = stream;
      FastGlob2.async = FastGlob2;
      function sync(source2, options8) {
        assertPatternsInput(source2);
        const works = getWorks(source2, sync_1.default, options8);
        return utils.array.flatten(works);
      }
      FastGlob2.sync = sync;
      function stream(source2, options8) {
        assertPatternsInput(source2);
        const works = getWorks(source2, stream_1.default, options8);
        return utils.stream.merge(works);
      }
      FastGlob2.stream = stream;
      function generateTasks(source2, options8) {
        assertPatternsInput(source2);
        const patterns = [].concat(source2);
        const settings = new settings_1.default(options8);
        return taskManager.generate(patterns, settings);
      }
      FastGlob2.generateTasks = generateTasks;
      function isDynamicPattern(source2, options8) {
        assertPatternsInput(source2);
        const settings = new settings_1.default(options8);
        return utils.pattern.isDynamicPattern(source2, settings);
      }
      FastGlob2.isDynamicPattern = isDynamicPattern;
      function escapePath(source2) {
        assertPatternsInput(source2);
        return utils.path.escape(source2);
      }
      FastGlob2.escapePath = escapePath;
      function convertPathToPattern(source2) {
        assertPatternsInput(source2);
        return utils.path.convertPathToPattern(source2);
      }
      FastGlob2.convertPathToPattern = convertPathToPattern;
      let posix;
      (function(posix2) {
        function escapePath2(source2) {
          assertPatternsInput(source2);
          return utils.path.escapePosixPath(source2);
        }
        posix2.escapePath = escapePath2;
        function convertPathToPattern2(source2) {
          assertPatternsInput(source2);
          return utils.path.convertPosixPathToPattern(source2);
        }
        posix2.convertPathToPattern = convertPathToPattern2;
      })(posix = FastGlob2.posix || (FastGlob2.posix = {}));
      let win32;
      (function(win322) {
        function escapePath2(source2) {
          assertPatternsInput(source2);
          return utils.path.escapeWindowsPath(source2);
        }
        win322.escapePath = escapePath2;
        function convertPathToPattern2(source2) {
          assertPatternsInput(source2);
          return utils.path.convertWindowsPathToPattern(source2);
        }
        win322.convertPathToPattern = convertPathToPattern2;
      })(win32 = FastGlob2.win32 || (FastGlob2.win32 = {}));
    })(FastGlob || (FastGlob = {}));
    function getWorks(source2, _Provider, options8) {
      const patterns = [].concat(source2);
      const settings = new settings_1.default(options8);
      const tasks = taskManager.generate(patterns, settings);
      const provider = new _Provider(settings);
      return tasks.map(provider.read, provider);
    }
    function assertPatternsInput(input) {
      const source2 = [].concat(input);
      const isValidSource = source2.every((item) => utils.string.isString(item) && !utils.string.isEmpty(item));
      if (!isValidSource) {
        throw new TypeError("Patterns must be a string (non empty) or an array of strings");
      }
    }
    module.exports = FastGlob;
  }
});

// node_modules/chalk/source/vendor/ansi-styles/index.js
function assembleStyles() {
  const codes2 = /* @__PURE__ */ new Map();
  for (const [groupName, group] of Object.entries(styles)) {
    for (const [styleName, style] of Object.entries(group)) {
      styles[styleName] = {
        open: `\x1B[${style[0]}m`,
        close: `\x1B[${style[1]}m`
      };
      group[styleName] = styles[styleName];
      codes2.set(style[0], style[1]);
    }
    Object.defineProperty(styles, groupName, {
      value: group,
      enumerable: false
    });
  }
  Object.defineProperty(styles, "codes", {
    value: codes2,
    enumerable: false
  });
  styles.color.close = "\x1B[39m";
  styles.bgColor.close = "\x1B[49m";
  styles.color.ansi = wrapAnsi16();
  styles.color.ansi256 = wrapAnsi256();
  styles.color.ansi16m = wrapAnsi16m();
  styles.bgColor.ansi = wrapAnsi16(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi256 = wrapAnsi256(ANSI_BACKGROUND_OFFSET);
  styles.bgColor.ansi16m = wrapAnsi16m(ANSI_BACKGROUND_OFFSET);
  Object.defineProperties(styles, {
    rgbToAnsi256: {
      value(red, green, blue) {
        if (red === green && green === blue) {
          if (red < 8) {
            return 16;
          }
          if (red > 248) {
            return 231;
          }
          return Math.round((red - 8) / 247 * 24) + 232;
        }
        return 16 + 36 * Math.round(red / 255 * 5) + 6 * Math.round(green / 255 * 5) + Math.round(blue / 255 * 5);
      },
      enumerable: false
    },
    hexToRgb: {
      value(hex) {
        const matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex.toString(16));
        if (!matches) {
          return [0, 0, 0];
        }
        let [colorString] = matches;
        if (colorString.length === 3) {
          colorString = [...colorString].map((character) => character + character).join("");
        }
        const integer = Number.parseInt(colorString, 16);
        return [
          /* eslint-disable no-bitwise */
          integer >> 16 & 255,
          integer >> 8 & 255,
          integer & 255
          /* eslint-enable no-bitwise */
        ];
      },
      enumerable: false
    },
    hexToAnsi256: {
      value: (hex) => styles.rgbToAnsi256(...styles.hexToRgb(hex)),
      enumerable: false
    },
    ansi256ToAnsi: {
      value(code) {
        if (code < 8) {
          return 30 + code;
        }
        if (code < 16) {
          return 90 + (code - 8);
        }
        let red;
        let green;
        let blue;
        if (code >= 232) {
          red = ((code - 232) * 10 + 8) / 255;
          green = red;
          blue = red;
        } else {
          code -= 16;
          const remainder = code % 36;
          red = Math.floor(code / 36) / 5;
          green = Math.floor(remainder / 6) / 5;
          blue = remainder % 6 / 5;
        }
        const value = Math.max(red, green, blue) * 2;
        if (value === 0) {
          return 30;
        }
        let result = 30 + (Math.round(blue) << 2 | Math.round(green) << 1 | Math.round(red));
        if (value === 2) {
          result += 60;
        }
        return result;
      },
      enumerable: false
    },
    rgbToAnsi: {
      value: (red, green, blue) => styles.ansi256ToAnsi(styles.rgbToAnsi256(red, green, blue)),
      enumerable: false
    },
    hexToAnsi: {
      value: (hex) => styles.ansi256ToAnsi(styles.hexToAnsi256(hex)),
      enumerable: false
    }
  });
  return styles;
}
var ANSI_BACKGROUND_OFFSET, wrapAnsi16, wrapAnsi256, wrapAnsi16m, styles, modifierNames, foregroundColorNames, backgroundColorNames, colorNames, ansiStyles, ansi_styles_default;
var init_ansi_styles = __esm({
  "node_modules/chalk/source/vendor/ansi-styles/index.js"() {
    ANSI_BACKGROUND_OFFSET = 10;
    wrapAnsi16 = (offset = 0) => (code) => `\x1B[${code + offset}m`;
    wrapAnsi256 = (offset = 0) => (code) => `\x1B[${38 + offset};5;${code}m`;
    wrapAnsi16m = (offset = 0) => (red, green, blue) => `\x1B[${38 + offset};2;${red};${green};${blue}m`;
    styles = {
      modifier: {
        reset: [0, 0],
        // 21 isn't widely supported and 22 does the same thing
        bold: [1, 22],
        dim: [2, 22],
        italic: [3, 23],
        underline: [4, 24],
        overline: [53, 55],
        inverse: [7, 27],
        hidden: [8, 28],
        strikethrough: [9, 29]
      },
      color: {
        black: [30, 39],
        red: [31, 39],
        green: [32, 39],
        yellow: [33, 39],
        blue: [34, 39],
        magenta: [35, 39],
        cyan: [36, 39],
        white: [37, 39],
        // Bright color
        blackBright: [90, 39],
        gray: [90, 39],
        // Alias of `blackBright`
        grey: [90, 39],
        // Alias of `blackBright`
        redBright: [91, 39],
        greenBright: [92, 39],
        yellowBright: [93, 39],
        blueBright: [94, 39],
        magentaBright: [95, 39],
        cyanBright: [96, 39],
        whiteBright: [97, 39]
      },
      bgColor: {
        bgBlack: [40, 49],
        bgRed: [41, 49],
        bgGreen: [42, 49],
        bgYellow: [43, 49],
        bgBlue: [44, 49],
        bgMagenta: [45, 49],
        bgCyan: [46, 49],
        bgWhite: [47, 49],
        // Bright color
        bgBlackBright: [100, 49],
        bgGray: [100, 49],
        // Alias of `bgBlackBright`
        bgGrey: [100, 49],
        // Alias of `bgBlackBright`
        bgRedBright: [101, 49],
        bgGreenBright: [102, 49],
        bgYellowBright: [103, 49],
        bgBlueBright: [104, 49],
        bgMagentaBright: [105, 49],
        bgCyanBright: [106, 49],
        bgWhiteBright: [107, 49]
      }
    };
    modifierNames = Object.keys(styles.modifier);
    foregroundColorNames = Object.keys(styles.color);
    backgroundColorNames = Object.keys(styles.bgColor);
    colorNames = [...foregroundColorNames, ...backgroundColorNames];
    ansiStyles = assembleStyles();
    ansi_styles_default = ansiStyles;
  }
});

// node_modules/chalk/source/vendor/supports-color/index.js
import process2 from "process";
import os from "os";
import tty from "tty";
function hasFlag(flag, argv = globalThis.Deno ? globalThis.Deno.args : process2.argv) {
  const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
  const position = argv.indexOf(prefix + flag);
  const terminatorPosition = argv.indexOf("--");
  return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
}
function envForceColor() {
  if ("FORCE_COLOR" in env) {
    if (env.FORCE_COLOR === "true") {
      return 1;
    }
    if (env.FORCE_COLOR === "false") {
      return 0;
    }
    return env.FORCE_COLOR.length === 0 ? 1 : Math.min(Number.parseInt(env.FORCE_COLOR, 10), 3);
  }
}
function translateLevel(level) {
  if (level === 0) {
    return false;
  }
  return {
    level,
    hasBasic: true,
    has256: level >= 2,
    has16m: level >= 3
  };
}
function _supportsColor(haveStream, { streamIsTTY, sniffFlags = true } = {}) {
  const noFlagForceColor = envForceColor();
  if (noFlagForceColor !== void 0) {
    flagForceColor = noFlagForceColor;
  }
  const forceColor = sniffFlags ? flagForceColor : noFlagForceColor;
  if (forceColor === 0) {
    return 0;
  }
  if (sniffFlags) {
    if (hasFlag("color=16m") || hasFlag("color=full") || hasFlag("color=truecolor")) {
      return 3;
    }
    if (hasFlag("color=256")) {
      return 2;
    }
  }
  if ("TF_BUILD" in env && "AGENT_NAME" in env) {
    return 1;
  }
  if (haveStream && !streamIsTTY && forceColor === void 0) {
    return 0;
  }
  const min = forceColor || 0;
  if (env.TERM === "dumb") {
    return min;
  }
  if (process2.platform === "win32") {
    const osRelease = os.release().split(".");
    if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
      return Number(osRelease[2]) >= 14931 ? 3 : 2;
    }
    return 1;
  }
  if ("CI" in env) {
    if ("GITHUB_ACTIONS" in env || "GITEA_ACTIONS" in env) {
      return 3;
    }
    if (["TRAVIS", "CIRCLECI", "APPVEYOR", "GITLAB_CI", "BUILDKITE", "DRONE"].some((sign2) => sign2 in env) || env.CI_NAME === "codeship") {
      return 1;
    }
    return min;
  }
  if ("TEAMCITY_VERSION" in env) {
    return /^(9\.(0*[1-9]\d*)\.|\d{2,}\.)/.test(env.TEAMCITY_VERSION) ? 1 : 0;
  }
  if (env.COLORTERM === "truecolor") {
    return 3;
  }
  if (env.TERM === "xterm-kitty") {
    return 3;
  }
  if ("TERM_PROGRAM" in env) {
    const version = Number.parseInt((env.TERM_PROGRAM_VERSION || "").split(".")[0], 10);
    switch (env.TERM_PROGRAM) {
      case "iTerm.app": {
        return version >= 3 ? 3 : 2;
      }
      case "Apple_Terminal": {
        return 2;
      }
    }
  }
  if (/-256(color)?$/i.test(env.TERM)) {
    return 2;
  }
  if (/^screen|^xterm|^vt100|^vt220|^rxvt|color|ansi|cygwin|linux/i.test(env.TERM)) {
    return 1;
  }
  if ("COLORTERM" in env) {
    return 1;
  }
  return min;
}
function createSupportsColor(stream, options8 = {}) {
  const level = _supportsColor(stream, {
    streamIsTTY: stream && stream.isTTY,
    ...options8
  });
  return translateLevel(level);
}
var env, flagForceColor, supportsColor, supports_color_default;
var init_supports_color = __esm({
  "node_modules/chalk/source/vendor/supports-color/index.js"() {
    ({ env } = process2);
    if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
      flagForceColor = 0;
    } else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
      flagForceColor = 1;
    }
    supportsColor = {
      stdout: createSupportsColor({ isTTY: tty.isatty(1) }),
      stderr: createSupportsColor({ isTTY: tty.isatty(2) })
    };
    supports_color_default = supportsColor;
  }
});

// node_modules/chalk/source/utilities.js
function stringReplaceAll(string, substring, replacer) {
  let index = string.indexOf(substring);
  if (index === -1) {
    return string;
  }
  const substringLength = substring.length;
  let endIndex = 0;
  let returnValue = "";
  do {
    returnValue += string.slice(endIndex, index) + substring + replacer;
    endIndex = index + substringLength;
    index = string.indexOf(substring, endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}
function stringEncaseCRLFWithFirstIndex(string, prefix, postfix, index) {
  let endIndex = 0;
  let returnValue = "";
  do {
    const gotCR = string[index - 1] === "\r";
    returnValue += string.slice(endIndex, gotCR ? index - 1 : index) + prefix + (gotCR ? "\r\n" : "\n") + postfix;
    endIndex = index + 1;
    index = string.indexOf("\n", endIndex);
  } while (index !== -1);
  returnValue += string.slice(endIndex);
  return returnValue;
}
var init_utilities = __esm({
  "node_modules/chalk/source/utilities.js"() {
  }
});

// node_modules/chalk/source/index.js
var source_exports = {};
__export(source_exports, {
  Chalk: () => Chalk,
  backgroundColorNames: () => backgroundColorNames,
  backgroundColors: () => backgroundColorNames,
  chalkStderr: () => chalkStderr,
  colorNames: () => colorNames,
  colors: () => colorNames,
  default: () => source_default,
  foregroundColorNames: () => foregroundColorNames,
  foregroundColors: () => foregroundColorNames,
  modifierNames: () => modifierNames,
  modifiers: () => modifierNames,
  supportsColor: () => stdoutColor,
  supportsColorStderr: () => stderrColor
});
function createChalk(options8) {
  return chalkFactory(options8);
}
var stdoutColor, stderrColor, GENERATOR, STYLER, IS_EMPTY, levelMapping, styles2, applyOptions, Chalk, chalkFactory, getModelAnsi, usedModels, proto, createStyler, createBuilder, applyStyle, chalk, chalkStderr, source_default;
var init_source = __esm({
  "node_modules/chalk/source/index.js"() {
    init_ansi_styles();
    init_supports_color();
    init_utilities();
    init_ansi_styles();
    ({ stdout: stdoutColor, stderr: stderrColor } = supports_color_default);
    GENERATOR = Symbol("GENERATOR");
    STYLER = Symbol("STYLER");
    IS_EMPTY = Symbol("IS_EMPTY");
    levelMapping = [
      "ansi",
      "ansi",
      "ansi256",
      "ansi16m"
    ];
    styles2 = /* @__PURE__ */ Object.create(null);
    applyOptions = (object, options8 = {}) => {
      if (options8.level && !(Number.isInteger(options8.level) && options8.level >= 0 && options8.level <= 3)) {
        throw new Error("The `level` option should be an integer from 0 to 3");
      }
      const colorLevel = stdoutColor ? stdoutColor.level : 0;
      object.level = options8.level === void 0 ? colorLevel : options8.level;
    };
    Chalk = class {
      constructor(options8) {
        return chalkFactory(options8);
      }
    };
    chalkFactory = (options8) => {
      const chalk2 = (...strings) => strings.join(" ");
      applyOptions(chalk2, options8);
      Object.setPrototypeOf(chalk2, createChalk.prototype);
      return chalk2;
    };
    Object.setPrototypeOf(createChalk.prototype, Function.prototype);
    for (const [styleName, style] of Object.entries(ansi_styles_default)) {
      styles2[styleName] = {
        get() {
          const builder = createBuilder(this, createStyler(style.open, style.close, this[STYLER]), this[IS_EMPTY]);
          Object.defineProperty(this, styleName, { value: builder });
          return builder;
        }
      };
    }
    styles2.visible = {
      get() {
        const builder = createBuilder(this, this[STYLER], true);
        Object.defineProperty(this, "visible", { value: builder });
        return builder;
      }
    };
    getModelAnsi = (model, level, type2, ...arguments_) => {
      if (model === "rgb") {
        if (level === "ansi16m") {
          return ansi_styles_default[type2].ansi16m(...arguments_);
        }
        if (level === "ansi256") {
          return ansi_styles_default[type2].ansi256(ansi_styles_default.rgbToAnsi256(...arguments_));
        }
        return ansi_styles_default[type2].ansi(ansi_styles_default.rgbToAnsi(...arguments_));
      }
      if (model === "hex") {
        return getModelAnsi("rgb", level, type2, ...ansi_styles_default.hexToRgb(...arguments_));
      }
      return ansi_styles_default[type2][model](...arguments_);
    };
    usedModels = ["rgb", "hex", "ansi256"];
    for (const model of usedModels) {
      styles2[model] = {
        get() {
          const { level } = this;
          return function(...arguments_) {
            const styler = createStyler(getModelAnsi(model, levelMapping[level], "color", ...arguments_), ansi_styles_default.color.close, this[STYLER]);
            return createBuilder(this, styler, this[IS_EMPTY]);
          };
        }
      };
      const bgModel = "bg" + model[0].toUpperCase() + model.slice(1);
      styles2[bgModel] = {
        get() {
          const { level } = this;
          return function(...arguments_) {
            const styler = createStyler(getModelAnsi(model, levelMapping[level], "bgColor", ...arguments_), ansi_styles_default.bgColor.close, this[STYLER]);
            return createBuilder(this, styler, this[IS_EMPTY]);
          };
        }
      };
    }
    proto = Object.defineProperties(() => {
    }, {
      ...styles2,
      level: {
        enumerable: true,
        get() {
          return this[GENERATOR].level;
        },
        set(level) {
          this[GENERATOR].level = level;
        }
      }
    });
    createStyler = (open, close, parent) => {
      let openAll;
      let closeAll;
      if (parent === void 0) {
        openAll = open;
        closeAll = close;
      } else {
        openAll = parent.openAll + open;
        closeAll = close + parent.closeAll;
      }
      return {
        open,
        close,
        openAll,
        closeAll,
        parent
      };
    };
    createBuilder = (self, _styler, _isEmpty) => {
      const builder = (...arguments_) => applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
      Object.setPrototypeOf(builder, proto);
      builder[GENERATOR] = self;
      builder[STYLER] = _styler;
      builder[IS_EMPTY] = _isEmpty;
      return builder;
    };
    applyStyle = (self, string) => {
      if (self.level <= 0 || !string) {
        return self[IS_EMPTY] ? "" : string;
      }
      let styler = self[STYLER];
      if (styler === void 0) {
        return string;
      }
      const { openAll, closeAll } = styler;
      if (string.includes("\x1B")) {
        while (styler !== void 0) {
          string = stringReplaceAll(string, styler.close, styler.open);
          styler = styler.parent;
        }
      }
      const lfIndex = string.indexOf("\n");
      if (lfIndex !== -1) {
        string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex);
      }
      return openAll + string + closeAll;
    };
    Object.defineProperties(createChalk.prototype, styles2);
    chalk = createChalk();
    chalkStderr = createChalk({ level: stderrColor ? stderrColor.level : 0 });
    source_default = chalk;
  }
});

// node_modules/semver/internal/debug.js
var require_debug = __commonJS({
  "node_modules/semver/internal/debug.js"(exports, module) {
    var debug = typeof process === "object" && process.env && process.env.NODE_DEBUG && /\bsemver\b/i.test(process.env.NODE_DEBUG) ? (...args) => console.error("SEMVER", ...args) : () => {
    };
    module.exports = debug;
  }
});

// node_modules/semver/internal/constants.js
var require_constants4 = __commonJS({
  "node_modules/semver/internal/constants.js"(exports, module) {
    var SEMVER_SPEC_VERSION = "2.0.0";
    var MAX_LENGTH = 256;
    var MAX_SAFE_INTEGER = Number.MAX_SAFE_INTEGER || /* istanbul ignore next */
    9007199254740991;
    var MAX_SAFE_COMPONENT_LENGTH = 16;
    var MAX_SAFE_BUILD_LENGTH = MAX_LENGTH - 6;
    var RELEASE_TYPES = [
      "major",
      "premajor",
      "minor",
      "preminor",
      "patch",
      "prepatch",
      "prerelease"
    ];
    module.exports = {
      MAX_LENGTH,
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_SAFE_INTEGER,
      RELEASE_TYPES,
      SEMVER_SPEC_VERSION,
      FLAG_INCLUDE_PRERELEASE: 1,
      FLAG_LOOSE: 2
    };
  }
});

// node_modules/semver/internal/re.js
var require_re = __commonJS({
  "node_modules/semver/internal/re.js"(exports, module) {
    var {
      MAX_SAFE_COMPONENT_LENGTH,
      MAX_SAFE_BUILD_LENGTH,
      MAX_LENGTH
    } = require_constants4();
    var debug = require_debug();
    exports = module.exports = {};
    var re = exports.re = [];
    var safeRe = exports.safeRe = [];
    var src = exports.src = [];
    var t = exports.t = {};
    var R = 0;
    var LETTERDASHNUMBER = "[a-zA-Z0-9-]";
    var safeRegexReplacements = [
      ["\\s", 1],
      ["\\d", MAX_LENGTH],
      [LETTERDASHNUMBER, MAX_SAFE_BUILD_LENGTH]
    ];
    var makeSafeRegex = (value) => {
      for (const [token2, max] of safeRegexReplacements) {
        value = value.split(`${token2}*`).join(`${token2}{0,${max}}`).split(`${token2}+`).join(`${token2}{1,${max}}`);
      }
      return value;
    };
    var createToken = (name, value, isGlobal) => {
      const safe = makeSafeRegex(value);
      const index = R++;
      debug(name, index, value);
      t[name] = index;
      src[index] = value;
      re[index] = new RegExp(value, isGlobal ? "g" : void 0);
      safeRe[index] = new RegExp(safe, isGlobal ? "g" : void 0);
    };
    createToken("NUMERICIDENTIFIER", "0|[1-9]\\d*");
    createToken("NUMERICIDENTIFIERLOOSE", "\\d+");
    createToken("NONNUMERICIDENTIFIER", `\\d*[a-zA-Z-]${LETTERDASHNUMBER}*`);
    createToken("MAINVERSION", `(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})\\.(${src[t.NUMERICIDENTIFIER]})`);
    createToken("MAINVERSIONLOOSE", `(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})\\.(${src[t.NUMERICIDENTIFIERLOOSE]})`);
    createToken("PRERELEASEIDENTIFIER", `(?:${src[t.NUMERICIDENTIFIER]}|${src[t.NONNUMERICIDENTIFIER]})`);
    createToken("PRERELEASEIDENTIFIERLOOSE", `(?:${src[t.NUMERICIDENTIFIERLOOSE]}|${src[t.NONNUMERICIDENTIFIER]})`);
    createToken("PRERELEASE", `(?:-(${src[t.PRERELEASEIDENTIFIER]}(?:\\.${src[t.PRERELEASEIDENTIFIER]})*))`);
    createToken("PRERELEASELOOSE", `(?:-?(${src[t.PRERELEASEIDENTIFIERLOOSE]}(?:\\.${src[t.PRERELEASEIDENTIFIERLOOSE]})*))`);
    createToken("BUILDIDENTIFIER", `${LETTERDASHNUMBER}+`);
    createToken("BUILD", `(?:\\+(${src[t.BUILDIDENTIFIER]}(?:\\.${src[t.BUILDIDENTIFIER]})*))`);
    createToken("FULLPLAIN", `v?${src[t.MAINVERSION]}${src[t.PRERELEASE]}?${src[t.BUILD]}?`);
    createToken("FULL", `^${src[t.FULLPLAIN]}$`);
    createToken("LOOSEPLAIN", `[v=\\s]*${src[t.MAINVERSIONLOOSE]}${src[t.PRERELEASELOOSE]}?${src[t.BUILD]}?`);
    createToken("LOOSE", `^${src[t.LOOSEPLAIN]}$`);
    createToken("GTLT", "((?:<|>)?=?)");
    createToken("XRANGEIDENTIFIERLOOSE", `${src[t.NUMERICIDENTIFIERLOOSE]}|x|X|\\*`);
    createToken("XRANGEIDENTIFIER", `${src[t.NUMERICIDENTIFIER]}|x|X|\\*`);
    createToken("XRANGEPLAIN", `[v=\\s]*(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:\\.(${src[t.XRANGEIDENTIFIER]})(?:${src[t.PRERELEASE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGEPLAINLOOSE", `[v=\\s]*(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:\\.(${src[t.XRANGEIDENTIFIERLOOSE]})(?:${src[t.PRERELEASELOOSE]})?${src[t.BUILD]}?)?)?`);
    createToken("XRANGE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAIN]}$`);
    createToken("XRANGELOOSE", `^${src[t.GTLT]}\\s*${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COERCEPLAIN", `${"(^|[^\\d])(\\d{1,"}${MAX_SAFE_COMPONENT_LENGTH}})(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?(?:\\.(\\d{1,${MAX_SAFE_COMPONENT_LENGTH}}))?`);
    createToken("COERCE", `${src[t.COERCEPLAIN]}(?:$|[^\\d])`);
    createToken("COERCEFULL", src[t.COERCEPLAIN] + `(?:${src[t.PRERELEASE]})?(?:${src[t.BUILD]})?(?:$|[^\\d])`);
    createToken("COERCERTL", src[t.COERCE], true);
    createToken("COERCERTLFULL", src[t.COERCEFULL], true);
    createToken("LONETILDE", "(?:~>?)");
    createToken("TILDETRIM", `(\\s*)${src[t.LONETILDE]}\\s+`, true);
    exports.tildeTrimReplace = "$1~";
    createToken("TILDE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAIN]}$`);
    createToken("TILDELOOSE", `^${src[t.LONETILDE]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("LONECARET", "(?:\\^)");
    createToken("CARETTRIM", `(\\s*)${src[t.LONECARET]}\\s+`, true);
    exports.caretTrimReplace = "$1^";
    createToken("CARET", `^${src[t.LONECARET]}${src[t.XRANGEPLAIN]}$`);
    createToken("CARETLOOSE", `^${src[t.LONECARET]}${src[t.XRANGEPLAINLOOSE]}$`);
    createToken("COMPARATORLOOSE", `^${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]})$|^$`);
    createToken("COMPARATOR", `^${src[t.GTLT]}\\s*(${src[t.FULLPLAIN]})$|^$`);
    createToken("COMPARATORTRIM", `(\\s*)${src[t.GTLT]}\\s*(${src[t.LOOSEPLAIN]}|${src[t.XRANGEPLAIN]})`, true);
    exports.comparatorTrimReplace = "$1$2$3";
    createToken("HYPHENRANGE", `^\\s*(${src[t.XRANGEPLAIN]})\\s+-\\s+(${src[t.XRANGEPLAIN]})\\s*$`);
    createToken("HYPHENRANGELOOSE", `^\\s*(${src[t.XRANGEPLAINLOOSE]})\\s+-\\s+(${src[t.XRANGEPLAINLOOSE]})\\s*$`);
    createToken("STAR", "(<|>)?=?\\s*\\*");
    createToken("GTE0", "^\\s*>=\\s*0\\.0\\.0\\s*$");
    createToken("GTE0PRE", "^\\s*>=\\s*0\\.0\\.0-0\\s*$");
  }
});

// node_modules/semver/internal/parse-options.js
var require_parse_options = __commonJS({
  "node_modules/semver/internal/parse-options.js"(exports, module) {
    var looseOption = Object.freeze({ loose: true });
    var emptyOpts = Object.freeze({});
    var parseOptions = (options8) => {
      if (!options8) {
        return emptyOpts;
      }
      if (typeof options8 !== "object") {
        return looseOption;
      }
      return options8;
    };
    module.exports = parseOptions;
  }
});

// node_modules/semver/internal/identifiers.js
var require_identifiers = __commonJS({
  "node_modules/semver/internal/identifiers.js"(exports, module) {
    var numeric = /^[0-9]+$/;
    var compareIdentifiers = (a, b) => {
      const anum = numeric.test(a);
      const bnum = numeric.test(b);
      if (anum && bnum) {
        a = +a;
        b = +b;
      }
      return a === b ? 0 : anum && !bnum ? -1 : bnum && !anum ? 1 : a < b ? -1 : 1;
    };
    var rcompareIdentifiers = (a, b) => compareIdentifiers(b, a);
    module.exports = {
      compareIdentifiers,
      rcompareIdentifiers
    };
  }
});

// node_modules/semver/classes/semver.js
var require_semver = __commonJS({
  "node_modules/semver/classes/semver.js"(exports, module) {
    var debug = require_debug();
    var { MAX_LENGTH, MAX_SAFE_INTEGER } = require_constants4();
    var { safeRe: re, t } = require_re();
    var parseOptions = require_parse_options();
    var { compareIdentifiers } = require_identifiers();
    var SemVer = class _SemVer {
      constructor(version, options8) {
        options8 = parseOptions(options8);
        if (version instanceof _SemVer) {
          if (version.loose === !!options8.loose && version.includePrerelease === !!options8.includePrerelease) {
            return version;
          } else {
            version = version.version;
          }
        } else if (typeof version !== "string") {
          throw new TypeError(`Invalid version. Must be a string. Got type "${typeof version}".`);
        }
        if (version.length > MAX_LENGTH) {
          throw new TypeError(
            `version is longer than ${MAX_LENGTH} characters`
          );
        }
        debug("SemVer", version, options8);
        this.options = options8;
        this.loose = !!options8.loose;
        this.includePrerelease = !!options8.includePrerelease;
        const m = version.trim().match(options8.loose ? re[t.LOOSE] : re[t.FULL]);
        if (!m) {
          throw new TypeError(`Invalid Version: ${version}`);
        }
        this.raw = version;
        this.major = +m[1];
        this.minor = +m[2];
        this.patch = +m[3];
        if (this.major > MAX_SAFE_INTEGER || this.major < 0) {
          throw new TypeError("Invalid major version");
        }
        if (this.minor > MAX_SAFE_INTEGER || this.minor < 0) {
          throw new TypeError("Invalid minor version");
        }
        if (this.patch > MAX_SAFE_INTEGER || this.patch < 0) {
          throw new TypeError("Invalid patch version");
        }
        if (!m[4]) {
          this.prerelease = [];
        } else {
          this.prerelease = m[4].split(".").map((id) => {
            if (/^[0-9]+$/.test(id)) {
              const num = +id;
              if (num >= 0 && num < MAX_SAFE_INTEGER) {
                return num;
              }
            }
            return id;
          });
        }
        this.build = m[5] ? m[5].split(".") : [];
        this.format();
      }
      format() {
        this.version = `${this.major}.${this.minor}.${this.patch}`;
        if (this.prerelease.length) {
          this.version += `-${this.prerelease.join(".")}`;
        }
        return this.version;
      }
      toString() {
        return this.version;
      }
      compare(other) {
        debug("SemVer.compare", this.version, this.options, other);
        if (!(other instanceof _SemVer)) {
          if (typeof other === "string" && other === this.version) {
            return 0;
          }
          other = new _SemVer(other, this.options);
        }
        if (other.version === this.version) {
          return 0;
        }
        return this.compareMain(other) || this.comparePre(other);
      }
      compareMain(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        return compareIdentifiers(this.major, other.major) || compareIdentifiers(this.minor, other.minor) || compareIdentifiers(this.patch, other.patch);
      }
      comparePre(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        if (this.prerelease.length && !other.prerelease.length) {
          return -1;
        } else if (!this.prerelease.length && other.prerelease.length) {
          return 1;
        } else if (!this.prerelease.length && !other.prerelease.length) {
          return 0;
        }
        let i = 0;
        do {
          const a = this.prerelease[i];
          const b = other.prerelease[i];
          debug("prerelease compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      compareBuild(other) {
        if (!(other instanceof _SemVer)) {
          other = new _SemVer(other, this.options);
        }
        let i = 0;
        do {
          const a = this.build[i];
          const b = other.build[i];
          debug("build compare", i, a, b);
          if (a === void 0 && b === void 0) {
            return 0;
          } else if (b === void 0) {
            return 1;
          } else if (a === void 0) {
            return -1;
          } else if (a === b) {
            continue;
          } else {
            return compareIdentifiers(a, b);
          }
        } while (++i);
      }
      // preminor will bump the version up to the next minor release, and immediately
      // down to pre-release. premajor and prepatch work the same way.
      inc(release, identifier, identifierBase) {
        switch (release) {
          case "premajor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor = 0;
            this.major++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "preminor":
            this.prerelease.length = 0;
            this.patch = 0;
            this.minor++;
            this.inc("pre", identifier, identifierBase);
            break;
          case "prepatch":
            this.prerelease.length = 0;
            this.inc("patch", identifier, identifierBase);
            this.inc("pre", identifier, identifierBase);
            break;
          case "prerelease":
            if (this.prerelease.length === 0) {
              this.inc("patch", identifier, identifierBase);
            }
            this.inc("pre", identifier, identifierBase);
            break;
          case "major":
            if (this.minor !== 0 || this.patch !== 0 || this.prerelease.length === 0) {
              this.major++;
            }
            this.minor = 0;
            this.patch = 0;
            this.prerelease = [];
            break;
          case "minor":
            if (this.patch !== 0 || this.prerelease.length === 0) {
              this.minor++;
            }
            this.patch = 0;
            this.prerelease = [];
            break;
          case "patch":
            if (this.prerelease.length === 0) {
              this.patch++;
            }
            this.prerelease = [];
            break;
          case "pre": {
            const base = Number(identifierBase) ? 1 : 0;
            if (!identifier && identifierBase === false) {
              throw new Error("invalid increment argument: identifier is empty");
            }
            if (this.prerelease.length === 0) {
              this.prerelease = [base];
            } else {
              let i = this.prerelease.length;
              while (--i >= 0) {
                if (typeof this.prerelease[i] === "number") {
                  this.prerelease[i]++;
                  i = -2;
                }
              }
              if (i === -1) {
                if (identifier === this.prerelease.join(".") && identifierBase === false) {
                  throw new Error("invalid increment argument: identifier already exists");
                }
                this.prerelease.push(base);
              }
            }
            if (identifier) {
              let prerelease = [identifier, base];
              if (identifierBase === false) {
                prerelease = [identifier];
              }
              if (compareIdentifiers(this.prerelease[0], identifier) === 0) {
                if (isNaN(this.prerelease[1])) {
                  this.prerelease = prerelease;
                }
              } else {
                this.prerelease = prerelease;
              }
            }
            break;
          }
          default:
            throw new Error(`invalid increment argument: ${release}`);
        }
        this.raw = this.format();
        if (this.build.length) {
          this.raw += `+${this.build.join(".")}`;
        }
        return this;
      }
    };
    module.exports = SemVer;
  }
});

// node_modules/semver/functions/compare.js
var require_compare = __commonJS({
  "node_modules/semver/functions/compare.js"(exports, module) {
    var SemVer = require_semver();
    var compare = (a, b, loose) => new SemVer(a, loose).compare(new SemVer(b, loose));
    module.exports = compare;
  }
});

// node_modules/semver/functions/gte.js
var require_gte = __commonJS({
  "node_modules/semver/functions/gte.js"(exports, module) {
    var compare = require_compare();
    var gte = (a, b, loose) => compare(a, b, loose) >= 0;
    module.exports = gte;
  }
});

// node_modules/pseudomap/pseudomap.js
var require_pseudomap = __commonJS({
  "node_modules/pseudomap/pseudomap.js"(exports, module) {
    var hasOwnProperty3 = Object.prototype.hasOwnProperty;
    module.exports = PseudoMap;
    function PseudoMap(set3) {
      if (!(this instanceof PseudoMap))
        throw new TypeError("Constructor PseudoMap requires 'new'");
      this.clear();
      if (set3) {
        if (set3 instanceof PseudoMap || typeof Map === "function" && set3 instanceof Map)
          set3.forEach(function(value, key2) {
            this.set(key2, value);
          }, this);
        else if (Array.isArray(set3))
          set3.forEach(function(kv) {
            this.set(kv[0], kv[1]);
          }, this);
        else
          throw new TypeError("invalid argument");
      }
    }
    PseudoMap.prototype.forEach = function(fn, thisp) {
      thisp = thisp || this;
      Object.keys(this._data).forEach(function(k) {
        if (k !== "size")
          fn.call(thisp, this._data[k].value, this._data[k].key);
      }, this);
    };
    PseudoMap.prototype.has = function(k) {
      return !!find(this._data, k);
    };
    PseudoMap.prototype.get = function(k) {
      var res = find(this._data, k);
      return res && res.value;
    };
    PseudoMap.prototype.set = function(k, v) {
      set2(this._data, k, v);
    };
    PseudoMap.prototype.delete = function(k) {
      var res = find(this._data, k);
      if (res) {
        delete this._data[res._index];
        this._data.size--;
      }
    };
    PseudoMap.prototype.clear = function() {
      var data = /* @__PURE__ */ Object.create(null);
      data.size = 0;
      Object.defineProperty(this, "_data", {
        value: data,
        enumerable: false,
        configurable: true,
        writable: false
      });
    };
    Object.defineProperty(PseudoMap.prototype, "size", {
      get: function() {
        return this._data.size;
      },
      set: function(n) {
      },
      enumerable: true,
      configurable: true
    });
    PseudoMap.prototype.values = PseudoMap.prototype.keys = PseudoMap.prototype.entries = function() {
      throw new Error("iterators are not implemented in this version");
    };
    function same(a, b) {
      return a === b || a !== a && b !== b;
    }
    function Entry(k, v, i) {
      this.key = k;
      this.value = v;
      this._index = i;
    }
    function find(data, k) {
      for (var i = 0, s = "_" + k, key2 = s; hasOwnProperty3.call(data, key2); key2 = s + i++) {
        if (same(data[key2].key, k))
          return data[key2];
      }
    }
    function set2(data, k, v) {
      for (var i = 0, s = "_" + k, key2 = s; hasOwnProperty3.call(data, key2); key2 = s + i++) {
        if (same(data[key2].key, k)) {
          data[key2].value = v;
          return;
        }
      }
      data.size++;
      data[key2] = new Entry(k, v, key2);
    }
  }
});

// node_modules/pseudomap/map.js
var require_map = __commonJS({
  "node_modules/pseudomap/map.js"(exports, module) {
    if (process.env.npm_package_name === "pseudomap" && process.env.npm_lifecycle_script === "test")
      process.env.TEST_PSEUDOMAP = "true";
    if (typeof Map === "function" && !process.env.TEST_PSEUDOMAP) {
      module.exports = Map;
    } else {
      module.exports = require_pseudomap();
    }
  }
});

// node_modules/yallist/yallist.js
var require_yallist = __commonJS({
  "node_modules/yallist/yallist.js"(exports, module) {
    module.exports = Yallist;
    Yallist.Node = Node;
    Yallist.create = Yallist;
    function Yallist(list) {
      var self = this;
      if (!(self instanceof Yallist)) {
        self = new Yallist();
      }
      self.tail = null;
      self.head = null;
      self.length = 0;
      if (list && typeof list.forEach === "function") {
        list.forEach(function(item) {
          self.push(item);
        });
      } else if (arguments.length > 0) {
        for (var i = 0, l = arguments.length; i < l; i++) {
          self.push(arguments[i]);
        }
      }
      return self;
    }
    Yallist.prototype.removeNode = function(node) {
      if (node.list !== this) {
        throw new Error("removing node which does not belong to this list");
      }
      var next = node.next;
      var prev = node.prev;
      if (next) {
        next.prev = prev;
      }
      if (prev) {
        prev.next = next;
      }
      if (node === this.head) {
        this.head = next;
      }
      if (node === this.tail) {
        this.tail = prev;
      }
      node.list.length--;
      node.next = null;
      node.prev = null;
      node.list = null;
    };
    Yallist.prototype.unshiftNode = function(node) {
      if (node === this.head) {
        return;
      }
      if (node.list) {
        node.list.removeNode(node);
      }
      var head = this.head;
      node.list = this;
      node.next = head;
      if (head) {
        head.prev = node;
      }
      this.head = node;
      if (!this.tail) {
        this.tail = node;
      }
      this.length++;
    };
    Yallist.prototype.pushNode = function(node) {
      if (node === this.tail) {
        return;
      }
      if (node.list) {
        node.list.removeNode(node);
      }
      var tail = this.tail;
      node.list = this;
      node.prev = tail;
      if (tail) {
        tail.next = node;
      }
      this.tail = node;
      if (!this.head) {
        this.head = node;
      }
      this.length++;
    };
    Yallist.prototype.push = function() {
      for (var i = 0, l = arguments.length; i < l; i++) {
        push2(this, arguments[i]);
      }
      return this.length;
    };
    Yallist.prototype.unshift = function() {
      for (var i = 0, l = arguments.length; i < l; i++) {
        unshift(this, arguments[i]);
      }
      return this.length;
    };
    Yallist.prototype.pop = function() {
      if (!this.tail) {
        return void 0;
      }
      var res = this.tail.value;
      this.tail = this.tail.prev;
      if (this.tail) {
        this.tail.next = null;
      } else {
        this.head = null;
      }
      this.length--;
      return res;
    };
    Yallist.prototype.shift = function() {
      if (!this.head) {
        return void 0;
      }
      var res = this.head.value;
      this.head = this.head.next;
      if (this.head) {
        this.head.prev = null;
      } else {
        this.tail = null;
      }
      this.length--;
      return res;
    };
    Yallist.prototype.forEach = function(fn, thisp) {
      thisp = thisp || this;
      for (var walker = this.head, i = 0; walker !== null; i++) {
        fn.call(thisp, walker.value, i, this);
        walker = walker.next;
      }
    };
    Yallist.prototype.forEachReverse = function(fn, thisp) {
      thisp = thisp || this;
      for (var walker = this.tail, i = this.length - 1; walker !== null; i--) {
        fn.call(thisp, walker.value, i, this);
        walker = walker.prev;
      }
    };
    Yallist.prototype.get = function(n) {
      for (var i = 0, walker = this.head; walker !== null && i < n; i++) {
        walker = walker.next;
      }
      if (i === n && walker !== null) {
        return walker.value;
      }
    };
    Yallist.prototype.getReverse = function(n) {
      for (var i = 0, walker = this.tail; walker !== null && i < n; i++) {
        walker = walker.prev;
      }
      if (i === n && walker !== null) {
        return walker.value;
      }
    };
    Yallist.prototype.map = function(fn, thisp) {
      thisp = thisp || this;
      var res = new Yallist();
      for (var walker = this.head; walker !== null; ) {
        res.push(fn.call(thisp, walker.value, this));
        walker = walker.next;
      }
      return res;
    };
    Yallist.prototype.mapReverse = function(fn, thisp) {
      thisp = thisp || this;
      var res = new Yallist();
      for (var walker = this.tail; walker !== null; ) {
        res.push(fn.call(thisp, walker.value, this));
        walker = walker.prev;
      }
      return res;
    };
    Yallist.prototype.reduce = function(fn, initial) {
      var acc;
      var walker = this.head;
      if (arguments.length > 1) {
        acc = initial;
      } else if (this.head) {
        walker = this.head.next;
        acc = this.head.value;
      } else {
        throw new TypeError("Reduce of empty list with no initial value");
      }
      for (var i = 0; walker !== null; i++) {
        acc = fn(acc, walker.value, i);
        walker = walker.next;
      }
      return acc;
    };
    Yallist.prototype.reduceReverse = function(fn, initial) {
      var acc;
      var walker = this.tail;
      if (arguments.length > 1) {
        acc = initial;
      } else if (this.tail) {
        walker = this.tail.prev;
        acc = this.tail.value;
      } else {
        throw new TypeError("Reduce of empty list with no initial value");
      }
      for (var i = this.length - 1; walker !== null; i--) {
        acc = fn(acc, walker.value, i);
        walker = walker.prev;
      }
      return acc;
    };
    Yallist.prototype.toArray = function() {
      var arr = new Array(this.length);
      for (var i = 0, walker = this.head; walker !== null; i++) {
        arr[i] = walker.value;
        walker = walker.next;
      }
      return arr;
    };
    Yallist.prototype.toArrayReverse = function() {
      var arr = new Array(this.length);
      for (var i = 0, walker = this.tail; walker !== null; i++) {
        arr[i] = walker.value;
        walker = walker.prev;
      }
      return arr;
    };
    Yallist.prototype.slice = function(from, to) {
      to = to || this.length;
      if (to < 0) {
        to += this.length;
      }
      from = from || 0;
      if (from < 0) {
        from += this.length;
      }
      var ret = new Yallist();
      if (to < from || to < 0) {
        return ret;
      }
      if (from < 0) {
        from = 0;
      }
      if (to > this.length) {
        to = this.length;
      }
      for (var i = 0, walker = this.head; walker !== null && i < from; i++) {
        walker = walker.next;
      }
      for (; walker !== null && i < to; i++, walker = walker.next) {
        ret.push(walker.value);
      }
      return ret;
    };
    Yallist.prototype.sliceReverse = function(from, to) {
      to = to || this.length;
      if (to < 0) {
        to += this.length;
      }
      from = from || 0;
      if (from < 0) {
        from += this.length;
      }
      var ret = new Yallist();
      if (to < from || to < 0) {
        return ret;
      }
      if (from < 0) {
        from = 0;
      }
      if (to > this.length) {
        to = this.length;
      }
      for (var i = this.length, walker = this.tail; walker !== null && i > to; i--) {
        walker = walker.prev;
      }
      for (; walker !== null && i > from; i--, walker = walker.prev) {
        ret.push(walker.value);
      }
      return ret;
    };
    Yallist.prototype.reverse = function() {
      var head = this.head;
      var tail = this.tail;
      for (var walker = head; walker !== null; walker = walker.prev) {
        var p = walker.prev;
        walker.prev = walker.next;
        walker.next = p;
      }
      this.head = tail;
      this.tail = head;
      return this;
    };
    function push2(self, item) {
      self.tail = new Node(item, self.tail, null, self);
      if (!self.head) {
        self.head = self.tail;
      }
      self.length++;
    }
    function unshift(self, item) {
      self.head = new Node(item, null, self.head, self);
      if (!self.tail) {
        self.tail = self.head;
      }
      self.length++;
    }
    function Node(value, prev, next, list) {
      if (!(this instanceof Node)) {
        return new Node(value, prev, next, list);
      }
      this.list = list;
      this.value = value;
      if (prev) {
        prev.next = this;
        this.prev = prev;
      } else {
        this.prev = null;
      }
      if (next) {
        next.prev = this;
        this.next = next;
      } else {
        this.next = null;
      }
    }
  }
});

// node_modules/lru-cache/index.js
var require_lru_cache = __commonJS({
  "node_modules/lru-cache/index.js"(exports, module) {
    "use strict";
    module.exports = LRUCache;
    var Map2 = require_map();
    var util2 = __require("util");
    var Yallist = require_yallist();
    var hasSymbol = typeof Symbol === "function" && process.env._nodeLRUCacheForceNoSymbol !== "1";
    var makeSymbol;
    if (hasSymbol) {
      makeSymbol = function(key2) {
        return Symbol(key2);
      };
    } else {
      makeSymbol = function(key2) {
        return "_" + key2;
      };
    }
    var MAX = makeSymbol("max");
    var LENGTH = makeSymbol("length");
    var LENGTH_CALCULATOR = makeSymbol("lengthCalculator");
    var ALLOW_STALE = makeSymbol("allowStale");
    var MAX_AGE = makeSymbol("maxAge");
    var DISPOSE = makeSymbol("dispose");
    var NO_DISPOSE_ON_SET = makeSymbol("noDisposeOnSet");
    var LRU_LIST = makeSymbol("lruList");
    var CACHE = makeSymbol("cache");
    function naiveLength() {
      return 1;
    }
    function LRUCache(options8) {
      if (!(this instanceof LRUCache)) {
        return new LRUCache(options8);
      }
      if (typeof options8 === "number") {
        options8 = { max: options8 };
      }
      if (!options8) {
        options8 = {};
      }
      var max = this[MAX] = options8.max;
      if (!max || !(typeof max === "number") || max <= 0) {
        this[MAX] = Infinity;
      }
      var lc = options8.length || naiveLength;
      if (typeof lc !== "function") {
        lc = naiveLength;
      }
      this[LENGTH_CALCULATOR] = lc;
      this[ALLOW_STALE] = options8.stale || false;
      this[MAX_AGE] = options8.maxAge || 0;
      this[DISPOSE] = options8.dispose;
      this[NO_DISPOSE_ON_SET] = options8.noDisposeOnSet || false;
      this.reset();
    }
    Object.defineProperty(LRUCache.prototype, "max", {
      set: function(mL) {
        if (!mL || !(typeof mL === "number") || mL <= 0) {
          mL = Infinity;
        }
        this[MAX] = mL;
        trim2(this);
      },
      get: function() {
        return this[MAX];
      },
      enumerable: true
    });
    Object.defineProperty(LRUCache.prototype, "allowStale", {
      set: function(allowStale) {
        this[ALLOW_STALE] = !!allowStale;
      },
      get: function() {
        return this[ALLOW_STALE];
      },
      enumerable: true
    });
    Object.defineProperty(LRUCache.prototype, "maxAge", {
      set: function(mA) {
        if (!mA || !(typeof mA === "number") || mA < 0) {
          mA = 0;
        }
        this[MAX_AGE] = mA;
        trim2(this);
      },
      get: function() {
        return this[MAX_AGE];
      },
      enumerable: true
    });
    Object.defineProperty(LRUCache.prototype, "lengthCalculator", {
      set: function(lC) {
        if (typeof lC !== "function") {
          lC = naiveLength;
        }
        if (lC !== this[LENGTH_CALCULATOR]) {
          this[LENGTH_CALCULATOR] = lC;
          this[LENGTH] = 0;
          this[LRU_LIST].forEach(function(hit) {
            hit.length = this[LENGTH_CALCULATOR](hit.value, hit.key);
            this[LENGTH] += hit.length;
          }, this);
        }
        trim2(this);
      },
      get: function() {
        return this[LENGTH_CALCULATOR];
      },
      enumerable: true
    });
    Object.defineProperty(LRUCache.prototype, "length", {
      get: function() {
        return this[LENGTH];
      },
      enumerable: true
    });
    Object.defineProperty(LRUCache.prototype, "itemCount", {
      get: function() {
        return this[LRU_LIST].length;
      },
      enumerable: true
    });
    LRUCache.prototype.rforEach = function(fn, thisp) {
      thisp = thisp || this;
      for (var walker = this[LRU_LIST].tail; walker !== null; ) {
        var prev = walker.prev;
        forEachStep(this, fn, walker, thisp);
        walker = prev;
      }
    };
    function forEachStep(self, fn, node, thisp) {
      var hit = node.value;
      if (isStale(self, hit)) {
        del(self, node);
        if (!self[ALLOW_STALE]) {
          hit = void 0;
        }
      }
      if (hit) {
        fn.call(thisp, hit.value, hit.key, self);
      }
    }
    LRUCache.prototype.forEach = function(fn, thisp) {
      thisp = thisp || this;
      for (var walker = this[LRU_LIST].head; walker !== null; ) {
        var next = walker.next;
        forEachStep(this, fn, walker, thisp);
        walker = next;
      }
    };
    LRUCache.prototype.keys = function() {
      return this[LRU_LIST].toArray().map(function(k) {
        return k.key;
      }, this);
    };
    LRUCache.prototype.values = function() {
      return this[LRU_LIST].toArray().map(function(k) {
        return k.value;
      }, this);
    };
    LRUCache.prototype.reset = function() {
      if (this[DISPOSE] && this[LRU_LIST] && this[LRU_LIST].length) {
        this[LRU_LIST].forEach(function(hit) {
          this[DISPOSE](hit.key, hit.value);
        }, this);
      }
      this[CACHE] = new Map2();
      this[LRU_LIST] = new Yallist();
      this[LENGTH] = 0;
    };
    LRUCache.prototype.dump = function() {
      return this[LRU_LIST].map(function(hit) {
        if (!isStale(this, hit)) {
          return {
            k: hit.key,
            v: hit.value,
            e: hit.now + (hit.maxAge || 0)
          };
        }
      }, this).toArray().filter(function(h) {
        return h;
      });
    };
    LRUCache.prototype.dumpLru = function() {
      return this[LRU_LIST];
    };
    LRUCache.prototype.inspect = function(n, opts) {
      var str2 = "LRUCache {";
      var extras = false;
      var as = this[ALLOW_STALE];
      if (as) {
        str2 += "\n  allowStale: true";
        extras = true;
      }
      var max = this[MAX];
      if (max && max !== Infinity) {
        if (extras) {
          str2 += ",";
        }
        str2 += "\n  max: " + util2.inspect(max, opts);
        extras = true;
      }
      var maxAge = this[MAX_AGE];
      if (maxAge) {
        if (extras) {
          str2 += ",";
        }
        str2 += "\n  maxAge: " + util2.inspect(maxAge, opts);
        extras = true;
      }
      var lc = this[LENGTH_CALCULATOR];
      if (lc && lc !== naiveLength) {
        if (extras) {
          str2 += ",";
        }
        str2 += "\n  length: " + util2.inspect(this[LENGTH], opts);
        extras = true;
      }
      var didFirst = false;
      this[LRU_LIST].forEach(function(item) {
        if (didFirst) {
          str2 += ",\n  ";
        } else {
          if (extras) {
            str2 += ",\n";
          }
          didFirst = true;
          str2 += "\n  ";
        }
        var key2 = util2.inspect(item.key).split("\n").join("\n  ");
        var val = { value: item.value };
        if (item.maxAge !== maxAge) {
          val.maxAge = item.maxAge;
        }
        if (lc !== naiveLength) {
          val.length = item.length;
        }
        if (isStale(this, item)) {
          val.stale = true;
        }
        val = util2.inspect(val, opts).split("\n").join("\n  ");
        str2 += key2 + " => " + val;
      });
      if (didFirst || extras) {
        str2 += "\n";
      }
      str2 += "}";
      return str2;
    };
    LRUCache.prototype.set = function(key2, value, maxAge) {
      maxAge = maxAge || this[MAX_AGE];
      var now = maxAge ? Date.now() : 0;
      var len = this[LENGTH_CALCULATOR](value, key2);
      if (this[CACHE].has(key2)) {
        if (len > this[MAX]) {
          del(this, this[CACHE].get(key2));
          return false;
        }
        var node = this[CACHE].get(key2);
        var item = node.value;
        if (this[DISPOSE]) {
          if (!this[NO_DISPOSE_ON_SET]) {
            this[DISPOSE](key2, item.value);
          }
        }
        item.now = now;
        item.maxAge = maxAge;
        item.value = value;
        this[LENGTH] += len - item.length;
        item.length = len;
        this.get(key2);
        trim2(this);
        return true;
      }
      var hit = new Entry(key2, value, len, now, maxAge);
      if (hit.length > this[MAX]) {
        if (this[DISPOSE]) {
          this[DISPOSE](key2, value);
        }
        return false;
      }
      this[LENGTH] += hit.length;
      this[LRU_LIST].unshift(hit);
      this[CACHE].set(key2, this[LRU_LIST].head);
      trim2(this);
      return true;
    };
    LRUCache.prototype.has = function(key2) {
      if (!this[CACHE].has(key2)) return false;
      var hit = this[CACHE].get(key2).value;
      if (isStale(this, hit)) {
        return false;
      }
      return true;
    };
    LRUCache.prototype.get = function(key2) {
      return get(this, key2, true);
    };
    LRUCache.prototype.peek = function(key2) {
      return get(this, key2, false);
    };
    LRUCache.prototype.pop = function() {
      var node = this[LRU_LIST].tail;
      if (!node) return null;
      del(this, node);
      return node.value;
    };
    LRUCache.prototype.del = function(key2) {
      del(this, this[CACHE].get(key2));
    };
    LRUCache.prototype.load = function(arr) {
      this.reset();
      var now = Date.now();
      for (var l = arr.length - 1; l >= 0; l--) {
        var hit = arr[l];
        var expiresAt = hit.e || 0;
        if (expiresAt === 0) {
          this.set(hit.k, hit.v);
        } else {
          var maxAge = expiresAt - now;
          if (maxAge > 0) {
            this.set(hit.k, hit.v, maxAge);
          }
        }
      }
    };
    LRUCache.prototype.prune = function() {
      var self = this;
      this[CACHE].forEach(function(value, key2) {
        get(self, key2, false);
      });
    };
    function get(self, key2, doUse) {
      var node = self[CACHE].get(key2);
      if (node) {
        var hit = node.value;
        if (isStale(self, hit)) {
          del(self, node);
          if (!self[ALLOW_STALE]) hit = void 0;
        } else {
          if (doUse) {
            self[LRU_LIST].unshiftNode(node);
          }
        }
        if (hit) hit = hit.value;
      }
      return hit;
    }
    function isStale(self, hit) {
      if (!hit || !hit.maxAge && !self[MAX_AGE]) {
        return false;
      }
      var stale = false;
      var diff2 = Date.now() - hit.now;
      if (hit.maxAge) {
        stale = diff2 > hit.maxAge;
      } else {
        stale = self[MAX_AGE] && diff2 > self[MAX_AGE];
      }
      return stale;
    }
    function trim2(self) {
      if (self[LENGTH] > self[MAX]) {
        for (var walker = self[LRU_LIST].tail; self[LENGTH] > self[MAX] && walker !== null; ) {
          var prev = walker.prev;
          del(self, walker);
          walker = prev;
        }
      }
    }
    function del(self, node) {
      if (node) {
        var hit = node.value;
        if (self[DISPOSE]) {
          self[DISPOSE](hit.key, hit.value);
        }
        self[LENGTH] -= hit.length;
        self[CACHE].delete(hit.key);
        self[LRU_LIST].removeNode(node);
      }
    }
    function Entry(key2, value, length, now, maxAge) {
      this.key = key2;
      this.value = value;
      this.length = length;
      this.now = now;
      this.maxAge = maxAge || 0;
    }
  }
});

// node_modules/sigmund/sigmund.js
var require_sigmund = __commonJS({
  "node_modules/sigmund/sigmund.js"(exports, module) {
    module.exports = sigmund;
    function sigmund(subject, maxSessions) {
      maxSessions = maxSessions || 10;
      var notes = [];
      var analysis = "";
      var RE = RegExp;
      function psychoAnalyze(subject2, session) {
        if (session > maxSessions) return;
        if (typeof subject2 === "function" || typeof subject2 === "undefined") {
          return;
        }
        if (typeof subject2 !== "object" || !subject2 || subject2 instanceof RE) {
          analysis += subject2;
          return;
        }
        if (notes.indexOf(subject2) !== -1 || session === maxSessions) return;
        notes.push(subject2);
        analysis += "{";
        Object.keys(subject2).forEach(function(issue, _, __) {
          if (issue.charAt(0) === "_") return;
          var to = typeof subject2[issue];
          if (to === "function" || to === "undefined") return;
          analysis += issue;
          psychoAnalyze(subject2[issue], session + 1);
        });
      }
      psychoAnalyze(subject, 0);
      return analysis;
    }
  }
});

// node_modules/editorconfig/src/lib/fnmatch.js
var require_fnmatch = __commonJS({
  "node_modules/editorconfig/src/lib/fnmatch.js"(exports, module) {
    var platform = typeof process === "object" ? process.platform : "win32";
    if (module) module.exports = minimatch;
    else exports.minimatch = minimatch;
    minimatch.Minimatch = Minimatch;
    var LRU = require_lru_cache();
    var cache3 = minimatch.cache = new LRU({ max: 100 });
    var GLOBSTAR = minimatch.GLOBSTAR = Minimatch.GLOBSTAR = {};
    var sigmund = require_sigmund();
    var path13 = __require("path");
    var qmark = "[^/]";
    var star = qmark + "*?";
    var twoStarDot = "(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?";
    var twoStarNoDot = "(?:(?!(?:\\/|^)\\.).)*?";
    var reSpecials = charSet("().*{}+?[]^$\\!");
    function charSet(s) {
      return s.split("").reduce(function(set2, c2) {
        set2[c2] = true;
        return set2;
      }, {});
    }
    var slashSplit = /\/+/;
    minimatch.monkeyPatch = monkeyPatch;
    function monkeyPatch() {
      var desc = Object.getOwnPropertyDescriptor(String.prototype, "match");
      var orig = desc.value;
      desc.value = function(p) {
        if (p instanceof Minimatch) return p.match(this);
        return orig.call(this, p);
      };
      Object.defineProperty(String.prototype, desc);
    }
    minimatch.filter = filter2;
    function filter2(pattern, options8) {
      options8 = options8 || {};
      return function(p, i, list) {
        return minimatch(p, pattern, options8);
      };
    }
    function ext(a, b) {
      a = a || {};
      b = b || {};
      var t = {};
      Object.keys(b).forEach(function(k) {
        t[k] = b[k];
      });
      Object.keys(a).forEach(function(k) {
        t[k] = a[k];
      });
      return t;
    }
    minimatch.defaults = function(def) {
      if (!def || !Object.keys(def).length) return minimatch;
      var orig = minimatch;
      var m = function minimatch2(p, pattern, options8) {
        return orig.minimatch(p, pattern, ext(def, options8));
      };
      m.Minimatch = function Minimatch2(pattern, options8) {
        return new orig.Minimatch(pattern, ext(def, options8));
      };
      return m;
    };
    Minimatch.defaults = function(def) {
      if (!def || !Object.keys(def).length) return Minimatch;
      return minimatch.defaults(def).Minimatch;
    };
    function minimatch(p, pattern, options8) {
      if (typeof pattern !== "string") {
        throw new TypeError("glob pattern string required");
      }
      if (!options8) options8 = {};
      if (!options8.nocomment && pattern.charAt(0) === "#") {
        return false;
      }
      if (pattern.trim() === "") return p === "";
      return new Minimatch(pattern, options8).match(p);
    }
    function Minimatch(pattern, options8) {
      if (!(this instanceof Minimatch)) {
        return new Minimatch(pattern, options8, cache3);
      }
      if (typeof pattern !== "string") {
        throw new TypeError("glob pattern string required");
      }
      if (!options8) options8 = {};
      if (platform === "win32") {
        pattern = pattern.split("\\").join("/");
      }
      var cacheKey = pattern + "\n" + sigmund(options8);
      var cached = minimatch.cache.get(cacheKey);
      if (cached) return cached;
      minimatch.cache.set(cacheKey, this);
      this.options = options8;
      this.set = [];
      this.pattern = pattern;
      this.regexp = null;
      this.negate = false;
      this.comment = false;
      this.empty = false;
      this.make();
    }
    Minimatch.prototype.make = make;
    function make() {
      if (this._made) return;
      var pattern = this.pattern;
      var options8 = this.options;
      if (!options8.nocomment && pattern.charAt(0) === "#") {
        this.comment = true;
        return;
      }
      if (!pattern) {
        this.empty = true;
        return;
      }
      this.parseNegate();
      var set2 = this.globSet = this.braceExpand();
      if (options8.debug) console.error(this.pattern, set2);
      set2 = this.globParts = set2.map(function(s) {
        return s.split(slashSplit);
      });
      if (options8.debug) console.error(this.pattern, set2);
      set2 = set2.map(function(s, si, set3) {
        return s.map(this.parse, this);
      }, this);
      if (options8.debug) console.error(this.pattern, set2);
      set2 = set2.filter(function(s) {
        return -1 === s.indexOf(false);
      });
      if (options8.debug) console.error(this.pattern, set2);
      this.set = set2;
    }
    Minimatch.prototype.parseNegate = parseNegate;
    function parseNegate() {
      var pattern = this.pattern, negate = false, options8 = this.options, negateOffset = 0;
      if (options8.nonegate) return;
      for (var i = 0, l = pattern.length; i < l && pattern.charAt(i) === "!"; i++) {
        negate = !negate;
        negateOffset++;
      }
      if (negateOffset) this.pattern = pattern.substr(negateOffset);
      this.negate = negate;
    }
    minimatch.braceExpand = function(pattern, options8) {
      return new Minimatch(pattern, options8).braceExpand();
    };
    Minimatch.prototype.braceExpand = braceExpand;
    function braceExpand(pattern, options8) {
      options8 = options8 || this.options;
      pattern = typeof pattern === "undefined" ? this.pattern : pattern;
      if (typeof pattern === "undefined") {
        throw new Error("undefined pattern");
      }
      if (options8.nobrace || !pattern.match(/\{.*\}/)) {
        return [pattern];
      }
      var escaping = false;
      if (pattern.charAt(0) !== "{") {
        var prefix = null;
        for (var i = 0, l = pattern.length; i < l; i++) {
          var c2 = pattern.charAt(i);
          if (c2 === "\\") {
            escaping = !escaping;
          } else if (c2 === "{" && !escaping) {
            prefix = pattern.substr(0, i);
            break;
          }
        }
        if (prefix === null) {
          return [pattern];
        }
        var tail = braceExpand(pattern.substr(i), options8);
        return tail.map(function(t) {
          return prefix + t;
        });
      }
      var numset = pattern.match(/^\{(-?[0-9]+)\.\.(-?[0-9]+)\}/);
      if (numset) {
        var suf = braceExpand(pattern.substr(numset[0].length), options8), start = +numset[1], end = +numset[2], inc = start > end ? -1 : 1, set2 = [];
        for (var i = start; i != end + inc; i += inc) {
          for (var ii = 0, ll = suf.length; ii < ll; ii++) {
            set2.push(i + suf[ii]);
          }
        }
        return set2;
      }
      var i = 1, depth = 1, set2 = [], member = "", sawEnd = false, escaping = false;
      function addMember() {
        set2.push(member);
        member = "";
      }
      FOR: for (i = 1, l = pattern.length; i < l; i++) {
        var c2 = pattern.charAt(i);
        if (escaping) {
          escaping = false;
          member += "\\" + c2;
        } else {
          switch (c2) {
            case "\\":
              escaping = true;
              continue;
            case "{":
              depth++;
              member += "{";
              continue;
            case "}":
              depth--;
              if (depth === 0) {
                addMember();
                i++;
                break FOR;
              } else {
                member += c2;
                continue;
              }
            case ",":
              if (depth === 1) {
                addMember();
              } else {
                member += c2;
              }
              continue;
            default:
              member += c2;
              continue;
          }
        }
      }
      if (depth !== 0) {
        return braceExpand("\\" + pattern, options8);
      }
      var suf = braceExpand(pattern.substr(i), options8);
      var addBraces = set2.length === 1;
      set2 = set2.map(function(p) {
        return braceExpand(p, options8);
      });
      set2 = set2.reduce(function(l2, r) {
        return l2.concat(r);
      });
      if (addBraces) {
        set2 = set2.map(function(s) {
          return "{" + s + "}";
        });
      }
      var ret = [];
      for (var i = 0, l = set2.length; i < l; i++) {
        for (var ii = 0, ll = suf.length; ii < ll; ii++) {
          ret.push(set2[i] + suf[ii]);
        }
      }
      return ret;
    }
    Minimatch.prototype.parse = parse6;
    var SUBPARSE = {};
    function parse6(pattern, isSub) {
      var options8 = this.options;
      if (!options8.noglobstar && pattern === "**") return GLOBSTAR;
      if (pattern === "") return "";
      var re = "", hasMagic = !!options8.nocase, escaping = false, patternListStack = [], plType, stateChar, inClass = false, reClassStart = -1, classStart = -1, patternStart = pattern.charAt(0) === "." ? "" : options8.dot ? "(?!(?:^|\\/)\\.{1,2}(?:$|\\/))" : "(?!\\.)";
      function clearStateChar() {
        if (stateChar) {
          switch (stateChar) {
            case "*":
              re += star;
              hasMagic = true;
              break;
            case "?":
              re += qmark;
              hasMagic = true;
              break;
            default:
              re += "\\" + stateChar;
              break;
          }
          stateChar = false;
        }
      }
      for (var i = 0, len = pattern.length, c2; i < len && (c2 = pattern.charAt(i)); i++) {
        if (options8.debug) {
          console.error("%s	%s %s %j", pattern, i, re, c2);
        }
        if (escaping && reSpecials[c2]) {
          re += "\\" + c2;
          escaping = false;
          continue;
        }
        SWITCH: switch (c2) {
          case "/":
            return false;
          case "\\":
            clearStateChar();
            escaping = true;
            continue;
          case "?":
          case "*":
          case "+":
          case "@":
          case "!":
            if (options8.debug) {
              console.error("%s	%s %s %j <-- stateChar", pattern, i, re, c2);
            }
            if (inClass) {
              if (c2 === "!" && i === classStart + 1) c2 = "^";
              re += c2;
              continue;
            }
            clearStateChar();
            stateChar = c2;
            if (options8.noext) clearStateChar();
            continue;
          case "(":
            if (inClass) {
              re += "(";
              continue;
            }
            if (!stateChar) {
              re += "\\(";
              continue;
            }
            plType = stateChar;
            patternListStack.push({
              type: plType,
              start: i - 1,
              reStart: re.length
            });
            re += stateChar === "!" ? "(?:(?!" : "(?:";
            stateChar = false;
            continue;
          case ")":
            if (inClass || !patternListStack.length) {
              re += "\\)";
              continue;
            }
            hasMagic = true;
            re += ")";
            plType = patternListStack.pop().type;
            switch (plType) {
              case "!":
                re += "[^/]*?)";
                break;
              case "?":
              case "+":
              case "*":
                re += plType;
              case "@":
                break;
            }
            continue;
          case "|":
            if (inClass || !patternListStack.length || escaping) {
              re += "\\|";
              escaping = false;
              continue;
            }
            re += "|";
            continue;
          case "[":
            clearStateChar();
            if (inClass) {
              re += "\\" + c2;
              continue;
            }
            inClass = true;
            classStart = i;
            reClassStart = re.length;
            re += c2;
            continue;
          case "]":
            if (i === classStart + 1 || !inClass) {
              re += "\\" + c2;
              escaping = false;
              continue;
            }
            hasMagic = true;
            inClass = false;
            re += c2;
            continue;
          default:
            clearStateChar();
            if (escaping) {
              escaping = false;
            } else if (reSpecials[c2] && !(c2 === "^" && inClass)) {
              re += "\\";
            }
            re += c2;
        }
      }
      if (inClass) {
        var cs = pattern.substr(classStart + 1), sp = this.parse(cs, SUBPARSE);
        re = re.substr(0, reClassStart) + "\\[" + sp[0];
        hasMagic = hasMagic || sp[1];
      }
      var pl;
      while (pl = patternListStack.pop()) {
        var tail = re.slice(pl.reStart + 3);
        tail = tail.replace(/((?:\\{2})*)(\\?)\|/g, function(_, $1, $2) {
          if (!$2) {
            $2 = "\\";
          }
          return $1 + $1 + $2 + "|";
        });
        var t = pl.type === "*" ? star : pl.type === "?" ? qmark : "\\" + pl.type;
        hasMagic = true;
        re = re.slice(0, pl.reStart) + t + "\\(" + tail;
      }
      clearStateChar();
      if (escaping) {
        re += "\\\\";
      }
      var addPatternStart = false;
      switch (re.charAt(0)) {
        case ".":
        case "[":
        case "(":
          addPatternStart = true;
      }
      if (re !== "" && hasMagic) re = "(?=.)" + re;
      if (addPatternStart) re = patternStart + re;
      if (isSub === SUBPARSE) {
        return [re, hasMagic];
      }
      if (!hasMagic) {
        return globUnescape(pattern);
      }
      var flags = options8.nocase ? "i" : "", regExp = new RegExp("^" + re + "$", flags);
      regExp._glob = pattern;
      regExp._src = re;
      return regExp;
    }
    minimatch.makeRe = function(pattern, options8) {
      return new Minimatch(pattern, options8 || {}).makeRe();
    };
    Minimatch.prototype.makeRe = makeRe;
    function makeRe() {
      if (this.regexp || this.regexp === false) return this.regexp;
      var set2 = this.set;
      if (!set2.length) return this.regexp = false;
      var options8 = this.options;
      var twoStar = options8.noglobstar ? star : options8.dot ? twoStarDot : twoStarNoDot, flags = options8.nocase ? "i" : "";
      var re = set2.map(function(pattern) {
        return pattern.map(function(p) {
          return p === GLOBSTAR ? twoStar : typeof p === "string" ? regExpEscape(p) : p._src;
        }).join("\\/");
      }).join("|");
      re = "^(?:" + re + ")$";
      if (this.negate) re = "^(?!" + re + ").*$";
      try {
        return this.regexp = new RegExp(re, flags);
      } catch (ex) {
        return this.regexp = false;
      }
    }
    minimatch.match = function(list, pattern, options8) {
      var mm = new Minimatch(pattern, options8);
      list = list.filter(function(f) {
        return mm.match(f);
      });
      if (options8.nonull && !list.length) {
        list.push(pattern);
      }
      return list;
    };
    Minimatch.prototype.match = match;
    function match(f, partial) {
      if (this.comment) return false;
      if (this.empty) return f === "";
      if (f === "/" && partial) return true;
      var options8 = this.options;
      if (platform === "win32") {
        f = f.split("\\").join("/");
      }
      f = f.split(slashSplit);
      if (options8.debug) {
        console.error(this.pattern, "split", f);
      }
      var set2 = this.set;
      for (var i = 0, l = set2.length; i < l; i++) {
        var pattern = set2[i];
        var hit = this.matchOne(f, pattern, partial);
        if (hit) {
          if (options8.flipNegate) return true;
          return !this.negate;
        }
      }
      if (options8.flipNegate) return false;
      return this.negate;
    }
    Minimatch.prototype.matchOne = function(file, pattern, partial) {
      var options8 = this.options;
      if (options8.debug) {
        console.error(
          "matchOne",
          {
            "this": this,
            file,
            pattern
          }
        );
      }
      if (options8.matchBase && pattern.length === 1) {
        file = path13.basename(file.join("/")).split("/");
      }
      if (options8.debug) {
        console.error("matchOne", file.length, pattern.length);
      }
      for (var fi = 0, pi = 0, fl = file.length, pl = pattern.length; fi < fl && pi < pl; fi++, pi++) {
        if (options8.debug) {
          console.error("matchOne loop");
        }
        var p = pattern[pi], f = file[fi];
        if (options8.debug) {
          console.error(pattern, p, f);
        }
        if (p === false) return false;
        if (p === GLOBSTAR) {
          if (options8.debug)
            console.error("GLOBSTAR", [pattern, p, f]);
          var fr = fi, pr = pi + 1;
          if (pr === pl) {
            if (options8.debug)
              console.error("** at the end");
            for (; fi < fl; fi++) {
              if (file[fi] === "." || file[fi] === ".." || !options8.dot && file[fi].charAt(0) === ".") return false;
            }
            return true;
          }
          WHILE: while (fr < fl) {
            var swallowee = file[fr];
            if (options8.debug) {
              console.error(
                "\nglobstar while",
                file,
                fr,
                pattern,
                pr,
                swallowee
              );
            }
            if (this.matchOne(file.slice(fr), pattern.slice(pr), partial)) {
              if (options8.debug)
                console.error("globstar found match!", fr, fl, swallowee);
              return true;
            } else {
              if (swallowee === "." || swallowee === ".." || !options8.dot && swallowee.charAt(0) === ".") {
                if (options8.debug)
                  console.error("dot detected!", file, fr, pattern, pr);
                break WHILE;
              }
              if (options8.debug)
                console.error("globstar swallow a segment, and continue");
              fr++;
            }
          }
          if (partial) {
            if (fr === fl) return true;
          }
          return false;
        }
        var hit;
        if (typeof p === "string") {
          if (options8.nocase) {
            hit = f.toLowerCase() === p.toLowerCase();
          } else {
            hit = f === p;
          }
          if (options8.debug) {
            console.error("string match", p, f, hit);
          }
        } else {
          hit = f.match(p);
          if (options8.debug) {
            console.error("pattern match", p, f, hit);
          }
        }
        if (!hit) return false;
      }
      if (fi === fl && pi === pl) {
        return true;
      } else if (fi === fl) {
        return partial;
      } else if (pi === pl) {
        var emptyFileEnd = fi === fl - 1 && file[fi] === "";
        return emptyFileEnd;
      }
      throw new Error("wtf?");
    };
    function globUnescape(s) {
      return s.replace(/\\(.)/g, "$1");
    }
    function regExpEscape(s) {
      return s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
    }
  }
});

// node_modules/editorconfig/src/lib/ini.js
var require_ini = __commonJS({
  "node_modules/editorconfig/src/lib/ini.js"(exports) {
    "use strict";
    var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
      return new (P || (P = Promise))(function(resolve3, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve3(result.value) : new P(function(resolve4) {
            resolve4(result.value);
          }).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    var __generator = exports && exports.__generator || function(thisArg, body) {
      var _ = { label: 0, sent: function() {
        if (t[0] & 1) throw t[1];
        return t[1];
      }, trys: [], ops: [] }, f, y, t, g;
      return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
      }), g;
      function verb(n) {
        return function(v) {
          return step([n, v]);
        };
      }
      function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
          if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
          if (y = 0, t) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
        if (op[0] & 5) throw op[1];
        return { value: op[0] ? op[1] : void 0, done: true };
      }
    };
    var __importStar = exports && exports.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
      }
      result["default"] = mod;
      return result;
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var fs7 = __importStar(__require("fs"));
    var regex = {
      section: /^\s*\[(([^#;]|\\#|\\;)+)\]\s*([#;].*)?$/,
      param: /^\s*([\w\.\-\_]+)\s*[=:]\s*(.*?)\s*([#;].*)?$/,
      comment: /^\s*[#;].*$/
    };
    function parse6(file) {
      return __awaiter(this, void 0, void 0, function() {
        return __generator(this, function(_a) {
          return [2, new Promise(function(resolve3, reject) {
            fs7.readFile(file, "utf8", function(err, data) {
              if (err) {
                reject(err);
                return;
              }
              resolve3(parseString(data));
            });
          })];
        });
      });
    }
    exports.parse = parse6;
    function parseSync(file) {
      return parseString(fs7.readFileSync(file, "utf8"));
    }
    exports.parseSync = parseSync;
    function parseString(data) {
      var sectionBody = {};
      var sectionName = null;
      var value = [[sectionName, sectionBody]];
      var lines = data.split(/\r\n|\r|\n/);
      lines.forEach(function(line3) {
        var match;
        if (regex.comment.test(line3)) {
          return;
        }
        if (regex.param.test(line3)) {
          match = line3.match(regex.param);
          sectionBody[match[1]] = match[2];
        } else if (regex.section.test(line3)) {
          match = line3.match(regex.section);
          sectionName = match[1];
          sectionBody = {};
          value.push([sectionName, sectionBody]);
        }
      });
      return value;
    }
    exports.parseString = parseString;
  }
});

// node_modules/editorconfig/package.json
var require_package = __commonJS({
  "node_modules/editorconfig/package.json"(exports, module) {
    module.exports = {
      name: "editorconfig",
      version: "0.15.3",
      description: "EditorConfig File Locator and Interpreter for Node.js",
      keywords: [
        "editorconfig",
        "core"
      ],
      main: "src/index.js",
      contributors: [
        "Hong Xu (topbug.net)",
        "Jed Mao (https://github.com/jedmao/)",
        "Trey Hunner (http://treyhunner.com)"
      ],
      directories: {
        bin: "./bin",
        lib: "./lib"
      },
      scripts: {
        clean: "rimraf dist",
        prebuild: "npm run clean",
        build: "tsc",
        pretest: "npm run lint && npm run build && npm run copy && cmake .",
        test: "ctest .",
        "pretest:ci": "npm run pretest",
        "test:ci": "ctest -VV --output-on-failure .",
        lint: "npm run eclint && npm run tslint",
        eclint: 'eclint check --indent_size ignore "src/**"',
        tslint: "tslint --project tsconfig.json --exclude package.json",
        copy: "cpy .npmignore LICENSE README.md CHANGELOG.md dist && cpy bin/* dist/bin && cpy src/lib/fnmatch*.* dist/src/lib",
        prepub: "npm run lint && npm run build && npm run copy",
        pub: "npm publish ./dist"
      },
      repository: {
        type: "git",
        url: "git://github.com/editorconfig/editorconfig-core-js.git"
      },
      bugs: "https://github.com/editorconfig/editorconfig-core-js/issues",
      author: "EditorConfig Team",
      license: "MIT",
      dependencies: {
        commander: "^2.19.0",
        "lru-cache": "^4.1.5",
        semver: "^5.6.0",
        sigmund: "^1.0.1"
      },
      devDependencies: {
        "@types/mocha": "^5.2.6",
        "@types/node": "^10.12.29",
        "@types/semver": "^5.5.0",
        "cpy-cli": "^2.0.0",
        eclint: "^2.8.1",
        mocha: "^5.2.0",
        rimraf: "^2.6.3",
        should: "^13.2.3",
        tslint: "^5.13.1",
        typescript: "^3.3.3333"
      }
    };
  }
});

// node_modules/editorconfig/src/index.js
var require_src = __commonJS({
  "node_modules/editorconfig/src/index.js"(exports) {
    "use strict";
    var __awaiter = exports && exports.__awaiter || function(thisArg, _arguments, P, generator) {
      return new (P || (P = Promise))(function(resolve3, reject) {
        function fulfilled(value) {
          try {
            step(generator.next(value));
          } catch (e) {
            reject(e);
          }
        }
        function rejected(value) {
          try {
            step(generator["throw"](value));
          } catch (e) {
            reject(e);
          }
        }
        function step(result) {
          result.done ? resolve3(result.value) : new P(function(resolve4) {
            resolve4(result.value);
          }).then(fulfilled, rejected);
        }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
      });
    };
    var __generator = exports && exports.__generator || function(thisArg, body) {
      var _ = { label: 0, sent: function() {
        if (t[0] & 1) throw t[1];
        return t[1];
      }, trys: [], ops: [] }, f, y, t, g;
      return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() {
        return this;
      }), g;
      function verb(n) {
        return function(v) {
          return step([n, v]);
        };
      }
      function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (_) try {
          if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
          if (y = 0, t) op = [op[0] & 2, t.value];
          switch (op[0]) {
            case 0:
            case 1:
              t = op;
              break;
            case 4:
              _.label++;
              return { value: op[1], done: false };
            case 5:
              _.label++;
              y = op[1];
              op = [0];
              continue;
            case 7:
              op = _.ops.pop();
              _.trys.pop();
              continue;
            default:
              if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) {
                _ = 0;
                continue;
              }
              if (op[0] === 3 && (!t || op[1] > t[0] && op[1] < t[3])) {
                _.label = op[1];
                break;
              }
              if (op[0] === 6 && _.label < t[1]) {
                _.label = t[1];
                t = op;
                break;
              }
              if (t && _.label < t[2]) {
                _.label = t[2];
                _.ops.push(op);
                break;
              }
              if (t[2]) _.ops.pop();
              _.trys.pop();
              continue;
          }
          op = body.call(thisArg, _);
        } catch (e) {
          op = [6, e];
          y = 0;
        } finally {
          f = t = 0;
        }
        if (op[0] & 5) throw op[1];
        return { value: op[0] ? op[1] : void 0, done: true };
      }
    };
    var __importStar = exports && exports.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
      }
      result["default"] = mod;
      return result;
    };
    var __importDefault = exports && exports.__importDefault || function(mod) {
      return mod && mod.__esModule ? mod : { "default": mod };
    };
    Object.defineProperty(exports, "__esModule", { value: true });
    var fs7 = __importStar(__require("fs"));
    var path13 = __importStar(__require("path"));
    var semver = {
      gte: require_gte()
    };
    var fnmatch_1 = __importDefault(require_fnmatch());
    var ini_1 = require_ini();
    exports.parseString = ini_1.parseString;
    var package_json_1 = __importDefault(require_package());
    var knownProps = {
      end_of_line: true,
      indent_style: true,
      indent_size: true,
      insert_final_newline: true,
      trim_trailing_whitespace: true,
      charset: true
    };
    function fnmatch(filepath, glob) {
      var matchOptions = { matchBase: true, dot: true, noext: true };
      glob = glob.replace(/\*\*/g, "{*,**/**/**}");
      return fnmatch_1.default(filepath, glob, matchOptions);
    }
    function getConfigFileNames(filepath, options8) {
      var paths = [];
      do {
        filepath = path13.dirname(filepath);
        paths.push(path13.join(filepath, options8.config));
      } while (filepath !== options8.root);
      return paths;
    }
    function processMatches(matches, version) {
      if ("indent_style" in matches && matches.indent_style === "tab" && !("indent_size" in matches) && semver.gte(version, "0.10.0")) {
        matches.indent_size = "tab";
      }
      if ("indent_size" in matches && !("tab_width" in matches) && matches.indent_size !== "tab") {
        matches.tab_width = matches.indent_size;
      }
      if ("indent_size" in matches && "tab_width" in matches && matches.indent_size === "tab") {
        matches.indent_size = matches.tab_width;
      }
      return matches;
    }
    function processOptions(options8, filepath) {
      if (options8 === void 0) {
        options8 = {};
      }
      return {
        config: options8.config || ".editorconfig",
        version: options8.version || package_json_1.default.version,
        root: path13.resolve(options8.root || path13.parse(filepath).root)
      };
    }
    function buildFullGlob(pathPrefix, glob) {
      switch (glob.indexOf("/")) {
        case -1:
          glob = "**/" + glob;
          break;
        case 0:
          glob = glob.substring(1);
          break;
        default:
          break;
      }
      return path13.join(pathPrefix, glob);
    }
    function extendProps(props, options8) {
      if (props === void 0) {
        props = {};
      }
      if (options8 === void 0) {
        options8 = {};
      }
      for (var key2 in options8) {
        if (options8.hasOwnProperty(key2)) {
          var value = options8[key2];
          var key22 = key2.toLowerCase();
          var value2 = value;
          if (knownProps[key22]) {
            value2 = value.toLowerCase();
          }
          try {
            value2 = JSON.parse(value);
          } catch (e) {
          }
          if (typeof value === "undefined" || value === null) {
            value2 = String(value);
          }
          props[key22] = value2;
        }
      }
      return props;
    }
    function parseFromConfigs(configs, filepath, options8) {
      return processMatches(configs.reverse().reduce(function(matches, file) {
        var pathPrefix = path13.dirname(file.name);
        file.contents.forEach(function(section) {
          var glob = section[0];
          var options22 = section[1];
          if (!glob) {
            return;
          }
          var fullGlob = buildFullGlob(pathPrefix, glob);
          if (!fnmatch(filepath, fullGlob)) {
            return;
          }
          matches = extendProps(matches, options22);
        });
        return matches;
      }, {}), options8.version);
    }
    function getConfigsForFiles(files) {
      var configs = [];
      for (var i in files) {
        if (files.hasOwnProperty(i)) {
          var file = files[i];
          var contents = ini_1.parseString(file.contents);
          configs.push({
            name: file.name,
            contents
          });
          if ((contents[0][1].root || "").toLowerCase() === "true") {
            break;
          }
        }
      }
      return configs;
    }
    function readConfigFiles(filepaths) {
      return __awaiter(this, void 0, void 0, function() {
        return __generator(this, function(_a) {
          return [2, Promise.all(filepaths.map(function(name) {
            return new Promise(function(resolve3) {
              fs7.readFile(name, "utf8", function(err, data) {
                resolve3({
                  name,
                  contents: err ? "" : data
                });
              });
            });
          }))];
        });
      });
    }
    function readConfigFilesSync(filepaths) {
      var files = [];
      var file;
      filepaths.forEach(function(filepath) {
        try {
          file = fs7.readFileSync(filepath, "utf8");
        } catch (e) {
          file = "";
        }
        files.push({
          name: filepath,
          contents: file
        });
      });
      return files;
    }
    function opts(filepath, options8) {
      if (options8 === void 0) {
        options8 = {};
      }
      var resolvedFilePath = path13.resolve(filepath);
      return [
        resolvedFilePath,
        processOptions(options8, resolvedFilePath)
      ];
    }
    function parseFromFiles(filepath, files, options8) {
      if (options8 === void 0) {
        options8 = {};
      }
      return __awaiter(this, void 0, void 0, function() {
        var _a, resolvedFilePath, processedOptions;
        return __generator(this, function(_b) {
          _a = opts(filepath, options8), resolvedFilePath = _a[0], processedOptions = _a[1];
          return [2, files.then(getConfigsForFiles).then(function(configs) {
            return parseFromConfigs(configs, resolvedFilePath, processedOptions);
          })];
        });
      });
    }
    exports.parseFromFiles = parseFromFiles;
    function parseFromFilesSync(filepath, files, options8) {
      if (options8 === void 0) {
        options8 = {};
      }
      var _a = opts(filepath, options8), resolvedFilePath = _a[0], processedOptions = _a[1];
      return parseFromConfigs(getConfigsForFiles(files), resolvedFilePath, processedOptions);
    }
    exports.parseFromFilesSync = parseFromFilesSync;
    function parse6(_filepath, _options) {
      if (_options === void 0) {
        _options = {};
      }
      return __awaiter(this, void 0, void 0, function() {
        var _a, resolvedFilePath, processedOptions, filepaths;
        return __generator(this, function(_b) {
          _a = opts(_filepath, _options), resolvedFilePath = _a[0], processedOptions = _a[1];
          filepaths = getConfigFileNames(resolvedFilePath, processedOptions);
          return [2, readConfigFiles(filepaths).then(getConfigsForFiles).then(function(configs) {
            return parseFromConfigs(configs, resolvedFilePath, processedOptions);
          })];
        });
      });
    }
    exports.parse = parse6;
    function parseSync(_filepath, _options) {
      if (_options === void 0) {
        _options = {};
      }
      var _a = opts(_filepath, _options), resolvedFilePath = _a[0], processedOptions = _a[1];
      var filepaths = getConfigFileNames(resolvedFilePath, processedOptions);
      var files = readConfigFilesSync(filepaths);
      return parseFromConfigs(getConfigsForFiles(files), resolvedFilePath, processedOptions);
    }
    exports.parseSync = parseSync;
  }
});

// node_modules/ci-info/vendors.json
var require_vendors = __commonJS({
  "node_modules/ci-info/vendors.json"(exports, module) {
    module.exports = [
      {
        name: "Agola CI",
        constant: "AGOLA",
        env: "AGOLA_GIT_REF",
        pr: "AGOLA_PULL_REQUEST_ID"
      },
      {
        name: "Appcircle",
        constant: "APPCIRCLE",
        env: "AC_APPCIRCLE"
      },
      {
        name: "AppVeyor",
        constant: "APPVEYOR",
        env: "APPVEYOR",
        pr: "APPVEYOR_PULL_REQUEST_NUMBER"
      },
      {
        name: "AWS CodeBuild",
        constant: "CODEBUILD",
        env: "CODEBUILD_BUILD_ARN"
      },
      {
        name: "Azure Pipelines",
        constant: "AZURE_PIPELINES",
        env: "TF_BUILD",
        pr: {
          BUILD_REASON: "PullRequest"
        }
      },
      {
        name: "Bamboo",
        constant: "BAMBOO",
        env: "bamboo_planKey"
      },
      {
        name: "Bitbucket Pipelines",
        constant: "BITBUCKET",
        env: "BITBUCKET_COMMIT",
        pr: "BITBUCKET_PR_ID"
      },
      {
        name: "Bitrise",
        constant: "BITRISE",
        env: "BITRISE_IO",
        pr: "BITRISE_PULL_REQUEST"
      },
      {
        name: "Buddy",
        constant: "BUDDY",
        env: "BUDDY_WORKSPACE_ID",
        pr: "BUDDY_EXECUTION_PULL_REQUEST_ID"
      },
      {
        name: "Buildkite",
        constant: "BUILDKITE",
        env: "BUILDKITE",
        pr: {
          env: "BUILDKITE_PULL_REQUEST",
          ne: "false"
        }
      },
      {
        name: "CircleCI",
        constant: "CIRCLE",
        env: "CIRCLECI",
        pr: "CIRCLE_PULL_REQUEST"
      },
      {
        name: "Cirrus CI",
        constant: "CIRRUS",
        env: "CIRRUS_CI",
        pr: "CIRRUS_PR"
      },
      {
        name: "Codefresh",
        constant: "CODEFRESH",
        env: "CF_BUILD_ID",
        pr: {
          any: [
            "CF_PULL_REQUEST_NUMBER",
            "CF_PULL_REQUEST_ID"
          ]
        }
      },
      {
        name: "Codemagic",
        constant: "CODEMAGIC",
        env: "CM_BUILD_ID",
        pr: "CM_PULL_REQUEST"
      },
      {
        name: "Codeship",
        constant: "CODESHIP",
        env: {
          CI_NAME: "codeship"
        }
      },
      {
        name: "Drone",
        constant: "DRONE",
        env: "DRONE",
        pr: {
          DRONE_BUILD_EVENT: "pull_request"
        }
      },
      {
        name: "dsari",
        constant: "DSARI",
        env: "DSARI"
      },
      {
        name: "Earthly",
        constant: "EARTHLY",
        env: "EARTHLY_CI"
      },
      {
        name: "Expo Application Services",
        constant: "EAS",
        env: "EAS_BUILD"
      },
      {
        name: "Gerrit",
        constant: "GERRIT",
        env: "GERRIT_PROJECT"
      },
      {
        name: "Gitea Actions",
        constant: "GITEA_ACTIONS",
        env: "GITEA_ACTIONS"
      },
      {
        name: "GitHub Actions",
        constant: "GITHUB_ACTIONS",
        env: "GITHUB_ACTIONS",
        pr: {
          GITHUB_EVENT_NAME: "pull_request"
        }
      },
      {
        name: "GitLab CI",
        constant: "GITLAB",
        env: "GITLAB_CI",
        pr: "CI_MERGE_REQUEST_ID"
      },
      {
        name: "GoCD",
        constant: "GOCD",
        env: "GO_PIPELINE_LABEL"
      },
      {
        name: "Google Cloud Build",
        constant: "GOOGLE_CLOUD_BUILD",
        env: "BUILDER_OUTPUT"
      },
      {
        name: "Harness CI",
        constant: "HARNESS",
        env: "HARNESS_BUILD_ID"
      },
      {
        name: "Heroku",
        constant: "HEROKU",
        env: {
          env: "NODE",
          includes: "/app/.heroku/node/bin/node"
        }
      },
      {
        name: "Hudson",
        constant: "HUDSON",
        env: "HUDSON_URL"
      },
      {
        name: "Jenkins",
        constant: "JENKINS",
        env: [
          "JENKINS_URL",
          "BUILD_ID"
        ],
        pr: {
          any: [
            "ghprbPullId",
            "CHANGE_ID"
          ]
        }
      },
      {
        name: "LayerCI",
        constant: "LAYERCI",
        env: "LAYERCI",
        pr: "LAYERCI_PULL_REQUEST"
      },
      {
        name: "Magnum CI",
        constant: "MAGNUM",
        env: "MAGNUM"
      },
      {
        name: "Netlify CI",
        constant: "NETLIFY",
        env: "NETLIFY",
        pr: {
          env: "PULL_REQUEST",
          ne: "false"
        }
      },
      {
        name: "Nevercode",
        constant: "NEVERCODE",
        env: "NEVERCODE",
        pr: {
          env: "NEVERCODE_PULL_REQUEST",
          ne: "false"
        }
      },
      {
        name: "Prow",
        constant: "PROW",
        env: "PROW_JOB_ID"
      },
      {
        name: "ReleaseHub",
        constant: "RELEASEHUB",
        env: "RELEASE_BUILD_ID"
      },
      {
        name: "Render",
        constant: "RENDER",
        env: "RENDER",
        pr: {
          IS_PULL_REQUEST: "true"
        }
      },
      {
        name: "Sail CI",
        constant: "SAIL",
        env: "SAILCI",
        pr: "SAIL_PULL_REQUEST_NUMBER"
      },
      {
        name: "Screwdriver",
        constant: "SCREWDRIVER",
        env: "SCREWDRIVER",
        pr: {
          env: "SD_PULL_REQUEST",
          ne: "false"
        }
      },
      {
        name: "Semaphore",
        constant: "SEMAPHORE",
        env: "SEMAPHORE",
        pr: "PULL_REQUEST_NUMBER"
      },
      {
        name: "Sourcehut",
        constant: "SOURCEHUT",
        env: {
          CI_NAME: "sourcehut"
        }
      },
      {
        name: "Strider CD",
        constant: "STRIDER",
        env: "STRIDER"
      },
      {
        name: "TaskCluster",
        constant: "TASKCLUSTER",
        env: [
          "TASK_ID",
          "RUN_ID"
        ]
      },
      {
        name: "TeamCity",
        constant: "TEAMCITY",
        env: "TEAMCITY_VERSION"
      },
      {
        name: "Travis CI",
        constant: "TRAVIS",
        env: "TRAVIS",
        pr: {
          env: "TRAVIS_PULL_REQUEST",
          ne: "false"
        }
      },
      {
        name: "Vela",
        constant: "VELA",
        env: "VELA",
        pr: {
          VELA_PULL_REQUEST: "1"
        }
      },
      {
        name: "Vercel",
        constant: "VERCEL",
        env: {
          any: [
            "NOW_BUILDER",
            "VERCEL"
          ]
        },
        pr: "VERCEL_GIT_PULL_REQUEST_ID"
      },
      {
        name: "Visual Studio App Center",
        constant: "APPCENTER",
        env: "APPCENTER_BUILD_ID"
      },
      {
        name: "Woodpecker",
        constant: "WOODPECKER",
        env: {
          CI: "woodpecker"
        },
        pr: {
          CI_BUILD_EVENT: "pull_request"
        }
      },
      {
        name: "Xcode Cloud",
        constant: "XCODE_CLOUD",
        env: "CI_XCODE_PROJECT",
        pr: "CI_PULL_REQUEST_NUMBER"
      },
      {
        name: "Xcode Server",
        constant: "XCODE_SERVER",
        env: "XCS"
      }
    ];
  }
});

// node_modules/ci-info/index.js
var require_ci_info = __commonJS({
  "node_modules/ci-info/index.js"(exports) {
    "use strict";
    var vendors = require_vendors();
    var env2 = process.env;
    Object.defineProperty(exports, "_vendors", {
      value: vendors.map(function(v) {
        return v.constant;
      })
    });
    exports.name = null;
    exports.isPR = null;
    vendors.forEach(function(vendor) {
      const envs = Array.isArray(vendor.env) ? vendor.env : [vendor.env];
      const isCI2 = envs.every(function(obj) {
        return checkEnv(obj);
      });
      exports[vendor.constant] = isCI2;
      if (!isCI2) {
        return;
      }
      exports.name = vendor.name;
      switch (typeof vendor.pr) {
        case "string":
          exports.isPR = !!env2[vendor.pr];
          break;
        case "object":
          if ("env" in vendor.pr) {
            exports.isPR = vendor.pr.env in env2 && env2[vendor.pr.env] !== vendor.pr.ne;
          } else if ("any" in vendor.pr) {
            exports.isPR = vendor.pr.any.some(function(key2) {
              return !!env2[key2];
            });
          } else {
            exports.isPR = checkEnv(vendor.pr);
          }
          break;
        default:
          exports.isPR = null;
      }
    });
    exports.isCI = !!(env2.CI !== "false" && // Bypass all checks if CI env is explicitly set to 'false'
    (env2.BUILD_ID || // Jenkins, Cloudbees
    env2.BUILD_NUMBER || // Jenkins, TeamCity
    env2.CI || // Travis CI, CircleCI, Cirrus CI, Gitlab CI, Appveyor, CodeShip, dsari
    env2.CI_APP_ID || // Appflow
    env2.CI_BUILD_ID || // Appflow
    env2.CI_BUILD_NUMBER || // Appflow
    env2.CI_NAME || // Codeship and others
    env2.CONTINUOUS_INTEGRATION || // Travis CI, Cirrus CI
    env2.RUN_ID || // TaskCluster, dsari
    exports.name || false));
    function checkEnv(obj) {
      if (typeof obj === "string") return !!env2[obj];
      if ("env" in obj) {
        return env2[obj.env] && env2[obj.env].includes(obj.includes);
      }
      if ("any" in obj) {
        return obj.any.some(function(k) {
          return !!env2[k];
        });
      }
      return Object.keys(obj).every(function(k) {
        return env2[k] === obj[k];
      });
    }
  }
});

// node_modules/@iarna/toml/lib/parser.js
var require_parser = __commonJS({
  "node_modules/@iarna/toml/lib/parser.js"(exports, module) {
    "use strict";
    var ParserEND = 1114112;
    var ParserError = class _ParserError extends Error {
      /* istanbul ignore next */
      constructor(msg, filename, linenumber) {
        super("[ParserError] " + msg, filename, linenumber);
        this.name = "ParserError";
        this.code = "ParserError";
        if (Error.captureStackTrace) Error.captureStackTrace(this, _ParserError);
      }
    };
    var State = class {
      constructor(parser) {
        this.parser = parser;
        this.buf = "";
        this.returned = null;
        this.result = null;
        this.resultTable = null;
        this.resultArr = null;
      }
    };
    var Parser = class {
      constructor() {
        this.pos = 0;
        this.col = 0;
        this.line = 0;
        this.obj = {};
        this.ctx = this.obj;
        this.stack = [];
        this._buf = "";
        this.char = null;
        this.ii = 0;
        this.state = new State(this.parseStart);
      }
      parse(str2) {
        if (str2.length === 0 || str2.length == null) return;
        this._buf = String(str2);
        this.ii = -1;
        this.char = -1;
        let getNext;
        while (getNext === false || this.nextChar()) {
          getNext = this.runOne();
        }
        this._buf = null;
      }
      nextChar() {
        if (this.char === 10) {
          ++this.line;
          this.col = -1;
        }
        ++this.ii;
        this.char = this._buf.codePointAt(this.ii);
        ++this.pos;
        ++this.col;
        return this.haveBuffer();
      }
      haveBuffer() {
        return this.ii < this._buf.length;
      }
      runOne() {
        return this.state.parser.call(this, this.state.returned);
      }
      finish() {
        this.char = ParserEND;
        let last;
        do {
          last = this.state.parser;
          this.runOne();
        } while (this.state.parser !== last);
        this.ctx = null;
        this.state = null;
        this._buf = null;
        return this.obj;
      }
      next(fn) {
        if (typeof fn !== "function") throw new ParserError("Tried to set state to non-existent state: " + JSON.stringify(fn));
        this.state.parser = fn;
      }
      goto(fn) {
        this.next(fn);
        return this.runOne();
      }
      call(fn, returnWith) {
        if (returnWith) this.next(returnWith);
        this.stack.push(this.state);
        this.state = new State(fn);
      }
      callNow(fn, returnWith) {
        this.call(fn, returnWith);
        return this.runOne();
      }
      return(value) {
        if (this.stack.length === 0) throw this.error(new ParserError("Stack underflow"));
        if (value === void 0) value = this.state.buf;
        this.state = this.stack.pop();
        this.state.returned = value;
      }
      returnNow(value) {
        this.return(value);
        return this.runOne();
      }
      consume() {
        if (this.char === ParserEND) throw this.error(new ParserError("Unexpected end-of-buffer"));
        this.state.buf += this._buf[this.ii];
      }
      error(err) {
        err.line = this.line;
        err.col = this.col;
        err.pos = this.pos;
        return err;
      }
      /* istanbul ignore next */
      parseStart() {
        throw new ParserError("Must declare a parseStart method");
      }
    };
    Parser.END = ParserEND;
    Parser.Error = ParserError;
    module.exports = Parser;
  }
});

// node_modules/@iarna/toml/lib/create-datetime.js
var require_create_datetime = __commonJS({
  "node_modules/@iarna/toml/lib/create-datetime.js"(exports, module) {
    "use strict";
    module.exports = (value) => {
      const date = new Date(value);
      if (isNaN(date)) {
        throw new TypeError("Invalid Datetime");
      } else {
        return date;
      }
    };
  }
});

// node_modules/@iarna/toml/lib/format-num.js
var require_format_num = __commonJS({
  "node_modules/@iarna/toml/lib/format-num.js"(exports, module) {
    "use strict";
    module.exports = (d, num) => {
      num = String(num);
      while (num.length < d) num = "0" + num;
      return num;
    };
  }
});

// node_modules/@iarna/toml/lib/create-datetime-float.js
var require_create_datetime_float = __commonJS({
  "node_modules/@iarna/toml/lib/create-datetime-float.js"(exports, module) {
    "use strict";
    var f = require_format_num();
    var FloatingDateTime = class extends Date {
      constructor(value) {
        super(value + "Z");
        this.isFloating = true;
      }
      toISOString() {
        const date = `${this.getUTCFullYear()}-${f(2, this.getUTCMonth() + 1)}-${f(2, this.getUTCDate())}`;
        const time = `${f(2, this.getUTCHours())}:${f(2, this.getUTCMinutes())}:${f(2, this.getUTCSeconds())}.${f(3, this.getUTCMilliseconds())}`;
        return `${date}T${time}`;
      }
    };
    module.exports = (value) => {
      const date = new FloatingDateTime(value);
      if (isNaN(date)) {
        throw new TypeError("Invalid Datetime");
      } else {
        return date;
      }
    };
  }
});

// node_modules/@iarna/toml/lib/create-date.js
var require_create_date = __commonJS({
  "node_modules/@iarna/toml/lib/create-date.js"(exports, module) {
    "use strict";
    var f = require_format_num();
    var DateTime = global.Date;
    var Date2 = class extends DateTime {
      constructor(value) {
        super(value);
        this.isDate = true;
      }
      toISOString() {
        return `${this.getUTCFullYear()}-${f(2, this.getUTCMonth() + 1)}-${f(2, this.getUTCDate())}`;
      }
    };
    module.exports = (value) => {
      const date = new Date2(value);
      if (isNaN(date)) {
        throw new TypeError("Invalid Datetime");
      } else {
        return date;
      }
    };
  }
});

// node_modules/@iarna/toml/lib/create-time.js
var require_create_time = __commonJS({
  "node_modules/@iarna/toml/lib/create-time.js"(exports, module) {
    "use strict";
    var f = require_format_num();
    var Time = class extends Date {
      constructor(value) {
        super(`0000-01-01T${value}Z`);
        this.isTime = true;
      }
      toISOString() {
        return `${f(2, this.getUTCHours())}:${f(2, this.getUTCMinutes())}:${f(2, this.getUTCSeconds())}.${f(3, this.getUTCMilliseconds())}`;
      }
    };
    module.exports = (value) => {
      const date = new Time(value);
      if (isNaN(date)) {
        throw new TypeError("Invalid Datetime");
      } else {
        return date;
      }
    };
  }
});

// node_modules/@iarna/toml/lib/toml-parser.js
var require_toml_parser = __commonJS({
  "node_modules/@iarna/toml/lib/toml-parser.js"(exports, module) {
    "use strict";
    module.exports = makeParserClass(require_parser());
    module.exports.makeParserClass = makeParserClass;
    var TomlError = class _TomlError extends Error {
      constructor(msg) {
        super(msg);
        this.name = "TomlError";
        if (Error.captureStackTrace) Error.captureStackTrace(this, _TomlError);
        this.fromTOML = true;
        this.wrapped = null;
      }
    };
    TomlError.wrap = (err) => {
      const terr = new TomlError(err.message);
      terr.code = err.code;
      terr.wrapped = err;
      return terr;
    };
    module.exports.TomlError = TomlError;
    var createDateTime = require_create_datetime();
    var createDateTimeFloat = require_create_datetime_float();
    var createDate = require_create_date();
    var createTime = require_create_time();
    var CTRL_I = 9;
    var CTRL_J = 10;
    var CTRL_M = 13;
    var CTRL_CHAR_BOUNDARY = 31;
    var CHAR_SP = 32;
    var CHAR_QUOT = 34;
    var CHAR_NUM = 35;
    var CHAR_APOS = 39;
    var CHAR_PLUS = 43;
    var CHAR_COMMA = 44;
    var CHAR_HYPHEN = 45;
    var CHAR_PERIOD = 46;
    var CHAR_0 = 48;
    var CHAR_1 = 49;
    var CHAR_7 = 55;
    var CHAR_9 = 57;
    var CHAR_COLON = 58;
    var CHAR_EQUALS = 61;
    var CHAR_A = 65;
    var CHAR_E = 69;
    var CHAR_F = 70;
    var CHAR_T = 84;
    var CHAR_U = 85;
    var CHAR_Z = 90;
    var CHAR_LOWBAR = 95;
    var CHAR_a = 97;
    var CHAR_b = 98;
    var CHAR_e = 101;
    var CHAR_f = 102;
    var CHAR_i = 105;
    var CHAR_l = 108;
    var CHAR_n = 110;
    var CHAR_o = 111;
    var CHAR_r = 114;
    var CHAR_s = 115;
    var CHAR_t = 116;
    var CHAR_u = 117;
    var CHAR_x = 120;
    var CHAR_z = 122;
    var CHAR_LCUB = 123;
    var CHAR_RCUB = 125;
    var CHAR_LSQB = 91;
    var CHAR_BSOL = 92;
    var CHAR_RSQB = 93;
    var CHAR_DEL = 127;
    var SURROGATE_FIRST = 55296;
    var SURROGATE_LAST = 57343;
    var escapes = {
      [CHAR_b]: "\b",
      [CHAR_t]: "	",
      [CHAR_n]: "\n",
      [CHAR_f]: "\f",
      [CHAR_r]: "\r",
      [CHAR_QUOT]: '"',
      [CHAR_BSOL]: "\\"
    };
    function isDigit(cp) {
      return cp >= CHAR_0 && cp <= CHAR_9;
    }
    function isHexit(cp) {
      return cp >= CHAR_A && cp <= CHAR_F || cp >= CHAR_a && cp <= CHAR_f || cp >= CHAR_0 && cp <= CHAR_9;
    }
    function isBit(cp) {
      return cp === CHAR_1 || cp === CHAR_0;
    }
    function isOctit(cp) {
      return cp >= CHAR_0 && cp <= CHAR_7;
    }
    function isAlphaNumQuoteHyphen(cp) {
      return cp >= CHAR_A && cp <= CHAR_Z || cp >= CHAR_a && cp <= CHAR_z || cp >= CHAR_0 && cp <= CHAR_9 || cp === CHAR_APOS || cp === CHAR_QUOT || cp === CHAR_LOWBAR || cp === CHAR_HYPHEN;
    }
    function isAlphaNumHyphen(cp) {
      return cp >= CHAR_A && cp <= CHAR_Z || cp >= CHAR_a && cp <= CHAR_z || cp >= CHAR_0 && cp <= CHAR_9 || cp === CHAR_LOWBAR || cp === CHAR_HYPHEN;
    }
    var _type = Symbol("type");
    var _declared = Symbol("declared");
    var hasOwnProperty3 = Object.prototype.hasOwnProperty;
    var defineProperty = Object.defineProperty;
    var descriptor = { configurable: true, enumerable: true, writable: true, value: void 0 };
    function hasKey(obj, key2) {
      if (hasOwnProperty3.call(obj, key2)) return true;
      if (key2 === "__proto__") defineProperty(obj, "__proto__", descriptor);
      return false;
    }
    var INLINE_TABLE = Symbol("inline-table");
    function InlineTable() {
      return Object.defineProperties({}, {
        [_type]: { value: INLINE_TABLE }
      });
    }
    function isInlineTable(obj) {
      if (obj === null || typeof obj !== "object") return false;
      return obj[_type] === INLINE_TABLE;
    }
    var TABLE = Symbol("table");
    function Table() {
      return Object.defineProperties({}, {
        [_type]: { value: TABLE },
        [_declared]: { value: false, writable: true }
      });
    }
    function isTable(obj) {
      if (obj === null || typeof obj !== "object") return false;
      return obj[_type] === TABLE;
    }
    var _contentType = Symbol("content-type");
    var INLINE_LIST = Symbol("inline-list");
    function InlineList(type2) {
      return Object.defineProperties([], {
        [_type]: { value: INLINE_LIST },
        [_contentType]: { value: type2 }
      });
    }
    function isInlineList(obj) {
      if (obj === null || typeof obj !== "object") return false;
      return obj[_type] === INLINE_LIST;
    }
    var LIST = Symbol("list");
    function List() {
      return Object.defineProperties([], {
        [_type]: { value: LIST }
      });
    }
    function isList(obj) {
      if (obj === null || typeof obj !== "object") return false;
      return obj[_type] === LIST;
    }
    var _custom;
    try {
      const utilInspect = __require("util").inspect;
      _custom = utilInspect.custom;
    } catch (_) {
    }
    var _inspect = _custom || "inspect";
    var BoxedBigInt = class {
      constructor(value) {
        try {
          this.value = global.BigInt.asIntN(64, value);
        } catch (_) {
          this.value = null;
        }
        Object.defineProperty(this, _type, { value: INTEGER });
      }
      isNaN() {
        return this.value === null;
      }
      /* istanbul ignore next */
      toString() {
        return String(this.value);
      }
      /* istanbul ignore next */
      [_inspect]() {
        return `[BigInt: ${this.toString()}]}`;
      }
      valueOf() {
        return this.value;
      }
    };
    var INTEGER = Symbol("integer");
    function Integer(value) {
      let num = Number(value);
      if (Object.is(num, -0)) num = 0;
      if (global.BigInt && !Number.isSafeInteger(num)) {
        return new BoxedBigInt(value);
      } else {
        return Object.defineProperties(new Number(num), {
          isNaN: { value: function() {
            return isNaN(this);
          } },
          [_type]: { value: INTEGER },
          [_inspect]: { value: () => `[Integer: ${value}]` }
        });
      }
    }
    function isInteger2(obj) {
      if (obj === null || typeof obj !== "object") return false;
      return obj[_type] === INTEGER;
    }
    var FLOAT = Symbol("float");
    function Float(value) {
      return Object.defineProperties(new Number(value), {
        [_type]: { value: FLOAT },
        [_inspect]: { value: () => `[Float: ${value}]` }
      });
    }
    function isFloat2(obj) {
      if (obj === null || typeof obj !== "object") return false;
      return obj[_type] === FLOAT;
    }
    function tomlType(value) {
      const type2 = typeof value;
      if (type2 === "object") {
        if (value === null) return "null";
        if (value instanceof Date) return "datetime";
        if (_type in value) {
          switch (value[_type]) {
            case INLINE_TABLE:
              return "inline-table";
            case INLINE_LIST:
              return "inline-list";
            case TABLE:
              return "table";
            case LIST:
              return "list";
            case FLOAT:
              return "float";
            case INTEGER:
              return "integer";
          }
        }
      }
      return type2;
    }
    function makeParserClass(Parser) {
      class TOMLParser extends Parser {
        constructor() {
          super();
          this.ctx = this.obj = Table();
        }
        /* MATCH HELPER */
        atEndOfWord() {
          return this.char === CHAR_NUM || this.char === CTRL_I || this.char === CHAR_SP || this.atEndOfLine();
        }
        atEndOfLine() {
          return this.char === Parser.END || this.char === CTRL_J || this.char === CTRL_M;
        }
        parseStart() {
          if (this.char === Parser.END) {
            return null;
          } else if (this.char === CHAR_LSQB) {
            return this.call(this.parseTableOrList);
          } else if (this.char === CHAR_NUM) {
            return this.call(this.parseComment);
          } else if (this.char === CTRL_J || this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M) {
            return null;
          } else if (isAlphaNumQuoteHyphen(this.char)) {
            return this.callNow(this.parseAssignStatement);
          } else {
            throw this.error(new TomlError(`Unknown character "${this.char}"`));
          }
        }
        // HELPER, this strips any whitespace and comments to the end of the line
        // then RETURNS. Last state in a production.
        parseWhitespaceToEOL() {
          if (this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M) {
            return null;
          } else if (this.char === CHAR_NUM) {
            return this.goto(this.parseComment);
          } else if (this.char === Parser.END || this.char === CTRL_J) {
            return this.return();
          } else {
            throw this.error(new TomlError("Unexpected character, expected only whitespace or comments till end of line"));
          }
        }
        /* ASSIGNMENT: key = value */
        parseAssignStatement() {
          return this.callNow(this.parseAssign, this.recordAssignStatement);
        }
        recordAssignStatement(kv) {
          let target = this.ctx;
          let finalKey = kv.key.pop();
          for (let kw of kv.key) {
            if (hasKey(target, kw) && (!isTable(target[kw]) || target[kw][_declared])) {
              throw this.error(new TomlError("Can't redefine existing key"));
            }
            target = target[kw] = target[kw] || Table();
          }
          if (hasKey(target, finalKey)) {
            throw this.error(new TomlError("Can't redefine existing key"));
          }
          if (isInteger2(kv.value) || isFloat2(kv.value)) {
            target[finalKey] = kv.value.valueOf();
          } else {
            target[finalKey] = kv.value;
          }
          return this.goto(this.parseWhitespaceToEOL);
        }
        /* ASSSIGNMENT expression, key = value possibly inside an inline table */
        parseAssign() {
          return this.callNow(this.parseKeyword, this.recordAssignKeyword);
        }
        recordAssignKeyword(key2) {
          if (this.state.resultTable) {
            this.state.resultTable.push(key2);
          } else {
            this.state.resultTable = [key2];
          }
          return this.goto(this.parseAssignKeywordPreDot);
        }
        parseAssignKeywordPreDot() {
          if (this.char === CHAR_PERIOD) {
            return this.next(this.parseAssignKeywordPostDot);
          } else if (this.char !== CHAR_SP && this.char !== CTRL_I) {
            return this.goto(this.parseAssignEqual);
          }
        }
        parseAssignKeywordPostDot() {
          if (this.char !== CHAR_SP && this.char !== CTRL_I) {
            return this.callNow(this.parseKeyword, this.recordAssignKeyword);
          }
        }
        parseAssignEqual() {
          if (this.char === CHAR_EQUALS) {
            return this.next(this.parseAssignPreValue);
          } else {
            throw this.error(new TomlError('Invalid character, expected "="'));
          }
        }
        parseAssignPreValue() {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else {
            return this.callNow(this.parseValue, this.recordAssignValue);
          }
        }
        recordAssignValue(value) {
          return this.returnNow({ key: this.state.resultTable, value });
        }
        /* COMMENTS: #...eol */
        parseComment() {
          do {
            if (this.char === Parser.END || this.char === CTRL_J) {
              return this.return();
            }
          } while (this.nextChar());
        }
        /* TABLES AND LISTS, [foo] and [[foo]] */
        parseTableOrList() {
          if (this.char === CHAR_LSQB) {
            this.next(this.parseList);
          } else {
            return this.goto(this.parseTable);
          }
        }
        /* TABLE [foo.bar.baz] */
        parseTable() {
          this.ctx = this.obj;
          return this.goto(this.parseTableNext);
        }
        parseTableNext() {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else {
            return this.callNow(this.parseKeyword, this.parseTableMore);
          }
        }
        parseTableMore(keyword) {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else if (this.char === CHAR_RSQB) {
            if (hasKey(this.ctx, keyword) && (!isTable(this.ctx[keyword]) || this.ctx[keyword][_declared])) {
              throw this.error(new TomlError("Can't redefine existing key"));
            } else {
              this.ctx = this.ctx[keyword] = this.ctx[keyword] || Table();
              this.ctx[_declared] = true;
            }
            return this.next(this.parseWhitespaceToEOL);
          } else if (this.char === CHAR_PERIOD) {
            if (!hasKey(this.ctx, keyword)) {
              this.ctx = this.ctx[keyword] = Table();
            } else if (isTable(this.ctx[keyword])) {
              this.ctx = this.ctx[keyword];
            } else if (isList(this.ctx[keyword])) {
              this.ctx = this.ctx[keyword][this.ctx[keyword].length - 1];
            } else {
              throw this.error(new TomlError("Can't redefine existing key"));
            }
            return this.next(this.parseTableNext);
          } else {
            throw this.error(new TomlError("Unexpected character, expected whitespace, . or ]"));
          }
        }
        /* LIST [[a.b.c]] */
        parseList() {
          this.ctx = this.obj;
          return this.goto(this.parseListNext);
        }
        parseListNext() {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else {
            return this.callNow(this.parseKeyword, this.parseListMore);
          }
        }
        parseListMore(keyword) {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else if (this.char === CHAR_RSQB) {
            if (!hasKey(this.ctx, keyword)) {
              this.ctx[keyword] = List();
            }
            if (isInlineList(this.ctx[keyword])) {
              throw this.error(new TomlError("Can't extend an inline array"));
            } else if (isList(this.ctx[keyword])) {
              const next = Table();
              this.ctx[keyword].push(next);
              this.ctx = next;
            } else {
              throw this.error(new TomlError("Can't redefine an existing key"));
            }
            return this.next(this.parseListEnd);
          } else if (this.char === CHAR_PERIOD) {
            if (!hasKey(this.ctx, keyword)) {
              this.ctx = this.ctx[keyword] = Table();
            } else if (isInlineList(this.ctx[keyword])) {
              throw this.error(new TomlError("Can't extend an inline array"));
            } else if (isInlineTable(this.ctx[keyword])) {
              throw this.error(new TomlError("Can't extend an inline table"));
            } else if (isList(this.ctx[keyword])) {
              this.ctx = this.ctx[keyword][this.ctx[keyword].length - 1];
            } else if (isTable(this.ctx[keyword])) {
              this.ctx = this.ctx[keyword];
            } else {
              throw this.error(new TomlError("Can't redefine an existing key"));
            }
            return this.next(this.parseListNext);
          } else {
            throw this.error(new TomlError("Unexpected character, expected whitespace, . or ]"));
          }
        }
        parseListEnd(keyword) {
          if (this.char === CHAR_RSQB) {
            return this.next(this.parseWhitespaceToEOL);
          } else {
            throw this.error(new TomlError("Unexpected character, expected whitespace, . or ]"));
          }
        }
        /* VALUE string, number, boolean, inline list, inline object */
        parseValue() {
          if (this.char === Parser.END) {
            throw this.error(new TomlError("Key without value"));
          } else if (this.char === CHAR_QUOT) {
            return this.next(this.parseDoubleString);
          }
          if (this.char === CHAR_APOS) {
            return this.next(this.parseSingleString);
          } else if (this.char === CHAR_HYPHEN || this.char === CHAR_PLUS) {
            return this.goto(this.parseNumberSign);
          } else if (this.char === CHAR_i) {
            return this.next(this.parseInf);
          } else if (this.char === CHAR_n) {
            return this.next(this.parseNan);
          } else if (isDigit(this.char)) {
            return this.goto(this.parseNumberOrDateTime);
          } else if (this.char === CHAR_t || this.char === CHAR_f) {
            return this.goto(this.parseBoolean);
          } else if (this.char === CHAR_LSQB) {
            return this.call(this.parseInlineList, this.recordValue);
          } else if (this.char === CHAR_LCUB) {
            return this.call(this.parseInlineTable, this.recordValue);
          } else {
            throw this.error(new TomlError("Unexpected character, expecting string, number, datetime, boolean, inline array or inline table"));
          }
        }
        recordValue(value) {
          return this.returnNow(value);
        }
        parseInf() {
          if (this.char === CHAR_n) {
            return this.next(this.parseInf2);
          } else {
            throw this.error(new TomlError('Unexpected character, expected "inf", "+inf" or "-inf"'));
          }
        }
        parseInf2() {
          if (this.char === CHAR_f) {
            if (this.state.buf === "-") {
              return this.return(-Infinity);
            } else {
              return this.return(Infinity);
            }
          } else {
            throw this.error(new TomlError('Unexpected character, expected "inf", "+inf" or "-inf"'));
          }
        }
        parseNan() {
          if (this.char === CHAR_a) {
            return this.next(this.parseNan2);
          } else {
            throw this.error(new TomlError('Unexpected character, expected "nan"'));
          }
        }
        parseNan2() {
          if (this.char === CHAR_n) {
            return this.return(NaN);
          } else {
            throw this.error(new TomlError('Unexpected character, expected "nan"'));
          }
        }
        /* KEYS, barewords or basic, literal, or dotted */
        parseKeyword() {
          if (this.char === CHAR_QUOT) {
            return this.next(this.parseBasicString);
          } else if (this.char === CHAR_APOS) {
            return this.next(this.parseLiteralString);
          } else {
            return this.goto(this.parseBareKey);
          }
        }
        /* KEYS: barewords */
        parseBareKey() {
          do {
            if (this.char === Parser.END) {
              throw this.error(new TomlError("Key ended without value"));
            } else if (isAlphaNumHyphen(this.char)) {
              this.consume();
            } else if (this.state.buf.length === 0) {
              throw this.error(new TomlError("Empty bare keys are not allowed"));
            } else {
              return this.returnNow();
            }
          } while (this.nextChar());
        }
        /* STRINGS, single quoted (literal) */
        parseSingleString() {
          if (this.char === CHAR_APOS) {
            return this.next(this.parseLiteralMultiStringMaybe);
          } else {
            return this.goto(this.parseLiteralString);
          }
        }
        parseLiteralString() {
          do {
            if (this.char === CHAR_APOS) {
              return this.return();
            } else if (this.atEndOfLine()) {
              throw this.error(new TomlError("Unterminated string"));
            } else if (this.char === CHAR_DEL || this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I) {
              throw this.errorControlCharInString();
            } else {
              this.consume();
            }
          } while (this.nextChar());
        }
        parseLiteralMultiStringMaybe() {
          if (this.char === CHAR_APOS) {
            return this.next(this.parseLiteralMultiString);
          } else {
            return this.returnNow();
          }
        }
        parseLiteralMultiString() {
          if (this.char === CTRL_M) {
            return null;
          } else if (this.char === CTRL_J) {
            return this.next(this.parseLiteralMultiStringContent);
          } else {
            return this.goto(this.parseLiteralMultiStringContent);
          }
        }
        parseLiteralMultiStringContent() {
          do {
            if (this.char === CHAR_APOS) {
              return this.next(this.parseLiteralMultiEnd);
            } else if (this.char === Parser.END) {
              throw this.error(new TomlError("Unterminated multi-line string"));
            } else if (this.char === CHAR_DEL || this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I && this.char !== CTRL_J && this.char !== CTRL_M) {
              throw this.errorControlCharInString();
            } else {
              this.consume();
            }
          } while (this.nextChar());
        }
        parseLiteralMultiEnd() {
          if (this.char === CHAR_APOS) {
            return this.next(this.parseLiteralMultiEnd2);
          } else {
            this.state.buf += "'";
            return this.goto(this.parseLiteralMultiStringContent);
          }
        }
        parseLiteralMultiEnd2() {
          if (this.char === CHAR_APOS) {
            return this.return();
          } else {
            this.state.buf += "''";
            return this.goto(this.parseLiteralMultiStringContent);
          }
        }
        /* STRINGS double quoted */
        parseDoubleString() {
          if (this.char === CHAR_QUOT) {
            return this.next(this.parseMultiStringMaybe);
          } else {
            return this.goto(this.parseBasicString);
          }
        }
        parseBasicString() {
          do {
            if (this.char === CHAR_BSOL) {
              return this.call(this.parseEscape, this.recordEscapeReplacement);
            } else if (this.char === CHAR_QUOT) {
              return this.return();
            } else if (this.atEndOfLine()) {
              throw this.error(new TomlError("Unterminated string"));
            } else if (this.char === CHAR_DEL || this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I) {
              throw this.errorControlCharInString();
            } else {
              this.consume();
            }
          } while (this.nextChar());
        }
        recordEscapeReplacement(replacement) {
          this.state.buf += replacement;
          return this.goto(this.parseBasicString);
        }
        parseMultiStringMaybe() {
          if (this.char === CHAR_QUOT) {
            return this.next(this.parseMultiString);
          } else {
            return this.returnNow();
          }
        }
        parseMultiString() {
          if (this.char === CTRL_M) {
            return null;
          } else if (this.char === CTRL_J) {
            return this.next(this.parseMultiStringContent);
          } else {
            return this.goto(this.parseMultiStringContent);
          }
        }
        parseMultiStringContent() {
          do {
            if (this.char === CHAR_BSOL) {
              return this.call(this.parseMultiEscape, this.recordMultiEscapeReplacement);
            } else if (this.char === CHAR_QUOT) {
              return this.next(this.parseMultiEnd);
            } else if (this.char === Parser.END) {
              throw this.error(new TomlError("Unterminated multi-line string"));
            } else if (this.char === CHAR_DEL || this.char <= CTRL_CHAR_BOUNDARY && this.char !== CTRL_I && this.char !== CTRL_J && this.char !== CTRL_M) {
              throw this.errorControlCharInString();
            } else {
              this.consume();
            }
          } while (this.nextChar());
        }
        errorControlCharInString() {
          let displayCode = "\\u00";
          if (this.char < 16) {
            displayCode += "0";
          }
          displayCode += this.char.toString(16);
          return this.error(new TomlError(`Control characters (codes < 0x1f and 0x7f) are not allowed in strings, use ${displayCode} instead`));
        }
        recordMultiEscapeReplacement(replacement) {
          this.state.buf += replacement;
          return this.goto(this.parseMultiStringContent);
        }
        parseMultiEnd() {
          if (this.char === CHAR_QUOT) {
            return this.next(this.parseMultiEnd2);
          } else {
            this.state.buf += '"';
            return this.goto(this.parseMultiStringContent);
          }
        }
        parseMultiEnd2() {
          if (this.char === CHAR_QUOT) {
            return this.return();
          } else {
            this.state.buf += '""';
            return this.goto(this.parseMultiStringContent);
          }
        }
        parseMultiEscape() {
          if (this.char === CTRL_M || this.char === CTRL_J) {
            return this.next(this.parseMultiTrim);
          } else if (this.char === CHAR_SP || this.char === CTRL_I) {
            return this.next(this.parsePreMultiTrim);
          } else {
            return this.goto(this.parseEscape);
          }
        }
        parsePreMultiTrim() {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else if (this.char === CTRL_M || this.char === CTRL_J) {
            return this.next(this.parseMultiTrim);
          } else {
            throw this.error(new TomlError("Can't escape whitespace"));
          }
        }
        parseMultiTrim() {
          if (this.char === CTRL_J || this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M) {
            return null;
          } else {
            return this.returnNow();
          }
        }
        parseEscape() {
          if (this.char in escapes) {
            return this.return(escapes[this.char]);
          } else if (this.char === CHAR_u) {
            return this.call(this.parseSmallUnicode, this.parseUnicodeReturn);
          } else if (this.char === CHAR_U) {
            return this.call(this.parseLargeUnicode, this.parseUnicodeReturn);
          } else {
            throw this.error(new TomlError("Unknown escape character: " + this.char));
          }
        }
        parseUnicodeReturn(char) {
          try {
            const codePoint = parseInt(char, 16);
            if (codePoint >= SURROGATE_FIRST && codePoint <= SURROGATE_LAST) {
              throw this.error(new TomlError("Invalid unicode, character in range 0xD800 - 0xDFFF is reserved"));
            }
            return this.returnNow(String.fromCodePoint(codePoint));
          } catch (err) {
            throw this.error(TomlError.wrap(err));
          }
        }
        parseSmallUnicode() {
          if (!isHexit(this.char)) {
            throw this.error(new TomlError("Invalid character in unicode sequence, expected hex"));
          } else {
            this.consume();
            if (this.state.buf.length >= 4) return this.return();
          }
        }
        parseLargeUnicode() {
          if (!isHexit(this.char)) {
            throw this.error(new TomlError("Invalid character in unicode sequence, expected hex"));
          } else {
            this.consume();
            if (this.state.buf.length >= 8) return this.return();
          }
        }
        /* NUMBERS */
        parseNumberSign() {
          this.consume();
          return this.next(this.parseMaybeSignedInfOrNan);
        }
        parseMaybeSignedInfOrNan() {
          if (this.char === CHAR_i) {
            return this.next(this.parseInf);
          } else if (this.char === CHAR_n) {
            return this.next(this.parseNan);
          } else {
            return this.callNow(this.parseNoUnder, this.parseNumberIntegerStart);
          }
        }
        parseNumberIntegerStart() {
          if (this.char === CHAR_0) {
            this.consume();
            return this.next(this.parseNumberIntegerExponentOrDecimal);
          } else {
            return this.goto(this.parseNumberInteger);
          }
        }
        parseNumberIntegerExponentOrDecimal() {
          if (this.char === CHAR_PERIOD) {
            this.consume();
            return this.call(this.parseNoUnder, this.parseNumberFloat);
          } else if (this.char === CHAR_E || this.char === CHAR_e) {
            this.consume();
            return this.next(this.parseNumberExponentSign);
          } else {
            return this.returnNow(Integer(this.state.buf));
          }
        }
        parseNumberInteger() {
          if (isDigit(this.char)) {
            this.consume();
          } else if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnder);
          } else if (this.char === CHAR_E || this.char === CHAR_e) {
            this.consume();
            return this.next(this.parseNumberExponentSign);
          } else if (this.char === CHAR_PERIOD) {
            this.consume();
            return this.call(this.parseNoUnder, this.parseNumberFloat);
          } else {
            const result = Integer(this.state.buf);
            if (result.isNaN()) {
              throw this.error(new TomlError("Invalid number"));
            } else {
              return this.returnNow(result);
            }
          }
        }
        parseNoUnder() {
          if (this.char === CHAR_LOWBAR || this.char === CHAR_PERIOD || this.char === CHAR_E || this.char === CHAR_e) {
            throw this.error(new TomlError("Unexpected character, expected digit"));
          } else if (this.atEndOfWord()) {
            throw this.error(new TomlError("Incomplete number"));
          }
          return this.returnNow();
        }
        parseNoUnderHexOctBinLiteral() {
          if (this.char === CHAR_LOWBAR || this.char === CHAR_PERIOD) {
            throw this.error(new TomlError("Unexpected character, expected digit"));
          } else if (this.atEndOfWord()) {
            throw this.error(new TomlError("Incomplete number"));
          }
          return this.returnNow();
        }
        parseNumberFloat() {
          if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnder, this.parseNumberFloat);
          } else if (isDigit(this.char)) {
            this.consume();
          } else if (this.char === CHAR_E || this.char === CHAR_e) {
            this.consume();
            return this.next(this.parseNumberExponentSign);
          } else {
            return this.returnNow(Float(this.state.buf));
          }
        }
        parseNumberExponentSign() {
          if (isDigit(this.char)) {
            return this.goto(this.parseNumberExponent);
          } else if (this.char === CHAR_HYPHEN || this.char === CHAR_PLUS) {
            this.consume();
            this.call(this.parseNoUnder, this.parseNumberExponent);
          } else {
            throw this.error(new TomlError("Unexpected character, expected -, + or digit"));
          }
        }
        parseNumberExponent() {
          if (isDigit(this.char)) {
            this.consume();
          } else if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnder);
          } else {
            return this.returnNow(Float(this.state.buf));
          }
        }
        /* NUMBERS or DATETIMES  */
        parseNumberOrDateTime() {
          if (this.char === CHAR_0) {
            this.consume();
            return this.next(this.parseNumberBaseOrDateTime);
          } else {
            return this.goto(this.parseNumberOrDateTimeOnly);
          }
        }
        parseNumberOrDateTimeOnly() {
          if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnder, this.parseNumberInteger);
          } else if (isDigit(this.char)) {
            this.consume();
            if (this.state.buf.length > 4) this.next(this.parseNumberInteger);
          } else if (this.char === CHAR_E || this.char === CHAR_e) {
            this.consume();
            return this.next(this.parseNumberExponentSign);
          } else if (this.char === CHAR_PERIOD) {
            this.consume();
            return this.call(this.parseNoUnder, this.parseNumberFloat);
          } else if (this.char === CHAR_HYPHEN) {
            return this.goto(this.parseDateTime);
          } else if (this.char === CHAR_COLON) {
            return this.goto(this.parseOnlyTimeHour);
          } else {
            return this.returnNow(Integer(this.state.buf));
          }
        }
        parseDateTimeOnly() {
          if (this.state.buf.length < 4) {
            if (isDigit(this.char)) {
              return this.consume();
            } else if (this.char === CHAR_COLON) {
              return this.goto(this.parseOnlyTimeHour);
            } else {
              throw this.error(new TomlError("Expected digit while parsing year part of a date"));
            }
          } else {
            if (this.char === CHAR_HYPHEN) {
              return this.goto(this.parseDateTime);
            } else {
              throw this.error(new TomlError("Expected hyphen (-) while parsing year part of date"));
            }
          }
        }
        parseNumberBaseOrDateTime() {
          if (this.char === CHAR_b) {
            this.consume();
            return this.call(this.parseNoUnderHexOctBinLiteral, this.parseIntegerBin);
          } else if (this.char === CHAR_o) {
            this.consume();
            return this.call(this.parseNoUnderHexOctBinLiteral, this.parseIntegerOct);
          } else if (this.char === CHAR_x) {
            this.consume();
            return this.call(this.parseNoUnderHexOctBinLiteral, this.parseIntegerHex);
          } else if (this.char === CHAR_PERIOD) {
            return this.goto(this.parseNumberInteger);
          } else if (isDigit(this.char)) {
            return this.goto(this.parseDateTimeOnly);
          } else {
            return this.returnNow(Integer(this.state.buf));
          }
        }
        parseIntegerHex() {
          if (isHexit(this.char)) {
            this.consume();
          } else if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnderHexOctBinLiteral);
          } else {
            const result = Integer(this.state.buf);
            if (result.isNaN()) {
              throw this.error(new TomlError("Invalid number"));
            } else {
              return this.returnNow(result);
            }
          }
        }
        parseIntegerOct() {
          if (isOctit(this.char)) {
            this.consume();
          } else if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnderHexOctBinLiteral);
          } else {
            const result = Integer(this.state.buf);
            if (result.isNaN()) {
              throw this.error(new TomlError("Invalid number"));
            } else {
              return this.returnNow(result);
            }
          }
        }
        parseIntegerBin() {
          if (isBit(this.char)) {
            this.consume();
          } else if (this.char === CHAR_LOWBAR) {
            return this.call(this.parseNoUnderHexOctBinLiteral);
          } else {
            const result = Integer(this.state.buf);
            if (result.isNaN()) {
              throw this.error(new TomlError("Invalid number"));
            } else {
              return this.returnNow(result);
            }
          }
        }
        /* DATETIME */
        parseDateTime() {
          if (this.state.buf.length < 4) {
            throw this.error(new TomlError("Years less than 1000 must be zero padded to four characters"));
          }
          this.state.result = this.state.buf;
          this.state.buf = "";
          return this.next(this.parseDateMonth);
        }
        parseDateMonth() {
          if (this.char === CHAR_HYPHEN) {
            if (this.state.buf.length < 2) {
              throw this.error(new TomlError("Months less than 10 must be zero padded to two characters"));
            }
            this.state.result += "-" + this.state.buf;
            this.state.buf = "";
            return this.next(this.parseDateDay);
          } else if (isDigit(this.char)) {
            this.consume();
          } else {
            throw this.error(new TomlError("Incomplete datetime"));
          }
        }
        parseDateDay() {
          if (this.char === CHAR_T || this.char === CHAR_SP) {
            if (this.state.buf.length < 2) {
              throw this.error(new TomlError("Days less than 10 must be zero padded to two characters"));
            }
            this.state.result += "-" + this.state.buf;
            this.state.buf = "";
            return this.next(this.parseStartTimeHour);
          } else if (this.atEndOfWord()) {
            return this.returnNow(createDate(this.state.result + "-" + this.state.buf));
          } else if (isDigit(this.char)) {
            this.consume();
          } else {
            throw this.error(new TomlError("Incomplete datetime"));
          }
        }
        parseStartTimeHour() {
          if (this.atEndOfWord()) {
            return this.returnNow(createDate(this.state.result));
          } else {
            return this.goto(this.parseTimeHour);
          }
        }
        parseTimeHour() {
          if (this.char === CHAR_COLON) {
            if (this.state.buf.length < 2) {
              throw this.error(new TomlError("Hours less than 10 must be zero padded to two characters"));
            }
            this.state.result += "T" + this.state.buf;
            this.state.buf = "";
            return this.next(this.parseTimeMin);
          } else if (isDigit(this.char)) {
            this.consume();
          } else {
            throw this.error(new TomlError("Incomplete datetime"));
          }
        }
        parseTimeMin() {
          if (this.state.buf.length < 2 && isDigit(this.char)) {
            this.consume();
          } else if (this.state.buf.length === 2 && this.char === CHAR_COLON) {
            this.state.result += ":" + this.state.buf;
            this.state.buf = "";
            return this.next(this.parseTimeSec);
          } else {
            throw this.error(new TomlError("Incomplete datetime"));
          }
        }
        parseTimeSec() {
          if (isDigit(this.char)) {
            this.consume();
            if (this.state.buf.length === 2) {
              this.state.result += ":" + this.state.buf;
              this.state.buf = "";
              return this.next(this.parseTimeZoneOrFraction);
            }
          } else {
            throw this.error(new TomlError("Incomplete datetime"));
          }
        }
        parseOnlyTimeHour() {
          if (this.char === CHAR_COLON) {
            if (this.state.buf.length < 2) {
              throw this.error(new TomlError("Hours less than 10 must be zero padded to two characters"));
            }
            this.state.result = this.state.buf;
            this.state.buf = "";
            return this.next(this.parseOnlyTimeMin);
          } else {
            throw this.error(new TomlError("Incomplete time"));
          }
        }
        parseOnlyTimeMin() {
          if (this.state.buf.length < 2 && isDigit(this.char)) {
            this.consume();
          } else if (this.state.buf.length === 2 && this.char === CHAR_COLON) {
            this.state.result += ":" + this.state.buf;
            this.state.buf = "";
            return this.next(this.parseOnlyTimeSec);
          } else {
            throw this.error(new TomlError("Incomplete time"));
          }
        }
        parseOnlyTimeSec() {
          if (isDigit(this.char)) {
            this.consume();
            if (this.state.buf.length === 2) {
              return this.next(this.parseOnlyTimeFractionMaybe);
            }
          } else {
            throw this.error(new TomlError("Incomplete time"));
          }
        }
        parseOnlyTimeFractionMaybe() {
          this.state.result += ":" + this.state.buf;
          if (this.char === CHAR_PERIOD) {
            this.state.buf = "";
            this.next(this.parseOnlyTimeFraction);
          } else {
            return this.return(createTime(this.state.result));
          }
        }
        parseOnlyTimeFraction() {
          if (isDigit(this.char)) {
            this.consume();
          } else if (this.atEndOfWord()) {
            if (this.state.buf.length === 0) throw this.error(new TomlError("Expected digit in milliseconds"));
            return this.returnNow(createTime(this.state.result + "." + this.state.buf));
          } else {
            throw this.error(new TomlError("Unexpected character in datetime, expected period (.), minus (-), plus (+) or Z"));
          }
        }
        parseTimeZoneOrFraction() {
          if (this.char === CHAR_PERIOD) {
            this.consume();
            this.next(this.parseDateTimeFraction);
          } else if (this.char === CHAR_HYPHEN || this.char === CHAR_PLUS) {
            this.consume();
            this.next(this.parseTimeZoneHour);
          } else if (this.char === CHAR_Z) {
            this.consume();
            return this.return(createDateTime(this.state.result + this.state.buf));
          } else if (this.atEndOfWord()) {
            return this.returnNow(createDateTimeFloat(this.state.result + this.state.buf));
          } else {
            throw this.error(new TomlError("Unexpected character in datetime, expected period (.), minus (-), plus (+) or Z"));
          }
        }
        parseDateTimeFraction() {
          if (isDigit(this.char)) {
            this.consume();
          } else if (this.state.buf.length === 1) {
            throw this.error(new TomlError("Expected digit in milliseconds"));
          } else if (this.char === CHAR_HYPHEN || this.char === CHAR_PLUS) {
            this.consume();
            this.next(this.parseTimeZoneHour);
          } else if (this.char === CHAR_Z) {
            this.consume();
            return this.return(createDateTime(this.state.result + this.state.buf));
          } else if (this.atEndOfWord()) {
            return this.returnNow(createDateTimeFloat(this.state.result + this.state.buf));
          } else {
            throw this.error(new TomlError("Unexpected character in datetime, expected period (.), minus (-), plus (+) or Z"));
          }
        }
        parseTimeZoneHour() {
          if (isDigit(this.char)) {
            this.consume();
            if (/\d\d$/.test(this.state.buf)) return this.next(this.parseTimeZoneSep);
          } else {
            throw this.error(new TomlError("Unexpected character in datetime, expected digit"));
          }
        }
        parseTimeZoneSep() {
          if (this.char === CHAR_COLON) {
            this.consume();
            this.next(this.parseTimeZoneMin);
          } else {
            throw this.error(new TomlError("Unexpected character in datetime, expected colon"));
          }
        }
        parseTimeZoneMin() {
          if (isDigit(this.char)) {
            this.consume();
            if (/\d\d$/.test(this.state.buf)) return this.return(createDateTime(this.state.result + this.state.buf));
          } else {
            throw this.error(new TomlError("Unexpected character in datetime, expected digit"));
          }
        }
        /* BOOLEAN */
        parseBoolean() {
          if (this.char === CHAR_t) {
            this.consume();
            return this.next(this.parseTrue_r);
          } else if (this.char === CHAR_f) {
            this.consume();
            return this.next(this.parseFalse_a);
          }
        }
        parseTrue_r() {
          if (this.char === CHAR_r) {
            this.consume();
            return this.next(this.parseTrue_u);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        parseTrue_u() {
          if (this.char === CHAR_u) {
            this.consume();
            return this.next(this.parseTrue_e);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        parseTrue_e() {
          if (this.char === CHAR_e) {
            return this.return(true);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        parseFalse_a() {
          if (this.char === CHAR_a) {
            this.consume();
            return this.next(this.parseFalse_l);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        parseFalse_l() {
          if (this.char === CHAR_l) {
            this.consume();
            return this.next(this.parseFalse_s);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        parseFalse_s() {
          if (this.char === CHAR_s) {
            this.consume();
            return this.next(this.parseFalse_e);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        parseFalse_e() {
          if (this.char === CHAR_e) {
            return this.return(false);
          } else {
            throw this.error(new TomlError("Invalid boolean, expected true or false"));
          }
        }
        /* INLINE LISTS */
        parseInlineList() {
          if (this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M || this.char === CTRL_J) {
            return null;
          } else if (this.char === Parser.END) {
            throw this.error(new TomlError("Unterminated inline array"));
          } else if (this.char === CHAR_NUM) {
            return this.call(this.parseComment);
          } else if (this.char === CHAR_RSQB) {
            return this.return(this.state.resultArr || InlineList());
          } else {
            return this.callNow(this.parseValue, this.recordInlineListValue);
          }
        }
        recordInlineListValue(value) {
          if (this.state.resultArr) {
            const listType = this.state.resultArr[_contentType];
            const valueType = tomlType(value);
            if (listType !== valueType) {
              throw this.error(new TomlError(`Inline lists must be a single type, not a mix of ${listType} and ${valueType}`));
            }
          } else {
            this.state.resultArr = InlineList(tomlType(value));
          }
          if (isFloat2(value) || isInteger2(value)) {
            this.state.resultArr.push(value.valueOf());
          } else {
            this.state.resultArr.push(value);
          }
          return this.goto(this.parseInlineListNext);
        }
        parseInlineListNext() {
          if (this.char === CHAR_SP || this.char === CTRL_I || this.char === CTRL_M || this.char === CTRL_J) {
            return null;
          } else if (this.char === CHAR_NUM) {
            return this.call(this.parseComment);
          } else if (this.char === CHAR_COMMA) {
            return this.next(this.parseInlineList);
          } else if (this.char === CHAR_RSQB) {
            return this.goto(this.parseInlineList);
          } else {
            throw this.error(new TomlError("Invalid character, expected whitespace, comma (,) or close bracket (])"));
          }
        }
        /* INLINE TABLE */
        parseInlineTable() {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else if (this.char === Parser.END || this.char === CHAR_NUM || this.char === CTRL_J || this.char === CTRL_M) {
            throw this.error(new TomlError("Unterminated inline array"));
          } else if (this.char === CHAR_RCUB) {
            return this.return(this.state.resultTable || InlineTable());
          } else {
            if (!this.state.resultTable) this.state.resultTable = InlineTable();
            return this.callNow(this.parseAssign, this.recordInlineTableValue);
          }
        }
        recordInlineTableValue(kv) {
          let target = this.state.resultTable;
          let finalKey = kv.key.pop();
          for (let kw of kv.key) {
            if (hasKey(target, kw) && (!isTable(target[kw]) || target[kw][_declared])) {
              throw this.error(new TomlError("Can't redefine existing key"));
            }
            target = target[kw] = target[kw] || Table();
          }
          if (hasKey(target, finalKey)) {
            throw this.error(new TomlError("Can't redefine existing key"));
          }
          if (isInteger2(kv.value) || isFloat2(kv.value)) {
            target[finalKey] = kv.value.valueOf();
          } else {
            target[finalKey] = kv.value;
          }
          return this.goto(this.parseInlineTableNext);
        }
        parseInlineTableNext() {
          if (this.char === CHAR_SP || this.char === CTRL_I) {
            return null;
          } else if (this.char === Parser.END || this.char === CHAR_NUM || this.char === CTRL_J || this.char === CTRL_M) {
            throw this.error(new TomlError("Unterminated inline array"));
          } else if (this.char === CHAR_COMMA) {
            return this.next(this.parseInlineTable);
          } else if (this.char === CHAR_RCUB) {
            return this.goto(this.parseInlineTable);
          } else {
            throw this.error(new TomlError("Invalid character, expected whitespace, comma (,) or close bracket (])"));
          }
        }
      }
      return TOMLParser;
    }
  }
});

// node_modules/@iarna/toml/parse-pretty-error.js
var require_parse_pretty_error = __commonJS({
  "node_modules/@iarna/toml/parse-pretty-error.js"(exports, module) {
    "use strict";
    module.exports = prettyError;
    function prettyError(err, buf) {
      if (err.pos == null || err.line == null) return err;
      let msg = err.message;
      msg += ` at row ${err.line + 1}, col ${err.col + 1}, pos ${err.pos}:
`;
      if (buf && buf.split) {
        const lines = buf.split(/\n/);
        const lineNumWidth = String(Math.min(lines.length, err.line + 3)).length;
        let linePadding = " ";
        while (linePadding.length < lineNumWidth) linePadding += " ";
        for (let ii = Math.max(0, err.line - 1); ii < Math.min(lines.length, err.line + 2); ++ii) {
          let lineNum = String(ii + 1);
          if (lineNum.length < lineNumWidth) lineNum = " " + lineNum;
          if (err.line === ii) {
            msg += lineNum + "> " + lines[ii] + "\n";
            msg += linePadding + "  ";
            for (let hh = 0; hh < err.col; ++hh) {
              msg += " ";
            }
            msg += "^\n";
          } else {
            msg += lineNum + ": " + lines[ii] + "\n";
          }
        }
      }
      err.message = msg + "\n";
      return err;
    }
  }
});

// node_modules/@iarna/toml/parse-async.js
var require_parse_async = __commonJS({
  "node_modules/@iarna/toml/parse-async.js"(exports, module) {
    "use strict";
    module.exports = parseAsync;
    var TOMLParser = require_toml_parser();
    var prettyError = require_parse_pretty_error();
    function parseAsync(str2, opts) {
      if (!opts) opts = {};
      const index = 0;
      const blocksize = opts.blocksize || 40960;
      const parser = new TOMLParser();
      return new Promise((resolve3, reject) => {
        setImmediate(parseAsyncNext, index, blocksize, resolve3, reject);
      });
      function parseAsyncNext(index2, blocksize2, resolve3, reject) {
        if (index2 >= str2.length) {
          try {
            return resolve3(parser.finish());
          } catch (err) {
            return reject(prettyError(err, str2));
          }
        }
        try {
          parser.parse(str2.slice(index2, index2 + blocksize2));
          setImmediate(parseAsyncNext, index2 + blocksize2, blocksize2, resolve3, reject);
        } catch (err) {
          reject(prettyError(err, str2));
        }
      }
    }
  }
});

// node_modules/js-tokens/index.js
var require_js_tokens = __commonJS({
  "node_modules/js-tokens/index.js"(exports) {
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = /((['"])(?:(?!\2|\\).|\\(?:\r\n|[\s\S]))*(\2)?|`(?:[^`\\$]|\\[\s\S]|\$(?!\{)|\$\{(?:[^{}]|\{[^}]*\}?)*\}?)*(`)?)|(\/\/.*)|(\/\*(?:[^*]|\*(?!\/))*(\*\/)?)|(\/(?!\*)(?:\[(?:(?![\]\\]).|\\.)*\]|(?![\/\]\\]).|\\.)+\/(?:(?!\s*(?:\b|[\u0080-\uFFFF$\\'"~({]|[+\-!](?!=)|\.?\d))|[gmiyus]{1,6}\b(?![\u0080-\uFFFF$\\]|\s*(?:[+\-*%&|^<>!=?({]|\/(?![\/*])))))|(0[xX][\da-fA-F]+|0[oO][0-7]+|0[bB][01]+|(?:\d*\.\d+|\d+\.?)(?:[eE][+-]?\d+)?)|((?!\d)(?:(?!\s)[$\w\u0080-\uFFFF]|\\u[\da-fA-F]{4}|\\u\{[\da-fA-F]+\})+)|(--|\+\+|&&|\|\||=>|\.{3}|(?:[+\-\/%&|^]|\*{1,2}|<{1,2}|>{1,3}|!=?|={1,2})=?|[?~.,:;[\](){}])|(\s+)|(^$|[\s\S])/g;
    exports.matchToToken = function(match) {
      var token2 = { type: "invalid", value: match[0], closed: void 0 };
      if (match[1]) token2.type = "string", token2.closed = !!(match[3] || match[4]);
      else if (match[5]) token2.type = "comment";
      else if (match[6]) token2.type = "comment", token2.closed = !!match[7];
      else if (match[8]) token2.type = "regex";
      else if (match[9]) token2.type = "number";
      else if (match[10]) token2.type = "name";
      else if (match[11]) token2.type = "punctuator";
      else if (match[12]) token2.type = "whitespace";
      return token2;
    };
  }
});

// node_modules/@babel/helper-validator-identifier/lib/identifier.js
var require_identifier = __commonJS({
  "node_modules/@babel/helper-validator-identifier/lib/identifier.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.isIdentifierChar = isIdentifierChar;
    exports.isIdentifierName = isIdentifierName;
    exports.isIdentifierStart = isIdentifierStart;
    var nonASCIIidentifierStartChars = "\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0560-\u0588\u05D0-\u05EA\u05EF-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u0870-\u0887\u0889-\u088E\u08A0-\u08C9\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C5D\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D04-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E86-\u0E8A\u0E8C-\u0EA3\u0EA5\u0EA7-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u1711\u171F-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1878\u1880-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4C\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1C90-\u1CBA\u1CBD-\u1CBF\u1CE9-\u1CEC\u1CEE-\u1CF3\u1CF5\u1CF6\u1CFA\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2118-\u211D\u2124\u2126\u2128\u212A-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309B-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312F\u3131-\u318E\u31A0-\u31BF\u31F0-\u31FF\u3400-\u4DBF\u4E00-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7CA\uA7D0\uA7D1\uA7D3\uA7D5-\uA7D9\uA7F2-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA8FE\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB69\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC";
    var nonASCIIidentifierChars = "\u200C\u200D\xB7\u0300-\u036F\u0387\u0483-\u0487\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u0610-\u061A\u064B-\u0669\u0670\u06D6-\u06DC\u06DF-\u06E4\u06E7\u06E8\u06EA-\u06ED\u06F0-\u06F9\u0711\u0730-\u074A\u07A6-\u07B0\u07C0-\u07C9\u07EB-\u07F3\u07FD\u0816-\u0819\u081B-\u0823\u0825-\u0827\u0829-\u082D\u0859-\u085B\u0898-\u089F\u08CA-\u08E1\u08E3-\u0903\u093A-\u093C\u093E-\u094F\u0951-\u0957\u0962\u0963\u0966-\u096F\u0981-\u0983\u09BC\u09BE-\u09C4\u09C7\u09C8\u09CB-\u09CD\u09D7\u09E2\u09E3\u09E6-\u09EF\u09FE\u0A01-\u0A03\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A66-\u0A71\u0A75\u0A81-\u0A83\u0ABC\u0ABE-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AE2\u0AE3\u0AE6-\u0AEF\u0AFA-\u0AFF\u0B01-\u0B03\u0B3C\u0B3E-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B55-\u0B57\u0B62\u0B63\u0B66-\u0B6F\u0B82\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD7\u0BE6-\u0BEF\u0C00-\u0C04\u0C3C\u0C3E-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C62\u0C63\u0C66-\u0C6F\u0C81-\u0C83\u0CBC\u0CBE-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CE2\u0CE3\u0CE6-\u0CEF\u0CF3\u0D00-\u0D03\u0D3B\u0D3C\u0D3E-\u0D44\u0D46-\u0D48\u0D4A-\u0D4D\u0D57\u0D62\u0D63\u0D66-\u0D6F\u0D81-\u0D83\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E31\u0E34-\u0E3A\u0E47-\u0E4E\u0E50-\u0E59\u0EB1\u0EB4-\u0EBC\u0EC8-\u0ECE\u0ED0-\u0ED9\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E\u0F3F\u0F71-\u0F84\u0F86\u0F87\u0F8D-\u0F97\u0F99-\u0FBC\u0FC6\u102B-\u103E\u1040-\u1049\u1056-\u1059\u105E-\u1060\u1062-\u1064\u1067-\u106D\u1071-\u1074\u1082-\u108D\u108F-\u109D\u135D-\u135F\u1369-\u1371\u1712-\u1715\u1732-\u1734\u1752\u1753\u1772\u1773\u17B4-\u17D3\u17DD\u17E0-\u17E9\u180B-\u180D\u180F-\u1819\u18A9\u1920-\u192B\u1930-\u193B\u1946-\u194F\u19D0-\u19DA\u1A17-\u1A1B\u1A55-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AB0-\u1ABD\u1ABF-\u1ACE\u1B00-\u1B04\u1B34-\u1B44\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1B82\u1BA1-\u1BAD\u1BB0-\u1BB9\u1BE6-\u1BF3\u1C24-\u1C37\u1C40-\u1C49\u1C50-\u1C59\u1CD0-\u1CD2\u1CD4-\u1CE8\u1CED\u1CF4\u1CF7-\u1CF9\u1DC0-\u1DFF\u200C\u200D\u203F\u2040\u2054\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2CEF-\u2CF1\u2D7F\u2DE0-\u2DFF\u302A-\u302F\u3099\u309A\u30FB\uA620-\uA629\uA66F\uA674-\uA67D\uA69E\uA69F\uA6F0\uA6F1\uA802\uA806\uA80B\uA823-\uA827\uA82C\uA880\uA881\uA8B4-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F1\uA8FF-\uA909\uA926-\uA92D\uA947-\uA953\uA980-\uA983\uA9B3-\uA9C0\uA9D0-\uA9D9\uA9E5\uA9F0-\uA9F9\uAA29-\uAA36\uAA43\uAA4C\uAA4D\uAA50-\uAA59\uAA7B-\uAA7D\uAAB0\uAAB2-\uAAB4\uAAB7\uAAB8\uAABE\uAABF\uAAC1\uAAEB-\uAAEF\uAAF5\uAAF6\uABE3-\uABEA\uABEC\uABED\uABF0-\uABF9\uFB1E\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFF10-\uFF19\uFF3F\uFF65";
    var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
    var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");
    nonASCIIidentifierStartChars = nonASCIIidentifierChars = null;
    var astralIdentifierStartCodes = [0, 11, 2, 25, 2, 18, 2, 1, 2, 14, 3, 13, 35, 122, 70, 52, 268, 28, 4, 48, 48, 31, 14, 29, 6, 37, 11, 29, 3, 35, 5, 7, 2, 4, 43, 157, 19, 35, 5, 35, 5, 39, 9, 51, 13, 10, 2, 14, 2, 6, 2, 1, 2, 10, 2, 14, 2, 6, 2, 1, 68, 310, 10, 21, 11, 7, 25, 5, 2, 41, 2, 8, 70, 5, 3, 0, 2, 43, 2, 1, 4, 0, 3, 22, 11, 22, 10, 30, 66, 18, 2, 1, 11, 21, 11, 25, 71, 55, 7, 1, 65, 0, 16, 3, 2, 2, 2, 28, 43, 28, 4, 28, 36, 7, 2, 27, 28, 53, 11, 21, 11, 18, 14, 17, 111, 72, 56, 50, 14, 50, 14, 35, 349, 41, 7, 1, 79, 28, 11, 0, 9, 21, 43, 17, 47, 20, 28, 22, 13, 52, 58, 1, 3, 0, 14, 44, 33, 24, 27, 35, 30, 0, 3, 0, 9, 34, 4, 0, 13, 47, 15, 3, 22, 0, 2, 0, 36, 17, 2, 24, 20, 1, 64, 6, 2, 0, 2, 3, 2, 14, 2, 9, 8, 46, 39, 7, 3, 1, 3, 21, 2, 6, 2, 1, 2, 4, 4, 0, 19, 0, 13, 4, 159, 52, 19, 3, 21, 2, 31, 47, 21, 1, 2, 0, 185, 46, 42, 3, 37, 47, 21, 0, 60, 42, 14, 0, 72, 26, 38, 6, 186, 43, 117, 63, 32, 7, 3, 0, 3, 7, 2, 1, 2, 23, 16, 0, 2, 0, 95, 7, 3, 38, 17, 0, 2, 0, 29, 0, 11, 39, 8, 0, 22, 0, 12, 45, 20, 0, 19, 72, 264, 8, 2, 36, 18, 0, 50, 29, 113, 6, 2, 1, 2, 37, 22, 0, 26, 5, 2, 1, 2, 31, 15, 0, 328, 18, 16, 0, 2, 12, 2, 33, 125, 0, 80, 921, 103, 110, 18, 195, 2637, 96, 16, 1071, 18, 5, 4026, 582, 8634, 568, 8, 30, 18, 78, 18, 29, 19, 47, 17, 3, 32, 20, 6, 18, 689, 63, 129, 74, 6, 0, 67, 12, 65, 1, 2, 0, 29, 6135, 9, 1237, 43, 8, 8936, 3, 2, 6, 2, 1, 2, 290, 16, 0, 30, 2, 3, 0, 15, 3, 9, 395, 2309, 106, 6, 12, 4, 8, 8, 9, 5991, 84, 2, 70, 2, 1, 3, 0, 3, 1, 3, 3, 2, 11, 2, 0, 2, 6, 2, 64, 2, 3, 3, 7, 2, 6, 2, 27, 2, 3, 2, 4, 2, 0, 4, 6, 2, 339, 3, 24, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 30, 2, 24, 2, 7, 1845, 30, 7, 5, 262, 61, 147, 44, 11, 6, 17, 0, 322, 29, 19, 43, 485, 27, 757, 6, 2, 3, 2, 1, 2, 14, 2, 196, 60, 67, 8, 0, 1205, 3, 2, 26, 2, 1, 2, 0, 3, 0, 2, 9, 2, 3, 2, 0, 2, 0, 7, 0, 5, 0, 2, 0, 2, 0, 2, 2, 2, 1, 2, 0, 3, 0, 2, 0, 2, 0, 2, 0, 2, 0, 2, 1, 2, 0, 3, 3, 2, 6, 2, 3, 2, 3, 2, 0, 2, 9, 2, 16, 6, 2, 2, 4, 2, 16, 4421, 42719, 33, 4153, 7, 221, 3, 5761, 15, 7472, 16, 621, 2467, 541, 1507, 4938, 6, 4191];
    var astralIdentifierCodes = [509, 0, 227, 0, 150, 4, 294, 9, 1368, 2, 2, 1, 6, 3, 41, 2, 5, 0, 166, 1, 574, 3, 9, 9, 370, 1, 81, 2, 71, 10, 50, 3, 123, 2, 54, 14, 32, 10, 3, 1, 11, 3, 46, 10, 8, 0, 46, 9, 7, 2, 37, 13, 2, 9, 6, 1, 45, 0, 13, 2, 49, 13, 9, 3, 2, 11, 83, 11, 7, 0, 3, 0, 158, 11, 6, 9, 7, 3, 56, 1, 2, 6, 3, 1, 3, 2, 10, 0, 11, 1, 3, 6, 4, 4, 193, 17, 10, 9, 5, 0, 82, 19, 13, 9, 214, 6, 3, 8, 28, 1, 83, 16, 16, 9, 82, 12, 9, 9, 84, 14, 5, 9, 243, 14, 166, 9, 71, 5, 2, 1, 3, 3, 2, 0, 2, 1, 13, 9, 120, 6, 3, 6, 4, 0, 29, 9, 41, 6, 2, 3, 9, 0, 10, 10, 47, 15, 406, 7, 2, 7, 17, 9, 57, 21, 2, 13, 123, 5, 4, 0, 2, 1, 2, 6, 2, 0, 9, 9, 49, 4, 2, 1, 2, 4, 9, 9, 330, 3, 10, 1, 2, 0, 49, 6, 4, 4, 14, 9, 5351, 0, 7, 14, 13835, 9, 87, 9, 39, 4, 60, 6, 26, 9, 1014, 0, 2, 54, 8, 3, 82, 0, 12, 1, 19628, 1, 4706, 45, 3, 22, 543, 4, 4, 5, 9, 7, 3, 6, 31, 3, 149, 2, 1418, 49, 513, 54, 5, 49, 9, 0, 15, 0, 23, 4, 2, 14, 1361, 6, 2, 16, 3, 6, 2, 1, 2, 4, 101, 0, 161, 6, 10, 9, 357, 0, 62, 13, 499, 13, 983, 6, 110, 6, 6, 9, 4759, 9, 787719, 239];
    function isInAstralSet(code, set2) {
      let pos2 = 65536;
      for (let i = 0, length = set2.length; i < length; i += 2) {
        pos2 += set2[i];
        if (pos2 > code) return false;
        pos2 += set2[i + 1];
        if (pos2 >= code) return true;
      }
      return false;
    }
    function isIdentifierStart(code) {
      if (code < 65) return code === 36;
      if (code <= 90) return true;
      if (code < 97) return code === 95;
      if (code <= 122) return true;
      if (code <= 65535) {
        return code >= 170 && nonASCIIidentifierStart.test(String.fromCharCode(code));
      }
      return isInAstralSet(code, astralIdentifierStartCodes);
    }
    function isIdentifierChar(code) {
      if (code < 48) return code === 36;
      if (code < 58) return true;
      if (code < 65) return false;
      if (code <= 90) return true;
      if (code < 97) return code === 95;
      if (code <= 122) return true;
      if (code <= 65535) {
        return code >= 170 && nonASCIIidentifier.test(String.fromCharCode(code));
      }
      return isInAstralSet(code, astralIdentifierStartCodes) || isInAstralSet(code, astralIdentifierCodes);
    }
    function isIdentifierName(name) {
      let isFirst = true;
      for (let i = 0; i < name.length; i++) {
        let cp = name.charCodeAt(i);
        if ((cp & 64512) === 55296 && i + 1 < name.length) {
          const trail = name.charCodeAt(++i);
          if ((trail & 64512) === 56320) {
            cp = 65536 + ((cp & 1023) << 10) + (trail & 1023);
          }
        }
        if (isFirst) {
          isFirst = false;
          if (!isIdentifierStart(cp)) {
            return false;
          }
        } else if (!isIdentifierChar(cp)) {
          return false;
        }
      }
      return !isFirst;
    }
  }
});

// node_modules/@babel/helper-validator-identifier/lib/keyword.js
var require_keyword = __commonJS({
  "node_modules/@babel/helper-validator-identifier/lib/keyword.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.isKeyword = isKeyword;
    exports.isReservedWord = isReservedWord;
    exports.isStrictBindOnlyReservedWord = isStrictBindOnlyReservedWord;
    exports.isStrictBindReservedWord = isStrictBindReservedWord;
    exports.isStrictReservedWord = isStrictReservedWord;
    var reservedWords = {
      keyword: ["break", "case", "catch", "continue", "debugger", "default", "do", "else", "finally", "for", "function", "if", "return", "switch", "throw", "try", "var", "const", "while", "with", "new", "this", "super", "class", "extends", "export", "import", "null", "true", "false", "in", "instanceof", "typeof", "void", "delete"],
      strict: ["implements", "interface", "let", "package", "private", "protected", "public", "static", "yield"],
      strictBind: ["eval", "arguments"]
    };
    var keywords = new Set(reservedWords.keyword);
    var reservedWordsStrictSet = new Set(reservedWords.strict);
    var reservedWordsStrictBindSet = new Set(reservedWords.strictBind);
    function isReservedWord(word, inModule) {
      return inModule && word === "await" || word === "enum";
    }
    function isStrictReservedWord(word, inModule) {
      return isReservedWord(word, inModule) || reservedWordsStrictSet.has(word);
    }
    function isStrictBindOnlyReservedWord(word) {
      return reservedWordsStrictBindSet.has(word);
    }
    function isStrictBindReservedWord(word, inModule) {
      return isStrictReservedWord(word, inModule) || isStrictBindOnlyReservedWord(word);
    }
    function isKeyword(word) {
      return keywords.has(word);
    }
  }
});

// node_modules/@babel/helper-validator-identifier/lib/index.js
var require_lib = __commonJS({
  "node_modules/@babel/helper-validator-identifier/lib/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    Object.defineProperty(exports, "isIdentifierChar", {
      enumerable: true,
      get: function() {
        return _identifier.isIdentifierChar;
      }
    });
    Object.defineProperty(exports, "isIdentifierName", {
      enumerable: true,
      get: function() {
        return _identifier.isIdentifierName;
      }
    });
    Object.defineProperty(exports, "isIdentifierStart", {
      enumerable: true,
      get: function() {
        return _identifier.isIdentifierStart;
      }
    });
    Object.defineProperty(exports, "isKeyword", {
      enumerable: true,
      get: function() {
        return _keyword.isKeyword;
      }
    });
    Object.defineProperty(exports, "isReservedWord", {
      enumerable: true,
      get: function() {
        return _keyword.isReservedWord;
      }
    });
    Object.defineProperty(exports, "isStrictBindOnlyReservedWord", {
      enumerable: true,
      get: function() {
        return _keyword.isStrictBindOnlyReservedWord;
      }
    });
    Object.defineProperty(exports, "isStrictBindReservedWord", {
      enumerable: true,
      get: function() {
        return _keyword.isStrictBindReservedWord;
      }
    });
    Object.defineProperty(exports, "isStrictReservedWord", {
      enumerable: true,
      get: function() {
        return _keyword.isStrictReservedWord;
      }
    });
    var _identifier = require_identifier();
    var _keyword = require_keyword();
  }
});

// node_modules/picocolors/picocolors.js
var require_picocolors = __commonJS({
  "node_modules/picocolors/picocolors.js"(exports, module) {
    var argv = process.argv || [];
    var env2 = process.env;
    var isColorSupported = !("NO_COLOR" in env2 || argv.includes("--no-color")) && ("FORCE_COLOR" in env2 || argv.includes("--color") || process.platform === "win32" || __require != null && __require("tty").isatty(1) && env2.TERM !== "dumb" || "CI" in env2);
    var formatter = (open, close, replace = open) => (input) => {
      let string = "" + input;
      let index = string.indexOf(close, open.length);
      return ~index ? open + replaceClose(string, close, replace, index) + close : open + string + close;
    };
    var replaceClose = (string, close, replace, index) => {
      let result = "";
      let cursor2 = 0;
      do {
        result += string.substring(cursor2, index) + replace;
        cursor2 = index + close.length;
        index = string.indexOf(close, cursor2);
      } while (~index);
      return result + string.substring(cursor2);
    };
    var createColors = (enabled = isColorSupported) => {
      let init = enabled ? formatter : () => String;
      return {
        isColorSupported: enabled,
        reset: init("\x1B[0m", "\x1B[0m"),
        bold: init("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
        dim: init("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
        italic: init("\x1B[3m", "\x1B[23m"),
        underline: init("\x1B[4m", "\x1B[24m"),
        inverse: init("\x1B[7m", "\x1B[27m"),
        hidden: init("\x1B[8m", "\x1B[28m"),
        strikethrough: init("\x1B[9m", "\x1B[29m"),
        black: init("\x1B[30m", "\x1B[39m"),
        red: init("\x1B[31m", "\x1B[39m"),
        green: init("\x1B[32m", "\x1B[39m"),
        yellow: init("\x1B[33m", "\x1B[39m"),
        blue: init("\x1B[34m", "\x1B[39m"),
        magenta: init("\x1B[35m", "\x1B[39m"),
        cyan: init("\x1B[36m", "\x1B[39m"),
        white: init("\x1B[37m", "\x1B[39m"),
        gray: init("\x1B[90m", "\x1B[39m"),
        bgBlack: init("\x1B[40m", "\x1B[49m"),
        bgRed: init("\x1B[41m", "\x1B[49m"),
        bgGreen: init("\x1B[42m", "\x1B[49m"),
        bgYellow: init("\x1B[43m", "\x1B[49m"),
        bgBlue: init("\x1B[44m", "\x1B[49m"),
        bgMagenta: init("\x1B[45m", "\x1B[49m"),
        bgCyan: init("\x1B[46m", "\x1B[49m"),
        bgWhite: init("\x1B[47m", "\x1B[49m")
      };
    };
    module.exports = createColors();
    module.exports.createColors = createColors;
  }
});

// node_modules/@babel/highlight/lib/index.js
var require_lib2 = __commonJS({
  "node_modules/@babel/highlight/lib/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.default = highlight;
    exports.shouldHighlight = shouldHighlight;
    var _jsTokens = require_js_tokens();
    var _helperValidatorIdentifier = require_lib();
    var _picocolors = _interopRequireWildcard(require_picocolors(), true);
    function _getRequireWildcardCache(e) {
      if ("function" != typeof WeakMap) return null;
      var r = /* @__PURE__ */ new WeakMap(), t = /* @__PURE__ */ new WeakMap();
      return (_getRequireWildcardCache = function(e2) {
        return e2 ? t : r;
      })(e);
    }
    function _interopRequireWildcard(e, r) {
      if (!r && e && e.__esModule) return e;
      if (null === e || "object" != typeof e && "function" != typeof e) return { default: e };
      var t = _getRequireWildcardCache(r);
      if (t && t.has(e)) return t.get(e);
      var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor;
      for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) {
        var i = a ? Object.getOwnPropertyDescriptor(e, u) : null;
        i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u];
      }
      return n.default = e, t && t.set(e, n), n;
    }
    var colors = typeof process === "object" && (process.env.FORCE_COLOR === "0" || process.env.FORCE_COLOR === "false") ? (0, _picocolors.createColors)(false) : _picocolors.default;
    var compose = (f, g) => (v) => f(g(v));
    var sometimesKeywords = /* @__PURE__ */ new Set(["as", "async", "from", "get", "of", "set"]);
    function getDefs(colors2) {
      return {
        keyword: colors2.cyan,
        capitalized: colors2.yellow,
        jsxIdentifier: colors2.yellow,
        punctuator: colors2.yellow,
        number: colors2.magenta,
        string: colors2.green,
        regex: colors2.magenta,
        comment: colors2.gray,
        invalid: compose(compose(colors2.white, colors2.bgRed), colors2.bold)
      };
    }
    var NEWLINE = /\r\n|[\n\r\u2028\u2029]/;
    var BRACKET = /^[()[\]{}]$/;
    var tokenize2;
    {
      const JSX_TAG = /^[a-z][\w-]*$/i;
      const getTokenType = function(token2, offset, text) {
        if (token2.type === "name") {
          if ((0, _helperValidatorIdentifier.isKeyword)(token2.value) || (0, _helperValidatorIdentifier.isStrictReservedWord)(token2.value, true) || sometimesKeywords.has(token2.value)) {
            return "keyword";
          }
          if (JSX_TAG.test(token2.value) && (text[offset - 1] === "<" || text.slice(offset - 2, offset) === "</")) {
            return "jsxIdentifier";
          }
          if (token2.value[0] !== token2.value[0].toLowerCase()) {
            return "capitalized";
          }
        }
        if (token2.type === "punctuator" && BRACKET.test(token2.value)) {
          return "bracket";
        }
        if (token2.type === "invalid" && (token2.value === "@" || token2.value === "#")) {
          return "punctuator";
        }
        return token2.type;
      };
      tokenize2 = function* (text) {
        let match;
        while (match = _jsTokens.default.exec(text)) {
          const token2 = _jsTokens.matchToToken(match);
          yield {
            type: getTokenType(token2, match.index, text),
            value: token2.value
          };
        }
      };
    }
    function highlightTokens(defs, text) {
      let highlighted = "";
      for (const {
        type: type2,
        value
      } of tokenize2(text)) {
        const colorize = defs[type2];
        if (colorize) {
          highlighted += value.split(NEWLINE).map((str2) => colorize(str2)).join("\n");
        } else {
          highlighted += value;
        }
      }
      return highlighted;
    }
    function shouldHighlight(options8) {
      return colors.isColorSupported || options8.forceColor;
    }
    var pcWithForcedColor = void 0;
    function getColors(forceColor) {
      if (forceColor) {
        var _pcWithForcedColor;
        (_pcWithForcedColor = pcWithForcedColor) != null ? _pcWithForcedColor : pcWithForcedColor = (0, _picocolors.createColors)(true);
        return pcWithForcedColor;
      }
      return colors;
    }
    function highlight(code, options8 = {}) {
      if (code !== "" && shouldHighlight(options8)) {
        const defs = getDefs(getColors(options8.forceColor));
        return highlightTokens(defs, code);
      } else {
        return code;
      }
    }
    {
      let chalk2, chalkWithForcedColor;
      exports.getChalk = ({
        forceColor
      }) => {
        var _chalk;
        (_chalk = chalk2) != null ? _chalk : chalk2 = (init_source(), __toCommonJS(source_exports));
        if (forceColor) {
          var _chalkWithForcedColor;
          (_chalkWithForcedColor = chalkWithForcedColor) != null ? _chalkWithForcedColor : chalkWithForcedColor = new chalk2.constructor({
            enabled: true,
            level: 1
          });
          return chalkWithForcedColor;
        }
        return chalk2;
      };
    }
  }
});

// node_modules/@babel/code-frame/lib/index.js
var require_lib3 = __commonJS({
  "node_modules/@babel/code-frame/lib/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: true
    });
    exports.codeFrameColumns = codeFrameColumns3;
    exports.default = _default2;
    var _highlight = require_lib2();
    var _picocolors = _interopRequireWildcard(require_picocolors(), true);
    function _getRequireWildcardCache(e) {
      if ("function" != typeof WeakMap) return null;
      var r = /* @__PURE__ */ new WeakMap(), t = /* @__PURE__ */ new WeakMap();
      return (_getRequireWildcardCache = function(e2) {
        return e2 ? t : r;
      })(e);
    }
    function _interopRequireWildcard(e, r) {
      if (!r && e && e.__esModule) return e;
      if (null === e || "object" != typeof e && "function" != typeof e) return { default: e };
      var t = _getRequireWildcardCache(r);
      if (t && t.has(e)) return t.get(e);
      var n = { __proto__: null }, a = Object.defineProperty && Object.getOwnPropertyDescriptor;
      for (var u in e) if ("default" !== u && {}.hasOwnProperty.call(e, u)) {
        var i = a ? Object.getOwnPropertyDescriptor(e, u) : null;
        i && (i.get || i.set) ? Object.defineProperty(n, u, i) : n[u] = e[u];
      }
      return n.default = e, t && t.set(e, n), n;
    }
    var colors = typeof process === "object" && (process.env.FORCE_COLOR === "0" || process.env.FORCE_COLOR === "false") ? (0, _picocolors.createColors)(false) : _picocolors.default;
    var compose = (f, g) => (v) => f(g(v));
    var pcWithForcedColor = void 0;
    function getColors(forceColor) {
      if (forceColor) {
        var _pcWithForcedColor;
        (_pcWithForcedColor = pcWithForcedColor) != null ? _pcWithForcedColor : pcWithForcedColor = (0, _picocolors.createColors)(true);
        return pcWithForcedColor;
      }
      return colors;
    }
    var deprecationWarningShown = false;
    function getDefs(colors2) {
      return {
        gutter: colors2.gray,
        marker: compose(colors2.red, colors2.bold),
        message: compose(colors2.red, colors2.bold)
      };
    }
    var NEWLINE = /\r\n|[\n\r\u2028\u2029]/;
    function getMarkerLines(loc, source2, opts) {
      const startLoc = Object.assign({
        column: 0,
        line: -1
      }, loc.start);
      const endLoc = Object.assign({}, startLoc, loc.end);
      const {
        linesAbove = 2,
        linesBelow = 3
      } = opts || {};
      const startLine = startLoc.line;
      const startColumn = startLoc.column;
      const endLine = endLoc.line;
      const endColumn = endLoc.column;
      let start = Math.max(startLine - (linesAbove + 1), 0);
      let end = Math.min(source2.length, endLine + linesBelow);
      if (startLine === -1) {
        start = 0;
      }
      if (endLine === -1) {
        end = source2.length;
      }
      const lineDiff2 = endLine - startLine;
      const markerLines = {};
      if (lineDiff2) {
        for (let i = 0; i <= lineDiff2; i++) {
          const lineNumber = i + startLine;
          if (!startColumn) {
            markerLines[lineNumber] = true;
          } else if (i === 0) {
            const sourceLength = source2[lineNumber - 1].length;
            markerLines[lineNumber] = [startColumn, sourceLength - startColumn + 1];
          } else if (i === lineDiff2) {
            markerLines[lineNumber] = [0, endColumn];
          } else {
            const sourceLength = source2[lineNumber - i].length;
            markerLines[lineNumber] = [0, sourceLength];
          }
        }
      } else {
        if (startColumn === endColumn) {
          if (startColumn) {
            markerLines[startLine] = [startColumn, 0];
          } else {
            markerLines[startLine] = true;
          }
        } else {
          markerLines[startLine] = [startColumn, endColumn - startColumn];
        }
      }
      return {
        start,
        end,
        markerLines
      };
    }
    function codeFrameColumns3(rawLines, loc, opts = {}) {
      const highlighted = (opts.highlightCode || opts.forceColor) && (0, _highlight.shouldHighlight)(opts);
      const colors2 = getColors(opts.forceColor);
      const defs = getDefs(colors2);
      const maybeHighlight = (fmt, string) => {
        return highlighted ? fmt(string) : string;
      };
      const lines = rawLines.split(NEWLINE);
      const {
        start,
        end,
        markerLines
      } = getMarkerLines(loc, lines, opts);
      const hasColumns = loc.start && typeof loc.start.column === "number";
      const numberMaxWidth = String(end).length;
      const highlightedLines = highlighted ? (0, _highlight.default)(rawLines, opts) : rawLines;
      let frame = highlightedLines.split(NEWLINE, end).slice(start, end).map((line3, index) => {
        const number = start + 1 + index;
        const paddedNumber = ` ${number}`.slice(-numberMaxWidth);
        const gutter = ` ${paddedNumber} |`;
        const hasMarker = markerLines[number];
        const lastMarkerLine = !markerLines[number + 1];
        if (hasMarker) {
          let markerLine = "";
          if (Array.isArray(hasMarker)) {
            const markerSpacing = line3.slice(0, Math.max(hasMarker[0] - 1, 0)).replace(/[^\t]/g, " ");
            const numberOfMarkers = hasMarker[1] || 1;
            markerLine = ["\n ", maybeHighlight(defs.gutter, gutter.replace(/\d/g, " ")), " ", markerSpacing, maybeHighlight(defs.marker, "^").repeat(numberOfMarkers)].join("");
            if (lastMarkerLine && opts.message) {
              markerLine += " " + maybeHighlight(defs.message, opts.message);
            }
          }
          return [maybeHighlight(defs.marker, ">"), maybeHighlight(defs.gutter, gutter), line3.length > 0 ? ` ${line3}` : "", markerLine].join("");
        } else {
          return ` ${maybeHighlight(defs.gutter, gutter)}${line3.length > 0 ? ` ${line3}` : ""}`;
        }
      }).join("\n");
      if (opts.message && !hasColumns) {
        frame = `${" ".repeat(numberMaxWidth + 1)}${opts.message}
${frame}`;
      }
      if (highlighted) {
        return colors2.reset(frame);
      } else {
        return frame;
      }
    }
    function _default2(rawLines, lineNumber, colNumber, opts = {}) {
      if (!deprecationWarningShown) {
        deprecationWarningShown = true;
        const message = "Passing lineNumber and colNumber is deprecated to @babel/code-frame. Please use `codeFrameColumns`.";
        if (process.emitWarning) {
          process.emitWarning(message, "DeprecationWarning");
        } else {
          const deprecationError = new Error(message);
          deprecationError.name = "DeprecationWarning";
          console.warn(new Error(message));
        }
      }
      colNumber = Math.max(colNumber, 0);
      const location = {
        start: {
          column: colNumber,
          line: lineNumber
        }
      };
      return codeFrameColumns3(rawLines, location, opts);
    }
  }
});

// node_modules/ignore/index.js
var require_ignore = __commonJS({
  "node_modules/ignore/index.js"(exports, module) {
    function makeArray(subject) {
      return Array.isArray(subject) ? subject : [subject];
    }
    var EMPTY = "";
    var SPACE = " ";
    var ESCAPE = "\\";
    var REGEX_TEST_BLANK_LINE = /^\s+$/;
    var REGEX_INVALID_TRAILING_BACKSLASH = /(?:[^\\]|^)\\$/;
    var REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION = /^\\!/;
    var REGEX_REPLACE_LEADING_EXCAPED_HASH = /^\\#/;
    var REGEX_SPLITALL_CRLF = /\r?\n/g;
    var REGEX_TEST_INVALID_PATH = /^\.*\/|^\.+$/;
    var SLASH = "/";
    var TMP_KEY_IGNORE = "node-ignore";
    if (typeof Symbol !== "undefined") {
      TMP_KEY_IGNORE = Symbol.for("node-ignore");
    }
    var KEY_IGNORE = TMP_KEY_IGNORE;
    var define = (object, key2, value) => Object.defineProperty(object, key2, { value });
    var REGEX_REGEXP_RANGE = /([0-z])-([0-z])/g;
    var RETURN_FALSE = () => false;
    var sanitizeRange = (range) => range.replace(
      REGEX_REGEXP_RANGE,
      (match, from, to) => from.charCodeAt(0) <= to.charCodeAt(0) ? match : EMPTY
    );
    var cleanRangeBackSlash = (slashes) => {
      const { length } = slashes;
      return slashes.slice(0, length - length % 2);
    };
    var REPLACERS = [
      [
        // remove BOM
        // TODO:
        // Other similar zero-width characters?
        /^\uFEFF/,
        () => EMPTY
      ],
      // > Trailing spaces are ignored unless they are quoted with backslash ("\")
      [
        // (a\ ) -> (a )
        // (a  ) -> (a)
        // (a \ ) -> (a  )
        /\\?\s+$/,
        (match) => match.indexOf("\\") === 0 ? SPACE : EMPTY
      ],
      // replace (\ ) with ' '
      [
        /\\\s/g,
        () => SPACE
      ],
      // Escape metacharacters
      // which is written down by users but means special for regular expressions.
      // > There are 12 characters with special meanings:
      // > - the backslash \,
      // > - the caret ^,
      // > - the dollar sign $,
      // > - the period or dot .,
      // > - the vertical bar or pipe symbol |,
      // > - the question mark ?,
      // > - the asterisk or star *,
      // > - the plus sign +,
      // > - the opening parenthesis (,
      // > - the closing parenthesis ),
      // > - and the opening square bracket [,
      // > - the opening curly brace {,
      // > These special characters are often called "metacharacters".
      [
        /[\\$.|*+(){^]/g,
        (match) => `\\${match}`
      ],
      [
        // > a question mark (?) matches a single character
        /(?!\\)\?/g,
        () => "[^/]"
      ],
      // leading slash
      [
        // > A leading slash matches the beginning of the pathname.
        // > For example, "/*.c" matches "cat-file.c" but not "mozilla-sha1/sha1.c".
        // A leading slash matches the beginning of the pathname
        /^\//,
        () => "^"
      ],
      // replace special metacharacter slash after the leading slash
      [
        /\//g,
        () => "\\/"
      ],
      [
        // > A leading "**" followed by a slash means match in all directories.
        // > For example, "**/foo" matches file or directory "foo" anywhere,
        // > the same as pattern "foo".
        // > "**/foo/bar" matches file or directory "bar" anywhere that is directly
        // >   under directory "foo".
        // Notice that the '*'s have been replaced as '\\*'
        /^\^*\\\*\\\*\\\//,
        // '**/foo' <-> 'foo'
        () => "^(?:.*\\/)?"
      ],
      // starting
      [
        // there will be no leading '/'
        //   (which has been replaced by section "leading slash")
        // If starts with '**', adding a '^' to the regular expression also works
        /^(?=[^^])/,
        function startingReplacer() {
          return !/\/(?!$)/.test(this) ? "(?:^|\\/)" : "^";
        }
      ],
      // two globstars
      [
        // Use lookahead assertions so that we could match more than one `'/**'`
        /\\\/\\\*\\\*(?=\\\/|$)/g,
        // Zero, one or several directories
        // should not use '*', or it will be replaced by the next replacer
        // Check if it is not the last `'/**'`
        (_, index, str2) => index + 6 < str2.length ? "(?:\\/[^\\/]+)*" : "\\/.+"
      ],
      // normal intermediate wildcards
      [
        // Never replace escaped '*'
        // ignore rule '\*' will match the path '*'
        // 'abc.*/' -> go
        // 'abc.*'  -> skip this rule,
        //    coz trailing single wildcard will be handed by [trailing wildcard]
        /(^|[^\\]+)(\\\*)+(?=.+)/g,
        // '*.js' matches '.js'
        // '*.js' doesn't match 'abc'
        (_, p1, p2) => {
          const unescaped = p2.replace(/\\\*/g, "[^\\/]*");
          return p1 + unescaped;
        }
      ],
      [
        // unescape, revert step 3 except for back slash
        // For example, if a user escape a '\\*',
        // after step 3, the result will be '\\\\\\*'
        /\\\\\\(?=[$.|*+(){^])/g,
        () => ESCAPE
      ],
      [
        // '\\\\' -> '\\'
        /\\\\/g,
        () => ESCAPE
      ],
      [
        // > The range notation, e.g. [a-zA-Z],
        // > can be used to match one of the characters in a range.
        // `\` is escaped by step 3
        /(\\)?\[([^\]/]*?)(\\*)($|\])/g,
        (match, leadEscape, range, endEscape, close) => leadEscape === ESCAPE ? `\\[${range}${cleanRangeBackSlash(endEscape)}${close}` : close === "]" ? endEscape.length % 2 === 0 ? `[${sanitizeRange(range)}${endEscape}]` : "[]" : "[]"
      ],
      // ending
      [
        // 'js' will not match 'js.'
        // 'ab' will not match 'abc'
        /(?:[^*])$/,
        // WTF!
        // https://git-scm.com/docs/gitignore
        // changes in [2.22.1](https://git-scm.com/docs/gitignore/2.22.1)
        // which re-fixes #24, #38
        // > If there is a separator at the end of the pattern then the pattern
        // > will only match directories, otherwise the pattern can match both
        // > files and directories.
        // 'js*' will not match 'a.js'
        // 'js/' will not match 'a.js'
        // 'js' will match 'a.js' and 'a.js/'
        (match) => /\/$/.test(match) ? `${match}$` : `${match}(?=$|\\/$)`
      ],
      // trailing wildcard
      [
        /(\^|\\\/)?\\\*$/,
        (_, p1) => {
          const prefix = p1 ? `${p1}[^/]+` : "[^/]*";
          return `${prefix}(?=$|\\/$)`;
        }
      ]
    ];
    var regexCache = /* @__PURE__ */ Object.create(null);
    var makeRegex = (pattern, ignoreCase) => {
      let source2 = regexCache[pattern];
      if (!source2) {
        source2 = REPLACERS.reduce(
          (prev, current) => prev.replace(current[0], current[1].bind(pattern)),
          pattern
        );
        regexCache[pattern] = source2;
      }
      return ignoreCase ? new RegExp(source2, "i") : new RegExp(source2);
    };
    var isString = (subject) => typeof subject === "string";
    var checkPattern = (pattern) => pattern && isString(pattern) && !REGEX_TEST_BLANK_LINE.test(pattern) && !REGEX_INVALID_TRAILING_BACKSLASH.test(pattern) && pattern.indexOf("#") !== 0;
    var splitPattern = (pattern) => pattern.split(REGEX_SPLITALL_CRLF);
    var IgnoreRule = class {
      constructor(origin, pattern, negative, regex) {
        this.origin = origin;
        this.pattern = pattern;
        this.negative = negative;
        this.regex = regex;
      }
    };
    var createRule = (pattern, ignoreCase) => {
      const origin = pattern;
      let negative = false;
      if (pattern.indexOf("!") === 0) {
        negative = true;
        pattern = pattern.substr(1);
      }
      pattern = pattern.replace(REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION, "!").replace(REGEX_REPLACE_LEADING_EXCAPED_HASH, "#");
      const regex = makeRegex(pattern, ignoreCase);
      return new IgnoreRule(
        origin,
        pattern,
        negative,
        regex
      );
    };
    var throwError2 = (message, Ctor) => {
      throw new Ctor(message);
    };
    var checkPath = (path13, originalPath, doThrow) => {
      if (!isString(path13)) {
        return doThrow(
          `path must be a string, but got \`${originalPath}\``,
          TypeError
        );
      }
      if (!path13) {
        return doThrow(`path must not be empty`, TypeError);
      }
      if (checkPath.isNotRelative(path13)) {
        const r = "`path.relative()`d";
        return doThrow(
          `path should be a ${r} string, but got "${originalPath}"`,
          RangeError
        );
      }
      return true;
    };
    var isNotRelative = (path13) => REGEX_TEST_INVALID_PATH.test(path13);
    checkPath.isNotRelative = isNotRelative;
    checkPath.convert = (p) => p;
    var Ignore = class {
      constructor({
        ignorecase = true,
        ignoreCase = ignorecase,
        allowRelativePaths = false
      } = {}) {
        define(this, KEY_IGNORE, true);
        this._rules = [];
        this._ignoreCase = ignoreCase;
        this._allowRelativePaths = allowRelativePaths;
        this._initCache();
      }
      _initCache() {
        this._ignoreCache = /* @__PURE__ */ Object.create(null);
        this._testCache = /* @__PURE__ */ Object.create(null);
      }
      _addPattern(pattern) {
        if (pattern && pattern[KEY_IGNORE]) {
          this._rules = this._rules.concat(pattern._rules);
          this._added = true;
          return;
        }
        if (checkPattern(pattern)) {
          const rule = createRule(pattern, this._ignoreCase);
          this._added = true;
          this._rules.push(rule);
        }
      }
      // @param {Array<string> | string | Ignore} pattern
      add(pattern) {
        this._added = false;
        makeArray(
          isString(pattern) ? splitPattern(pattern) : pattern
        ).forEach(this._addPattern, this);
        if (this._added) {
          this._initCache();
        }
        return this;
      }
      // legacy
      addPattern(pattern) {
        return this.add(pattern);
      }
      //          |           ignored : unignored
      // negative |   0:0   |   0:1   |   1:0   |   1:1
      // -------- | ------- | ------- | ------- | --------
      //     0    |  TEST   |  TEST   |  SKIP   |    X
      //     1    |  TESTIF |  SKIP   |  TEST   |    X
      // - SKIP: always skip
      // - TEST: always test
      // - TESTIF: only test if checkUnignored
      // - X: that never happen
      // @param {boolean} whether should check if the path is unignored,
      //   setting `checkUnignored` to `false` could reduce additional
      //   path matching.
      // @returns {TestResult} true if a file is ignored
      _testOne(path13, checkUnignored) {
        let ignored = false;
        let unignored = false;
        this._rules.forEach((rule) => {
          const { negative } = rule;
          if (unignored === negative && ignored !== unignored || negative && !ignored && !unignored && !checkUnignored) {
            return;
          }
          const matched = rule.regex.test(path13);
          if (matched) {
            ignored = !negative;
            unignored = negative;
          }
        });
        return {
          ignored,
          unignored
        };
      }
      // @returns {TestResult}
      _test(originalPath, cache3, checkUnignored, slices) {
        const path13 = originalPath && checkPath.convert(originalPath);
        checkPath(
          path13,
          originalPath,
          this._allowRelativePaths ? RETURN_FALSE : throwError2
        );
        return this._t(path13, cache3, checkUnignored, slices);
      }
      _t(path13, cache3, checkUnignored, slices) {
        if (path13 in cache3) {
          return cache3[path13];
        }
        if (!slices) {
          slices = path13.split(SLASH);
        }
        slices.pop();
        if (!slices.length) {
          return cache3[path13] = this._testOne(path13, checkUnignored);
        }
        const parent = this._t(
          slices.join(SLASH) + SLASH,
          cache3,
          checkUnignored,
          slices
        );
        return cache3[path13] = parent.ignored ? parent : this._testOne(path13, checkUnignored);
      }
      ignores(path13) {
        return this._test(path13, this._ignoreCache, false).ignored;
      }
      createFilter() {
        return (path13) => !this.ignores(path13);
      }
      filter(paths) {
        return makeArray(paths).filter(this.createFilter());
      }
      // @returns {TestResult}
      test(path13) {
        return this._test(path13, this._testCache, true);
      }
    };
    var factory = (options8) => new Ignore(options8);
    var isPathValid = (path13) => checkPath(path13 && checkPath.convert(path13), path13, RETURN_FALSE);
    factory.isPathValid = isPathValid;
    factory.default = factory;
    module.exports = factory;
    if (
      // Detect `process` so that it can run in browsers.
      typeof process !== "undefined" && (process.env && process.env.IGNORE_TEST_WIN32 || process.platform === "win32")
    ) {
      const makePosix = (str2) => /^\\\\\?\\/.test(str2) || /["<>|\u0000-\u001F]+/u.test(str2) ? str2 : str2.replace(/\\/g, "/");
      checkPath.convert = makePosix;
      const REGIX_IS_WINDOWS_PATH_ABSOLUTE = /^[a-z]:\//i;
      checkPath.isNotRelative = (path13) => REGIX_IS_WINDOWS_PATH_ABSOLUTE.test(path13) || isNotRelative(path13);
    }
  }
});

// node_modules/n-readlines/readlines.js
var require_readlines = __commonJS({
  "node_modules/n-readlines/readlines.js"(exports, module) {
    "use strict";
    var fs7 = __require("fs");
    var LineByLine = class {
      constructor(file, options8) {
        options8 = options8 || {};
        if (!options8.readChunk) options8.readChunk = 1024;
        if (!options8.newLineCharacter) {
          options8.newLineCharacter = 10;
        } else {
          options8.newLineCharacter = options8.newLineCharacter.charCodeAt(0);
        }
        if (typeof file === "number") {
          this.fd = file;
        } else {
          this.fd = fs7.openSync(file, "r");
        }
        this.options = options8;
        this.newLineCharacter = options8.newLineCharacter;
        this.reset();
      }
      _searchInBuffer(buffer2, hexNeedle) {
        let found = -1;
        for (let i = 0; i <= buffer2.length; i++) {
          let b_byte = buffer2[i];
          if (b_byte === hexNeedle) {
            found = i;
            break;
          }
        }
        return found;
      }
      reset() {
        this.eofReached = false;
        this.linesCache = [];
        this.fdPosition = 0;
      }
      close() {
        fs7.closeSync(this.fd);
        this.fd = null;
      }
      _extractLines(buffer2) {
        let line3;
        const lines = [];
        let bufferPosition = 0;
        let lastNewLineBufferPosition = 0;
        while (true) {
          let bufferPositionValue = buffer2[bufferPosition++];
          if (bufferPositionValue === this.newLineCharacter) {
            line3 = buffer2.slice(lastNewLineBufferPosition, bufferPosition);
            lines.push(line3);
            lastNewLineBufferPosition = bufferPosition;
          } else if (bufferPositionValue === void 0) {
            break;
          }
        }
        let leftovers = buffer2.slice(lastNewLineBufferPosition, bufferPosition);
        if (leftovers.length) {
          lines.push(leftovers);
        }
        return lines;
      }
      _readChunk(lineLeftovers) {
        let totalBytesRead = 0;
        let bytesRead;
        const buffers = [];
        do {
          const readBuffer = Buffer.alloc(this.options.readChunk);
          bytesRead = fs7.readSync(this.fd, readBuffer, 0, this.options.readChunk, this.fdPosition);
          totalBytesRead = totalBytesRead + bytesRead;
          this.fdPosition = this.fdPosition + bytesRead;
          buffers.push(readBuffer);
        } while (bytesRead && this._searchInBuffer(buffers[buffers.length - 1], this.options.newLineCharacter) === -1);
        let bufferData = Buffer.concat(buffers);
        if (bytesRead < this.options.readChunk) {
          this.eofReached = true;
          bufferData = bufferData.slice(0, totalBytesRead);
        }
        if (totalBytesRead) {
          this.linesCache = this._extractLines(bufferData);
          if (lineLeftovers) {
            this.linesCache[0] = Buffer.concat([lineLeftovers, this.linesCache[0]]);
          }
        }
        return totalBytesRead;
      }
      next() {
        if (!this.fd) return false;
        let line3 = false;
        if (this.eofReached && this.linesCache.length === 0) {
          return line3;
        }
        let bytesRead;
        if (!this.linesCache.length) {
          bytesRead = this._readChunk();
        }
        if (this.linesCache.length) {
          line3 = this.linesCache.shift();
          const lastLineCharacter = line3[line3.length - 1];
          if (lastLineCharacter !== this.newLineCharacter) {
            bytesRead = this._readChunk(line3);
            if (bytesRead) {
              line3 = this.linesCache.shift();
            }
          }
        }
        if (this.eofReached && this.linesCache.length === 0) {
          this.close();
        }
        if (line3 && line3[line3.length - 1] === this.newLineCharacter) {
          line3 = line3.slice(0, line3.length - 1);
        }
        return line3;
      }
    };
    module.exports = LineByLine;
  }
});

// src/index.js
var src_exports = {};
__export(src_exports, {
  __debug: () => debugApis,
  __internal: () => sharedWithCli,
  check: () => check,
  clearConfigCache: () => clearCache3,
  doc: () => doc,
  format: () => format2,
  formatWithCursor: () => formatWithCursor2,
  getFileInfo: () => getFileInfo2,
  getSupportInfo: () => getSupportInfo2,
  resolveConfig: () => resolveConfig,
  resolveConfigFile: () => resolveConfigFile,
  util: () => public_exports,
  version: () => version_evaluate_default
});

// node_modules/diff/lib/index.mjs
function Diff() {
}
Diff.prototype = {
  diff: function diff(oldString, newString) {
    var _options$timeout;
    var options8 = arguments.length > 2 && arguments[2] !== void 0 ? arguments[2] : {};
    var callback = options8.callback;
    if (typeof options8 === "function") {
      callback = options8;
      options8 = {};
    }
    this.options = options8;
    var self = this;
    function done(value) {
      if (callback) {
        setTimeout(function() {
          callback(void 0, value);
        }, 0);
        return true;
      } else {
        return value;
      }
    }
    oldString = this.castInput(oldString);
    newString = this.castInput(newString);
    oldString = this.removeEmpty(this.tokenize(oldString));
    newString = this.removeEmpty(this.tokenize(newString));
    var newLen = newString.length, oldLen = oldString.length;
    var editLength = 1;
    var maxEditLength = newLen + oldLen;
    if (options8.maxEditLength) {
      maxEditLength = Math.min(maxEditLength, options8.maxEditLength);
    }
    var maxExecutionTime = (_options$timeout = options8.timeout) !== null && _options$timeout !== void 0 ? _options$timeout : Infinity;
    var abortAfterTimestamp = Date.now() + maxExecutionTime;
    var bestPath = [{
      oldPos: -1,
      lastComponent: void 0
    }];
    var newPos = this.extractCommon(bestPath[0], newString, oldString, 0);
    if (bestPath[0].oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
      return done([{
        value: this.join(newString),
        count: newString.length
      }]);
    }
    var minDiagonalToConsider = -Infinity, maxDiagonalToConsider = Infinity;
    function execEditLength() {
      for (var diagonalPath = Math.max(minDiagonalToConsider, -editLength); diagonalPath <= Math.min(maxDiagonalToConsider, editLength); diagonalPath += 2) {
        var basePath = void 0;
        var removePath = bestPath[diagonalPath - 1], addPath = bestPath[diagonalPath + 1];
        if (removePath) {
          bestPath[diagonalPath - 1] = void 0;
        }
        var canAdd = false;
        if (addPath) {
          var addPathNewPos = addPath.oldPos - diagonalPath;
          canAdd = addPath && 0 <= addPathNewPos && addPathNewPos < newLen;
        }
        var canRemove = removePath && removePath.oldPos + 1 < oldLen;
        if (!canAdd && !canRemove) {
          bestPath[diagonalPath] = void 0;
          continue;
        }
        if (!canRemove || canAdd && removePath.oldPos + 1 < addPath.oldPos) {
          basePath = self.addToPath(addPath, true, void 0, 0);
        } else {
          basePath = self.addToPath(removePath, void 0, true, 1);
        }
        newPos = self.extractCommon(basePath, newString, oldString, diagonalPath);
        if (basePath.oldPos + 1 >= oldLen && newPos + 1 >= newLen) {
          return done(buildValues(self, basePath.lastComponent, newString, oldString, self.useLongestToken));
        } else {
          bestPath[diagonalPath] = basePath;
          if (basePath.oldPos + 1 >= oldLen) {
            maxDiagonalToConsider = Math.min(maxDiagonalToConsider, diagonalPath - 1);
          }
          if (newPos + 1 >= newLen) {
            minDiagonalToConsider = Math.max(minDiagonalToConsider, diagonalPath + 1);
          }
        }
      }
      editLength++;
    }
    if (callback) {
      (function exec() {
        setTimeout(function() {
          if (editLength > maxEditLength || Date.now() > abortAfterTimestamp) {
            return callback();
          }
          if (!execEditLength()) {
            exec();
          }
        }, 0);
      })();
    } else {
      while (editLength <= maxEditLength && Date.now() <= abortAfterTimestamp) {
        var ret = execEditLength();
        if (ret) {
          return ret;
        }
      }
    }
  },
  addToPath: function addToPath(path13, added, removed, oldPosInc) {
    var last = path13.lastComponent;
    if (last && last.added === added && last.removed === removed) {
      return {
        oldPos: path13.oldPos + oldPosInc,
        lastComponent: {
          count: last.count + 1,
          added,
          removed,
          previousComponent: last.previousComponent
        }
      };
    } else {
      return {
        oldPos: path13.oldPos + oldPosInc,
        lastComponent: {
          count: 1,
          added,
          removed,
          previousComponent: last
        }
      };
    }
  },
  extractCommon: function extractCommon(basePath, newString, oldString, diagonalPath) {
    var newLen = newString.length, oldLen = oldString.length, oldPos = basePath.oldPos, newPos = oldPos - diagonalPath, commonCount = 0;
    while (newPos + 1 < newLen && oldPos + 1 < oldLen && this.equals(newString[newPos + 1], oldString[oldPos + 1])) {
      newPos++;
      oldPos++;
      commonCount++;
    }
    if (commonCount) {
      basePath.lastComponent = {
        count: commonCount,
        previousComponent: basePath.lastComponent
      };
    }
    basePath.oldPos = oldPos;
    return newPos;
  },
  equals: function equals(left, right) {
    if (this.options.comparator) {
      return this.options.comparator(left, right);
    } else {
      return left === right || this.options.ignoreCase && left.toLowerCase() === right.toLowerCase();
    }
  },
  removeEmpty: function removeEmpty(array2) {
    var ret = [];
    for (var i = 0; i < array2.length; i++) {
      if (array2[i]) {
        ret.push(array2[i]);
      }
    }
    return ret;
  },
  castInput: function castInput(value) {
    return value;
  },
  tokenize: function tokenize(value) {
    return value.split("");
  },
  join: function join(chars) {
    return chars.join("");
  }
};
function buildValues(diff2, lastComponent, newString, oldString, useLongestToken) {
  var components = [];
  var nextComponent;
  while (lastComponent) {
    components.push(lastComponent);
    nextComponent = lastComponent.previousComponent;
    delete lastComponent.previousComponent;
    lastComponent = nextComponent;
  }
  components.reverse();
  var componentPos = 0, componentLen = components.length, newPos = 0, oldPos = 0;
  for (; componentPos < componentLen; componentPos++) {
    var component = components[componentPos];
    if (!component.removed) {
      if (!component.added && useLongestToken) {
        var value = newString.slice(newPos, newPos + component.count);
        value = value.map(function(value2, i) {
          var oldValue = oldString[oldPos + i];
          return oldValue.length > value2.length ? oldValue : value2;
        });
        component.value = diff2.join(value);
      } else {
        component.value = diff2.join(newString.slice(newPos, newPos + component.count));
      }
      newPos += component.count;
      if (!component.added) {
        oldPos += component.count;
      }
    } else {
      component.value = diff2.join(oldString.slice(oldPos, oldPos + component.count));
      oldPos += component.count;
      if (componentPos && components[componentPos - 1].added) {
        var tmp = components[componentPos - 1];
        components[componentPos - 1] = components[componentPos];
        components[componentPos] = tmp;
      }
    }
  }
  var finalComponent = components[componentLen - 1];
  if (componentLen > 1 && typeof finalComponent.value === "string" && (finalComponent.added || finalComponent.removed) && diff2.equals("", finalComponent.value)) {
    components[componentLen - 2].value += finalComponent.value;
    components.pop();
  }
  return components;
}
var characterDiff = new Diff();
var extendedWordChars = /^[A-Za-z\xC0-\u02C6\u02C8-\u02D7\u02DE-\u02FF\u1E00-\u1EFF]+$/;
var reWhitespace = /\S/;
var wordDiff = new Diff();
wordDiff.equals = function(left, right) {
  if (this.options.ignoreCase) {
    left = left.toLowerCase();
    right = right.toLowerCase();
  }
  return left === right || this.options.ignoreWhitespace && !reWhitespace.test(left) && !reWhitespace.test(right);
};
wordDiff.tokenize = function(value) {
  var tokens = value.split(/([^\S\r\n]+|[()[\]{}'"\r\n]|\b)/);
  for (var i = 0; i < tokens.length - 1; i++) {
    if (!tokens[i + 1] && tokens[i + 2] && extendedWordChars.test(tokens[i]) && extendedWordChars.test(tokens[i + 2])) {
      tokens[i] += tokens[i + 2];
      tokens.splice(i + 1, 2);
      i--;
    }
  }
  return tokens;
};
var lineDiff = new Diff();
lineDiff.tokenize = function(value) {
  if (this.options.stripTrailingCr) {
    value = value.replace(/\r\n/g, "\n");
  }
  var retLines = [], linesAndNewlines = value.split(/(\n|\r\n)/);
  if (!linesAndNewlines[linesAndNewlines.length - 1]) {
    linesAndNewlines.pop();
  }
  for (var i = 0; i < linesAndNewlines.length; i++) {
    var line3 = linesAndNewlines[i];
    if (i % 2 && !this.options.newlineIsToken) {
      retLines[retLines.length - 1] += line3;
    } else {
      if (this.options.ignoreWhitespace) {
        line3 = line3.trim();
      }
      retLines.push(line3);
    }
  }
  return retLines;
};
function diffLines(oldStr, newStr, callback) {
  return lineDiff.diff(oldStr, newStr, callback);
}
var sentenceDiff = new Diff();
sentenceDiff.tokenize = function(value) {
  return value.split(/(\S.+?[.!?])(?=\s+|$)/);
};
var cssDiff = new Diff();
cssDiff.tokenize = function(value) {
  return value.split(/([{}:;,]|\s+)/);
};
function _typeof(obj) {
  "@babel/helpers - typeof";
  if (typeof Symbol === "function" && typeof Symbol.iterator === "symbol") {
    _typeof = function(obj2) {
      return typeof obj2;
    };
  } else {
    _typeof = function(obj2) {
      return obj2 && typeof Symbol === "function" && obj2.constructor === Symbol && obj2 !== Symbol.prototype ? "symbol" : typeof obj2;
    };
  }
  return _typeof(obj);
}
function _toConsumableArray(arr) {
  return _arrayWithoutHoles(arr) || _iterableToArray(arr) || _unsupportedIterableToArray(arr) || _nonIterableSpread();
}
function _arrayWithoutHoles(arr) {
  if (Array.isArray(arr)) return _arrayLikeToArray(arr);
}
function _iterableToArray(iter) {
  if (typeof Symbol !== "undefined" && Symbol.iterator in Object(iter)) return Array.from(iter);
}
function _unsupportedIterableToArray(o, minLen) {
  if (!o) return;
  if (typeof o === "string") return _arrayLikeToArray(o, minLen);
  var n = Object.prototype.toString.call(o).slice(8, -1);
  if (n === "Object" && o.constructor) n = o.constructor.name;
  if (n === "Map" || n === "Set") return Array.from(o);
  if (n === "Arguments" || /^(?:Ui|I)nt(?:8|16|32)(?:Clamped)?Array$/.test(n)) return _arrayLikeToArray(o, minLen);
}
function _arrayLikeToArray(arr, len) {
  if (len == null || len > arr.length) len = arr.length;
  for (var i = 0, arr2 = new Array(len); i < len; i++) arr2[i] = arr[i];
  return arr2;
}
function _nonIterableSpread() {
  throw new TypeError("Invalid attempt to spread non-iterable instance.\nIn order to be iterable, non-array objects must have a [Symbol.iterator]() method.");
}
var objectPrototypeToString = Object.prototype.toString;
var jsonDiff = new Diff();
jsonDiff.useLongestToken = true;
jsonDiff.tokenize = lineDiff.tokenize;
jsonDiff.castInput = function(value) {
  var _this$options = this.options, undefinedReplacement = _this$options.undefinedReplacement, _this$options$stringi = _this$options.stringifyReplacer, stringifyReplacer = _this$options$stringi === void 0 ? function(k, v) {
    return typeof v === "undefined" ? undefinedReplacement : v;
  } : _this$options$stringi;
  return typeof value === "string" ? value : JSON.stringify(canonicalize(value, null, null, stringifyReplacer), stringifyReplacer, "  ");
};
jsonDiff.equals = function(left, right) {
  return Diff.prototype.equals.call(jsonDiff, left.replace(/,([\r\n])/g, "$1"), right.replace(/,([\r\n])/g, "$1"));
};
function canonicalize(obj, stack2, replacementStack, replacer, key2) {
  stack2 = stack2 || [];
  replacementStack = replacementStack || [];
  if (replacer) {
    obj = replacer(key2, obj);
  }
  var i;
  for (i = 0; i < stack2.length; i += 1) {
    if (stack2[i] === obj) {
      return replacementStack[i];
    }
  }
  var canonicalizedObj;
  if ("[object Array]" === objectPrototypeToString.call(obj)) {
    stack2.push(obj);
    canonicalizedObj = new Array(obj.length);
    replacementStack.push(canonicalizedObj);
    for (i = 0; i < obj.length; i += 1) {
      canonicalizedObj[i] = canonicalize(obj[i], stack2, replacementStack, replacer, key2);
    }
    stack2.pop();
    replacementStack.pop();
    return canonicalizedObj;
  }
  if (obj && obj.toJSON) {
    obj = obj.toJSON();
  }
  if (_typeof(obj) === "object" && obj !== null) {
    stack2.push(obj);
    canonicalizedObj = {};
    replacementStack.push(canonicalizedObj);
    var sortedKeys = [], _key;
    for (_key in obj) {
      if (obj.hasOwnProperty(_key)) {
        sortedKeys.push(_key);
      }
    }
    sortedKeys.sort();
    for (i = 0; i < sortedKeys.length; i += 1) {
      _key = sortedKeys[i];
      canonicalizedObj[_key] = canonicalize(obj[_key], stack2, replacementStack, replacer, _key);
    }
    stack2.pop();
    replacementStack.pop();
  } else {
    canonicalizedObj = obj;
  }
  return canonicalizedObj;
}
var arrayDiff = new Diff();
arrayDiff.tokenize = function(value) {
  return value.slice();
};
arrayDiff.join = arrayDiff.removeEmpty = function(value) {
  return value;
};
function diffArrays(oldArr, newArr, callback) {
  return arrayDiff.diff(oldArr, newArr, callback);
}
function structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options8) {
  if (!options8) {
    options8 = {};
  }
  if (typeof options8.context === "undefined") {
    options8.context = 4;
  }
  var diff2 = diffLines(oldStr, newStr, options8);
  if (!diff2) {
    return;
  }
  diff2.push({
    value: "",
    lines: []
  });
  function contextLines(lines) {
    return lines.map(function(entry) {
      return " " + entry;
    });
  }
  var hunks = [];
  var oldRangeStart = 0, newRangeStart = 0, curRange = [], oldLine = 1, newLine = 1;
  var _loop = function _loop2(i2) {
    var current = diff2[i2], lines = current.lines || current.value.replace(/\n$/, "").split("\n");
    current.lines = lines;
    if (current.added || current.removed) {
      var _curRange;
      if (!oldRangeStart) {
        var prev = diff2[i2 - 1];
        oldRangeStart = oldLine;
        newRangeStart = newLine;
        if (prev) {
          curRange = options8.context > 0 ? contextLines(prev.lines.slice(-options8.context)) : [];
          oldRangeStart -= curRange.length;
          newRangeStart -= curRange.length;
        }
      }
      (_curRange = curRange).push.apply(_curRange, _toConsumableArray(lines.map(function(entry) {
        return (current.added ? "+" : "-") + entry;
      })));
      if (current.added) {
        newLine += lines.length;
      } else {
        oldLine += lines.length;
      }
    } else {
      if (oldRangeStart) {
        if (lines.length <= options8.context * 2 && i2 < diff2.length - 2) {
          var _curRange2;
          (_curRange2 = curRange).push.apply(_curRange2, _toConsumableArray(contextLines(lines)));
        } else {
          var _curRange3;
          var contextSize = Math.min(lines.length, options8.context);
          (_curRange3 = curRange).push.apply(_curRange3, _toConsumableArray(contextLines(lines.slice(0, contextSize))));
          var hunk = {
            oldStart: oldRangeStart,
            oldLines: oldLine - oldRangeStart + contextSize,
            newStart: newRangeStart,
            newLines: newLine - newRangeStart + contextSize,
            lines: curRange
          };
          if (i2 >= diff2.length - 2 && lines.length <= options8.context) {
            var oldEOFNewline = /\n$/.test(oldStr);
            var newEOFNewline = /\n$/.test(newStr);
            var noNlBeforeAdds = lines.length == 0 && curRange.length > hunk.oldLines;
            if (!oldEOFNewline && noNlBeforeAdds && oldStr.length > 0) {
              curRange.splice(hunk.oldLines, 0, "\\ No newline at end of file");
            }
            if (!oldEOFNewline && !noNlBeforeAdds || !newEOFNewline) {
              curRange.push("\\ No newline at end of file");
            }
          }
          hunks.push(hunk);
          oldRangeStart = 0;
          newRangeStart = 0;
          curRange = [];
        }
      }
      oldLine += lines.length;
      newLine += lines.length;
    }
  };
  for (var i = 0; i < diff2.length; i++) {
    _loop(i);
  }
  return {
    oldFileName,
    newFileName,
    oldHeader,
    newHeader,
    hunks
  };
}
function formatPatch(diff2) {
  if (Array.isArray(diff2)) {
    return diff2.map(formatPatch).join("\n");
  }
  var ret = [];
  if (diff2.oldFileName == diff2.newFileName) {
    ret.push("Index: " + diff2.oldFileName);
  }
  ret.push("===================================================================");
  ret.push("--- " + diff2.oldFileName + (typeof diff2.oldHeader === "undefined" ? "" : "	" + diff2.oldHeader));
  ret.push("+++ " + diff2.newFileName + (typeof diff2.newHeader === "undefined" ? "" : "	" + diff2.newHeader));
  for (var i = 0; i < diff2.hunks.length; i++) {
    var hunk = diff2.hunks[i];
    if (hunk.oldLines === 0) {
      hunk.oldStart -= 1;
    }
    if (hunk.newLines === 0) {
      hunk.newStart -= 1;
    }
    ret.push("@@ -" + hunk.oldStart + "," + hunk.oldLines + " +" + hunk.newStart + "," + hunk.newLines + " @@");
    ret.push.apply(ret, hunk.lines);
  }
  return ret.join("\n") + "\n";
}
function createTwoFilesPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options8) {
  return formatPatch(structuredPatch(oldFileName, newFileName, oldStr, newStr, oldHeader, newHeader, options8));
}

// src/index.js
var import_fast_glob = __toESM(require_out4(), 1);

// node_modules/vnopts/lib/descriptors/api.js
var apiDescriptor = {
  key: (key2) => /^[$_a-zA-Z][$_a-zA-Z0-9]*$/.test(key2) ? key2 : JSON.stringify(key2),
  value(value) {
    if (value === null || typeof value !== "object") {
      return JSON.stringify(value);
    }
    if (Array.isArray(value)) {
      return `[${value.map((subValue) => apiDescriptor.value(subValue)).join(", ")}]`;
    }
    const keys = Object.keys(value);
    return keys.length === 0 ? "{}" : `{ ${keys.map((key2) => `${apiDescriptor.key(key2)}: ${apiDescriptor.value(value[key2])}`).join(", ")} }`;
  },
  pair: ({ key: key2, value }) => apiDescriptor.value({ [key2]: value })
};

// node_modules/vnopts/lib/handlers/deprecated/common.js
init_source();
var commonDeprecatedHandler = (keyOrPair, redirectTo, { descriptor }) => {
  const messages2 = [
    `${source_default.yellow(typeof keyOrPair === "string" ? descriptor.key(keyOrPair) : descriptor.pair(keyOrPair))} is deprecated`
  ];
  if (redirectTo) {
    messages2.push(`we now treat it as ${source_default.blue(typeof redirectTo === "string" ? descriptor.key(redirectTo) : descriptor.pair(redirectTo))}`);
  }
  return messages2.join("; ") + ".";
};

// node_modules/vnopts/lib/handlers/invalid/common.js
init_source();

// node_modules/vnopts/lib/constants.js
var VALUE_NOT_EXIST = Symbol.for("vnopts.VALUE_NOT_EXIST");
var VALUE_UNCHANGED = Symbol.for("vnopts.VALUE_UNCHANGED");

// node_modules/vnopts/lib/handlers/invalid/common.js
var INDENTATION = " ".repeat(2);
var commonInvalidHandler = (key2, value, utils) => {
  const { text, list } = utils.normalizeExpectedResult(utils.schemas[key2].expected(utils));
  const descriptions = [];
  if (text) {
    descriptions.push(getDescription(key2, value, text, utils.descriptor));
  }
  if (list) {
    descriptions.push([getDescription(key2, value, list.title, utils.descriptor)].concat(list.values.map((valueDescription) => getListDescription(valueDescription, utils.loggerPrintWidth))).join("\n"));
  }
  return chooseDescription(descriptions, utils.loggerPrintWidth);
};
function getDescription(key2, value, expected, descriptor) {
  return [
    `Invalid ${source_default.red(descriptor.key(key2))} value.`,
    `Expected ${source_default.blue(expected)},`,
    `but received ${value === VALUE_NOT_EXIST ? source_default.gray("nothing") : source_default.red(descriptor.value(value))}.`
  ].join(" ");
}
function getListDescription({ text, list }, printWidth) {
  const descriptions = [];
  if (text) {
    descriptions.push(`- ${source_default.blue(text)}`);
  }
  if (list) {
    descriptions.push([`- ${source_default.blue(list.title)}:`].concat(list.values.map((valueDescription) => getListDescription(valueDescription, printWidth - INDENTATION.length).replace(/^|\n/g, `$&${INDENTATION}`))).join("\n"));
  }
  return chooseDescription(descriptions, printWidth);
}
function chooseDescription(descriptions, printWidth) {
  if (descriptions.length === 1) {
    return descriptions[0];
  }
  const [firstDescription, secondDescription] = descriptions;
  const [firstWidth, secondWidth] = descriptions.map((description) => description.split("\n", 1)[0].length);
  return firstWidth > printWidth && firstWidth > secondWidth ? secondDescription : firstDescription;
}

// node_modules/vnopts/lib/handlers/unknown/leven.js
init_source();

// node_modules/leven/index.js
var array = [];
var characterCodeCache = [];
function leven(first, second) {
  if (first === second) {
    return 0;
  }
  const swap = first;
  if (first.length > second.length) {
    first = second;
    second = swap;
  }
  let firstLength = first.length;
  let secondLength = second.length;
  while (firstLength > 0 && first.charCodeAt(~-firstLength) === second.charCodeAt(~-secondLength)) {
    firstLength--;
    secondLength--;
  }
  let start = 0;
  while (start < firstLength && first.charCodeAt(start) === second.charCodeAt(start)) {
    start++;
  }
  firstLength -= start;
  secondLength -= start;
  if (firstLength === 0) {
    return secondLength;
  }
  let bCharacterCode;
  let result;
  let temporary;
  let temporary2;
  let index = 0;
  let index2 = 0;
  while (index < firstLength) {
    characterCodeCache[index] = first.charCodeAt(start + index);
    array[index] = ++index;
  }
  while (index2 < secondLength) {
    bCharacterCode = second.charCodeAt(start + index2);
    temporary = index2++;
    result = index2;
    for (index = 0; index < firstLength; index++) {
      temporary2 = bCharacterCode === characterCodeCache[index] ? temporary : temporary + 1;
      temporary = array[index];
      result = array[index] = temporary > result ? temporary2 > result ? result + 1 : temporary2 : temporary2 > temporary ? temporary + 1 : temporary2;
    }
  }
  return result;
}

// node_modules/vnopts/lib/handlers/unknown/leven.js
var levenUnknownHandler = (key2, value, { descriptor, logger, schemas }) => {
  const messages2 = [
    `Ignored unknown option ${source_default.yellow(descriptor.pair({ key: key2, value }))}.`
  ];
  const suggestion = Object.keys(schemas).sort().find((knownKey) => leven(key2, knownKey) < 3);
  if (suggestion) {
    messages2.push(`Did you mean ${source_default.blue(descriptor.key(suggestion))}?`);
  }
  logger.warn(messages2.join(" "));
};

// node_modules/vnopts/lib/schema.js
var HANDLER_KEYS = [
  "default",
  "expected",
  "validate",
  "deprecated",
  "forward",
  "redirect",
  "overlap",
  "preprocess",
  "postprocess"
];
function createSchema(SchemaConstructor, parameters) {
  const schema2 = new SchemaConstructor(parameters);
  const subSchema = Object.create(schema2);
  for (const handlerKey of HANDLER_KEYS) {
    if (handlerKey in parameters) {
      subSchema[handlerKey] = normalizeHandler(parameters[handlerKey], schema2, Schema.prototype[handlerKey].length);
    }
  }
  return subSchema;
}
var Schema = class {
  static create(parameters) {
    return createSchema(this, parameters);
  }
  constructor(parameters) {
    this.name = parameters.name;
  }
  default(_utils) {
    return void 0;
  }
  // this is actually an abstract method but we need a placeholder to get `function.length`
  /* c8 ignore start */
  expected(_utils) {
    return "nothing";
  }
  /* c8 ignore stop */
  // this is actually an abstract method but we need a placeholder to get `function.length`
  /* c8 ignore start */
  validate(_value, _utils) {
    return false;
  }
  /* c8 ignore stop */
  deprecated(_value, _utils) {
    return false;
  }
  forward(_value, _utils) {
    return void 0;
  }
  redirect(_value, _utils) {
    return void 0;
  }
  overlap(currentValue, _newValue, _utils) {
    return currentValue;
  }
  preprocess(value, _utils) {
    return value;
  }
  postprocess(_value, _utils) {
    return VALUE_UNCHANGED;
  }
};
function normalizeHandler(handler, superSchema, handlerArgumentsLength) {
  return typeof handler === "function" ? (...args) => handler(...args.slice(0, handlerArgumentsLength - 1), superSchema, ...args.slice(handlerArgumentsLength - 1)) : () => handler;
}

// node_modules/vnopts/lib/schemas/alias.js
var AliasSchema = class extends Schema {
  constructor(parameters) {
    super(parameters);
    this._sourceName = parameters.sourceName;
  }
  expected(utils) {
    return utils.schemas[this._sourceName].expected(utils);
  }
  validate(value, utils) {
    return utils.schemas[this._sourceName].validate(value, utils);
  }
  redirect(_value, _utils) {
    return this._sourceName;
  }
};

// node_modules/vnopts/lib/schemas/any.js
var AnySchema = class extends Schema {
  expected() {
    return "anything";
  }
  validate() {
    return true;
  }
};

// node_modules/vnopts/lib/schemas/array.js
var ArraySchema = class extends Schema {
  constructor({ valueSchema, name = valueSchema.name, ...handlers }) {
    super({ ...handlers, name });
    this._valueSchema = valueSchema;
  }
  expected(utils) {
    const { text, list } = utils.normalizeExpectedResult(this._valueSchema.expected(utils));
    return {
      text: text && `an array of ${text}`,
      list: list && {
        title: `an array of the following values`,
        values: [{ list }]
      }
    };
  }
  validate(value, utils) {
    if (!Array.isArray(value)) {
      return false;
    }
    const invalidValues = [];
    for (const subValue of value) {
      const subValidateResult = utils.normalizeValidateResult(this._valueSchema.validate(subValue, utils), subValue);
      if (subValidateResult !== true) {
        invalidValues.push(subValidateResult.value);
      }
    }
    return invalidValues.length === 0 ? true : { value: invalidValues };
  }
  deprecated(value, utils) {
    const deprecatedResult = [];
    for (const subValue of value) {
      const subDeprecatedResult = utils.normalizeDeprecatedResult(this._valueSchema.deprecated(subValue, utils), subValue);
      if (subDeprecatedResult !== false) {
        deprecatedResult.push(...subDeprecatedResult.map(({ value: deprecatedValue }) => ({
          value: [deprecatedValue]
        })));
      }
    }
    return deprecatedResult;
  }
  forward(value, utils) {
    const forwardResult = [];
    for (const subValue of value) {
      const subForwardResult = utils.normalizeForwardResult(this._valueSchema.forward(subValue, utils), subValue);
      forwardResult.push(...subForwardResult.map(wrapTransferResult));
    }
    return forwardResult;
  }
  redirect(value, utils) {
    const remain = [];
    const redirect = [];
    for (const subValue of value) {
      const subRedirectResult = utils.normalizeRedirectResult(this._valueSchema.redirect(subValue, utils), subValue);
      if ("remain" in subRedirectResult) {
        remain.push(subRedirectResult.remain);
      }
      redirect.push(...subRedirectResult.redirect.map(wrapTransferResult));
    }
    return remain.length === 0 ? { redirect } : { redirect, remain };
  }
  overlap(currentValue, newValue) {
    return currentValue.concat(newValue);
  }
};
function wrapTransferResult({ from, to }) {
  return { from: [from], to };
}

// node_modules/vnopts/lib/schemas/boolean.js
var BooleanSchema = class extends Schema {
  expected() {
    return "true or false";
  }
  validate(value) {
    return typeof value === "boolean";
  }
};

// node_modules/vnopts/lib/utils.js
function recordFromArray(array2, mainKey) {
  const record = /* @__PURE__ */ Object.create(null);
  for (const value of array2) {
    const key2 = value[mainKey];
    if (record[key2]) {
      throw new Error(`Duplicate ${mainKey} ${JSON.stringify(key2)}`);
    }
    record[key2] = value;
  }
  return record;
}
function mapFromArray(array2, mainKey) {
  const map2 = /* @__PURE__ */ new Map();
  for (const value of array2) {
    const key2 = value[mainKey];
    if (map2.has(key2)) {
      throw new Error(`Duplicate ${mainKey} ${JSON.stringify(key2)}`);
    }
    map2.set(key2, value);
  }
  return map2;
}
function createAutoChecklist() {
  const map2 = /* @__PURE__ */ Object.create(null);
  return (id) => {
    const idString = JSON.stringify(id);
    if (map2[idString]) {
      return true;
    }
    map2[idString] = true;
    return false;
  };
}
function partition(array2, predicate) {
  const trueArray = [];
  const falseArray = [];
  for (const value of array2) {
    if (predicate(value)) {
      trueArray.push(value);
    } else {
      falseArray.push(value);
    }
  }
  return [trueArray, falseArray];
}
function isInt(value) {
  return value === Math.floor(value);
}
function comparePrimitive(a, b) {
  if (a === b) {
    return 0;
  }
  const typeofA = typeof a;
  const typeofB = typeof b;
  const orders = [
    "undefined",
    "object",
    "boolean",
    "number",
    "string"
  ];
  if (typeofA !== typeofB) {
    return orders.indexOf(typeofA) - orders.indexOf(typeofB);
  }
  if (typeofA !== "string") {
    return Number(a) - Number(b);
  }
  return a.localeCompare(b);
}
function normalizeInvalidHandler(invalidHandler) {
  return (...args) => {
    const errorMessageOrError = invalidHandler(...args);
    return typeof errorMessageOrError === "string" ? new Error(errorMessageOrError) : errorMessageOrError;
  };
}
function normalizeDefaultResult(result) {
  return result === void 0 ? {} : result;
}
function normalizeExpectedResult(result) {
  if (typeof result === "string") {
    return { text: result };
  }
  const { text, list } = result;
  assert((text || list) !== void 0, "Unexpected `expected` result, there should be at least one field.");
  if (!list) {
    return { text };
  }
  return {
    text,
    list: {
      title: list.title,
      values: list.values.map(normalizeExpectedResult)
    }
  };
}
function normalizeValidateResult(result, value) {
  return result === true ? true : result === false ? { value } : result;
}
function normalizeDeprecatedResult(result, value, doNotNormalizeTrue = false) {
  return result === false ? false : result === true ? doNotNormalizeTrue ? true : [{ value }] : "value" in result ? [result] : result.length === 0 ? false : result;
}
function normalizeTransferResult(result, value) {
  return typeof result === "string" || "key" in result ? { from: value, to: result } : "from" in result ? { from: result.from, to: result.to } : { from: value, to: result.to };
}
function normalizeForwardResult(result, value) {
  return result === void 0 ? [] : Array.isArray(result) ? result.map((transferResult) => normalizeTransferResult(transferResult, value)) : [normalizeTransferResult(result, value)];
}
function normalizeRedirectResult(result, value) {
  const redirect = normalizeForwardResult(typeof result === "object" && "redirect" in result ? result.redirect : result, value);
  return redirect.length === 0 ? { remain: value, redirect } : typeof result === "object" && "remain" in result ? { remain: result.remain, redirect } : { redirect };
}
function assert(isValid, message) {
  if (!isValid) {
    throw new Error(message);
  }
}

// node_modules/vnopts/lib/schemas/choice.js
var ChoiceSchema = class extends Schema {
  constructor(parameters) {
    super(parameters);
    this._choices = mapFromArray(parameters.choices.map((choice) => choice && typeof choice === "object" ? choice : { value: choice }), "value");
  }
  expected({ descriptor }) {
    const choiceDescriptions = Array.from(this._choices.keys()).map((value) => this._choices.get(value)).filter(({ hidden }) => !hidden).map((choiceInfo) => choiceInfo.value).sort(comparePrimitive).map(descriptor.value);
    const head = choiceDescriptions.slice(0, -2);
    const tail = choiceDescriptions.slice(-2);
    const message = head.concat(tail.join(" or ")).join(", ");
    return {
      text: message,
      list: {
        title: "one of the following values",
        values: choiceDescriptions
      }
    };
  }
  validate(value) {
    return this._choices.has(value);
  }
  deprecated(value) {
    const choiceInfo = this._choices.get(value);
    return choiceInfo && choiceInfo.deprecated ? { value } : false;
  }
  forward(value) {
    const choiceInfo = this._choices.get(value);
    return choiceInfo ? choiceInfo.forward : void 0;
  }
  redirect(value) {
    const choiceInfo = this._choices.get(value);
    return choiceInfo ? choiceInfo.redirect : void 0;
  }
};

// node_modules/vnopts/lib/schemas/number.js
var NumberSchema = class extends Schema {
  expected() {
    return "a number";
  }
  validate(value, _utils) {
    return typeof value === "number";
  }
};

// node_modules/vnopts/lib/schemas/integer.js
var IntegerSchema = class extends NumberSchema {
  expected() {
    return "an integer";
  }
  validate(value, utils) {
    return utils.normalizeValidateResult(super.validate(value, utils), value) === true && isInt(value);
  }
};

// node_modules/vnopts/lib/schemas/string.js
var StringSchema = class extends Schema {
  expected() {
    return "a string";
  }
  validate(value) {
    return typeof value === "string";
  }
};

// node_modules/vnopts/lib/defaults.js
var defaultDescriptor = apiDescriptor;
var defaultUnknownHandler = levenUnknownHandler;
var defaultInvalidHandler = commonInvalidHandler;
var defaultDeprecatedHandler = commonDeprecatedHandler;

// node_modules/vnopts/lib/normalize.js
var Normalizer = class {
  constructor(schemas, opts) {
    const { logger = console, loggerPrintWidth = 80, descriptor = defaultDescriptor, unknown = defaultUnknownHandler, invalid = defaultInvalidHandler, deprecated = defaultDeprecatedHandler, missing = () => false, required = () => false, preprocess = (x) => x, postprocess = () => VALUE_UNCHANGED } = opts || {};
    this._utils = {
      descriptor,
      logger: (
        /* c8 ignore next */
        logger || { warn: () => {
        } }
      ),
      loggerPrintWidth,
      schemas: recordFromArray(schemas, "name"),
      normalizeDefaultResult,
      normalizeExpectedResult,
      normalizeDeprecatedResult,
      normalizeForwardResult,
      normalizeRedirectResult,
      normalizeValidateResult
    };
    this._unknownHandler = unknown;
    this._invalidHandler = normalizeInvalidHandler(invalid);
    this._deprecatedHandler = deprecated;
    this._identifyMissing = (k, o) => !(k in o) || missing(k, o);
    this._identifyRequired = required;
    this._preprocess = preprocess;
    this._postprocess = postprocess;
    this.cleanHistory();
  }
  cleanHistory() {
    this._hasDeprecationWarned = createAutoChecklist();
  }
  normalize(options8) {
    const newOptions = {};
    const preprocessed = this._preprocess(options8, this._utils);
    const restOptionsArray = [preprocessed];
    const applyNormalization = () => {
      while (restOptionsArray.length !== 0) {
        const currentOptions = restOptionsArray.shift();
        const transferredOptionsArray = this._applyNormalization(currentOptions, newOptions);
        restOptionsArray.push(...transferredOptionsArray);
      }
    };
    applyNormalization();
    for (const key2 of Object.keys(this._utils.schemas)) {
      const schema2 = this._utils.schemas[key2];
      if (!(key2 in newOptions)) {
        const defaultResult = normalizeDefaultResult(schema2.default(this._utils));
        if ("value" in defaultResult) {
          restOptionsArray.push({ [key2]: defaultResult.value });
        }
      }
    }
    applyNormalization();
    for (const key2 of Object.keys(this._utils.schemas)) {
      if (!(key2 in newOptions)) {
        continue;
      }
      const schema2 = this._utils.schemas[key2];
      const value = newOptions[key2];
      const newValue = schema2.postprocess(value, this._utils);
      if (newValue === VALUE_UNCHANGED) {
        continue;
      }
      this._applyValidation(newValue, key2, schema2);
      newOptions[key2] = newValue;
    }
    this._applyPostprocess(newOptions);
    this._applyRequiredCheck(newOptions);
    return newOptions;
  }
  _applyNormalization(options8, newOptions) {
    const transferredOptionsArray = [];
    const { knownKeys, unknownKeys } = this._partitionOptionKeys(options8);
    for (const key2 of knownKeys) {
      const schema2 = this._utils.schemas[key2];
      const value = schema2.preprocess(options8[key2], this._utils);
      this._applyValidation(value, key2, schema2);
      const appendTransferredOptions = ({ from, to }) => {
        transferredOptionsArray.push(typeof to === "string" ? { [to]: from } : { [to.key]: to.value });
      };
      const warnDeprecated = ({ value: currentValue, redirectTo }) => {
        const deprecatedResult = normalizeDeprecatedResult(
          schema2.deprecated(currentValue, this._utils),
          value,
          /* doNotNormalizeTrue */
          true
        );
        if (deprecatedResult === false) {
          return;
        }
        if (deprecatedResult === true) {
          if (!this._hasDeprecationWarned(key2)) {
            this._utils.logger.warn(this._deprecatedHandler(key2, redirectTo, this._utils));
          }
        } else {
          for (const { value: deprecatedValue } of deprecatedResult) {
            const pair = { key: key2, value: deprecatedValue };
            if (!this._hasDeprecationWarned(pair)) {
              const redirectToPair = typeof redirectTo === "string" ? { key: redirectTo, value: deprecatedValue } : redirectTo;
              this._utils.logger.warn(this._deprecatedHandler(pair, redirectToPair, this._utils));
            }
          }
        }
      };
      const forwardResult = normalizeForwardResult(schema2.forward(value, this._utils), value);
      forwardResult.forEach(appendTransferredOptions);
      const redirectResult = normalizeRedirectResult(schema2.redirect(value, this._utils), value);
      redirectResult.redirect.forEach(appendTransferredOptions);
      if ("remain" in redirectResult) {
        const remainingValue = redirectResult.remain;
        newOptions[key2] = key2 in newOptions ? schema2.overlap(newOptions[key2], remainingValue, this._utils) : remainingValue;
        warnDeprecated({ value: remainingValue });
      }
      for (const { from, to } of redirectResult.redirect) {
        warnDeprecated({ value: from, redirectTo: to });
      }
    }
    for (const key2 of unknownKeys) {
      const value = options8[key2];
      this._applyUnknownHandler(key2, value, newOptions, (knownResultKey, knownResultValue) => {
        transferredOptionsArray.push({ [knownResultKey]: knownResultValue });
      });
    }
    return transferredOptionsArray;
  }
  _applyRequiredCheck(options8) {
    for (const key2 of Object.keys(this._utils.schemas)) {
      if (this._identifyMissing(key2, options8)) {
        if (this._identifyRequired(key2)) {
          throw this._invalidHandler(key2, VALUE_NOT_EXIST, this._utils);
        }
      }
    }
  }
  _partitionOptionKeys(options8) {
    const [knownKeys, unknownKeys] = partition(Object.keys(options8).filter((key2) => !this._identifyMissing(key2, options8)), (key2) => key2 in this._utils.schemas);
    return { knownKeys, unknownKeys };
  }
  _applyValidation(value, key2, schema2) {
    const validateResult = normalizeValidateResult(schema2.validate(value, this._utils), value);
    if (validateResult !== true) {
      throw this._invalidHandler(key2, validateResult.value, this._utils);
    }
  }
  _applyUnknownHandler(key2, value, newOptions, knownResultHandler) {
    const unknownResult = this._unknownHandler(key2, value, this._utils);
    if (!unknownResult) {
      return;
    }
    for (const resultKey of Object.keys(unknownResult)) {
      if (this._identifyMissing(resultKey, unknownResult)) {
        continue;
      }
      const resultValue = unknownResult[resultKey];
      if (resultKey in this._utils.schemas) {
        knownResultHandler(resultKey, resultValue);
      } else {
        newOptions[resultKey] = resultValue;
      }
    }
  }
  _applyPostprocess(options8) {
    const postprocessed = this._postprocess(options8, this._utils);
    if (postprocessed === VALUE_UNCHANGED) {
      return;
    }
    if (postprocessed.delete) {
      for (const deleteKey of postprocessed.delete) {
        delete options8[deleteKey];
      }
    }
    if (postprocessed.override) {
      const { knownKeys, unknownKeys } = this._partitionOptionKeys(postprocessed.override);
      for (const key2 of knownKeys) {
        const value = postprocessed.override[key2];
        this._applyValidation(value, key2, this._utils.schemas[key2]);
        options8[key2] = value;
      }
      for (const key2 of unknownKeys) {
        const value = postprocessed.override[key2];
        this._applyUnknownHandler(key2, value, options8, (knownResultKey, knownResultValue) => {
          const schema2 = this._utils.schemas[knownResultKey];
          this._applyValidation(knownResultValue, knownResultKey, schema2);
          options8[knownResultKey] = knownResultValue;
        });
      }
    }
  }
};

// src/common/errors.js
var errors_exports = {};
__export(errors_exports, {
  ArgExpansionBailout: () => ArgExpansionBailout,
  ConfigError: () => ConfigError,
  UndefinedParserError: () => UndefinedParserError
});
var ConfigError = class extends Error {
  name = "ConfigError";
};
var UndefinedParserError = class extends Error {
  name = "UndefinedParserError";
};
var ArgExpansionBailout = class extends Error {
  name = "ArgExpansionBailout";
};

// src/config/resolve-config.js
var import_micromatch = __toESM(require_micromatch(), 1);
import path9 from "path";

// node_modules/url-or-path/index.js
import { fileURLToPath, pathToFileURL } from "url";
var isUrlInstance = (value) => value instanceof URL;
var isUrlString = (value) => typeof value === "string" && value.startsWith("file://");
var isUrl = (urlOrPath) => isUrlInstance(urlOrPath) || isUrlString(urlOrPath);
var toPath = (urlOrPath) => isUrl(urlOrPath) ? fileURLToPath(urlOrPath) : urlOrPath;

// src/utils/partition.js
function partition2(array2, predicate) {
  const result = [[], []];
  for (const value of array2) {
    result[predicate(value) ? 0 : 1].push(value);
  }
  return result;
}
var partition_default = partition2;

// src/config/editorconfig/index.js
var import_editorconfig = __toESM(require_src(), 1);
import path4 from "path";

// src/config/find-project-root.js
import * as path3 from "path";

// src/utils/is-directory.js
import fs from "fs/promises";
async function isDirectory(directory, options8) {
  const allowSymlinks = (options8 == null ? void 0 : options8.allowSymlinks) ?? true;
  let stats;
  try {
    stats = await (allowSymlinks ? fs.stat : fs.lstat)(toPath(directory));
  } catch {
    return false;
  }
  return stats.isDirectory();
}
var is_directory_default = isDirectory;

// src/config/searcher.js
import path2 from "path";

// node_modules/iterate-directory-up/index.js
import * as path from "path";
var toAbsolutePath = (value) => path.resolve(toPath(value));
function* iterateDirectoryUp(from, to) {
  from = toAbsolutePath(from);
  const { root: root2 } = path.parse(from);
  to = to ? toAbsolutePath(to) : root2;
  if (from !== to && !from.startsWith(to)) {
    return;
  }
  for (let directory = from; directory !== to; directory = path.dirname(directory)) {
    yield directory;
  }
  yield to;
}
var iterate_directory_up_default = iterateDirectoryUp;

// src/config/searcher.js
var _names, _filter, _stopDirectory, _cache, _Searcher_instances, searchInDirectory_fn;
var Searcher = class {
  /**
   * @param {{
   *   names: string[],
   *   filter: (fileOrDirectory: {name: string, path: string}) => Promise<boolean>,
   *   stopDirectory?: string,
   * }} param0
   */
  constructor({ names, filter: filter2, stopDirectory }) {
    __privateAdd(this, _Searcher_instances);
    __privateAdd(this, _names);
    __privateAdd(this, _filter);
    __privateAdd(this, _stopDirectory);
    __privateAdd(this, _cache, /* @__PURE__ */ new Map());
    __privateSet(this, _names, names);
    __privateSet(this, _filter, filter2);
    __privateSet(this, _stopDirectory, stopDirectory);
  }
  async search(startDirectory, { shouldCache }) {
    const cache3 = __privateGet(this, _cache);
    if (shouldCache && cache3.has(startDirectory)) {
      return cache3.get(startDirectory);
    }
    const searchedDirectories = [];
    let result;
    for (const directory of iterate_directory_up_default(
      startDirectory,
      __privateGet(this, _stopDirectory)
    )) {
      searchedDirectories.push(directory);
      result = await __privateMethod(this, _Searcher_instances, searchInDirectory_fn).call(this, directory, shouldCache);
      if (result) {
        break;
      }
    }
    for (const directory of searchedDirectories) {
      cache3.set(directory, result);
    }
    return result;
  }
  clearCache() {
    __privateGet(this, _cache).clear();
  }
};
_names = new WeakMap();
_filter = new WeakMap();
_stopDirectory = new WeakMap();
_cache = new WeakMap();
_Searcher_instances = new WeakSet();
searchInDirectory_fn = async function(directory, shouldCache) {
  const cache3 = __privateGet(this, _cache);
  if (shouldCache && cache3.has(directory)) {
    return cache3.get(directory);
  }
  for (const name of __privateGet(this, _names)) {
    const fileOrDirectory = path2.join(directory, name);
    if (await __privateGet(this, _filter).call(this, { name, path: fileOrDirectory })) {
      return fileOrDirectory;
    }
  }
};
var searcher_default = Searcher;

// src/config/find-project-root.js
var MARKERS = [".git", ".hg"];
var searcher;
var searchOptions = {
  names: MARKERS,
  filter: ({ path: directory }) => is_directory_default(directory, { allowSymlinks: false })
};
async function findProjectRoot(startDirectory, options8) {
  searcher ?? (searcher = new searcher_default(searchOptions));
  const mark = await searcher.search(startDirectory, options8);
  return mark ? path3.dirname(mark) : void 0;
}
function clearFindProjectRootCache() {
  searcher == null ? void 0 : searcher.clearCache();
}

// src/config/editorconfig/editorconfig-to-prettier.js
function removeUnset(editorConfig) {
  const result = {};
  const keys = Object.keys(editorConfig);
  for (let i = 0; i < keys.length; i++) {
    const key2 = keys[i];
    if (editorConfig[key2] === "unset") {
      continue;
    }
    result[key2] = editorConfig[key2];
  }
  return result;
}
function editorConfigToPrettier(editorConfig) {
  if (!editorConfig) {
    return null;
  }
  editorConfig = removeUnset(editorConfig);
  if (Object.keys(editorConfig).length === 0) {
    return null;
  }
  const result = {};
  if (editorConfig.indent_style) {
    result.useTabs = editorConfig.indent_style === "tab";
  }
  if (editorConfig.indent_size === "tab") {
    result.useTabs = true;
  }
  if (result.useTabs && editorConfig.tab_width) {
    result.tabWidth = editorConfig.tab_width;
  } else if (editorConfig.indent_style === "space" && editorConfig.indent_size && editorConfig.indent_size !== "tab") {
    result.tabWidth = editorConfig.indent_size;
  } else if (editorConfig.tab_width !== void 0) {
    result.tabWidth = editorConfig.tab_width;
  }
  if (editorConfig.max_line_length) {
    if (editorConfig.max_line_length === "off") {
      result.printWidth = Number.POSITIVE_INFINITY;
    } else {
      result.printWidth = editorConfig.max_line_length;
    }
  }
  if (editorConfig.quote_type === "single") {
    result.singleQuote = true;
  } else if (editorConfig.quote_type === "double") {
    result.singleQuote = false;
  }
  if (["cr", "crlf", "lf"].includes(editorConfig.end_of_line)) {
    result.endOfLine = editorConfig.end_of_line;
  }
  return result;
}
var editorconfig_to_prettier_default = editorConfigToPrettier;

// src/config/editorconfig/index.js
var editorconfigCache = /* @__PURE__ */ new Map();
function clearEditorconfigCache() {
  clearFindProjectRootCache();
  editorconfigCache.clear();
}
async function loadEditorconfigInternal(file, { shouldCache }) {
  const directory = path4.dirname(file);
  const root2 = await findProjectRoot(directory, { shouldCache });
  const editorConfig = await import_editorconfig.default.parse(file, { root: root2 });
  const config = editorconfig_to_prettier_default(editorConfig);
  return config;
}
function loadEditorconfig(file, { shouldCache }) {
  file = path4.resolve(file);
  if (!shouldCache || !editorconfigCache.has(file)) {
    editorconfigCache.set(
      file,
      loadEditorconfigInternal(file, { shouldCache })
    );
  }
  return editorconfigCache.get(file);
}

// src/config/prettier-config/index.js
import path8 from "path";

// src/common/mockable.js
var import_ci_info = __toESM(require_ci_info(), 1);
import fs2 from "fs/promises";

// node_modules/get-stdin/index.js
var { stdin } = process;
async function getStdin() {
  let result = "";
  if (stdin.isTTY) {
    return result;
  }
  stdin.setEncoding("utf8");
  for await (const chunk of stdin) {
    result += chunk;
  }
  return result;
}
getStdin.buffer = async () => {
  const result = [];
  let length = 0;
  if (stdin.isTTY) {
    return Buffer.concat([]);
  }
  for await (const chunk of stdin) {
    result.push(chunk);
    length += chunk.length;
  }
  return Buffer.concat(result, length);
};

// src/common/mockable.js
function writeFormattedFile(file, data) {
  return fs2.writeFile(file, data);
}
var mockable = {
  getPrettierConfigSearchStopDirectory: () => void 0,
  getStdin,
  isCI: () => import_ci_info.isCI,
  writeFormattedFile
};
var mockable_default = mockable;

// src/utils/is-file.js
import fs3 from "fs/promises";
async function isFile(file, options8) {
  const allowSymlinks = (options8 == null ? void 0 : options8.allowSymlinks) ?? true;
  let stats;
  try {
    stats = await (allowSymlinks ? fs3.stat : fs3.lstat)(toPath(file));
  } catch {
    return false;
  }
  return stats.isFile();
}
var is_file_default = isFile;

// src/config/prettier-config/loaders.js
var import_parse_async = __toESM(require_parse_async(), 1);
import { pathToFileURL as pathToFileURL2 } from "url";

// node_modules/js-yaml/dist/js-yaml.mjs
function isNothing(subject) {
  return typeof subject === "undefined" || subject === null;
}
function isObject(subject) {
  return typeof subject === "object" && subject !== null;
}
function toArray(sequence) {
  if (Array.isArray(sequence)) return sequence;
  else if (isNothing(sequence)) return [];
  return [sequence];
}
function extend(target, source2) {
  var index, length, key2, sourceKeys;
  if (source2) {
    sourceKeys = Object.keys(source2);
    for (index = 0, length = sourceKeys.length; index < length; index += 1) {
      key2 = sourceKeys[index];
      target[key2] = source2[key2];
    }
  }
  return target;
}
function repeat(string, count) {
  var result = "", cycle;
  for (cycle = 0; cycle < count; cycle += 1) {
    result += string;
  }
  return result;
}
function isNegativeZero(number) {
  return number === 0 && Number.NEGATIVE_INFINITY === 1 / number;
}
var isNothing_1 = isNothing;
var isObject_1 = isObject;
var toArray_1 = toArray;
var repeat_1 = repeat;
var isNegativeZero_1 = isNegativeZero;
var extend_1 = extend;
var common = {
  isNothing: isNothing_1,
  isObject: isObject_1,
  toArray: toArray_1,
  repeat: repeat_1,
  isNegativeZero: isNegativeZero_1,
  extend: extend_1
};
function formatError(exception2, compact) {
  var where = "", message = exception2.reason || "(unknown reason)";
  if (!exception2.mark) return message;
  if (exception2.mark.name) {
    where += 'in "' + exception2.mark.name + '" ';
  }
  where += "(" + (exception2.mark.line + 1) + ":" + (exception2.mark.column + 1) + ")";
  if (!compact && exception2.mark.snippet) {
    where += "\n\n" + exception2.mark.snippet;
  }
  return message + " " + where;
}
function YAMLException$1(reason, mark) {
  Error.call(this);
  this.name = "YAMLException";
  this.reason = reason;
  this.mark = mark;
  this.message = formatError(this, false);
  if (Error.captureStackTrace) {
    Error.captureStackTrace(this, this.constructor);
  } else {
    this.stack = new Error().stack || "";
  }
}
YAMLException$1.prototype = Object.create(Error.prototype);
YAMLException$1.prototype.constructor = YAMLException$1;
YAMLException$1.prototype.toString = function toString(compact) {
  return this.name + ": " + formatError(this, compact);
};
var exception = YAMLException$1;
function getLine(buffer2, lineStart, lineEnd, position, maxLineLength) {
  var head = "";
  var tail = "";
  var maxHalfLength = Math.floor(maxLineLength / 2) - 1;
  if (position - lineStart > maxHalfLength) {
    head = " ... ";
    lineStart = position - maxHalfLength + head.length;
  }
  if (lineEnd - position > maxHalfLength) {
    tail = " ...";
    lineEnd = position + maxHalfLength - tail.length;
  }
  return {
    str: head + buffer2.slice(lineStart, lineEnd).replace(/\t/g, "\u2192") + tail,
    pos: position - lineStart + head.length
    // relative position
  };
}
function padStart(string, max) {
  return common.repeat(" ", max - string.length) + string;
}
function makeSnippet(mark, options8) {
  options8 = Object.create(options8 || null);
  if (!mark.buffer) return null;
  if (!options8.maxLength) options8.maxLength = 79;
  if (typeof options8.indent !== "number") options8.indent = 1;
  if (typeof options8.linesBefore !== "number") options8.linesBefore = 3;
  if (typeof options8.linesAfter !== "number") options8.linesAfter = 2;
  var re = /\r?\n|\r|\0/g;
  var lineStarts = [0];
  var lineEnds = [];
  var match;
  var foundLineNo = -1;
  while (match = re.exec(mark.buffer)) {
    lineEnds.push(match.index);
    lineStarts.push(match.index + match[0].length);
    if (mark.position <= match.index && foundLineNo < 0) {
      foundLineNo = lineStarts.length - 2;
    }
  }
  if (foundLineNo < 0) foundLineNo = lineStarts.length - 1;
  var result = "", i, line3;
  var lineNoLength = Math.min(mark.line + options8.linesAfter, lineEnds.length).toString().length;
  var maxLineLength = options8.maxLength - (options8.indent + lineNoLength + 3);
  for (i = 1; i <= options8.linesBefore; i++) {
    if (foundLineNo - i < 0) break;
    line3 = getLine(
      mark.buffer,
      lineStarts[foundLineNo - i],
      lineEnds[foundLineNo - i],
      mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo - i]),
      maxLineLength
    );
    result = common.repeat(" ", options8.indent) + padStart((mark.line - i + 1).toString(), lineNoLength) + " | " + line3.str + "\n" + result;
  }
  line3 = getLine(mark.buffer, lineStarts[foundLineNo], lineEnds[foundLineNo], mark.position, maxLineLength);
  result += common.repeat(" ", options8.indent) + padStart((mark.line + 1).toString(), lineNoLength) + " | " + line3.str + "\n";
  result += common.repeat("-", options8.indent + lineNoLength + 3 + line3.pos) + "^\n";
  for (i = 1; i <= options8.linesAfter; i++) {
    if (foundLineNo + i >= lineEnds.length) break;
    line3 = getLine(
      mark.buffer,
      lineStarts[foundLineNo + i],
      lineEnds[foundLineNo + i],
      mark.position - (lineStarts[foundLineNo] - lineStarts[foundLineNo + i]),
      maxLineLength
    );
    result += common.repeat(" ", options8.indent) + padStart((mark.line + i + 1).toString(), lineNoLength) + " | " + line3.str + "\n";
  }
  return result.replace(/\n$/, "");
}
var snippet = makeSnippet;
var TYPE_CONSTRUCTOR_OPTIONS = [
  "kind",
  "multi",
  "resolve",
  "construct",
  "instanceOf",
  "predicate",
  "represent",
  "representName",
  "defaultStyle",
  "styleAliases"
];
var YAML_NODE_KINDS = [
  "scalar",
  "sequence",
  "mapping"
];
function compileStyleAliases(map2) {
  var result = {};
  if (map2 !== null) {
    Object.keys(map2).forEach(function(style) {
      map2[style].forEach(function(alias) {
        result[String(alias)] = style;
      });
    });
  }
  return result;
}
function Type$1(tag, options8) {
  options8 = options8 || {};
  Object.keys(options8).forEach(function(name) {
    if (TYPE_CONSTRUCTOR_OPTIONS.indexOf(name) === -1) {
      throw new exception('Unknown option "' + name + '" is met in definition of "' + tag + '" YAML type.');
    }
  });
  this.options = options8;
  this.tag = tag;
  this.kind = options8["kind"] || null;
  this.resolve = options8["resolve"] || function() {
    return true;
  };
  this.construct = options8["construct"] || function(data) {
    return data;
  };
  this.instanceOf = options8["instanceOf"] || null;
  this.predicate = options8["predicate"] || null;
  this.represent = options8["represent"] || null;
  this.representName = options8["representName"] || null;
  this.defaultStyle = options8["defaultStyle"] || null;
  this.multi = options8["multi"] || false;
  this.styleAliases = compileStyleAliases(options8["styleAliases"] || null);
  if (YAML_NODE_KINDS.indexOf(this.kind) === -1) {
    throw new exception('Unknown kind "' + this.kind + '" is specified for "' + tag + '" YAML type.');
  }
}
var type = Type$1;
function compileList(schema2, name) {
  var result = [];
  schema2[name].forEach(function(currentType) {
    var newIndex = result.length;
    result.forEach(function(previousType, previousIndex) {
      if (previousType.tag === currentType.tag && previousType.kind === currentType.kind && previousType.multi === currentType.multi) {
        newIndex = previousIndex;
      }
    });
    result[newIndex] = currentType;
  });
  return result;
}
function compileMap() {
  var result = {
    scalar: {},
    sequence: {},
    mapping: {},
    fallback: {},
    multi: {
      scalar: [],
      sequence: [],
      mapping: [],
      fallback: []
    }
  }, index, length;
  function collectType(type2) {
    if (type2.multi) {
      result.multi[type2.kind].push(type2);
      result.multi["fallback"].push(type2);
    } else {
      result[type2.kind][type2.tag] = result["fallback"][type2.tag] = type2;
    }
  }
  for (index = 0, length = arguments.length; index < length; index += 1) {
    arguments[index].forEach(collectType);
  }
  return result;
}
function Schema$1(definition) {
  return this.extend(definition);
}
Schema$1.prototype.extend = function extend2(definition) {
  var implicit = [];
  var explicit = [];
  if (definition instanceof type) {
    explicit.push(definition);
  } else if (Array.isArray(definition)) {
    explicit = explicit.concat(definition);
  } else if (definition && (Array.isArray(definition.implicit) || Array.isArray(definition.explicit))) {
    if (definition.implicit) implicit = implicit.concat(definition.implicit);
    if (definition.explicit) explicit = explicit.concat(definition.explicit);
  } else {
    throw new exception("Schema.extend argument should be a Type, [ Type ], or a schema definition ({ implicit: [...], explicit: [...] })");
  }
  implicit.forEach(function(type$1) {
    if (!(type$1 instanceof type)) {
      throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    }
    if (type$1.loadKind && type$1.loadKind !== "scalar") {
      throw new exception("There is a non-scalar type in the implicit list of a schema. Implicit resolving of such types is not supported.");
    }
    if (type$1.multi) {
      throw new exception("There is a multi type in the implicit list of a schema. Multi tags can only be listed as explicit.");
    }
  });
  explicit.forEach(function(type$1) {
    if (!(type$1 instanceof type)) {
      throw new exception("Specified list of YAML types (or a single Type object) contains a non-Type object.");
    }
  });
  var result = Object.create(Schema$1.prototype);
  result.implicit = (this.implicit || []).concat(implicit);
  result.explicit = (this.explicit || []).concat(explicit);
  result.compiledImplicit = compileList(result, "implicit");
  result.compiledExplicit = compileList(result, "explicit");
  result.compiledTypeMap = compileMap(result.compiledImplicit, result.compiledExplicit);
  return result;
};
var schema = Schema$1;
var str = new type("tag:yaml.org,2002:str", {
  kind: "scalar",
  construct: function(data) {
    return data !== null ? data : "";
  }
});
var seq = new type("tag:yaml.org,2002:seq", {
  kind: "sequence",
  construct: function(data) {
    return data !== null ? data : [];
  }
});
var map = new type("tag:yaml.org,2002:map", {
  kind: "mapping",
  construct: function(data) {
    return data !== null ? data : {};
  }
});
var failsafe = new schema({
  explicit: [
    str,
    seq,
    map
  ]
});
function resolveYamlNull(data) {
  if (data === null) return true;
  var max = data.length;
  return max === 1 && data === "~" || max === 4 && (data === "null" || data === "Null" || data === "NULL");
}
function constructYamlNull() {
  return null;
}
function isNull(object) {
  return object === null;
}
var _null = new type("tag:yaml.org,2002:null", {
  kind: "scalar",
  resolve: resolveYamlNull,
  construct: constructYamlNull,
  predicate: isNull,
  represent: {
    canonical: function() {
      return "~";
    },
    lowercase: function() {
      return "null";
    },
    uppercase: function() {
      return "NULL";
    },
    camelcase: function() {
      return "Null";
    },
    empty: function() {
      return "";
    }
  },
  defaultStyle: "lowercase"
});
function resolveYamlBoolean(data) {
  if (data === null) return false;
  var max = data.length;
  return max === 4 && (data === "true" || data === "True" || data === "TRUE") || max === 5 && (data === "false" || data === "False" || data === "FALSE");
}
function constructYamlBoolean(data) {
  return data === "true" || data === "True" || data === "TRUE";
}
function isBoolean(object) {
  return Object.prototype.toString.call(object) === "[object Boolean]";
}
var bool = new type("tag:yaml.org,2002:bool", {
  kind: "scalar",
  resolve: resolveYamlBoolean,
  construct: constructYamlBoolean,
  predicate: isBoolean,
  represent: {
    lowercase: function(object) {
      return object ? "true" : "false";
    },
    uppercase: function(object) {
      return object ? "TRUE" : "FALSE";
    },
    camelcase: function(object) {
      return object ? "True" : "False";
    }
  },
  defaultStyle: "lowercase"
});
function isHexCode(c2) {
  return 48 <= c2 && c2 <= 57 || 65 <= c2 && c2 <= 70 || 97 <= c2 && c2 <= 102;
}
function isOctCode(c2) {
  return 48 <= c2 && c2 <= 55;
}
function isDecCode(c2) {
  return 48 <= c2 && c2 <= 57;
}
function resolveYamlInteger(data) {
  if (data === null) return false;
  var max = data.length, index = 0, hasDigits = false, ch;
  if (!max) return false;
  ch = data[index];
  if (ch === "-" || ch === "+") {
    ch = data[++index];
  }
  if (ch === "0") {
    if (index + 1 === max) return true;
    ch = data[++index];
    if (ch === "b") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (ch !== "0" && ch !== "1") return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "x") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (!isHexCode(data.charCodeAt(index))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
    if (ch === "o") {
      index++;
      for (; index < max; index++) {
        ch = data[index];
        if (ch === "_") continue;
        if (!isOctCode(data.charCodeAt(index))) return false;
        hasDigits = true;
      }
      return hasDigits && ch !== "_";
    }
  }
  if (ch === "_") return false;
  for (; index < max; index++) {
    ch = data[index];
    if (ch === "_") continue;
    if (!isDecCode(data.charCodeAt(index))) {
      return false;
    }
    hasDigits = true;
  }
  if (!hasDigits || ch === "_") return false;
  return true;
}
function constructYamlInteger(data) {
  var value = data, sign2 = 1, ch;
  if (value.indexOf("_") !== -1) {
    value = value.replace(/_/g, "");
  }
  ch = value[0];
  if (ch === "-" || ch === "+") {
    if (ch === "-") sign2 = -1;
    value = value.slice(1);
    ch = value[0];
  }
  if (value === "0") return 0;
  if (ch === "0") {
    if (value[1] === "b") return sign2 * parseInt(value.slice(2), 2);
    if (value[1] === "x") return sign2 * parseInt(value.slice(2), 16);
    if (value[1] === "o") return sign2 * parseInt(value.slice(2), 8);
  }
  return sign2 * parseInt(value, 10);
}
function isInteger(object) {
  return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 === 0 && !common.isNegativeZero(object));
}
var int = new type("tag:yaml.org,2002:int", {
  kind: "scalar",
  resolve: resolveYamlInteger,
  construct: constructYamlInteger,
  predicate: isInteger,
  represent: {
    binary: function(obj) {
      return obj >= 0 ? "0b" + obj.toString(2) : "-0b" + obj.toString(2).slice(1);
    },
    octal: function(obj) {
      return obj >= 0 ? "0o" + obj.toString(8) : "-0o" + obj.toString(8).slice(1);
    },
    decimal: function(obj) {
      return obj.toString(10);
    },
    /* eslint-disable max-len */
    hexadecimal: function(obj) {
      return obj >= 0 ? "0x" + obj.toString(16).toUpperCase() : "-0x" + obj.toString(16).toUpperCase().slice(1);
    }
  },
  defaultStyle: "decimal",
  styleAliases: {
    binary: [2, "bin"],
    octal: [8, "oct"],
    decimal: [10, "dec"],
    hexadecimal: [16, "hex"]
  }
});
var YAML_FLOAT_PATTERN = new RegExp(
  // 2.5e4, 2.5 and integers
  "^(?:[-+]?(?:[0-9][0-9_]*)(?:\\.[0-9_]*)?(?:[eE][-+]?[0-9]+)?|\\.[0-9_]+(?:[eE][-+]?[0-9]+)?|[-+]?\\.(?:inf|Inf|INF)|\\.(?:nan|NaN|NAN))$"
);
function resolveYamlFloat(data) {
  if (data === null) return false;
  if (!YAML_FLOAT_PATTERN.test(data) || // Quick hack to not allow integers end with `_`
  // Probably should update regexp & check speed
  data[data.length - 1] === "_") {
    return false;
  }
  return true;
}
function constructYamlFloat(data) {
  var value, sign2;
  value = data.replace(/_/g, "").toLowerCase();
  sign2 = value[0] === "-" ? -1 : 1;
  if ("+-".indexOf(value[0]) >= 0) {
    value = value.slice(1);
  }
  if (value === ".inf") {
    return sign2 === 1 ? Number.POSITIVE_INFINITY : Number.NEGATIVE_INFINITY;
  } else if (value === ".nan") {
    return NaN;
  }
  return sign2 * parseFloat(value, 10);
}
var SCIENTIFIC_WITHOUT_DOT = /^[-+]?[0-9]+e/;
function representYamlFloat(object, style) {
  var res;
  if (isNaN(object)) {
    switch (style) {
      case "lowercase":
        return ".nan";
      case "uppercase":
        return ".NAN";
      case "camelcase":
        return ".NaN";
    }
  } else if (Number.POSITIVE_INFINITY === object) {
    switch (style) {
      case "lowercase":
        return ".inf";
      case "uppercase":
        return ".INF";
      case "camelcase":
        return ".Inf";
    }
  } else if (Number.NEGATIVE_INFINITY === object) {
    switch (style) {
      case "lowercase":
        return "-.inf";
      case "uppercase":
        return "-.INF";
      case "camelcase":
        return "-.Inf";
    }
  } else if (common.isNegativeZero(object)) {
    return "-0.0";
  }
  res = object.toString(10);
  return SCIENTIFIC_WITHOUT_DOT.test(res) ? res.replace("e", ".e") : res;
}
function isFloat(object) {
  return Object.prototype.toString.call(object) === "[object Number]" && (object % 1 !== 0 || common.isNegativeZero(object));
}
var float = new type("tag:yaml.org,2002:float", {
  kind: "scalar",
  resolve: resolveYamlFloat,
  construct: constructYamlFloat,
  predicate: isFloat,
  represent: representYamlFloat,
  defaultStyle: "lowercase"
});
var json = failsafe.extend({
  implicit: [
    _null,
    bool,
    int,
    float
  ]
});
var core = json;
var YAML_DATE_REGEXP = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9])-([0-9][0-9])$"
);
var YAML_TIMESTAMP_REGEXP = new RegExp(
  "^([0-9][0-9][0-9][0-9])-([0-9][0-9]?)-([0-9][0-9]?)(?:[Tt]|[ \\t]+)([0-9][0-9]?):([0-9][0-9]):([0-9][0-9])(?:\\.([0-9]*))?(?:[ \\t]*(Z|([-+])([0-9][0-9]?)(?::([0-9][0-9]))?))?$"
);
function resolveYamlTimestamp(data) {
  if (data === null) return false;
  if (YAML_DATE_REGEXP.exec(data) !== null) return true;
  if (YAML_TIMESTAMP_REGEXP.exec(data) !== null) return true;
  return false;
}
function constructYamlTimestamp(data) {
  var match, year, month, day, hour, minute, second, fraction = 0, delta = null, tz_hour, tz_minute, date;
  match = YAML_DATE_REGEXP.exec(data);
  if (match === null) match = YAML_TIMESTAMP_REGEXP.exec(data);
  if (match === null) throw new Error("Date resolve error");
  year = +match[1];
  month = +match[2] - 1;
  day = +match[3];
  if (!match[4]) {
    return new Date(Date.UTC(year, month, day));
  }
  hour = +match[4];
  minute = +match[5];
  second = +match[6];
  if (match[7]) {
    fraction = match[7].slice(0, 3);
    while (fraction.length < 3) {
      fraction += "0";
    }
    fraction = +fraction;
  }
  if (match[9]) {
    tz_hour = +match[10];
    tz_minute = +(match[11] || 0);
    delta = (tz_hour * 60 + tz_minute) * 6e4;
    if (match[9] === "-") delta = -delta;
  }
  date = new Date(Date.UTC(year, month, day, hour, minute, second, fraction));
  if (delta) date.setTime(date.getTime() - delta);
  return date;
}
function representYamlTimestamp(object) {
  return object.toISOString();
}
var timestamp = new type("tag:yaml.org,2002:timestamp", {
  kind: "scalar",
  resolve: resolveYamlTimestamp,
  construct: constructYamlTimestamp,
  instanceOf: Date,
  represent: representYamlTimestamp
});
function resolveYamlMerge(data) {
  return data === "<<" || data === null;
}
var merge = new type("tag:yaml.org,2002:merge", {
  kind: "scalar",
  resolve: resolveYamlMerge
});
var BASE64_MAP = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=\n\r";
function resolveYamlBinary(data) {
  if (data === null) return false;
  var code, idx, bitlen = 0, max = data.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    code = map2.indexOf(data.charAt(idx));
    if (code > 64) continue;
    if (code < 0) return false;
    bitlen += 6;
  }
  return bitlen % 8 === 0;
}
function constructYamlBinary(data) {
  var idx, tailbits, input = data.replace(/[\r\n=]/g, ""), max = input.length, map2 = BASE64_MAP, bits = 0, result = [];
  for (idx = 0; idx < max; idx++) {
    if (idx % 4 === 0 && idx) {
      result.push(bits >> 16 & 255);
      result.push(bits >> 8 & 255);
      result.push(bits & 255);
    }
    bits = bits << 6 | map2.indexOf(input.charAt(idx));
  }
  tailbits = max % 4 * 6;
  if (tailbits === 0) {
    result.push(bits >> 16 & 255);
    result.push(bits >> 8 & 255);
    result.push(bits & 255);
  } else if (tailbits === 18) {
    result.push(bits >> 10 & 255);
    result.push(bits >> 2 & 255);
  } else if (tailbits === 12) {
    result.push(bits >> 4 & 255);
  }
  return new Uint8Array(result);
}
function representYamlBinary(object) {
  var result = "", bits = 0, idx, tail, max = object.length, map2 = BASE64_MAP;
  for (idx = 0; idx < max; idx++) {
    if (idx % 3 === 0 && idx) {
      result += map2[bits >> 18 & 63];
      result += map2[bits >> 12 & 63];
      result += map2[bits >> 6 & 63];
      result += map2[bits & 63];
    }
    bits = (bits << 8) + object[idx];
  }
  tail = max % 3;
  if (tail === 0) {
    result += map2[bits >> 18 & 63];
    result += map2[bits >> 12 & 63];
    result += map2[bits >> 6 & 63];
    result += map2[bits & 63];
  } else if (tail === 2) {
    result += map2[bits >> 10 & 63];
    result += map2[bits >> 4 & 63];
    result += map2[bits << 2 & 63];
    result += map2[64];
  } else if (tail === 1) {
    result += map2[bits >> 2 & 63];
    result += map2[bits << 4 & 63];
    result += map2[64];
    result += map2[64];
  }
  return result;
}
function isBinary(obj) {
  return Object.prototype.toString.call(obj) === "[object Uint8Array]";
}
var binary = new type("tag:yaml.org,2002:binary", {
  kind: "scalar",
  resolve: resolveYamlBinary,
  construct: constructYamlBinary,
  predicate: isBinary,
  represent: representYamlBinary
});
var _hasOwnProperty$3 = Object.prototype.hasOwnProperty;
var _toString$2 = Object.prototype.toString;
function resolveYamlOmap(data) {
  if (data === null) return true;
  var objectKeys = [], index, length, pair, pairKey, pairHasKey, object = data;
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    pairHasKey = false;
    if (_toString$2.call(pair) !== "[object Object]") return false;
    for (pairKey in pair) {
      if (_hasOwnProperty$3.call(pair, pairKey)) {
        if (!pairHasKey) pairHasKey = true;
        else return false;
      }
    }
    if (!pairHasKey) return false;
    if (objectKeys.indexOf(pairKey) === -1) objectKeys.push(pairKey);
    else return false;
  }
  return true;
}
function constructYamlOmap(data) {
  return data !== null ? data : [];
}
var omap = new type("tag:yaml.org,2002:omap", {
  kind: "sequence",
  resolve: resolveYamlOmap,
  construct: constructYamlOmap
});
var _toString$1 = Object.prototype.toString;
function resolveYamlPairs(data) {
  if (data === null) return true;
  var index, length, pair, keys, result, object = data;
  result = new Array(object.length);
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    if (_toString$1.call(pair) !== "[object Object]") return false;
    keys = Object.keys(pair);
    if (keys.length !== 1) return false;
    result[index] = [keys[0], pair[keys[0]]];
  }
  return true;
}
function constructYamlPairs(data) {
  if (data === null) return [];
  var index, length, pair, keys, result, object = data;
  result = new Array(object.length);
  for (index = 0, length = object.length; index < length; index += 1) {
    pair = object[index];
    keys = Object.keys(pair);
    result[index] = [keys[0], pair[keys[0]]];
  }
  return result;
}
var pairs = new type("tag:yaml.org,2002:pairs", {
  kind: "sequence",
  resolve: resolveYamlPairs,
  construct: constructYamlPairs
});
var _hasOwnProperty$2 = Object.prototype.hasOwnProperty;
function resolveYamlSet(data) {
  if (data === null) return true;
  var key2, object = data;
  for (key2 in object) {
    if (_hasOwnProperty$2.call(object, key2)) {
      if (object[key2] !== null) return false;
    }
  }
  return true;
}
function constructYamlSet(data) {
  return data !== null ? data : {};
}
var set = new type("tag:yaml.org,2002:set", {
  kind: "mapping",
  resolve: resolveYamlSet,
  construct: constructYamlSet
});
var _default = core.extend({
  implicit: [
    timestamp,
    merge
  ],
  explicit: [
    binary,
    omap,
    pairs,
    set
  ]
});
var _hasOwnProperty$1 = Object.prototype.hasOwnProperty;
var CONTEXT_FLOW_IN = 1;
var CONTEXT_FLOW_OUT = 2;
var CONTEXT_BLOCK_IN = 3;
var CONTEXT_BLOCK_OUT = 4;
var CHOMPING_CLIP = 1;
var CHOMPING_STRIP = 2;
var CHOMPING_KEEP = 3;
var PATTERN_NON_PRINTABLE = /[\x00-\x08\x0B\x0C\x0E-\x1F\x7F-\x84\x86-\x9F\uFFFE\uFFFF]|[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?:[^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/;
var PATTERN_NON_ASCII_LINE_BREAKS = /[\x85\u2028\u2029]/;
var PATTERN_FLOW_INDICATORS = /[,\[\]\{\}]/;
var PATTERN_TAG_HANDLE = /^(?:!|!!|![a-z\-]+!)$/i;
var PATTERN_TAG_URI = /^(?:!|[^,\[\]\{\}])(?:%[0-9a-f]{2}|[0-9a-z\-#;\/\?:@&=\+\$,_\.!~\*'\(\)\[\]])*$/i;
function _class(obj) {
  return Object.prototype.toString.call(obj);
}
function is_EOL(c2) {
  return c2 === 10 || c2 === 13;
}
function is_WHITE_SPACE(c2) {
  return c2 === 9 || c2 === 32;
}
function is_WS_OR_EOL(c2) {
  return c2 === 9 || c2 === 32 || c2 === 10 || c2 === 13;
}
function is_FLOW_INDICATOR(c2) {
  return c2 === 44 || c2 === 91 || c2 === 93 || c2 === 123 || c2 === 125;
}
function fromHexCode(c2) {
  var lc;
  if (48 <= c2 && c2 <= 57) {
    return c2 - 48;
  }
  lc = c2 | 32;
  if (97 <= lc && lc <= 102) {
    return lc - 97 + 10;
  }
  return -1;
}
function escapedHexLen(c2) {
  if (c2 === 120) {
    return 2;
  }
  if (c2 === 117) {
    return 4;
  }
  if (c2 === 85) {
    return 8;
  }
  return 0;
}
function fromDecimalCode(c2) {
  if (48 <= c2 && c2 <= 57) {
    return c2 - 48;
  }
  return -1;
}
function simpleEscapeSequence(c2) {
  return c2 === 48 ? "\0" : c2 === 97 ? "\x07" : c2 === 98 ? "\b" : c2 === 116 ? "	" : c2 === 9 ? "	" : c2 === 110 ? "\n" : c2 === 118 ? "\v" : c2 === 102 ? "\f" : c2 === 114 ? "\r" : c2 === 101 ? "\x1B" : c2 === 32 ? " " : c2 === 34 ? '"' : c2 === 47 ? "/" : c2 === 92 ? "\\" : c2 === 78 ? "\x85" : c2 === 95 ? "\xA0" : c2 === 76 ? "\u2028" : c2 === 80 ? "\u2029" : "";
}
function charFromCodepoint(c2) {
  if (c2 <= 65535) {
    return String.fromCharCode(c2);
  }
  return String.fromCharCode(
    (c2 - 65536 >> 10) + 55296,
    (c2 - 65536 & 1023) + 56320
  );
}
var simpleEscapeCheck = new Array(256);
var simpleEscapeMap = new Array(256);
for (i = 0; i < 256; i++) {
  simpleEscapeCheck[i] = simpleEscapeSequence(i) ? 1 : 0;
  simpleEscapeMap[i] = simpleEscapeSequence(i);
}
var i;
function State$1(input, options8) {
  this.input = input;
  this.filename = options8["filename"] || null;
  this.schema = options8["schema"] || _default;
  this.onWarning = options8["onWarning"] || null;
  this.legacy = options8["legacy"] || false;
  this.json = options8["json"] || false;
  this.listener = options8["listener"] || null;
  this.implicitTypes = this.schema.compiledImplicit;
  this.typeMap = this.schema.compiledTypeMap;
  this.length = input.length;
  this.position = 0;
  this.line = 0;
  this.lineStart = 0;
  this.lineIndent = 0;
  this.firstTabInLine = -1;
  this.documents = [];
}
function generateError(state, message) {
  var mark = {
    name: state.filename,
    buffer: state.input.slice(0, -1),
    // omit trailing \0
    position: state.position,
    line: state.line,
    column: state.position - state.lineStart
  };
  mark.snippet = snippet(mark);
  return new exception(message, mark);
}
function throwError(state, message) {
  throw generateError(state, message);
}
function throwWarning(state, message) {
  if (state.onWarning) {
    state.onWarning.call(null, generateError(state, message));
  }
}
var directiveHandlers = {
  YAML: function handleYamlDirective(state, name, args) {
    var match, major, minor;
    if (state.version !== null) {
      throwError(state, "duplication of %YAML directive");
    }
    if (args.length !== 1) {
      throwError(state, "YAML directive accepts exactly one argument");
    }
    match = /^([0-9]+)\.([0-9]+)$/.exec(args[0]);
    if (match === null) {
      throwError(state, "ill-formed argument of the YAML directive");
    }
    major = parseInt(match[1], 10);
    minor = parseInt(match[2], 10);
    if (major !== 1) {
      throwError(state, "unacceptable YAML version of the document");
    }
    state.version = args[0];
    state.checkLineBreaks = minor < 2;
    if (minor !== 1 && minor !== 2) {
      throwWarning(state, "unsupported YAML version of the document");
    }
  },
  TAG: function handleTagDirective(state, name, args) {
    var handle, prefix;
    if (args.length !== 2) {
      throwError(state, "TAG directive accepts exactly two arguments");
    }
    handle = args[0];
    prefix = args[1];
    if (!PATTERN_TAG_HANDLE.test(handle)) {
      throwError(state, "ill-formed tag handle (first argument) of the TAG directive");
    }
    if (_hasOwnProperty$1.call(state.tagMap, handle)) {
      throwError(state, 'there is a previously declared suffix for "' + handle + '" tag handle');
    }
    if (!PATTERN_TAG_URI.test(prefix)) {
      throwError(state, "ill-formed tag prefix (second argument) of the TAG directive");
    }
    try {
      prefix = decodeURIComponent(prefix);
    } catch (err) {
      throwError(state, "tag prefix is malformed: " + prefix);
    }
    state.tagMap[handle] = prefix;
  }
};
function captureSegment(state, start, end, checkJson) {
  var _position, _length, _character, _result;
  if (start < end) {
    _result = state.input.slice(start, end);
    if (checkJson) {
      for (_position = 0, _length = _result.length; _position < _length; _position += 1) {
        _character = _result.charCodeAt(_position);
        if (!(_character === 9 || 32 <= _character && _character <= 1114111)) {
          throwError(state, "expected valid JSON character");
        }
      }
    } else if (PATTERN_NON_PRINTABLE.test(_result)) {
      throwError(state, "the stream contains non-printable characters");
    }
    state.result += _result;
  }
}
function mergeMappings(state, destination, source2, overridableKeys) {
  var sourceKeys, key2, index, quantity;
  if (!common.isObject(source2)) {
    throwError(state, "cannot merge mappings; the provided source object is unacceptable");
  }
  sourceKeys = Object.keys(source2);
  for (index = 0, quantity = sourceKeys.length; index < quantity; index += 1) {
    key2 = sourceKeys[index];
    if (!_hasOwnProperty$1.call(destination, key2)) {
      destination[key2] = source2[key2];
      overridableKeys[key2] = true;
    }
  }
}
function storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, startLine, startLineStart, startPos) {
  var index, quantity;
  if (Array.isArray(keyNode)) {
    keyNode = Array.prototype.slice.call(keyNode);
    for (index = 0, quantity = keyNode.length; index < quantity; index += 1) {
      if (Array.isArray(keyNode[index])) {
        throwError(state, "nested arrays are not supported inside keys");
      }
      if (typeof keyNode === "object" && _class(keyNode[index]) === "[object Object]") {
        keyNode[index] = "[object Object]";
      }
    }
  }
  if (typeof keyNode === "object" && _class(keyNode) === "[object Object]") {
    keyNode = "[object Object]";
  }
  keyNode = String(keyNode);
  if (_result === null) {
    _result = {};
  }
  if (keyTag === "tag:yaml.org,2002:merge") {
    if (Array.isArray(valueNode)) {
      for (index = 0, quantity = valueNode.length; index < quantity; index += 1) {
        mergeMappings(state, _result, valueNode[index], overridableKeys);
      }
    } else {
      mergeMappings(state, _result, valueNode, overridableKeys);
    }
  } else {
    if (!state.json && !_hasOwnProperty$1.call(overridableKeys, keyNode) && _hasOwnProperty$1.call(_result, keyNode)) {
      state.line = startLine || state.line;
      state.lineStart = startLineStart || state.lineStart;
      state.position = startPos || state.position;
      throwError(state, "duplicated mapping key");
    }
    if (keyNode === "__proto__") {
      Object.defineProperty(_result, keyNode, {
        configurable: true,
        enumerable: true,
        writable: true,
        value: valueNode
      });
    } else {
      _result[keyNode] = valueNode;
    }
    delete overridableKeys[keyNode];
  }
  return _result;
}
function readLineBreak(state) {
  var ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 10) {
    state.position++;
  } else if (ch === 13) {
    state.position++;
    if (state.input.charCodeAt(state.position) === 10) {
      state.position++;
    }
  } else {
    throwError(state, "a line break is expected");
  }
  state.line += 1;
  state.lineStart = state.position;
  state.firstTabInLine = -1;
}
function skipSeparationSpace(state, allowComments, checkIndent) {
  var lineBreaks = 0, ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    while (is_WHITE_SPACE(ch)) {
      if (ch === 9 && state.firstTabInLine === -1) {
        state.firstTabInLine = state.position;
      }
      ch = state.input.charCodeAt(++state.position);
    }
    if (allowComments && ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (ch !== 10 && ch !== 13 && ch !== 0);
    }
    if (is_EOL(ch)) {
      readLineBreak(state);
      ch = state.input.charCodeAt(state.position);
      lineBreaks++;
      state.lineIndent = 0;
      while (ch === 32) {
        state.lineIndent++;
        ch = state.input.charCodeAt(++state.position);
      }
    } else {
      break;
    }
  }
  if (checkIndent !== -1 && lineBreaks !== 0 && state.lineIndent < checkIndent) {
    throwWarning(state, "deficient indentation");
  }
  return lineBreaks;
}
function testDocumentSeparator(state) {
  var _position = state.position, ch;
  ch = state.input.charCodeAt(_position);
  if ((ch === 45 || ch === 46) && ch === state.input.charCodeAt(_position + 1) && ch === state.input.charCodeAt(_position + 2)) {
    _position += 3;
    ch = state.input.charCodeAt(_position);
    if (ch === 0 || is_WS_OR_EOL(ch)) {
      return true;
    }
  }
  return false;
}
function writeFoldedLines(state, count) {
  if (count === 1) {
    state.result += " ";
  } else if (count > 1) {
    state.result += common.repeat("\n", count - 1);
  }
}
function readPlainScalar(state, nodeIndent, withinFlowCollection) {
  var preceding, following, captureStart, captureEnd, hasPendingContent, _line, _lineStart, _lineIndent, _kind = state.kind, _result = state.result, ch;
  ch = state.input.charCodeAt(state.position);
  if (is_WS_OR_EOL(ch) || is_FLOW_INDICATOR(ch) || ch === 35 || ch === 38 || ch === 42 || ch === 33 || ch === 124 || ch === 62 || ch === 39 || ch === 34 || ch === 37 || ch === 64 || ch === 96) {
    return false;
  }
  if (ch === 63 || ch === 45) {
    following = state.input.charCodeAt(state.position + 1);
    if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
      return false;
    }
  }
  state.kind = "scalar";
  state.result = "";
  captureStart = captureEnd = state.position;
  hasPendingContent = false;
  while (ch !== 0) {
    if (ch === 58) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following) || withinFlowCollection && is_FLOW_INDICATOR(following)) {
        break;
      }
    } else if (ch === 35) {
      preceding = state.input.charCodeAt(state.position - 1);
      if (is_WS_OR_EOL(preceding)) {
        break;
      }
    } else if (state.position === state.lineStart && testDocumentSeparator(state) || withinFlowCollection && is_FLOW_INDICATOR(ch)) {
      break;
    } else if (is_EOL(ch)) {
      _line = state.line;
      _lineStart = state.lineStart;
      _lineIndent = state.lineIndent;
      skipSeparationSpace(state, false, -1);
      if (state.lineIndent >= nodeIndent) {
        hasPendingContent = true;
        ch = state.input.charCodeAt(state.position);
        continue;
      } else {
        state.position = captureEnd;
        state.line = _line;
        state.lineStart = _lineStart;
        state.lineIndent = _lineIndent;
        break;
      }
    }
    if (hasPendingContent) {
      captureSegment(state, captureStart, captureEnd, false);
      writeFoldedLines(state, state.line - _line);
      captureStart = captureEnd = state.position;
      hasPendingContent = false;
    }
    if (!is_WHITE_SPACE(ch)) {
      captureEnd = state.position + 1;
    }
    ch = state.input.charCodeAt(++state.position);
  }
  captureSegment(state, captureStart, captureEnd, false);
  if (state.result) {
    return true;
  }
  state.kind = _kind;
  state.result = _result;
  return false;
}
function readSingleQuotedScalar(state, nodeIndent) {
  var ch, captureStart, captureEnd;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 39) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 39) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (ch === 39) {
        captureStart = state.position;
        state.position++;
        captureEnd = state.position;
      } else {
        return true;
      }
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a single quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a single quoted scalar");
}
function readDoubleQuotedScalar(state, nodeIndent) {
  var captureStart, captureEnd, hexLength, hexResult, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 34) {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  state.position++;
  captureStart = captureEnd = state.position;
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    if (ch === 34) {
      captureSegment(state, captureStart, state.position, true);
      state.position++;
      return true;
    } else if (ch === 92) {
      captureSegment(state, captureStart, state.position, true);
      ch = state.input.charCodeAt(++state.position);
      if (is_EOL(ch)) {
        skipSeparationSpace(state, false, nodeIndent);
      } else if (ch < 256 && simpleEscapeCheck[ch]) {
        state.result += simpleEscapeMap[ch];
        state.position++;
      } else if ((tmp = escapedHexLen(ch)) > 0) {
        hexLength = tmp;
        hexResult = 0;
        for (; hexLength > 0; hexLength--) {
          ch = state.input.charCodeAt(++state.position);
          if ((tmp = fromHexCode(ch)) >= 0) {
            hexResult = (hexResult << 4) + tmp;
          } else {
            throwError(state, "expected hexadecimal character");
          }
        }
        state.result += charFromCodepoint(hexResult);
        state.position++;
      } else {
        throwError(state, "unknown escape sequence");
      }
      captureStart = captureEnd = state.position;
    } else if (is_EOL(ch)) {
      captureSegment(state, captureStart, captureEnd, true);
      writeFoldedLines(state, skipSeparationSpace(state, false, nodeIndent));
      captureStart = captureEnd = state.position;
    } else if (state.position === state.lineStart && testDocumentSeparator(state)) {
      throwError(state, "unexpected end of the document within a double quoted scalar");
    } else {
      state.position++;
      captureEnd = state.position;
    }
  }
  throwError(state, "unexpected end of the stream within a double quoted scalar");
}
function readFlowCollection(state, nodeIndent) {
  var readNext = true, _line, _lineStart, _pos, _tag = state.tag, _result, _anchor = state.anchor, following, terminator, isPair, isExplicitPair, isMapping, overridableKeys = /* @__PURE__ */ Object.create(null), keyNode, keyTag, valueNode, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 91) {
    terminator = 93;
    isMapping = false;
    _result = [];
  } else if (ch === 123) {
    terminator = 125;
    isMapping = true;
    _result = {};
  } else {
    return false;
  }
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(++state.position);
  while (ch !== 0) {
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === terminator) {
      state.position++;
      state.tag = _tag;
      state.anchor = _anchor;
      state.kind = isMapping ? "mapping" : "sequence";
      state.result = _result;
      return true;
    } else if (!readNext) {
      throwError(state, "missed comma between flow collection entries");
    } else if (ch === 44) {
      throwError(state, "expected the node content, but found ','");
    }
    keyTag = keyNode = valueNode = null;
    isPair = isExplicitPair = false;
    if (ch === 63) {
      following = state.input.charCodeAt(state.position + 1);
      if (is_WS_OR_EOL(following)) {
        isPair = isExplicitPair = true;
        state.position++;
        skipSeparationSpace(state, true, nodeIndent);
      }
    }
    _line = state.line;
    _lineStart = state.lineStart;
    _pos = state.position;
    composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
    keyTag = state.tag;
    keyNode = state.result;
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if ((isExplicitPair || state.line === _line) && ch === 58) {
      isPair = true;
      ch = state.input.charCodeAt(++state.position);
      skipSeparationSpace(state, true, nodeIndent);
      composeNode(state, nodeIndent, CONTEXT_FLOW_IN, false, true);
      valueNode = state.result;
    }
    if (isMapping) {
      storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos);
    } else if (isPair) {
      _result.push(storeMappingPair(state, null, overridableKeys, keyTag, keyNode, valueNode, _line, _lineStart, _pos));
    } else {
      _result.push(keyNode);
    }
    skipSeparationSpace(state, true, nodeIndent);
    ch = state.input.charCodeAt(state.position);
    if (ch === 44) {
      readNext = true;
      ch = state.input.charCodeAt(++state.position);
    } else {
      readNext = false;
    }
  }
  throwError(state, "unexpected end of the stream within a flow collection");
}
function readBlockScalar(state, nodeIndent) {
  var captureStart, folding, chomping = CHOMPING_CLIP, didReadContent = false, detectedIndent = false, textIndent = nodeIndent, emptyLines = 0, atMoreIndented = false, tmp, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch === 124) {
    folding = false;
  } else if (ch === 62) {
    folding = true;
  } else {
    return false;
  }
  state.kind = "scalar";
  state.result = "";
  while (ch !== 0) {
    ch = state.input.charCodeAt(++state.position);
    if (ch === 43 || ch === 45) {
      if (CHOMPING_CLIP === chomping) {
        chomping = ch === 43 ? CHOMPING_KEEP : CHOMPING_STRIP;
      } else {
        throwError(state, "repeat of a chomping mode identifier");
      }
    } else if ((tmp = fromDecimalCode(ch)) >= 0) {
      if (tmp === 0) {
        throwError(state, "bad explicit indentation width of a block scalar; it cannot be less than one");
      } else if (!detectedIndent) {
        textIndent = nodeIndent + tmp - 1;
        detectedIndent = true;
      } else {
        throwError(state, "repeat of an indentation width identifier");
      }
    } else {
      break;
    }
  }
  if (is_WHITE_SPACE(ch)) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (is_WHITE_SPACE(ch));
    if (ch === 35) {
      do {
        ch = state.input.charCodeAt(++state.position);
      } while (!is_EOL(ch) && ch !== 0);
    }
  }
  while (ch !== 0) {
    readLineBreak(state);
    state.lineIndent = 0;
    ch = state.input.charCodeAt(state.position);
    while ((!detectedIndent || state.lineIndent < textIndent) && ch === 32) {
      state.lineIndent++;
      ch = state.input.charCodeAt(++state.position);
    }
    if (!detectedIndent && state.lineIndent > textIndent) {
      textIndent = state.lineIndent;
    }
    if (is_EOL(ch)) {
      emptyLines++;
      continue;
    }
    if (state.lineIndent < textIndent) {
      if (chomping === CHOMPING_KEEP) {
        state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      } else if (chomping === CHOMPING_CLIP) {
        if (didReadContent) {
          state.result += "\n";
        }
      }
      break;
    }
    if (folding) {
      if (is_WHITE_SPACE(ch)) {
        atMoreIndented = true;
        state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
      } else if (atMoreIndented) {
        atMoreIndented = false;
        state.result += common.repeat("\n", emptyLines + 1);
      } else if (emptyLines === 0) {
        if (didReadContent) {
          state.result += " ";
        }
      } else {
        state.result += common.repeat("\n", emptyLines);
      }
    } else {
      state.result += common.repeat("\n", didReadContent ? 1 + emptyLines : emptyLines);
    }
    didReadContent = true;
    detectedIndent = true;
    emptyLines = 0;
    captureStart = state.position;
    while (!is_EOL(ch) && ch !== 0) {
      ch = state.input.charCodeAt(++state.position);
    }
    captureSegment(state, captureStart, state.position, false);
  }
  return true;
}
function readBlockSequence(state, nodeIndent) {
  var _line, _tag = state.tag, _anchor = state.anchor, _result = [], following, detected = false, ch;
  if (state.firstTabInLine !== -1) return false;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    if (ch !== 45) {
      break;
    }
    following = state.input.charCodeAt(state.position + 1);
    if (!is_WS_OR_EOL(following)) {
      break;
    }
    detected = true;
    state.position++;
    if (skipSeparationSpace(state, true, -1)) {
      if (state.lineIndent <= nodeIndent) {
        _result.push(null);
        ch = state.input.charCodeAt(state.position);
        continue;
      }
    }
    _line = state.line;
    composeNode(state, nodeIndent, CONTEXT_BLOCK_IN, false, true);
    _result.push(state.result);
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a sequence entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "sequence";
    state.result = _result;
    return true;
  }
  return false;
}
function readBlockMapping(state, nodeIndent, flowIndent) {
  var following, allowCompact, _line, _keyLine, _keyLineStart, _keyPos, _tag = state.tag, _anchor = state.anchor, _result = {}, overridableKeys = /* @__PURE__ */ Object.create(null), keyTag = null, keyNode = null, valueNode = null, atExplicitKey = false, detected = false, ch;
  if (state.firstTabInLine !== -1) return false;
  if (state.anchor !== null) {
    state.anchorMap[state.anchor] = _result;
  }
  ch = state.input.charCodeAt(state.position);
  while (ch !== 0) {
    if (!atExplicitKey && state.firstTabInLine !== -1) {
      state.position = state.firstTabInLine;
      throwError(state, "tab characters must not be used in indentation");
    }
    following = state.input.charCodeAt(state.position + 1);
    _line = state.line;
    if ((ch === 63 || ch === 58) && is_WS_OR_EOL(following)) {
      if (ch === 63) {
        if (atExplicitKey) {
          storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
          keyTag = keyNode = valueNode = null;
        }
        detected = true;
        atExplicitKey = true;
        allowCompact = true;
      } else if (atExplicitKey) {
        atExplicitKey = false;
        allowCompact = true;
      } else {
        throwError(state, "incomplete explicit mapping pair; a key node is missed; or followed by a non-tabulated empty line");
      }
      state.position += 1;
      ch = following;
    } else {
      _keyLine = state.line;
      _keyLineStart = state.lineStart;
      _keyPos = state.position;
      if (!composeNode(state, flowIndent, CONTEXT_FLOW_OUT, false, true)) {
        break;
      }
      if (state.line === _line) {
        ch = state.input.charCodeAt(state.position);
        while (is_WHITE_SPACE(ch)) {
          ch = state.input.charCodeAt(++state.position);
        }
        if (ch === 58) {
          ch = state.input.charCodeAt(++state.position);
          if (!is_WS_OR_EOL(ch)) {
            throwError(state, "a whitespace character is expected after the key-value separator within a block mapping");
          }
          if (atExplicitKey) {
            storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
            keyTag = keyNode = valueNode = null;
          }
          detected = true;
          atExplicitKey = false;
          allowCompact = false;
          keyTag = state.tag;
          keyNode = state.result;
        } else if (detected) {
          throwError(state, "can not read an implicit mapping pair; a colon is missed");
        } else {
          state.tag = _tag;
          state.anchor = _anchor;
          return true;
        }
      } else if (detected) {
        throwError(state, "can not read a block mapping entry; a multiline key may not be an implicit key");
      } else {
        state.tag = _tag;
        state.anchor = _anchor;
        return true;
      }
    }
    if (state.line === _line || state.lineIndent > nodeIndent) {
      if (atExplicitKey) {
        _keyLine = state.line;
        _keyLineStart = state.lineStart;
        _keyPos = state.position;
      }
      if (composeNode(state, nodeIndent, CONTEXT_BLOCK_OUT, true, allowCompact)) {
        if (atExplicitKey) {
          keyNode = state.result;
        } else {
          valueNode = state.result;
        }
      }
      if (!atExplicitKey) {
        storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, valueNode, _keyLine, _keyLineStart, _keyPos);
        keyTag = keyNode = valueNode = null;
      }
      skipSeparationSpace(state, true, -1);
      ch = state.input.charCodeAt(state.position);
    }
    if ((state.line === _line || state.lineIndent > nodeIndent) && ch !== 0) {
      throwError(state, "bad indentation of a mapping entry");
    } else if (state.lineIndent < nodeIndent) {
      break;
    }
  }
  if (atExplicitKey) {
    storeMappingPair(state, _result, overridableKeys, keyTag, keyNode, null, _keyLine, _keyLineStart, _keyPos);
  }
  if (detected) {
    state.tag = _tag;
    state.anchor = _anchor;
    state.kind = "mapping";
    state.result = _result;
  }
  return detected;
}
function readTagProperty(state) {
  var _position, isVerbatim = false, isNamed = false, tagHandle, tagName, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 33) return false;
  if (state.tag !== null) {
    throwError(state, "duplication of a tag property");
  }
  ch = state.input.charCodeAt(++state.position);
  if (ch === 60) {
    isVerbatim = true;
    ch = state.input.charCodeAt(++state.position);
  } else if (ch === 33) {
    isNamed = true;
    tagHandle = "!!";
    ch = state.input.charCodeAt(++state.position);
  } else {
    tagHandle = "!";
  }
  _position = state.position;
  if (isVerbatim) {
    do {
      ch = state.input.charCodeAt(++state.position);
    } while (ch !== 0 && ch !== 62);
    if (state.position < state.length) {
      tagName = state.input.slice(_position, state.position);
      ch = state.input.charCodeAt(++state.position);
    } else {
      throwError(state, "unexpected end of the stream within a verbatim tag");
    }
  } else {
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      if (ch === 33) {
        if (!isNamed) {
          tagHandle = state.input.slice(_position - 1, state.position + 1);
          if (!PATTERN_TAG_HANDLE.test(tagHandle)) {
            throwError(state, "named tag handle cannot contain such characters");
          }
          isNamed = true;
          _position = state.position + 1;
        } else {
          throwError(state, "tag suffix cannot contain exclamation marks");
        }
      }
      ch = state.input.charCodeAt(++state.position);
    }
    tagName = state.input.slice(_position, state.position);
    if (PATTERN_FLOW_INDICATORS.test(tagName)) {
      throwError(state, "tag suffix cannot contain flow indicator characters");
    }
  }
  if (tagName && !PATTERN_TAG_URI.test(tagName)) {
    throwError(state, "tag name cannot contain such characters: " + tagName);
  }
  try {
    tagName = decodeURIComponent(tagName);
  } catch (err) {
    throwError(state, "tag name is malformed: " + tagName);
  }
  if (isVerbatim) {
    state.tag = tagName;
  } else if (_hasOwnProperty$1.call(state.tagMap, tagHandle)) {
    state.tag = state.tagMap[tagHandle] + tagName;
  } else if (tagHandle === "!") {
    state.tag = "!" + tagName;
  } else if (tagHandle === "!!") {
    state.tag = "tag:yaml.org,2002:" + tagName;
  } else {
    throwError(state, 'undeclared tag handle "' + tagHandle + '"');
  }
  return true;
}
function readAnchorProperty(state) {
  var _position, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 38) return false;
  if (state.anchor !== null) {
    throwError(state, "duplication of an anchor property");
  }
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an anchor node must contain at least one character");
  }
  state.anchor = state.input.slice(_position, state.position);
  return true;
}
function readAlias(state) {
  var _position, alias, ch;
  ch = state.input.charCodeAt(state.position);
  if (ch !== 42) return false;
  ch = state.input.charCodeAt(++state.position);
  _position = state.position;
  while (ch !== 0 && !is_WS_OR_EOL(ch) && !is_FLOW_INDICATOR(ch)) {
    ch = state.input.charCodeAt(++state.position);
  }
  if (state.position === _position) {
    throwError(state, "name of an alias node must contain at least one character");
  }
  alias = state.input.slice(_position, state.position);
  if (!_hasOwnProperty$1.call(state.anchorMap, alias)) {
    throwError(state, 'unidentified alias "' + alias + '"');
  }
  state.result = state.anchorMap[alias];
  skipSeparationSpace(state, true, -1);
  return true;
}
function composeNode(state, parentIndent, nodeContext, allowToSeek, allowCompact) {
  var allowBlockStyles, allowBlockScalars, allowBlockCollections, indentStatus = 1, atNewLine = false, hasContent = false, typeIndex, typeQuantity, typeList, type2, flowIndent, blockIndent;
  if (state.listener !== null) {
    state.listener("open", state);
  }
  state.tag = null;
  state.anchor = null;
  state.kind = null;
  state.result = null;
  allowBlockStyles = allowBlockScalars = allowBlockCollections = CONTEXT_BLOCK_OUT === nodeContext || CONTEXT_BLOCK_IN === nodeContext;
  if (allowToSeek) {
    if (skipSeparationSpace(state, true, -1)) {
      atNewLine = true;
      if (state.lineIndent > parentIndent) {
        indentStatus = 1;
      } else if (state.lineIndent === parentIndent) {
        indentStatus = 0;
      } else if (state.lineIndent < parentIndent) {
        indentStatus = -1;
      }
    }
  }
  if (indentStatus === 1) {
    while (readTagProperty(state) || readAnchorProperty(state)) {
      if (skipSeparationSpace(state, true, -1)) {
        atNewLine = true;
        allowBlockCollections = allowBlockStyles;
        if (state.lineIndent > parentIndent) {
          indentStatus = 1;
        } else if (state.lineIndent === parentIndent) {
          indentStatus = 0;
        } else if (state.lineIndent < parentIndent) {
          indentStatus = -1;
        }
      } else {
        allowBlockCollections = false;
      }
    }
  }
  if (allowBlockCollections) {
    allowBlockCollections = atNewLine || allowCompact;
  }
  if (indentStatus === 1 || CONTEXT_BLOCK_OUT === nodeContext) {
    if (CONTEXT_FLOW_IN === nodeContext || CONTEXT_FLOW_OUT === nodeContext) {
      flowIndent = parentIndent;
    } else {
      flowIndent = parentIndent + 1;
    }
    blockIndent = state.position - state.lineStart;
    if (indentStatus === 1) {
      if (allowBlockCollections && (readBlockSequence(state, blockIndent) || readBlockMapping(state, blockIndent, flowIndent)) || readFlowCollection(state, flowIndent)) {
        hasContent = true;
      } else {
        if (allowBlockScalars && readBlockScalar(state, flowIndent) || readSingleQuotedScalar(state, flowIndent) || readDoubleQuotedScalar(state, flowIndent)) {
          hasContent = true;
        } else if (readAlias(state)) {
          hasContent = true;
          if (state.tag !== null || state.anchor !== null) {
            throwError(state, "alias node should not have any properties");
          }
        } else if (readPlainScalar(state, flowIndent, CONTEXT_FLOW_IN === nodeContext)) {
          hasContent = true;
          if (state.tag === null) {
            state.tag = "?";
          }
        }
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
      }
    } else if (indentStatus === 0) {
      hasContent = allowBlockCollections && readBlockSequence(state, blockIndent);
    }
  }
  if (state.tag === null) {
    if (state.anchor !== null) {
      state.anchorMap[state.anchor] = state.result;
    }
  } else if (state.tag === "?") {
    if (state.result !== null && state.kind !== "scalar") {
      throwError(state, 'unacceptable node kind for !<?> tag; it should be "scalar", not "' + state.kind + '"');
    }
    for (typeIndex = 0, typeQuantity = state.implicitTypes.length; typeIndex < typeQuantity; typeIndex += 1) {
      type2 = state.implicitTypes[typeIndex];
      if (type2.resolve(state.result)) {
        state.result = type2.construct(state.result);
        state.tag = type2.tag;
        if (state.anchor !== null) {
          state.anchorMap[state.anchor] = state.result;
        }
        break;
      }
    }
  } else if (state.tag !== "!") {
    if (_hasOwnProperty$1.call(state.typeMap[state.kind || "fallback"], state.tag)) {
      type2 = state.typeMap[state.kind || "fallback"][state.tag];
    } else {
      type2 = null;
      typeList = state.typeMap.multi[state.kind || "fallback"];
      for (typeIndex = 0, typeQuantity = typeList.length; typeIndex < typeQuantity; typeIndex += 1) {
        if (state.tag.slice(0, typeList[typeIndex].tag.length) === typeList[typeIndex].tag) {
          type2 = typeList[typeIndex];
          break;
        }
      }
    }
    if (!type2) {
      throwError(state, "unknown tag !<" + state.tag + ">");
    }
    if (state.result !== null && type2.kind !== state.kind) {
      throwError(state, "unacceptable node kind for !<" + state.tag + '> tag; it should be "' + type2.kind + '", not "' + state.kind + '"');
    }
    if (!type2.resolve(state.result, state.tag)) {
      throwError(state, "cannot resolve a node with !<" + state.tag + "> explicit tag");
    } else {
      state.result = type2.construct(state.result, state.tag);
      if (state.anchor !== null) {
        state.anchorMap[state.anchor] = state.result;
      }
    }
  }
  if (state.listener !== null) {
    state.listener("close", state);
  }
  return state.tag !== null || state.anchor !== null || hasContent;
}
function readDocument(state) {
  var documentStart = state.position, _position, directiveName, directiveArgs, hasDirectives = false, ch;
  state.version = null;
  state.checkLineBreaks = state.legacy;
  state.tagMap = /* @__PURE__ */ Object.create(null);
  state.anchorMap = /* @__PURE__ */ Object.create(null);
  while ((ch = state.input.charCodeAt(state.position)) !== 0) {
    skipSeparationSpace(state, true, -1);
    ch = state.input.charCodeAt(state.position);
    if (state.lineIndent > 0 || ch !== 37) {
      break;
    }
    hasDirectives = true;
    ch = state.input.charCodeAt(++state.position);
    _position = state.position;
    while (ch !== 0 && !is_WS_OR_EOL(ch)) {
      ch = state.input.charCodeAt(++state.position);
    }
    directiveName = state.input.slice(_position, state.position);
    directiveArgs = [];
    if (directiveName.length < 1) {
      throwError(state, "directive name must not be less than one character in length");
    }
    while (ch !== 0) {
      while (is_WHITE_SPACE(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      if (ch === 35) {
        do {
          ch = state.input.charCodeAt(++state.position);
        } while (ch !== 0 && !is_EOL(ch));
        break;
      }
      if (is_EOL(ch)) break;
      _position = state.position;
      while (ch !== 0 && !is_WS_OR_EOL(ch)) {
        ch = state.input.charCodeAt(++state.position);
      }
      directiveArgs.push(state.input.slice(_position, state.position));
    }
    if (ch !== 0) readLineBreak(state);
    if (_hasOwnProperty$1.call(directiveHandlers, directiveName)) {
      directiveHandlers[directiveName](state, directiveName, directiveArgs);
    } else {
      throwWarning(state, 'unknown document directive "' + directiveName + '"');
    }
  }
  skipSeparationSpace(state, true, -1);
  if (state.lineIndent === 0 && state.input.charCodeAt(state.position) === 45 && state.input.charCodeAt(state.position + 1) === 45 && state.input.charCodeAt(state.position + 2) === 45) {
    state.position += 3;
    skipSeparationSpace(state, true, -1);
  } else if (hasDirectives) {
    throwError(state, "directives end mark is expected");
  }
  composeNode(state, state.lineIndent - 1, CONTEXT_BLOCK_OUT, false, true);
  skipSeparationSpace(state, true, -1);
  if (state.checkLineBreaks && PATTERN_NON_ASCII_LINE_BREAKS.test(state.input.slice(documentStart, state.position))) {
    throwWarning(state, "non-ASCII line breaks are interpreted as content");
  }
  state.documents.push(state.result);
  if (state.position === state.lineStart && testDocumentSeparator(state)) {
    if (state.input.charCodeAt(state.position) === 46) {
      state.position += 3;
      skipSeparationSpace(state, true, -1);
    }
    return;
  }
  if (state.position < state.length - 1) {
    throwError(state, "end of the stream or a document separator is expected");
  } else {
    return;
  }
}
function loadDocuments(input, options8) {
  input = String(input);
  options8 = options8 || {};
  if (input.length !== 0) {
    if (input.charCodeAt(input.length - 1) !== 10 && input.charCodeAt(input.length - 1) !== 13) {
      input += "\n";
    }
    if (input.charCodeAt(0) === 65279) {
      input = input.slice(1);
    }
  }
  var state = new State$1(input, options8);
  var nullpos = input.indexOf("\0");
  if (nullpos !== -1) {
    state.position = nullpos;
    throwError(state, "null byte is not allowed in input");
  }
  state.input += "\0";
  while (state.input.charCodeAt(state.position) === 32) {
    state.lineIndent += 1;
    state.position += 1;
  }
  while (state.position < state.length - 1) {
    readDocument(state);
  }
  return state.documents;
}
function loadAll$1(input, iterator, options8) {
  if (iterator !== null && typeof iterator === "object" && typeof options8 === "undefined") {
    options8 = iterator;
    iterator = null;
  }
  var documents = loadDocuments(input, options8);
  if (typeof iterator !== "function") {
    return documents;
  }
  for (var index = 0, length = documents.length; index < length; index += 1) {
    iterator(documents[index]);
  }
}
function load$1(input, options8) {
  var documents = loadDocuments(input, options8);
  if (documents.length === 0) {
    return void 0;
  } else if (documents.length === 1) {
    return documents[0];
  }
  throw new exception("expected a single document in the stream, but found more");
}
var loadAll_1 = loadAll$1;
var load_1 = load$1;
var loader = {
  loadAll: loadAll_1,
  load: load_1
};
var ESCAPE_SEQUENCES = {};
ESCAPE_SEQUENCES[0] = "\\0";
ESCAPE_SEQUENCES[7] = "\\a";
ESCAPE_SEQUENCES[8] = "\\b";
ESCAPE_SEQUENCES[9] = "\\t";
ESCAPE_SEQUENCES[10] = "\\n";
ESCAPE_SEQUENCES[11] = "\\v";
ESCAPE_SEQUENCES[12] = "\\f";
ESCAPE_SEQUENCES[13] = "\\r";
ESCAPE_SEQUENCES[27] = "\\e";
ESCAPE_SEQUENCES[34] = '\\"';
ESCAPE_SEQUENCES[92] = "\\\\";
ESCAPE_SEQUENCES[133] = "\\N";
ESCAPE_SEQUENCES[160] = "\\_";
ESCAPE_SEQUENCES[8232] = "\\L";
ESCAPE_SEQUENCES[8233] = "\\P";
function renamed(from, to) {
  return function() {
    throw new Error("Function yaml." + from + " is removed in js-yaml 4. Use yaml." + to + " instead, which is now safe by default.");
  };
}
var load = loader.load;
var loadAll = loader.loadAll;
var safeLoad = renamed("safeLoad", "load");
var safeLoadAll = renamed("safeLoadAll", "loadAll");
var safeDump = renamed("safeDump", "dump");

// node_modules/json5/dist/index.mjs
var Space_Separator = /[\u1680\u2000-\u200A\u202F\u205F\u3000]/;
var ID_Start = /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0370-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u05D0-\u05EA\u05F0-\u05F2\u0620-\u064A\u066E\u066F\u0671-\u06D3\u06D5\u06E5\u06E6\u06EE\u06EF\u06FA-\u06FC\u06FF\u0710\u0712-\u072F\u074D-\u07A5\u07B1\u07CA-\u07EA\u07F4\u07F5\u07FA\u0800-\u0815\u081A\u0824\u0828\u0840-\u0858\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u0904-\u0939\u093D\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BD\u09CE\u09DC\u09DD\u09DF-\u09E1\u09F0\u09F1\u09FC\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A59-\u0A5C\u0A5E\u0A72-\u0A74\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABD\u0AD0\u0AE0\u0AE1\u0AF9\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3D\u0B5C\u0B5D\u0B5F-\u0B61\u0B71\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BD0\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D\u0C58-\u0C5A\u0C60\u0C61\u0C80\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBD\u0CDE\u0CE0\u0CE1\u0CF1\u0CF2\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D3A\u0D3D\u0D4E\u0D54-\u0D56\u0D5F-\u0D61\u0D7A-\u0D7F\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0E01-\u0E30\u0E32\u0E33\u0E40-\u0E46\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB0\u0EB2\u0EB3\u0EBD\u0EC0-\u0EC4\u0EC6\u0EDC-\u0EDF\u0F00\u0F40-\u0F47\u0F49-\u0F6C\u0F88-\u0F8C\u1000-\u102A\u103F\u1050-\u1055\u105A-\u105D\u1061\u1065\u1066\u106E-\u1070\u1075-\u1081\u108E\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176C\u176E-\u1770\u1780-\u17B3\u17D7\u17DC\u1820-\u1877\u1880-\u1884\u1887-\u18A8\u18AA\u18B0-\u18F5\u1900-\u191E\u1950-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u1A00-\u1A16\u1A20-\u1A54\u1AA7\u1B05-\u1B33\u1B45-\u1B4B\u1B83-\u1BA0\u1BAE\u1BAF\u1BBA-\u1BE5\u1C00-\u1C23\u1C4D-\u1C4F\u1C5A-\u1C7D\u1C80-\u1C88\u1CE9-\u1CEC\u1CEE-\u1CF1\u1CF5\u1CF6\u1D00-\u1DBF\u1E00-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u2071\u207F\u2090-\u209C\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CEE\u2CF2\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D80-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2E2F\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303C\u3041-\u3096\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312E\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEA\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA61F\uA62A\uA62B\uA640-\uA66E\uA67F-\uA69D\uA6A0-\uA6EF\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA801\uA803-\uA805\uA807-\uA80A\uA80C-\uA822\uA840-\uA873\uA882-\uA8B3\uA8F2-\uA8F7\uA8FB\uA8FD\uA90A-\uA925\uA930-\uA946\uA960-\uA97C\uA984-\uA9B2\uA9CF\uA9E0-\uA9E4\uA9E6-\uA9EF\uA9FA-\uA9FE\uAA00-\uAA28\uAA40-\uAA42\uAA44-\uAA4B\uAA60-\uAA76\uAA7A\uAA7E-\uAAAF\uAAB1\uAAB5\uAAB6\uAAB9-\uAABD\uAAC0\uAAC2\uAADB-\uAADD\uAAE0-\uAAEA\uAAF2-\uAAF4\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABE2\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D\uFB1F-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE70-\uFE74\uFE76-\uFEFC\uFF21-\uFF3A\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDE80-\uDE9C\uDEA0-\uDED0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF75\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00\uDE10-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE4\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC03-\uDC37\uDC83-\uDCAF\uDCD0-\uDCE8\uDD03-\uDD26\uDD50-\uDD72\uDD76\uDD83-\uDDB2\uDDC1-\uDDC4\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE2B\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEDE\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3D\uDF50\uDF5D-\uDF61]|\uD805[\uDC00-\uDC34\uDC47-\uDC4A\uDC80-\uDCAF\uDCC4\uDCC5\uDCC7\uDD80-\uDDAE\uDDD8-\uDDDB\uDE00-\uDE2F\uDE44\uDE80-\uDEAA\uDF00-\uDF19]|\uD806[\uDCA0-\uDCDF\uDCFF\uDE00\uDE0B-\uDE32\uDE3A\uDE50\uDE5C-\uDE83\uDE86-\uDE89\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC2E\uDC40\uDC72-\uDC8F\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD30\uDD46]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDED0-\uDEED\uDF00-\uDF2F\uDF40-\uDF43\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50\uDF93-\uDF9F\uDFE0\uDFE1]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB]|\uD83A[\uDC00-\uDCC4\uDD00-\uDD43]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]/;
var ID_Continue = /[\xAA\xB5\xBA\xC0-\xD6\xD8-\xF6\xF8-\u02C1\u02C6-\u02D1\u02E0-\u02E4\u02EC\u02EE\u0300-\u0374\u0376\u0377\u037A-\u037D\u037F\u0386\u0388-\u038A\u038C\u038E-\u03A1\u03A3-\u03F5\u03F7-\u0481\u0483-\u0487\u048A-\u052F\u0531-\u0556\u0559\u0561-\u0587\u0591-\u05BD\u05BF\u05C1\u05C2\u05C4\u05C5\u05C7\u05D0-\u05EA\u05F0-\u05F2\u0610-\u061A\u0620-\u0669\u066E-\u06D3\u06D5-\u06DC\u06DF-\u06E8\u06EA-\u06FC\u06FF\u0710-\u074A\u074D-\u07B1\u07C0-\u07F5\u07FA\u0800-\u082D\u0840-\u085B\u0860-\u086A\u08A0-\u08B4\u08B6-\u08BD\u08D4-\u08E1\u08E3-\u0963\u0966-\u096F\u0971-\u0983\u0985-\u098C\u098F\u0990\u0993-\u09A8\u09AA-\u09B0\u09B2\u09B6-\u09B9\u09BC-\u09C4\u09C7\u09C8\u09CB-\u09CE\u09D7\u09DC\u09DD\u09DF-\u09E3\u09E6-\u09F1\u09FC\u0A01-\u0A03\u0A05-\u0A0A\u0A0F\u0A10\u0A13-\u0A28\u0A2A-\u0A30\u0A32\u0A33\u0A35\u0A36\u0A38\u0A39\u0A3C\u0A3E-\u0A42\u0A47\u0A48\u0A4B-\u0A4D\u0A51\u0A59-\u0A5C\u0A5E\u0A66-\u0A75\u0A81-\u0A83\u0A85-\u0A8D\u0A8F-\u0A91\u0A93-\u0AA8\u0AAA-\u0AB0\u0AB2\u0AB3\u0AB5-\u0AB9\u0ABC-\u0AC5\u0AC7-\u0AC9\u0ACB-\u0ACD\u0AD0\u0AE0-\u0AE3\u0AE6-\u0AEF\u0AF9-\u0AFF\u0B01-\u0B03\u0B05-\u0B0C\u0B0F\u0B10\u0B13-\u0B28\u0B2A-\u0B30\u0B32\u0B33\u0B35-\u0B39\u0B3C-\u0B44\u0B47\u0B48\u0B4B-\u0B4D\u0B56\u0B57\u0B5C\u0B5D\u0B5F-\u0B63\u0B66-\u0B6F\u0B71\u0B82\u0B83\u0B85-\u0B8A\u0B8E-\u0B90\u0B92-\u0B95\u0B99\u0B9A\u0B9C\u0B9E\u0B9F\u0BA3\u0BA4\u0BA8-\u0BAA\u0BAE-\u0BB9\u0BBE-\u0BC2\u0BC6-\u0BC8\u0BCA-\u0BCD\u0BD0\u0BD7\u0BE6-\u0BEF\u0C00-\u0C03\u0C05-\u0C0C\u0C0E-\u0C10\u0C12-\u0C28\u0C2A-\u0C39\u0C3D-\u0C44\u0C46-\u0C48\u0C4A-\u0C4D\u0C55\u0C56\u0C58-\u0C5A\u0C60-\u0C63\u0C66-\u0C6F\u0C80-\u0C83\u0C85-\u0C8C\u0C8E-\u0C90\u0C92-\u0CA8\u0CAA-\u0CB3\u0CB5-\u0CB9\u0CBC-\u0CC4\u0CC6-\u0CC8\u0CCA-\u0CCD\u0CD5\u0CD6\u0CDE\u0CE0-\u0CE3\u0CE6-\u0CEF\u0CF1\u0CF2\u0D00-\u0D03\u0D05-\u0D0C\u0D0E-\u0D10\u0D12-\u0D44\u0D46-\u0D48\u0D4A-\u0D4E\u0D54-\u0D57\u0D5F-\u0D63\u0D66-\u0D6F\u0D7A-\u0D7F\u0D82\u0D83\u0D85-\u0D96\u0D9A-\u0DB1\u0DB3-\u0DBB\u0DBD\u0DC0-\u0DC6\u0DCA\u0DCF-\u0DD4\u0DD6\u0DD8-\u0DDF\u0DE6-\u0DEF\u0DF2\u0DF3\u0E01-\u0E3A\u0E40-\u0E4E\u0E50-\u0E59\u0E81\u0E82\u0E84\u0E87\u0E88\u0E8A\u0E8D\u0E94-\u0E97\u0E99-\u0E9F\u0EA1-\u0EA3\u0EA5\u0EA7\u0EAA\u0EAB\u0EAD-\u0EB9\u0EBB-\u0EBD\u0EC0-\u0EC4\u0EC6\u0EC8-\u0ECD\u0ED0-\u0ED9\u0EDC-\u0EDF\u0F00\u0F18\u0F19\u0F20-\u0F29\u0F35\u0F37\u0F39\u0F3E-\u0F47\u0F49-\u0F6C\u0F71-\u0F84\u0F86-\u0F97\u0F99-\u0FBC\u0FC6\u1000-\u1049\u1050-\u109D\u10A0-\u10C5\u10C7\u10CD\u10D0-\u10FA\u10FC-\u1248\u124A-\u124D\u1250-\u1256\u1258\u125A-\u125D\u1260-\u1288\u128A-\u128D\u1290-\u12B0\u12B2-\u12B5\u12B8-\u12BE\u12C0\u12C2-\u12C5\u12C8-\u12D6\u12D8-\u1310\u1312-\u1315\u1318-\u135A\u135D-\u135F\u1380-\u138F\u13A0-\u13F5\u13F8-\u13FD\u1401-\u166C\u166F-\u167F\u1681-\u169A\u16A0-\u16EA\u16EE-\u16F8\u1700-\u170C\u170E-\u1714\u1720-\u1734\u1740-\u1753\u1760-\u176C\u176E-\u1770\u1772\u1773\u1780-\u17D3\u17D7\u17DC\u17DD\u17E0-\u17E9\u180B-\u180D\u1810-\u1819\u1820-\u1877\u1880-\u18AA\u18B0-\u18F5\u1900-\u191E\u1920-\u192B\u1930-\u193B\u1946-\u196D\u1970-\u1974\u1980-\u19AB\u19B0-\u19C9\u19D0-\u19D9\u1A00-\u1A1B\u1A20-\u1A5E\u1A60-\u1A7C\u1A7F-\u1A89\u1A90-\u1A99\u1AA7\u1AB0-\u1ABD\u1B00-\u1B4B\u1B50-\u1B59\u1B6B-\u1B73\u1B80-\u1BF3\u1C00-\u1C37\u1C40-\u1C49\u1C4D-\u1C7D\u1C80-\u1C88\u1CD0-\u1CD2\u1CD4-\u1CF9\u1D00-\u1DF9\u1DFB-\u1F15\u1F18-\u1F1D\u1F20-\u1F45\u1F48-\u1F4D\u1F50-\u1F57\u1F59\u1F5B\u1F5D\u1F5F-\u1F7D\u1F80-\u1FB4\u1FB6-\u1FBC\u1FBE\u1FC2-\u1FC4\u1FC6-\u1FCC\u1FD0-\u1FD3\u1FD6-\u1FDB\u1FE0-\u1FEC\u1FF2-\u1FF4\u1FF6-\u1FFC\u203F\u2040\u2054\u2071\u207F\u2090-\u209C\u20D0-\u20DC\u20E1\u20E5-\u20F0\u2102\u2107\u210A-\u2113\u2115\u2119-\u211D\u2124\u2126\u2128\u212A-\u212D\u212F-\u2139\u213C-\u213F\u2145-\u2149\u214E\u2160-\u2188\u2C00-\u2C2E\u2C30-\u2C5E\u2C60-\u2CE4\u2CEB-\u2CF3\u2D00-\u2D25\u2D27\u2D2D\u2D30-\u2D67\u2D6F\u2D7F-\u2D96\u2DA0-\u2DA6\u2DA8-\u2DAE\u2DB0-\u2DB6\u2DB8-\u2DBE\u2DC0-\u2DC6\u2DC8-\u2DCE\u2DD0-\u2DD6\u2DD8-\u2DDE\u2DE0-\u2DFF\u2E2F\u3005-\u3007\u3021-\u302F\u3031-\u3035\u3038-\u303C\u3041-\u3096\u3099\u309A\u309D-\u309F\u30A1-\u30FA\u30FC-\u30FF\u3105-\u312E\u3131-\u318E\u31A0-\u31BA\u31F0-\u31FF\u3400-\u4DB5\u4E00-\u9FEA\uA000-\uA48C\uA4D0-\uA4FD\uA500-\uA60C\uA610-\uA62B\uA640-\uA66F\uA674-\uA67D\uA67F-\uA6F1\uA717-\uA71F\uA722-\uA788\uA78B-\uA7AE\uA7B0-\uA7B7\uA7F7-\uA827\uA840-\uA873\uA880-\uA8C5\uA8D0-\uA8D9\uA8E0-\uA8F7\uA8FB\uA8FD\uA900-\uA92D\uA930-\uA953\uA960-\uA97C\uA980-\uA9C0\uA9CF-\uA9D9\uA9E0-\uA9FE\uAA00-\uAA36\uAA40-\uAA4D\uAA50-\uAA59\uAA60-\uAA76\uAA7A-\uAAC2\uAADB-\uAADD\uAAE0-\uAAEF\uAAF2-\uAAF6\uAB01-\uAB06\uAB09-\uAB0E\uAB11-\uAB16\uAB20-\uAB26\uAB28-\uAB2E\uAB30-\uAB5A\uAB5C-\uAB65\uAB70-\uABEA\uABEC\uABED\uABF0-\uABF9\uAC00-\uD7A3\uD7B0-\uD7C6\uD7CB-\uD7FB\uF900-\uFA6D\uFA70-\uFAD9\uFB00-\uFB06\uFB13-\uFB17\uFB1D-\uFB28\uFB2A-\uFB36\uFB38-\uFB3C\uFB3E\uFB40\uFB41\uFB43\uFB44\uFB46-\uFBB1\uFBD3-\uFD3D\uFD50-\uFD8F\uFD92-\uFDC7\uFDF0-\uFDFB\uFE00-\uFE0F\uFE20-\uFE2F\uFE33\uFE34\uFE4D-\uFE4F\uFE70-\uFE74\uFE76-\uFEFC\uFF10-\uFF19\uFF21-\uFF3A\uFF3F\uFF41-\uFF5A\uFF66-\uFFBE\uFFC2-\uFFC7\uFFCA-\uFFCF\uFFD2-\uFFD7\uFFDA-\uFFDC]|\uD800[\uDC00-\uDC0B\uDC0D-\uDC26\uDC28-\uDC3A\uDC3C\uDC3D\uDC3F-\uDC4D\uDC50-\uDC5D\uDC80-\uDCFA\uDD40-\uDD74\uDDFD\uDE80-\uDE9C\uDEA0-\uDED0\uDEE0\uDF00-\uDF1F\uDF2D-\uDF4A\uDF50-\uDF7A\uDF80-\uDF9D\uDFA0-\uDFC3\uDFC8-\uDFCF\uDFD1-\uDFD5]|\uD801[\uDC00-\uDC9D\uDCA0-\uDCA9\uDCB0-\uDCD3\uDCD8-\uDCFB\uDD00-\uDD27\uDD30-\uDD63\uDE00-\uDF36\uDF40-\uDF55\uDF60-\uDF67]|\uD802[\uDC00-\uDC05\uDC08\uDC0A-\uDC35\uDC37\uDC38\uDC3C\uDC3F-\uDC55\uDC60-\uDC76\uDC80-\uDC9E\uDCE0-\uDCF2\uDCF4\uDCF5\uDD00-\uDD15\uDD20-\uDD39\uDD80-\uDDB7\uDDBE\uDDBF\uDE00-\uDE03\uDE05\uDE06\uDE0C-\uDE13\uDE15-\uDE17\uDE19-\uDE33\uDE38-\uDE3A\uDE3F\uDE60-\uDE7C\uDE80-\uDE9C\uDEC0-\uDEC7\uDEC9-\uDEE6\uDF00-\uDF35\uDF40-\uDF55\uDF60-\uDF72\uDF80-\uDF91]|\uD803[\uDC00-\uDC48\uDC80-\uDCB2\uDCC0-\uDCF2]|\uD804[\uDC00-\uDC46\uDC66-\uDC6F\uDC7F-\uDCBA\uDCD0-\uDCE8\uDCF0-\uDCF9\uDD00-\uDD34\uDD36-\uDD3F\uDD50-\uDD73\uDD76\uDD80-\uDDC4\uDDCA-\uDDCC\uDDD0-\uDDDA\uDDDC\uDE00-\uDE11\uDE13-\uDE37\uDE3E\uDE80-\uDE86\uDE88\uDE8A-\uDE8D\uDE8F-\uDE9D\uDE9F-\uDEA8\uDEB0-\uDEEA\uDEF0-\uDEF9\uDF00-\uDF03\uDF05-\uDF0C\uDF0F\uDF10\uDF13-\uDF28\uDF2A-\uDF30\uDF32\uDF33\uDF35-\uDF39\uDF3C-\uDF44\uDF47\uDF48\uDF4B-\uDF4D\uDF50\uDF57\uDF5D-\uDF63\uDF66-\uDF6C\uDF70-\uDF74]|\uD805[\uDC00-\uDC4A\uDC50-\uDC59\uDC80-\uDCC5\uDCC7\uDCD0-\uDCD9\uDD80-\uDDB5\uDDB8-\uDDC0\uDDD8-\uDDDD\uDE00-\uDE40\uDE44\uDE50-\uDE59\uDE80-\uDEB7\uDEC0-\uDEC9\uDF00-\uDF19\uDF1D-\uDF2B\uDF30-\uDF39]|\uD806[\uDCA0-\uDCE9\uDCFF\uDE00-\uDE3E\uDE47\uDE50-\uDE83\uDE86-\uDE99\uDEC0-\uDEF8]|\uD807[\uDC00-\uDC08\uDC0A-\uDC36\uDC38-\uDC40\uDC50-\uDC59\uDC72-\uDC8F\uDC92-\uDCA7\uDCA9-\uDCB6\uDD00-\uDD06\uDD08\uDD09\uDD0B-\uDD36\uDD3A\uDD3C\uDD3D\uDD3F-\uDD47\uDD50-\uDD59]|\uD808[\uDC00-\uDF99]|\uD809[\uDC00-\uDC6E\uDC80-\uDD43]|[\uD80C\uD81C-\uD820\uD840-\uD868\uD86A-\uD86C\uD86F-\uD872\uD874-\uD879][\uDC00-\uDFFF]|\uD80D[\uDC00-\uDC2E]|\uD811[\uDC00-\uDE46]|\uD81A[\uDC00-\uDE38\uDE40-\uDE5E\uDE60-\uDE69\uDED0-\uDEED\uDEF0-\uDEF4\uDF00-\uDF36\uDF40-\uDF43\uDF50-\uDF59\uDF63-\uDF77\uDF7D-\uDF8F]|\uD81B[\uDF00-\uDF44\uDF50-\uDF7E\uDF8F-\uDF9F\uDFE0\uDFE1]|\uD821[\uDC00-\uDFEC]|\uD822[\uDC00-\uDEF2]|\uD82C[\uDC00-\uDD1E\uDD70-\uDEFB]|\uD82F[\uDC00-\uDC6A\uDC70-\uDC7C\uDC80-\uDC88\uDC90-\uDC99\uDC9D\uDC9E]|\uD834[\uDD65-\uDD69\uDD6D-\uDD72\uDD7B-\uDD82\uDD85-\uDD8B\uDDAA-\uDDAD\uDE42-\uDE44]|\uD835[\uDC00-\uDC54\uDC56-\uDC9C\uDC9E\uDC9F\uDCA2\uDCA5\uDCA6\uDCA9-\uDCAC\uDCAE-\uDCB9\uDCBB\uDCBD-\uDCC3\uDCC5-\uDD05\uDD07-\uDD0A\uDD0D-\uDD14\uDD16-\uDD1C\uDD1E-\uDD39\uDD3B-\uDD3E\uDD40-\uDD44\uDD46\uDD4A-\uDD50\uDD52-\uDEA5\uDEA8-\uDEC0\uDEC2-\uDEDA\uDEDC-\uDEFA\uDEFC-\uDF14\uDF16-\uDF34\uDF36-\uDF4E\uDF50-\uDF6E\uDF70-\uDF88\uDF8A-\uDFA8\uDFAA-\uDFC2\uDFC4-\uDFCB\uDFCE-\uDFFF]|\uD836[\uDE00-\uDE36\uDE3B-\uDE6C\uDE75\uDE84\uDE9B-\uDE9F\uDEA1-\uDEAF]|\uD838[\uDC00-\uDC06\uDC08-\uDC18\uDC1B-\uDC21\uDC23\uDC24\uDC26-\uDC2A]|\uD83A[\uDC00-\uDCC4\uDCD0-\uDCD6\uDD00-\uDD4A\uDD50-\uDD59]|\uD83B[\uDE00-\uDE03\uDE05-\uDE1F\uDE21\uDE22\uDE24\uDE27\uDE29-\uDE32\uDE34-\uDE37\uDE39\uDE3B\uDE42\uDE47\uDE49\uDE4B\uDE4D-\uDE4F\uDE51\uDE52\uDE54\uDE57\uDE59\uDE5B\uDE5D\uDE5F\uDE61\uDE62\uDE64\uDE67-\uDE6A\uDE6C-\uDE72\uDE74-\uDE77\uDE79-\uDE7C\uDE7E\uDE80-\uDE89\uDE8B-\uDE9B\uDEA1-\uDEA3\uDEA5-\uDEA9\uDEAB-\uDEBB]|\uD869[\uDC00-\uDED6\uDF00-\uDFFF]|\uD86D[\uDC00-\uDF34\uDF40-\uDFFF]|\uD86E[\uDC00-\uDC1D\uDC20-\uDFFF]|\uD873[\uDC00-\uDEA1\uDEB0-\uDFFF]|\uD87A[\uDC00-\uDFE0]|\uD87E[\uDC00-\uDE1D]|\uDB40[\uDD00-\uDDEF]/;
var unicode = {
  Space_Separator,
  ID_Start,
  ID_Continue
};
var util = {
  isSpaceSeparator(c2) {
    return typeof c2 === "string" && unicode.Space_Separator.test(c2);
  },
  isIdStartChar(c2) {
    return typeof c2 === "string" && (c2 >= "a" && c2 <= "z" || c2 >= "A" && c2 <= "Z" || c2 === "$" || c2 === "_" || unicode.ID_Start.test(c2));
  },
  isIdContinueChar(c2) {
    return typeof c2 === "string" && (c2 >= "a" && c2 <= "z" || c2 >= "A" && c2 <= "Z" || c2 >= "0" && c2 <= "9" || c2 === "$" || c2 === "_" || c2 === "\u200C" || c2 === "\u200D" || unicode.ID_Continue.test(c2));
  },
  isDigit(c2) {
    return typeof c2 === "string" && /[0-9]/.test(c2);
  },
  isHexDigit(c2) {
    return typeof c2 === "string" && /[0-9A-Fa-f]/.test(c2);
  }
};
var source;
var parseState;
var stack;
var pos;
var line;
var column;
var token;
var key;
var root;
var parse2 = function parse3(text, reviver) {
  source = String(text);
  parseState = "start";
  stack = [];
  pos = 0;
  line = 1;
  column = 0;
  token = void 0;
  key = void 0;
  root = void 0;
  do {
    token = lex();
    parseStates[parseState]();
  } while (token.type !== "eof");
  if (typeof reviver === "function") {
    return internalize({ "": root }, "", reviver);
  }
  return root;
};
function internalize(holder, name, reviver) {
  const value = holder[name];
  if (value != null && typeof value === "object") {
    if (Array.isArray(value)) {
      for (let i = 0; i < value.length; i++) {
        const key2 = String(i);
        const replacement = internalize(value, key2, reviver);
        if (replacement === void 0) {
          delete value[key2];
        } else {
          Object.defineProperty(value, key2, {
            value: replacement,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
    } else {
      for (const key2 in value) {
        const replacement = internalize(value, key2, reviver);
        if (replacement === void 0) {
          delete value[key2];
        } else {
          Object.defineProperty(value, key2, {
            value: replacement,
            writable: true,
            enumerable: true,
            configurable: true
          });
        }
      }
    }
  }
  return reviver.call(holder, name, value);
}
var lexState;
var buffer;
var doubleQuote;
var sign;
var c;
function lex() {
  lexState = "default";
  buffer = "";
  doubleQuote = false;
  sign = 1;
  for (; ; ) {
    c = peek();
    const token2 = lexStates[lexState]();
    if (token2) {
      return token2;
    }
  }
}
function peek() {
  if (source[pos]) {
    return String.fromCodePoint(source.codePointAt(pos));
  }
}
function read() {
  const c2 = peek();
  if (c2 === "\n") {
    line++;
    column = 0;
  } else if (c2) {
    column += c2.length;
  } else {
    column++;
  }
  if (c2) {
    pos += c2.length;
  }
  return c2;
}
var lexStates = {
  default() {
    switch (c) {
      case "	":
      case "\v":
      case "\f":
      case " ":
      case "\xA0":
      case "\uFEFF":
      case "\n":
      case "\r":
      case "\u2028":
      case "\u2029":
        read();
        return;
      case "/":
        read();
        lexState = "comment";
        return;
      case void 0:
        read();
        return newToken("eof");
    }
    if (util.isSpaceSeparator(c)) {
      read();
      return;
    }
    return lexStates[parseState]();
  },
  comment() {
    switch (c) {
      case "*":
        read();
        lexState = "multiLineComment";
        return;
      case "/":
        read();
        lexState = "singleLineComment";
        return;
    }
    throw invalidChar(read());
  },
  multiLineComment() {
    switch (c) {
      case "*":
        read();
        lexState = "multiLineCommentAsterisk";
        return;
      case void 0:
        throw invalidChar(read());
    }
    read();
  },
  multiLineCommentAsterisk() {
    switch (c) {
      case "*":
        read();
        return;
      case "/":
        read();
        lexState = "default";
        return;
      case void 0:
        throw invalidChar(read());
    }
    read();
    lexState = "multiLineComment";
  },
  singleLineComment() {
    switch (c) {
      case "\n":
      case "\r":
      case "\u2028":
      case "\u2029":
        read();
        lexState = "default";
        return;
      case void 0:
        read();
        return newToken("eof");
    }
    read();
  },
  value() {
    switch (c) {
      case "{":
      case "[":
        return newToken("punctuator", read());
      case "n":
        read();
        literal("ull");
        return newToken("null", null);
      case "t":
        read();
        literal("rue");
        return newToken("boolean", true);
      case "f":
        read();
        literal("alse");
        return newToken("boolean", false);
      case "-":
      case "+":
        if (read() === "-") {
          sign = -1;
        }
        lexState = "sign";
        return;
      case ".":
        buffer = read();
        lexState = "decimalPointLeading";
        return;
      case "0":
        buffer = read();
        lexState = "zero";
        return;
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
        buffer = read();
        lexState = "decimalInteger";
        return;
      case "I":
        read();
        literal("nfinity");
        return newToken("numeric", Infinity);
      case "N":
        read();
        literal("aN");
        return newToken("numeric", NaN);
      case '"':
      case "'":
        doubleQuote = read() === '"';
        buffer = "";
        lexState = "string";
        return;
    }
    throw invalidChar(read());
  },
  identifierNameStartEscape() {
    if (c !== "u") {
      throw invalidChar(read());
    }
    read();
    const u = unicodeEscape();
    switch (u) {
      case "$":
      case "_":
        break;
      default:
        if (!util.isIdStartChar(u)) {
          throw invalidIdentifier();
        }
        break;
    }
    buffer += u;
    lexState = "identifierName";
  },
  identifierName() {
    switch (c) {
      case "$":
      case "_":
      case "\u200C":
      case "\u200D":
        buffer += read();
        return;
      case "\\":
        read();
        lexState = "identifierNameEscape";
        return;
    }
    if (util.isIdContinueChar(c)) {
      buffer += read();
      return;
    }
    return newToken("identifier", buffer);
  },
  identifierNameEscape() {
    if (c !== "u") {
      throw invalidChar(read());
    }
    read();
    const u = unicodeEscape();
    switch (u) {
      case "$":
      case "_":
      case "\u200C":
      case "\u200D":
        break;
      default:
        if (!util.isIdContinueChar(u)) {
          throw invalidIdentifier();
        }
        break;
    }
    buffer += u;
    lexState = "identifierName";
  },
  sign() {
    switch (c) {
      case ".":
        buffer = read();
        lexState = "decimalPointLeading";
        return;
      case "0":
        buffer = read();
        lexState = "zero";
        return;
      case "1":
      case "2":
      case "3":
      case "4":
      case "5":
      case "6":
      case "7":
      case "8":
      case "9":
        buffer = read();
        lexState = "decimalInteger";
        return;
      case "I":
        read();
        literal("nfinity");
        return newToken("numeric", sign * Infinity);
      case "N":
        read();
        literal("aN");
        return newToken("numeric", NaN);
    }
    throw invalidChar(read());
  },
  zero() {
    switch (c) {
      case ".":
        buffer += read();
        lexState = "decimalPoint";
        return;
      case "e":
      case "E":
        buffer += read();
        lexState = "decimalExponent";
        return;
      case "x":
      case "X":
        buffer += read();
        lexState = "hexadecimal";
        return;
    }
    return newToken("numeric", sign * 0);
  },
  decimalInteger() {
    switch (c) {
      case ".":
        buffer += read();
        lexState = "decimalPoint";
        return;
      case "e":
      case "E":
        buffer += read();
        lexState = "decimalExponent";
        return;
    }
    if (util.isDigit(c)) {
      buffer += read();
      return;
    }
    return newToken("numeric", sign * Number(buffer));
  },
  decimalPointLeading() {
    if (util.isDigit(c)) {
      buffer += read();
      lexState = "decimalFraction";
      return;
    }
    throw invalidChar(read());
  },
  decimalPoint() {
    switch (c) {
      case "e":
      case "E":
        buffer += read();
        lexState = "decimalExponent";
        return;
    }
    if (util.isDigit(c)) {
      buffer += read();
      lexState = "decimalFraction";
      return;
    }
    return newToken("numeric", sign * Number(buffer));
  },
  decimalFraction() {
    switch (c) {
      case "e":
      case "E":
        buffer += read();
        lexState = "decimalExponent";
        return;
    }
    if (util.isDigit(c)) {
      buffer += read();
      return;
    }
    return newToken("numeric", sign * Number(buffer));
  },
  decimalExponent() {
    switch (c) {
      case "+":
      case "-":
        buffer += read();
        lexState = "decimalExponentSign";
        return;
    }
    if (util.isDigit(c)) {
      buffer += read();
      lexState = "decimalExponentInteger";
      return;
    }
    throw invalidChar(read());
  },
  decimalExponentSign() {
    if (util.isDigit(c)) {
      buffer += read();
      lexState = "decimalExponentInteger";
      return;
    }
    throw invalidChar(read());
  },
  decimalExponentInteger() {
    if (util.isDigit(c)) {
      buffer += read();
      return;
    }
    return newToken("numeric", sign * Number(buffer));
  },
  hexadecimal() {
    if (util.isHexDigit(c)) {
      buffer += read();
      lexState = "hexadecimalInteger";
      return;
    }
    throw invalidChar(read());
  },
  hexadecimalInteger() {
    if (util.isHexDigit(c)) {
      buffer += read();
      return;
    }
    return newToken("numeric", sign * Number(buffer));
  },
  string() {
    switch (c) {
      case "\\":
        read();
        buffer += escape();
        return;
      case '"':
        if (doubleQuote) {
          read();
          return newToken("string", buffer);
        }
        buffer += read();
        return;
      case "'":
        if (!doubleQuote) {
          read();
          return newToken("string", buffer);
        }
        buffer += read();
        return;
      case "\n":
      case "\r":
        throw invalidChar(read());
      case "\u2028":
      case "\u2029":
        separatorChar(c);
        break;
      case void 0:
        throw invalidChar(read());
    }
    buffer += read();
  },
  start() {
    switch (c) {
      case "{":
      case "[":
        return newToken("punctuator", read());
    }
    lexState = "value";
  },
  beforePropertyName() {
    switch (c) {
      case "$":
      case "_":
        buffer = read();
        lexState = "identifierName";
        return;
      case "\\":
        read();
        lexState = "identifierNameStartEscape";
        return;
      case "}":
        return newToken("punctuator", read());
      case '"':
      case "'":
        doubleQuote = read() === '"';
        lexState = "string";
        return;
    }
    if (util.isIdStartChar(c)) {
      buffer += read();
      lexState = "identifierName";
      return;
    }
    throw invalidChar(read());
  },
  afterPropertyName() {
    if (c === ":") {
      return newToken("punctuator", read());
    }
    throw invalidChar(read());
  },
  beforePropertyValue() {
    lexState = "value";
  },
  afterPropertyValue() {
    switch (c) {
      case ",":
      case "}":
        return newToken("punctuator", read());
    }
    throw invalidChar(read());
  },
  beforeArrayValue() {
    if (c === "]") {
      return newToken("punctuator", read());
    }
    lexState = "value";
  },
  afterArrayValue() {
    switch (c) {
      case ",":
      case "]":
        return newToken("punctuator", read());
    }
    throw invalidChar(read());
  },
  end() {
    throw invalidChar(read());
  }
};
function newToken(type2, value) {
  return {
    type: type2,
    value,
    line,
    column
  };
}
function literal(s) {
  for (const c2 of s) {
    const p = peek();
    if (p !== c2) {
      throw invalidChar(read());
    }
    read();
  }
}
function escape() {
  const c2 = peek();
  switch (c2) {
    case "b":
      read();
      return "\b";
    case "f":
      read();
      return "\f";
    case "n":
      read();
      return "\n";
    case "r":
      read();
      return "\r";
    case "t":
      read();
      return "	";
    case "v":
      read();
      return "\v";
    case "0":
      read();
      if (util.isDigit(peek())) {
        throw invalidChar(read());
      }
      return "\0";
    case "x":
      read();
      return hexEscape();
    case "u":
      read();
      return unicodeEscape();
    case "\n":
    case "\u2028":
    case "\u2029":
      read();
      return "";
    case "\r":
      read();
      if (peek() === "\n") {
        read();
      }
      return "";
    case "1":
    case "2":
    case "3":
    case "4":
    case "5":
    case "6":
    case "7":
    case "8":
    case "9":
      throw invalidChar(read());
    case void 0:
      throw invalidChar(read());
  }
  return read();
}
function hexEscape() {
  let buffer2 = "";
  let c2 = peek();
  if (!util.isHexDigit(c2)) {
    throw invalidChar(read());
  }
  buffer2 += read();
  c2 = peek();
  if (!util.isHexDigit(c2)) {
    throw invalidChar(read());
  }
  buffer2 += read();
  return String.fromCodePoint(parseInt(buffer2, 16));
}
function unicodeEscape() {
  let buffer2 = "";
  let count = 4;
  while (count-- > 0) {
    const c2 = peek();
    if (!util.isHexDigit(c2)) {
      throw invalidChar(read());
    }
    buffer2 += read();
  }
  return String.fromCodePoint(parseInt(buffer2, 16));
}
var parseStates = {
  start() {
    if (token.type === "eof") {
      throw invalidEOF();
    }
    push();
  },
  beforePropertyName() {
    switch (token.type) {
      case "identifier":
      case "string":
        key = token.value;
        parseState = "afterPropertyName";
        return;
      case "punctuator":
        pop();
        return;
      case "eof":
        throw invalidEOF();
    }
  },
  afterPropertyName() {
    if (token.type === "eof") {
      throw invalidEOF();
    }
    parseState = "beforePropertyValue";
  },
  beforePropertyValue() {
    if (token.type === "eof") {
      throw invalidEOF();
    }
    push();
  },
  beforeArrayValue() {
    if (token.type === "eof") {
      throw invalidEOF();
    }
    if (token.type === "punctuator" && token.value === "]") {
      pop();
      return;
    }
    push();
  },
  afterPropertyValue() {
    if (token.type === "eof") {
      throw invalidEOF();
    }
    switch (token.value) {
      case ",":
        parseState = "beforePropertyName";
        return;
      case "}":
        pop();
    }
  },
  afterArrayValue() {
    if (token.type === "eof") {
      throw invalidEOF();
    }
    switch (token.value) {
      case ",":
        parseState = "beforeArrayValue";
        return;
      case "]":
        pop();
    }
  },
  end() {
  }
};
function push() {
  let value;
  switch (token.type) {
    case "punctuator":
      switch (token.value) {
        case "{":
          value = {};
          break;
        case "[":
          value = [];
          break;
      }
      break;
    case "null":
    case "boolean":
    case "numeric":
    case "string":
      value = token.value;
      break;
  }
  if (root === void 0) {
    root = value;
  } else {
    const parent = stack[stack.length - 1];
    if (Array.isArray(parent)) {
      parent.push(value);
    } else {
      Object.defineProperty(parent, key, {
        value,
        writable: true,
        enumerable: true,
        configurable: true
      });
    }
  }
  if (value !== null && typeof value === "object") {
    stack.push(value);
    if (Array.isArray(value)) {
      parseState = "beforeArrayValue";
    } else {
      parseState = "beforePropertyName";
    }
  } else {
    const current = stack[stack.length - 1];
    if (current == null) {
      parseState = "end";
    } else if (Array.isArray(current)) {
      parseState = "afterArrayValue";
    } else {
      parseState = "afterPropertyValue";
    }
  }
}
function pop() {
  stack.pop();
  const current = stack[stack.length - 1];
  if (current == null) {
    parseState = "end";
  } else if (Array.isArray(current)) {
    parseState = "afterArrayValue";
  } else {
    parseState = "afterPropertyValue";
  }
}
function invalidChar(c2) {
  if (c2 === void 0) {
    return syntaxError(`JSON5: invalid end of input at ${line}:${column}`);
  }
  return syntaxError(`JSON5: invalid character '${formatChar(c2)}' at ${line}:${column}`);
}
function invalidEOF() {
  return syntaxError(`JSON5: invalid end of input at ${line}:${column}`);
}
function invalidIdentifier() {
  column -= 5;
  return syntaxError(`JSON5: invalid identifier character at ${line}:${column}`);
}
function separatorChar(c2) {
  console.warn(`JSON5: '${formatChar(c2)}' in strings is not valid ECMAScript; consider escaping`);
}
function formatChar(c2) {
  const replacements = {
    "'": "\\'",
    '"': '\\"',
    "\\": "\\\\",
    "\b": "\\b",
    "\f": "\\f",
    "\n": "\\n",
    "\r": "\\r",
    "	": "\\t",
    "\v": "\\v",
    "\0": "\\0",
    "\u2028": "\\u2028",
    "\u2029": "\\u2029"
  };
  if (replacements[c2]) {
    return replacements[c2];
  }
  if (c2 < " ") {
    const hexString = c2.charCodeAt(0).toString(16);
    return "\\x" + ("00" + hexString).substring(hexString.length);
  }
  return c2;
}
function syntaxError(message) {
  const err = new SyntaxError(message);
  err.lineNumber = line;
  err.columnNumber = column;
  return err;
}
var dist_default = { parse: parse2 };

// node_modules/parse-json/index.js
var import_code_frame = __toESM(require_lib3(), 1);

// node_modules/index-to-position/index.js
var safeLastIndexOf = (string, searchString, index) => index < 0 ? -1 : string.lastIndexOf(searchString, index);
function getPosition(text, textIndex) {
  const lineBreakBefore = safeLastIndexOf(text, "\n", textIndex - 1);
  const column2 = textIndex - lineBreakBefore - 1;
  let line3 = 0;
  for (let index = lineBreakBefore; index >= 0; index = safeLastIndexOf(text, "\n", index - 1)) {
    line3++;
  }
  return { line: line3, column: column2 };
}
function indexToLineColumn(text, textIndex, { oneBased = false } = {}) {
  if (textIndex < 0 || textIndex >= text.length && text.length > 0) {
    throw new RangeError("Index out of bounds");
  }
  const position = getPosition(text, textIndex);
  return oneBased ? { line: position.line + 1, column: position.column + 1 } : position;
}

// node_modules/parse-json/index.js
var getCodePoint = (character) => `\\u{${character.codePointAt(0).toString(16)}}`;
var _message;
var _JSONError = class _JSONError extends Error {
  constructor(message) {
    var _a;
    super();
    __publicField(this, "name", "JSONError");
    __publicField(this, "fileName");
    __publicField(this, "codeFrame");
    __publicField(this, "rawCodeFrame");
    __privateAdd(this, _message);
    __privateSet(this, _message, message);
    (_a = Error.captureStackTrace) == null ? void 0 : _a.call(Error, this, _JSONError);
  }
  get message() {
    const { fileName, codeFrame } = this;
    return `${__privateGet(this, _message)}${fileName ? ` in ${fileName}` : ""}${codeFrame ? `

${codeFrame}
` : ""}`;
  }
  set message(message) {
    __privateSet(this, _message, message);
  }
};
_message = new WeakMap();
var JSONError = _JSONError;
var generateCodeFrame = (string, location, highlightCode = true) => (0, import_code_frame.codeFrameColumns)(string, { start: location }, { highlightCode });
var getErrorLocation = (string, message) => {
  const match = message.match(/in JSON at position (?<index>\d+)(?: \(line (?<line>\d+) column (?<column>\d+)\))?$/);
  if (!match) {
    return;
  }
  let { index, line: line3, column: column2 } = match.groups;
  if (line3 && column2) {
    return { line: Number(line3), column: Number(column2) };
  }
  index = Number(index);
  if (index === string.length) {
    const { line: line4, column: column3 } = indexToLineColumn(string, string.length - 1, { oneBased: true });
    return { line: line4, column: column3 + 1 };
  }
  return indexToLineColumn(string, index, { oneBased: true });
};
var addCodePointToUnexpectedToken = (message) => message.replace(
  // TODO[engine:node@>=20]: The token always quoted after Node.js 20
  /(?<=^Unexpected token )(?<quote>')?(.)\k<quote>/,
  (_, _quote, token2) => `"${token2}"(${getCodePoint(token2)})`
);
function parseJson(string, reviver, fileName) {
  if (typeof reviver === "string") {
    fileName = reviver;
    reviver = void 0;
  }
  let message;
  try {
    return JSON.parse(string, reviver);
  } catch (error) {
    message = error.message;
  }
  let location;
  if (string) {
    location = getErrorLocation(string, message);
    message = addCodePointToUnexpectedToken(message);
  } else {
    message += " while parsing empty string";
  }
  const jsonError = new JSONError(message);
  jsonError.fileName = fileName;
  if (location) {
    jsonError.codeFrame = generateCodeFrame(string, location);
    jsonError.rawCodeFrame = generateCodeFrame(
      string,
      location,
      /* highlightCode */
      false
    );
  }
  throw jsonError;
}

// src/utils/read-file.js
import fs4 from "fs/promises";
async function readFile(file) {
  if (isUrlString(file)) {
    file = new URL(file);
  }
  try {
    return await fs4.readFile(file, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return;
    }
    throw new Error(`Unable to read '${file}': ${error.message}`);
  }
}
var read_file_default = readFile;

// src/config/prettier-config/loaders.js
async function readJson(file) {
  const content = await read_file_default(file);
  try {
    return parseJson(content);
  } catch (error) {
    error.message = `JSON Error in ${file}:
${error.message}`;
    throw error;
  }
}
async function loadJs(file) {
  const module = await import(pathToFileURL2(file).href);
  return module.default;
}
async function loadConfigFromPackageJson(file) {
  const { prettier } = await readJson(file);
  return prettier;
}
async function loadConfigFromPackageYaml(file) {
  const { prettier } = await loadYaml(file);
  return prettier;
}
async function loadYaml(file) {
  const content = await read_file_default(file);
  try {
    return load(content);
  } catch (error) {
    error.message = `YAML Error in ${file}:
${error.message}`;
    throw error;
  }
}
var loaders = {
  async ".toml"(file) {
    const content = await read_file_default(file);
    try {
      return await (0, import_parse_async.default)(content);
    } catch (error) {
      error.message = `TOML Error in ${file}:
${error.message}`;
      throw error;
    }
  },
  async ".json5"(file) {
    const content = await read_file_default(file);
    try {
      return dist_default.parse(content);
    } catch (error) {
      error.message = `JSON5 Error in ${file}:
${error.message}`;
      throw error;
    }
  },
  ".json": readJson,
  ".js": loadJs,
  ".mjs": loadJs,
  ".cjs": loadJs,
  ".yaml": loadYaml,
  ".yml": loadYaml,
  // No extension
  "": loadYaml
};
var loaders_default = loaders;

// src/config/prettier-config/config-searcher.js
var CONFIG_FILE_NAMES = [
  "package.json",
  "package.yaml",
  ".prettierrc",
  ".prettierrc.json",
  ".prettierrc.yaml",
  ".prettierrc.yml",
  ".prettierrc.json5",
  ".prettierrc.js",
  ".prettierrc.mjs",
  ".prettierrc.cjs",
  "prettier.config.js",
  "prettier.config.mjs",
  "prettier.config.cjs",
  ".prettierrc.toml"
];
async function filter({ name, path: file }) {
  if (!await is_file_default(file)) {
    return false;
  }
  if (name === "package.json") {
    try {
      return Boolean(await loadConfigFromPackageJson(file));
    } catch {
      return false;
    }
  }
  if (name === "package.yaml") {
    try {
      return Boolean(await loadConfigFromPackageYaml(file));
    } catch {
      return false;
    }
  }
  return true;
}
function getSearcher(stopDirectory) {
  return new searcher_default({ names: CONFIG_FILE_NAMES, filter, stopDirectory });
}
var config_searcher_default = getSearcher;

// src/config/prettier-config/load-config.js
import path7 from "path";

// src/utils/import-from-file.js
import { pathToFileURL as pathToFileURL4 } from "url";

// node_modules/import-meta-resolve/lib/resolve.js
import assert3 from "assert";
import { statSync, realpathSync } from "fs";
import process3 from "process";
import { URL as URL2, fileURLToPath as fileURLToPath4, pathToFileURL as pathToFileURL3 } from "url";
import path6 from "path";
import { builtinModules } from "module";

// node_modules/import-meta-resolve/lib/get-format.js
import { fileURLToPath as fileURLToPath3 } from "url";

// node_modules/import-meta-resolve/lib/package-json-reader.js
import fs5 from "fs";
import path5 from "path";
import { fileURLToPath as fileURLToPath2 } from "url";

// node_modules/import-meta-resolve/lib/errors.js
import v8 from "v8";
import assert2 from "assert";
import { format, inspect } from "util";
var own = {}.hasOwnProperty;
var classRegExp = /^([A-Z][a-z\d]*)+$/;
var kTypes = /* @__PURE__ */ new Set([
  "string",
  "function",
  "number",
  "object",
  // Accept 'Function' and 'Object' as alternative to the lower cased version.
  "Function",
  "Object",
  "boolean",
  "bigint",
  "symbol"
]);
var codes = {};
function formatList(array2, type2 = "and") {
  return array2.length < 3 ? array2.join(` ${type2} `) : `${array2.slice(0, -1).join(", ")}, ${type2} ${array2[array2.length - 1]}`;
}
var messages = /* @__PURE__ */ new Map();
var nodeInternalPrefix = "__node_internal_";
var userStackTraceLimit;
codes.ERR_INVALID_ARG_TYPE = createError(
  "ERR_INVALID_ARG_TYPE",
  /**
   * @param {string} name
   * @param {Array<string> | string} expected
   * @param {unknown} actual
   */
  (name, expected, actual) => {
    assert2(typeof name === "string", "'name' must be a string");
    if (!Array.isArray(expected)) {
      expected = [expected];
    }
    let message = "The ";
    if (name.endsWith(" argument")) {
      message += `${name} `;
    } else {
      const type2 = name.includes(".") ? "property" : "argument";
      message += `"${name}" ${type2} `;
    }
    message += "must be ";
    const types = [];
    const instances = [];
    const other = [];
    for (const value of expected) {
      assert2(
        typeof value === "string",
        "All expected entries have to be of type string"
      );
      if (kTypes.has(value)) {
        types.push(value.toLowerCase());
      } else if (classRegExp.exec(value) === null) {
        assert2(
          value !== "object",
          'The value "object" should be written as "Object"'
        );
        other.push(value);
      } else {
        instances.push(value);
      }
    }
    if (instances.length > 0) {
      const pos2 = types.indexOf("object");
      if (pos2 !== -1) {
        types.slice(pos2, 1);
        instances.push("Object");
      }
    }
    if (types.length > 0) {
      message += `${types.length > 1 ? "one of type" : "of type"} ${formatList(
        types,
        "or"
      )}`;
      if (instances.length > 0 || other.length > 0) message += " or ";
    }
    if (instances.length > 0) {
      message += `an instance of ${formatList(instances, "or")}`;
      if (other.length > 0) message += " or ";
    }
    if (other.length > 0) {
      if (other.length > 1) {
        message += `one of ${formatList(other, "or")}`;
      } else {
        if (other[0].toLowerCase() !== other[0]) message += "an ";
        message += `${other[0]}`;
      }
    }
    message += `. Received ${determineSpecificType(actual)}`;
    return message;
  },
  TypeError
);
codes.ERR_INVALID_MODULE_SPECIFIER = createError(
  "ERR_INVALID_MODULE_SPECIFIER",
  /**
   * @param {string} request
   * @param {string} reason
   * @param {string} [base]
   */
  (request, reason, base = void 0) => {
    return `Invalid module "${request}" ${reason}${base ? ` imported from ${base}` : ""}`;
  },
  TypeError
);
codes.ERR_INVALID_PACKAGE_CONFIG = createError(
  "ERR_INVALID_PACKAGE_CONFIG",
  /**
   * @param {string} path
   * @param {string} [base]
   * @param {string} [message]
   */
  (path13, base, message) => {
    return `Invalid package config ${path13}${base ? ` while importing ${base}` : ""}${message ? `. ${message}` : ""}`;
  },
  Error
);
codes.ERR_INVALID_PACKAGE_TARGET = createError(
  "ERR_INVALID_PACKAGE_TARGET",
  /**
   * @param {string} packagePath
   * @param {string} key
   * @param {unknown} target
   * @param {boolean} [isImport=false]
   * @param {string} [base]
   */
  (packagePath, key2, target, isImport = false, base = void 0) => {
    const relatedError = typeof target === "string" && !isImport && target.length > 0 && !target.startsWith("./");
    if (key2 === ".") {
      assert2(isImport === false);
      return `Invalid "exports" main target ${JSON.stringify(target)} defined in the package config ${packagePath}package.json${base ? ` imported from ${base}` : ""}${relatedError ? '; targets must start with "./"' : ""}`;
    }
    return `Invalid "${isImport ? "imports" : "exports"}" target ${JSON.stringify(
      target
    )} defined for '${key2}' in the package config ${packagePath}package.json${base ? ` imported from ${base}` : ""}${relatedError ? '; targets must start with "./"' : ""}`;
  },
  Error
);
codes.ERR_MODULE_NOT_FOUND = createError(
  "ERR_MODULE_NOT_FOUND",
  /**
   * @param {string} path
   * @param {string} base
   * @param {boolean} [exactUrl]
   */
  (path13, base, exactUrl = false) => {
    return `Cannot find ${exactUrl ? "module" : "package"} '${path13}' imported from ${base}`;
  },
  Error
);
codes.ERR_NETWORK_IMPORT_DISALLOWED = createError(
  "ERR_NETWORK_IMPORT_DISALLOWED",
  "import of '%s' by %s is not supported: %s",
  Error
);
codes.ERR_PACKAGE_IMPORT_NOT_DEFINED = createError(
  "ERR_PACKAGE_IMPORT_NOT_DEFINED",
  /**
   * @param {string} specifier
   * @param {string} packagePath
   * @param {string} base
   */
  (specifier, packagePath, base) => {
    return `Package import specifier "${specifier}" is not defined${packagePath ? ` in package ${packagePath}package.json` : ""} imported from ${base}`;
  },
  TypeError
);
codes.ERR_PACKAGE_PATH_NOT_EXPORTED = createError(
  "ERR_PACKAGE_PATH_NOT_EXPORTED",
  /**
   * @param {string} packagePath
   * @param {string} subpath
   * @param {string} [base]
   */
  (packagePath, subpath, base = void 0) => {
    if (subpath === ".")
      return `No "exports" main defined in ${packagePath}package.json${base ? ` imported from ${base}` : ""}`;
    return `Package subpath '${subpath}' is not defined by "exports" in ${packagePath}package.json${base ? ` imported from ${base}` : ""}`;
  },
  Error
);
codes.ERR_UNSUPPORTED_DIR_IMPORT = createError(
  "ERR_UNSUPPORTED_DIR_IMPORT",
  "Directory import '%s' is not supported resolving ES modules imported from %s",
  Error
);
codes.ERR_UNSUPPORTED_RESOLVE_REQUEST = createError(
  "ERR_UNSUPPORTED_RESOLVE_REQUEST",
  'Failed to resolve module specifier "%s" from "%s": Invalid relative URL or base scheme is not hierarchical.',
  TypeError
);
codes.ERR_UNKNOWN_FILE_EXTENSION = createError(
  "ERR_UNKNOWN_FILE_EXTENSION",
  /**
   * @param {string} extension
   * @param {string} path
   */
  (extension, path13) => {
    return `Unknown file extension "${extension}" for ${path13}`;
  },
  TypeError
);
codes.ERR_INVALID_ARG_VALUE = createError(
  "ERR_INVALID_ARG_VALUE",
  /**
   * @param {string} name
   * @param {unknown} value
   * @param {string} [reason='is invalid']
   */
  (name, value, reason = "is invalid") => {
    let inspected = inspect(value);
    if (inspected.length > 128) {
      inspected = `${inspected.slice(0, 128)}...`;
    }
    const type2 = name.includes(".") ? "property" : "argument";
    return `The ${type2} '${name}' ${reason}. Received ${inspected}`;
  },
  TypeError
  // Note: extra classes have been shaken out.
  // , RangeError
);
function createError(sym, value, constructor) {
  messages.set(sym, value);
  return makeNodeErrorWithCode(constructor, sym);
}
function makeNodeErrorWithCode(Base, key2) {
  return NodeError;
  function NodeError(...parameters) {
    const limit = Error.stackTraceLimit;
    if (isErrorStackTraceLimitWritable()) Error.stackTraceLimit = 0;
    const error = new Base();
    if (isErrorStackTraceLimitWritable()) Error.stackTraceLimit = limit;
    const message = getMessage(key2, parameters, error);
    Object.defineProperties(error, {
      // Note: no need to implement `kIsNodeError` symbol, would be hard,
      // probably.
      message: {
        value: message,
        enumerable: false,
        writable: true,
        configurable: true
      },
      toString: {
        /** @this {Error} */
        value() {
          return `${this.name} [${key2}]: ${this.message}`;
        },
        enumerable: false,
        writable: true,
        configurable: true
      }
    });
    captureLargerStackTrace(error);
    error.code = key2;
    return error;
  }
}
function isErrorStackTraceLimitWritable() {
  try {
    if (v8.startupSnapshot.isBuildingSnapshot()) {
      return false;
    }
  } catch {
  }
  const desc = Object.getOwnPropertyDescriptor(Error, "stackTraceLimit");
  if (desc === void 0) {
    return Object.isExtensible(Error);
  }
  return own.call(desc, "writable") && desc.writable !== void 0 ? desc.writable : desc.set !== void 0;
}
function hideStackFrames(wrappedFunction) {
  const hidden = nodeInternalPrefix + wrappedFunction.name;
  Object.defineProperty(wrappedFunction, "name", { value: hidden });
  return wrappedFunction;
}
var captureLargerStackTrace = hideStackFrames(
  /**
   * @param {Error} error
   * @returns {Error}
   */
  // @ts-expect-error: fine
  function(error) {
    const stackTraceLimitIsWritable = isErrorStackTraceLimitWritable();
    if (stackTraceLimitIsWritable) {
      userStackTraceLimit = Error.stackTraceLimit;
      Error.stackTraceLimit = Number.POSITIVE_INFINITY;
    }
    Error.captureStackTrace(error);
    if (stackTraceLimitIsWritable) Error.stackTraceLimit = userStackTraceLimit;
    return error;
  }
);
function getMessage(key2, parameters, self) {
  const message = messages.get(key2);
  assert2(message !== void 0, "expected `message` to be found");
  if (typeof message === "function") {
    assert2(
      message.length <= parameters.length,
      // Default options do not count.
      `Code: ${key2}; The provided arguments length (${parameters.length}) does not match the required ones (${message.length}).`
    );
    return Reflect.apply(message, self, parameters);
  }
  const regex = /%[dfijoOs]/g;
  let expectedLength = 0;
  while (regex.exec(message) !== null) expectedLength++;
  assert2(
    expectedLength === parameters.length,
    `Code: ${key2}; The provided arguments length (${parameters.length}) does not match the required ones (${expectedLength}).`
  );
  if (parameters.length === 0) return message;
  parameters.unshift(message);
  return Reflect.apply(format, null, parameters);
}
function determineSpecificType(value) {
  if (value === null || value === void 0) {
    return String(value);
  }
  if (typeof value === "function" && value.name) {
    return `function ${value.name}`;
  }
  if (typeof value === "object") {
    if (value.constructor && value.constructor.name) {
      return `an instance of ${value.constructor.name}`;
    }
    return `${inspect(value, { depth: -1 })}`;
  }
  let inspected = inspect(value, { colors: false });
  if (inspected.length > 28) {
    inspected = `${inspected.slice(0, 25)}...`;
  }
  return `type ${typeof value} (${inspected})`;
}

// node_modules/import-meta-resolve/lib/package-json-reader.js
var hasOwnProperty = {}.hasOwnProperty;
var { ERR_INVALID_PACKAGE_CONFIG } = codes;
var cache = /* @__PURE__ */ new Map();
function read2(jsonPath, { base, specifier }) {
  const existing = cache.get(jsonPath);
  if (existing) {
    return existing;
  }
  let string;
  try {
    string = fs5.readFileSync(path5.toNamespacedPath(jsonPath), "utf8");
  } catch (error) {
    const exception2 = (
      /** @type {ErrnoException} */
      error
    );
    if (exception2.code !== "ENOENT") {
      throw exception2;
    }
  }
  const result = {
    exists: false,
    pjsonPath: jsonPath,
    main: void 0,
    name: void 0,
    type: "none",
    // Ignore unknown types for forwards compatibility
    exports: void 0,
    imports: void 0
  };
  if (string !== void 0) {
    let parsed;
    try {
      parsed = JSON.parse(string);
    } catch (error_) {
      const cause = (
        /** @type {ErrnoException} */
        error_
      );
      const error = new ERR_INVALID_PACKAGE_CONFIG(
        jsonPath,
        (base ? `"${specifier}" from ` : "") + fileURLToPath2(base || specifier),
        cause.message
      );
      error.cause = cause;
      throw error;
    }
    result.exists = true;
    if (hasOwnProperty.call(parsed, "name") && typeof parsed.name === "string") {
      result.name = parsed.name;
    }
    if (hasOwnProperty.call(parsed, "main") && typeof parsed.main === "string") {
      result.main = parsed.main;
    }
    if (hasOwnProperty.call(parsed, "exports")) {
      result.exports = parsed.exports;
    }
    if (hasOwnProperty.call(parsed, "imports")) {
      result.imports = parsed.imports;
    }
    if (hasOwnProperty.call(parsed, "type") && (parsed.type === "commonjs" || parsed.type === "module")) {
      result.type = parsed.type;
    }
  }
  cache.set(jsonPath, result);
  return result;
}
function getPackageScopeConfig(resolved) {
  let packageJSONUrl = new URL("package.json", resolved);
  while (true) {
    const packageJSONPath2 = packageJSONUrl.pathname;
    if (packageJSONPath2.endsWith("node_modules/package.json")) {
      break;
    }
    const packageConfig = read2(fileURLToPath2(packageJSONUrl), {
      specifier: resolved
    });
    if (packageConfig.exists) {
      return packageConfig;
    }
    const lastPackageJSONUrl = packageJSONUrl;
    packageJSONUrl = new URL("../package.json", packageJSONUrl);
    if (packageJSONUrl.pathname === lastPackageJSONUrl.pathname) {
      break;
    }
  }
  const packageJSONPath = fileURLToPath2(packageJSONUrl);
  return {
    pjsonPath: packageJSONPath,
    exists: false,
    type: "none"
  };
}
function getPackageType(url2) {
  return getPackageScopeConfig(url2).type;
}

// node_modules/import-meta-resolve/lib/get-format.js
var { ERR_UNKNOWN_FILE_EXTENSION } = codes;
var hasOwnProperty2 = {}.hasOwnProperty;
var extensionFormatMap = {
  // @ts-expect-error: hush.
  __proto__: null,
  ".cjs": "commonjs",
  ".js": "module",
  ".json": "json",
  ".mjs": "module"
};
function mimeToFormat(mime) {
  if (mime && /\s*(text|application)\/javascript\s*(;\s*charset=utf-?8\s*)?/i.test(mime))
    return "module";
  if (mime === "application/json") return "json";
  return null;
}
var protocolHandlers = {
  // @ts-expect-error: hush.
  __proto__: null,
  "data:": getDataProtocolModuleFormat,
  "file:": getFileProtocolModuleFormat,
  "http:": getHttpProtocolModuleFormat,
  "https:": getHttpProtocolModuleFormat,
  "node:"() {
    return "builtin";
  }
};
function getDataProtocolModuleFormat(parsed) {
  const { 1: mime } = /^([^/]+\/[^;,]+)[^,]*?(;base64)?,/.exec(
    parsed.pathname
  ) || [null, null, null];
  return mimeToFormat(mime);
}
function extname(url2) {
  const pathname = url2.pathname;
  let index = pathname.length;
  while (index--) {
    const code = pathname.codePointAt(index);
    if (code === 47) {
      return "";
    }
    if (code === 46) {
      return pathname.codePointAt(index - 1) === 47 ? "" : pathname.slice(index);
    }
  }
  return "";
}
function getFileProtocolModuleFormat(url2, _context, ignoreErrors) {
  const value = extname(url2);
  if (value === ".js") {
    const packageType = getPackageType(url2);
    if (packageType !== "none") {
      return packageType;
    }
    return "commonjs";
  }
  if (value === "") {
    const packageType = getPackageType(url2);
    if (packageType === "none" || packageType === "commonjs") {
      return "commonjs";
    }
    return "module";
  }
  const format3 = extensionFormatMap[value];
  if (format3) return format3;
  if (ignoreErrors) {
    return void 0;
  }
  const filepath = fileURLToPath3(url2);
  throw new ERR_UNKNOWN_FILE_EXTENSION(value, filepath);
}
function getHttpProtocolModuleFormat() {
}
function defaultGetFormatWithoutErrors(url2, context) {
  const protocol = url2.protocol;
  if (!hasOwnProperty2.call(protocolHandlers, protocol)) {
    return null;
  }
  return protocolHandlers[protocol](url2, context, true) || null;
}

// node_modules/import-meta-resolve/lib/utils.js
var { ERR_INVALID_ARG_VALUE } = codes;
var DEFAULT_CONDITIONS = Object.freeze(["node", "import"]);
var DEFAULT_CONDITIONS_SET = new Set(DEFAULT_CONDITIONS);
function getDefaultConditions() {
  return DEFAULT_CONDITIONS;
}
function getDefaultConditionsSet() {
  return DEFAULT_CONDITIONS_SET;
}
function getConditionsSet(conditions) {
  if (conditions !== void 0 && conditions !== getDefaultConditions()) {
    if (!Array.isArray(conditions)) {
      throw new ERR_INVALID_ARG_VALUE(
        "conditions",
        conditions,
        "expected an array"
      );
    }
    return new Set(conditions);
  }
  return getDefaultConditionsSet();
}

// node_modules/import-meta-resolve/lib/resolve.js
var RegExpPrototypeSymbolReplace = RegExp.prototype[Symbol.replace];
var {
  ERR_NETWORK_IMPORT_DISALLOWED,
  ERR_INVALID_MODULE_SPECIFIER,
  ERR_INVALID_PACKAGE_CONFIG: ERR_INVALID_PACKAGE_CONFIG2,
  ERR_INVALID_PACKAGE_TARGET,
  ERR_MODULE_NOT_FOUND,
  ERR_PACKAGE_IMPORT_NOT_DEFINED,
  ERR_PACKAGE_PATH_NOT_EXPORTED,
  ERR_UNSUPPORTED_DIR_IMPORT,
  ERR_UNSUPPORTED_RESOLVE_REQUEST
} = codes;
var own2 = {}.hasOwnProperty;
var invalidSegmentRegEx = /(^|\\|\/)((\.|%2e)(\.|%2e)?|(n|%6e|%4e)(o|%6f|%4f)(d|%64|%44)(e|%65|%45)(_|%5f)(m|%6d|%4d)(o|%6f|%4f)(d|%64|%44)(u|%75|%55)(l|%6c|%4c)(e|%65|%45)(s|%73|%53))?(\\|\/|$)/i;
var deprecatedInvalidSegmentRegEx = /(^|\\|\/)((\.|%2e)(\.|%2e)?|(n|%6e|%4e)(o|%6f|%4f)(d|%64|%44)(e|%65|%45)(_|%5f)(m|%6d|%4d)(o|%6f|%4f)(d|%64|%44)(u|%75|%55)(l|%6c|%4c)(e|%65|%45)(s|%73|%53))(\\|\/|$)/i;
var invalidPackageNameRegEx = /^\.|%|\\/;
var patternRegEx = /\*/g;
var encodedSeparatorRegEx = /%2f|%5c/i;
var emittedPackageWarnings = /* @__PURE__ */ new Set();
var doubleSlashRegEx = /[/\\]{2}/;
function emitInvalidSegmentDeprecation(target, request, match, packageJsonUrl, internal, base, isTarget) {
  if (process3.noDeprecation) {
    return;
  }
  const pjsonPath = fileURLToPath4(packageJsonUrl);
  const double = doubleSlashRegEx.exec(isTarget ? target : request) !== null;
  process3.emitWarning(
    `Use of deprecated ${double ? "double slash" : "leading or trailing slash matching"} resolving "${target}" for module request "${request}" ${request === match ? "" : `matched to "${match}" `}in the "${internal ? "imports" : "exports"}" field module resolution of the package at ${pjsonPath}${base ? ` imported from ${fileURLToPath4(base)}` : ""}.`,
    "DeprecationWarning",
    "DEP0166"
  );
}
function emitLegacyIndexDeprecation(url2, packageJsonUrl, base, main) {
  if (process3.noDeprecation) {
    return;
  }
  const format3 = defaultGetFormatWithoutErrors(url2, { parentURL: base.href });
  if (format3 !== "module") return;
  const urlPath = fileURLToPath4(url2.href);
  const packagePath = fileURLToPath4(new URL2(".", packageJsonUrl));
  const basePath = fileURLToPath4(base);
  if (!main) {
    process3.emitWarning(
      `No "main" or "exports" field defined in the package.json for ${packagePath} resolving the main entry point "${urlPath.slice(
        packagePath.length
      )}", imported from ${basePath}.
Default "index" lookups for the main are deprecated for ES modules.`,
      "DeprecationWarning",
      "DEP0151"
    );
  } else if (path6.resolve(packagePath, main) !== urlPath) {
    process3.emitWarning(
      `Package ${packagePath} has a "main" field set to "${main}", excluding the full filename and extension to the resolved file at "${urlPath.slice(
        packagePath.length
      )}", imported from ${basePath}.
 Automatic extension resolution of the "main" field is deprecated for ES modules.`,
      "DeprecationWarning",
      "DEP0151"
    );
  }
}
function tryStatSync(path13) {
  try {
    return statSync(path13);
  } catch {
  }
}
function fileExists(url2) {
  const stats = statSync(url2, { throwIfNoEntry: false });
  const isFile2 = stats ? stats.isFile() : void 0;
  return isFile2 === null || isFile2 === void 0 ? false : isFile2;
}
function legacyMainResolve(packageJsonUrl, packageConfig, base) {
  let guess;
  if (packageConfig.main !== void 0) {
    guess = new URL2(packageConfig.main, packageJsonUrl);
    if (fileExists(guess)) return guess;
    const tries2 = [
      `./${packageConfig.main}.js`,
      `./${packageConfig.main}.json`,
      `./${packageConfig.main}.node`,
      `./${packageConfig.main}/index.js`,
      `./${packageConfig.main}/index.json`,
      `./${packageConfig.main}/index.node`
    ];
    let i2 = -1;
    while (++i2 < tries2.length) {
      guess = new URL2(tries2[i2], packageJsonUrl);
      if (fileExists(guess)) break;
      guess = void 0;
    }
    if (guess) {
      emitLegacyIndexDeprecation(
        guess,
        packageJsonUrl,
        base,
        packageConfig.main
      );
      return guess;
    }
  }
  const tries = ["./index.js", "./index.json", "./index.node"];
  let i = -1;
  while (++i < tries.length) {
    guess = new URL2(tries[i], packageJsonUrl);
    if (fileExists(guess)) break;
    guess = void 0;
  }
  if (guess) {
    emitLegacyIndexDeprecation(guess, packageJsonUrl, base, packageConfig.main);
    return guess;
  }
  throw new ERR_MODULE_NOT_FOUND(
    fileURLToPath4(new URL2(".", packageJsonUrl)),
    fileURLToPath4(base)
  );
}
function finalizeResolution(resolved, base, preserveSymlinks) {
  if (encodedSeparatorRegEx.exec(resolved.pathname) !== null) {
    throw new ERR_INVALID_MODULE_SPECIFIER(
      resolved.pathname,
      'must not include encoded "/" or "\\" characters',
      fileURLToPath4(base)
    );
  }
  let filePath;
  try {
    filePath = fileURLToPath4(resolved);
  } catch (error) {
    const cause = (
      /** @type {ErrnoException} */
      error
    );
    Object.defineProperty(cause, "input", { value: String(resolved) });
    Object.defineProperty(cause, "module", { value: String(base) });
    throw cause;
  }
  const stats = tryStatSync(
    filePath.endsWith("/") ? filePath.slice(-1) : filePath
  );
  if (stats && stats.isDirectory()) {
    const error = new ERR_UNSUPPORTED_DIR_IMPORT(filePath, fileURLToPath4(base));
    error.url = String(resolved);
    throw error;
  }
  if (!stats || !stats.isFile()) {
    const error = new ERR_MODULE_NOT_FOUND(
      filePath || resolved.pathname,
      base && fileURLToPath4(base),
      true
    );
    error.url = String(resolved);
    throw error;
  }
  if (!preserveSymlinks) {
    const real = realpathSync(filePath);
    const { search, hash } = resolved;
    resolved = pathToFileURL3(real + (filePath.endsWith(path6.sep) ? "/" : ""));
    resolved.search = search;
    resolved.hash = hash;
  }
  return resolved;
}
function importNotDefined(specifier, packageJsonUrl, base) {
  return new ERR_PACKAGE_IMPORT_NOT_DEFINED(
    specifier,
    packageJsonUrl && fileURLToPath4(new URL2(".", packageJsonUrl)),
    fileURLToPath4(base)
  );
}
function exportsNotFound(subpath, packageJsonUrl, base) {
  return new ERR_PACKAGE_PATH_NOT_EXPORTED(
    fileURLToPath4(new URL2(".", packageJsonUrl)),
    subpath,
    base && fileURLToPath4(base)
  );
}
function throwInvalidSubpath(request, match, packageJsonUrl, internal, base) {
  const reason = `request is not a valid match in pattern "${match}" for the "${internal ? "imports" : "exports"}" resolution of ${fileURLToPath4(packageJsonUrl)}`;
  throw new ERR_INVALID_MODULE_SPECIFIER(
    request,
    reason,
    base && fileURLToPath4(base)
  );
}
function invalidPackageTarget(subpath, target, packageJsonUrl, internal, base) {
  target = typeof target === "object" && target !== null ? JSON.stringify(target, null, "") : `${target}`;
  return new ERR_INVALID_PACKAGE_TARGET(
    fileURLToPath4(new URL2(".", packageJsonUrl)),
    subpath,
    target,
    internal,
    base && fileURLToPath4(base)
  );
}
function resolvePackageTargetString(target, subpath, match, packageJsonUrl, base, pattern, internal, isPathMap, conditions) {
  if (subpath !== "" && !pattern && target[target.length - 1] !== "/")
    throw invalidPackageTarget(match, target, packageJsonUrl, internal, base);
  if (!target.startsWith("./")) {
    if (internal && !target.startsWith("../") && !target.startsWith("/")) {
      let isURL2 = false;
      try {
        new URL2(target);
        isURL2 = true;
      } catch {
      }
      if (!isURL2) {
        const exportTarget = pattern ? RegExpPrototypeSymbolReplace.call(
          patternRegEx,
          target,
          () => subpath
        ) : target + subpath;
        return packageResolve(exportTarget, packageJsonUrl, conditions);
      }
    }
    throw invalidPackageTarget(match, target, packageJsonUrl, internal, base);
  }
  if (invalidSegmentRegEx.exec(target.slice(2)) !== null) {
    if (deprecatedInvalidSegmentRegEx.exec(target.slice(2)) === null) {
      if (!isPathMap) {
        const request = pattern ? match.replace("*", () => subpath) : match + subpath;
        const resolvedTarget = pattern ? RegExpPrototypeSymbolReplace.call(
          patternRegEx,
          target,
          () => subpath
        ) : target;
        emitInvalidSegmentDeprecation(
          resolvedTarget,
          request,
          match,
          packageJsonUrl,
          internal,
          base,
          true
        );
      }
    } else {
      throw invalidPackageTarget(match, target, packageJsonUrl, internal, base);
    }
  }
  const resolved = new URL2(target, packageJsonUrl);
  const resolvedPath = resolved.pathname;
  const packagePath = new URL2(".", packageJsonUrl).pathname;
  if (!resolvedPath.startsWith(packagePath))
    throw invalidPackageTarget(match, target, packageJsonUrl, internal, base);
  if (subpath === "") return resolved;
  if (invalidSegmentRegEx.exec(subpath) !== null) {
    const request = pattern ? match.replace("*", () => subpath) : match + subpath;
    if (deprecatedInvalidSegmentRegEx.exec(subpath) === null) {
      if (!isPathMap) {
        const resolvedTarget = pattern ? RegExpPrototypeSymbolReplace.call(
          patternRegEx,
          target,
          () => subpath
        ) : target;
        emitInvalidSegmentDeprecation(
          resolvedTarget,
          request,
          match,
          packageJsonUrl,
          internal,
          base,
          false
        );
      }
    } else {
      throwInvalidSubpath(request, match, packageJsonUrl, internal, base);
    }
  }
  if (pattern) {
    return new URL2(
      RegExpPrototypeSymbolReplace.call(
        patternRegEx,
        resolved.href,
        () => subpath
      )
    );
  }
  return new URL2(subpath, resolved);
}
function isArrayIndex(key2) {
  const keyNumber = Number(key2);
  if (`${keyNumber}` !== key2) return false;
  return keyNumber >= 0 && keyNumber < 4294967295;
}
function resolvePackageTarget(packageJsonUrl, target, subpath, packageSubpath, base, pattern, internal, isPathMap, conditions) {
  if (typeof target === "string") {
    return resolvePackageTargetString(
      target,
      subpath,
      packageSubpath,
      packageJsonUrl,
      base,
      pattern,
      internal,
      isPathMap,
      conditions
    );
  }
  if (Array.isArray(target)) {
    const targetList = target;
    if (targetList.length === 0) return null;
    let lastException;
    let i = -1;
    while (++i < targetList.length) {
      const targetItem = targetList[i];
      let resolveResult;
      try {
        resolveResult = resolvePackageTarget(
          packageJsonUrl,
          targetItem,
          subpath,
          packageSubpath,
          base,
          pattern,
          internal,
          isPathMap,
          conditions
        );
      } catch (error) {
        const exception2 = (
          /** @type {ErrnoException} */
          error
        );
        lastException = exception2;
        if (exception2.code === "ERR_INVALID_PACKAGE_TARGET") continue;
        throw error;
      }
      if (resolveResult === void 0) continue;
      if (resolveResult === null) {
        lastException = null;
        continue;
      }
      return resolveResult;
    }
    if (lastException === void 0 || lastException === null) {
      return null;
    }
    throw lastException;
  }
  if (typeof target === "object" && target !== null) {
    const keys = Object.getOwnPropertyNames(target);
    let i = -1;
    while (++i < keys.length) {
      const key2 = keys[i];
      if (isArrayIndex(key2)) {
        throw new ERR_INVALID_PACKAGE_CONFIG2(
          fileURLToPath4(packageJsonUrl),
          base,
          '"exports" cannot contain numeric property keys.'
        );
      }
    }
    i = -1;
    while (++i < keys.length) {
      const key2 = keys[i];
      if (key2 === "default" || conditions && conditions.has(key2)) {
        const conditionalTarget = (
          /** @type {unknown} */
          target[key2]
        );
        const resolveResult = resolvePackageTarget(
          packageJsonUrl,
          conditionalTarget,
          subpath,
          packageSubpath,
          base,
          pattern,
          internal,
          isPathMap,
          conditions
        );
        if (resolveResult === void 0) continue;
        return resolveResult;
      }
    }
    return null;
  }
  if (target === null) {
    return null;
  }
  throw invalidPackageTarget(
    packageSubpath,
    target,
    packageJsonUrl,
    internal,
    base
  );
}
function isConditionalExportsMainSugar(exports, packageJsonUrl, base) {
  if (typeof exports === "string" || Array.isArray(exports)) return true;
  if (typeof exports !== "object" || exports === null) return false;
  const keys = Object.getOwnPropertyNames(exports);
  let isConditionalSugar = false;
  let i = 0;
  let keyIndex = -1;
  while (++keyIndex < keys.length) {
    const key2 = keys[keyIndex];
    const currentIsConditionalSugar = key2 === "" || key2[0] !== ".";
    if (i++ === 0) {
      isConditionalSugar = currentIsConditionalSugar;
    } else if (isConditionalSugar !== currentIsConditionalSugar) {
      throw new ERR_INVALID_PACKAGE_CONFIG2(
        fileURLToPath4(packageJsonUrl),
        base,
        `"exports" cannot contain some keys starting with '.' and some not. The exports object must either be an object of package subpath keys or an object of main entry condition name keys only.`
      );
    }
  }
  return isConditionalSugar;
}
function emitTrailingSlashPatternDeprecation(match, pjsonUrl, base) {
  if (process3.noDeprecation) {
    return;
  }
  const pjsonPath = fileURLToPath4(pjsonUrl);
  if (emittedPackageWarnings.has(pjsonPath + "|" + match)) return;
  emittedPackageWarnings.add(pjsonPath + "|" + match);
  process3.emitWarning(
    `Use of deprecated trailing slash pattern mapping "${match}" in the "exports" field module resolution of the package at ${pjsonPath}${base ? ` imported from ${fileURLToPath4(base)}` : ""}. Mapping specifiers ending in "/" is no longer supported.`,
    "DeprecationWarning",
    "DEP0155"
  );
}
function packageExportsResolve(packageJsonUrl, packageSubpath, packageConfig, base, conditions) {
  let exports = packageConfig.exports;
  if (isConditionalExportsMainSugar(exports, packageJsonUrl, base)) {
    exports = { ".": exports };
  }
  if (own2.call(exports, packageSubpath) && !packageSubpath.includes("*") && !packageSubpath.endsWith("/")) {
    const target = exports[packageSubpath];
    const resolveResult = resolvePackageTarget(
      packageJsonUrl,
      target,
      "",
      packageSubpath,
      base,
      false,
      false,
      false,
      conditions
    );
    if (resolveResult === null || resolveResult === void 0) {
      throw exportsNotFound(packageSubpath, packageJsonUrl, base);
    }
    return resolveResult;
  }
  let bestMatch = "";
  let bestMatchSubpath = "";
  const keys = Object.getOwnPropertyNames(exports);
  let i = -1;
  while (++i < keys.length) {
    const key2 = keys[i];
    const patternIndex = key2.indexOf("*");
    if (patternIndex !== -1 && packageSubpath.startsWith(key2.slice(0, patternIndex))) {
      if (packageSubpath.endsWith("/")) {
        emitTrailingSlashPatternDeprecation(
          packageSubpath,
          packageJsonUrl,
          base
        );
      }
      const patternTrailer = key2.slice(patternIndex + 1);
      if (packageSubpath.length >= key2.length && packageSubpath.endsWith(patternTrailer) && patternKeyCompare(bestMatch, key2) === 1 && key2.lastIndexOf("*") === patternIndex) {
        bestMatch = key2;
        bestMatchSubpath = packageSubpath.slice(
          patternIndex,
          packageSubpath.length - patternTrailer.length
        );
      }
    }
  }
  if (bestMatch) {
    const target = (
      /** @type {unknown} */
      exports[bestMatch]
    );
    const resolveResult = resolvePackageTarget(
      packageJsonUrl,
      target,
      bestMatchSubpath,
      bestMatch,
      base,
      true,
      false,
      packageSubpath.endsWith("/"),
      conditions
    );
    if (resolveResult === null || resolveResult === void 0) {
      throw exportsNotFound(packageSubpath, packageJsonUrl, base);
    }
    return resolveResult;
  }
  throw exportsNotFound(packageSubpath, packageJsonUrl, base);
}
function patternKeyCompare(a, b) {
  const aPatternIndex = a.indexOf("*");
  const bPatternIndex = b.indexOf("*");
  const baseLengthA = aPatternIndex === -1 ? a.length : aPatternIndex + 1;
  const baseLengthB = bPatternIndex === -1 ? b.length : bPatternIndex + 1;
  if (baseLengthA > baseLengthB) return -1;
  if (baseLengthB > baseLengthA) return 1;
  if (aPatternIndex === -1) return 1;
  if (bPatternIndex === -1) return -1;
  if (a.length > b.length) return -1;
  if (b.length > a.length) return 1;
  return 0;
}
function packageImportsResolve(name, base, conditions) {
  if (name === "#" || name.startsWith("#/") || name.endsWith("/")) {
    const reason = "is not a valid internal imports specifier name";
    throw new ERR_INVALID_MODULE_SPECIFIER(name, reason, fileURLToPath4(base));
  }
  let packageJsonUrl;
  const packageConfig = getPackageScopeConfig(base);
  if (packageConfig.exists) {
    packageJsonUrl = pathToFileURL3(packageConfig.pjsonPath);
    const imports = packageConfig.imports;
    if (imports) {
      if (own2.call(imports, name) && !name.includes("*")) {
        const resolveResult = resolvePackageTarget(
          packageJsonUrl,
          imports[name],
          "",
          name,
          base,
          false,
          true,
          false,
          conditions
        );
        if (resolveResult !== null && resolveResult !== void 0) {
          return resolveResult;
        }
      } else {
        let bestMatch = "";
        let bestMatchSubpath = "";
        const keys = Object.getOwnPropertyNames(imports);
        let i = -1;
        while (++i < keys.length) {
          const key2 = keys[i];
          const patternIndex = key2.indexOf("*");
          if (patternIndex !== -1 && name.startsWith(key2.slice(0, -1))) {
            const patternTrailer = key2.slice(patternIndex + 1);
            if (name.length >= key2.length && name.endsWith(patternTrailer) && patternKeyCompare(bestMatch, key2) === 1 && key2.lastIndexOf("*") === patternIndex) {
              bestMatch = key2;
              bestMatchSubpath = name.slice(
                patternIndex,
                name.length - patternTrailer.length
              );
            }
          }
        }
        if (bestMatch) {
          const target = imports[bestMatch];
          const resolveResult = resolvePackageTarget(
            packageJsonUrl,
            target,
            bestMatchSubpath,
            bestMatch,
            base,
            true,
            true,
            false,
            conditions
          );
          if (resolveResult !== null && resolveResult !== void 0) {
            return resolveResult;
          }
        }
      }
    }
  }
  throw importNotDefined(name, packageJsonUrl, base);
}
function parsePackageName(specifier, base) {
  let separatorIndex = specifier.indexOf("/");
  let validPackageName = true;
  let isScoped = false;
  if (specifier[0] === "@") {
    isScoped = true;
    if (separatorIndex === -1 || specifier.length === 0) {
      validPackageName = false;
    } else {
      separatorIndex = specifier.indexOf("/", separatorIndex + 1);
    }
  }
  const packageName = separatorIndex === -1 ? specifier : specifier.slice(0, separatorIndex);
  if (invalidPackageNameRegEx.exec(packageName) !== null) {
    validPackageName = false;
  }
  if (!validPackageName) {
    throw new ERR_INVALID_MODULE_SPECIFIER(
      specifier,
      "is not a valid package name",
      fileURLToPath4(base)
    );
  }
  const packageSubpath = "." + (separatorIndex === -1 ? "" : specifier.slice(separatorIndex));
  return { packageName, packageSubpath, isScoped };
}
function packageResolve(specifier, base, conditions) {
  if (builtinModules.includes(specifier)) {
    return new URL2("node:" + specifier);
  }
  const { packageName, packageSubpath, isScoped } = parsePackageName(
    specifier,
    base
  );
  const packageConfig = getPackageScopeConfig(base);
  if (packageConfig.exists) {
    const packageJsonUrl2 = pathToFileURL3(packageConfig.pjsonPath);
    if (packageConfig.name === packageName && packageConfig.exports !== void 0 && packageConfig.exports !== null) {
      return packageExportsResolve(
        packageJsonUrl2,
        packageSubpath,
        packageConfig,
        base,
        conditions
      );
    }
  }
  let packageJsonUrl = new URL2(
    "./node_modules/" + packageName + "/package.json",
    base
  );
  let packageJsonPath = fileURLToPath4(packageJsonUrl);
  let lastPath;
  do {
    const stat = tryStatSync(packageJsonPath.slice(0, -13));
    if (!stat || !stat.isDirectory()) {
      lastPath = packageJsonPath;
      packageJsonUrl = new URL2(
        (isScoped ? "../../../../node_modules/" : "../../../node_modules/") + packageName + "/package.json",
        packageJsonUrl
      );
      packageJsonPath = fileURLToPath4(packageJsonUrl);
      continue;
    }
    const packageConfig2 = read2(packageJsonPath, { base, specifier });
    if (packageConfig2.exports !== void 0 && packageConfig2.exports !== null) {
      return packageExportsResolve(
        packageJsonUrl,
        packageSubpath,
        packageConfig2,
        base,
        conditions
      );
    }
    if (packageSubpath === ".") {
      return legacyMainResolve(packageJsonUrl, packageConfig2, base);
    }
    return new URL2(packageSubpath, packageJsonUrl);
  } while (packageJsonPath.length !== lastPath.length);
  throw new ERR_MODULE_NOT_FOUND(packageName, fileURLToPath4(base), false);
}
function isRelativeSpecifier(specifier) {
  if (specifier[0] === ".") {
    if (specifier.length === 1 || specifier[1] === "/") return true;
    if (specifier[1] === "." && (specifier.length === 2 || specifier[2] === "/")) {
      return true;
    }
  }
  return false;
}
function shouldBeTreatedAsRelativeOrAbsolutePath(specifier) {
  if (specifier === "") return false;
  if (specifier[0] === "/") return true;
  return isRelativeSpecifier(specifier);
}
function moduleResolve(specifier, base, conditions, preserveSymlinks) {
  const protocol = base.protocol;
  const isData = protocol === "data:";
  const isRemote = isData || protocol === "http:" || protocol === "https:";
  let resolved;
  if (shouldBeTreatedAsRelativeOrAbsolutePath(specifier)) {
    try {
      resolved = new URL2(specifier, base);
    } catch (error_) {
      const error = new ERR_UNSUPPORTED_RESOLVE_REQUEST(specifier, base);
      error.cause = error_;
      throw error;
    }
  } else if (protocol === "file:" && specifier[0] === "#") {
    resolved = packageImportsResolve(specifier, base, conditions);
  } else {
    try {
      resolved = new URL2(specifier);
    } catch (error_) {
      if (isRemote && !builtinModules.includes(specifier)) {
        const error = new ERR_UNSUPPORTED_RESOLVE_REQUEST(specifier, base);
        error.cause = error_;
        throw error;
      }
      resolved = packageResolve(specifier, base, conditions);
    }
  }
  assert3(resolved !== void 0, "expected to be defined");
  if (resolved.protocol !== "file:") {
    return resolved;
  }
  return finalizeResolution(resolved, base, preserveSymlinks);
}
function checkIfDisallowedImport(specifier, parsed, parsedParentURL) {
  if (parsedParentURL) {
    const parentProtocol = parsedParentURL.protocol;
    if (parentProtocol === "http:" || parentProtocol === "https:") {
      if (shouldBeTreatedAsRelativeOrAbsolutePath(specifier)) {
        const parsedProtocol = parsed == null ? void 0 : parsed.protocol;
        if (parsedProtocol && parsedProtocol !== "https:" && parsedProtocol !== "http:") {
          throw new ERR_NETWORK_IMPORT_DISALLOWED(
            specifier,
            parsedParentURL,
            "remote imports cannot import from a local location."
          );
        }
        return { url: (parsed == null ? void 0 : parsed.href) || "" };
      }
      if (builtinModules.includes(specifier)) {
        throw new ERR_NETWORK_IMPORT_DISALLOWED(
          specifier,
          parsedParentURL,
          "remote imports cannot import from a local location."
        );
      }
      throw new ERR_NETWORK_IMPORT_DISALLOWED(
        specifier,
        parsedParentURL,
        "only relative and absolute specifiers are supported."
      );
    }
  }
}
function isURL(self) {
  return Boolean(
    self && typeof self === "object" && "href" in self && typeof self.href === "string" && "protocol" in self && typeof self.protocol === "string" && self.href && self.protocol
  );
}
function throwIfInvalidParentURL(parentURL) {
  if (parentURL === void 0) {
    return;
  }
  if (typeof parentURL !== "string" && !isURL(parentURL)) {
    throw new codes.ERR_INVALID_ARG_TYPE(
      "parentURL",
      ["string", "URL"],
      parentURL
    );
  }
}
function defaultResolve(specifier, context = {}) {
  const { parentURL } = context;
  assert3(parentURL !== void 0, "expected `parentURL` to be defined");
  throwIfInvalidParentURL(parentURL);
  let parsedParentURL;
  if (parentURL) {
    try {
      parsedParentURL = new URL2(parentURL);
    } catch {
    }
  }
  let parsed;
  let protocol;
  try {
    parsed = shouldBeTreatedAsRelativeOrAbsolutePath(specifier) ? new URL2(specifier, parsedParentURL) : new URL2(specifier);
    protocol = parsed.protocol;
    if (protocol === "data:") {
      return { url: parsed.href, format: null };
    }
  } catch {
  }
  const maybeReturn = checkIfDisallowedImport(
    specifier,
    parsed,
    parsedParentURL
  );
  if (maybeReturn) return maybeReturn;
  if (protocol === void 0 && parsed) {
    protocol = parsed.protocol;
  }
  if (protocol === "node:") {
    return { url: specifier };
  }
  if (parsed && parsed.protocol === "node:") return { url: specifier };
  const conditions = getConditionsSet(context.conditions);
  const url2 = moduleResolve(specifier, new URL2(parentURL), conditions, false);
  return {
    // Do NOT cast `url` to a string: that will work even when there are real
    // problems, silencing them
    url: url2.href,
    format: defaultGetFormatWithoutErrors(url2, { parentURL })
  };
}

// node_modules/import-meta-resolve/index.js
function resolve2(specifier, parent) {
  if (!parent) {
    throw new Error(
      "Please pass `parent`: `import-meta-resolve` cannot ponyfill that"
    );
  }
  try {
    return defaultResolve(specifier, { parentURL: parent }).url;
  } catch (error) {
    const exception2 = (
      /** @type {ErrnoException} */
      error
    );
    if ((exception2.code === "ERR_UNSUPPORTED_DIR_IMPORT" || exception2.code === "ERR_MODULE_NOT_FOUND") && typeof exception2.url === "string") {
      return exception2.url;
    }
    throw error;
  }
}

// src/utils/import-from-file.js
function importFromFile(specifier, parent) {
  const url2 = resolve2(specifier, pathToFileURL4(parent).href);
  return import(url2);
}
var import_from_file_default = importFromFile;

// src/utils/require-from-file.js
import { createRequire } from "module";
function requireFromFile(id, parent) {
  const require2 = createRequire(parent);
  return require2(id);
}
var require_from_file_default = requireFromFile;

// src/config/prettier-config/load-external-config.js
var requireErrorCodesShouldBeIgnored = /* @__PURE__ */ new Set([
  "MODULE_NOT_FOUND",
  "ERR_REQUIRE_ESM",
  "ERR_PACKAGE_PATH_NOT_EXPORTED"
]);
async function loadExternalConfig(externalConfig, configFile) {
  try {
    return require_from_file_default(externalConfig, configFile);
  } catch (error) {
    if (!requireErrorCodesShouldBeIgnored.has(error == null ? void 0 : error.code)) {
      throw error;
    }
  }
  const module = await import_from_file_default(externalConfig, configFile);
  return module.default;
}
var load_external_config_default = loadExternalConfig;

// src/config/prettier-config/load-config.js
async function loadConfig(configFile) {
  const { base: fileName, ext: extension } = path7.parse(configFile);
  const load2 = fileName === "package.json" ? loadConfigFromPackageJson : fileName === "package.yaml" ? loadConfigFromPackageYaml : loaders_default[extension];
  if (!load2) {
    throw new Error(
      `No loader specified for extension "${extension || "noExt"}"`
    );
  }
  let config = await load2(configFile);
  if (!config) {
    return;
  }
  if (typeof config === "string") {
    config = await load_external_config_default(config, configFile);
  }
  if (typeof config !== "object") {
    throw new TypeError(
      `Config is only allowed to be an object, but received ${typeof config} in "${configFile}"`
    );
  }
  delete config.$schema;
  return config;
}
var load_config_default = loadConfig;

// src/config/prettier-config/index.js
var loadCache = /* @__PURE__ */ new Map();
var searchCache = /* @__PURE__ */ new Map();
function clearPrettierConfigCache() {
  loadCache.clear();
  searchCache.clear();
}
function loadPrettierConfig(configFile, { shouldCache }) {
  configFile = path8.resolve(configFile);
  if (!shouldCache || !loadCache.has(configFile)) {
    loadCache.set(configFile, load_config_default(configFile));
  }
  return loadCache.get(configFile);
}
function getSearchFunction(stopDirectory) {
  stopDirectory = stopDirectory ? path8.resolve(stopDirectory) : void 0;
  if (!searchCache.has(stopDirectory)) {
    const searcher2 = config_searcher_default(stopDirectory);
    const searchFunction = searcher2.search.bind(searcher2);
    searchCache.set(stopDirectory, searchFunction);
  }
  return searchCache.get(stopDirectory);
}
function searchPrettierConfig(startDirectory, options8 = {}) {
  startDirectory = startDirectory ? path8.resolve(startDirectory) : process.cwd();
  const stopDirectory = mockable_default.getPrettierConfigSearchStopDirectory();
  const search = getSearchFunction(stopDirectory);
  return search(startDirectory, { shouldCache: options8.shouldCache });
}

// src/config/resolve-config.js
function clearCache() {
  clearPrettierConfigCache();
  clearEditorconfigCache();
}
function loadEditorconfig2(file, options8) {
  if (!file || !options8.editorconfig) {
    return;
  }
  const shouldCache = options8.useCache;
  return loadEditorconfig(file, { shouldCache });
}
async function loadPrettierConfig2(file, options8) {
  const shouldCache = options8.useCache;
  let configFile = options8.config;
  if (!configFile) {
    const directory = file ? path9.dirname(path9.resolve(file)) : void 0;
    configFile = await searchPrettierConfig(directory, { shouldCache });
  }
  if (!configFile) {
    return;
  }
  const config = await loadPrettierConfig(configFile, { shouldCache });
  return { config, configFile };
}
async function resolveConfig(fileUrlOrPath, options8) {
  options8 = { useCache: true, ...options8 };
  const filePath = toPath(fileUrlOrPath);
  const [result, editorConfigured] = await Promise.all([
    loadPrettierConfig2(filePath, options8),
    loadEditorconfig2(filePath, options8)
  ]);
  if (!result && !editorConfigured) {
    return null;
  }
  const merged = {
    ...editorConfigured,
    ...mergeOverrides(result, filePath)
  };
  if (Array.isArray(merged.plugins)) {
    merged.plugins = merged.plugins.map(
      (value) => typeof value === "string" && value.startsWith(".") ? path9.resolve(path9.dirname(result.configFile), value) : value
    );
  }
  return merged;
}
async function resolveConfigFile(fileUrlOrPath) {
  const directory = fileUrlOrPath ? path9.dirname(path9.resolve(toPath(fileUrlOrPath))) : void 0;
  const result = await searchPrettierConfig(directory, { shouldCache: false });
  return result ?? null;
}
function mergeOverrides(configResult, filePath) {
  const { config, configFile } = configResult || {};
  const { overrides, ...options8 } = config || {};
  if (filePath && overrides) {
    const relativeFilePath = path9.relative(path9.dirname(configFile), filePath);
    for (const override of overrides) {
      if (pathMatchesGlobs(
        relativeFilePath,
        override.files,
        override.excludeFiles
      )) {
        Object.assign(options8, override.options);
      }
    }
  }
  return options8;
}
function pathMatchesGlobs(filePath, patterns, excludedPatterns) {
  const patternList = Array.isArray(patterns) ? patterns : [patterns];
  const [withSlashes, withoutSlashes] = partition_default(
    patternList,
    (pattern) => pattern.includes("/")
  );
  return import_micromatch.default.isMatch(filePath, withoutSlashes, {
    ignore: excludedPatterns,
    basename: true,
    dot: true
  }) || import_micromatch.default.isMatch(filePath, withSlashes, {
    ignore: excludedPatterns,
    basename: false,
    dot: true
  });
}

// scripts/build/shims/string-replace-all.js
var stringReplaceAll2 = (isOptionalObject, original, pattern, replacement) => {
  if (isOptionalObject && (original === void 0 || original === null)) {
    return;
  }
  if (original.replaceAll) {
    return original.replaceAll(pattern, replacement);
  }
  if (pattern.global) {
    return original.replace(pattern, replacement);
  }
  return original.split(pattern).join(replacement);
};
var string_replace_all_default = stringReplaceAll2;

// src/utils/ignore.js
var import_ignore = __toESM(require_ignore(), 1);
import path10 from "path";
import url from "url";
var createIgnore = import_ignore.default.default;
var slash = path10.sep === "\\" ? (filePath) => string_replace_all_default(
  /* isOptionalObject */
  false,
  filePath,
  "\\",
  "/"
) : (filePath) => filePath;
function getRelativePath(file, ignoreFile) {
  const ignoreFilePath = toPath(ignoreFile);
  const filePath = isUrl(file) ? url.fileURLToPath(file) : path10.resolve(file);
  return path10.relative(
    // If there's an ignore-path set, the filename must be relative to the
    // ignore path, not the current working directory.
    ignoreFilePath ? path10.dirname(ignoreFilePath) : process.cwd(),
    filePath
  );
}
async function createSingleIsIgnoredFunction(ignoreFile, withNodeModules) {
  let content = "";
  if (ignoreFile) {
    content += await read_file_default(ignoreFile) ?? "";
  }
  if (!withNodeModules) {
    content += "\nnode_modules";
  }
  if (!content) {
    return;
  }
  const ignore = createIgnore({
    allowRelativePaths: true
  }).add(content);
  return (file) => ignore.ignores(slash(getRelativePath(file, ignoreFile)));
}
async function createIsIgnoredFunction(ignoreFiles, withNodeModules) {
  if (ignoreFiles.length === 0 && !withNodeModules) {
    ignoreFiles = [void 0];
  }
  const isIgnoredFunctions = (await Promise.all(ignoreFiles.map((ignoreFile) => createSingleIsIgnoredFunction(ignoreFile, withNodeModules)))).filter(Boolean);
  return (file) => isIgnoredFunctions.some((isIgnored2) => isIgnored2(file));
}
async function isIgnored(file, options8) {
  const {
    ignorePath: ignoreFiles,
    withNodeModules
  } = options8;
  const isIgnored2 = await createIsIgnoredFunction(ignoreFiles, withNodeModules);
  return isIgnored2(file);
}

// src/utils/get-interpreter.js
var import_n_readlines = __toESM(require_readlines(), 1);
import fs6 from "fs";
function getInterpreter(file) {
  let fd;
  try {
    fd = fs6.openSync(file, "r");
  } catch {
    return;
  }
  try {
    const liner = new import_n_readlines.default(fd);
    const firstLine = liner.next().toString("utf8");
    const m1 = firstLine.match(/^#!\/(?:usr\/)?bin\/env\s+(\S+)/u);
    if (m1) {
      return m1[1];
    }
    const m2 = firstLine.match(/^#!\/(?:usr\/(?:local\/)?)?bin\/(\S+)/u);
    if (m2) {
      return m2[1];
    }
  } finally {
    try {
      fs6.closeSync(fd);
    } catch {
    }
  }
}
var get_interpreter_default = getInterpreter;

// src/utils/infer-parser.js
var getFileBasename = (file) => String(file).split(/[/\\]/u).pop();
function getLanguageByFileName(languages2, file) {
  if (!file) {
    return;
  }
  const basename = getFileBasename(file).toLowerCase();
  return languages2.find(
    ({ filenames }) => filenames == null ? void 0 : filenames.some((name) => name.toLowerCase() === basename)
  ) ?? languages2.find(
    ({ extensions }) => extensions == null ? void 0 : extensions.some((extension) => basename.endsWith(extension))
  );
}
function getLanguageByLanguageName(languages2, languageName) {
  if (!languageName) {
    return;
  }
  return languages2.find(({ name }) => name.toLowerCase() === languageName) ?? languages2.find(({ aliases }) => aliases == null ? void 0 : aliases.includes(languageName)) ?? languages2.find(({ extensions }) => extensions == null ? void 0 : extensions.includes(`.${languageName}`));
}
function getLanguageByInterpreter(languages2, file) {
  if (!file || getFileBasename(file).includes(".")) {
    return;
  }
  const interpreter = get_interpreter_default(file);
  if (!interpreter) {
    return;
  }
  return languages2.find(
    ({ interpreters }) => interpreters == null ? void 0 : interpreters.includes(interpreter)
  );
}
function inferParser(options8, fileInfo) {
  const languages2 = options8.plugins.flatMap(
    (plugin) => (
      // @ts-expect-error -- Safe
      plugin.languages ?? []
    )
  );
  const language = getLanguageByLanguageName(languages2, fileInfo.language) ?? getLanguageByFileName(languages2, fileInfo.physicalFile) ?? getLanguageByFileName(languages2, fileInfo.file) ?? getLanguageByInterpreter(languages2, fileInfo.physicalFile);
  return language == null ? void 0 : language.parsers[0];
}
var infer_parser_default = inferParser;

// src/common/get-file-info.js
async function getFileInfo(file, options8) {
  if (typeof file !== "string" && !(file instanceof URL)) {
    throw new TypeError(
      `expect \`file\` to be a string or URL, got \`${typeof file}\``
    );
  }
  let { ignorePath, withNodeModules } = options8;
  if (!Array.isArray(ignorePath)) {
    ignorePath = [ignorePath];
  }
  const ignored = await isIgnored(file, { ignorePath, withNodeModules });
  let inferredParser;
  if (!ignored) {
    inferredParser = await getParser(file, options8);
  }
  return {
    ignored,
    inferredParser: inferredParser ?? null
  };
}
async function getParser(file, options8) {
  let config;
  if (options8.resolveConfig !== false) {
    config = await resolveConfig(file);
  }
  return (config == null ? void 0 : config.parser) ?? infer_parser_default(options8, { physicalFile: file });
}
var get_file_info_default = getFileInfo;

// src/common/end-of-line.js
function guessEndOfLine(text) {
  const index = text.indexOf("\r");
  if (index >= 0) {
    return text.charAt(index + 1) === "\n" ? "crlf" : "cr";
  }
  return "lf";
}
function convertEndOfLineToChars(value) {
  switch (value) {
    case "cr":
      return "\r";
    case "crlf":
      return "\r\n";
    default:
      return "\n";
  }
}
function countEndOfLineChars(text, eol) {
  let regex;
  switch (eol) {
    case "\n":
      regex = /\n/gu;
      break;
    case "\r":
      regex = /\r/gu;
      break;
    case "\r\n":
      regex = /\r\n/gu;
      break;
    default:
      throw new Error(`Unexpected "eol" ${JSON.stringify(eol)}.`);
  }
  const endOfLines = text.match(regex);
  return endOfLines ? endOfLines.length : 0;
}
function normalizeEndOfLine(text) {
  return string_replace_all_default(
    /* isOptionalObject */
    false,
    text,
    /\r\n?/gu,
    "\n"
  );
}

// src/document/constants.js
var DOC_TYPE_STRING = "string";
var DOC_TYPE_ARRAY = "array";
var DOC_TYPE_CURSOR = "cursor";
var DOC_TYPE_INDENT = "indent";
var DOC_TYPE_ALIGN = "align";
var DOC_TYPE_TRIM = "trim";
var DOC_TYPE_GROUP = "group";
var DOC_TYPE_FILL = "fill";
var DOC_TYPE_IF_BREAK = "if-break";
var DOC_TYPE_INDENT_IF_BREAK = "indent-if-break";
var DOC_TYPE_LINE_SUFFIX = "line-suffix";
var DOC_TYPE_LINE_SUFFIX_BOUNDARY = "line-suffix-boundary";
var DOC_TYPE_LINE = "line";
var DOC_TYPE_LABEL = "label";
var DOC_TYPE_BREAK_PARENT = "break-parent";
var VALID_OBJECT_DOC_TYPES = /* @__PURE__ */ new Set([
  DOC_TYPE_CURSOR,
  DOC_TYPE_INDENT,
  DOC_TYPE_ALIGN,
  DOC_TYPE_TRIM,
  DOC_TYPE_GROUP,
  DOC_TYPE_FILL,
  DOC_TYPE_IF_BREAK,
  DOC_TYPE_INDENT_IF_BREAK,
  DOC_TYPE_LINE_SUFFIX,
  DOC_TYPE_LINE_SUFFIX_BOUNDARY,
  DOC_TYPE_LINE,
  DOC_TYPE_LABEL,
  DOC_TYPE_BREAK_PARENT
]);

// src/document/utils/get-doc-type.js
function getDocType(doc2) {
  if (typeof doc2 === "string") {
    return DOC_TYPE_STRING;
  }
  if (Array.isArray(doc2)) {
    return DOC_TYPE_ARRAY;
  }
  if (!doc2) {
    return;
  }
  const { type: type2 } = doc2;
  if (VALID_OBJECT_DOC_TYPES.has(type2)) {
    return type2;
  }
}
var get_doc_type_default = getDocType;

// src/document/invalid-doc-error.js
var disjunctionListFormat = (list) => new Intl.ListFormat("en-US", { type: "disjunction" }).format(list);
function getDocErrorMessage(doc2) {
  const type2 = doc2 === null ? "null" : typeof doc2;
  if (type2 !== "string" && type2 !== "object") {
    return `Unexpected doc '${type2}', 
Expected it to be 'string' or 'object'.`;
  }
  if (get_doc_type_default(doc2)) {
    throw new Error("doc is valid.");
  }
  const objectType = Object.prototype.toString.call(doc2);
  if (objectType !== "[object Object]") {
    return `Unexpected doc '${objectType}'.`;
  }
  const EXPECTED_TYPE_VALUES = disjunctionListFormat(
    [...VALID_OBJECT_DOC_TYPES].map((type3) => `'${type3}'`)
  );
  return `Unexpected doc.type '${doc2.type}'.
Expected it to be ${EXPECTED_TYPE_VALUES}.`;
}
var InvalidDocError = class extends Error {
  name = "InvalidDocError";
  constructor(doc2) {
    super(getDocErrorMessage(doc2));
    this.doc = doc2;
  }
};
var invalid_doc_error_default = InvalidDocError;

// src/document/utils/traverse-doc.js
var traverseDocOnExitStackMarker = {};
function traverseDoc(doc2, onEnter, onExit, shouldTraverseConditionalGroups) {
  const docsStack = [doc2];
  while (docsStack.length > 0) {
    const doc3 = docsStack.pop();
    if (doc3 === traverseDocOnExitStackMarker) {
      onExit(docsStack.pop());
      continue;
    }
    if (onExit) {
      docsStack.push(doc3, traverseDocOnExitStackMarker);
    }
    const docType = get_doc_type_default(doc3);
    if (!docType) {
      throw new invalid_doc_error_default(doc3);
    }
    if ((onEnter == null ? void 0 : onEnter(doc3)) === false) {
      continue;
    }
    switch (docType) {
      case DOC_TYPE_ARRAY:
      case DOC_TYPE_FILL: {
        const parts = docType === DOC_TYPE_ARRAY ? doc3 : doc3.parts;
        for (let ic = parts.length, i = ic - 1; i >= 0; --i) {
          docsStack.push(parts[i]);
        }
        break;
      }
      case DOC_TYPE_IF_BREAK:
        docsStack.push(doc3.flatContents, doc3.breakContents);
        break;
      case DOC_TYPE_GROUP:
        if (shouldTraverseConditionalGroups && doc3.expandedStates) {
          for (let ic = doc3.expandedStates.length, i = ic - 1; i >= 0; --i) {
            docsStack.push(doc3.expandedStates[i]);
          }
        } else {
          docsStack.push(doc3.contents);
        }
        break;
      case DOC_TYPE_ALIGN:
      case DOC_TYPE_INDENT:
      case DOC_TYPE_INDENT_IF_BREAK:
      case DOC_TYPE_LABEL:
      case DOC_TYPE_LINE_SUFFIX:
        docsStack.push(doc3.contents);
        break;
      case DOC_TYPE_STRING:
      case DOC_TYPE_CURSOR:
      case DOC_TYPE_TRIM:
      case DOC_TYPE_LINE_SUFFIX_BOUNDARY:
      case DOC_TYPE_LINE:
      case DOC_TYPE_BREAK_PARENT:
        break;
      default:
        throw new invalid_doc_error_default(doc3);
    }
  }
}
var traverse_doc_default = traverseDoc;

// src/document/utils/assert-doc.js
var noop = () => {
};
var assertDoc = true ? noop : function(doc2) {
  traverse_doc_default(doc2, (doc3) => {
    if (checked.has(doc3)) {
      return false;
    }
    if (typeof doc3 !== "string") {
      checked.add(doc3);
    }
  });
};
var assertDocArray = true ? noop : function(docs, optional = false) {
  if (optional && !docs) {
    return;
  }
  if (!Array.isArray(docs)) {
    throw new TypeError("Unexpected doc array.");
  }
  for (const doc2 of docs) {
    assertDoc(doc2);
  }
};

// src/document/builders.js
function indent(contents) {
  assertDoc(contents);
  return { type: DOC_TYPE_INDENT, contents };
}
function align(widthOrString, contents) {
  assertDoc(contents);
  return { type: DOC_TYPE_ALIGN, contents, n: widthOrString };
}
function fill(parts) {
  assertDocArray(parts);
  return { type: DOC_TYPE_FILL, parts };
}
function lineSuffix(contents) {
  assertDoc(contents);
  return { type: DOC_TYPE_LINE_SUFFIX, contents };
}
var breakParent = { type: DOC_TYPE_BREAK_PARENT };
var hardlineWithoutBreakParent = { type: DOC_TYPE_LINE, hard: true };
var line2 = { type: DOC_TYPE_LINE };
var hardline = [hardlineWithoutBreakParent, breakParent];
var cursor = { type: DOC_TYPE_CURSOR };
function addAlignmentToDoc(doc2, size, tabWidth) {
  assertDoc(doc2);
  let aligned = doc2;
  if (size > 0) {
    for (let i = 0; i < Math.floor(size / tabWidth); ++i) {
      aligned = indent(aligned);
    }
    aligned = align(size % tabWidth, aligned);
    aligned = align(Number.NEGATIVE_INFINITY, aligned);
  }
  return aligned;
}

// src/document/debug.js
function flattenDoc(doc2) {
  var _a;
  if (!doc2) {
    return "";
  }
  if (Array.isArray(doc2)) {
    const res = [];
    for (const part of doc2) {
      if (Array.isArray(part)) {
        res.push(...flattenDoc(part));
      } else {
        const flattened = flattenDoc(part);
        if (flattened !== "") {
          res.push(flattened);
        }
      }
    }
    return res;
  }
  if (doc2.type === DOC_TYPE_IF_BREAK) {
    return {
      ...doc2,
      breakContents: flattenDoc(doc2.breakContents),
      flatContents: flattenDoc(doc2.flatContents)
    };
  }
  if (doc2.type === DOC_TYPE_GROUP) {
    return {
      ...doc2,
      contents: flattenDoc(doc2.contents),
      expandedStates: (_a = doc2.expandedStates) == null ? void 0 : _a.map(flattenDoc)
    };
  }
  if (doc2.type === DOC_TYPE_FILL) {
    return { type: "fill", parts: doc2.parts.map(flattenDoc) };
  }
  if (doc2.contents) {
    return { ...doc2, contents: flattenDoc(doc2.contents) };
  }
  return doc2;
}
function printDocToDebug(doc2) {
  const printedSymbols = /* @__PURE__ */ Object.create(null);
  const usedKeysForSymbols = /* @__PURE__ */ new Set();
  return printDoc(flattenDoc(doc2));
  function printDoc(doc3, index, parentParts) {
    var _a, _b;
    if (typeof doc3 === "string") {
      return JSON.stringify(doc3);
    }
    if (Array.isArray(doc3)) {
      const printed = doc3.map(printDoc).filter(Boolean);
      return printed.length === 1 ? printed[0] : `[${printed.join(", ")}]`;
    }
    if (doc3.type === DOC_TYPE_LINE) {
      const withBreakParent = ((_a = parentParts == null ? void 0 : parentParts[index + 1]) == null ? void 0 : _a.type) === DOC_TYPE_BREAK_PARENT;
      if (doc3.literal) {
        return withBreakParent ? "literalline" : "literallineWithoutBreakParent";
      }
      if (doc3.hard) {
        return withBreakParent ? "hardline" : "hardlineWithoutBreakParent";
      }
      if (doc3.soft) {
        return "softline";
      }
      return "line";
    }
    if (doc3.type === DOC_TYPE_BREAK_PARENT) {
      const afterHardline = ((_b = parentParts == null ? void 0 : parentParts[index - 1]) == null ? void 0 : _b.type) === DOC_TYPE_LINE && parentParts[index - 1].hard;
      return afterHardline ? void 0 : "breakParent";
    }
    if (doc3.type === DOC_TYPE_TRIM) {
      return "trim";
    }
    if (doc3.type === DOC_TYPE_INDENT) {
      return "indent(" + printDoc(doc3.contents) + ")";
    }
    if (doc3.type === DOC_TYPE_ALIGN) {
      return doc3.n === Number.NEGATIVE_INFINITY ? "dedentToRoot(" + printDoc(doc3.contents) + ")" : doc3.n < 0 ? "dedent(" + printDoc(doc3.contents) + ")" : doc3.n.type === "root" ? "markAsRoot(" + printDoc(doc3.contents) + ")" : "align(" + JSON.stringify(doc3.n) + ", " + printDoc(doc3.contents) + ")";
    }
    if (doc3.type === DOC_TYPE_IF_BREAK) {
      return "ifBreak(" + printDoc(doc3.breakContents) + (doc3.flatContents ? ", " + printDoc(doc3.flatContents) : "") + (doc3.groupId ? (!doc3.flatContents ? ', ""' : "") + `, { groupId: ${printGroupId(doc3.groupId)} }` : "") + ")";
    }
    if (doc3.type === DOC_TYPE_INDENT_IF_BREAK) {
      const optionsParts = [];
      if (doc3.negate) {
        optionsParts.push("negate: true");
      }
      if (doc3.groupId) {
        optionsParts.push(`groupId: ${printGroupId(doc3.groupId)}`);
      }
      const options8 = optionsParts.length > 0 ? `, { ${optionsParts.join(", ")} }` : "";
      return `indentIfBreak(${printDoc(doc3.contents)}${options8})`;
    }
    if (doc3.type === DOC_TYPE_GROUP) {
      const optionsParts = [];
      if (doc3.break && doc3.break !== "propagated") {
        optionsParts.push("shouldBreak: true");
      }
      if (doc3.id) {
        optionsParts.push(`id: ${printGroupId(doc3.id)}`);
      }
      const options8 = optionsParts.length > 0 ? `, { ${optionsParts.join(", ")} }` : "";
      if (doc3.expandedStates) {
        return `conditionalGroup([${doc3.expandedStates.map((part) => printDoc(part)).join(",")}]${options8})`;
      }
      return `group(${printDoc(doc3.contents)}${options8})`;
    }
    if (doc3.type === DOC_TYPE_FILL) {
      return `fill([${doc3.parts.map((part) => printDoc(part)).join(", ")}])`;
    }
    if (doc3.type === DOC_TYPE_LINE_SUFFIX) {
      return "lineSuffix(" + printDoc(doc3.contents) + ")";
    }
    if (doc3.type === DOC_TYPE_LINE_SUFFIX_BOUNDARY) {
      return "lineSuffixBoundary";
    }
    if (doc3.type === DOC_TYPE_LABEL) {
      return `label(${JSON.stringify(doc3.label)}, ${printDoc(doc3.contents)})`;
    }
    throw new Error("Unknown doc type " + doc3.type);
  }
  function printGroupId(id) {
    if (typeof id !== "symbol") {
      return JSON.stringify(String(id));
    }
    if (id in printedSymbols) {
      return printedSymbols[id];
    }
    const prefix = id.description || "symbol";
    for (let counter = 0; ; counter++) {
      const key2 = prefix + (counter > 0 ? ` #${counter}` : "");
      if (!usedKeysForSymbols.has(key2)) {
        usedKeysForSymbols.add(key2);
        return printedSymbols[id] = `Symbol.for(${JSON.stringify(key2)})`;
      }
    }
  }
}

// scripts/build/shims/at.js
var at = (isOptionalObject, object, index) => {
  if (isOptionalObject && (object === void 0 || object === null)) {
    return;
  }
  if (Array.isArray(object) || typeof object === "string") {
    return object[index < 0 ? object.length + index : index];
  }
  return object.at(index);
};
var at_default = at;

// node_modules/emoji-regex/index.mjs
var emoji_regex_default = () => {
  return /[#*0-9]\uFE0F?\u20E3|[\xA9\xAE\u203C\u2049\u2122\u2139\u2194-\u2199\u21A9\u21AA\u231A\u231B\u2328\u23CF\u23ED-\u23EF\u23F1\u23F2\u23F8-\u23FA\u24C2\u25AA\u25AB\u25B6\u25C0\u25FB\u25FC\u25FE\u2600-\u2604\u260E\u2611\u2614\u2615\u2618\u2620\u2622\u2623\u2626\u262A\u262E\u262F\u2638-\u263A\u2640\u2642\u2648-\u2653\u265F\u2660\u2663\u2665\u2666\u2668\u267B\u267E\u267F\u2692\u2694-\u2697\u2699\u269B\u269C\u26A0\u26A7\u26AA\u26B0\u26B1\u26BD\u26BE\u26C4\u26C8\u26CF\u26D1\u26E9\u26F0-\u26F5\u26F7\u26F8\u26FA\u2702\u2708\u2709\u270F\u2712\u2714\u2716\u271D\u2721\u2733\u2734\u2744\u2747\u2757\u2763\u27A1\u2934\u2935\u2B05-\u2B07\u2B1B\u2B1C\u2B55\u3030\u303D\u3297\u3299]\uFE0F?|[\u261D\u270C\u270D](?:\uFE0F|\uD83C[\uDFFB-\uDFFF])?|[\u270A\u270B](?:\uD83C[\uDFFB-\uDFFF])?|[\u23E9-\u23EC\u23F0\u23F3\u25FD\u2693\u26A1\u26AB\u26C5\u26CE\u26D4\u26EA\u26FD\u2705\u2728\u274C\u274E\u2753-\u2755\u2795-\u2797\u27B0\u27BF\u2B50]|\u26D3\uFE0F?(?:\u200D\uD83D\uDCA5)?|\u26F9(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|\u2764\uFE0F?(?:\u200D(?:\uD83D\uDD25|\uD83E\uDE79))?|\uD83C(?:[\uDC04\uDD70\uDD71\uDD7E\uDD7F\uDE02\uDE37\uDF21\uDF24-\uDF2C\uDF36\uDF7D\uDF96\uDF97\uDF99-\uDF9B\uDF9E\uDF9F\uDFCD\uDFCE\uDFD4-\uDFDF\uDFF5\uDFF7]\uFE0F?|[\uDF85\uDFC2\uDFC7](?:\uD83C[\uDFFB-\uDFFF])?|[\uDFC4\uDFCA](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDFCB\uDFCC](?:\uFE0F|\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDCCF\uDD8E\uDD91-\uDD9A\uDE01\uDE1A\uDE2F\uDE32-\uDE36\uDE38-\uDE3A\uDE50\uDE51\uDF00-\uDF20\uDF2D-\uDF35\uDF37-\uDF43\uDF45-\uDF4A\uDF4C-\uDF7C\uDF7E-\uDF84\uDF86-\uDF93\uDFA0-\uDFC1\uDFC5\uDFC6\uDFC8\uDFC9\uDFCF-\uDFD3\uDFE0-\uDFF0\uDFF8-\uDFFF]|\uDDE6\uD83C[\uDDE8-\uDDEC\uDDEE\uDDF1\uDDF2\uDDF4\uDDF6-\uDDFA\uDDFC\uDDFD\uDDFF]|\uDDE7\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEF\uDDF1-\uDDF4\uDDF6-\uDDF9\uDDFB\uDDFC\uDDFE\uDDFF]|\uDDE8\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDEE\uDDF0-\uDDF5\uDDF7\uDDFA-\uDDFF]|\uDDE9\uD83C[\uDDEA\uDDEC\uDDEF\uDDF0\uDDF2\uDDF4\uDDFF]|\uDDEA\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDED\uDDF7-\uDDFA]|\uDDEB\uD83C[\uDDEE-\uDDF0\uDDF2\uDDF4\uDDF7]|\uDDEC\uD83C[\uDDE6\uDDE7\uDDE9-\uDDEE\uDDF1-\uDDF3\uDDF5-\uDDFA\uDDFC\uDDFE]|\uDDED\uD83C[\uDDF0\uDDF2\uDDF3\uDDF7\uDDF9\uDDFA]|\uDDEE\uD83C[\uDDE8-\uDDEA\uDDF1-\uDDF4\uDDF6-\uDDF9]|\uDDEF\uD83C[\uDDEA\uDDF2\uDDF4\uDDF5]|\uDDF0\uD83C[\uDDEA\uDDEC-\uDDEE\uDDF2\uDDF3\uDDF5\uDDF7\uDDFC\uDDFE\uDDFF]|\uDDF1\uD83C[\uDDE6-\uDDE8\uDDEE\uDDF0\uDDF7-\uDDFB\uDDFE]|\uDDF2\uD83C[\uDDE6\uDDE8-\uDDED\uDDF0-\uDDFF]|\uDDF3\uD83C[\uDDE6\uDDE8\uDDEA-\uDDEC\uDDEE\uDDF1\uDDF4\uDDF5\uDDF7\uDDFA\uDDFF]|\uDDF4\uD83C\uDDF2|\uDDF5\uD83C[\uDDE6\uDDEA-\uDDED\uDDF0-\uDDF3\uDDF7-\uDDF9\uDDFC\uDDFE]|\uDDF6\uD83C\uDDE6|\uDDF7\uD83C[\uDDEA\uDDF4\uDDF8\uDDFA\uDDFC]|\uDDF8\uD83C[\uDDE6-\uDDEA\uDDEC-\uDDF4\uDDF7-\uDDF9\uDDFB\uDDFD-\uDDFF]|\uDDF9\uD83C[\uDDE6\uDDE8\uDDE9\uDDEB-\uDDED\uDDEF-\uDDF4\uDDF7\uDDF9\uDDFB\uDDFC\uDDFF]|\uDDFA\uD83C[\uDDE6\uDDEC\uDDF2\uDDF3\uDDF8\uDDFE\uDDFF]|\uDDFB\uD83C[\uDDE6\uDDE8\uDDEA\uDDEC\uDDEE\uDDF3\uDDFA]|\uDDFC\uD83C[\uDDEB\uDDF8]|\uDDFD\uD83C\uDDF0|\uDDFE\uD83C[\uDDEA\uDDF9]|\uDDFF\uD83C[\uDDE6\uDDF2\uDDFC]|\uDF44(?:\u200D\uD83D\uDFEB)?|\uDF4B(?:\u200D\uD83D\uDFE9)?|\uDFC3(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDFF3\uFE0F?(?:\u200D(?:\u26A7\uFE0F?|\uD83C\uDF08))?|\uDFF4(?:\u200D\u2620\uFE0F?|\uDB40\uDC67\uDB40\uDC62\uDB40(?:\uDC65\uDB40\uDC6E\uDB40\uDC67|\uDC73\uDB40\uDC63\uDB40\uDC74|\uDC77\uDB40\uDC6C\uDB40\uDC73)\uDB40\uDC7F)?)|\uD83D(?:[\uDC3F\uDCFD\uDD49\uDD4A\uDD6F\uDD70\uDD73\uDD76-\uDD79\uDD87\uDD8A-\uDD8D\uDDA5\uDDA8\uDDB1\uDDB2\uDDBC\uDDC2-\uDDC4\uDDD1-\uDDD3\uDDDC-\uDDDE\uDDE1\uDDE3\uDDE8\uDDEF\uDDF3\uDDFA\uDECB\uDECD-\uDECF\uDEE0-\uDEE5\uDEE9\uDEF0\uDEF3]\uFE0F?|[\uDC42\uDC43\uDC46-\uDC50\uDC66\uDC67\uDC6B-\uDC6D\uDC72\uDC74-\uDC76\uDC78\uDC7C\uDC83\uDC85\uDC8F\uDC91\uDCAA\uDD7A\uDD95\uDD96\uDE4C\uDE4F\uDEC0\uDECC](?:\uD83C[\uDFFB-\uDFFF])?|[\uDC6E\uDC70\uDC71\uDC73\uDC77\uDC81\uDC82\uDC86\uDC87\uDE45-\uDE47\uDE4B\uDE4D\uDE4E\uDEA3\uDEB4\uDEB5](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD74\uDD90](?:\uFE0F|\uD83C[\uDFFB-\uDFFF])?|[\uDC00-\uDC07\uDC09-\uDC14\uDC16-\uDC25\uDC27-\uDC3A\uDC3C-\uDC3E\uDC40\uDC44\uDC45\uDC51-\uDC65\uDC6A\uDC79-\uDC7B\uDC7D-\uDC80\uDC84\uDC88-\uDC8E\uDC90\uDC92-\uDCA9\uDCAB-\uDCFC\uDCFF-\uDD3D\uDD4B-\uDD4E\uDD50-\uDD67\uDDA4\uDDFB-\uDE2D\uDE2F-\uDE34\uDE37-\uDE41\uDE43\uDE44\uDE48-\uDE4A\uDE80-\uDEA2\uDEA4-\uDEB3\uDEB7-\uDEBF\uDEC1-\uDEC5\uDED0-\uDED2\uDED5-\uDED7\uDEDC-\uDEDF\uDEEB\uDEEC\uDEF4-\uDEFC\uDFE0-\uDFEB\uDFF0]|\uDC08(?:\u200D\u2B1B)?|\uDC15(?:\u200D\uD83E\uDDBA)?|\uDC26(?:\u200D(?:\u2B1B|\uD83D\uDD25))?|\uDC3B(?:\u200D\u2744\uFE0F?)?|\uDC41\uFE0F?(?:\u200D\uD83D\uDDE8\uFE0F?)?|\uDC68(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDC68\uDC69]\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?)|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?\uDC68\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D\uDC68\uD83C[\uDFFB-\uDFFE])))?))?|\uDC69(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:\uDC8B\u200D\uD83D)?[\uDC68\uDC69]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D(?:[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?|\uDC69\u200D\uD83D(?:\uDC66(?:\u200D\uD83D\uDC66)?|\uDC67(?:\u200D\uD83D[\uDC66\uDC67])?))|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFC-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFD-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFD\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D\uD83D(?:[\uDC68\uDC69]|\uDC8B\u200D\uD83D[\uDC68\uDC69])\uD83C[\uDFFB-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83D[\uDC68\uDC69]\uD83C[\uDFFB-\uDFFE])))?))?|\uDC6F(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDD75(?:\uFE0F|\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|\uDE2E(?:\u200D\uD83D\uDCA8)?|\uDE35(?:\u200D\uD83D\uDCAB)?|\uDE36(?:\u200D\uD83C\uDF2B\uFE0F?)?|\uDE42(?:\u200D[\u2194\u2195]\uFE0F?)?|\uDEB6(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?)|\uD83E(?:[\uDD0C\uDD0F\uDD18-\uDD1F\uDD30-\uDD34\uDD36\uDD77\uDDB5\uDDB6\uDDBB\uDDD2\uDDD3\uDDD5\uDEC3-\uDEC5\uDEF0\uDEF2-\uDEF8](?:\uD83C[\uDFFB-\uDFFF])?|[\uDD26\uDD35\uDD37-\uDD39\uDD3D\uDD3E\uDDB8\uDDB9\uDDCD\uDDCF\uDDD4\uDDD6-\uDDDD](?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDDDE\uDDDF](?:\u200D[\u2640\u2642]\uFE0F?)?|[\uDD0D\uDD0E\uDD10-\uDD17\uDD20-\uDD25\uDD27-\uDD2F\uDD3A\uDD3F-\uDD45\uDD47-\uDD76\uDD78-\uDDB4\uDDB7\uDDBA\uDDBC-\uDDCC\uDDD0\uDDE0-\uDDFF\uDE70-\uDE7C\uDE80-\uDE88\uDE90-\uDEBD\uDEBF-\uDEC2\uDECE-\uDEDB\uDEE0-\uDEE8]|\uDD3C(?:\u200D[\u2640\u2642]\uFE0F?|\uD83C[\uDFFB-\uDFFF])?|\uDDCE(?:\uD83C[\uDFFB-\uDFFF])?(?:\u200D(?:[\u2640\u2642]\uFE0F?(?:\u200D\u27A1\uFE0F?)?|\u27A1\uFE0F?))?|\uDDD1(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1|\uDDD1\u200D\uD83E\uDDD2(?:\u200D\uD83E\uDDD2)?|\uDDD2(?:\u200D\uD83E\uDDD2)?))|\uD83C(?:\uDFFB(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFC-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFC(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFD-\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFD(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFE(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFD\uDFFF]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?|\uDFFF(?:\u200D(?:[\u2695\u2696\u2708]\uFE0F?|\u2764\uFE0F?\u200D(?:\uD83D\uDC8B\u200D)?\uD83E\uDDD1\uD83C[\uDFFB-\uDFFE]|\uD83C[\uDF3E\uDF73\uDF7C\uDF84\uDF93\uDFA4\uDFA8\uDFEB\uDFED]|\uD83D[\uDCBB\uDCBC\uDD27\uDD2C\uDE80\uDE92]|\uD83E(?:[\uDDAF\uDDBC\uDDBD](?:\u200D\u27A1\uFE0F?)?|[\uDDB0-\uDDB3]|\uDD1D\u200D\uD83E\uDDD1\uD83C[\uDFFB-\uDFFF])))?))?|\uDEF1(?:\uD83C(?:\uDFFB(?:\u200D\uD83E\uDEF2\uD83C[\uDFFC-\uDFFF])?|\uDFFC(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFD-\uDFFF])?|\uDFFD(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB\uDFFC\uDFFE\uDFFF])?|\uDFFE(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFD\uDFFF])?|\uDFFF(?:\u200D\uD83E\uDEF2\uD83C[\uDFFB-\uDFFE])?))?)/g;
};

// node_modules/get-east-asian-width/lookup.js
function isFullWidth(x) {
  return x === 12288 || x >= 65281 && x <= 65376 || x >= 65504 && x <= 65510;
}
function isWide(x) {
  return x >= 4352 && x <= 4447 || x === 8986 || x === 8987 || x === 9001 || x === 9002 || x >= 9193 && x <= 9196 || x === 9200 || x === 9203 || x === 9725 || x === 9726 || x === 9748 || x === 9749 || x >= 9800 && x <= 9811 || x === 9855 || x === 9875 || x === 9889 || x === 9898 || x === 9899 || x === 9917 || x === 9918 || x === 9924 || x === 9925 || x === 9934 || x === 9940 || x === 9962 || x === 9970 || x === 9971 || x === 9973 || x === 9978 || x === 9981 || x === 9989 || x === 9994 || x === 9995 || x === 10024 || x === 10060 || x === 10062 || x >= 10067 && x <= 10069 || x === 10071 || x >= 10133 && x <= 10135 || x === 10160 || x === 10175 || x === 11035 || x === 11036 || x === 11088 || x === 11093 || x >= 11904 && x <= 11929 || x >= 11931 && x <= 12019 || x >= 12032 && x <= 12245 || x >= 12272 && x <= 12287 || x >= 12289 && x <= 12350 || x >= 12353 && x <= 12438 || x >= 12441 && x <= 12543 || x >= 12549 && x <= 12591 || x >= 12593 && x <= 12686 || x >= 12688 && x <= 12771 || x >= 12783 && x <= 12830 || x >= 12832 && x <= 12871 || x >= 12880 && x <= 19903 || x >= 19968 && x <= 42124 || x >= 42128 && x <= 42182 || x >= 43360 && x <= 43388 || x >= 44032 && x <= 55203 || x >= 63744 && x <= 64255 || x >= 65040 && x <= 65049 || x >= 65072 && x <= 65106 || x >= 65108 && x <= 65126 || x >= 65128 && x <= 65131 || x >= 94176 && x <= 94180 || x === 94192 || x === 94193 || x >= 94208 && x <= 100343 || x >= 100352 && x <= 101589 || x >= 101632 && x <= 101640 || x >= 110576 && x <= 110579 || x >= 110581 && x <= 110587 || x === 110589 || x === 110590 || x >= 110592 && x <= 110882 || x === 110898 || x >= 110928 && x <= 110930 || x === 110933 || x >= 110948 && x <= 110951 || x >= 110960 && x <= 111355 || x === 126980 || x === 127183 || x === 127374 || x >= 127377 && x <= 127386 || x >= 127488 && x <= 127490 || x >= 127504 && x <= 127547 || x >= 127552 && x <= 127560 || x === 127568 || x === 127569 || x >= 127584 && x <= 127589 || x >= 127744 && x <= 127776 || x >= 127789 && x <= 127797 || x >= 127799 && x <= 127868 || x >= 127870 && x <= 127891 || x >= 127904 && x <= 127946 || x >= 127951 && x <= 127955 || x >= 127968 && x <= 127984 || x === 127988 || x >= 127992 && x <= 128062 || x === 128064 || x >= 128066 && x <= 128252 || x >= 128255 && x <= 128317 || x >= 128331 && x <= 128334 || x >= 128336 && x <= 128359 || x === 128378 || x === 128405 || x === 128406 || x === 128420 || x >= 128507 && x <= 128591 || x >= 128640 && x <= 128709 || x === 128716 || x >= 128720 && x <= 128722 || x >= 128725 && x <= 128727 || x >= 128732 && x <= 128735 || x === 128747 || x === 128748 || x >= 128756 && x <= 128764 || x >= 128992 && x <= 129003 || x === 129008 || x >= 129292 && x <= 129338 || x >= 129340 && x <= 129349 || x >= 129351 && x <= 129535 || x >= 129648 && x <= 129660 || x >= 129664 && x <= 129672 || x >= 129680 && x <= 129725 || x >= 129727 && x <= 129733 || x >= 129742 && x <= 129755 || x >= 129760 && x <= 129768 || x >= 129776 && x <= 129784 || x >= 131072 && x <= 196605 || x >= 196608 && x <= 262141;
}

// node_modules/get-east-asian-width/index.js
var _isNarrowWidth = (codePoint) => !(isFullWidth(codePoint) || isWide(codePoint));

// src/utils/get-string-width.js
var notAsciiRegex = /[^\x20-\x7F]/u;
function getStringWidth(text) {
  if (!text) {
    return 0;
  }
  if (!notAsciiRegex.test(text)) {
    return text.length;
  }
  text = text.replace(emoji_regex_default(), "  ");
  let width = 0;
  for (const character of text) {
    const codePoint = character.codePointAt(0);
    if (codePoint <= 31 || codePoint >= 127 && codePoint <= 159) {
      continue;
    }
    if (codePoint >= 768 && codePoint <= 879) {
      continue;
    }
    width += _isNarrowWidth(codePoint) ? 1 : 2;
  }
  return width;
}
var get_string_width_default = getStringWidth;

// src/document/utils.js
function mapDoc(doc2, cb) {
  if (typeof doc2 === "string") {
    return cb(doc2);
  }
  const mapped = /* @__PURE__ */ new Map();
  return rec(doc2);
  function rec(doc3) {
    if (mapped.has(doc3)) {
      return mapped.get(doc3);
    }
    const result = process4(doc3);
    mapped.set(doc3, result);
    return result;
  }
  function process4(doc3) {
    switch (get_doc_type_default(doc3)) {
      case DOC_TYPE_ARRAY:
        return cb(doc3.map(rec));
      case DOC_TYPE_FILL:
        return cb({
          ...doc3,
          parts: doc3.parts.map(rec)
        });
      case DOC_TYPE_IF_BREAK:
        return cb({
          ...doc3,
          breakContents: rec(doc3.breakContents),
          flatContents: rec(doc3.flatContents)
        });
      case DOC_TYPE_GROUP: {
        let {
          expandedStates,
          contents
        } = doc3;
        if (expandedStates) {
          expandedStates = expandedStates.map(rec);
          contents = expandedStates[0];
        } else {
          contents = rec(contents);
        }
        return cb({
          ...doc3,
          contents,
          expandedStates
        });
      }
      case DOC_TYPE_ALIGN:
      case DOC_TYPE_INDENT:
      case DOC_TYPE_INDENT_IF_BREAK:
      case DOC_TYPE_LABEL:
      case DOC_TYPE_LINE_SUFFIX:
        return cb({
          ...doc3,
          contents: rec(doc3.contents)
        });
      case DOC_TYPE_STRING:
      case DOC_TYPE_CURSOR:
      case DOC_TYPE_TRIM:
      case DOC_TYPE_LINE_SUFFIX_BOUNDARY:
      case DOC_TYPE_LINE:
      case DOC_TYPE_BREAK_PARENT:
        return cb(doc3);
      default:
        throw new invalid_doc_error_default(doc3);
    }
  }
}
function breakParentGroup(groupStack) {
  if (groupStack.length > 0) {
    const parentGroup = at_default(
      /* isOptionalObject */
      false,
      groupStack,
      -1
    );
    if (!parentGroup.expandedStates && !parentGroup.break) {
      parentGroup.break = "propagated";
    }
  }
  return null;
}
function propagateBreaks(doc2) {
  const alreadyVisitedSet = /* @__PURE__ */ new Set();
  const groupStack = [];
  function propagateBreaksOnEnterFn(doc3) {
    if (doc3.type === DOC_TYPE_BREAK_PARENT) {
      breakParentGroup(groupStack);
    }
    if (doc3.type === DOC_TYPE_GROUP) {
      groupStack.push(doc3);
      if (alreadyVisitedSet.has(doc3)) {
        return false;
      }
      alreadyVisitedSet.add(doc3);
    }
  }
  function propagateBreaksOnExitFn(doc3) {
    if (doc3.type === DOC_TYPE_GROUP) {
      const group = groupStack.pop();
      if (group.break) {
        breakParentGroup(groupStack);
      }
    }
  }
  traverse_doc_default(
    doc2,
    propagateBreaksOnEnterFn,
    propagateBreaksOnExitFn,
    /* shouldTraverseConditionalGroups */
    true
  );
}
function stripTrailingHardlineFromParts(parts) {
  parts = [...parts];
  while (parts.length >= 2 && at_default(
    /* isOptionalObject */
    false,
    parts,
    -2
  ).type === DOC_TYPE_LINE && at_default(
    /* isOptionalObject */
    false,
    parts,
    -1
  ).type === DOC_TYPE_BREAK_PARENT) {
    parts.length -= 2;
  }
  if (parts.length > 0) {
    const lastPart = stripTrailingHardlineFromDoc(at_default(
      /* isOptionalObject */
      false,
      parts,
      -1
    ));
    parts[parts.length - 1] = lastPart;
  }
  return parts;
}
function stripTrailingHardlineFromDoc(doc2) {
  switch (get_doc_type_default(doc2)) {
    case DOC_TYPE_INDENT:
    case DOC_TYPE_INDENT_IF_BREAK:
    case DOC_TYPE_GROUP:
    case DOC_TYPE_LINE_SUFFIX:
    case DOC_TYPE_LABEL: {
      const contents = stripTrailingHardlineFromDoc(doc2.contents);
      return {
        ...doc2,
        contents
      };
    }
    case DOC_TYPE_IF_BREAK:
      return {
        ...doc2,
        breakContents: stripTrailingHardlineFromDoc(doc2.breakContents),
        flatContents: stripTrailingHardlineFromDoc(doc2.flatContents)
      };
    case DOC_TYPE_FILL:
      return {
        ...doc2,
        parts: stripTrailingHardlineFromParts(doc2.parts)
      };
    case DOC_TYPE_ARRAY:
      return stripTrailingHardlineFromParts(doc2);
    case DOC_TYPE_STRING:
      return doc2.replace(/[\n\r]*$/u, "");
    case DOC_TYPE_ALIGN:
    case DOC_TYPE_CURSOR:
    case DOC_TYPE_TRIM:
    case DOC_TYPE_LINE_SUFFIX_BOUNDARY:
    case DOC_TYPE_LINE:
    case DOC_TYPE_BREAK_PARENT:
      break;
    default:
      throw new invalid_doc_error_default(doc2);
  }
  return doc2;
}
function stripTrailingHardline(doc2) {
  return stripTrailingHardlineFromDoc(cleanDoc(doc2));
}
function cleanDocFn(doc2) {
  switch (get_doc_type_default(doc2)) {
    case DOC_TYPE_FILL:
      if (doc2.parts.every((part) => part === "")) {
        return "";
      }
      break;
    case DOC_TYPE_GROUP:
      if (!doc2.contents && !doc2.id && !doc2.break && !doc2.expandedStates) {
        return "";
      }
      if (doc2.contents.type === DOC_TYPE_GROUP && doc2.contents.id === doc2.id && doc2.contents.break === doc2.break && doc2.contents.expandedStates === doc2.expandedStates) {
        return doc2.contents;
      }
      break;
    case DOC_TYPE_ALIGN:
    case DOC_TYPE_INDENT:
    case DOC_TYPE_INDENT_IF_BREAK:
    case DOC_TYPE_LINE_SUFFIX:
      if (!doc2.contents) {
        return "";
      }
      break;
    case DOC_TYPE_IF_BREAK:
      if (!doc2.flatContents && !doc2.breakContents) {
        return "";
      }
      break;
    case DOC_TYPE_ARRAY: {
      const parts = [];
      for (const part of doc2) {
        if (!part) {
          continue;
        }
        const [currentPart, ...restParts] = Array.isArray(part) ? part : [part];
        if (typeof currentPart === "string" && typeof at_default(
          /* isOptionalObject */
          false,
          parts,
          -1
        ) === "string") {
          parts[parts.length - 1] += currentPart;
        } else {
          parts.push(currentPart);
        }
        parts.push(...restParts);
      }
      if (parts.length === 0) {
        return "";
      }
      if (parts.length === 1) {
        return parts[0];
      }
      return parts;
    }
    case DOC_TYPE_STRING:
    case DOC_TYPE_CURSOR:
    case DOC_TYPE_TRIM:
    case DOC_TYPE_LINE_SUFFIX_BOUNDARY:
    case DOC_TYPE_LINE:
    case DOC_TYPE_LABEL:
    case DOC_TYPE_BREAK_PARENT:
      break;
    default:
      throw new invalid_doc_error_default(doc2);
  }
  return doc2;
}
function cleanDoc(doc2) {
  return mapDoc(doc2, (currentDoc) => cleanDocFn(currentDoc));
}
function inheritLabel(doc2, fn) {
  return doc2.type === DOC_TYPE_LABEL ? {
    ...doc2,
    contents: fn(doc2.contents)
  } : fn(doc2);
}

// src/document/printer.js
var MODE_BREAK = Symbol("MODE_BREAK");
var MODE_FLAT = Symbol("MODE_FLAT");
var CURSOR_PLACEHOLDER = Symbol("cursor");
function rootIndent() {
  return {
    value: "",
    length: 0,
    queue: []
  };
}
function makeIndent(ind, options8) {
  return generateInd(ind, {
    type: "indent"
  }, options8);
}
function makeAlign(indent2, widthOrDoc, options8) {
  if (widthOrDoc === Number.NEGATIVE_INFINITY) {
    return indent2.root || rootIndent();
  }
  if (widthOrDoc < 0) {
    return generateInd(indent2, {
      type: "dedent"
    }, options8);
  }
  if (!widthOrDoc) {
    return indent2;
  }
  if (widthOrDoc.type === "root") {
    return {
      ...indent2,
      root: indent2
    };
  }
  const alignType = typeof widthOrDoc === "string" ? "stringAlign" : "numberAlign";
  return generateInd(indent2, {
    type: alignType,
    n: widthOrDoc
  }, options8);
}
function generateInd(ind, newPart, options8) {
  const queue = newPart.type === "dedent" ? ind.queue.slice(0, -1) : [...ind.queue, newPart];
  let value = "";
  let length = 0;
  let lastTabs = 0;
  let lastSpaces = 0;
  for (const part of queue) {
    switch (part.type) {
      case "indent":
        flush();
        if (options8.useTabs) {
          addTabs(1);
        } else {
          addSpaces(options8.tabWidth);
        }
        break;
      case "stringAlign":
        flush();
        value += part.n;
        length += part.n.length;
        break;
      case "numberAlign":
        lastTabs += 1;
        lastSpaces += part.n;
        break;
      default:
        throw new Error(`Unexpected type '${part.type}'`);
    }
  }
  flushSpaces();
  return {
    ...ind,
    value,
    length,
    queue
  };
  function addTabs(count) {
    value += "	".repeat(count);
    length += options8.tabWidth * count;
  }
  function addSpaces(count) {
    value += " ".repeat(count);
    length += count;
  }
  function flush() {
    if (options8.useTabs) {
      flushTabs();
    } else {
      flushSpaces();
    }
  }
  function flushTabs() {
    if (lastTabs > 0) {
      addTabs(lastTabs);
    }
    resetLast();
  }
  function flushSpaces() {
    if (lastSpaces > 0) {
      addSpaces(lastSpaces);
    }
    resetLast();
  }
  function resetLast() {
    lastTabs = 0;
    lastSpaces = 0;
  }
}
function trim(out) {
  let trimCount = 0;
  let cursorCount = 0;
  let outIndex = out.length;
  outer: while (outIndex--) {
    const last = out[outIndex];
    if (last === CURSOR_PLACEHOLDER) {
      cursorCount++;
      continue;
    }
    if (false) {
      throw new Error(`Unexpected value in trim: '${typeof last}'`);
    }
    for (let charIndex = last.length - 1; charIndex >= 0; charIndex--) {
      const char = last[charIndex];
      if (char === " " || char === "	") {
        trimCount++;
      } else {
        out[outIndex] = last.slice(0, charIndex + 1);
        break outer;
      }
    }
  }
  if (trimCount > 0 || cursorCount > 0) {
    out.length = outIndex + 1;
    while (cursorCount-- > 0) {
      out.push(CURSOR_PLACEHOLDER);
    }
  }
  return trimCount;
}
function fits(next, restCommands, width, hasLineSuffix, groupModeMap, mustBeFlat) {
  if (width === Number.POSITIVE_INFINITY) {
    return true;
  }
  let restIdx = restCommands.length;
  const cmds = [next];
  const out = [];
  while (width >= 0) {
    if (cmds.length === 0) {
      if (restIdx === 0) {
        return true;
      }
      cmds.push(restCommands[--restIdx]);
      continue;
    }
    const {
      mode,
      doc: doc2
    } = cmds.pop();
    const docType = get_doc_type_default(doc2);
    switch (docType) {
      case DOC_TYPE_STRING:
        out.push(doc2);
        width -= get_string_width_default(doc2);
        break;
      case DOC_TYPE_ARRAY:
      case DOC_TYPE_FILL: {
        const parts = docType === DOC_TYPE_ARRAY ? doc2 : doc2.parts;
        for (let i = parts.length - 1; i >= 0; i--) {
          cmds.push({
            mode,
            doc: parts[i]
          });
        }
        break;
      }
      case DOC_TYPE_INDENT:
      case DOC_TYPE_ALIGN:
      case DOC_TYPE_INDENT_IF_BREAK:
      case DOC_TYPE_LABEL:
        cmds.push({
          mode,
          doc: doc2.contents
        });
        break;
      case DOC_TYPE_TRIM:
        width += trim(out);
        break;
      case DOC_TYPE_GROUP: {
        if (mustBeFlat && doc2.break) {
          return false;
        }
        const groupMode = doc2.break ? MODE_BREAK : mode;
        const contents = doc2.expandedStates && groupMode === MODE_BREAK ? at_default(
          /* isOptionalObject */
          false,
          doc2.expandedStates,
          -1
        ) : doc2.contents;
        cmds.push({
          mode: groupMode,
          doc: contents
        });
        break;
      }
      case DOC_TYPE_IF_BREAK: {
        const groupMode = doc2.groupId ? groupModeMap[doc2.groupId] || MODE_FLAT : mode;
        const contents = groupMode === MODE_BREAK ? doc2.breakContents : doc2.flatContents;
        if (contents) {
          cmds.push({
            mode,
            doc: contents
          });
        }
        break;
      }
      case DOC_TYPE_LINE:
        if (mode === MODE_BREAK || doc2.hard) {
          return true;
        }
        if (!doc2.soft) {
          out.push(" ");
          width--;
        }
        break;
      case DOC_TYPE_LINE_SUFFIX:
        hasLineSuffix = true;
        break;
      case DOC_TYPE_LINE_SUFFIX_BOUNDARY:
        if (hasLineSuffix) {
          return false;
        }
        break;
    }
  }
  return false;
}
function printDocToString(doc2, options8) {
  const groupModeMap = {};
  const width = options8.printWidth;
  const newLine = convertEndOfLineToChars(options8.endOfLine);
  let pos2 = 0;
  const cmds = [{
    ind: rootIndent(),
    mode: MODE_BREAK,
    doc: doc2
  }];
  const out = [];
  let shouldRemeasure = false;
  const lineSuffix2 = [];
  let printedCursorCount = 0;
  propagateBreaks(doc2);
  while (cmds.length > 0) {
    const {
      ind,
      mode,
      doc: doc3
    } = cmds.pop();
    switch (get_doc_type_default(doc3)) {
      case DOC_TYPE_STRING: {
        const formatted = newLine !== "\n" ? string_replace_all_default(
          /* isOptionalObject */
          false,
          doc3,
          "\n",
          newLine
        ) : doc3;
        out.push(formatted);
        if (cmds.length > 0) {
          pos2 += get_string_width_default(formatted);
        }
        break;
      }
      case DOC_TYPE_ARRAY:
        for (let i = doc3.length - 1; i >= 0; i--) {
          cmds.push({
            ind,
            mode,
            doc: doc3[i]
          });
        }
        break;
      case DOC_TYPE_CURSOR:
        if (printedCursorCount >= 2) {
          throw new Error("There are too many 'cursor' in doc.");
        }
        out.push(CURSOR_PLACEHOLDER);
        printedCursorCount++;
        break;
      case DOC_TYPE_INDENT:
        cmds.push({
          ind: makeIndent(ind, options8),
          mode,
          doc: doc3.contents
        });
        break;
      case DOC_TYPE_ALIGN:
        cmds.push({
          ind: makeAlign(ind, doc3.n, options8),
          mode,
          doc: doc3.contents
        });
        break;
      case DOC_TYPE_TRIM:
        pos2 -= trim(out);
        break;
      case DOC_TYPE_GROUP:
        switch (mode) {
          case MODE_FLAT:
            if (!shouldRemeasure) {
              cmds.push({
                ind,
                mode: doc3.break ? MODE_BREAK : MODE_FLAT,
                doc: doc3.contents
              });
              break;
            }
          case MODE_BREAK: {
            shouldRemeasure = false;
            const next = {
              ind,
              mode: MODE_FLAT,
              doc: doc3.contents
            };
            const rem = width - pos2;
            const hasLineSuffix = lineSuffix2.length > 0;
            if (!doc3.break && fits(next, cmds, rem, hasLineSuffix, groupModeMap)) {
              cmds.push(next);
            } else {
              if (doc3.expandedStates) {
                const mostExpanded = at_default(
                  /* isOptionalObject */
                  false,
                  doc3.expandedStates,
                  -1
                );
                if (doc3.break) {
                  cmds.push({
                    ind,
                    mode: MODE_BREAK,
                    doc: mostExpanded
                  });
                  break;
                } else {
                  for (let i = 1; i < doc3.expandedStates.length + 1; i++) {
                    if (i >= doc3.expandedStates.length) {
                      cmds.push({
                        ind,
                        mode: MODE_BREAK,
                        doc: mostExpanded
                      });
                      break;
                    } else {
                      const state = doc3.expandedStates[i];
                      const cmd = {
                        ind,
                        mode: MODE_FLAT,
                        doc: state
                      };
                      if (fits(cmd, cmds, rem, hasLineSuffix, groupModeMap)) {
                        cmds.push(cmd);
                        break;
                      }
                    }
                  }
                }
              } else {
                cmds.push({
                  ind,
                  mode: MODE_BREAK,
                  doc: doc3.contents
                });
              }
            }
            break;
          }
        }
        if (doc3.id) {
          groupModeMap[doc3.id] = at_default(
            /* isOptionalObject */
            false,
            cmds,
            -1
          ).mode;
        }
        break;
      case DOC_TYPE_FILL: {
        const rem = width - pos2;
        const {
          parts
        } = doc3;
        if (parts.length === 0) {
          break;
        }
        const [content, whitespace] = parts;
        const contentFlatCmd = {
          ind,
          mode: MODE_FLAT,
          doc: content
        };
        const contentBreakCmd = {
          ind,
          mode: MODE_BREAK,
          doc: content
        };
        const contentFits = fits(contentFlatCmd, [], rem, lineSuffix2.length > 0, groupModeMap, true);
        if (parts.length === 1) {
          if (contentFits) {
            cmds.push(contentFlatCmd);
          } else {
            cmds.push(contentBreakCmd);
          }
          break;
        }
        const whitespaceFlatCmd = {
          ind,
          mode: MODE_FLAT,
          doc: whitespace
        };
        const whitespaceBreakCmd = {
          ind,
          mode: MODE_BREAK,
          doc: whitespace
        };
        if (parts.length === 2) {
          if (contentFits) {
            cmds.push(whitespaceFlatCmd, contentFlatCmd);
          } else {
            cmds.push(whitespaceBreakCmd, contentBreakCmd);
          }
          break;
        }
        parts.splice(0, 2);
        const remainingCmd = {
          ind,
          mode,
          doc: fill(parts)
        };
        const secondContent = parts[0];
        const firstAndSecondContentFlatCmd = {
          ind,
          mode: MODE_FLAT,
          doc: [content, whitespace, secondContent]
        };
        const firstAndSecondContentFits = fits(firstAndSecondContentFlatCmd, [], rem, lineSuffix2.length > 0, groupModeMap, true);
        if (firstAndSecondContentFits) {
          cmds.push(remainingCmd, whitespaceFlatCmd, contentFlatCmd);
        } else if (contentFits) {
          cmds.push(remainingCmd, whitespaceBreakCmd, contentFlatCmd);
        } else {
          cmds.push(remainingCmd, whitespaceBreakCmd, contentBreakCmd);
        }
        break;
      }
      case DOC_TYPE_IF_BREAK:
      case DOC_TYPE_INDENT_IF_BREAK: {
        const groupMode = doc3.groupId ? groupModeMap[doc3.groupId] : mode;
        if (groupMode === MODE_BREAK) {
          const breakContents = doc3.type === DOC_TYPE_IF_BREAK ? doc3.breakContents : doc3.negate ? doc3.contents : indent(doc3.contents);
          if (breakContents) {
            cmds.push({
              ind,
              mode,
              doc: breakContents
            });
          }
        }
        if (groupMode === MODE_FLAT) {
          const flatContents = doc3.type === DOC_TYPE_IF_BREAK ? doc3.flatContents : doc3.negate ? indent(doc3.contents) : doc3.contents;
          if (flatContents) {
            cmds.push({
              ind,
              mode,
              doc: flatContents
            });
          }
        }
        break;
      }
      case DOC_TYPE_LINE_SUFFIX:
        lineSuffix2.push({
          ind,
          mode,
          doc: doc3.contents
        });
        break;
      case DOC_TYPE_LINE_SUFFIX_BOUNDARY:
        if (lineSuffix2.length > 0) {
          cmds.push({
            ind,
            mode,
            doc: hardlineWithoutBreakParent
          });
        }
        break;
      case DOC_TYPE_LINE:
        switch (mode) {
          case MODE_FLAT:
            if (!doc3.hard) {
              if (!doc3.soft) {
                out.push(" ");
                pos2 += 1;
              }
              break;
            } else {
              shouldRemeasure = true;
            }
          case MODE_BREAK:
            if (lineSuffix2.length > 0) {
              cmds.push({
                ind,
                mode,
                doc: doc3
              }, ...lineSuffix2.reverse());
              lineSuffix2.length = 0;
              break;
            }
            if (doc3.literal) {
              if (ind.root) {
                out.push(newLine, ind.root.value);
                pos2 = ind.root.length;
              } else {
                out.push(newLine);
                pos2 = 0;
              }
            } else {
              pos2 -= trim(out);
              out.push(newLine + ind.value);
              pos2 = ind.length;
            }
            break;
        }
        break;
      case DOC_TYPE_LABEL:
        cmds.push({
          ind,
          mode,
          doc: doc3.contents
        });
        break;
      case DOC_TYPE_BREAK_PARENT:
        break;
      default:
        throw new invalid_doc_error_default(doc3);
    }
    if (cmds.length === 0 && lineSuffix2.length > 0) {
      cmds.push(...lineSuffix2.reverse());
      lineSuffix2.length = 0;
    }
  }
  const cursorPlaceholderIndex = out.indexOf(CURSOR_PLACEHOLDER);
  if (cursorPlaceholderIndex !== -1) {
    const otherCursorPlaceholderIndex = out.indexOf(CURSOR_PLACEHOLDER, cursorPlaceholderIndex + 1);
    const beforeCursor = out.slice(0, cursorPlaceholderIndex).join("");
    const aroundCursor = out.slice(cursorPlaceholderIndex + 1, otherCursorPlaceholderIndex).join("");
    const afterCursor = out.slice(otherCursorPlaceholderIndex + 1).join("");
    return {
      formatted: beforeCursor + aroundCursor + afterCursor,
      cursorNodeStart: beforeCursor.length,
      cursorNodeText: aroundCursor
    };
  }
  return {
    formatted: out.join("")
  };
}

// src/utils/get-alignment-size.js
function getAlignmentSize(text, tabWidth, startIndex = 0) {
  let size = 0;
  for (let i = startIndex; i < text.length; ++i) {
    if (text[i] === "	") {
      size = size + tabWidth - size % tabWidth;
    } else {
      size++;
    }
  }
  return size;
}
var get_alignment_size_default = getAlignmentSize;

// src/common/ast-path.js
var _AstPath_instances, getNodeStackIndex_fn, getAncestors_fn;
var AstPath = class {
  constructor(value) {
    __privateAdd(this, _AstPath_instances);
    this.stack = [value];
  }
  /** @type {string | null} */
  get key() {
    const {
      stack: stack2,
      siblings
    } = this;
    return at_default(
      /* isOptionalObject */
      false,
      stack2,
      siblings === null ? -2 : -4
    ) ?? null;
  }
  /** @type {number | null} */
  get index() {
    return this.siblings === null ? null : at_default(
      /* isOptionalObject */
      false,
      this.stack,
      -2
    );
  }
  /** @type {object} */
  get node() {
    return at_default(
      /* isOptionalObject */
      false,
      this.stack,
      -1
    );
  }
  /** @type {object | null} */
  get parent() {
    return this.getNode(1);
  }
  /** @type {object | null} */
  get grandparent() {
    return this.getNode(2);
  }
  /** @type {boolean} */
  get isInArray() {
    return this.siblings !== null;
  }
  /** @type {object[] | null} */
  get siblings() {
    const {
      stack: stack2
    } = this;
    const maybeArray = at_default(
      /* isOptionalObject */
      false,
      stack2,
      -3
    );
    return Array.isArray(maybeArray) ? maybeArray : null;
  }
  /** @type {object | null} */
  get next() {
    const {
      siblings
    } = this;
    return siblings === null ? null : siblings[this.index + 1];
  }
  /** @type {object | null} */
  get previous() {
    const {
      siblings
    } = this;
    return siblings === null ? null : siblings[this.index - 1];
  }
  /** @type {boolean} */
  get isFirst() {
    return this.index === 0;
  }
  /** @type {boolean} */
  get isLast() {
    const {
      siblings,
      index
    } = this;
    return siblings !== null && index === siblings.length - 1;
  }
  /** @type {boolean} */
  get isRoot() {
    return this.stack.length === 1;
  }
  /** @type {object} */
  get root() {
    return this.stack[0];
  }
  /** @type {object[]} */
  get ancestors() {
    return [...__privateMethod(this, _AstPath_instances, getAncestors_fn).call(this)];
  }
  // The name of the current property is always the penultimate element of
  // this.stack, and always a string/number/symbol.
  getName() {
    const {
      stack: stack2
    } = this;
    const {
      length
    } = stack2;
    if (length > 1) {
      return at_default(
        /* isOptionalObject */
        false,
        stack2,
        -2
      );
    }
    return null;
  }
  // The value of the current property is always the final element of
  // this.stack.
  getValue() {
    return at_default(
      /* isOptionalObject */
      false,
      this.stack,
      -1
    );
  }
  getNode(count = 0) {
    const stackIndex = __privateMethod(this, _AstPath_instances, getNodeStackIndex_fn).call(this, count);
    return stackIndex === -1 ? null : this.stack[stackIndex];
  }
  getParentNode(count = 0) {
    return this.getNode(count + 1);
  }
  // Temporarily push properties named by string arguments given after the
  // callback function onto this.stack, then call the callback with a
  // reference to this (modified) AstPath object. Note that the stack will
  // be restored to its original state after the callback is finished, so it
  // is probably a mistake to retain a reference to the path.
  call(callback, ...names) {
    const {
      stack: stack2
    } = this;
    const {
      length
    } = stack2;
    let value = at_default(
      /* isOptionalObject */
      false,
      stack2,
      -1
    );
    for (const name of names) {
      value = value[name];
      stack2.push(name, value);
    }
    try {
      return callback(this);
    } finally {
      stack2.length = length;
    }
  }
  /**
   * @template {(path: AstPath) => any} T
   * @param {T} callback
   * @param {number} [count=0]
   * @returns {ReturnType<T>}
   */
  callParent(callback, count = 0) {
    const stackIndex = __privateMethod(this, _AstPath_instances, getNodeStackIndex_fn).call(this, count + 1);
    const parentValues = this.stack.splice(stackIndex + 1);
    try {
      return callback(this);
    } finally {
      this.stack.push(...parentValues);
    }
  }
  // Similar to AstPath.prototype.call, except that the value obtained by
  // accessing this.getValue()[name1][name2]... should be array. The
  // callback will be called with a reference to this path object for each
  // element of the array.
  each(callback, ...names) {
    const {
      stack: stack2
    } = this;
    const {
      length
    } = stack2;
    let value = at_default(
      /* isOptionalObject */
      false,
      stack2,
      -1
    );
    for (const name of names) {
      value = value[name];
      stack2.push(name, value);
    }
    try {
      for (let i = 0; i < value.length; ++i) {
        stack2.push(i, value[i]);
        callback(this, i, value);
        stack2.length -= 2;
      }
    } finally {
      stack2.length = length;
    }
  }
  // Similar to AstPath.prototype.each, except that the results of the
  // callback function invocations are stored in an array and returned at
  // the end of the iteration.
  map(callback, ...names) {
    const result = [];
    this.each((path13, index, value) => {
      result[index] = callback(path13, index, value);
    }, ...names);
    return result;
  }
  /**
   * @param {...(
   *   | ((node: any, name: string | null, number: number | null) => boolean)
   *   | undefined
   * )} predicates
   */
  match(...predicates) {
    let stackPointer = this.stack.length - 1;
    let name = null;
    let node = this.stack[stackPointer--];
    for (const predicate of predicates) {
      if (node === void 0) {
        return false;
      }
      let number = null;
      if (typeof name === "number") {
        number = name;
        name = this.stack[stackPointer--];
        node = this.stack[stackPointer--];
      }
      if (predicate && !predicate(node, name, number)) {
        return false;
      }
      name = this.stack[stackPointer--];
      node = this.stack[stackPointer--];
    }
    return true;
  }
  /**
   * Traverses the ancestors of the current node heading toward the tree root
   * until it finds a node that matches the provided predicate function. Will
   * return the first matching ancestor. If no such node exists, returns undefined.
   * @param {(node: any) => boolean} predicate
   * @internal Unstable API. Don't use in plugins for now.
   */
  findAncestor(predicate) {
    for (const node of __privateMethod(this, _AstPath_instances, getAncestors_fn).call(this)) {
      if (predicate(node)) {
        return node;
      }
    }
  }
  /**
   * Traverses the ancestors of the current node heading toward the tree root
   * until it finds a node that matches the provided predicate function.
   * returns true if matched node found.
   * @param {(node: any) => boolean} predicate
   * @returns {boolean}
   * @internal Unstable API. Don't use in plugins for now.
   */
  hasAncestor(predicate) {
    for (const node of __privateMethod(this, _AstPath_instances, getAncestors_fn).call(this)) {
      if (predicate(node)) {
        return true;
      }
    }
    return false;
  }
};
_AstPath_instances = new WeakSet();
getNodeStackIndex_fn = function(count) {
  const {
    stack: stack2
  } = this;
  for (let i = stack2.length - 1; i >= 0; i -= 2) {
    if (!Array.isArray(stack2[i]) && --count < 0) {
      return i;
    }
  }
  return -1;
};
getAncestors_fn = function* () {
  const {
    stack: stack2
  } = this;
  for (let index = stack2.length - 3; index >= 0; index -= 2) {
    const value = stack2[index];
    if (!Array.isArray(value)) {
      yield value;
    }
  }
};
var ast_path_default = AstPath;

// src/main/comments/attach.js
import assert4 from "assert";

// src/utils/is-object.js
function isObject2(object) {
  return object !== null && typeof object === "object";
}
var is_object_default = isObject2;

// src/utils/ast-utils.js
function* getChildren(node, options8) {
  const { getVisitorKeys, filter: filter2 = () => true } = options8;
  const isMatchedNode = (node2) => is_object_default(node2) && filter2(node2);
  for (const key2 of getVisitorKeys(node)) {
    const value = node[key2];
    if (Array.isArray(value)) {
      for (const child of value) {
        if (isMatchedNode(child)) {
          yield child;
        }
      }
    } else if (isMatchedNode(value)) {
      yield value;
    }
  }
}
function* getDescendants(node, options8) {
  const queue = [node];
  for (let index = 0; index < queue.length; index++) {
    const node2 = queue[index];
    for (const child of getChildren(node2, options8)) {
      yield child;
      queue.push(child);
    }
  }
}

// src/utils/skip.js
function skip(characters) {
  return (text, startIndex, options8) => {
    const backwards = Boolean(options8 == null ? void 0 : options8.backwards);
    if (startIndex === false) {
      return false;
    }
    const { length } = text;
    let cursor2 = startIndex;
    while (cursor2 >= 0 && cursor2 < length) {
      const character = text.charAt(cursor2);
      if (characters instanceof RegExp) {
        if (!characters.test(character)) {
          return cursor2;
        }
      } else if (!characters.includes(character)) {
        return cursor2;
      }
      backwards ? cursor2-- : cursor2++;
    }
    if (cursor2 === -1 || cursor2 === length) {
      return cursor2;
    }
    return false;
  };
}
var skipWhitespace = skip(/\s/u);
var skipSpaces = skip(" 	");
var skipToLineEnd = skip(",; 	");
var skipEverythingButNewLine = skip(/[^\n\r]/u);

// src/utils/skip-newline.js
function skipNewline(text, startIndex, options8) {
  const backwards = Boolean(options8 == null ? void 0 : options8.backwards);
  if (startIndex === false) {
    return false;
  }
  const character = text.charAt(startIndex);
  if (backwards) {
    if (text.charAt(startIndex - 1) === "\r" && character === "\n") {
      return startIndex - 2;
    }
    if (character === "\n" || character === "\r" || character === "\u2028" || character === "\u2029") {
      return startIndex - 1;
    }
  } else {
    if (character === "\r" && text.charAt(startIndex + 1) === "\n") {
      return startIndex + 2;
    }
    if (character === "\n" || character === "\r" || character === "\u2028" || character === "\u2029") {
      return startIndex + 1;
    }
  }
  return startIndex;
}
var skip_newline_default = skipNewline;

// src/utils/has-newline.js
function hasNewline(text, startIndex, options8 = {}) {
  const idx = skipSpaces(
    text,
    options8.backwards ? startIndex - 1 : startIndex,
    options8
  );
  const idx2 = skip_newline_default(text, idx, options8);
  return idx !== idx2;
}
var has_newline_default = hasNewline;

// src/utils/is-non-empty-array.js
function isNonEmptyArray(object) {
  return Array.isArray(object) && object.length > 0;
}
var is_non_empty_array_default = isNonEmptyArray;

// src/main/create-get-visitor-keys-function.js
var nonTraversableKeys = /* @__PURE__ */ new Set([
  "tokens",
  "comments",
  "parent",
  "enclosingNode",
  "precedingNode",
  "followingNode"
]);
var defaultGetVisitorKeys = (node) => Object.keys(node).filter((key2) => !nonTraversableKeys.has(key2));
function createGetVisitorKeysFunction(printerGetVisitorKeys) {
  return printerGetVisitorKeys ? (node) => printerGetVisitorKeys(node, nonTraversableKeys) : defaultGetVisitorKeys;
}
var create_get_visitor_keys_function_default = createGetVisitorKeysFunction;

// src/main/comments/utils.js
function describeNodeForDebugging(node) {
  const nodeType = node.type || node.kind || "(unknown type)";
  let nodeName = String(
    node.name || node.id && (typeof node.id === "object" ? node.id.name : node.id) || node.key && (typeof node.key === "object" ? node.key.name : node.key) || node.value && (typeof node.value === "object" ? "" : String(node.value)) || node.operator || ""
  );
  if (nodeName.length > 20) {
    nodeName = nodeName.slice(0, 19) + "\u2026";
  }
  return nodeType + (nodeName ? " " + nodeName : "");
}
function addCommentHelper(node, comment) {
  const comments = node.comments ?? (node.comments = []);
  comments.push(comment);
  comment.printed = false;
  comment.nodeDescription = describeNodeForDebugging(node);
}
function addLeadingComment(node, comment) {
  comment.leading = true;
  comment.trailing = false;
  addCommentHelper(node, comment);
}
function addDanglingComment(node, comment, marker) {
  comment.leading = false;
  comment.trailing = false;
  if (marker) {
    comment.marker = marker;
  }
  addCommentHelper(node, comment);
}
function addTrailingComment(node, comment) {
  comment.leading = false;
  comment.trailing = true;
  addCommentHelper(node, comment);
}

// src/main/comments/attach.js
var childNodesCache = /* @__PURE__ */ new WeakMap();
function getSortedChildNodes(node, options8) {
  if (childNodesCache.has(node)) {
    return childNodesCache.get(node);
  }
  const {
    printer: {
      getCommentChildNodes,
      canAttachComment,
      getVisitorKeys: printerGetVisitorKeys
    },
    locStart,
    locEnd
  } = options8;
  if (!canAttachComment) {
    return [];
  }
  const childNodes = ((getCommentChildNodes == null ? void 0 : getCommentChildNodes(node, options8)) ?? [
    ...getChildren(node, {
      getVisitorKeys: create_get_visitor_keys_function_default(printerGetVisitorKeys)
    })
  ]).flatMap(
    (node2) => canAttachComment(node2) ? [node2] : getSortedChildNodes(node2, options8)
  );
  childNodes.sort(
    (nodeA, nodeB) => locStart(nodeA) - locStart(nodeB) || locEnd(nodeA) - locEnd(nodeB)
  );
  childNodesCache.set(node, childNodes);
  return childNodes;
}
function decorateComment(node, comment, options8, enclosingNode) {
  const { locStart, locEnd } = options8;
  const commentStart = locStart(comment);
  const commentEnd = locEnd(comment);
  const childNodes = getSortedChildNodes(node, options8);
  let precedingNode;
  let followingNode;
  let left = 0;
  let right = childNodes.length;
  while (left < right) {
    const middle = left + right >> 1;
    const child = childNodes[middle];
    const start = locStart(child);
    const end = locEnd(child);
    if (start <= commentStart && commentEnd <= end) {
      return decorateComment(child, comment, options8, child);
    }
    if (end <= commentStart) {
      precedingNode = child;
      left = middle + 1;
      continue;
    }
    if (commentEnd <= start) {
      followingNode = child;
      right = middle;
      continue;
    }
    throw new Error("Comment location overlaps with node location");
  }
  if ((enclosingNode == null ? void 0 : enclosingNode.type) === "TemplateLiteral") {
    const { quasis } = enclosingNode;
    const commentIndex = findExpressionIndexForComment(
      quasis,
      comment,
      options8
    );
    if (precedingNode && findExpressionIndexForComment(quasis, precedingNode, options8) !== commentIndex) {
      precedingNode = null;
    }
    if (followingNode && findExpressionIndexForComment(quasis, followingNode, options8) !== commentIndex) {
      followingNode = null;
    }
  }
  return { enclosingNode, precedingNode, followingNode };
}
var returnFalse = () => false;
function attachComments(ast, options8) {
  const { comments } = ast;
  delete ast.comments;
  if (!is_non_empty_array_default(comments) || !options8.printer.canAttachComment) {
    return;
  }
  const tiesToBreak = [];
  const {
    locStart,
    locEnd,
    printer: {
      experimentalFeatures: {
        // TODO: Make this as default behavior
        avoidAstMutation = false
      } = {},
      handleComments = {}
    },
    originalText: text
  } = options8;
  const {
    ownLine: handleOwnLineComment = returnFalse,
    endOfLine: handleEndOfLineComment = returnFalse,
    remaining: handleRemainingComment = returnFalse
  } = handleComments;
  const decoratedComments = comments.map((comment, index) => ({
    ...decorateComment(ast, comment, options8),
    comment,
    text,
    options: options8,
    ast,
    isLastComment: comments.length - 1 === index
  }));
  for (const [index, context] of decoratedComments.entries()) {
    const {
      comment,
      precedingNode,
      enclosingNode,
      followingNode,
      text: text2,
      options: options9,
      ast: ast2,
      isLastComment
    } = context;
    if (options9.parser === "json" || options9.parser === "json5" || options9.parser === "jsonc" || options9.parser === "__js_expression" || options9.parser === "__ts_expression" || options9.parser === "__vue_expression" || options9.parser === "__vue_ts_expression") {
      if (locStart(comment) - locStart(ast2) <= 0) {
        addLeadingComment(ast2, comment);
        continue;
      }
      if (locEnd(comment) - locEnd(ast2) >= 0) {
        addTrailingComment(ast2, comment);
        continue;
      }
    }
    let args;
    if (avoidAstMutation) {
      args = [context];
    } else {
      comment.enclosingNode = enclosingNode;
      comment.precedingNode = precedingNode;
      comment.followingNode = followingNode;
      args = [comment, text2, options9, ast2, isLastComment];
    }
    if (isOwnLineComment(text2, options9, decoratedComments, index)) {
      comment.placement = "ownLine";
      if (handleOwnLineComment(...args)) {
      } else if (followingNode) {
        addLeadingComment(followingNode, comment);
      } else if (precedingNode) {
        addTrailingComment(precedingNode, comment);
      } else if (enclosingNode) {
        addDanglingComment(enclosingNode, comment);
      } else {
        addDanglingComment(ast2, comment);
      }
    } else if (isEndOfLineComment(text2, options9, decoratedComments, index)) {
      comment.placement = "endOfLine";
      if (handleEndOfLineComment(...args)) {
      } else if (precedingNode) {
        addTrailingComment(precedingNode, comment);
      } else if (followingNode) {
        addLeadingComment(followingNode, comment);
      } else if (enclosingNode) {
        addDanglingComment(enclosingNode, comment);
      } else {
        addDanglingComment(ast2, comment);
      }
    } else {
      comment.placement = "remaining";
      if (handleRemainingComment(...args)) {
      } else if (precedingNode && followingNode) {
        const tieCount = tiesToBreak.length;
        if (tieCount > 0) {
          const lastTie = tiesToBreak[tieCount - 1];
          if (lastTie.followingNode !== followingNode) {
            breakTies(tiesToBreak, options9);
          }
        }
        tiesToBreak.push(context);
      } else if (precedingNode) {
        addTrailingComment(precedingNode, comment);
      } else if (followingNode) {
        addLeadingComment(followingNode, comment);
      } else if (enclosingNode) {
        addDanglingComment(enclosingNode, comment);
      } else {
        addDanglingComment(ast2, comment);
      }
    }
  }
  breakTies(tiesToBreak, options8);
  if (!avoidAstMutation) {
    for (const comment of comments) {
      delete comment.precedingNode;
      delete comment.enclosingNode;
      delete comment.followingNode;
    }
  }
}
var isAllEmptyAndNoLineBreak = (text) => !/[\S\n\u2028\u2029]/u.test(text);
function isOwnLineComment(text, options8, decoratedComments, commentIndex) {
  const { comment, precedingNode } = decoratedComments[commentIndex];
  const { locStart, locEnd } = options8;
  let start = locStart(comment);
  if (precedingNode) {
    for (let index = commentIndex - 1; index >= 0; index--) {
      const { comment: comment2, precedingNode: currentCommentPrecedingNode } = decoratedComments[index];
      if (currentCommentPrecedingNode !== precedingNode || !isAllEmptyAndNoLineBreak(text.slice(locEnd(comment2), start))) {
        break;
      }
      start = locStart(comment2);
    }
  }
  return has_newline_default(text, start, { backwards: true });
}
function isEndOfLineComment(text, options8, decoratedComments, commentIndex) {
  const { comment, followingNode } = decoratedComments[commentIndex];
  const { locStart, locEnd } = options8;
  let end = locEnd(comment);
  if (followingNode) {
    for (let index = commentIndex + 1; index < decoratedComments.length; index++) {
      const { comment: comment2, followingNode: currentCommentFollowingNode } = decoratedComments[index];
      if (currentCommentFollowingNode !== followingNode || !isAllEmptyAndNoLineBreak(text.slice(end, locStart(comment2)))) {
        break;
      }
      end = locEnd(comment2);
    }
  }
  return has_newline_default(text, end);
}
function breakTies(tiesToBreak, options8) {
  var _a, _b;
  const tieCount = tiesToBreak.length;
  if (tieCount === 0) {
    return;
  }
  const { precedingNode, followingNode } = tiesToBreak[0];
  let gapEndPos = options8.locStart(followingNode);
  let indexOfFirstLeadingComment;
  for (indexOfFirstLeadingComment = tieCount; indexOfFirstLeadingComment > 0; --indexOfFirstLeadingComment) {
    const {
      comment,
      precedingNode: currentCommentPrecedingNode,
      followingNode: currentCommentFollowingNode
    } = tiesToBreak[indexOfFirstLeadingComment - 1];
    assert4.strictEqual(currentCommentPrecedingNode, precedingNode);
    assert4.strictEqual(currentCommentFollowingNode, followingNode);
    const gap = options8.originalText.slice(options8.locEnd(comment), gapEndPos);
    if (((_b = (_a = options8.printer).isGap) == null ? void 0 : _b.call(_a, gap, options8)) ?? /^[\s(]*$/u.test(gap)) {
      gapEndPos = options8.locStart(comment);
    } else {
      break;
    }
  }
  for (const [i, { comment }] of tiesToBreak.entries()) {
    if (i < indexOfFirstLeadingComment) {
      addTrailingComment(precedingNode, comment);
    } else {
      addLeadingComment(followingNode, comment);
    }
  }
  for (const node of [precedingNode, followingNode]) {
    if (node.comments && node.comments.length > 1) {
      node.comments.sort((a, b) => options8.locStart(a) - options8.locStart(b));
    }
  }
  tiesToBreak.length = 0;
}
function findExpressionIndexForComment(quasis, comment, options8) {
  const startPos = options8.locStart(comment) - 1;
  for (let i = 1; i < quasis.length; ++i) {
    if (startPos < options8.locStart(quasis[i])) {
      return i - 1;
    }
  }
  return 0;
}

// src/utils/is-previous-line-empty.js
function isPreviousLineEmpty(text, startIndex) {
  let idx = startIndex - 1;
  idx = skipSpaces(text, idx, { backwards: true });
  idx = skip_newline_default(text, idx, { backwards: true });
  idx = skipSpaces(text, idx, { backwards: true });
  const idx2 = skip_newline_default(text, idx, { backwards: true });
  return idx !== idx2;
}
var is_previous_line_empty_default = isPreviousLineEmpty;

// src/main/comments/print.js
function printComment(path13, options8) {
  const comment = path13.node;
  comment.printed = true;
  return options8.printer.printComment(path13, options8);
}
function printLeadingComment(path13, options8) {
  var _a;
  const comment = path13.node;
  const parts = [printComment(path13, options8)];
  const { printer, originalText, locStart, locEnd } = options8;
  const isBlock = (_a = printer.isBlockComment) == null ? void 0 : _a.call(printer, comment);
  if (isBlock) {
    const lineBreak = has_newline_default(originalText, locEnd(comment)) ? has_newline_default(originalText, locStart(comment), {
      backwards: true
    }) ? hardline : line2 : " ";
    parts.push(lineBreak);
  } else {
    parts.push(hardline);
  }
  const index = skip_newline_default(
    originalText,
    skipSpaces(originalText, locEnd(comment))
  );
  if (index !== false && has_newline_default(originalText, index)) {
    parts.push(hardline);
  }
  return parts;
}
function printTrailingComment(path13, options8, previousComment) {
  var _a;
  const comment = path13.node;
  const printed = printComment(path13, options8);
  const { printer, originalText, locStart } = options8;
  const isBlock = (_a = printer.isBlockComment) == null ? void 0 : _a.call(printer, comment);
  if ((previousComment == null ? void 0 : previousComment.hasLineSuffix) && !(previousComment == null ? void 0 : previousComment.isBlock) || has_newline_default(originalText, locStart(comment), { backwards: true })) {
    const isLineBeforeEmpty = is_previous_line_empty_default(
      originalText,
      locStart(comment)
    );
    return {
      doc: lineSuffix([hardline, isLineBeforeEmpty ? hardline : "", printed]),
      isBlock,
      hasLineSuffix: true
    };
  }
  if (!isBlock || (previousComment == null ? void 0 : previousComment.hasLineSuffix)) {
    return {
      doc: [lineSuffix([" ", printed]), breakParent],
      isBlock,
      hasLineSuffix: true
    };
  }
  return { doc: [" ", printed], isBlock, hasLineSuffix: false };
}
function printCommentsSeparately(path13, options8) {
  const value = path13.node;
  if (!value) {
    return {};
  }
  const ignored = options8[Symbol.for("printedComments")];
  const comments = (value.comments || []).filter(
    (comment) => !ignored.has(comment)
  );
  if (comments.length === 0) {
    return { leading: "", trailing: "" };
  }
  const leadingParts = [];
  const trailingParts = [];
  let printedTrailingComment;
  path13.each(() => {
    const comment = path13.node;
    if (ignored == null ? void 0 : ignored.has(comment)) {
      return;
    }
    const { leading, trailing } = comment;
    if (leading) {
      leadingParts.push(printLeadingComment(path13, options8));
    } else if (trailing) {
      printedTrailingComment = printTrailingComment(
        path13,
        options8,
        printedTrailingComment
      );
      trailingParts.push(printedTrailingComment.doc);
    }
  }, "comments");
  return { leading: leadingParts, trailing: trailingParts };
}
function printComments(path13, doc2, options8) {
  const { leading, trailing } = printCommentsSeparately(path13, options8);
  if (!leading && !trailing) {
    return doc2;
  }
  return inheritLabel(doc2, (doc3) => [leading, doc3, trailing]);
}
function ensureAllCommentsPrinted(options8) {
  const {
    [Symbol.for("comments")]: comments,
    [Symbol.for("printedComments")]: printedComments
  } = options8;
  for (const comment of comments) {
    if (!comment.printed && !printedComments.has(comment)) {
      throw new Error(
        'Comment "' + comment.value.trim() + '" was not printed. Please report this error!'
      );
    }
    delete comment.printed;
  }
}

// src/main/create-print-pre-check-function.js
function createPrintPreCheckFunction(options8) {
  if (true) {
    return () => {
    };
  }
  const getVisitorKeys = create_get_visitor_keys_function_default(
    options8.printer.getVisitorKeys
  );
  return function(path13) {
    if (path13.isRoot) {
      return;
    }
    const { key: key2, parent } = path13;
    const visitorKeys = getVisitorKeys(parent);
    if (visitorKeys.includes(key2)) {
      return;
    }
    throw Object.assign(new Error("Calling `print()` on non-node object."), {
      parentNode: parent,
      allowedProperties: visitorKeys,
      printingProperty: key2,
      printingValue: path13.node,
      pathStack: path13.stack.length > 5 ? ["...", ...path13.stack.slice(-5)] : [...path13.stack]
    });
  };
}
var create_print_pre_check_function_default = createPrintPreCheckFunction;

// src/main/core-options.evaluate.js
var core_options_evaluate_default = {
  "cursorOffset": {
    "category": "Special",
    "type": "int",
    "default": -1,
    "range": {
      "start": -1,
      "end": Infinity,
      "step": 1
    },
    "description": "Print (to stderr) where a cursor at the given position would move to after formatting.",
    "cliCategory": "Editor"
  },
  "endOfLine": {
    "category": "Global",
    "type": "choice",
    "default": "lf",
    "description": "Which end of line characters to apply.",
    "choices": [
      {
        "value": "lf",
        "description": "Line Feed only (\\n), common on Linux and macOS as well as inside git repos"
      },
      {
        "value": "crlf",
        "description": "Carriage Return + Line Feed characters (\\r\\n), common on Windows"
      },
      {
        "value": "cr",
        "description": "Carriage Return character only (\\r), used very rarely"
      },
      {
        "value": "auto",
        "description": "Maintain existing\n(mixed values within one file are normalised by looking at what's used after the first line)"
      }
    ]
  },
  "filepath": {
    "category": "Special",
    "type": "path",
    "description": "Specify the input filepath. This will be used to do parser inference.",
    "cliName": "stdin-filepath",
    "cliCategory": "Other",
    "cliDescription": "Path to the file to pretend that stdin comes from."
  },
  "insertPragma": {
    "category": "Special",
    "type": "boolean",
    "default": false,
    "description": "Insert @format pragma into file's first docblock comment.",
    "cliCategory": "Other"
  },
  "parser": {
    "category": "Global",
    "type": "choice",
    "default": void 0,
    "description": "Which parser to use.",
    "exception": (value) => typeof value === "string" || typeof value === "function",
    "choices": [
      {
        "value": "flow",
        "description": "Flow"
      },
      {
        "value": "babel",
        "description": "JavaScript"
      },
      {
        "value": "babel-flow",
        "description": "Flow"
      },
      {
        "value": "babel-ts",
        "description": "TypeScript"
      },
      {
        "value": "typescript",
        "description": "TypeScript"
      },
      {
        "value": "acorn",
        "description": "JavaScript"
      },
      {
        "value": "espree",
        "description": "JavaScript"
      },
      {
        "value": "meriyah",
        "description": "JavaScript"
      },
      {
        "value": "css",
        "description": "CSS"
      },
      {
        "value": "less",
        "description": "Less"
      },
      {
        "value": "scss",
        "description": "SCSS"
      },
      {
        "value": "json",
        "description": "JSON"
      },
      {
        "value": "json5",
        "description": "JSON5"
      },
      {
        "value": "jsonc",
        "description": "JSON with Comments"
      },
      {
        "value": "json-stringify",
        "description": "JSON.stringify"
      },
      {
        "value": "graphql",
        "description": "GraphQL"
      },
      {
        "value": "markdown",
        "description": "Markdown"
      },
      {
        "value": "mdx",
        "description": "MDX"
      },
      {
        "value": "vue",
        "description": "Vue"
      },
      {
        "value": "yaml",
        "description": "YAML"
      },
      {
        "value": "glimmer",
        "description": "Ember / Handlebars"
      },
      {
        "value": "html",
        "description": "HTML"
      },
      {
        "value": "angular",
        "description": "Angular"
      },
      {
        "value": "lwc",
        "description": "Lightning Web Components"
      }
    ]
  },
  "plugins": {
    "type": "path",
    "array": true,
    "default": [
      {
        "value": []
      }
    ],
    "category": "Global",
    "description": "Add a plugin. Multiple plugins can be passed as separate `--plugin`s.",
    "exception": (value) => typeof value === "string" || typeof value === "object",
    "cliName": "plugin",
    "cliCategory": "Config"
  },
  "printWidth": {
    "category": "Global",
    "type": "int",
    "default": 80,
    "description": "The line length where Prettier will try wrap.",
    "range": {
      "start": 0,
      "end": Infinity,
      "step": 1
    }
  },
  "rangeEnd": {
    "category": "Special",
    "type": "int",
    "default": Infinity,
    "range": {
      "start": 0,
      "end": Infinity,
      "step": 1
    },
    "description": "Format code ending at a given character offset (exclusive).\nThe range will extend forwards to the end of the selected statement.",
    "cliCategory": "Editor"
  },
  "rangeStart": {
    "category": "Special",
    "type": "int",
    "default": 0,
    "range": {
      "start": 0,
      "end": Infinity,
      "step": 1
    },
    "description": "Format code starting at a given character offset.\nThe range will extend backwards to the start of the first line containing the selected statement.",
    "cliCategory": "Editor"
  },
  "requirePragma": {
    "category": "Special",
    "type": "boolean",
    "default": false,
    "description": "Require either '@prettier' or '@format' to be present in the file's first docblock comment\nin order for it to be formatted.",
    "cliCategory": "Other"
  },
  "tabWidth": {
    "type": "int",
    "category": "Global",
    "default": 2,
    "description": "Number of spaces per indentation level.",
    "range": {
      "start": 0,
      "end": Infinity,
      "step": 1
    }
  },
  "useTabs": {
    "category": "Global",
    "type": "boolean",
    "default": false,
    "description": "Indent with tabs instead of spaces."
  },
  "embeddedLanguageFormatting": {
    "category": "Global",
    "type": "choice",
    "default": "auto",
    "description": "Control how Prettier formats quoted code embedded in the file.",
    "choices": [
      {
        "value": "auto",
        "description": "Format embedded code if Prettier can automatically identify it."
      },
      {
        "value": "off",
        "description": "Never automatically format embedded code."
      }
    ]
  }
};

// src/main/support.js
function getSupportInfo({
  plugins = [],
  showDeprecated = false
} = {}) {
  const languages2 = plugins.flatMap((plugin) => plugin.languages ?? []);
  const options8 = [];
  for (const option of normalizeOptionSettings(Object.assign({}, ...plugins.map(({
    options: options9
  }) => options9), core_options_evaluate_default))) {
    if (!showDeprecated && option.deprecated) {
      continue;
    }
    if (Array.isArray(option.choices)) {
      if (!showDeprecated) {
        option.choices = option.choices.filter((choice) => !choice.deprecated);
      }
      if (option.name === "parser") {
        option.choices = [...option.choices, ...collectParsersFromLanguages(option.choices, languages2, plugins)];
      }
    }
    option.pluginDefaults = Object.fromEntries(plugins.filter((plugin) => {
      var _a;
      return ((_a = plugin.defaultOptions) == null ? void 0 : _a[option.name]) !== void 0;
    }).map((plugin) => [plugin.name, plugin.defaultOptions[option.name]]));
    options8.push(option);
  }
  return {
    languages: languages2,
    options: options8
  };
}
function* collectParsersFromLanguages(parserChoices, languages2, plugins) {
  const existingParsers = new Set(parserChoices.map((choice) => choice.value));
  for (const language of languages2) {
    if (language.parsers) {
      for (const parserName of language.parsers) {
        if (!existingParsers.has(parserName)) {
          existingParsers.add(parserName);
          const plugin = plugins.find((plugin2) => plugin2.parsers && Object.prototype.hasOwnProperty.call(plugin2.parsers, parserName));
          let description = language.name;
          if (plugin == null ? void 0 : plugin.name) {
            description += ` (plugin: ${plugin.name})`;
          }
          yield {
            value: parserName,
            description
          };
        }
      }
    }
  }
}
function normalizeOptionSettings(settings) {
  const options8 = [];
  for (const [name, originalOption] of Object.entries(settings)) {
    const option = {
      name,
      ...originalOption
    };
    if (Array.isArray(option.default)) {
      option.default = at_default(
        /* isOptionalObject */
        false,
        option.default,
        -1
      ).value;
    }
    options8.push(option);
  }
  return options8;
}

// src/main/normalize-options.js
var hasDeprecationWarned;
function normalizeOptions(options8, optionInfos, {
  logger = false,
  isCLI = false,
  passThrough = false,
  FlagSchema,
  descriptor
} = {}) {
  if (isCLI) {
    if (!FlagSchema) {
      throw new Error("'FlagSchema' option is required.");
    }
    if (!descriptor) {
      throw new Error("'descriptor' option is required.");
    }
  } else {
    descriptor = apiDescriptor;
  }
  const unknown = !passThrough ? (key2, value, options9) => {
    const {
      _,
      ...schemas2
    } = options9.schemas;
    return levenUnknownHandler(key2, value, {
      ...options9,
      schemas: schemas2
    });
  } : Array.isArray(passThrough) ? (key2, value) => !passThrough.includes(key2) ? void 0 : {
    [key2]: value
  } : (key2, value) => ({
    [key2]: value
  });
  const schemas = optionInfosToSchemas(optionInfos, {
    isCLI,
    FlagSchema
  });
  const normalizer = new Normalizer(schemas, {
    logger,
    unknown,
    descriptor
  });
  const shouldSuppressDuplicateDeprecationWarnings = logger !== false;
  if (shouldSuppressDuplicateDeprecationWarnings && hasDeprecationWarned) {
    normalizer._hasDeprecationWarned = hasDeprecationWarned;
  }
  const normalized = normalizer.normalize(options8);
  if (shouldSuppressDuplicateDeprecationWarnings) {
    hasDeprecationWarned = normalizer._hasDeprecationWarned;
  }
  return normalized;
}
function optionInfosToSchemas(optionInfos, {
  isCLI,
  FlagSchema
}) {
  const schemas = [];
  if (isCLI) {
    schemas.push(AnySchema.create({
      name: "_"
    }));
  }
  for (const optionInfo of optionInfos) {
    schemas.push(optionInfoToSchema(optionInfo, {
      isCLI,
      optionInfos,
      FlagSchema
    }));
    if (optionInfo.alias && isCLI) {
      schemas.push(AliasSchema.create({
        // @ts-expect-error
        name: optionInfo.alias,
        sourceName: optionInfo.name
      }));
    }
  }
  return schemas;
}
function optionInfoToSchema(optionInfo, {
  isCLI,
  optionInfos,
  FlagSchema
}) {
  const {
    name
  } = optionInfo;
  const parameters = {
    name
  };
  let SchemaConstructor;
  const handlers = {};
  switch (optionInfo.type) {
    case "int":
      SchemaConstructor = IntegerSchema;
      if (isCLI) {
        parameters.preprocess = Number;
      }
      break;
    case "string":
      SchemaConstructor = StringSchema;
      break;
    case "choice":
      SchemaConstructor = ChoiceSchema;
      parameters.choices = optionInfo.choices.map((choiceInfo) => (choiceInfo == null ? void 0 : choiceInfo.redirect) ? {
        ...choiceInfo,
        redirect: {
          to: {
            key: optionInfo.name,
            value: choiceInfo.redirect
          }
        }
      } : choiceInfo);
      break;
    case "boolean":
      SchemaConstructor = BooleanSchema;
      break;
    case "flag":
      SchemaConstructor = FlagSchema;
      parameters.flags = optionInfos.flatMap((optionInfo2) => [optionInfo2.alias, optionInfo2.description && optionInfo2.name, optionInfo2.oppositeDescription && `no-${optionInfo2.name}`].filter(Boolean));
      break;
    case "path":
      SchemaConstructor = StringSchema;
      break;
    default:
      throw new Error(`Unexpected type ${optionInfo.type}`);
  }
  if (optionInfo.exception) {
    parameters.validate = (value, schema2, utils) => optionInfo.exception(value) || schema2.validate(value, utils);
  } else {
    parameters.validate = (value, schema2, utils) => value === void 0 || schema2.validate(value, utils);
  }
  if (optionInfo.redirect) {
    handlers.redirect = (value) => !value ? void 0 : {
      to: typeof optionInfo.redirect === "string" ? optionInfo.redirect : {
        key: optionInfo.redirect.option,
        value: optionInfo.redirect.value
      }
    };
  }
  if (optionInfo.deprecated) {
    handlers.deprecated = true;
  }
  if (isCLI && !optionInfo.array) {
    const originalPreprocess = parameters.preprocess || ((x) => x);
    parameters.preprocess = (value, schema2, utils) => schema2.preprocess(originalPreprocess(Array.isArray(value) ? at_default(
      /* isOptionalObject */
      false,
      value,
      -1
    ) : value), utils);
  }
  return optionInfo.array ? ArraySchema.create({
    ...isCLI ? {
      preprocess: (v) => Array.isArray(v) ? v : [v]
    } : {},
    ...handlers,
    // @ts-expect-error
    valueSchema: SchemaConstructor.create(parameters)
  }) : SchemaConstructor.create({
    ...parameters,
    ...handlers
  });
}
var normalize_options_default = normalizeOptions;

// scripts/build/shims/array-find-last.js
var arrayFindLast = (isOptionalObject, array2, callback) => {
  if (isOptionalObject && (array2 === void 0 || array2 === null)) {
    return;
  }
  if (array2.findLast) {
    return array2.findLast(callback);
  }
  for (let index = array2.length - 1; index >= 0; index--) {
    const element = array2[index];
    if (callback(element, index, array2)) {
      return element;
    }
  }
};
var array_find_last_default = arrayFindLast;

// src/main/parser-and-printer.js
function getParserPluginByParserName(plugins, parserName) {
  if (!parserName) {
    throw new Error("parserName is required.");
  }
  const plugin = array_find_last_default(
    /* isOptionalObject */
    false,
    plugins,
    (plugin2) => plugin2.parsers && Object.prototype.hasOwnProperty.call(plugin2.parsers, parserName)
  );
  if (plugin) {
    return plugin;
  }
  let message = `Couldn't resolve parser "${parserName}".`;
  if (false) {
    message += " Plugins must be explicitly added to the standalone bundle.";
  }
  throw new ConfigError(message);
}
function getPrinterPluginByAstFormat(plugins, astFormat) {
  if (!astFormat) {
    throw new Error("astFormat is required.");
  }
  const plugin = array_find_last_default(
    /* isOptionalObject */
    false,
    plugins,
    (plugin2) => plugin2.printers && Object.prototype.hasOwnProperty.call(plugin2.printers, astFormat)
  );
  if (plugin) {
    return plugin;
  }
  let message = `Couldn't find plugin for AST format "${astFormat}".`;
  if (false) {
    message += " Plugins must be explicitly added to the standalone bundle.";
  }
  throw new ConfigError(message);
}
function resolveParser({
  plugins,
  parser
}) {
  const plugin = getParserPluginByParserName(plugins, parser);
  return initParser(plugin, parser);
}
function initParser(plugin, parserName) {
  const parserOrParserInitFunction = plugin.parsers[parserName];
  return typeof parserOrParserInitFunction === "function" ? parserOrParserInitFunction() : parserOrParserInitFunction;
}
function initPrinter(plugin, astFormat) {
  const printerOrPrinterInitFunction = plugin.printers[astFormat];
  return typeof printerOrPrinterInitFunction === "function" ? printerOrPrinterInitFunction() : printerOrPrinterInitFunction;
}

// src/main/normalize-format-options.js
var formatOptionsHiddenDefaults = {
  astFormat: "estree",
  printer: {},
  originalText: void 0,
  locStart: null,
  locEnd: null
};
async function normalizeFormatOptions(options8, opts = {}) {
  var _a;
  const rawOptions = { ...options8 };
  if (!rawOptions.parser) {
    if (!rawOptions.filepath) {
      throw new UndefinedParserError(
        "No parser and no file path given, couldn't infer a parser."
      );
    } else {
      rawOptions.parser = infer_parser_default(rawOptions, {
        physicalFile: rawOptions.filepath
      });
      if (!rawOptions.parser) {
        throw new UndefinedParserError(
          `No parser could be inferred for file "${rawOptions.filepath}".`
        );
      }
    }
  }
  const supportOptions = getSupportInfo({
    plugins: options8.plugins,
    showDeprecated: true
  }).options;
  const defaults = {
    ...formatOptionsHiddenDefaults,
    ...Object.fromEntries(
      supportOptions.filter((optionInfo) => optionInfo.default !== void 0).map((option) => [option.name, option.default])
    )
  };
  const parserPlugin = getParserPluginByParserName(
    rawOptions.plugins,
    rawOptions.parser
  );
  const parser = await initParser(parserPlugin, rawOptions.parser);
  rawOptions.astFormat = parser.astFormat;
  rawOptions.locEnd = parser.locEnd;
  rawOptions.locStart = parser.locStart;
  const printerPlugin = ((_a = parserPlugin.printers) == null ? void 0 : _a[parser.astFormat]) ? parserPlugin : getPrinterPluginByAstFormat(rawOptions.plugins, parser.astFormat);
  const printer = await initPrinter(printerPlugin, parser.astFormat);
  rawOptions.printer = printer;
  const pluginDefaults = printerPlugin.defaultOptions ? Object.fromEntries(
    Object.entries(printerPlugin.defaultOptions).filter(
      ([, value]) => value !== void 0
    )
  ) : {};
  const mixedDefaults = { ...defaults, ...pluginDefaults };
  for (const [k, value] of Object.entries(mixedDefaults)) {
    if (rawOptions[k] === null || rawOptions[k] === void 0) {
      rawOptions[k] = value;
    }
  }
  if (rawOptions.parser === "json") {
    rawOptions.trailingComma = "none";
  }
  return normalize_options_default(rawOptions, supportOptions, {
    passThrough: Object.keys(formatOptionsHiddenDefaults),
    ...opts
  });
}
var normalize_format_options_default = normalizeFormatOptions;

// src/main/parse.js
var import_code_frame2 = __toESM(require_lib3(), 1);
async function parse4(originalText, options8) {
  const parser = await resolveParser(options8);
  const text = parser.preprocess ? parser.preprocess(originalText, options8) : originalText;
  options8.originalText = text;
  let ast;
  try {
    ast = await parser.parse(
      text,
      options8,
      // TODO: remove the third argument in v4
      // The duplicated argument is passed as intended, see #10156
      options8
    );
  } catch (error) {
    handleParseError(error, originalText);
  }
  return { text, ast };
}
function handleParseError(error, text) {
  const { loc } = error;
  if (loc) {
    const codeFrame = (0, import_code_frame2.codeFrameColumns)(text, loc, { highlightCode: true });
    error.message += "\n" + codeFrame;
    error.codeFrame = codeFrame;
    throw error;
  }
  throw error;
}
var parse_default = parse4;

// src/main/multiparser.js
async function printEmbeddedLanguages(path13, genericPrint, options8, printAstToDoc2, embeds) {
  const {
    embeddedLanguageFormatting,
    printer: {
      embed,
      hasPrettierIgnore = () => false,
      getVisitorKeys: printerGetVisitorKeys
    }
  } = options8;
  if (!embed || embeddedLanguageFormatting !== "auto") {
    return;
  }
  if (embed.length > 2) {
    throw new Error(
      "printer.embed has too many parameters. The API changed in Prettier v3. Please update your plugin. See https://prettier.io/docs/en/plugins.html#optional-embed"
    );
  }
  const getVisitorKeys = create_get_visitor_keys_function_default(
    embed.getVisitorKeys ?? printerGetVisitorKeys
  );
  const embedCallResults = [];
  recurse();
  const originalPathStack = path13.stack;
  for (const { print, node, pathStack } of embedCallResults) {
    try {
      path13.stack = pathStack;
      const doc2 = await print(textToDocForEmbed, genericPrint, path13, options8);
      if (doc2) {
        embeds.set(node, doc2);
      }
    } catch (error) {
      if (process.env.PRETTIER_DEBUG) {
        throw error;
      }
    }
  }
  path13.stack = originalPathStack;
  function textToDocForEmbed(text, partialNextOptions) {
    return textToDoc(text, partialNextOptions, options8, printAstToDoc2);
  }
  function recurse() {
    const { node } = path13;
    if (node === null || typeof node !== "object" || hasPrettierIgnore(path13)) {
      return;
    }
    for (const key2 of getVisitorKeys(node)) {
      if (Array.isArray(node[key2])) {
        path13.each(recurse, key2);
      } else {
        path13.call(recurse, key2);
      }
    }
    const result = embed(path13, options8);
    if (!result) {
      return;
    }
    if (typeof result === "function") {
      embedCallResults.push({
        print: result,
        node,
        pathStack: [...path13.stack]
      });
      return;
    }
    if (false) {
      throw new Error(
        "`embed` should return an async function instead of Promise."
      );
    }
    embeds.set(node, result);
  }
}
async function textToDoc(text, partialNextOptions, parentOptions, printAstToDoc2) {
  const options8 = await normalize_format_options_default(
    {
      ...parentOptions,
      ...partialNextOptions,
      parentParser: parentOptions.parser,
      originalText: text
    },
    { passThrough: true }
  );
  const { ast } = await parse_default(text, options8);
  const doc2 = await printAstToDoc2(ast, options8);
  return stripTrailingHardline(doc2);
}

// src/main/print-ignored.js
function printIgnored(path13, options8) {
  const {
    originalText,
    [Symbol.for("comments")]: comments,
    locStart,
    locEnd,
    [Symbol.for("printedComments")]: printedComments
  } = options8;
  const { node } = path13;
  const start = locStart(node);
  const end = locEnd(node);
  for (const comment of comments) {
    if (locStart(comment) >= start && locEnd(comment) <= end) {
      printedComments.add(comment);
    }
  }
  return originalText.slice(start, end);
}
var print_ignored_default = printIgnored;

// src/main/ast-to-doc.js
async function printAstToDoc(ast, options8) {
  ({ ast } = await prepareToPrint(ast, options8));
  const cache3 = /* @__PURE__ */ new Map();
  const path13 = new ast_path_default(ast);
  const ensurePrintingNode = create_print_pre_check_function_default(options8);
  const embeds = /* @__PURE__ */ new Map();
  await printEmbeddedLanguages(path13, mainPrint, options8, printAstToDoc, embeds);
  const doc2 = await callPluginPrintFunction(
    path13,
    options8,
    mainPrint,
    void 0,
    embeds
  );
  ensureAllCommentsPrinted(options8);
  return doc2;
  function mainPrint(selector, args) {
    if (selector === void 0 || selector === path13) {
      return mainPrintInternal(args);
    }
    if (Array.isArray(selector)) {
      return path13.call(() => mainPrintInternal(args), ...selector);
    }
    return path13.call(() => mainPrintInternal(args), selector);
  }
  function mainPrintInternal(args) {
    ensurePrintingNode(path13);
    const value = path13.node;
    if (value === void 0 || value === null) {
      return "";
    }
    const shouldCache = value && typeof value === "object" && args === void 0;
    if (shouldCache && cache3.has(value)) {
      return cache3.get(value);
    }
    const doc3 = callPluginPrintFunction(path13, options8, mainPrint, args, embeds);
    if (shouldCache) {
      cache3.set(value, doc3);
    }
    return doc3;
  }
}
function callPluginPrintFunction(path13, options8, printPath, args, embeds) {
  var _a;
  const { node } = path13;
  const { printer } = options8;
  let doc2;
  if ((_a = printer.hasPrettierIgnore) == null ? void 0 : _a.call(printer, path13)) {
    doc2 = print_ignored_default(path13, options8);
  } else if (embeds.has(node)) {
    doc2 = embeds.get(node);
  } else {
    doc2 = printer.print(path13, options8, printPath, args);
  }
  if (node === options8.cursorNode) {
    doc2 = inheritLabel(doc2, (doc3) => [cursor, doc3, cursor]);
  }
  if (printer.printComment && (!printer.willPrintOwnComments || !printer.willPrintOwnComments(path13, options8))) {
    doc2 = printComments(path13, doc2, options8);
  }
  return doc2;
}
async function prepareToPrint(ast, options8) {
  const comments = ast.comments ?? [];
  options8[Symbol.for("comments")] = comments;
  options8[Symbol.for("tokens")] = ast.tokens ?? [];
  options8[Symbol.for("printedComments")] = /* @__PURE__ */ new Set();
  attachComments(ast, options8);
  const {
    printer: { preprocess }
  } = options8;
  ast = preprocess ? await preprocess(ast, options8) : ast;
  return { ast, comments };
}

// src/main/get-cursor-node.js
function getCursorNode(ast, options8) {
  const { cursorOffset, locStart, locEnd } = options8;
  const getVisitorKeys = create_get_visitor_keys_function_default(
    options8.printer.getVisitorKeys
  );
  const nodeContainsCursor = (node) => locStart(node) <= cursorOffset && locEnd(node) >= cursorOffset;
  let cursorNode = ast;
  for (const node of getDescendants(ast, {
    getVisitorKeys,
    filter: nodeContainsCursor
  })) {
    cursorNode = node;
  }
  return cursorNode;
}
var get_cursor_node_default = getCursorNode;

// src/main/massage-ast.js
function massageAst(ast, options8) {
  const {
    printer: {
      massageAstNode: cleanFunction,
      getVisitorKeys: printerGetVisitorKeys
    }
  } = options8;
  if (!cleanFunction) {
    return ast;
  }
  const getVisitorKeys = create_get_visitor_keys_function_default(printerGetVisitorKeys);
  const ignoredProperties = cleanFunction.ignoredProperties ?? /* @__PURE__ */ new Set();
  return recurse(ast);
  function recurse(original, parent) {
    if (!(original !== null && typeof original === "object")) {
      return original;
    }
    if (Array.isArray(original)) {
      return original.map((child) => recurse(child, parent)).filter(Boolean);
    }
    const cloned = {};
    const childrenKeys = new Set(getVisitorKeys(original));
    for (const key2 in original) {
      if (!Object.prototype.hasOwnProperty.call(original, key2) || ignoredProperties.has(key2)) {
        continue;
      }
      if (childrenKeys.has(key2)) {
        cloned[key2] = recurse(original[key2], original);
      } else {
        cloned[key2] = original[key2];
      }
    }
    const result = cleanFunction(original, cloned, parent);
    if (result === null) {
      return;
    }
    return result ?? cloned;
  }
}
var massage_ast_default = massageAst;

// scripts/build/shims/array-find-last-index.js
var arrayFindLastIndex = (isOptionalObject, array2, callback) => {
  if (isOptionalObject && (array2 === void 0 || array2 === null)) {
    return;
  }
  if (array2.findLastIndex) {
    return array2.findLastIndex(callback);
  }
  for (let index = array2.length - 1; index >= 0; index--) {
    const element = array2[index];
    if (callback(element, index, array2)) {
      return index;
    }
  }
  return -1;
};
var array_find_last_index_default = arrayFindLastIndex;

// src/main/range-util.js
import assert5 from "assert";
var isJsonParser = ({
  parser
}) => parser === "json" || parser === "json5" || parser === "jsonc" || parser === "json-stringify";
function findCommonAncestor(startNodeAndParents, endNodeAndParents) {
  const startNodeAndAncestors = [startNodeAndParents.node, ...startNodeAndParents.parentNodes];
  const endNodeAndAncestors = /* @__PURE__ */ new Set([endNodeAndParents.node, ...endNodeAndParents.parentNodes]);
  return startNodeAndAncestors.find((node) => jsonSourceElements.has(node.type) && endNodeAndAncestors.has(node));
}
function dropRootParents(parents) {
  const index = array_find_last_index_default(
    /* isOptionalObject */
    false,
    parents,
    (node) => node.type !== "Program" && node.type !== "File"
  );
  if (index === -1) {
    return parents;
  }
  return parents.slice(0, index + 1);
}
function findSiblingAncestors(startNodeAndParents, endNodeAndParents, {
  locStart,
  locEnd
}) {
  let resultStartNode = startNodeAndParents.node;
  let resultEndNode = endNodeAndParents.node;
  if (resultStartNode === resultEndNode) {
    return {
      startNode: resultStartNode,
      endNode: resultEndNode
    };
  }
  const startNodeStart = locStart(startNodeAndParents.node);
  for (const endParent of dropRootParents(endNodeAndParents.parentNodes)) {
    if (locStart(endParent) >= startNodeStart) {
      resultEndNode = endParent;
    } else {
      break;
    }
  }
  const endNodeEnd = locEnd(endNodeAndParents.node);
  for (const startParent of dropRootParents(startNodeAndParents.parentNodes)) {
    if (locEnd(startParent) <= endNodeEnd) {
      resultStartNode = startParent;
    } else {
      break;
    }
    if (resultStartNode === resultEndNode) {
      break;
    }
  }
  return {
    startNode: resultStartNode,
    endNode: resultEndNode
  };
}
function findNodeAtOffset(node, offset, options8, predicate, parentNodes = [], type2) {
  const {
    locStart,
    locEnd
  } = options8;
  const start = locStart(node);
  const end = locEnd(node);
  if (offset > end || offset < start || type2 === "rangeEnd" && offset === start || type2 === "rangeStart" && offset === end) {
    return;
  }
  for (const childNode of getSortedChildNodes(node, options8)) {
    const childResult = findNodeAtOffset(childNode, offset, options8, predicate, [node, ...parentNodes], type2);
    if (childResult) {
      return childResult;
    }
  }
  if (!predicate || predicate(node, parentNodes[0])) {
    return {
      node,
      parentNodes
    };
  }
}
function isJsSourceElement(type2, parentType) {
  return parentType !== "DeclareExportDeclaration" && type2 !== "TypeParameterDeclaration" && (type2 === "Directive" || type2 === "TypeAlias" || type2 === "TSExportAssignment" || type2.startsWith("Declare") || type2.startsWith("TSDeclare") || type2.endsWith("Statement") || type2.endsWith("Declaration"));
}
var jsonSourceElements = /* @__PURE__ */ new Set(["JsonRoot", "ObjectExpression", "ArrayExpression", "StringLiteral", "NumericLiteral", "BooleanLiteral", "NullLiteral", "UnaryExpression", "TemplateLiteral"]);
var graphqlSourceElements = /* @__PURE__ */ new Set(["OperationDefinition", "FragmentDefinition", "VariableDefinition", "TypeExtensionDefinition", "ObjectTypeDefinition", "FieldDefinition", "DirectiveDefinition", "EnumTypeDefinition", "EnumValueDefinition", "InputValueDefinition", "InputObjectTypeDefinition", "SchemaDefinition", "OperationTypeDefinition", "InterfaceTypeDefinition", "UnionTypeDefinition", "ScalarTypeDefinition"]);
function isSourceElement(opts, node, parentNode) {
  if (!node) {
    return false;
  }
  switch (opts.parser) {
    case "flow":
    case "babel":
    case "babel-flow":
    case "babel-ts":
    case "typescript":
    case "acorn":
    case "espree":
    case "meriyah":
    case "__babel_estree":
      return isJsSourceElement(node.type, parentNode == null ? void 0 : parentNode.type);
    case "json":
    case "json5":
    case "jsonc":
    case "json-stringify":
      return jsonSourceElements.has(node.type);
    case "graphql":
      return graphqlSourceElements.has(node.kind);
    case "vue":
      return node.tag !== "root";
  }
  return false;
}
function calculateRange(text, opts, ast) {
  let {
    rangeStart: start,
    rangeEnd: end,
    locStart,
    locEnd
  } = opts;
  assert5.ok(end > start);
  const firstNonWhitespaceCharacterIndex = text.slice(start, end).search(/\S/u);
  const isAllWhitespace = firstNonWhitespaceCharacterIndex === -1;
  if (!isAllWhitespace) {
    start += firstNonWhitespaceCharacterIndex;
    for (; end > start; --end) {
      if (/\S/u.test(text[end - 1])) {
        break;
      }
    }
  }
  const startNodeAndParents = findNodeAtOffset(ast, start, opts, (node, parentNode) => isSourceElement(opts, node, parentNode), [], "rangeStart");
  const endNodeAndParents = (
    // No need find Node at `end`, it will be the same as `startNodeAndParents`
    isAllWhitespace ? startNodeAndParents : findNodeAtOffset(ast, end, opts, (node) => isSourceElement(opts, node), [], "rangeEnd")
  );
  if (!startNodeAndParents || !endNodeAndParents) {
    return {
      rangeStart: 0,
      rangeEnd: 0
    };
  }
  let startNode;
  let endNode;
  if (isJsonParser(opts)) {
    const commonAncestor = findCommonAncestor(startNodeAndParents, endNodeAndParents);
    startNode = commonAncestor;
    endNode = commonAncestor;
  } else {
    ({
      startNode,
      endNode
    } = findSiblingAncestors(startNodeAndParents, endNodeAndParents, opts));
  }
  return {
    rangeStart: Math.min(locStart(startNode), locStart(endNode)),
    rangeEnd: Math.max(locEnd(startNode), locEnd(endNode))
  };
}

// src/main/core.js
var BOM = "\uFEFF";
var CURSOR = Symbol("cursor");
async function coreFormat(originalText, opts, addAlignmentSize = 0) {
  if (!originalText || originalText.trim().length === 0) {
    return {
      formatted: "",
      cursorOffset: -1,
      comments: []
    };
  }
  const {
    ast,
    text
  } = await parse_default(originalText, opts);
  if (opts.cursorOffset >= 0) {
    opts.cursorNode = get_cursor_node_default(ast, opts);
  }
  let doc2 = await printAstToDoc(ast, opts, addAlignmentSize);
  if (addAlignmentSize > 0) {
    doc2 = addAlignmentToDoc([hardline, doc2], addAlignmentSize, opts.tabWidth);
  }
  const result = printDocToString(doc2, opts);
  if (addAlignmentSize > 0) {
    const trimmed = result.formatted.trim();
    if (result.cursorNodeStart !== void 0) {
      result.cursorNodeStart -= result.formatted.indexOf(trimmed);
    }
    result.formatted = trimmed + convertEndOfLineToChars(opts.endOfLine);
  }
  const comments = opts[Symbol.for("comments")];
  if (opts.cursorOffset >= 0) {
    let oldCursorNodeStart;
    let oldCursorNodeText;
    let cursorOffsetRelativeToOldCursorNode;
    let newCursorNodeStart;
    let newCursorNodeText;
    if (opts.cursorNode && result.cursorNodeText) {
      oldCursorNodeStart = opts.locStart(opts.cursorNode);
      oldCursorNodeText = text.slice(oldCursorNodeStart, opts.locEnd(opts.cursorNode));
      cursorOffsetRelativeToOldCursorNode = opts.cursorOffset - oldCursorNodeStart;
      newCursorNodeStart = result.cursorNodeStart;
      newCursorNodeText = result.cursorNodeText;
    } else {
      oldCursorNodeStart = 0;
      oldCursorNodeText = text;
      cursorOffsetRelativeToOldCursorNode = opts.cursorOffset;
      newCursorNodeStart = 0;
      newCursorNodeText = result.formatted;
    }
    if (oldCursorNodeText === newCursorNodeText) {
      return {
        formatted: result.formatted,
        cursorOffset: newCursorNodeStart + cursorOffsetRelativeToOldCursorNode,
        comments
      };
    }
    const oldCursorNodeCharArray = oldCursorNodeText.split("");
    oldCursorNodeCharArray.splice(cursorOffsetRelativeToOldCursorNode, 0, CURSOR);
    const newCursorNodeCharArray = newCursorNodeText.split("");
    const cursorNodeDiff = diffArrays(oldCursorNodeCharArray, newCursorNodeCharArray);
    let cursorOffset = newCursorNodeStart;
    for (const entry of cursorNodeDiff) {
      if (entry.removed) {
        if (entry.value.includes(CURSOR)) {
          break;
        }
      } else {
        cursorOffset += entry.count;
      }
    }
    return {
      formatted: result.formatted,
      cursorOffset,
      comments
    };
  }
  return {
    formatted: result.formatted,
    cursorOffset: -1,
    comments
  };
}
async function formatRange(originalText, opts) {
  const {
    ast,
    text
  } = await parse_default(originalText, opts);
  const {
    rangeStart,
    rangeEnd
  } = calculateRange(text, opts, ast);
  const rangeString = text.slice(rangeStart, rangeEnd);
  const rangeStart2 = Math.min(rangeStart, text.lastIndexOf("\n", rangeStart) + 1);
  const indentString = text.slice(rangeStart2, rangeStart).match(/^\s*/u)[0];
  const alignmentSize = get_alignment_size_default(indentString, opts.tabWidth);
  const rangeResult = await coreFormat(rangeString, {
    ...opts,
    rangeStart: 0,
    rangeEnd: Number.POSITIVE_INFINITY,
    // Track the cursor offset only if it's within our range
    cursorOffset: opts.cursorOffset > rangeStart && opts.cursorOffset <= rangeEnd ? opts.cursorOffset - rangeStart : -1,
    // Always use `lf` to format, we'll replace it later
    endOfLine: "lf"
  }, alignmentSize);
  const rangeTrimmed = rangeResult.formatted.trimEnd();
  let {
    cursorOffset
  } = opts;
  if (cursorOffset > rangeEnd) {
    cursorOffset += rangeTrimmed.length - rangeString.length;
  } else if (rangeResult.cursorOffset >= 0) {
    cursorOffset = rangeResult.cursorOffset + rangeStart;
  }
  let formatted = text.slice(0, rangeStart) + rangeTrimmed + text.slice(rangeEnd);
  if (opts.endOfLine !== "lf") {
    const eol = convertEndOfLineToChars(opts.endOfLine);
    if (cursorOffset >= 0 && eol === "\r\n") {
      cursorOffset += countEndOfLineChars(formatted.slice(0, cursorOffset), "\n");
    }
    formatted = string_replace_all_default(
      /* isOptionalObject */
      false,
      formatted,
      "\n",
      eol
    );
  }
  return {
    formatted,
    cursorOffset,
    comments: rangeResult.comments
  };
}
function ensureIndexInText(text, index, defaultValue) {
  if (typeof index !== "number" || Number.isNaN(index) || index < 0 || index > text.length) {
    return defaultValue;
  }
  return index;
}
function normalizeIndexes(text, options8) {
  let {
    cursorOffset,
    rangeStart,
    rangeEnd
  } = options8;
  cursorOffset = ensureIndexInText(text, cursorOffset, -1);
  rangeStart = ensureIndexInText(text, rangeStart, 0);
  rangeEnd = ensureIndexInText(text, rangeEnd, text.length);
  return {
    ...options8,
    cursorOffset,
    rangeStart,
    rangeEnd
  };
}
function normalizeInputAndOptions(text, options8) {
  let {
    cursorOffset,
    rangeStart,
    rangeEnd,
    endOfLine
  } = normalizeIndexes(text, options8);
  const hasBOM = text.charAt(0) === BOM;
  if (hasBOM) {
    text = text.slice(1);
    cursorOffset--;
    rangeStart--;
    rangeEnd--;
  }
  if (endOfLine === "auto") {
    endOfLine = guessEndOfLine(text);
  }
  if (text.includes("\r")) {
    const countCrlfBefore = (index) => countEndOfLineChars(text.slice(0, Math.max(index, 0)), "\r\n");
    cursorOffset -= countCrlfBefore(cursorOffset);
    rangeStart -= countCrlfBefore(rangeStart);
    rangeEnd -= countCrlfBefore(rangeEnd);
    text = normalizeEndOfLine(text);
  }
  return {
    hasBOM,
    text,
    options: normalizeIndexes(text, {
      ...options8,
      cursorOffset,
      rangeStart,
      rangeEnd,
      endOfLine
    })
  };
}
async function hasPragma(text, options8) {
  const selectedParser = await resolveParser(options8);
  return !selectedParser.hasPragma || selectedParser.hasPragma(text);
}
async function formatWithCursor(originalText, originalOptions) {
  let {
    hasBOM,
    text,
    options: options8
  } = normalizeInputAndOptions(originalText, await normalize_format_options_default(originalOptions));
  if (options8.rangeStart >= options8.rangeEnd && text !== "" || options8.requirePragma && !await hasPragma(text, options8)) {
    return {
      formatted: originalText,
      cursorOffset: originalOptions.cursorOffset,
      comments: []
    };
  }
  let result;
  if (options8.rangeStart > 0 || options8.rangeEnd < text.length) {
    result = await formatRange(text, options8);
  } else {
    if (!options8.requirePragma && options8.insertPragma && options8.printer.insertPragma && !await hasPragma(text, options8)) {
      text = options8.printer.insertPragma(text);
    }
    result = await coreFormat(text, options8);
  }
  if (hasBOM) {
    result.formatted = BOM + result.formatted;
    if (result.cursorOffset >= 0) {
      result.cursorOffset++;
    }
  }
  return result;
}
async function parse5(originalText, originalOptions, devOptions) {
  const {
    text,
    options: options8
  } = normalizeInputAndOptions(originalText, await normalize_format_options_default(originalOptions));
  const parsed = await parse_default(text, options8);
  if (devOptions) {
    if (devOptions.preprocessForPrint) {
      parsed.ast = await prepareToPrint(parsed.ast, options8);
    }
    if (devOptions.massage) {
      parsed.ast = massage_ast_default(parsed.ast, options8);
    }
  }
  return parsed;
}
async function formatAst(ast, options8) {
  options8 = await normalize_format_options_default(options8);
  const doc2 = await printAstToDoc(ast, options8);
  return printDocToString(doc2, options8);
}
async function formatDoc(doc2, options8) {
  const text = printDocToDebug(doc2);
  const {
    formatted
  } = await formatWithCursor(text, {
    ...options8,
    parser: "__js_expression"
  });
  return formatted;
}
async function printToDoc(originalText, options8) {
  options8 = await normalize_format_options_default(options8);
  const {
    ast
  } = await parse_default(originalText, options8);
  return printAstToDoc(ast, options8);
}
async function printDocToString2(doc2, options8) {
  return printDocToString(doc2, await normalize_format_options_default(options8));
}

// src/main/option-categories.js
var option_categories_exports = {};
__export(option_categories_exports, {
  CATEGORY_CONFIG: () => CATEGORY_CONFIG,
  CATEGORY_EDITOR: () => CATEGORY_EDITOR,
  CATEGORY_FORMAT: () => CATEGORY_FORMAT,
  CATEGORY_GLOBAL: () => CATEGORY_GLOBAL,
  CATEGORY_OTHER: () => CATEGORY_OTHER,
  CATEGORY_OUTPUT: () => CATEGORY_OUTPUT,
  CATEGORY_SPECIAL: () => CATEGORY_SPECIAL
});
var CATEGORY_CONFIG = "Config";
var CATEGORY_EDITOR = "Editor";
var CATEGORY_FORMAT = "Format";
var CATEGORY_OTHER = "Other";
var CATEGORY_OUTPUT = "Output";
var CATEGORY_GLOBAL = "Global";
var CATEGORY_SPECIAL = "Special";

// src/plugins/builtin-plugins-proxy.js
var builtin_plugins_proxy_exports = {};
__export(builtin_plugins_proxy_exports, {
  languages: () => languages,
  options: () => options7,
  parsers: () => parsers,
  printers: () => printers
});

// src/language-css/languages.evaluate.js
var languages_evaluate_default = [
  {
    "linguistLanguageId": 50,
    "name": "CSS",
    "type": "markup",
    "tmScope": "source.css",
    "aceMode": "css",
    "codemirrorMode": "css",
    "codemirrorMimeType": "text/css",
    "color": "#563d7c",
    "extensions": [
      ".css",
      ".wxss"
    ],
    "parsers": [
      "css"
    ],
    "vscodeLanguageIds": [
      "css"
    ]
  },
  {
    "linguistLanguageId": 262764437,
    "name": "PostCSS",
    "type": "markup",
    "color": "#dc3a0c",
    "tmScope": "source.postcss",
    "group": "CSS",
    "extensions": [
      ".pcss",
      ".postcss"
    ],
    "aceMode": "text",
    "parsers": [
      "css"
    ],
    "vscodeLanguageIds": [
      "postcss"
    ]
  },
  {
    "linguistLanguageId": 198,
    "name": "Less",
    "type": "markup",
    "color": "#1d365d",
    "aliases": [
      "less-css"
    ],
    "extensions": [
      ".less"
    ],
    "tmScope": "source.css.less",
    "aceMode": "less",
    "codemirrorMode": "css",
    "codemirrorMimeType": "text/css",
    "parsers": [
      "less"
    ],
    "vscodeLanguageIds": [
      "less"
    ]
  },
  {
    "linguistLanguageId": 329,
    "name": "SCSS",
    "type": "markup",
    "color": "#c6538c",
    "tmScope": "source.css.scss",
    "aceMode": "scss",
    "codemirrorMode": "css",
    "codemirrorMimeType": "text/x-scss",
    "extensions": [
      ".scss"
    ],
    "parsers": [
      "scss"
    ],
    "vscodeLanguageIds": [
      "scss"
    ]
  }
];

// src/common/common-options.evaluate.js
var common_options_evaluate_default = {
  "bracketSpacing": {
    "category": "Common",
    "type": "boolean",
    "default": true,
    "description": "Print spaces between brackets.",
    "oppositeDescription": "Do not print spaces between brackets."
  },
  "singleQuote": {
    "category": "Common",
    "type": "boolean",
    "default": false,
    "description": "Use single quotes instead of double quotes."
  },
  "proseWrap": {
    "category": "Common",
    "type": "choice",
    "default": "preserve",
    "description": "How to wrap prose.",
    "choices": [
      {
        "value": "always",
        "description": "Wrap prose if it exceeds the print width."
      },
      {
        "value": "never",
        "description": "Do not wrap prose."
      },
      {
        "value": "preserve",
        "description": "Wrap prose as-is."
      }
    ]
  },
  "bracketSameLine": {
    "category": "Common",
    "type": "boolean",
    "default": false,
    "description": "Put > of opening tags on the last line instead of on a new line."
  },
  "singleAttributePerLine": {
    "category": "Common",
    "type": "boolean",
    "default": false,
    "description": "Enforce single attribute per line in HTML, Vue and JSX."
  }
};

// src/language-css/options.js
var options = {
  singleQuote: common_options_evaluate_default.singleQuote
};
var options_default = options;

// src/language-graphql/languages.evaluate.js
var languages_evaluate_default2 = [
  {
    "linguistLanguageId": 139,
    "name": "GraphQL",
    "type": "data",
    "color": "#e10098",
    "extensions": [
      ".graphql",
      ".gql",
      ".graphqls"
    ],
    "tmScope": "source.graphql",
    "aceMode": "text",
    "parsers": [
      "graphql"
    ],
    "vscodeLanguageIds": [
      "graphql"
    ]
  }
];

// src/language-graphql/options.js
var options2 = {
  bracketSpacing: common_options_evaluate_default.bracketSpacing
};
var options_default2 = options2;

// src/language-handlebars/languages.evaluate.js
var languages_evaluate_default3 = [
  {
    "linguistLanguageId": 155,
    "name": "Handlebars",
    "type": "markup",
    "color": "#f7931e",
    "aliases": [
      "hbs",
      "htmlbars"
    ],
    "extensions": [
      ".handlebars",
      ".hbs"
    ],
    "tmScope": "text.html.handlebars",
    "aceMode": "handlebars",
    "parsers": [
      "glimmer"
    ],
    "vscodeLanguageIds": [
      "handlebars"
    ]
  }
];

// src/language-html/languages.evaluate.js
var languages_evaluate_default4 = [
  {
    "linguistLanguageId": 146,
    "name": "Angular",
    "type": "markup",
    "tmScope": "text.html.basic",
    "aceMode": "html",
    "codemirrorMode": "htmlmixed",
    "codemirrorMimeType": "text/html",
    "color": "#e34c26",
    "aliases": [
      "xhtml"
    ],
    "extensions": [
      ".component.html"
    ],
    "parsers": [
      "angular"
    ],
    "vscodeLanguageIds": [
      "html"
    ],
    "filenames": []
  },
  {
    "linguistLanguageId": 146,
    "name": "HTML",
    "type": "markup",
    "tmScope": "text.html.basic",
    "aceMode": "html",
    "codemirrorMode": "htmlmixed",
    "codemirrorMimeType": "text/html",
    "color": "#e34c26",
    "aliases": [
      "xhtml"
    ],
    "extensions": [
      ".html",
      ".hta",
      ".htm",
      ".html.hl",
      ".inc",
      ".xht",
      ".xhtml",
      ".mjml"
    ],
    "parsers": [
      "html"
    ],
    "vscodeLanguageIds": [
      "html"
    ]
  },
  {
    "linguistLanguageId": 146,
    "name": "Lightning Web Components",
    "type": "markup",
    "tmScope": "text.html.basic",
    "aceMode": "html",
    "codemirrorMode": "htmlmixed",
    "codemirrorMimeType": "text/html",
    "color": "#e34c26",
    "aliases": [
      "xhtml"
    ],
    "extensions": [],
    "parsers": [
      "lwc"
    ],
    "vscodeLanguageIds": [
      "html"
    ],
    "filenames": []
  },
  {
    "linguistLanguageId": 391,
    "name": "Vue",
    "type": "markup",
    "color": "#41b883",
    "extensions": [
      ".vue"
    ],
    "tmScope": "text.html.vue",
    "aceMode": "html",
    "parsers": [
      "vue"
    ],
    "vscodeLanguageIds": [
      "vue"
    ]
  }
];

// src/language-html/options.js
var CATEGORY_HTML = "HTML";
var options3 = {
  bracketSameLine: common_options_evaluate_default.bracketSameLine,
  htmlWhitespaceSensitivity: {
    category: CATEGORY_HTML,
    type: "choice",
    default: "css",
    description: "How to handle whitespaces in HTML.",
    choices: [
      {
        value: "css",
        description: "Respect the default value of CSS display property."
      },
      {
        value: "strict",
        description: "Whitespaces are considered sensitive."
      },
      {
        value: "ignore",
        description: "Whitespaces are considered insensitive."
      }
    ]
  },
  singleAttributePerLine: common_options_evaluate_default.singleAttributePerLine,
  vueIndentScriptAndStyle: {
    category: CATEGORY_HTML,
    type: "boolean",
    default: false,
    description: "Indent script and style tags in Vue files."
  }
};
var options_default3 = options3;

// src/language-js/languages.evaluate.js
var languages_evaluate_default5 = [
  {
    "linguistLanguageId": 183,
    "name": "JavaScript",
    "type": "programming",
    "tmScope": "source.js",
    "aceMode": "javascript",
    "codemirrorMode": "javascript",
    "codemirrorMimeType": "text/javascript",
    "color": "#f1e05a",
    "aliases": [
      "js",
      "node"
    ],
    "extensions": [
      ".js",
      "._js",
      ".bones",
      ".cjs",
      ".es",
      ".es6",
      ".frag",
      ".gs",
      ".jake",
      ".javascript",
      ".jsb",
      ".jscad",
      ".jsfl",
      ".jslib",
      ".jsm",
      ".jspre",
      ".jss",
      ".mjs",
      ".njs",
      ".pac",
      ".sjs",
      ".ssjs",
      ".xsjs",
      ".xsjslib",
      ".wxs"
    ],
    "filenames": [
      "Jakefile"
    ],
    "interpreters": [
      "chakra",
      "d8",
      "gjs",
      "js",
      "node",
      "nodejs",
      "qjs",
      "rhino",
      "v8",
      "v8-shell",
      "zx"
    ],
    "parsers": [
      "babel",
      "acorn",
      "espree",
      "meriyah",
      "babel-flow",
      "babel-ts",
      "flow",
      "typescript"
    ],
    "vscodeLanguageIds": [
      "javascript",
      "mongo"
    ]
  },
  {
    "linguistLanguageId": 183,
    "name": "Flow",
    "type": "programming",
    "tmScope": "source.js",
    "aceMode": "javascript",
    "codemirrorMode": "javascript",
    "codemirrorMimeType": "text/javascript",
    "color": "#f1e05a",
    "aliases": [],
    "extensions": [
      ".js.flow"
    ],
    "filenames": [],
    "interpreters": [
      "chakra",
      "d8",
      "gjs",
      "js",
      "node",
      "nodejs",
      "qjs",
      "rhino",
      "v8",
      "v8-shell"
    ],
    "parsers": [
      "flow",
      "babel-flow"
    ],
    "vscodeLanguageIds": [
      "javascript"
    ]
  },
  {
    "linguistLanguageId": 183,
    "name": "JSX",
    "type": "programming",
    "tmScope": "source.js.jsx",
    "aceMode": "javascript",
    "codemirrorMode": "jsx",
    "codemirrorMimeType": "text/jsx",
    "color": void 0,
    "aliases": void 0,
    "extensions": [
      ".jsx"
    ],
    "filenames": void 0,
    "interpreters": void 0,
    "parsers": [
      "babel",
      "babel-flow",
      "babel-ts",
      "flow",
      "typescript",
      "espree",
      "meriyah"
    ],
    "vscodeLanguageIds": [
      "javascriptreact"
    ],
    "group": "JavaScript"
  },
  {
    "linguistLanguageId": 378,
    "name": "TypeScript",
    "type": "programming",
    "color": "#3178c6",
    "aliases": [
      "ts"
    ],
    "interpreters": [
      "deno",
      "ts-node"
    ],
    "extensions": [
      ".ts",
      ".cts",
      ".mts"
    ],
    "tmScope": "source.ts",
    "aceMode": "typescript",
    "codemirrorMode": "javascript",
    "codemirrorMimeType": "application/typescript",
    "parsers": [
      "typescript",
      "babel-ts"
    ],
    "vscodeLanguageIds": [
      "typescript"
    ]
  },
  {
    "linguistLanguageId": 94901924,
    "name": "TSX",
    "type": "programming",
    "color": "#3178c6",
    "group": "TypeScript",
    "extensions": [
      ".tsx"
    ],
    "tmScope": "source.tsx",
    "aceMode": "javascript",
    "codemirrorMode": "jsx",
    "codemirrorMimeType": "text/jsx",
    "parsers": [
      "typescript",
      "babel-ts"
    ],
    "vscodeLanguageIds": [
      "typescriptreact"
    ]
  }
];

// src/language-js/options.js
var CATEGORY_JAVASCRIPT = "JavaScript";
var options4 = {
  arrowParens: {
    category: CATEGORY_JAVASCRIPT,
    type: "choice",
    default: "always",
    description: "Include parentheses around a sole arrow function parameter.",
    choices: [
      {
        value: "always",
        description: "Always include parens. Example: `(x) => x`"
      },
      {
        value: "avoid",
        description: "Omit parens when possible. Example: `x => x`"
      }
    ]
  },
  bracketSameLine: common_options_evaluate_default.bracketSameLine,
  bracketSpacing: common_options_evaluate_default.bracketSpacing,
  jsxBracketSameLine: {
    category: CATEGORY_JAVASCRIPT,
    type: "boolean",
    description: "Put > on the last line instead of at a new line.",
    deprecated: "2.4.0"
  },
  semi: {
    category: CATEGORY_JAVASCRIPT,
    type: "boolean",
    default: true,
    description: "Print semicolons.",
    oppositeDescription: "Do not print semicolons, except at the beginning of lines which may need them."
  },
  experimentalTernaries: {
    category: CATEGORY_JAVASCRIPT,
    type: "boolean",
    default: false,
    description: "Use curious ternaries, with the question mark after the condition.",
    oppositeDescription: "Default behavior of ternaries; keep question marks on the same line as the consequent."
  },
  singleQuote: common_options_evaluate_default.singleQuote,
  jsxSingleQuote: {
    category: CATEGORY_JAVASCRIPT,
    type: "boolean",
    default: false,
    description: "Use single quotes in JSX."
  },
  quoteProps: {
    category: CATEGORY_JAVASCRIPT,
    type: "choice",
    default: "as-needed",
    description: "Change when properties in objects are quoted.",
    choices: [
      {
        value: "as-needed",
        description: "Only add quotes around object properties where required."
      },
      {
        value: "consistent",
        description: "If at least one property in an object requires quotes, quote all properties."
      },
      {
        value: "preserve",
        description: "Respect the input use of quotes in object properties."
      }
    ]
  },
  trailingComma: {
    category: CATEGORY_JAVASCRIPT,
    type: "choice",
    default: "all",
    description: "Print trailing commas wherever possible when multi-line.",
    choices: [
      {
        value: "all",
        description: "Trailing commas wherever possible (including function arguments)."
      },
      {
        value: "es5",
        description: "Trailing commas where valid in ES5 (objects, arrays, etc.)"
      },
      { value: "none", description: "No trailing commas." }
    ]
  },
  singleAttributePerLine: common_options_evaluate_default.singleAttributePerLine
};
var options_default4 = options4;

// src/language-json/languages.evaluate.js
var languages_evaluate_default6 = [
  {
    "linguistLanguageId": 174,
    "name": "JSON.stringify",
    "type": "data",
    "color": "#292929",
    "tmScope": "source.json",
    "aceMode": "json",
    "codemirrorMode": "javascript",
    "codemirrorMimeType": "application/json",
    "aliases": [
      "geojson",
      "jsonl",
      "topojson"
    ],
    "extensions": [
      ".importmap"
    ],
    "filenames": [
      "package.json",
      "package-lock.json",
      "composer.json"
    ],
    "parsers": [
      "json-stringify"
    ],
    "vscodeLanguageIds": [
      "json"
    ]
  },
  {
    "linguistLanguageId": 174,
    "name": "JSON",
    "type": "data",
    "color": "#292929",
    "tmScope": "source.json",
    "aceMode": "json",
    "codemirrorMode": "javascript",
    "codemirrorMimeType": "application/json",
    "aliases": [
      "geojson",
      "jsonl",
      "topojson"
    ],
    "extensions": [
      ".json",
      ".4DForm",
      ".4DProject",
      ".avsc",
      ".geojson",
      ".gltf",
      ".har",
      ".ice",
      ".JSON-tmLanguage",
      ".mcmeta",
      ".tfstate",
      ".tfstate.backup",
      ".topojson",
      ".webapp",
      ".webmanifest",
      ".yy",
      ".yyp"
    ],
    "filenames": [
      ".all-contributorsrc",
      ".arcconfig",
      ".auto-changelog",
      ".c8rc",
      ".htmlhintrc",
      ".imgbotconfig",
      ".nycrc",
      ".tern-config",
      ".tern-project",
      ".watchmanconfig",
      "Pipfile.lock",
      "composer.lock",
      "flake.lock",
      "mcmod.info",
      ".babelrc",
      ".jscsrc",
      ".jshintrc",
      ".jslintrc",
      ".swcrc"
    ],
    "parsers": [
      "json"
    ],
    "vscodeLanguageIds": [
      "json"
    ]
  },
  {
    "linguistLanguageId": 423,
    "name": "JSON with Comments",
    "type": "data",
    "color": "#292929",
    "group": "JSON",
    "tmScope": "source.js",
    "aceMode": "javascript",
    "codemirrorMode": "javascript",
    "codemirrorMimeType": "text/javascript",
    "aliases": [
      "jsonc"
    ],
    "extensions": [
      ".jsonc",
      ".code-snippets",
      ".code-workspace",
      ".sublime-build",
      ".sublime-commands",
      ".sublime-completions",
      ".sublime-keymap",
      ".sublime-macro",
      ".sublime-menu",
      ".sublime-mousemap",
      ".sublime-project",
      ".sublime-settings",
      ".sublime-theme",
      ".sublime-workspace",
      ".sublime_metrics",
      ".sublime_session"
    ],
    "filenames": [],
    "parsers": [
      "jsonc"
    ],
    "vscodeLanguageIds": [
      "jsonc"
    ]
  },
  {
    "linguistLanguageId": 175,
    "name": "JSON5",
    "type": "data",
    "color": "#267CB9",
    "extensions": [
      ".json5"
    ],
    "tmScope": "source.js",
    "aceMode": "javascript",
    "codemirrorMode": "javascript",
    "codemirrorMimeType": "application/json",
    "parsers": [
      "json5"
    ],
    "vscodeLanguageIds": [
      "json5"
    ]
  }
];

// src/language-markdown/languages.evaluate.js
var languages_evaluate_default7 = [
  {
    "linguistLanguageId": 222,
    "name": "Markdown",
    "type": "prose",
    "color": "#083fa1",
    "aliases": [
      "md",
      "pandoc"
    ],
    "aceMode": "markdown",
    "codemirrorMode": "gfm",
    "codemirrorMimeType": "text/x-gfm",
    "wrap": true,
    "extensions": [
      ".md",
      ".livemd",
      ".markdown",
      ".mdown",
      ".mdwn",
      ".mkd",
      ".mkdn",
      ".mkdown",
      ".ronn",
      ".scd",
      ".workbook"
    ],
    "filenames": [
      "contents.lr",
      "README"
    ],
    "tmScope": "text.md",
    "parsers": [
      "markdown"
    ],
    "vscodeLanguageIds": [
      "markdown"
    ]
  },
  {
    "linguistLanguageId": 222,
    "name": "MDX",
    "type": "prose",
    "color": "#083fa1",
    "aliases": [
      "md",
      "pandoc"
    ],
    "aceMode": "markdown",
    "codemirrorMode": "gfm",
    "codemirrorMimeType": "text/x-gfm",
    "wrap": true,
    "extensions": [
      ".mdx"
    ],
    "filenames": [],
    "tmScope": "text.md",
    "parsers": [
      "mdx"
    ],
    "vscodeLanguageIds": [
      "mdx"
    ]
  }
];

// src/language-markdown/options.js
var options5 = {
  proseWrap: common_options_evaluate_default.proseWrap,
  singleQuote: common_options_evaluate_default.singleQuote
};
var options_default5 = options5;

// src/language-yaml/languages.evaluate.js
var languages_evaluate_default8 = [
  {
    "linguistLanguageId": 407,
    "name": "YAML",
    "type": "data",
    "color": "#cb171e",
    "tmScope": "source.yaml",
    "aliases": [
      "yml"
    ],
    "extensions": [
      ".yml",
      ".mir",
      ".reek",
      ".rviz",
      ".sublime-syntax",
      ".syntax",
      ".yaml",
      ".yaml-tmlanguage",
      ".yaml.sed",
      ".yml.mysql"
    ],
    "filenames": [
      ".clang-format",
      ".clang-tidy",
      ".gemrc",
      "CITATION.cff",
      "glide.lock",
      ".prettierrc",
      ".stylelintrc",
      ".lintstagedrc"
    ],
    "aceMode": "yaml",
    "codemirrorMode": "yaml",
    "codemirrorMimeType": "text/x-yaml",
    "parsers": [
      "yaml"
    ],
    "vscodeLanguageIds": [
      "yaml",
      "ansible",
      "home-assistant"
    ]
  }
];

// src/language-yaml/options.js
var options6 = {
  bracketSpacing: common_options_evaluate_default.bracketSpacing,
  singleQuote: common_options_evaluate_default.singleQuote,
  proseWrap: common_options_evaluate_default.proseWrap
};
var options_default6 = options6;

// src/plugins/builtin-plugins-proxy.js
function createParsersAndPrinters(modules) {
  const parsers2 = /* @__PURE__ */ Object.create(null);
  const printers2 = /* @__PURE__ */ Object.create(null);
  for (const {
    importPlugin: importPlugin2,
    parsers: parserNames = [],
    printers: printerNames = []
  } of modules) {
    const loadPlugin2 = async () => {
      const plugin = await importPlugin2();
      Object.assign(parsers2, plugin.parsers);
      Object.assign(printers2, plugin.printers);
      return plugin;
    };
    for (const parserName of parserNames) {
      parsers2[parserName] = async () => (await loadPlugin2()).parsers[parserName];
    }
    for (const printerName of printerNames) {
      printers2[printerName] = async () => (await loadPlugin2()).printers[printerName];
    }
  }
  return { parsers: parsers2, printers: printers2 };
}
var options7 = {
  ...options_default,
  ...options_default2,
  ...options_default3,
  ...options_default4,
  ...options_default5,
  ...options_default6
};
var languages = [
  ...languages_evaluate_default,
  ...languages_evaluate_default2,
  ...languages_evaluate_default3,
  ...languages_evaluate_default4,
  ...languages_evaluate_default5,
  ...languages_evaluate_default6,
  ...languages_evaluate_default7,
  ...languages_evaluate_default8
];
var { parsers, printers } = createParsersAndPrinters([
  {
    importPlugin: () => import("./plugins/acorn.mjs"),
    parsers: ["acorn", "espree"]
  },
  {
    importPlugin: () => import("./plugins/angular.mjs"),
    parsers: [
      "__ng_action",
      "__ng_binding",
      "__ng_interpolation",
      "__ng_directive"
    ]
  },
  {
    importPlugin: () => import("./plugins/babel.mjs"),
    parsers: [
      "babel",
      "babel-flow",
      "babel-ts",
      "__js_expression",
      "__ts_expression",
      "__vue_expression",
      "__vue_ts_expression",
      "__vue_event_binding",
      "__vue_ts_event_binding",
      "__babel_estree",
      "json",
      "json5",
      "jsonc",
      "json-stringify"
    ]
  },
  {
    importPlugin: () => import("./plugins/estree.mjs"),
    printers: ["estree", "estree-json"]
  },
  {
    importPlugin: () => import("./plugins/flow.mjs"),
    parsers: ["flow"]
  },
  {
    importPlugin: () => import("./plugins/glimmer.mjs"),
    parsers: ["glimmer"],
    printers: ["glimmer"]
  },
  {
    importPlugin: () => import("./plugins/graphql.mjs"),
    parsers: ["graphql"],
    printers: ["graphql"]
  },
  {
    importPlugin: () => import("./plugins/html.mjs"),
    parsers: ["html", "angular", "vue", "lwc"],
    printers: ["html"]
  },
  {
    importPlugin: () => import("./plugins/markdown.mjs"),
    parsers: ["markdown", "mdx", "remark"],
    printers: ["mdast"]
  },
  {
    importPlugin: () => import("./plugins/meriyah.mjs"),
    parsers: ["meriyah"]
  },
  {
    importPlugin: () => import("./plugins/postcss.mjs"),
    parsers: ["css", "less", "scss"],
    printers: ["postcss"]
  },
  {
    importPlugin: () => import("./plugins/typescript.mjs"),
    parsers: ["typescript"]
  },
  {
    importPlugin: () => import("./plugins/yaml.mjs"),
    parsers: ["yaml"],
    printers: ["yaml"]
  }
]);

// src/main/plugins/load-builtin-plugins.js
function loadBuiltinPlugins() {
  return [builtin_plugins_proxy_exports];
}
var load_builtin_plugins_default = loadBuiltinPlugins;

// src/main/plugins/load-plugin.js
import path12 from "path";
import { pathToFileURL as pathToFileURL5 } from "url";

// src/utils/import-from-directory.js
import path11 from "path";
function importFromDirectory(specifier, directory) {
  return import_from_file_default(specifier, path11.join(directory, "noop.js"));
}
var import_from_directory_default = importFromDirectory;

// src/main/plugins/load-plugin.js
async function importPlugin(name, cwd) {
  if (path12.isAbsolute(name)) {
    return import(pathToFileURL5(name).href);
  }
  try {
    return await import(pathToFileURL5(path12.resolve(name)).href);
  } catch {
    return import_from_directory_default(name, cwd);
  }
}
async function loadPluginWithoutCache(plugin, cwd) {
  const module = await importPlugin(plugin, cwd);
  return { name: plugin, ...module.default ?? module };
}
var cache2 = /* @__PURE__ */ new Map();
function loadPlugin(plugin) {
  if (typeof plugin !== "string") {
    return plugin;
  }
  const cwd = process.cwd();
  const cacheKey = JSON.stringify({ name: plugin, cwd });
  if (!cache2.has(cacheKey)) {
    cache2.set(cacheKey, loadPluginWithoutCache(plugin, cwd));
  }
  return cache2.get(cacheKey);
}
function clearCache2() {
  cache2.clear();
}

// src/main/plugins/load-plugins.js
function loadPlugins(plugins = []) {
  return Promise.all(plugins.map((plugin) => loadPlugin(plugin)));
}
var load_plugins_default = loadPlugins;

// src/utils/object-omit.js
function omit(object, keys) {
  keys = new Set(keys);
  return Object.fromEntries(
    Object.entries(object).filter(([key2]) => !keys.has(key2))
  );
}
var object_omit_default = omit;

// src/index.js
import * as doc from "./doc.mjs";

// src/main/version.evaluate.cjs
var version_evaluate_default = "3.3.3";

// src/utils/public.js
var public_exports = {};
__export(public_exports, {
  addDanglingComment: () => addDanglingComment,
  addLeadingComment: () => addLeadingComment,
  addTrailingComment: () => addTrailingComment,
  getAlignmentSize: () => get_alignment_size_default,
  getIndentSize: () => get_indent_size_default,
  getMaxContinuousCount: () => get_max_continuous_count_default,
  getNextNonSpaceNonCommentCharacter: () => get_next_non_space_non_comment_character_default,
  getNextNonSpaceNonCommentCharacterIndex: () => getNextNonSpaceNonCommentCharacterIndex2,
  getStringWidth: () => get_string_width_default,
  hasNewline: () => has_newline_default,
  hasNewlineInRange: () => has_newline_in_range_default,
  hasSpaces: () => has_spaces_default,
  isNextLineEmpty: () => isNextLineEmpty2,
  isNextLineEmptyAfterIndex: () => is_next_line_empty_default,
  isPreviousLineEmpty: () => isPreviousLineEmpty2,
  makeString: () => make_string_default,
  skip: () => skip,
  skipEverythingButNewLine: () => skipEverythingButNewLine,
  skipInlineComment: () => skip_inline_comment_default,
  skipNewline: () => skip_newline_default,
  skipSpaces: () => skipSpaces,
  skipToLineEnd: () => skipToLineEnd,
  skipTrailingComment: () => skip_trailing_comment_default,
  skipWhitespace: () => skipWhitespace
});

// src/utils/skip-inline-comment.js
function skipInlineComment(text, startIndex) {
  if (startIndex === false) {
    return false;
  }
  if (text.charAt(startIndex) === "/" && text.charAt(startIndex + 1) === "*") {
    for (let i = startIndex + 2; i < text.length; ++i) {
      if (text.charAt(i) === "*" && text.charAt(i + 1) === "/") {
        return i + 2;
      }
    }
  }
  return startIndex;
}
var skip_inline_comment_default = skipInlineComment;

// src/utils/skip-trailing-comment.js
function skipTrailingComment(text, startIndex) {
  if (startIndex === false) {
    return false;
  }
  if (text.charAt(startIndex) === "/" && text.charAt(startIndex + 1) === "/") {
    return skipEverythingButNewLine(text, startIndex);
  }
  return startIndex;
}
var skip_trailing_comment_default = skipTrailingComment;

// src/utils/get-next-non-space-non-comment-character-index.js
function getNextNonSpaceNonCommentCharacterIndex(text, startIndex) {
  let oldIdx = null;
  let nextIdx = startIndex;
  while (nextIdx !== oldIdx) {
    oldIdx = nextIdx;
    nextIdx = skipSpaces(text, nextIdx);
    nextIdx = skip_inline_comment_default(text, nextIdx);
    nextIdx = skip_trailing_comment_default(text, nextIdx);
    nextIdx = skip_newline_default(text, nextIdx);
  }
  return nextIdx;
}
var get_next_non_space_non_comment_character_index_default = getNextNonSpaceNonCommentCharacterIndex;

// src/utils/is-next-line-empty.js
function isNextLineEmpty(text, startIndex) {
  let oldIdx = null;
  let idx = startIndex;
  while (idx !== oldIdx) {
    oldIdx = idx;
    idx = skipToLineEnd(text, idx);
    idx = skip_inline_comment_default(text, idx);
    idx = skipSpaces(text, idx);
  }
  idx = skip_trailing_comment_default(text, idx);
  idx = skip_newline_default(text, idx);
  return idx !== false && has_newline_default(text, idx);
}
var is_next_line_empty_default = isNextLineEmpty;

// src/utils/get-indent-size.js
function getIndentSize(value, tabWidth) {
  const lastNewlineIndex = value.lastIndexOf("\n");
  if (lastNewlineIndex === -1) {
    return 0;
  }
  return get_alignment_size_default(
    // All the leading whitespaces
    value.slice(lastNewlineIndex + 1).match(/^[\t ]*/u)[0],
    tabWidth
  );
}
var get_indent_size_default = getIndentSize;

// node_modules/escape-string-regexp/index.js
function escapeStringRegexp(string) {
  if (typeof string !== "string") {
    throw new TypeError("Expected a string");
  }
  return string.replace(/[|\\{}()[\]^$+*?.]/g, "\\$&").replace(/-/g, "\\x2d");
}

// src/utils/get-max-continuous-count.js
function getMaxContinuousCount(text, searchString) {
  const results = text.match(
    new RegExp(`(${escapeStringRegexp(searchString)})+`, "gu")
  );
  if (results === null) {
    return 0;
  }
  return results.reduce(
    (maxCount, result) => Math.max(maxCount, result.length / searchString.length),
    0
  );
}
var get_max_continuous_count_default = getMaxContinuousCount;

// src/utils/get-next-non-space-non-comment-character.js
function getNextNonSpaceNonCommentCharacter(text, startIndex) {
  const index = get_next_non_space_non_comment_character_index_default(text, startIndex);
  return index === false ? "" : text.charAt(index);
}
var get_next_non_space_non_comment_character_default = getNextNonSpaceNonCommentCharacter;

// src/utils/has-newline-in-range.js
function hasNewlineInRange(text, startIndex, endIndex) {
  for (let i = startIndex; i < endIndex; ++i) {
    if (text.charAt(i) === "\n") {
      return true;
    }
  }
  return false;
}
var has_newline_in_range_default = hasNewlineInRange;

// src/utils/has-spaces.js
function hasSpaces(text, startIndex, options8 = {}) {
  const idx = skipSpaces(
    text,
    options8.backwards ? startIndex - 1 : startIndex,
    options8
  );
  return idx !== startIndex;
}
var has_spaces_default = hasSpaces;

// src/utils/make-string.js
function makeString(rawText, enclosingQuote, unescapeUnnecessaryEscapes) {
  const otherQuote = enclosingQuote === '"' ? "'" : '"';
  const regex = /\\(.)|(["'])/gsu;
  const raw = string_replace_all_default(
    /* isOptionalObject */
    false,
    rawText,
    regex,
    (match, escaped, quote) => {
      if (escaped === otherQuote) {
        return escaped;
      }
      if (quote === enclosingQuote) {
        return "\\" + quote;
      }
      if (quote) {
        return quote;
      }
      return unescapeUnnecessaryEscapes && /^[^\n\r"'0-7\\bfnrt-vx\u2028\u2029]$/u.test(escaped) ? escaped : "\\" + escaped;
    }
  );
  return enclosingQuote + raw + enclosingQuote;
}
var make_string_default = makeString;

// src/utils/public.js
function legacyGetNextNonSpaceNonCommentCharacterIndex(text, node, locEnd) {
  return get_next_non_space_non_comment_character_index_default(
    text,
    locEnd(node)
  );
}
function getNextNonSpaceNonCommentCharacterIndex2(text, startIndex) {
  return arguments.length === 2 || typeof startIndex === "number" ? get_next_non_space_non_comment_character_index_default(text, startIndex) : (
    // @ts-expect-error -- expected
    // eslint-disable-next-line prefer-rest-params
    legacyGetNextNonSpaceNonCommentCharacterIndex(...arguments)
  );
}
function legacyIsPreviousLineEmpty(text, node, locStart) {
  return is_previous_line_empty_default(text, locStart(node));
}
function isPreviousLineEmpty2(text, startIndex) {
  return arguments.length === 2 || typeof startIndex === "number" ? is_previous_line_empty_default(text, startIndex) : (
    // @ts-expect-error -- expected
    // eslint-disable-next-line prefer-rest-params
    legacyIsPreviousLineEmpty(...arguments)
  );
}
function legacyIsNextLineEmpty(text, node, locEnd) {
  return is_next_line_empty_default(text, locEnd(node));
}
function isNextLineEmpty2(text, startIndex) {
  return arguments.length === 2 || typeof startIndex === "number" ? is_next_line_empty_default(text, startIndex) : (
    // @ts-expect-error -- expected
    // eslint-disable-next-line prefer-rest-params
    legacyIsNextLineEmpty(...arguments)
  );
}

// src/index.js
function withPlugins(fn, optionsArgumentIndex = 1) {
  return async (...args) => {
    const options8 = args[optionsArgumentIndex] ?? {};
    const { plugins = [] } = options8;
    args[optionsArgumentIndex] = {
      ...options8,
      plugins: (await Promise.all([
        load_builtin_plugins_default(),
        // TODO: standalone version allow `plugins` to be `prettierPlugins` which is an object, should allow that too
        load_plugins_default(plugins)
      ])).flat()
    };
    return fn(...args);
  };
}
var formatWithCursor2 = withPlugins(formatWithCursor);
async function format2(text, options8) {
  const { formatted } = await formatWithCursor2(text, {
    ...options8,
    cursorOffset: -1
  });
  return formatted;
}
async function check(text, options8) {
  return await format2(text, options8) === text;
}
async function clearCache3() {
  clearCache();
  clearCache2();
}
var getFileInfo2 = withPlugins(get_file_info_default);
var getSupportInfo2 = withPlugins(getSupportInfo, 0);
var sharedWithCli = {
  errors: errors_exports,
  optionCategories: option_categories_exports,
  createIsIgnoredFunction,
  formatOptionsHiddenDefaults,
  normalizeOptions: normalize_options_default,
  getSupportInfoWithoutPlugins: getSupportInfo,
  normalizeOptionSettings,
  vnopts: {
    ChoiceSchema,
    apiDescriptor
  },
  fastGlob: import_fast_glob.default,
  createTwoFilesPatch,
  utils: {
    isNonEmptyArray: is_non_empty_array_default,
    partition: partition_default,
    omit: object_omit_default
  },
  mockable: mockable_default
};
var debugApis = {
  parse: withPlugins(parse5),
  formatAST: withPlugins(formatAst),
  formatDoc: withPlugins(formatDoc),
  printToDoc: withPlugins(printToDoc),
  printDocToString: withPlugins(printDocToString2),
  mockable: mockable_default
};

// with-default-export:src/index.js
var src_default = src_exports;
export {
  debugApis as __debug,
  sharedWithCli as __internal,
  check,
  clearCache3 as clearConfigCache,
  src_default as default,
  doc,
  format2 as format,
  formatWithCursor2 as formatWithCursor,
  getFileInfo2 as getFileInfo,
  getSupportInfo2 as getSupportInfo,
  resolveConfig,
  resolveConfigFile,
  public_exports as util,
  version_evaluate_default as version
};

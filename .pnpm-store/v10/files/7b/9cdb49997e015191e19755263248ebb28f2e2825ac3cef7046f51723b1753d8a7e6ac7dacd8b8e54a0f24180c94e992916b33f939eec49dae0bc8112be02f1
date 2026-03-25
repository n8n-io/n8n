import CJS_COMPAT_NODE_URL_at6j9ae2j2t from 'node:url';
import CJS_COMPAT_NODE_PATH_at6j9ae2j2t from 'node:path';
import CJS_COMPAT_NODE_MODULE_at6j9ae2j2t from "node:module";

var __filename = CJS_COMPAT_NODE_URL_at6j9ae2j2t.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_at6j9ae2j2t.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_at6j9ae2j2t.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import {
  require_picomatch,
  require_utils
} from "./chunk-HH2SN3H2.js";
import {
  slash
} from "./chunk-PF7HEE6F.js";
import {
  __commonJS,
  __require,
  __toESM
} from "./chunk-DRM3MJ7Y.js";

// ../node_modules/fast-glob/out/utils/array.js
var require_array = __commonJS({
  "../node_modules/fast-glob/out/utils/array.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.splitWhen = exports.flatten = void 0;
    function flatten(items) {
      return items.reduce((collection, item) => [].concat(collection, item), []);
    }
    exports.flatten = flatten;
    function splitWhen(items, predicate) {
      let result = [[]], groupIndex = 0;
      for (let item of items)
        predicate(item) ? (groupIndex++, result[groupIndex] = []) : result[groupIndex].push(item);
      return result;
    }
    exports.splitWhen = splitWhen;
  }
});

// ../node_modules/fast-glob/out/utils/errno.js
var require_errno = __commonJS({
  "../node_modules/fast-glob/out/utils/errno.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.isEnoentCodeError = void 0;
    function isEnoentCodeError(error) {
      return error.code === "ENOENT";
    }
    exports.isEnoentCodeError = isEnoentCodeError;
  }
});

// ../node_modules/fast-glob/out/utils/fs.js
var require_fs = __commonJS({
  "../node_modules/fast-glob/out/utils/fs.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.createDirentFromStats = void 0;
    var DirentFromStats = class {
      constructor(name, stats) {
        this.name = name, this.isBlockDevice = stats.isBlockDevice.bind(stats), this.isCharacterDevice = stats.isCharacterDevice.bind(stats), this.isDirectory = stats.isDirectory.bind(stats), this.isFIFO = stats.isFIFO.bind(stats), this.isFile = stats.isFile.bind(stats), this.isSocket = stats.isSocket.bind(stats), this.isSymbolicLink = stats.isSymbolicLink.bind(stats);
      }
    };
    function createDirentFromStats(name, stats) {
      return new DirentFromStats(name, stats);
    }
    exports.createDirentFromStats = createDirentFromStats;
  }
});

// ../node_modules/fast-glob/out/utils/path.js
var require_path = __commonJS({
  "../node_modules/fast-glob/out/utils/path.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.convertPosixPathToPattern = exports.convertWindowsPathToPattern = exports.convertPathToPattern = exports.escapePosixPath = exports.escapeWindowsPath = exports.escape = exports.removeLeadingDotSegment = exports.makeAbsolute = exports.unixify = void 0;
    var os = __require("os"), path2 = __require("path"), IS_WINDOWS_PLATFORM = os.platform() === "win32", LEADING_DOT_SEGMENT_CHARACTERS_COUNT = 2, POSIX_UNESCAPED_GLOB_SYMBOLS_RE = /(\\?)([()*?[\]{|}]|^!|[!+@](?=\()|\\(?![!()*+?@[\]{|}]))/g, WINDOWS_UNESCAPED_GLOB_SYMBOLS_RE = /(\\?)([()[\]{}]|^!|[!+@](?=\())/g, DOS_DEVICE_PATH_RE = /^\\\\([.?])/, WINDOWS_BACKSLASHES_RE = /\\(?![!()+@[\]{}])/g;
    function unixify(filepath) {
      return filepath.replace(/\\/g, "/");
    }
    exports.unixify = unixify;
    function makeAbsolute(cwd, filepath) {
      return path2.resolve(cwd, filepath);
    }
    exports.makeAbsolute = makeAbsolute;
    function removeLeadingDotSegment(entry) {
      if (entry.charAt(0) === ".") {
        let secondCharactery = entry.charAt(1);
        if (secondCharactery === "/" || secondCharactery === "\\")
          return entry.slice(LEADING_DOT_SEGMENT_CHARACTERS_COUNT);
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

// ../node_modules/is-extglob/index.js
var require_is_extglob = __commonJS({
  "../node_modules/is-extglob/index.js"(exports, module) {
    module.exports = function(str) {
      if (typeof str != "string" || str === "")
        return !1;
      for (var match; match = /(\\).|([@?!+*]\(.*\))/g.exec(str); ) {
        if (match[2]) return !0;
        str = str.slice(match.index + match[0].length);
      }
      return !1;
    };
  }
});

// ../node_modules/is-glob/index.js
var require_is_glob = __commonJS({
  "../node_modules/is-glob/index.js"(exports, module) {
    var isExtglob = require_is_extglob(), chars = { "{": "}", "(": ")", "[": "]" }, strictCheck = function(str) {
      if (str[0] === "!")
        return !0;
      for (var index = 0, pipeIndex = -2, closeSquareIndex = -2, closeCurlyIndex = -2, closeParenIndex = -2, backSlashIndex = -2; index < str.length; ) {
        if (str[index] === "*" || str[index + 1] === "?" && /[\].+)]/.test(str[index]) || closeSquareIndex !== -1 && str[index] === "[" && str[index + 1] !== "]" && (closeSquareIndex < index && (closeSquareIndex = str.indexOf("]", index)), closeSquareIndex > index && (backSlashIndex === -1 || backSlashIndex > closeSquareIndex || (backSlashIndex = str.indexOf("\\", index), backSlashIndex === -1 || backSlashIndex > closeSquareIndex))) || closeCurlyIndex !== -1 && str[index] === "{" && str[index + 1] !== "}" && (closeCurlyIndex = str.indexOf("}", index), closeCurlyIndex > index && (backSlashIndex = str.indexOf("\\", index), backSlashIndex === -1 || backSlashIndex > closeCurlyIndex)) || closeParenIndex !== -1 && str[index] === "(" && str[index + 1] === "?" && /[:!=]/.test(str[index + 2]) && str[index + 3] !== ")" && (closeParenIndex = str.indexOf(")", index), closeParenIndex > index && (backSlashIndex = str.indexOf("\\", index), backSlashIndex === -1 || backSlashIndex > closeParenIndex)) || pipeIndex !== -1 && str[index] === "(" && str[index + 1] !== "|" && (pipeIndex < index && (pipeIndex = str.indexOf("|", index)), pipeIndex !== -1 && str[pipeIndex + 1] !== ")" && (closeParenIndex = str.indexOf(")", pipeIndex), closeParenIndex > pipeIndex && (backSlashIndex = str.indexOf("\\", pipeIndex), backSlashIndex === -1 || backSlashIndex > closeParenIndex))))
          return !0;
        if (str[index] === "\\") {
          var open = str[index + 1];
          index += 2;
          var close = chars[open];
          if (close) {
            var n = str.indexOf(close, index);
            n !== -1 && (index = n + 1);
          }
          if (str[index] === "!")
            return !0;
        } else
          index++;
      }
      return !1;
    }, relaxedCheck = function(str) {
      if (str[0] === "!")
        return !0;
      for (var index = 0; index < str.length; ) {
        if (/[*?{}()[\]]/.test(str[index]))
          return !0;
        if (str[index] === "\\") {
          var open = str[index + 1];
          index += 2;
          var close = chars[open];
          if (close) {
            var n = str.indexOf(close, index);
            n !== -1 && (index = n + 1);
          }
          if (str[index] === "!")
            return !0;
        } else
          index++;
      }
      return !1;
    };
    module.exports = function(str, options) {
      if (typeof str != "string" || str === "")
        return !1;
      if (isExtglob(str))
        return !0;
      var check = strictCheck;
      return options && options.strict === !1 && (check = relaxedCheck), check(str);
    };
  }
});

// ../node_modules/fast-glob/node_modules/glob-parent/index.js
var require_glob_parent = __commonJS({
  "../node_modules/fast-glob/node_modules/glob-parent/index.js"(exports, module) {
    "use strict";
    var isGlob = require_is_glob(), pathPosixDirname = __require("path").posix.dirname, isWin32 = __require("os").platform() === "win32", slash2 = "/", backslash = /\\/g, enclosure = /[\{\[].*[\}\]]$/, globby2 = /(^|[^\\])([\{\[]|\([^\)]+$)/, escaped = /\\([\!\*\?\|\[\]\(\)\{\}])/g;
    module.exports = function(str, opts) {
      var options = Object.assign({ flipBackslashes: !0 }, opts);
      options.flipBackslashes && isWin32 && str.indexOf(slash2) < 0 && (str = str.replace(backslash, slash2)), enclosure.test(str) && (str += slash2), str += "a";
      do
        str = pathPosixDirname(str);
      while (isGlob(str) || globby2.test(str));
      return str.replace(escaped, "$1");
    };
  }
});

// ../node_modules/braces/lib/utils.js
var require_utils2 = __commonJS({
  "../node_modules/braces/lib/utils.js"(exports) {
    "use strict";
    exports.isInteger = (num) => typeof num == "number" ? Number.isInteger(num) : typeof num == "string" && num.trim() !== "" ? Number.isInteger(Number(num)) : !1;
    exports.find = (node, type) => node.nodes.find((node2) => node2.type === type);
    exports.exceedsLimit = (min, max, step = 1, limit) => limit === !1 || !exports.isInteger(min) || !exports.isInteger(max) ? !1 : (Number(max) - Number(min)) / Number(step) >= limit;
    exports.escapeNode = (block, n = 0, type) => {
      let node = block.nodes[n];
      node && (type && node.type === type || node.type === "open" || node.type === "close") && node.escaped !== !0 && (node.value = "\\" + node.value, node.escaped = !0);
    };
    exports.encloseBrace = (node) => node.type !== "brace" ? !1 : node.commas >> 0 + node.ranges >> 0 === 0 ? (node.invalid = !0, !0) : !1;
    exports.isInvalidBrace = (block) => block.type !== "brace" ? !1 : block.invalid === !0 || block.dollar ? !0 : block.commas >> 0 + block.ranges >> 0 === 0 || block.open !== !0 || block.close !== !0 ? (block.invalid = !0, !0) : !1;
    exports.isOpenOrClose = (node) => node.type === "open" || node.type === "close" ? !0 : node.open === !0 || node.close === !0;
    exports.reduce = (nodes) => nodes.reduce((acc, node) => (node.type === "text" && acc.push(node.value), node.type === "range" && (node.type = "text"), acc), []);
    exports.flatten = (...args) => {
      let result = [], flat = (arr) => {
        for (let i = 0; i < arr.length; i++) {
          let ele = arr[i];
          if (Array.isArray(ele)) {
            flat(ele);
            continue;
          }
          ele !== void 0 && result.push(ele);
        }
        return result;
      };
      return flat(args), result;
    };
  }
});

// ../node_modules/braces/lib/stringify.js
var require_stringify = __commonJS({
  "../node_modules/braces/lib/stringify.js"(exports, module) {
    "use strict";
    var utils = require_utils2();
    module.exports = (ast, options = {}) => {
      let stringify = (node, parent = {}) => {
        let invalidBlock = options.escapeInvalid && utils.isInvalidBrace(parent), invalidNode = node.invalid === !0 && options.escapeInvalid === !0, output = "";
        if (node.value)
          return (invalidBlock || invalidNode) && utils.isOpenOrClose(node) ? "\\" + node.value : node.value;
        if (node.value)
          return node.value;
        if (node.nodes)
          for (let child of node.nodes)
            output += stringify(child);
        return output;
      };
      return stringify(ast);
    };
  }
});

// ../node_modules/is-number/index.js
var require_is_number = __commonJS({
  "../node_modules/is-number/index.js"(exports, module) {
    "use strict";
    module.exports = function(num) {
      return typeof num == "number" ? num - num === 0 : typeof num == "string" && num.trim() !== "" ? Number.isFinite ? Number.isFinite(+num) : isFinite(+num) : !1;
    };
  }
});

// ../node_modules/to-regex-range/index.js
var require_to_regex_range = __commonJS({
  "../node_modules/to-regex-range/index.js"(exports, module) {
    "use strict";
    var isNumber = require_is_number(), toRegexRange = (min, max, options) => {
      if (isNumber(min) === !1)
        throw new TypeError("toRegexRange: expected the first argument to be a number");
      if (max === void 0 || min === max)
        return String(min);
      if (isNumber(max) === !1)
        throw new TypeError("toRegexRange: expected the second argument to be a number.");
      let opts = { relaxZeros: !0, ...options };
      typeof opts.strictZeros == "boolean" && (opts.relaxZeros = opts.strictZeros === !1);
      let relax = String(opts.relaxZeros), shorthand = String(opts.shorthand), capture = String(opts.capture), wrap = String(opts.wrap), cacheKey = min + ":" + max + "=" + relax + shorthand + capture + wrap;
      if (toRegexRange.cache.hasOwnProperty(cacheKey))
        return toRegexRange.cache[cacheKey].result;
      let a = Math.min(min, max), b = Math.max(min, max);
      if (Math.abs(a - b) === 1) {
        let result = min + "|" + max;
        return opts.capture ? `(${result})` : opts.wrap === !1 ? result : `(?:${result})`;
      }
      let isPadded = hasPadding(min) || hasPadding(max), state = { min, max, a, b }, positives = [], negatives = [];
      if (isPadded && (state.isPadded = isPadded, state.maxLen = String(state.max).length), a < 0) {
        let newMin = b < 0 ? Math.abs(b) : 1;
        negatives = splitToPatterns(newMin, Math.abs(a), state, opts), a = state.a = 0;
      }
      return b >= 0 && (positives = splitToPatterns(a, b, state, opts)), state.negatives = negatives, state.positives = positives, state.result = collatePatterns(negatives, positives, opts), opts.capture === !0 ? state.result = `(${state.result})` : opts.wrap !== !1 && positives.length + negatives.length > 1 && (state.result = `(?:${state.result})`), toRegexRange.cache[cacheKey] = state, state.result;
    };
    function collatePatterns(neg, pos, options) {
      let onlyNegative = filterPatterns(neg, pos, "-", !1, options) || [], onlyPositive = filterPatterns(pos, neg, "", !1, options) || [], intersected = filterPatterns(neg, pos, "-?", !0, options) || [];
      return onlyNegative.concat(intersected).concat(onlyPositive).join("|");
    }
    function splitToRanges(min, max) {
      let nines = 1, zeros = 1, stop = countNines(min, nines), stops = /* @__PURE__ */ new Set([max]);
      for (; min <= stop && stop <= max; )
        stops.add(stop), nines += 1, stop = countNines(min, nines);
      for (stop = countZeros(max + 1, zeros) - 1; min < stop && stop <= max; )
        stops.add(stop), zeros += 1, stop = countZeros(max + 1, zeros) - 1;
      return stops = [...stops], stops.sort(compare), stops;
    }
    function rangeToPattern(start, stop, options) {
      if (start === stop)
        return { pattern: start, count: [], digits: 0 };
      let zipped = zip(start, stop), digits = zipped.length, pattern = "", count = 0;
      for (let i = 0; i < digits; i++) {
        let [startDigit, stopDigit] = zipped[i];
        startDigit === stopDigit ? pattern += startDigit : startDigit !== "0" || stopDigit !== "9" ? pattern += toCharacterClass(startDigit, stopDigit, options) : count++;
      }
      return count && (pattern += options.shorthand === !0 ? "\\d" : "[0-9]"), { pattern, count: [count], digits };
    }
    function splitToPatterns(min, max, tok, options) {
      let ranges = splitToRanges(min, max), tokens = [], start = min, prev;
      for (let i = 0; i < ranges.length; i++) {
        let max2 = ranges[i], obj = rangeToPattern(String(start), String(max2), options), zeros = "";
        if (!tok.isPadded && prev && prev.pattern === obj.pattern) {
          prev.count.length > 1 && prev.count.pop(), prev.count.push(obj.count[0]), prev.string = prev.pattern + toQuantifier(prev.count), start = max2 + 1;
          continue;
        }
        tok.isPadded && (zeros = padZeros(max2, tok, options)), obj.string = zeros + obj.pattern + toQuantifier(obj.count), tokens.push(obj), start = max2 + 1, prev = obj;
      }
      return tokens;
    }
    function filterPatterns(arr, comparison, prefix, intersection, options) {
      let result = [];
      for (let ele of arr) {
        let { string } = ele;
        !intersection && !contains(comparison, "string", string) && result.push(prefix + string), intersection && contains(comparison, "string", string) && result.push(prefix + string);
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
    function contains(arr, key, val) {
      return arr.some((ele) => ele[key] === val);
    }
    function countNines(min, len) {
      return Number(String(min).slice(0, -len) + "9".repeat(len));
    }
    function countZeros(integer, zeros) {
      return integer - integer % Math.pow(10, zeros);
    }
    function toQuantifier(digits) {
      let [start = 0, stop = ""] = digits;
      return stop || start > 1 ? `{${start + (stop ? "," + stop : "")}}` : "";
    }
    function toCharacterClass(a, b, options) {
      return `[${a}${b - a === 1 ? "" : "-"}${b}]`;
    }
    function hasPadding(str) {
      return /^-?(0+)\d/.test(str);
    }
    function padZeros(value, tok, options) {
      if (!tok.isPadded)
        return value;
      let diff = Math.abs(tok.maxLen - String(value).length), relax = options.relaxZeros !== !1;
      switch (diff) {
        case 0:
          return "";
        case 1:
          return relax ? "0?" : "0";
        case 2:
          return relax ? "0{0,2}" : "00";
        default:
          return relax ? `0{0,${diff}}` : `0{${diff}}`;
      }
    }
    toRegexRange.cache = {};
    toRegexRange.clearCache = () => toRegexRange.cache = {};
    module.exports = toRegexRange;
  }
});

// ../node_modules/fill-range/index.js
var require_fill_range = __commonJS({
  "../node_modules/fill-range/index.js"(exports, module) {
    "use strict";
    var util = __require("util"), toRegexRange = require_to_regex_range(), isObject = (val) => val !== null && typeof val == "object" && !Array.isArray(val), transform = (toNumber) => (value) => toNumber === !0 ? Number(value) : String(value), isValidValue = (value) => typeof value == "number" || typeof value == "string" && value !== "", isNumber = (num) => Number.isInteger(+num), zeros = (input) => {
      let value = `${input}`, index = -1;
      if (value[0] === "-" && (value = value.slice(1)), value === "0") return !1;
      for (; value[++index] === "0"; ) ;
      return index > 0;
    }, stringify = (start, end, options) => typeof start == "string" || typeof end == "string" ? !0 : options.stringify === !0, pad = (input, maxLength, toNumber) => {
      if (maxLength > 0) {
        let dash = input[0] === "-" ? "-" : "";
        dash && (input = input.slice(1)), input = dash + input.padStart(dash ? maxLength - 1 : maxLength, "0");
      }
      return toNumber === !1 ? String(input) : input;
    }, toMaxLen = (input, maxLength) => {
      let negative = input[0] === "-" ? "-" : "";
      for (negative && (input = input.slice(1), maxLength--); input.length < maxLength; ) input = "0" + input;
      return negative ? "-" + input : input;
    }, toSequence = (parts, options, maxLen) => {
      parts.negatives.sort((a, b) => a < b ? -1 : a > b ? 1 : 0), parts.positives.sort((a, b) => a < b ? -1 : a > b ? 1 : 0);
      let prefix = options.capture ? "" : "?:", positives = "", negatives = "", result;
      return parts.positives.length && (positives = parts.positives.map((v) => toMaxLen(String(v), maxLen)).join("|")), parts.negatives.length && (negatives = `-(${prefix}${parts.negatives.map((v) => toMaxLen(String(v), maxLen)).join("|")})`), positives && negatives ? result = `${positives}|${negatives}` : result = positives || negatives, options.wrap ? `(${prefix}${result})` : result;
    }, toRange = (a, b, isNumbers, options) => {
      if (isNumbers)
        return toRegexRange(a, b, { wrap: !1, ...options });
      let start = String.fromCharCode(a);
      if (a === b) return start;
      let stop = String.fromCharCode(b);
      return `[${start}-${stop}]`;
    }, toRegex = (start, end, options) => {
      if (Array.isArray(start)) {
        let wrap = options.wrap === !0, prefix = options.capture ? "" : "?:";
        return wrap ? `(${prefix}${start.join("|")})` : start.join("|");
      }
      return toRegexRange(start, end, options);
    }, rangeError = (...args) => new RangeError("Invalid range arguments: " + util.inspect(...args)), invalidRange = (start, end, options) => {
      if (options.strictRanges === !0) throw rangeError([start, end]);
      return [];
    }, invalidStep = (step, options) => {
      if (options.strictRanges === !0)
        throw new TypeError(`Expected step "${step}" to be a number`);
      return [];
    }, fillNumbers = (start, end, step = 1, options = {}) => {
      let a = Number(start), b = Number(end);
      if (!Number.isInteger(a) || !Number.isInteger(b)) {
        if (options.strictRanges === !0) throw rangeError([start, end]);
        return [];
      }
      a === 0 && (a = 0), b === 0 && (b = 0);
      let descending = a > b, startString = String(start), endString = String(end), stepString = String(step);
      step = Math.max(Math.abs(step), 1);
      let padded = zeros(startString) || zeros(endString) || zeros(stepString), maxLen = padded ? Math.max(startString.length, endString.length, stepString.length) : 0, toNumber = padded === !1 && stringify(start, end, options) === !1, format = options.transform || transform(toNumber);
      if (options.toRegex && step === 1)
        return toRange(toMaxLen(start, maxLen), toMaxLen(end, maxLen), !0, options);
      let parts = { negatives: [], positives: [] }, push = (num) => parts[num < 0 ? "negatives" : "positives"].push(Math.abs(num)), range = [], index = 0;
      for (; descending ? a >= b : a <= b; )
        options.toRegex === !0 && step > 1 ? push(a) : range.push(pad(format(a, index), maxLen, toNumber)), a = descending ? a - step : a + step, index++;
      return options.toRegex === !0 ? step > 1 ? toSequence(parts, options, maxLen) : toRegex(range, null, { wrap: !1, ...options }) : range;
    }, fillLetters = (start, end, step = 1, options = {}) => {
      if (!isNumber(start) && start.length > 1 || !isNumber(end) && end.length > 1)
        return invalidRange(start, end, options);
      let format = options.transform || ((val) => String.fromCharCode(val)), a = `${start}`.charCodeAt(0), b = `${end}`.charCodeAt(0), descending = a > b, min = Math.min(a, b), max = Math.max(a, b);
      if (options.toRegex && step === 1)
        return toRange(min, max, !1, options);
      let range = [], index = 0;
      for (; descending ? a >= b : a <= b; )
        range.push(format(a, index)), a = descending ? a - step : a + step, index++;
      return options.toRegex === !0 ? toRegex(range, null, { wrap: !1, options }) : range;
    }, fill = (start, end, step, options = {}) => {
      if (end == null && isValidValue(start))
        return [start];
      if (!isValidValue(start) || !isValidValue(end))
        return invalidRange(start, end, options);
      if (typeof step == "function")
        return fill(start, end, 1, { transform: step });
      if (isObject(step))
        return fill(start, end, 0, step);
      let opts = { ...options };
      return opts.capture === !0 && (opts.wrap = !0), step = step || opts.step || 1, isNumber(step) ? isNumber(start) && isNumber(end) ? fillNumbers(start, end, step, opts) : fillLetters(start, end, Math.max(Math.abs(step), 1), opts) : step != null && !isObject(step) ? invalidStep(step, opts) : fill(start, end, 1, step);
    };
    module.exports = fill;
  }
});

// ../node_modules/braces/lib/compile.js
var require_compile = __commonJS({
  "../node_modules/braces/lib/compile.js"(exports, module) {
    "use strict";
    var fill = require_fill_range(), utils = require_utils2(), compile = (ast, options = {}) => {
      let walk = (node, parent = {}) => {
        let invalidBlock = utils.isInvalidBrace(parent), invalidNode = node.invalid === !0 && options.escapeInvalid === !0, invalid = invalidBlock === !0 || invalidNode === !0, prefix = options.escapeInvalid === !0 ? "\\" : "", output = "";
        if (node.isOpen === !0)
          return prefix + node.value;
        if (node.isClose === !0)
          return console.log("node.isClose", prefix, node.value), prefix + node.value;
        if (node.type === "open")
          return invalid ? prefix + node.value : "(";
        if (node.type === "close")
          return invalid ? prefix + node.value : ")";
        if (node.type === "comma")
          return node.prev.type === "comma" ? "" : invalid ? node.value : "|";
        if (node.value)
          return node.value;
        if (node.nodes && node.ranges > 0) {
          let args = utils.reduce(node.nodes), range = fill(...args, { ...options, wrap: !1, toRegex: !0, strictZeros: !0 });
          if (range.length !== 0)
            return args.length > 1 && range.length > 1 ? `(${range})` : range;
        }
        if (node.nodes)
          for (let child of node.nodes)
            output += walk(child, node);
        return output;
      };
      return walk(ast);
    };
    module.exports = compile;
  }
});

// ../node_modules/braces/lib/expand.js
var require_expand = __commonJS({
  "../node_modules/braces/lib/expand.js"(exports, module) {
    "use strict";
    var fill = require_fill_range(), stringify = require_stringify(), utils = require_utils2(), append = (queue = "", stash = "", enclose = !1) => {
      let result = [];
      if (queue = [].concat(queue), stash = [].concat(stash), !stash.length) return queue;
      if (!queue.length)
        return enclose ? utils.flatten(stash).map((ele) => `{${ele}}`) : stash;
      for (let item of queue)
        if (Array.isArray(item))
          for (let value of item)
            result.push(append(value, stash, enclose));
        else
          for (let ele of stash)
            enclose === !0 && typeof ele == "string" && (ele = `{${ele}}`), result.push(Array.isArray(ele) ? append(item, ele, enclose) : item + ele);
      return utils.flatten(result);
    }, expand = (ast, options = {}) => {
      let rangeLimit = options.rangeLimit === void 0 ? 1e3 : options.rangeLimit, walk = (node, parent = {}) => {
        node.queue = [];
        let p = parent, q = parent.queue;
        for (; p.type !== "brace" && p.type !== "root" && p.parent; )
          p = p.parent, q = p.queue;
        if (node.invalid || node.dollar) {
          q.push(append(q.pop(), stringify(node, options)));
          return;
        }
        if (node.type === "brace" && node.invalid !== !0 && node.nodes.length === 2) {
          q.push(append(q.pop(), ["{}"]));
          return;
        }
        if (node.nodes && node.ranges > 0) {
          let args = utils.reduce(node.nodes);
          if (utils.exceedsLimit(...args, options.step, rangeLimit))
            throw new RangeError("expanded array length exceeds range limit. Use options.rangeLimit to increase or disable the limit.");
          let range = fill(...args, options);
          range.length === 0 && (range = stringify(node, options)), q.push(append(q.pop(), range)), node.nodes = [];
          return;
        }
        let enclose = utils.encloseBrace(node), queue = node.queue, block = node;
        for (; block.type !== "brace" && block.type !== "root" && block.parent; )
          block = block.parent, queue = block.queue;
        for (let i = 0; i < node.nodes.length; i++) {
          let child = node.nodes[i];
          if (child.type === "comma" && node.type === "brace") {
            i === 1 && queue.push(""), queue.push("");
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
          child.nodes && walk(child, node);
        }
        return queue;
      };
      return utils.flatten(walk(ast));
    };
    module.exports = expand;
  }
});

// ../node_modules/braces/lib/constants.js
var require_constants = __commonJS({
  "../node_modules/braces/lib/constants.js"(exports, module) {
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
      CHAR_LINE_FEED: `
`,
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

// ../node_modules/braces/lib/parse.js
var require_parse = __commonJS({
  "../node_modules/braces/lib/parse.js"(exports, module) {
    "use strict";
    var stringify = require_stringify(), {
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
    } = require_constants(), parse = (input, options = {}) => {
      if (typeof input != "string")
        throw new TypeError("Expected a string");
      let opts = options || {}, max = typeof opts.maxLength == "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH;
      if (input.length > max)
        throw new SyntaxError(`Input length (${input.length}), exceeds max characters (${max})`);
      let ast = { type: "root", input, nodes: [] }, stack = [ast], block = ast, prev = ast, brackets = 0, length = input.length, index = 0, depth = 0, value, advance = () => input[index++], push = (node) => {
        if (node.type === "text" && prev.type === "dot" && (prev.type = "text"), prev && prev.type === "text" && node.type === "text") {
          prev.value += node.value;
          return;
        }
        return block.nodes.push(node), node.parent = block, node.prev = prev, prev = node, node;
      };
      for (push({ type: "bos" }); index < length; )
        if (block = stack[stack.length - 1], value = advance(), !(value === CHAR_ZERO_WIDTH_NOBREAK_SPACE || value === CHAR_NO_BREAK_SPACE)) {
          if (value === CHAR_BACKSLASH) {
            push({ type: "text", value: (options.keepEscaping ? value : "") + advance() });
            continue;
          }
          if (value === CHAR_RIGHT_SQUARE_BRACKET) {
            push({ type: "text", value: "\\" + value });
            continue;
          }
          if (value === CHAR_LEFT_SQUARE_BRACKET) {
            brackets++;
            let next;
            for (; index < length && (next = advance()); ) {
              if (value += next, next === CHAR_LEFT_SQUARE_BRACKET) {
                brackets++;
                continue;
              }
              if (next === CHAR_BACKSLASH) {
                value += advance();
                continue;
              }
              if (next === CHAR_RIGHT_SQUARE_BRACKET && (brackets--, brackets === 0))
                break;
            }
            push({ type: "text", value });
            continue;
          }
          if (value === CHAR_LEFT_PARENTHESES) {
            block = push({ type: "paren", nodes: [] }), stack.push(block), push({ type: "text", value });
            continue;
          }
          if (value === CHAR_RIGHT_PARENTHESES) {
            if (block.type !== "paren") {
              push({ type: "text", value });
              continue;
            }
            block = stack.pop(), push({ type: "text", value }), block = stack[stack.length - 1];
            continue;
          }
          if (value === CHAR_DOUBLE_QUOTE || value === CHAR_SINGLE_QUOTE || value === CHAR_BACKTICK) {
            let open = value, next;
            for (options.keepQuotes !== !0 && (value = ""); index < length && (next = advance()); ) {
              if (next === CHAR_BACKSLASH) {
                value += next + advance();
                continue;
              }
              if (next === open) {
                options.keepQuotes === !0 && (value += next);
                break;
              }
              value += next;
            }
            push({ type: "text", value });
            continue;
          }
          if (value === CHAR_LEFT_CURLY_BRACE) {
            depth++;
            let brace = {
              type: "brace",
              open: !0,
              close: !1,
              dollar: prev.value && prev.value.slice(-1) === "$" || block.dollar === !0,
              depth,
              commas: 0,
              ranges: 0,
              nodes: []
            };
            block = push(brace), stack.push(block), push({ type: "open", value });
            continue;
          }
          if (value === CHAR_RIGHT_CURLY_BRACE) {
            if (block.type !== "brace") {
              push({ type: "text", value });
              continue;
            }
            let type = "close";
            block = stack.pop(), block.close = !0, push({ type, value }), depth--, block = stack[stack.length - 1];
            continue;
          }
          if (value === CHAR_COMMA && depth > 0) {
            if (block.ranges > 0) {
              block.ranges = 0;
              let open = block.nodes.shift();
              block.nodes = [open, { type: "text", value: stringify(block) }];
            }
            push({ type: "comma", value }), block.commas++;
            continue;
          }
          if (value === CHAR_DOT && depth > 0 && block.commas === 0) {
            let siblings = block.nodes;
            if (depth === 0 || siblings.length === 0) {
              push({ type: "text", value });
              continue;
            }
            if (prev.type === "dot") {
              if (block.range = [], prev.value += value, prev.type = "range", block.nodes.length !== 3 && block.nodes.length !== 5) {
                block.invalid = !0, block.ranges = 0, prev.type = "text";
                continue;
              }
              block.ranges++, block.args = [];
              continue;
            }
            if (prev.type === "range") {
              siblings.pop();
              let before = siblings[siblings.length - 1];
              before.value += prev.value + value, prev = before, block.ranges--;
              continue;
            }
            push({ type: "dot", value });
            continue;
          }
          push({ type: "text", value });
        }
      do
        if (block = stack.pop(), block.type !== "root") {
          block.nodes.forEach((node) => {
            node.nodes || (node.type === "open" && (node.isOpen = !0), node.type === "close" && (node.isClose = !0), node.nodes || (node.type = "text"), node.invalid = !0);
          });
          let parent = stack[stack.length - 1], index2 = parent.nodes.indexOf(block);
          parent.nodes.splice(index2, 1, ...block.nodes);
        }
      while (stack.length > 0);
      return push({ type: "eos" }), ast;
    };
    module.exports = parse;
  }
});

// ../node_modules/braces/index.js
var require_braces = __commonJS({
  "../node_modules/braces/index.js"(exports, module) {
    "use strict";
    var stringify = require_stringify(), compile = require_compile(), expand = require_expand(), parse = require_parse(), braces = (input, options = {}) => {
      let output = [];
      if (Array.isArray(input))
        for (let pattern of input) {
          let result = braces.create(pattern, options);
          Array.isArray(result) ? output.push(...result) : output.push(result);
        }
      else
        output = [].concat(braces.create(input, options));
      return options && options.expand === !0 && options.nodupes === !0 && (output = [...new Set(output)]), output;
    };
    braces.parse = (input, options = {}) => parse(input, options);
    braces.stringify = (input, options = {}) => stringify(typeof input == "string" ? braces.parse(input, options) : input, options);
    braces.compile = (input, options = {}) => (typeof input == "string" && (input = braces.parse(input, options)), compile(input, options));
    braces.expand = (input, options = {}) => {
      typeof input == "string" && (input = braces.parse(input, options));
      let result = expand(input, options);
      return options.noempty === !0 && (result = result.filter(Boolean)), options.nodupes === !0 && (result = [...new Set(result)]), result;
    };
    braces.create = (input, options = {}) => input === "" || input.length < 3 ? [input] : options.expand !== !0 ? braces.compile(input, options) : braces.expand(input, options);
    module.exports = braces;
  }
});

// ../node_modules/micromatch/index.js
var require_micromatch = __commonJS({
  "../node_modules/micromatch/index.js"(exports, module) {
    "use strict";
    var util = __require("util"), braces = require_braces(), picomatch = require_picomatch(), utils = require_utils(), isEmptyString = (v) => v === "" || v === "./", hasBraces = (v) => {
      let index = v.indexOf("{");
      return index > -1 && v.indexOf("}", index) > -1;
    }, micromatch = (list, patterns, options) => {
      patterns = [].concat(patterns), list = [].concat(list);
      let omit = /* @__PURE__ */ new Set(), keep = /* @__PURE__ */ new Set(), items = /* @__PURE__ */ new Set(), negatives = 0, onResult = (state) => {
        items.add(state.output), options && options.onResult && options.onResult(state);
      };
      for (let i = 0; i < patterns.length; i++) {
        let isMatch = picomatch(String(patterns[i]), { ...options, onResult }, !0), negated = isMatch.state.negated || isMatch.state.negatedExtglob;
        negated && negatives++;
        for (let item of list) {
          let matched = isMatch(item, !0);
          (negated ? !matched.isMatch : matched.isMatch) && (negated ? omit.add(matched.output) : (omit.delete(matched.output), keep.add(matched.output)));
        }
      }
      let matches = (negatives === patterns.length ? [...items] : [...keep]).filter((item) => !omit.has(item));
      if (options && matches.length === 0) {
        if (options.failglob === !0)
          throw new Error(`No matches found for "${patterns.join(", ")}"`);
        if (options.nonull === !0 || options.nullglob === !0)
          return options.unescape ? patterns.map((p) => p.replace(/\\/g, "")) : patterns;
      }
      return matches;
    };
    micromatch.match = micromatch;
    micromatch.matcher = (pattern, options) => picomatch(pattern, options);
    micromatch.isMatch = (str, patterns, options) => picomatch(patterns, options)(str);
    micromatch.any = micromatch.isMatch;
    micromatch.not = (list, patterns, options = {}) => {
      patterns = [].concat(patterns).map(String);
      let result = /* @__PURE__ */ new Set(), items = [], onResult = (state) => {
        options.onResult && options.onResult(state), items.push(state.output);
      }, matches = new Set(micromatch(list, patterns, { ...options, onResult }));
      for (let item of items)
        matches.has(item) || result.add(item);
      return [...result];
    };
    micromatch.contains = (str, pattern, options) => {
      if (typeof str != "string")
        throw new TypeError(`Expected a string: "${util.inspect(str)}"`);
      if (Array.isArray(pattern))
        return pattern.some((p) => micromatch.contains(str, p, options));
      if (typeof pattern == "string") {
        if (isEmptyString(str) || isEmptyString(pattern))
          return !1;
        if (str.includes(pattern) || str.startsWith("./") && str.slice(2).includes(pattern))
          return !0;
      }
      return micromatch.isMatch(str, pattern, { ...options, contains: !0 });
    };
    micromatch.matchKeys = (obj, patterns, options) => {
      if (!utils.isObject(obj))
        throw new TypeError("Expected the first argument to be an object");
      let keys = micromatch(Object.keys(obj), patterns, options), res = {};
      for (let key of keys) res[key] = obj[key];
      return res;
    };
    micromatch.some = (list, patterns, options) => {
      let items = [].concat(list);
      for (let pattern of [].concat(patterns)) {
        let isMatch = picomatch(String(pattern), options);
        if (items.some((item) => isMatch(item)))
          return !0;
      }
      return !1;
    };
    micromatch.every = (list, patterns, options) => {
      let items = [].concat(list);
      for (let pattern of [].concat(patterns)) {
        let isMatch = picomatch(String(pattern), options);
        if (!items.every((item) => isMatch(item)))
          return !1;
      }
      return !0;
    };
    micromatch.all = (str, patterns, options) => {
      if (typeof str != "string")
        throw new TypeError(`Expected a string: "${util.inspect(str)}"`);
      return [].concat(patterns).every((p) => picomatch(p, options)(str));
    };
    micromatch.capture = (glob, input, options) => {
      let posix = utils.isWindows(options), match = picomatch.makeRe(String(glob), { ...options, capture: !0 }).exec(posix ? utils.toPosixSlashes(input) : input);
      if (match)
        return match.slice(1).map((v) => v === void 0 ? "" : v);
    };
    micromatch.makeRe = (...args) => picomatch.makeRe(...args);
    micromatch.scan = (...args) => picomatch.scan(...args);
    micromatch.parse = (patterns, options) => {
      let res = [];
      for (let pattern of [].concat(patterns || []))
        for (let str of braces(String(pattern), options))
          res.push(picomatch.parse(str, options));
      return res;
    };
    micromatch.braces = (pattern, options) => {
      if (typeof pattern != "string") throw new TypeError("Expected a string");
      return options && options.nobrace === !0 || !hasBraces(pattern) ? [pattern] : braces(pattern, options);
    };
    micromatch.braceExpand = (pattern, options) => {
      if (typeof pattern != "string") throw new TypeError("Expected a string");
      return micromatch.braces(pattern, { ...options, expand: !0 });
    };
    micromatch.hasBraces = hasBraces;
    module.exports = micromatch;
  }
});

// ../node_modules/fast-glob/out/utils/pattern.js
var require_pattern = __commonJS({
  "../node_modules/fast-glob/out/utils/pattern.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.isAbsolute = exports.partitionAbsoluteAndRelative = exports.removeDuplicateSlashes = exports.matchAny = exports.convertPatternsToRe = exports.makeRe = exports.getPatternParts = exports.expandBraceExpansion = exports.expandPatternsWithBraceExpansion = exports.isAffectDepthOfReadingPattern = exports.endsWithSlashGlobStar = exports.hasGlobStar = exports.getBaseDirectory = exports.isPatternRelatedToParentDirectory = exports.getPatternsOutsideCurrentDirectory = exports.getPatternsInsideCurrentDirectory = exports.getPositivePatterns = exports.getNegativePatterns = exports.isPositivePattern = exports.isNegativePattern = exports.convertToNegativePattern = exports.convertToPositivePattern = exports.isDynamicPattern = exports.isStaticPattern = void 0;
    var path2 = __require("path"), globParent = require_glob_parent(), micromatch = require_micromatch(), GLOBSTAR = "**", ESCAPE_SYMBOL = "\\", COMMON_GLOB_SYMBOLS_RE = /[*?]|^!/, REGEX_CHARACTER_CLASS_SYMBOLS_RE = /\[[^[]*]/, REGEX_GROUP_SYMBOLS_RE = /(?:^|[^!*+?@])\([^(]*\|[^|]*\)/, GLOB_EXTENSION_SYMBOLS_RE = /[!*+?@]\([^(]*\)/, BRACE_EXPANSION_SEPARATORS_RE = /,|\.\./, DOUBLE_SLASH_RE = /(?!^)\/{2,}/g;
    function isStaticPattern(pattern, options = {}) {
      return !isDynamicPattern2(pattern, options);
    }
    exports.isStaticPattern = isStaticPattern;
    function isDynamicPattern2(pattern, options = {}) {
      return pattern === "" ? !1 : !!(options.caseSensitiveMatch === !1 || pattern.includes(ESCAPE_SYMBOL) || COMMON_GLOB_SYMBOLS_RE.test(pattern) || REGEX_CHARACTER_CLASS_SYMBOLS_RE.test(pattern) || REGEX_GROUP_SYMBOLS_RE.test(pattern) || options.extglob !== !1 && GLOB_EXTENSION_SYMBOLS_RE.test(pattern) || options.braceExpansion !== !1 && hasBraceExpansion(pattern));
    }
    exports.isDynamicPattern = isDynamicPattern2;
    function hasBraceExpansion(pattern) {
      let openingBraceIndex = pattern.indexOf("{");
      if (openingBraceIndex === -1)
        return !1;
      let closingBraceIndex = pattern.indexOf("}", openingBraceIndex + 1);
      if (closingBraceIndex === -1)
        return !1;
      let braceContent = pattern.slice(openingBraceIndex, closingBraceIndex);
      return BRACE_EXPANSION_SEPARATORS_RE.test(braceContent);
    }
    function convertToPositivePattern(pattern) {
      return isNegativePattern2(pattern) ? pattern.slice(1) : pattern;
    }
    exports.convertToPositivePattern = convertToPositivePattern;
    function convertToNegativePattern(pattern) {
      return "!" + pattern;
    }
    exports.convertToNegativePattern = convertToNegativePattern;
    function isNegativePattern2(pattern) {
      return pattern.startsWith("!") && pattern[1] !== "(";
    }
    exports.isNegativePattern = isNegativePattern2;
    function isPositivePattern(pattern) {
      return !isNegativePattern2(pattern);
    }
    exports.isPositivePattern = isPositivePattern;
    function getNegativePatterns(patterns) {
      return patterns.filter(isNegativePattern2);
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
      return globParent(pattern, { flipBackslashes: !1 });
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
      let basename = path2.basename(pattern);
      return endsWithSlashGlobStar(pattern) || isStaticPattern(basename);
    }
    exports.isAffectDepthOfReadingPattern = isAffectDepthOfReadingPattern;
    function expandPatternsWithBraceExpansion(patterns) {
      return patterns.reduce((collection, pattern) => collection.concat(expandBraceExpansion(pattern)), []);
    }
    exports.expandPatternsWithBraceExpansion = expandPatternsWithBraceExpansion;
    function expandBraceExpansion(pattern) {
      let patterns = micromatch.braces(pattern, { expand: !0, nodupes: !0, keepEscaping: !0 });
      return patterns.sort((a, b) => a.length - b.length), patterns.filter((pattern2) => pattern2 !== "");
    }
    exports.expandBraceExpansion = expandBraceExpansion;
    function getPatternParts(pattern, options) {
      let { parts } = micromatch.scan(pattern, Object.assign(Object.assign({}, options), { parts: !0 }));
      return parts.length === 0 && (parts = [pattern]), parts[0].startsWith("/") && (parts[0] = parts[0].slice(1), parts.unshift("")), parts;
    }
    exports.getPatternParts = getPatternParts;
    function makeRe(pattern, options) {
      return micromatch.makeRe(pattern, options);
    }
    exports.makeRe = makeRe;
    function convertPatternsToRe(patterns, options) {
      return patterns.map((pattern) => makeRe(pattern, options));
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
    function partitionAbsoluteAndRelative(patterns) {
      let absolute = [], relative = [];
      for (let pattern of patterns)
        isAbsolute(pattern) ? absolute.push(pattern) : relative.push(pattern);
      return [absolute, relative];
    }
    exports.partitionAbsoluteAndRelative = partitionAbsoluteAndRelative;
    function isAbsolute(pattern) {
      return path2.isAbsolute(pattern);
    }
    exports.isAbsolute = isAbsolute;
  }
});

// ../node_modules/merge2/index.js
var require_merge2 = __commonJS({
  "../node_modules/merge2/index.js"(exports, module) {
    "use strict";
    var Stream = __require("stream"), PassThrough = Stream.PassThrough, slice = Array.prototype.slice;
    module.exports = merge2;
    function merge2() {
      let streamsQueue = [], args = slice.call(arguments), merging = !1, options = args[args.length - 1];
      options && !Array.isArray(options) && options.pipe == null ? args.pop() : options = {};
      let doEnd = options.end !== !1, doPipeError = options.pipeError === !0;
      options.objectMode == null && (options.objectMode = !0), options.highWaterMark == null && (options.highWaterMark = 64 * 1024);
      let mergedStream = PassThrough(options);
      function addStream() {
        for (let i = 0, len = arguments.length; i < len; i++)
          streamsQueue.push(pauseStreams(arguments[i], options));
        return mergeStream(), this;
      }
      function mergeStream() {
        if (merging)
          return;
        merging = !0;
        let streams = streamsQueue.shift();
        if (!streams) {
          process.nextTick(endStream2);
          return;
        }
        Array.isArray(streams) || (streams = [streams]);
        let pipesCount = streams.length + 1;
        function next() {
          --pipesCount > 0 || (merging = !1, mergeStream());
        }
        function pipe(stream) {
          function onend() {
            stream.removeListener("merge2UnpipeEnd", onend), stream.removeListener("end", onend), doPipeError && stream.removeListener("error", onerror), next();
          }
          function onerror(err) {
            mergedStream.emit("error", err);
          }
          if (stream._readableState.endEmitted)
            return next();
          stream.on("merge2UnpipeEnd", onend), stream.on("end", onend), doPipeError && stream.on("error", onerror), stream.pipe(mergedStream, { end: !1 }), stream.resume();
        }
        for (let i = 0; i < streams.length; i++)
          pipe(streams[i]);
        next();
      }
      function endStream2() {
        merging = !1, mergedStream.emit("queueDrain"), doEnd && mergedStream.end();
      }
      return mergedStream.setMaxListeners(0), mergedStream.add = addStream, mergedStream.on("unpipe", function(stream) {
        stream.emit("merge2UnpipeEnd");
      }), args.length && addStream.apply(null, args), mergedStream;
    }
    function pauseStreams(streams, options) {
      if (Array.isArray(streams))
        for (let i = 0, len = streams.length; i < len; i++)
          streams[i] = pauseStreams(streams[i], options);
      else {
        if (!streams._readableState && streams.pipe && (streams = streams.pipe(PassThrough(options))), !streams._readableState || !streams.pause || !streams.pipe)
          throw new Error("Only readable stream can be merged.");
        streams.pause();
      }
      return streams;
    }
  }
});

// ../node_modules/fast-glob/out/utils/stream.js
var require_stream = __commonJS({
  "../node_modules/fast-glob/out/utils/stream.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.merge = void 0;
    var merge2 = require_merge2();
    function merge(streams) {
      let mergedStream = merge2(streams);
      return streams.forEach((stream) => {
        stream.once("error", (error) => mergedStream.emit("error", error));
      }), mergedStream.once("close", () => propagateCloseEventToSources(streams)), mergedStream.once("end", () => propagateCloseEventToSources(streams)), mergedStream;
    }
    exports.merge = merge;
    function propagateCloseEventToSources(streams) {
      streams.forEach((stream) => stream.emit("close"));
    }
  }
});

// ../node_modules/fast-glob/out/utils/string.js
var require_string = __commonJS({
  "../node_modules/fast-glob/out/utils/string.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.isEmpty = exports.isString = void 0;
    function isString(input) {
      return typeof input == "string";
    }
    exports.isString = isString;
    function isEmpty(input) {
      return input === "";
    }
    exports.isEmpty = isEmpty;
  }
});

// ../node_modules/fast-glob/out/utils/index.js
var require_utils3 = __commonJS({
  "../node_modules/fast-glob/out/utils/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.string = exports.stream = exports.pattern = exports.path = exports.fs = exports.errno = exports.array = void 0;
    var array = require_array();
    exports.array = array;
    var errno = require_errno();
    exports.errno = errno;
    var fs4 = require_fs();
    exports.fs = fs4;
    var path2 = require_path();
    exports.path = path2;
    var pattern = require_pattern();
    exports.pattern = pattern;
    var stream = require_stream();
    exports.stream = stream;
    var string = require_string();
    exports.string = string;
  }
});

// ../node_modules/fast-glob/out/managers/tasks.js
var require_tasks = __commonJS({
  "../node_modules/fast-glob/out/managers/tasks.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.convertPatternGroupToTask = exports.convertPatternGroupsToTasks = exports.groupPatternsByBaseDirectory = exports.getNegativePatternsAsPositive = exports.getPositivePatterns = exports.convertPatternsToTasks = exports.generate = void 0;
    var utils = require_utils3();
    function generate(input, settings) {
      let patterns = processPatterns(input, settings), ignore = processPatterns(settings.ignore, settings), positivePatterns = getPositivePatterns(patterns), negativePatterns = getNegativePatternsAsPositive(patterns, ignore), staticPatterns = positivePatterns.filter((pattern) => utils.pattern.isStaticPattern(pattern, settings)), dynamicPatterns = positivePatterns.filter((pattern) => utils.pattern.isDynamicPattern(pattern, settings)), staticTasks = convertPatternsToTasks(
        staticPatterns,
        negativePatterns,
        /* dynamic */
        !1
      ), dynamicTasks = convertPatternsToTasks(
        dynamicPatterns,
        negativePatterns,
        /* dynamic */
        !0
      );
      return staticTasks.concat(dynamicTasks);
    }
    exports.generate = generate;
    function processPatterns(input, settings) {
      let patterns = input;
      return settings.braceExpansion && (patterns = utils.pattern.expandPatternsWithBraceExpansion(patterns)), settings.baseNameMatch && (patterns = patterns.map((pattern) => pattern.includes("/") ? pattern : `**/${pattern}`)), patterns.map((pattern) => utils.pattern.removeDuplicateSlashes(pattern));
    }
    function convertPatternsToTasks(positive, negative, dynamic) {
      let tasks = [], patternsOutsideCurrentDirectory = utils.pattern.getPatternsOutsideCurrentDirectory(positive), patternsInsideCurrentDirectory = utils.pattern.getPatternsInsideCurrentDirectory(positive), outsideCurrentDirectoryGroup = groupPatternsByBaseDirectory(patternsOutsideCurrentDirectory), insideCurrentDirectoryGroup = groupPatternsByBaseDirectory(patternsInsideCurrentDirectory);
      return tasks.push(...convertPatternGroupsToTasks(outsideCurrentDirectoryGroup, negative, dynamic)), "." in insideCurrentDirectoryGroup ? tasks.push(convertPatternGroupToTask(".", patternsInsideCurrentDirectory, negative, dynamic)) : tasks.push(...convertPatternGroupsToTasks(insideCurrentDirectoryGroup, negative, dynamic)), tasks;
    }
    exports.convertPatternsToTasks = convertPatternsToTasks;
    function getPositivePatterns(patterns) {
      return utils.pattern.getPositivePatterns(patterns);
    }
    exports.getPositivePatterns = getPositivePatterns;
    function getNegativePatternsAsPositive(patterns, ignore) {
      return utils.pattern.getNegativePatterns(patterns).concat(ignore).map(utils.pattern.convertToPositivePattern);
    }
    exports.getNegativePatternsAsPositive = getNegativePatternsAsPositive;
    function groupPatternsByBaseDirectory(patterns) {
      let group = {};
      return patterns.reduce((collection, pattern) => {
        let base = utils.pattern.getBaseDirectory(pattern);
        return base in collection ? collection[base].push(pattern) : collection[base] = [pattern], collection;
      }, group);
    }
    exports.groupPatternsByBaseDirectory = groupPatternsByBaseDirectory;
    function convertPatternGroupsToTasks(positive, negative, dynamic) {
      return Object.keys(positive).map((base) => convertPatternGroupToTask(base, positive[base], negative, dynamic));
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

// ../node_modules/@nodelib/fs.stat/out/providers/async.js
var require_async = __commonJS({
  "../node_modules/@nodelib/fs.stat/out/providers/async.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.read = void 0;
    function read(path2, settings, callback) {
      settings.fs.lstat(path2, (lstatError, lstat) => {
        if (lstatError !== null) {
          callFailureCallback(callback, lstatError);
          return;
        }
        if (!lstat.isSymbolicLink() || !settings.followSymbolicLink) {
          callSuccessCallback(callback, lstat);
          return;
        }
        settings.fs.stat(path2, (statError, stat) => {
          if (statError !== null) {
            if (settings.throwErrorOnBrokenSymbolicLink) {
              callFailureCallback(callback, statError);
              return;
            }
            callSuccessCallback(callback, lstat);
            return;
          }
          settings.markSymbolicLink && (stat.isSymbolicLink = () => !0), callSuccessCallback(callback, stat);
        });
      });
    }
    exports.read = read;
    function callFailureCallback(callback, error) {
      callback(error);
    }
    function callSuccessCallback(callback, result) {
      callback(null, result);
    }
  }
});

// ../node_modules/@nodelib/fs.stat/out/providers/sync.js
var require_sync = __commonJS({
  "../node_modules/@nodelib/fs.stat/out/providers/sync.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.read = void 0;
    function read(path2, settings) {
      let lstat = settings.fs.lstatSync(path2);
      if (!lstat.isSymbolicLink() || !settings.followSymbolicLink)
        return lstat;
      try {
        let stat = settings.fs.statSync(path2);
        return settings.markSymbolicLink && (stat.isSymbolicLink = () => !0), stat;
      } catch (error) {
        if (!settings.throwErrorOnBrokenSymbolicLink)
          return lstat;
        throw error;
      }
    }
    exports.read = read;
  }
});

// ../node_modules/@nodelib/fs.stat/out/adapters/fs.js
var require_fs2 = __commonJS({
  "../node_modules/@nodelib/fs.stat/out/adapters/fs.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.createFileSystemAdapter = exports.FILE_SYSTEM_ADAPTER = void 0;
    var fs4 = __require("fs");
    exports.FILE_SYSTEM_ADAPTER = {
      lstat: fs4.lstat,
      stat: fs4.stat,
      lstatSync: fs4.lstatSync,
      statSync: fs4.statSync
    };
    function createFileSystemAdapter(fsMethods) {
      return fsMethods === void 0 ? exports.FILE_SYSTEM_ADAPTER : Object.assign(Object.assign({}, exports.FILE_SYSTEM_ADAPTER), fsMethods);
    }
    exports.createFileSystemAdapter = createFileSystemAdapter;
  }
});

// ../node_modules/@nodelib/fs.stat/out/settings.js
var require_settings = __commonJS({
  "../node_modules/@nodelib/fs.stat/out/settings.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var fs4 = require_fs2(), Settings = class {
      constructor(_options = {}) {
        this._options = _options, this.followSymbolicLink = this._getValue(this._options.followSymbolicLink, !0), this.fs = fs4.createFileSystemAdapter(this._options.fs), this.markSymbolicLink = this._getValue(this._options.markSymbolicLink, !1), this.throwErrorOnBrokenSymbolicLink = this._getValue(this._options.throwErrorOnBrokenSymbolicLink, !0);
      }
      _getValue(option, value) {
        return option ?? value;
      }
    };
    exports.default = Settings;
  }
});

// ../node_modules/@nodelib/fs.stat/out/index.js
var require_out = __commonJS({
  "../node_modules/@nodelib/fs.stat/out/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.statSync = exports.stat = exports.Settings = void 0;
    var async = require_async(), sync = require_sync(), settings_1 = require_settings();
    exports.Settings = settings_1.default;
    function stat(path2, optionsOrSettingsOrCallback, callback) {
      if (typeof optionsOrSettingsOrCallback == "function") {
        async.read(path2, getSettings(), optionsOrSettingsOrCallback);
        return;
      }
      async.read(path2, getSettings(optionsOrSettingsOrCallback), callback);
    }
    exports.stat = stat;
    function statSync(path2, optionsOrSettings) {
      let settings = getSettings(optionsOrSettings);
      return sync.read(path2, settings);
    }
    exports.statSync = statSync;
    function getSettings(settingsOrOptions = {}) {
      return settingsOrOptions instanceof settings_1.default ? settingsOrOptions : new settings_1.default(settingsOrOptions);
    }
  }
});

// ../node_modules/queue-microtask/index.js
var require_queue_microtask = __commonJS({
  "../node_modules/queue-microtask/index.js"(exports, module) {
    var promise;
    module.exports = typeof queueMicrotask == "function" ? queueMicrotask.bind(typeof window < "u" ? window : global) : (cb) => (promise || (promise = Promise.resolve())).then(cb).catch((err) => setTimeout(() => {
      throw err;
    }, 0));
  }
});

// ../node_modules/run-parallel/index.js
var require_run_parallel = __commonJS({
  "../node_modules/run-parallel/index.js"(exports, module) {
    module.exports = runParallel;
    var queueMicrotask2 = require_queue_microtask();
    function runParallel(tasks, cb) {
      let results, pending, keys, isSync = !0;
      Array.isArray(tasks) ? (results = [], pending = tasks.length) : (keys = Object.keys(tasks), results = {}, pending = keys.length);
      function done(err) {
        function end() {
          cb && cb(err, results), cb = null;
        }
        isSync ? queueMicrotask2(end) : end();
      }
      function each(i, err, result) {
        results[i] = result, (--pending === 0 || err) && done(err);
      }
      pending ? keys ? keys.forEach(function(key) {
        tasks[key](function(err, result) {
          each(key, err, result);
        });
      }) : tasks.forEach(function(task, i) {
        task(function(err, result) {
          each(i, err, result);
        });
      }) : done(null), isSync = !1;
    }
  }
});

// ../node_modules/@nodelib/fs.scandir/out/constants.js
var require_constants2 = __commonJS({
  "../node_modules/@nodelib/fs.scandir/out/constants.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.IS_SUPPORT_READDIR_WITH_FILE_TYPES = void 0;
    var NODE_PROCESS_VERSION_PARTS = process.versions.node.split(".");
    if (NODE_PROCESS_VERSION_PARTS[0] === void 0 || NODE_PROCESS_VERSION_PARTS[1] === void 0)
      throw new Error(`Unexpected behavior. The 'process.versions.node' variable has invalid value: ${process.versions.node}`);
    var MAJOR_VERSION = Number.parseInt(NODE_PROCESS_VERSION_PARTS[0], 10), MINOR_VERSION = Number.parseInt(NODE_PROCESS_VERSION_PARTS[1], 10), SUPPORTED_MAJOR_VERSION = 10, SUPPORTED_MINOR_VERSION = 10, IS_MATCHED_BY_MAJOR = MAJOR_VERSION > SUPPORTED_MAJOR_VERSION, IS_MATCHED_BY_MAJOR_AND_MINOR = MAJOR_VERSION === SUPPORTED_MAJOR_VERSION && MINOR_VERSION >= SUPPORTED_MINOR_VERSION;
    exports.IS_SUPPORT_READDIR_WITH_FILE_TYPES = IS_MATCHED_BY_MAJOR || IS_MATCHED_BY_MAJOR_AND_MINOR;
  }
});

// ../node_modules/@nodelib/fs.scandir/out/utils/fs.js
var require_fs3 = __commonJS({
  "../node_modules/@nodelib/fs.scandir/out/utils/fs.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.createDirentFromStats = void 0;
    var DirentFromStats = class {
      constructor(name, stats) {
        this.name = name, this.isBlockDevice = stats.isBlockDevice.bind(stats), this.isCharacterDevice = stats.isCharacterDevice.bind(stats), this.isDirectory = stats.isDirectory.bind(stats), this.isFIFO = stats.isFIFO.bind(stats), this.isFile = stats.isFile.bind(stats), this.isSocket = stats.isSocket.bind(stats), this.isSymbolicLink = stats.isSymbolicLink.bind(stats);
      }
    };
    function createDirentFromStats(name, stats) {
      return new DirentFromStats(name, stats);
    }
    exports.createDirentFromStats = createDirentFromStats;
  }
});

// ../node_modules/@nodelib/fs.scandir/out/utils/index.js
var require_utils4 = __commonJS({
  "../node_modules/@nodelib/fs.scandir/out/utils/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.fs = void 0;
    var fs4 = require_fs3();
    exports.fs = fs4;
  }
});

// ../node_modules/@nodelib/fs.scandir/out/providers/common.js
var require_common = __commonJS({
  "../node_modules/@nodelib/fs.scandir/out/providers/common.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.joinPathSegments = void 0;
    function joinPathSegments(a, b, separator) {
      return a.endsWith(separator) ? a + b : a + separator + b;
    }
    exports.joinPathSegments = joinPathSegments;
  }
});

// ../node_modules/@nodelib/fs.scandir/out/providers/async.js
var require_async2 = __commonJS({
  "../node_modules/@nodelib/fs.scandir/out/providers/async.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.readdir = exports.readdirWithFileTypes = exports.read = void 0;
    var fsStat = require_out(), rpl = require_run_parallel(), constants_1 = require_constants2(), utils = require_utils4(), common = require_common();
    function read(directory, settings, callback) {
      if (!settings.stats && constants_1.IS_SUPPORT_READDIR_WITH_FILE_TYPES) {
        readdirWithFileTypes(directory, settings, callback);
        return;
      }
      readdir(directory, settings, callback);
    }
    exports.read = read;
    function readdirWithFileTypes(directory, settings, callback) {
      settings.fs.readdir(directory, { withFileTypes: !0 }, (readdirError, dirents) => {
        if (readdirError !== null) {
          callFailureCallback(callback, readdirError);
          return;
        }
        let entries = dirents.map((dirent) => ({
          dirent,
          name: dirent.name,
          path: common.joinPathSegments(directory, dirent.name, settings.pathSegmentSeparator)
        }));
        if (!settings.followSymbolicLinks) {
          callSuccessCallback(callback, entries);
          return;
        }
        let tasks = entries.map((entry) => makeRplTaskEntry(entry, settings));
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
          entry.dirent = utils.fs.createDirentFromStats(entry.name, stats), done(null, entry);
        });
      };
    }
    function readdir(directory, settings, callback) {
      settings.fs.readdir(directory, (readdirError, names) => {
        if (readdirError !== null) {
          callFailureCallback(callback, readdirError);
          return;
        }
        let tasks = names.map((name) => {
          let path2 = common.joinPathSegments(directory, name, settings.pathSegmentSeparator);
          return (done) => {
            fsStat.stat(path2, settings.fsStatSettings, (error, stats) => {
              if (error !== null) {
                done(error);
                return;
              }
              let entry = {
                name,
                path: path2,
                dirent: utils.fs.createDirentFromStats(name, stats)
              };
              settings.stats && (entry.stats = stats), done(null, entry);
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

// ../node_modules/@nodelib/fs.scandir/out/providers/sync.js
var require_sync2 = __commonJS({
  "../node_modules/@nodelib/fs.scandir/out/providers/sync.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.readdir = exports.readdirWithFileTypes = exports.read = void 0;
    var fsStat = require_out(), constants_1 = require_constants2(), utils = require_utils4(), common = require_common();
    function read(directory, settings) {
      return !settings.stats && constants_1.IS_SUPPORT_READDIR_WITH_FILE_TYPES ? readdirWithFileTypes(directory, settings) : readdir(directory, settings);
    }
    exports.read = read;
    function readdirWithFileTypes(directory, settings) {
      return settings.fs.readdirSync(directory, { withFileTypes: !0 }).map((dirent) => {
        let entry = {
          dirent,
          name: dirent.name,
          path: common.joinPathSegments(directory, dirent.name, settings.pathSegmentSeparator)
        };
        if (entry.dirent.isSymbolicLink() && settings.followSymbolicLinks)
          try {
            let stats = settings.fs.statSync(entry.path);
            entry.dirent = utils.fs.createDirentFromStats(entry.name, stats);
          } catch (error) {
            if (settings.throwErrorOnBrokenSymbolicLink)
              throw error;
          }
        return entry;
      });
    }
    exports.readdirWithFileTypes = readdirWithFileTypes;
    function readdir(directory, settings) {
      return settings.fs.readdirSync(directory).map((name) => {
        let entryPath = common.joinPathSegments(directory, name, settings.pathSegmentSeparator), stats = fsStat.statSync(entryPath, settings.fsStatSettings), entry = {
          name,
          path: entryPath,
          dirent: utils.fs.createDirentFromStats(name, stats)
        };
        return settings.stats && (entry.stats = stats), entry;
      });
    }
    exports.readdir = readdir;
  }
});

// ../node_modules/@nodelib/fs.scandir/out/adapters/fs.js
var require_fs4 = __commonJS({
  "../node_modules/@nodelib/fs.scandir/out/adapters/fs.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.createFileSystemAdapter = exports.FILE_SYSTEM_ADAPTER = void 0;
    var fs4 = __require("fs");
    exports.FILE_SYSTEM_ADAPTER = {
      lstat: fs4.lstat,
      stat: fs4.stat,
      lstatSync: fs4.lstatSync,
      statSync: fs4.statSync,
      readdir: fs4.readdir,
      readdirSync: fs4.readdirSync
    };
    function createFileSystemAdapter(fsMethods) {
      return fsMethods === void 0 ? exports.FILE_SYSTEM_ADAPTER : Object.assign(Object.assign({}, exports.FILE_SYSTEM_ADAPTER), fsMethods);
    }
    exports.createFileSystemAdapter = createFileSystemAdapter;
  }
});

// ../node_modules/@nodelib/fs.scandir/out/settings.js
var require_settings2 = __commonJS({
  "../node_modules/@nodelib/fs.scandir/out/settings.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var path2 = __require("path"), fsStat = require_out(), fs4 = require_fs4(), Settings = class {
      constructor(_options = {}) {
        this._options = _options, this.followSymbolicLinks = this._getValue(this._options.followSymbolicLinks, !1), this.fs = fs4.createFileSystemAdapter(this._options.fs), this.pathSegmentSeparator = this._getValue(this._options.pathSegmentSeparator, path2.sep), this.stats = this._getValue(this._options.stats, !1), this.throwErrorOnBrokenSymbolicLink = this._getValue(this._options.throwErrorOnBrokenSymbolicLink, !0), this.fsStatSettings = new fsStat.Settings({
          followSymbolicLink: this.followSymbolicLinks,
          fs: this.fs,
          throwErrorOnBrokenSymbolicLink: this.throwErrorOnBrokenSymbolicLink
        });
      }
      _getValue(option, value) {
        return option ?? value;
      }
    };
    exports.default = Settings;
  }
});

// ../node_modules/@nodelib/fs.scandir/out/index.js
var require_out2 = __commonJS({
  "../node_modules/@nodelib/fs.scandir/out/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.Settings = exports.scandirSync = exports.scandir = void 0;
    var async = require_async2(), sync = require_sync2(), settings_1 = require_settings2();
    exports.Settings = settings_1.default;
    function scandir(path2, optionsOrSettingsOrCallback, callback) {
      if (typeof optionsOrSettingsOrCallback == "function") {
        async.read(path2, getSettings(), optionsOrSettingsOrCallback);
        return;
      }
      async.read(path2, getSettings(optionsOrSettingsOrCallback), callback);
    }
    exports.scandir = scandir;
    function scandirSync(path2, optionsOrSettings) {
      let settings = getSettings(optionsOrSettings);
      return sync.read(path2, settings);
    }
    exports.scandirSync = scandirSync;
    function getSettings(settingsOrOptions = {}) {
      return settingsOrOptions instanceof settings_1.default ? settingsOrOptions : new settings_1.default(settingsOrOptions);
    }
  }
});

// ../node_modules/reusify/reusify.js
var require_reusify = __commonJS({
  "../node_modules/reusify/reusify.js"(exports, module) {
    "use strict";
    function reusify(Constructor) {
      var head = new Constructor(), tail = head;
      function get() {
        var current = head;
        return current.next ? head = current.next : (head = new Constructor(), tail = head), current.next = null, current;
      }
      function release(obj) {
        tail.next = obj, tail = obj;
      }
      return {
        get,
        release
      };
    }
    module.exports = reusify;
  }
});

// ../node_modules/fastq/queue.js
var require_queue = __commonJS({
  "../node_modules/fastq/queue.js"(exports, module) {
    "use strict";
    var reusify = require_reusify();
    function fastqueue(context, worker, _concurrency) {
      if (typeof context == "function" && (_concurrency = worker, worker = context, context = null), !(_concurrency >= 1))
        throw new Error("fastqueue concurrency must be equal to or greater than 1");
      var cache = reusify(Task), queueHead = null, queueTail = null, _running = 0, errorHandler = null, self = {
        push,
        drain: noop2,
        saturated: noop2,
        pause,
        paused: !1,
        get concurrency() {
          return _concurrency;
        },
        set concurrency(value) {
          if (!(value >= 1))
            throw new Error("fastqueue concurrency must be equal to or greater than 1");
          if (_concurrency = value, !self.paused)
            for (; queueHead && _running < _concurrency; )
              _running++, release();
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
        self.paused = !0;
      }
      function length() {
        for (var current = queueHead, counter = 0; current; )
          current = current.next, counter++;
        return counter;
      }
      function getQueue() {
        for (var current = queueHead, tasks = []; current; )
          tasks.push(current.value), current = current.next;
        return tasks;
      }
      function resume() {
        if (self.paused) {
          if (self.paused = !1, queueHead === null) {
            _running++, release();
            return;
          }
          for (; queueHead && _running < _concurrency; )
            _running++, release();
        }
      }
      function idle() {
        return _running === 0 && self.length() === 0;
      }
      function push(value, done) {
        var current = cache.get();
        current.context = context, current.release = release, current.value = value, current.callback = done || noop2, current.errorHandler = errorHandler, _running >= _concurrency || self.paused ? queueTail ? (queueTail.next = current, queueTail = current) : (queueHead = current, queueTail = current, self.saturated()) : (_running++, worker.call(context, current.value, current.worked));
      }
      function unshift(value, done) {
        var current = cache.get();
        current.context = context, current.release = release, current.value = value, current.callback = done || noop2, current.errorHandler = errorHandler, _running >= _concurrency || self.paused ? queueHead ? (current.next = queueHead, queueHead = current) : (queueHead = current, queueTail = current, self.saturated()) : (_running++, worker.call(context, current.value, current.worked));
      }
      function release(holder) {
        holder && cache.release(holder);
        var next = queueHead;
        next && _running <= _concurrency ? self.paused ? _running-- : (queueTail === queueHead && (queueTail = null), queueHead = next.next, next.next = null, worker.call(context, next.value, next.worked), queueTail === null && self.empty()) : --_running === 0 && self.drain();
      }
      function kill() {
        queueHead = null, queueTail = null, self.drain = noop2;
      }
      function killAndDrain() {
        queueHead = null, queueTail = null, self.drain(), self.drain = noop2;
      }
      function error(handler) {
        errorHandler = handler;
      }
    }
    function noop2() {
    }
    function Task() {
      this.value = null, this.callback = noop2, this.next = null, this.release = noop2, this.context = null, this.errorHandler = null;
      var self = this;
      this.worked = function(err, result) {
        var callback = self.callback, errorHandler = self.errorHandler, val = self.value;
        self.value = null, self.callback = noop2, self.errorHandler && errorHandler(err, val), callback.call(self.context, err, result), self.release(self);
      };
    }
    function queueAsPromised(context, worker, _concurrency) {
      typeof context == "function" && (_concurrency = worker, worker = context, context = null);
      function asyncWrapper(arg, cb) {
        worker.call(this, arg).then(function(res) {
          cb(null, res);
        }, cb);
      }
      var queue = fastqueue(context, asyncWrapper, _concurrency), pushCb = queue.push, unshiftCb = queue.unshift;
      return queue.push = push, queue.unshift = unshift, queue.drained = drained, queue;
      function push(value) {
        var p = new Promise(function(resolve, reject) {
          pushCb(value, function(err, result) {
            if (err) {
              reject(err);
              return;
            }
            resolve(result);
          });
        });
        return p.catch(noop2), p;
      }
      function unshift(value) {
        var p = new Promise(function(resolve, reject) {
          unshiftCb(value, function(err, result) {
            if (err) {
              reject(err);
              return;
            }
            resolve(result);
          });
        });
        return p.catch(noop2), p;
      }
      function drained() {
        var p = new Promise(function(resolve) {
          process.nextTick(function() {
            if (queue.idle())
              resolve();
            else {
              var previousDrain = queue.drain;
              queue.drain = function() {
                typeof previousDrain == "function" && previousDrain(), resolve(), queue.drain = previousDrain;
              };
            }
          });
        });
        return p;
      }
    }
    module.exports = fastqueue;
    module.exports.promise = queueAsPromised;
  }
});

// ../node_modules/@nodelib/fs.walk/out/readers/common.js
var require_common2 = __commonJS({
  "../node_modules/@nodelib/fs.walk/out/readers/common.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.joinPathSegments = exports.replacePathSegmentSeparator = exports.isAppliedFilter = exports.isFatalError = void 0;
    function isFatalError(settings, error) {
      return settings.errorFilter === null ? !0 : !settings.errorFilter(error);
    }
    exports.isFatalError = isFatalError;
    function isAppliedFilter(filter, value) {
      return filter === null || filter(value);
    }
    exports.isAppliedFilter = isAppliedFilter;
    function replacePathSegmentSeparator(filepath, separator) {
      return filepath.split(/[/\\]/).join(separator);
    }
    exports.replacePathSegmentSeparator = replacePathSegmentSeparator;
    function joinPathSegments(a, b, separator) {
      return a === "" ? b : a.endsWith(separator) ? a + b : a + separator + b;
    }
    exports.joinPathSegments = joinPathSegments;
  }
});

// ../node_modules/@nodelib/fs.walk/out/readers/reader.js
var require_reader = __commonJS({
  "../node_modules/@nodelib/fs.walk/out/readers/reader.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var common = require_common2(), Reader = class {
      constructor(_root, _settings) {
        this._root = _root, this._settings = _settings, this._root = common.replacePathSegmentSeparator(_root, _settings.pathSegmentSeparator);
      }
    };
    exports.default = Reader;
  }
});

// ../node_modules/@nodelib/fs.walk/out/readers/async.js
var require_async3 = __commonJS({
  "../node_modules/@nodelib/fs.walk/out/readers/async.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var events_1 = __require("events"), fsScandir = require_out2(), fastq = require_queue(), common = require_common2(), reader_1 = require_reader(), AsyncReader = class extends reader_1.default {
      constructor(_root, _settings) {
        super(_root, _settings), this._settings = _settings, this._scandir = fsScandir.scandir, this._emitter = new events_1.EventEmitter(), this._queue = fastq(this._worker.bind(this), this._settings.concurrency), this._isFatalError = !1, this._isDestroyed = !1, this._queue.drain = () => {
          this._isFatalError || this._emitter.emit("end");
        };
      }
      read() {
        return this._isFatalError = !1, this._isDestroyed = !1, setImmediate(() => {
          this._pushToQueue(this._root, this._settings.basePath);
        }), this._emitter;
      }
      get isDestroyed() {
        return this._isDestroyed;
      }
      destroy() {
        if (this._isDestroyed)
          throw new Error("The reader is already destroyed");
        this._isDestroyed = !0, this._queue.killAndDrain();
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
        let queueItem = { directory, base };
        this._queue.push(queueItem, (error) => {
          error !== null && this._handleError(error);
        });
      }
      _worker(item, done) {
        this._scandir(item.directory, this._settings.fsScandirSettings, (error, entries) => {
          if (error !== null) {
            done(error, void 0);
            return;
          }
          for (let entry of entries)
            this._handleEntry(entry, item.base);
          done(null, void 0);
        });
      }
      _handleError(error) {
        this._isDestroyed || !common.isFatalError(this._settings, error) || (this._isFatalError = !0, this._isDestroyed = !0, this._emitter.emit("error", error));
      }
      _handleEntry(entry, base) {
        if (this._isDestroyed || this._isFatalError)
          return;
        let fullpath = entry.path;
        base !== void 0 && (entry.path = common.joinPathSegments(base, entry.name, this._settings.pathSegmentSeparator)), common.isAppliedFilter(this._settings.entryFilter, entry) && this._emitEntry(entry), entry.dirent.isDirectory() && common.isAppliedFilter(this._settings.deepFilter, entry) && this._pushToQueue(fullpath, base === void 0 ? void 0 : entry.path);
      }
      _emitEntry(entry) {
        this._emitter.emit("entry", entry);
      }
    };
    exports.default = AsyncReader;
  }
});

// ../node_modules/@nodelib/fs.walk/out/providers/async.js
var require_async4 = __commonJS({
  "../node_modules/@nodelib/fs.walk/out/providers/async.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var async_1 = require_async3(), AsyncProvider = class {
      constructor(_root, _settings) {
        this._root = _root, this._settings = _settings, this._reader = new async_1.default(this._root, this._settings), this._storage = [];
      }
      read(callback) {
        this._reader.onError((error) => {
          callFailureCallback(callback, error);
        }), this._reader.onEntry((entry) => {
          this._storage.push(entry);
        }), this._reader.onEnd(() => {
          callSuccessCallback(callback, this._storage);
        }), this._reader.read();
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

// ../node_modules/@nodelib/fs.walk/out/providers/stream.js
var require_stream2 = __commonJS({
  "../node_modules/@nodelib/fs.walk/out/providers/stream.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var stream_1 = __require("stream"), async_1 = require_async3(), StreamProvider = class {
      constructor(_root, _settings) {
        this._root = _root, this._settings = _settings, this._reader = new async_1.default(this._root, this._settings), this._stream = new stream_1.Readable({
          objectMode: !0,
          read: () => {
          },
          destroy: () => {
            this._reader.isDestroyed || this._reader.destroy();
          }
        });
      }
      read() {
        return this._reader.onError((error) => {
          this._stream.emit("error", error);
        }), this._reader.onEntry((entry) => {
          this._stream.push(entry);
        }), this._reader.onEnd(() => {
          this._stream.push(null);
        }), this._reader.read(), this._stream;
      }
    };
    exports.default = StreamProvider;
  }
});

// ../node_modules/@nodelib/fs.walk/out/readers/sync.js
var require_sync3 = __commonJS({
  "../node_modules/@nodelib/fs.walk/out/readers/sync.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var fsScandir = require_out2(), common = require_common2(), reader_1 = require_reader(), SyncReader = class extends reader_1.default {
      constructor() {
        super(...arguments), this._scandir = fsScandir.scandirSync, this._storage = [], this._queue = /* @__PURE__ */ new Set();
      }
      read() {
        return this._pushToQueue(this._root, this._settings.basePath), this._handleQueue(), this._storage;
      }
      _pushToQueue(directory, base) {
        this._queue.add({ directory, base });
      }
      _handleQueue() {
        for (let item of this._queue.values())
          this._handleDirectory(item.directory, item.base);
      }
      _handleDirectory(directory, base) {
        try {
          let entries = this._scandir(directory, this._settings.fsScandirSettings);
          for (let entry of entries)
            this._handleEntry(entry, base);
        } catch (error) {
          this._handleError(error);
        }
      }
      _handleError(error) {
        if (common.isFatalError(this._settings, error))
          throw error;
      }
      _handleEntry(entry, base) {
        let fullpath = entry.path;
        base !== void 0 && (entry.path = common.joinPathSegments(base, entry.name, this._settings.pathSegmentSeparator)), common.isAppliedFilter(this._settings.entryFilter, entry) && this._pushToStorage(entry), entry.dirent.isDirectory() && common.isAppliedFilter(this._settings.deepFilter, entry) && this._pushToQueue(fullpath, base === void 0 ? void 0 : entry.path);
      }
      _pushToStorage(entry) {
        this._storage.push(entry);
      }
    };
    exports.default = SyncReader;
  }
});

// ../node_modules/@nodelib/fs.walk/out/providers/sync.js
var require_sync4 = __commonJS({
  "../node_modules/@nodelib/fs.walk/out/providers/sync.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var sync_1 = require_sync3(), SyncProvider = class {
      constructor(_root, _settings) {
        this._root = _root, this._settings = _settings, this._reader = new sync_1.default(this._root, this._settings);
      }
      read() {
        return this._reader.read();
      }
    };
    exports.default = SyncProvider;
  }
});

// ../node_modules/@nodelib/fs.walk/out/settings.js
var require_settings3 = __commonJS({
  "../node_modules/@nodelib/fs.walk/out/settings.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var path2 = __require("path"), fsScandir = require_out2(), Settings = class {
      constructor(_options = {}) {
        this._options = _options, this.basePath = this._getValue(this._options.basePath, void 0), this.concurrency = this._getValue(this._options.concurrency, Number.POSITIVE_INFINITY), this.deepFilter = this._getValue(this._options.deepFilter, null), this.entryFilter = this._getValue(this._options.entryFilter, null), this.errorFilter = this._getValue(this._options.errorFilter, null), this.pathSegmentSeparator = this._getValue(this._options.pathSegmentSeparator, path2.sep), this.fsScandirSettings = new fsScandir.Settings({
          followSymbolicLinks: this._options.followSymbolicLinks,
          fs: this._options.fs,
          pathSegmentSeparator: this._options.pathSegmentSeparator,
          stats: this._options.stats,
          throwErrorOnBrokenSymbolicLink: this._options.throwErrorOnBrokenSymbolicLink
        });
      }
      _getValue(option, value) {
        return option ?? value;
      }
    };
    exports.default = Settings;
  }
});

// ../node_modules/@nodelib/fs.walk/out/index.js
var require_out3 = __commonJS({
  "../node_modules/@nodelib/fs.walk/out/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.Settings = exports.walkStream = exports.walkSync = exports.walk = void 0;
    var async_1 = require_async4(), stream_1 = require_stream2(), sync_1 = require_sync4(), settings_1 = require_settings3();
    exports.Settings = settings_1.default;
    function walk(directory, optionsOrSettingsOrCallback, callback) {
      if (typeof optionsOrSettingsOrCallback == "function") {
        new async_1.default(directory, getSettings()).read(optionsOrSettingsOrCallback);
        return;
      }
      new async_1.default(directory, getSettings(optionsOrSettingsOrCallback)).read(callback);
    }
    exports.walk = walk;
    function walkSync(directory, optionsOrSettings) {
      let settings = getSettings(optionsOrSettings);
      return new sync_1.default(directory, settings).read();
    }
    exports.walkSync = walkSync;
    function walkStream(directory, optionsOrSettings) {
      let settings = getSettings(optionsOrSettings);
      return new stream_1.default(directory, settings).read();
    }
    exports.walkStream = walkStream;
    function getSettings(settingsOrOptions = {}) {
      return settingsOrOptions instanceof settings_1.default ? settingsOrOptions : new settings_1.default(settingsOrOptions);
    }
  }
});

// ../node_modules/fast-glob/out/readers/reader.js
var require_reader2 = __commonJS({
  "../node_modules/fast-glob/out/readers/reader.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var path2 = __require("path"), fsStat = require_out(), utils = require_utils3(), Reader = class {
      constructor(_settings) {
        this._settings = _settings, this._fsStatSettings = new fsStat.Settings({
          followSymbolicLink: this._settings.followSymbolicLinks,
          fs: this._settings.fs,
          throwErrorOnBrokenSymbolicLink: this._settings.followSymbolicLinks
        });
      }
      _getFullEntryPath(filepath) {
        return path2.resolve(this._settings.cwd, filepath);
      }
      _makeEntry(stats, pattern) {
        let entry = {
          name: pattern,
          path: pattern,
          dirent: utils.fs.createDirentFromStats(pattern, stats)
        };
        return this._settings.stats && (entry.stats = stats), entry;
      }
      _isFatalError(error) {
        return !utils.errno.isEnoentCodeError(error) && !this._settings.suppressErrors;
      }
    };
    exports.default = Reader;
  }
});

// ../node_modules/fast-glob/out/readers/stream.js
var require_stream3 = __commonJS({
  "../node_modules/fast-glob/out/readers/stream.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var stream_1 = __require("stream"), fsStat = require_out(), fsWalk = require_out3(), reader_1 = require_reader2(), ReaderStream = class extends reader_1.default {
      constructor() {
        super(...arguments), this._walkStream = fsWalk.walkStream, this._stat = fsStat.stat;
      }
      dynamic(root, options) {
        return this._walkStream(root, options);
      }
      static(patterns, options) {
        let filepaths = patterns.map(this._getFullEntryPath, this), stream = new stream_1.PassThrough({ objectMode: !0 });
        stream._write = (index, _enc, done) => this._getEntry(filepaths[index], patterns[index], options).then((entry) => {
          entry !== null && options.entryFilter(entry) && stream.push(entry), index === filepaths.length - 1 && stream.end(), done();
        }).catch(done);
        for (let i = 0; i < filepaths.length; i++)
          stream.write(i);
        return stream;
      }
      _getEntry(filepath, pattern, options) {
        return this._getStat(filepath).then((stats) => this._makeEntry(stats, pattern)).catch((error) => {
          if (options.errorFilter(error))
            return null;
          throw error;
        });
      }
      _getStat(filepath) {
        return new Promise((resolve, reject) => {
          this._stat(filepath, this._fsStatSettings, (error, stats) => error === null ? resolve(stats) : reject(error));
        });
      }
    };
    exports.default = ReaderStream;
  }
});

// ../node_modules/fast-glob/out/readers/async.js
var require_async5 = __commonJS({
  "../node_modules/fast-glob/out/readers/async.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var fsWalk = require_out3(), reader_1 = require_reader2(), stream_1 = require_stream3(), ReaderAsync = class extends reader_1.default {
      constructor() {
        super(...arguments), this._walkAsync = fsWalk.walk, this._readerStream = new stream_1.default(this._settings);
      }
      dynamic(root, options) {
        return new Promise((resolve, reject) => {
          this._walkAsync(root, options, (error, entries) => {
            error === null ? resolve(entries) : reject(error);
          });
        });
      }
      async static(patterns, options) {
        let entries = [], stream = this._readerStream.static(patterns, options);
        return new Promise((resolve, reject) => {
          stream.once("error", reject), stream.on("data", (entry) => entries.push(entry)), stream.once("end", () => resolve(entries));
        });
      }
    };
    exports.default = ReaderAsync;
  }
});

// ../node_modules/fast-glob/out/providers/matchers/matcher.js
var require_matcher = __commonJS({
  "../node_modules/fast-glob/out/providers/matchers/matcher.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var utils = require_utils3(), Matcher = class {
      constructor(_patterns, _settings, _micromatchOptions) {
        this._patterns = _patterns, this._settings = _settings, this._micromatchOptions = _micromatchOptions, this._storage = [], this._fillStorage();
      }
      _fillStorage() {
        for (let pattern of this._patterns) {
          let segments = this._getPatternSegments(pattern), sections = this._splitSegmentsIntoSections(segments);
          this._storage.push({
            complete: sections.length <= 1,
            pattern,
            segments,
            sections
          });
        }
      }
      _getPatternSegments(pattern) {
        return utils.pattern.getPatternParts(pattern, this._micromatchOptions).map((part) => utils.pattern.isDynamicPattern(part, this._settings) ? {
          dynamic: !0,
          pattern: part,
          patternRe: utils.pattern.makeRe(part, this._micromatchOptions)
        } : {
          dynamic: !1,
          pattern: part
        });
      }
      _splitSegmentsIntoSections(segments) {
        return utils.array.splitWhen(segments, (segment) => segment.dynamic && utils.pattern.hasGlobStar(segment.pattern));
      }
    };
    exports.default = Matcher;
  }
});

// ../node_modules/fast-glob/out/providers/matchers/partial.js
var require_partial = __commonJS({
  "../node_modules/fast-glob/out/providers/matchers/partial.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var matcher_1 = require_matcher(), PartialMatcher = class extends matcher_1.default {
      match(filepath) {
        let parts = filepath.split("/"), levels = parts.length, patterns = this._storage.filter((info) => !info.complete || info.segments.length > levels);
        for (let pattern of patterns) {
          let section = pattern.sections[0];
          if (!pattern.complete && levels > section.length || parts.every((part, index) => {
            let segment = pattern.segments[index];
            return !!(segment.dynamic && segment.patternRe.test(part) || !segment.dynamic && segment.pattern === part);
          }))
            return !0;
        }
        return !1;
      }
    };
    exports.default = PartialMatcher;
  }
});

// ../node_modules/fast-glob/out/providers/filters/deep.js
var require_deep = __commonJS({
  "../node_modules/fast-glob/out/providers/filters/deep.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var utils = require_utils3(), partial_1 = require_partial(), DeepFilter = class {
      constructor(_settings, _micromatchOptions) {
        this._settings = _settings, this._micromatchOptions = _micromatchOptions;
      }
      getFilter(basePath, positive, negative) {
        let matcher = this._getMatcher(positive), negativeRe = this._getNegativePatternsRe(negative);
        return (entry) => this._filter(basePath, entry, matcher, negativeRe);
      }
      _getMatcher(patterns) {
        return new partial_1.default(patterns, this._settings, this._micromatchOptions);
      }
      _getNegativePatternsRe(patterns) {
        let affectDepthOfReadingPatterns = patterns.filter(utils.pattern.isAffectDepthOfReadingPattern);
        return utils.pattern.convertPatternsToRe(affectDepthOfReadingPatterns, this._micromatchOptions);
      }
      _filter(basePath, entry, matcher, negativeRe) {
        if (this._isSkippedByDeep(basePath, entry.path) || this._isSkippedSymbolicLink(entry))
          return !1;
        let filepath = utils.path.removeLeadingDotSegment(entry.path);
        return this._isSkippedByPositivePatterns(filepath, matcher) ? !1 : this._isSkippedByNegativePatterns(filepath, negativeRe);
      }
      _isSkippedByDeep(basePath, entryPath) {
        return this._settings.deep === 1 / 0 ? !1 : this._getEntryLevel(basePath, entryPath) >= this._settings.deep;
      }
      _getEntryLevel(basePath, entryPath) {
        let entryPathDepth = entryPath.split("/").length;
        if (basePath === "")
          return entryPathDepth;
        let basePathDepth = basePath.split("/").length;
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

// ../node_modules/fast-glob/out/providers/filters/entry.js
var require_entry = __commonJS({
  "../node_modules/fast-glob/out/providers/filters/entry.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var utils = require_utils3(), EntryFilter = class {
      constructor(_settings, _micromatchOptions) {
        this._settings = _settings, this._micromatchOptions = _micromatchOptions, this.index = /* @__PURE__ */ new Map();
      }
      getFilter(positive, negative) {
        let [absoluteNegative, relativeNegative] = utils.pattern.partitionAbsoluteAndRelative(negative), patterns = {
          positive: {
            all: utils.pattern.convertPatternsToRe(positive, this._micromatchOptions)
          },
          negative: {
            absolute: utils.pattern.convertPatternsToRe(absoluteNegative, Object.assign(Object.assign({}, this._micromatchOptions), { dot: !0 })),
            relative: utils.pattern.convertPatternsToRe(relativeNegative, Object.assign(Object.assign({}, this._micromatchOptions), { dot: !0 }))
          }
        };
        return (entry) => this._filter(entry, patterns);
      }
      _filter(entry, patterns) {
        let filepath = utils.path.removeLeadingDotSegment(entry.path);
        if (this._settings.unique && this._isDuplicateEntry(filepath) || this._onlyFileFilter(entry) || this._onlyDirectoryFilter(entry))
          return !1;
        let isMatched = this._isMatchToPatternsSet(filepath, patterns, entry.dirent.isDirectory());
        return this._settings.unique && isMatched && this._createIndexRecord(filepath), isMatched;
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
      _isMatchToPatternsSet(filepath, patterns, isDirectory2) {
        return !(!this._isMatchToPatterns(filepath, patterns.positive.all, isDirectory2) || this._isMatchToPatterns(filepath, patterns.negative.relative, isDirectory2) || this._isMatchToAbsoluteNegative(filepath, patterns.negative.absolute, isDirectory2));
      }
      _isMatchToAbsoluteNegative(filepath, patternsRe, isDirectory2) {
        if (patternsRe.length === 0)
          return !1;
        let fullpath = utils.path.makeAbsolute(this._settings.cwd, filepath);
        return this._isMatchToPatterns(fullpath, patternsRe, isDirectory2);
      }
      _isMatchToPatterns(filepath, patternsRe, isDirectory2) {
        if (patternsRe.length === 0)
          return !1;
        let isMatched = utils.pattern.matchAny(filepath, patternsRe);
        return !isMatched && isDirectory2 ? utils.pattern.matchAny(filepath + "/", patternsRe) : isMatched;
      }
    };
    exports.default = EntryFilter;
  }
});

// ../node_modules/fast-glob/out/providers/filters/error.js
var require_error = __commonJS({
  "../node_modules/fast-glob/out/providers/filters/error.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var utils = require_utils3(), ErrorFilter = class {
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

// ../node_modules/fast-glob/out/providers/transformers/entry.js
var require_entry2 = __commonJS({
  "../node_modules/fast-glob/out/providers/transformers/entry.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var utils = require_utils3(), EntryTransformer = class {
      constructor(_settings) {
        this._settings = _settings;
      }
      getTransformer() {
        return (entry) => this._transform(entry);
      }
      _transform(entry) {
        let filepath = entry.path;
        return this._settings.absolute && (filepath = utils.path.makeAbsolute(this._settings.cwd, filepath), filepath = utils.path.unixify(filepath)), this._settings.markDirectories && entry.dirent.isDirectory() && (filepath += "/"), this._settings.objectMode ? Object.assign(Object.assign({}, entry), { path: filepath }) : filepath;
      }
    };
    exports.default = EntryTransformer;
  }
});

// ../node_modules/fast-glob/out/providers/provider.js
var require_provider = __commonJS({
  "../node_modules/fast-glob/out/providers/provider.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var path2 = __require("path"), deep_1 = require_deep(), entry_1 = require_entry(), error_1 = require_error(), entry_2 = require_entry2(), Provider = class {
      constructor(_settings) {
        this._settings = _settings, this.errorFilter = new error_1.default(this._settings), this.entryFilter = new entry_1.default(this._settings, this._getMicromatchOptions()), this.deepFilter = new deep_1.default(this._settings, this._getMicromatchOptions()), this.entryTransformer = new entry_2.default(this._settings);
      }
      _getRootDirectory(task) {
        return path2.resolve(this._settings.cwd, task.base);
      }
      _getReaderOptions(task) {
        let basePath = task.base === "." ? "" : task.base;
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
          posix: !0,
          strictSlashes: !1
        };
      }
    };
    exports.default = Provider;
  }
});

// ../node_modules/fast-glob/out/providers/async.js
var require_async6 = __commonJS({
  "../node_modules/fast-glob/out/providers/async.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var async_1 = require_async5(), provider_1 = require_provider(), ProviderAsync = class extends provider_1.default {
      constructor() {
        super(...arguments), this._reader = new async_1.default(this._settings);
      }
      async read(task) {
        let root = this._getRootDirectory(task), options = this._getReaderOptions(task);
        return (await this.api(root, task, options)).map((entry) => options.transform(entry));
      }
      api(root, task, options) {
        return task.dynamic ? this._reader.dynamic(root, options) : this._reader.static(task.patterns, options);
      }
    };
    exports.default = ProviderAsync;
  }
});

// ../node_modules/fast-glob/out/providers/stream.js
var require_stream4 = __commonJS({
  "../node_modules/fast-glob/out/providers/stream.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var stream_1 = __require("stream"), stream_2 = require_stream3(), provider_1 = require_provider(), ProviderStream = class extends provider_1.default {
      constructor() {
        super(...arguments), this._reader = new stream_2.default(this._settings);
      }
      read(task) {
        let root = this._getRootDirectory(task), options = this._getReaderOptions(task), source = this.api(root, task, options), destination = new stream_1.Readable({ objectMode: !0, read: () => {
        } });
        return source.once("error", (error) => destination.emit("error", error)).on("data", (entry) => destination.emit("data", options.transform(entry))).once("end", () => destination.emit("end")), destination.once("close", () => source.destroy()), destination;
      }
      api(root, task, options) {
        return task.dynamic ? this._reader.dynamic(root, options) : this._reader.static(task.patterns, options);
      }
    };
    exports.default = ProviderStream;
  }
});

// ../node_modules/fast-glob/out/readers/sync.js
var require_sync5 = __commonJS({
  "../node_modules/fast-glob/out/readers/sync.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var fsStat = require_out(), fsWalk = require_out3(), reader_1 = require_reader2(), ReaderSync = class extends reader_1.default {
      constructor() {
        super(...arguments), this._walkSync = fsWalk.walkSync, this._statSync = fsStat.statSync;
      }
      dynamic(root, options) {
        return this._walkSync(root, options);
      }
      static(patterns, options) {
        let entries = [];
        for (let pattern of patterns) {
          let filepath = this._getFullEntryPath(pattern), entry = this._getEntry(filepath, pattern, options);
          entry === null || !options.entryFilter(entry) || entries.push(entry);
        }
        return entries;
      }
      _getEntry(filepath, pattern, options) {
        try {
          let stats = this._getStat(filepath);
          return this._makeEntry(stats, pattern);
        } catch (error) {
          if (options.errorFilter(error))
            return null;
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

// ../node_modules/fast-glob/out/providers/sync.js
var require_sync6 = __commonJS({
  "../node_modules/fast-glob/out/providers/sync.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    var sync_1 = require_sync5(), provider_1 = require_provider(), ProviderSync = class extends provider_1.default {
      constructor() {
        super(...arguments), this._reader = new sync_1.default(this._settings);
      }
      read(task) {
        let root = this._getRootDirectory(task), options = this._getReaderOptions(task);
        return this.api(root, task, options).map(options.transform);
      }
      api(root, task, options) {
        return task.dynamic ? this._reader.dynamic(root, options) : this._reader.static(task.patterns, options);
      }
    };
    exports.default = ProviderSync;
  }
});

// ../node_modules/fast-glob/out/settings.js
var require_settings4 = __commonJS({
  "../node_modules/fast-glob/out/settings.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: !0 });
    exports.DEFAULT_FILE_SYSTEM_ADAPTER = void 0;
    var fs4 = __require("fs"), os = __require("os"), CPU_COUNT = Math.max(os.cpus().length, 1);
    exports.DEFAULT_FILE_SYSTEM_ADAPTER = {
      lstat: fs4.lstat,
      lstatSync: fs4.lstatSync,
      stat: fs4.stat,
      statSync: fs4.statSync,
      readdir: fs4.readdir,
      readdirSync: fs4.readdirSync
    };
    var Settings = class {
      constructor(_options = {}) {
        this._options = _options, this.absolute = this._getValue(this._options.absolute, !1), this.baseNameMatch = this._getValue(this._options.baseNameMatch, !1), this.braceExpansion = this._getValue(this._options.braceExpansion, !0), this.caseSensitiveMatch = this._getValue(this._options.caseSensitiveMatch, !0), this.concurrency = this._getValue(this._options.concurrency, CPU_COUNT), this.cwd = this._getValue(this._options.cwd, process.cwd()), this.deep = this._getValue(this._options.deep, 1 / 0), this.dot = this._getValue(this._options.dot, !1), this.extglob = this._getValue(this._options.extglob, !0), this.followSymbolicLinks = this._getValue(this._options.followSymbolicLinks, !0), this.fs = this._getFileSystemMethods(this._options.fs), this.globstar = this._getValue(this._options.globstar, !0), this.ignore = this._getValue(this._options.ignore, []), this.markDirectories = this._getValue(this._options.markDirectories, !1), this.objectMode = this._getValue(this._options.objectMode, !1), this.onlyDirectories = this._getValue(this._options.onlyDirectories, !1), this.onlyFiles = this._getValue(this._options.onlyFiles, !0), this.stats = this._getValue(this._options.stats, !1), this.suppressErrors = this._getValue(this._options.suppressErrors, !1), this.throwErrorOnBrokenSymbolicLink = this._getValue(this._options.throwErrorOnBrokenSymbolicLink, !1), this.unique = this._getValue(this._options.unique, !0), this.onlyDirectories && (this.onlyFiles = !1), this.stats && (this.objectMode = !0), this.ignore = [].concat(this.ignore);
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

// ../node_modules/fast-glob/out/index.js
var require_out4 = __commonJS({
  "../node_modules/fast-glob/out/index.js"(exports, module) {
    "use strict";
    var taskManager = require_tasks(), async_1 = require_async6(), stream_1 = require_stream4(), sync_1 = require_sync6(), settings_1 = require_settings4(), utils = require_utils3();
    async function FastGlob(source, options) {
      assertPatternsInput2(source);
      let works = getWorks(source, async_1.default, options), result = await Promise.all(works);
      return utils.array.flatten(result);
    }
    (function(FastGlob2) {
      FastGlob2.glob = FastGlob2, FastGlob2.globSync = sync, FastGlob2.globStream = stream, FastGlob2.async = FastGlob2;
      function sync(source, options) {
        assertPatternsInput2(source);
        let works = getWorks(source, sync_1.default, options);
        return utils.array.flatten(works);
      }
      FastGlob2.sync = sync;
      function stream(source, options) {
        assertPatternsInput2(source);
        let works = getWorks(source, stream_1.default, options);
        return utils.stream.merge(works);
      }
      FastGlob2.stream = stream;
      function generateTasks2(source, options) {
        assertPatternsInput2(source);
        let patterns = [].concat(source), settings = new settings_1.default(options);
        return taskManager.generate(patterns, settings);
      }
      FastGlob2.generateTasks = generateTasks2;
      function isDynamicPattern2(source, options) {
        assertPatternsInput2(source);
        let settings = new settings_1.default(options);
        return utils.pattern.isDynamicPattern(source, settings);
      }
      FastGlob2.isDynamicPattern = isDynamicPattern2;
      function escapePath(source) {
        return assertPatternsInput2(source), utils.path.escape(source);
      }
      FastGlob2.escapePath = escapePath;
      function convertPathToPattern2(source) {
        return assertPatternsInput2(source), utils.path.convertPathToPattern(source);
      }
      FastGlob2.convertPathToPattern = convertPathToPattern2;
      let posix;
      (function(posix2) {
        function escapePath2(source) {
          return assertPatternsInput2(source), utils.path.escapePosixPath(source);
        }
        posix2.escapePath = escapePath2;
        function convertPathToPattern3(source) {
          return assertPatternsInput2(source), utils.path.convertPosixPathToPattern(source);
        }
        posix2.convertPathToPattern = convertPathToPattern3;
      })(posix = FastGlob2.posix || (FastGlob2.posix = {}));
      let win32;
      (function(win322) {
        function escapePath2(source) {
          return assertPatternsInput2(source), utils.path.escapeWindowsPath(source);
        }
        win322.escapePath = escapePath2;
        function convertPathToPattern3(source) {
          return assertPatternsInput2(source), utils.path.convertWindowsPathToPattern(source);
        }
        win322.convertPathToPattern = convertPathToPattern3;
      })(win32 = FastGlob2.win32 || (FastGlob2.win32 = {}));
    })(FastGlob || (FastGlob = {}));
    function getWorks(source, _Provider, options) {
      let patterns = [].concat(source), settings = new settings_1.default(options), tasks = taskManager.generate(patterns, settings), provider = new _Provider(settings);
      return tasks.map(provider.read, provider);
    }
    function assertPatternsInput2(input) {
      if (![].concat(input).every((item) => utils.string.isString(item) && !utils.string.isEmpty(item)))
        throw new TypeError("Patterns must be a string (non empty) or an array of strings");
    }
    module.exports = FastGlob;
  }
});

// ../node_modules/globby/node_modules/ignore/index.js
var require_ignore = __commonJS({
  "../node_modules/globby/node_modules/ignore/index.js"(exports, module) {
    function makeArray(subject) {
      return Array.isArray(subject) ? subject : [subject];
    }
    var UNDEFINED = void 0, EMPTY = "", SPACE = " ", ESCAPE = "\\", REGEX_TEST_BLANK_LINE = /^\s+$/, REGEX_INVALID_TRAILING_BACKSLASH = /(?:[^\\]|^)\\$/, REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION = /^\\!/, REGEX_REPLACE_LEADING_EXCAPED_HASH = /^\\#/, REGEX_SPLITALL_CRLF = /\r?\n/g, REGEX_TEST_INVALID_PATH = /^\.{0,2}\/|^\.{1,2}$/, REGEX_TEST_TRAILING_SLASH = /\/$/, SLASH = "/", TMP_KEY_IGNORE = "node-ignore";
    typeof Symbol < "u" && (TMP_KEY_IGNORE = Symbol.for("node-ignore"));
    var KEY_IGNORE = TMP_KEY_IGNORE, define = (object, key, value) => (Object.defineProperty(object, key, { value }), value), REGEX_REGEXP_RANGE = /([0-z])-([0-z])/g, RETURN_FALSE = () => !1, sanitizeRange = (range) => range.replace(
      REGEX_REGEXP_RANGE,
      (match, from, to) => from.charCodeAt(0) <= to.charCodeAt(0) ? match : EMPTY
    ), cleanRangeBackSlash = (slashes) => {
      let { length } = slashes;
      return slashes.slice(0, length - length % 2);
    }, REPLACERS = [
      [
        // Remove BOM
        // TODO:
        // Other similar zero-width characters?
        /^\uFEFF/,
        () => EMPTY
      ],
      // > Trailing spaces are ignored unless they are quoted with backslash ("\")
      [
        // (a\ ) -> (a )
        // (a  ) -> (a)
        // (a ) -> (a)
        // (a \ ) -> (a  )
        /((?:\\\\)*?)(\\?\s+)$/,
        (_, m1, m2) => m1 + (m2.indexOf("\\") === 0 ? SPACE : EMPTY)
      ],
      // Replace (\ ) with ' '
      // (\ ) -> ' '
      // (\\ ) -> '\\ '
      // (\\\ ) -> '\\ '
      [
        /(\\+?)\s/g,
        (_, m1) => {
          let { length } = m1;
          return m1.slice(0, length - length % 2) + SPACE;
        }
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
        function() {
          return /\/(?!$)/.test(this) ? "^" : "(?:^|\\/)";
        }
      ],
      // two globstars
      [
        // Use lookahead assertions so that we could match more than one `'/**'`
        /\\\/\\\*\\\*(?=\\\/|$)/g,
        // Zero, one or several directories
        // should not use '*', or it will be replaced by the next replacer
        // Check if it is not the last `'/**'`
        (_, index, str) => index + 6 < str.length ? "(?:\\/[^\\/]+)*" : "\\/.+"
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
          let unescaped = p2.replace(/\\\*/g, "[^\\/]*");
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
        (match, leadEscape, range, endEscape, close) => leadEscape === ESCAPE ? `\\[${range}${cleanRangeBackSlash(endEscape)}${close}` : close === "]" && endEscape.length % 2 === 0 ? `[${sanitizeRange(range)}${endEscape}]` : "[]"
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
      ]
    ], REGEX_REPLACE_TRAILING_WILDCARD = /(^|\\\/)?\\\*$/, MODE_IGNORE = "regex", MODE_CHECK_IGNORE = "checkRegex", UNDERSCORE = "_", TRAILING_WILD_CARD_REPLACERS = {
      [MODE_IGNORE](_, p1) {
        return `${p1 ? `${p1}[^/]+` : "[^/]*"}(?=$|\\/$)`;
      },
      [MODE_CHECK_IGNORE](_, p1) {
        return `${p1 ? `${p1}[^/]*` : "[^/]*"}(?=$|\\/$)`;
      }
    }, makeRegexPrefix = (pattern) => REPLACERS.reduce(
      (prev, [matcher, replacer]) => prev.replace(matcher, replacer.bind(pattern)),
      pattern
    ), isString = (subject) => typeof subject == "string", checkPattern = (pattern) => pattern && isString(pattern) && !REGEX_TEST_BLANK_LINE.test(pattern) && !REGEX_INVALID_TRAILING_BACKSLASH.test(pattern) && pattern.indexOf("#") !== 0, splitPattern = (pattern) => pattern.split(REGEX_SPLITALL_CRLF).filter(Boolean), IgnoreRule = class {
      constructor(pattern, mark, body, ignoreCase, negative, prefix) {
        this.pattern = pattern, this.mark = mark, this.negative = negative, define(this, "body", body), define(this, "ignoreCase", ignoreCase), define(this, "regexPrefix", prefix);
      }
      get regex() {
        let key = UNDERSCORE + MODE_IGNORE;
        return this[key] ? this[key] : this._make(MODE_IGNORE, key);
      }
      get checkRegex() {
        let key = UNDERSCORE + MODE_CHECK_IGNORE;
        return this[key] ? this[key] : this._make(MODE_CHECK_IGNORE, key);
      }
      _make(mode, key) {
        let str = this.regexPrefix.replace(
          REGEX_REPLACE_TRAILING_WILDCARD,
          // It does not need to bind pattern
          TRAILING_WILD_CARD_REPLACERS[mode]
        ), regex = this.ignoreCase ? new RegExp(str, "i") : new RegExp(str);
        return define(this, key, regex);
      }
    }, createRule = ({
      pattern,
      mark
    }, ignoreCase) => {
      let negative = !1, body = pattern;
      body.indexOf("!") === 0 && (negative = !0, body = body.substr(1)), body = body.replace(REGEX_REPLACE_LEADING_EXCAPED_EXCLAMATION, "!").replace(REGEX_REPLACE_LEADING_EXCAPED_HASH, "#");
      let regexPrefix = makeRegexPrefix(body);
      return new IgnoreRule(
        pattern,
        mark,
        body,
        ignoreCase,
        negative,
        regexPrefix
      );
    }, RuleManager = class {
      constructor(ignoreCase) {
        this._ignoreCase = ignoreCase, this._rules = [];
      }
      _add(pattern) {
        if (pattern && pattern[KEY_IGNORE]) {
          this._rules = this._rules.concat(pattern._rules._rules), this._added = !0;
          return;
        }
        if (isString(pattern) && (pattern = {
          pattern
        }), checkPattern(pattern.pattern)) {
          let rule = createRule(pattern, this._ignoreCase);
          this._added = !0, this._rules.push(rule);
        }
      }
      // @param {Array<string> | string | Ignore} pattern
      add(pattern) {
        return this._added = !1, makeArray(
          isString(pattern) ? splitPattern(pattern) : pattern
        ).forEach(this._add, this), this._added;
      }
      // Test one single path without recursively checking parent directories
      //
      // - checkUnignored `boolean` whether should check if the path is unignored,
      //   setting `checkUnignored` to `false` could reduce additional
      //   path matching.
      // - check `string` either `MODE_IGNORE` or `MODE_CHECK_IGNORE`
      // @returns {TestResult} true if a file is ignored
      test(path2, checkUnignored, mode) {
        let ignored = !1, unignored = !1, matchedRule;
        this._rules.forEach((rule) => {
          let { negative } = rule;
          unignored === negative && ignored !== unignored || negative && !ignored && !unignored && !checkUnignored || !rule[mode].test(path2) || (ignored = !negative, unignored = negative, matchedRule = negative ? UNDEFINED : rule);
        });
        let ret = {
          ignored,
          unignored
        };
        return matchedRule && (ret.rule = matchedRule), ret;
      }
    }, throwError = (message, Ctor) => {
      throw new Ctor(message);
    }, checkPath = (path2, originalPath, doThrow) => isString(path2) ? path2 ? checkPath.isNotRelative(path2) ? doThrow(
      `path should be a \`path.relative()\`d string, but got "${originalPath}"`,
      RangeError
    ) : !0 : doThrow("path must not be empty", TypeError) : doThrow(
      `path must be a string, but got \`${originalPath}\``,
      TypeError
    ), isNotRelative = (path2) => REGEX_TEST_INVALID_PATH.test(path2);
    checkPath.isNotRelative = isNotRelative;
    checkPath.convert = (p) => p;
    var Ignore = class {
      constructor({
        ignorecase = !0,
        ignoreCase = ignorecase,
        allowRelativePaths = !1
      } = {}) {
        define(this, KEY_IGNORE, !0), this._rules = new RuleManager(ignoreCase), this._strictPathCheck = !allowRelativePaths, this._initCache();
      }
      _initCache() {
        this._ignoreCache = /* @__PURE__ */ Object.create(null), this._testCache = /* @__PURE__ */ Object.create(null);
      }
      add(pattern) {
        return this._rules.add(pattern) && this._initCache(), this;
      }
      // legacy
      addPattern(pattern) {
        return this.add(pattern);
      }
      // @returns {TestResult}
      _test(originalPath, cache, checkUnignored, slices) {
        let path2 = originalPath && checkPath.convert(originalPath);
        return checkPath(
          path2,
          originalPath,
          this._strictPathCheck ? throwError : RETURN_FALSE
        ), this._t(path2, cache, checkUnignored, slices);
      }
      checkIgnore(path2) {
        if (!REGEX_TEST_TRAILING_SLASH.test(path2))
          return this.test(path2);
        let slices = path2.split(SLASH).filter(Boolean);
        if (slices.pop(), slices.length) {
          let parent = this._t(
            slices.join(SLASH) + SLASH,
            this._testCache,
            !0,
            slices
          );
          if (parent.ignored)
            return parent;
        }
        return this._rules.test(path2, !1, MODE_CHECK_IGNORE);
      }
      _t(path2, cache, checkUnignored, slices) {
        if (path2 in cache)
          return cache[path2];
        if (slices || (slices = path2.split(SLASH).filter(Boolean)), slices.pop(), !slices.length)
          return cache[path2] = this._rules.test(path2, checkUnignored, MODE_IGNORE);
        let parent = this._t(
          slices.join(SLASH) + SLASH,
          cache,
          checkUnignored,
          slices
        );
        return cache[path2] = parent.ignored ? parent : this._rules.test(path2, checkUnignored, MODE_IGNORE);
      }
      ignores(path2) {
        return this._test(path2, this._ignoreCache, !1).ignored;
      }
      createFilter() {
        return (path2) => !this.ignores(path2);
      }
      filter(paths) {
        return makeArray(paths).filter(this.createFilter());
      }
      // @returns {TestResult}
      test(path2) {
        return this._test(path2, this._testCache, !0);
      }
    }, factory = (options) => new Ignore(options), isPathValid = (path2) => checkPath(path2 && checkPath.convert(path2), path2, RETURN_FALSE), setupWindows = () => {
      let makePosix = (str) => /^\\\\\?\\/.test(str) || /["<>|\u0000-\u001F]+/u.test(str) ? str : str.replace(/\\/g, "/");
      checkPath.convert = makePosix;
      let REGEX_TEST_WINDOWS_PATH_ABSOLUTE = /^[a-z]:\//i;
      checkPath.isNotRelative = (path2) => REGEX_TEST_WINDOWS_PATH_ABSOLUTE.test(path2) || isNotRelative(path2);
    };
    // Detect `process` so that it can run in browsers.
    typeof process < "u" && process.platform === "win32" && setupWindows();
    module.exports = factory;
    factory.default = factory;
    module.exports.isPathValid = isPathValid;
    define(module.exports, Symbol.for("setupWindows"), setupWindows);
  }
});

// ../node_modules/globby/index.js
import process3 from "node:process";
import fs3 from "node:fs";
import nodePath from "node:path";

// ../node_modules/globby/node_modules/@sindresorhus/merge-streams/index.js
import { on, once } from "node:events";
import { PassThrough as PassThroughStream } from "node:stream";
import { finished } from "node:stream/promises";
function mergeStreams(streams) {
  if (!Array.isArray(streams))
    throw new TypeError(`Expected an array, got \`${typeof streams}\`.`);
  for (let stream of streams)
    validateStream(stream);
  let objectMode = streams.some(({ readableObjectMode }) => readableObjectMode), highWaterMark = getHighWaterMark(streams, objectMode), passThroughStream = new MergedStream({
    objectMode,
    writableHighWaterMark: highWaterMark,
    readableHighWaterMark: highWaterMark
  });
  for (let stream of streams)
    passThroughStream.add(stream);
  return streams.length === 0 && endStream(passThroughStream), passThroughStream;
}
var getHighWaterMark = (streams, objectMode) => {
  if (streams.length === 0)
    return 16384;
  let highWaterMarks = streams.filter(({ readableObjectMode }) => readableObjectMode === objectMode).map(({ readableHighWaterMark }) => readableHighWaterMark);
  return Math.max(...highWaterMarks);
}, MergedStream = class extends PassThroughStream {
  #streams = /* @__PURE__ */ new Set([]);
  #ended = /* @__PURE__ */ new Set([]);
  #aborted = /* @__PURE__ */ new Set([]);
  #onFinished;
  add(stream) {
    validateStream(stream), !this.#streams.has(stream) && (this.#streams.add(stream), this.#onFinished ??= onMergedStreamFinished(this, this.#streams), endWhenStreamsDone({
      passThroughStream: this,
      stream,
      streams: this.#streams,
      ended: this.#ended,
      aborted: this.#aborted,
      onFinished: this.#onFinished
    }), stream.pipe(this, { end: !1 }));
  }
  remove(stream) {
    return validateStream(stream), this.#streams.has(stream) ? (stream.unpipe(this), !0) : !1;
  }
}, onMergedStreamFinished = async (passThroughStream, streams) => {
  updateMaxListeners(passThroughStream, PASSTHROUGH_LISTENERS_COUNT);
  let controller = new AbortController();
  try {
    await Promise.race([
      onMergedStreamEnd(passThroughStream, controller),
      onInputStreamsUnpipe(passThroughStream, streams, controller)
    ]);
  } finally {
    controller.abort(), updateMaxListeners(passThroughStream, -PASSTHROUGH_LISTENERS_COUNT);
  }
}, onMergedStreamEnd = async (passThroughStream, { signal }) => {
  await finished(passThroughStream, { signal, cleanup: !0 });
}, onInputStreamsUnpipe = async (passThroughStream, streams, { signal }) => {
  for await (let [unpipedStream] of on(passThroughStream, "unpipe", { signal }))
    streams.has(unpipedStream) && unpipedStream.emit(unpipeEvent);
}, validateStream = (stream) => {
  if (typeof stream?.pipe != "function")
    throw new TypeError(`Expected a readable stream, got: \`${typeof stream}\`.`);
}, endWhenStreamsDone = async ({ passThroughStream, stream, streams, ended, aborted, onFinished }) => {
  updateMaxListeners(passThroughStream, PASSTHROUGH_LISTENERS_PER_STREAM);
  let controller = new AbortController();
  try {
    await Promise.race([
      afterMergedStreamFinished(onFinished, stream),
      onInputStreamEnd({ passThroughStream, stream, streams, ended, aborted, controller }),
      onInputStreamUnpipe({ stream, streams, ended, aborted, controller })
    ]);
  } finally {
    controller.abort(), updateMaxListeners(passThroughStream, -PASSTHROUGH_LISTENERS_PER_STREAM);
  }
  streams.size === ended.size + aborted.size && (ended.size === 0 && aborted.size > 0 ? abortStream(passThroughStream) : endStream(passThroughStream));
}, isAbortError = (error) => error?.code === "ERR_STREAM_PREMATURE_CLOSE", afterMergedStreamFinished = async (onFinished, stream) => {
  try {
    await onFinished, abortStream(stream);
  } catch (error) {
    isAbortError(error) ? abortStream(stream) : errorStream(stream, error);
  }
}, onInputStreamEnd = async ({ passThroughStream, stream, streams, ended, aborted, controller: { signal } }) => {
  try {
    await finished(stream, { signal, cleanup: !0, readable: !0, writable: !1 }), streams.has(stream) && ended.add(stream);
  } catch (error) {
    if (signal.aborted || !streams.has(stream))
      return;
    isAbortError(error) ? aborted.add(stream) : errorStream(passThroughStream, error);
  }
}, onInputStreamUnpipe = async ({ stream, streams, ended, aborted, controller: { signal } }) => {
  await once(stream, unpipeEvent, { signal }), streams.delete(stream), ended.delete(stream), aborted.delete(stream);
}, unpipeEvent = Symbol("unpipe"), endStream = (stream) => {
  stream.writable && stream.end();
}, abortStream = (stream) => {
  (stream.readable || stream.writable) && stream.destroy();
}, errorStream = (stream, error) => {
  stream.destroyed || (stream.once("error", noop), stream.destroy(error));
}, noop = () => {
}, updateMaxListeners = (passThroughStream, increment) => {
  let maxListeners = passThroughStream.getMaxListeners();
  maxListeners !== 0 && maxListeners !== Number.POSITIVE_INFINITY && passThroughStream.setMaxListeners(maxListeners + increment);
}, PASSTHROUGH_LISTENERS_COUNT = 2, PASSTHROUGH_LISTENERS_PER_STREAM = 1;

// ../node_modules/globby/index.js
var import_fast_glob2 = __toESM(require_out4(), 1);

// ../node_modules/globby/node_modules/path-type/index.js
import fs from "node:fs";
import fsPromises from "node:fs/promises";
async function isType(fsStatType, statsMethodName, filePath) {
  if (typeof filePath != "string")
    throw new TypeError(`Expected a string, got ${typeof filePath}`);
  try {
    return (await fsPromises[fsStatType](filePath))[statsMethodName]();
  } catch (error) {
    if (error.code === "ENOENT")
      return !1;
    throw error;
  }
}
function isTypeSync(fsStatType, statsMethodName, filePath) {
  if (typeof filePath != "string")
    throw new TypeError(`Expected a string, got ${typeof filePath}`);
  try {
    return fs[fsStatType](filePath)[statsMethodName]();
  } catch (error) {
    if (error.code === "ENOENT")
      return !1;
    throw error;
  }
}
var isFile = isType.bind(void 0, "stat", "isFile"), isDirectory = isType.bind(void 0, "stat", "isDirectory"), isSymlink = isType.bind(void 0, "lstat", "isSymbolicLink"), isFileSync = isTypeSync.bind(void 0, "statSync", "isFile"), isDirectorySync = isTypeSync.bind(void 0, "statSync", "isDirectory"), isSymlinkSync = isTypeSync.bind(void 0, "lstatSync", "isSymbolicLink");

// ../node_modules/unicorn-magic/node.js
import { promisify } from "node:util";
import { execFile as execFileCallback, execFileSync as execFileSyncOriginal } from "node:child_process";
import { fileURLToPath } from "node:url";
var execFileOriginal = promisify(execFileCallback);
function toPath(urlOrPath) {
  return urlOrPath instanceof URL ? fileURLToPath(urlOrPath) : urlOrPath;
}
var TEN_MEGABYTES_IN_BYTES = 10 * 1024 * 1024;

// ../node_modules/globby/ignore.js
var import_fast_glob = __toESM(require_out4(), 1), import_ignore = __toESM(require_ignore(), 1);
import process2 from "node:process";
import fs2 from "node:fs";
import fsPromises2 from "node:fs/promises";
import path from "node:path";

// ../node_modules/globby/utilities.js
var isNegativePattern = (pattern) => pattern[0] === "!";

// ../node_modules/globby/ignore.js
var defaultIgnoredDirectories = [
  "**/node_modules",
  "**/flow-typed",
  "**/coverage",
  "**/.git"
], ignoreFilesGlobOptions = {
  absolute: !0,
  dot: !0
}, GITIGNORE_FILES_PATTERN = "**/.gitignore", applyBaseToPattern = (pattern, base) => isNegativePattern(pattern) ? "!" + path.posix.join(base, pattern.slice(1)) : path.posix.join(base, pattern), parseIgnoreFile = (file, cwd) => {
  let base = slash(path.relative(cwd, path.dirname(file.filePath)));
  return file.content.split(/\r?\n/).filter((line) => line && !line.startsWith("#")).map((pattern) => applyBaseToPattern(pattern, base));
}, toRelativePath = (fileOrDirectory, cwd) => {
  if (cwd = slash(cwd), path.isAbsolute(fileOrDirectory)) {
    if (slash(fileOrDirectory).startsWith(cwd))
      return path.relative(cwd, fileOrDirectory);
    throw new Error(`Path ${fileOrDirectory} is not in cwd ${cwd}`);
  }
  return fileOrDirectory;
}, getIsIgnoredPredicate = (files, cwd) => {
  let patterns = files.flatMap((file) => parseIgnoreFile(file, cwd)), ignores = (0, import_ignore.default)().add(patterns);
  return (fileOrDirectory) => (fileOrDirectory = toPath(fileOrDirectory), fileOrDirectory = toRelativePath(fileOrDirectory, cwd), fileOrDirectory ? ignores.ignores(slash(fileOrDirectory)) : !1);
}, normalizeOptions = (options = {}) => ({
  cwd: toPath(options.cwd) ?? process2.cwd(),
  suppressErrors: !!options.suppressErrors,
  deep: typeof options.deep == "number" ? options.deep : Number.POSITIVE_INFINITY,
  ignore: [...options.ignore ?? [], ...defaultIgnoredDirectories]
}), isIgnoredByIgnoreFiles = async (patterns, options) => {
  let { cwd, suppressErrors, deep, ignore } = normalizeOptions(options), paths = await (0, import_fast_glob.default)(patterns, {
    cwd,
    suppressErrors,
    deep,
    ignore,
    ...ignoreFilesGlobOptions
  }), files = await Promise.all(
    paths.map(async (filePath) => ({
      filePath,
      content: await fsPromises2.readFile(filePath, "utf8")
    }))
  );
  return getIsIgnoredPredicate(files, cwd);
}, isIgnoredByIgnoreFilesSync = (patterns, options) => {
  let { cwd, suppressErrors, deep, ignore } = normalizeOptions(options), files = import_fast_glob.default.sync(patterns, {
    cwd,
    suppressErrors,
    deep,
    ignore,
    ...ignoreFilesGlobOptions
  }).map((filePath) => ({
    filePath,
    content: fs2.readFileSync(filePath, "utf8")
  }));
  return getIsIgnoredPredicate(files, cwd);
}, isGitIgnored = (options) => isIgnoredByIgnoreFiles(GITIGNORE_FILES_PATTERN, options), isGitIgnoredSync = (options) => isIgnoredByIgnoreFilesSync(GITIGNORE_FILES_PATTERN, options);

// ../node_modules/globby/index.js
var assertPatternsInput = (patterns) => {
  if (patterns.some((pattern) => typeof pattern != "string"))
    throw new TypeError("Patterns must be a string or an array of strings");
}, normalizePathForDirectoryGlob = (filePath, cwd) => {
  let path2 = isNegativePattern(filePath) ? filePath.slice(1) : filePath;
  return nodePath.isAbsolute(path2) ? path2 : nodePath.join(cwd, path2);
}, getDirectoryGlob = ({ directoryPath, files, extensions }) => {
  let extensionGlob = extensions?.length > 0 ? `.${extensions.length > 1 ? `{${extensions.join(",")}}` : extensions[0]}` : "";
  return files ? files.map((file) => nodePath.posix.join(directoryPath, `**/${nodePath.extname(file) ? file : `${file}${extensionGlob}`}`)) : [nodePath.posix.join(directoryPath, `**${extensionGlob ? `/*${extensionGlob}` : ""}`)];
}, directoryToGlob = async (directoryPaths, {
  cwd = process3.cwd(),
  files,
  extensions
} = {}) => (await Promise.all(
  directoryPaths.map(async (directoryPath) => await isDirectory(normalizePathForDirectoryGlob(directoryPath, cwd)) ? getDirectoryGlob({ directoryPath, files, extensions }) : directoryPath)
)).flat(), directoryToGlobSync = (directoryPaths, {
  cwd = process3.cwd(),
  files,
  extensions
} = {}) => directoryPaths.flatMap((directoryPath) => isDirectorySync(normalizePathForDirectoryGlob(directoryPath, cwd)) ? getDirectoryGlob({ directoryPath, files, extensions }) : directoryPath), toPatternsArray = (patterns) => (patterns = [...new Set([patterns].flat())], assertPatternsInput(patterns), patterns), checkCwdOption = (cwd) => {
  if (!cwd)
    return;
  let stat;
  try {
    stat = fs3.statSync(cwd);
  } catch {
    return;
  }
  if (!stat.isDirectory())
    throw new Error("The `cwd` option must be a path to a directory");
}, normalizeOptions2 = (options = {}) => (options = {
  ...options,
  ignore: options.ignore ?? [],
  expandDirectories: options.expandDirectories ?? !0,
  cwd: toPath(options.cwd)
}, checkCwdOption(options.cwd), options), normalizeArguments = (function_) => async (patterns, options) => function_(toPatternsArray(patterns), normalizeOptions2(options)), normalizeArgumentsSync = (function_) => (patterns, options) => function_(toPatternsArray(patterns), normalizeOptions2(options)), getIgnoreFilesPatterns = (options) => {
  let { ignoreFiles, gitignore } = options, patterns = ignoreFiles ? toPatternsArray(ignoreFiles) : [];
  return gitignore && patterns.push(GITIGNORE_FILES_PATTERN), patterns;
}, getFilter = async (options) => {
  let ignoreFilesPatterns = getIgnoreFilesPatterns(options);
  return createFilterFunction(
    ignoreFilesPatterns.length > 0 && await isIgnoredByIgnoreFiles(ignoreFilesPatterns, options)
  );
}, getFilterSync = (options) => {
  let ignoreFilesPatterns = getIgnoreFilesPatterns(options);
  return createFilterFunction(
    ignoreFilesPatterns.length > 0 && isIgnoredByIgnoreFilesSync(ignoreFilesPatterns, options)
  );
}, createFilterFunction = (isIgnored) => {
  let seen = /* @__PURE__ */ new Set();
  return (fastGlobResult) => {
    let pathKey = nodePath.normalize(fastGlobResult.path ?? fastGlobResult);
    return seen.has(pathKey) || isIgnored && isIgnored(pathKey) ? !1 : (seen.add(pathKey), !0);
  };
}, unionFastGlobResults = (results, filter) => results.flat().filter((fastGlobResult) => filter(fastGlobResult)), convertNegativePatterns = (patterns, options) => {
  let tasks = [];
  for (; patterns.length > 0; ) {
    let index = patterns.findIndex((pattern) => isNegativePattern(pattern));
    if (index === -1) {
      tasks.push({ patterns, options });
      break;
    }
    let ignorePattern = patterns[index].slice(1);
    for (let task of tasks)
      task.options.ignore.push(ignorePattern);
    index !== 0 && tasks.push({
      patterns: patterns.slice(0, index),
      options: {
        ...options,
        ignore: [
          ...options.ignore,
          ignorePattern
        ]
      }
    }), patterns = patterns.slice(index + 1);
  }
  return tasks;
}, normalizeExpandDirectoriesOption = (options, cwd) => ({
  ...cwd ? { cwd } : {},
  ...Array.isArray(options) ? { files: options } : options
}), generateTasks = async (patterns, options) => {
  let globTasks = convertNegativePatterns(patterns, options), { cwd, expandDirectories } = options;
  if (!expandDirectories)
    return globTasks;
  let directoryToGlobOptions = normalizeExpandDirectoriesOption(expandDirectories, cwd);
  return Promise.all(
    globTasks.map(async (task) => {
      let { patterns: patterns2, options: options2 } = task;
      return [
        patterns2,
        options2.ignore
      ] = await Promise.all([
        directoryToGlob(patterns2, directoryToGlobOptions),
        directoryToGlob(options2.ignore, { cwd })
      ]), { patterns: patterns2, options: options2 };
    })
  );
}, generateTasksSync = (patterns, options) => {
  let globTasks = convertNegativePatterns(patterns, options), { cwd, expandDirectories } = options;
  if (!expandDirectories)
    return globTasks;
  let directoryToGlobSyncOptions = normalizeExpandDirectoriesOption(expandDirectories, cwd);
  return globTasks.map((task) => {
    let { patterns: patterns2, options: options2 } = task;
    return patterns2 = directoryToGlobSync(patterns2, directoryToGlobSyncOptions), options2.ignore = directoryToGlobSync(options2.ignore, { cwd }), { patterns: patterns2, options: options2 };
  });
}, globby = normalizeArguments(async (patterns, options) => {
  let [
    tasks,
    filter
  ] = await Promise.all([
    generateTasks(patterns, options),
    getFilter(options)
  ]), results = await Promise.all(tasks.map((task) => (0, import_fast_glob2.default)(task.patterns, task.options)));
  return unionFastGlobResults(results, filter);
}), globbySync = normalizeArgumentsSync((patterns, options) => {
  let tasks = generateTasksSync(patterns, options), filter = getFilterSync(options), results = tasks.map((task) => import_fast_glob2.default.sync(task.patterns, task.options));
  return unionFastGlobResults(results, filter);
}), globbyStream = normalizeArgumentsSync((patterns, options) => {
  let tasks = generateTasksSync(patterns, options), filter = getFilterSync(options), streams = tasks.map((task) => import_fast_glob2.default.stream(task.patterns, task.options));
  return mergeStreams(streams).filter((fastGlobResult) => filter(fastGlobResult));
}), isDynamicPattern = normalizeArgumentsSync(
  (patterns, options) => patterns.some((pattern) => import_fast_glob2.default.isDynamicPattern(pattern, options))
), generateGlobTasks = normalizeArguments(generateTasks), generateGlobTasksSync = normalizeArgumentsSync(generateTasksSync), { convertPathToPattern } = import_fast_glob2.default;
export {
  convertPathToPattern,
  generateGlobTasks,
  generateGlobTasksSync,
  globby,
  globbyStream,
  globbySync,
  isDynamicPattern,
  isGitIgnored,
  isGitIgnoredSync,
  isIgnoredByIgnoreFiles,
  isIgnoredByIgnoreFilesSync
};

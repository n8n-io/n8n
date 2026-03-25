import CJS_COMPAT_NODE_URL_3fsumx86qru from 'node:url';
import CJS_COMPAT_NODE_PATH_3fsumx86qru from 'node:path';
import CJS_COMPAT_NODE_MODULE_3fsumx86qru from "node:module";

var __filename = CJS_COMPAT_NODE_URL_3fsumx86qru.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_3fsumx86qru.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_3fsumx86qru.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import {
  require_picocolors
} from "../_node-chunks/chunk-QHPWHTRG.js";
import {
  require_dist
} from "../_node-chunks/chunk-S5GBSWTG.js";
import {
  join,
  normalize,
  relative,
  resolve,
  sep
} from "../_node-chunks/chunk-PKYWPFA6.js";
import {
  __commonJS,
  __require,
  __toESM
} from "../_node-chunks/chunk-4LSYFR5U.js";

// ../../node_modules/braces/lib/utils.js
var require_utils = __commonJS({
  "../../node_modules/braces/lib/utils.js"(exports) {
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

// ../../node_modules/braces/lib/stringify.js
var require_stringify = __commonJS({
  "../../node_modules/braces/lib/stringify.js"(exports, module) {
    "use strict";
    var utils = require_utils();
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

// ../../node_modules/is-number/index.js
var require_is_number = __commonJS({
  "../../node_modules/is-number/index.js"(exports, module) {
    "use strict";
    module.exports = function(num) {
      return typeof num == "number" ? num - num === 0 : typeof num == "string" && num.trim() !== "" ? Number.isFinite ? Number.isFinite(+num) : isFinite(+num) : !1;
    };
  }
});

// ../../node_modules/to-regex-range/index.js
var require_to_regex_range = __commonJS({
  "../../node_modules/to-regex-range/index.js"(exports, module) {
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

// ../../node_modules/fill-range/index.js
var require_fill_range = __commonJS({
  "../../node_modules/fill-range/index.js"(exports, module) {
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

// ../../node_modules/braces/lib/compile.js
var require_compile = __commonJS({
  "../../node_modules/braces/lib/compile.js"(exports, module) {
    "use strict";
    var fill = require_fill_range(), utils = require_utils(), compile = (ast, options = {}) => {
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

// ../../node_modules/braces/lib/expand.js
var require_expand = __commonJS({
  "../../node_modules/braces/lib/expand.js"(exports, module) {
    "use strict";
    var fill = require_fill_range(), stringify = require_stringify(), utils = require_utils(), append = (queue = "", stash = "", enclose = !1) => {
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

// ../../node_modules/braces/lib/constants.js
var require_constants = __commonJS({
  "../../node_modules/braces/lib/constants.js"(exports, module) {
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

// ../../node_modules/braces/lib/parse.js
var require_parse = __commonJS({
  "../../node_modules/braces/lib/parse.js"(exports, module) {
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

// ../../node_modules/braces/index.js
var require_braces = __commonJS({
  "../../node_modules/braces/index.js"(exports, module) {
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

// ../../node_modules/picomatch/lib/constants.js
var require_constants2 = __commonJS({
  "../../node_modules/picomatch/lib/constants.js"(exports, module) {
    "use strict";
    var path = __require("path"), WIN_SLASH = "\\\\/", WIN_NO_SLASH = `[^${WIN_SLASH}]`, DOT_LITERAL = "\\.", PLUS_LITERAL = "\\+", QMARK_LITERAL = "\\?", SLASH_LITERAL = "\\/", ONE_CHAR = "(?=.)", QMARK = "[^/]", END_ANCHOR = `(?:${SLASH_LITERAL}|$)`, START_ANCHOR = `(?:^|${SLASH_LITERAL})`, DOTS_SLASH = `${DOT_LITERAL}{1,2}${END_ANCHOR}`, NO_DOT = `(?!${DOT_LITERAL})`, NO_DOTS = `(?!${START_ANCHOR}${DOTS_SLASH})`, NO_DOT_SLASH = `(?!${DOT_LITERAL}{0,1}${END_ANCHOR})`, NO_DOTS_SLASH = `(?!${DOTS_SLASH})`, QMARK_NO_DOT = `[^.${SLASH_LITERAL}]`, STAR = `${QMARK}*?`, POSIX_CHARS = {
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
    }, WINDOWS_CHARS = {
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
    }, POSIX_REGEX_SOURCE = {
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
      SEP: path.sep,
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
        return win32 === !0 ? WINDOWS_CHARS : POSIX_CHARS;
      }
    };
  }
});

// ../../node_modules/picomatch/lib/utils.js
var require_utils2 = __commonJS({
  "../../node_modules/picomatch/lib/utils.js"(exports) {
    "use strict";
    var path = __require("path"), win32 = process.platform === "win32", {
      REGEX_BACKSLASH,
      REGEX_REMOVE_BACKSLASH,
      REGEX_SPECIAL_CHARS,
      REGEX_SPECIAL_CHARS_GLOBAL
    } = require_constants2();
    exports.isObject = (val) => val !== null && typeof val == "object" && !Array.isArray(val);
    exports.hasRegexChars = (str) => REGEX_SPECIAL_CHARS.test(str);
    exports.isRegexChar = (str) => str.length === 1 && exports.hasRegexChars(str);
    exports.escapeRegex = (str) => str.replace(REGEX_SPECIAL_CHARS_GLOBAL, "\\$1");
    exports.toPosixSlashes = (str) => str.replace(REGEX_BACKSLASH, "/");
    exports.removeBackslashes = (str) => str.replace(REGEX_REMOVE_BACKSLASH, (match2) => match2 === "\\" ? "" : match2);
    exports.supportsLookbehinds = () => {
      let segs = process.version.slice(1).split(".").map(Number);
      return segs.length === 3 && segs[0] >= 9 || segs[0] === 8 && segs[1] >= 10;
    };
    exports.isWindows = (options) => options && typeof options.windows == "boolean" ? options.windows : win32 === !0 || path.sep === "\\";
    exports.escapeLast = (input, char, lastIdx) => {
      let idx = input.lastIndexOf(char, lastIdx);
      return idx === -1 ? input : input[idx - 1] === "\\" ? exports.escapeLast(input, char, idx - 1) : `${input.slice(0, idx)}\\${input.slice(idx)}`;
    };
    exports.removePrefix = (input, state = {}) => {
      let output = input;
      return output.startsWith("./") && (output = output.slice(2), state.prefix = "./"), output;
    };
    exports.wrapOutput = (input, state = {}, options = {}) => {
      let prepend = options.contains ? "" : "^", append = options.contains ? "" : "$", output = `${prepend}(?:${input})${append}`;
      return state.negated === !0 && (output = `(?:^(?!${output}).*$)`), output;
    };
  }
});

// ../../node_modules/picomatch/lib/scan.js
var require_scan = __commonJS({
  "../../node_modules/picomatch/lib/scan.js"(exports, module) {
    "use strict";
    var utils = require_utils2(), {
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
    } = require_constants2(), isPathSeparator = (code) => code === CHAR_FORWARD_SLASH || code === CHAR_BACKWARD_SLASH, depth = (token) => {
      token.isPrefix !== !0 && (token.depth = token.isGlobstar ? 1 / 0 : 1);
    }, scan = (input, options) => {
      let opts = options || {}, length = input.length - 1, scanToEnd = opts.parts === !0 || opts.scanToEnd === !0, slashes = [], tokens = [], parts = [], str = input, index = -1, start = 0, lastIndex = 0, isBrace = !1, isBracket = !1, isGlob = !1, isExtglob = !1, isGlobstar = !1, braceEscaped = !1, backslashes = !1, negated = !1, negatedExtglob = !1, finished = !1, braces = 0, prev, code, token = { value: "", depth: 0, isGlob: !1 }, eos = () => index >= length, peek = () => str.charCodeAt(index + 1), advance = () => (prev = code, str.charCodeAt(++index));
      for (; index < length; ) {
        code = advance();
        let next;
        if (code === CHAR_BACKWARD_SLASH) {
          backslashes = token.backslashes = !0, code = advance(), code === CHAR_LEFT_CURLY_BRACE && (braceEscaped = !0);
          continue;
        }
        if (braceEscaped === !0 || code === CHAR_LEFT_CURLY_BRACE) {
          for (braces++; eos() !== !0 && (code = advance()); ) {
            if (code === CHAR_BACKWARD_SLASH) {
              backslashes = token.backslashes = !0, advance();
              continue;
            }
            if (code === CHAR_LEFT_CURLY_BRACE) {
              braces++;
              continue;
            }
            if (braceEscaped !== !0 && code === CHAR_DOT && (code = advance()) === CHAR_DOT) {
              if (isBrace = token.isBrace = !0, isGlob = token.isGlob = !0, finished = !0, scanToEnd === !0)
                continue;
              break;
            }
            if (braceEscaped !== !0 && code === CHAR_COMMA) {
              if (isBrace = token.isBrace = !0, isGlob = token.isGlob = !0, finished = !0, scanToEnd === !0)
                continue;
              break;
            }
            if (code === CHAR_RIGHT_CURLY_BRACE && (braces--, braces === 0)) {
              braceEscaped = !1, isBrace = token.isBrace = !0, finished = !0;
              break;
            }
          }
          if (scanToEnd === !0)
            continue;
          break;
        }
        if (code === CHAR_FORWARD_SLASH) {
          if (slashes.push(index), tokens.push(token), token = { value: "", depth: 0, isGlob: !1 }, finished === !0) continue;
          if (prev === CHAR_DOT && index === start + 1) {
            start += 2;
            continue;
          }
          lastIndex = index + 1;
          continue;
        }
        if (opts.noext !== !0 && (code === CHAR_PLUS || code === CHAR_AT || code === CHAR_ASTERISK || code === CHAR_QUESTION_MARK || code === CHAR_EXCLAMATION_MARK) === !0 && peek() === CHAR_LEFT_PARENTHESES) {
          if (isGlob = token.isGlob = !0, isExtglob = token.isExtglob = !0, finished = !0, code === CHAR_EXCLAMATION_MARK && index === start && (negatedExtglob = !0), scanToEnd === !0) {
            for (; eos() !== !0 && (code = advance()); ) {
              if (code === CHAR_BACKWARD_SLASH) {
                backslashes = token.backslashes = !0, code = advance();
                continue;
              }
              if (code === CHAR_RIGHT_PARENTHESES) {
                isGlob = token.isGlob = !0, finished = !0;
                break;
              }
            }
            continue;
          }
          break;
        }
        if (code === CHAR_ASTERISK) {
          if (prev === CHAR_ASTERISK && (isGlobstar = token.isGlobstar = !0), isGlob = token.isGlob = !0, finished = !0, scanToEnd === !0)
            continue;
          break;
        }
        if (code === CHAR_QUESTION_MARK) {
          if (isGlob = token.isGlob = !0, finished = !0, scanToEnd === !0)
            continue;
          break;
        }
        if (code === CHAR_LEFT_SQUARE_BRACKET) {
          for (; eos() !== !0 && (next = advance()); ) {
            if (next === CHAR_BACKWARD_SLASH) {
              backslashes = token.backslashes = !0, advance();
              continue;
            }
            if (next === CHAR_RIGHT_SQUARE_BRACKET) {
              isBracket = token.isBracket = !0, isGlob = token.isGlob = !0, finished = !0;
              break;
            }
          }
          if (scanToEnd === !0)
            continue;
          break;
        }
        if (opts.nonegate !== !0 && code === CHAR_EXCLAMATION_MARK && index === start) {
          negated = token.negated = !0, start++;
          continue;
        }
        if (opts.noparen !== !0 && code === CHAR_LEFT_PARENTHESES) {
          if (isGlob = token.isGlob = !0, scanToEnd === !0) {
            for (; eos() !== !0 && (code = advance()); ) {
              if (code === CHAR_LEFT_PARENTHESES) {
                backslashes = token.backslashes = !0, code = advance();
                continue;
              }
              if (code === CHAR_RIGHT_PARENTHESES) {
                finished = !0;
                break;
              }
            }
            continue;
          }
          break;
        }
        if (isGlob === !0) {
          if (finished = !0, scanToEnd === !0)
            continue;
          break;
        }
      }
      opts.noext === !0 && (isExtglob = !1, isGlob = !1);
      let base = str, prefix = "", glob = "";
      start > 0 && (prefix = str.slice(0, start), str = str.slice(start), lastIndex -= start), base && isGlob === !0 && lastIndex > 0 ? (base = str.slice(0, lastIndex), glob = str.slice(lastIndex)) : isGlob === !0 ? (base = "", glob = str) : base = str, base && base !== "" && base !== "/" && base !== str && isPathSeparator(base.charCodeAt(base.length - 1)) && (base = base.slice(0, -1)), opts.unescape === !0 && (glob && (glob = utils.removeBackslashes(glob)), base && backslashes === !0 && (base = utils.removeBackslashes(base)));
      let state = {
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
      if (opts.tokens === !0 && (state.maxDepth = 0, isPathSeparator(code) || tokens.push(token), state.tokens = tokens), opts.parts === !0 || opts.tokens === !0) {
        let prevIndex;
        for (let idx = 0; idx < slashes.length; idx++) {
          let n = prevIndex ? prevIndex + 1 : start, i = slashes[idx], value = input.slice(n, i);
          opts.tokens && (idx === 0 && start !== 0 ? (tokens[idx].isPrefix = !0, tokens[idx].value = prefix) : tokens[idx].value = value, depth(tokens[idx]), state.maxDepth += tokens[idx].depth), (idx !== 0 || value !== "") && parts.push(value), prevIndex = i;
        }
        if (prevIndex && prevIndex + 1 < input.length) {
          let value = input.slice(prevIndex + 1);
          parts.push(value), opts.tokens && (tokens[tokens.length - 1].value = value, depth(tokens[tokens.length - 1]), state.maxDepth += tokens[tokens.length - 1].depth);
        }
        state.slashes = slashes, state.parts = parts;
      }
      return state;
    };
    module.exports = scan;
  }
});

// ../../node_modules/picomatch/lib/parse.js
var require_parse2 = __commonJS({
  "../../node_modules/picomatch/lib/parse.js"(exports, module) {
    "use strict";
    var constants = require_constants2(), utils = require_utils2(), {
      MAX_LENGTH,
      POSIX_REGEX_SOURCE,
      REGEX_NON_SPECIAL_CHARS,
      REGEX_SPECIAL_CHARS_BACKREF,
      REPLACEMENTS
    } = constants, expandRange = (args, options) => {
      if (typeof options.expandRange == "function")
        return options.expandRange(...args, options);
      args.sort();
      let value = `[${args.join("-")}]`;
      try {
        new RegExp(value);
      } catch {
        return args.map((v) => utils.escapeRegex(v)).join("..");
      }
      return value;
    }, syntaxError = (type, char) => `Missing ${type}: "${char}" - use "\\\\${char}" to match literal characters`, parse = (input, options) => {
      if (typeof input != "string")
        throw new TypeError("Expected a string");
      input = REPLACEMENTS[input] || input;
      let opts = { ...options }, max = typeof opts.maxLength == "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH, len = input.length;
      if (len > max)
        throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
      let bos = { type: "bos", value: "", output: opts.prepend || "" }, tokens = [bos], capture = opts.capture ? "" : "?:", win32 = utils.isWindows(options), PLATFORM_CHARS = constants.globChars(win32), EXTGLOB_CHARS = constants.extglobChars(PLATFORM_CHARS), {
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
      } = PLATFORM_CHARS, globstar = (opts2) => `(${capture}(?:(?!${START_ANCHOR}${opts2.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`, nodot = opts.dot ? "" : NO_DOT, qmarkNoDot = opts.dot ? QMARK : QMARK_NO_DOT, star = opts.bash === !0 ? globstar(opts) : STAR;
      opts.capture && (star = `(${star})`), typeof opts.noext == "boolean" && (opts.noextglob = opts.noext);
      let state = {
        input,
        index: -1,
        start: 0,
        dot: opts.dot === !0,
        consumed: "",
        output: "",
        prefix: "",
        backtrack: !1,
        negated: !1,
        brackets: 0,
        braces: 0,
        parens: 0,
        quotes: 0,
        globstar: !1,
        tokens
      };
      input = utils.removePrefix(input, state), len = input.length;
      let extglobs = [], braces = [], stack = [], prev = bos, value, eos = () => state.index === len - 1, peek = state.peek = (n = 1) => input[state.index + n], advance = state.advance = () => input[++state.index] || "", remaining = () => input.slice(state.index + 1), consume = (value2 = "", num = 0) => {
        state.consumed += value2, state.index += num;
      }, append = (token) => {
        state.output += token.output != null ? token.output : token.value, consume(token.value);
      }, negate = () => {
        let count = 1;
        for (; peek() === "!" && (peek(2) !== "(" || peek(3) === "?"); )
          advance(), state.start++, count++;
        return count % 2 === 0 ? !1 : (state.negated = !0, state.start++, !0);
      }, increment = (type) => {
        state[type]++, stack.push(type);
      }, decrement = (type) => {
        state[type]--, stack.pop();
      }, push = (tok) => {
        if (prev.type === "globstar") {
          let isBrace = state.braces > 0 && (tok.type === "comma" || tok.type === "brace"), isExtglob = tok.extglob === !0 || extglobs.length && (tok.type === "pipe" || tok.type === "paren");
          tok.type !== "slash" && tok.type !== "paren" && !isBrace && !isExtglob && (state.output = state.output.slice(0, -prev.output.length), prev.type = "star", prev.value = "*", prev.output = star, state.output += prev.output);
        }
        if (extglobs.length && tok.type !== "paren" && (extglobs[extglobs.length - 1].inner += tok.value), (tok.value || tok.output) && append(tok), prev && prev.type === "text" && tok.type === "text") {
          prev.value += tok.value, prev.output = (prev.output || "") + tok.value;
          return;
        }
        tok.prev = prev, tokens.push(tok), prev = tok;
      }, extglobOpen = (type, value2) => {
        let token = { ...EXTGLOB_CHARS[value2], conditions: 1, inner: "" };
        token.prev = prev, token.parens = state.parens, token.output = state.output;
        let output = (opts.capture ? "(" : "") + token.open;
        increment("parens"), push({ type, value: value2, output: state.output ? "" : ONE_CHAR }), push({ type: "paren", extglob: !0, value: advance(), output }), extglobs.push(token);
      }, extglobClose = (token) => {
        let output = token.close + (opts.capture ? ")" : ""), rest;
        if (token.type === "negate") {
          let extglobStar = star;
          if (token.inner && token.inner.length > 1 && token.inner.includes("/") && (extglobStar = globstar(opts)), (extglobStar !== star || eos() || /^\)+$/.test(remaining())) && (output = token.close = `)$))${extglobStar}`), token.inner.includes("*") && (rest = remaining()) && /^\.[^\\/.]+$/.test(rest)) {
            let expression = parse(rest, { ...options, fastpaths: !1 }).output;
            output = token.close = `)${expression})${extglobStar})`;
          }
          token.prev.type === "bos" && (state.negatedExtglob = !0);
        }
        push({ type: "paren", extglob: !0, value, output }), decrement("parens");
      };
      if (opts.fastpaths !== !1 && !/(^[*!]|[/()[\]{}"])/.test(input)) {
        let backslashes = !1, output = input.replace(REGEX_SPECIAL_CHARS_BACKREF, (m, esc, chars, first, rest, index) => first === "\\" ? (backslashes = !0, m) : first === "?" ? esc ? esc + first + (rest ? QMARK.repeat(rest.length) : "") : index === 0 ? qmarkNoDot + (rest ? QMARK.repeat(rest.length) : "") : QMARK.repeat(chars.length) : first === "." ? DOT_LITERAL.repeat(chars.length) : first === "*" ? esc ? esc + first + (rest ? star : "") : star : esc ? m : `\\${m}`);
        return backslashes === !0 && (opts.unescape === !0 ? output = output.replace(/\\/g, "") : output = output.replace(/\\+/g, (m) => m.length % 2 === 0 ? "\\\\" : m ? "\\" : "")), output === input && opts.contains === !0 ? (state.output = input, state) : (state.output = utils.wrapOutput(output, state, options), state);
      }
      for (; !eos(); ) {
        if (value = advance(), value === "\0")
          continue;
        if (value === "\\") {
          let next = peek();
          if (next === "/" && opts.bash !== !0 || next === "." || next === ";")
            continue;
          if (!next) {
            value += "\\", push({ type: "text", value });
            continue;
          }
          let match2 = /^\\+/.exec(remaining()), slashes = 0;
          if (match2 && match2[0].length > 2 && (slashes = match2[0].length, state.index += slashes, slashes % 2 !== 0 && (value += "\\")), opts.unescape === !0 ? value = advance() : value += advance(), state.brackets === 0) {
            push({ type: "text", value });
            continue;
          }
        }
        if (state.brackets > 0 && (value !== "]" || prev.value === "[" || prev.value === "[^")) {
          if (opts.posix !== !1 && value === ":") {
            let inner = prev.value.slice(1);
            if (inner.includes("[") && (prev.posix = !0, inner.includes(":"))) {
              let idx = prev.value.lastIndexOf("["), pre = prev.value.slice(0, idx), rest2 = prev.value.slice(idx + 2), posix = POSIX_REGEX_SOURCE[rest2];
              if (posix) {
                prev.value = pre + posix, state.backtrack = !0, advance(), !bos.output && tokens.indexOf(prev) === 1 && (bos.output = ONE_CHAR);
                continue;
              }
            }
          }
          (value === "[" && peek() !== ":" || value === "-" && peek() === "]") && (value = `\\${value}`), value === "]" && (prev.value === "[" || prev.value === "[^") && (value = `\\${value}`), opts.posix === !0 && value === "!" && prev.value === "[" && (value = "^"), prev.value += value, append({ value });
          continue;
        }
        if (state.quotes === 1 && value !== '"') {
          value = utils.escapeRegex(value), prev.value += value, append({ value });
          continue;
        }
        if (value === '"') {
          state.quotes = state.quotes === 1 ? 0 : 1, opts.keepQuotes === !0 && push({ type: "text", value });
          continue;
        }
        if (value === "(") {
          increment("parens"), push({ type: "paren", value });
          continue;
        }
        if (value === ")") {
          if (state.parens === 0 && opts.strictBrackets === !0)
            throw new SyntaxError(syntaxError("opening", "("));
          let extglob = extglobs[extglobs.length - 1];
          if (extglob && state.parens === extglob.parens + 1) {
            extglobClose(extglobs.pop());
            continue;
          }
          push({ type: "paren", value, output: state.parens ? ")" : "\\)" }), decrement("parens");
          continue;
        }
        if (value === "[") {
          if (opts.nobracket === !0 || !remaining().includes("]")) {
            if (opts.nobracket !== !0 && opts.strictBrackets === !0)
              throw new SyntaxError(syntaxError("closing", "]"));
            value = `\\${value}`;
          } else
            increment("brackets");
          push({ type: "bracket", value });
          continue;
        }
        if (value === "]") {
          if (opts.nobracket === !0 || prev && prev.type === "bracket" && prev.value.length === 1) {
            push({ type: "text", value, output: `\\${value}` });
            continue;
          }
          if (state.brackets === 0) {
            if (opts.strictBrackets === !0)
              throw new SyntaxError(syntaxError("opening", "["));
            push({ type: "text", value, output: `\\${value}` });
            continue;
          }
          decrement("brackets");
          let prevValue = prev.value.slice(1);
          if (prev.posix !== !0 && prevValue[0] === "^" && !prevValue.includes("/") && (value = `/${value}`), prev.value += value, append({ value }), opts.literalBrackets === !1 || utils.hasRegexChars(prevValue))
            continue;
          let escaped = utils.escapeRegex(prev.value);
          if (state.output = state.output.slice(0, -prev.value.length), opts.literalBrackets === !0) {
            state.output += escaped, prev.value = escaped;
            continue;
          }
          prev.value = `(${capture}${escaped}|${prev.value})`, state.output += prev.value;
          continue;
        }
        if (value === "{" && opts.nobrace !== !0) {
          increment("braces");
          let open = {
            type: "brace",
            value,
            output: "(",
            outputIndex: state.output.length,
            tokensIndex: state.tokens.length
          };
          braces.push(open), push(open);
          continue;
        }
        if (value === "}") {
          let brace = braces[braces.length - 1];
          if (opts.nobrace === !0 || !brace) {
            push({ type: "text", value, output: value });
            continue;
          }
          let output = ")";
          if (brace.dots === !0) {
            let arr = tokens.slice(), range = [];
            for (let i = arr.length - 1; i >= 0 && (tokens.pop(), arr[i].type !== "brace"); i--)
              arr[i].type !== "dots" && range.unshift(arr[i].value);
            output = expandRange(range, opts), state.backtrack = !0;
          }
          if (brace.comma !== !0 && brace.dots !== !0) {
            let out = state.output.slice(0, brace.outputIndex), toks = state.tokens.slice(brace.tokensIndex);
            brace.value = brace.output = "\\{", value = output = "\\}", state.output = out;
            for (let t of toks)
              state.output += t.output || t.value;
          }
          push({ type: "brace", value, output }), decrement("braces"), braces.pop();
          continue;
        }
        if (value === "|") {
          extglobs.length > 0 && extglobs[extglobs.length - 1].conditions++, push({ type: "text", value });
          continue;
        }
        if (value === ",") {
          let output = value, brace = braces[braces.length - 1];
          brace && stack[stack.length - 1] === "braces" && (brace.comma = !0, output = "|"), push({ type: "comma", value, output });
          continue;
        }
        if (value === "/") {
          if (prev.type === "dot" && state.index === state.start + 1) {
            state.start = state.index + 1, state.consumed = "", state.output = "", tokens.pop(), prev = bos;
            continue;
          }
          push({ type: "slash", value, output: SLASH_LITERAL });
          continue;
        }
        if (value === ".") {
          if (state.braces > 0 && prev.type === "dot") {
            prev.value === "." && (prev.output = DOT_LITERAL);
            let brace = braces[braces.length - 1];
            prev.type = "dots", prev.output += value, prev.value += value, brace.dots = !0;
            continue;
          }
          if (state.braces + state.parens === 0 && prev.type !== "bos" && prev.type !== "slash") {
            push({ type: "text", value, output: DOT_LITERAL });
            continue;
          }
          push({ type: "dot", value, output: DOT_LITERAL });
          continue;
        }
        if (value === "?") {
          if (!(prev && prev.value === "(") && opts.noextglob !== !0 && peek() === "(" && peek(2) !== "?") {
            extglobOpen("qmark", value);
            continue;
          }
          if (prev && prev.type === "paren") {
            let next = peek(), output = value;
            if (next === "<" && !utils.supportsLookbehinds())
              throw new Error("Node.js v10 or higher is required for regex lookbehinds");
            (prev.value === "(" && !/[!=<:]/.test(next) || next === "<" && !/<([!=]|\w+>)/.test(remaining())) && (output = `\\${value}`), push({ type: "text", value, output });
            continue;
          }
          if (opts.dot !== !0 && (prev.type === "slash" || prev.type === "bos")) {
            push({ type: "qmark", value, output: QMARK_NO_DOT });
            continue;
          }
          push({ type: "qmark", value, output: QMARK });
          continue;
        }
        if (value === "!") {
          if (opts.noextglob !== !0 && peek() === "(" && (peek(2) !== "?" || !/[!=<:]/.test(peek(3)))) {
            extglobOpen("negate", value);
            continue;
          }
          if (opts.nonegate !== !0 && state.index === 0) {
            negate();
            continue;
          }
        }
        if (value === "+") {
          if (opts.noextglob !== !0 && peek() === "(" && peek(2) !== "?") {
            extglobOpen("plus", value);
            continue;
          }
          if (prev && prev.value === "(" || opts.regex === !1) {
            push({ type: "plus", value, output: PLUS_LITERAL });
            continue;
          }
          if (prev && (prev.type === "bracket" || prev.type === "paren" || prev.type === "brace") || state.parens > 0) {
            push({ type: "plus", value });
            continue;
          }
          push({ type: "plus", value: PLUS_LITERAL });
          continue;
        }
        if (value === "@") {
          if (opts.noextglob !== !0 && peek() === "(" && peek(2) !== "?") {
            push({ type: "at", extglob: !0, value, output: "" });
            continue;
          }
          push({ type: "text", value });
          continue;
        }
        if (value !== "*") {
          (value === "$" || value === "^") && (value = `\\${value}`);
          let match2 = REGEX_NON_SPECIAL_CHARS.exec(remaining());
          match2 && (value += match2[0], state.index += match2[0].length), push({ type: "text", value });
          continue;
        }
        if (prev && (prev.type === "globstar" || prev.star === !0)) {
          prev.type = "star", prev.star = !0, prev.value += value, prev.output = star, state.backtrack = !0, state.globstar = !0, consume(value);
          continue;
        }
        let rest = remaining();
        if (opts.noextglob !== !0 && /^\([^?]/.test(rest)) {
          extglobOpen("star", value);
          continue;
        }
        if (prev.type === "star") {
          if (opts.noglobstar === !0) {
            consume(value);
            continue;
          }
          let prior = prev.prev, before = prior.prev, isStart = prior.type === "slash" || prior.type === "bos", afterStar = before && (before.type === "star" || before.type === "globstar");
          if (opts.bash === !0 && (!isStart || rest[0] && rest[0] !== "/")) {
            push({ type: "star", value, output: "" });
            continue;
          }
          let isBrace = state.braces > 0 && (prior.type === "comma" || prior.type === "brace"), isExtglob = extglobs.length && (prior.type === "pipe" || prior.type === "paren");
          if (!isStart && prior.type !== "paren" && !isBrace && !isExtglob) {
            push({ type: "star", value, output: "" });
            continue;
          }
          for (; rest.slice(0, 3) === "/**"; ) {
            let after = input[state.index + 4];
            if (after && after !== "/")
              break;
            rest = rest.slice(3), consume("/**", 3);
          }
          if (prior.type === "bos" && eos()) {
            prev.type = "globstar", prev.value += value, prev.output = globstar(opts), state.output = prev.output, state.globstar = !0, consume(value);
            continue;
          }
          if (prior.type === "slash" && prior.prev.type !== "bos" && !afterStar && eos()) {
            state.output = state.output.slice(0, -(prior.output + prev.output).length), prior.output = `(?:${prior.output}`, prev.type = "globstar", prev.output = globstar(opts) + (opts.strictSlashes ? ")" : "|$)"), prev.value += value, state.globstar = !0, state.output += prior.output + prev.output, consume(value);
            continue;
          }
          if (prior.type === "slash" && prior.prev.type !== "bos" && rest[0] === "/") {
            let end = rest[1] !== void 0 ? "|$" : "";
            state.output = state.output.slice(0, -(prior.output + prev.output).length), prior.output = `(?:${prior.output}`, prev.type = "globstar", prev.output = `${globstar(opts)}${SLASH_LITERAL}|${SLASH_LITERAL}${end})`, prev.value += value, state.output += prior.output + prev.output, state.globstar = !0, consume(value + advance()), push({ type: "slash", value: "/", output: "" });
            continue;
          }
          if (prior.type === "bos" && rest[0] === "/") {
            prev.type = "globstar", prev.value += value, prev.output = `(?:^|${SLASH_LITERAL}|${globstar(opts)}${SLASH_LITERAL})`, state.output = prev.output, state.globstar = !0, consume(value + advance()), push({ type: "slash", value: "/", output: "" });
            continue;
          }
          state.output = state.output.slice(0, -prev.output.length), prev.type = "globstar", prev.output = globstar(opts), prev.value += value, state.output += prev.output, state.globstar = !0, consume(value);
          continue;
        }
        let token = { type: "star", value, output: star };
        if (opts.bash === !0) {
          token.output = ".*?", (prev.type === "bos" || prev.type === "slash") && (token.output = nodot + token.output), push(token);
          continue;
        }
        if (prev && (prev.type === "bracket" || prev.type === "paren") && opts.regex === !0) {
          token.output = value, push(token);
          continue;
        }
        (state.index === state.start || prev.type === "slash" || prev.type === "dot") && (prev.type === "dot" ? (state.output += NO_DOT_SLASH, prev.output += NO_DOT_SLASH) : opts.dot === !0 ? (state.output += NO_DOTS_SLASH, prev.output += NO_DOTS_SLASH) : (state.output += nodot, prev.output += nodot), peek() !== "*" && (state.output += ONE_CHAR, prev.output += ONE_CHAR)), push(token);
      }
      for (; state.brackets > 0; ) {
        if (opts.strictBrackets === !0) throw new SyntaxError(syntaxError("closing", "]"));
        state.output = utils.escapeLast(state.output, "["), decrement("brackets");
      }
      for (; state.parens > 0; ) {
        if (opts.strictBrackets === !0) throw new SyntaxError(syntaxError("closing", ")"));
        state.output = utils.escapeLast(state.output, "("), decrement("parens");
      }
      for (; state.braces > 0; ) {
        if (opts.strictBrackets === !0) throw new SyntaxError(syntaxError("closing", "}"));
        state.output = utils.escapeLast(state.output, "{"), decrement("braces");
      }
      if (opts.strictSlashes !== !0 && (prev.type === "star" || prev.type === "bracket") && push({ type: "maybe_slash", value: "", output: `${SLASH_LITERAL}?` }), state.backtrack === !0) {
        state.output = "";
        for (let token of state.tokens)
          state.output += token.output != null ? token.output : token.value, token.suffix && (state.output += token.suffix);
      }
      return state;
    };
    parse.fastpaths = (input, options) => {
      let opts = { ...options }, max = typeof opts.maxLength == "number" ? Math.min(MAX_LENGTH, opts.maxLength) : MAX_LENGTH, len = input.length;
      if (len > max)
        throw new SyntaxError(`Input length: ${len}, exceeds maximum allowed length: ${max}`);
      input = REPLACEMENTS[input] || input;
      let win32 = utils.isWindows(options), {
        DOT_LITERAL,
        SLASH_LITERAL,
        ONE_CHAR,
        DOTS_SLASH,
        NO_DOT,
        NO_DOTS,
        NO_DOTS_SLASH,
        STAR,
        START_ANCHOR
      } = constants.globChars(win32), nodot = opts.dot ? NO_DOTS : NO_DOT, slashDot = opts.dot ? NO_DOTS_SLASH : NO_DOT, capture = opts.capture ? "" : "?:", state = { negated: !1, prefix: "" }, star = opts.bash === !0 ? ".*?" : STAR;
      opts.capture && (star = `(${star})`);
      let globstar = (opts2) => opts2.noglobstar === !0 ? star : `(${capture}(?:(?!${START_ANCHOR}${opts2.dot ? DOTS_SLASH : DOT_LITERAL}).)*?)`, create = (str) => {
        switch (str) {
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
            let match2 = /^(.*?)\.(\w+)$/.exec(str);
            if (!match2) return;
            let source2 = create(match2[1]);
            return source2 ? source2 + DOT_LITERAL + match2[2] : void 0;
          }
        }
      }, output = utils.removePrefix(input, state), source = create(output);
      return source && opts.strictSlashes !== !0 && (source += `${SLASH_LITERAL}?`), source;
    };
    module.exports = parse;
  }
});

// ../../node_modules/picomatch/lib/picomatch.js
var require_picomatch = __commonJS({
  "../../node_modules/picomatch/lib/picomatch.js"(exports, module) {
    "use strict";
    var path = __require("path"), scan = require_scan(), parse = require_parse2(), utils = require_utils2(), constants = require_constants2(), isObject = (val) => val && typeof val == "object" && !Array.isArray(val), picomatch = (glob, options, returnState = !1) => {
      if (Array.isArray(glob)) {
        let fns = glob.map((input) => picomatch(input, options, returnState));
        return (str) => {
          for (let isMatch of fns) {
            let state2 = isMatch(str);
            if (state2) return state2;
          }
          return !1;
        };
      }
      let isState = isObject(glob) && glob.tokens && glob.input;
      if (glob === "" || typeof glob != "string" && !isState)
        throw new TypeError("Expected pattern to be a non-empty string");
      let opts = options || {}, posix = utils.isWindows(options), regex = isState ? picomatch.compileRe(glob, options) : picomatch.makeRe(glob, options, !1, !0), state = regex.state;
      delete regex.state;
      let isIgnored = () => !1;
      if (opts.ignore) {
        let ignoreOpts = { ...options, ignore: null, onMatch: null, onResult: null };
        isIgnored = picomatch(opts.ignore, ignoreOpts, returnState);
      }
      let matcher = (input, returnObject = !1) => {
        let { isMatch, match: match2, output } = picomatch.test(input, regex, options, { glob, posix }), result = { glob, state, regex, posix, input, output, match: match2, isMatch };
        return typeof opts.onResult == "function" && opts.onResult(result), isMatch === !1 ? (result.isMatch = !1, returnObject ? result : !1) : isIgnored(input) ? (typeof opts.onIgnore == "function" && opts.onIgnore(result), result.isMatch = !1, returnObject ? result : !1) : (typeof opts.onMatch == "function" && opts.onMatch(result), returnObject ? result : !0);
      };
      return returnState && (matcher.state = state), matcher;
    };
    picomatch.test = (input, regex, options, { glob, posix } = {}) => {
      if (typeof input != "string")
        throw new TypeError("Expected input to be a string");
      if (input === "")
        return { isMatch: !1, output: "" };
      let opts = options || {}, format = opts.format || (posix ? utils.toPosixSlashes : null), match2 = input === glob, output = match2 && format ? format(input) : input;
      return match2 === !1 && (output = format ? format(input) : input, match2 = output === glob), (match2 === !1 || opts.capture === !0) && (opts.matchBase === !0 || opts.basename === !0 ? match2 = picomatch.matchBase(input, regex, options, posix) : match2 = regex.exec(output)), { isMatch: !!match2, match: match2, output };
    };
    picomatch.matchBase = (input, glob, options, posix = utils.isWindows(options)) => (glob instanceof RegExp ? glob : picomatch.makeRe(glob, options)).test(path.basename(input));
    picomatch.isMatch = (str, patterns, options) => picomatch(patterns, options)(str);
    picomatch.parse = (pattern, options) => Array.isArray(pattern) ? pattern.map((p) => picomatch.parse(p, options)) : parse(pattern, { ...options, fastpaths: !1 });
    picomatch.scan = (input, options) => scan(input, options);
    picomatch.compileRe = (state, options, returnOutput = !1, returnState = !1) => {
      if (returnOutput === !0)
        return state.output;
      let opts = options || {}, prepend = opts.contains ? "" : "^", append = opts.contains ? "" : "$", source = `${prepend}(?:${state.output})${append}`;
      state && state.negated === !0 && (source = `^(?!${source}).*$`);
      let regex = picomatch.toRegex(source, options);
      return returnState === !0 && (regex.state = state), regex;
    };
    picomatch.makeRe = (input, options = {}, returnOutput = !1, returnState = !1) => {
      if (!input || typeof input != "string")
        throw new TypeError("Expected a non-empty string");
      let parsed = { negated: !1, fastpaths: !0 };
      return options.fastpaths !== !1 && (input[0] === "." || input[0] === "*") && (parsed.output = parse.fastpaths(input, options)), parsed.output || (parsed = parse(input, options)), picomatch.compileRe(parsed, options, returnOutput, returnState);
    };
    picomatch.toRegex = (source, options) => {
      try {
        let opts = options || {};
        return new RegExp(source, opts.flags || (opts.nocase ? "i" : ""));
      } catch (err) {
        if (options && options.debug === !0) throw err;
        return /$^/;
      }
    };
    picomatch.constants = constants;
    module.exports = picomatch;
  }
});

// ../../node_modules/picomatch/index.js
var require_picomatch2 = __commonJS({
  "../../node_modules/picomatch/index.js"(exports, module) {
    "use strict";
    module.exports = require_picomatch();
  }
});

// ../../node_modules/micromatch/index.js
var require_micromatch = __commonJS({
  "../../node_modules/micromatch/index.js"(exports, module) {
    "use strict";
    var util = __require("util"), braces = require_braces(), picomatch = require_picomatch2(), utils = require_utils2(), isEmptyString = (v) => v === "" || v === "./", hasBraces = (v) => {
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
      let posix = utils.isWindows(options), match2 = picomatch.makeRe(String(glob), { ...options, capture: !0 }).exec(posix ? utils.toPosixSlashes(input) : input);
      if (match2)
        return match2.slice(1).map((v) => v === void 0 ? "" : v);
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

// ../../node_modules/totalist/sync/index.js
var require_sync = __commonJS({
  "../../node_modules/totalist/sync/index.js"(exports) {
    var { join: join2, resolve: resolve2 } = __require("path"), { readdirSync, statSync } = __require("fs");
    function totalist(dir, callback, pre = "") {
      dir = resolve2(".", dir);
      let arr = readdirSync(dir), i = 0, abs, stats;
      for (; i < arr.length; i++)
        abs = join2(dir, arr[i]), stats = statSync(abs), stats.isDirectory() ? totalist(abs, callback, join2(pre, arr[i])) : callback(join2(pre, arr[i]), abs, stats);
    }
    exports.totalist = totalist;
  }
});

// ../../node_modules/@polka/url/build.js
var require_build = __commonJS({
  "../../node_modules/@polka/url/build.js"(exports) {
    var qs = __require("querystring");
    function parse(req) {
      let raw = req.url;
      if (raw == null) return;
      let prev = req._parsedUrl;
      if (prev && prev.raw === raw) return prev;
      let pathname = raw, search = "", query, hash;
      if (raw.length > 1) {
        let idx = raw.indexOf("#", 1);
        idx !== -1 && (hash = raw.substring(idx), pathname = raw.substring(0, idx)), idx = pathname.indexOf("?", 1), idx !== -1 && (search = pathname.substring(idx), pathname = pathname.substring(0, idx), search.length > 1 && (query = qs.parse(search.substring(1))));
      }
      return req._parsedUrl = { pathname, search, query, hash, raw };
    }
    exports.parse = parse;
  }
});

// ../../node_modules/mrmime/index.js
var require_mrmime = __commonJS({
  "../../node_modules/mrmime/index.js"(exports) {
    var mimes = {
      "3g2": "video/3gpp2",
      "3gp": "video/3gpp",
      "3gpp": "video/3gpp",
      "3mf": "model/3mf",
      aac: "audio/aac",
      ac: "application/pkix-attr-cert",
      adp: "audio/adpcm",
      adts: "audio/aac",
      ai: "application/postscript",
      aml: "application/automationml-aml+xml",
      amlx: "application/automationml-amlx+zip",
      amr: "audio/amr",
      apng: "image/apng",
      appcache: "text/cache-manifest",
      appinstaller: "application/appinstaller",
      appx: "application/appx",
      appxbundle: "application/appxbundle",
      asc: "application/pgp-keys",
      atom: "application/atom+xml",
      atomcat: "application/atomcat+xml",
      atomdeleted: "application/atomdeleted+xml",
      atomsvc: "application/atomsvc+xml",
      au: "audio/basic",
      avci: "image/avci",
      avcs: "image/avcs",
      avif: "image/avif",
      aw: "application/applixware",
      bdoc: "application/bdoc",
      bin: "application/octet-stream",
      bmp: "image/bmp",
      bpk: "application/octet-stream",
      btf: "image/prs.btif",
      btif: "image/prs.btif",
      buffer: "application/octet-stream",
      ccxml: "application/ccxml+xml",
      cdfx: "application/cdfx+xml",
      cdmia: "application/cdmi-capability",
      cdmic: "application/cdmi-container",
      cdmid: "application/cdmi-domain",
      cdmio: "application/cdmi-object",
      cdmiq: "application/cdmi-queue",
      cer: "application/pkix-cert",
      cgm: "image/cgm",
      cjs: "application/node",
      class: "application/java-vm",
      coffee: "text/coffeescript",
      conf: "text/plain",
      cpl: "application/cpl+xml",
      cpt: "application/mac-compactpro",
      crl: "application/pkix-crl",
      css: "text/css",
      csv: "text/csv",
      cu: "application/cu-seeme",
      cwl: "application/cwl",
      cww: "application/prs.cww",
      davmount: "application/davmount+xml",
      dbk: "application/docbook+xml",
      deb: "application/octet-stream",
      def: "text/plain",
      deploy: "application/octet-stream",
      dib: "image/bmp",
      "disposition-notification": "message/disposition-notification",
      dist: "application/octet-stream",
      distz: "application/octet-stream",
      dll: "application/octet-stream",
      dmg: "application/octet-stream",
      dms: "application/octet-stream",
      doc: "application/msword",
      dot: "application/msword",
      dpx: "image/dpx",
      drle: "image/dicom-rle",
      dsc: "text/prs.lines.tag",
      dssc: "application/dssc+der",
      dtd: "application/xml-dtd",
      dump: "application/octet-stream",
      dwd: "application/atsc-dwd+xml",
      ear: "application/java-archive",
      ecma: "application/ecmascript",
      elc: "application/octet-stream",
      emf: "image/emf",
      eml: "message/rfc822",
      emma: "application/emma+xml",
      emotionml: "application/emotionml+xml",
      eps: "application/postscript",
      epub: "application/epub+zip",
      exe: "application/octet-stream",
      exi: "application/exi",
      exp: "application/express",
      exr: "image/aces",
      ez: "application/andrew-inset",
      fdf: "application/fdf",
      fdt: "application/fdt+xml",
      fits: "image/fits",
      g3: "image/g3fax",
      gbr: "application/rpki-ghostbusters",
      geojson: "application/geo+json",
      gif: "image/gif",
      glb: "model/gltf-binary",
      gltf: "model/gltf+json",
      gml: "application/gml+xml",
      gpx: "application/gpx+xml",
      gram: "application/srgs",
      grxml: "application/srgs+xml",
      gxf: "application/gxf",
      gz: "application/gzip",
      h261: "video/h261",
      h263: "video/h263",
      h264: "video/h264",
      heic: "image/heic",
      heics: "image/heic-sequence",
      heif: "image/heif",
      heifs: "image/heif-sequence",
      hej2: "image/hej2k",
      held: "application/atsc-held+xml",
      hjson: "application/hjson",
      hlp: "application/winhlp",
      hqx: "application/mac-binhex40",
      hsj2: "image/hsj2",
      htm: "text/html",
      html: "text/html",
      ics: "text/calendar",
      ief: "image/ief",
      ifb: "text/calendar",
      iges: "model/iges",
      igs: "model/iges",
      img: "application/octet-stream",
      in: "text/plain",
      ini: "text/plain",
      ink: "application/inkml+xml",
      inkml: "application/inkml+xml",
      ipfix: "application/ipfix",
      iso: "application/octet-stream",
      its: "application/its+xml",
      jade: "text/jade",
      jar: "application/java-archive",
      jhc: "image/jphc",
      jls: "image/jls",
      jp2: "image/jp2",
      jpe: "image/jpeg",
      jpeg: "image/jpeg",
      jpf: "image/jpx",
      jpg: "image/jpeg",
      jpg2: "image/jp2",
      jpgm: "image/jpm",
      jpgv: "video/jpeg",
      jph: "image/jph",
      jpm: "image/jpm",
      jpx: "image/jpx",
      js: "text/javascript",
      json: "application/json",
      json5: "application/json5",
      jsonld: "application/ld+json",
      jsonml: "application/jsonml+json",
      jsx: "text/jsx",
      jt: "model/jt",
      jxl: "image/jxl",
      jxr: "image/jxr",
      jxra: "image/jxra",
      jxrs: "image/jxrs",
      jxs: "image/jxs",
      jxsc: "image/jxsc",
      jxsi: "image/jxsi",
      jxss: "image/jxss",
      kar: "audio/midi",
      ktx: "image/ktx",
      ktx2: "image/ktx2",
      less: "text/less",
      lgr: "application/lgr+xml",
      list: "text/plain",
      litcoffee: "text/coffeescript",
      log: "text/plain",
      lostxml: "application/lost+xml",
      lrf: "application/octet-stream",
      m1v: "video/mpeg",
      m21: "application/mp21",
      m2a: "audio/mpeg",
      m2t: "video/mp2t",
      m2ts: "video/mp2t",
      m2v: "video/mpeg",
      m3a: "audio/mpeg",
      m4a: "audio/mp4",
      m4p: "application/mp4",
      m4s: "video/iso.segment",
      ma: "application/mathematica",
      mads: "application/mads+xml",
      maei: "application/mmt-aei+xml",
      man: "text/troff",
      manifest: "text/cache-manifest",
      map: "application/json",
      mar: "application/octet-stream",
      markdown: "text/markdown",
      mathml: "application/mathml+xml",
      mb: "application/mathematica",
      mbox: "application/mbox",
      md: "text/markdown",
      mdx: "text/mdx",
      me: "text/troff",
      mesh: "model/mesh",
      meta4: "application/metalink4+xml",
      metalink: "application/metalink+xml",
      mets: "application/mets+xml",
      mft: "application/rpki-manifest",
      mid: "audio/midi",
      midi: "audio/midi",
      mime: "message/rfc822",
      mj2: "video/mj2",
      mjp2: "video/mj2",
      mjs: "text/javascript",
      mml: "text/mathml",
      mods: "application/mods+xml",
      mov: "video/quicktime",
      mp2: "audio/mpeg",
      mp21: "application/mp21",
      mp2a: "audio/mpeg",
      mp3: "audio/mpeg",
      mp4: "video/mp4",
      mp4a: "audio/mp4",
      mp4s: "application/mp4",
      mp4v: "video/mp4",
      mpd: "application/dash+xml",
      mpe: "video/mpeg",
      mpeg: "video/mpeg",
      mpf: "application/media-policy-dataset+xml",
      mpg: "video/mpeg",
      mpg4: "video/mp4",
      mpga: "audio/mpeg",
      mpp: "application/dash-patch+xml",
      mrc: "application/marc",
      mrcx: "application/marcxml+xml",
      ms: "text/troff",
      mscml: "application/mediaservercontrol+xml",
      msh: "model/mesh",
      msi: "application/octet-stream",
      msix: "application/msix",
      msixbundle: "application/msixbundle",
      msm: "application/octet-stream",
      msp: "application/octet-stream",
      mtl: "model/mtl",
      mts: "video/mp2t",
      musd: "application/mmt-usd+xml",
      mxf: "application/mxf",
      mxmf: "audio/mobile-xmf",
      mxml: "application/xv+xml",
      n3: "text/n3",
      nb: "application/mathematica",
      nq: "application/n-quads",
      nt: "application/n-triples",
      obj: "model/obj",
      oda: "application/oda",
      oga: "audio/ogg",
      ogg: "audio/ogg",
      ogv: "video/ogg",
      ogx: "application/ogg",
      omdoc: "application/omdoc+xml",
      onepkg: "application/onenote",
      onetmp: "application/onenote",
      onetoc: "application/onenote",
      onetoc2: "application/onenote",
      opf: "application/oebps-package+xml",
      opus: "audio/ogg",
      otf: "font/otf",
      owl: "application/rdf+xml",
      oxps: "application/oxps",
      p10: "application/pkcs10",
      p7c: "application/pkcs7-mime",
      p7m: "application/pkcs7-mime",
      p7s: "application/pkcs7-signature",
      p8: "application/pkcs8",
      pdf: "application/pdf",
      pfr: "application/font-tdpfr",
      pgp: "application/pgp-encrypted",
      pkg: "application/octet-stream",
      pki: "application/pkixcmp",
      pkipath: "application/pkix-pkipath",
      pls: "application/pls+xml",
      png: "image/png",
      prc: "model/prc",
      prf: "application/pics-rules",
      provx: "application/provenance+xml",
      ps: "application/postscript",
      pskcxml: "application/pskc+xml",
      pti: "image/prs.pti",
      qt: "video/quicktime",
      raml: "application/raml+yaml",
      rapd: "application/route-apd+xml",
      rdf: "application/rdf+xml",
      relo: "application/p2p-overlay+xml",
      rif: "application/reginfo+xml",
      rl: "application/resource-lists+xml",
      rld: "application/resource-lists-diff+xml",
      rmi: "audio/midi",
      rnc: "application/relax-ng-compact-syntax",
      rng: "application/xml",
      roa: "application/rpki-roa",
      roff: "text/troff",
      rq: "application/sparql-query",
      rs: "application/rls-services+xml",
      rsat: "application/atsc-rsat+xml",
      rsd: "application/rsd+xml",
      rsheet: "application/urc-ressheet+xml",
      rss: "application/rss+xml",
      rtf: "text/rtf",
      rtx: "text/richtext",
      rusd: "application/route-usd+xml",
      s3m: "audio/s3m",
      sbml: "application/sbml+xml",
      scq: "application/scvp-cv-request",
      scs: "application/scvp-cv-response",
      sdp: "application/sdp",
      senmlx: "application/senml+xml",
      sensmlx: "application/sensml+xml",
      ser: "application/java-serialized-object",
      setpay: "application/set-payment-initiation",
      setreg: "application/set-registration-initiation",
      sgi: "image/sgi",
      sgm: "text/sgml",
      sgml: "text/sgml",
      shex: "text/shex",
      shf: "application/shf+xml",
      shtml: "text/html",
      sieve: "application/sieve",
      sig: "application/pgp-signature",
      sil: "audio/silk",
      silo: "model/mesh",
      siv: "application/sieve",
      slim: "text/slim",
      slm: "text/slim",
      sls: "application/route-s-tsid+xml",
      smi: "application/smil+xml",
      smil: "application/smil+xml",
      snd: "audio/basic",
      so: "application/octet-stream",
      spdx: "text/spdx",
      spp: "application/scvp-vp-response",
      spq: "application/scvp-vp-request",
      spx: "audio/ogg",
      sql: "application/sql",
      sru: "application/sru+xml",
      srx: "application/sparql-results+xml",
      ssdl: "application/ssdl+xml",
      ssml: "application/ssml+xml",
      stk: "application/hyperstudio",
      stl: "model/stl",
      stpx: "model/step+xml",
      stpxz: "model/step-xml+zip",
      stpz: "model/step+zip",
      styl: "text/stylus",
      stylus: "text/stylus",
      svg: "image/svg+xml",
      svgz: "image/svg+xml",
      swidtag: "application/swid+xml",
      t: "text/troff",
      t38: "image/t38",
      td: "application/urc-targetdesc+xml",
      tei: "application/tei+xml",
      teicorpus: "application/tei+xml",
      text: "text/plain",
      tfi: "application/thraud+xml",
      tfx: "image/tiff-fx",
      tif: "image/tiff",
      tiff: "image/tiff",
      toml: "application/toml",
      tr: "text/troff",
      trig: "application/trig",
      ts: "video/mp2t",
      tsd: "application/timestamped-data",
      tsv: "text/tab-separated-values",
      ttc: "font/collection",
      ttf: "font/ttf",
      ttl: "text/turtle",
      ttml: "application/ttml+xml",
      txt: "text/plain",
      u3d: "model/u3d",
      u8dsn: "message/global-delivery-status",
      u8hdr: "message/global-headers",
      u8mdn: "message/global-disposition-notification",
      u8msg: "message/global",
      ubj: "application/ubjson",
      uri: "text/uri-list",
      uris: "text/uri-list",
      urls: "text/uri-list",
      vcard: "text/vcard",
      vrml: "model/vrml",
      vtt: "text/vtt",
      vxml: "application/voicexml+xml",
      war: "application/java-archive",
      wasm: "application/wasm",
      wav: "audio/wav",
      weba: "audio/webm",
      webm: "video/webm",
      webmanifest: "application/manifest+json",
      webp: "image/webp",
      wgsl: "text/wgsl",
      wgt: "application/widget",
      wif: "application/watcherinfo+xml",
      wmf: "image/wmf",
      woff: "font/woff",
      woff2: "font/woff2",
      wrl: "model/vrml",
      wsdl: "application/wsdl+xml",
      wspolicy: "application/wspolicy+xml",
      x3d: "model/x3d+xml",
      x3db: "model/x3d+fastinfoset",
      x3dbz: "model/x3d+binary",
      x3dv: "model/x3d-vrml",
      x3dvz: "model/x3d+vrml",
      x3dz: "model/x3d+xml",
      xaml: "application/xaml+xml",
      xav: "application/xcap-att+xml",
      xca: "application/xcap-caps+xml",
      xcs: "application/calendar+xml",
      xdf: "application/xcap-diff+xml",
      xdssc: "application/dssc+xml",
      xel: "application/xcap-el+xml",
      xenc: "application/xenc+xml",
      xer: "application/patch-ops-error+xml",
      xfdf: "application/xfdf",
      xht: "application/xhtml+xml",
      xhtml: "application/xhtml+xml",
      xhvml: "application/xv+xml",
      xlf: "application/xliff+xml",
      xm: "audio/xm",
      xml: "text/xml",
      xns: "application/xcap-ns+xml",
      xop: "application/xop+xml",
      xpl: "application/xproc+xml",
      xsd: "application/xml",
      xsf: "application/prs.xsf+xml",
      xsl: "application/xml",
      xslt: "application/xml",
      xspf: "application/xspf+xml",
      xvm: "application/xv+xml",
      xvml: "application/xv+xml",
      yaml: "text/yaml",
      yang: "application/yang",
      yin: "application/yin+xml",
      yml: "text/yaml",
      zip: "application/zip"
    };
    function lookup(extn) {
      let tmp = ("" + extn).trim().toLowerCase(), idx = tmp.lastIndexOf(".");
      return mimes[~idx ? tmp.substring(++idx) : tmp];
    }
    exports.mimes = mimes;
    exports.lookup = lookup;
  }
});

// ../../node_modules/sirv/build.js
var require_build2 = __commonJS({
  "../../node_modules/sirv/build.js"(exports, module) {
    var fs = __require("fs"), { join: join2, normalize: normalize2, resolve: resolve2 } = __require("path"), { totalist } = require_sync(), { parse } = require_build(), { lookup } = require_mrmime(), noop = () => {
    };
    function isMatch(uri, arr) {
      for (let i = 0; i < arr.length; i++)
        if (arr[i].test(uri)) return !0;
    }
    function toAssume(uri, extns) {
      let i = 0, x, len = uri.length - 1;
      uri.charCodeAt(len) === 47 && (uri = uri.substring(0, len));
      let arr = [], tmp = `${uri}/index`;
      for (; i < extns.length; i++)
        x = extns[i] ? `.${extns[i]}` : "", uri && arr.push(uri + x), arr.push(tmp + x);
      return arr;
    }
    function viaCache(cache, uri, extns) {
      let i = 0, data, arr = toAssume(uri, extns);
      for (; i < arr.length; i++)
        if (data = cache[arr[i]]) return data;
    }
    function viaLocal(dir, isEtag, uri, extns) {
      let i = 0, arr = toAssume(uri, extns), abs, stats, name, headers;
      for (; i < arr.length; i++)
        if (abs = normalize2(join2(dir, name = arr[i])), abs.startsWith(dir) && fs.existsSync(abs)) {
          if (stats = fs.statSync(abs), stats.isDirectory()) continue;
          return headers = toHeaders(name, stats, isEtag), headers["Cache-Control"] = isEtag ? "no-cache" : "no-store", { abs, stats, headers };
        }
    }
    function is404(req, res) {
      return res.statusCode = 404, res.end();
    }
    function send(req, res, file, stats, headers) {
      let code = 200, tmp, opts = {};
      headers = { ...headers };
      for (let key in headers)
        tmp = res.getHeader(key), tmp && (headers[key] = tmp);
      if ((tmp = res.getHeader("content-type")) && (headers["Content-Type"] = tmp), req.headers.range) {
        code = 206;
        let [x, y] = req.headers.range.replace("bytes=", "").split("-"), end = opts.end = parseInt(y, 10) || stats.size - 1, start = opts.start = parseInt(x, 10) || 0;
        if (end >= stats.size && (end = stats.size - 1), start >= stats.size)
          return res.setHeader("Content-Range", `bytes */${stats.size}`), res.statusCode = 416, res.end();
        headers["Content-Range"] = `bytes ${start}-${end}/${stats.size}`, headers["Content-Length"] = end - start + 1, headers["Accept-Ranges"] = "bytes";
      }
      res.writeHead(code, headers), fs.createReadStream(file, opts).pipe(res);
    }
    var ENCODING = {
      ".br": "br",
      ".gz": "gzip"
    };
    function toHeaders(name, stats, isEtag) {
      let enc = ENCODING[name.slice(-3)], ctype = lookup(name.slice(0, enc && -3)) || "";
      ctype === "text/html" && (ctype += ";charset=utf-8");
      let headers = {
        "Content-Length": stats.size,
        "Content-Type": ctype,
        "Last-Modified": stats.mtime.toUTCString()
      };
      return enc && (headers["Content-Encoding"] = enc), isEtag && (headers.ETag = `W/"${stats.size}-${stats.mtime.getTime()}"`), headers;
    }
    module.exports = function(dir, opts = {}) {
      dir = resolve2(dir || ".");
      let isNotFound = opts.onNoMatch || is404, setHeaders = opts.setHeaders || noop, extensions = opts.extensions || ["html", "htm"], gzips = opts.gzip && extensions.map((x) => `${x}.gz`).concat("gz"), brots = opts.brotli && extensions.map((x) => `${x}.br`).concat("br"), FILES = {}, fallback = "/", isEtag = !!opts.etag, isSPA = !!opts.single;
      if (typeof opts.single == "string") {
        let idx = opts.single.lastIndexOf(".");
        fallback += ~idx ? opts.single.substring(0, idx) : opts.single;
      }
      let ignores = [];
      opts.ignores !== !1 && (ignores.push(/[/]([A-Za-z\s\d~$._-]+\.\w+){1,}$/), opts.dotfiles ? ignores.push(/\/\.\w/) : ignores.push(/\/\.well-known/), [].concat(opts.ignores || []).forEach((x) => {
        ignores.push(new RegExp(x, "i"));
      }));
      let cc = opts.maxAge != null && `public,max-age=${opts.maxAge}`;
      cc && opts.immutable ? cc += ",immutable" : cc && opts.maxAge === 0 && (cc += ",must-revalidate"), opts.dev || totalist(dir, (name, abs, stats) => {
        if (!/\.well-known[\\+\/]/.test(name)) {
          if (!opts.dotfiles && /(^\.|[\\+|\/+]\.)/.test(name)) return;
        }
        let headers = toHeaders(name, stats, isEtag);
        cc && (headers["Cache-Control"] = cc), FILES["/" + name.normalize().replace(/\\+/g, "/")] = { abs, stats, headers };
      });
      let lookup2 = opts.dev ? viaLocal.bind(0, dir, isEtag) : viaCache.bind(0, FILES);
      return function(req, res, next) {
        let extns = [""], pathname = parse(req).pathname, val = req.headers["accept-encoding"] || "";
        if (gzips && val.includes("gzip") && extns.unshift(...gzips), brots && /(br|brotli)/i.test(val) && extns.unshift(...brots), extns.push(...extensions), pathname.indexOf("%") !== -1)
          try {
            pathname = decodeURI(pathname);
          } catch {
          }
        let data = lookup2(pathname, extns) || isSPA && !isMatch(pathname, ignores) && lookup2(fallback, extns);
        if (!data) return next ? next() : isNotFound(req, res);
        if (isEtag && req.headers["if-none-match"] === data.headers.ETag)
          return res.writeHead(304), res.end();
        (gzips || brots) && res.setHeader("Vary", "Accept-Encoding"), setHeaders(res, pathname, data.stats), send(req, res, data.abs, data.stats, data.headers);
      };
    };
  }
});

// src/vitest-plugin/index.ts
var import_micromatch = __toESM(require_micromatch(), 1);
import { fileURLToPath } from "node:url";
import { mergeConfig } from "vitest/config";
import {
  DEFAULT_FILES_PATTERN,
  getInterpretedFile,
  normalizeStories,
  optionalEnvToBoolean,
  resolvePathInStorybookCache,
  validateConfigurationFiles
} from "storybook/internal/common";
import {
  StoryIndexGenerator,
  experimental_loadStorybook,
  mapStaticDir
} from "storybook/internal/core-server";
import { readConfig, vitestTransform } from "storybook/internal/csf-tools";
import { MainFileMissingError } from "storybook/internal/server-errors";
import { telemetry } from "storybook/internal/telemetry";
import { oneWayHash } from "storybook/internal/telemetry";
var import_picocolors = __toESM(require_picocolors(), 1), import_sirv = __toESM(require_build2(), 1), import_ts_dedent = __toESM(require_dist(), 1);

// ../../builders/builder-vite/src/utils/without-vite-plugins.ts
var withoutVitePlugins = async (plugins = [], namesToRemove) => {
  let result = [], resolvedPlugins = await Promise.all(plugins);
  for (let plugin of resolvedPlugins)
    Array.isArray(plugin) ? result.push(await withoutVitePlugins(plugin, namesToRemove)) : plugin && typeof plugin == "object" && "name" in plugin && typeof plugin.name == "string" && !namesToRemove.includes(plugin.name) && result.push(plugin);
  return result;
};

// src/vitest-plugin/index.ts
var WORKING_DIR = process.cwd(), defaultOptions = {
  storybookScript: void 0,
  configDir: resolve(join(WORKING_DIR, ".storybook")),
  storybookUrl: "http://localhost:6006",
  disableAddonDocs: !0
}, extractTagsFromPreview = async (configDir) => {
  let previewConfigPath = getInterpretedFile(join(resolve(configDir), "preview"));
  return previewConfigPath ? (await readConfig(previewConfigPath)).getFieldValue(["tags"]) ?? [] : [];
}, getStoryGlobsAndFiles = async (presets, directories) => {
  let stories = await presets.apply("stories", []), normalizedStories = normalizeStories(stories, {
    configDir: directories.configDir,
    workingDir: directories.workingDir
  }), matchingStoryFiles = await StoryIndexGenerator.findMatchingFilesForSpecifiers(
    normalizedStories,
    directories.workingDir
  );
  return {
    storiesGlobs: stories,
    storiesFiles: StoryIndexGenerator.storyFileNames(
      new Map(matchingStoryFiles.map(([specifier, cache]) => [specifier, cache]))
    )
  };
}, mdxStubPlugin = {
  name: "storybook:stub-mdx-plugin",
  enforce: "pre",
  resolveId(id) {
    return id.endsWith(".mdx") ? id : null;
  },
  load(id) {
    return id.endsWith(".mdx") ? "export default {};" : null;
  }
}, storybookTest = async (options) => {
  let finalOptions = {
    ...defaultOptions,
    ...options,
    configDir: options?.configDir ? resolve(WORKING_DIR, options.configDir) : defaultOptions.configDir,
    tags: {
      include: options?.tags?.include ?? ["test"],
      exclude: options?.tags?.exclude ?? [],
      skip: options?.tags?.skip ?? []
    }
  };
  optionalEnvToBoolean(process.env.DEBUG) && (finalOptions.debug = !0), process.env.__STORYBOOK_URL__ = finalOptions.storybookUrl, process.env.__STORYBOOK_SCRIPT__ = finalOptions.storybookScript;
  let isVitestStorybook = optionalEnvToBoolean(process.env.VITEST_STORYBOOK), directories = {
    configDir: finalOptions.configDir,
    workingDir: WORKING_DIR
  }, { presets } = await experimental_loadStorybook({
    configDir: finalOptions.configDir,
    packageJson: {}
  }), stories = await presets.apply("stories", []), [
    { storiesGlobs },
    framework,
    storybookEnv,
    viteConfigFromStorybook,
    staticDirs,
    previewLevelTags,
    core,
    extraOptimizeDeps,
    features
  ] = await Promise.all([
    getStoryGlobsAndFiles(presets, directories),
    presets.apply("framework", void 0),
    presets.apply("env", {}),
    presets.apply("viteFinal", {}),
    presets.apply("staticDirs", []),
    extractTagsFromPreview(finalOptions.configDir),
    presets.apply("core"),
    presets.apply("optimizeViteDeps", []),
    presets.apply("features", {})
  ]), pluginsToIgnore = [
    "storybook:react-docgen-plugin",
    "vite:react-docgen-typescript",
    // aka @joshwooding/vite-plugin-react-docgen-typescript
    "storybook:svelte-docgen-plugin",
    "storybook:vue-component-meta-plugin"
  ];
  finalOptions.disableAddonDocs && pluginsToIgnore.push("storybook:package-deduplication", "storybook:mdx-plugin");
  let plugins = await withoutVitePlugins(viteConfigFromStorybook.plugins ?? [], pluginsToIgnore);
  finalOptions.disableAddonDocs && plugins.push(mdxStubPlugin);
  let storybookTestPlugin = {
    name: "vite-plugin-storybook-test",
    async transformIndexHtml(html) {
      let [headHtmlSnippet, bodyHtmlSnippet] = await Promise.all([
        presets.apply("previewHead"),
        presets.apply("previewBody")
      ]);
      return html.replace("</head>", `${headHtmlSnippet ?? ""}</head>`).replace("<body>", `<body>${bodyHtmlSnippet ?? ""}`);
    },
    async config(nonMutableInputConfig) {
      try {
        await validateConfigurationFiles(finalOptions.configDir);
      } catch {
        throw new MainFileMissingError({
          location: finalOptions.configDir,
          source: "vitest"
        });
      }
      let frameworkName = typeof framework == "string" ? framework : framework.name, testConfig = nonMutableInputConfig.test;
      finalOptions.vitestRoot = testConfig?.dir || testConfig?.root || nonMutableInputConfig.root || process.cwd();
      let includeStories = stories.map((story) => {
        let storyPath;
        return typeof story == "string" ? storyPath = story : storyPath = `${story.directory}/${story.files ?? DEFAULT_FILES_PATTERN}`, join(finalOptions.configDir, storyPath);
      }).map((story) => relative(finalOptions.vitestRoot, story));
      finalOptions.includeStories = includeStories;
      let projectId = oneWayHash(finalOptions.configDir), baseConfig = {
        cacheDir: resolvePathInStorybookCache("sb-vitest", projectId),
        test: {
          setupFiles: [
            fileURLToPath(import.meta.resolve("@storybook/addon-vitest/internal/setup-file")),
            // if the existing setupFiles is a string, we have to include it otherwise we're overwriting it
            typeof nonMutableInputConfig.test?.setupFiles == "string" && nonMutableInputConfig.test?.setupFiles
          ].filter(Boolean),
          ...finalOptions.storybookScript ? {
            globalSetup: [
              fileURLToPath(
                import.meta.resolve("@storybook/addon-vitest/internal/global-setup")
              )
            ]
          } : {},
          env: {
            ...storybookEnv,
            // To be accessed by the setup file
            __STORYBOOK_URL__: finalOptions.storybookUrl,
            VITEST_STORYBOOK: isVitestStorybook ? "true" : "false",
            __VITEST_INCLUDE_TAGS__: finalOptions.tags.include.join(","),
            __VITEST_EXCLUDE_TAGS__: finalOptions.tags.exclude.join(","),
            __VITEST_SKIP_TAGS__: finalOptions.tags.skip.join(",")
          },
          include: includeStories,
          exclude: [
            ...nonMutableInputConfig.test?.exclude ?? [],
            join(relative(finalOptions.vitestRoot, process.cwd()), "**/*.mdx").replaceAll(sep, "/")
          ],
          // if the existing deps.inline is true, we keep it as-is, because it will inline everything
          // TODO: Remove the check once we don't support Vitest 3 anymore
          ...nonMutableInputConfig.test?.server?.deps?.inline !== !0 ? {
            server: {
              deps: {
                inline: ["@storybook/addon-vitest"]
              }
            }
          } : {},
          browser: {
            commands: {
              getInitialGlobals: () => {
                let envConfig = JSON.parse(process.env.VITEST_STORYBOOK_CONFIG ?? "{}");
                return {
                  a11y: {
                    manual: !(isVitestStorybook ? envConfig.a11y ?? !1 : !0)
                  }
                };
              }
            },
            // if there is a test.browser config AND test.browser.screenshotFailures is not explicitly set, we set it to false
            ...nonMutableInputConfig.test?.browser && nonMutableInputConfig.test.browser.screenshotFailures === void 0 ? {
              screenshotFailures: !1
            } : {}
          }
        },
        envPrefix: Array.from(
          /* @__PURE__ */ new Set([...nonMutableInputConfig.envPrefix || [], "STORYBOOK_", "VITE_"])
        ),
        resolve: {
          conditions: [
            "storybook",
            "stories",
            "test",
            // copying straight from https://github.com/vitejs/vite/blob/main/packages/vite/src/node/constants.ts#L60
            // to avoid having to maintain Vite as a dependency just for this
            "module",
            "browser",
            "development|production"
          ]
        },
        optimizeDeps: {
          include: [
            ...extraOptimizeDeps,
            "@storybook/addon-vitest/internal/setup-file",
            "@storybook/addon-vitest/internal/global-setup",
            "@storybook/addon-vitest/internal/test-utils",
            ...frameworkName?.includes("react") || frameworkName?.includes("nextjs") ? ["react-dom/test-utils"] : []
          ]
        },
        define: {
          ...frameworkName?.includes("vue3") ? { __VUE_PROD_HYDRATION_MISMATCH_DETAILS__: "false" } : {},
          FEATURES: JSON.stringify(features)
        }
      }, config = mergeConfig(
        baseConfig,
        viteConfigFromStorybook
      );
      return (nonMutableInputConfig.test?.include?.length ?? 0) > 0 && (nonMutableInputConfig.test.include = [], console.log(
        import_picocolors.default.yellow(import_ts_dedent.dedent`
            Warning: Starting in Storybook 8.5.0-alpha.18, the "test.include" option in Vitest is discouraged in favor of just using the "stories" field in your Storybook configuration.

            The values you passed to "test.include" will be ignored, please remove them from your Vitest configuration where the Storybook plugin is applied.
            
            More info: https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#addon-test-indexing-behavior-of-storybookaddon-test-is-changed
          `)
      )), config;
    },
    configureVitest(context) {
      context.vitest.config.coverage.exclude.push("storybook-static"), !core?.disableTelemetry && !optionalEnvToBoolean(process.env.STORYBOOK_DISABLE_TELEMETRY) && telemetry(
        "test-run",
        {
          runner: "vitest",
          watch: context.vitest.config.watch,
          coverage: !!context.vitest.config.coverage?.enabled
        },
        { configDir: finalOptions.configDir }
      );
    },
    async configureServer(server) {
      if (staticDirs)
        for (let staticDir of staticDirs)
          try {
            let { staticPath, targetEndpoint } = mapStaticDir(staticDir, directories.configDir);
            server.middlewares.use(
              targetEndpoint,
              (0, import_sirv.default)(staticPath, {
                dev: !0,
                etag: !0,
                extensions: []
              })
            );
          } catch (e) {
            console.warn(e);
          }
    },
    async transform(code, id) {
      if (!optionalEnvToBoolean(process.env.VITEST))
        return code;
      let relativeId = relative(finalOptions.vitestRoot, id);
      if ((0, import_micromatch.match)([relativeId], finalOptions.includeStories).length > 0)
        return vitestTransform({
          code,
          fileName: id,
          configDir: finalOptions.configDir,
          tagsFilter: finalOptions.tags,
          stories: storiesGlobs,
          previewLevelTags
        });
    }
  };
  if (plugins.push(storybookTestPlugin), isVitestStorybook) {
    let projectName = `storybook:${normalize(finalOptions.configDir)}`;
    plugins.push({
      name: "storybook:workspace-name-override",
      config: {
        order: "pre",
        handler: () => ({
          test: {
            name: projectName
          }
        })
      }
    });
  }
  return plugins;
}, vitest_plugin_default = storybookTest;
export {
  vitest_plugin_default as default,
  storybookTest
};

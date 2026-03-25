import "./chunk-4BE7D4DS.js";

// ../../node_modules/vitest-axe/node_modules/chalk/source/vendor/ansi-styles/index.js
var wrapAnsi16 = (offset = 0) => (code) => `\x1B[${code + offset}m`, wrapAnsi256 = (offset = 0) => (code) => `\x1B[${38 + offset};5;${code}m`, wrapAnsi16m = (offset = 0) => (red, green, blue) => `\x1B[${38 + offset};2;${red};${green};${blue}m`, styles = {
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
}, modifierNames = Object.keys(styles.modifier), foregroundColorNames = Object.keys(styles.color), backgroundColorNames = Object.keys(styles.bgColor), colorNames = [...foregroundColorNames, ...backgroundColorNames];
function assembleStyles() {
  let codes = /* @__PURE__ */ new Map();
  for (let [groupName, group] of Object.entries(styles)) {
    for (let [styleName, style] of Object.entries(group))
      styles[styleName] = {
        open: `\x1B[${style[0]}m`,
        close: `\x1B[${style[1]}m`
      }, group[styleName] = styles[styleName], codes.set(style[0], style[1]);
    Object.defineProperty(styles, groupName, {
      value: group,
      enumerable: !1
    });
  }
  return Object.defineProperty(styles, "codes", {
    value: codes,
    enumerable: !1
  }), styles.color.close = "\x1B[39m", styles.bgColor.close = "\x1B[49m", styles.color.ansi = wrapAnsi16(), styles.color.ansi256 = wrapAnsi256(), styles.color.ansi16m = wrapAnsi16m(), styles.bgColor.ansi = wrapAnsi16(10), styles.bgColor.ansi256 = wrapAnsi256(10), styles.bgColor.ansi16m = wrapAnsi16m(10), Object.defineProperties(styles, {
    rgbToAnsi256: {
      value(red, green, blue) {
        return red === green && green === blue ? red < 8 ? 16 : red > 248 ? 231 : Math.round((red - 8) / 247 * 24) + 232 : 16 + 36 * Math.round(red / 255 * 5) + 6 * Math.round(green / 255 * 5) + Math.round(blue / 255 * 5);
      },
      enumerable: !1
    },
    hexToRgb: {
      value(hex) {
        let matches = /[a-f\d]{6}|[a-f\d]{3}/i.exec(hex.toString(16));
        if (!matches)
          return [0, 0, 0];
        let [colorString] = matches;
        colorString.length === 3 && (colorString = [...colorString].map((character) => character + character).join(""));
        let integer = Number.parseInt(colorString, 16);
        return [
          /* eslint-disable no-bitwise */
          integer >> 16 & 255,
          integer >> 8 & 255,
          integer & 255
          /* eslint-enable no-bitwise */
        ];
      },
      enumerable: !1
    },
    hexToAnsi256: {
      value: (hex) => styles.rgbToAnsi256(...styles.hexToRgb(hex)),
      enumerable: !1
    },
    ansi256ToAnsi: {
      value(code) {
        if (code < 8)
          return 30 + code;
        if (code < 16)
          return 90 + (code - 8);
        let red, green, blue;
        if (code >= 232)
          red = ((code - 232) * 10 + 8) / 255, green = red, blue = red;
        else {
          code -= 16;
          let remainder = code % 36;
          red = Math.floor(code / 36) / 5, green = Math.floor(remainder / 6) / 5, blue = remainder % 6 / 5;
        }
        let value = Math.max(red, green, blue) * 2;
        if (value === 0)
          return 30;
        let result = 30 + (Math.round(blue) << 2 | Math.round(green) << 1 | Math.round(red));
        return value === 2 && (result += 60), result;
      },
      enumerable: !1
    },
    rgbToAnsi: {
      value: (red, green, blue) => styles.ansi256ToAnsi(styles.rgbToAnsi256(red, green, blue)),
      enumerable: !1
    },
    hexToAnsi: {
      value: (hex) => styles.ansi256ToAnsi(styles.hexToAnsi256(hex)),
      enumerable: !1
    }
  }), styles;
}
var ansiStyles = assembleStyles(), ansi_styles_default = ansiStyles;

// ../../node_modules/vitest-axe/node_modules/chalk/source/vendor/supports-color/browser.js
var level = (() => {
  if (!("navigator" in globalThis))
    return 0;
  if (globalThis.navigator.userAgentData) {
    let brand = navigator.userAgentData.brands.find(({ brand: brand2 }) => brand2 === "Chromium");
    if (brand && brand.version > 93)
      return 3;
  }
  return /\b(Chrome|Chromium)\//.test(globalThis.navigator.userAgent) ? 1 : 0;
})(), colorSupport = level !== 0 && {
  level,
  hasBasic: !0,
  has256: level >= 2,
  has16m: level >= 3
}, supportsColor = {
  stdout: colorSupport,
  stderr: colorSupport
}, browser_default = supportsColor;

// ../../node_modules/vitest-axe/node_modules/chalk/source/utilities.js
function stringReplaceAll(string, substring, replacer) {
  let index = string.indexOf(substring);
  if (index === -1)
    return string;
  let substringLength = substring.length, endIndex = 0, returnValue = "";
  do
    returnValue += string.slice(endIndex, index) + substring + replacer, endIndex = index + substringLength, index = string.indexOf(substring, endIndex);
  while (index !== -1);
  return returnValue += string.slice(endIndex), returnValue;
}
function stringEncaseCRLFWithFirstIndex(string, prefix, postfix, index) {
  let endIndex = 0, returnValue = "";
  do {
    let gotCR = string[index - 1] === "\r";
    returnValue += string.slice(endIndex, gotCR ? index - 1 : index) + prefix + (gotCR ? `\r
` : `
`) + postfix, endIndex = index + 1, index = string.indexOf(`
`, endIndex);
  } while (index !== -1);
  return returnValue += string.slice(endIndex), returnValue;
}

// ../../node_modules/vitest-axe/node_modules/chalk/source/index.js
var { stdout: stdoutColor, stderr: stderrColor } = browser_default, GENERATOR = Symbol("GENERATOR"), STYLER = Symbol("STYLER"), IS_EMPTY = Symbol("IS_EMPTY"), levelMapping = [
  "ansi",
  "ansi",
  "ansi256",
  "ansi16m"
], styles2 = /* @__PURE__ */ Object.create(null), applyOptions = (object, options = {}) => {
  if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3))
    throw new Error("The `level` option should be an integer from 0 to 3");
  let colorLevel = stdoutColor ? stdoutColor.level : 0;
  object.level = options.level === void 0 ? colorLevel : options.level;
};
var chalkFactory = (options) => {
  let chalk2 = (...strings) => strings.join(" ");
  return applyOptions(chalk2, options), Object.setPrototypeOf(chalk2, createChalk.prototype), chalk2;
};
function createChalk(options) {
  return chalkFactory(options);
}
Object.setPrototypeOf(createChalk.prototype, Function.prototype);
for (let [styleName, style] of Object.entries(ansi_styles_default))
  styles2[styleName] = {
    get() {
      let builder = createBuilder(this, createStyler(style.open, style.close, this[STYLER]), this[IS_EMPTY]);
      return Object.defineProperty(this, styleName, { value: builder }), builder;
    }
  };
styles2.visible = {
  get() {
    let builder = createBuilder(this, this[STYLER], !0);
    return Object.defineProperty(this, "visible", { value: builder }), builder;
  }
};
var getModelAnsi = (model, level2, type, ...arguments_) => model === "rgb" ? level2 === "ansi16m" ? ansi_styles_default[type].ansi16m(...arguments_) : level2 === "ansi256" ? ansi_styles_default[type].ansi256(ansi_styles_default.rgbToAnsi256(...arguments_)) : ansi_styles_default[type].ansi(ansi_styles_default.rgbToAnsi(...arguments_)) : model === "hex" ? getModelAnsi("rgb", level2, type, ...ansi_styles_default.hexToRgb(...arguments_)) : ansi_styles_default[type][model](...arguments_), usedModels = ["rgb", "hex", "ansi256"];
for (let model of usedModels) {
  styles2[model] = {
    get() {
      let { level: level2 } = this;
      return function(...arguments_) {
        let styler = createStyler(getModelAnsi(model, levelMapping[level2], "color", ...arguments_), ansi_styles_default.color.close, this[STYLER]);
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    }
  };
  let bgModel = "bg" + model[0].toUpperCase() + model.slice(1);
  styles2[bgModel] = {
    get() {
      let { level: level2 } = this;
      return function(...arguments_) {
        let styler = createStyler(getModelAnsi(model, levelMapping[level2], "bgColor", ...arguments_), ansi_styles_default.bgColor.close, this[STYLER]);
        return createBuilder(this, styler, this[IS_EMPTY]);
      };
    }
  };
}
var proto = Object.defineProperties(() => {
}, {
  ...styles2,
  level: {
    enumerable: !0,
    get() {
      return this[GENERATOR].level;
    },
    set(level2) {
      this[GENERATOR].level = level2;
    }
  }
}), createStyler = (open, close, parent) => {
  let openAll, closeAll;
  return parent === void 0 ? (openAll = open, closeAll = close) : (openAll = parent.openAll + open, closeAll = close + parent.closeAll), {
    open,
    close,
    openAll,
    closeAll,
    parent
  };
}, createBuilder = (self, _styler, _isEmpty) => {
  let builder = (...arguments_) => applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
  return Object.setPrototypeOf(builder, proto), builder[GENERATOR] = self, builder[STYLER] = _styler, builder[IS_EMPTY] = _isEmpty, builder;
}, applyStyle = (self, string) => {
  if (self.level <= 0 || !string)
    return self[IS_EMPTY] ? "" : string;
  let styler = self[STYLER];
  if (styler === void 0)
    return string;
  let { openAll, closeAll } = styler;
  if (string.includes("\x1B"))
    for (; styler !== void 0; )
      string = stringReplaceAll(string, styler.close, styler.open), styler = styler.parent;
  let lfIndex = string.indexOf(`
`);
  return lfIndex !== -1 && (string = stringEncaseCRLFWithFirstIndex(string, closeAll, openAll, lfIndex)), openAll + string + closeAll;
};
Object.defineProperties(createChalk.prototype, styles2);
var chalk = createChalk(), chalkStderr = createChalk({ level: stderrColor ? stderrColor.level : 0 });
var source_default = chalk;

// ../../node_modules/vitest-axe/dist/chunk-X4FZIUYL.js
var __create = Object.create, __defProp = Object.defineProperty, __getOwnPropDesc = Object.getOwnPropertyDescriptor, __getOwnPropNames = Object.getOwnPropertyNames, __getProtoOf = Object.getPrototypeOf, __hasOwnProp = Object.prototype.hasOwnProperty, __commonJS = (cb, mod) => function() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
}, __copyProps = (to, from, except, desc) => {
  if (from && typeof from == "object" || typeof from == "function")
    for (let key of __getOwnPropNames(from))
      !__hasOwnProp.call(to, key) && key !== except && __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  return to;
}, __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: !0 }) : target, mod)), require_ansi_styles = __commonJS({
  "node_modules/pretty-format/node_modules/ansi-styles/index.js"(exports, module) {
    "use strict";
    var ANSI_BACKGROUND_OFFSET = 10, wrapAnsi2562 = (offset = 0) => (code) => `\x1B[${38 + offset};5;${code}m`, wrapAnsi16m2 = (offset = 0) => (red, green, blue) => `\x1B[${38 + offset};2;${red};${green};${blue}m`;
    function assembleStyles2() {
      let codes = /* @__PURE__ */ new Map(), styles3 = {
        modifier: {
          reset: [0, 0],
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
          blackBright: [90, 39],
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
          bgBlackBright: [100, 49],
          bgRedBright: [101, 49],
          bgGreenBright: [102, 49],
          bgYellowBright: [103, 49],
          bgBlueBright: [104, 49],
          bgMagentaBright: [105, 49],
          bgCyanBright: [106, 49],
          bgWhiteBright: [107, 49]
        }
      };
      styles3.color.gray = styles3.color.blackBright, styles3.bgColor.bgGray = styles3.bgColor.bgBlackBright, styles3.color.grey = styles3.color.blackBright, styles3.bgColor.bgGrey = styles3.bgColor.bgBlackBright;
      for (let [groupName, group] of Object.entries(styles3)) {
        for (let [styleName, style] of Object.entries(group))
          styles3[styleName] = {
            open: `\x1B[${style[0]}m`,
            close: `\x1B[${style[1]}m`
          }, group[styleName] = styles3[styleName], codes.set(style[0], style[1]);
        Object.defineProperty(styles3, groupName, {
          value: group,
          enumerable: !1
        });
      }
      return Object.defineProperty(styles3, "codes", {
        value: codes,
        enumerable: !1
      }), styles3.color.close = "\x1B[39m", styles3.bgColor.close = "\x1B[49m", styles3.color.ansi256 = wrapAnsi2562(), styles3.color.ansi16m = wrapAnsi16m2(), styles3.bgColor.ansi256 = wrapAnsi2562(ANSI_BACKGROUND_OFFSET), styles3.bgColor.ansi16m = wrapAnsi16m2(ANSI_BACKGROUND_OFFSET), Object.defineProperties(styles3, {
        rgbToAnsi256: {
          value: (red, green, blue) => red === green && green === blue ? red < 8 ? 16 : red > 248 ? 231 : Math.round((red - 8) / 247 * 24) + 232 : 16 + 36 * Math.round(red / 255 * 5) + 6 * Math.round(green / 255 * 5) + Math.round(blue / 255 * 5),
          enumerable: !1
        },
        hexToRgb: {
          value: (hex) => {
            let matches = /(?<colorString>[a-f\d]{6}|[a-f\d]{3})/i.exec(hex.toString(16));
            if (!matches)
              return [0, 0, 0];
            let { colorString } = matches.groups;
            colorString.length === 3 && (colorString = colorString.split("").map((character) => character + character).join(""));
            let integer = Number.parseInt(colorString, 16);
            return [
              integer >> 16 & 255,
              integer >> 8 & 255,
              integer & 255
            ];
          },
          enumerable: !1
        },
        hexToAnsi256: {
          value: (hex) => styles3.rgbToAnsi256(...styles3.hexToRgb(hex)),
          enumerable: !1
        }
      }), styles3;
    }
    Object.defineProperty(module, "exports", {
      enumerable: !0,
      get: assembleStyles2
    });
  }
}), require_collections = __commonJS({
  "node_modules/pretty-format/build/collections.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    }), exports.printIteratorEntries = printIteratorEntries, exports.printIteratorValues = printIteratorValues, exports.printListItems = printListItems, exports.printObjectProperties = printObjectProperties;
    var getKeysOfEnumerableProperties = (object, compareKeys) => {
      let keys = Object.keys(object).sort(compareKeys);
      return Object.getOwnPropertySymbols && Object.getOwnPropertySymbols(object).forEach((symbol) => {
        Object.getOwnPropertyDescriptor(object, symbol).enumerable && keys.push(symbol);
      }), keys;
    };
    function printIteratorEntries(iterator, config, indentation, depth, refs, printer, separator = ": ") {
      let result = "", width = 0, current = iterator.next();
      if (!current.done) {
        result += config.spacingOuter;
        let indentationNext = indentation + config.indent;
        for (; !current.done; ) {
          if (result += indentationNext, width++ === config.maxWidth) {
            result += "\u2026";
            break;
          }
          let name = printer(current.value[0], config, indentationNext, depth, refs), value = printer(current.value[1], config, indentationNext, depth, refs);
          result += name + separator + value, current = iterator.next(), current.done ? config.min || (result += ",") : result += `,${config.spacingInner}`;
        }
        result += config.spacingOuter + indentation;
      }
      return result;
    }
    function printIteratorValues(iterator, config, indentation, depth, refs, printer) {
      let result = "", width = 0, current = iterator.next();
      if (!current.done) {
        result += config.spacingOuter;
        let indentationNext = indentation + config.indent;
        for (; !current.done; ) {
          if (result += indentationNext, width++ === config.maxWidth) {
            result += "\u2026";
            break;
          }
          result += printer(current.value, config, indentationNext, depth, refs), current = iterator.next(), current.done ? config.min || (result += ",") : result += `,${config.spacingInner}`;
        }
        result += config.spacingOuter + indentation;
      }
      return result;
    }
    function printListItems(list, config, indentation, depth, refs, printer) {
      let result = "";
      if (list.length) {
        result += config.spacingOuter;
        let indentationNext = indentation + config.indent;
        for (let i = 0; i < list.length; i++) {
          if (result += indentationNext, i === config.maxWidth) {
            result += "\u2026";
            break;
          }
          i in list && (result += printer(list[i], config, indentationNext, depth, refs)), i < list.length - 1 ? result += `,${config.spacingInner}` : config.min || (result += ",");
        }
        result += config.spacingOuter + indentation;
      }
      return result;
    }
    function printObjectProperties(val, config, indentation, depth, refs, printer) {
      let result = "", keys = getKeysOfEnumerableProperties(val, config.compareKeys);
      if (keys.length) {
        result += config.spacingOuter;
        let indentationNext = indentation + config.indent;
        for (let i = 0; i < keys.length; i++) {
          let key = keys[i], name = printer(key, config, indentationNext, depth, refs), value = printer(val[key], config, indentationNext, depth, refs);
          result += `${indentationNext + name}: ${value}`, i < keys.length - 1 ? result += `,${config.spacingInner}` : config.min || (result += ",");
        }
        result += config.spacingOuter + indentation;
      }
      return result;
    }
  }
}), require_AsymmetricMatcher = __commonJS({
  "node_modules/pretty-format/build/plugins/AsymmetricMatcher.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    }), exports.test = exports.serialize = exports.default = void 0;
    var _collections = require_collections(), Symbol2 = globalThis["jest-symbol-do-not-touch"] || globalThis.Symbol, asymmetricMatcher = typeof Symbol2 == "function" && Symbol2.for ? Symbol2.for("jest.asymmetricMatcher") : 1267621, SPACE = " ", serialize = (val, config, indentation, depth, refs, printer) => {
      let stringedValue = val.toString();
      if (stringedValue === "ArrayContaining" || stringedValue === "ArrayNotContaining")
        return ++depth > config.maxDepth ? `[${stringedValue}]` : `${stringedValue + SPACE}[${(0, _collections.printListItems)(val.sample, config, indentation, depth, refs, printer)}]`;
      if (stringedValue === "ObjectContaining" || stringedValue === "ObjectNotContaining")
        return ++depth > config.maxDepth ? `[${stringedValue}]` : `${stringedValue + SPACE}{${(0, _collections.printObjectProperties)(val.sample, config, indentation, depth, refs, printer)}}`;
      if (stringedValue === "StringMatching" || stringedValue === "StringNotMatching" || stringedValue === "StringContaining" || stringedValue === "StringNotContaining")
        return stringedValue + SPACE + printer(val.sample, config, indentation, depth, refs);
      if (typeof val.toAsymmetricMatcher != "function")
        throw new Error(`Asymmetric matcher ${val.constructor.name} does not implement toAsymmetricMatcher()`);
      return val.toAsymmetricMatcher();
    };
    exports.serialize = serialize;
    var test = (val) => val && val.$$typeof === asymmetricMatcher;
    exports.test = test;
    var plugin = {
      serialize,
      test
    }, _default = plugin;
    exports.default = _default;
  }
}), require_ansi_regex = __commonJS({
  "node_modules/ansi-regex/index.js"(exports, module) {
    "use strict";
    module.exports = ({ onlyFirst = !1 } = {}) => {
      let pattern = [
        "[\\u001B\\u009B][[\\]()#;?]*(?:(?:(?:(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]+)*|[a-zA-Z\\d]+(?:;[-a-zA-Z\\d\\/#&.:=?%@~_]*)*)?\\u0007)",
        "(?:(?:\\d{1,4}(?:;\\d{0,4})*)?[\\dA-PR-TZcf-ntqry=><~]))"
      ].join("|");
      return new RegExp(pattern, onlyFirst ? void 0 : "g");
    };
  }
}), require_ConvertAnsi = __commonJS({
  "node_modules/pretty-format/build/plugins/ConvertAnsi.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    }), exports.test = exports.serialize = exports.default = void 0;
    var _ansiRegex = _interopRequireDefault(require_ansi_regex()), _ansiStyles = _interopRequireDefault(require_ansi_styles());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var toHumanReadableAnsi = (text) => text.replace((0, _ansiRegex.default)(), (match) => {
      switch (match) {
        case _ansiStyles.default.red.close:
        case _ansiStyles.default.green.close:
        case _ansiStyles.default.cyan.close:
        case _ansiStyles.default.gray.close:
        case _ansiStyles.default.white.close:
        case _ansiStyles.default.yellow.close:
        case _ansiStyles.default.bgRed.close:
        case _ansiStyles.default.bgGreen.close:
        case _ansiStyles.default.bgYellow.close:
        case _ansiStyles.default.inverse.close:
        case _ansiStyles.default.dim.close:
        case _ansiStyles.default.bold.close:
        case _ansiStyles.default.reset.open:
        case _ansiStyles.default.reset.close:
          return "</>";
        case _ansiStyles.default.red.open:
          return "<red>";
        case _ansiStyles.default.green.open:
          return "<green>";
        case _ansiStyles.default.cyan.open:
          return "<cyan>";
        case _ansiStyles.default.gray.open:
          return "<gray>";
        case _ansiStyles.default.white.open:
          return "<white>";
        case _ansiStyles.default.yellow.open:
          return "<yellow>";
        case _ansiStyles.default.bgRed.open:
          return "<bgRed>";
        case _ansiStyles.default.bgGreen.open:
          return "<bgGreen>";
        case _ansiStyles.default.bgYellow.open:
          return "<bgYellow>";
        case _ansiStyles.default.inverse.open:
          return "<inverse>";
        case _ansiStyles.default.dim.open:
          return "<dim>";
        case _ansiStyles.default.bold.open:
          return "<bold>";
        default:
          return "";
      }
    }), test = (val) => typeof val == "string" && !!val.match((0, _ansiRegex.default)());
    exports.test = test;
    var serialize = (val, config, indentation, depth, refs, printer) => printer(toHumanReadableAnsi(val), config, indentation, depth, refs);
    exports.serialize = serialize;
    var plugin = {
      serialize,
      test
    }, _default = plugin;
    exports.default = _default;
  }
}), require_DOMCollection = __commonJS({
  "node_modules/pretty-format/build/plugins/DOMCollection.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    }), exports.test = exports.serialize = exports.default = void 0;
    var _collections = require_collections(), SPACE = " ", OBJECT_NAMES = ["DOMStringMap", "NamedNodeMap"], ARRAY_REGEXP = /^(HTML\w*Collection|NodeList)$/, testName = (name) => OBJECT_NAMES.indexOf(name) !== -1 || ARRAY_REGEXP.test(name), test = (val) => val && val.constructor && !!val.constructor.name && testName(val.constructor.name);
    exports.test = test;
    var isNamedNodeMap = (collection) => collection.constructor.name === "NamedNodeMap", serialize = (collection, config, indentation, depth, refs, printer) => {
      let name = collection.constructor.name;
      return ++depth > config.maxDepth ? `[${name}]` : (config.min ? "" : name + SPACE) + (OBJECT_NAMES.indexOf(name) !== -1 ? `{${(0, _collections.printObjectProperties)(isNamedNodeMap(collection) ? Array.from(collection).reduce((props, attribute) => (props[attribute.name] = attribute.value, props), {}) : { ...collection }, config, indentation, depth, refs, printer)}}` : `[${(0, _collections.printListItems)(Array.from(collection), config, indentation, depth, refs, printer)}]`);
    };
    exports.serialize = serialize;
    var plugin = {
      serialize,
      test
    }, _default = plugin;
    exports.default = _default;
  }
}), require_escapeHTML = __commonJS({
  "node_modules/pretty-format/build/plugins/lib/escapeHTML.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    }), exports.default = escapeHTML;
    function escapeHTML(str) {
      return str.replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }
  }
}), require_markup = __commonJS({
  "node_modules/pretty-format/build/plugins/lib/markup.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    }), exports.printText = exports.printProps = exports.printElementAsLeaf = exports.printElement = exports.printComment = exports.printChildren = void 0;
    var _escapeHTML = _interopRequireDefault(require_escapeHTML());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var printProps = (keys, props, config, indentation, depth, refs, printer) => {
      let indentationNext = indentation + config.indent, colors = config.colors;
      return keys.map((key) => {
        let value = props[key], printed = printer(value, config, indentationNext, depth, refs);
        return typeof value != "string" && (printed.indexOf(`
`) !== -1 && (printed = config.spacingOuter + indentationNext + printed + config.spacingOuter + indentation), printed = `{${printed}}`), `${config.spacingInner + indentation + colors.prop.open + key + colors.prop.close}=${colors.value.open}${printed}${colors.value.close}`;
      }).join("");
    };
    exports.printProps = printProps;
    var printChildren = (children, config, indentation, depth, refs, printer) => children.map((child) => config.spacingOuter + indentation + (typeof child == "string" ? printText(child, config) : printer(child, config, indentation, depth, refs))).join("");
    exports.printChildren = printChildren;
    var printText = (text, config) => {
      let contentColor = config.colors.content;
      return contentColor.open + (0, _escapeHTML.default)(text) + contentColor.close;
    };
    exports.printText = printText;
    var printComment = (comment, config) => {
      let commentColor = config.colors.comment;
      return `${commentColor.open}<!--${(0, _escapeHTML.default)(comment)}-->${commentColor.close}`;
    };
    exports.printComment = printComment;
    var printElement = (type, printedProps, printedChildren, config, indentation) => {
      let tagColor = config.colors.tag;
      return `${tagColor.open}<${type}${printedProps && tagColor.close + printedProps + config.spacingOuter + indentation + tagColor.open}${printedChildren ? `>${tagColor.close}${printedChildren}${config.spacingOuter}${indentation}${tagColor.open}</${type}` : `${printedProps && !config.min ? "" : " "}/`}>${tagColor.close}`;
    };
    exports.printElement = printElement;
    var printElementAsLeaf = (type, config) => {
      let tagColor = config.colors.tag;
      return `${tagColor.open}<${type}${tagColor.close} \u2026${tagColor.open} />${tagColor.close}`;
    };
    exports.printElementAsLeaf = printElementAsLeaf;
  }
}), require_DOMElement = __commonJS({
  "node_modules/pretty-format/build/plugins/DOMElement.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    }), exports.test = exports.serialize = exports.default = void 0;
    var _markup = require_markup(), ELEMENT_NODE = 1, TEXT_NODE = 3, COMMENT_NODE = 8, FRAGMENT_NODE = 11, ELEMENT_REGEXP = /^((HTML|SVG)\w*)?Element$/, testHasAttribute = (val) => {
      try {
        return typeof val.hasAttribute == "function" && val.hasAttribute("is");
      } catch {
        return !1;
      }
    }, testNode = (val) => {
      let constructorName = val.constructor.name, { nodeType, tagName } = val, isCustomElement = typeof tagName == "string" && tagName.includes("-") || testHasAttribute(val);
      return nodeType === ELEMENT_NODE && (ELEMENT_REGEXP.test(constructorName) || isCustomElement) || nodeType === TEXT_NODE && constructorName === "Text" || nodeType === COMMENT_NODE && constructorName === "Comment" || nodeType === FRAGMENT_NODE && constructorName === "DocumentFragment";
    }, test = (val) => {
      var _val$constructor;
      return (val == null || (_val$constructor = val.constructor) === null || _val$constructor === void 0 ? void 0 : _val$constructor.name) && testNode(val);
    };
    exports.test = test;
    function nodeIsText(node) {
      return node.nodeType === TEXT_NODE;
    }
    function nodeIsComment(node) {
      return node.nodeType === COMMENT_NODE;
    }
    function nodeIsFragment(node) {
      return node.nodeType === FRAGMENT_NODE;
    }
    var serialize = (node, config, indentation, depth, refs, printer) => {
      if (nodeIsText(node))
        return (0, _markup.printText)(node.data, config);
      if (nodeIsComment(node))
        return (0, _markup.printComment)(node.data, config);
      let type = nodeIsFragment(node) ? "DocumentFragment" : node.tagName.toLowerCase();
      return ++depth > config.maxDepth ? (0, _markup.printElementAsLeaf)(type, config) : (0, _markup.printElement)(type, (0, _markup.printProps)(nodeIsFragment(node) ? [] : Array.from(node.attributes).map((attr) => attr.name).sort(), nodeIsFragment(node) ? {} : Array.from(node.attributes).reduce((props, attribute) => (props[attribute.name] = attribute.value, props), {}), config, indentation + config.indent, depth, refs, printer), (0, _markup.printChildren)(Array.prototype.slice.call(node.childNodes || node.children), config, indentation + config.indent, depth, refs, printer), config, indentation);
    };
    exports.serialize = serialize;
    var plugin = {
      serialize,
      test
    }, _default = plugin;
    exports.default = _default;
  }
}), require_Immutable = __commonJS({
  "node_modules/pretty-format/build/plugins/Immutable.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    }), exports.test = exports.serialize = exports.default = void 0;
    var _collections = require_collections(), IS_ITERABLE_SENTINEL = "@@__IMMUTABLE_ITERABLE__@@", IS_LIST_SENTINEL = "@@__IMMUTABLE_LIST__@@", IS_KEYED_SENTINEL = "@@__IMMUTABLE_KEYED__@@", IS_MAP_SENTINEL = "@@__IMMUTABLE_MAP__@@", IS_ORDERED_SENTINEL = "@@__IMMUTABLE_ORDERED__@@", IS_RECORD_SENTINEL = "@@__IMMUTABLE_RECORD__@@", IS_SEQ_SENTINEL = "@@__IMMUTABLE_SEQ__@@", IS_SET_SENTINEL = "@@__IMMUTABLE_SET__@@", IS_STACK_SENTINEL = "@@__IMMUTABLE_STACK__@@", getImmutableName = (name) => `Immutable.${name}`, printAsLeaf = (name) => `[${name}]`, SPACE = " ", LAZY = "\u2026", printImmutableEntries = (val, config, indentation, depth, refs, printer, type) => ++depth > config.maxDepth ? printAsLeaf(getImmutableName(type)) : `${getImmutableName(type) + SPACE}{${(0, _collections.printIteratorEntries)(val.entries(), config, indentation, depth, refs, printer)}}`;
    function getRecordEntries(val) {
      let i = 0;
      return {
        next() {
          if (i < val._keys.length) {
            let key = val._keys[i++];
            return {
              done: !1,
              value: [key, val.get(key)]
            };
          }
          return {
            done: !0,
            value: void 0
          };
        }
      };
    }
    var printImmutableRecord = (val, config, indentation, depth, refs, printer) => {
      let name = getImmutableName(val._name || "Record");
      return ++depth > config.maxDepth ? printAsLeaf(name) : `${name + SPACE}{${(0, _collections.printIteratorEntries)(getRecordEntries(val), config, indentation, depth, refs, printer)}}`;
    }, printImmutableSeq = (val, config, indentation, depth, refs, printer) => {
      let name = getImmutableName("Seq");
      return ++depth > config.maxDepth ? printAsLeaf(name) : val[IS_KEYED_SENTINEL] ? `${name + SPACE}{${val._iter || val._object ? (0, _collections.printIteratorEntries)(val.entries(), config, indentation, depth, refs, printer) : LAZY}}` : `${name + SPACE}[${val._iter || val._array || val._collection || val._iterable ? (0, _collections.printIteratorValues)(val.values(), config, indentation, depth, refs, printer) : LAZY}]`;
    }, printImmutableValues = (val, config, indentation, depth, refs, printer, type) => ++depth > config.maxDepth ? printAsLeaf(getImmutableName(type)) : `${getImmutableName(type) + SPACE}[${(0, _collections.printIteratorValues)(val.values(), config, indentation, depth, refs, printer)}]`, serialize = (val, config, indentation, depth, refs, printer) => val[IS_MAP_SENTINEL] ? printImmutableEntries(val, config, indentation, depth, refs, printer, val[IS_ORDERED_SENTINEL] ? "OrderedMap" : "Map") : val[IS_LIST_SENTINEL] ? printImmutableValues(val, config, indentation, depth, refs, printer, "List") : val[IS_SET_SENTINEL] ? printImmutableValues(val, config, indentation, depth, refs, printer, val[IS_ORDERED_SENTINEL] ? "OrderedSet" : "Set") : val[IS_STACK_SENTINEL] ? printImmutableValues(val, config, indentation, depth, refs, printer, "Stack") : val[IS_SEQ_SENTINEL] ? printImmutableSeq(val, config, indentation, depth, refs, printer) : printImmutableRecord(val, config, indentation, depth, refs, printer);
    exports.serialize = serialize;
    var test = (val) => val && (val[IS_ITERABLE_SENTINEL] === !0 || val[IS_RECORD_SENTINEL] === !0);
    exports.test = test;
    var plugin = {
      serialize,
      test
    }, _default = plugin;
    exports.default = _default;
  }
}), require_react_is_production_min = __commonJS({
  "node_modules/react-is/cjs/react-is.production.min.js"(exports) {
    "use strict";
    var b = Symbol.for("react.element"), c = Symbol.for("react.portal"), d = Symbol.for("react.fragment"), e = Symbol.for("react.strict_mode"), f = Symbol.for("react.profiler"), g = Symbol.for("react.provider"), h = Symbol.for("react.context"), k = Symbol.for("react.server_context"), l = Symbol.for("react.forward_ref"), m = Symbol.for("react.suspense"), n = Symbol.for("react.suspense_list"), p = Symbol.for("react.memo"), q = Symbol.for("react.lazy"), t = Symbol.for("react.offscreen"), u;
    u = Symbol.for("react.module.reference");
    function v(a) {
      if (typeof a == "object" && a !== null) {
        var r = a.$$typeof;
        switch (r) {
          case b:
            switch (a = a.type, a) {
              case d:
              case f:
              case e:
              case m:
              case n:
                return a;
              default:
                switch (a = a && a.$$typeof, a) {
                  case k:
                  case h:
                  case l:
                  case q:
                  case p:
                  case g:
                    return a;
                  default:
                    return r;
                }
            }
          case c:
            return r;
        }
      }
    }
    exports.ContextConsumer = h, exports.ContextProvider = g, exports.Element = b, exports.ForwardRef = l, exports.Fragment = d, exports.Lazy = q, exports.Memo = p, exports.Portal = c, exports.Profiler = f, exports.StrictMode = e, exports.Suspense = m, exports.SuspenseList = n, exports.isAsyncMode = function() {
      return !1;
    }, exports.isConcurrentMode = function() {
      return !1;
    }, exports.isContextConsumer = function(a) {
      return v(a) === h;
    }, exports.isContextProvider = function(a) {
      return v(a) === g;
    }, exports.isElement = function(a) {
      return typeof a == "object" && a !== null && a.$$typeof === b;
    }, exports.isForwardRef = function(a) {
      return v(a) === l;
    }, exports.isFragment = function(a) {
      return v(a) === d;
    }, exports.isLazy = function(a) {
      return v(a) === q;
    }, exports.isMemo = function(a) {
      return v(a) === p;
    }, exports.isPortal = function(a) {
      return v(a) === c;
    }, exports.isProfiler = function(a) {
      return v(a) === f;
    }, exports.isStrictMode = function(a) {
      return v(a) === e;
    }, exports.isSuspense = function(a) {
      return v(a) === m;
    }, exports.isSuspenseList = function(a) {
      return v(a) === n;
    }, exports.isValidElementType = function(a) {
      return typeof a == "string" || typeof a == "function" || a === d || a === f || a === e || a === m || a === n || a === t || typeof a == "object" && a !== null && (a.$$typeof === q || a.$$typeof === p || a.$$typeof === g || a.$$typeof === h || a.$$typeof === l || a.$$typeof === u || a.getModuleId !== void 0);
    }, exports.typeOf = v;
  }
}), require_react_is_development = __commonJS({
  "node_modules/react-is/cjs/react-is.development.js"(exports) {
    "use strict";
    process.env.NODE_ENV !== "production" && (function() {
      "use strict";
      var REACT_ELEMENT_TYPE = Symbol.for("react.element"), REACT_PORTAL_TYPE = Symbol.for("react.portal"), REACT_FRAGMENT_TYPE = Symbol.for("react.fragment"), REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode"), REACT_PROFILER_TYPE = Symbol.for("react.profiler"), REACT_PROVIDER_TYPE = Symbol.for("react.provider"), REACT_CONTEXT_TYPE = Symbol.for("react.context"), REACT_SERVER_CONTEXT_TYPE = Symbol.for("react.server_context"), REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref"), REACT_SUSPENSE_TYPE = Symbol.for("react.suspense"), REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list"), REACT_MEMO_TYPE = Symbol.for("react.memo"), REACT_LAZY_TYPE = Symbol.for("react.lazy"), REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen"), enableScopeAPI = !1, enableCacheElement = !1, enableTransitionTracing = !1, enableLegacyHidden = !1, enableDebugTracing = !1, REACT_MODULE_REFERENCE;
      REACT_MODULE_REFERENCE = Symbol.for("react.module.reference");
      function isValidElementType(type) {
        return !!(typeof type == "string" || typeof type == "function" || type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing || typeof type == "object" && type !== null && (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0));
      }
      function typeOf(object) {
        if (typeof object == "object" && object !== null) {
          var $$typeof = object.$$typeof;
          switch ($$typeof) {
            case REACT_ELEMENT_TYPE:
              var type = object.type;
              switch (type) {
                case REACT_FRAGMENT_TYPE:
                case REACT_PROFILER_TYPE:
                case REACT_STRICT_MODE_TYPE:
                case REACT_SUSPENSE_TYPE:
                case REACT_SUSPENSE_LIST_TYPE:
                  return type;
                default:
                  var $$typeofType = type && type.$$typeof;
                  switch ($$typeofType) {
                    case REACT_SERVER_CONTEXT_TYPE:
                    case REACT_CONTEXT_TYPE:
                    case REACT_FORWARD_REF_TYPE:
                    case REACT_LAZY_TYPE:
                    case REACT_MEMO_TYPE:
                    case REACT_PROVIDER_TYPE:
                      return $$typeofType;
                    default:
                      return $$typeof;
                  }
              }
            case REACT_PORTAL_TYPE:
              return $$typeof;
          }
        }
      }
      var ContextConsumer = REACT_CONTEXT_TYPE, ContextProvider = REACT_PROVIDER_TYPE, Element = REACT_ELEMENT_TYPE, ForwardRef = REACT_FORWARD_REF_TYPE, Fragment = REACT_FRAGMENT_TYPE, Lazy = REACT_LAZY_TYPE, Memo = REACT_MEMO_TYPE, Portal = REACT_PORTAL_TYPE, Profiler = REACT_PROFILER_TYPE, StrictMode = REACT_STRICT_MODE_TYPE, Suspense = REACT_SUSPENSE_TYPE, SuspenseList = REACT_SUSPENSE_LIST_TYPE, hasWarnedAboutDeprecatedIsAsyncMode = !1, hasWarnedAboutDeprecatedIsConcurrentMode = !1;
      function isAsyncMode(object) {
        return hasWarnedAboutDeprecatedIsAsyncMode || (hasWarnedAboutDeprecatedIsAsyncMode = !0, console.warn("The ReactIs.isAsyncMode() alias has been deprecated, and will be removed in React 18+.")), !1;
      }
      function isConcurrentMode(object) {
        return hasWarnedAboutDeprecatedIsConcurrentMode || (hasWarnedAboutDeprecatedIsConcurrentMode = !0, console.warn("The ReactIs.isConcurrentMode() alias has been deprecated, and will be removed in React 18+.")), !1;
      }
      function isContextConsumer(object) {
        return typeOf(object) === REACT_CONTEXT_TYPE;
      }
      function isContextProvider(object) {
        return typeOf(object) === REACT_PROVIDER_TYPE;
      }
      function isElement(object) {
        return typeof object == "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
      }
      function isForwardRef(object) {
        return typeOf(object) === REACT_FORWARD_REF_TYPE;
      }
      function isFragment(object) {
        return typeOf(object) === REACT_FRAGMENT_TYPE;
      }
      function isLazy(object) {
        return typeOf(object) === REACT_LAZY_TYPE;
      }
      function isMemo(object) {
        return typeOf(object) === REACT_MEMO_TYPE;
      }
      function isPortal(object) {
        return typeOf(object) === REACT_PORTAL_TYPE;
      }
      function isProfiler(object) {
        return typeOf(object) === REACT_PROFILER_TYPE;
      }
      function isStrictMode(object) {
        return typeOf(object) === REACT_STRICT_MODE_TYPE;
      }
      function isSuspense(object) {
        return typeOf(object) === REACT_SUSPENSE_TYPE;
      }
      function isSuspenseList(object) {
        return typeOf(object) === REACT_SUSPENSE_LIST_TYPE;
      }
      exports.ContextConsumer = ContextConsumer, exports.ContextProvider = ContextProvider, exports.Element = Element, exports.ForwardRef = ForwardRef, exports.Fragment = Fragment, exports.Lazy = Lazy, exports.Memo = Memo, exports.Portal = Portal, exports.Profiler = Profiler, exports.StrictMode = StrictMode, exports.Suspense = Suspense, exports.SuspenseList = SuspenseList, exports.isAsyncMode = isAsyncMode, exports.isConcurrentMode = isConcurrentMode, exports.isContextConsumer = isContextConsumer, exports.isContextProvider = isContextProvider, exports.isElement = isElement, exports.isForwardRef = isForwardRef, exports.isFragment = isFragment, exports.isLazy = isLazy, exports.isMemo = isMemo, exports.isPortal = isPortal, exports.isProfiler = isProfiler, exports.isStrictMode = isStrictMode, exports.isSuspense = isSuspense, exports.isSuspenseList = isSuspenseList, exports.isValidElementType = isValidElementType, exports.typeOf = typeOf;
    })();
  }
}), require_react_is = __commonJS({
  "node_modules/react-is/index.js"(exports, module) {
    "use strict";
    process.env.NODE_ENV === "production" ? module.exports = require_react_is_production_min() : module.exports = require_react_is_development();
  }
}), require_ReactElement = __commonJS({
  "node_modules/pretty-format/build/plugins/ReactElement.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    }), exports.test = exports.serialize = exports.default = void 0;
    var ReactIs = _interopRequireWildcard(require_react_is()), _markup = require_markup();
    function _getRequireWildcardCache(nodeInterop) {
      if (typeof WeakMap != "function")
        return null;
      var cacheBabelInterop = /* @__PURE__ */ new WeakMap(), cacheNodeInterop = /* @__PURE__ */ new WeakMap();
      return (_getRequireWildcardCache = function(nodeInterop2) {
        return nodeInterop2 ? cacheNodeInterop : cacheBabelInterop;
      })(nodeInterop);
    }
    function _interopRequireWildcard(obj, nodeInterop) {
      if (!nodeInterop && obj && obj.__esModule)
        return obj;
      if (obj === null || typeof obj != "object" && typeof obj != "function")
        return { default: obj };
      var cache = _getRequireWildcardCache(nodeInterop);
      if (cache && cache.has(obj))
        return cache.get(obj);
      var newObj = {}, hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor;
      for (var key in obj)
        if (key !== "default" && Object.prototype.hasOwnProperty.call(obj, key)) {
          var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null;
          desc && (desc.get || desc.set) ? Object.defineProperty(newObj, key, desc) : newObj[key] = obj[key];
        }
      return newObj.default = obj, cache && cache.set(obj, newObj), newObj;
    }
    var getChildren = (arg, children = []) => (Array.isArray(arg) ? arg.forEach((item) => {
      getChildren(item, children);
    }) : arg != null && arg !== !1 && children.push(arg), children), getType = (element) => {
      let type = element.type;
      if (typeof type == "string")
        return type;
      if (typeof type == "function")
        return type.displayName || type.name || "Unknown";
      if (ReactIs.isFragment(element))
        return "React.Fragment";
      if (ReactIs.isSuspense(element))
        return "React.Suspense";
      if (typeof type == "object" && type !== null) {
        if (ReactIs.isContextProvider(element))
          return "Context.Provider";
        if (ReactIs.isContextConsumer(element))
          return "Context.Consumer";
        if (ReactIs.isForwardRef(element)) {
          if (type.displayName)
            return type.displayName;
          let functionName = type.render.displayName || type.render.name || "";
          return functionName !== "" ? `ForwardRef(${functionName})` : "ForwardRef";
        }
        if (ReactIs.isMemo(element)) {
          let functionName = type.displayName || type.type.displayName || type.type.name || "";
          return functionName !== "" ? `Memo(${functionName})` : "Memo";
        }
      }
      return "UNDEFINED";
    }, getPropKeys = (element) => {
      let { props } = element;
      return Object.keys(props).filter((key) => key !== "children" && props[key] !== void 0).sort();
    }, serialize = (element, config, indentation, depth, refs, printer) => ++depth > config.maxDepth ? (0, _markup.printElementAsLeaf)(getType(element), config) : (0, _markup.printElement)(getType(element), (0, _markup.printProps)(getPropKeys(element), element.props, config, indentation + config.indent, depth, refs, printer), (0, _markup.printChildren)(getChildren(element.props.children), config, indentation + config.indent, depth, refs, printer), config, indentation);
    exports.serialize = serialize;
    var test = (val) => val != null && ReactIs.isElement(val);
    exports.test = test;
    var plugin = {
      serialize,
      test
    }, _default = plugin;
    exports.default = _default;
  }
}), require_ReactTestComponent = __commonJS({
  "node_modules/pretty-format/build/plugins/ReactTestComponent.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    }), exports.test = exports.serialize = exports.default = void 0;
    var _markup = require_markup(), Symbol2 = globalThis["jest-symbol-do-not-touch"] || globalThis.Symbol, testSymbol = typeof Symbol2 == "function" && Symbol2.for ? Symbol2.for("react.test.json") : 245830487, getPropKeys = (object) => {
      let { props } = object;
      return props ? Object.keys(props).filter((key) => props[key] !== void 0).sort() : [];
    }, serialize = (object, config, indentation, depth, refs, printer) => ++depth > config.maxDepth ? (0, _markup.printElementAsLeaf)(object.type, config) : (0, _markup.printElement)(object.type, object.props ? (0, _markup.printProps)(getPropKeys(object), object.props, config, indentation + config.indent, depth, refs, printer) : "", object.children ? (0, _markup.printChildren)(object.children, config, indentation + config.indent, depth, refs, printer) : "", config, indentation);
    exports.serialize = serialize;
    var test = (val) => val && val.$$typeof === testSymbol;
    exports.test = test;
    var plugin = {
      serialize,
      test
    }, _default = plugin;
    exports.default = _default;
  }
}), require_build = __commonJS({
  "node_modules/pretty-format/build/index.js"(exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", {
      value: !0
    }), exports.default = exports.DEFAULT_OPTIONS = void 0, exports.format = format, exports.plugins = void 0;
    var _ansiStyles = _interopRequireDefault(require_ansi_styles()), _collections = require_collections(), _AsymmetricMatcher = _interopRequireDefault(require_AsymmetricMatcher()), _ConvertAnsi = _interopRequireDefault(require_ConvertAnsi()), _DOMCollection = _interopRequireDefault(require_DOMCollection()), _DOMElement = _interopRequireDefault(require_DOMElement()), _Immutable = _interopRequireDefault(require_Immutable()), _ReactElement = _interopRequireDefault(require_ReactElement()), _ReactTestComponent = _interopRequireDefault(require_ReactTestComponent());
    function _interopRequireDefault(obj) {
      return obj && obj.__esModule ? obj : { default: obj };
    }
    var toString = Object.prototype.toString, toISOString = Date.prototype.toISOString, errorToString = Error.prototype.toString, regExpToString = RegExp.prototype.toString, getConstructorName = (val) => typeof val.constructor == "function" && val.constructor.name || "Object", isWindow = (val) => typeof window < "u" && val === window, SYMBOL_REGEXP = /^Symbol\((.*)\)(.*)$/, NEWLINE_REGEXP = /\n/gi, PrettyFormatPluginError = class extends Error {
      constructor(message, stack) {
        super(message), this.stack = stack, this.name = this.constructor.name;
      }
    };
    function isToStringedArrayType(toStringed) {
      return toStringed === "[object Array]" || toStringed === "[object ArrayBuffer]" || toStringed === "[object DataView]" || toStringed === "[object Float32Array]" || toStringed === "[object Float64Array]" || toStringed === "[object Int8Array]" || toStringed === "[object Int16Array]" || toStringed === "[object Int32Array]" || toStringed === "[object Uint8Array]" || toStringed === "[object Uint8ClampedArray]" || toStringed === "[object Uint16Array]" || toStringed === "[object Uint32Array]";
    }
    function printNumber(val) {
      return Object.is(val, -0) ? "-0" : String(val);
    }
    function printBigInt(val) {
      return `${val}n`;
    }
    function printFunction(val, printFunctionName) {
      return printFunctionName ? `[Function ${val.name || "anonymous"}]` : "[Function]";
    }
    function printSymbol(val) {
      return String(val).replace(SYMBOL_REGEXP, "Symbol($1)");
    }
    function printError(val) {
      return `[${errorToString.call(val)}]`;
    }
    function printBasicValue(val, printFunctionName, escapeRegex, escapeString) {
      if (val === !0 || val === !1)
        return `${val}`;
      if (val === void 0)
        return "undefined";
      if (val === null)
        return "null";
      let typeOf = typeof val;
      if (typeOf === "number")
        return printNumber(val);
      if (typeOf === "bigint")
        return printBigInt(val);
      if (typeOf === "string")
        return escapeString ? `"${val.replace(/"|\\/g, "\\$&")}"` : `"${val}"`;
      if (typeOf === "function")
        return printFunction(val, printFunctionName);
      if (typeOf === "symbol")
        return printSymbol(val);
      let toStringed = toString.call(val);
      return toStringed === "[object WeakMap]" ? "WeakMap {}" : toStringed === "[object WeakSet]" ? "WeakSet {}" : toStringed === "[object Function]" || toStringed === "[object GeneratorFunction]" ? printFunction(val, printFunctionName) : toStringed === "[object Symbol]" ? printSymbol(val) : toStringed === "[object Date]" ? isNaN(+val) ? "Date { NaN }" : toISOString.call(val) : toStringed === "[object Error]" ? printError(val) : toStringed === "[object RegExp]" ? escapeRegex ? regExpToString.call(val).replace(/[\\^$*+?.()|[\]{}]/g, "\\$&") : regExpToString.call(val) : val instanceof Error ? printError(val) : null;
    }
    function printComplexValue(val, config, indentation, depth, refs, hasCalledToJSON) {
      if (refs.indexOf(val) !== -1)
        return "[Circular]";
      refs = refs.slice(), refs.push(val);
      let hitMaxDepth = ++depth > config.maxDepth, min = config.min;
      if (config.callToJSON && !hitMaxDepth && val.toJSON && typeof val.toJSON == "function" && !hasCalledToJSON)
        return printer(val.toJSON(), config, indentation, depth, refs, !0);
      let toStringed = toString.call(val);
      return toStringed === "[object Arguments]" ? hitMaxDepth ? "[Arguments]" : `${min ? "" : "Arguments "}[${(0, _collections.printListItems)(val, config, indentation, depth, refs, printer)}]` : isToStringedArrayType(toStringed) ? hitMaxDepth ? `[${val.constructor.name}]` : `${min || !config.printBasicPrototype && val.constructor.name === "Array" ? "" : `${val.constructor.name} `}[${(0, _collections.printListItems)(val, config, indentation, depth, refs, printer)}]` : toStringed === "[object Map]" ? hitMaxDepth ? "[Map]" : `Map {${(0, _collections.printIteratorEntries)(val.entries(), config, indentation, depth, refs, printer, " => ")}}` : toStringed === "[object Set]" ? hitMaxDepth ? "[Set]" : `Set {${(0, _collections.printIteratorValues)(val.values(), config, indentation, depth, refs, printer)}}` : hitMaxDepth || isWindow(val) ? `[${getConstructorName(val)}]` : `${min || !config.printBasicPrototype && getConstructorName(val) === "Object" ? "" : `${getConstructorName(val)} `}{${(0, _collections.printObjectProperties)(val, config, indentation, depth, refs, printer)}}`;
    }
    function isNewPlugin(plugin) {
      return plugin.serialize != null;
    }
    function printPlugin(plugin, val, config, indentation, depth, refs) {
      let printed;
      try {
        printed = isNewPlugin(plugin) ? plugin.serialize(val, config, indentation, depth, refs, printer) : plugin.print(val, (valChild) => printer(valChild, config, indentation, depth, refs), (str) => {
          let indentationNext = indentation + config.indent;
          return indentationNext + str.replace(NEWLINE_REGEXP, `
${indentationNext}`);
        }, {
          edgeSpacing: config.spacingOuter,
          min: config.min,
          spacing: config.spacingInner
        }, config.colors);
      } catch (error) {
        throw new PrettyFormatPluginError(error.message, error.stack);
      }
      if (typeof printed != "string")
        throw new Error(`pretty-format: Plugin must return type "string" but instead returned "${typeof printed}".`);
      return printed;
    }
    function findPlugin(plugins2, val) {
      for (let p = 0; p < plugins2.length; p++)
        try {
          if (plugins2[p].test(val))
            return plugins2[p];
        } catch (error) {
          throw new PrettyFormatPluginError(error.message, error.stack);
        }
      return null;
    }
    function printer(val, config, indentation, depth, refs, hasCalledToJSON) {
      let plugin = findPlugin(config.plugins, val);
      if (plugin !== null)
        return printPlugin(plugin, val, config, indentation, depth, refs);
      let basicResult = printBasicValue(val, config.printFunctionName, config.escapeRegex, config.escapeString);
      return basicResult !== null ? basicResult : printComplexValue(val, config, indentation, depth, refs, hasCalledToJSON);
    }
    var DEFAULT_THEME = {
      comment: "gray",
      content: "reset",
      prop: "yellow",
      tag: "cyan",
      value: "green"
    }, DEFAULT_THEME_KEYS = Object.keys(DEFAULT_THEME), DEFAULT_OPTIONS = {
      callToJSON: !0,
      compareKeys: void 0,
      escapeRegex: !1,
      escapeString: !0,
      highlight: !1,
      indent: 2,
      maxDepth: 1 / 0,
      maxWidth: 1 / 0,
      min: !1,
      plugins: [],
      printBasicPrototype: !0,
      printFunctionName: !0,
      theme: DEFAULT_THEME
    };
    exports.DEFAULT_OPTIONS = DEFAULT_OPTIONS;
    function validateOptions(options) {
      if (Object.keys(options).forEach((key) => {
        if (!Object.prototype.hasOwnProperty.call(DEFAULT_OPTIONS, key))
          throw new Error(`pretty-format: Unknown option "${key}".`);
      }), options.min && options.indent !== void 0 && options.indent !== 0)
        throw new Error('pretty-format: Options "min" and "indent" cannot be used together.');
      if (options.theme !== void 0) {
        if (options.theme === null)
          throw new Error('pretty-format: Option "theme" must not be null.');
        if (typeof options.theme != "object")
          throw new Error(`pretty-format: Option "theme" must be of type "object" but instead received "${typeof options.theme}".`);
      }
    }
    var getColorsHighlight = (options) => DEFAULT_THEME_KEYS.reduce((colors, key) => {
      let value = options.theme && options.theme[key] !== void 0 ? options.theme[key] : DEFAULT_THEME[key], color = value && _ansiStyles.default[value];
      if (color && typeof color.close == "string" && typeof color.open == "string")
        colors[key] = color;
      else
        throw new Error(`pretty-format: Option "theme" has a key "${key}" whose value "${value}" is undefined in ansi-styles.`);
      return colors;
    }, /* @__PURE__ */ Object.create(null)), getColorsEmpty = () => DEFAULT_THEME_KEYS.reduce((colors, key) => (colors[key] = {
      close: "",
      open: ""
    }, colors), /* @__PURE__ */ Object.create(null)), getPrintFunctionName = (options) => {
      var _options$printFunctio;
      return (_options$printFunctio = options?.printFunctionName) !== null && _options$printFunctio !== void 0 ? _options$printFunctio : DEFAULT_OPTIONS.printFunctionName;
    }, getEscapeRegex = (options) => {
      var _options$escapeRegex;
      return (_options$escapeRegex = options?.escapeRegex) !== null && _options$escapeRegex !== void 0 ? _options$escapeRegex : DEFAULT_OPTIONS.escapeRegex;
    }, getEscapeString = (options) => {
      var _options$escapeString;
      return (_options$escapeString = options?.escapeString) !== null && _options$escapeString !== void 0 ? _options$escapeString : DEFAULT_OPTIONS.escapeString;
    }, getConfig = (options) => {
      var _options$callToJSON, _options$indent, _options$maxDepth, _options$maxWidth, _options$min, _options$plugins, _options$printBasicPr;
      return {
        callToJSON: (_options$callToJSON = options?.callToJSON) !== null && _options$callToJSON !== void 0 ? _options$callToJSON : DEFAULT_OPTIONS.callToJSON,
        colors: options != null && options.highlight ? getColorsHighlight(options) : getColorsEmpty(),
        compareKeys: typeof options?.compareKeys == "function" ? options.compareKeys : DEFAULT_OPTIONS.compareKeys,
        escapeRegex: getEscapeRegex(options),
        escapeString: getEscapeString(options),
        indent: options != null && options.min ? "" : createIndent((_options$indent = options?.indent) !== null && _options$indent !== void 0 ? _options$indent : DEFAULT_OPTIONS.indent),
        maxDepth: (_options$maxDepth = options?.maxDepth) !== null && _options$maxDepth !== void 0 ? _options$maxDepth : DEFAULT_OPTIONS.maxDepth,
        maxWidth: (_options$maxWidth = options?.maxWidth) !== null && _options$maxWidth !== void 0 ? _options$maxWidth : DEFAULT_OPTIONS.maxWidth,
        min: (_options$min = options?.min) !== null && _options$min !== void 0 ? _options$min : DEFAULT_OPTIONS.min,
        plugins: (_options$plugins = options?.plugins) !== null && _options$plugins !== void 0 ? _options$plugins : DEFAULT_OPTIONS.plugins,
        printBasicPrototype: (_options$printBasicPr = options?.printBasicPrototype) !== null && _options$printBasicPr !== void 0 ? _options$printBasicPr : !0,
        printFunctionName: getPrintFunctionName(options),
        spacingInner: options != null && options.min ? " " : `
`,
        spacingOuter: options != null && options.min ? "" : `
`
      };
    };
    function createIndent(indent) {
      return new Array(indent + 1).join(" ");
    }
    function format(val, options) {
      if (options && (validateOptions(options), options.plugins)) {
        let plugin = findPlugin(options.plugins, val);
        if (plugin !== null)
          return printPlugin(plugin, val, getConfig(options), "", 0, []);
      }
      let basicResult = printBasicValue(val, getPrintFunctionName(options), getEscapeRegex(options), getEscapeString(options));
      return basicResult !== null ? basicResult : printComplexValue(val, getConfig(options), "", 0, []);
    }
    var plugins = {
      AsymmetricMatcher: _AsymmetricMatcher.default,
      ConvertAnsi: _ConvertAnsi.default,
      DOMCollection: _DOMCollection.default,
      DOMElement: _DOMElement.default,
      Immutable: _Immutable.default,
      ReactElement: _ReactElement.default,
      ReactTestComponent: _ReactTestComponent.default
    };
    exports.plugins = plugins;
    var _default = format;
    exports.default = _default;
  }
}), import_pretty_format = __toESM(require_build(), 1), {
  AsymmetricMatcher,
  DOMCollection,
  DOMElement,
  Immutable,
  ReactElement,
  ReactTestComponent
} = import_pretty_format.plugins, PLUGINS = [
  ReactTestComponent,
  ReactElement,
  DOMElement,
  DOMCollection,
  Immutable,
  AsymmetricMatcher
], DIM_COLOR = source_default.dim, EXPECTED_COLOR = source_default.green, RECEIVED_COLOR = source_default.red, SPACE_SYMBOL = "\xB7";
function stringify(object, maxDepth = 10, maxWidth = 10) {
  let MAX_LENGTH = 1e4, result;
  try {
    result = (0, import_pretty_format.format)(object, {
      maxDepth,
      maxWidth,
      min: !0,
      plugins: PLUGINS
    });
  } catch {
    result = (0, import_pretty_format.format)(object, {
      callToJSON: !1,
      maxDepth,
      maxWidth,
      min: !0,
      plugins: PLUGINS
    });
  }
  return result.length >= MAX_LENGTH && maxDepth > 1 ? stringify(object, Math.floor(maxDepth / 2), maxWidth) : result.length >= MAX_LENGTH && maxWidth > 1 ? stringify(object, maxDepth, Math.floor(maxWidth / 2)) : result;
}
function replaceTrailingSpaces(text) {
  return text.replace(/\s+$/gm, (spaces) => SPACE_SYMBOL.repeat(spaces.length));
}
function printReceived(object) {
  return RECEIVED_COLOR(replaceTrailingSpaces(stringify(object)));
}
function matcherHint(matcherName, received = "received", expected = "expected", options = {}) {
  let {
    comment = "",
    expectedColor = EXPECTED_COLOR,
    isDirectExpectCall = !1,
    isNot = !1,
    promise = "",
    receivedColor = RECEIVED_COLOR,
    secondArgument = "",
    secondArgumentColor = EXPECTED_COLOR
  } = options, hint = "", dimString = "expect";
  return !isDirectExpectCall && received !== "" && (hint += DIM_COLOR(`${dimString}(`) + receivedColor(received), dimString = ")"), promise !== "" && (hint += DIM_COLOR(`${dimString}.`) + promise, dimString = ""), isNot && (hint += `${DIM_COLOR(`${dimString}.`)}not`, dimString = ""), matcherName.includes(".") ? dimString += matcherName : (hint += DIM_COLOR(`${dimString}.`) + matcherName, dimString = ""), expected === "" ? dimString += "()" : (hint += DIM_COLOR(`${dimString}(`) + expectedColor(expected), secondArgument && (hint += DIM_COLOR(", ") + secondArgumentColor(secondArgument)), dimString = ")"), comment !== "" && (dimString += ` // ${comment}`), dimString !== "" && (hint += DIM_COLOR(dimString)), hint;
}

// ../../node_modules/vitest-axe/dist/matchers.js
function toHaveNoViolations(results) {
  if (typeof results.violations > "u")
    throw new Error("No violations found in aXe results object");
  let violations = filterViolations(results.violations, results.toolOptions ? results.toolOptions.impactLevels : []);
  function reporter(violations2) {
    if (violations2.length === 0)
      return [];
    let lineBreak = `

`;
    return violations2.map((violation) => violation.nodes.map((node) => `Expected the HTML found at $('${node.target.join(", ")}') to have no violations:` + lineBreak + source_default.grey(node.html) + lineBreak + "Received:" + lineBreak + printReceived(`${violation.help} (${violation.id})`) + lineBreak + source_default.yellow(node.failureSummary) + lineBreak + (violation.helpUrl ? `You can find more information on this issue here: 
${source_default.blue(violation.helpUrl)}` : "")).join(lineBreak)).join(lineBreak + "\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500" + lineBreak);
  }
  let formatedViolations = reporter(violations), pass = formatedViolations.length === 0;
  function message() {
    if (!pass)
      return matcherHint(".toHaveNoViolations") + `

${formatedViolations}`;
  }
  return { actual: violations, message, pass };
}
function filterViolations(violations, impactLevels) {
  return impactLevels && impactLevels.length > 0 ? violations.filter((v) => impactLevels.includes(v.impact)) : violations;
}
export {
  toHaveNoViolations
};

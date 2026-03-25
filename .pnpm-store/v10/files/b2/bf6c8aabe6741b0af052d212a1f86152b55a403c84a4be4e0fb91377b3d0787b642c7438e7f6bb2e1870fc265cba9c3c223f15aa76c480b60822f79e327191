"use strict";
const {
  __create,
  __spreadValues,
  __spreadProps,
  __commonJS,
  __export,
  __toESM,
  __toCommonJS,
  __async
} = require('./esblib.cjs');


// node_modules/isexe/dist/cjs/posix.js
var require_posix = __commonJS({
  "node_modules/isexe/dist/cjs/posix.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.sync = exports2.isexe = void 0;
    var fs_1 = require("fs");
    var promises_1 = require("fs").promises;
    var isexe = (_0, ..._1) => __async(null, [_0, ..._1], function* (path, options = {}) {
      const { ignoreErrors = false } = options;
      try {
        return checkStat(yield (0, promises_1.stat)(path), options);
      } catch (e) {
        const er = e;
        if (ignoreErrors || er.code === "EACCES")
          return false;
        throw er;
      }
    });
    exports2.isexe = isexe;
    var sync = (path, options = {}) => {
      const { ignoreErrors = false } = options;
      try {
        return checkStat((0, fs_1.statSync)(path), options);
      } catch (e) {
        const er = e;
        if (ignoreErrors || er.code === "EACCES")
          return false;
        throw er;
      }
    };
    exports2.sync = sync;
    var checkStat = (stat, options) => stat.isFile() && checkMode(stat, options);
    var checkMode = (stat, options) => {
      var _a, _b, _c, _d, _e, _f, _g, _h;
      const myUid = (_b = options.uid) != null ? _b : (_a = process.getuid) == null ? void 0 : _a.call(process);
      const myGroups = (_e = (_d = options.groups) != null ? _d : (_c = process.getgroups) == null ? void 0 : _c.call(process)) != null ? _e : [];
      const myGid = (_h = (_g = options.gid) != null ? _g : (_f = process.getgid) == null ? void 0 : _f.call(process)) != null ? _h : myGroups[0];
      if (myUid === void 0 || myGid === void 0) {
        throw new Error("cannot get uid or gid");
      }
      const groups = /* @__PURE__ */ new Set([myGid, ...myGroups]);
      const mod = stat.mode;
      const uid = stat.uid;
      const gid = stat.gid;
      const u = parseInt("100", 8);
      const g2 = parseInt("010", 8);
      const o = parseInt("001", 8);
      const ug = u | g2;
      return !!(mod & o || mod & g2 && groups.has(gid) || mod & u && uid === myUid || mod & ug && myUid === 0);
    };
  }
});

// node_modules/isexe/dist/cjs/win32.js
var require_win32 = __commonJS({
  "node_modules/isexe/dist/cjs/win32.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.sync = exports2.isexe = void 0;
    var fs_1 = require("fs");
    var promises_1 = require("fs").promises;
    var isexe = (_0, ..._1) => __async(null, [_0, ..._1], function* (path, options = {}) {
      const { ignoreErrors = false } = options;
      try {
        return checkStat(yield (0, promises_1.stat)(path), path, options);
      } catch (e) {
        const er = e;
        if (ignoreErrors || er.code === "EACCES")
          return false;
        throw er;
      }
    });
    exports2.isexe = isexe;
    var sync = (path, options = {}) => {
      const { ignoreErrors = false } = options;
      try {
        return checkStat((0, fs_1.statSync)(path), path, options);
      } catch (e) {
        const er = e;
        if (ignoreErrors || er.code === "EACCES")
          return false;
        throw er;
      }
    };
    exports2.sync = sync;
    var checkPathExt = (path, options) => {
      const { pathExt = process.env.PATHEXT || "" } = options;
      const peSplit = pathExt.split(";");
      if (peSplit.indexOf("") !== -1) {
        return true;
      }
      for (let i = 0; i < peSplit.length; i++) {
        const p = peSplit[i].toLowerCase();
        const ext = path.substring(path.length - p.length).toLowerCase();
        if (p && ext === p) {
          return true;
        }
      }
      return false;
    };
    var checkStat = (stat, path, options) => stat.isFile() && checkPathExt(path, options);
  }
});

// node_modules/isexe/dist/cjs/options.js
var require_options = __commonJS({
  "node_modules/isexe/dist/cjs/options.js"(exports2) {
    "use strict";
    Object.defineProperty(exports2, "__esModule", { value: true });
  }
});

// node_modules/isexe/dist/cjs/index.js
var require_cjs = __commonJS({
  "node_modules/isexe/dist/cjs/index.js"(exports2) {
    "use strict";
    var __createBinding = exports2 && exports2.__createBinding || (Object.create ? (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      var desc = Object.getOwnPropertyDescriptor(m, k);
      if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
        desc = { enumerable: true, get: function() {
          return m[k];
        } };
      }
      Object.defineProperty(o, k2, desc);
    }) : (function(o, m, k, k2) {
      if (k2 === void 0) k2 = k;
      o[k2] = m[k];
    }));
    var __setModuleDefault = exports2 && exports2.__setModuleDefault || (Object.create ? (function(o, v) {
      Object.defineProperty(o, "default", { enumerable: true, value: v });
    }) : function(o, v) {
      o["default"] = v;
    });
    var __importStar = exports2 && exports2.__importStar || function(mod) {
      if (mod && mod.__esModule) return mod;
      var result = {};
      if (mod != null) {
        for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
      }
      __setModuleDefault(result, mod);
      return result;
    };
    var __exportStar = exports2 && exports2.__exportStar || function(m, exports3) {
      for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports3, p)) __createBinding(exports3, m, p);
    };
    Object.defineProperty(exports2, "__esModule", { value: true });
    exports2.sync = exports2.isexe = exports2.posix = exports2.win32 = void 0;
    var posix = __importStar(require_posix());
    exports2.posix = posix;
    var win32 = __importStar(require_win32());
    exports2.win32 = win32;
    __exportStar(require_options(), exports2);
    var platform = process.env._ISEXE_TEST_PLATFORM_ || process.platform;
    var impl = platform === "win32" ? win32 : posix;
    exports2.isexe = impl.isexe;
    exports2.sync = impl.sync;
  }
});

// node_modules/which/lib/index.js
var require_lib = __commonJS({
  "node_modules/which/lib/index.js"(exports2, module2) {
    "use strict";
    var { isexe, sync: isexeSync } = require_cjs();
    var { join, delimiter, sep, posix } = require("path");
    var isWindows = process.platform === "win32";
    var rSlash = new RegExp(`[${posix.sep}${sep === posix.sep ? "" : sep}]`.replace(/(\\)/g, "\\$1"));
    var rRel = new RegExp(`^\\.${rSlash.source}`);
    var getNotFoundError = (cmd) => Object.assign(new Error(`not found: ${cmd}`), { code: "ENOENT" });
    var getPathInfo = (cmd, {
      path: optPath = process.env.PATH,
      pathExt: optPathExt = process.env.PATHEXT,
      delimiter: optDelimiter = delimiter
    }) => {
      const pathEnv = cmd.match(rSlash) ? [""] : [
        // windows always checks the cwd first
        ...isWindows ? [process.cwd()] : [],
        ...(optPath || /* istanbul ignore next: very unusual */
        "").split(optDelimiter)
      ];
      if (isWindows) {
        const pathExtExe = optPathExt || [".EXE", ".CMD", ".BAT", ".COM"].join(optDelimiter);
        const pathExt = pathExtExe.split(optDelimiter).flatMap((item) => [item, item.toLowerCase()]);
        if (cmd.includes(".") && pathExt[0] !== "") {
          pathExt.unshift("");
        }
        return { pathEnv, pathExt, pathExtExe };
      }
      return { pathEnv, pathExt: [""] };
    };
    var getPathPart = (raw, cmd) => {
      const pathPart = /^".*"$/.test(raw) ? raw.slice(1, -1) : raw;
      const prefix = !pathPart && rRel.test(cmd) ? cmd.slice(0, 2) : "";
      return prefix + join(pathPart, cmd);
    };
    var which2 = (_0, ..._1) => __async(null, [_0, ..._1], function* (cmd, opt = {}) {
      const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
      const found = [];
      for (const envPart of pathEnv) {
        const p = getPathPart(envPart, cmd);
        for (const ext of pathExt) {
          const withExt = p + ext;
          const is = yield isexe(withExt, { pathExt: pathExtExe, ignoreErrors: true });
          if (is) {
            if (!opt.all) {
              return withExt;
            }
            found.push(withExt);
          }
        }
      }
      if (opt.all && found.length) {
        return found;
      }
      if (opt.nothrow) {
        return null;
      }
      throw getNotFoundError(cmd);
    });
    var whichSync = (cmd, opt = {}) => {
      const { pathEnv, pathExt, pathExtExe } = getPathInfo(cmd, opt);
      const found = [];
      for (const pathEnvPart of pathEnv) {
        const p = getPathPart(pathEnvPart, cmd);
        for (const ext of pathExt) {
          const withExt = p + ext;
          const is = isexeSync(withExt, { pathExt: pathExtExe, ignoreErrors: true });
          if (is) {
            if (!opt.all) {
              return withExt;
            }
            found.push(withExt);
          }
        }
      }
      if (opt.all && found.length) {
        return found;
      }
      if (opt.nothrow) {
        return null;
      }
      throw getNotFoundError(cmd);
    };
    module2.exports = which2;
    which2.sync = whichSync;
  }
});

// src/vendor-core.ts
var vendor_core_exports = {};
__export(vendor_core_exports, {
  VoidStream: () => VoidStream,
  buildCmd: () => buildCmd,
  chalk: () => chalk2,
  exec: () => exec,
  isStringLiteral: () => isStringLiteral,
  ps: () => ps,
  which: () => which
});
module.exports = __toCommonJS(vendor_core_exports);

// node_modules/chalk/source/vendor/ansi-styles/index.js
var ANSI_BACKGROUND_OFFSET = 10;
var wrapAnsi16 = (offset = 0) => (code) => `\x1B[${code + offset}m`;
var wrapAnsi256 = (offset = 0) => (code) => `\x1B[${38 + offset};5;${code}m`;
var wrapAnsi16m = (offset = 0) => (red, green, blue) => `\x1B[${38 + offset};2;${red};${green};${blue}m`;
var styles = {
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
var modifierNames = Object.keys(styles.modifier);
var foregroundColorNames = Object.keys(styles.color);
var backgroundColorNames = Object.keys(styles.bgColor);
var colorNames = [...foregroundColorNames, ...backgroundColorNames];
function assembleStyles() {
  const codes = /* @__PURE__ */ new Map();
  for (const [groupName, group] of Object.entries(styles)) {
    for (const [styleName, style] of Object.entries(group)) {
      styles[styleName] = {
        open: `\x1B[${style[0]}m`,
        close: `\x1B[${style[1]}m`
      };
      group[styleName] = styles[styleName];
      codes.set(style[0], style[1]);
    }
    Object.defineProperty(styles, groupName, {
      value: group,
      enumerable: false
    });
  }
  Object.defineProperty(styles, "codes", {
    value: codes,
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
var ansiStyles = assembleStyles();
var ansi_styles_default = ansiStyles;

// node_modules/chalk/source/vendor/supports-color/index.js
var import_node_process = __toESM(require("process"), 1);
var import_node_os = __toESM(require("os"), 1);
var import_node_tty = __toESM(require("tty"), 1);
function hasFlag(flag, argv = globalThis.Deno ? globalThis.Deno.args : import_node_process.default.argv) {
  const prefix = flag.startsWith("-") ? "" : flag.length === 1 ? "-" : "--";
  const position = argv.indexOf(prefix + flag);
  const terminatorPosition = argv.indexOf("--");
  return position !== -1 && (terminatorPosition === -1 || position < terminatorPosition);
}
var { env } = import_node_process.default;
var flagForceColor;
if (hasFlag("no-color") || hasFlag("no-colors") || hasFlag("color=false") || hasFlag("color=never")) {
  flagForceColor = 0;
} else if (hasFlag("color") || hasFlag("colors") || hasFlag("color=true") || hasFlag("color=always")) {
  flagForceColor = 1;
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
  if (import_node_process.default.platform === "win32") {
    const osRelease = import_node_os.default.release().split(".");
    if (Number(osRelease[0]) >= 10 && Number(osRelease[2]) >= 10586) {
      return Number(osRelease[2]) >= 14931 ? 3 : 2;
    }
    return 1;
  }
  if ("CI" in env) {
    if (["GITHUB_ACTIONS", "GITEA_ACTIONS", "CIRCLECI"].some((key) => key in env)) {
      return 3;
    }
    if (["TRAVIS", "APPVEYOR", "GITLAB_CI", "BUILDKITE", "DRONE"].some((sign) => sign in env) || env.CI_NAME === "codeship") {
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
  if (env.TERM === "xterm-ghostty") {
    return 3;
  }
  if (env.TERM === "wezterm") {
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
function createSupportsColor(stream, options = {}) {
  const level = _supportsColor(stream, __spreadValues({
    streamIsTTY: stream && stream.isTTY
  }, options));
  return translateLevel(level);
}
var supportsColor = {
  stdout: createSupportsColor({ isTTY: import_node_tty.default.isatty(1) }),
  stderr: createSupportsColor({ isTTY: import_node_tty.default.isatty(2) })
};
var supports_color_default = supportsColor;

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

// node_modules/chalk/source/index.js
var { stdout: stdoutColor, stderr: stderrColor } = supports_color_default;
var GENERATOR = Symbol("GENERATOR");
var STYLER = Symbol("STYLER");
var IS_EMPTY = Symbol("IS_EMPTY");
var levelMapping = [
  "ansi",
  "ansi",
  "ansi256",
  "ansi16m"
];
var styles2 = /* @__PURE__ */ Object.create(null);
var applyOptions = (object, options = {}) => {
  if (options.level && !(Number.isInteger(options.level) && options.level >= 0 && options.level <= 3)) {
    throw new Error("The `level` option should be an integer from 0 to 3");
  }
  const colorLevel = stdoutColor ? stdoutColor.level : 0;
  object.level = options.level === void 0 ? colorLevel : options.level;
};
var chalkFactory = (options) => {
  const chalk3 = (...strings) => strings.join(" ");
  applyOptions(chalk3, options);
  Object.setPrototypeOf(chalk3, createChalk.prototype);
  return chalk3;
};
function createChalk(options) {
  return chalkFactory(options);
}
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
var getModelAnsi = (model, level, type, ...arguments_) => {
  if (model === "rgb") {
    if (level === "ansi16m") {
      return ansi_styles_default[type].ansi16m(...arguments_);
    }
    if (level === "ansi256") {
      return ansi_styles_default[type].ansi256(ansi_styles_default.rgbToAnsi256(...arguments_));
    }
    return ansi_styles_default[type].ansi(ansi_styles_default.rgbToAnsi(...arguments_));
  }
  if (model === "hex") {
    return getModelAnsi("rgb", level, type, ...ansi_styles_default.hexToRgb(...arguments_));
  }
  return ansi_styles_default[type][model](...arguments_);
};
var usedModels = ["rgb", "hex", "ansi256"];
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
var proto = Object.defineProperties(() => {
}, __spreadProps(__spreadValues({}, styles2), {
  level: {
    enumerable: true,
    get() {
      return this[GENERATOR].level;
    },
    set(level) {
      this[GENERATOR].level = level;
    }
  }
}));
var createStyler = (open, close, parent) => {
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
var createBuilder = (self, _styler, _isEmpty) => {
  const builder = (...arguments_) => applyStyle(builder, arguments_.length === 1 ? "" + arguments_[0] : arguments_.join(" "));
  Object.setPrototypeOf(builder, proto);
  builder[GENERATOR] = self;
  builder[STYLER] = _styler;
  builder[IS_EMPTY] = _isEmpty;
  return builder;
};
var applyStyle = (self, string) => {
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
var chalk = createChalk();
var chalkStderr = createChalk({ level: stderrColor ? stderrColor.level : 0 });
var source_default = chalk;

// src/vendor-core.ts
var import_which = __toESM(require_lib(), 1);

// node_modules/@webpod/ps/target/esm/index.mjs
var import_node_process4 = __toESM(require("process"), 1);
var import_node_fs = __toESM(require("fs"), 1);
var import_node_os2 = __toESM(require("os"), 1);

// node_modules/@webpod/ingrid/target/esm/index.mjs
var EOL = /\r?\n|\r|\n/;
var EMPTY = "-";
var parseLine = (line, sep = " ") => {
  if (typeof line !== "string") throw new Error("parseLine: line must be a string");
  const result = {
    spaces: [],
    words: []
  };
  const capture = () => {
    if (word) {
      result.words.push({
        s,
        e: s + word.length - 1,
        w: word
      });
      word = "";
      s = -1;
    }
  };
  let bb;
  let word = "";
  let s = -1;
  for (const i in [...line]) {
    const prev = line[+i - 1];
    const char = line[i];
    if (bb) {
      word += char;
      if (char === bb && prev !== "\\") {
        bb = void 0;
      }
      continue;
    }
    if (char === sep) {
      result.spaces.push(+i);
      capture();
      continue;
    }
    if (s === -1) s = +i;
    if (char === '"' || char === "'") bb = char;
    word += char;
  }
  capture();
  return result;
};
var parseLines = (input, sep) => input.split(EOL).filter(Boolean).map((l) => parseLine(l, sep));
var countWordsByIndex = ({ words }, index) => words.filter(({ e }) => e < index).length;
var getBorders = (lines) => lines[0].spaces.reduce((m, i) => {
  const c = countWordsByIndex(lines[0], i);
  if (lines.every((l) => l.spaces.includes(i) && c === countWordsByIndex(l, i))) {
    m.push(i);
  }
  return m;
}, []);
var parseUnixGrid = (input) => {
  const lines = parseLines(input);
  const borders = getBorders(lines);
  const _borders = [Number.NEGATIVE_INFINITY, ...borders, Number.POSITIVE_INFINITY];
  const grid = [];
  for (const { words } of lines) {
    const row = [];
    grid.push(row);
    for (const n in words) {
      const { w, s, e } = words[n];
      for (const _b in _borders) {
        const a = _borders[+_b];
        const b = _borders[+_b + 1];
        if (b === void 0) break;
        const block = row[_b] || (row[_b] = []);
        if (s > a && e < b) block.push(w);
      }
    }
  }
  return gridToData(grid);
};
var gridToData = (grid) => {
  const data = [];
  const [headers, ...body] = grid;
  for (const row of body) {
    const entry = {};
    data.push(entry);
    for (const i in headers) {
      const keys = headers[i];
      if (keys.length === 0) continue;
      if (keys.length > row[i].length) {
        throw new Error("Malformed grid: row has more columns than headers");
      }
      for (const k in keys) {
        const key = keys[k];
        const to = +k + 1 === keys.length ? Number.POSITIVE_INFINITY : +k + 1;
        entry[key] = row[i].slice(+k, to);
      }
    }
  }
  return data;
};
var parseWinGrid = (input, debug = false) => {
  const lines = input.split(/\r*\n+/).filter(Boolean);
  const headline = lines.shift();
  const headers = headline.trim().split(/\s\s+/);
  const hl = headers.length;
  const ll = headline.length;
  if (debug) {
    console.log("Headers:", headers);
    console.log("Line lengths:", lines.map((l) => l.length));
  }
  if (lines.every((l) => ll / l.length < 2)) {
    const spaces = Array.from({ length: ll }).map(
      (_, i) => lines.every((l) => l[i] === " ")
    );
    const borders = spaces.reduce((m, v, i, a) => {
      if (v && !a[i - 1]) m.push(i);
      return m;
    }, [0]);
    const data2 = [];
    debug && console.log("Borders:", borders);
    for (const line of lines) {
      const props = [];
      for (const i in headers) {
        const k = headers[i];
        const s = borders[i];
        const e = borders[+i + 1] || ll;
        const v = line.slice(s, e).trim();
        props.push([k, [v || EMPTY]]);
      }
      data2.push(Object.fromEntries(props));
    }
    return data2;
  }
  let w = "";
  let p;
  const body = input.slice(headline.length);
  const vals = [];
  const data = [];
  const cap = (v) => {
    const _v = w.trim() || (vals.length === 0 ? v : w.trim());
    if (!_v) return;
    vals.push(_v);
    if (vals.length === hl) {
      data.push(Object.fromEntries(headers.map((h, i) => [h, [vals[i]]])));
      vals.length = 0;
    }
    w = "";
  };
  for (const c of body) {
    w += c;
    if (c === " ") {
      if (p === "\n") {
        cap(EMPTY);
      } else if (p === " ") {
        cap();
      }
    } else if (c === "\n") {
      cap();
    }
    p = c;
  }
  cap();
  return data;
};
var parsers = {
  unix: parseUnixGrid,
  win: parseWinGrid
};
var parse = (input, { format = "unix", debug = false } = {}) => {
  const parser = parsers[format];
  if (!parser) throw new Error(`unsupported format: ${format}`);
  return parser(input, debug);
};

// node_modules/zurk/target/esm/spawn.mjs
var cp = __toESM(require("child_process"), 1);
var import_node_process3 = __toESM(require("process"), 1);
var import_node_events = __toESM(require("events"), 1);
var import_node_stream = require("stream");

// node_modules/zurk/target/esm/util.mjs
var import_node_process2 = __toESM(require("process"), 1);
var g = !import_node_process2.default.versions.deno && global || globalThis;
var immediate = g.setImmediate || ((f) => g.setTimeout(f, 0));
var noop = () => {
};
var randomId = () => Math.random().toString(36).slice(2);
var isPromiseLike = (value) => typeof (value == null ? void 0 : value.then) === "function";
var isStringLiteral = (pieces, ...rest) => {
  var _a;
  return (pieces == null ? void 0 : pieces.length) > 0 && ((_a = pieces.raw) == null ? void 0 : _a.length) === pieces.length && // Object.isFrozen(pieces) &&
  rest.length + 1 === pieces.length;
};
var assign = (target, ...extras) => Object.defineProperties(target, extras.reduce((m, extra) => __spreadValues(__spreadValues({}, m), Object.fromEntries(Object.entries(Object.getOwnPropertyDescriptors(extra)).filter(([, v]) => !Object.prototype.hasOwnProperty.call(v, "value") || v.value !== void 0))), {}));
var buildCmd = (quote2, pieces, args, subs = substitute) => {
  if (args.some(isPromiseLike))
    return Promise.all(args).then((args2) => buildCmd(quote2, pieces, args2, subs));
  let cmd = pieces[0], i = 0;
  while (i < args.length) {
    const s = Array.isArray(args[i]) ? args[i].map((x) => quote2(subs(x))).join(" ") : quote2(subs(args[i]));
    cmd += s + pieces[++i];
  }
  return cmd;
};
var substitute = (arg) => typeof (arg == null ? void 0 : arg.stdout) === "string" ? arg.stdout.replace(/\n$/, "") : `${arg}`;

// node_modules/zurk/target/esm/spawn.mjs
var defaults = {
  get id() {
    return randomId();
  },
  cmd: "",
  get cwd() {
    return import_node_process3.default.cwd();
  },
  sync: false,
  args: [],
  input: null,
  env: import_node_process3.default.env,
  get ee() {
    return new import_node_events.default();
  },
  get ac() {
    return g.AbortController && new AbortController();
  },
  get signal() {
    var _a;
    return (_a = this.ac) == null ? void 0 : _a.signal;
  },
  on: {},
  detached: import_node_process3.default.platform !== "win32",
  shell: true,
  spawn: cp.spawn,
  spawnSync: cp.spawnSync,
  spawnOpts: {},
  get store() {
    return createStore();
  },
  callback: noop,
  get stdin() {
    return new VoidStream();
  },
  get stdout() {
    return new VoidStream();
  },
  get stderr() {
    return new VoidStream();
  },
  stdio: ["pipe", "pipe", "pipe"],
  run: immediate,
  stack: ""
};
var normalizeCtx = (...ctxs) => assign(
  __spreadValues({}, defaults),
  { get signal() {
    var _a;
    return (_a = this.ac) == null ? void 0 : _a.signal;
  } },
  ...ctxs
);
var processInput = (child, input) => {
  if (input && child.stdin && !child.stdin.destroyed) {
    if (input instanceof import_node_stream.Readable) {
      input.pipe(child.stdin);
    } else {
      child.stdin.write(input);
      child.stdin.end();
    }
  }
};
var VoidStream = class extends import_node_stream.Transform {
  _transform(chunk, _, cb) {
    this.emit("data", chunk);
    cb();
  }
};
var buildSpawnOpts = ({ spawnOpts, stdio, cwd, shell, input, env: env2, detached, signal }) => __spreadProps(__spreadValues({}, spawnOpts), {
  env: env2,
  cwd,
  stdio,
  shell,
  input,
  windowsHide: true,
  detached,
  signal
});
var toggleListeners = (pos, ee, on = {}) => {
  for (const [name, listener] of Object.entries(on)) {
    ee[pos](name, listener);
  }
  if (pos === "on")
    ee.once("end", () => toggleListeners("off", ee, on));
};
var createStore = () => ({
  stdout: [],
  stderr: [],
  stdall: []
});
var invoke = (c) => {
  var _a, _b;
  const now = Date.now();
  const stdio = [c.stdin, c.stdout, c.stderr];
  const push = (kind, data) => {
    c.store[kind].push(data);
    c.store.stdall.push(data);
    c.ee.emit(kind, data, c);
    c.ee.emit("stdall", data, c);
  };
  try {
    if (c.sync) {
      toggleListeners("on", c.ee, c.on);
      const opts = buildSpawnOpts(c);
      const r = c.spawnSync(c.cmd, c.args, opts);
      c.ee.emit("start", r, c);
      if (((_a = r.stdout) == null ? void 0 : _a.length) > 0) {
        c.stdout.write(r.stdout);
        push("stdout", r.stdout);
      }
      if (((_b = r.stderr) == null ? void 0 : _b.length) > 0) {
        c.stderr.write(r.stderr);
        push("stderr", r.stderr);
      }
      c.callback(null, c.fulfilled = __spreadProps(__spreadValues({}, r), {
        get stdout() {
          return c.store.stdout.join("");
        },
        get stderr() {
          return c.store.stderr.join("");
        },
        get stdall() {
          return c.store.stdall.join("");
        },
        stdio,
        duration: Date.now() - now,
        ctx: c
      }));
      c.ee.emit("end", c.fulfilled, c);
    } else {
      c.run(() => {
        var _a2, _b2, _c;
        toggleListeners("on", c.ee, c.on);
        let error = null;
        let aborted = false;
        const opts = buildSpawnOpts(c);
        const child = c.spawn(c.cmd, c.args, opts);
        const onAbort = (event) => {
          if (opts.detached && child.pid) {
            try {
              import_node_process3.default.kill(-child.pid);
            } catch (e) {
              child.kill();
            }
          }
          aborted = true;
          c.ee.emit("abort", event, c);
        };
        c.child = child;
        c.ee.emit("start", child, c);
        (_a2 = opts.signal) == null ? void 0 : _a2.addEventListener("abort", onAbort);
        processInput(child, c.input || c.stdin);
        (_b2 = child.stdout) == null ? void 0 : _b2.on("data", (d) => {
          push("stdout", d);
        }).pipe(c.stdout);
        (_c = child.stderr) == null ? void 0 : _c.on("data", (d) => {
          push("stderr", d);
        }).pipe(c.stderr);
        child.once("error", (e) => {
          error = e;
          c.ee.emit("err", error, c);
        }).once("exit", () => {
          var _a3, _b3;
          if (aborted) {
            (_a3 = child.stdout) == null ? void 0 : _a3.destroy();
            (_b3 = child.stderr) == null ? void 0 : _b3.destroy();
          }
        }).once("close", (status, signal) => {
          var _a3;
          c.fulfilled = {
            error,
            status,
            signal,
            get stdout() {
              return c.store.stdout.join("");
            },
            get stderr() {
              return c.store.stderr.join("");
            },
            get stdall() {
              return c.store.stdall.join("");
            },
            stdio,
            duration: Date.now() - now,
            ctx: c
          };
          (_a3 = opts.signal) == null ? void 0 : _a3.removeEventListener("abort", onAbort);
          c.callback(error, c.fulfilled);
          c.ee.emit("end", c.fulfilled, c);
        });
      }, c);
    }
  } catch (error) {
    c.callback(
      error,
      c.fulfilled = {
        error,
        status: null,
        signal: null,
        stdout: "",
        stderr: "",
        stdall: "",
        stdio,
        duration: Date.now() - now,
        ctx: c
      }
    );
    c.ee.emit("err", error, c);
    c.ee.emit("end", c.fulfilled, c);
  }
  return c;
};
var exec = (ctx) => invoke(normalizeCtx(ctx));

// node_modules/@webpod/ps/target/esm/index.mjs
var IS_WIN = import_node_process4.default.platform === "win32";
var IS_WIN2025_PLUS = IS_WIN && Number.parseInt(import_node_os2.default.release().split(".")[2], 10) >= 26e3;
var LOOKUPS = {
  wmic: {
    cmd: "wmic process get ProcessId,ParentProcessId,CommandLine",
    args: [],
    parse(stdout) {
      return parse(removeWmicPrefix(stdout), { format: "win" });
    }
  },
  ps: {
    cmd: "ps",
    args: ["-lx"],
    parse(stdout) {
      return parse(stdout, { format: "unix" });
    }
  },
  pwsh: {
    cmd: "pwsh",
    args: ["-NoProfile", "-Command", '"Get-CimInstance Win32_Process | Select-Object ProcessId,ParentProcessId,CommandLine | ConvertTo-Json -Compress"'],
    parse(stdout) {
      let arr = [];
      try {
        arr = JSON.parse(stdout);
      } catch (e) {
        return [];
      }
      return arr.map((p) => ({
        ProcessId: [p.ProcessId + ""],
        ParentProcessId: [p.ParentProcessId + ""],
        CommandLine: p.CommandLine ? [p.CommandLine] : []
      }));
    }
  }
};
var isBin = (f) => {
  if (f === "") return false;
  if (!f.includes("/") && !f.includes("\\")) return true;
  if (f.length > 3 && f[0] === '"')
    return f[f.length - 1] === '"' ? isBin(f.slice(1, -1)) : false;
  try {
    if (!import_node_fs.default.existsSync(f)) return false;
    const stat = import_node_fs.default.lstatSync(f);
    return stat.isFile() || stat.isSymbolicLink();
  } catch (e) {
    return false;
  }
};
var lookup = (query = {}, cb = noop2) => _lookup({ query, cb, sync: false });
var lookupSync = (query = {}, cb = noop2) => _lookup({ query, cb, sync: true });
lookup.sync = lookupSync;
var _lookup = ({
  query = {},
  cb = noop2,
  sync = false
}) => {
  const pFactory = sync ? makePseudoDeferred.bind(null, []) : makeDeferred;
  const { promise, resolve, reject } = pFactory();
  const result = [];
  const lookupFlow = IS_WIN ? IS_WIN2025_PLUS ? "pwsh" : "wmic" : "ps";
  const {
    parse: parse2,
    cmd,
    args
  } = LOOKUPS[lookupFlow];
  const callback = (err, { stdout }) => {
    if (err) {
      reject(err);
      cb(err);
      return;
    }
    result.push(...filterProcessList(normalizeOutput(parse2(stdout)), query));
    resolve(result);
    cb(null, result);
  };
  exec({
    cmd,
    args,
    callback,
    sync,
    run(cb2) {
      cb2();
    }
  });
  return Object.assign(promise, result);
};
var filterProcessList = (processList, query = {}) => {
  const pidList = (query.pid === void 0 ? [] : [query.pid].flat(1)).map((v) => v + "");
  const filters = [
    (p) => query.command ? new RegExp(query.command, "i").test(p.command) : true,
    (p) => query.arguments ? new RegExp(query.arguments, "i").test(p.arguments.join(" ")) : true,
    (p) => query.ppid ? query.ppid + "" === p.ppid : true
  ];
  return processList.filter(
    (p) => (pidList.length === 0 || pidList.includes(p.pid)) && filters.every((f) => f(p))
  );
};
var removeWmicPrefix = (stdout) => {
  const s = stdout.indexOf(LOOKUPS.wmic.cmd + import_node_os2.default.EOL);
  const e = stdout.includes(">") ? stdout.trimEnd().lastIndexOf(import_node_os2.default.EOL) : stdout.length;
  return (s > 0 ? stdout.slice(s + LOOKUPS.wmic.cmd.length, e) : stdout.slice(0, e)).trimStart();
};
var pickTree = (list, pid, recursive = false) => {
  const children = list.filter((p) => p.ppid === pid + "");
  return [
    ...children,
    ...children.flatMap((p) => recursive ? pickTree(list, p.pid, true) : [])
  ];
};
var _tree = ({
  cb = noop2,
  opts,
  sync = false
}) => {
  if (typeof opts === "string" || typeof opts === "number") {
    return _tree({ opts: { pid: opts }, cb, sync });
  }
  const onError = (err) => cb(err);
  const onData = (all) => {
    if (opts === void 0) return all;
    const { pid, recursive = false } = opts;
    const list = pickTree(all, pid, recursive);
    cb(null, list);
    return list;
  };
  try {
    const all = _lookup({ sync });
    return sync ? onData(all) : all.then(onData, (err) => {
      onError(err);
      throw err;
    });
  } catch (err) {
    onError(err);
    return Promise.reject(err);
  }
};
var tree = (opts, cb) => __async(null, null, function* () {
  return _tree({ opts, cb });
});
var treeSync = (opts, cb) => _tree({ opts, cb, sync: true });
tree.sync = treeSync;
var kill = (pid, opts, next) => {
  if (typeof opts == "function") {
    return kill(pid, void 0, opts);
  }
  if (typeof opts == "string" || typeof opts == "number") {
    return kill(pid, { signal: opts }, next);
  }
  const { promise, resolve, reject } = makeDeferred();
  const {
    timeout = 30,
    signal = "SIGTERM"
  } = opts || {};
  try {
    import_node_process4.default.kill(+pid, signal);
  } catch (e) {
    reject(e);
    next == null ? void 0 : next(e);
    return promise;
  }
  let checkConfident = 0;
  let checkTimeoutTimer;
  let checkIsTimeout = false;
  const checkKilled = (finishCallback) => lookup({ pid }, (err, list = []) => {
    if (checkIsTimeout) return;
    if (err) {
      clearTimeout(checkTimeoutTimer);
      reject(err);
      finishCallback == null ? void 0 : finishCallback(err, pid);
    } else if (list.length > 0) {
      checkConfident = checkConfident - 1 || 0;
      checkKilled(finishCallback);
    } else {
      checkConfident++;
      if (checkConfident === 5) {
        clearTimeout(checkTimeoutTimer);
        resolve(pid);
        finishCallback == null ? void 0 : finishCallback(null, pid);
      } else {
        checkKilled(finishCallback);
      }
    }
  });
  if (next) {
    checkKilled(next);
    checkTimeoutTimer = setTimeout(() => {
      checkIsTimeout = true;
      next(new Error("Kill process timeout"));
    }, timeout * 1e3);
  } else {
    resolve(pid);
  }
  return promise;
};
var normalizeOutput = (data) => data.reduce((m, d) => {
  var _a, _b;
  const pid = (_a = d.PID || d.ProcessId) == null ? void 0 : _a[0];
  const ppid = (_b = d.PPID || d.ParentProcessId) == null ? void 0 : _b[0];
  const _cmd = d.CMD || d.CommandLine || d.COMMAND || [];
  const cmd = _cmd.length === 1 ? _cmd[0].split(/\s+/) : _cmd;
  if (pid && cmd.length > 0) {
    const c = cmd.findIndex((_v, i) => isBin(cmd.slice(0, i).join(" ")));
    const command = (c === -1 ? cmd : cmd.slice(0, c)).join(" ");
    const args = c === -1 ? [] : cmd.slice(c);
    m.push({
      pid,
      ppid,
      command,
      arguments: args
    });
  }
  return m;
}, []);
var makeDeferred = () => {
  let resolve;
  let reject;
  const promise = new Promise((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { resolve, reject, promise };
};
var makePseudoDeferred = (r = {}) => ({
  promise: r,
  resolve: identity,
  reject(e) {
    throw e;
  }
});
var noop2 = () => {
};
var identity = (v) => v;
var index_default = { kill, lookup, lookupSync, tree, treeSync };

// src/vendor-core.ts
var import_internals = require("./internals.cjs");
var chalk2 = import_internals.bus.wrap("chalk", source_default);
var which = import_internals.bus.wrap("which", import_which.default);
var ps = import_internals.bus.wrap("ps", index_default);
/* c8 ignore next 100 */
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  VoidStream,
  buildCmd,
  chalk,
  exec,
  isStringLiteral,
  ps,
  which
});
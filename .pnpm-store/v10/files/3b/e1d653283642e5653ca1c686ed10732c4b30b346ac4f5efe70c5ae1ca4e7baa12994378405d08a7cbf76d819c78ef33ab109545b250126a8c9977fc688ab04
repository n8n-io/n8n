import CJS_COMPAT_NODE_URL_78w93im8273 from 'node:url';
import CJS_COMPAT_NODE_PATH_78w93im8273 from 'node:path';
import CJS_COMPAT_NODE_MODULE_78w93im8273 from "node:module";

var __filename = CJS_COMPAT_NODE_URL_78w93im8273.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_78w93im8273.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_78w93im8273.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import {
  __commonJS,
  __toESM,
  isAbsolute,
  normalize,
  relative,
  resolve
} from "./_node-chunks/chunk-WP3VXGU4.js";

// ../../node_modules/picocolors/picocolors.js
var require_picocolors = __commonJS({
  "../../node_modules/picocolors/picocolors.js"(exports, module) {
    var p = process || {}, argv = p.argv || [], env2 = p.env || {}, isColorSupported = !(env2.NO_COLOR || argv.includes("--no-color")) && (!!env2.FORCE_COLOR || argv.includes("--color") || p.platform === "win32" || (p.stdout || {}).isTTY && env2.TERM !== "dumb" || !!env2.CI), formatter = (open, close, replace = open) => (input) => {
      let string = "" + input, index = string.indexOf(close, open.length);
      return ~index ? open + replaceClose(string, close, replace, index) + close : open + string + close;
    }, replaceClose = (string, close, replace, index) => {
      let result = "", cursor = 0;
      do
        result += string.substring(cursor, index) + replace, cursor = index + close.length, index = string.indexOf(close, cursor);
      while (~index);
      return result + string.substring(cursor);
    }, createColors = (enabled = isColorSupported) => {
      let f = enabled ? formatter : () => String;
      return {
        isColorSupported: enabled,
        reset: f("\x1B[0m", "\x1B[0m"),
        bold: f("\x1B[1m", "\x1B[22m", "\x1B[22m\x1B[1m"),
        dim: f("\x1B[2m", "\x1B[22m", "\x1B[22m\x1B[2m"),
        italic: f("\x1B[3m", "\x1B[23m"),
        underline: f("\x1B[4m", "\x1B[24m"),
        inverse: f("\x1B[7m", "\x1B[27m"),
        hidden: f("\x1B[8m", "\x1B[28m"),
        strikethrough: f("\x1B[9m", "\x1B[29m"),
        black: f("\x1B[30m", "\x1B[39m"),
        red: f("\x1B[31m", "\x1B[39m"),
        green: f("\x1B[32m", "\x1B[39m"),
        yellow: f("\x1B[33m", "\x1B[39m"),
        blue: f("\x1B[34m", "\x1B[39m"),
        magenta: f("\x1B[35m", "\x1B[39m"),
        cyan: f("\x1B[36m", "\x1B[39m"),
        white: f("\x1B[37m", "\x1B[39m"),
        gray: f("\x1B[90m", "\x1B[39m"),
        bgBlack: f("\x1B[40m", "\x1B[49m"),
        bgRed: f("\x1B[41m", "\x1B[49m"),
        bgGreen: f("\x1B[42m", "\x1B[49m"),
        bgYellow: f("\x1B[43m", "\x1B[49m"),
        bgBlue: f("\x1B[44m", "\x1B[49m"),
        bgMagenta: f("\x1B[45m", "\x1B[49m"),
        bgCyan: f("\x1B[46m", "\x1B[49m"),
        bgWhite: f("\x1B[47m", "\x1B[49m"),
        blackBright: f("\x1B[90m", "\x1B[39m"),
        redBright: f("\x1B[91m", "\x1B[39m"),
        greenBright: f("\x1B[92m", "\x1B[39m"),
        yellowBright: f("\x1B[93m", "\x1B[39m"),
        blueBright: f("\x1B[94m", "\x1B[39m"),
        magentaBright: f("\x1B[95m", "\x1B[39m"),
        cyanBright: f("\x1B[96m", "\x1B[39m"),
        whiteBright: f("\x1B[97m", "\x1B[39m"),
        bgBlackBright: f("\x1B[100m", "\x1B[49m"),
        bgRedBright: f("\x1B[101m", "\x1B[49m"),
        bgGreenBright: f("\x1B[102m", "\x1B[49m"),
        bgYellowBright: f("\x1B[103m", "\x1B[49m"),
        bgBlueBright: f("\x1B[104m", "\x1B[49m"),
        bgMagentaBright: f("\x1B[105m", "\x1B[49m"),
        bgCyanBright: f("\x1B[106m", "\x1B[49m"),
        bgWhiteBright: f("\x1B[107m", "\x1B[49m")
      };
    };
    module.exports = createColors();
    module.exports.createColors = createColors;
  }
});

// ../../node_modules/balanced-match/index.js
var require_balanced_match = __commonJS({
  "../../node_modules/balanced-match/index.js"(exports, module) {
    "use strict";
    module.exports = balanced;
    function balanced(a, b, str) {
      a instanceof RegExp && (a = maybeMatch(a, str)), b instanceof RegExp && (b = maybeMatch(b, str));
      var r = range(a, b, str);
      return r && {
        start: r[0],
        end: r[1],
        pre: str.slice(0, r[0]),
        body: str.slice(r[0] + a.length, r[1]),
        post: str.slice(r[1] + b.length)
      };
    }
    function maybeMatch(reg, str) {
      var m = str.match(reg);
      return m ? m[0] : null;
    }
    balanced.range = range;
    function range(a, b, str) {
      var begs, beg, left, right, result, ai = str.indexOf(a), bi = str.indexOf(b, ai + 1), i = ai;
      if (ai >= 0 && bi > 0) {
        if (a === b)
          return [ai, bi];
        for (begs = [], left = str.length; i >= 0 && !result; )
          i == ai ? (begs.push(i), ai = str.indexOf(a, i + 1)) : begs.length == 1 ? result = [begs.pop(), bi] : (beg = begs.pop(), beg < left && (left = beg, right = bi), bi = str.indexOf(b, i + 1)), i = ai < bi && ai >= 0 ? ai : bi;
        begs.length && (result = [left, right]);
      }
      return result;
    }
  }
});

// ../../node_modules/brace-expansion/index.js
var require_brace_expansion = __commonJS({
  "../../node_modules/brace-expansion/index.js"(exports, module) {
    var balanced = require_balanced_match();
    module.exports = expandTop;
    var escSlash = "\0SLASH" + Math.random() + "\0", escOpen = "\0OPEN" + Math.random() + "\0", escClose = "\0CLOSE" + Math.random() + "\0", escComma = "\0COMMA" + Math.random() + "\0", escPeriod = "\0PERIOD" + Math.random() + "\0";
    function numeric(str) {
      return parseInt(str, 10) == str ? parseInt(str, 10) : str.charCodeAt(0);
    }
    function escapeBraces(str) {
      return str.split("\\\\").join(escSlash).split("\\{").join(escOpen).split("\\}").join(escClose).split("\\,").join(escComma).split("\\.").join(escPeriod);
    }
    function unescapeBraces(str) {
      return str.split(escSlash).join("\\").split(escOpen).join("{").split(escClose).join("}").split(escComma).join(",").split(escPeriod).join(".");
    }
    function parseCommaParts(str) {
      if (!str)
        return [""];
      var parts = [], m = balanced("{", "}", str);
      if (!m)
        return str.split(",");
      var pre = m.pre, body = m.body, post = m.post, p = pre.split(",");
      p[p.length - 1] += "{" + body + "}";
      var postParts = parseCommaParts(post);
      return post.length && (p[p.length - 1] += postParts.shift(), p.push.apply(p, postParts)), parts.push.apply(parts, p), parts;
    }
    function expandTop(str) {
      return str ? (str.substr(0, 2) === "{}" && (str = "\\{\\}" + str.substr(2)), expand2(escapeBraces(str), !0).map(unescapeBraces)) : [];
    }
    function embrace(str) {
      return "{" + str + "}";
    }
    function isPadded(el) {
      return /^-?0\d/.test(el);
    }
    function lte(i, y) {
      return i <= y;
    }
    function gte(i, y) {
      return i >= y;
    }
    function expand2(str, isTop) {
      var expansions = [], m = balanced("{", "}", str);
      if (!m) return [str];
      var pre = m.pre, post = m.post.length ? expand2(m.post, !1) : [""];
      if (/\$$/.test(m.pre))
        for (var k = 0; k < post.length; k++) {
          var expansion = pre + "{" + m.body + "}" + post[k];
          expansions.push(expansion);
        }
      else {
        var isNumericSequence = /^-?\d+\.\.-?\d+(?:\.\.-?\d+)?$/.test(m.body), isAlphaSequence = /^[a-zA-Z]\.\.[a-zA-Z](?:\.\.-?\d+)?$/.test(m.body), isSequence = isNumericSequence || isAlphaSequence, isOptions = m.body.indexOf(",") >= 0;
        if (!isSequence && !isOptions)
          return m.post.match(/,(?!,).*\}/) ? (str = m.pre + "{" + m.body + escClose + m.post, expand2(str)) : [str];
        var n2;
        if (isSequence)
          n2 = m.body.split(/\.\./);
        else if (n2 = parseCommaParts(m.body), n2.length === 1 && (n2 = expand2(n2[0], !1).map(embrace), n2.length === 1))
          return post.map(function(p) {
            return m.pre + n2[0] + p;
          });
        var N;
        if (isSequence) {
          var x = numeric(n2[0]), y = numeric(n2[1]), width = Math.max(n2[0].length, n2[1].length), incr = n2.length == 3 ? Math.abs(numeric(n2[2])) : 1, test = lte, reverse = y < x;
          reverse && (incr *= -1, test = gte);
          var pad = n2.some(isPadded);
          N = [];
          for (var i = x; test(i, y); i += incr) {
            var c;
            if (isAlphaSequence)
              c = String.fromCharCode(i), c === "\\" && (c = "");
            else if (c = String(i), pad) {
              var need = width - c.length;
              if (need > 0) {
                var z = new Array(need + 1).join("0");
                i < 0 ? c = "-" + z + c.slice(1) : c = z + c;
              }
            }
            N.push(c);
          }
        } else {
          N = [];
          for (var j = 0; j < n2.length; j++)
            N.push.apply(N, expand2(n2[j], !1));
        }
        for (var j = 0; j < N.length; j++)
          for (var k = 0; k < post.length; k++) {
            var expansion = pre + N[j] + post[k];
            (!isTop || isSequence || expansion) && expansions.push(expansion);
          }
      }
      return expansions;
    }
  }
});

// src/index.ts
import { readFile } from "node:fs/promises";
import { fileURLToPath as fileURLToPath5 } from "node:url";
import { NoStatsForViteDevError } from "storybook/internal/server-errors";

// src/build.ts
import { logger as logger2 } from "storybook/internal/node-logger";
import { dedent as dedent3 } from "ts-dedent";

// src/envs.ts
import { stringifyEnvs } from "storybook/internal/common";
var allowedEnvVariables = [
  "STORYBOOK",
  // Vite `import.meta.env` default variables
  // @see https://github.com/vitejs/vite/blob/6b8d94dca2a1a8b4952e3e3fcd0aed1aedb94215/packages/vite/types/importMeta.d.ts#L68-L75
  "BASE_URL",
  "MODE",
  "DEV",
  "PROD",
  "SSR"
];
function stringifyProcessEnvs(raw, envPrefix) {
  let updatedRaw = {}, envs = Object.entries(raw).reduce((acc, [key, value]) => ((allowedEnvVariables.includes(key) || Array.isArray(envPrefix) && envPrefix.find((prefix) => key.startsWith(prefix)) || typeof envPrefix == "string" && key.startsWith(envPrefix)) && (acc[`import.meta.env.${key}`] = JSON.stringify(value), updatedRaw[key] = value), acc), {});
  return envs["import.meta.env"] = JSON.stringify(stringifyEnvs(updatedRaw)), envs;
}
async function sanitizeEnvVars(options, config) {
  let { presets } = options, envsRaw = await presets.apply("env"), { define } = config;
  if (Object.keys(envsRaw).length) {
    let envs = stringifyProcessEnvs(envsRaw, config.envPrefix);
    define = {
      ...define,
      ...envs
    };
  }
  return {
    ...config,
    define
  };
}

// src/logger.ts
var import_picocolors = __toESM(require_picocolors(), 1);
import { logger } from "storybook/internal/node-logger";
var seenWarnings = /* @__PURE__ */ new Set();
async function createViteLogger() {
  let { createLogger } = await import("vite"), customViteLogger = createLogger(), logWithPrefix = (fn) => (msg) => fn(`${import_picocolors.default.bgYellow("Vite")} ${msg}`);
  return customViteLogger.error = logWithPrefix(logger.error), customViteLogger.warn = logWithPrefix(logger.warn), customViteLogger.warnOnce = (msg) => {
    seenWarnings.has(msg) || (seenWarnings.add(msg), logWithPrefix(logger.warn)(msg));
  }, customViteLogger.info = logWithPrefix((msg) => logger.log(msg, { spacing: 0 })), customViteLogger;
}

// src/utils/has-vite-plugins.ts
function checkName(plugin, names) {
  return plugin !== null && typeof plugin == "object" && "name" in plugin && names.includes(plugin.name);
}
async function hasVitePlugins(plugins, names) {
  let resolvedPlugins = await Promise.all(plugins);
  for (let plugin of resolvedPlugins)
    if (Array.isArray(plugin) && await hasVitePlugins(plugin, names) || checkName(plugin, names))
      return !0;
  return !1;
}

// src/utils/without-vite-plugins.ts
var withoutVitePlugins = async (plugins = [], namesToRemove) => {
  let result = [], resolvedPlugins = await Promise.all(plugins);
  for (let plugin of resolvedPlugins)
    Array.isArray(plugin) ? result.push(await withoutVitePlugins(plugin, namesToRemove)) : plugin && typeof plugin == "object" && "name" in plugin && typeof plugin.name == "string" && !namesToRemove.includes(plugin.name) && result.push(plugin);
  return result;
};

// src/vite-config.ts
import { resolve as resolve3 } from "node:path";
import {
  getBuilderOptions,
  isPreservingSymlinks,
  resolvePathInStorybookCache
} from "storybook/internal/common";
import { globalsNameReferenceMap } from "storybook/internal/preview/globals";

// ../../node_modules/es-module-lexer/dist/lexer.js
var ImportType;
(function(A2) {
  A2[A2.Static = 1] = "Static", A2[A2.Dynamic = 2] = "Dynamic", A2[A2.ImportMeta = 3] = "ImportMeta", A2[A2.StaticSourcePhase = 4] = "StaticSourcePhase", A2[A2.DynamicSourcePhase = 5] = "DynamicSourcePhase", A2[A2.StaticDeferPhase = 6] = "StaticDeferPhase", A2[A2.DynamicDeferPhase = 7] = "DynamicDeferPhase";
})(ImportType || (ImportType = {}));
var A = new Uint8Array(new Uint16Array([1]).buffer)[0] === 1;
function parse(E2, g = "@") {
  if (!C) return init.then((() => parse(E2)));
  let I = E2.length + 1, w = (C.__heap_base.value || C.__heap_base) + 4 * I - C.memory.buffer.byteLength;
  w > 0 && C.memory.grow(Math.ceil(w / 65536));
  let K = C.sa(I - 1);
  if ((A ? B : Q)(E2, new Uint16Array(C.memory.buffer, K, I)), !C.parse()) throw Object.assign(new Error(`Parse error ${g}:${E2.slice(0, C.e()).split(`
`).length}:${C.e() - E2.lastIndexOf(`
`, C.e() - 1)}`), { idx: C.e() });
  let o = [], D = [];
  for (; C.ri(); ) {
    let A2 = C.is(), Q2 = C.ie(), B2 = C.it(), g2 = C.ai(), I2 = C.id(), w2 = C.ss(), K2 = C.se(), D2;
    C.ip() && (D2 = k(E2.slice(I2 === -1 ? A2 - 1 : A2, I2 === -1 ? Q2 + 1 : Q2))), o.push({ n: D2, t: B2, s: A2, e: Q2, ss: w2, se: K2, d: I2, a: g2 });
  }
  for (; C.re(); ) {
    let A2 = C.es(), Q2 = C.ee(), B2 = C.els(), g2 = C.ele(), I2 = E2.slice(A2, Q2), w2 = I2[0], K2 = B2 < 0 ? void 0 : E2.slice(B2, g2), o2 = K2 ? K2[0] : "";
    D.push({ s: A2, e: Q2, ls: B2, le: g2, n: w2 === '"' || w2 === "'" ? k(I2) : I2, ln: o2 === '"' || o2 === "'" ? k(K2) : K2 });
  }
  function k(A2) {
    try {
      return (0, eval)(A2);
    } catch {
    }
  }
  return [o, D, !!C.f(), !!C.ms()];
}
function Q(A2, Q2) {
  let B2 = A2.length, C2 = 0;
  for (; C2 < B2; ) {
    let B3 = A2.charCodeAt(C2);
    Q2[C2++] = (255 & B3) << 8 | B3 >>> 8;
  }
}
function B(A2, Q2) {
  let B2 = A2.length, C2 = 0;
  for (; C2 < B2; ) Q2[C2] = A2.charCodeAt(C2++);
}
var C, E = () => {
  return A2 = "AGFzbQEAAAABKwhgAX8Bf2AEf39/fwBgAAF/YAAAYAF/AGADf39/AX9gAn9/AX9gA39/fwADMTAAAQECAgICAgICAgICAgICAgICAgIAAwMDBAQAAAUAAAAAAAMDAwAGAAAABwAGAgUEBQFwAQEBBQMBAAEGDwJ/AUHA8gALfwBBwPIACwd6FQZtZW1vcnkCAAJzYQAAAWUAAwJpcwAEAmllAAUCc3MABgJzZQAHAml0AAgCYWkACQJpZAAKAmlwAAsCZXMADAJlZQANA2VscwAOA2VsZQAPAnJpABACcmUAEQFmABICbXMAEwVwYXJzZQAUC19faGVhcF9iYXNlAwEKzkQwaAEBf0EAIAA2AoAKQQAoAtwJIgEgAEEBdGoiAEEAOwEAQQAgAEECaiIANgKECkEAIAA2AogKQQBBADYC4AlBAEEANgLwCUEAQQA2AugJQQBBADYC5AlBAEEANgL4CUEAQQA2AuwJIAEL0wEBA39BACgC8AkhBEEAQQAoAogKIgU2AvAJQQAgBDYC9AlBACAFQSRqNgKICiAEQSBqQeAJIAQbIAU2AgBBACgC1AkhBEEAKALQCSEGIAUgATYCACAFIAA2AgggBSACIAJBAmpBACAGIANGIgAbIAQgA0YiBBs2AgwgBSADNgIUIAVBADYCECAFIAI2AgQgBUEANgIgIAVBA0EBQQIgABsgBBs2AhwgBUEAKALQCSADRiICOgAYAkACQCACDQBBACgC1AkgA0cNAQtBAEEBOgCMCgsLXgEBf0EAKAL4CSIEQRBqQeQJIAQbQQAoAogKIgQ2AgBBACAENgL4CUEAIARBFGo2AogKQQBBAToAjAogBEEANgIQIAQgAzYCDCAEIAI2AgggBCABNgIEIAQgADYCAAsIAEEAKAKQCgsVAEEAKALoCSgCAEEAKALcCWtBAXULHgEBf0EAKALoCSgCBCIAQQAoAtwJa0EBdUF/IAAbCxUAQQAoAugJKAIIQQAoAtwJa0EBdQseAQF/QQAoAugJKAIMIgBBACgC3AlrQQF1QX8gABsLCwBBACgC6AkoAhwLHgEBf0EAKALoCSgCECIAQQAoAtwJa0EBdUF/IAAbCzsBAX8CQEEAKALoCSgCFCIAQQAoAtAJRw0AQX8PCwJAIABBACgC1AlHDQBBfg8LIABBACgC3AlrQQF1CwsAQQAoAugJLQAYCxUAQQAoAuwJKAIAQQAoAtwJa0EBdQsVAEEAKALsCSgCBEEAKALcCWtBAXULHgEBf0EAKALsCSgCCCIAQQAoAtwJa0EBdUF/IAAbCx4BAX9BACgC7AkoAgwiAEEAKALcCWtBAXVBfyAAGwslAQF/QQBBACgC6AkiAEEgakHgCSAAGygCACIANgLoCSAAQQBHCyUBAX9BAEEAKALsCSIAQRBqQeQJIAAbKAIAIgA2AuwJIABBAEcLCABBAC0AlAoLCABBAC0AjAoL3Q0BBX8jAEGA0ABrIgAkAEEAQQE6AJQKQQBBACgC2Ak2ApwKQQBBACgC3AlBfmoiATYCsApBACABQQAoAoAKQQF0aiICNgK0CkEAQQA6AIwKQQBBADsBlgpBAEEAOwGYCkEAQQA6AKAKQQBBADYCkApBAEEAOgD8CUEAIABBgBBqNgKkCkEAIAA2AqgKQQBBADoArAoCQAJAAkACQANAQQAgAUECaiIDNgKwCiABIAJPDQECQCADLwEAIgJBd2pBBUkNAAJAAkACQAJAAkAgAkGbf2oOBQEICAgCAAsgAkEgRg0EIAJBL0YNAyACQTtGDQIMBwtBAC8BmAoNASADEBVFDQEgAUEEakGCCEEKEC8NARAWQQAtAJQKDQFBAEEAKAKwCiIBNgKcCgwHCyADEBVFDQAgAUEEakGMCEEKEC8NABAXC0EAQQAoArAKNgKcCgwBCwJAIAEvAQQiA0EqRg0AIANBL0cNBBAYDAELQQEQGQtBACgCtAohAkEAKAKwCiEBDAALC0EAIQIgAyEBQQAtAPwJDQIMAQtBACABNgKwCkEAQQA6AJQKCwNAQQAgAUECaiIDNgKwCgJAAkACQAJAAkACQAJAIAFBACgCtApPDQAgAy8BACICQXdqQQVJDQYCQAJAAkACQAJAAkACQAJAAkACQCACQWBqDgoQDwYPDw8PBQECAAsCQAJAAkACQCACQaB/ag4KCxISAxIBEhISAgALIAJBhX9qDgMFEQYJC0EALwGYCg0QIAMQFUUNECABQQRqQYIIQQoQLw0QEBYMEAsgAxAVRQ0PIAFBBGpBjAhBChAvDQ8QFwwPCyADEBVFDQ4gASkABELsgISDsI7AOVINDiABLwEMIgNBd2oiAUEXSw0MQQEgAXRBn4CABHFFDQwMDQtBAEEALwGYCiIBQQFqOwGYCkEAKAKkCiABQQN0aiIBQQE2AgAgAUEAKAKcCjYCBAwNC0EALwGYCiIDRQ0JQQAgA0F/aiIDOwGYCkEALwGWCiICRQ0MQQAoAqQKIANB//8DcUEDdGooAgBBBUcNDAJAIAJBAnRBACgCqApqQXxqKAIAIgMoAgQNACADQQAoApwKQQJqNgIEC0EAIAJBf2o7AZYKIAMgAUEEajYCDAwMCwJAQQAoApwKIgEvAQBBKUcNAEEAKALwCSIDRQ0AIAMoAgQgAUcNAEEAQQAoAvQJIgM2AvAJAkAgA0UNACADQQA2AiAMAQtBAEEANgLgCQtBAEEALwGYCiIDQQFqOwGYCkEAKAKkCiADQQN0aiIDQQZBAkEALQCsChs2AgAgAyABNgIEQQBBADoArAoMCwtBAC8BmAoiAUUNB0EAIAFBf2oiATsBmApBACgCpAogAUH//wNxQQN0aigCAEEERg0EDAoLQScQGgwJC0EiEBoMCAsgAkEvRw0HAkACQCABLwEEIgFBKkYNACABQS9HDQEQGAwKC0EBEBkMCQsCQAJAAkACQEEAKAKcCiIBLwEAIgMQG0UNAAJAAkAgA0FVag4EAAkBAwkLIAFBfmovAQBBK0YNAwwICyABQX5qLwEAQS1GDQIMBwsgA0EpRw0BQQAoAqQKQQAvAZgKIgJBA3RqKAIEEBxFDQIMBgsgAUF+ai8BAEFQakH//wNxQQpPDQULQQAvAZgKIQILAkACQCACQf//A3EiAkUNACADQeYARw0AQQAoAqQKIAJBf2pBA3RqIgQoAgBBAUcNACABQX5qLwEAQe8ARw0BIAQoAgRBlghBAxAdRQ0BDAULIANB/QBHDQBBACgCpAogAkEDdGoiAigCBBAeDQQgAigCAEEGRg0ECyABEB8NAyADRQ0DIANBL0ZBAC0AoApBAEdxDQMCQEEAKAL4CSICRQ0AIAEgAigCAEkNACABIAIoAgRNDQQLIAFBfmohAUEAKALcCSECAkADQCABQQJqIgQgAk0NAUEAIAE2ApwKIAEvAQAhAyABQX5qIgQhASADECBFDQALIARBAmohBAsCQCADQf//A3EQIUUNACAEQX5qIQECQANAIAFBAmoiAyACTQ0BQQAgATYCnAogAS8BACEDIAFBfmoiBCEBIAMQIQ0ACyAEQQJqIQMLIAMQIg0EC0EAQQE6AKAKDAcLQQAoAqQKQQAvAZgKIgFBA3QiA2pBACgCnAo2AgRBACABQQFqOwGYCkEAKAKkCiADakEDNgIACxAjDAULQQAtAPwJQQAvAZYKQQAvAZgKcnJFIQIMBwsQJEEAQQA6AKAKDAMLECVBACECDAULIANBoAFHDQELQQBBAToArAoLQQBBACgCsAo2ApwKC0EAKAKwCiEBDAALCyAAQYDQAGokACACCxoAAkBBACgC3AkgAEcNAEEBDwsgAEF+ahAmC/4KAQZ/QQBBACgCsAoiAEEMaiIBNgKwCkEAKAL4CSECQQEQKSEDAkACQAJAAkACQAJAAkACQAJAQQAoArAKIgQgAUcNACADEChFDQELAkACQAJAAkACQAJAAkAgA0EqRg0AIANB+wBHDQFBACAEQQJqNgKwCkEBECkhA0EAKAKwCiEEA0ACQAJAIANB//8DcSIDQSJGDQAgA0EnRg0AIAMQLBpBACgCsAohAwwBCyADEBpBAEEAKAKwCkECaiIDNgKwCgtBARApGgJAIAQgAxAtIgNBLEcNAEEAQQAoArAKQQJqNgKwCkEBECkhAwsgA0H9AEYNA0EAKAKwCiIFIARGDQ8gBSEEIAVBACgCtApNDQAMDwsLQQAgBEECajYCsApBARApGkEAKAKwCiIDIAMQLRoMAgtBAEEAOgCUCgJAAkACQAJAAkACQCADQZ9/ag4MAgsEAQsDCwsLCwsFAAsgA0H2AEYNBAwKC0EAIARBDmoiAzYCsAoCQAJAAkBBARApQZ9/ag4GABICEhIBEgtBACgCsAoiBSkAAkLzgOSD4I3AMVINESAFLwEKECFFDRFBACAFQQpqNgKwCkEAECkaC0EAKAKwCiIFQQJqQbIIQQ4QLw0QIAUvARAiAkF3aiIBQRdLDQ1BASABdEGfgIAEcUUNDQwOC0EAKAKwCiIFKQACQuyAhIOwjsA5Ug0PIAUvAQoiAkF3aiIBQRdNDQYMCgtBACAEQQpqNgKwCkEAECkaQQAoArAKIQQLQQAgBEEQajYCsAoCQEEBECkiBEEqRw0AQQBBACgCsApBAmo2ArAKQQEQKSEEC0EAKAKwCiEDIAQQLBogA0EAKAKwCiIEIAMgBBACQQBBACgCsApBfmo2ArAKDwsCQCAEKQACQuyAhIOwjsA5Ug0AIAQvAQoQIEUNAEEAIARBCmo2ArAKQQEQKSEEQQAoArAKIQMgBBAsGiADQQAoArAKIgQgAyAEEAJBAEEAKAKwCkF+ajYCsAoPC0EAIARBBGoiBDYCsAoLQQAgBEEGajYCsApBAEEAOgCUCkEBECkhBEEAKAKwCiEDIAQQLCEEQQAoArAKIQIgBEHf/wNxIgFB2wBHDQNBACACQQJqNgKwCkEBECkhBUEAKAKwCiEDQQAhBAwEC0EAQQE6AIwKQQBBACgCsApBAmo2ArAKC0EBECkhBEEAKAKwCiEDAkAgBEHmAEcNACADQQJqQawIQQYQLw0AQQAgA0EIajYCsAogAEEBEClBABArIAJBEGpB5AkgAhshAwNAIAMoAgAiA0UNBSADQgA3AgggA0EQaiEDDAALC0EAIANBfmo2ArAKDAMLQQEgAXRBn4CABHFFDQMMBAtBASEECwNAAkACQCAEDgIAAQELIAVB//8DcRAsGkEBIQQMAQsCQAJAQQAoArAKIgQgA0YNACADIAQgAyAEEAJBARApIQQCQCABQdsARw0AIARBIHJB/QBGDQQLQQAoArAKIQMCQCAEQSxHDQBBACADQQJqNgKwCkEBECkhBUEAKAKwCiEDIAVBIHJB+wBHDQILQQAgA0F+ajYCsAoLIAFB2wBHDQJBACACQX5qNgKwCg8LQQAhBAwACwsPCyACQaABRg0AIAJB+wBHDQQLQQAgBUEKajYCsApBARApIgVB+wBGDQMMAgsCQCACQVhqDgMBAwEACyACQaABRw0CC0EAIAVBEGo2ArAKAkBBARApIgVBKkcNAEEAQQAoArAKQQJqNgKwCkEBECkhBQsgBUEoRg0BC0EAKAKwCiEBIAUQLBpBACgCsAoiBSABTQ0AIAQgAyABIAUQAkEAQQAoArAKQX5qNgKwCg8LIAQgA0EAQQAQAkEAIARBDGo2ArAKDwsQJQuFDAEKf0EAQQAoArAKIgBBDGoiATYCsApBARApIQJBACgCsAohAwJAAkACQAJAAkACQAJAAkAgAkEuRw0AQQAgA0ECajYCsAoCQEEBECkiAkHkAEYNAAJAIAJB8wBGDQAgAkHtAEcNB0EAKAKwCiICQQJqQZwIQQYQLw0HAkBBACgCnAoiAxAqDQAgAy8BAEEuRg0ICyAAIAAgAkEIakEAKALUCRABDwtBACgCsAoiAkECakGiCEEKEC8NBgJAQQAoApwKIgMQKg0AIAMvAQBBLkYNBwtBACEEQQAgAkEMajYCsApBASEFQQUhBkEBECkhAkEAIQdBASEIDAILQQAoArAKIgIpAAJC5YCYg9CMgDlSDQUCQEEAKAKcCiIDECoNACADLwEAQS5GDQYLQQAhBEEAIAJBCmo2ArAKQQIhCEEHIQZBASEHQQEQKSECQQEhBQwBCwJAAkACQAJAIAJB8wBHDQAgAyABTQ0AIANBAmpBoghBChAvDQACQCADLwEMIgRBd2oiB0EXSw0AQQEgB3RBn4CABHENAgsgBEGgAUYNAQtBACEHQQchBkEBIQQgAkHkAEYNAQwCC0EAIQRBACADQQxqIgI2ArAKQQEhBUEBECkhCQJAQQAoArAKIgYgAkYNAEHmACECAkAgCUHmAEYNAEEFIQZBACEHQQEhCCAJIQIMBAtBACEHQQEhCCAGQQJqQawIQQYQLw0EIAYvAQgQIEUNBAtBACEHQQAgAzYCsApBByEGQQEhBEEAIQVBACEIIAkhAgwCCyADIABBCmpNDQBBACEIQeQAIQICQCADKQACQuWAmIPQjIA5Ug0AAkACQCADLwEKIgRBd2oiB0EXSw0AQQEgB3RBn4CABHENAQtBACEIIARBoAFHDQELQQAhBUEAIANBCmo2ArAKQSohAkEBIQdBAiEIQQEQKSIJQSpGDQRBACADNgKwCkEBIQRBACEHQQAhCCAJIQIMAgsgAyEGQQAhBwwCC0EAIQVBACEICwJAIAJBKEcNAEEAKAKkCkEALwGYCiICQQN0aiIDQQAoArAKNgIEQQAgAkEBajsBmAogA0EFNgIAQQAoApwKLwEAQS5GDQRBAEEAKAKwCiIDQQJqNgKwCkEBECkhAiAAQQAoArAKQQAgAxABAkACQCAFDQBBACgC8AkhAQwBC0EAKALwCSIBIAY2AhwLQQBBAC8BlgoiA0EBajsBlgpBACgCqAogA0ECdGogATYCAAJAIAJBIkYNACACQSdGDQBBAEEAKAKwCkF+ajYCsAoPCyACEBpBAEEAKAKwCkECaiICNgKwCgJAAkACQEEBEClBV2oOBAECAgACC0EAQQAoArAKQQJqNgKwCkEBECkaQQAoAvAJIgMgAjYCBCADQQE6ABggA0EAKAKwCiICNgIQQQAgAkF+ajYCsAoPC0EAKALwCSIDIAI2AgQgA0EBOgAYQQBBAC8BmApBf2o7AZgKIANBACgCsApBAmo2AgxBAEEALwGWCkF/ajsBlgoPC0EAQQAoArAKQX5qNgKwCg8LAkAgBEEBcyACQfsAR3INAEEAKAKwCiECQQAvAZgKDQUDQAJAAkACQCACQQAoArQKTw0AQQEQKSICQSJGDQEgAkEnRg0BIAJB/QBHDQJBAEEAKAKwCkECajYCsAoLQQEQKSEDQQAoArAKIQICQCADQeYARw0AIAJBAmpBrAhBBhAvDQcLQQAgAkEIajYCsAoCQEEBECkiAkEiRg0AIAJBJ0cNBwsgACACQQAQKw8LIAIQGgtBAEEAKAKwCkECaiICNgKwCgwACwsCQAJAIAJBWWoOBAMBAQMACyACQSJGDQILQQAoArAKIQYLIAYgAUcNAEEAIABBCmo2ArAKDwsgAkEqRyAHcQ0DQQAvAZgKQf//A3ENA0EAKAKwCiECQQAoArQKIQEDQCACIAFPDQECQAJAIAIvAQAiA0EnRg0AIANBIkcNAQsgACADIAgQKw8LQQAgAkECaiICNgKwCgwACwsQJQsPC0EAIAJBfmo2ArAKDwtBAEEAKAKwCkF+ajYCsAoLRwEDf0EAKAKwCkECaiEAQQAoArQKIQECQANAIAAiAkF+aiABTw0BIAJBAmohACACLwEAQXZqDgQBAAABAAsLQQAgAjYCsAoLmAEBA39BAEEAKAKwCiIBQQJqNgKwCiABQQZqIQFBACgCtAohAgNAAkACQAJAIAFBfGogAk8NACABQX5qLwEAIQMCQAJAIAANACADQSpGDQEgA0F2ag4EAgQEAgQLIANBKkcNAwsgAS8BAEEvRw0CQQAgAUF+ajYCsAoMAQsgAUF+aiEBC0EAIAE2ArAKDwsgAUECaiEBDAALC4gBAQR/QQAoArAKIQFBACgCtAohAgJAAkADQCABIgNBAmohASADIAJPDQEgAS8BACIEIABGDQICQCAEQdwARg0AIARBdmoOBAIBAQIBCyADQQRqIQEgAy8BBEENRw0AIANBBmogASADLwEGQQpGGyEBDAALC0EAIAE2ArAKECUPC0EAIAE2ArAKC2wBAX8CQAJAIABBX2oiAUEFSw0AQQEgAXRBMXENAQsgAEFGakH//wNxQQZJDQAgAEEpRyAAQVhqQf//A3FBB0lxDQACQCAAQaV/ag4EAQAAAQALIABB/QBHIABBhX9qQf//A3FBBElxDwtBAQsuAQF/QQEhAQJAIABBpglBBRAdDQAgAEGWCEEDEB0NACAAQbAJQQIQHSEBCyABC0YBA39BACEDAkAgACACQQF0IgJrIgRBAmoiAEEAKALcCSIFSQ0AIAAgASACEC8NAAJAIAAgBUcNAEEBDwsgBBAmIQMLIAMLgwEBAn9BASEBAkACQAJAAkACQAJAIAAvAQAiAkFFag4EBQQEAQALAkAgAkGbf2oOBAMEBAIACyACQSlGDQQgAkH5AEcNAyAAQX5qQbwJQQYQHQ8LIABBfmovAQBBPUYPCyAAQX5qQbQJQQQQHQ8LIABBfmpByAlBAxAdDwtBACEBCyABC7QDAQJ/QQAhAQJAAkACQAJAAkACQAJAAkACQAJAIAAvAQBBnH9qDhQAAQIJCQkJAwkJBAUJCQYJBwkJCAkLAkACQCAAQX5qLwEAQZd/ag4EAAoKAQoLIABBfGpByghBAhAdDwsgAEF8akHOCEEDEB0PCwJAAkACQCAAQX5qLwEAQY1/ag4DAAECCgsCQCAAQXxqLwEAIgJB4QBGDQAgAkHsAEcNCiAAQXpqQeUAECcPCyAAQXpqQeMAECcPCyAAQXxqQdQIQQQQHQ8LIABBfGpB3AhBBhAdDwsgAEF+ai8BAEHvAEcNBiAAQXxqLwEAQeUARw0GAkAgAEF6ai8BACICQfAARg0AIAJB4wBHDQcgAEF4akHoCEEGEB0PCyAAQXhqQfQIQQIQHQ8LIABBfmpB+AhBBBAdDwtBASEBIABBfmoiAEHpABAnDQQgAEGACUEFEB0PCyAAQX5qQeQAECcPCyAAQX5qQYoJQQcQHQ8LIABBfmpBmAlBBBAdDwsCQCAAQX5qLwEAIgJB7wBGDQAgAkHlAEcNASAAQXxqQe4AECcPCyAAQXxqQaAJQQMQHSEBCyABCzQBAX9BASEBAkAgAEF3akH//wNxQQVJDQAgAEGAAXJBoAFGDQAgAEEuRyAAEChxIQELIAELMAEBfwJAAkAgAEF3aiIBQRdLDQBBASABdEGNgIAEcQ0BCyAAQaABRg0AQQAPC0EBC04BAn9BACEBAkACQCAALwEAIgJB5QBGDQAgAkHrAEcNASAAQX5qQfgIQQQQHQ8LIABBfmovAQBB9QBHDQAgAEF8akHcCEEGEB0hAQsgAQveAQEEf0EAKAKwCiEAQQAoArQKIQECQAJAAkADQCAAIgJBAmohACACIAFPDQECQAJAAkAgAC8BACIDQaR/ag4FAgMDAwEACyADQSRHDQIgAi8BBEH7AEcNAkEAIAJBBGoiADYCsApBAEEALwGYCiICQQFqOwGYCkEAKAKkCiACQQN0aiICQQQ2AgAgAiAANgIEDwtBACAANgKwCkEAQQAvAZgKQX9qIgA7AZgKQQAoAqQKIABB//8DcUEDdGooAgBBA0cNAwwECyACQQRqIQAMAAsLQQAgADYCsAoLECULC3ABAn8CQAJAA0BBAEEAKAKwCiIAQQJqIgE2ArAKIABBACgCtApPDQECQAJAAkAgAS8BACIBQaV/ag4CAQIACwJAIAFBdmoOBAQDAwQACyABQS9HDQIMBAsQLhoMAQtBACAAQQRqNgKwCgwACwsQJQsLNQEBf0EAQQE6APwJQQAoArAKIQBBAEEAKAK0CkECajYCsApBACAAQQAoAtwJa0EBdTYCkAoLQwECf0EBIQECQCAALwEAIgJBd2pB//8DcUEFSQ0AIAJBgAFyQaABRg0AQQAhASACEChFDQAgAkEuRyAAECpyDwsgAQs9AQJ/QQAhAgJAQQAoAtwJIgMgAEsNACAALwEAIAFHDQACQCADIABHDQBBAQ8LIABBfmovAQAQICECCyACC2gBAn9BASEBAkACQCAAQV9qIgJBBUsNAEEBIAJ0QTFxDQELIABB+P8DcUEoRg0AIABBRmpB//8DcUEGSQ0AAkAgAEGlf2oiAkEDSw0AIAJBAUcNAQsgAEGFf2pB//8DcUEESSEBCyABC5wBAQN/QQAoArAKIQECQANAAkACQCABLwEAIgJBL0cNAAJAIAEvAQIiAUEqRg0AIAFBL0cNBBAYDAILIAAQGQwBCwJAAkAgAEUNACACQXdqIgFBF0sNAUEBIAF0QZ+AgARxRQ0BDAILIAIQIUUNAwwBCyACQaABRw0CC0EAQQAoArAKIgNBAmoiATYCsAogA0EAKAK0CkkNAAsLIAILMQEBf0EAIQECQCAALwEAQS5HDQAgAEF+ai8BAEEuRw0AIABBfGovAQBBLkYhAQsgAQumBAEBfwJAIAFBIkYNACABQSdGDQAQJQ8LQQAoArAKIQMgARAaIAAgA0ECakEAKAKwCkEAKALQCRABAkAgAkEBSA0AQQAoAvAJQQRBBiACQQFGGzYCHAtBAEEAKAKwCkECajYCsAoCQAJAAkACQEEAECkiAUHhAEYNACABQfcARg0BQQAoArAKIQEMAgtBACgCsAoiAUECakHACEEKEC8NAUEGIQIMAgtBACgCsAoiAS8BAkHpAEcNACABLwEEQfQARw0AQQQhAiABLwEGQegARg0BC0EAIAFBfmo2ArAKDwtBACABIAJBAXRqNgKwCgJAQQEQKUH7AEYNAEEAIAE2ArAKDwtBACgCsAoiACECA0BBACACQQJqNgKwCgJAAkACQEEBECkiAkEiRg0AIAJBJ0cNAUEnEBpBAEEAKAKwCkECajYCsApBARApIQIMAgtBIhAaQQBBACgCsApBAmo2ArAKQQEQKSECDAELIAIQLCECCwJAIAJBOkYNAEEAIAE2ArAKDwtBAEEAKAKwCkECajYCsAoCQEEBECkiAkEiRg0AIAJBJ0YNAEEAIAE2ArAKDwsgAhAaQQBBACgCsApBAmo2ArAKAkACQEEBECkiAkEsRg0AIAJB/QBGDQFBACABNgKwCg8LQQBBACgCsApBAmo2ArAKQQEQKUH9AEYNAEEAKAKwCiECDAELC0EAKALwCSIBIAA2AhAgAUEAKAKwCkECajYCDAttAQJ/AkACQANAAkAgAEH//wNxIgFBd2oiAkEXSw0AQQEgAnRBn4CABHENAgsgAUGgAUYNASAAIQIgARAoDQJBACECQQBBACgCsAoiAEECajYCsAogAC8BAiIADQAMAgsLIAAhAgsgAkH//wNxC6sBAQR/AkACQEEAKAKwCiICLwEAIgNB4QBGDQAgASEEIAAhBQwBC0EAIAJBBGo2ArAKQQEQKSECQQAoArAKIQUCQAJAIAJBIkYNACACQSdGDQAgAhAsGkEAKAKwCiEEDAELIAIQGkEAQQAoArAKQQJqIgQ2ArAKC0EBECkhA0EAKAKwCiECCwJAIAIgBUYNACAFIARBACAAIAAgAUYiAhtBACABIAIbEAILIAMLcgEEf0EAKAKwCiEAQQAoArQKIQECQAJAA0AgAEECaiECIAAgAU8NAQJAAkAgAi8BACIDQaR/ag4CAQQACyACIQAgA0F2ag4EAgEBAgELIABBBGohAAwACwtBACACNgKwChAlQQAPC0EAIAI2ArAKQd0AC0kBA39BACEDAkAgAkUNAAJAA0AgAC0AACIEIAEtAAAiBUcNASABQQFqIQEgAEEBaiEAIAJBf2oiAg0ADAILCyAEIAVrIQMLIAMLC+wBAgBBgAgLzgEAAHgAcABvAHIAdABtAHAAbwByAHQAZgBvAHIAZQB0AGEAbwB1AHIAYwBlAHIAbwBtAHUAbgBjAHQAaQBvAG4AcwBzAGUAcgB0AHYAbwB5AGkAZQBkAGUAbABlAGMAbwBuAHQAaQBuAGkAbgBzAHQAYQBuAHQAeQBiAHIAZQBhAHIAZQB0AHUAcgBkAGUAYgB1AGcAZwBlAGEAdwBhAGkAdABoAHIAdwBoAGkAbABlAGkAZgBjAGEAdABjAGYAaQBuAGEAbABsAGUAbABzAABB0AkLEAEAAAACAAAAAAQAAEA5AAA=", typeof Buffer < "u" ? Buffer.from(A2, "base64") : Uint8Array.from(atob(A2), ((A3) => A3.charCodeAt(0)));
  var A2;
}, init = WebAssembly.compile(E()).then(WebAssembly.instantiate).then((({ exports: A2 }) => {
  C = A2;
}));

// ../../node_modules/@jridgewell/sourcemap-codec/dist/sourcemap-codec.mjs
var comma = 44, semicolon = 59, chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", intToChar = new Uint8Array(64), charToInt = new Uint8Array(128);
for (let i = 0; i < chars.length; i++) {
  let c = chars.charCodeAt(i);
  intToChar[i] = c, charToInt[c] = i;
}
function encodeInteger(builder, num, relative4) {
  let delta = num - relative4;
  delta = delta < 0 ? -delta << 1 | 1 : delta << 1;
  do {
    let clamped = delta & 31;
    delta >>>= 5, delta > 0 && (clamped |= 32), builder.write(intToChar[clamped]);
  } while (delta > 0);
  return num;
}
var bufLength = 1024 * 16, td = typeof TextDecoder < "u" ? new TextDecoder() : typeof Buffer < "u" ? {
  decode(buf) {
    return Buffer.from(buf.buffer, buf.byteOffset, buf.byteLength).toString();
  }
} : {
  decode(buf) {
    let out = "";
    for (let i = 0; i < buf.length; i++)
      out += String.fromCharCode(buf[i]);
    return out;
  }
}, StringWriter = class {
  constructor() {
    this.pos = 0, this.out = "", this.buffer = new Uint8Array(bufLength);
  }
  write(v) {
    let { buffer } = this;
    buffer[this.pos++] = v, this.pos === bufLength && (this.out += td.decode(buffer), this.pos = 0);
  }
  flush() {
    let { buffer, out, pos } = this;
    return pos > 0 ? out + td.decode(buffer.subarray(0, pos)) : out;
  }
};
function encode(decoded) {
  let writer = new StringWriter(), sourcesIndex = 0, sourceLine = 0, sourceColumn = 0, namesIndex = 0;
  for (let i = 0; i < decoded.length; i++) {
    let line = decoded[i];
    if (i > 0 && writer.write(semicolon), line.length === 0) continue;
    let genColumn = 0;
    for (let j = 0; j < line.length; j++) {
      let segment = line[j];
      j > 0 && writer.write(comma), genColumn = encodeInteger(writer, segment[0], genColumn), segment.length !== 1 && (sourcesIndex = encodeInteger(writer, segment[1], sourcesIndex), sourceLine = encodeInteger(writer, segment[2], sourceLine), sourceColumn = encodeInteger(writer, segment[3], sourceColumn), segment.length !== 4 && (namesIndex = encodeInteger(writer, segment[4], namesIndex)));
    }
  }
  return writer.flush();
}

// ../../node_modules/magic-string/dist/magic-string.es.mjs
var BitSet = class _BitSet {
  constructor(arg) {
    this.bits = arg instanceof _BitSet ? arg.bits.slice() : [];
  }
  add(n2) {
    this.bits[n2 >> 5] |= 1 << (n2 & 31);
  }
  has(n2) {
    return !!(this.bits[n2 >> 5] & 1 << (n2 & 31));
  }
}, Chunk = class _Chunk {
  constructor(start2, end, content) {
    this.start = start2, this.end = end, this.original = content, this.intro = "", this.outro = "", this.content = content, this.storeName = !1, this.edited = !1, this.previous = null, this.next = null;
  }
  appendLeft(content) {
    this.outro += content;
  }
  appendRight(content) {
    this.intro = this.intro + content;
  }
  clone() {
    let chunk = new _Chunk(this.start, this.end, this.original);
    return chunk.intro = this.intro, chunk.outro = this.outro, chunk.content = this.content, chunk.storeName = this.storeName, chunk.edited = this.edited, chunk;
  }
  contains(index) {
    return this.start < index && index < this.end;
  }
  eachNext(fn) {
    let chunk = this;
    for (; chunk; )
      fn(chunk), chunk = chunk.next;
  }
  eachPrevious(fn) {
    let chunk = this;
    for (; chunk; )
      fn(chunk), chunk = chunk.previous;
  }
  edit(content, storeName, contentOnly) {
    return this.content = content, contentOnly || (this.intro = "", this.outro = ""), this.storeName = storeName, this.edited = !0, this;
  }
  prependLeft(content) {
    this.outro = content + this.outro;
  }
  prependRight(content) {
    this.intro = content + this.intro;
  }
  reset() {
    this.intro = "", this.outro = "", this.edited && (this.content = this.original, this.storeName = !1, this.edited = !1);
  }
  split(index) {
    let sliceIndex = index - this.start, originalBefore = this.original.slice(0, sliceIndex), originalAfter = this.original.slice(sliceIndex);
    this.original = originalBefore;
    let newChunk = new _Chunk(index, this.end, originalAfter);
    return newChunk.outro = this.outro, this.outro = "", this.end = index, this.edited ? (newChunk.edit("", !1), this.content = "") : this.content = originalBefore, newChunk.next = this.next, newChunk.next && (newChunk.next.previous = newChunk), newChunk.previous = this, this.next = newChunk, newChunk;
  }
  toString() {
    return this.intro + this.content + this.outro;
  }
  trimEnd(rx) {
    if (this.outro = this.outro.replace(rx, ""), this.outro.length) return !0;
    let trimmed = this.content.replace(rx, "");
    if (trimmed.length)
      return trimmed !== this.content && (this.split(this.start + trimmed.length).edit("", void 0, !0), this.edited && this.edit(trimmed, this.storeName, !0)), !0;
    if (this.edit("", void 0, !0), this.intro = this.intro.replace(rx, ""), this.intro.length) return !0;
  }
  trimStart(rx) {
    if (this.intro = this.intro.replace(rx, ""), this.intro.length) return !0;
    let trimmed = this.content.replace(rx, "");
    if (trimmed.length) {
      if (trimmed !== this.content) {
        let newChunk = this.split(this.end - trimmed.length);
        this.edited && newChunk.edit(trimmed, this.storeName, !0), this.edit("", void 0, !0);
      }
      return !0;
    } else if (this.edit("", void 0, !0), this.outro = this.outro.replace(rx, ""), this.outro.length) return !0;
  }
};
function getBtoa() {
  return typeof globalThis < "u" && typeof globalThis.btoa == "function" ? (str) => globalThis.btoa(unescape(encodeURIComponent(str))) : typeof Buffer == "function" ? (str) => Buffer.from(str, "utf-8").toString("base64") : () => {
    throw new Error("Unsupported environment: `window.btoa` or `Buffer` should be supported.");
  };
}
var btoa = getBtoa(), SourceMap = class {
  constructor(properties) {
    this.version = 3, this.file = properties.file, this.sources = properties.sources, this.sourcesContent = properties.sourcesContent, this.names = properties.names, this.mappings = encode(properties.mappings), typeof properties.x_google_ignoreList < "u" && (this.x_google_ignoreList = properties.x_google_ignoreList), typeof properties.debugId < "u" && (this.debugId = properties.debugId);
  }
  toString() {
    return JSON.stringify(this);
  }
  toUrl() {
    return "data:application/json;charset=utf-8;base64," + btoa(this.toString());
  }
};
function guessIndent(code) {
  let lines = code.split(`
`), tabbed = lines.filter((line) => /^\t+/.test(line)), spaced = lines.filter((line) => /^ {2,}/.test(line));
  if (tabbed.length === 0 && spaced.length === 0)
    return null;
  if (tabbed.length >= spaced.length)
    return "	";
  let min = spaced.reduce((previous, current) => {
    let numSpaces = /^ +/.exec(current)[0].length;
    return Math.min(numSpaces, previous);
  }, 1 / 0);
  return new Array(min + 1).join(" ");
}
function getRelativePath(from, to) {
  let fromParts = from.split(/[/\\]/), toParts = to.split(/[/\\]/);
  for (fromParts.pop(); fromParts[0] === toParts[0]; )
    fromParts.shift(), toParts.shift();
  if (fromParts.length) {
    let i = fromParts.length;
    for (; i--; ) fromParts[i] = "..";
  }
  return fromParts.concat(toParts).join("/");
}
var toString = Object.prototype.toString;
function isObject(thing) {
  return toString.call(thing) === "[object Object]";
}
function getLocator(source) {
  let originalLines = source.split(`
`), lineOffsets = [];
  for (let i = 0, pos = 0; i < originalLines.length; i++)
    lineOffsets.push(pos), pos += originalLines[i].length + 1;
  return function(index) {
    let i = 0, j = lineOffsets.length;
    for (; i < j; ) {
      let m = i + j >> 1;
      index < lineOffsets[m] ? j = m : i = m + 1;
    }
    let line = i - 1, column = index - lineOffsets[line];
    return { line, column };
  };
}
var wordRegex = /\w/, Mappings = class {
  constructor(hires) {
    this.hires = hires, this.generatedCodeLine = 0, this.generatedCodeColumn = 0, this.raw = [], this.rawSegments = this.raw[this.generatedCodeLine] = [], this.pending = null;
  }
  addEdit(sourceIndex, content, loc, nameIndex) {
    if (content.length) {
      let contentLengthMinusOne = content.length - 1, contentLineEnd = content.indexOf(`
`, 0), previousContentLineEnd = -1;
      for (; contentLineEnd >= 0 && contentLengthMinusOne > contentLineEnd; ) {
        let segment2 = [this.generatedCodeColumn, sourceIndex, loc.line, loc.column];
        nameIndex >= 0 && segment2.push(nameIndex), this.rawSegments.push(segment2), this.generatedCodeLine += 1, this.raw[this.generatedCodeLine] = this.rawSegments = [], this.generatedCodeColumn = 0, previousContentLineEnd = contentLineEnd, contentLineEnd = content.indexOf(`
`, contentLineEnd + 1);
      }
      let segment = [this.generatedCodeColumn, sourceIndex, loc.line, loc.column];
      nameIndex >= 0 && segment.push(nameIndex), this.rawSegments.push(segment), this.advance(content.slice(previousContentLineEnd + 1));
    } else this.pending && (this.rawSegments.push(this.pending), this.advance(content));
    this.pending = null;
  }
  addUneditedChunk(sourceIndex, chunk, original, loc, sourcemapLocations) {
    let originalCharIndex = chunk.start, first = !0, charInHiresBoundary = !1;
    for (; originalCharIndex < chunk.end; ) {
      if (original[originalCharIndex] === `
`)
        loc.line += 1, loc.column = 0, this.generatedCodeLine += 1, this.raw[this.generatedCodeLine] = this.rawSegments = [], this.generatedCodeColumn = 0, first = !0, charInHiresBoundary = !1;
      else {
        if (this.hires || first || sourcemapLocations.has(originalCharIndex)) {
          let segment = [this.generatedCodeColumn, sourceIndex, loc.line, loc.column];
          this.hires === "boundary" ? wordRegex.test(original[originalCharIndex]) ? charInHiresBoundary || (this.rawSegments.push(segment), charInHiresBoundary = !0) : (this.rawSegments.push(segment), charInHiresBoundary = !1) : this.rawSegments.push(segment);
        }
        loc.column += 1, this.generatedCodeColumn += 1, first = !1;
      }
      originalCharIndex += 1;
    }
    this.pending = null;
  }
  advance(str) {
    if (!str) return;
    let lines = str.split(`
`);
    if (lines.length > 1) {
      for (let i = 0; i < lines.length - 1; i++)
        this.generatedCodeLine++, this.raw[this.generatedCodeLine] = this.rawSegments = [];
      this.generatedCodeColumn = 0;
    }
    this.generatedCodeColumn += lines[lines.length - 1].length;
  }
}, n = `
`, warned = {
  insertLeft: !1,
  insertRight: !1,
  storeName: !1
}, MagicString = class _MagicString {
  constructor(string, options = {}) {
    let chunk = new Chunk(0, string.length, string);
    Object.defineProperties(this, {
      original: { writable: !0, value: string },
      outro: { writable: !0, value: "" },
      intro: { writable: !0, value: "" },
      firstChunk: { writable: !0, value: chunk },
      lastChunk: { writable: !0, value: chunk },
      lastSearchedChunk: { writable: !0, value: chunk },
      byStart: { writable: !0, value: {} },
      byEnd: { writable: !0, value: {} },
      filename: { writable: !0, value: options.filename },
      indentExclusionRanges: { writable: !0, value: options.indentExclusionRanges },
      sourcemapLocations: { writable: !0, value: new BitSet() },
      storedNames: { writable: !0, value: {} },
      indentStr: { writable: !0, value: void 0 },
      ignoreList: { writable: !0, value: options.ignoreList },
      offset: { writable: !0, value: options.offset || 0 }
    }), this.byStart[0] = chunk, this.byEnd[string.length] = chunk;
  }
  addSourcemapLocation(char) {
    this.sourcemapLocations.add(char);
  }
  append(content) {
    if (typeof content != "string") throw new TypeError("outro content must be a string");
    return this.outro += content, this;
  }
  appendLeft(index, content) {
    if (index = index + this.offset, typeof content != "string") throw new TypeError("inserted content must be a string");
    this._split(index);
    let chunk = this.byEnd[index];
    return chunk ? chunk.appendLeft(content) : this.intro += content, this;
  }
  appendRight(index, content) {
    if (index = index + this.offset, typeof content != "string") throw new TypeError("inserted content must be a string");
    this._split(index);
    let chunk = this.byStart[index];
    return chunk ? chunk.appendRight(content) : this.outro += content, this;
  }
  clone() {
    let cloned = new _MagicString(this.original, { filename: this.filename, offset: this.offset }), originalChunk = this.firstChunk, clonedChunk = cloned.firstChunk = cloned.lastSearchedChunk = originalChunk.clone();
    for (; originalChunk; ) {
      cloned.byStart[clonedChunk.start] = clonedChunk, cloned.byEnd[clonedChunk.end] = clonedChunk;
      let nextOriginalChunk = originalChunk.next, nextClonedChunk = nextOriginalChunk && nextOriginalChunk.clone();
      nextClonedChunk && (clonedChunk.next = nextClonedChunk, nextClonedChunk.previous = clonedChunk, clonedChunk = nextClonedChunk), originalChunk = nextOriginalChunk;
    }
    return cloned.lastChunk = clonedChunk, this.indentExclusionRanges && (cloned.indentExclusionRanges = this.indentExclusionRanges.slice()), cloned.sourcemapLocations = new BitSet(this.sourcemapLocations), cloned.intro = this.intro, cloned.outro = this.outro, cloned;
  }
  generateDecodedMap(options) {
    options = options || {};
    let sourceIndex = 0, names = Object.keys(this.storedNames), mappings = new Mappings(options.hires), locate = getLocator(this.original);
    return this.intro && mappings.advance(this.intro), this.firstChunk.eachNext((chunk) => {
      let loc = locate(chunk.start);
      chunk.intro.length && mappings.advance(chunk.intro), chunk.edited ? mappings.addEdit(
        sourceIndex,
        chunk.content,
        loc,
        chunk.storeName ? names.indexOf(chunk.original) : -1
      ) : mappings.addUneditedChunk(sourceIndex, chunk, this.original, loc, this.sourcemapLocations), chunk.outro.length && mappings.advance(chunk.outro);
    }), this.outro && mappings.advance(this.outro), {
      file: options.file ? options.file.split(/[/\\]/).pop() : void 0,
      sources: [
        options.source ? getRelativePath(options.file || "", options.source) : options.file || ""
      ],
      sourcesContent: options.includeContent ? [this.original] : void 0,
      names,
      mappings: mappings.raw,
      x_google_ignoreList: this.ignoreList ? [sourceIndex] : void 0
    };
  }
  generateMap(options) {
    return new SourceMap(this.generateDecodedMap(options));
  }
  _ensureindentStr() {
    this.indentStr === void 0 && (this.indentStr = guessIndent(this.original));
  }
  _getRawIndentString() {
    return this._ensureindentStr(), this.indentStr;
  }
  getIndentString() {
    return this._ensureindentStr(), this.indentStr === null ? "	" : this.indentStr;
  }
  indent(indentStr, options) {
    let pattern = /^[^\r\n]/gm;
    if (isObject(indentStr) && (options = indentStr, indentStr = void 0), indentStr === void 0 && (this._ensureindentStr(), indentStr = this.indentStr || "	"), indentStr === "") return this;
    options = options || {};
    let isExcluded = {};
    options.exclude && (typeof options.exclude[0] == "number" ? [options.exclude] : options.exclude).forEach((exclusion) => {
      for (let i = exclusion[0]; i < exclusion[1]; i += 1)
        isExcluded[i] = !0;
    });
    let shouldIndentNextCharacter = options.indentStart !== !1, replacer = (match2) => shouldIndentNextCharacter ? `${indentStr}${match2}` : (shouldIndentNextCharacter = !0, match2);
    this.intro = this.intro.replace(pattern, replacer);
    let charIndex = 0, chunk = this.firstChunk;
    for (; chunk; ) {
      let end = chunk.end;
      if (chunk.edited)
        isExcluded[charIndex] || (chunk.content = chunk.content.replace(pattern, replacer), chunk.content.length && (shouldIndentNextCharacter = chunk.content[chunk.content.length - 1] === `
`));
      else
        for (charIndex = chunk.start; charIndex < end; ) {
          if (!isExcluded[charIndex]) {
            let char = this.original[charIndex];
            char === `
` ? shouldIndentNextCharacter = !0 : char !== "\r" && shouldIndentNextCharacter && (shouldIndentNextCharacter = !1, charIndex === chunk.start || (this._splitChunk(chunk, charIndex), chunk = chunk.next), chunk.prependRight(indentStr));
          }
          charIndex += 1;
        }
      charIndex = chunk.end, chunk = chunk.next;
    }
    return this.outro = this.outro.replace(pattern, replacer), this;
  }
  insert() {
    throw new Error(
      "magicString.insert(...) is deprecated. Use prependRight(...) or appendLeft(...)"
    );
  }
  insertLeft(index, content) {
    return warned.insertLeft || (console.warn(
      "magicString.insertLeft(...) is deprecated. Use magicString.appendLeft(...) instead"
    ), warned.insertLeft = !0), this.appendLeft(index, content);
  }
  insertRight(index, content) {
    return warned.insertRight || (console.warn(
      "magicString.insertRight(...) is deprecated. Use magicString.prependRight(...) instead"
    ), warned.insertRight = !0), this.prependRight(index, content);
  }
  move(start2, end, index) {
    if (start2 = start2 + this.offset, end = end + this.offset, index = index + this.offset, index >= start2 && index <= end) throw new Error("Cannot move a selection inside itself");
    this._split(start2), this._split(end), this._split(index);
    let first = this.byStart[start2], last = this.byEnd[end], oldLeft = first.previous, oldRight = last.next, newRight = this.byStart[index];
    if (!newRight && last === this.lastChunk) return this;
    let newLeft = newRight ? newRight.previous : this.lastChunk;
    return oldLeft && (oldLeft.next = oldRight), oldRight && (oldRight.previous = oldLeft), newLeft && (newLeft.next = first), newRight && (newRight.previous = last), first.previous || (this.firstChunk = last.next), last.next || (this.lastChunk = first.previous, this.lastChunk.next = null), first.previous = newLeft, last.next = newRight || null, newLeft || (this.firstChunk = first), newRight || (this.lastChunk = last), this;
  }
  overwrite(start2, end, content, options) {
    return options = options || {}, this.update(start2, end, content, { ...options, overwrite: !options.contentOnly });
  }
  update(start2, end, content, options) {
    if (start2 = start2 + this.offset, end = end + this.offset, typeof content != "string") throw new TypeError("replacement content must be a string");
    if (this.original.length !== 0) {
      for (; start2 < 0; ) start2 += this.original.length;
      for (; end < 0; ) end += this.original.length;
    }
    if (end > this.original.length) throw new Error("end is out of bounds");
    if (start2 === end)
      throw new Error(
        "Cannot overwrite a zero-length range \u2013 use appendLeft or prependRight instead"
      );
    this._split(start2), this._split(end), options === !0 && (warned.storeName || (console.warn(
      "The final argument to magicString.overwrite(...) should be an options object. See https://github.com/rich-harris/magic-string"
    ), warned.storeName = !0), options = { storeName: !0 });
    let storeName = options !== void 0 ? options.storeName : !1, overwrite = options !== void 0 ? options.overwrite : !1;
    if (storeName) {
      let original = this.original.slice(start2, end);
      Object.defineProperty(this.storedNames, original, {
        writable: !0,
        value: !0,
        enumerable: !0
      });
    }
    let first = this.byStart[start2], last = this.byEnd[end];
    if (first) {
      let chunk = first;
      for (; chunk !== last; ) {
        if (chunk.next !== this.byStart[chunk.end])
          throw new Error("Cannot overwrite across a split point");
        chunk = chunk.next, chunk.edit("", !1);
      }
      first.edit(content, storeName, !overwrite);
    } else {
      let newChunk = new Chunk(start2, end, "").edit(content, storeName);
      last.next = newChunk, newChunk.previous = last;
    }
    return this;
  }
  prepend(content) {
    if (typeof content != "string") throw new TypeError("outro content must be a string");
    return this.intro = content + this.intro, this;
  }
  prependLeft(index, content) {
    if (index = index + this.offset, typeof content != "string") throw new TypeError("inserted content must be a string");
    this._split(index);
    let chunk = this.byEnd[index];
    return chunk ? chunk.prependLeft(content) : this.intro = content + this.intro, this;
  }
  prependRight(index, content) {
    if (index = index + this.offset, typeof content != "string") throw new TypeError("inserted content must be a string");
    this._split(index);
    let chunk = this.byStart[index];
    return chunk ? chunk.prependRight(content) : this.outro = content + this.outro, this;
  }
  remove(start2, end) {
    if (start2 = start2 + this.offset, end = end + this.offset, this.original.length !== 0) {
      for (; start2 < 0; ) start2 += this.original.length;
      for (; end < 0; ) end += this.original.length;
    }
    if (start2 === end) return this;
    if (start2 < 0 || end > this.original.length) throw new Error("Character is out of bounds");
    if (start2 > end) throw new Error("end must be greater than start");
    this._split(start2), this._split(end);
    let chunk = this.byStart[start2];
    for (; chunk; )
      chunk.intro = "", chunk.outro = "", chunk.edit(""), chunk = end > chunk.end ? this.byStart[chunk.end] : null;
    return this;
  }
  reset(start2, end) {
    if (start2 = start2 + this.offset, end = end + this.offset, this.original.length !== 0) {
      for (; start2 < 0; ) start2 += this.original.length;
      for (; end < 0; ) end += this.original.length;
    }
    if (start2 === end) return this;
    if (start2 < 0 || end > this.original.length) throw new Error("Character is out of bounds");
    if (start2 > end) throw new Error("end must be greater than start");
    this._split(start2), this._split(end);
    let chunk = this.byStart[start2];
    for (; chunk; )
      chunk.reset(), chunk = end > chunk.end ? this.byStart[chunk.end] : null;
    return this;
  }
  lastChar() {
    if (this.outro.length) return this.outro[this.outro.length - 1];
    let chunk = this.lastChunk;
    do {
      if (chunk.outro.length) return chunk.outro[chunk.outro.length - 1];
      if (chunk.content.length) return chunk.content[chunk.content.length - 1];
      if (chunk.intro.length) return chunk.intro[chunk.intro.length - 1];
    } while (chunk = chunk.previous);
    return this.intro.length ? this.intro[this.intro.length - 1] : "";
  }
  lastLine() {
    let lineIndex = this.outro.lastIndexOf(n);
    if (lineIndex !== -1) return this.outro.substr(lineIndex + 1);
    let lineStr = this.outro, chunk = this.lastChunk;
    do {
      if (chunk.outro.length > 0) {
        if (lineIndex = chunk.outro.lastIndexOf(n), lineIndex !== -1) return chunk.outro.substr(lineIndex + 1) + lineStr;
        lineStr = chunk.outro + lineStr;
      }
      if (chunk.content.length > 0) {
        if (lineIndex = chunk.content.lastIndexOf(n), lineIndex !== -1) return chunk.content.substr(lineIndex + 1) + lineStr;
        lineStr = chunk.content + lineStr;
      }
      if (chunk.intro.length > 0) {
        if (lineIndex = chunk.intro.lastIndexOf(n), lineIndex !== -1) return chunk.intro.substr(lineIndex + 1) + lineStr;
        lineStr = chunk.intro + lineStr;
      }
    } while (chunk = chunk.previous);
    return lineIndex = this.intro.lastIndexOf(n), lineIndex !== -1 ? this.intro.substr(lineIndex + 1) + lineStr : this.intro + lineStr;
  }
  slice(start2 = 0, end = this.original.length - this.offset) {
    if (start2 = start2 + this.offset, end = end + this.offset, this.original.length !== 0) {
      for (; start2 < 0; ) start2 += this.original.length;
      for (; end < 0; ) end += this.original.length;
    }
    let result = "", chunk = this.firstChunk;
    for (; chunk && (chunk.start > start2 || chunk.end <= start2); ) {
      if (chunk.start < end && chunk.end >= end)
        return result;
      chunk = chunk.next;
    }
    if (chunk && chunk.edited && chunk.start !== start2)
      throw new Error(`Cannot use replaced character ${start2} as slice start anchor.`);
    let startChunk = chunk;
    for (; chunk; ) {
      chunk.intro && (startChunk !== chunk || chunk.start === start2) && (result += chunk.intro);
      let containsEnd = chunk.start < end && chunk.end >= end;
      if (containsEnd && chunk.edited && chunk.end !== end)
        throw new Error(`Cannot use replaced character ${end} as slice end anchor.`);
      let sliceStart = startChunk === chunk ? start2 - chunk.start : 0, sliceEnd = containsEnd ? chunk.content.length + end - chunk.end : chunk.content.length;
      if (result += chunk.content.slice(sliceStart, sliceEnd), chunk.outro && (!containsEnd || chunk.end === end) && (result += chunk.outro), containsEnd)
        break;
      chunk = chunk.next;
    }
    return result;
  }
  // TODO deprecate this? not really very useful
  snip(start2, end) {
    let clone = this.clone();
    return clone.remove(0, start2), clone.remove(end, clone.original.length), clone;
  }
  _split(index) {
    if (this.byStart[index] || this.byEnd[index]) return;
    let chunk = this.lastSearchedChunk, previousChunk = chunk, searchForward = index > chunk.end;
    for (; chunk; ) {
      if (chunk.contains(index)) return this._splitChunk(chunk, index);
      if (chunk = searchForward ? this.byStart[chunk.end] : this.byEnd[chunk.start], chunk === previousChunk) return;
      previousChunk = chunk;
    }
  }
  _splitChunk(chunk, index) {
    if (chunk.edited && chunk.content.length) {
      let loc = getLocator(this.original)(index);
      throw new Error(
        `Cannot split a chunk that has already been edited (${loc.line}:${loc.column} \u2013 "${chunk.original}")`
      );
    }
    let newChunk = chunk.split(index);
    return this.byEnd[index] = chunk, this.byStart[index] = newChunk, this.byEnd[newChunk.end] = newChunk, chunk === this.lastChunk && (this.lastChunk = newChunk), this.lastSearchedChunk = chunk, !0;
  }
  toString() {
    let str = this.intro, chunk = this.firstChunk;
    for (; chunk; )
      str += chunk.toString(), chunk = chunk.next;
    return str + this.outro;
  }
  isEmpty() {
    let chunk = this.firstChunk;
    do
      if (chunk.intro.length && chunk.intro.trim() || chunk.content.length && chunk.content.trim() || chunk.outro.length && chunk.outro.trim())
        return !1;
    while (chunk = chunk.next);
    return !0;
  }
  length() {
    let chunk = this.firstChunk, length = 0;
    do
      length += chunk.intro.length + chunk.content.length + chunk.outro.length;
    while (chunk = chunk.next);
    return length;
  }
  trimLines() {
    return this.trim("[\\r\\n]");
  }
  trim(charType) {
    return this.trimStart(charType).trimEnd(charType);
  }
  trimEndAborted(charType) {
    let rx = new RegExp((charType || "\\s") + "+$");
    if (this.outro = this.outro.replace(rx, ""), this.outro.length) return !0;
    let chunk = this.lastChunk;
    do {
      let end = chunk.end, aborted = chunk.trimEnd(rx);
      if (chunk.end !== end && (this.lastChunk === chunk && (this.lastChunk = chunk.next), this.byEnd[chunk.end] = chunk, this.byStart[chunk.next.start] = chunk.next, this.byEnd[chunk.next.end] = chunk.next), aborted) return !0;
      chunk = chunk.previous;
    } while (chunk);
    return !1;
  }
  trimEnd(charType) {
    return this.trimEndAborted(charType), this;
  }
  trimStartAborted(charType) {
    let rx = new RegExp("^" + (charType || "\\s") + "+");
    if (this.intro = this.intro.replace(rx, ""), this.intro.length) return !0;
    let chunk = this.firstChunk;
    do {
      let end = chunk.end, aborted = chunk.trimStart(rx);
      if (chunk.end !== end && (chunk === this.lastChunk && (this.lastChunk = chunk.next), this.byEnd[chunk.end] = chunk, this.byStart[chunk.next.start] = chunk.next, this.byEnd[chunk.next.end] = chunk.next), aborted) return !0;
      chunk = chunk.next;
    } while (chunk);
    return !1;
  }
  trimStart(charType) {
    return this.trimStartAborted(charType), this;
  }
  hasChanged() {
    return this.original !== this.toString();
  }
  _replaceRegexp(searchValue, replacement) {
    function getReplacement(match2, str) {
      return typeof replacement == "string" ? replacement.replace(/\$(\$|&|\d+)/g, (_, i) => i === "$" ? "$" : i === "&" ? match2[0] : +i < match2.length ? match2[+i] : `$${i}`) : replacement(...match2, match2.index, str, match2.groups);
    }
    function matchAll(re, str) {
      let match2, matches = [];
      for (; match2 = re.exec(str); )
        matches.push(match2);
      return matches;
    }
    if (searchValue.global)
      matchAll(searchValue, this.original).forEach((match2) => {
        if (match2.index != null) {
          let replacement2 = getReplacement(match2, this.original);
          replacement2 !== match2[0] && this.overwrite(match2.index, match2.index + match2[0].length, replacement2);
        }
      });
    else {
      let match2 = this.original.match(searchValue);
      if (match2 && match2.index != null) {
        let replacement2 = getReplacement(match2, this.original);
        replacement2 !== match2[0] && this.overwrite(match2.index, match2.index + match2[0].length, replacement2);
      }
    }
    return this;
  }
  _replaceString(string, replacement) {
    let { original } = this, index = original.indexOf(string);
    return index !== -1 && (typeof replacement == "function" && (replacement = replacement(string, index, original)), string !== replacement && this.overwrite(index, index + string.length, replacement)), this;
  }
  replace(searchValue, replacement) {
    return typeof searchValue == "string" ? this._replaceString(searchValue, replacement) : this._replaceRegexp(searchValue, replacement);
  }
  _replaceAllString(string, replacement) {
    let { original } = this, stringLength = string.length;
    for (let index = original.indexOf(string); index !== -1; index = original.indexOf(string, index + stringLength)) {
      let previous = original.slice(index, index + stringLength), _replacement = replacement;
      typeof replacement == "function" && (_replacement = replacement(previous, index, original)), previous !== _replacement && this.overwrite(index, index + stringLength, _replacement);
    }
    return this;
  }
  replaceAll(searchValue, replacement) {
    if (typeof searchValue == "string")
      return this._replaceAllString(searchValue, replacement);
    if (!searchValue.global)
      throw new TypeError(
        "MagicString.prototype.replaceAll called with a non-global RegExp argument"
      );
    return this._replaceRegexp(searchValue, replacement);
  }
};

// src/plugins/inject-export-order-plugin.ts
async function injectExportOrderPlugin() {
  let { createFilter } = await import("vite"), filter2 = createFilter([/\.stories\.([tj])sx?$/, /(stories|story).mdx$/]);
  return {
    name: "storybook:inject-export-order-plugin",
    // This should only run after the typescript has been transpiled
    enforce: "post",
    async transform(code, id) {
      if (!filter2(id))
        return;
      let [, exports] = await parse(code), exportNames = exports.map((e) => code.substring(e.s, e.e));
      if (exportNames.includes("__namedExportsOrder"))
        return;
      let s = new MagicString(code), orderedExports = exportNames.filter((e) => e !== "default");
      return s.append(`;export const __namedExportsOrder = ${JSON.stringify(orderedExports)};`), {
        code: s.toString(),
        map: s.generateMap({ hires: !0, source: id })
      };
    }
  };
}

// src/plugins/strip-story-hmr-boundaries.ts
async function stripStoryHMRBoundary() {
  let { createFilter } = await import("vite"), filter2 = createFilter(/\.stories\.(tsx?|jsx?|svelte|vue)$/);
  return {
    name: "storybook:strip-hmr-boundary-plugin",
    enforce: "post",
    async transform(src, id) {
      if (!filter2(id))
        return;
      let s = new MagicString(src);
      return s.replace(/import\.meta\.hot\.accept\w*/, "(function hmrBoundaryNoop(){})"), {
        code: s.toString(),
        map: s.generateMap({ hires: !0, source: id })
      };
    }
  };
}

// src/plugins/code-generator-plugin.ts
import { readFileSync } from "node:fs";
import { fileURLToPath as fileURLToPath4 } from "node:url";

// ../../core/src/shared/utils/module.ts
import { fileURLToPath, pathToFileURL } from "node:url";

// ../../node_modules/exsolve/dist/index.mjs
import assert from "node:assert";
import v8 from "node:v8";
import { format, inspect } from "node:util";
var own$1 = {}.hasOwnProperty, classRegExp = /^([A-Z][a-z\d]*)+$/, kTypes = /* @__PURE__ */ new Set([
  "string",
  "function",
  "number",
  "object",
  "Function",
  "Object",
  "boolean",
  "bigint",
  "symbol"
]), messages = /* @__PURE__ */ new Map(), nodeInternalPrefix = "__node_internal_", userStackTraceLimit;
function formatList(array, type = "and") {
  return array.length < 3 ? array.join(` ${type} `) : `${array.slice(0, -1).join(", ")}, ${type} ${array.at(-1)}`;
}
function createError(sym, value, constructor) {
  return messages.set(sym, value), makeNodeErrorWithCode(constructor, sym);
}
function makeNodeErrorWithCode(Base, key) {
  return function(...parameters) {
    let limit = Error.stackTraceLimit;
    isErrorStackTraceLimitWritable() && (Error.stackTraceLimit = 0);
    let error = new Base();
    isErrorStackTraceLimitWritable() && (Error.stackTraceLimit = limit);
    let message = getMessage(key, parameters, error);
    return Object.defineProperties(error, {
      message: {
        value: message,
        enumerable: !1,
        writable: !0,
        configurable: !0
      },
      toString: {
        value() {
          return `${this.name} [${key}]: ${this.message}`;
        },
        enumerable: !1,
        writable: !0,
        configurable: !0
      }
    }), captureLargerStackTrace(error), error.code = key, error;
  };
}
function isErrorStackTraceLimitWritable() {
  try {
    if (v8.startupSnapshot.isBuildingSnapshot()) return !1;
  } catch {
  }
  let desc = Object.getOwnPropertyDescriptor(Error, "stackTraceLimit");
  return desc === void 0 ? Object.isExtensible(Error) : own$1.call(desc, "writable") && desc.writable !== void 0 ? desc.writable : desc.set !== void 0;
}
function hideStackFrames(wrappedFunction) {
  let hidden = nodeInternalPrefix + wrappedFunction.name;
  return Object.defineProperty(wrappedFunction, "name", { value: hidden }), wrappedFunction;
}
var captureLargerStackTrace = hideStackFrames(function(error) {
  let stackTraceLimitIsWritable = isErrorStackTraceLimitWritable();
  return stackTraceLimitIsWritable && (userStackTraceLimit = Error.stackTraceLimit, Error.stackTraceLimit = Number.POSITIVE_INFINITY), Error.captureStackTrace(error), stackTraceLimitIsWritable && (Error.stackTraceLimit = userStackTraceLimit), error;
});
function getMessage(key, parameters, self) {
  let message = messages.get(key);
  if (assert.ok(message !== void 0, "expected `message` to be found"), typeof message == "function")
    return assert.ok(message.length <= parameters.length, `Code: ${key}; The provided arguments length (${parameters.length}) does not match the required ones (${message.length}).`), Reflect.apply(message, self, parameters);
  let regex = /%[dfijoOs]/g, expectedLength = 0;
  for (; regex.exec(message) !== null; ) expectedLength++;
  return assert.ok(expectedLength === parameters.length, `Code: ${key}; The provided arguments length (${parameters.length}) does not match the required ones (${expectedLength}).`), parameters.length === 0 ? message : (parameters.unshift(message), Reflect.apply(format, null, parameters));
}
function determineSpecificType(value) {
  if (value == null) return String(value);
  if (typeof value == "function" && value.name) return `function ${value.name}`;
  if (typeof value == "object")
    return value.constructor && value.constructor.name ? `an instance of ${value.constructor.name}` : `${inspect(value, { depth: -1 })}`;
  let inspected = inspect(value, { colors: !1 });
  return inspected.length > 28 && (inspected = `${inspected.slice(0, 25)}...`), `type ${typeof value} (${inspected})`;
}
var ERR_INVALID_ARG_TYPE = createError("ERR_INVALID_ARG_TYPE", (name, expected, actual) => {
  assert.ok(typeof name == "string", "'name' must be a string"), Array.isArray(expected) || (expected = [expected]);
  let message = "The ";
  if (name.endsWith(" argument")) message += `${name} `;
  else {
    let type = name.includes(".") ? "property" : "argument";
    message += `"${name}" ${type} `;
  }
  message += "must be ";
  let types2 = [], instances = [], other = [];
  for (let value of expected)
    assert.ok(typeof value == "string", "All expected entries have to be of type string"), kTypes.has(value) ? types2.push(value.toLowerCase()) : classRegExp.exec(value) === null ? (assert.ok(value !== "object", 'The value "object" should be written as "Object"'), other.push(value)) : instances.push(value);
  if (instances.length > 0) {
    let pos = types2.indexOf("object");
    pos !== -1 && (types2.slice(pos, 1), instances.push("Object"));
  }
  return types2.length > 0 && (message += `${types2.length > 1 ? "one of type" : "of type"} ${formatList(types2, "or")}`, (instances.length > 0 || other.length > 0) && (message += " or ")), instances.length > 0 && (message += `an instance of ${formatList(instances, "or")}`, other.length > 0 && (message += " or ")), other.length > 0 && (other.length > 1 ? message += `one of ${formatList(other, "or")}` : (other[0]?.toLowerCase() !== other[0] && (message += "an "), message += `${other[0]}`)), message += `. Received ${determineSpecificType(actual)}`, message;
}, TypeError), ERR_INVALID_MODULE_SPECIFIER = createError(
  "ERR_INVALID_MODULE_SPECIFIER",
  /**
  * @param {string} request
  * @param {string} reason
  * @param {string} [base]
  */
  (request, reason, base) => `Invalid module "${request}" ${reason}${base ? ` imported from ${base}` : ""}`,
  TypeError
), ERR_INVALID_PACKAGE_CONFIG = createError("ERR_INVALID_PACKAGE_CONFIG", (path$1, base, message) => `Invalid package config ${path$1}${base ? ` while importing ${base}` : ""}${message ? `. ${message}` : ""}`, Error), ERR_INVALID_PACKAGE_TARGET = createError("ERR_INVALID_PACKAGE_TARGET", (packagePath, key, target, isImport = !1, base) => {
  let relatedError = typeof target == "string" && !isImport && target.length > 0 && !target.startsWith("./");
  return key === "." ? (assert.ok(isImport === !1), `Invalid "exports" main target ${JSON.stringify(target)} defined in the package config ${packagePath}package.json${base ? ` imported from ${base}` : ""}${relatedError ? '; targets must start with "./"' : ""}`) : `Invalid "${isImport ? "imports" : "exports"}" target ${JSON.stringify(target)} defined for '${key}' in the package config ${packagePath}package.json${base ? ` imported from ${base}` : ""}${relatedError ? '; targets must start with "./"' : ""}`;
}, Error), ERR_MODULE_NOT_FOUND = createError("ERR_MODULE_NOT_FOUND", (path$1, base, exactUrl = !1) => `Cannot find ${exactUrl ? "module" : "package"} '${path$1}' imported from ${base}`, Error), ERR_NETWORK_IMPORT_DISALLOWED = createError("ERR_NETWORK_IMPORT_DISALLOWED", "import of '%s' by %s is not supported: %s", Error), ERR_PACKAGE_IMPORT_NOT_DEFINED = createError("ERR_PACKAGE_IMPORT_NOT_DEFINED", (specifier, packagePath, base) => `Package import specifier "${specifier}" is not defined${packagePath ? ` in package ${packagePath || ""}package.json` : ""} imported from ${base}`, TypeError), ERR_PACKAGE_PATH_NOT_EXPORTED = createError(
  "ERR_PACKAGE_PATH_NOT_EXPORTED",
  /**
  * @param {string} packagePath
  * @param {string} subpath
  * @param {string} [base]
  */
  (packagePath, subpath, base) => subpath === "." ? `No "exports" main defined in ${packagePath}package.json${base ? ` imported from ${base}` : ""}` : `Package subpath '${subpath}' is not defined by "exports" in ${packagePath}package.json${base ? ` imported from ${base}` : ""}`,
  Error
), ERR_UNSUPPORTED_DIR_IMPORT = createError("ERR_UNSUPPORTED_DIR_IMPORT", "Directory import '%s' is not supported resolving ES modules imported from %s", Error), ERR_UNSUPPORTED_RESOLVE_REQUEST = createError("ERR_UNSUPPORTED_RESOLVE_REQUEST", 'Failed to resolve module specifier "%s" from "%s": Invalid relative URL or base scheme is not hierarchical.', TypeError), ERR_UNKNOWN_FILE_EXTENSION = createError("ERR_UNKNOWN_FILE_EXTENSION", (extension, path$1) => `Unknown file extension "${extension}" for ${path$1}`, TypeError), ERR_INVALID_ARG_VALUE = createError("ERR_INVALID_ARG_VALUE", (name, value, reason = "is invalid") => {
  let inspected = inspect(value);
  return inspected.length > 128 && (inspected = `${inspected.slice(0, 128)}...`), `The ${name.includes(".") ? "property" : "argument"} '${name}' ${reason}. Received ${inspected}`;
}, TypeError), hasOwnProperty$1 = {}.hasOwnProperty;
var hasOwnProperty = {}.hasOwnProperty;
var RegExpPrototypeSymbolReplace = RegExp.prototype[Symbol.replace], own = {}.hasOwnProperty;
var isWindows = process.platform === "win32", globalCache = globalThis.__EXSOLVE_CACHE__ ||= /* @__PURE__ */ new Map();

// ../../core/src/shared/utils/module.ts
var importMetaResolve = (...args) => typeof import.meta.resolve != "function" && process.env.VITEST === "true" ? (console.warn(
  "importMetaResolve from within Storybook is being used in a Vitest test, but it shouldn't be. Please report this at https://github.com/storybookjs/storybook/issues/new?template=bug_report.yml"
), pathToFileURL(args[0]).href) : import.meta.resolve(...args);

// ../../node_modules/knitwork/dist/index.mjs
function genString(input, options = {}) {
  let str = JSON.stringify(input);
  return options.singleQuotes ? `'${escapeString(str).slice(1, -1)}'` : str;
}
var NEEDS_ESCAPE_RE = /[\n\r'\\\u2028\u2029]/, QUOTE_NEWLINE_RE = /([\n\r'\u2028\u2029])/g, BACKSLASH_RE = /\\/g;
function escapeString(id) {
  return NEEDS_ESCAPE_RE.test(id) ? id.replace(BACKSLASH_RE, "\\\\").replace(QUOTE_NEWLINE_RE, "\\$1") : id;
}
function genSafeVariableName(name) {
  return reservedNames.has(name) ? `_${name}` : name.replace(/^\d/, (r) => `_${r}`).replace(/\W/g, (r) => "_" + r.charCodeAt(0));
}
var reservedNames = /* @__PURE__ */ new Set([
  "Infinity",
  "NaN",
  "arguments",
  "await",
  "break",
  "case",
  "catch",
  "class",
  "const",
  "continue",
  "debugger",
  "default",
  "delete",
  "do",
  "else",
  "enum",
  "eval",
  "export",
  "extends",
  "false",
  "finally",
  "for",
  "function",
  "if",
  "implements",
  "import",
  "in",
  "instanceof",
  "interface",
  "let",
  "new",
  "null",
  "package",
  "private",
  "protected",
  "public",
  "return",
  "static",
  "super",
  "switch",
  "this",
  "throw",
  "true",
  "try",
  "typeof",
  "undefined",
  "var",
  "void",
  "while",
  "with",
  "yield"
]), VALID_IDENTIFIER_RE = /^[$_]?([A-Z_a-z]\w*|\d)$/;
function _genStatement(type, specifier, names, options = {}) {
  let specifierString = genString(specifier, options);
  if (!names)
    return `${type} ${specifierString};`;
  let nameArray = Array.isArray(names), namesString = (nameArray ? names : [names]).map((index) => typeof index == "string" ? { name: index } : (index.name === index.as && (index = { name: index.name }), index)).map((index) => index.as ? `${index.name} as ${index.as}` : index.name).join(", ");
  return nameArray ? `${type} { ${namesString} } from ${genString(
    specifier,
    options
  )}${_genImportAttributes(type, options)};` : `${type} ${namesString} from ${genString(
    specifier,
    options
  )}${_genImportAttributes(type, options)};`;
}
function _genImportAttributes(type, options) {
  return type === "import type" || type === "export type" ? "" : typeof options.attributes?.type == "string" ? ` with { type: ${genString(options.attributes.type)} }` : typeof options.assert?.type == "string" ? ` assert { type: ${genString(options.assert.type)} }` : "";
}
function genImport(specifier, imports, options = {}) {
  return _genStatement("import", specifier, imports, options);
}
function genDynamicImport(specifier, options = {}) {
  let commentString = options.comment ? ` /* ${options.comment} */` : "", wrapperString = options.wrapper === !1 ? "" : "() => ", interopString = options.interopDefault ? ".then(m => m.default || m)" : "", optionsString = _genDynamicImportAttributes(options);
  return `${wrapperString}import(${genString(
    specifier,
    options
  )}${commentString}${optionsString})${interopString}`;
}
function _genDynamicImportAttributes(options = {}) {
  return typeof options.assert?.type == "string" ? `, { assert: { type: ${genString(options.assert.type)} } }` : typeof options.attributes?.type == "string" ? `, { with: { type: ${genString(options.attributes.type)} } }` : "";
}
function wrapInDelimiters(lines, indent = "", delimiters = "{}", withComma = !0) {
  if (lines.length === 0)
    return delimiters;
  let [start2, end] = delimiters;
  return `${start2}
` + lines.join(withComma ? `,
` : `
`) + `
${indent}${end}`;
}
function genObjectKey(key) {
  return VALID_IDENTIFIER_RE.test(key) ? key : genString(key);
}
function genObjectFromRaw(object, indent = "", options = {}) {
  return genObjectFromRawEntries(Object.entries(object), indent, options);
}
function genArrayFromRaw(array, indent = "", options = {}) {
  let newIdent = indent + "  ";
  return wrapInDelimiters(
    array.map((index) => `${newIdent}${genRawValue(index, newIdent, options)}`),
    indent,
    "[]"
  );
}
function genObjectFromRawEntries(array, indent = "", options = {}) {
  let newIdent = indent + "  ";
  return wrapInDelimiters(
    array.map(
      ([key, value]) => `${newIdent}${genObjectKey(key)}: ${genRawValue(value, newIdent, options)}`
    ),
    indent,
    "{}"
  );
}
function genRawValue(value, indent = "", options = {}) {
  return value === void 0 ? "undefined" : value === null ? "null" : Array.isArray(value) ? genArrayFromRaw(value, indent, options) : value && typeof value == "object" ? genObjectFromRaw(value, indent, options) : options.preserveTypes && typeof value != "function" ? JSON.stringify(value) : value.toString();
}

// src/codegen-importfn-script.ts
import { dedent } from "ts-dedent";

// src/list-stories.ts
import { isAbsolute as isAbsolute2, join as join2 } from "node:path";
import { commonGlobOptions, normalizeStories } from "storybook/internal/common";

// ../../node_modules/glob/node_modules/minimatch/dist/esm/index.js
var import_brace_expansion = __toESM(require_brace_expansion(), 1);

// ../../node_modules/glob/node_modules/minimatch/dist/esm/assert-valid-pattern.js
var assertValidPattern = (pattern) => {
  if (typeof pattern != "string")
    throw new TypeError("invalid pattern");
  if (pattern.length > 65536)
    throw new TypeError("pattern is too long");
};

// ../../node_modules/glob/node_modules/minimatch/dist/esm/brace-expressions.js
var posixClasses = {
  "[:alnum:]": ["\\p{L}\\p{Nl}\\p{Nd}", !0],
  "[:alpha:]": ["\\p{L}\\p{Nl}", !0],
  "[:ascii:]": ["\\x00-\\x7f", !1],
  "[:blank:]": ["\\p{Zs}\\t", !0],
  "[:cntrl:]": ["\\p{Cc}", !0],
  "[:digit:]": ["\\p{Nd}", !0],
  "[:graph:]": ["\\p{Z}\\p{C}", !0, !0],
  "[:lower:]": ["\\p{Ll}", !0],
  "[:print:]": ["\\p{C}", !0],
  "[:punct:]": ["\\p{P}", !0],
  "[:space:]": ["\\p{Z}\\t\\r\\n\\v\\f", !0],
  "[:upper:]": ["\\p{Lu}", !0],
  "[:word:]": ["\\p{L}\\p{Nl}\\p{Nd}\\p{Pc}", !0],
  "[:xdigit:]": ["A-Fa-f0-9", !1]
}, braceEscape = (s) => s.replace(/[[\]\\-]/g, "\\$&"), regexpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), rangesToString = (ranges) => ranges.join(""), parseClass = (glob2, position) => {
  let pos = position;
  if (glob2.charAt(pos) !== "[")
    throw new Error("not in a brace expression");
  let ranges = [], negs = [], i = pos + 1, sawStart = !1, uflag = !1, escaping = !1, negate = !1, endPos = pos, rangeStart = "";
  WHILE: for (; i < glob2.length; ) {
    let c = glob2.charAt(i);
    if ((c === "!" || c === "^") && i === pos + 1) {
      negate = !0, i++;
      continue;
    }
    if (c === "]" && sawStart && !escaping) {
      endPos = i + 1;
      break;
    }
    if (sawStart = !0, c === "\\" && !escaping) {
      escaping = !0, i++;
      continue;
    }
    if (c === "[" && !escaping) {
      for (let [cls, [unip, u, neg]] of Object.entries(posixClasses))
        if (glob2.startsWith(cls, i)) {
          if (rangeStart)
            return ["$.", !1, glob2.length - pos, !0];
          i += cls.length, neg ? negs.push(unip) : ranges.push(unip), uflag = uflag || u;
          continue WHILE;
        }
    }
    if (escaping = !1, rangeStart) {
      c > rangeStart ? ranges.push(braceEscape(rangeStart) + "-" + braceEscape(c)) : c === rangeStart && ranges.push(braceEscape(c)), rangeStart = "", i++;
      continue;
    }
    if (glob2.startsWith("-]", i + 1)) {
      ranges.push(braceEscape(c + "-")), i += 2;
      continue;
    }
    if (glob2.startsWith("-", i + 1)) {
      rangeStart = c, i += 2;
      continue;
    }
    ranges.push(braceEscape(c)), i++;
  }
  if (endPos < i)
    return ["", !1, 0, !1];
  if (!ranges.length && !negs.length)
    return ["$.", !1, glob2.length - pos, !0];
  if (negs.length === 0 && ranges.length === 1 && /^\\?.$/.test(ranges[0]) && !negate) {
    let r = ranges[0].length === 2 ? ranges[0].slice(-1) : ranges[0];
    return [regexpEscape(r), !1, endPos - pos, !1];
  }
  let sranges = "[" + (negate ? "^" : "") + rangesToString(ranges) + "]", snegs = "[" + (negate ? "" : "^") + rangesToString(negs) + "]";
  return [ranges.length && negs.length ? "(" + sranges + "|" + snegs + ")" : ranges.length ? sranges : snegs, uflag, endPos - pos, !0];
};

// ../../node_modules/glob/node_modules/minimatch/dist/esm/unescape.js
var unescape2 = (s, { windowsPathsNoEscape = !1 } = {}) => windowsPathsNoEscape ? s.replace(/\[([^\/\\])\]/g, "$1") : s.replace(/((?!\\).|^)\[([^\/\\])\]/g, "$1$2").replace(/\\([^\/])/g, "$1");

// ../../node_modules/glob/node_modules/minimatch/dist/esm/ast.js
var types = /* @__PURE__ */ new Set(["!", "?", "+", "*", "@"]), isExtglobType = (c) => types.has(c), startNoTraversal = "(?!(?:^|/)\\.\\.?(?:$|/))", startNoDot = "(?!\\.)", addPatternStart = /* @__PURE__ */ new Set(["[", "."]), justDots = /* @__PURE__ */ new Set(["..", "."]), reSpecials = new Set("().*{}+?[]^$\\!"), regExpEscape = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), qmark = "[^/]", star = qmark + "*?", starNoEmpty = qmark + "+?", AST = class _AST {
  type;
  #root;
  #hasMagic;
  #uflag = !1;
  #parts = [];
  #parent;
  #parentIndex;
  #negs;
  #filledNegs = !1;
  #options;
  #toString;
  // set to true if it's an extglob with no children
  // (which really means one child of '')
  #emptyExt = !1;
  constructor(type, parent, options = {}) {
    this.type = type, type && (this.#hasMagic = !0), this.#parent = parent, this.#root = this.#parent ? this.#parent.#root : this, this.#options = this.#root === this ? options : this.#root.#options, this.#negs = this.#root === this ? [] : this.#root.#negs, type === "!" && !this.#root.#filledNegs && this.#negs.push(this), this.#parentIndex = this.#parent ? this.#parent.#parts.length : 0;
  }
  get hasMagic() {
    if (this.#hasMagic !== void 0)
      return this.#hasMagic;
    for (let p of this.#parts)
      if (typeof p != "string" && (p.type || p.hasMagic))
        return this.#hasMagic = !0;
    return this.#hasMagic;
  }
  // reconstructs the pattern
  toString() {
    return this.#toString !== void 0 ? this.#toString : this.type ? this.#toString = this.type + "(" + this.#parts.map((p) => String(p)).join("|") + ")" : this.#toString = this.#parts.map((p) => String(p)).join("");
  }
  #fillNegs() {
    if (this !== this.#root)
      throw new Error("should only call on root");
    if (this.#filledNegs)
      return this;
    this.toString(), this.#filledNegs = !0;
    let n2;
    for (; n2 = this.#negs.pop(); ) {
      if (n2.type !== "!")
        continue;
      let p = n2, pp = p.#parent;
      for (; pp; ) {
        for (let i = p.#parentIndex + 1; !pp.type && i < pp.#parts.length; i++)
          for (let part of n2.#parts) {
            if (typeof part == "string")
              throw new Error("string part in extglob AST??");
            part.copyIn(pp.#parts[i]);
          }
        p = pp, pp = p.#parent;
      }
    }
    return this;
  }
  push(...parts) {
    for (let p of parts)
      if (p !== "") {
        if (typeof p != "string" && !(p instanceof _AST && p.#parent === this))
          throw new Error("invalid part: " + p);
        this.#parts.push(p);
      }
  }
  toJSON() {
    let ret = this.type === null ? this.#parts.slice().map((p) => typeof p == "string" ? p : p.toJSON()) : [this.type, ...this.#parts.map((p) => p.toJSON())];
    return this.isStart() && !this.type && ret.unshift([]), this.isEnd() && (this === this.#root || this.#root.#filledNegs && this.#parent?.type === "!") && ret.push({}), ret;
  }
  isStart() {
    if (this.#root === this)
      return !0;
    if (!this.#parent?.isStart())
      return !1;
    if (this.#parentIndex === 0)
      return !0;
    let p = this.#parent;
    for (let i = 0; i < this.#parentIndex; i++) {
      let pp = p.#parts[i];
      if (!(pp instanceof _AST && pp.type === "!"))
        return !1;
    }
    return !0;
  }
  isEnd() {
    if (this.#root === this || this.#parent?.type === "!")
      return !0;
    if (!this.#parent?.isEnd())
      return !1;
    if (!this.type)
      return this.#parent?.isEnd();
    let pl = this.#parent ? this.#parent.#parts.length : 0;
    return this.#parentIndex === pl - 1;
  }
  copyIn(part) {
    typeof part == "string" ? this.push(part) : this.push(part.clone(this));
  }
  clone(parent) {
    let c = new _AST(this.type, parent);
    for (let p of this.#parts)
      c.copyIn(p);
    return c;
  }
  static #parseAST(str, ast, pos, opt) {
    let escaping = !1, inBrace = !1, braceStart = -1, braceNeg = !1;
    if (ast.type === null) {
      let i2 = pos, acc2 = "";
      for (; i2 < str.length; ) {
        let c = str.charAt(i2++);
        if (escaping || c === "\\") {
          escaping = !escaping, acc2 += c;
          continue;
        }
        if (inBrace) {
          i2 === braceStart + 1 ? (c === "^" || c === "!") && (braceNeg = !0) : c === "]" && !(i2 === braceStart + 2 && braceNeg) && (inBrace = !1), acc2 += c;
          continue;
        } else if (c === "[") {
          inBrace = !0, braceStart = i2, braceNeg = !1, acc2 += c;
          continue;
        }
        if (!opt.noext && isExtglobType(c) && str.charAt(i2) === "(") {
          ast.push(acc2), acc2 = "";
          let ext2 = new _AST(c, ast);
          i2 = _AST.#parseAST(str, ext2, i2, opt), ast.push(ext2);
          continue;
        }
        acc2 += c;
      }
      return ast.push(acc2), i2;
    }
    let i = pos + 1, part = new _AST(null, ast), parts = [], acc = "";
    for (; i < str.length; ) {
      let c = str.charAt(i++);
      if (escaping || c === "\\") {
        escaping = !escaping, acc += c;
        continue;
      }
      if (inBrace) {
        i === braceStart + 1 ? (c === "^" || c === "!") && (braceNeg = !0) : c === "]" && !(i === braceStart + 2 && braceNeg) && (inBrace = !1), acc += c;
        continue;
      } else if (c === "[") {
        inBrace = !0, braceStart = i, braceNeg = !1, acc += c;
        continue;
      }
      if (isExtglobType(c) && str.charAt(i) === "(") {
        part.push(acc), acc = "";
        let ext2 = new _AST(c, part);
        part.push(ext2), i = _AST.#parseAST(str, ext2, i, opt);
        continue;
      }
      if (c === "|") {
        part.push(acc), acc = "", parts.push(part), part = new _AST(null, ast);
        continue;
      }
      if (c === ")")
        return acc === "" && ast.#parts.length === 0 && (ast.#emptyExt = !0), part.push(acc), acc = "", ast.push(...parts, part), i;
      acc += c;
    }
    return ast.type = null, ast.#hasMagic = void 0, ast.#parts = [str.substring(pos - 1)], i;
  }
  static fromGlob(pattern, options = {}) {
    let ast = new _AST(null, void 0, options);
    return _AST.#parseAST(pattern, ast, 0, options), ast;
  }
  // returns the regular expression if there's magic, or the unescaped
  // string if not.
  toMMPattern() {
    if (this !== this.#root)
      return this.#root.toMMPattern();
    let glob2 = this.toString(), [re, body, hasMagic2, uflag] = this.toRegExpSource();
    if (!(hasMagic2 || this.#hasMagic || this.#options.nocase && !this.#options.nocaseMagicOnly && glob2.toUpperCase() !== glob2.toLowerCase()))
      return body;
    let flags = (this.#options.nocase ? "i" : "") + (uflag ? "u" : "");
    return Object.assign(new RegExp(`^${re}$`, flags), {
      _src: re,
      _glob: glob2
    });
  }
  get options() {
    return this.#options;
  }
  // returns the string match, the regexp source, whether there's magic
  // in the regexp (so a regular expression is required) and whether or
  // not the uflag is needed for the regular expression (for posix classes)
  // TODO: instead of injecting the start/end at this point, just return
  // the BODY of the regexp, along with the start/end portions suitable
  // for binding the start/end in either a joined full-path makeRe context
  // (where we bind to (^|/), or a standalone matchPart context (where
  // we bind to ^, and not /).  Otherwise slashes get duped!
  //
  // In part-matching mode, the start is:
  // - if not isStart: nothing
  // - if traversal possible, but not allowed: ^(?!\.\.?$)
  // - if dots allowed or not possible: ^
  // - if dots possible and not allowed: ^(?!\.)
  // end is:
  // - if not isEnd(): nothing
  // - else: $
  //
  // In full-path matching mode, we put the slash at the START of the
  // pattern, so start is:
  // - if first pattern: same as part-matching mode
  // - if not isStart(): nothing
  // - if traversal possible, but not allowed: /(?!\.\.?(?:$|/))
  // - if dots allowed or not possible: /
  // - if dots possible and not allowed: /(?!\.)
  // end is:
  // - if last pattern, same as part-matching mode
  // - else nothing
  //
  // Always put the (?:$|/) on negated tails, though, because that has to be
  // there to bind the end of the negated pattern portion, and it's easier to
  // just stick it in now rather than try to inject it later in the middle of
  // the pattern.
  //
  // We can just always return the same end, and leave it up to the caller
  // to know whether it's going to be used joined or in parts.
  // And, if the start is adjusted slightly, can do the same there:
  // - if not isStart: nothing
  // - if traversal possible, but not allowed: (?:/|^)(?!\.\.?$)
  // - if dots allowed or not possible: (?:/|^)
  // - if dots possible and not allowed: (?:/|^)(?!\.)
  //
  // But it's better to have a simpler binding without a conditional, for
  // performance, so probably better to return both start options.
  //
  // Then the caller just ignores the end if it's not the first pattern,
  // and the start always gets applied.
  //
  // But that's always going to be $ if it's the ending pattern, or nothing,
  // so the caller can just attach $ at the end of the pattern when building.
  //
  // So the todo is:
  // - better detect what kind of start is needed
  // - return both flavors of starting pattern
  // - attach $ at the end of the pattern when creating the actual RegExp
  //
  // Ah, but wait, no, that all only applies to the root when the first pattern
  // is not an extglob. If the first pattern IS an extglob, then we need all
  // that dot prevention biz to live in the extglob portions, because eg
  // +(*|.x*) can match .xy but not .yx.
  //
  // So, return the two flavors if it's #root and the first child is not an
  // AST, otherwise leave it to the child AST to handle it, and there,
  // use the (?:^|/) style of start binding.
  //
  // Even simplified further:
  // - Since the start for a join is eg /(?!\.) and the start for a part
  // is ^(?!\.), we can just prepend (?!\.) to the pattern (either root
  // or start or whatever) and prepend ^ or / at the Regexp construction.
  toRegExpSource(allowDot) {
    let dot = allowDot ?? !!this.#options.dot;
    if (this.#root === this && this.#fillNegs(), !this.type) {
      let noEmpty = this.isStart() && this.isEnd(), src = this.#parts.map((p) => {
        let [re, _, hasMagic2, uflag] = typeof p == "string" ? _AST.#parseGlob(p, this.#hasMagic, noEmpty) : p.toRegExpSource(allowDot);
        return this.#hasMagic = this.#hasMagic || hasMagic2, this.#uflag = this.#uflag || uflag, re;
      }).join(""), start3 = "";
      if (this.isStart() && typeof this.#parts[0] == "string" && !(this.#parts.length === 1 && justDots.has(this.#parts[0]))) {
        let aps = addPatternStart, needNoTrav = (
          // dots are allowed, and the pattern starts with [ or .
          dot && aps.has(src.charAt(0)) || // the pattern starts with \., and then [ or .
          src.startsWith("\\.") && aps.has(src.charAt(2)) || // the pattern starts with \.\., and then [ or .
          src.startsWith("\\.\\.") && aps.has(src.charAt(4))
        ), needNoDot = !dot && !allowDot && aps.has(src.charAt(0));
        start3 = needNoTrav ? startNoTraversal : needNoDot ? startNoDot : "";
      }
      let end = "";
      return this.isEnd() && this.#root.#filledNegs && this.#parent?.type === "!" && (end = "(?:$|\\/)"), [
        start3 + src + end,
        unescape2(src),
        this.#hasMagic = !!this.#hasMagic,
        this.#uflag
      ];
    }
    let repeated = this.type === "*" || this.type === "+", start2 = this.type === "!" ? "(?:(?!(?:" : "(?:", body = this.#partsToRegExp(dot);
    if (this.isStart() && this.isEnd() && !body && this.type !== "!") {
      let s = this.toString();
      return this.#parts = [s], this.type = null, this.#hasMagic = void 0, [s, unescape2(this.toString()), !1, !1];
    }
    let bodyDotAllowed = !repeated || allowDot || dot || !startNoDot ? "" : this.#partsToRegExp(!0);
    bodyDotAllowed === body && (bodyDotAllowed = ""), bodyDotAllowed && (body = `(?:${body})(?:${bodyDotAllowed})*?`);
    let final = "";
    if (this.type === "!" && this.#emptyExt)
      final = (this.isStart() && !dot ? startNoDot : "") + starNoEmpty;
    else {
      let close = this.type === "!" ? (
        // !() must match something,but !(x) can match ''
        "))" + (this.isStart() && !dot && !allowDot ? startNoDot : "") + star + ")"
      ) : this.type === "@" ? ")" : this.type === "?" ? ")?" : this.type === "+" && bodyDotAllowed ? ")" : this.type === "*" && bodyDotAllowed ? ")?" : `)${this.type}`;
      final = start2 + body + close;
    }
    return [
      final,
      unescape2(body),
      this.#hasMagic = !!this.#hasMagic,
      this.#uflag
    ];
  }
  #partsToRegExp(dot) {
    return this.#parts.map((p) => {
      if (typeof p == "string")
        throw new Error("string type in extglob ast??");
      let [re, _, _hasMagic, uflag] = p.toRegExpSource(dot);
      return this.#uflag = this.#uflag || uflag, re;
    }).filter((p) => !(this.isStart() && this.isEnd()) || !!p).join("|");
  }
  static #parseGlob(glob2, hasMagic2, noEmpty = !1) {
    let escaping = !1, re = "", uflag = !1;
    for (let i = 0; i < glob2.length; i++) {
      let c = glob2.charAt(i);
      if (escaping) {
        escaping = !1, re += (reSpecials.has(c) ? "\\" : "") + c;
        continue;
      }
      if (c === "\\") {
        i === glob2.length - 1 ? re += "\\\\" : escaping = !0;
        continue;
      }
      if (c === "[") {
        let [src, needUflag, consumed, magic] = parseClass(glob2, i);
        if (consumed) {
          re += src, uflag = uflag || needUflag, i += consumed - 1, hasMagic2 = hasMagic2 || magic;
          continue;
        }
      }
      if (c === "*") {
        noEmpty && glob2 === "*" ? re += starNoEmpty : re += star, hasMagic2 = !0;
        continue;
      }
      if (c === "?") {
        re += qmark, hasMagic2 = !0;
        continue;
      }
      re += regExpEscape(c);
    }
    return [re, unescape2(glob2), !!hasMagic2, uflag];
  }
};

// ../../node_modules/glob/node_modules/minimatch/dist/esm/escape.js
var escape = (s, { windowsPathsNoEscape = !1 } = {}) => windowsPathsNoEscape ? s.replace(/[?*()[\]]/g, "[$&]") : s.replace(/[?*()[\]\\]/g, "\\$&");

// ../../node_modules/glob/node_modules/minimatch/dist/esm/index.js
var minimatch = (p, pattern, options = {}) => (assertValidPattern(pattern), !options.nocomment && pattern.charAt(0) === "#" ? !1 : new Minimatch(pattern, options).match(p)), starDotExtRE = /^\*+([^+@!?\*\[\(]*)$/, starDotExtTest = (ext2) => (f) => !f.startsWith(".") && f.endsWith(ext2), starDotExtTestDot = (ext2) => (f) => f.endsWith(ext2), starDotExtTestNocase = (ext2) => (ext2 = ext2.toLowerCase(), (f) => !f.startsWith(".") && f.toLowerCase().endsWith(ext2)), starDotExtTestNocaseDot = (ext2) => (ext2 = ext2.toLowerCase(), (f) => f.toLowerCase().endsWith(ext2)), starDotStarRE = /^\*+\.\*+$/, starDotStarTest = (f) => !f.startsWith(".") && f.includes("."), starDotStarTestDot = (f) => f !== "." && f !== ".." && f.includes("."), dotStarRE = /^\.\*+$/, dotStarTest = (f) => f !== "." && f !== ".." && f.startsWith("."), starRE = /^\*+$/, starTest = (f) => f.length !== 0 && !f.startsWith("."), starTestDot = (f) => f.length !== 0 && f !== "." && f !== "..", qmarksRE = /^\?+([^+@!?\*\[\(]*)?$/, qmarksTestNocase = ([$0, ext2 = ""]) => {
  let noext = qmarksTestNoExt([$0]);
  return ext2 ? (ext2 = ext2.toLowerCase(), (f) => noext(f) && f.toLowerCase().endsWith(ext2)) : noext;
}, qmarksTestNocaseDot = ([$0, ext2 = ""]) => {
  let noext = qmarksTestNoExtDot([$0]);
  return ext2 ? (ext2 = ext2.toLowerCase(), (f) => noext(f) && f.toLowerCase().endsWith(ext2)) : noext;
}, qmarksTestDot = ([$0, ext2 = ""]) => {
  let noext = qmarksTestNoExtDot([$0]);
  return ext2 ? (f) => noext(f) && f.endsWith(ext2) : noext;
}, qmarksTest = ([$0, ext2 = ""]) => {
  let noext = qmarksTestNoExt([$0]);
  return ext2 ? (f) => noext(f) && f.endsWith(ext2) : noext;
}, qmarksTestNoExt = ([$0]) => {
  let len = $0.length;
  return (f) => f.length === len && !f.startsWith(".");
}, qmarksTestNoExtDot = ([$0]) => {
  let len = $0.length;
  return (f) => f.length === len && f !== "." && f !== "..";
}, defaultPlatform = typeof process == "object" && process ? typeof process.env == "object" && process.env && process.env.__MINIMATCH_TESTING_PLATFORM__ || process.platform : "posix", path = {
  win32: { sep: "\\" },
  posix: { sep: "/" }
}, sep = defaultPlatform === "win32" ? path.win32.sep : path.posix.sep;
minimatch.sep = sep;
var GLOBSTAR = Symbol("globstar **");
minimatch.GLOBSTAR = GLOBSTAR;
var qmark2 = "[^/]", star2 = qmark2 + "*?", twoStarDot = "(?:(?!(?:\\/|^)(?:\\.{1,2})($|\\/)).)*?", twoStarNoDot = "(?:(?!(?:\\/|^)\\.).)*?", filter = (pattern, options = {}) => (p) => minimatch(p, pattern, options);
minimatch.filter = filter;
var ext = (a, b = {}) => Object.assign({}, a, b), defaults = (def) => {
  if (!def || typeof def != "object" || !Object.keys(def).length)
    return minimatch;
  let orig = minimatch;
  return Object.assign((p, pattern, options = {}) => orig(p, pattern, ext(def, options)), {
    Minimatch: class extends orig.Minimatch {
      constructor(pattern, options = {}) {
        super(pattern, ext(def, options));
      }
      static defaults(options) {
        return orig.defaults(ext(def, options)).Minimatch;
      }
    },
    AST: class extends orig.AST {
      /* c8 ignore start */
      constructor(type, parent, options = {}) {
        super(type, parent, ext(def, options));
      }
      /* c8 ignore stop */
      static fromGlob(pattern, options = {}) {
        return orig.AST.fromGlob(pattern, ext(def, options));
      }
    },
    unescape: (s, options = {}) => orig.unescape(s, ext(def, options)),
    escape: (s, options = {}) => orig.escape(s, ext(def, options)),
    filter: (pattern, options = {}) => orig.filter(pattern, ext(def, options)),
    defaults: (options) => orig.defaults(ext(def, options)),
    makeRe: (pattern, options = {}) => orig.makeRe(pattern, ext(def, options)),
    braceExpand: (pattern, options = {}) => orig.braceExpand(pattern, ext(def, options)),
    match: (list, pattern, options = {}) => orig.match(list, pattern, ext(def, options)),
    sep: orig.sep,
    GLOBSTAR
  });
};
minimatch.defaults = defaults;
var braceExpand = (pattern, options = {}) => (assertValidPattern(pattern), options.nobrace || !/\{(?:(?!\{).)*\}/.test(pattern) ? [pattern] : (0, import_brace_expansion.default)(pattern));
minimatch.braceExpand = braceExpand;
var makeRe = (pattern, options = {}) => new Minimatch(pattern, options).makeRe();
minimatch.makeRe = makeRe;
var match = (list, pattern, options = {}) => {
  let mm = new Minimatch(pattern, options);
  return list = list.filter((f) => mm.match(f)), mm.options.nonull && !list.length && list.push(pattern), list;
};
minimatch.match = match;
var globMagic = /[?*]|[+@!]\(.*?\)|\[|\]/, regExpEscape2 = (s) => s.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), Minimatch = class {
  options;
  set;
  pattern;
  windowsPathsNoEscape;
  nonegate;
  negate;
  comment;
  empty;
  preserveMultipleSlashes;
  partial;
  globSet;
  globParts;
  nocase;
  isWindows;
  platform;
  windowsNoMagicRoot;
  regexp;
  constructor(pattern, options = {}) {
    assertValidPattern(pattern), options = options || {}, this.options = options, this.pattern = pattern, this.platform = options.platform || defaultPlatform, this.isWindows = this.platform === "win32", this.windowsPathsNoEscape = !!options.windowsPathsNoEscape || options.allowWindowsEscape === !1, this.windowsPathsNoEscape && (this.pattern = this.pattern.replace(/\\/g, "/")), this.preserveMultipleSlashes = !!options.preserveMultipleSlashes, this.regexp = null, this.negate = !1, this.nonegate = !!options.nonegate, this.comment = !1, this.empty = !1, this.partial = !!options.partial, this.nocase = !!this.options.nocase, this.windowsNoMagicRoot = options.windowsNoMagicRoot !== void 0 ? options.windowsNoMagicRoot : !!(this.isWindows && this.nocase), this.globSet = [], this.globParts = [], this.set = [], this.make();
  }
  hasMagic() {
    if (this.options.magicalBraces && this.set.length > 1)
      return !0;
    for (let pattern of this.set)
      for (let part of pattern)
        if (typeof part != "string")
          return !0;
    return !1;
  }
  debug(..._) {
  }
  make() {
    let pattern = this.pattern, options = this.options;
    if (!options.nocomment && pattern.charAt(0) === "#") {
      this.comment = !0;
      return;
    }
    if (!pattern) {
      this.empty = !0;
      return;
    }
    this.parseNegate(), this.globSet = [...new Set(this.braceExpand())], options.debug && (this.debug = (...args) => console.error(...args)), this.debug(this.pattern, this.globSet);
    let rawGlobParts = this.globSet.map((s) => this.slashSplit(s));
    this.globParts = this.preprocess(rawGlobParts), this.debug(this.pattern, this.globParts);
    let set = this.globParts.map((s, _, __) => {
      if (this.isWindows && this.windowsNoMagicRoot) {
        let isUNC = s[0] === "" && s[1] === "" && (s[2] === "?" || !globMagic.test(s[2])) && !globMagic.test(s[3]), isDrive = /^[a-z]:/i.test(s[0]);
        if (isUNC)
          return [...s.slice(0, 4), ...s.slice(4).map((ss) => this.parse(ss))];
        if (isDrive)
          return [s[0], ...s.slice(1).map((ss) => this.parse(ss))];
      }
      return s.map((ss) => this.parse(ss));
    });
    if (this.debug(this.pattern, set), this.set = set.filter((s) => s.indexOf(!1) === -1), this.isWindows)
      for (let i = 0; i < this.set.length; i++) {
        let p = this.set[i];
        p[0] === "" && p[1] === "" && this.globParts[i][2] === "?" && typeof p[3] == "string" && /^[a-z]:$/i.test(p[3]) && (p[2] = "?");
      }
    this.debug(this.pattern, this.set);
  }
  // various transforms to equivalent pattern sets that are
  // faster to process in a filesystem walk.  The goal is to
  // eliminate what we can, and push all ** patterns as far
  // to the right as possible, even if it increases the number
  // of patterns that we have to process.
  preprocess(globParts) {
    if (this.options.noglobstar)
      for (let i = 0; i < globParts.length; i++)
        for (let j = 0; j < globParts[i].length; j++)
          globParts[i][j] === "**" && (globParts[i][j] = "*");
    let { optimizationLevel = 1 } = this.options;
    return optimizationLevel >= 2 ? (globParts = this.firstPhasePreProcess(globParts), globParts = this.secondPhasePreProcess(globParts)) : optimizationLevel >= 1 ? globParts = this.levelOneOptimize(globParts) : globParts = this.adjascentGlobstarOptimize(globParts), globParts;
  }
  // just get rid of adjascent ** portions
  adjascentGlobstarOptimize(globParts) {
    return globParts.map((parts) => {
      let gs = -1;
      for (; (gs = parts.indexOf("**", gs + 1)) !== -1; ) {
        let i = gs;
        for (; parts[i + 1] === "**"; )
          i++;
        i !== gs && parts.splice(gs, i - gs);
      }
      return parts;
    });
  }
  // get rid of adjascent ** and resolve .. portions
  levelOneOptimize(globParts) {
    return globParts.map((parts) => (parts = parts.reduce((set, part) => {
      let prev = set[set.length - 1];
      return part === "**" && prev === "**" ? set : part === ".." && prev && prev !== ".." && prev !== "." && prev !== "**" ? (set.pop(), set) : (set.push(part), set);
    }, []), parts.length === 0 ? [""] : parts));
  }
  levelTwoFileOptimize(parts) {
    Array.isArray(parts) || (parts = this.slashSplit(parts));
    let didSomething = !1;
    do {
      if (didSomething = !1, !this.preserveMultipleSlashes) {
        for (let i = 1; i < parts.length - 1; i++) {
          let p = parts[i];
          i === 1 && p === "" && parts[0] === "" || (p === "." || p === "") && (didSomething = !0, parts.splice(i, 1), i--);
        }
        parts[0] === "." && parts.length === 2 && (parts[1] === "." || parts[1] === "") && (didSomething = !0, parts.pop());
      }
      let dd = 0;
      for (; (dd = parts.indexOf("..", dd + 1)) !== -1; ) {
        let p = parts[dd - 1];
        p && p !== "." && p !== ".." && p !== "**" && (didSomething = !0, parts.splice(dd - 1, 2), dd -= 2);
      }
    } while (didSomething);
    return parts.length === 0 ? [""] : parts;
  }
  // First phase: single-pattern processing
  // <pre> is 1 or more portions
  // <rest> is 1 or more portions
  // <p> is any portion other than ., .., '', or **
  // <e> is . or ''
  //
  // **/.. is *brutal* for filesystem walking performance, because
  // it effectively resets the recursive walk each time it occurs,
  // and ** cannot be reduced out by a .. pattern part like a regexp
  // or most strings (other than .., ., and '') can be.
  //
  // <pre>/**/../<p>/<p>/<rest> -> {<pre>/../<p>/<p>/<rest>,<pre>/**/<p>/<p>/<rest>}
  // <pre>/<e>/<rest> -> <pre>/<rest>
  // <pre>/<p>/../<rest> -> <pre>/<rest>
  // **/**/<rest> -> **/<rest>
  //
  // **/*/<rest> -> */**/<rest> <== not valid because ** doesn't follow
  // this WOULD be allowed if ** did follow symlinks, or * didn't
  firstPhasePreProcess(globParts) {
    let didSomething = !1;
    do {
      didSomething = !1;
      for (let parts of globParts) {
        let gs = -1;
        for (; (gs = parts.indexOf("**", gs + 1)) !== -1; ) {
          let gss = gs;
          for (; parts[gss + 1] === "**"; )
            gss++;
          gss > gs && parts.splice(gs + 1, gss - gs);
          let next = parts[gs + 1], p = parts[gs + 2], p2 = parts[gs + 3];
          if (next !== ".." || !p || p === "." || p === ".." || !p2 || p2 === "." || p2 === "..")
            continue;
          didSomething = !0, parts.splice(gs, 1);
          let other = parts.slice(0);
          other[gs] = "**", globParts.push(other), gs--;
        }
        if (!this.preserveMultipleSlashes) {
          for (let i = 1; i < parts.length - 1; i++) {
            let p = parts[i];
            i === 1 && p === "" && parts[0] === "" || (p === "." || p === "") && (didSomething = !0, parts.splice(i, 1), i--);
          }
          parts[0] === "." && parts.length === 2 && (parts[1] === "." || parts[1] === "") && (didSomething = !0, parts.pop());
        }
        let dd = 0;
        for (; (dd = parts.indexOf("..", dd + 1)) !== -1; ) {
          let p = parts[dd - 1];
          if (p && p !== "." && p !== ".." && p !== "**") {
            didSomething = !0;
            let splin = dd === 1 && parts[dd + 1] === "**" ? ["."] : [];
            parts.splice(dd - 1, 2, ...splin), parts.length === 0 && parts.push(""), dd -= 2;
          }
        }
      }
    } while (didSomething);
    return globParts;
  }
  // second phase: multi-pattern dedupes
  // {<pre>/*/<rest>,<pre>/<p>/<rest>} -> <pre>/*/<rest>
  // {<pre>/<rest>,<pre>/<rest>} -> <pre>/<rest>
  // {<pre>/**/<rest>,<pre>/<rest>} -> <pre>/**/<rest>
  //
  // {<pre>/**/<rest>,<pre>/**/<p>/<rest>} -> <pre>/**/<rest>
  // ^-- not valid because ** doens't follow symlinks
  secondPhasePreProcess(globParts) {
    for (let i = 0; i < globParts.length - 1; i++)
      for (let j = i + 1; j < globParts.length; j++) {
        let matched = this.partsMatch(globParts[i], globParts[j], !this.preserveMultipleSlashes);
        if (matched) {
          globParts[i] = [], globParts[j] = matched;
          break;
        }
      }
    return globParts.filter((gs) => gs.length);
  }
  partsMatch(a, b, emptyGSMatch = !1) {
    let ai = 0, bi = 0, result = [], which = "";
    for (; ai < a.length && bi < b.length; )
      if (a[ai] === b[bi])
        result.push(which === "b" ? b[bi] : a[ai]), ai++, bi++;
      else if (emptyGSMatch && a[ai] === "**" && b[bi] === a[ai + 1])
        result.push(a[ai]), ai++;
      else if (emptyGSMatch && b[bi] === "**" && a[ai] === b[bi + 1])
        result.push(b[bi]), bi++;
      else if (a[ai] === "*" && b[bi] && (this.options.dot || !b[bi].startsWith(".")) && b[bi] !== "**") {
        if (which === "b")
          return !1;
        which = "a", result.push(a[ai]), ai++, bi++;
      } else if (b[bi] === "*" && a[ai] && (this.options.dot || !a[ai].startsWith(".")) && a[ai] !== "**") {
        if (which === "a")
          return !1;
        which = "b", result.push(b[bi]), ai++, bi++;
      } else
        return !1;
    return a.length === b.length && result;
  }
  parseNegate() {
    if (this.nonegate)
      return;
    let pattern = this.pattern, negate = !1, negateOffset = 0;
    for (let i = 0; i < pattern.length && pattern.charAt(i) === "!"; i++)
      negate = !negate, negateOffset++;
    negateOffset && (this.pattern = pattern.slice(negateOffset)), this.negate = negate;
  }
  // set partial to true to test if, for example,
  // "/a/b" matches the start of "/*/b/*/d"
  // Partial means, if you run out of file before you run
  // out of pattern, then that's fine, as long as all
  // the parts match.
  matchOne(file, pattern, partial = !1) {
    let options = this.options;
    if (this.isWindows) {
      let fileDrive = typeof file[0] == "string" && /^[a-z]:$/i.test(file[0]), fileUNC = !fileDrive && file[0] === "" && file[1] === "" && file[2] === "?" && /^[a-z]:$/i.test(file[3]), patternDrive = typeof pattern[0] == "string" && /^[a-z]:$/i.test(pattern[0]), patternUNC = !patternDrive && pattern[0] === "" && pattern[1] === "" && pattern[2] === "?" && typeof pattern[3] == "string" && /^[a-z]:$/i.test(pattern[3]), fdi = fileUNC ? 3 : fileDrive ? 0 : void 0, pdi = patternUNC ? 3 : patternDrive ? 0 : void 0;
      if (typeof fdi == "number" && typeof pdi == "number") {
        let [fd, pd] = [file[fdi], pattern[pdi]];
        fd.toLowerCase() === pd.toLowerCase() && (pattern[pdi] = fd, pdi > fdi ? pattern = pattern.slice(pdi) : fdi > pdi && (file = file.slice(fdi)));
      }
    }
    let { optimizationLevel = 1 } = this.options;
    optimizationLevel >= 2 && (file = this.levelTwoFileOptimize(file)), this.debug("matchOne", this, { file, pattern }), this.debug("matchOne", file.length, pattern.length);
    for (var fi = 0, pi = 0, fl = file.length, pl = pattern.length; fi < fl && pi < pl; fi++, pi++) {
      this.debug("matchOne loop");
      var p = pattern[pi], f = file[fi];
      if (this.debug(pattern, p, f), p === !1)
        return !1;
      if (p === GLOBSTAR) {
        this.debug("GLOBSTAR", [pattern, p, f]);
        var fr = fi, pr = pi + 1;
        if (pr === pl) {
          for (this.debug("** at the end"); fi < fl; fi++)
            if (file[fi] === "." || file[fi] === ".." || !options.dot && file[fi].charAt(0) === ".")
              return !1;
          return !0;
        }
        for (; fr < fl; ) {
          var swallowee = file[fr];
          if (this.debug(`
globstar while`, file, fr, pattern, pr, swallowee), this.matchOne(file.slice(fr), pattern.slice(pr), partial))
            return this.debug("globstar found match!", fr, fl, swallowee), !0;
          if (swallowee === "." || swallowee === ".." || !options.dot && swallowee.charAt(0) === ".") {
            this.debug("dot detected!", file, fr, pattern, pr);
            break;
          }
          this.debug("globstar swallow a segment, and continue"), fr++;
        }
        return !!(partial && (this.debug(`
>>> no match, partial?`, file, fr, pattern, pr), fr === fl));
      }
      let hit;
      if (typeof p == "string" ? (hit = f === p, this.debug("string match", p, f, hit)) : (hit = p.test(f), this.debug("pattern match", p, f, hit)), !hit)
        return !1;
    }
    if (fi === fl && pi === pl)
      return !0;
    if (fi === fl)
      return partial;
    if (pi === pl)
      return fi === fl - 1 && file[fi] === "";
    throw new Error("wtf?");
  }
  braceExpand() {
    return braceExpand(this.pattern, this.options);
  }
  parse(pattern) {
    assertValidPattern(pattern);
    let options = this.options;
    if (pattern === "**")
      return GLOBSTAR;
    if (pattern === "")
      return "";
    let m, fastTest = null;
    (m = pattern.match(starRE)) ? fastTest = options.dot ? starTestDot : starTest : (m = pattern.match(starDotExtRE)) ? fastTest = (options.nocase ? options.dot ? starDotExtTestNocaseDot : starDotExtTestNocase : options.dot ? starDotExtTestDot : starDotExtTest)(m[1]) : (m = pattern.match(qmarksRE)) ? fastTest = (options.nocase ? options.dot ? qmarksTestNocaseDot : qmarksTestNocase : options.dot ? qmarksTestDot : qmarksTest)(m) : (m = pattern.match(starDotStarRE)) ? fastTest = options.dot ? starDotStarTestDot : starDotStarTest : (m = pattern.match(dotStarRE)) && (fastTest = dotStarTest);
    let re = AST.fromGlob(pattern, this.options).toMMPattern();
    return fastTest && typeof re == "object" && Reflect.defineProperty(re, "test", { value: fastTest }), re;
  }
  makeRe() {
    if (this.regexp || this.regexp === !1)
      return this.regexp;
    let set = this.set;
    if (!set.length)
      return this.regexp = !1, this.regexp;
    let options = this.options, twoStar = options.noglobstar ? star2 : options.dot ? twoStarDot : twoStarNoDot, flags = new Set(options.nocase ? ["i"] : []), re = set.map((pattern) => {
      let pp = pattern.map((p) => {
        if (p instanceof RegExp)
          for (let f of p.flags.split(""))
            flags.add(f);
        return typeof p == "string" ? regExpEscape2(p) : p === GLOBSTAR ? GLOBSTAR : p._src;
      });
      return pp.forEach((p, i) => {
        let next = pp[i + 1], prev = pp[i - 1];
        p !== GLOBSTAR || prev === GLOBSTAR || (prev === void 0 ? next !== void 0 && next !== GLOBSTAR ? pp[i + 1] = "(?:\\/|" + twoStar + "\\/)?" + next : pp[i] = twoStar : next === void 0 ? pp[i - 1] = prev + "(?:\\/|" + twoStar + ")?" : next !== GLOBSTAR && (pp[i - 1] = prev + "(?:\\/|\\/" + twoStar + "\\/)" + next, pp[i + 1] = GLOBSTAR));
      }), pp.filter((p) => p !== GLOBSTAR).join("/");
    }).join("|"), [open, close] = set.length > 1 ? ["(?:", ")"] : ["", ""];
    re = "^" + open + re + close + "$", this.negate && (re = "^(?!" + re + ").+$");
    try {
      this.regexp = new RegExp(re, [...flags].join(""));
    } catch {
      this.regexp = !1;
    }
    return this.regexp;
  }
  slashSplit(p) {
    return this.preserveMultipleSlashes ? p.split("/") : this.isWindows && /^\/\/[^\/]+/.test(p) ? ["", ...p.split(/\/+/)] : p.split(/\/+/);
  }
  match(f, partial = this.partial) {
    if (this.debug("match", f, this.pattern), this.comment)
      return !1;
    if (this.empty)
      return f === "";
    if (f === "/" && partial)
      return !0;
    let options = this.options;
    this.isWindows && (f = f.split("\\").join("/"));
    let ff = this.slashSplit(f);
    this.debug(this.pattern, "split", ff);
    let set = this.set;
    this.debug(this.pattern, "set", set);
    let filename2 = ff[ff.length - 1];
    if (!filename2)
      for (let i = ff.length - 2; !filename2 && i >= 0; i--)
        filename2 = ff[i];
    for (let i = 0; i < set.length; i++) {
      let pattern = set[i], file = ff;
      if (options.matchBase && pattern.length === 1 && (file = [filename2]), this.matchOne(file, pattern, partial))
        return options.flipNegate ? !0 : !this.negate;
    }
    return options.flipNegate ? !1 : this.negate;
  }
  static defaults(def) {
    return minimatch.defaults(def).Minimatch;
  }
};
minimatch.AST = AST;
minimatch.Minimatch = Minimatch;
minimatch.escape = escape;
minimatch.unescape = unescape2;

// ../../node_modules/glob/dist/esm/glob.js
import { fileURLToPath as fileURLToPath3 } from "node:url";

// ../../node_modules/glob/node_modules/lru-cache/dist/esm/index.js
var perf = typeof performance == "object" && performance && typeof performance.now == "function" ? performance : Date, warned2 = /* @__PURE__ */ new Set(), PROCESS = typeof process == "object" && process ? process : {}, emitWarning = (msg, type, code, fn) => {
  typeof PROCESS.emitWarning == "function" ? PROCESS.emitWarning(msg, type, code, fn) : console.error(`[${code}] ${type}: ${msg}`);
}, AC = globalThis.AbortController, AS = globalThis.AbortSignal;
if (typeof AC > "u") {
  AS = class {
    onabort;
    _onabort = [];
    reason;
    aborted = !1;
    addEventListener(_, fn) {
      this._onabort.push(fn);
    }
  }, AC = class {
    constructor() {
      warnACPolyfill();
    }
    signal = new AS();
    abort(reason) {
      if (!this.signal.aborted) {
        this.signal.reason = reason, this.signal.aborted = !0;
        for (let fn of this.signal._onabort)
          fn(reason);
        this.signal.onabort?.(reason);
      }
    }
  };
  let printACPolyfillWarning = PROCESS.env?.LRU_CACHE_IGNORE_AC_WARNING !== "1", warnACPolyfill = () => {
    printACPolyfillWarning && (printACPolyfillWarning = !1, emitWarning("AbortController is not defined. If using lru-cache in node 14, load an AbortController polyfill from the `node-abort-controller` package. A minimal polyfill is provided for use by LRUCache.fetch(), but it should not be relied upon in other contexts (eg, passing it to other APIs that use AbortController/AbortSignal might have undesirable effects). You may disable this with LRU_CACHE_IGNORE_AC_WARNING=1 in the env.", "NO_ABORT_CONTROLLER", "ENOTSUP", warnACPolyfill));
  };
}
var shouldWarn = (code) => !warned2.has(code), TYPE = Symbol("type"), isPosInt = (n2) => n2 && n2 === Math.floor(n2) && n2 > 0 && isFinite(n2), getUintArray = (max) => isPosInt(max) ? max <= Math.pow(2, 8) ? Uint8Array : max <= Math.pow(2, 16) ? Uint16Array : max <= Math.pow(2, 32) ? Uint32Array : max <= Number.MAX_SAFE_INTEGER ? ZeroArray : null : null, ZeroArray = class extends Array {
  constructor(size) {
    super(size), this.fill(0);
  }
}, Stack = class _Stack {
  heap;
  length;
  // private constructor
  static #constructing = !1;
  static create(max) {
    let HeapCls = getUintArray(max);
    if (!HeapCls)
      return [];
    _Stack.#constructing = !0;
    let s = new _Stack(max, HeapCls);
    return _Stack.#constructing = !1, s;
  }
  constructor(max, HeapCls) {
    if (!_Stack.#constructing)
      throw new TypeError("instantiate Stack using Stack.create(n)");
    this.heap = new HeapCls(max), this.length = 0;
  }
  push(n2) {
    this.heap[this.length++] = n2;
  }
  pop() {
    return this.heap[--this.length];
  }
}, LRUCache = class _LRUCache {
  // options that cannot be changed without disaster
  #max;
  #maxSize;
  #dispose;
  #disposeAfter;
  #fetchMethod;
  #memoMethod;
  /**
   * {@link LRUCache.OptionsBase.ttl}
   */
  ttl;
  /**
   * {@link LRUCache.OptionsBase.ttlResolution}
   */
  ttlResolution;
  /**
   * {@link LRUCache.OptionsBase.ttlAutopurge}
   */
  ttlAutopurge;
  /**
   * {@link LRUCache.OptionsBase.updateAgeOnGet}
   */
  updateAgeOnGet;
  /**
   * {@link LRUCache.OptionsBase.updateAgeOnHas}
   */
  updateAgeOnHas;
  /**
   * {@link LRUCache.OptionsBase.allowStale}
   */
  allowStale;
  /**
   * {@link LRUCache.OptionsBase.noDisposeOnSet}
   */
  noDisposeOnSet;
  /**
   * {@link LRUCache.OptionsBase.noUpdateTTL}
   */
  noUpdateTTL;
  /**
   * {@link LRUCache.OptionsBase.maxEntrySize}
   */
  maxEntrySize;
  /**
   * {@link LRUCache.OptionsBase.sizeCalculation}
   */
  sizeCalculation;
  /**
   * {@link LRUCache.OptionsBase.noDeleteOnFetchRejection}
   */
  noDeleteOnFetchRejection;
  /**
   * {@link LRUCache.OptionsBase.noDeleteOnStaleGet}
   */
  noDeleteOnStaleGet;
  /**
   * {@link LRUCache.OptionsBase.allowStaleOnFetchAbort}
   */
  allowStaleOnFetchAbort;
  /**
   * {@link LRUCache.OptionsBase.allowStaleOnFetchRejection}
   */
  allowStaleOnFetchRejection;
  /**
   * {@link LRUCache.OptionsBase.ignoreFetchAbort}
   */
  ignoreFetchAbort;
  // computed properties
  #size;
  #calculatedSize;
  #keyMap;
  #keyList;
  #valList;
  #next;
  #prev;
  #head;
  #tail;
  #free;
  #disposed;
  #sizes;
  #starts;
  #ttls;
  #hasDispose;
  #hasFetchMethod;
  #hasDisposeAfter;
  /**
   * Do not call this method unless you need to inspect the
   * inner workings of the cache.  If anything returned by this
   * object is modified in any way, strange breakage may occur.
   *
   * These fields are private for a reason!
   *
   * @internal
   */
  static unsafeExposeInternals(c) {
    return {
      // properties
      starts: c.#starts,
      ttls: c.#ttls,
      sizes: c.#sizes,
      keyMap: c.#keyMap,
      keyList: c.#keyList,
      valList: c.#valList,
      next: c.#next,
      prev: c.#prev,
      get head() {
        return c.#head;
      },
      get tail() {
        return c.#tail;
      },
      free: c.#free,
      // methods
      isBackgroundFetch: (p) => c.#isBackgroundFetch(p),
      backgroundFetch: (k, index, options, context) => c.#backgroundFetch(k, index, options, context),
      moveToTail: (index) => c.#moveToTail(index),
      indexes: (options) => c.#indexes(options),
      rindexes: (options) => c.#rindexes(options),
      isStale: (index) => c.#isStale(index)
    };
  }
  // Protected read-only members
  /**
   * {@link LRUCache.OptionsBase.max} (read-only)
   */
  get max() {
    return this.#max;
  }
  /**
   * {@link LRUCache.OptionsBase.maxSize} (read-only)
   */
  get maxSize() {
    return this.#maxSize;
  }
  /**
   * The total computed size of items in the cache (read-only)
   */
  get calculatedSize() {
    return this.#calculatedSize;
  }
  /**
   * The number of items stored in the cache (read-only)
   */
  get size() {
    return this.#size;
  }
  /**
   * {@link LRUCache.OptionsBase.fetchMethod} (read-only)
   */
  get fetchMethod() {
    return this.#fetchMethod;
  }
  get memoMethod() {
    return this.#memoMethod;
  }
  /**
   * {@link LRUCache.OptionsBase.dispose} (read-only)
   */
  get dispose() {
    return this.#dispose;
  }
  /**
   * {@link LRUCache.OptionsBase.disposeAfter} (read-only)
   */
  get disposeAfter() {
    return this.#disposeAfter;
  }
  constructor(options) {
    let { max = 0, ttl, ttlResolution = 1, ttlAutopurge, updateAgeOnGet, updateAgeOnHas, allowStale, dispose, disposeAfter, noDisposeOnSet, noUpdateTTL, maxSize = 0, maxEntrySize = 0, sizeCalculation, fetchMethod, memoMethod, noDeleteOnFetchRejection, noDeleteOnStaleGet, allowStaleOnFetchRejection, allowStaleOnFetchAbort, ignoreFetchAbort } = options;
    if (max !== 0 && !isPosInt(max))
      throw new TypeError("max option must be a nonnegative integer");
    let UintArray = max ? getUintArray(max) : Array;
    if (!UintArray)
      throw new Error("invalid max value: " + max);
    if (this.#max = max, this.#maxSize = maxSize, this.maxEntrySize = maxEntrySize || this.#maxSize, this.sizeCalculation = sizeCalculation, this.sizeCalculation) {
      if (!this.#maxSize && !this.maxEntrySize)
        throw new TypeError("cannot set sizeCalculation without setting maxSize or maxEntrySize");
      if (typeof this.sizeCalculation != "function")
        throw new TypeError("sizeCalculation set to non-function");
    }
    if (memoMethod !== void 0 && typeof memoMethod != "function")
      throw new TypeError("memoMethod must be a function if defined");
    if (this.#memoMethod = memoMethod, fetchMethod !== void 0 && typeof fetchMethod != "function")
      throw new TypeError("fetchMethod must be a function if specified");
    if (this.#fetchMethod = fetchMethod, this.#hasFetchMethod = !!fetchMethod, this.#keyMap = /* @__PURE__ */ new Map(), this.#keyList = new Array(max).fill(void 0), this.#valList = new Array(max).fill(void 0), this.#next = new UintArray(max), this.#prev = new UintArray(max), this.#head = 0, this.#tail = 0, this.#free = Stack.create(max), this.#size = 0, this.#calculatedSize = 0, typeof dispose == "function" && (this.#dispose = dispose), typeof disposeAfter == "function" ? (this.#disposeAfter = disposeAfter, this.#disposed = []) : (this.#disposeAfter = void 0, this.#disposed = void 0), this.#hasDispose = !!this.#dispose, this.#hasDisposeAfter = !!this.#disposeAfter, this.noDisposeOnSet = !!noDisposeOnSet, this.noUpdateTTL = !!noUpdateTTL, this.noDeleteOnFetchRejection = !!noDeleteOnFetchRejection, this.allowStaleOnFetchRejection = !!allowStaleOnFetchRejection, this.allowStaleOnFetchAbort = !!allowStaleOnFetchAbort, this.ignoreFetchAbort = !!ignoreFetchAbort, this.maxEntrySize !== 0) {
      if (this.#maxSize !== 0 && !isPosInt(this.#maxSize))
        throw new TypeError("maxSize must be a positive integer if specified");
      if (!isPosInt(this.maxEntrySize))
        throw new TypeError("maxEntrySize must be a positive integer if specified");
      this.#initializeSizeTracking();
    }
    if (this.allowStale = !!allowStale, this.noDeleteOnStaleGet = !!noDeleteOnStaleGet, this.updateAgeOnGet = !!updateAgeOnGet, this.updateAgeOnHas = !!updateAgeOnHas, this.ttlResolution = isPosInt(ttlResolution) || ttlResolution === 0 ? ttlResolution : 1, this.ttlAutopurge = !!ttlAutopurge, this.ttl = ttl || 0, this.ttl) {
      if (!isPosInt(this.ttl))
        throw new TypeError("ttl must be a positive integer if specified");
      this.#initializeTTLTracking();
    }
    if (this.#max === 0 && this.ttl === 0 && this.#maxSize === 0)
      throw new TypeError("At least one of max, maxSize, or ttl is required");
    if (!this.ttlAutopurge && !this.#max && !this.#maxSize) {
      let code = "LRU_CACHE_UNBOUNDED";
      shouldWarn(code) && (warned2.add(code), emitWarning("TTL caching without ttlAutopurge, max, or maxSize can result in unbounded memory consumption.", "UnboundedCacheWarning", code, _LRUCache));
    }
  }
  /**
   * Return the number of ms left in the item's TTL. If item is not in cache,
   * returns `0`. Returns `Infinity` if item is in cache without a defined TTL.
   */
  getRemainingTTL(key) {
    return this.#keyMap.has(key) ? 1 / 0 : 0;
  }
  #initializeTTLTracking() {
    let ttls = new ZeroArray(this.#max), starts = new ZeroArray(this.#max);
    this.#ttls = ttls, this.#starts = starts, this.#setItemTTL = (index, ttl, start2 = perf.now()) => {
      if (starts[index] = ttl !== 0 ? start2 : 0, ttls[index] = ttl, ttl !== 0 && this.ttlAutopurge) {
        let t = setTimeout(() => {
          this.#isStale(index) && this.#delete(this.#keyList[index], "expire");
        }, ttl + 1);
        t.unref && t.unref();
      }
    }, this.#updateItemAge = (index) => {
      starts[index] = ttls[index] !== 0 ? perf.now() : 0;
    }, this.#statusTTL = (status, index) => {
      if (ttls[index]) {
        let ttl = ttls[index], start2 = starts[index];
        if (!ttl || !start2)
          return;
        status.ttl = ttl, status.start = start2, status.now = cachedNow || getNow();
        let age = status.now - start2;
        status.remainingTTL = ttl - age;
      }
    };
    let cachedNow = 0, getNow = () => {
      let n2 = perf.now();
      if (this.ttlResolution > 0) {
        cachedNow = n2;
        let t = setTimeout(() => cachedNow = 0, this.ttlResolution);
        t.unref && t.unref();
      }
      return n2;
    };
    this.getRemainingTTL = (key) => {
      let index = this.#keyMap.get(key);
      if (index === void 0)
        return 0;
      let ttl = ttls[index], start2 = starts[index];
      if (!ttl || !start2)
        return 1 / 0;
      let age = (cachedNow || getNow()) - start2;
      return ttl - age;
    }, this.#isStale = (index) => {
      let s = starts[index], t = ttls[index];
      return !!t && !!s && (cachedNow || getNow()) - s > t;
    };
  }
  // conditionally set private methods related to TTL
  #updateItemAge = () => {
  };
  #statusTTL = () => {
  };
  #setItemTTL = () => {
  };
  /* c8 ignore stop */
  #isStale = () => !1;
  #initializeSizeTracking() {
    let sizes = new ZeroArray(this.#max);
    this.#calculatedSize = 0, this.#sizes = sizes, this.#removeItemSize = (index) => {
      this.#calculatedSize -= sizes[index], sizes[index] = 0;
    }, this.#requireSize = (k, v, size, sizeCalculation) => {
      if (this.#isBackgroundFetch(v))
        return 0;
      if (!isPosInt(size))
        if (sizeCalculation) {
          if (typeof sizeCalculation != "function")
            throw new TypeError("sizeCalculation must be a function");
          if (size = sizeCalculation(v, k), !isPosInt(size))
            throw new TypeError("sizeCalculation return invalid (expect positive integer)");
        } else
          throw new TypeError("invalid size value (must be positive integer). When maxSize or maxEntrySize is used, sizeCalculation or size must be set.");
      return size;
    }, this.#addItemSize = (index, size, status) => {
      if (sizes[index] = size, this.#maxSize) {
        let maxSize = this.#maxSize - sizes[index];
        for (; this.#calculatedSize > maxSize; )
          this.#evict(!0);
      }
      this.#calculatedSize += sizes[index], status && (status.entrySize = size, status.totalCalculatedSize = this.#calculatedSize);
    };
  }
  #removeItemSize = (_i) => {
  };
  #addItemSize = (_i, _s, _st) => {
  };
  #requireSize = (_k, _v, size, sizeCalculation) => {
    if (size || sizeCalculation)
      throw new TypeError("cannot set size without setting maxSize or maxEntrySize on cache");
    return 0;
  };
  *#indexes({ allowStale = this.allowStale } = {}) {
    if (this.#size)
      for (let i = this.#tail; !(!this.#isValidIndex(i) || ((allowStale || !this.#isStale(i)) && (yield i), i === this.#head)); )
        i = this.#prev[i];
  }
  *#rindexes({ allowStale = this.allowStale } = {}) {
    if (this.#size)
      for (let i = this.#head; !(!this.#isValidIndex(i) || ((allowStale || !this.#isStale(i)) && (yield i), i === this.#tail)); )
        i = this.#next[i];
  }
  #isValidIndex(index) {
    return index !== void 0 && this.#keyMap.get(this.#keyList[index]) === index;
  }
  /**
   * Return a generator yielding `[key, value]` pairs,
   * in order from most recently used to least recently used.
   */
  *entries() {
    for (let i of this.#indexes())
      this.#valList[i] !== void 0 && this.#keyList[i] !== void 0 && !this.#isBackgroundFetch(this.#valList[i]) && (yield [this.#keyList[i], this.#valList[i]]);
  }
  /**
   * Inverse order version of {@link LRUCache.entries}
   *
   * Return a generator yielding `[key, value]` pairs,
   * in order from least recently used to most recently used.
   */
  *rentries() {
    for (let i of this.#rindexes())
      this.#valList[i] !== void 0 && this.#keyList[i] !== void 0 && !this.#isBackgroundFetch(this.#valList[i]) && (yield [this.#keyList[i], this.#valList[i]]);
  }
  /**
   * Return a generator yielding the keys in the cache,
   * in order from most recently used to least recently used.
   */
  *keys() {
    for (let i of this.#indexes()) {
      let k = this.#keyList[i];
      k !== void 0 && !this.#isBackgroundFetch(this.#valList[i]) && (yield k);
    }
  }
  /**
   * Inverse order version of {@link LRUCache.keys}
   *
   * Return a generator yielding the keys in the cache,
   * in order from least recently used to most recently used.
   */
  *rkeys() {
    for (let i of this.#rindexes()) {
      let k = this.#keyList[i];
      k !== void 0 && !this.#isBackgroundFetch(this.#valList[i]) && (yield k);
    }
  }
  /**
   * Return a generator yielding the values in the cache,
   * in order from most recently used to least recently used.
   */
  *values() {
    for (let i of this.#indexes())
      this.#valList[i] !== void 0 && !this.#isBackgroundFetch(this.#valList[i]) && (yield this.#valList[i]);
  }
  /**
   * Inverse order version of {@link LRUCache.values}
   *
   * Return a generator yielding the values in the cache,
   * in order from least recently used to most recently used.
   */
  *rvalues() {
    for (let i of this.#rindexes())
      this.#valList[i] !== void 0 && !this.#isBackgroundFetch(this.#valList[i]) && (yield this.#valList[i]);
  }
  /**
   * Iterating over the cache itself yields the same results as
   * {@link LRUCache.entries}
   */
  [Symbol.iterator]() {
    return this.entries();
  }
  /**
   * A String value that is used in the creation of the default string
   * description of an object. Called by the built-in method
   * `Object.prototype.toString`.
   */
  [Symbol.toStringTag] = "LRUCache";
  /**
   * Find a value for which the supplied fn method returns a truthy value,
   * similar to `Array.find()`. fn is called as `fn(value, key, cache)`.
   */
  find(fn, getOptions = {}) {
    for (let i of this.#indexes()) {
      let v = this.#valList[i], value = this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
      if (value !== void 0 && fn(value, this.#keyList[i], this))
        return this.get(this.#keyList[i], getOptions);
    }
  }
  /**
   * Call the supplied function on each item in the cache, in order from most
   * recently used to least recently used.
   *
   * `fn` is called as `fn(value, key, cache)`.
   *
   * If `thisp` is provided, function will be called in the `this`-context of
   * the provided object, or the cache if no `thisp` object is provided.
   *
   * Does not update age or recenty of use, or iterate over stale values.
   */
  forEach(fn, thisp = this) {
    for (let i of this.#indexes()) {
      let v = this.#valList[i], value = this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
      value !== void 0 && fn.call(thisp, value, this.#keyList[i], this);
    }
  }
  /**
   * The same as {@link LRUCache.forEach} but items are iterated over in
   * reverse order.  (ie, less recently used items are iterated over first.)
   */
  rforEach(fn, thisp = this) {
    for (let i of this.#rindexes()) {
      let v = this.#valList[i], value = this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
      value !== void 0 && fn.call(thisp, value, this.#keyList[i], this);
    }
  }
  /**
   * Delete any stale entries. Returns true if anything was removed,
   * false otherwise.
   */
  purgeStale() {
    let deleted = !1;
    for (let i of this.#rindexes({ allowStale: !0 }))
      this.#isStale(i) && (this.#delete(this.#keyList[i], "expire"), deleted = !0);
    return deleted;
  }
  /**
   * Get the extended info about a given entry, to get its value, size, and
   * TTL info simultaneously. Returns `undefined` if the key is not present.
   *
   * Unlike {@link LRUCache#dump}, which is designed to be portable and survive
   * serialization, the `start` value is always the current timestamp, and the
   * `ttl` is a calculated remaining time to live (negative if expired).
   *
   * Always returns stale values, if their info is found in the cache, so be
   * sure to check for expirations (ie, a negative {@link LRUCache.Entry#ttl})
   * if relevant.
   */
  info(key) {
    let i = this.#keyMap.get(key);
    if (i === void 0)
      return;
    let v = this.#valList[i], value = this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
    if (value === void 0)
      return;
    let entry = { value };
    if (this.#ttls && this.#starts) {
      let ttl = this.#ttls[i], start2 = this.#starts[i];
      if (ttl && start2) {
        let remain = ttl - (perf.now() - start2);
        entry.ttl = remain, entry.start = Date.now();
      }
    }
    return this.#sizes && (entry.size = this.#sizes[i]), entry;
  }
  /**
   * Return an array of [key, {@link LRUCache.Entry}] tuples which can be
   * passed to {@link LRLUCache#load}.
   *
   * The `start` fields are calculated relative to a portable `Date.now()`
   * timestamp, even if `performance.now()` is available.
   *
   * Stale entries are always included in the `dump`, even if
   * {@link LRUCache.OptionsBase.allowStale} is false.
   *
   * Note: this returns an actual array, not a generator, so it can be more
   * easily passed around.
   */
  dump() {
    let arr = [];
    for (let i of this.#indexes({ allowStale: !0 })) {
      let key = this.#keyList[i], v = this.#valList[i], value = this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
      if (value === void 0 || key === void 0)
        continue;
      let entry = { value };
      if (this.#ttls && this.#starts) {
        entry.ttl = this.#ttls[i];
        let age = perf.now() - this.#starts[i];
        entry.start = Math.floor(Date.now() - age);
      }
      this.#sizes && (entry.size = this.#sizes[i]), arr.unshift([key, entry]);
    }
    return arr;
  }
  /**
   * Reset the cache and load in the items in entries in the order listed.
   *
   * The shape of the resulting cache may be different if the same options are
   * not used in both caches.
   *
   * The `start` fields are assumed to be calculated relative to a portable
   * `Date.now()` timestamp, even if `performance.now()` is available.
   */
  load(arr) {
    this.clear();
    for (let [key, entry] of arr) {
      if (entry.start) {
        let age = Date.now() - entry.start;
        entry.start = perf.now() - age;
      }
      this.set(key, entry.value, entry);
    }
  }
  /**
   * Add a value to the cache.
   *
   * Note: if `undefined` is specified as a value, this is an alias for
   * {@link LRUCache#delete}
   *
   * Fields on the {@link LRUCache.SetOptions} options param will override
   * their corresponding values in the constructor options for the scope
   * of this single `set()` operation.
   *
   * If `start` is provided, then that will set the effective start
   * time for the TTL calculation. Note that this must be a previous
   * value of `performance.now()` if supported, or a previous value of
   * `Date.now()` if not.
   *
   * Options object may also include `size`, which will prevent
   * calling the `sizeCalculation` function and just use the specified
   * number if it is a positive integer, and `noDisposeOnSet` which
   * will prevent calling a `dispose` function in the case of
   * overwrites.
   *
   * If the `size` (or return value of `sizeCalculation`) for a given
   * entry is greater than `maxEntrySize`, then the item will not be
   * added to the cache.
   *
   * Will update the recency of the entry.
   *
   * If the value is `undefined`, then this is an alias for
   * `cache.delete(key)`. `undefined` is never stored in the cache.
   */
  set(k, v, setOptions = {}) {
    if (v === void 0)
      return this.delete(k), this;
    let { ttl = this.ttl, start: start2, noDisposeOnSet = this.noDisposeOnSet, sizeCalculation = this.sizeCalculation, status } = setOptions, { noUpdateTTL = this.noUpdateTTL } = setOptions, size = this.#requireSize(k, v, setOptions.size || 0, sizeCalculation);
    if (this.maxEntrySize && size > this.maxEntrySize)
      return status && (status.set = "miss", status.maxEntrySizeExceeded = !0), this.#delete(k, "set"), this;
    let index = this.#size === 0 ? void 0 : this.#keyMap.get(k);
    if (index === void 0)
      index = this.#size === 0 ? this.#tail : this.#free.length !== 0 ? this.#free.pop() : this.#size === this.#max ? this.#evict(!1) : this.#size, this.#keyList[index] = k, this.#valList[index] = v, this.#keyMap.set(k, index), this.#next[this.#tail] = index, this.#prev[index] = this.#tail, this.#tail = index, this.#size++, this.#addItemSize(index, size, status), status && (status.set = "add"), noUpdateTTL = !1;
    else {
      this.#moveToTail(index);
      let oldVal = this.#valList[index];
      if (v !== oldVal) {
        if (this.#hasFetchMethod && this.#isBackgroundFetch(oldVal)) {
          oldVal.__abortController.abort(new Error("replaced"));
          let { __staleWhileFetching: s } = oldVal;
          s !== void 0 && !noDisposeOnSet && (this.#hasDispose && this.#dispose?.(s, k, "set"), this.#hasDisposeAfter && this.#disposed?.push([s, k, "set"]));
        } else noDisposeOnSet || (this.#hasDispose && this.#dispose?.(oldVal, k, "set"), this.#hasDisposeAfter && this.#disposed?.push([oldVal, k, "set"]));
        if (this.#removeItemSize(index), this.#addItemSize(index, size, status), this.#valList[index] = v, status) {
          status.set = "replace";
          let oldValue = oldVal && this.#isBackgroundFetch(oldVal) ? oldVal.__staleWhileFetching : oldVal;
          oldValue !== void 0 && (status.oldValue = oldValue);
        }
      } else status && (status.set = "update");
    }
    if (ttl !== 0 && !this.#ttls && this.#initializeTTLTracking(), this.#ttls && (noUpdateTTL || this.#setItemTTL(index, ttl, start2), status && this.#statusTTL(status, index)), !noDisposeOnSet && this.#hasDisposeAfter && this.#disposed) {
      let dt = this.#disposed, task;
      for (; task = dt?.shift(); )
        this.#disposeAfter?.(...task);
    }
    return this;
  }
  /**
   * Evict the least recently used item, returning its value or
   * `undefined` if cache is empty.
   */
  pop() {
    try {
      for (; this.#size; ) {
        let val = this.#valList[this.#head];
        if (this.#evict(!0), this.#isBackgroundFetch(val)) {
          if (val.__staleWhileFetching)
            return val.__staleWhileFetching;
        } else if (val !== void 0)
          return val;
      }
    } finally {
      if (this.#hasDisposeAfter && this.#disposed) {
        let dt = this.#disposed, task;
        for (; task = dt?.shift(); )
          this.#disposeAfter?.(...task);
      }
    }
  }
  #evict(free) {
    let head = this.#head, k = this.#keyList[head], v = this.#valList[head];
    return this.#hasFetchMethod && this.#isBackgroundFetch(v) ? v.__abortController.abort(new Error("evicted")) : (this.#hasDispose || this.#hasDisposeAfter) && (this.#hasDispose && this.#dispose?.(v, k, "evict"), this.#hasDisposeAfter && this.#disposed?.push([v, k, "evict"])), this.#removeItemSize(head), free && (this.#keyList[head] = void 0, this.#valList[head] = void 0, this.#free.push(head)), this.#size === 1 ? (this.#head = this.#tail = 0, this.#free.length = 0) : this.#head = this.#next[head], this.#keyMap.delete(k), this.#size--, head;
  }
  /**
   * Check if a key is in the cache, without updating the recency of use.
   * Will return false if the item is stale, even though it is technically
   * in the cache.
   *
   * Check if a key is in the cache, without updating the recency of
   * use. Age is updated if {@link LRUCache.OptionsBase.updateAgeOnHas} is set
   * to `true` in either the options or the constructor.
   *
   * Will return `false` if the item is stale, even though it is technically in
   * the cache. The difference can be determined (if it matters) by using a
   * `status` argument, and inspecting the `has` field.
   *
   * Will not update item age unless
   * {@link LRUCache.OptionsBase.updateAgeOnHas} is set.
   */
  has(k, hasOptions = {}) {
    let { updateAgeOnHas = this.updateAgeOnHas, status } = hasOptions, index = this.#keyMap.get(k);
    if (index !== void 0) {
      let v = this.#valList[index];
      if (this.#isBackgroundFetch(v) && v.__staleWhileFetching === void 0)
        return !1;
      if (this.#isStale(index))
        status && (status.has = "stale", this.#statusTTL(status, index));
      else return updateAgeOnHas && this.#updateItemAge(index), status && (status.has = "hit", this.#statusTTL(status, index)), !0;
    } else status && (status.has = "miss");
    return !1;
  }
  /**
   * Like {@link LRUCache#get} but doesn't update recency or delete stale
   * items.
   *
   * Returns `undefined` if the item is stale, unless
   * {@link LRUCache.OptionsBase.allowStale} is set.
   */
  peek(k, peekOptions = {}) {
    let { allowStale = this.allowStale } = peekOptions, index = this.#keyMap.get(k);
    if (index === void 0 || !allowStale && this.#isStale(index))
      return;
    let v = this.#valList[index];
    return this.#isBackgroundFetch(v) ? v.__staleWhileFetching : v;
  }
  #backgroundFetch(k, index, options, context) {
    let v = index === void 0 ? void 0 : this.#valList[index];
    if (this.#isBackgroundFetch(v))
      return v;
    let ac = new AC(), { signal } = options;
    signal?.addEventListener("abort", () => ac.abort(signal.reason), {
      signal: ac.signal
    });
    let fetchOpts = {
      signal: ac.signal,
      options,
      context
    }, cb = (v2, updateCache = !1) => {
      let { aborted } = ac.signal, ignoreAbort = options.ignoreFetchAbort && v2 !== void 0;
      if (options.status && (aborted && !updateCache ? (options.status.fetchAborted = !0, options.status.fetchError = ac.signal.reason, ignoreAbort && (options.status.fetchAbortIgnored = !0)) : options.status.fetchResolved = !0), aborted && !ignoreAbort && !updateCache)
        return fetchFail(ac.signal.reason);
      let bf2 = p;
      return this.#valList[index] === p && (v2 === void 0 ? bf2.__staleWhileFetching ? this.#valList[index] = bf2.__staleWhileFetching : this.#delete(k, "fetch") : (options.status && (options.status.fetchUpdated = !0), this.set(k, v2, fetchOpts.options))), v2;
    }, eb = (er) => (options.status && (options.status.fetchRejected = !0, options.status.fetchError = er), fetchFail(er)), fetchFail = (er) => {
      let { aborted } = ac.signal, allowStaleAborted = aborted && options.allowStaleOnFetchAbort, allowStale = allowStaleAborted || options.allowStaleOnFetchRejection, noDelete = allowStale || options.noDeleteOnFetchRejection, bf2 = p;
      if (this.#valList[index] === p && (!noDelete || bf2.__staleWhileFetching === void 0 ? this.#delete(k, "fetch") : allowStaleAborted || (this.#valList[index] = bf2.__staleWhileFetching)), allowStale)
        return options.status && bf2.__staleWhileFetching !== void 0 && (options.status.returnedStale = !0), bf2.__staleWhileFetching;
      if (bf2.__returned === bf2)
        throw er;
    }, pcall = (res, rej) => {
      let fmp = this.#fetchMethod?.(k, v, fetchOpts);
      fmp && fmp instanceof Promise && fmp.then((v2) => res(v2 === void 0 ? void 0 : v2), rej), ac.signal.addEventListener("abort", () => {
        (!options.ignoreFetchAbort || options.allowStaleOnFetchAbort) && (res(void 0), options.allowStaleOnFetchAbort && (res = (v2) => cb(v2, !0)));
      });
    };
    options.status && (options.status.fetchDispatched = !0);
    let p = new Promise(pcall).then(cb, eb), bf = Object.assign(p, {
      __abortController: ac,
      __staleWhileFetching: v,
      __returned: void 0
    });
    return index === void 0 ? (this.set(k, bf, { ...fetchOpts.options, status: void 0 }), index = this.#keyMap.get(k)) : this.#valList[index] = bf, bf;
  }
  #isBackgroundFetch(p) {
    if (!this.#hasFetchMethod)
      return !1;
    let b = p;
    return !!b && b instanceof Promise && b.hasOwnProperty("__staleWhileFetching") && b.__abortController instanceof AC;
  }
  async fetch(k, fetchOptions = {}) {
    let {
      // get options
      allowStale = this.allowStale,
      updateAgeOnGet = this.updateAgeOnGet,
      noDeleteOnStaleGet = this.noDeleteOnStaleGet,
      // set options
      ttl = this.ttl,
      noDisposeOnSet = this.noDisposeOnSet,
      size = 0,
      sizeCalculation = this.sizeCalculation,
      noUpdateTTL = this.noUpdateTTL,
      // fetch exclusive options
      noDeleteOnFetchRejection = this.noDeleteOnFetchRejection,
      allowStaleOnFetchRejection = this.allowStaleOnFetchRejection,
      ignoreFetchAbort = this.ignoreFetchAbort,
      allowStaleOnFetchAbort = this.allowStaleOnFetchAbort,
      context,
      forceRefresh = !1,
      status,
      signal
    } = fetchOptions;
    if (!this.#hasFetchMethod)
      return status && (status.fetch = "get"), this.get(k, {
        allowStale,
        updateAgeOnGet,
        noDeleteOnStaleGet,
        status
      });
    let options = {
      allowStale,
      updateAgeOnGet,
      noDeleteOnStaleGet,
      ttl,
      noDisposeOnSet,
      size,
      sizeCalculation,
      noUpdateTTL,
      noDeleteOnFetchRejection,
      allowStaleOnFetchRejection,
      allowStaleOnFetchAbort,
      ignoreFetchAbort,
      status,
      signal
    }, index = this.#keyMap.get(k);
    if (index === void 0) {
      status && (status.fetch = "miss");
      let p = this.#backgroundFetch(k, index, options, context);
      return p.__returned = p;
    } else {
      let v = this.#valList[index];
      if (this.#isBackgroundFetch(v)) {
        let stale = allowStale && v.__staleWhileFetching !== void 0;
        return status && (status.fetch = "inflight", stale && (status.returnedStale = !0)), stale ? v.__staleWhileFetching : v.__returned = v;
      }
      let isStale = this.#isStale(index);
      if (!forceRefresh && !isStale)
        return status && (status.fetch = "hit"), this.#moveToTail(index), updateAgeOnGet && this.#updateItemAge(index), status && this.#statusTTL(status, index), v;
      let p = this.#backgroundFetch(k, index, options, context), staleVal = p.__staleWhileFetching !== void 0 && allowStale;
      return status && (status.fetch = isStale ? "stale" : "refresh", staleVal && isStale && (status.returnedStale = !0)), staleVal ? p.__staleWhileFetching : p.__returned = p;
    }
  }
  async forceFetch(k, fetchOptions = {}) {
    let v = await this.fetch(k, fetchOptions);
    if (v === void 0)
      throw new Error("fetch() returned undefined");
    return v;
  }
  memo(k, memoOptions = {}) {
    let memoMethod = this.#memoMethod;
    if (!memoMethod)
      throw new Error("no memoMethod provided to constructor");
    let { context, forceRefresh, ...options } = memoOptions, v = this.get(k, options);
    if (!forceRefresh && v !== void 0)
      return v;
    let vv = memoMethod(k, v, {
      options,
      context
    });
    return this.set(k, vv, options), vv;
  }
  /**
   * Return a value from the cache. Will update the recency of the cache
   * entry found.
   *
   * If the key is not found, get() will return `undefined`.
   */
  get(k, getOptions = {}) {
    let { allowStale = this.allowStale, updateAgeOnGet = this.updateAgeOnGet, noDeleteOnStaleGet = this.noDeleteOnStaleGet, status } = getOptions, index = this.#keyMap.get(k);
    if (index !== void 0) {
      let value = this.#valList[index], fetching = this.#isBackgroundFetch(value);
      return status && this.#statusTTL(status, index), this.#isStale(index) ? (status && (status.get = "stale"), fetching ? (status && allowStale && value.__staleWhileFetching !== void 0 && (status.returnedStale = !0), allowStale ? value.__staleWhileFetching : void 0) : (noDeleteOnStaleGet || this.#delete(k, "expire"), status && allowStale && (status.returnedStale = !0), allowStale ? value : void 0)) : (status && (status.get = "hit"), fetching ? value.__staleWhileFetching : (this.#moveToTail(index), updateAgeOnGet && this.#updateItemAge(index), value));
    } else status && (status.get = "miss");
  }
  #connect(p, n2) {
    this.#prev[n2] = p, this.#next[p] = n2;
  }
  #moveToTail(index) {
    index !== this.#tail && (index === this.#head ? this.#head = this.#next[index] : this.#connect(this.#prev[index], this.#next[index]), this.#connect(this.#tail, index), this.#tail = index);
  }
  /**
   * Deletes a key out of the cache.
   *
   * Returns true if the key was deleted, false otherwise.
   */
  delete(k) {
    return this.#delete(k, "delete");
  }
  #delete(k, reason) {
    let deleted = !1;
    if (this.#size !== 0) {
      let index = this.#keyMap.get(k);
      if (index !== void 0)
        if (deleted = !0, this.#size === 1)
          this.#clear(reason);
        else {
          this.#removeItemSize(index);
          let v = this.#valList[index];
          if (this.#isBackgroundFetch(v) ? v.__abortController.abort(new Error("deleted")) : (this.#hasDispose || this.#hasDisposeAfter) && (this.#hasDispose && this.#dispose?.(v, k, reason), this.#hasDisposeAfter && this.#disposed?.push([v, k, reason])), this.#keyMap.delete(k), this.#keyList[index] = void 0, this.#valList[index] = void 0, index === this.#tail)
            this.#tail = this.#prev[index];
          else if (index === this.#head)
            this.#head = this.#next[index];
          else {
            let pi = this.#prev[index];
            this.#next[pi] = this.#next[index];
            let ni = this.#next[index];
            this.#prev[ni] = this.#prev[index];
          }
          this.#size--, this.#free.push(index);
        }
    }
    if (this.#hasDisposeAfter && this.#disposed?.length) {
      let dt = this.#disposed, task;
      for (; task = dt?.shift(); )
        this.#disposeAfter?.(...task);
    }
    return deleted;
  }
  /**
   * Clear the cache entirely, throwing away all values.
   */
  clear() {
    return this.#clear("delete");
  }
  #clear(reason) {
    for (let index of this.#rindexes({ allowStale: !0 })) {
      let v = this.#valList[index];
      if (this.#isBackgroundFetch(v))
        v.__abortController.abort(new Error("deleted"));
      else {
        let k = this.#keyList[index];
        this.#hasDispose && this.#dispose?.(v, k, reason), this.#hasDisposeAfter && this.#disposed?.push([v, k, reason]);
      }
    }
    if (this.#keyMap.clear(), this.#valList.fill(void 0), this.#keyList.fill(void 0), this.#ttls && this.#starts && (this.#ttls.fill(0), this.#starts.fill(0)), this.#sizes && this.#sizes.fill(0), this.#head = 0, this.#tail = 0, this.#free.length = 0, this.#calculatedSize = 0, this.#size = 0, this.#hasDisposeAfter && this.#disposed) {
      let dt = this.#disposed, task;
      for (; task = dt?.shift(); )
        this.#disposeAfter?.(...task);
    }
  }
};

// ../../node_modules/glob/node_modules/path-scurry/dist/esm/index.js
import { posix, win32 } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
import { lstatSync, readdir as readdirCB, readdirSync, readlinkSync, realpathSync as rps } from "fs";
import * as actualFS from "node:fs";
import { lstat, readdir, readlink, realpath } from "node:fs/promises";

// ../../node_modules/minipass/dist/esm/index.js
import { EventEmitter } from "node:events";
import Stream from "node:stream";
import { StringDecoder } from "node:string_decoder";
var proc = typeof process == "object" && process ? process : {
  stdout: null,
  stderr: null
}, isStream = (s) => !!s && typeof s == "object" && (s instanceof Minipass || s instanceof Stream || isReadable(s) || isWritable(s)), isReadable = (s) => !!s && typeof s == "object" && s instanceof EventEmitter && typeof s.pipe == "function" && // node core Writable streams have a pipe() method, but it throws
s.pipe !== Stream.Writable.prototype.pipe, isWritable = (s) => !!s && typeof s == "object" && s instanceof EventEmitter && typeof s.write == "function" && typeof s.end == "function", EOF = Symbol("EOF"), MAYBE_EMIT_END = Symbol("maybeEmitEnd"), EMITTED_END = Symbol("emittedEnd"), EMITTING_END = Symbol("emittingEnd"), EMITTED_ERROR = Symbol("emittedError"), CLOSED = Symbol("closed"), READ = Symbol("read"), FLUSH = Symbol("flush"), FLUSHCHUNK = Symbol("flushChunk"), ENCODING = Symbol("encoding"), DECODER = Symbol("decoder"), FLOWING = Symbol("flowing"), PAUSED = Symbol("paused"), RESUME = Symbol("resume"), BUFFER = Symbol("buffer"), PIPES = Symbol("pipes"), BUFFERLENGTH = Symbol("bufferLength"), BUFFERPUSH = Symbol("bufferPush"), BUFFERSHIFT = Symbol("bufferShift"), OBJECTMODE = Symbol("objectMode"), DESTROYED = Symbol("destroyed"), ERROR = Symbol("error"), EMITDATA = Symbol("emitData"), EMITEND = Symbol("emitEnd"), EMITEND2 = Symbol("emitEnd2"), ASYNC = Symbol("async"), ABORT = Symbol("abort"), ABORTED = Symbol("aborted"), SIGNAL = Symbol("signal"), DATALISTENERS = Symbol("dataListeners"), DISCARDED = Symbol("discarded"), defer = (fn) => Promise.resolve().then(fn), nodefer = (fn) => fn(), isEndish = (ev) => ev === "end" || ev === "finish" || ev === "prefinish", isArrayBufferLike = (b) => b instanceof ArrayBuffer || !!b && typeof b == "object" && b.constructor && b.constructor.name === "ArrayBuffer" && b.byteLength >= 0, isArrayBufferView = (b) => !Buffer.isBuffer(b) && ArrayBuffer.isView(b), Pipe = class {
  src;
  dest;
  opts;
  ondrain;
  constructor(src, dest, opts) {
    this.src = src, this.dest = dest, this.opts = opts, this.ondrain = () => src[RESUME](), this.dest.on("drain", this.ondrain);
  }
  unpipe() {
    this.dest.removeListener("drain", this.ondrain);
  }
  // only here for the prototype
  /* c8 ignore start */
  proxyErrors(_er) {
  }
  /* c8 ignore stop */
  end() {
    this.unpipe(), this.opts.end && this.dest.end();
  }
}, PipeProxyErrors = class extends Pipe {
  unpipe() {
    this.src.removeListener("error", this.proxyErrors), super.unpipe();
  }
  constructor(src, dest, opts) {
    super(src, dest, opts), this.proxyErrors = (er) => dest.emit("error", er), src.on("error", this.proxyErrors);
  }
}, isObjectModeOptions = (o) => !!o.objectMode, isEncodingOptions = (o) => !o.objectMode && !!o.encoding && o.encoding !== "buffer", Minipass = class extends EventEmitter {
  [FLOWING] = !1;
  [PAUSED] = !1;
  [PIPES] = [];
  [BUFFER] = [];
  [OBJECTMODE];
  [ENCODING];
  [ASYNC];
  [DECODER];
  [EOF] = !1;
  [EMITTED_END] = !1;
  [EMITTING_END] = !1;
  [CLOSED] = !1;
  [EMITTED_ERROR] = null;
  [BUFFERLENGTH] = 0;
  [DESTROYED] = !1;
  [SIGNAL];
  [ABORTED] = !1;
  [DATALISTENERS] = 0;
  [DISCARDED] = !1;
  /**
   * true if the stream can be written
   */
  writable = !0;
  /**
   * true if the stream can be read
   */
  readable = !0;
  /**
   * If `RType` is Buffer, then options do not need to be provided.
   * Otherwise, an options object must be provided to specify either
   * {@link Minipass.SharedOptions.objectMode} or
   * {@link Minipass.SharedOptions.encoding}, as appropriate.
   */
  constructor(...args) {
    let options = args[0] || {};
    if (super(), options.objectMode && typeof options.encoding == "string")
      throw new TypeError("Encoding and objectMode may not be used together");
    isObjectModeOptions(options) ? (this[OBJECTMODE] = !0, this[ENCODING] = null) : isEncodingOptions(options) ? (this[ENCODING] = options.encoding, this[OBJECTMODE] = !1) : (this[OBJECTMODE] = !1, this[ENCODING] = null), this[ASYNC] = !!options.async, this[DECODER] = this[ENCODING] ? new StringDecoder(this[ENCODING]) : null, options && options.debugExposeBuffer === !0 && Object.defineProperty(this, "buffer", { get: () => this[BUFFER] }), options && options.debugExposePipes === !0 && Object.defineProperty(this, "pipes", { get: () => this[PIPES] });
    let { signal } = options;
    signal && (this[SIGNAL] = signal, signal.aborted ? this[ABORT]() : signal.addEventListener("abort", () => this[ABORT]()));
  }
  /**
   * The amount of data stored in the buffer waiting to be read.
   *
   * For Buffer strings, this will be the total byte length.
   * For string encoding streams, this will be the string character length,
   * according to JavaScript's `string.length` logic.
   * For objectMode streams, this is a count of the items waiting to be
   * emitted.
   */
  get bufferLength() {
    return this[BUFFERLENGTH];
  }
  /**
   * The `BufferEncoding` currently in use, or `null`
   */
  get encoding() {
    return this[ENCODING];
  }
  /**
   * @deprecated - This is a read only property
   */
  set encoding(_enc) {
    throw new Error("Encoding must be set at instantiation time");
  }
  /**
   * @deprecated - Encoding may only be set at instantiation time
   */
  setEncoding(_enc) {
    throw new Error("Encoding must be set at instantiation time");
  }
  /**
   * True if this is an objectMode stream
   */
  get objectMode() {
    return this[OBJECTMODE];
  }
  /**
   * @deprecated - This is a read-only property
   */
  set objectMode(_om) {
    throw new Error("objectMode must be set at instantiation time");
  }
  /**
   * true if this is an async stream
   */
  get async() {
    return this[ASYNC];
  }
  /**
   * Set to true to make this stream async.
   *
   * Once set, it cannot be unset, as this would potentially cause incorrect
   * behavior.  Ie, a sync stream can be made async, but an async stream
   * cannot be safely made sync.
   */
  set async(a) {
    this[ASYNC] = this[ASYNC] || !!a;
  }
  // drop everything and get out of the flow completely
  [ABORT]() {
    this[ABORTED] = !0, this.emit("abort", this[SIGNAL]?.reason), this.destroy(this[SIGNAL]?.reason);
  }
  /**
   * True if the stream has been aborted.
   */
  get aborted() {
    return this[ABORTED];
  }
  /**
   * No-op setter. Stream aborted status is set via the AbortSignal provided
   * in the constructor options.
   */
  set aborted(_) {
  }
  write(chunk, encoding, cb) {
    if (this[ABORTED])
      return !1;
    if (this[EOF])
      throw new Error("write after end");
    if (this[DESTROYED])
      return this.emit("error", Object.assign(new Error("Cannot call write after a stream was destroyed"), { code: "ERR_STREAM_DESTROYED" })), !0;
    typeof encoding == "function" && (cb = encoding, encoding = "utf8"), encoding || (encoding = "utf8");
    let fn = this[ASYNC] ? defer : nodefer;
    if (!this[OBJECTMODE] && !Buffer.isBuffer(chunk)) {
      if (isArrayBufferView(chunk))
        chunk = Buffer.from(chunk.buffer, chunk.byteOffset, chunk.byteLength);
      else if (isArrayBufferLike(chunk))
        chunk = Buffer.from(chunk);
      else if (typeof chunk != "string")
        throw new Error("Non-contiguous data written to non-objectMode stream");
    }
    return this[OBJECTMODE] ? (this[FLOWING] && this[BUFFERLENGTH] !== 0 && this[FLUSH](!0), this[FLOWING] ? this.emit("data", chunk) : this[BUFFERPUSH](chunk), this[BUFFERLENGTH] !== 0 && this.emit("readable"), cb && fn(cb), this[FLOWING]) : chunk.length ? (typeof chunk == "string" && // unless it is a string already ready for us to use
    !(encoding === this[ENCODING] && !this[DECODER]?.lastNeed) && (chunk = Buffer.from(chunk, encoding)), Buffer.isBuffer(chunk) && this[ENCODING] && (chunk = this[DECODER].write(chunk)), this[FLOWING] && this[BUFFERLENGTH] !== 0 && this[FLUSH](!0), this[FLOWING] ? this.emit("data", chunk) : this[BUFFERPUSH](chunk), this[BUFFERLENGTH] !== 0 && this.emit("readable"), cb && fn(cb), this[FLOWING]) : (this[BUFFERLENGTH] !== 0 && this.emit("readable"), cb && fn(cb), this[FLOWING]);
  }
  /**
   * Low-level explicit read method.
   *
   * In objectMode, the argument is ignored, and one item is returned if
   * available.
   *
   * `n` is the number of bytes (or in the case of encoding streams,
   * characters) to consume. If `n` is not provided, then the entire buffer
   * is returned, or `null` is returned if no data is available.
   *
   * If `n` is greater that the amount of data in the internal buffer,
   * then `null` is returned.
   */
  read(n2) {
    if (this[DESTROYED])
      return null;
    if (this[DISCARDED] = !1, this[BUFFERLENGTH] === 0 || n2 === 0 || n2 && n2 > this[BUFFERLENGTH])
      return this[MAYBE_EMIT_END](), null;
    this[OBJECTMODE] && (n2 = null), this[BUFFER].length > 1 && !this[OBJECTMODE] && (this[BUFFER] = [
      this[ENCODING] ? this[BUFFER].join("") : Buffer.concat(this[BUFFER], this[BUFFERLENGTH])
    ]);
    let ret = this[READ](n2 || null, this[BUFFER][0]);
    return this[MAYBE_EMIT_END](), ret;
  }
  [READ](n2, chunk) {
    if (this[OBJECTMODE])
      this[BUFFERSHIFT]();
    else {
      let c = chunk;
      n2 === c.length || n2 === null ? this[BUFFERSHIFT]() : typeof c == "string" ? (this[BUFFER][0] = c.slice(n2), chunk = c.slice(0, n2), this[BUFFERLENGTH] -= n2) : (this[BUFFER][0] = c.subarray(n2), chunk = c.subarray(0, n2), this[BUFFERLENGTH] -= n2);
    }
    return this.emit("data", chunk), !this[BUFFER].length && !this[EOF] && this.emit("drain"), chunk;
  }
  end(chunk, encoding, cb) {
    return typeof chunk == "function" && (cb = chunk, chunk = void 0), typeof encoding == "function" && (cb = encoding, encoding = "utf8"), chunk !== void 0 && this.write(chunk, encoding), cb && this.once("end", cb), this[EOF] = !0, this.writable = !1, (this[FLOWING] || !this[PAUSED]) && this[MAYBE_EMIT_END](), this;
  }
  // don't let the internal resume be overwritten
  [RESUME]() {
    this[DESTROYED] || (!this[DATALISTENERS] && !this[PIPES].length && (this[DISCARDED] = !0), this[PAUSED] = !1, this[FLOWING] = !0, this.emit("resume"), this[BUFFER].length ? this[FLUSH]() : this[EOF] ? this[MAYBE_EMIT_END]() : this.emit("drain"));
  }
  /**
   * Resume the stream if it is currently in a paused state
   *
   * If called when there are no pipe destinations or `data` event listeners,
   * this will place the stream in a "discarded" state, where all data will
   * be thrown away. The discarded state is removed if a pipe destination or
   * data handler is added, if pause() is called, or if any synchronous or
   * asynchronous iteration is started.
   */
  resume() {
    return this[RESUME]();
  }
  /**
   * Pause the stream
   */
  pause() {
    this[FLOWING] = !1, this[PAUSED] = !0, this[DISCARDED] = !1;
  }
  /**
   * true if the stream has been forcibly destroyed
   */
  get destroyed() {
    return this[DESTROYED];
  }
  /**
   * true if the stream is currently in a flowing state, meaning that
   * any writes will be immediately emitted.
   */
  get flowing() {
    return this[FLOWING];
  }
  /**
   * true if the stream is currently in a paused state
   */
  get paused() {
    return this[PAUSED];
  }
  [BUFFERPUSH](chunk) {
    this[OBJECTMODE] ? this[BUFFERLENGTH] += 1 : this[BUFFERLENGTH] += chunk.length, this[BUFFER].push(chunk);
  }
  [BUFFERSHIFT]() {
    return this[OBJECTMODE] ? this[BUFFERLENGTH] -= 1 : this[BUFFERLENGTH] -= this[BUFFER][0].length, this[BUFFER].shift();
  }
  [FLUSH](noDrain = !1) {
    do
      ;
    while (this[FLUSHCHUNK](this[BUFFERSHIFT]()) && this[BUFFER].length);
    !noDrain && !this[BUFFER].length && !this[EOF] && this.emit("drain");
  }
  [FLUSHCHUNK](chunk) {
    return this.emit("data", chunk), this[FLOWING];
  }
  /**
   * Pipe all data emitted by this stream into the destination provided.
   *
   * Triggers the flow of data.
   */
  pipe(dest, opts) {
    if (this[DESTROYED])
      return dest;
    this[DISCARDED] = !1;
    let ended = this[EMITTED_END];
    return opts = opts || {}, dest === proc.stdout || dest === proc.stderr ? opts.end = !1 : opts.end = opts.end !== !1, opts.proxyErrors = !!opts.proxyErrors, ended ? opts.end && dest.end() : (this[PIPES].push(opts.proxyErrors ? new PipeProxyErrors(this, dest, opts) : new Pipe(this, dest, opts)), this[ASYNC] ? defer(() => this[RESUME]()) : this[RESUME]()), dest;
  }
  /**
   * Fully unhook a piped destination stream.
   *
   * If the destination stream was the only consumer of this stream (ie,
   * there are no other piped destinations or `'data'` event listeners)
   * then the flow of data will stop until there is another consumer or
   * {@link Minipass#resume} is explicitly called.
   */
  unpipe(dest) {
    let p = this[PIPES].find((p2) => p2.dest === dest);
    p && (this[PIPES].length === 1 ? (this[FLOWING] && this[DATALISTENERS] === 0 && (this[FLOWING] = !1), this[PIPES] = []) : this[PIPES].splice(this[PIPES].indexOf(p), 1), p.unpipe());
  }
  /**
   * Alias for {@link Minipass#on}
   */
  addListener(ev, handler) {
    return this.on(ev, handler);
  }
  /**
   * Mostly identical to `EventEmitter.on`, with the following
   * behavior differences to prevent data loss and unnecessary hangs:
   *
   * - Adding a 'data' event handler will trigger the flow of data
   *
   * - Adding a 'readable' event handler when there is data waiting to be read
   *   will cause 'readable' to be emitted immediately.
   *
   * - Adding an 'endish' event handler ('end', 'finish', etc.) which has
   *   already passed will cause the event to be emitted immediately and all
   *   handlers removed.
   *
   * - Adding an 'error' event handler after an error has been emitted will
   *   cause the event to be re-emitted immediately with the error previously
   *   raised.
   */
  on(ev, handler) {
    let ret = super.on(ev, handler);
    if (ev === "data")
      this[DISCARDED] = !1, this[DATALISTENERS]++, !this[PIPES].length && !this[FLOWING] && this[RESUME]();
    else if (ev === "readable" && this[BUFFERLENGTH] !== 0)
      super.emit("readable");
    else if (isEndish(ev) && this[EMITTED_END])
      super.emit(ev), this.removeAllListeners(ev);
    else if (ev === "error" && this[EMITTED_ERROR]) {
      let h = handler;
      this[ASYNC] ? defer(() => h.call(this, this[EMITTED_ERROR])) : h.call(this, this[EMITTED_ERROR]);
    }
    return ret;
  }
  /**
   * Alias for {@link Minipass#off}
   */
  removeListener(ev, handler) {
    return this.off(ev, handler);
  }
  /**
   * Mostly identical to `EventEmitter.off`
   *
   * If a 'data' event handler is removed, and it was the last consumer
   * (ie, there are no pipe destinations or other 'data' event listeners),
   * then the flow of data will stop until there is another consumer or
   * {@link Minipass#resume} is explicitly called.
   */
  off(ev, handler) {
    let ret = super.off(ev, handler);
    return ev === "data" && (this[DATALISTENERS] = this.listeners("data").length, this[DATALISTENERS] === 0 && !this[DISCARDED] && !this[PIPES].length && (this[FLOWING] = !1)), ret;
  }
  /**
   * Mostly identical to `EventEmitter.removeAllListeners`
   *
   * If all 'data' event handlers are removed, and they were the last consumer
   * (ie, there are no pipe destinations), then the flow of data will stop
   * until there is another consumer or {@link Minipass#resume} is explicitly
   * called.
   */
  removeAllListeners(ev) {
    let ret = super.removeAllListeners(ev);
    return (ev === "data" || ev === void 0) && (this[DATALISTENERS] = 0, !this[DISCARDED] && !this[PIPES].length && (this[FLOWING] = !1)), ret;
  }
  /**
   * true if the 'end' event has been emitted
   */
  get emittedEnd() {
    return this[EMITTED_END];
  }
  [MAYBE_EMIT_END]() {
    !this[EMITTING_END] && !this[EMITTED_END] && !this[DESTROYED] && this[BUFFER].length === 0 && this[EOF] && (this[EMITTING_END] = !0, this.emit("end"), this.emit("prefinish"), this.emit("finish"), this[CLOSED] && this.emit("close"), this[EMITTING_END] = !1);
  }
  /**
   * Mostly identical to `EventEmitter.emit`, with the following
   * behavior differences to prevent data loss and unnecessary hangs:
   *
   * If the stream has been destroyed, and the event is something other
   * than 'close' or 'error', then `false` is returned and no handlers
   * are called.
   *
   * If the event is 'end', and has already been emitted, then the event
   * is ignored. If the stream is in a paused or non-flowing state, then
   * the event will be deferred until data flow resumes. If the stream is
   * async, then handlers will be called on the next tick rather than
   * immediately.
   *
   * If the event is 'close', and 'end' has not yet been emitted, then
   * the event will be deferred until after 'end' is emitted.
   *
   * If the event is 'error', and an AbortSignal was provided for the stream,
   * and there are no listeners, then the event is ignored, matching the
   * behavior of node core streams in the presense of an AbortSignal.
   *
   * If the event is 'finish' or 'prefinish', then all listeners will be
   * removed after emitting the event, to prevent double-firing.
   */
  emit(ev, ...args) {
    let data = args[0];
    if (ev !== "error" && ev !== "close" && ev !== DESTROYED && this[DESTROYED])
      return !1;
    if (ev === "data")
      return !this[OBJECTMODE] && !data ? !1 : this[ASYNC] ? (defer(() => this[EMITDATA](data)), !0) : this[EMITDATA](data);
    if (ev === "end")
      return this[EMITEND]();
    if (ev === "close") {
      if (this[CLOSED] = !0, !this[EMITTED_END] && !this[DESTROYED])
        return !1;
      let ret2 = super.emit("close");
      return this.removeAllListeners("close"), ret2;
    } else if (ev === "error") {
      this[EMITTED_ERROR] = data, super.emit(ERROR, data);
      let ret2 = !this[SIGNAL] || this.listeners("error").length ? super.emit("error", data) : !1;
      return this[MAYBE_EMIT_END](), ret2;
    } else if (ev === "resume") {
      let ret2 = super.emit("resume");
      return this[MAYBE_EMIT_END](), ret2;
    } else if (ev === "finish" || ev === "prefinish") {
      let ret2 = super.emit(ev);
      return this.removeAllListeners(ev), ret2;
    }
    let ret = super.emit(ev, ...args);
    return this[MAYBE_EMIT_END](), ret;
  }
  [EMITDATA](data) {
    for (let p of this[PIPES])
      p.dest.write(data) === !1 && this.pause();
    let ret = this[DISCARDED] ? !1 : super.emit("data", data);
    return this[MAYBE_EMIT_END](), ret;
  }
  [EMITEND]() {
    return this[EMITTED_END] ? !1 : (this[EMITTED_END] = !0, this.readable = !1, this[ASYNC] ? (defer(() => this[EMITEND2]()), !0) : this[EMITEND2]());
  }
  [EMITEND2]() {
    if (this[DECODER]) {
      let data = this[DECODER].end();
      if (data) {
        for (let p of this[PIPES])
          p.dest.write(data);
        this[DISCARDED] || super.emit("data", data);
      }
    }
    for (let p of this[PIPES])
      p.end();
    let ret = super.emit("end");
    return this.removeAllListeners("end"), ret;
  }
  /**
   * Return a Promise that resolves to an array of all emitted data once
   * the stream ends.
   */
  async collect() {
    let buf = Object.assign([], {
      dataLength: 0
    });
    this[OBJECTMODE] || (buf.dataLength = 0);
    let p = this.promise();
    return this.on("data", (c) => {
      buf.push(c), this[OBJECTMODE] || (buf.dataLength += c.length);
    }), await p, buf;
  }
  /**
   * Return a Promise that resolves to the concatenation of all emitted data
   * once the stream ends.
   *
   * Not allowed on objectMode streams.
   */
  async concat() {
    if (this[OBJECTMODE])
      throw new Error("cannot concat in objectMode");
    let buf = await this.collect();
    return this[ENCODING] ? buf.join("") : Buffer.concat(buf, buf.dataLength);
  }
  /**
   * Return a void Promise that resolves once the stream ends.
   */
  async promise() {
    return new Promise((resolve4, reject) => {
      this.on(DESTROYED, () => reject(new Error("stream destroyed"))), this.on("error", (er) => reject(er)), this.on("end", () => resolve4());
    });
  }
  /**
   * Asynchronous `for await of` iteration.
   *
   * This will continue emitting all chunks until the stream terminates.
   */
  [Symbol.asyncIterator]() {
    this[DISCARDED] = !1;
    let stopped = !1, stop = async () => (this.pause(), stopped = !0, { value: void 0, done: !0 });
    return {
      next: () => {
        if (stopped)
          return stop();
        let res = this.read();
        if (res !== null)
          return Promise.resolve({ done: !1, value: res });
        if (this[EOF])
          return stop();
        let resolve4, reject, onerr = (er) => {
          this.off("data", ondata), this.off("end", onend), this.off(DESTROYED, ondestroy), stop(), reject(er);
        }, ondata = (value) => {
          this.off("error", onerr), this.off("end", onend), this.off(DESTROYED, ondestroy), this.pause(), resolve4({ value, done: !!this[EOF] });
        }, onend = () => {
          this.off("error", onerr), this.off("data", ondata), this.off(DESTROYED, ondestroy), stop(), resolve4({ done: !0, value: void 0 });
        }, ondestroy = () => onerr(new Error("stream destroyed"));
        return new Promise((res2, rej) => {
          reject = rej, resolve4 = res2, this.once(DESTROYED, ondestroy), this.once("error", onerr), this.once("end", onend), this.once("data", ondata);
        });
      },
      throw: stop,
      return: stop,
      [Symbol.asyncIterator]() {
        return this;
      }
    };
  }
  /**
   * Synchronous `for of` iteration.
   *
   * The iteration will terminate when the internal buffer runs out, even
   * if the stream has not yet terminated.
   */
  [Symbol.iterator]() {
    this[DISCARDED] = !1;
    let stopped = !1, stop = () => (this.pause(), this.off(ERROR, stop), this.off(DESTROYED, stop), this.off("end", stop), stopped = !0, { done: !0, value: void 0 }), next = () => {
      if (stopped)
        return stop();
      let value = this.read();
      return value === null ? stop() : { done: !1, value };
    };
    return this.once("end", stop), this.once(ERROR, stop), this.once(DESTROYED, stop), {
      next,
      throw: stop,
      return: stop,
      [Symbol.iterator]() {
        return this;
      }
    };
  }
  /**
   * Destroy a stream, preventing it from being used for any further purpose.
   *
   * If the stream has a `close()` method, then it will be called on
   * destruction.
   *
   * After destruction, any attempt to write data, read data, or emit most
   * events will be ignored.
   *
   * If an error argument is provided, then it will be emitted in an
   * 'error' event.
   */
  destroy(er) {
    if (this[DESTROYED])
      return er ? this.emit("error", er) : this.emit(DESTROYED), this;
    this[DESTROYED] = !0, this[DISCARDED] = !0, this[BUFFER].length = 0, this[BUFFERLENGTH] = 0;
    let wc = this;
    return typeof wc.close == "function" && !this[CLOSED] && wc.close(), er ? this.emit("error", er) : this.emit(DESTROYED), this;
  }
  /**
   * Alias for {@link isStream}
   *
   * Former export location, maintained for backwards compatibility.
   *
   * @deprecated
   */
  static get isStream() {
    return isStream;
  }
};

// ../../node_modules/glob/node_modules/path-scurry/dist/esm/index.js
var realpathSync = rps.native, defaultFS = {
  lstatSync,
  readdir: readdirCB,
  readdirSync,
  readlinkSync,
  realpathSync,
  promises: {
    lstat,
    readdir,
    readlink,
    realpath
  }
}, fsFromOption = (fsOption) => !fsOption || fsOption === defaultFS || fsOption === actualFS ? defaultFS : {
  ...defaultFS,
  ...fsOption,
  promises: {
    ...defaultFS.promises,
    ...fsOption.promises || {}
  }
}, uncDriveRegexp = /^\\\\\?\\([a-z]:)\\?$/i, uncToDrive = (rootPath) => rootPath.replace(/\//g, "\\").replace(uncDriveRegexp, "$1\\"), eitherSep = /[\\\/]/, UNKNOWN = 0, IFIFO = 1, IFCHR = 2, IFDIR = 4, IFBLK = 6, IFREG = 8, IFLNK = 10, IFSOCK = 12, IFMT = 15, IFMT_UNKNOWN = ~IFMT, READDIR_CALLED = 16, LSTAT_CALLED = 32, ENOTDIR = 64, ENOENT = 128, ENOREADLINK = 256, ENOREALPATH = 512, ENOCHILD = ENOTDIR | ENOENT | ENOREALPATH, TYPEMASK = 1023, entToType = (s) => s.isFile() ? IFREG : s.isDirectory() ? IFDIR : s.isSymbolicLink() ? IFLNK : s.isCharacterDevice() ? IFCHR : s.isBlockDevice() ? IFBLK : s.isSocket() ? IFSOCK : s.isFIFO() ? IFIFO : UNKNOWN, normalizeCache = /* @__PURE__ */ new Map(), normalize2 = (s) => {
  let c = normalizeCache.get(s);
  if (c)
    return c;
  let n2 = s.normalize("NFKD");
  return normalizeCache.set(s, n2), n2;
}, normalizeNocaseCache = /* @__PURE__ */ new Map(), normalizeNocase = (s) => {
  let c = normalizeNocaseCache.get(s);
  if (c)
    return c;
  let n2 = normalize2(s.toLowerCase());
  return normalizeNocaseCache.set(s, n2), n2;
}, ResolveCache = class extends LRUCache {
  constructor() {
    super({ max: 256 });
  }
}, ChildrenCache = class extends LRUCache {
  constructor(maxSize = 16 * 1024) {
    super({
      maxSize,
      // parent + children
      sizeCalculation: (a) => a.length + 1
    });
  }
}, setAsCwd = Symbol("PathScurry setAsCwd"), PathBase = class {
  /**
   * the basename of this path
   *
   * **Important**: *always* test the path name against any test string
   * usingthe {@link isNamed} method, and not by directly comparing this
   * string. Otherwise, unicode path strings that the system sees as identical
   * will not be properly treated as the same path, leading to incorrect
   * behavior and possible security issues.
   */
  name;
  /**
   * the Path entry corresponding to the path root.
   *
   * @internal
   */
  root;
  /**
   * All roots found within the current PathScurry family
   *
   * @internal
   */
  roots;
  /**
   * a reference to the parent path, or undefined in the case of root entries
   *
   * @internal
   */
  parent;
  /**
   * boolean indicating whether paths are compared case-insensitively
   * @internal
   */
  nocase;
  /**
   * boolean indicating that this path is the current working directory
   * of the PathScurry collection that contains it.
   */
  isCWD = !1;
  // potential default fs override
  #fs;
  // Stats fields
  #dev;
  get dev() {
    return this.#dev;
  }
  #mode;
  get mode() {
    return this.#mode;
  }
  #nlink;
  get nlink() {
    return this.#nlink;
  }
  #uid;
  get uid() {
    return this.#uid;
  }
  #gid;
  get gid() {
    return this.#gid;
  }
  #rdev;
  get rdev() {
    return this.#rdev;
  }
  #blksize;
  get blksize() {
    return this.#blksize;
  }
  #ino;
  get ino() {
    return this.#ino;
  }
  #size;
  get size() {
    return this.#size;
  }
  #blocks;
  get blocks() {
    return this.#blocks;
  }
  #atimeMs;
  get atimeMs() {
    return this.#atimeMs;
  }
  #mtimeMs;
  get mtimeMs() {
    return this.#mtimeMs;
  }
  #ctimeMs;
  get ctimeMs() {
    return this.#ctimeMs;
  }
  #birthtimeMs;
  get birthtimeMs() {
    return this.#birthtimeMs;
  }
  #atime;
  get atime() {
    return this.#atime;
  }
  #mtime;
  get mtime() {
    return this.#mtime;
  }
  #ctime;
  get ctime() {
    return this.#ctime;
  }
  #birthtime;
  get birthtime() {
    return this.#birthtime;
  }
  #matchName;
  #depth;
  #fullpath;
  #fullpathPosix;
  #relative;
  #relativePosix;
  #type;
  #children;
  #linkTarget;
  #realpath;
  /**
   * This property is for compatibility with the Dirent class as of
   * Node v20, where Dirent['parentPath'] refers to the path of the
   * directory that was passed to readdir. For root entries, it's the path
   * to the entry itself.
   */
  get parentPath() {
    return (this.parent || this).fullpath();
  }
  /**
   * Deprecated alias for Dirent['parentPath'] Somewhat counterintuitively,
   * this property refers to the *parent* path, not the path object itself.
   */
  get path() {
    return this.parentPath;
  }
  /**
   * Do not create new Path objects directly.  They should always be accessed
   * via the PathScurry class or other methods on the Path class.
   *
   * @internal
   */
  constructor(name, type = UNKNOWN, root, roots, nocase, children, opts) {
    this.name = name, this.#matchName = nocase ? normalizeNocase(name) : normalize2(name), this.#type = type & TYPEMASK, this.nocase = nocase, this.roots = roots, this.root = root || this, this.#children = children, this.#fullpath = opts.fullpath, this.#relative = opts.relative, this.#relativePosix = opts.relativePosix, this.parent = opts.parent, this.parent ? this.#fs = this.parent.#fs : this.#fs = fsFromOption(opts.fs);
  }
  /**
   * Returns the depth of the Path object from its root.
   *
   * For example, a path at `/foo/bar` would have a depth of 2.
   */
  depth() {
    return this.#depth !== void 0 ? this.#depth : this.parent ? this.#depth = this.parent.depth() + 1 : this.#depth = 0;
  }
  /**
   * @internal
   */
  childrenCache() {
    return this.#children;
  }
  /**
   * Get the Path object referenced by the string path, resolved from this Path
   */
  resolve(path2) {
    if (!path2)
      return this;
    let rootPath = this.getRootString(path2), dirParts = path2.substring(rootPath.length).split(this.splitSep);
    return rootPath ? this.getRoot(rootPath).#resolveParts(dirParts) : this.#resolveParts(dirParts);
  }
  #resolveParts(dirParts) {
    let p = this;
    for (let part of dirParts)
      p = p.child(part);
    return p;
  }
  /**
   * Returns the cached children Path objects, if still available.  If they
   * have fallen out of the cache, then returns an empty array, and resets the
   * READDIR_CALLED bit, so that future calls to readdir() will require an fs
   * lookup.
   *
   * @internal
   */
  children() {
    let cached = this.#children.get(this);
    if (cached)
      return cached;
    let children = Object.assign([], { provisional: 0 });
    return this.#children.set(this, children), this.#type &= ~READDIR_CALLED, children;
  }
  /**
   * Resolves a path portion and returns or creates the child Path.
   *
   * Returns `this` if pathPart is `''` or `'.'`, or `parent` if pathPart is
   * `'..'`.
   *
   * This should not be called directly.  If `pathPart` contains any path
   * separators, it will lead to unsafe undefined behavior.
   *
   * Use `Path.resolve()` instead.
   *
   * @internal
   */
  child(pathPart, opts) {
    if (pathPart === "" || pathPart === ".")
      return this;
    if (pathPart === "..")
      return this.parent || this;
    let children = this.children(), name = this.nocase ? normalizeNocase(pathPart) : normalize2(pathPart);
    for (let p of children)
      if (p.#matchName === name)
        return p;
    let s = this.parent ? this.sep : "", fullpath = this.#fullpath ? this.#fullpath + s + pathPart : void 0, pchild = this.newChild(pathPart, UNKNOWN, {
      ...opts,
      parent: this,
      fullpath
    });
    return this.canReaddir() || (pchild.#type |= ENOENT), children.push(pchild), pchild;
  }
  /**
   * The relative path from the cwd. If it does not share an ancestor with
   * the cwd, then this ends up being equivalent to the fullpath()
   */
  relative() {
    if (this.isCWD)
      return "";
    if (this.#relative !== void 0)
      return this.#relative;
    let name = this.name, p = this.parent;
    if (!p)
      return this.#relative = this.name;
    let pv = p.relative();
    return pv + (!pv || !p.parent ? "" : this.sep) + name;
  }
  /**
   * The relative path from the cwd, using / as the path separator.
   * If it does not share an ancestor with
   * the cwd, then this ends up being equivalent to the fullpathPosix()
   * On posix systems, this is identical to relative().
   */
  relativePosix() {
    if (this.sep === "/")
      return this.relative();
    if (this.isCWD)
      return "";
    if (this.#relativePosix !== void 0)
      return this.#relativePosix;
    let name = this.name, p = this.parent;
    if (!p)
      return this.#relativePosix = this.fullpathPosix();
    let pv = p.relativePosix();
    return pv + (!pv || !p.parent ? "" : "/") + name;
  }
  /**
   * The fully resolved path string for this Path entry
   */
  fullpath() {
    if (this.#fullpath !== void 0)
      return this.#fullpath;
    let name = this.name, p = this.parent;
    if (!p)
      return this.#fullpath = this.name;
    let fp = p.fullpath() + (p.parent ? this.sep : "") + name;
    return this.#fullpath = fp;
  }
  /**
   * On platforms other than windows, this is identical to fullpath.
   *
   * On windows, this is overridden to return the forward-slash form of the
   * full UNC path.
   */
  fullpathPosix() {
    if (this.#fullpathPosix !== void 0)
      return this.#fullpathPosix;
    if (this.sep === "/")
      return this.#fullpathPosix = this.fullpath();
    if (!this.parent) {
      let p2 = this.fullpath().replace(/\\/g, "/");
      return /^[a-z]:\//i.test(p2) ? this.#fullpathPosix = `//?/${p2}` : this.#fullpathPosix = p2;
    }
    let p = this.parent, pfpp = p.fullpathPosix(), fpp = pfpp + (!pfpp || !p.parent ? "" : "/") + this.name;
    return this.#fullpathPosix = fpp;
  }
  /**
   * Is the Path of an unknown type?
   *
   * Note that we might know *something* about it if there has been a previous
   * filesystem operation, for example that it does not exist, or is not a
   * link, or whether it has child entries.
   */
  isUnknown() {
    return (this.#type & IFMT) === UNKNOWN;
  }
  isType(type) {
    return this[`is${type}`]();
  }
  getType() {
    return this.isUnknown() ? "Unknown" : this.isDirectory() ? "Directory" : this.isFile() ? "File" : this.isSymbolicLink() ? "SymbolicLink" : this.isFIFO() ? "FIFO" : this.isCharacterDevice() ? "CharacterDevice" : this.isBlockDevice() ? "BlockDevice" : (
      /* c8 ignore start */
      this.isSocket() ? "Socket" : "Unknown"
    );
  }
  /**
   * Is the Path a regular file?
   */
  isFile() {
    return (this.#type & IFMT) === IFREG;
  }
  /**
   * Is the Path a directory?
   */
  isDirectory() {
    return (this.#type & IFMT) === IFDIR;
  }
  /**
   * Is the path a character device?
   */
  isCharacterDevice() {
    return (this.#type & IFMT) === IFCHR;
  }
  /**
   * Is the path a block device?
   */
  isBlockDevice() {
    return (this.#type & IFMT) === IFBLK;
  }
  /**
   * Is the path a FIFO pipe?
   */
  isFIFO() {
    return (this.#type & IFMT) === IFIFO;
  }
  /**
   * Is the path a socket?
   */
  isSocket() {
    return (this.#type & IFMT) === IFSOCK;
  }
  /**
   * Is the path a symbolic link?
   */
  isSymbolicLink() {
    return (this.#type & IFLNK) === IFLNK;
  }
  /**
   * Return the entry if it has been subject of a successful lstat, or
   * undefined otherwise.
   *
   * Does not read the filesystem, so an undefined result *could* simply
   * mean that we haven't called lstat on it.
   */
  lstatCached() {
    return this.#type & LSTAT_CALLED ? this : void 0;
  }
  /**
   * Return the cached link target if the entry has been the subject of a
   * successful readlink, or undefined otherwise.
   *
   * Does not read the filesystem, so an undefined result *could* just mean we
   * don't have any cached data. Only use it if you are very sure that a
   * readlink() has been called at some point.
   */
  readlinkCached() {
    return this.#linkTarget;
  }
  /**
   * Returns the cached realpath target if the entry has been the subject
   * of a successful realpath, or undefined otherwise.
   *
   * Does not read the filesystem, so an undefined result *could* just mean we
   * don't have any cached data. Only use it if you are very sure that a
   * realpath() has been called at some point.
   */
  realpathCached() {
    return this.#realpath;
  }
  /**
   * Returns the cached child Path entries array if the entry has been the
   * subject of a successful readdir(), or [] otherwise.
   *
   * Does not read the filesystem, so an empty array *could* just mean we
   * don't have any cached data. Only use it if you are very sure that a
   * readdir() has been called recently enough to still be valid.
   */
  readdirCached() {
    let children = this.children();
    return children.slice(0, children.provisional);
  }
  /**
   * Return true if it's worth trying to readlink.  Ie, we don't (yet) have
   * any indication that readlink will definitely fail.
   *
   * Returns false if the path is known to not be a symlink, if a previous
   * readlink failed, or if the entry does not exist.
   */
  canReadlink() {
    if (this.#linkTarget)
      return !0;
    if (!this.parent)
      return !1;
    let ifmt = this.#type & IFMT;
    return !(ifmt !== UNKNOWN && ifmt !== IFLNK || this.#type & ENOREADLINK || this.#type & ENOENT);
  }
  /**
   * Return true if readdir has previously been successfully called on this
   * path, indicating that cachedReaddir() is likely valid.
   */
  calledReaddir() {
    return !!(this.#type & READDIR_CALLED);
  }
  /**
   * Returns true if the path is known to not exist. That is, a previous lstat
   * or readdir failed to verify its existence when that would have been
   * expected, or a parent entry was marked either enoent or enotdir.
   */
  isENOENT() {
    return !!(this.#type & ENOENT);
  }
  /**
   * Return true if the path is a match for the given path name.  This handles
   * case sensitivity and unicode normalization.
   *
   * Note: even on case-sensitive systems, it is **not** safe to test the
   * equality of the `.name` property to determine whether a given pathname
   * matches, due to unicode normalization mismatches.
   *
   * Always use this method instead of testing the `path.name` property
   * directly.
   */
  isNamed(n2) {
    return this.nocase ? this.#matchName === normalizeNocase(n2) : this.#matchName === normalize2(n2);
  }
  /**
   * Return the Path object corresponding to the target of a symbolic link.
   *
   * If the Path is not a symbolic link, or if the readlink call fails for any
   * reason, `undefined` is returned.
   *
   * Result is cached, and thus may be outdated if the filesystem is mutated.
   */
  async readlink() {
    let target = this.#linkTarget;
    if (target)
      return target;
    if (this.canReadlink() && this.parent)
      try {
        let read = await this.#fs.promises.readlink(this.fullpath()), linkTarget = (await this.parent.realpath())?.resolve(read);
        if (linkTarget)
          return this.#linkTarget = linkTarget;
      } catch (er) {
        this.#readlinkFail(er.code);
        return;
      }
  }
  /**
   * Synchronous {@link PathBase.readlink}
   */
  readlinkSync() {
    let target = this.#linkTarget;
    if (target)
      return target;
    if (this.canReadlink() && this.parent)
      try {
        let read = this.#fs.readlinkSync(this.fullpath()), linkTarget = this.parent.realpathSync()?.resolve(read);
        if (linkTarget)
          return this.#linkTarget = linkTarget;
      } catch (er) {
        this.#readlinkFail(er.code);
        return;
      }
  }
  #readdirSuccess(children) {
    this.#type |= READDIR_CALLED;
    for (let p = children.provisional; p < children.length; p++) {
      let c = children[p];
      c && c.#markENOENT();
    }
  }
  #markENOENT() {
    this.#type & ENOENT || (this.#type = (this.#type | ENOENT) & IFMT_UNKNOWN, this.#markChildrenENOENT());
  }
  #markChildrenENOENT() {
    let children = this.children();
    children.provisional = 0;
    for (let p of children)
      p.#markENOENT();
  }
  #markENOREALPATH() {
    this.#type |= ENOREALPATH, this.#markENOTDIR();
  }
  // save the information when we know the entry is not a dir
  #markENOTDIR() {
    if (this.#type & ENOTDIR)
      return;
    let t = this.#type;
    (t & IFMT) === IFDIR && (t &= IFMT_UNKNOWN), this.#type = t | ENOTDIR, this.#markChildrenENOENT();
  }
  #readdirFail(code = "") {
    code === "ENOTDIR" || code === "EPERM" ? this.#markENOTDIR() : code === "ENOENT" ? this.#markENOENT() : this.children().provisional = 0;
  }
  #lstatFail(code = "") {
    code === "ENOTDIR" ? this.parent.#markENOTDIR() : code === "ENOENT" && this.#markENOENT();
  }
  #readlinkFail(code = "") {
    let ter = this.#type;
    ter |= ENOREADLINK, code === "ENOENT" && (ter |= ENOENT), (code === "EINVAL" || code === "UNKNOWN") && (ter &= IFMT_UNKNOWN), this.#type = ter, code === "ENOTDIR" && this.parent && this.parent.#markENOTDIR();
  }
  #readdirAddChild(e, c) {
    return this.#readdirMaybePromoteChild(e, c) || this.#readdirAddNewChild(e, c);
  }
  #readdirAddNewChild(e, c) {
    let type = entToType(e), child = this.newChild(e.name, type, { parent: this }), ifmt = child.#type & IFMT;
    return ifmt !== IFDIR && ifmt !== IFLNK && ifmt !== UNKNOWN && (child.#type |= ENOTDIR), c.unshift(child), c.provisional++, child;
  }
  #readdirMaybePromoteChild(e, c) {
    for (let p = c.provisional; p < c.length; p++) {
      let pchild = c[p];
      if ((this.nocase ? normalizeNocase(e.name) : normalize2(e.name)) === pchild.#matchName)
        return this.#readdirPromoteChild(e, pchild, p, c);
    }
  }
  #readdirPromoteChild(e, p, index, c) {
    let v = p.name;
    return p.#type = p.#type & IFMT_UNKNOWN | entToType(e), v !== e.name && (p.name = e.name), index !== c.provisional && (index === c.length - 1 ? c.pop() : c.splice(index, 1), c.unshift(p)), c.provisional++, p;
  }
  /**
   * Call lstat() on this Path, and update all known information that can be
   * determined.
   *
   * Note that unlike `fs.lstat()`, the returned value does not contain some
   * information, such as `mode`, `dev`, `nlink`, and `ino`.  If that
   * information is required, you will need to call `fs.lstat` yourself.
   *
   * If the Path refers to a nonexistent file, or if the lstat call fails for
   * any reason, `undefined` is returned.  Otherwise the updated Path object is
   * returned.
   *
   * Results are cached, and thus may be out of date if the filesystem is
   * mutated.
   */
  async lstat() {
    if ((this.#type & ENOENT) === 0)
      try {
        return this.#applyStat(await this.#fs.promises.lstat(this.fullpath())), this;
      } catch (er) {
        this.#lstatFail(er.code);
      }
  }
  /**
   * synchronous {@link PathBase.lstat}
   */
  lstatSync() {
    if ((this.#type & ENOENT) === 0)
      try {
        return this.#applyStat(this.#fs.lstatSync(this.fullpath())), this;
      } catch (er) {
        this.#lstatFail(er.code);
      }
  }
  #applyStat(st) {
    let { atime, atimeMs, birthtime, birthtimeMs, blksize, blocks, ctime, ctimeMs, dev, gid, ino, mode, mtime, mtimeMs, nlink, rdev, size, uid } = st;
    this.#atime = atime, this.#atimeMs = atimeMs, this.#birthtime = birthtime, this.#birthtimeMs = birthtimeMs, this.#blksize = blksize, this.#blocks = blocks, this.#ctime = ctime, this.#ctimeMs = ctimeMs, this.#dev = dev, this.#gid = gid, this.#ino = ino, this.#mode = mode, this.#mtime = mtime, this.#mtimeMs = mtimeMs, this.#nlink = nlink, this.#rdev = rdev, this.#size = size, this.#uid = uid;
    let ifmt = entToType(st);
    this.#type = this.#type & IFMT_UNKNOWN | ifmt | LSTAT_CALLED, ifmt !== UNKNOWN && ifmt !== IFDIR && ifmt !== IFLNK && (this.#type |= ENOTDIR);
  }
  #onReaddirCB = [];
  #readdirCBInFlight = !1;
  #callOnReaddirCB(children) {
    this.#readdirCBInFlight = !1;
    let cbs = this.#onReaddirCB.slice();
    this.#onReaddirCB.length = 0, cbs.forEach((cb) => cb(null, children));
  }
  /**
   * Standard node-style callback interface to get list of directory entries.
   *
   * If the Path cannot or does not contain any children, then an empty array
   * is returned.
   *
   * Results are cached, and thus may be out of date if the filesystem is
   * mutated.
   *
   * @param cb The callback called with (er, entries).  Note that the `er`
   * param is somewhat extraneous, as all readdir() errors are handled and
   * simply result in an empty set of entries being returned.
   * @param allowZalgo Boolean indicating that immediately known results should
   * *not* be deferred with `queueMicrotask`. Defaults to `false`. Release
   * zalgo at your peril, the dark pony lord is devious and unforgiving.
   */
  readdirCB(cb, allowZalgo = !1) {
    if (!this.canReaddir()) {
      allowZalgo ? cb(null, []) : queueMicrotask(() => cb(null, []));
      return;
    }
    let children = this.children();
    if (this.calledReaddir()) {
      let c = children.slice(0, children.provisional);
      allowZalgo ? cb(null, c) : queueMicrotask(() => cb(null, c));
      return;
    }
    if (this.#onReaddirCB.push(cb), this.#readdirCBInFlight)
      return;
    this.#readdirCBInFlight = !0;
    let fullpath = this.fullpath();
    this.#fs.readdir(fullpath, { withFileTypes: !0 }, (er, entries) => {
      if (er)
        this.#readdirFail(er.code), children.provisional = 0;
      else {
        for (let e of entries)
          this.#readdirAddChild(e, children);
        this.#readdirSuccess(children);
      }
      this.#callOnReaddirCB(children.slice(0, children.provisional));
    });
  }
  #asyncReaddirInFlight;
  /**
   * Return an array of known child entries.
   *
   * If the Path cannot or does not contain any children, then an empty array
   * is returned.
   *
   * Results are cached, and thus may be out of date if the filesystem is
   * mutated.
   */
  async readdir() {
    if (!this.canReaddir())
      return [];
    let children = this.children();
    if (this.calledReaddir())
      return children.slice(0, children.provisional);
    let fullpath = this.fullpath();
    if (this.#asyncReaddirInFlight)
      await this.#asyncReaddirInFlight;
    else {
      let resolve4 = () => {
      };
      this.#asyncReaddirInFlight = new Promise((res) => resolve4 = res);
      try {
        for (let e of await this.#fs.promises.readdir(fullpath, {
          withFileTypes: !0
        }))
          this.#readdirAddChild(e, children);
        this.#readdirSuccess(children);
      } catch (er) {
        this.#readdirFail(er.code), children.provisional = 0;
      }
      this.#asyncReaddirInFlight = void 0, resolve4();
    }
    return children.slice(0, children.provisional);
  }
  /**
   * synchronous {@link PathBase.readdir}
   */
  readdirSync() {
    if (!this.canReaddir())
      return [];
    let children = this.children();
    if (this.calledReaddir())
      return children.slice(0, children.provisional);
    let fullpath = this.fullpath();
    try {
      for (let e of this.#fs.readdirSync(fullpath, {
        withFileTypes: !0
      }))
        this.#readdirAddChild(e, children);
      this.#readdirSuccess(children);
    } catch (er) {
      this.#readdirFail(er.code), children.provisional = 0;
    }
    return children.slice(0, children.provisional);
  }
  canReaddir() {
    if (this.#type & ENOCHILD)
      return !1;
    let ifmt = IFMT & this.#type;
    return ifmt === UNKNOWN || ifmt === IFDIR || ifmt === IFLNK;
  }
  shouldWalk(dirs, walkFilter) {
    return (this.#type & IFDIR) === IFDIR && !(this.#type & ENOCHILD) && !dirs.has(this) && (!walkFilter || walkFilter(this));
  }
  /**
   * Return the Path object corresponding to path as resolved
   * by realpath(3).
   *
   * If the realpath call fails for any reason, `undefined` is returned.
   *
   * Result is cached, and thus may be outdated if the filesystem is mutated.
   * On success, returns a Path object.
   */
  async realpath() {
    if (this.#realpath)
      return this.#realpath;
    if (!((ENOREALPATH | ENOREADLINK | ENOENT) & this.#type))
      try {
        let rp = await this.#fs.promises.realpath(this.fullpath());
        return this.#realpath = this.resolve(rp);
      } catch {
        this.#markENOREALPATH();
      }
  }
  /**
   * Synchronous {@link realpath}
   */
  realpathSync() {
    if (this.#realpath)
      return this.#realpath;
    if (!((ENOREALPATH | ENOREADLINK | ENOENT) & this.#type))
      try {
        let rp = this.#fs.realpathSync(this.fullpath());
        return this.#realpath = this.resolve(rp);
      } catch {
        this.#markENOREALPATH();
      }
  }
  /**
   * Internal method to mark this Path object as the scurry cwd,
   * called by {@link PathScurry#chdir}
   *
   * @internal
   */
  [setAsCwd](oldCwd) {
    if (oldCwd === this)
      return;
    oldCwd.isCWD = !1, this.isCWD = !0;
    let changed = /* @__PURE__ */ new Set([]), rp = [], p = this;
    for (; p && p.parent; )
      changed.add(p), p.#relative = rp.join(this.sep), p.#relativePosix = rp.join("/"), p = p.parent, rp.push("..");
    for (p = oldCwd; p && p.parent && !changed.has(p); )
      p.#relative = void 0, p.#relativePosix = void 0, p = p.parent;
  }
}, PathWin32 = class _PathWin32 extends PathBase {
  /**
   * Separator for generating path strings.
   */
  sep = "\\";
  /**
   * Separator for parsing path strings.
   */
  splitSep = eitherSep;
  /**
   * Do not create new Path objects directly.  They should always be accessed
   * via the PathScurry class or other methods on the Path class.
   *
   * @internal
   */
  constructor(name, type = UNKNOWN, root, roots, nocase, children, opts) {
    super(name, type, root, roots, nocase, children, opts);
  }
  /**
   * @internal
   */
  newChild(name, type = UNKNOWN, opts = {}) {
    return new _PathWin32(name, type, this.root, this.roots, this.nocase, this.childrenCache(), opts);
  }
  /**
   * @internal
   */
  getRootString(path2) {
    return win32.parse(path2).root;
  }
  /**
   * @internal
   */
  getRoot(rootPath) {
    if (rootPath = uncToDrive(rootPath.toUpperCase()), rootPath === this.root.name)
      return this.root;
    for (let [compare, root] of Object.entries(this.roots))
      if (this.sameRoot(rootPath, compare))
        return this.roots[rootPath] = root;
    return this.roots[rootPath] = new PathScurryWin32(rootPath, this).root;
  }
  /**
   * @internal
   */
  sameRoot(rootPath, compare = this.root.name) {
    return rootPath = rootPath.toUpperCase().replace(/\//g, "\\").replace(uncDriveRegexp, "$1\\"), rootPath === compare;
  }
}, PathPosix = class _PathPosix extends PathBase {
  /**
   * separator for parsing path strings
   */
  splitSep = "/";
  /**
   * separator for generating path strings
   */
  sep = "/";
  /**
   * Do not create new Path objects directly.  They should always be accessed
   * via the PathScurry class or other methods on the Path class.
   *
   * @internal
   */
  constructor(name, type = UNKNOWN, root, roots, nocase, children, opts) {
    super(name, type, root, roots, nocase, children, opts);
  }
  /**
   * @internal
   */
  getRootString(path2) {
    return path2.startsWith("/") ? "/" : "";
  }
  /**
   * @internal
   */
  getRoot(_rootPath) {
    return this.root;
  }
  /**
   * @internal
   */
  newChild(name, type = UNKNOWN, opts = {}) {
    return new _PathPosix(name, type, this.root, this.roots, this.nocase, this.childrenCache(), opts);
  }
}, PathScurryBase = class {
  /**
   * The root Path entry for the current working directory of this Scurry
   */
  root;
  /**
   * The string path for the root of this Scurry's current working directory
   */
  rootPath;
  /**
   * A collection of all roots encountered, referenced by rootPath
   */
  roots;
  /**
   * The Path entry corresponding to this PathScurry's current working directory.
   */
  cwd;
  #resolveCache;
  #resolvePosixCache;
  #children;
  /**
   * Perform path comparisons case-insensitively.
   *
   * Defaults true on Darwin and Windows systems, false elsewhere.
   */
  nocase;
  #fs;
  /**
   * This class should not be instantiated directly.
   *
   * Use PathScurryWin32, PathScurryDarwin, PathScurryPosix, or PathScurry
   *
   * @internal
   */
  constructor(cwd = process.cwd(), pathImpl, sep2, { nocase, childrenCacheSize = 16 * 1024, fs = defaultFS } = {}) {
    this.#fs = fsFromOption(fs), (cwd instanceof URL || cwd.startsWith("file://")) && (cwd = fileURLToPath2(cwd));
    let cwdPath = pathImpl.resolve(cwd);
    this.roots = /* @__PURE__ */ Object.create(null), this.rootPath = this.parseRootPath(cwdPath), this.#resolveCache = new ResolveCache(), this.#resolvePosixCache = new ResolveCache(), this.#children = new ChildrenCache(childrenCacheSize);
    let split = cwdPath.substring(this.rootPath.length).split(sep2);
    if (split.length === 1 && !split[0] && split.pop(), nocase === void 0)
      throw new TypeError("must provide nocase setting to PathScurryBase ctor");
    this.nocase = nocase, this.root = this.newRoot(this.#fs), this.roots[this.rootPath] = this.root;
    let prev = this.root, len = split.length - 1, joinSep = pathImpl.sep, abs = this.rootPath, sawFirst = !1;
    for (let part of split) {
      let l = len--;
      prev = prev.child(part, {
        relative: new Array(l).fill("..").join(joinSep),
        relativePosix: new Array(l).fill("..").join("/"),
        fullpath: abs += (sawFirst ? "" : joinSep) + part
      }), sawFirst = !0;
    }
    this.cwd = prev;
  }
  /**
   * Get the depth of a provided path, string, or the cwd
   */
  depth(path2 = this.cwd) {
    return typeof path2 == "string" && (path2 = this.cwd.resolve(path2)), path2.depth();
  }
  /**
   * Return the cache of child entries.  Exposed so subclasses can create
   * child Path objects in a platform-specific way.
   *
   * @internal
   */
  childrenCache() {
    return this.#children;
  }
  /**
   * Resolve one or more path strings to a resolved string
   *
   * Same interface as require('path').resolve.
   *
   * Much faster than path.resolve() when called multiple times for the same
   * path, because the resolved Path objects are cached.  Much slower
   * otherwise.
   */
  resolve(...paths) {
    let r = "";
    for (let i = paths.length - 1; i >= 0; i--) {
      let p = paths[i];
      if (!(!p || p === ".") && (r = r ? `${p}/${r}` : p, this.isAbsolute(p)))
        break;
    }
    let cached = this.#resolveCache.get(r);
    if (cached !== void 0)
      return cached;
    let result = this.cwd.resolve(r).fullpath();
    return this.#resolveCache.set(r, result), result;
  }
  /**
   * Resolve one or more path strings to a resolved string, returning
   * the posix path.  Identical to .resolve() on posix systems, but on
   * windows will return a forward-slash separated UNC path.
   *
   * Same interface as require('path').resolve.
   *
   * Much faster than path.resolve() when called multiple times for the same
   * path, because the resolved Path objects are cached.  Much slower
   * otherwise.
   */
  resolvePosix(...paths) {
    let r = "";
    for (let i = paths.length - 1; i >= 0; i--) {
      let p = paths[i];
      if (!(!p || p === ".") && (r = r ? `${p}/${r}` : p, this.isAbsolute(p)))
        break;
    }
    let cached = this.#resolvePosixCache.get(r);
    if (cached !== void 0)
      return cached;
    let result = this.cwd.resolve(r).fullpathPosix();
    return this.#resolvePosixCache.set(r, result), result;
  }
  /**
   * find the relative path from the cwd to the supplied path string or entry
   */
  relative(entry = this.cwd) {
    return typeof entry == "string" && (entry = this.cwd.resolve(entry)), entry.relative();
  }
  /**
   * find the relative path from the cwd to the supplied path string or
   * entry, using / as the path delimiter, even on Windows.
   */
  relativePosix(entry = this.cwd) {
    return typeof entry == "string" && (entry = this.cwd.resolve(entry)), entry.relativePosix();
  }
  /**
   * Return the basename for the provided string or Path object
   */
  basename(entry = this.cwd) {
    return typeof entry == "string" && (entry = this.cwd.resolve(entry)), entry.name;
  }
  /**
   * Return the dirname for the provided string or Path object
   */
  dirname(entry = this.cwd) {
    return typeof entry == "string" && (entry = this.cwd.resolve(entry)), (entry.parent || entry).fullpath();
  }
  async readdir(entry = this.cwd, opts = {
    withFileTypes: !0
  }) {
    typeof entry == "string" ? entry = this.cwd.resolve(entry) : entry instanceof PathBase || (opts = entry, entry = this.cwd);
    let { withFileTypes } = opts;
    if (entry.canReaddir()) {
      let p = await entry.readdir();
      return withFileTypes ? p : p.map((e) => e.name);
    } else
      return [];
  }
  readdirSync(entry = this.cwd, opts = {
    withFileTypes: !0
  }) {
    typeof entry == "string" ? entry = this.cwd.resolve(entry) : entry instanceof PathBase || (opts = entry, entry = this.cwd);
    let { withFileTypes = !0 } = opts;
    return entry.canReaddir() ? withFileTypes ? entry.readdirSync() : entry.readdirSync().map((e) => e.name) : [];
  }
  /**
   * Call lstat() on the string or Path object, and update all known
   * information that can be determined.
   *
   * Note that unlike `fs.lstat()`, the returned value does not contain some
   * information, such as `mode`, `dev`, `nlink`, and `ino`.  If that
   * information is required, you will need to call `fs.lstat` yourself.
   *
   * If the Path refers to a nonexistent file, or if the lstat call fails for
   * any reason, `undefined` is returned.  Otherwise the updated Path object is
   * returned.
   *
   * Results are cached, and thus may be out of date if the filesystem is
   * mutated.
   */
  async lstat(entry = this.cwd) {
    return typeof entry == "string" && (entry = this.cwd.resolve(entry)), entry.lstat();
  }
  /**
   * synchronous {@link PathScurryBase.lstat}
   */
  lstatSync(entry = this.cwd) {
    return typeof entry == "string" && (entry = this.cwd.resolve(entry)), entry.lstatSync();
  }
  async readlink(entry = this.cwd, { withFileTypes } = {
    withFileTypes: !1
  }) {
    typeof entry == "string" ? entry = this.cwd.resolve(entry) : entry instanceof PathBase || (withFileTypes = entry.withFileTypes, entry = this.cwd);
    let e = await entry.readlink();
    return withFileTypes ? e : e?.fullpath();
  }
  readlinkSync(entry = this.cwd, { withFileTypes } = {
    withFileTypes: !1
  }) {
    typeof entry == "string" ? entry = this.cwd.resolve(entry) : entry instanceof PathBase || (withFileTypes = entry.withFileTypes, entry = this.cwd);
    let e = entry.readlinkSync();
    return withFileTypes ? e : e?.fullpath();
  }
  async realpath(entry = this.cwd, { withFileTypes } = {
    withFileTypes: !1
  }) {
    typeof entry == "string" ? entry = this.cwd.resolve(entry) : entry instanceof PathBase || (withFileTypes = entry.withFileTypes, entry = this.cwd);
    let e = await entry.realpath();
    return withFileTypes ? e : e?.fullpath();
  }
  realpathSync(entry = this.cwd, { withFileTypes } = {
    withFileTypes: !1
  }) {
    typeof entry == "string" ? entry = this.cwd.resolve(entry) : entry instanceof PathBase || (withFileTypes = entry.withFileTypes, entry = this.cwd);
    let e = entry.realpathSync();
    return withFileTypes ? e : e?.fullpath();
  }
  async walk(entry = this.cwd, opts = {}) {
    typeof entry == "string" ? entry = this.cwd.resolve(entry) : entry instanceof PathBase || (opts = entry, entry = this.cwd);
    let { withFileTypes = !0, follow = !1, filter: filter2, walkFilter } = opts, results = [];
    (!filter2 || filter2(entry)) && results.push(withFileTypes ? entry : entry.fullpath());
    let dirs = /* @__PURE__ */ new Set(), walk = (dir, cb) => {
      dirs.add(dir), dir.readdirCB((er, entries) => {
        if (er)
          return cb(er);
        let len = entries.length;
        if (!len)
          return cb();
        let next = () => {
          --len === 0 && cb();
        };
        for (let e of entries)
          (!filter2 || filter2(e)) && results.push(withFileTypes ? e : e.fullpath()), follow && e.isSymbolicLink() ? e.realpath().then((r) => r?.isUnknown() ? r.lstat() : r).then((r) => r?.shouldWalk(dirs, walkFilter) ? walk(r, next) : next()) : e.shouldWalk(dirs, walkFilter) ? walk(e, next) : next();
      }, !0);
    }, start2 = entry;
    return new Promise((res, rej) => {
      walk(start2, (er) => {
        if (er)
          return rej(er);
        res(results);
      });
    });
  }
  walkSync(entry = this.cwd, opts = {}) {
    typeof entry == "string" ? entry = this.cwd.resolve(entry) : entry instanceof PathBase || (opts = entry, entry = this.cwd);
    let { withFileTypes = !0, follow = !1, filter: filter2, walkFilter } = opts, results = [];
    (!filter2 || filter2(entry)) && results.push(withFileTypes ? entry : entry.fullpath());
    let dirs = /* @__PURE__ */ new Set([entry]);
    for (let dir of dirs) {
      let entries = dir.readdirSync();
      for (let e of entries) {
        (!filter2 || filter2(e)) && results.push(withFileTypes ? e : e.fullpath());
        let r = e;
        if (e.isSymbolicLink()) {
          if (!(follow && (r = e.realpathSync())))
            continue;
          r.isUnknown() && r.lstatSync();
        }
        r.shouldWalk(dirs, walkFilter) && dirs.add(r);
      }
    }
    return results;
  }
  /**
   * Support for `for await`
   *
   * Alias for {@link PathScurryBase.iterate}
   *
   * Note: As of Node 19, this is very slow, compared to other methods of
   * walking.  Consider using {@link PathScurryBase.stream} if memory overhead
   * and backpressure are concerns, or {@link PathScurryBase.walk} if not.
   */
  [Symbol.asyncIterator]() {
    return this.iterate();
  }
  iterate(entry = this.cwd, options = {}) {
    return typeof entry == "string" ? entry = this.cwd.resolve(entry) : entry instanceof PathBase || (options = entry, entry = this.cwd), this.stream(entry, options)[Symbol.asyncIterator]();
  }
  /**
   * Iterating over a PathScurry performs a synchronous walk.
   *
   * Alias for {@link PathScurryBase.iterateSync}
   */
  [Symbol.iterator]() {
    return this.iterateSync();
  }
  *iterateSync(entry = this.cwd, opts = {}) {
    typeof entry == "string" ? entry = this.cwd.resolve(entry) : entry instanceof PathBase || (opts = entry, entry = this.cwd);
    let { withFileTypes = !0, follow = !1, filter: filter2, walkFilter } = opts;
    (!filter2 || filter2(entry)) && (yield withFileTypes ? entry : entry.fullpath());
    let dirs = /* @__PURE__ */ new Set([entry]);
    for (let dir of dirs) {
      let entries = dir.readdirSync();
      for (let e of entries) {
        (!filter2 || filter2(e)) && (yield withFileTypes ? e : e.fullpath());
        let r = e;
        if (e.isSymbolicLink()) {
          if (!(follow && (r = e.realpathSync())))
            continue;
          r.isUnknown() && r.lstatSync();
        }
        r.shouldWalk(dirs, walkFilter) && dirs.add(r);
      }
    }
  }
  stream(entry = this.cwd, opts = {}) {
    typeof entry == "string" ? entry = this.cwd.resolve(entry) : entry instanceof PathBase || (opts = entry, entry = this.cwd);
    let { withFileTypes = !0, follow = !1, filter: filter2, walkFilter } = opts, results = new Minipass({ objectMode: !0 });
    (!filter2 || filter2(entry)) && results.write(withFileTypes ? entry : entry.fullpath());
    let dirs = /* @__PURE__ */ new Set(), queue = [entry], processing = 0, process2 = () => {
      let paused = !1;
      for (; !paused; ) {
        let dir = queue.shift();
        if (!dir) {
          processing === 0 && results.end();
          return;
        }
        processing++, dirs.add(dir);
        let onReaddir = (er, entries, didRealpaths = !1) => {
          if (er)
            return results.emit("error", er);
          if (follow && !didRealpaths) {
            let promises = [];
            for (let e of entries)
              e.isSymbolicLink() && promises.push(e.realpath().then((r) => r?.isUnknown() ? r.lstat() : r));
            if (promises.length) {
              Promise.all(promises).then(() => onReaddir(null, entries, !0));
              return;
            }
          }
          for (let e of entries)
            e && (!filter2 || filter2(e)) && (results.write(withFileTypes ? e : e.fullpath()) || (paused = !0));
          processing--;
          for (let e of entries) {
            let r = e.realpathCached() || e;
            r.shouldWalk(dirs, walkFilter) && queue.push(r);
          }
          paused && !results.flowing ? results.once("drain", process2) : sync2 || process2();
        }, sync2 = !0;
        dir.readdirCB(onReaddir, !0), sync2 = !1;
      }
    };
    return process2(), results;
  }
  streamSync(entry = this.cwd, opts = {}) {
    typeof entry == "string" ? entry = this.cwd.resolve(entry) : entry instanceof PathBase || (opts = entry, entry = this.cwd);
    let { withFileTypes = !0, follow = !1, filter: filter2, walkFilter } = opts, results = new Minipass({ objectMode: !0 }), dirs = /* @__PURE__ */ new Set();
    (!filter2 || filter2(entry)) && results.write(withFileTypes ? entry : entry.fullpath());
    let queue = [entry], processing = 0, process2 = () => {
      let paused = !1;
      for (; !paused; ) {
        let dir = queue.shift();
        if (!dir) {
          processing === 0 && results.end();
          return;
        }
        processing++, dirs.add(dir);
        let entries = dir.readdirSync();
        for (let e of entries)
          (!filter2 || filter2(e)) && (results.write(withFileTypes ? e : e.fullpath()) || (paused = !0));
        processing--;
        for (let e of entries) {
          let r = e;
          if (e.isSymbolicLink()) {
            if (!(follow && (r = e.realpathSync())))
              continue;
            r.isUnknown() && r.lstatSync();
          }
          r.shouldWalk(dirs, walkFilter) && queue.push(r);
        }
      }
      paused && !results.flowing && results.once("drain", process2);
    };
    return process2(), results;
  }
  chdir(path2 = this.cwd) {
    let oldCwd = this.cwd;
    this.cwd = typeof path2 == "string" ? this.cwd.resolve(path2) : path2, this.cwd[setAsCwd](oldCwd);
  }
}, PathScurryWin32 = class extends PathScurryBase {
  /**
   * separator for generating path strings
   */
  sep = "\\";
  constructor(cwd = process.cwd(), opts = {}) {
    let { nocase = !0 } = opts;
    super(cwd, win32, "\\", { ...opts, nocase }), this.nocase = nocase;
    for (let p = this.cwd; p; p = p.parent)
      p.nocase = this.nocase;
  }
  /**
   * @internal
   */
  parseRootPath(dir) {
    return win32.parse(dir).root.toUpperCase();
  }
  /**
   * @internal
   */
  newRoot(fs) {
    return new PathWin32(this.rootPath, IFDIR, void 0, this.roots, this.nocase, this.childrenCache(), { fs });
  }
  /**
   * Return true if the provided path string is an absolute path
   */
  isAbsolute(p) {
    return p.startsWith("/") || p.startsWith("\\") || /^[a-z]:(\/|\\)/i.test(p);
  }
}, PathScurryPosix = class extends PathScurryBase {
  /**
   * separator for generating path strings
   */
  sep = "/";
  constructor(cwd = process.cwd(), opts = {}) {
    let { nocase = !1 } = opts;
    super(cwd, posix, "/", { ...opts, nocase }), this.nocase = nocase;
  }
  /**
   * @internal
   */
  parseRootPath(_dir) {
    return "/";
  }
  /**
   * @internal
   */
  newRoot(fs) {
    return new PathPosix(this.rootPath, IFDIR, void 0, this.roots, this.nocase, this.childrenCache(), { fs });
  }
  /**
   * Return true if the provided path string is an absolute path
   */
  isAbsolute(p) {
    return p.startsWith("/");
  }
}, PathScurryDarwin = class extends PathScurryPosix {
  constructor(cwd = process.cwd(), opts = {}) {
    let { nocase = !0 } = opts;
    super(cwd, { ...opts, nocase });
  }
}, Path = process.platform === "win32" ? PathWin32 : PathPosix, PathScurry = process.platform === "win32" ? PathScurryWin32 : process.platform === "darwin" ? PathScurryDarwin : PathScurryPosix;

// ../../node_modules/glob/dist/esm/pattern.js
var isPatternList = (pl) => pl.length >= 1, isGlobList = (gl) => gl.length >= 1, Pattern = class _Pattern {
  #patternList;
  #globList;
  #index;
  length;
  #platform;
  #rest;
  #globString;
  #isDrive;
  #isUNC;
  #isAbsolute;
  #followGlobstar = !0;
  constructor(patternList, globList, index, platform) {
    if (!isPatternList(patternList))
      throw new TypeError("empty pattern list");
    if (!isGlobList(globList))
      throw new TypeError("empty glob list");
    if (globList.length !== patternList.length)
      throw new TypeError("mismatched pattern list and glob list lengths");
    if (this.length = patternList.length, index < 0 || index >= this.length)
      throw new TypeError("index out of range");
    if (this.#patternList = patternList, this.#globList = globList, this.#index = index, this.#platform = platform, this.#index === 0) {
      if (this.isUNC()) {
        let [p0, p1, p2, p3, ...prest] = this.#patternList, [g0, g1, g2, g3, ...grest] = this.#globList;
        prest[0] === "" && (prest.shift(), grest.shift());
        let p = [p0, p1, p2, p3, ""].join("/"), g = [g0, g1, g2, g3, ""].join("/");
        this.#patternList = [p, ...prest], this.#globList = [g, ...grest], this.length = this.#patternList.length;
      } else if (this.isDrive() || this.isAbsolute()) {
        let [p1, ...prest] = this.#patternList, [g1, ...grest] = this.#globList;
        prest[0] === "" && (prest.shift(), grest.shift());
        let p = p1 + "/", g = g1 + "/";
        this.#patternList = [p, ...prest], this.#globList = [g, ...grest], this.length = this.#patternList.length;
      }
    }
  }
  /**
   * The first entry in the parsed list of patterns
   */
  pattern() {
    return this.#patternList[this.#index];
  }
  /**
   * true of if pattern() returns a string
   */
  isString() {
    return typeof this.#patternList[this.#index] == "string";
  }
  /**
   * true of if pattern() returns GLOBSTAR
   */
  isGlobstar() {
    return this.#patternList[this.#index] === GLOBSTAR;
  }
  /**
   * true if pattern() returns a regexp
   */
  isRegExp() {
    return this.#patternList[this.#index] instanceof RegExp;
  }
  /**
   * The /-joined set of glob parts that make up this pattern
   */
  globString() {
    return this.#globString = this.#globString || (this.#index === 0 ? this.isAbsolute() ? this.#globList[0] + this.#globList.slice(1).join("/") : this.#globList.join("/") : this.#globList.slice(this.#index).join("/"));
  }
  /**
   * true if there are more pattern parts after this one
   */
  hasMore() {
    return this.length > this.#index + 1;
  }
  /**
   * The rest of the pattern after this part, or null if this is the end
   */
  rest() {
    return this.#rest !== void 0 ? this.#rest : this.hasMore() ? (this.#rest = new _Pattern(this.#patternList, this.#globList, this.#index + 1, this.#platform), this.#rest.#isAbsolute = this.#isAbsolute, this.#rest.#isUNC = this.#isUNC, this.#rest.#isDrive = this.#isDrive, this.#rest) : this.#rest = null;
  }
  /**
   * true if the pattern represents a //unc/path/ on windows
   */
  isUNC() {
    let pl = this.#patternList;
    return this.#isUNC !== void 0 ? this.#isUNC : this.#isUNC = this.#platform === "win32" && this.#index === 0 && pl[0] === "" && pl[1] === "" && typeof pl[2] == "string" && !!pl[2] && typeof pl[3] == "string" && !!pl[3];
  }
  // pattern like C:/...
  // split = ['C:', ...]
  // XXX: would be nice to handle patterns like `c:*` to test the cwd
  // in c: for *, but I don't know of a way to even figure out what that
  // cwd is without actually chdir'ing into it?
  /**
   * True if the pattern starts with a drive letter on Windows
   */
  isDrive() {
    let pl = this.#patternList;
    return this.#isDrive !== void 0 ? this.#isDrive : this.#isDrive = this.#platform === "win32" && this.#index === 0 && this.length > 1 && typeof pl[0] == "string" && /^[a-z]:$/i.test(pl[0]);
  }
  // pattern = '/' or '/...' or '/x/...'
  // split = ['', ''] or ['', ...] or ['', 'x', ...]
  // Drive and UNC both considered absolute on windows
  /**
   * True if the pattern is rooted on an absolute path
   */
  isAbsolute() {
    let pl = this.#patternList;
    return this.#isAbsolute !== void 0 ? this.#isAbsolute : this.#isAbsolute = pl[0] === "" && pl.length > 1 || this.isDrive() || this.isUNC();
  }
  /**
   * consume the root of the pattern, and return it
   */
  root() {
    let p = this.#patternList[0];
    return typeof p == "string" && this.isAbsolute() && this.#index === 0 ? p : "";
  }
  /**
   * Check to see if the current globstar pattern is allowed to follow
   * a symbolic link.
   */
  checkFollowGlobstar() {
    return !(this.#index === 0 || !this.isGlobstar() || !this.#followGlobstar);
  }
  /**
   * Mark that the current globstar pattern is following a symbolic link
   */
  markFollowGlobstar() {
    return this.#index === 0 || !this.isGlobstar() || !this.#followGlobstar ? !1 : (this.#followGlobstar = !1, !0);
  }
};

// ../../node_modules/glob/dist/esm/ignore.js
var defaultPlatform2 = typeof process == "object" && process && typeof process.platform == "string" ? process.platform : "linux", Ignore = class {
  relative;
  relativeChildren;
  absolute;
  absoluteChildren;
  platform;
  mmopts;
  constructor(ignored, { nobrace, nocase, noext, noglobstar, platform = defaultPlatform2 }) {
    this.relative = [], this.absolute = [], this.relativeChildren = [], this.absoluteChildren = [], this.platform = platform, this.mmopts = {
      dot: !0,
      nobrace,
      nocase,
      noext,
      noglobstar,
      optimizationLevel: 2,
      platform,
      nocomment: !0,
      nonegate: !0
    };
    for (let ign of ignored)
      this.add(ign);
  }
  add(ign) {
    let mm = new Minimatch(ign, this.mmopts);
    for (let i = 0; i < mm.set.length; i++) {
      let parsed = mm.set[i], globParts = mm.globParts[i];
      if (!parsed || !globParts)
        throw new Error("invalid pattern object");
      for (; parsed[0] === "." && globParts[0] === "."; )
        parsed.shift(), globParts.shift();
      let p = new Pattern(parsed, globParts, 0, this.platform), m = new Minimatch(p.globString(), this.mmopts), children = globParts[globParts.length - 1] === "**", absolute2 = p.isAbsolute();
      absolute2 ? this.absolute.push(m) : this.relative.push(m), children && (absolute2 ? this.absoluteChildren.push(m) : this.relativeChildren.push(m));
    }
  }
  ignored(p) {
    let fullpath = p.fullpath(), fullpaths = `${fullpath}/`, relative4 = p.relative() || ".", relatives = `${relative4}/`;
    for (let m of this.relative)
      if (m.match(relative4) || m.match(relatives))
        return !0;
    for (let m of this.absolute)
      if (m.match(fullpath) || m.match(fullpaths))
        return !0;
    return !1;
  }
  childrenIgnored(p) {
    let fullpath = p.fullpath() + "/", relative4 = (p.relative() || ".") + "/";
    for (let m of this.relativeChildren)
      if (m.match(relative4))
        return !0;
    for (let m of this.absoluteChildren)
      if (m.match(fullpath))
        return !0;
    return !1;
  }
};

// ../../node_modules/glob/dist/esm/processor.js
var HasWalkedCache = class _HasWalkedCache {
  store;
  constructor(store = /* @__PURE__ */ new Map()) {
    this.store = store;
  }
  copy() {
    return new _HasWalkedCache(new Map(this.store));
  }
  hasWalked(target, pattern) {
    return this.store.get(target.fullpath())?.has(pattern.globString());
  }
  storeWalked(target, pattern) {
    let fullpath = target.fullpath(), cached = this.store.get(fullpath);
    cached ? cached.add(pattern.globString()) : this.store.set(fullpath, /* @__PURE__ */ new Set([pattern.globString()]));
  }
}, MatchRecord = class {
  store = /* @__PURE__ */ new Map();
  add(target, absolute2, ifDir) {
    let n2 = (absolute2 ? 2 : 0) | (ifDir ? 1 : 0), current = this.store.get(target);
    this.store.set(target, current === void 0 ? n2 : n2 & current);
  }
  // match, absolute, ifdir
  entries() {
    return [...this.store.entries()].map(([path2, n2]) => [
      path2,
      !!(n2 & 2),
      !!(n2 & 1)
    ]);
  }
}, SubWalks = class {
  store = /* @__PURE__ */ new Map();
  add(target, pattern) {
    if (!target.canReaddir())
      return;
    let subs = this.store.get(target);
    subs ? subs.find((p) => p.globString() === pattern.globString()) || subs.push(pattern) : this.store.set(target, [pattern]);
  }
  get(target) {
    let subs = this.store.get(target);
    if (!subs)
      throw new Error("attempting to walk unknown path");
    return subs;
  }
  entries() {
    return this.keys().map((k) => [k, this.store.get(k)]);
  }
  keys() {
    return [...this.store.keys()].filter((t) => t.canReaddir());
  }
}, Processor = class _Processor {
  hasWalkedCache;
  matches = new MatchRecord();
  subwalks = new SubWalks();
  patterns;
  follow;
  dot;
  opts;
  constructor(opts, hasWalkedCache) {
    this.opts = opts, this.follow = !!opts.follow, this.dot = !!opts.dot, this.hasWalkedCache = hasWalkedCache ? hasWalkedCache.copy() : new HasWalkedCache();
  }
  processPatterns(target, patterns) {
    this.patterns = patterns;
    let processingSet = patterns.map((p) => [target, p]);
    for (let [t, pattern] of processingSet) {
      this.hasWalkedCache.storeWalked(t, pattern);
      let root = pattern.root(), absolute2 = pattern.isAbsolute() && this.opts.absolute !== !1;
      if (root) {
        t = t.resolve(root === "/" && this.opts.root !== void 0 ? this.opts.root : root);
        let rest2 = pattern.rest();
        if (rest2)
          pattern = rest2;
        else {
          this.matches.add(t, !0, !1);
          continue;
        }
      }
      if (t.isENOENT())
        continue;
      let p, rest, changed = !1;
      for (; typeof (p = pattern.pattern()) == "string" && (rest = pattern.rest()); )
        t = t.resolve(p), pattern = rest, changed = !0;
      if (p = pattern.pattern(), rest = pattern.rest(), changed) {
        if (this.hasWalkedCache.hasWalked(t, pattern))
          continue;
        this.hasWalkedCache.storeWalked(t, pattern);
      }
      if (typeof p == "string") {
        let ifDir = p === ".." || p === "" || p === ".";
        this.matches.add(t.resolve(p), absolute2, ifDir);
        continue;
      } else if (p === GLOBSTAR) {
        (!t.isSymbolicLink() || this.follow || pattern.checkFollowGlobstar()) && this.subwalks.add(t, pattern);
        let rp = rest?.pattern(), rrest = rest?.rest();
        if (!rest || (rp === "" || rp === ".") && !rrest)
          this.matches.add(t, absolute2, rp === "" || rp === ".");
        else if (rp === "..") {
          let tp = t.parent || t;
          rrest ? this.hasWalkedCache.hasWalked(tp, rrest) || this.subwalks.add(tp, rrest) : this.matches.add(tp, absolute2, !0);
        }
      } else p instanceof RegExp && this.subwalks.add(t, pattern);
    }
    return this;
  }
  subwalkTargets() {
    return this.subwalks.keys();
  }
  child() {
    return new _Processor(this.opts, this.hasWalkedCache);
  }
  // return a new Processor containing the subwalks for each
  // child entry, and a set of matches, and
  // a hasWalkedCache that's a copy of this one
  // then we're going to call
  filterEntries(parent, entries) {
    let patterns = this.subwalks.get(parent), results = this.child();
    for (let e of entries)
      for (let pattern of patterns) {
        let absolute2 = pattern.isAbsolute(), p = pattern.pattern(), rest = pattern.rest();
        p === GLOBSTAR ? results.testGlobstar(e, pattern, rest, absolute2) : p instanceof RegExp ? results.testRegExp(e, p, rest, absolute2) : results.testString(e, p, rest, absolute2);
      }
    return results;
  }
  testGlobstar(e, pattern, rest, absolute2) {
    if ((this.dot || !e.name.startsWith(".")) && (pattern.hasMore() || this.matches.add(e, absolute2, !1), e.canReaddir() && (this.follow || !e.isSymbolicLink() ? this.subwalks.add(e, pattern) : e.isSymbolicLink() && (rest && pattern.checkFollowGlobstar() ? this.subwalks.add(e, rest) : pattern.markFollowGlobstar() && this.subwalks.add(e, pattern)))), rest) {
      let rp = rest.pattern();
      if (typeof rp == "string" && // dots and empty were handled already
      rp !== ".." && rp !== "" && rp !== ".")
        this.testString(e, rp, rest.rest(), absolute2);
      else if (rp === "..") {
        let ep = e.parent || e;
        this.subwalks.add(ep, rest);
      } else rp instanceof RegExp && this.testRegExp(e, rp, rest.rest(), absolute2);
    }
  }
  testRegExp(e, p, rest, absolute2) {
    p.test(e.name) && (rest ? this.subwalks.add(e, rest) : this.matches.add(e, absolute2, !1));
  }
  testString(e, p, rest, absolute2) {
    e.isNamed(p) && (rest ? this.subwalks.add(e, rest) : this.matches.add(e, absolute2, !1));
  }
};

// ../../node_modules/glob/dist/esm/walker.js
var makeIgnore = (ignore, opts) => typeof ignore == "string" ? new Ignore([ignore], opts) : Array.isArray(ignore) ? new Ignore(ignore, opts) : ignore, GlobUtil = class {
  path;
  patterns;
  opts;
  seen = /* @__PURE__ */ new Set();
  paused = !1;
  aborted = !1;
  #onResume = [];
  #ignore;
  #sep;
  signal;
  maxDepth;
  includeChildMatches;
  constructor(patterns, path2, opts) {
    if (this.patterns = patterns, this.path = path2, this.opts = opts, this.#sep = !opts.posix && opts.platform === "win32" ? "\\" : "/", this.includeChildMatches = opts.includeChildMatches !== !1, (opts.ignore || !this.includeChildMatches) && (this.#ignore = makeIgnore(opts.ignore ?? [], opts), !this.includeChildMatches && typeof this.#ignore.add != "function")) {
      let m = "cannot ignore child matches, ignore lacks add() method.";
      throw new Error(m);
    }
    this.maxDepth = opts.maxDepth || 1 / 0, opts.signal && (this.signal = opts.signal, this.signal.addEventListener("abort", () => {
      this.#onResume.length = 0;
    }));
  }
  #ignored(path2) {
    return this.seen.has(path2) || !!this.#ignore?.ignored?.(path2);
  }
  #childrenIgnored(path2) {
    return !!this.#ignore?.childrenIgnored?.(path2);
  }
  // backpressure mechanism
  pause() {
    this.paused = !0;
  }
  resume() {
    if (this.signal?.aborted)
      return;
    this.paused = !1;
    let fn;
    for (; !this.paused && (fn = this.#onResume.shift()); )
      fn();
  }
  onResume(fn) {
    this.signal?.aborted || (this.paused ? this.#onResume.push(fn) : fn());
  }
  // do the requisite realpath/stat checking, and return the path
  // to add or undefined to filter it out.
  async matchCheck(e, ifDir) {
    if (ifDir && this.opts.nodir)
      return;
    let rpc;
    if (this.opts.realpath) {
      if (rpc = e.realpathCached() || await e.realpath(), !rpc)
        return;
      e = rpc;
    }
    let s = e.isUnknown() || this.opts.stat ? await e.lstat() : e;
    if (this.opts.follow && this.opts.nodir && s?.isSymbolicLink()) {
      let target = await s.realpath();
      target && (target.isUnknown() || this.opts.stat) && await target.lstat();
    }
    return this.matchCheckTest(s, ifDir);
  }
  matchCheckTest(e, ifDir) {
    return e && (this.maxDepth === 1 / 0 || e.depth() <= this.maxDepth) && (!ifDir || e.canReaddir()) && (!this.opts.nodir || !e.isDirectory()) && (!this.opts.nodir || !this.opts.follow || !e.isSymbolicLink() || !e.realpathCached()?.isDirectory()) && !this.#ignored(e) ? e : void 0;
  }
  matchCheckSync(e, ifDir) {
    if (ifDir && this.opts.nodir)
      return;
    let rpc;
    if (this.opts.realpath) {
      if (rpc = e.realpathCached() || e.realpathSync(), !rpc)
        return;
      e = rpc;
    }
    let s = e.isUnknown() || this.opts.stat ? e.lstatSync() : e;
    if (this.opts.follow && this.opts.nodir && s?.isSymbolicLink()) {
      let target = s.realpathSync();
      target && (target?.isUnknown() || this.opts.stat) && target.lstatSync();
    }
    return this.matchCheckTest(s, ifDir);
  }
  matchFinish(e, absolute2) {
    if (this.#ignored(e))
      return;
    if (!this.includeChildMatches && this.#ignore?.add) {
      let ign = `${e.relativePosix()}/**`;
      this.#ignore.add(ign);
    }
    let abs = this.opts.absolute === void 0 ? absolute2 : this.opts.absolute;
    this.seen.add(e);
    let mark = this.opts.mark && e.isDirectory() ? this.#sep : "";
    if (this.opts.withFileTypes)
      this.matchEmit(e);
    else if (abs) {
      let abs2 = this.opts.posix ? e.fullpathPosix() : e.fullpath();
      this.matchEmit(abs2 + mark);
    } else {
      let rel = this.opts.posix ? e.relativePosix() : e.relative(), pre = this.opts.dotRelative && !rel.startsWith(".." + this.#sep) ? "." + this.#sep : "";
      this.matchEmit(rel ? pre + rel + mark : "." + mark);
    }
  }
  async match(e, absolute2, ifDir) {
    let p = await this.matchCheck(e, ifDir);
    p && this.matchFinish(p, absolute2);
  }
  matchSync(e, absolute2, ifDir) {
    let p = this.matchCheckSync(e, ifDir);
    p && this.matchFinish(p, absolute2);
  }
  walkCB(target, patterns, cb) {
    this.signal?.aborted && cb(), this.walkCB2(target, patterns, new Processor(this.opts), cb);
  }
  walkCB2(target, patterns, processor, cb) {
    if (this.#childrenIgnored(target))
      return cb();
    if (this.signal?.aborted && cb(), this.paused) {
      this.onResume(() => this.walkCB2(target, patterns, processor, cb));
      return;
    }
    processor.processPatterns(target, patterns);
    let tasks = 1, next = () => {
      --tasks === 0 && cb();
    };
    for (let [m, absolute2, ifDir] of processor.matches.entries())
      this.#ignored(m) || (tasks++, this.match(m, absolute2, ifDir).then(() => next()));
    for (let t of processor.subwalkTargets()) {
      if (this.maxDepth !== 1 / 0 && t.depth() >= this.maxDepth)
        continue;
      tasks++;
      let childrenCached = t.readdirCached();
      t.calledReaddir() ? this.walkCB3(t, childrenCached, processor, next) : t.readdirCB((_, entries) => this.walkCB3(t, entries, processor, next), !0);
    }
    next();
  }
  walkCB3(target, entries, processor, cb) {
    processor = processor.filterEntries(target, entries);
    let tasks = 1, next = () => {
      --tasks === 0 && cb();
    };
    for (let [m, absolute2, ifDir] of processor.matches.entries())
      this.#ignored(m) || (tasks++, this.match(m, absolute2, ifDir).then(() => next()));
    for (let [target2, patterns] of processor.subwalks.entries())
      tasks++, this.walkCB2(target2, patterns, processor.child(), next);
    next();
  }
  walkCBSync(target, patterns, cb) {
    this.signal?.aborted && cb(), this.walkCB2Sync(target, patterns, new Processor(this.opts), cb);
  }
  walkCB2Sync(target, patterns, processor, cb) {
    if (this.#childrenIgnored(target))
      return cb();
    if (this.signal?.aborted && cb(), this.paused) {
      this.onResume(() => this.walkCB2Sync(target, patterns, processor, cb));
      return;
    }
    processor.processPatterns(target, patterns);
    let tasks = 1, next = () => {
      --tasks === 0 && cb();
    };
    for (let [m, absolute2, ifDir] of processor.matches.entries())
      this.#ignored(m) || this.matchSync(m, absolute2, ifDir);
    for (let t of processor.subwalkTargets()) {
      if (this.maxDepth !== 1 / 0 && t.depth() >= this.maxDepth)
        continue;
      tasks++;
      let children = t.readdirSync();
      this.walkCB3Sync(t, children, processor, next);
    }
    next();
  }
  walkCB3Sync(target, entries, processor, cb) {
    processor = processor.filterEntries(target, entries);
    let tasks = 1, next = () => {
      --tasks === 0 && cb();
    };
    for (let [m, absolute2, ifDir] of processor.matches.entries())
      this.#ignored(m) || this.matchSync(m, absolute2, ifDir);
    for (let [target2, patterns] of processor.subwalks.entries())
      tasks++, this.walkCB2Sync(target2, patterns, processor.child(), next);
    next();
  }
}, GlobWalker = class extends GlobUtil {
  matches = /* @__PURE__ */ new Set();
  constructor(patterns, path2, opts) {
    super(patterns, path2, opts);
  }
  matchEmit(e) {
    this.matches.add(e);
  }
  async walk() {
    if (this.signal?.aborted)
      throw this.signal.reason;
    return this.path.isUnknown() && await this.path.lstat(), await new Promise((res, rej) => {
      this.walkCB(this.path, this.patterns, () => {
        this.signal?.aborted ? rej(this.signal.reason) : res(this.matches);
      });
    }), this.matches;
  }
  walkSync() {
    if (this.signal?.aborted)
      throw this.signal.reason;
    return this.path.isUnknown() && this.path.lstatSync(), this.walkCBSync(this.path, this.patterns, () => {
      if (this.signal?.aborted)
        throw this.signal.reason;
    }), this.matches;
  }
}, GlobStream = class extends GlobUtil {
  results;
  constructor(patterns, path2, opts) {
    super(patterns, path2, opts), this.results = new Minipass({
      signal: this.signal,
      objectMode: !0
    }), this.results.on("drain", () => this.resume()), this.results.on("resume", () => this.resume());
  }
  matchEmit(e) {
    this.results.write(e), this.results.flowing || this.pause();
  }
  stream() {
    let target = this.path;
    return target.isUnknown() ? target.lstat().then(() => {
      this.walkCB(target, this.patterns, () => this.results.end());
    }) : this.walkCB(target, this.patterns, () => this.results.end()), this.results;
  }
  streamSync() {
    return this.path.isUnknown() && this.path.lstatSync(), this.walkCBSync(this.path, this.patterns, () => this.results.end()), this.results;
  }
};

// ../../node_modules/glob/dist/esm/glob.js
var defaultPlatform3 = typeof process == "object" && process && typeof process.platform == "string" ? process.platform : "linux", Glob = class {
  absolute;
  cwd;
  root;
  dot;
  dotRelative;
  follow;
  ignore;
  magicalBraces;
  mark;
  matchBase;
  maxDepth;
  nobrace;
  nocase;
  nodir;
  noext;
  noglobstar;
  pattern;
  platform;
  realpath;
  scurry;
  stat;
  signal;
  windowsPathsNoEscape;
  withFileTypes;
  includeChildMatches;
  /**
   * The options provided to the constructor.
   */
  opts;
  /**
   * An array of parsed immutable {@link Pattern} objects.
   */
  patterns;
  /**
   * All options are stored as properties on the `Glob` object.
   *
   * See {@link GlobOptions} for full options descriptions.
   *
   * Note that a previous `Glob` object can be passed as the
   * `GlobOptions` to another `Glob` instantiation to re-use settings
   * and caches with a new pattern.
   *
   * Traversal functions can be called multiple times to run the walk
   * again.
   */
  constructor(pattern, opts) {
    if (!opts)
      throw new TypeError("glob options required");
    if (this.withFileTypes = !!opts.withFileTypes, this.signal = opts.signal, this.follow = !!opts.follow, this.dot = !!opts.dot, this.dotRelative = !!opts.dotRelative, this.nodir = !!opts.nodir, this.mark = !!opts.mark, opts.cwd ? (opts.cwd instanceof URL || opts.cwd.startsWith("file://")) && (opts.cwd = fileURLToPath3(opts.cwd)) : this.cwd = "", this.cwd = opts.cwd || "", this.root = opts.root, this.magicalBraces = !!opts.magicalBraces, this.nobrace = !!opts.nobrace, this.noext = !!opts.noext, this.realpath = !!opts.realpath, this.absolute = opts.absolute, this.includeChildMatches = opts.includeChildMatches !== !1, this.noglobstar = !!opts.noglobstar, this.matchBase = !!opts.matchBase, this.maxDepth = typeof opts.maxDepth == "number" ? opts.maxDepth : 1 / 0, this.stat = !!opts.stat, this.ignore = opts.ignore, this.withFileTypes && this.absolute !== void 0)
      throw new Error("cannot set absolute and withFileTypes:true");
    if (typeof pattern == "string" && (pattern = [pattern]), this.windowsPathsNoEscape = !!opts.windowsPathsNoEscape || opts.allowWindowsEscape === !1, this.windowsPathsNoEscape && (pattern = pattern.map((p) => p.replace(/\\/g, "/"))), this.matchBase) {
      if (opts.noglobstar)
        throw new TypeError("base matching requires globstar");
      pattern = pattern.map((p) => p.includes("/") ? p : `./**/${p}`);
    }
    if (this.pattern = pattern, this.platform = opts.platform || defaultPlatform3, this.opts = { ...opts, platform: this.platform }, opts.scurry) {
      if (this.scurry = opts.scurry, opts.nocase !== void 0 && opts.nocase !== opts.scurry.nocase)
        throw new Error("nocase option contradicts provided scurry option");
    } else {
      let Scurry = opts.platform === "win32" ? PathScurryWin32 : opts.platform === "darwin" ? PathScurryDarwin : opts.platform ? PathScurryPosix : PathScurry;
      this.scurry = new Scurry(this.cwd, {
        nocase: opts.nocase,
        fs: opts.fs
      });
    }
    this.nocase = this.scurry.nocase;
    let nocaseMagicOnly = this.platform === "darwin" || this.platform === "win32", mmo = {
      // default nocase based on platform
      ...opts,
      dot: this.dot,
      matchBase: this.matchBase,
      nobrace: this.nobrace,
      nocase: this.nocase,
      nocaseMagicOnly,
      nocomment: !0,
      noext: this.noext,
      nonegate: !0,
      optimizationLevel: 2,
      platform: this.platform,
      windowsPathsNoEscape: this.windowsPathsNoEscape,
      debug: !!this.opts.debug
    }, mms = this.pattern.map((p) => new Minimatch(p, mmo)), [matchSet, globParts] = mms.reduce((set, m) => (set[0].push(...m.set), set[1].push(...m.globParts), set), [[], []]);
    this.patterns = matchSet.map((set, i) => {
      let g = globParts[i];
      if (!g)
        throw new Error("invalid pattern object");
      return new Pattern(set, g, 0, this.platform);
    });
  }
  async walk() {
    return [
      ...await new GlobWalker(this.patterns, this.scurry.cwd, {
        ...this.opts,
        maxDepth: this.maxDepth !== 1 / 0 ? this.maxDepth + this.scurry.cwd.depth() : 1 / 0,
        platform: this.platform,
        nocase: this.nocase,
        includeChildMatches: this.includeChildMatches
      }).walk()
    ];
  }
  walkSync() {
    return [
      ...new GlobWalker(this.patterns, this.scurry.cwd, {
        ...this.opts,
        maxDepth: this.maxDepth !== 1 / 0 ? this.maxDepth + this.scurry.cwd.depth() : 1 / 0,
        platform: this.platform,
        nocase: this.nocase,
        includeChildMatches: this.includeChildMatches
      }).walkSync()
    ];
  }
  stream() {
    return new GlobStream(this.patterns, this.scurry.cwd, {
      ...this.opts,
      maxDepth: this.maxDepth !== 1 / 0 ? this.maxDepth + this.scurry.cwd.depth() : 1 / 0,
      platform: this.platform,
      nocase: this.nocase,
      includeChildMatches: this.includeChildMatches
    }).stream();
  }
  streamSync() {
    return new GlobStream(this.patterns, this.scurry.cwd, {
      ...this.opts,
      maxDepth: this.maxDepth !== 1 / 0 ? this.maxDepth + this.scurry.cwd.depth() : 1 / 0,
      platform: this.platform,
      nocase: this.nocase,
      includeChildMatches: this.includeChildMatches
    }).streamSync();
  }
  /**
   * Default sync iteration function. Returns a Generator that
   * iterates over the results.
   */
  iterateSync() {
    return this.streamSync()[Symbol.iterator]();
  }
  [Symbol.iterator]() {
    return this.iterateSync();
  }
  /**
   * Default async iteration function. Returns an AsyncGenerator that
   * iterates over the results.
   */
  iterate() {
    return this.stream()[Symbol.asyncIterator]();
  }
  [Symbol.asyncIterator]() {
    return this.iterate();
  }
};

// ../../node_modules/glob/dist/esm/has-magic.js
var hasMagic = (pattern, options = {}) => {
  Array.isArray(pattern) || (pattern = [pattern]);
  for (let p of pattern)
    if (new Minimatch(p, options).hasMagic())
      return !0;
  return !1;
};

// ../../node_modules/glob/dist/esm/index.js
function globStreamSync(pattern, options = {}) {
  return new Glob(pattern, options).streamSync();
}
function globStream(pattern, options = {}) {
  return new Glob(pattern, options).stream();
}
function globSync(pattern, options = {}) {
  return new Glob(pattern, options).walkSync();
}
async function glob_(pattern, options = {}) {
  return new Glob(pattern, options).walk();
}
function globIterateSync(pattern, options = {}) {
  return new Glob(pattern, options).iterateSync();
}
function globIterate(pattern, options = {}) {
  return new Glob(pattern, options).iterate();
}
var streamSync = globStreamSync, stream = Object.assign(globStream, { sync: globStreamSync }), iterateSync = globIterateSync, iterate = Object.assign(globIterate, {
  sync: globIterateSync
}), sync = Object.assign(globSync, {
  stream: globStreamSync,
  iterate: globIterateSync
}), glob = Object.assign(glob_, {
  glob: glob_,
  globSync,
  sync,
  globStream,
  stream,
  globStreamSync,
  streamSync,
  globIterate,
  iterate,
  globIterateSync,
  iterateSync,
  Glob,
  hasMagic,
  escape,
  unescape: unescape2
});
glob.glob = glob;

// ../../node_modules/slash/index.js
function slash(path2) {
  return path2.startsWith("\\\\?\\") ? path2 : path2.replace(/\\/g, "/");
}

// src/list-stories.ts
async function listStories(options) {
  let { normalizePath } = await import("vite");
  return (await Promise.all(
    normalizeStories(await options.presets.apply("stories", [], options), {
      configDir: options.configDir,
      workingDir: options.configDir
    }).map(({ directory, files }) => {
      let pattern = join2(directory, files), absolutePattern = isAbsolute2(pattern) ? pattern : join2(options.configDir, pattern);
      return glob(slash(absolutePattern), {
        ...commonGlobOptions(absolutePattern),
        follow: !0
      });
    })
  )).reduce((carry, stories) => carry.concat(stories.map(normalizePath)), []).sort();
}

// src/codegen-importfn-script.ts
function toImportPath(relativePath) {
  return relativePath.startsWith("../") ? relativePath : `./${relativePath}`;
}
async function toImportFn(stories) {
  let objectEntries = stories.map((file) => {
    let relativePath = relative(process.cwd(), file);
    return [toImportPath(relativePath), genDynamicImport(normalize(file))];
  });
  return dedent`
    const importers = ${genObjectFromRawEntries(objectEntries)};

    export async function importFn(path) {
      return await importers[path]();
    }
  `;
}
async function generateImportFnScriptCode(options) {
  let stories = await listStories(options);
  return await toImportFn(stories);
}

// src/codegen-modern-iframe-script.ts
import { getFrameworkName, loadPreviewOrConfigFile } from "storybook/internal/common";
import { STORY_HOT_UPDATED } from "storybook/internal/core-events";
import { isCsfFactoryPreview, readConfig } from "storybook/internal/csf-tools";

// ../../node_modules/pathe/dist/utils.mjs
var normalizedAliasSymbol = Symbol.for("pathe:normalizedAlias");
var FILENAME_RE = /(^|[/\\])([^/\\]+?)(?=(\.[^.]+)?$)/;
function filename(path2) {
  return path2.match(FILENAME_RE)?.[2];
}

// src/codegen-modern-iframe-script.ts
import { dedent as dedent2 } from "ts-dedent";

// src/utils/process-preview-annotation.ts
function processPreviewAnnotation(path2, projectRoot) {
  return typeof path2 == "object" ? path2.bare != null && path2.absolute === "" ? path2.bare : normalize(path2.absolute) : isAbsolute(path2) ? normalize(path2) : normalize(resolve(projectRoot, path2));
}

// src/virtual-file-names.ts
var SB_VIRTUAL_FILES = {
  VIRTUAL_APP_FILE: "virtual:/@storybook/builder-vite/vite-app.js",
  VIRTUAL_STORIES_FILE: "virtual:/@storybook/builder-vite/storybook-stories.js",
  VIRTUAL_PREVIEW_FILE: "virtual:/@storybook/builder-vite/preview-entry.js",
  VIRTUAL_ADDON_SETUP_FILE: "virtual:/@storybook/builder-vite/setup-addons.js"
};
function getResolvedVirtualModuleId(virtualModuleId) {
  return `\0${virtualModuleId}`;
}
function getOriginalVirtualModuleId(resolvedVirtualModuleId) {
  return resolvedVirtualModuleId.slice(1);
}

// src/codegen-modern-iframe-script.ts
async function generateModernIframeScriptCode(options, projectRoot) {
  let { presets, configDir } = options, frameworkName = await getFrameworkName(options), previewOrConfigFile = loadPreviewOrConfigFile({ configDir }), previewConfig = previewOrConfigFile ? await readConfig(previewOrConfigFile) : void 0, isCsf4 = previewConfig ? isCsfFactoryPreview(previewConfig) : !1, previewAnnotations = await presets.apply(
    "previewAnnotations",
    [],
    options
  );
  return generateModernIframeScriptCodeFromPreviews({
    previewAnnotations: [...previewAnnotations, previewOrConfigFile],
    projectRoot,
    frameworkName,
    isCsf4
  });
}
async function generateModernIframeScriptCodeFromPreviews(options) {
  let { projectRoot, frameworkName } = options, previewAnnotationURLs = options.previewAnnotations.filter((path2) => path2 !== void 0).map((path2) => processPreviewAnnotation(path2, projectRoot)), variables = [], imports = [];
  for (let previewAnnotation of previewAnnotationURLs) {
    let variable = genSafeVariableName(filename(previewAnnotation)).replace(/_(45|46|47)/g, "_") + "_" + hash(previewAnnotation);
    variables.push(variable), imports.push(genImport(previewAnnotation, { name: "*", as: variable }));
  }
  let previewFileURL = previewAnnotationURLs[previewAnnotationURLs.length - 1], previewFileVariable = variables[variables.length - 1], previewFileImport = imports[imports.length - 1], getPreviewAnnotationsFunction = options.isCsf4 ? dedent2`
  const getProjectAnnotations = (hmrPreviewAnnotationModules = []) => {
    const preview = hmrPreviewAnnotationModules[0] ?? ${previewFileVariable};
    return preview.default.composed;
  }` : dedent2`
  const getProjectAnnotations = (hmrPreviewAnnotationModules = []) => {
    const configs = ${genArrayFromRaw(
    variables.map(
      (previewAnnotation, index) => (
        // Prefer the updated module from an HMR update, otherwise the original module
        `hmrPreviewAnnotationModules[${index}] ?? ${previewAnnotation}`
      )
    ),
    "  "
  )}
    return composeConfigs(configs);
  }`, generateHMRHandler = () => frameworkName === "@storybook/web-components-vite" ? dedent2`
      if (import.meta.hot) {
        import.meta.hot.decline();
      }`.trim() : dedent2`
    if (import.meta.hot) {
      import.meta.hot.on('vite:afterUpdate', () => {
        window.__STORYBOOK_PREVIEW__.channel.emit('${STORY_HOT_UPDATED}');
      });

      import.meta.hot.accept('${SB_VIRTUAL_FILES.VIRTUAL_STORIES_FILE}', (newModule) => {
        // importFn has changed so we need to patch the new one in
        window.__STORYBOOK_PREVIEW__.onStoriesChanged({ importFn: newModule.importFn });
      });

      import.meta.hot.accept(${JSON.stringify(options.isCsf4 ? [previewFileURL] : previewAnnotationURLs)}, (previewAnnotationModules) => {
        // getProjectAnnotations has changed so we need to patch the new one in
        window.__STORYBOOK_PREVIEW__.onGetProjectAnnotationsChanged({ getProjectAnnotations: () => getProjectAnnotations(previewAnnotationModules) });
      });
    }`.trim();
  return dedent2`
  import { setup } from 'storybook/internal/preview/runtime';
  
  import '${SB_VIRTUAL_FILES.VIRTUAL_ADDON_SETUP_FILE}';
  
  setup();
  
  import { composeConfigs, PreviewWeb } from 'storybook/preview-api';
  import { isPreview } from 'storybook/internal/csf';
  import { importFn } from '${SB_VIRTUAL_FILES.VIRTUAL_STORIES_FILE}';
  
  ${options.isCsf4 ? previewFileImport : imports.join(`
`)}
  ${getPreviewAnnotationsFunction}
  
  window.__STORYBOOK_PREVIEW__ = window.__STORYBOOK_PREVIEW__ || new PreviewWeb(importFn, getProjectAnnotations);
  
  window.__STORYBOOK_STORY_STORE__ = window.__STORYBOOK_STORY_STORE__ || window.__STORYBOOK_PREVIEW__.storyStore;
  
  ${generateHMRHandler()};
  
  `.trim();
}
function hash(value) {
  return value.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0);
}

// src/codegen-set-addon-channel.ts
async function generateAddonSetupCode() {
  return `
    import { createBrowserChannel } from 'storybook/internal/channels';
    import { addons } from 'storybook/preview-api';

    const channel = createBrowserChannel({ page: 'preview' });
    addons.setChannel(channel);
    window.__STORYBOOK_ADDONS_CHANNEL__ = channel;
    
    if (window.CONFIG_TYPE === 'DEVELOPMENT'){
      window.__STORYBOOK_SERVER_CHANNEL__ = channel;
    }
  `.trim();
}

// src/transform-iframe-html.ts
import { normalizeStories as normalizeStories2 } from "storybook/internal/common";
async function transformIframeHtml(html, options) {
  let { configType, features, presets } = options, build3 = await presets.apply("build"), frameworkOptions = await presets.apply("frameworkOptions"), headHtmlSnippet = await presets.apply("previewHead"), bodyHtmlSnippet = await presets.apply("previewBody"), logLevel = await presets.apply("logLevel", void 0), docsOptions = await presets.apply("docs"), tagsOptions = await presets.apply("tags"), coreOptions = await presets.apply("core"), stories = normalizeStories2(await options.presets.apply("stories", [], options), {
    configDir: options.configDir,
    workingDir: process.cwd()
  }).map((specifier) => ({
    ...specifier,
    importPathMatcher: specifier.importPathMatcher.source
  })), otherGlobals = {
    ...build3?.test?.disableBlocks ? { __STORYBOOK_BLOCKS_EMPTY_MODULE__: {} } : {}
  }, transformedHtml = html.replace("[CONFIG_TYPE HERE]", configType || "").replace("[LOGLEVEL HERE]", logLevel || "").replace("'[FRAMEWORK_OPTIONS HERE]'", JSON.stringify(frameworkOptions)).replace(
    "('OTHER_GLOBALS HERE');",
    Object.entries(otherGlobals).map(([k, v]) => `window["${k}"] = ${JSON.stringify(v)};`).join("")
  ).replace(
    "'[CHANNEL_OPTIONS HERE]'",
    JSON.stringify(coreOptions && coreOptions.channelOptions ? coreOptions.channelOptions : {})
  ).replace("'[FEATURES HERE]'", JSON.stringify(features || {})).replace("'[STORIES HERE]'", JSON.stringify(stories || {})).replace("'[DOCS_OPTIONS HERE]'", JSON.stringify(docsOptions || {})).replace("'[TAGS_OPTIONS HERE]'", JSON.stringify(tagsOptions || {})).replace("<!-- [HEAD HTML SNIPPET HERE] -->", headHtmlSnippet || "").replace("<!-- [BODY HTML SNIPPET HERE] -->", bodyHtmlSnippet || "");
  return configType === "DEVELOPMENT" ? transformedHtml.replace(
    "virtual:/@storybook/builder-vite/vite-app.js",
    `/@id/__x00__${SB_VIRTUAL_FILES.VIRTUAL_APP_FILE}`
  ) : transformedHtml;
}

// src/plugins/code-generator-plugin.ts
function codeGeneratorPlugin(options) {
  let iframePath = fileURLToPath4(importMetaResolve("@storybook/builder-vite/input/iframe.html")), iframeId, projectRoot;
  return {
    name: "storybook:code-generator-plugin",
    enforce: "pre",
    configureServer(server2) {
      server2.watcher.on("change", () => {
        let appModule = server2.moduleGraph.getModuleById(
          getResolvedVirtualModuleId(SB_VIRTUAL_FILES.VIRTUAL_APP_FILE)
        );
        appModule && server2.moduleGraph.invalidateModule(appModule);
        let storiesModule = server2.moduleGraph.getModuleById(
          getResolvedVirtualModuleId(SB_VIRTUAL_FILES.VIRTUAL_STORIES_FILE)
        );
        storiesModule && server2.moduleGraph.invalidateModule(storiesModule);
      }), server2.watcher.on("add", (path2) => {
        (/\.stories\.([tj])sx?$/.test(path2) || /\.mdx$/.test(path2)) && server2.watcher.emit(
          "change",
          getResolvedVirtualModuleId(SB_VIRTUAL_FILES.VIRTUAL_STORIES_FILE)
        );
      });
    },
    config(config, { command }) {
      command === "build" && (config.build || (config.build = {}), config.build.rollupOptions = {
        ...config.build.rollupOptions,
        input: iframePath
      });
    },
    configResolved(config) {
      projectRoot = config.root, iframeId = `${config.root}/iframe.html`;
    },
    resolveId(source) {
      if (source === SB_VIRTUAL_FILES.VIRTUAL_APP_FILE)
        return getResolvedVirtualModuleId(SB_VIRTUAL_FILES.VIRTUAL_APP_FILE);
      if (source === iframePath)
        return iframeId;
      if (source === SB_VIRTUAL_FILES.VIRTUAL_STORIES_FILE)
        return getResolvedVirtualModuleId(SB_VIRTUAL_FILES.VIRTUAL_STORIES_FILE);
      if (source === SB_VIRTUAL_FILES.VIRTUAL_PREVIEW_FILE)
        return getResolvedVirtualModuleId(SB_VIRTUAL_FILES.VIRTUAL_PREVIEW_FILE);
      if (source === SB_VIRTUAL_FILES.VIRTUAL_ADDON_SETUP_FILE)
        return getResolvedVirtualModuleId(SB_VIRTUAL_FILES.VIRTUAL_ADDON_SETUP_FILE);
    },
    async load(id, config) {
      if (id === getResolvedVirtualModuleId(SB_VIRTUAL_FILES.VIRTUAL_STORIES_FILE))
        return generateImportFnScriptCode(options);
      if (id === getResolvedVirtualModuleId(SB_VIRTUAL_FILES.VIRTUAL_ADDON_SETUP_FILE))
        return generateAddonSetupCode();
      if (id === getResolvedVirtualModuleId(SB_VIRTUAL_FILES.VIRTUAL_APP_FILE))
        return generateModernIframeScriptCode(options, projectRoot);
      if (id === iframeId)
        return readFileSync(
          fileURLToPath4(importMetaResolve("@storybook/builder-vite/input/iframe.html")),
          "utf-8"
        );
    },
    async transformIndexHtml(html, ctx) {
      if (ctx.path === "/iframe.html")
        return transformIframeHtml(html, options);
    }
  };
}

// src/plugins/csf-plugin.ts
import { vite } from "@storybook/csf-plugin";
async function csfPlugin(config) {
  let { presets } = config, docsOptions = (
    // @ts-expect-error - not sure what type to use here
    (await presets.apply("addons", [])).find((a) => [a, a.name].includes("@storybook/addon-docs"))?.options ?? {}
  ), enrichCsf = await presets.apply("experimental_enrichCsf");
  return vite({
    ...docsOptions?.csfPluginOptions,
    enrichCsf
  });
}

// src/plugins/external-globals-plugin.ts
import { existsSync as existsSync3 } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname as dirname4, join as join6 } from "node:path";

// ../../node_modules/empathic/package.mjs
import { env } from "node:process";
import { dirname as dirname3, join as join5 } from "node:path";
import { existsSync as existsSync2, mkdirSync } from "node:fs";

// ../../node_modules/empathic/access.mjs
import { accessSync, constants } from "node:fs";
function ok(path2, mode) {
  try {
    return accessSync(path2, mode), !0;
  } catch {
    return !1;
  }
}
function writable(path2) {
  return ok(path2, constants.W_OK);
}

// ../../node_modules/empathic/find.mjs
import { join as join4 } from "node:path";
import { existsSync, statSync } from "node:fs";

// ../../node_modules/empathic/walk.mjs
import { dirname as dirname2 } from "node:path";

// ../../node_modules/empathic/resolve.mjs
import { isAbsolute as isAbsolute3, join as join3, resolve as resolve2 } from "node:path";
function absolute(input, root) {
  return isAbsolute3(input) ? input : resolve2(root || ".", input);
}

// ../../node_modules/empathic/walk.mjs
function up(base, options) {
  let { last, cwd } = options || {}, tmp = absolute(base, cwd), root = absolute(last || "/", cwd), prev, arr = [];
  for (; prev !== root && (arr.push(tmp), tmp = dirname2(prev = tmp), tmp !== prev); )
    ;
  return arr;
}

// ../../node_modules/empathic/find.mjs
function up2(name, options) {
  let dir, tmp, start2 = options && options.cwd || "";
  for (dir of up(start2, options))
    if (tmp = join4(dir, name), existsSync(tmp)) return tmp;
}

// ../../node_modules/empathic/package.mjs
function up3(options) {
  return up2("package.json", options);
}
function cache(name, options) {
  options = options || {};
  let dir = env.CACHE_DIR;
  if (!dir || /^(1|0|true|false)$/.test(dir)) {
    let pkg = up3(options);
    if (dir = pkg && dirname3(pkg)) {
      let mods = join5(dir, "node_modules"), exists = existsSync2(mods);
      if (!writable(exists ? mods : dir)) return;
      dir = join5(mods, ".cache");
    }
  }
  if (dir)
    return dir = join5(dir, name), options.create && !existsSync2(dir) && mkdirSync(dir, { recursive: !0 }), dir;
}

// src/plugins/external-globals-plugin.ts
var escapeKeys = (key) => key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), defaultImportRegExp = "import ([^*{}]+) from", replacementMap = /* @__PURE__ */ new Map([
  ["import ", "const "],
  ["import{", "const {"],
  ["* as ", ""],
  [" as ", ": "],
  [" from ", " = "],
  ["}from", "} ="]
]);
async function externalGlobalsPlugin(externals) {
  await init;
  let { mergeAlias } = await import("vite");
  return {
    name: "storybook:external-globals-plugin",
    enforce: "post",
    // In dev (serve), we set up aliases to files that we write into node_modules/.cache.
    async config(config, { command }) {
      if (command !== "serve")
        return;
      let newAlias = mergeAlias([], config.resolve?.alias), cachePath = cache("sb-vite-plugin-externals", { create: !0 }) ?? join6(process.cwd(), "node_modules", ".cache", "sb-vite-plugin-externals");
      return await Promise.all(
        Object.keys(externals).map(async (externalKey) => {
          let externalCachePath = join6(cachePath, `${externalKey}.js`);
          if (newAlias.push({ find: new RegExp(`^${externalKey}$`), replacement: externalCachePath }), !existsSync3(externalCachePath)) {
            let directory = dirname4(externalCachePath);
            await mkdir(directory, { recursive: !0 });
          }
          await writeFile(externalCachePath, `module.exports = ${externals[externalKey]};`);
        })
      ), {
        resolve: {
          alias: newAlias
        }
      };
    },
    // Replace imports with variables destructured from global scope
    async transform(code, id) {
      let globalsList = Object.keys(externals);
      if (globalsList.every((glob2) => !code.includes(glob2)))
        return;
      let [imports] = parse(code), src = new MagicString(code);
      return imports.forEach(({ n: path2, ss: startPosition, se: endPosition }) => {
        let packageName = path2;
        if (packageName && globalsList.includes(packageName)) {
          let importStatement = src.slice(startPosition, endPosition), transformedImport = rewriteImport(importStatement, externals, packageName);
          src.update(startPosition, endPosition, transformedImport);
        }
      }), {
        code: src.toString(),
        map: null
      };
    }
  };
}
function getDefaultImportReplacement(match2) {
  let matched = match2.match(defaultImportRegExp);
  return matched && `const {default: ${matched[1]}} =`;
}
function getSearchRegExp(packageName) {
  let staticKeys = [...replacementMap.keys()].map(escapeKeys), packageNameLiteral = `.${packageName}.`, dynamicImportExpression = `await import\\(.${packageName}.\\)`, lookup = [defaultImportRegExp, ...staticKeys, packageNameLiteral, dynamicImportExpression];
  return new RegExp(`(${lookup.join("|")})`, "g");
}
function rewriteImport(importStatement, globs, packageName) {
  let search = getSearchRegExp(packageName);
  return importStatement.replace(
    search,
    (match2) => replacementMap.get(match2) ?? getDefaultImportReplacement(match2) ?? globs[packageName]
  );
}

// src/plugins/webpack-stats-plugin.ts
import { relative as relative2 } from "node:path";
function stripQueryParams(filePath) {
  return filePath.split("?")[0];
}
function isUserCode(moduleName) {
  return moduleName ? Object.values(SB_VIRTUAL_FILES).includes(getOriginalVirtualModuleId(moduleName)) ? !0 : !moduleName.startsWith("vite/") && !moduleName.startsWith("\0") && moduleName !== "react/jsx-runtime" : !1;
}
function pluginWebpackStats({ workingDir }) {
  function normalize3(filename2) {
    if (filename2.startsWith("virtual:"))
      return `/${filename2}`;
    if (Object.values(SB_VIRTUAL_FILES).includes(getOriginalVirtualModuleId(filename2)))
      return `/${getOriginalVirtualModuleId(filename2)}`;
    {
      let relativePath = relative2(workingDir, stripQueryParams(filename2));
      return `./${slash(relativePath)}`;
    }
  }
  function createReasons(importers) {
    return (importers || []).map((i) => ({ moduleName: normalize3(i) }));
  }
  function createStatsMapModule(filename2, importers) {
    return {
      id: filename2,
      name: filename2,
      reasons: createReasons(importers)
    };
  }
  let statsMap = /* @__PURE__ */ new Map();
  return {
    name: "storybook:rollup-plugin-webpack-stats",
    // We want this to run after the vite build plugins (https://vitejs.dev/guide/api-plugin.html#plugin-ordering)
    enforce: "post",
    moduleParsed: function(mod) {
      isUserCode(mod.id) && mod.importedIds.concat(mod.dynamicallyImportedIds).filter((name) => isUserCode(name)).forEach((depIdUnsafe) => {
        let depId = normalize3(depIdUnsafe);
        if (!statsMap.has(depId)) {
          statsMap.set(depId, createStatsMapModule(depId, [mod.id]));
          return;
        }
        let m = statsMap.get(depId);
        m && (m.reasons = (m.reasons ?? []).concat(createReasons([mod.id])).filter((r) => r.moduleName !== depId), statsMap.set(depId, m));
      });
    },
    storybookGetStats() {
      let stats = { modules: Array.from(statsMap.values()) };
      return { ...stats, toJson: () => stats };
    }
  };
}

// src/vite-config.ts
var configEnvServe = {
  mode: "development",
  command: "serve",
  isSsrBuild: !1
}, configEnvBuild = {
  mode: "production",
  command: "build",
  isSsrBuild: !1
};
async function commonConfig(options, _type) {
  let configEnv = _type === "development" ? configEnvServe : configEnvBuild, { loadConfigFromFile, mergeConfig, defaultClientConditions = [] } = await import("vite"), { viteConfigPath } = await getBuilderOptions(options), projectRoot = resolve3(options.configDir, ".."), { config: { build: buildProperty = void 0, ...userConfig } = {} } = await loadConfigFromFile(configEnv, viteConfigPath, projectRoot) ?? {}, sbConfig = {
    configFile: !1,
    cacheDir: resolvePathInStorybookCache("sb-vite", options.cacheKey),
    root: projectRoot,
    // Allow storybook deployed as subfolder.  See https://github.com/storybookjs/builder-vite/issues/238
    base: "./",
    plugins: await pluginConfig(options),
    resolve: {
      conditions: ["storybook", "stories", "test", ...defaultClientConditions],
      preserveSymlinks: isPreservingSymlinks()
    },
    // If an envPrefix is specified in the vite config, add STORYBOOK_ to it,
    // otherwise, add VITE_ and STORYBOOK_ so that vite doesn't lose its default.
    envPrefix: userConfig.envPrefix ? ["STORYBOOK_"] : ["VITE_", "STORYBOOK_"],
    // Pass build.target option from user's vite config
    build: {
      target: buildProperty?.target
    }
  };
  return mergeConfig(userConfig, sbConfig);
}
async function pluginConfig(options) {
  let build3 = await options.presets.apply("build"), externals = globalsNameReferenceMap;
  return build3?.test?.disableBlocks && (externals["@storybook/addon-docs/blocks"] = "__STORYBOOK_BLOCKS_EMPTY_MODULE__"), [
    codeGeneratorPlugin(options),
    await csfPlugin(options),
    await injectExportOrderPlugin(),
    await stripStoryHMRBoundary(),
    {
      name: "storybook:allow-storybook-dir",
      enforce: "post",
      config(config) {
        config?.server?.fs?.allow && config.server.fs.allow.push(options.configDir);
      }
    },
    await externalGlobalsPlugin(externals),
    pluginWebpackStats({ workingDir: process.cwd() })
  ];
}

// src/build.ts
function findPlugin(config, name) {
  return config.plugins?.find((p) => p && "name" in p && p.name === name);
}
async function build(options) {
  let { build: viteBuild, mergeConfig } = await import("vite"), { presets } = options, config = await commonConfig(options, "build");
  config.build = mergeConfig(config, {
    build: {
      outDir: options.outputDir,
      emptyOutDir: !1,
      // do not clean before running Vite build - Storybook has already added assets in there!
      rollupOptions: {
        external: [/\.\/sb-common-assets\/.*\.woff2/]
      },
      ...options.test ? {
        reportCompressedSize: !1,
        sourcemap: !options.build?.test?.disableSourcemaps,
        target: "esnext",
        treeshake: !options.build?.test?.disableTreeShaking
      } : {}
    }
  }).build;
  let finalConfig = await presets.apply("viteFinal", config, options);
  options.features?.developmentModeForBuild && finalConfig.plugins?.push({
    name: "storybook:define-env",
    config: () => ({
      define: {
        "process.env.NODE_ENV": JSON.stringify("development")
      }
    })
  });
  let turbosnapPluginName = "rollup-plugin-turbosnap";
  return finalConfig.plugins && await hasVitePlugins(finalConfig.plugins, [turbosnapPluginName]) && (logger2.warn(dedent3`Found '${turbosnapPluginName}' which is now included by default in Storybook 8.
      Removing from your plugins list. Ensure you pass \`--stats-json\` to generate stats.

      For more information, see https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#turbosnap-vite-plugin-is-no-longer-needed`), finalConfig.plugins = await withoutVitePlugins(finalConfig.plugins, [turbosnapPluginName])), finalConfig.customLogger ??= await createViteLogger(), await viteBuild(await sanitizeEnvVars(options, finalConfig)), findPlugin(
    finalConfig,
    "storybook:rollup-plugin-webpack-stats"
  )?.storybookGetStats();
}

// src/vite-server.ts
import { logger as logger3 } from "storybook/internal/node-logger";
import { dedent as dedent4 } from "ts-dedent";

// src/optimizeDeps.ts
import { relative as relative3 } from "node:path";

// src/constants.ts
var INCLUDE_CANDIDATES = [
  "@ampproject/remapping",
  "@base2/pretty-print-object",
  "@emotion/core",
  "@emotion/is-prop-valid",
  "@emotion/styled",
  "@jridgewell/sourcemap-codec",
  "acorn-jsx",
  "acorn-walk",
  "acorn",
  "airbnb-js-shims",
  "ansi-to-html",
  "aria-query",
  "axe-core",
  "axobject-query",
  "chromatic/isChromatic",
  "color-convert",
  "deep-object-diff",
  "doctrine",
  "emotion-theming",
  "escodegen",
  "estraverse",
  "fast-deep-equal",
  "html-tags",
  "isobject",
  "loader-utils",
  "lodash/camelCase.js",
  "lodash/camelCase",
  "lodash/cloneDeep.js",
  "lodash/cloneDeep",
  "lodash/countBy.js",
  "lodash/countBy",
  "lodash/debounce.js",
  "lodash/debounce",
  "lodash/isEqual.js",
  "lodash/isEqual",
  "lodash/isFunction.js",
  "lodash/isFunction",
  "lodash/isPlainObject.js",
  "lodash/isPlainObject",
  "lodash/isString.js",
  "lodash/isString",
  "lodash/kebabCase.js",
  "lodash/kebabCase",
  "lodash/mapKeys.js",
  "lodash/mapKeys",
  "lodash/mapValues.js",
  "lodash/mapValues",
  "lodash/merge.js",
  "lodash/merge",
  "lodash/mergeWith.js",
  "lodash/mergeWith",
  "lodash/pick.js",
  "lodash/pick",
  "lodash/pickBy.js",
  "lodash/pickBy",
  "lodash/startCase.js",
  "lodash/startCase",
  "lodash/throttle.js",
  "lodash/throttle",
  "lodash/uniq.js",
  "lodash/uniq",
  "lodash/upperFirst.js",
  "lodash/upperFirst",
  "memoizerific",
  "mockdate",
  "msw-storybook-addon",
  "overlayscrollbars",
  "polished",
  "prettier/parser-babel",
  "prettier/parser-flow",
  "prettier/parser-typescript",
  "prop-types",
  "qs",
  "react-dom",
  "react-dom/client",
  "react-dom/test-utils",
  "react-fast-compare",
  "react-is",
  "react-textarea-autosize",
  "react",
  "react/jsx-dev-runtime",
  "react/jsx-runtime",
  "refractor/core",
  "refractor/lang/bash.js",
  "refractor/lang/css.js",
  "refractor/lang/graphql.js",
  "refractor/lang/js-extras.js",
  "refractor/lang/json.js",
  "refractor/lang/jsx.js",
  "refractor/lang/markdown.js",
  "refractor/lang/markup.js",
  "refractor/lang/tsx.js",
  "refractor/lang/typescript.js",
  "refractor/lang/yaml.js",
  "regenerator-runtime/runtime.js",
  "sb-original/default-loader",
  "sb-original/image-context",
  "semver",
  // TODO: Remove once https://github.com/npm/node-semver/issues/712 is fixed
  "slash",
  "store2",
  "storybook/actions",
  "storybook/actions/decorator",
  "storybook/internal/core-events",
  "storybook/internal/csf",
  "storybook/internal/preview/runtime",
  "storybook/preview-api",
  "storybook/viewport",
  "synchronous-promise",
  "telejson",
  "ts-dedent",
  "unfetch",
  "util-deprecate",
  "vue",
  "warning"
];

// src/optimizeDeps.ts
var asyncFilter = async (arr, predicate) => Promise.all(arr.map(predicate)).then((results) => arr.filter((_v, index) => results[index]));
async function getOptimizeDeps(config, options) {
  let extraOptimizeDeps = await options.presets.apply("optimizeViteDeps", []), { root = process.cwd() } = config, { normalizePath, resolveConfig } = await import("vite"), stories = (await listStories(options)).map((storyPath) => normalizePath(relative3(root, storyPath))), resolve4 = (await resolveConfig(config, "serve", "development")).createResolver({ asSrc: !1 }), include = await asyncFilter(INCLUDE_CANDIDATES, async (id) => !!await resolve4(id));
  return {
    ...config.optimizeDeps,
    // We don't need to resolve the glob since vite supports globs for entries.
    entries: stories,
    // We need Vite to precompile these dependencies, because they contain non-ESM code that would break
    // if we served it directly to the browser.
    include: [...include, ...extraOptimizeDeps, ...config.optimizeDeps?.include || []]
  };
}

// src/vite-server.ts
async function createViteServer(options, devServer) {
  let { presets } = options, commonCfg = await commonConfig(options, "development"), config = {
    ...commonCfg,
    // Set up dev server
    server: {
      middlewareMode: !0,
      hmr: {
        port: options.port,
        server: devServer
      },
      fs: {
        strict: !0
      }
    },
    appType: "custom",
    optimizeDeps: await getOptimizeDeps(commonCfg, options)
  };
  options.host === "0.0.0.0" && !config.server.allowedHosts && (config.server.allowedHosts = !0, logger3.warn(dedent4`'host' is set to '0.0.0.0' but 'allowedHosts' is not defined.
      Defaulting 'allowedHosts' to true, which permits all hostnames.
      To restrict allowed hostnames, add the following to your 'viteFinal' config:
      Example: { server: { allowedHosts: ['mydomain.com'] } }
      See:
      - https://vite.dev/config/server-options.html#server-allowedhosts
      - https://storybook.js.org/docs/api/main-config/main-config-vite-final
    `));
  let finalConfig = await presets.apply("viteFinal", config, options), { createServer } = await import("vite");
  return finalConfig.customLogger ??= await createViteLogger(), createServer(await sanitizeEnvVars(options, finalConfig));
}

// src/index.ts
function iframeHandler(options, server2) {
  return async (req, res) => {
    let indexHtml = await readFile(
      fileURLToPath5(import.meta.resolve("@storybook/builder-vite/input/iframe.html")),
      {
        encoding: "utf8"
      }
    ), transformed = await server2.transformIndexHtml("/iframe.html", indexHtml);
    res.setHeader("Content-Type", "text/html"), res.statusCode = 200, res.write(transformed), res.end();
  };
}
var server;
async function bail() {
  return server?.close();
}
var start = async ({
  startTime,
  options,
  router,
  server: devServer
}) => (server = await createViteServer(options, devServer), router.get("/iframe.html", iframeHandler(options, server)), router.use(server.middlewares), {
  bail,
  stats: {
    toJson: () => {
      throw new NoStatsForViteDevError();
    }
  },
  totalTime: process.hrtime(startTime)
}), build2 = async ({ options }) => build(options), corePresets = [import.meta.resolve("./preset.js")];
export {
  bail,
  build2 as build,
  corePresets,
  hasVitePlugins,
  start,
  withoutVitePlugins
};

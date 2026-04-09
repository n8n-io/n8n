import CJS_COMPAT_NODE_URL_dtl570gwrw from 'node:url';
import CJS_COMPAT_NODE_PATH_dtl570gwrw from 'node:path';
import CJS_COMPAT_NODE_MODULE_dtl570gwrw from "node:module";

var __filename = CJS_COMPAT_NODE_URL_dtl570gwrw.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_dtl570gwrw.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_dtl570gwrw.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import {
  SB_VIRTUAL_FILES,
  SB_VIRTUAL_FILE_IDS,
  VIRTUAL_ID,
  __commonJS,
  __toESM,
  genDynamicImport,
  genObjectFromRawEntries,
  getOriginalVirtualModuleId,
  getResolvedVirtualModuleId,
  getUniqueImportPaths,
  join,
  normalize,
  relative,
  viteCorePlugins
} from "./_node-chunks/chunk-YEI2VLDL.js";

// ../../../node_modules/picocolors/picocolors.js
var require_picocolors = __commonJS({
  "../../../node_modules/picocolors/picocolors.js"(exports, module) {
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

// src/index.ts
import { readFile } from "node:fs/promises";
import { fileURLToPath as fileURLToPath3 } from "node:url";
import { NoStatsForViteDevError } from "storybook/internal/server-errors";

// src/build.ts
import { logger as logger2 } from "storybook/internal/node-logger";
import { dedent as dedent3 } from "ts-dedent";

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

// src/utils/vite-features.ts
import { version } from "vite";
var shouldUseRolldownOptions = () => {
  try {
    return Number(version.split(".")[0]) >= 8;
  } catch {
    return !1;
  }
}, bundlerOptionsKey = shouldUseRolldownOptions() ? "rolldownOptions" : "rollupOptions";
function ensureRolldownOptions(config) {
  if (!shouldUseRolldownOptions())
    return;
  config.build ??= {};
  let rolldown = config.build.rolldownOptions ??= {}, output = rolldown.output ??= {};
  output.strictExecutionOrder = !0;
}

// src/utils/without-vite-plugins.ts
var withoutVitePlugins = async (plugins = [], namesToRemove) => {
  let result = [], resolvedPlugins = await Promise.all(plugins);
  for (let plugin of resolvedPlugins)
    Array.isArray(plugin) ? result.push(await withoutVitePlugins(plugin, namesToRemove)) : plugin && typeof plugin == "object" && "name" in plugin && typeof plugin.name == "string" && !namesToRemove.includes(plugin.name) && result.push(plugin);
  return result;
};

// src/vite-config.ts
import { resolve as resolve2 } from "node:path";
import { getBuilderOptions, resolvePathInStorybookCache } from "storybook/internal/common";

// src/plugins/code-generator-plugin.ts
import { readFileSync } from "node:fs";
import { fileURLToPath as fileURLToPath2 } from "node:url";

// ../../core/src/shared/utils/module.ts
import { fileURLToPath, pathToFileURL } from "node:url";

// ../../../node_modules/exsolve/dist/index.mjs
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
  let types = [], instances = [], other = [];
  for (let value of expected)
    assert.ok(typeof value == "string", "All expected entries have to be of type string"), kTypes.has(value) ? types.push(value.toLowerCase()) : classRegExp.exec(value) === null ? (assert.ok(value !== "object", 'The value "object" should be written as "Object"'), other.push(value)) : instances.push(value);
  if (instances.length > 0) {
    let pos = types.indexOf("object");
    pos !== -1 && (types.slice(pos, 1), instances.push("Object"));
  }
  return types.length > 0 && (message += `${types.length > 1 ? "one of type" : "of type"} ${formatList(types, "or")}`, (instances.length > 0 || other.length > 0) && (message += " or ")), instances.length > 0 && (message += `an instance of ${formatList(instances, "or")}`, other.length > 0 && (message += " or ")), other.length > 0 && (other.length > 1 ? message += `one of ${formatList(other, "or")}` : (other[0]?.toLowerCase() !== other[0] && (message += "an "), message += `${other[0]}`)), message += `. Received ${determineSpecificType(actual)}`, message;
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

// src/codegen-importfn-script.ts
import { dedent } from "ts-dedent";
function generateImportFnScriptCode(index) {
  let objectEntries = getUniqueImportPaths(index).map(
    (importPath) => {
      if (importPath.startsWith("virtual:"))
        return [importPath, genDynamicImport(importPath)];
      let relativePath = normalize(relative(process.cwd(), importPath)), normalizedRelativePath = relativePath.startsWith("../") ? relativePath : `./${relativePath}`, absolutePath = normalize(join(process.cwd(), importPath));
      return [normalizedRelativePath, genDynamicImport(absolutePath)];
    }
  );
  return dedent`
    const importers = ${genObjectFromRawEntries(objectEntries)};

    export async function importFn(path) {
      return await importers[path]();
    }
  `;
}

// src/codegen-modern-iframe-script.ts
import { getFrameworkName } from "storybook/internal/common";
import { STORY_HOT_UPDATED } from "storybook/internal/core-events";
import { dedent as dedent2 } from "ts-dedent";
async function generateModernIframeScriptCode(options) {
  let frameworkName = await getFrameworkName(options);
  return generateModernIframeScriptCodeFromPreviews({
    frameworkName
  });
}
async function generateModernIframeScriptCodeFromPreviews(options) {
  let { frameworkName } = options, generateHMRHandler = () => frameworkName === "@storybook/web-components-vite" ? dedent2`
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
    }`.trim();
  return dedent2`
  import { setup } from 'storybook/internal/preview/runtime';
  
  import '${SB_VIRTUAL_FILES.VIRTUAL_ADDON_SETUP_FILE}';
  
  setup();
  
  import { PreviewWeb } from 'storybook/preview-api';
  import { importFn } from '${SB_VIRTUAL_FILES.VIRTUAL_STORIES_FILE}';
  import { getProjectAnnotations } from '${VIRTUAL_ID}';
    
  window.__STORYBOOK_PREVIEW__ = window.__STORYBOOK_PREVIEW__ || new PreviewWeb(importFn, getProjectAnnotations);
  
  window.__STORYBOOK_STORY_STORE__ = window.__STORYBOOK_STORY_STORE__ || window.__STORYBOOK_PREVIEW__.storyStore;
  
  ${generateHMRHandler()};
  
  `.trim();
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
import { normalizeStories } from "storybook/internal/common";
async function transformIframeHtml(html, options) {
  let { configType, features, presets } = options, build3 = await presets.apply("build"), frameworkOptions = await presets.apply("frameworkOptions"), headHtmlSnippet = await presets.apply("previewHead"), bodyHtmlSnippet = await presets.apply("previewBody"), logLevel = await presets.apply("logLevel", void 0), docsOptions = await presets.apply("docs"), tagsOptions = await presets.apply("tags"), coreOptions = await presets.apply("core"), stories = normalizeStories(await options.presets.apply("stories", [], options), {
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
  let iframePath = fileURLToPath2(importMetaResolve("@storybook/builder-vite/input/iframe.html")), iframeId, storyIndexGeneratorPromise = options.presets.apply("storyIndexGenerator");
  return {
    name: "storybook:code-generator-plugin",
    enforce: "pre",
    async configureServer(server2) {
      (await storyIndexGeneratorPromise).onInvalidated(() => {
        server2.watcher.emit(
          "change",
          getResolvedVirtualModuleId(SB_VIRTUAL_FILES.VIRTUAL_STORIES_FILE)
        );
      });
    },
    config(config, { command }) {
      if (command === "build") {
        config.build || (config.build = {});
        let build3 = config.build;
        build3[bundlerOptionsKey] = {
          ...build3[bundlerOptionsKey],
          input: iframePath
        }, ensureRolldownOptions(config);
      }
    },
    configResolved(config) {
      iframeId = `${config.root}/iframe.html`;
    },
    resolveId(source) {
      if (SB_VIRTUAL_FILE_IDS.includes(source))
        return getResolvedVirtualModuleId(source);
      if (source === iframePath)
        return iframeId;
    },
    async load(id) {
      switch (id) {
        case getResolvedVirtualModuleId(SB_VIRTUAL_FILES.VIRTUAL_STORIES_FILE): {
          let index = await (await storyIndexGeneratorPromise)?.getIndex();
          return generateImportFnScriptCode(index);
        }
        case getResolvedVirtualModuleId(SB_VIRTUAL_FILES.VIRTUAL_ADDON_SETUP_FILE):
          return generateAddonSetupCode();
        case getResolvedVirtualModuleId(SB_VIRTUAL_FILES.VIRTUAL_APP_FILE):
          return generateModernIframeScriptCode(options);
        case iframeId:
          return readFileSync(
            fileURLToPath2(importMetaResolve("@storybook/builder-vite/input/iframe.html")),
            "utf-8"
          );
      }
    },
    async transformIndexHtml(html, ctx) {
      if (ctx.path === "/iframe.html")
        return transformIframeHtml(html, options);
    }
  };
}

// ../../../node_modules/es-module-lexer/dist/lexer.js
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
  return A2 = "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GzYCHAtBAEEAKAKwCkECajYCsAoCQAJAAkACQEEAECkiAUHhAEYNACABQfcARg0BQQAoArAKIQEMAgtBACgCsAoiAUECakHACEEKEC8NAUEGIQIMAgtBACgCsAoiAS8BAkHpAEcNACABLwEEQfQARw0AQQQhAiABLwEGQegARg0BC0EAIAFBfmo2ArAKDwtBACABIAJBAXRqNgKwCgJAQQEQKUH7AEYNAEEAIAE2ArAKDwtBACgCsAoiACECA0BBACACQQJqNgKwCgJAAkACQEEBECkiAkEiRg0AIAJBJ0cNAUEnEBpBAEEAKAKwCkECajYCsApBARApIQIMAgtBIhAaQQBBACgCsApBAmo2ArAKQQEQKSECDAELIAIQLCECCwJAIAJBOkYNAEEAIAE2ArAKDwtBAEEAKAKwCkECajYCsAoCQEEBECkiAkEiRg0AIAJBJ0YNAEEAIAE2ArAKDwsgAhAaQQBBACgCsApBAmo2ArAKAkACQEEBECkiAkEsRg0AIAJB/QBGDQFBACABNgKwCg8LQQBBACgCsApBAmo2ArAKQQEQKUH9AEYNAEEAKAKwCiECDAELC0EAKALwCSIBIAA2AhAgAUEAKAKwCkECajYCDAttAQJ/AkACQANAAkAgAEH//wNxIgFBd2oiAkEXSw0AQQEgAnRBn4CABHENAgsgAUGgAUYNASAAIQIgARAoDQJBACECQQBBACgCsAoiAEECajYCsAogAC8BAiIADQAMAgsLIAAhAgsgAkH//wNxC6sBAQR/AkACQEEAKAKwCiICLwEAIgNB4QBGDQAgASEEIAAhBQwBC0EAIAJBBGo2ArAKQQEQKSECQQAoArAKIQUCQAJAIAJBIkYNACACQSdGDQAgAhAsGkEAKAKwCiEEDAELIAIQGkEAQQAoArAKQQJqIgQ2ArAKC0EBECkhA0EAKAKwCiECCwJAIAIgBUYNACAFIARBACAAIAAgAUYiAhtBACABIAIbEAILIAMLcgEEf0EAKAKwCiEAQQAoArQKIQECQAJAA0AgAEECaiECIAAgAU8NAQJAAkAgAi8BACIDQaR/ag4CAQQACyACIQAgA0F2ag4EAgEBAgELIABBBGohAAwACwtBACACNgKwChAlQQAPC0EAIAI2ArAKQd0AC0kBA39BACEDAkAgAkUNAAJAA0AgAC0AACIEIAEtAAAiBUcNASABQQFqIQEgAEEBaiEAIAJBf2oiAg0ADAILCyAEIAVrIQMLIAMLC+wBAgBBgAgLzgEAAHgAcABvAHIAdABtAHAAbwByAHQAZgBvAHIAZQB0AGEAbwB1AHIAYwBlAHIAbwBtAHUAbgBjAHQAaQBvAG4AcwBzAGUAcgB0AHYAbwB5AGkAZQBkAGUAbABlAGMAbwBuAHQAaQBuAGkAbgBzAHQAYQBuAHQAeQBiAHIAZQBhAHIAZQB0AHUAcgBkAGUAYgB1AGcAZwBlAGEAdwBhAGkAdABoAHIAdwBoAGkAbABlAGkAZgBjAGEAdABjAGYAaQBuAGEAbABsAGUAbABzAABB0AkLEAEAAAACAAAAAAQAAEA5AAA=", typeof Buffer < "u" ? Buffer.from(A2, "base64") : Uint8Array.from(atob(A2), ((A3) => A3.charCodeAt(0)));
  var A2;
}, init = WebAssembly.compile(E()).then(WebAssembly.instantiate).then((({ exports: A2 }) => {
  C = A2;
}));

// ../../../node_modules/@jridgewell/sourcemap-codec/dist/sourcemap-codec.mjs
var comma = 44, semicolon = 59, chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/", intToChar = new Uint8Array(64), charToInt = new Uint8Array(128);
for (let i = 0; i < chars.length; i++) {
  let c = chars.charCodeAt(i);
  intToChar[i] = c, charToInt[c] = i;
}
function encodeInteger(builder, num, relative3) {
  let delta = num - relative3;
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

// ../../../node_modules/magic-string/dist/magic-string.es.mjs
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
    let shouldIndentNextCharacter = options.indentStart !== !1, replacer = (match) => shouldIndentNextCharacter ? `${indentStr}${match}` : (shouldIndentNextCharacter = !0, match);
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
    function getReplacement(match, str) {
      return typeof replacement == "string" ? replacement.replace(/\$(\$|&|\d+)/g, (_, i) => i === "$" ? "$" : i === "&" ? match[0] : +i < match.length ? match[+i] : `$${i}`) : replacement(...match, match.index, str, match.groups);
    }
    function matchAll(re, str) {
      let match, matches = [];
      for (; match = re.exec(str); )
        matches.push(match);
      return matches;
    }
    if (searchValue.global)
      matchAll(searchValue, this.original).forEach((match) => {
        if (match.index != null) {
          let replacement2 = getReplacement(match, this.original);
          replacement2 !== match[0] && this.overwrite(match.index, match.index + match[0].length, replacement2);
        }
      });
    else {
      let match = this.original.match(searchValue);
      if (match && match.index != null) {
        let replacement2 = getReplacement(match, this.original);
        replacement2 !== match[0] && this.overwrite(match.index, match.index + match[0].length, replacement2);
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
  let { createFilter } = await import("vite"), filter = createFilter([/\.stories\.([tj])sx?$/, /(stories|story).mdx$/]);
  return {
    name: "storybook:inject-export-order-plugin",
    // This should only run after the typescript has been transpiled
    enforce: "post",
    async transform(code, id) {
      if (!filter(id))
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
  let { createFilter } = await import("vite"), filter = createFilter(/\.stories\.(tsx?|jsx?|svelte|vue)$/);
  return {
    name: "storybook:strip-hmr-boundary-plugin",
    enforce: "post",
    async transform(src, id) {
      if (!filter(id))
        return;
      let s = new MagicString(src);
      return s.replace(/import\.meta\.hot\.accept\w*/, "(function hmrBoundaryNoop(){})"), {
        code: s.toString(),
        map: s.generateMap({ hires: !0, source: id })
      };
    }
  };
}

// src/plugins/storybook-entry-plugin.ts
async function storybookEntryPlugin(options) {
  return [
    // Pre-enforcement: handles virtual module resolution and loading (must run first)
    codeGeneratorPlugin(options),
    // Post-enforcement: injects __namedExportsOrder after TypeScript transpilation
    await injectExportOrderPlugin(),
    // Post-enforcement: removes import.meta.hot.accept() from story files
    await stripStoryHMRBoundary()
  ];
}

// src/plugins/webpack-stats-plugin.ts
import { relative as relative2 } from "node:path";

// ../../../node_modules/slash/index.js
function slash(path) {
  return path.startsWith("\\\\?\\") ? path : path.replace(/\\/g, "/");
}

// src/plugins/webpack-stats-plugin.ts
function stripQueryParams(filePath) {
  return filePath.split("?")[0];
}
function isUserCode(moduleName) {
  return moduleName ? Object.values(SB_VIRTUAL_FILES).includes(getOriginalVirtualModuleId(moduleName)) ? !0 : !moduleName.startsWith("vite/") && !moduleName.startsWith("\0") && moduleName !== "react/jsx-runtime" : !1;
}
function pluginWebpackStats({ workingDir }) {
  function normalize2(filename) {
    if (filename.startsWith("virtual:"))
      return `/${filename}`;
    if (Object.values(SB_VIRTUAL_FILES).includes(getOriginalVirtualModuleId(filename)))
      return `/${getOriginalVirtualModuleId(filename)}`;
    {
      let relativePath = relative2(workingDir, stripQueryParams(filename));
      return `./${slash(relativePath)}`;
    }
  }
  function createReasons(importers) {
    return (importers || []).map((i) => ({ moduleName: normalize2(i) }));
  }
  function createStatsMapModule(filename, importers) {
    return {
      id: filename,
      name: filename,
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
        let depId = normalize2(depIdUnsafe);
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

// src/plugins/storybook-external-globals-plugin.ts
import { existsSync as existsSync3 } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname as dirname4, join as join5 } from "node:path";
import { globalsNameReferenceMap } from "storybook/internal/preview/globals";

// ../../../node_modules/empathic/package.mjs
import { env } from "node:process";
import { dirname as dirname3, join as join4 } from "node:path";
import { existsSync as existsSync2, mkdirSync } from "node:fs";

// ../../../node_modules/empathic/access.mjs
import { accessSync, constants } from "node:fs";
function ok(path, mode) {
  try {
    return accessSync(path, mode), !0;
  } catch {
    return !1;
  }
}
function writable(path) {
  return ok(path, constants.W_OK);
}

// ../../../node_modules/empathic/find.mjs
import { join as join3 } from "node:path";
import { existsSync, statSync } from "node:fs";

// ../../../node_modules/empathic/walk.mjs
import { dirname as dirname2 } from "node:path";

// ../../../node_modules/empathic/resolve.mjs
import { isAbsolute, join as join2, resolve } from "node:path";
function absolute(input, root) {
  return isAbsolute(input) ? input : resolve(root || ".", input);
}

// ../../../node_modules/empathic/walk.mjs
function up(base, options) {
  let { last, cwd } = options || {}, tmp = absolute(base, cwd), root = absolute(last || "/", cwd), prev, arr = [];
  for (; prev !== root && (arr.push(tmp), tmp = dirname2(prev = tmp), tmp !== prev); )
    ;
  return arr;
}

// ../../../node_modules/empathic/find.mjs
function up2(name, options) {
  let dir, tmp, start2 = options && options.cwd || "";
  for (dir of up(start2, options))
    if (tmp = join3(dir, name), existsSync(tmp)) return tmp;
}

// ../../../node_modules/empathic/package.mjs
function up3(options) {
  return up2("package.json", options);
}
function cache(name, options) {
  options = options || {};
  let dir = env.CACHE_DIR;
  if (!dir || /^(1|0|true|false)$/.test(dir)) {
    let pkg = up3(options);
    if (dir = pkg && dirname3(pkg)) {
      let mods = join4(dir, "node_modules"), exists = existsSync2(mods);
      if (!writable(exists ? mods : dir)) return;
      dir = join4(mods, ".cache");
    }
  }
  if (dir)
    return dir = join4(dir, name), options.create && !existsSync2(dir) && mkdirSync(dir, { recursive: !0 }), dir;
}

// src/plugins/storybook-external-globals-plugin.ts
var escapeKeys = (key) => key.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&"), defaultImportRegExp = "import ([^*{}]+) from", replacementMap = /* @__PURE__ */ new Map([
  ["import ", "const "],
  ["import{", "const {"],
  ["* as ", ""],
  [" as ", ": "],
  [" from ", " = "],
  ["}from", "} ="]
]);
async function storybookExternalGlobalsPlugin(options) {
  let build3 = await options.presets.apply("build"), externals = globalsNameReferenceMap;
  build3?.test?.disableBlocks && (externals["@storybook/addon-docs/blocks"] = "__STORYBOOK_BLOCKS_EMPTY_MODULE__"), await init;
  let { mergeAlias } = await import("vite");
  return {
    name: "storybook:external-globals-plugin",
    enforce: "post",
    // In dev (serve), we set up aliases to files that we write into node_modules/.cache.
    async config(config, { command }) {
      if (command !== "serve")
        return;
      let newAlias = mergeAlias([], config.resolve?.alias), cachePath = cache("sb-vite-plugin-externals", { create: !0 }) ?? join5(process.cwd(), "node_modules", ".cache", "sb-vite-plugin-externals");
      return await Promise.all(
        Object.keys(externals).map(async (externalKey) => {
          let externalCachePath = join5(cachePath, `${externalKey}.js`);
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
      if (globalsList.every((glob) => !code.includes(glob)))
        return;
      let [imports] = parse(code), src = new MagicString(code);
      return imports.forEach(({ n: path, ss: startPosition, se: endPosition }) => {
        let packageName = path;
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
function getDefaultImportReplacement(match) {
  let matched = match.match(defaultImportRegExp);
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
    (match) => replacementMap.get(match) ?? getDefaultImportReplacement(match) ?? globs[packageName]
  );
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
  let configEnv = _type === "development" ? configEnvServe : configEnvBuild, { loadConfigFromFile, mergeConfig } = await import("vite"), { viteConfigPath } = await getBuilderOptions(options), projectRoot = resolve2(options.configDir, ".."), { config: { build: buildProperty = void 0, ...userConfig } = {} } = await loadConfigFromFile(configEnv, viteConfigPath, projectRoot) ?? {}, sbConfig = {
    configFile: !1,
    plugins: await pluginConfig(options),
    root: projectRoot,
    // Allow storybook deployed as subfolder. See https://github.com/storybookjs/builder-vite/issues/238
    base: "./",
    ...options.cacheKey ? { cacheDir: resolvePathInStorybookCache("sb-vite", options.cacheKey) } : {},
    // Pass build.target option from user's vite config
    build: {
      target: buildProperty?.target
    }
  };
  return mergeConfig(userConfig, sbConfig);
}
async function pluginConfig(options) {
  return [
    // Shared core plugins (resolve conditions, envPrefix, fs.allow, externals, env vars, etc.)
    ...await viteCorePlugins([], options),
    await storybookExternalGlobalsPlugin(options),
    await csfPlugin(options),
    // Entry plugin: virtual modules for stories, addon setup, and main app entry
    ...await storybookEntryPlugin(options),
    // Builder-specific: webpack-compatible stats for turbosnap/chromatic
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
      // TODO: Remove bundlerOptionsKey and use 'rolldownOptions' directly once support for Vite < 8 is dropped
      [bundlerOptionsKey]: {
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
  finalConfig.plugins?.push({
    name: "storybook:enforce-output-dir",
    enforce: "post",
    config: () => ({
      build: {
        outDir: options.outputDir
      }
    }),
    // configEnvironment is a new method in Vite 6
    // It is used to configure configs based on the environment
    // E.g. Nitro uses this method to set the output directory to .output/public/
    configEnvironment: () => ({
      build: {
        outDir: options.outputDir
      }
    })
  }), options.features?.developmentModeForBuild && finalConfig.plugins?.push({
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

      For more information, see https://github.com/storybookjs/storybook/blob/next/MIGRATION.md#turbosnap-vite-plugin-is-no-longer-needed`), finalConfig.plugins = await withoutVitePlugins(finalConfig.plugins, [turbosnapPluginName])), finalConfig.customLogger ??= await createViteLogger(), await viteBuild(finalConfig), findPlugin(
    finalConfig,
    "storybook:rollup-plugin-webpack-stats"
  )?.storybookGetStats();
}

// src/vite-server.ts
async function createViteServer(options, devServer) {
  let { presets } = options, commonCfg = await commonConfig(options, "development"), { allowedHosts } = await presets.apply("core", {}), config = {
    ...commonCfg,
    server: {
      allowedHosts,
      middlewareMode: !0,
      hmr: {
        port: options.port,
        server: devServer
      },
      fs: {
        strict: !0
      }
    },
    appType: "custom"
  };
  options.host === "0.0.0.0" && (!allowedHosts || Array.isArray(allowedHosts) && allowedHosts.length === 0) && (config.server.allowedHosts = !0);
  let finalConfig = await presets.apply("viteFinal", config, options), { createServer } = await import("vite");
  return finalConfig.customLogger ??= await createViteLogger(), createServer(finalConfig);
}

// src/index.ts
function iframeHandler(options, server2) {
  return async (req, res) => {
    let indexHtml = await readFile(
      fileURLToPath3(import.meta.resolve("@storybook/builder-vite/input/iframe.html")),
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

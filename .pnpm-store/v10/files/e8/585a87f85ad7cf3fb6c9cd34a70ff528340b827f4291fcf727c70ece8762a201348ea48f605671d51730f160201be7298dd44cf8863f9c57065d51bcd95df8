import CJS_COMPAT_NODE_URL_etqjn00nkf from 'node:url';
import CJS_COMPAT_NODE_PATH_etqjn00nkf from 'node:path';
import CJS_COMPAT_NODE_MODULE_etqjn00nkf from "node:module";

var __filename = CJS_COMPAT_NODE_URL_etqjn00nkf.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_etqjn00nkf.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_etqjn00nkf.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import "./_node-chunks/chunk-V6MEBOQH.js";

// src/preset.ts
import { isAbsolute as isAbsolute2 } from "node:path";
import { fileURLToPath as fileURLToPath2 } from "node:url";
import { logger } from "storybook/internal/node-logger";

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

// ../../node_modules/pathe/dist/shared/pathe.ff20891b.mjs
var _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  return input && input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
var _UNC_REGEX = /^[/\\]{2}/, _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/, _DRIVE_LETTER_RE = /^[A-Za-z]:$/;
var normalize = function(path2) {
  if (path2.length === 0)
    return ".";
  path2 = normalizeWindowsPath(path2);
  let isUNCPath = path2.match(_UNC_REGEX), isPathAbsolute = isAbsolute(path2), trailingSeparator = path2[path2.length - 1] === "/";
  return path2 = normalizeString(path2, !isPathAbsolute), path2.length === 0 ? isPathAbsolute ? "/" : trailingSeparator ? "./" : "." : (trailingSeparator && (path2 += "/"), _DRIVE_LETTER_RE.test(path2) && (path2 += "/"), isUNCPath ? isPathAbsolute ? `//${path2}` : `//./${path2}` : isPathAbsolute && !isAbsolute(path2) ? `/${path2}` : path2);
}, join = function(...arguments_) {
  if (arguments_.length === 0)
    return ".";
  let joined;
  for (let argument of arguments_)
    argument && argument.length > 0 && (joined === void 0 ? joined = argument : joined += `/${argument}`);
  return joined === void 0 ? "." : normalize(joined.replace(/\/\/+/g, "/"));
};
function normalizeString(path2, allowAboveRoot) {
  let res = "", lastSegmentLength = 0, lastSlash = -1, dots = 0, char = null;
  for (let index = 0; index <= path2.length; ++index) {
    if (index < path2.length)
      char = path2[index];
    else {
      if (char === "/")
        break;
      char = "/";
    }
    if (char === "/") {
      if (!(lastSlash === index - 1 || dots === 1)) if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            let lastSlashIndex = res.lastIndexOf("/");
            lastSlashIndex === -1 ? (res = "", lastSegmentLength = 0) : (res = res.slice(0, lastSlashIndex), lastSegmentLength = res.length - 1 - res.lastIndexOf("/")), lastSlash = index, dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "", lastSegmentLength = 0, lastSlash = index, dots = 0;
            continue;
          }
        }
        allowAboveRoot && (res += res.length > 0 ? "/.." : "..", lastSegmentLength = 2);
      } else
        res.length > 0 ? res += `/${path2.slice(lastSlash + 1, index)}` : res = path2.slice(lastSlash + 1, index), lastSegmentLength = index - lastSlash - 1;
      lastSlash = index, dots = 0;
    } else char === "." && dots !== -1 ? ++dots : dots = -1;
  }
  return res;
}
var isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};
var dirname = function(p) {
  let segments = normalizeWindowsPath(p).replace(/\/$/, "").split("/").slice(0, -1);
  return segments.length === 1 && _DRIVE_LETTER_RE.test(segments[0]) && (segments[0] += "/"), segments.join("/") || (isAbsolute(p) ? "/" : ".");
};

// ../../core/src/shared/utils/module.ts
var importMetaResolve = (...args) => typeof import.meta.resolve != "function" && process.env.VITEST === "true" ? (console.warn(
  "importMetaResolve from within Storybook is being used in a Vitest test, but it shouldn't be. Please report this at https://github.com/storybookjs/storybook/issues/new?template=bug_report.yml"
), pathToFileURL(args[0]).href) : import.meta.resolve(...args), resolvePackageDir = (pkg, parent) => {
  try {
    return dirname(fileURLToPath(importMetaResolve(join(pkg, "package.json"), parent)));
  } catch {
    return dirname(fileURLToPath(importMetaResolve(join(pkg, "package.json"))));
  }
};

// src/preset.ts
var getResolvedReact = async (options) => {
  let resolvedReact2 = await options.presets.apply("resolvedReact", {});
  return {
    react: resolvedReact2.react ?? resolvePackageDir("react"),
    reactDom: resolvedReact2.reactDom ?? resolvePackageDir("react-dom"),
    // In Webpack, symlinked MDX files will cause @mdx-js/react to not be resolvable if it is not hoisted
    // This happens for the SB monorepo's template stories when a sandbox has a different react version than
    // addon-docs, causing addon-docs's dependencies not to be hoisted.
    // This might also affect regular users who have a similar setup.
    // Explicitly alias @mdx-js/react to avoid this issue.
    mdx: resolvedReact2.mdx ?? fileURLToPath2(import.meta.resolve("@mdx-js/react"))
  };
};
async function webpack(webpackConfig = {}, options) {
  let { module = {} } = webpackConfig, { csfPluginOptions = {}, mdxPluginOptions = {} } = options, enrichCsf = await options.presets.apply("experimental_enrichCsf"), rehypeSlug = (await import("./_node-chunks/rehype-slug-RVGEC5JJ.js")).default, rehypeExternalLinks = (await import("./_node-chunks/rehype-external-links-TJOY2FTM.js")).default, mdxLoaderOptions = await options.presets.apply("mdxLoaderOptions", {
    ...mdxPluginOptions,
    mdxCompileOptions: {
      providerImportSource: import.meta.resolve("@storybook/addon-docs/mdx-react-shim"),
      ...mdxPluginOptions.mdxCompileOptions,
      rehypePlugins: [
        ...mdxPluginOptions?.mdxCompileOptions?.rehypePlugins ?? [],
        rehypeSlug,
        rehypeExternalLinks
      ]
    }
  });
  logger.info("Addon-docs: using MDX3");
  let { react, reactDom, mdx } = await getResolvedReact(options), alias;
  return Array.isArray(webpackConfig.resolve?.alias) ? (alias = [...webpackConfig.resolve?.alias], alias.push(
    {
      name: "react",
      alias: react
    },
    {
      name: "react-dom",
      alias: reactDom
    },
    {
      name: "@mdx-js/react",
      alias: mdx
    }
  )) : alias = {
    ...webpackConfig.resolve?.alias,
    react,
    "react-dom": reactDom,
    "@mdx-js/react": mdx
  }, {
    ...webpackConfig,
    plugins: [
      ...webpackConfig.plugins || [],
      ...csfPluginOptions ? [
        (await import("@storybook/csf-plugin")).webpack({
          ...csfPluginOptions,
          enrichCsf
        })
      ] : []
    ],
    resolve: {
      ...webpackConfig.resolve,
      alias
    },
    module: {
      ...module,
      rules: [
        ...module.rules || [],
        {
          test: /\.mdx$/,
          exclude: /(stories|story)\.mdx$/,
          use: [
            {
              loader: fileURLToPath2(import.meta.resolve("@storybook/addon-docs/mdx-loader")),
              options: mdxLoaderOptions
            }
          ]
        }
      ]
    }
  };
}
var docs = (input = {}, options) => {
  if (options?.build?.test?.disableAutoDocs)
    return;
  let result = {
    ...input,
    defaultName: "Docs"
  }, docsMode = options.docs;
  return docsMode && (result.docsMode = docsMode), result;
}, addons = [
  import.meta.resolve("@storybook/react-dom-shim/preset")
], viteFinal = async (config, options) => {
  let { plugins = [] } = config, { mdxPlugin } = await import("./_node-chunks/mdx-plugin-5A6S3CA4.js"), { react, reactDom, mdx } = await getResolvedReact(options), packageDeduplicationPlugin = {
    name: "storybook:package-deduplication",
    enforce: "pre",
    config: () => ({
      resolve: {
        alias: {
          react,
          // Vite doesn't respect export maps when resolving an absolute path, so we need to do that manually here
          ...isAbsolute2(reactDom) && { "react-dom/server": `${reactDom}/server.browser.js` },
          "react-dom": reactDom,
          "@mdx-js/react": mdx
        }
      }
    })
  };
  return plugins.unshift(packageDeduplicationPlugin), plugins.unshift(mdxPlugin(options)), {
    ...config,
    plugins
  };
}, webpackX = webpack, docsX = docs, resolvedReact = async (existing) => ({
  react: existing?.react ?? resolvePackageDir("react"),
  reactDom: existing?.reactDom ?? resolvePackageDir("react-dom"),
  mdx: existing?.mdx ?? fileURLToPath2(import.meta.resolve("@mdx-js/react"))
}), optimizeViteDeps = [
  "@storybook/addon-docs",
  "@storybook/addon-docs/blocks",
  "@storybook/addon-docs > @mdx-js/react"
];
export {
  addons,
  docsX as docs,
  optimizeViteDeps,
  resolvedReact,
  viteFinal,
  webpackX as webpack
};

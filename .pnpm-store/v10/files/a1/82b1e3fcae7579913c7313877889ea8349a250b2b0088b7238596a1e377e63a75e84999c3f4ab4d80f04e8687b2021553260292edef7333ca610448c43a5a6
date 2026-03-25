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
  dirname,
  join
} from "./chunk-XS5OAKHK.js";

// ../node_modules/exsolve/dist/index.mjs
import fs, { lstatSync, realpathSync, statSync } from "node:fs";
import { URL as URL$1, fileURLToPath, pathToFileURL } from "node:url";
import path, { isAbsolute } from "node:path";
import assert from "node:assert";
import process$1 from "node:process";
import v8 from "node:v8";
import { format, inspect } from "node:util";
var nodeBuiltins = [
  "_http_agent",
  "_http_client",
  "_http_common",
  "_http_incoming",
  "_http_outgoing",
  "_http_server",
  "_stream_duplex",
  "_stream_passthrough",
  "_stream_readable",
  "_stream_transform",
  "_stream_wrap",
  "_stream_writable",
  "_tls_common",
  "_tls_wrap",
  "assert",
  "assert/strict",
  "async_hooks",
  "buffer",
  "child_process",
  "cluster",
  "console",
  "constants",
  "crypto",
  "dgram",
  "diagnostics_channel",
  "dns",
  "dns/promises",
  "domain",
  "events",
  "fs",
  "fs/promises",
  "http",
  "http2",
  "https",
  "inspector",
  "inspector/promises",
  "module",
  "net",
  "os",
  "path",
  "path/posix",
  "path/win32",
  "perf_hooks",
  "process",
  "punycode",
  "querystring",
  "readline",
  "readline/promises",
  "repl",
  "stream",
  "stream/consumers",
  "stream/promises",
  "stream/web",
  "string_decoder",
  "sys",
  "timers",
  "timers/promises",
  "tls",
  "trace_events",
  "tty",
  "url",
  "util",
  "util/types",
  "v8",
  "vm",
  "wasi",
  "worker_threads",
  "zlib"
], own$1 = {}.hasOwnProperty, classRegExp = /^([A-Z][a-z\d]*)+$/, kTypes = /* @__PURE__ */ new Set([
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
}, TypeError), hasOwnProperty$1 = {}.hasOwnProperty, cache = /* @__PURE__ */ new Map();
function read(jsonPath, { base, specifier }) {
  let existing = cache.get(jsonPath);
  if (existing) return existing;
  let string;
  try {
    string = fs.readFileSync(path.toNamespacedPath(jsonPath), "utf8");
  } catch (error) {
    let exception = error;
    if (exception.code !== "ENOENT") throw exception;
  }
  let result = {
    exists: !1,
    pjsonPath: jsonPath,
    main: void 0,
    name: void 0,
    type: "none",
    exports: void 0,
    imports: void 0
  };
  if (string !== void 0) {
    let parsed;
    try {
      parsed = JSON.parse(string);
    } catch (error_) {
      let error = new ERR_INVALID_PACKAGE_CONFIG(jsonPath, (base ? `"${specifier}" from ` : "") + fileURLToPath(base || specifier), error_.message);
      throw error.cause = error_, error;
    }
    result.exists = !0, hasOwnProperty$1.call(parsed, "name") && typeof parsed.name == "string" && (result.name = parsed.name), hasOwnProperty$1.call(parsed, "main") && typeof parsed.main == "string" && (result.main = parsed.main), hasOwnProperty$1.call(parsed, "exports") && (result.exports = parsed.exports), hasOwnProperty$1.call(parsed, "imports") && (result.imports = parsed.imports), hasOwnProperty$1.call(parsed, "type") && (parsed.type === "commonjs" || parsed.type === "module") && (result.type = parsed.type);
  }
  return cache.set(jsonPath, result), result;
}
function getPackageScopeConfig(resolved) {
  let packageJSONUrl = new URL("package.json", resolved);
  for (; !packageJSONUrl.pathname.endsWith("node_modules/package.json"); ) {
    let packageConfig = read(fileURLToPath(packageJSONUrl), { specifier: resolved });
    if (packageConfig.exists) return packageConfig;
    let lastPackageJSONUrl = packageJSONUrl;
    if (packageJSONUrl = new URL("../package.json", packageJSONUrl), packageJSONUrl.pathname === lastPackageJSONUrl.pathname) break;
  }
  return {
    pjsonPath: fileURLToPath(packageJSONUrl),
    exists: !1,
    type: "none"
  };
}
var hasOwnProperty = {}.hasOwnProperty, extensionFormatMap = {
  __proto__: null,
  ".json": "json",
  ".cjs": "commonjs",
  ".cts": "commonjs",
  ".js": "module",
  ".ts": "module",
  ".mts": "module",
  ".mjs": "module"
}, protocolHandlers = {
  __proto__: null,
  "data:": getDataProtocolModuleFormat,
  "file:": getFileProtocolModuleFormat,
  "node:": () => "builtin"
};
function mimeToFormat(mime) {
  return mime && /\s*(text|application)\/javascript\s*(;\s*charset=utf-?8\s*)?/i.test(mime) ? "module" : mime === "application/json" ? "json" : null;
}
function getDataProtocolModuleFormat(parsed) {
  let { 1: mime } = /^([^/]+\/[^;,]+)[^,]*?(;base64)?,/.exec(parsed.pathname) || [
    null,
    null,
    null
  ];
  return mimeToFormat(mime);
}
function extname(url) {
  let pathname = url.pathname, index = pathname.length;
  for (; index--; ) {
    let code = pathname.codePointAt(index);
    if (code === 47) return "";
    if (code === 46) return pathname.codePointAt(index - 1) === 47 ? "" : pathname.slice(index);
  }
  return "";
}
function getFileProtocolModuleFormat(url, _context, ignoreErrors) {
  let ext = extname(url);
  if (ext === ".js") {
    let { type: packageType } = getPackageScopeConfig(url);
    return packageType !== "none" ? packageType : "commonjs";
  }
  if (ext === "") {
    let { type: packageType } = getPackageScopeConfig(url);
    return packageType === "none" || packageType === "commonjs" ? "commonjs" : "module";
  }
  let format$1 = extensionFormatMap[ext];
  if (format$1) return format$1;
  if (!ignoreErrors)
    throw new ERR_UNKNOWN_FILE_EXTENSION(ext, fileURLToPath(url));
}
function defaultGetFormatWithoutErrors(url, context) {
  let protocol = url.protocol;
  return hasOwnProperty.call(protocolHandlers, protocol) && protocolHandlers[protocol](url, context, !0) || null;
}
var RegExpPrototypeSymbolReplace = RegExp.prototype[Symbol.replace], own = {}.hasOwnProperty, invalidSegmentRegEx = /(^|\\|\/)((\.|%2e)(\.|%2e)?|(n|%6e|%4e)(o|%6f|%4f)(d|%64|%44)(e|%65|%45)(_|%5f)(m|%6d|%4d)(o|%6f|%4f)(d|%64|%44)(u|%75|%55)(l|%6c|%4c)(e|%65|%45)(s|%73|%53))?(\\|\/|$)/i, deprecatedInvalidSegmentRegEx = /(^|\\|\/)((\.|%2e)(\.|%2e)?|(n|%6e|%4e)(o|%6f|%4f)(d|%64|%44)(e|%65|%45)(_|%5f)(m|%6d|%4d)(o|%6f|%4f)(d|%64|%44)(u|%75|%55)(l|%6c|%4c)(e|%65|%45)(s|%73|%53))(\\|\/|$)/i, invalidPackageNameRegEx = /^\.|%|\\/, patternRegEx = /\*/g, encodedSeparatorRegEx = /%2f|%5c/i, emittedPackageWarnings = /* @__PURE__ */ new Set(), doubleSlashRegEx = /[/\\]{2}/;
function emitInvalidSegmentDeprecation(target, request, match, packageJsonUrl, internal, base, isTarget) {
  if (process$1.noDeprecation) return;
  let pjsonPath = fileURLToPath(packageJsonUrl), double = doubleSlashRegEx.exec(isTarget ? target : request) !== null;
  process$1.emitWarning(`Use of deprecated ${double ? "double slash" : "leading or trailing slash matching"} resolving "${target}" for module request "${request}" ${request === match ? "" : `matched to "${match}" `}in the "${internal ? "imports" : "exports"}" field module resolution of the package at ${pjsonPath}${base ? ` imported from ${fileURLToPath(base)}` : ""}.`, "DeprecationWarning", "DEP0166");
}
function emitLegacyIndexDeprecation(url, packageJsonUrl, base, main) {
  if (process$1.noDeprecation || defaultGetFormatWithoutErrors(url, { parentURL: base.href }) !== "module") return;
  let urlPath = fileURLToPath(url.href), packagePath = fileURLToPath(new URL$1(".", packageJsonUrl)), basePath = fileURLToPath(base);
  main ? path.resolve(packagePath, main) !== urlPath && process$1.emitWarning(`Package ${packagePath} has a "main" field set to "${main}", excluding the full filename and extension to the resolved file at "${urlPath.slice(packagePath.length)}", imported from ${basePath}.
 Automatic extension resolution of the "main" field is deprecated for ES modules.`, "DeprecationWarning", "DEP0151") : process$1.emitWarning(`No "main" or "exports" field defined in the package.json for ${packagePath} resolving the main entry point "${urlPath.slice(packagePath.length)}", imported from ${basePath}.
Default "index" lookups for the main are deprecated for ES modules.`, "DeprecationWarning", "DEP0151");
}
function tryStatSync(path$1) {
  try {
    return statSync(path$1);
  } catch {
  }
}
function fileExists(url) {
  let stats = statSync(url, { throwIfNoEntry: !1 }), isFile = stats ? stats.isFile() : void 0;
  return isFile ?? !1;
}
function legacyMainResolve(packageJsonUrl, packageConfig, base) {
  let guess;
  if (packageConfig.main !== void 0) {
    if (guess = new URL$1(packageConfig.main, packageJsonUrl), fileExists(guess)) return guess;
    let tries$1 = [
      `./${packageConfig.main}.js`,
      `./${packageConfig.main}.json`,
      `./${packageConfig.main}.node`,
      `./${packageConfig.main}/index.js`,
      `./${packageConfig.main}/index.json`,
      `./${packageConfig.main}/index.node`
    ], i$1 = -1;
    for (; ++i$1 < tries$1.length && (guess = new URL$1(tries$1[i$1], packageJsonUrl), !fileExists(guess)); )
      guess = void 0;
    if (guess)
      return emitLegacyIndexDeprecation(guess, packageJsonUrl, base, packageConfig.main), guess;
  }
  let tries = [
    "./index.js",
    "./index.json",
    "./index.node"
  ], i = -1;
  for (; ++i < tries.length && (guess = new URL$1(tries[i], packageJsonUrl), !fileExists(guess)); )
    guess = void 0;
  if (guess)
    return emitLegacyIndexDeprecation(guess, packageJsonUrl, base, packageConfig.main), guess;
  throw new ERR_MODULE_NOT_FOUND(fileURLToPath(new URL$1(".", packageJsonUrl)), fileURLToPath(base));
}
function finalizeResolution(resolved, base, preserveSymlinks) {
  if (encodedSeparatorRegEx.exec(resolved.pathname) !== null) throw new ERR_INVALID_MODULE_SPECIFIER(resolved.pathname, String.raw`must not include encoded "/" or "\" characters`, fileURLToPath(base));
  let filePath;
  try {
    filePath = fileURLToPath(resolved);
  } catch (error) {
    throw Object.defineProperty(error, "input", { value: String(resolved) }), Object.defineProperty(error, "module", { value: String(base) }), error;
  }
  let stats = tryStatSync(filePath.endsWith("/") ? filePath.slice(-1) : filePath);
  if (stats && stats.isDirectory()) {
    let error = new ERR_UNSUPPORTED_DIR_IMPORT(filePath, fileURLToPath(base));
    throw error.url = String(resolved), error;
  }
  if (!stats || !stats.isFile()) {
    let error = new ERR_MODULE_NOT_FOUND(filePath || resolved.pathname, base && fileURLToPath(base), !0);
    throw error.url = String(resolved), error;
  }
  if (!preserveSymlinks) {
    let real = realpathSync(filePath), { search, hash } = resolved;
    resolved = pathToFileURL(real + (filePath.endsWith(path.sep) ? "/" : "")), resolved.search = search, resolved.hash = hash;
  }
  return resolved;
}
function importNotDefined(specifier, packageJsonUrl, base) {
  return new ERR_PACKAGE_IMPORT_NOT_DEFINED(specifier, packageJsonUrl && fileURLToPath(new URL$1(".", packageJsonUrl)), fileURLToPath(base));
}
function exportsNotFound(subpath, packageJsonUrl, base) {
  return new ERR_PACKAGE_PATH_NOT_EXPORTED(fileURLToPath(new URL$1(".", packageJsonUrl)), subpath, base && fileURLToPath(base));
}
function throwInvalidSubpath(request, match, packageJsonUrl, internal, base) {
  throw new ERR_INVALID_MODULE_SPECIFIER(request, `request is not a valid match in pattern "${match}" for the "${internal ? "imports" : "exports"}" resolution of ${fileURLToPath(packageJsonUrl)}`, base && fileURLToPath(base));
}
function invalidPackageTarget(subpath, target, packageJsonUrl, internal, base) {
  return target = typeof target == "object" && target !== null ? JSON.stringify(target, null, "") : `${target}`, new ERR_INVALID_PACKAGE_TARGET(fileURLToPath(new URL$1(".", packageJsonUrl)), subpath, target, internal, base && fileURLToPath(base));
}
function resolvePackageTargetString(target, subpath, match, packageJsonUrl, base, pattern, internal, isPathMap, conditions) {
  if (subpath !== "" && !pattern && target.at(-1) !== "/") throw invalidPackageTarget(match, target, packageJsonUrl, internal, base);
  if (!target.startsWith("./")) {
    if (internal && !target.startsWith("../") && !target.startsWith("/")) {
      let isURL = !1;
      try {
        new URL$1(target), isURL = !0;
      } catch {
      }
      if (!isURL) return packageResolve(pattern ? RegExpPrototypeSymbolReplace.call(patternRegEx, target, () => subpath) : target + subpath, packageJsonUrl, conditions);
    }
    throw invalidPackageTarget(match, target, packageJsonUrl, internal, base);
  }
  if (invalidSegmentRegEx.exec(target.slice(2)) !== null) if (deprecatedInvalidSegmentRegEx.exec(target.slice(2)) === null) {
    if (!isPathMap) {
      let request = pattern ? match.replace("*", () => subpath) : match + subpath;
      emitInvalidSegmentDeprecation(pattern ? RegExpPrototypeSymbolReplace.call(patternRegEx, target, () => subpath) : target, request, match, packageJsonUrl, internal, base, !0);
    }
  } else throw invalidPackageTarget(match, target, packageJsonUrl, internal, base);
  let resolved = new URL$1(target, packageJsonUrl), resolvedPath = resolved.pathname, packagePath = new URL$1(".", packageJsonUrl).pathname;
  if (!resolvedPath.startsWith(packagePath)) throw invalidPackageTarget(match, target, packageJsonUrl, internal, base);
  if (subpath === "") return resolved;
  if (invalidSegmentRegEx.exec(subpath) !== null) {
    let request = pattern ? match.replace("*", () => subpath) : match + subpath;
    deprecatedInvalidSegmentRegEx.exec(subpath) === null ? isPathMap || emitInvalidSegmentDeprecation(pattern ? RegExpPrototypeSymbolReplace.call(patternRegEx, target, () => subpath) : target, request, match, packageJsonUrl, internal, base, !1) : throwInvalidSubpath(request, match, packageJsonUrl, internal, base);
  }
  return pattern ? new URL$1(RegExpPrototypeSymbolReplace.call(patternRegEx, resolved.href, () => subpath)) : new URL$1(subpath, resolved);
}
function isArrayIndex(key) {
  let keyNumber = Number(key);
  return `${keyNumber}` !== key ? !1 : keyNumber >= 0 && keyNumber < 4294967295;
}
function resolvePackageTarget(packageJsonUrl, target, subpath, packageSubpath, base, pattern, internal, isPathMap, conditions) {
  if (typeof target == "string") return resolvePackageTargetString(target, subpath, packageSubpath, packageJsonUrl, base, pattern, internal, isPathMap, conditions);
  if (Array.isArray(target)) {
    let targetList = target;
    if (targetList.length === 0) return null;
    let lastException, i = -1;
    for (; ++i < targetList.length; ) {
      let targetItem = targetList[i], resolveResult;
      try {
        resolveResult = resolvePackageTarget(packageJsonUrl, targetItem, subpath, packageSubpath, base, pattern, internal, isPathMap, conditions);
      } catch (error) {
        let exception = error;
        if (lastException = exception, exception.code === "ERR_INVALID_PACKAGE_TARGET") continue;
        throw error;
      }
      if (resolveResult !== void 0) {
        if (resolveResult === null) {
          lastException = null;
          continue;
        }
        return resolveResult;
      }
    }
    if (lastException == null) return null;
    throw lastException;
  }
  if (typeof target == "object" && target !== null) {
    let keys = Object.getOwnPropertyNames(target), i = -1;
    for (; ++i < keys.length; ) {
      let key = keys[i];
      if (isArrayIndex(key)) throw new ERR_INVALID_PACKAGE_CONFIG(fileURLToPath(packageJsonUrl), fileURLToPath(base), '"exports" cannot contain numeric property keys.');
    }
    for (i = -1; ++i < keys.length; ) {
      let key = keys[i];
      if (key === "default" || conditions && conditions.has(key)) {
        let conditionalTarget = target[key], resolveResult = resolvePackageTarget(packageJsonUrl, conditionalTarget, subpath, packageSubpath, base, pattern, internal, isPathMap, conditions);
        if (resolveResult === void 0) continue;
        return resolveResult;
      }
    }
    return null;
  }
  if (target === null) return null;
  throw invalidPackageTarget(packageSubpath, target, packageJsonUrl, internal, base);
}
function isConditionalExportsMainSugar(exports, packageJsonUrl, base) {
  if (typeof exports == "string" || Array.isArray(exports)) return !0;
  if (typeof exports != "object" || exports === null) return !1;
  let keys = Object.getOwnPropertyNames(exports), isConditionalSugar = !1, i = 0, keyIndex = -1;
  for (; ++keyIndex < keys.length; ) {
    let key = keys[keyIndex], currentIsConditionalSugar = key === "" || key[0] !== ".";
    if (i++ === 0) isConditionalSugar = currentIsConditionalSugar;
    else if (isConditionalSugar !== currentIsConditionalSugar) throw new ERR_INVALID_PACKAGE_CONFIG(fileURLToPath(packageJsonUrl), fileURLToPath(base), `"exports" cannot contain some keys starting with '.' and some not. The exports object must either be an object of package subpath keys or an object of main entry condition name keys only.`);
  }
  return isConditionalSugar;
}
function emitTrailingSlashPatternDeprecation(match, pjsonUrl, base) {
  if (process$1.noDeprecation) return;
  let pjsonPath = fileURLToPath(pjsonUrl);
  emittedPackageWarnings.has(pjsonPath + "|" + match) || (emittedPackageWarnings.add(pjsonPath + "|" + match), process$1.emitWarning(`Use of deprecated trailing slash pattern mapping "${match}" in the "exports" field module resolution of the package at ${pjsonPath}${base ? ` imported from ${fileURLToPath(base)}` : ""}. Mapping specifiers ending in "/" is no longer supported.`, "DeprecationWarning", "DEP0155"));
}
function packageExportsResolve(packageJsonUrl, packageSubpath, packageConfig, base, conditions) {
  let exports = packageConfig.exports;
  if (isConditionalExportsMainSugar(exports, packageJsonUrl, base) && (exports = { ".": exports }), own.call(exports, packageSubpath) && !packageSubpath.includes("*") && !packageSubpath.endsWith("/")) {
    let target = exports[packageSubpath], resolveResult = resolvePackageTarget(packageJsonUrl, target, "", packageSubpath, base, !1, !1, !1, conditions);
    if (resolveResult == null) throw exportsNotFound(packageSubpath, packageJsonUrl, base);
    return resolveResult;
  }
  let bestMatch = "", bestMatchSubpath = "", keys = Object.getOwnPropertyNames(exports), i = -1;
  for (; ++i < keys.length; ) {
    let key = keys[i], patternIndex = key.indexOf("*");
    if (patternIndex !== -1 && packageSubpath.startsWith(key.slice(0, patternIndex))) {
      packageSubpath.endsWith("/") && emitTrailingSlashPatternDeprecation(packageSubpath, packageJsonUrl, base);
      let patternTrailer = key.slice(patternIndex + 1);
      packageSubpath.length >= key.length && packageSubpath.endsWith(patternTrailer) && patternKeyCompare(bestMatch, key) === 1 && key.lastIndexOf("*") === patternIndex && (bestMatch = key, bestMatchSubpath = packageSubpath.slice(patternIndex, packageSubpath.length - patternTrailer.length));
    }
  }
  if (bestMatch) {
    let target = exports[bestMatch], resolveResult = resolvePackageTarget(packageJsonUrl, target, bestMatchSubpath, bestMatch, base, !0, !1, packageSubpath.endsWith("/"), conditions);
    if (resolveResult == null) throw exportsNotFound(packageSubpath, packageJsonUrl, base);
    return resolveResult;
  }
  throw exportsNotFound(packageSubpath, packageJsonUrl, base);
}
function patternKeyCompare(a, b) {
  let aPatternIndex = a.indexOf("*"), bPatternIndex = b.indexOf("*"), baseLengthA = aPatternIndex === -1 ? a.length : aPatternIndex + 1, baseLengthB = bPatternIndex === -1 ? b.length : bPatternIndex + 1;
  return baseLengthA > baseLengthB ? -1 : baseLengthB > baseLengthA || aPatternIndex === -1 ? 1 : bPatternIndex === -1 || a.length > b.length ? -1 : b.length > a.length ? 1 : 0;
}
function packageImportsResolve(name, base, conditions) {
  if (name === "#" || name.startsWith("#/") || name.endsWith("/")) throw new ERR_INVALID_MODULE_SPECIFIER(name, "is not a valid internal imports specifier name", fileURLToPath(base));
  let packageJsonUrl, packageConfig = getPackageScopeConfig(base);
  if (packageConfig.exists) {
    packageJsonUrl = pathToFileURL(packageConfig.pjsonPath);
    let imports = packageConfig.imports;
    if (imports) if (own.call(imports, name) && !name.includes("*")) {
      let resolveResult = resolvePackageTarget(packageJsonUrl, imports[name], "", name, base, !1, !0, !1, conditions);
      if (resolveResult != null) return resolveResult;
    } else {
      let bestMatch = "", bestMatchSubpath = "", keys = Object.getOwnPropertyNames(imports), i = -1;
      for (; ++i < keys.length; ) {
        let key = keys[i], patternIndex = key.indexOf("*");
        if (patternIndex !== -1 && name.startsWith(key.slice(0, -1))) {
          let patternTrailer = key.slice(patternIndex + 1);
          name.length >= key.length && name.endsWith(patternTrailer) && patternKeyCompare(bestMatch, key) === 1 && key.lastIndexOf("*") === patternIndex && (bestMatch = key, bestMatchSubpath = name.slice(patternIndex, name.length - patternTrailer.length));
        }
      }
      if (bestMatch) {
        let target = imports[bestMatch], resolveResult = resolvePackageTarget(packageJsonUrl, target, bestMatchSubpath, bestMatch, base, !0, !0, !1, conditions);
        if (resolveResult != null) return resolveResult;
      }
    }
  }
  throw importNotDefined(name, packageJsonUrl, base);
}
function parsePackageName(specifier, base) {
  let separatorIndex = specifier.indexOf("/"), validPackageName = !0, isScoped = !1;
  specifier[0] === "@" && (isScoped = !0, separatorIndex === -1 || specifier.length === 0 ? validPackageName = !1 : separatorIndex = specifier.indexOf("/", separatorIndex + 1));
  let packageName = separatorIndex === -1 ? specifier : specifier.slice(0, separatorIndex);
  if (invalidPackageNameRegEx.exec(packageName) !== null && (validPackageName = !1), !validPackageName) throw new ERR_INVALID_MODULE_SPECIFIER(specifier, "is not a valid package name", fileURLToPath(base));
  return {
    packageName,
    packageSubpath: "." + (separatorIndex === -1 ? "" : specifier.slice(separatorIndex)),
    isScoped
  };
}
function packageResolve(specifier, base, conditions) {
  if (nodeBuiltins.includes(specifier)) return new URL$1("node:" + specifier);
  let { packageName, packageSubpath, isScoped } = parsePackageName(specifier, base), packageConfig = getPackageScopeConfig(base);
  if (packageConfig.exists && packageConfig.name === packageName && packageConfig.exports !== void 0 && packageConfig.exports !== null) return packageExportsResolve(pathToFileURL(packageConfig.pjsonPath), packageSubpath, packageConfig, base, conditions);
  let packageJsonUrl = new URL$1("./node_modules/" + packageName + "/package.json", base), packageJsonPath = fileURLToPath(packageJsonUrl), lastPath;
  do {
    let stat = tryStatSync(packageJsonPath.slice(0, -13));
    if (!stat || !stat.isDirectory()) {
      lastPath = packageJsonPath, packageJsonUrl = new URL$1((isScoped ? "../../../../node_modules/" : "../../../node_modules/") + packageName + "/package.json", packageJsonUrl), packageJsonPath = fileURLToPath(packageJsonUrl);
      continue;
    }
    let packageConfig$1 = read(packageJsonPath, {
      base,
      specifier
    });
    return packageConfig$1.exports !== void 0 && packageConfig$1.exports !== null ? packageExportsResolve(packageJsonUrl, packageSubpath, packageConfig$1, base, conditions) : packageSubpath === "." ? legacyMainResolve(packageJsonUrl, packageConfig$1, base) : new URL$1(packageSubpath, packageJsonUrl);
  } while (packageJsonPath.length !== lastPath.length);
  throw new ERR_MODULE_NOT_FOUND(packageName, fileURLToPath(base), !1);
}
function isRelativeSpecifier(specifier) {
  return specifier[0] === "." && (specifier.length === 1 || specifier[1] === "/" || specifier[1] === "." && (specifier.length === 2 || specifier[2] === "/"));
}
function shouldBeTreatedAsRelativeOrAbsolutePath(specifier) {
  return specifier === "" ? !1 : specifier[0] === "/" ? !0 : isRelativeSpecifier(specifier);
}
function moduleResolve(specifier, base, conditions, preserveSymlinks) {
  let protocol = base.protocol, isData = protocol === "data:", resolved;
  if (shouldBeTreatedAsRelativeOrAbsolutePath(specifier)) try {
    resolved = new URL$1(specifier, base);
  } catch (error_) {
    let error = new ERR_UNSUPPORTED_RESOLVE_REQUEST(specifier, base);
    throw error.cause = error_, error;
  }
  else if (protocol === "file:" && specifier[0] === "#") resolved = packageImportsResolve(specifier, base, conditions);
  else try {
    resolved = new URL$1(specifier);
  } catch (error_) {
    if (isData && !nodeBuiltins.includes(specifier)) {
      let error = new ERR_UNSUPPORTED_RESOLVE_REQUEST(specifier, base);
      throw error.cause = error_, error;
    }
    resolved = packageResolve(specifier, base, conditions);
  }
  return assert.ok(resolved !== void 0, "expected to be defined"), resolved.protocol !== "file:" ? resolved : finalizeResolution(resolved, base, preserveSymlinks);
}
var DEFAULT_CONDITIONS_SET = /* @__PURE__ */ new Set(["node", "import"]), isWindows = process.platform === "win32", globalCache = globalThis.__EXSOLVE_CACHE__ ||= /* @__PURE__ */ new Map();
function resolveModuleURL(input, options) {
  let parsedInput = _parseInput(input);
  if ("external" in parsedInput) return parsedInput.external;
  let specifier = parsedInput.specifier, url = parsedInput.url, absolutePath = parsedInput.absolutePath, cacheKey, cacheObj;
  if (options?.cache !== !1 && (cacheKey = _cacheKey(absolutePath || specifier, options), cacheObj = options?.cache && typeof options?.cache == "object" ? options.cache : globalCache), cacheObj) {
    let cached = cacheObj.get(cacheKey);
    if (typeof cached == "string") return cached;
    if (cached instanceof Error) {
      if (options?.try) return;
      throw cached;
    }
  }
  if (absolutePath) try {
    let stat = lstatSync(absolutePath);
    if (stat.isSymbolicLink() && (absolutePath = realpathSync(absolutePath), url = pathToFileURL(absolutePath)), stat.isFile())
      return cacheObj && cacheObj.set(cacheKey, url.href), url.href;
  } catch (error) {
    if (error?.code !== "ENOENT")
      throw cacheObj && cacheObj.set(cacheKey, error), error;
  }
  let conditionsSet = options?.conditions ? new Set(options.conditions) : DEFAULT_CONDITIONS_SET, target = specifier || url.href, bases = _normalizeBases(options?.from), suffixes = options?.suffixes || [""], extensions = options?.extensions ? ["", ...options.extensions] : [""], resolved;
  for (let base of bases) {
    for (let suffix of suffixes) {
      let name = _join(target, suffix);
      name === "." && (name += "/.");
      for (let extension of extensions)
        if (resolved = _tryModuleResolve(name + extension, base, conditionsSet), resolved) break;
      if (resolved) break;
    }
    if (resolved) break;
  }
  if (!resolved) {
    let error = new Error(`Cannot resolve module "${input}" (from: ${bases.map((u) => _fmtPath(u)).join(", ")})`);
    if (error.code = "ERR_MODULE_NOT_FOUND", cacheObj && cacheObj.set(cacheKey, error), options?.try) return;
    throw error;
  }
  return cacheObj && cacheObj.set(cacheKey, resolved.href), resolved.href;
}
function resolveModulePath(id, options) {
  let resolved = resolveModuleURL(id, options);
  if (!resolved || !resolved.startsWith("file://") && options?.try) return;
  let absolutePath = fileURLToPath(resolved);
  return isWindows ? _normalizeWinPath(absolutePath) : absolutePath;
}
function _tryModuleResolve(specifier, base, conditions) {
  try {
    return moduleResolve(specifier, base, conditions);
  } catch {
  }
}
function _normalizeBases(inputs) {
  let urls = (Array.isArray(inputs) ? inputs : [inputs]).flatMap((input) => _normalizeBase(input));
  return urls.length === 0 ? [pathToFileURL("./")] : urls;
}
function _normalizeBase(input) {
  if (!input) return [];
  if (_isURL(input)) return [input];
  if (typeof input != "string") return [];
  if (/^(?:node|data|http|https|file):/.test(input)) return new URL(input);
  try {
    return input.endsWith("/") || statSync(input).isDirectory() ? pathToFileURL(input + "/") : pathToFileURL(input);
  } catch {
    return [pathToFileURL(input + "/"), pathToFileURL(input)];
  }
}
function _fmtPath(input) {
  try {
    return fileURLToPath(input);
  } catch {
    return input;
  }
}
function _cacheKey(id, opts) {
  return JSON.stringify([
    id,
    (opts?.conditions || ["node", "import"]).sort(),
    opts?.extensions,
    opts?.from,
    opts?.suffixes
  ]);
}
function _join(a, b) {
  return !a || !b || b === "/" ? a : (a.endsWith("/") ? a : a + "/") + (b.startsWith("/") ? b.slice(1) : b);
}
function _normalizeWinPath(path$1) {
  return path$1.replace(/\\/g, "/").replace(/^[a-z]:\//, (r) => r.toUpperCase());
}
function _isURL(input) {
  return input instanceof URL || input?.constructor?.name === "URL";
}
function _parseInput(input) {
  if (typeof input == "string") {
    if (input.startsWith("file:")) {
      let url = new URL(input);
      return {
        url,
        absolutePath: fileURLToPath(url)
      };
    }
    return isAbsolute(input) ? {
      url: pathToFileURL(input),
      absolutePath: input
    } : /^(?:node|data|http|https):/.test(input) ? { external: input } : nodeBuiltins.includes(input) && !input.includes(":") ? { external: `node:${input}` } : { specifier: input };
  }
  if (_isURL(input))
    return input.protocol === "file:" ? {
      url: input,
      absolutePath: fileURLToPath(input)
    } : { external: input.href };
  throw new TypeError("id must be a `string` or `URL`");
}

// src/shared/utils/module.ts
import { statSync as statSync2 } from "node:fs";
import { createRequire, register } from "node:module";
import { win32 } from "node:path/win32";
import { fileURLToPath as fileURLToPath2, pathToFileURL as pathToFileURL2 } from "node:url";
var importMetaResolve = (...args) => typeof import.meta.resolve != "function" && process.env.VITEST === "true" ? (console.warn(
  "importMetaResolve from within Storybook is being used in a Vitest test, but it shouldn't be. Please report this at https://github.com/storybookjs/storybook/issues/new?template=bug_report.yml"
), pathToFileURL2(args[0]).href) : import.meta.resolve(...args), resolvePackageDir = (pkg, parent) => {
  try {
    return dirname(fileURLToPath2(importMetaResolve(join(pkg, "package.json"), parent)));
  } catch {
    return dirname(fileURLToPath2(importMetaResolve(join(pkg, "package.json"))));
  }
}, isTypescriptLoaderRegistered = !1;
async function importModule(path2, { skipCache = !1 } = {}) {
  if (!isTypescriptLoaderRegistered) {
    let typescriptLoaderUrl = importMetaResolve("storybook/internal/bin/loader");
    register(typescriptLoaderUrl, import.meta.url), isTypescriptLoaderRegistered = !0;
  }
  let mod;
  try {
    let resolvedPath = win32.isAbsolute(path2) ? pathToFileURL2(path2).href : path2;
    mod = await import(skipCache ? `${resolvedPath}?${Date.now()}` : resolvedPath);
  } catch (importError) {
    try {
      let require2 = createRequire(import.meta.url);
      skipCache && delete require2.cache[require2.resolve(path2)], mod = require2(path2);
    } catch {
      throw importError;
    }
  }
  return mod.default ?? mod;
}
var safeResolveModule = ({
  specifier,
  parent,
  extensions = [".mjs", ".js", ".cjs"]
}) => {
  try {
    let resolvedPath = resolveModulePath(specifier, {
      from: parent,
      extensions: [""].concat(extensions)
    });
    if (statSync2(resolvedPath).isFile())
      return resolvedPath;
  } catch {
  }
};

export {
  resolveModulePath,
  importMetaResolve,
  resolvePackageDir,
  importModule,
  safeResolveModule
};

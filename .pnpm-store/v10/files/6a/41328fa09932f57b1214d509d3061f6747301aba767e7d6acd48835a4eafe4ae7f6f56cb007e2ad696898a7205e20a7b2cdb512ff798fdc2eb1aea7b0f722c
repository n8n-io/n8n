"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
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
var transform_exports = {};
__export(transform_exports, {
  requireOrImport: () => requireOrImport,
  resolveHook: () => resolveHook,
  setSingleTSConfig: () => setSingleTSConfig,
  setTransformConfig: () => setTransformConfig,
  setTransformData: () => setTransformData,
  shouldTransform: () => shouldTransform,
  singleTSConfig: () => singleTSConfig,
  transformConfig: () => transformConfig,
  transformHook: () => transformHook,
  wrapFunctionWithLocation: () => wrapFunctionWithLocation
});
module.exports = __toCommonJS(transform_exports);
var import_fs = __toESM(require("fs"));
var import_module = __toESM(require("module"));
var import_path = __toESM(require("path"));
var import_url = __toESM(require("url"));
var import_crypto = __toESM(require("crypto"));
var import_tsconfig_loader = require("../third_party/tsconfig-loader");
var import_util = require("../util");
var import_utilsBundle = require("../utilsBundle");
var import_compilationCache = require("./compilationCache");
var import_pirates = require("../third_party/pirates");
var import_md = require("./md");
const version = require("../../package.json").version;
const cachedTSConfigs = /* @__PURE__ */ new Map();
let _transformConfig = {
  babelPlugins: [],
  external: []
};
let _externalMatcher = () => false;
function setTransformConfig(config) {
  _transformConfig = config;
  _externalMatcher = (0, import_util.createFileMatcher)(_transformConfig.external);
}
function transformConfig() {
  return _transformConfig;
}
let _singleTSConfigPath;
let _singleTSConfig;
function setSingleTSConfig(value) {
  _singleTSConfigPath = value;
}
function singleTSConfig() {
  return _singleTSConfigPath;
}
function validateTsConfig(tsconfig) {
  const pathsBase = tsconfig.absoluteBaseUrl ?? tsconfig.paths?.pathsBasePath;
  const pathsFallback = tsconfig.absoluteBaseUrl ? [{ key: "*", values: ["*"] }] : [];
  return {
    allowJs: !!tsconfig.allowJs,
    pathsBase,
    paths: Object.entries(tsconfig.paths?.mapping || {}).map(([key, values]) => ({ key, values })).concat(pathsFallback)
  };
}
function loadAndValidateTsconfigsForFile(file2) {
  if (_singleTSConfigPath && !_singleTSConfig)
    _singleTSConfig = (0, import_tsconfig_loader.loadTsConfig)(_singleTSConfigPath).map(validateTsConfig);
  if (_singleTSConfig)
    return _singleTSConfig;
  return loadAndValidateTsconfigsForFolder(import_path.default.dirname(file2));
}
function loadAndValidateTsconfigsForFolder(folder) {
  const foldersWithConfig = [];
  let currentFolder = import_path.default.resolve(folder);
  let result2;
  while (true) {
    const cached = cachedTSConfigs.get(currentFolder);
    if (cached) {
      result2 = cached;
      break;
    }
    foldersWithConfig.push(currentFolder);
    for (const name of ["tsconfig.json", "jsconfig.json"]) {
      const configPath = import_path.default.join(currentFolder, name);
      if (import_fs.default.existsSync(configPath)) {
        const loaded = (0, import_tsconfig_loader.loadTsConfig)(configPath);
        result2 = loaded.map(validateTsConfig);
        break;
      }
    }
    if (result2)
      break;
    const parentFolder = import_path.default.resolve(currentFolder, "../");
    if (currentFolder === parentFolder)
      break;
    currentFolder = parentFolder;
  }
  result2 = result2 || [];
  for (const folder2 of foldersWithConfig)
    cachedTSConfigs.set(folder2, result2);
  return result2;
}
const pathSeparator = process.platform === "win32" ? ";" : ":";
const builtins = new Set(import_module.default.builtinModules);
function resolveHook(filename, specifier) {
  if (specifier.startsWith("node:") || builtins.has(specifier))
    return;
  if (!shouldTransform(filename))
    return;
  if (isRelativeSpecifier(specifier))
    return (0, import_util.resolveImportSpecifierAfterMapping)(import_path.default.resolve(import_path.default.dirname(filename), specifier), false);
  const isTypeScript = filename.endsWith(".ts") || filename.endsWith(".tsx");
  const tsconfigs = loadAndValidateTsconfigsForFile(filename);
  for (const tsconfig of tsconfigs) {
    if (!isTypeScript && !tsconfig.allowJs)
      continue;
    let longestPrefixLength = -1;
    let pathMatchedByLongestPrefix;
    for (const { key, values } of tsconfig.paths) {
      let matchedPartOfSpecifier = specifier;
      const [keyPrefix, keySuffix] = key.split("*");
      if (key.includes("*")) {
        if (keyPrefix) {
          if (!specifier.startsWith(keyPrefix))
            continue;
          matchedPartOfSpecifier = matchedPartOfSpecifier.substring(keyPrefix.length, matchedPartOfSpecifier.length);
        }
        if (keySuffix) {
          if (!specifier.endsWith(keySuffix))
            continue;
          matchedPartOfSpecifier = matchedPartOfSpecifier.substring(0, matchedPartOfSpecifier.length - keySuffix.length);
        }
      } else {
        if (specifier !== key)
          continue;
        matchedPartOfSpecifier = specifier;
      }
      if (keyPrefix.length <= longestPrefixLength)
        continue;
      for (const value of values) {
        let candidate = value;
        if (value.includes("*"))
          candidate = candidate.replace("*", matchedPartOfSpecifier);
        candidate = import_path.default.resolve(tsconfig.pathsBase, candidate);
        const existing = (0, import_util.resolveImportSpecifierAfterMapping)(candidate, true);
        if (existing) {
          longestPrefixLength = keyPrefix.length;
          pathMatchedByLongestPrefix = existing;
        }
      }
    }
    if (pathMatchedByLongestPrefix)
      return pathMatchedByLongestPrefix;
  }
  if (import_path.default.isAbsolute(specifier)) {
    return (0, import_util.resolveImportSpecifierAfterMapping)(specifier, false);
  }
}
function shouldTransform(filename) {
  if (_externalMatcher(filename))
    return false;
  return !(0, import_compilationCache.belongsToNodeModules)(filename);
}
let transformData;
function setTransformData(pluginName, value) {
  transformData.set(pluginName, value);
}
function transformHook(originalCode, filename, moduleUrl) {
  let inputSourceMap;
  if (filename.endsWith(".md") && false) {
    const transformed = transformMDToTS(originalCode, filename);
    originalCode = transformed.code;
    inputSourceMap = transformed.map;
  }
  const hasPreprocessor = process.env.PW_TEST_SOURCE_TRANSFORM && process.env.PW_TEST_SOURCE_TRANSFORM_SCOPE && process.env.PW_TEST_SOURCE_TRANSFORM_SCOPE.split(pathSeparator).some((f) => filename.startsWith(f));
  const pluginsPrologue = _transformConfig.babelPlugins;
  const pluginsEpilogue = hasPreprocessor ? [[process.env.PW_TEST_SOURCE_TRANSFORM]] : [];
  const hash = calculateHash(originalCode, filename, !!moduleUrl, pluginsPrologue, pluginsEpilogue);
  const { cachedCode, addToCache, serializedCache } = (0, import_compilationCache.getFromCompilationCache)(filename, hash, moduleUrl);
  if (cachedCode !== void 0)
    return { code: cachedCode, serializedCache };
  process.env.BROWSERSLIST_IGNORE_OLD_DATA = "true";
  const { babelTransform } = require("./babelBundle");
  transformData = /* @__PURE__ */ new Map();
  const babelResult = babelTransform(originalCode, filename, !!moduleUrl, pluginsPrologue, pluginsEpilogue, inputSourceMap);
  if (!babelResult?.code)
    return { code: originalCode, serializedCache };
  const { code, map } = babelResult;
  const added = addToCache(code, map, transformData);
  return { code, serializedCache: added.serializedCache };
}
function calculateHash(content, filePath, isModule2, pluginsPrologue, pluginsEpilogue) {
  const hash = import_crypto.default.createHash("sha1").update(isModule2 ? "esm" : "no_esm").update(content).update(filePath).update(version).update(pluginsPrologue.map((p) => p[0]).join(",")).update(pluginsEpilogue.map((p) => p[0]).join(",")).digest("hex");
  return hash;
}
async function requireOrImport(file) {
  installTransformIfNeeded();
  const isModule = (0, import_util.fileIsModule)(file);
  if (isModule) {
    const fileName = import_url.default.pathToFileURL(file);
    const esmImport = () => eval(`import(${JSON.stringify(fileName)})`);
    await eval(`import(${JSON.stringify(fileName + ".esm.preflight")})`).finally(nextTask);
    return await esmImport().finally(nextTask);
  }
  const result = require(file);
  const depsCollector = (0, import_compilationCache.currentFileDepsCollector)();
  if (depsCollector) {
    const module2 = require.cache[file];
    if (module2)
      collectCJSDependencies(module2, depsCollector);
  }
  return result;
}
let transformInstalled = false;
function installTransformIfNeeded() {
  if (transformInstalled)
    return;
  transformInstalled = true;
  (0, import_compilationCache.installSourceMapSupport)();
  const originalResolveFilename = import_module.default._resolveFilename;
  function resolveFilename(specifier, parent, ...rest) {
    if (parent) {
      const resolved = resolveHook(parent.filename, specifier);
      if (resolved !== void 0)
        specifier = resolved;
    }
    return originalResolveFilename.call(this, specifier, parent, ...rest);
  }
  import_module.default._resolveFilename = resolveFilename;
  (0, import_pirates.addHook)((code, filename) => {
    return transformHook(code, filename).code;
  }, shouldTransform, [".ts", ".tsx", ".js", ".jsx", ".mjs", ".mts", ".cjs", ".cts", ".md"]);
}
const collectCJSDependencies = (module2, dependencies) => {
  module2.children.forEach((child) => {
    if (!(0, import_compilationCache.belongsToNodeModules)(child.filename) && !dependencies.has(child.filename)) {
      dependencies.add(child.filename);
      collectCJSDependencies(child, dependencies);
    }
  });
};
function wrapFunctionWithLocation(func) {
  return (...args) => {
    const oldPrepareStackTrace = Error.prepareStackTrace;
    Error.prepareStackTrace = (error, stackFrames) => {
      const frame = import_utilsBundle.sourceMapSupport.wrapCallSite(stackFrames[1]);
      const fileName2 = frame.getFileName();
      const file2 = fileName2 && fileName2.startsWith("file://") ? import_url.default.fileURLToPath(fileName2) : fileName2;
      return {
        file: file2,
        line: frame.getLineNumber(),
        column: frame.getColumnNumber()
      };
    };
    const oldStackTraceLimit = Error.stackTraceLimit;
    Error.stackTraceLimit = 2;
    const obj = {};
    Error.captureStackTrace(obj);
    const location = obj.stack;
    Error.stackTraceLimit = oldStackTraceLimit;
    Error.prepareStackTrace = oldPrepareStackTrace;
    return func(location, ...args);
  };
}
function isRelativeSpecifier(specifier) {
  return specifier === "." || specifier === ".." || specifier.startsWith("./") || specifier.startsWith("../");
}
async function nextTask() {
  return new Promise((resolve) => setTimeout(resolve, 0));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  requireOrImport,
  resolveHook,
  setSingleTSConfig,
  setTransformConfig,
  setTransformData,
  shouldTransform,
  singleTSConfig,
  transformConfig,
  transformHook,
  wrapFunctionWithLocation
});

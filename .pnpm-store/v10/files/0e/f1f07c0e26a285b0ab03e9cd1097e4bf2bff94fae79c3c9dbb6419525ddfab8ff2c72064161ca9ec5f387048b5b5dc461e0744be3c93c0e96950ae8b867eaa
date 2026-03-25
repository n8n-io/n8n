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
var compilationCache_exports = {};
__export(compilationCache_exports, {
  addToCompilationCache: () => addToCompilationCache,
  affectedTestFiles: () => affectedTestFiles,
  belongsToNodeModules: () => belongsToNodeModules,
  cacheDir: () => cacheDir,
  collectAffectedTestFiles: () => collectAffectedTestFiles,
  currentFileDepsCollector: () => currentFileDepsCollector,
  dependenciesForTestFile: () => dependenciesForTestFile,
  fileDependenciesForTest: () => fileDependenciesForTest,
  getFromCompilationCache: () => getFromCompilationCache,
  getUserData: () => getUserData,
  installSourceMapSupport: () => installSourceMapSupport,
  internalDependenciesForTestFile: () => internalDependenciesForTestFile,
  serializeCompilationCache: () => serializeCompilationCache,
  setExternalDependencies: () => setExternalDependencies,
  startCollectingFileDeps: () => startCollectingFileDeps,
  stopCollectingFileDeps: () => stopCollectingFileDeps
});
module.exports = __toCommonJS(compilationCache_exports);
var import_fs = __toESM(require("fs"));
var import_os = __toESM(require("os"));
var import_path = __toESM(require("path"));
var import_utils = require("playwright-core/lib/utils");
var import_globals = require("../common/globals");
var import_utilsBundle = require("../utilsBundle");
const cacheDir = process.env.PWTEST_CACHE_DIR || (() => {
  if (process.platform === "win32")
    return import_path.default.join(import_os.default.tmpdir(), `playwright-transform-cache`);
  return import_path.default.join(import_os.default.tmpdir(), `playwright-transform-cache-` + process.geteuid?.());
})();
const sourceMaps = /* @__PURE__ */ new Map();
const memoryCache = /* @__PURE__ */ new Map();
const fileDependencies = /* @__PURE__ */ new Map();
const externalDependencies = /* @__PURE__ */ new Map();
function installSourceMapSupport() {
  Error.stackTraceLimit = 200;
  import_utilsBundle.sourceMapSupport.install({
    environment: "node",
    handleUncaughtExceptions: false,
    retrieveSourceMap(source) {
      if (source.startsWith("file://") && !sourceMaps.has(source))
        source = source.substring("file://".length);
      if (!sourceMaps.has(source))
        return null;
      const sourceMapPath = sourceMaps.get(source);
      try {
        return {
          map: JSON.parse(import_fs.default.readFileSync(sourceMapPath, "utf-8")),
          url: source
        };
      } catch {
        return null;
      }
    }
  });
}
function _innerAddToCompilationCacheAndSerialize(filename, entry) {
  sourceMaps.set(entry.moduleUrl || filename, entry.sourceMapPath);
  memoryCache.set(filename, entry);
  return {
    sourceMaps: [[entry.moduleUrl || filename, entry.sourceMapPath]],
    memoryCache: [[filename, entry]],
    fileDependencies: [],
    externalDependencies: []
  };
}
function getFromCompilationCache(filename, contentHash, moduleUrl) {
  const cache = memoryCache.get(filename);
  if (cache?.codePath) {
    try {
      return { cachedCode: import_fs.default.readFileSync(cache.codePath, "utf-8") };
    } catch {
    }
  }
  const filePathHash = calculateFilePathHash(filename);
  const hashPrefix = filePathHash + "_" + contentHash.substring(0, 7);
  const cacheFolderName = filePathHash.substring(0, 2);
  const cachePath = calculateCachePath(filename, cacheFolderName, hashPrefix);
  const codePath = cachePath + ".js";
  const sourceMapPath = cachePath + ".map";
  const dataPath = cachePath + ".data";
  try {
    const cachedCode = import_fs.default.readFileSync(codePath, "utf8");
    const serializedCache = _innerAddToCompilationCacheAndSerialize(filename, { codePath, sourceMapPath, dataPath, moduleUrl });
    return { cachedCode, serializedCache };
  } catch {
  }
  return {
    addToCache: (code, map, data) => {
      if ((0, import_globals.isWorkerProcess)())
        return {};
      clearOldCacheEntries(cacheFolderName, filePathHash);
      import_fs.default.mkdirSync(import_path.default.dirname(cachePath), { recursive: true });
      if (map)
        import_fs.default.writeFileSync(sourceMapPath, JSON.stringify(map), "utf8");
      if (data.size)
        import_fs.default.writeFileSync(dataPath, JSON.stringify(Object.fromEntries(data.entries()), void 0, 2), "utf8");
      import_fs.default.writeFileSync(codePath, code, "utf8");
      const serializedCache = _innerAddToCompilationCacheAndSerialize(filename, { codePath, sourceMapPath, dataPath, moduleUrl });
      return { serializedCache };
    }
  };
}
function serializeCompilationCache() {
  return {
    sourceMaps: [...sourceMaps.entries()],
    memoryCache: [...memoryCache.entries()],
    fileDependencies: [...fileDependencies.entries()].map(([filename, deps]) => [filename, [...deps]]),
    externalDependencies: [...externalDependencies.entries()].map(([filename, deps]) => [filename, [...deps]])
  };
}
function addToCompilationCache(payload) {
  for (const entry of payload.sourceMaps)
    sourceMaps.set(entry[0], entry[1]);
  for (const entry of payload.memoryCache)
    memoryCache.set(entry[0], entry[1]);
  for (const entry of payload.fileDependencies) {
    const existing = fileDependencies.get(entry[0]) || [];
    fileDependencies.set(entry[0], /* @__PURE__ */ new Set([...entry[1], ...existing]));
  }
  for (const entry of payload.externalDependencies) {
    const existing = externalDependencies.get(entry[0]) || [];
    externalDependencies.set(entry[0], /* @__PURE__ */ new Set([...entry[1], ...existing]));
  }
}
function calculateFilePathHash(filePath) {
  return (0, import_utils.calculateSha1)(filePath).substring(0, 10);
}
function calculateCachePath(filePath, cacheFolderName, hashPrefix) {
  const fileName = hashPrefix + "_" + import_path.default.basename(filePath, import_path.default.extname(filePath)).replace(/\W/g, "");
  return import_path.default.join(cacheDir, cacheFolderName, fileName);
}
function clearOldCacheEntries(cacheFolderName, filePathHash) {
  const cachePath = import_path.default.join(cacheDir, cacheFolderName);
  try {
    const cachedRelevantFiles = import_fs.default.readdirSync(cachePath).filter((file) => file.startsWith(filePathHash));
    for (const file of cachedRelevantFiles)
      import_fs.default.rmSync(import_path.default.join(cachePath, file), { force: true });
  } catch {
  }
}
let depsCollector;
function startCollectingFileDeps() {
  depsCollector = /* @__PURE__ */ new Set();
}
function stopCollectingFileDeps(filename) {
  if (!depsCollector)
    return;
  depsCollector.delete(filename);
  for (const dep of depsCollector) {
    if (belongsToNodeModules(dep))
      depsCollector.delete(dep);
  }
  fileDependencies.set(filename, depsCollector);
  depsCollector = void 0;
}
function currentFileDepsCollector() {
  return depsCollector;
}
function setExternalDependencies(filename, deps) {
  const depsSet = new Set(deps.filter((dep) => !belongsToNodeModules(dep) && dep !== filename));
  externalDependencies.set(filename, depsSet);
}
function fileDependenciesForTest() {
  return fileDependencies;
}
function collectAffectedTestFiles(changedFile, testFileCollector) {
  const isTestFile = (file) => fileDependencies.has(file);
  if (isTestFile(changedFile))
    testFileCollector.add(changedFile);
  for (const [testFile, deps] of fileDependencies) {
    if (deps.has(changedFile))
      testFileCollector.add(testFile);
  }
  for (const [importingFile, depsOfImportingFile] of externalDependencies) {
    if (depsOfImportingFile.has(changedFile)) {
      if (isTestFile(importingFile))
        testFileCollector.add(importingFile);
      for (const [testFile, depsOfTestFile] of fileDependencies) {
        if (depsOfTestFile.has(importingFile))
          testFileCollector.add(testFile);
      }
    }
  }
}
function affectedTestFiles(changes) {
  const result = /* @__PURE__ */ new Set();
  for (const change of changes)
    collectAffectedTestFiles(change, result);
  return [...result];
}
function internalDependenciesForTestFile(filename) {
  return fileDependencies.get(filename);
}
function dependenciesForTestFile(filename) {
  const result = /* @__PURE__ */ new Set();
  for (const testDependency of fileDependencies.get(filename) || []) {
    result.add(testDependency);
    for (const externalDependency of externalDependencies.get(testDependency) || [])
      result.add(externalDependency);
  }
  for (const dep of externalDependencies.get(filename) || [])
    result.add(dep);
  return result;
}
const kPlaywrightInternalPrefix = import_path.default.resolve(__dirname, "../../../playwright");
function belongsToNodeModules(file) {
  if (file.includes(`${import_path.default.sep}node_modules${import_path.default.sep}`))
    return true;
  if (file.startsWith(kPlaywrightInternalPrefix) && (file.endsWith(".js") || file.endsWith(".mjs")))
    return true;
  return false;
}
async function getUserData(pluginName) {
  const result = /* @__PURE__ */ new Map();
  for (const [fileName, cache] of memoryCache) {
    if (!cache.dataPath)
      continue;
    if (!import_fs.default.existsSync(cache.dataPath))
      continue;
    const data = JSON.parse(await import_fs.default.promises.readFile(cache.dataPath, "utf8"));
    if (data[pluginName])
      result.set(fileName, data[pluginName]);
  }
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  addToCompilationCache,
  affectedTestFiles,
  belongsToNodeModules,
  cacheDir,
  collectAffectedTestFiles,
  currentFileDepsCollector,
  dependenciesForTestFile,
  fileDependenciesForTest,
  getFromCompilationCache,
  getUserData,
  installSourceMapSupport,
  internalDependenciesForTestFile,
  serializeCompilationCache,
  setExternalDependencies,
  startCollectingFileDeps,
  stopCollectingFileDeps
});

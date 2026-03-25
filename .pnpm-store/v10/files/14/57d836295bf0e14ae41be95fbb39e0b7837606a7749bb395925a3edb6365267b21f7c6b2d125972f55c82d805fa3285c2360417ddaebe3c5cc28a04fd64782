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
var tsconfig_loader_exports = {};
__export(tsconfig_loader_exports, {
  loadTsConfig: () => loadTsConfig
});
module.exports = __toCommonJS(tsconfig_loader_exports);
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var import_utilsBundle = require("../utilsBundle");
function loadTsConfig(configPath) {
  try {
    const references = [];
    const config = innerLoadTsConfig(configPath, references);
    return [config, ...references];
  } catch (e) {
    throw new Error(`Failed to load tsconfig file at ${configPath}:
${e.message}`);
  }
}
function resolveConfigFile(baseConfigFile, referencedConfigFile) {
  if (!referencedConfigFile.endsWith(".json"))
    referencedConfigFile += ".json";
  const currentDir = import_path.default.dirname(baseConfigFile);
  let resolvedConfigFile = import_path.default.resolve(currentDir, referencedConfigFile);
  if (referencedConfigFile.includes("/") && referencedConfigFile.includes(".") && !import_fs.default.existsSync(resolvedConfigFile))
    resolvedConfigFile = import_path.default.join(currentDir, "node_modules", referencedConfigFile);
  return resolvedConfigFile;
}
function innerLoadTsConfig(configFilePath, references, visited = /* @__PURE__ */ new Map()) {
  if (visited.has(configFilePath))
    return visited.get(configFilePath);
  let result = {
    tsConfigPath: configFilePath
  };
  visited.set(configFilePath, result);
  if (!import_fs.default.existsSync(configFilePath))
    return result;
  const configString = import_fs.default.readFileSync(configFilePath, "utf-8");
  const cleanedJson = StripBom(configString);
  const parsedConfig = import_utilsBundle.json5.parse(cleanedJson);
  const extendsArray = Array.isArray(parsedConfig.extends) ? parsedConfig.extends : parsedConfig.extends ? [parsedConfig.extends] : [];
  for (const extendedConfig of extendsArray) {
    const extendedConfigPath = resolveConfigFile(configFilePath, extendedConfig);
    const base = innerLoadTsConfig(extendedConfigPath, references, visited);
    Object.assign(result, base, { tsConfigPath: configFilePath });
  }
  if (parsedConfig.compilerOptions?.allowJs !== void 0)
    result.allowJs = parsedConfig.compilerOptions.allowJs;
  if (parsedConfig.compilerOptions?.paths !== void 0) {
    result.paths = {
      mapping: parsedConfig.compilerOptions.paths,
      pathsBasePath: import_path.default.dirname(configFilePath)
    };
  }
  if (parsedConfig.compilerOptions?.baseUrl !== void 0) {
    result.absoluteBaseUrl = import_path.default.resolve(import_path.default.dirname(configFilePath), parsedConfig.compilerOptions.baseUrl);
  }
  for (const ref of parsedConfig.references || [])
    references.push(innerLoadTsConfig(resolveConfigFile(configFilePath, ref.path), references, visited));
  if (import_path.default.basename(configFilePath) === "jsconfig.json" && result.allowJs === void 0)
    result.allowJs = true;
  return result;
}
function StripBom(string) {
  if (typeof string !== "string") {
    throw new TypeError(`Expected a string, got ${typeof string}`);
  }
  if (string.charCodeAt(0) === 65279) {
    return string.slice(1);
  }
  return string;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  loadTsConfig
});

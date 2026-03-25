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
var configLoader_exports = {};
__export(configLoader_exports, {
  defineConfig: () => defineConfig,
  deserializeConfig: () => deserializeConfig,
  loadConfig: () => loadConfig,
  loadConfigFromFile: () => loadConfigFromFile,
  loadEmptyConfigForMergeReports: () => loadEmptyConfigForMergeReports,
  resolveConfigLocation: () => resolveConfigLocation
});
module.exports = __toCommonJS(configLoader_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_utils = require("playwright-core/lib/utils");
var import_transform = require("../transform/transform");
var import_util = require("../util");
var import_config = require("./config");
var import_esmLoaderHost = require("./esmLoaderHost");
var import_compilationCache = require("../transform/compilationCache");
const kDefineConfigWasUsed = Symbol("defineConfigWasUsed");
const defineConfig = (...configs) => {
  let result = configs[0];
  for (let i = 1; i < configs.length; ++i) {
    const config = configs[i];
    const prevProjects = result.projects;
    result = {
      ...result,
      ...config,
      expect: {
        ...result.expect,
        ...config.expect
      },
      use: {
        ...result.use,
        ...config.use
      },
      build: {
        ...result.build,
        ...config.build
      },
      webServer: [
        ...Array.isArray(result.webServer) ? result.webServer : result.webServer ? [result.webServer] : [],
        ...Array.isArray(config.webServer) ? config.webServer : config.webServer ? [config.webServer] : []
      ]
    };
    if (!result.projects && !config.projects)
      continue;
    const projectOverrides = /* @__PURE__ */ new Map();
    for (const project of config.projects || [])
      projectOverrides.set(project.name, project);
    const projects = [];
    for (const project of prevProjects || []) {
      const projectOverride = projectOverrides.get(project.name);
      if (projectOverride) {
        projects.push({
          ...project,
          ...projectOverride,
          use: {
            ...project.use,
            ...projectOverride.use
          }
        });
        projectOverrides.delete(project.name);
      } else {
        projects.push(project);
      }
    }
    projects.push(...projectOverrides.values());
    result.projects = projects;
  }
  result[kDefineConfigWasUsed] = true;
  return result;
};
async function deserializeConfig(data) {
  if (data.compilationCache)
    (0, import_compilationCache.addToCompilationCache)(data.compilationCache);
  return await loadConfig(data.location, data.configCLIOverrides, void 0, data.metadata ? JSON.parse(data.metadata) : void 0);
}
async function loadUserConfig(location) {
  let object = location.resolvedConfigFile ? await (0, import_transform.requireOrImport)(location.resolvedConfigFile) : {};
  if (object && typeof object === "object" && "default" in object)
    object = object["default"];
  return object;
}
async function loadConfig(location, overrides, ignoreProjectDependencies = false, metadata) {
  if (!(0, import_esmLoaderHost.registerESMLoader)()) {
    if (location.resolvedConfigFile && (0, import_util.fileIsModule)(location.resolvedConfigFile))
      throw (0, import_util.errorWithFile)(location.resolvedConfigFile, `Playwright requires Node.js 18.19 or higher to load esm modules. Please update your version of Node.js.`);
  }
  (0, import_transform.setSingleTSConfig)(overrides?.tsconfig);
  await (0, import_esmLoaderHost.configureESMLoader)();
  const userConfig = await loadUserConfig(location);
  validateConfig(location.resolvedConfigFile || "<default config>", userConfig);
  const fullConfig = new import_config.FullConfigInternal(location, userConfig, overrides || {}, metadata);
  fullConfig.defineConfigWasUsed = !!userConfig[kDefineConfigWasUsed];
  if (ignoreProjectDependencies) {
    for (const project of fullConfig.projects) {
      project.deps = [];
      project.teardown = void 0;
    }
  }
  const babelPlugins = userConfig["@playwright/test"]?.babelPlugins || [];
  const external = userConfig.build?.external || [];
  (0, import_transform.setTransformConfig)({ babelPlugins, external });
  if (!overrides?.tsconfig)
    (0, import_transform.setSingleTSConfig)(fullConfig?.singleTSConfigPath);
  await (0, import_esmLoaderHost.configureESMLoaderTransformConfig)();
  return fullConfig;
}
function validateConfig(file, config) {
  if (typeof config !== "object" || !config)
    throw (0, import_util.errorWithFile)(file, `Configuration file must export a single object`);
  validateProject(file, config, "config");
  if ("forbidOnly" in config && config.forbidOnly !== void 0) {
    if (typeof config.forbidOnly !== "boolean")
      throw (0, import_util.errorWithFile)(file, `config.forbidOnly must be a boolean`);
  }
  if ("globalSetup" in config && config.globalSetup !== void 0) {
    if (Array.isArray(config.globalSetup)) {
      config.globalSetup.forEach((item, index) => {
        if (typeof item !== "string")
          throw (0, import_util.errorWithFile)(file, `config.globalSetup[${index}] must be a string`);
      });
    } else if (typeof config.globalSetup !== "string") {
      throw (0, import_util.errorWithFile)(file, `config.globalSetup must be a string`);
    }
  }
  if ("globalTeardown" in config && config.globalTeardown !== void 0) {
    if (Array.isArray(config.globalTeardown)) {
      config.globalTeardown.forEach((item, index) => {
        if (typeof item !== "string")
          throw (0, import_util.errorWithFile)(file, `config.globalTeardown[${index}] must be a string`);
      });
    } else if (typeof config.globalTeardown !== "string") {
      throw (0, import_util.errorWithFile)(file, `config.globalTeardown must be a string`);
    }
  }
  if ("globalTimeout" in config && config.globalTimeout !== void 0) {
    if (typeof config.globalTimeout !== "number" || config.globalTimeout < 0)
      throw (0, import_util.errorWithFile)(file, `config.globalTimeout must be a non-negative number`);
  }
  if ("grep" in config && config.grep !== void 0) {
    if (Array.isArray(config.grep)) {
      config.grep.forEach((item, index) => {
        if (!(0, import_utils.isRegExp)(item))
          throw (0, import_util.errorWithFile)(file, `config.grep[${index}] must be a RegExp`);
      });
    } else if (!(0, import_utils.isRegExp)(config.grep)) {
      throw (0, import_util.errorWithFile)(file, `config.grep must be a RegExp`);
    }
  }
  if ("grepInvert" in config && config.grepInvert !== void 0) {
    if (Array.isArray(config.grepInvert)) {
      config.grepInvert.forEach((item, index) => {
        if (!(0, import_utils.isRegExp)(item))
          throw (0, import_util.errorWithFile)(file, `config.grepInvert[${index}] must be a RegExp`);
      });
    } else if (!(0, import_utils.isRegExp)(config.grepInvert)) {
      throw (0, import_util.errorWithFile)(file, `config.grepInvert must be a RegExp`);
    }
  }
  if ("maxFailures" in config && config.maxFailures !== void 0) {
    if (typeof config.maxFailures !== "number" || config.maxFailures < 0)
      throw (0, import_util.errorWithFile)(file, `config.maxFailures must be a non-negative number`);
  }
  if ("preserveOutput" in config && config.preserveOutput !== void 0) {
    if (typeof config.preserveOutput !== "string" || !["always", "never", "failures-only"].includes(config.preserveOutput))
      throw (0, import_util.errorWithFile)(file, `config.preserveOutput must be one of "always", "never" or "failures-only"`);
  }
  if ("projects" in config && config.projects !== void 0) {
    if (!Array.isArray(config.projects))
      throw (0, import_util.errorWithFile)(file, `config.projects must be an array`);
    config.projects.forEach((project, index) => {
      validateProject(file, project, `config.projects[${index}]`);
    });
  }
  if ("quiet" in config && config.quiet !== void 0) {
    if (typeof config.quiet !== "boolean")
      throw (0, import_util.errorWithFile)(file, `config.quiet must be a boolean`);
  }
  if ("reporter" in config && config.reporter !== void 0) {
    if (Array.isArray(config.reporter)) {
      config.reporter.forEach((item, index) => {
        if (!Array.isArray(item) || item.length <= 0 || item.length > 2 || typeof item[0] !== "string")
          throw (0, import_util.errorWithFile)(file, `config.reporter[${index}] must be a tuple [name, optionalArgument]`);
      });
    } else if (typeof config.reporter !== "string") {
      throw (0, import_util.errorWithFile)(file, `config.reporter must be a string`);
    }
  }
  if ("reportSlowTests" in config && config.reportSlowTests !== void 0 && config.reportSlowTests !== null) {
    if (!config.reportSlowTests || typeof config.reportSlowTests !== "object")
      throw (0, import_util.errorWithFile)(file, `config.reportSlowTests must be an object`);
    if (!("max" in config.reportSlowTests) || typeof config.reportSlowTests.max !== "number" || config.reportSlowTests.max < 0)
      throw (0, import_util.errorWithFile)(file, `config.reportSlowTests.max must be a non-negative number`);
    if (!("threshold" in config.reportSlowTests) || typeof config.reportSlowTests.threshold !== "number" || config.reportSlowTests.threshold < 0)
      throw (0, import_util.errorWithFile)(file, `config.reportSlowTests.threshold must be a non-negative number`);
  }
  if ("shard" in config && config.shard !== void 0 && config.shard !== null) {
    if (!config.shard || typeof config.shard !== "object")
      throw (0, import_util.errorWithFile)(file, `config.shard must be an object`);
    if (!("total" in config.shard) || typeof config.shard.total !== "number" || config.shard.total < 1)
      throw (0, import_util.errorWithFile)(file, `config.shard.total must be a positive number`);
    if (!("current" in config.shard) || typeof config.shard.current !== "number" || config.shard.current < 1 || config.shard.current > config.shard.total)
      throw (0, import_util.errorWithFile)(file, `config.shard.current must be a positive number, not greater than config.shard.total`);
  }
  if ("updateSnapshots" in config && config.updateSnapshots !== void 0) {
    if (typeof config.updateSnapshots !== "string" || !["all", "changed", "missing", "none"].includes(config.updateSnapshots))
      throw (0, import_util.errorWithFile)(file, `config.updateSnapshots must be one of "all", "changed", "missing" or "none"`);
  }
  if ("tsconfig" in config && config.tsconfig !== void 0) {
    if (typeof config.tsconfig !== "string")
      throw (0, import_util.errorWithFile)(file, `config.tsconfig must be a string`);
    if (!import_fs.default.existsSync(import_path.default.resolve(file, "..", config.tsconfig)))
      throw (0, import_util.errorWithFile)(file, `config.tsconfig does not exist`);
  }
}
function validateProject(file, project, title) {
  if (typeof project !== "object" || !project)
    throw (0, import_util.errorWithFile)(file, `${title} must be an object`);
  if ("name" in project && project.name !== void 0) {
    if (typeof project.name !== "string")
      throw (0, import_util.errorWithFile)(file, `${title}.name must be a string`);
  }
  if ("outputDir" in project && project.outputDir !== void 0) {
    if (typeof project.outputDir !== "string")
      throw (0, import_util.errorWithFile)(file, `${title}.outputDir must be a string`);
  }
  if ("repeatEach" in project && project.repeatEach !== void 0) {
    if (typeof project.repeatEach !== "number" || project.repeatEach < 0)
      throw (0, import_util.errorWithFile)(file, `${title}.repeatEach must be a non-negative number`);
  }
  if ("retries" in project && project.retries !== void 0) {
    if (typeof project.retries !== "number" || project.retries < 0)
      throw (0, import_util.errorWithFile)(file, `${title}.retries must be a non-negative number`);
  }
  if ("testDir" in project && project.testDir !== void 0) {
    if (typeof project.testDir !== "string")
      throw (0, import_util.errorWithFile)(file, `${title}.testDir must be a string`);
  }
  for (const prop of ["testIgnore", "testMatch"]) {
    if (prop in project && project[prop] !== void 0) {
      const value = project[prop];
      if (Array.isArray(value)) {
        value.forEach((item, index) => {
          if (typeof item !== "string" && !(0, import_utils.isRegExp)(item))
            throw (0, import_util.errorWithFile)(file, `${title}.${prop}[${index}] must be a string or a RegExp`);
        });
      } else if (typeof value !== "string" && !(0, import_utils.isRegExp)(value)) {
        throw (0, import_util.errorWithFile)(file, `${title}.${prop} must be a string or a RegExp`);
      }
    }
  }
  if ("timeout" in project && project.timeout !== void 0) {
    if (typeof project.timeout !== "number" || project.timeout < 0)
      throw (0, import_util.errorWithFile)(file, `${title}.timeout must be a non-negative number`);
  }
  if ("use" in project && project.use !== void 0) {
    if (!project.use || typeof project.use !== "object")
      throw (0, import_util.errorWithFile)(file, `${title}.use must be an object`);
  }
  if ("ignoreSnapshots" in project && project.ignoreSnapshots !== void 0) {
    if (typeof project.ignoreSnapshots !== "boolean")
      throw (0, import_util.errorWithFile)(file, `${title}.ignoreSnapshots must be a boolean`);
  }
  if ("workers" in project && project.workers !== void 0) {
    if (typeof project.workers === "number" && project.workers <= 0)
      throw (0, import_util.errorWithFile)(file, `${title}.workers must be a positive number`);
    else if (typeof project.workers === "string" && !project.workers.endsWith("%"))
      throw (0, import_util.errorWithFile)(file, `${title}.workers must be a number or percentage`);
  }
}
function resolveConfigLocation(configFile) {
  const configFileOrDirectory = configFile ? import_path.default.resolve(process.cwd(), configFile) : process.cwd();
  const resolvedConfigFile = resolveConfigFile(configFileOrDirectory);
  return {
    resolvedConfigFile,
    configDir: resolvedConfigFile ? import_path.default.dirname(resolvedConfigFile) : configFileOrDirectory
  };
}
function resolveConfigFile(configFileOrDirectory) {
  const resolveConfig = (configFile) => {
    if (import_fs.default.existsSync(configFile))
      return configFile;
  };
  const resolveConfigFileFromDirectory = (directory) => {
    for (const ext of [".ts", ".js", ".mts", ".mjs", ".cts", ".cjs"]) {
      const configFile = resolveConfig(import_path.default.resolve(directory, "playwright.config" + ext));
      if (configFile)
        return configFile;
    }
  };
  if (!import_fs.default.existsSync(configFileOrDirectory))
    throw new Error(`${configFileOrDirectory} does not exist`);
  if (import_fs.default.statSync(configFileOrDirectory).isDirectory()) {
    const configFile = resolveConfigFileFromDirectory(configFileOrDirectory);
    if (configFile)
      return configFile;
    return void 0;
  }
  return configFileOrDirectory;
}
async function loadConfigFromFile(configFile, overrides, ignoreDeps) {
  return await loadConfig(resolveConfigLocation(configFile), overrides, ignoreDeps);
}
async function loadEmptyConfigForMergeReports() {
  return await loadConfig({ configDir: process.cwd() });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  defineConfig,
  deserializeConfig,
  loadConfig,
  loadConfigFromFile,
  loadEmptyConfigForMergeReports,
  resolveConfigLocation
});

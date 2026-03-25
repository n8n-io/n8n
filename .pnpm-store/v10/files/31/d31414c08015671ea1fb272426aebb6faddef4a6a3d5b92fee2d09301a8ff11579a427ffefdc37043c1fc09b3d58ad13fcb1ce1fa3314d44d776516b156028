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
var loadUtils_exports = {};
__export(loadUtils_exports, {
  collectProjectsAndTestFiles: () => collectProjectsAndTestFiles,
  createRootSuite: () => createRootSuite,
  loadFileSuites: () => loadFileSuites,
  loadGlobalHook: () => loadGlobalHook,
  loadReporter: () => loadReporter,
  loadTestList: () => loadTestList
});
module.exports = __toCommonJS(loadUtils_exports);
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var import_utils = require("playwright-core/lib/utils");
var import_loaderHost = require("./loaderHost");
var import_util = require("../util");
var import_projectUtils = require("./projectUtils");
var import_testGroups = require("./testGroups");
var import_suiteUtils = require("../common/suiteUtils");
var import_test = require("../common/test");
var import_compilationCache = require("../transform/compilationCache");
var import_transform = require("../transform/transform");
var import_utilsBundle = require("../utilsBundle");
async function collectProjectsAndTestFiles(testRun, doNotRunTestsOutsideProjectFilter) {
  const config = testRun.config;
  const fsCache = /* @__PURE__ */ new Map();
  const sourceMapCache = /* @__PURE__ */ new Map();
  const cliFileMatcher = config.cliArgs.length ? (0, import_util.createFileMatcherFromArguments)(config.cliArgs) : null;
  const allFilesForProject = /* @__PURE__ */ new Map();
  const filteredProjects = (0, import_projectUtils.filterProjects)(config.projects, config.cliProjectFilter);
  for (const project of filteredProjects) {
    const files = await (0, import_projectUtils.collectFilesForProject)(project, fsCache);
    allFilesForProject.set(project, files);
  }
  const filesToRunByProject = /* @__PURE__ */ new Map();
  for (const [project, files] of allFilesForProject) {
    const matchedFiles = files.filter((file) => {
      const hasMatchingSources = sourceMapSources(file, sourceMapCache).some((source) => {
        if (cliFileMatcher && !cliFileMatcher(source))
          return false;
        return true;
      });
      return hasMatchingSources;
    });
    const filteredFiles = matchedFiles.filter(Boolean);
    filesToRunByProject.set(project, filteredFiles);
  }
  const projectClosure = (0, import_projectUtils.buildProjectsClosure)([...filesToRunByProject.keys()]);
  for (const [project, type] of projectClosure) {
    if (type === "dependency") {
      const treatProjectAsEmpty = doNotRunTestsOutsideProjectFilter && !filteredProjects.includes(project);
      const files = treatProjectAsEmpty ? [] : allFilesForProject.get(project) || await (0, import_projectUtils.collectFilesForProject)(project, fsCache);
      filesToRunByProject.set(project, files);
    }
  }
  testRun.projectFiles = filesToRunByProject;
  testRun.projectSuites = /* @__PURE__ */ new Map();
}
async function loadFileSuites(testRun, mode, errors) {
  const config = testRun.config;
  const allTestFiles = /* @__PURE__ */ new Set();
  for (const files of testRun.projectFiles.values())
    files.forEach((file) => allTestFiles.add(file));
  const fileSuiteByFile = /* @__PURE__ */ new Map();
  const loaderHost = mode === "out-of-process" ? new import_loaderHost.OutOfProcessLoaderHost(config) : new import_loaderHost.InProcessLoaderHost(config);
  if (await loaderHost.start(errors)) {
    for (const file of allTestFiles) {
      const fileSuite = await loaderHost.loadTestFile(file, errors);
      fileSuiteByFile.set(file, fileSuite);
      errors.push(...createDuplicateTitlesErrors(config, fileSuite));
    }
    await loaderHost.stop();
  }
  for (const file of allTestFiles) {
    for (const dependency of (0, import_compilationCache.dependenciesForTestFile)(file)) {
      if (allTestFiles.has(dependency)) {
        const importer = import_path.default.relative(config.config.rootDir, file);
        const importee = import_path.default.relative(config.config.rootDir, dependency);
        errors.push({
          message: `Error: test file "${importer}" should not import test file "${importee}"`,
          location: { file, line: 1, column: 1 }
        });
      }
    }
  }
  for (const [project, files] of testRun.projectFiles) {
    const suites = files.map((file) => fileSuiteByFile.get(file)).filter(Boolean);
    testRun.projectSuites.set(project, suites);
  }
}
async function createRootSuite(testRun, errors, shouldFilterOnly) {
  const config = testRun.config;
  const rootSuite = new import_test.Suite("", "root");
  const projectSuites = /* @__PURE__ */ new Map();
  const filteredProjectSuites = /* @__PURE__ */ new Map();
  {
    const cliFileFilters = (0, import_util.createFileFiltersFromArguments)(config.cliArgs);
    const grepMatcher = config.cliGrep ? (0, import_util.createTitleMatcher)((0, import_util.forceRegExp)(config.cliGrep)) : () => true;
    const grepInvertMatcher = config.cliGrepInvert ? (0, import_util.createTitleMatcher)((0, import_util.forceRegExp)(config.cliGrepInvert)) : () => false;
    const cliTitleMatcher = (title) => !grepInvertMatcher(title) && grepMatcher(title);
    for (const [project, fileSuites] of testRun.projectSuites) {
      const projectSuite = createProjectSuite(project, fileSuites);
      projectSuites.set(project, projectSuite);
      const filteredProjectSuite = filterProjectSuite(projectSuite, { cliFileFilters, cliTitleMatcher, testFilters: config.preOnlyTestFilters });
      filteredProjectSuites.set(project, filteredProjectSuite);
    }
  }
  if (shouldFilterOnly) {
    const filteredRoot = new import_test.Suite("", "root");
    for (const filteredProjectSuite of filteredProjectSuites.values())
      filteredRoot._addSuite(filteredProjectSuite);
    (0, import_suiteUtils.filterOnly)(filteredRoot);
    for (const [project, filteredProjectSuite] of filteredProjectSuites) {
      if (!filteredRoot.suites.includes(filteredProjectSuite))
        filteredProjectSuites.delete(project);
    }
  }
  const projectClosure = (0, import_projectUtils.buildProjectsClosure)([...filteredProjectSuites.keys()], (project) => filteredProjectSuites.get(project)._hasTests());
  for (const [project, type] of projectClosure) {
    if (type === "top-level") {
      project.project.repeatEach = project.fullConfig.configCLIOverrides.repeatEach ?? project.project.repeatEach;
      rootSuite._addSuite(buildProjectSuite(project, filteredProjectSuites.get(project)));
    }
  }
  if (config.config.forbidOnly) {
    const onlyTestsAndSuites = rootSuite._getOnlyItems();
    if (onlyTestsAndSuites.length > 0) {
      const configFilePath = config.config.configFile ? import_path.default.relative(config.config.rootDir, config.config.configFile) : void 0;
      errors.push(...createForbidOnlyErrors(onlyTestsAndSuites, config.configCLIOverrides.forbidOnly, configFilePath));
    }
  }
  if (config.config.shard) {
    const testGroups = [];
    for (const projectSuite of rootSuite.suites) {
      for (const group of (0, import_testGroups.createTestGroups)(projectSuite, config.config.shard.total))
        testGroups.push(group);
    }
    const testGroupsInThisShard = (0, import_testGroups.filterForShard)(config.config.shard, config.configCLIOverrides.shardWeights, testGroups);
    const testsInThisShard = /* @__PURE__ */ new Set();
    for (const group of testGroupsInThisShard) {
      for (const test of group.tests)
        testsInThisShard.add(test);
    }
    (0, import_suiteUtils.filterTestsRemoveEmptySuites)(rootSuite, (test) => testsInThisShard.has(test));
  }
  if (config.postShardTestFilters.length)
    (0, import_suiteUtils.filterTestsRemoveEmptySuites)(rootSuite, (test) => config.postShardTestFilters.every((filter) => filter(test)));
  const topLevelProjects = [];
  {
    const projectClosure2 = new Map((0, import_projectUtils.buildProjectsClosure)(rootSuite.suites.map((suite) => suite._fullProject)));
    for (const [project, level] of projectClosure2.entries()) {
      if (level === "dependency")
        rootSuite._prependSuite(buildProjectSuite(project, projectSuites.get(project)));
      else
        topLevelProjects.push(project);
    }
  }
  return { rootSuite, topLevelProjects };
}
function createProjectSuite(project, fileSuites) {
  const projectSuite = new import_test.Suite(project.project.name, "project");
  for (const fileSuite of fileSuites)
    projectSuite._addSuite((0, import_suiteUtils.bindFileSuiteToProject)(project, fileSuite));
  const grepMatcher = (0, import_util.createTitleMatcher)(project.project.grep);
  const grepInvertMatcher = project.project.grepInvert ? (0, import_util.createTitleMatcher)(project.project.grepInvert) : null;
  (0, import_suiteUtils.filterTestsRemoveEmptySuites)(projectSuite, (test) => {
    const grepTitle = test._grepTitleWithTags();
    if (grepInvertMatcher?.(grepTitle))
      return false;
    return grepMatcher(grepTitle);
  });
  return projectSuite;
}
function filterProjectSuite(projectSuite, options) {
  if (!options.cliFileFilters.length && !options.cliTitleMatcher && !options.testFilters.length)
    return projectSuite;
  const result = projectSuite._deepClone();
  if (options.cliFileFilters.length)
    (0, import_suiteUtils.filterByFocusedLine)(result, options.cliFileFilters);
  (0, import_suiteUtils.filterTestsRemoveEmptySuites)(result, (test) => {
    if (!options.testFilters.every((filter) => filter(test)))
      return false;
    if (options.cliTitleMatcher && !options.cliTitleMatcher(test._grepTitleWithTags()))
      return false;
    return true;
  });
  return result;
}
function buildProjectSuite(project, projectSuite) {
  const result = new import_test.Suite(project.project.name, "project");
  result._fullProject = project;
  if (project.fullyParallel)
    result._parallelMode = "parallel";
  for (const fileSuite of projectSuite.suites) {
    result._addSuite(fileSuite);
    for (let repeatEachIndex = 1; repeatEachIndex < project.project.repeatEach; repeatEachIndex++) {
      const clone = fileSuite._deepClone();
      (0, import_suiteUtils.applyRepeatEachIndex)(project, clone, repeatEachIndex);
      result._addSuite(clone);
    }
  }
  return result;
}
function createForbidOnlyErrors(onlyTestsAndSuites, forbidOnlyCLIFlag, configFilePath) {
  const errors = [];
  for (const testOrSuite of onlyTestsAndSuites) {
    const title = testOrSuite.titlePath().slice(2).join(" ");
    const configFilePathName = configFilePath ? `'${configFilePath}'` : "the Playwright configuration file";
    const forbidOnlySource = forbidOnlyCLIFlag ? `'--forbid-only' CLI flag` : `'forbidOnly' option in ${configFilePathName}`;
    const error = {
      message: `Error: item focused with '.only' is not allowed due to the ${forbidOnlySource}: "${title}"`,
      location: testOrSuite.location
    };
    errors.push(error);
  }
  return errors;
}
function createDuplicateTitlesErrors(config, fileSuite) {
  const errors = [];
  const testsByFullTitle = /* @__PURE__ */ new Map();
  for (const test of fileSuite.allTests()) {
    const fullTitle = test.titlePath().slice(1).join(" \u203A ");
    const existingTest = testsByFullTitle.get(fullTitle);
    if (existingTest) {
      const error = {
        message: `Error: duplicate test title "${fullTitle}", first declared in ${buildItemLocation(config.config.rootDir, existingTest)}`,
        location: test.location
      };
      errors.push(error);
    }
    testsByFullTitle.set(fullTitle, test);
  }
  return errors;
}
function buildItemLocation(rootDir, testOrSuite) {
  if (!testOrSuite.location)
    return "";
  return `${import_path.default.relative(rootDir, testOrSuite.location.file)}:${testOrSuite.location.line}`;
}
async function requireOrImportDefaultFunction(file, expectConstructor) {
  let func = await (0, import_transform.requireOrImport)(file);
  if (func && typeof func === "object" && "default" in func)
    func = func["default"];
  if (typeof func !== "function")
    throw (0, import_util.errorWithFile)(file, `file must export a single ${expectConstructor ? "class" : "function"}.`);
  return func;
}
function loadGlobalHook(config, file) {
  return requireOrImportDefaultFunction(import_path.default.resolve(config.config.rootDir, file), false);
}
function loadReporter(config, file) {
  return requireOrImportDefaultFunction(config ? import_path.default.resolve(config.config.rootDir, file) : file, true);
}
function sourceMapSources(file, cache) {
  let sources = [file];
  if (!file.endsWith(".js"))
    return sources;
  if (cache.has(file))
    return cache.get(file);
  try {
    const sourceMap = import_utilsBundle.sourceMapSupport.retrieveSourceMap(file);
    const sourceMapData = typeof sourceMap?.map === "string" ? JSON.parse(sourceMap.map) : sourceMap?.map;
    if (sourceMapData?.sources)
      sources = sourceMapData.sources.map((source) => import_path.default.resolve(import_path.default.dirname(file), source));
  } finally {
    cache.set(file, sources);
    return sources;
  }
}
async function loadTestList(config, filePath) {
  try {
    const content = await import_fs.default.promises.readFile(filePath, "utf-8");
    const lines = content.split("\n").map((line) => line.trim()).filter((line) => line && !line.startsWith("#"));
    const descriptions = lines.map((line) => {
      const delimiter = line.includes("\u203A") ? "\u203A" : ">";
      const tokens = line.split(delimiter).map((token) => token.trim());
      let project;
      if (tokens[0].startsWith("[")) {
        if (!tokens[0].endsWith("]"))
          throw new Error(`Malformed test description: ${line}`);
        project = tokens[0].substring(1, tokens[0].length - 1);
        tokens.shift();
      }
      return { project, file: (0, import_utils.toPosixPath)((0, import_util.parseLocationArg)(tokens[0]).file), titlePath: tokens.slice(1) };
    });
    return (test) => descriptions.some((d) => {
      const [projectName, , ...titles] = test.titlePath();
      if (d.project !== void 0 && d.project !== projectName)
        return false;
      const relativeFile = (0, import_utils.toPosixPath)(import_path.default.relative(config.config.rootDir, test.location.file));
      if (relativeFile !== d.file)
        return false;
      return d.titlePath.length <= titles.length && d.titlePath.every((_, index) => titles[index] === d.titlePath[index]);
    });
  } catch (e) {
    throw (0, import_util.errorWithFile)(filePath, "Cannot read test list file: " + e.message);
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  collectProjectsAndTestFiles,
  createRootSuite,
  loadFileSuites,
  loadGlobalHook,
  loadReporter,
  loadTestList
});

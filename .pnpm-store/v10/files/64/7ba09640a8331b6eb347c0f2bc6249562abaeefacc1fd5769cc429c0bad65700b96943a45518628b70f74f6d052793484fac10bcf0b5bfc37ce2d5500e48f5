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
var projectUtils_exports = {};
__export(projectUtils_exports, {
  buildDependentProjects: () => buildDependentProjects,
  buildProjectsClosure: () => buildProjectsClosure,
  buildTeardownToSetupsMap: () => buildTeardownToSetupsMap,
  collectFilesForProject: () => collectFilesForProject,
  filterProjects: () => filterProjects,
  findTopLevelProjects: () => findTopLevelProjects
});
module.exports = __toCommonJS(projectUtils_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_util = require("util");
var import_utils = require("playwright-core/lib/utils");
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var import_util2 = require("../util");
const readFileAsync = (0, import_util.promisify)(import_fs.default.readFile);
const readDirAsync = (0, import_util.promisify)(import_fs.default.readdir);
function wildcardPatternToRegExp(pattern) {
  return new RegExp("^" + pattern.split("*").map(import_utils.escapeRegExp).join(".*") + "$", "ig");
}
function filterProjects(projects, projectNames) {
  if (!projectNames)
    return [...projects];
  const projectNamesToFind = /* @__PURE__ */ new Set();
  const unmatchedProjectNames = /* @__PURE__ */ new Map();
  const patterns = /* @__PURE__ */ new Set();
  for (const name of projectNames) {
    const lowerCaseName = name.toLocaleLowerCase();
    if (lowerCaseName.includes("*")) {
      patterns.add(wildcardPatternToRegExp(lowerCaseName));
    } else {
      projectNamesToFind.add(lowerCaseName);
      unmatchedProjectNames.set(lowerCaseName, name);
    }
  }
  const result = projects.filter((project) => {
    const lowerCaseName = project.project.name.toLocaleLowerCase();
    if (projectNamesToFind.has(lowerCaseName)) {
      unmatchedProjectNames.delete(lowerCaseName);
      return true;
    }
    for (const regex of patterns) {
      regex.lastIndex = 0;
      if (regex.test(lowerCaseName))
        return true;
    }
    return false;
  });
  if (unmatchedProjectNames.size) {
    const unknownProjectNames = Array.from(unmatchedProjectNames.values()).map((n) => `"${n}"`).join(", ");
    throw new Error(`Project(s) ${unknownProjectNames} not found. Available projects: ${projects.map((p) => `"${p.project.name}"`).join(", ")}`);
  }
  if (!result.length) {
    const allProjects = projects.map((p) => `"${p.project.name}"`).join(", ");
    throw new Error(`No projects matched. Available projects: ${allProjects}`);
  }
  return result;
}
function buildTeardownToSetupsMap(projects) {
  const result = /* @__PURE__ */ new Map();
  for (const project of projects) {
    if (project.teardown) {
      const setups = result.get(project.teardown) || [];
      setups.push(project);
      result.set(project.teardown, setups);
    }
  }
  return result;
}
function buildProjectsClosure(projects, hasTests) {
  const result = /* @__PURE__ */ new Map();
  const visit = (depth, project) => {
    if (depth > 100) {
      const error = new Error("Circular dependency detected between projects.");
      error.stack = "";
      throw error;
    }
    if (depth === 0 && hasTests && !hasTests(project))
      return;
    if (result.get(project) !== "dependency")
      result.set(project, depth ? "dependency" : "top-level");
    for (const dep of project.deps)
      visit(depth + 1, dep);
    if (project.teardown)
      visit(depth + 1, project.teardown);
  };
  for (const p of projects)
    visit(0, p);
  return result;
}
function findTopLevelProjects(config) {
  const closure = buildProjectsClosure(config.projects);
  return [...closure].filter((entry) => entry[1] === "top-level").map((entry) => entry[0]);
}
function buildDependentProjects(forProjects, projects) {
  const reverseDeps = new Map(projects.map((p) => [p, []]));
  for (const project of projects) {
    for (const dep of project.deps)
      reverseDeps.get(dep).push(project);
  }
  const result = /* @__PURE__ */ new Set();
  const visit = (depth, project) => {
    if (depth > 100) {
      const error = new Error("Circular dependency detected between projects.");
      error.stack = "";
      throw error;
    }
    result.add(project);
    for (const reverseDep of reverseDeps.get(project))
      visit(depth + 1, reverseDep);
    if (project.teardown)
      visit(depth + 1, project.teardown);
  };
  for (const forProject of forProjects)
    visit(0, forProject);
  return result;
}
async function collectFilesForProject(project, fsCache = /* @__PURE__ */ new Map()) {
  const extensions = /* @__PURE__ */ new Set([".js", ".ts", ".mjs", ".mts", ".cjs", ".cts", ".jsx", ".tsx", ".mjsx", ".mtsx", ".cjsx", ".ctsx", ".md"]);
  const testFileExtension = (file) => extensions.has(import_path.default.extname(file));
  const allFiles = await cachedCollectFiles(project.project.testDir, project.respectGitIgnore, fsCache);
  const testMatch = (0, import_util2.createFileMatcher)(project.project.testMatch);
  const testIgnore = (0, import_util2.createFileMatcher)(project.project.testIgnore);
  const testFiles = allFiles.filter((file) => {
    if (!testFileExtension(file))
      return false;
    const isTest = !testIgnore(file) && testMatch(file);
    if (!isTest)
      return false;
    return true;
  });
  return testFiles;
}
async function cachedCollectFiles(testDir, respectGitIgnore, fsCache) {
  const key = testDir + ":" + respectGitIgnore;
  let result = fsCache.get(key);
  if (!result) {
    result = await collectFiles(testDir, respectGitIgnore);
    fsCache.set(key, result);
  }
  return result;
}
async function collectFiles(testDir, respectGitIgnore) {
  if (!import_fs.default.existsSync(testDir))
    return [];
  if (!import_fs.default.statSync(testDir).isDirectory())
    return [];
  const checkIgnores = (entryPath, rules, isDirectory, parentStatus) => {
    let status = parentStatus;
    for (const rule of rules) {
      const ruleIncludes = rule.negate;
      if (status === "included" === ruleIncludes)
        continue;
      const relative = import_path.default.relative(rule.dir, entryPath);
      if (rule.match("/" + relative) || rule.match(relative)) {
        status = ruleIncludes ? "included" : "ignored";
      } else if (isDirectory && (rule.match("/" + relative + "/") || rule.match(relative + "/"))) {
        status = ruleIncludes ? "included" : "ignored";
      } else if (isDirectory && ruleIncludes && (rule.match("/" + relative, true) || rule.match(relative, true))) {
        status = "ignored-but-recurse";
      }
    }
    return status;
  };
  const files = [];
  const visit = async (dir, rules, status) => {
    const entries = await readDirAsync(dir, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    if (respectGitIgnore) {
      const gitignore = entries.find((e) => e.isFile() && e.name === ".gitignore");
      if (gitignore) {
        const content = await readFileAsync(import_path.default.join(dir, gitignore.name), "utf8");
        const newRules = content.split(/\r?\n/).map((s) => {
          s = s.trim();
          if (!s)
            return;
          const rule = new import_utilsBundle.minimatch.Minimatch(s, { matchBase: true, dot: true, flipNegate: true });
          if (rule.comment)
            return;
          rule.dir = dir;
          return rule;
        }).filter((rule) => !!rule);
        rules = [...rules, ...newRules];
      }
    }
    for (const entry of entries) {
      if (entry.name === "." || entry.name === "..")
        continue;
      if (entry.isFile() && entry.name === ".gitignore")
        continue;
      if (entry.isDirectory() && entry.name === "node_modules")
        continue;
      const entryPath = import_path.default.join(dir, entry.name);
      const entryStatus = checkIgnores(entryPath, rules, entry.isDirectory(), status);
      if (entry.isDirectory() && entryStatus !== "ignored")
        await visit(entryPath, rules, entryStatus);
      else if (entry.isFile() && entryStatus === "included")
        files.push(entryPath);
    }
  };
  await visit(testDir, [], "included");
  return files;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  buildDependentProjects,
  buildProjectsClosure,
  buildTeardownToSetupsMap,
  collectFilesForProject,
  filterProjects,
  findTopLevelProjects
});

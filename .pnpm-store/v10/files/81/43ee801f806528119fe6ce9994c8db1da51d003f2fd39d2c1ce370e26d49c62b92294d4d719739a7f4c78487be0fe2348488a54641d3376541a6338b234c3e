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
var rebase_exports = {};
__export(rebase_exports, {
  addSuggestedRebaseline: () => addSuggestedRebaseline,
  applySuggestedRebaselines: () => applySuggestedRebaselines,
  clearSuggestedRebaselines: () => clearSuggestedRebaselines
});
module.exports = __toCommonJS(rebase_exports);
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_utils = require("playwright-core/lib/utils");
var import_utils2 = require("playwright-core/lib/utils");
var import_utilsBundle = require("playwright-core/lib/utilsBundle");
var import_projectUtils = require("./projectUtils");
var import_babelBundle = require("../transform/babelBundle");
const t = import_babelBundle.types;
const suggestedRebaselines = new import_utils.MultiMap();
function addSuggestedRebaseline(location, suggestedRebaseline) {
  suggestedRebaselines.set(location.file, { location, code: suggestedRebaseline });
}
function clearSuggestedRebaselines() {
  suggestedRebaselines.clear();
}
async function applySuggestedRebaselines(config, reporter) {
  if (config.config.updateSnapshots === "none")
    return;
  if (!suggestedRebaselines.size)
    return;
  const [project] = (0, import_projectUtils.filterProjects)(config.projects, config.cliProjectFilter);
  if (!project)
    return;
  const patches = [];
  const files = [];
  const gitCache = /* @__PURE__ */ new Map();
  const patchFile = import_path.default.join(project.project.outputDir, "rebaselines.patch");
  for (const fileName of [...suggestedRebaselines.keys()].sort()) {
    const source = await import_fs.default.promises.readFile(fileName, "utf8");
    const lines = source.split("\n");
    const replacements = suggestedRebaselines.get(fileName);
    const fileNode = (0, import_babelBundle.babelParse)(source, fileName, true);
    const ranges = [];
    (0, import_babelBundle.traverse)(fileNode, {
      CallExpression: (path2) => {
        const node = path2.node;
        if (node.arguments.length < 1)
          return;
        if (!t.isMemberExpression(node.callee))
          return;
        const argument = node.arguments[0];
        if (!t.isStringLiteral(argument) && !t.isTemplateLiteral(argument))
          return;
        const prop = node.callee.property;
        if (!prop.loc || !argument.start || !argument.end)
          return;
        for (const replacement of replacements) {
          if (prop.loc.start.line !== replacement.location.line)
            continue;
          if (prop.loc.start.column + 1 !== replacement.location.column)
            continue;
          const indent = lines[prop.loc.start.line - 1].match(/^\s*/)[0];
          const newText = replacement.code.replace(/\{indent\}/g, indent);
          ranges.push({ start: argument.start, end: argument.end, oldText: source.substring(argument.start, argument.end), newText });
          break;
        }
      }
    });
    ranges.sort((a, b) => b.start - a.start);
    let result = source;
    for (const range of ranges)
      result = result.substring(0, range.start) + range.newText + result.substring(range.end);
    const relativeName = import_path.default.relative(process.cwd(), fileName);
    files.push(relativeName);
    if (config.config.updateSourceMethod === "overwrite") {
      await import_fs.default.promises.writeFile(fileName, result);
    } else if (config.config.updateSourceMethod === "3way") {
      await import_fs.default.promises.writeFile(fileName, applyPatchWithConflictMarkers(source, result));
    } else {
      const gitFolder = findGitRoot(import_path.default.dirname(fileName), gitCache);
      const relativeToGit = import_path.default.relative(gitFolder || process.cwd(), fileName);
      patches.push(createPatch(relativeToGit, source, result));
    }
  }
  const fileList = files.map((file) => "  " + import_utils2.colors.dim(file)).join("\n");
  reporter.onStdErr(`
New baselines created for:

${fileList}
`);
  if (config.config.updateSourceMethod === "patch") {
    await import_fs.default.promises.mkdir(import_path.default.dirname(patchFile), { recursive: true });
    await import_fs.default.promises.writeFile(patchFile, patches.join("\n"));
    reporter.onStdErr(`
  ` + import_utils2.colors.cyan("git apply " + import_path.default.relative(process.cwd(), patchFile)) + "\n");
  }
}
function createPatch(fileName, before, after) {
  const file = fileName.replace(/\\/g, "/");
  const text = import_utilsBundle.diff.createPatch(file, before, after, void 0, void 0, { context: 3 });
  return [
    "diff --git a/" + file + " b/" + file,
    "--- a/" + file,
    "+++ b/" + file,
    ...text.split("\n").slice(4)
  ].join("\n");
}
function findGitRoot(dir, cache) {
  const result = cache.get(dir);
  if (result !== void 0)
    return result;
  const gitPath = import_path.default.join(dir, ".git");
  if (import_fs.default.existsSync(gitPath) && import_fs.default.lstatSync(gitPath).isDirectory()) {
    cache.set(dir, dir);
    return dir;
  }
  const parentDir = import_path.default.dirname(dir);
  if (dir === parentDir) {
    cache.set(dir, null);
    return null;
  }
  const parentResult = findGitRoot(parentDir, cache);
  cache.set(dir, parentResult);
  return parentResult;
}
function applyPatchWithConflictMarkers(oldText, newText) {
  const diffResult = import_utilsBundle.diff.diffLines(oldText, newText);
  let result = "";
  let conflict = false;
  diffResult.forEach((part) => {
    if (part.added) {
      if (conflict) {
        result += part.value;
        result += ">>>>>>> SNAPSHOT\n";
        conflict = false;
      } else {
        result += "<<<<<<< HEAD\n";
        result += part.value;
        result += "=======\n";
        conflict = true;
      }
    } else if (part.removed) {
      result += "<<<<<<< HEAD\n";
      result += part.value;
      result += "=======\n";
      conflict = true;
    } else {
      if (conflict) {
        result += ">>>>>>> SNAPSHOT\n";
        conflict = false;
      }
      result += part.value;
    }
  });
  if (conflict)
    result += ">>>>>>> SNAPSHOT\n";
  return result;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  addSuggestedRebaseline,
  applySuggestedRebaselines,
  clearSuggestedRebaselines
});

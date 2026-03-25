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
var gitCommitInfoPlugin_exports = {};
__export(gitCommitInfoPlugin_exports, {
  addGitCommitInfoPlugin: () => addGitCommitInfoPlugin
});
module.exports = __toCommonJS(gitCommitInfoPlugin_exports);
var fs = __toESM(require("fs"));
var import_utils = require("playwright-core/lib/utils");
const GIT_OPERATIONS_TIMEOUT_MS = 3e3;
const addGitCommitInfoPlugin = (fullConfig) => {
  fullConfig.plugins.push({ factory: gitCommitInfoPlugin.bind(null, fullConfig) });
};
function print(s, ...args) {
  console.log("GitCommitInfo: " + s, ...args);
}
function debug(s, ...args) {
  if (!process.env.DEBUG_GIT_COMMIT_INFO)
    return;
  print(s, ...args);
}
const gitCommitInfoPlugin = (fullConfig) => {
  return {
    name: "playwright:git-commit-info",
    setup: async (config, configDir) => {
      const metadata = config.metadata;
      const ci = await ciInfo();
      if (!metadata.ci && ci) {
        debug("ci info", ci);
        metadata.ci = ci;
      }
      if (fullConfig.captureGitInfo?.commit || fullConfig.captureGitInfo?.commit === void 0 && ci) {
        const git = await gitCommitInfo(configDir).catch((e) => print("failed to get git commit info", e));
        if (git) {
          debug("commit info", git);
          metadata.gitCommit = git;
        }
      }
      if (fullConfig.captureGitInfo?.diff || fullConfig.captureGitInfo?.diff === void 0 && ci) {
        const diffResult = await gitDiff(configDir, ci).catch((e) => print("failed to get git diff", e));
        if (diffResult) {
          debug(`diff length ${diffResult.length}`);
          metadata.gitDiff = diffResult;
        }
      }
    }
  };
};
async function ciInfo() {
  if (process.env.GITHUB_ACTIONS) {
    let pr;
    try {
      const json = JSON.parse(await fs.promises.readFile(process.env.GITHUB_EVENT_PATH, "utf8"));
      pr = { title: json.pull_request.title, number: json.pull_request.number, baseHash: json.pull_request.base.sha };
    } catch {
    }
    return {
      commitHref: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/commit/${process.env.GITHUB_SHA}`,
      commitHash: process.env.GITHUB_SHA,
      prHref: pr ? `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/pull/${pr.number}` : void 0,
      prTitle: pr?.title,
      prBaseHash: pr?.baseHash,
      buildHref: `${process.env.GITHUB_SERVER_URL}/${process.env.GITHUB_REPOSITORY}/actions/runs/${process.env.GITHUB_RUN_ID}`
    };
  }
  if (process.env.GITLAB_CI) {
    return {
      commitHref: `${process.env.CI_PROJECT_URL}/-/commit/${process.env.CI_COMMIT_SHA}`,
      commitHash: process.env.CI_COMMIT_SHA,
      buildHref: process.env.CI_JOB_URL,
      branch: process.env.CI_COMMIT_REF_NAME
    };
  }
  if (process.env.JENKINS_URL && process.env.BUILD_URL) {
    return {
      commitHref: process.env.BUILD_URL,
      commitHash: process.env.GIT_COMMIT,
      branch: process.env.GIT_BRANCH
    };
  }
}
async function gitCommitInfo(gitDir) {
  const separator = `---786eec917292---`;
  const tokens = [
    "%H",
    // commit hash
    "%h",
    // abbreviated commit hash
    "%s",
    // subject
    "%B",
    // raw body (unwrapped subject and body)
    "%an",
    // author name
    "%ae",
    // author email
    "%at",
    // author date, UNIX timestamp
    "%cn",
    // committer name
    "%ce",
    // committer email
    "%ct",
    // committer date, UNIX timestamp
    ""
    // branch
  ];
  const output = await runGit(`git log -1 --pretty=format:"${tokens.join(separator)}" && git rev-parse --abbrev-ref HEAD`, gitDir);
  if (!output)
    return void 0;
  const [hash, shortHash, subject, body, authorName, authorEmail, authorTime, committerName, committerEmail, committerTime, branch] = output.split(separator);
  return {
    shortHash,
    hash,
    subject,
    body,
    author: {
      name: authorName,
      email: authorEmail,
      time: +authorTime * 1e3
    },
    committer: {
      name: committerName,
      email: committerEmail,
      time: +committerTime * 1e3
    },
    branch: branch.trim()
  };
}
async function gitDiff(gitDir, ci) {
  const diffLimit = 1e5;
  if (ci?.prBaseHash) {
    await runGit(`git fetch origin ${ci.prBaseHash} --depth=1 --no-auto-maintenance --no-auto-gc --no-tags --no-recurse-submodules`, gitDir);
    const diff2 = await runGit(`git diff ${ci.prBaseHash} HEAD`, gitDir);
    if (diff2)
      return diff2.substring(0, diffLimit);
  }
  if (ci)
    return;
  const uncommitted = await runGit("git diff", gitDir);
  if (uncommitted === void 0) {
    return;
  }
  if (uncommitted)
    return uncommitted.substring(0, diffLimit);
  const diff = await runGit("git diff HEAD~1", gitDir);
  return diff?.substring(0, diffLimit);
}
async function runGit(command, cwd) {
  debug(`running "${command}"`);
  const start = (0, import_utils.monotonicTime)();
  const result = await (0, import_utils.spawnAsync)(
    command,
    [],
    { stdio: "pipe", cwd, timeout: GIT_OPERATIONS_TIMEOUT_MS, shell: true }
  );
  if ((0, import_utils.monotonicTime)() - start > GIT_OPERATIONS_TIMEOUT_MS) {
    print(`timeout of ${GIT_OPERATIONS_TIMEOUT_MS}ms exceeded while running "${command}"`);
    return;
  }
  if (result.code)
    debug(`failure, code=${result.code}

${result.stderr}`);
  else
    debug(`success`);
  return result.code ? void 0 : result.stdout.trim();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  addGitCommitInfoPlugin
});

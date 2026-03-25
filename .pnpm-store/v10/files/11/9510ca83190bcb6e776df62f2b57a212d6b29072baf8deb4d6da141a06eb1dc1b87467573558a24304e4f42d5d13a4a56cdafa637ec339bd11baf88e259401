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
  version
} from "./chunk-YJM63TNA.js";
import {
  createFileSystemCache,
  execa,
  execaCommand,
  getProjectRoot,
  resolvePathInStorybookCache,
  up
} from "./chunk-Q4DOC7HF.js";
import {
  globalSettings
} from "./chunk-EQLFU5BD.js";
import {
  resolvePackageDir
} from "./chunk-O7UZQAUS.js";
import {
  slash
} from "./chunk-PF7HEE6F.js";
import {
  __commonJS,
  __toESM
} from "./chunk-DRM3MJ7Y.js";

// ../node_modules/fetch-retry/index.js
var require_fetch_retry = __commonJS({
  "../node_modules/fetch-retry/index.js"(exports, module) {
    "use strict";
    module.exports = function(fetch2, defaults) {
      if (defaults = defaults || {}, typeof fetch2 != "function")
        throw new ArgumentError("fetch must be a function");
      if (typeof defaults != "object")
        throw new ArgumentError("defaults must be an object");
      if (defaults.retries !== void 0 && !isPositiveInteger(defaults.retries))
        throw new ArgumentError("retries must be a positive integer");
      if (defaults.retryDelay !== void 0 && !isPositiveInteger(defaults.retryDelay) && typeof defaults.retryDelay != "function")
        throw new ArgumentError("retryDelay must be a positive integer or a function returning a positive integer");
      if (defaults.retryOn !== void 0 && !Array.isArray(defaults.retryOn) && typeof defaults.retryOn != "function")
        throw new ArgumentError("retryOn property expects an array or function");
      var baseDefaults = {
        retries: 3,
        retryDelay: 1e3,
        retryOn: []
      };
      return defaults = Object.assign(baseDefaults, defaults), function(input, init) {
        var retries = defaults.retries, retryDelay = defaults.retryDelay, retryOn = defaults.retryOn;
        if (init && init.retries !== void 0)
          if (isPositiveInteger(init.retries))
            retries = init.retries;
          else
            throw new ArgumentError("retries must be a positive integer");
        if (init && init.retryDelay !== void 0)
          if (isPositiveInteger(init.retryDelay) || typeof init.retryDelay == "function")
            retryDelay = init.retryDelay;
          else
            throw new ArgumentError("retryDelay must be a positive integer or a function returning a positive integer");
        if (init && init.retryOn)
          if (Array.isArray(init.retryOn) || typeof init.retryOn == "function")
            retryOn = init.retryOn;
          else
            throw new ArgumentError("retryOn property expects an array or function");
        return new Promise(function(resolve2, reject) {
          var wrappedFetch = function(attempt) {
            var _input = typeof Request < "u" && input instanceof Request ? input.clone() : input;
            fetch2(_input, init).then(function(response) {
              if (Array.isArray(retryOn) && retryOn.indexOf(response.status) === -1)
                resolve2(response);
              else if (typeof retryOn == "function")
                try {
                  return Promise.resolve(retryOn(attempt, null, response)).then(function(retryOnResponse) {
                    retryOnResponse ? retry2(attempt, null, response) : resolve2(response);
                  }).catch(reject);
                } catch (error) {
                  reject(error);
                }
              else
                attempt < retries ? retry2(attempt, null, response) : resolve2(response);
            }).catch(function(error) {
              if (typeof retryOn == "function")
                try {
                  Promise.resolve(retryOn(attempt, error, null)).then(function(retryOnResponse) {
                    retryOnResponse ? retry2(attempt, error, null) : reject(error);
                  }).catch(function(error2) {
                    reject(error2);
                  });
                } catch (error2) {
                  reject(error2);
                }
              else attempt < retries ? retry2(attempt, error, null) : reject(error);
            });
          };
          function retry2(attempt, error, response) {
            var delay = typeof retryDelay == "function" ? retryDelay(attempt, error, response) : retryDelay;
            setTimeout(function() {
              wrappedFetch(++attempt);
            }, delay);
          }
          wrappedFetch(0);
        });
      };
    };
    function isPositiveInteger(value) {
      return Number.isInteger(value) && value >= 0;
    }
    function ArgumentError(message) {
      this.name = "ArgumentError", this.message = message;
    }
  }
});

// src/telemetry/index.ts
import { logger as logger2 } from "storybook/internal/node-logger";

// src/telemetry/notify.ts
import { cache } from "storybook/internal/common";
import { logger } from "storybook/internal/node-logger";
var TELEMETRY_KEY_NOTIFY_DATE = "telemetry-notification-date", called = !1, notify = async () => {
  called || (called = !0, await cache.get(TELEMETRY_KEY_NOTIFY_DATE, null) || (cache.set(TELEMETRY_KEY_NOTIFY_DATE, Date.now()), logger.info(
    "Storybook collects completely anonymous usage telemetry. We use it to shape Storybook's roadmap and prioritize features. You can learn more, including how to opt out, at https://storybook.js.org/telemetry"
  )));
};

// src/telemetry/sanitize.ts
import path from "node:path";
function regexpEscape(str) {
  return str.replace(/[-[/{}()*+?.\\^$|]/g, "\\$&");
}
function removeAnsiEscapeCodes(input = "") {
  return input.replace(/\u001B\[[0-9;]*m/g, "");
}
function cleanPaths(str, separator = path.sep) {
  if (!str)
    return str;
  let stack = process.cwd().split(separator);
  for (; stack.length > 1; ) {
    let currentPath = stack.join(separator), currentRegex = new RegExp(regexpEscape(currentPath), "gi");
    str = str.replace(currentRegex, "$SNIP");
    let currentPath2 = stack.join(separator + separator), currentRegex2 = new RegExp(regexpEscape(currentPath2), "gi");
    str = str.replace(currentRegex2, "$SNIP"), stack.pop();
  }
  return str;
}
function sanitizeError(error, pathSeparator = path.sep) {
  try {
    error = {
      ...JSON.parse(JSON.stringify(error)),
      message: removeAnsiEscapeCodes(error.message),
      stack: removeAnsiEscapeCodes(error.stack),
      cause: error.cause,
      name: error.name
    };
    let errorString = cleanPaths(JSON.stringify(error), pathSeparator);
    return JSON.parse(errorString);
  } catch (err) {
    return `Sanitization error: ${err?.message}`;
  }
}

// src/telemetry/storybook-metadata.ts
import { createHash } from "node:crypto";
import { existsSync as existsSync2 } from "node:fs";
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import {
  getStorybookConfiguration,
  getStorybookInfo as getStorybookInfo2,
  isCI,
  loadMainConfig,
  versions
} from "storybook/internal/common";
import { getInterpretedFile } from "storybook/internal/common";
import { readConfig } from "storybook/internal/csf-tools";

// src/telemetry/get-application-file-count.ts
import { sep } from "node:path";

// src/telemetry/exec-command-count-lines.ts
import { createInterface } from "node:readline";
async function execCommandCountLines(command, args, options) {
  let process3 = execa(command, args, { buffer: !1, ...options });
  if (!process3.stdout)
    throw new Error("Unexpected missing stdout");
  let lineCount = 0, rl = createInterface(process3.stdout);
  return rl.on("line", () => {
    lineCount += 1;
  }), await process3, rl.close(), lineCount;
}

// src/telemetry/run-telemetry-operation.ts
var cache2 = createFileSystemCache({
  basePath: resolvePathInStorybookCache("telemetry"),
  ns: "storybook",
  ttl: 1440 * 60 * 1e3
  // 24h
}), runTelemetryOperation = async (cacheKey, operation) => {
  let cached = await cache2.get(cacheKey);
  return cached === void 0 && (cached = await operation(), cached !== void 0 && await cache2.set(cacheKey, cached)), cached;
};

// src/telemetry/get-application-file-count.ts
var nameMatches = ["page", "screen"], extensions = ["js", "jsx", "ts", "tsx"], getApplicationFilesCountUncached = async (basePath) => {
  let globs = nameMatches.flatMap((match) => [
    match,
    [match[0].toUpperCase(), ...match.slice(1)].join("")
  ]).flatMap(
    (match) => extensions.map((extension) => `${basePath}${sep}*${match}*.${extension}`)
  );
  try {
    return await execCommandCountLines("git", ["ls-files", "--", ...globs]);
  } catch {
    return;
  }
}, getApplicationFileCount = async (path3) => runTelemetryOperation(
  "applicationFiles",
  async () => getApplicationFilesCountUncached(path3)
);

// src/telemetry/get-chromatic-version.ts
function getChromaticVersionSpecifier(packageJson) {
  let dependency = packageJson.dependencies?.chromatic || packageJson.devDependencies?.chromatic || packageJson.peerDependencies?.chromatic;
  return dependency || (packageJson.scripts && Object.values(packageJson.scripts).find((s) => s?.match(/chromatic/)) ? "latest" : void 0);
}

// src/telemetry/get-framework-info.ts
import { getStorybookInfo } from "storybook/internal/common";
var cleanAndSanitizePath = (path3) => cleanPaths(path3).replace(/.*node_modules[\\/]/, "");
async function getFrameworkInfo(mainConfig, configDir) {
  let { frameworkPackage, rendererPackage, builderPackage } = await getStorybookInfo(configDir), frameworkOptions = typeof mainConfig.framework == "object" ? mainConfig.framework.options : {};
  return {
    framework: {
      name: frameworkPackage ? cleanAndSanitizePath(frameworkPackage) : void 0,
      options: frameworkOptions
    },
    builder: builderPackage ? cleanAndSanitizePath(builderPackage) : void 0,
    renderer: rendererPackage ? cleanAndSanitizePath(rendererPackage) : void 0
  };
}

// src/telemetry/get-has-router-package.ts
var routerPackages = /* @__PURE__ */ new Set([
  "react-router",
  "react-router-dom",
  "remix",
  "@tanstack/react-router",
  "expo-router",
  "@reach/router",
  "react-easy-router",
  "@remix-run/router",
  "wouter",
  "wouter-preact",
  "preact-router",
  "vue-router",
  "unplugin-vue-router",
  "@angular/router",
  "@solidjs/router",
  // metaframeworks that imply routing
  "next",
  "react-scripts",
  "gatsby",
  "nuxt",
  "@sveltejs/kit"
]);
function getHasRouterPackage(packageJson) {
  return Object.keys(packageJson?.dependencies ?? {}).some(
    (depName) => routerPackages.has(depName)
  );
}

// src/telemetry/get-monorepo-type.ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { getProjectRoot as getProjectRoot2 } from "storybook/internal/common";
var monorepoConfigs = {
  Nx: "nx.json",
  Turborepo: "turbo.json",
  Lerna: "lerna.json",
  Rush: "rush.json",
  Lage: "lage.config.json"
}, getMonorepoType = () => {
  let monorepoType = Object.keys(monorepoConfigs).find((monorepo) => {
    let configFile = join(getProjectRoot2(), monorepoConfigs[monorepo]);
    return existsSync(configFile);
  });
  if (monorepoType)
    return monorepoType;
  if (!existsSync(join(getProjectRoot2(), "package.json")))
    return;
  if (JSON.parse(
    readFileSync(join(getProjectRoot2(), "package.json"), { encoding: "utf8" })
  )?.workspaces)
    return "Workspaces";
};

// ../node_modules/package-manager-detector/dist/commands.mjs
function dashDashArg(agent, agentCommand) {
  return (args) => args.length > 1 ? [agent, agentCommand, args[0], "--", ...args.slice(1)] : [agent, agentCommand, args[0]];
}
function denoExecute() {
  return (args) => ["deno", "run", `npm:${args[0]}`, ...args.slice(1)];
}
var npm = {
  agent: ["npm", 0],
  run: dashDashArg("npm", "run"),
  install: ["npm", "i", 0],
  frozen: ["npm", "ci", 0],
  global: ["npm", "i", "-g", 0],
  add: ["npm", "i", 0],
  upgrade: ["npm", "update", 0],
  "upgrade-interactive": null,
  dedupe: ["npm", "dedupe", 0],
  execute: ["npx", 0],
  "execute-local": ["npx", 0],
  uninstall: ["npm", "uninstall", 0],
  global_uninstall: ["npm", "uninstall", "-g", 0]
}, yarn = {
  agent: ["yarn", 0],
  run: ["yarn", "run", 0],
  install: ["yarn", "install", 0],
  frozen: ["yarn", "install", "--frozen-lockfile", 0],
  global: ["yarn", "global", "add", 0],
  add: ["yarn", "add", 0],
  upgrade: ["yarn", "upgrade", 0],
  "upgrade-interactive": ["yarn", "upgrade-interactive", 0],
  dedupe: null,
  execute: ["npx", 0],
  "execute-local": dashDashArg("yarn", "exec"),
  uninstall: ["yarn", "remove", 0],
  global_uninstall: ["yarn", "global", "remove", 0]
}, yarnBerry = {
  ...yarn,
  frozen: ["yarn", "install", "--immutable", 0],
  upgrade: ["yarn", "up", 0],
  "upgrade-interactive": ["yarn", "up", "-i", 0],
  dedupe: ["yarn", "dedupe", 0],
  execute: ["yarn", "dlx", 0],
  "execute-local": ["yarn", "exec", 0],
  // Yarn 2+ removed 'global', see https://github.com/yarnpkg/berry/issues/821
  global: ["npm", "i", "-g", 0],
  global_uninstall: ["npm", "uninstall", "-g", 0]
}, pnpm = {
  agent: ["pnpm", 0],
  run: ["pnpm", "run", 0],
  install: ["pnpm", "i", 0],
  frozen: ["pnpm", "i", "--frozen-lockfile", 0],
  global: ["pnpm", "add", "-g", 0],
  add: ["pnpm", "add", 0],
  upgrade: ["pnpm", "update", 0],
  "upgrade-interactive": ["pnpm", "update", "-i", 0],
  dedupe: ["pnpm", "dedupe", 0],
  execute: ["pnpm", "dlx", 0],
  "execute-local": ["pnpm", "exec", 0],
  uninstall: ["pnpm", "remove", 0],
  global_uninstall: ["pnpm", "remove", "--global", 0]
}, bun = {
  agent: ["bun", 0],
  run: ["bun", "run", 0],
  install: ["bun", "install", 0],
  frozen: ["bun", "install", "--frozen-lockfile", 0],
  global: ["bun", "add", "-g", 0],
  add: ["bun", "add", 0],
  upgrade: ["bun", "update", 0],
  "upgrade-interactive": ["bun", "update", "-i", 0],
  dedupe: null,
  execute: ["bun", "x", 0],
  "execute-local": ["bun", "x", 0],
  uninstall: ["bun", "remove", 0],
  global_uninstall: ["bun", "remove", "-g", 0]
}, deno = {
  agent: ["deno", 0],
  run: ["deno", "task", 0],
  install: ["deno", "install", 0],
  frozen: ["deno", "install", "--frozen", 0],
  global: ["deno", "install", "-g", 0],
  add: ["deno", "add", 0],
  upgrade: ["deno", "outdated", "--update", 0],
  "upgrade-interactive": ["deno", "outdated", "--update", 0],
  dedupe: null,
  execute: denoExecute(),
  "execute-local": ["deno", "task", "--eval", 0],
  uninstall: ["deno", "remove", 0],
  global_uninstall: ["deno", "uninstall", "-g", 0]
}, COMMANDS = {
  npm,
  yarn,
  "yarn@berry": yarnBerry,
  pnpm,
  // pnpm v6.x or below
  "pnpm@6": {
    ...pnpm,
    run: dashDashArg("pnpm", "run")
  },
  bun,
  deno
};

// ../node_modules/package-manager-detector/dist/constants.mjs
var AGENTS = [
  "npm",
  "yarn",
  "yarn@berry",
  "pnpm",
  "pnpm@6",
  "bun",
  "deno"
], LOCKS = {
  "bun.lock": "bun",
  "bun.lockb": "bun",
  "deno.lock": "deno",
  "pnpm-lock.yaml": "pnpm",
  "pnpm-workspace.yaml": "pnpm",
  "yarn.lock": "yarn",
  "package-lock.json": "npm",
  "npm-shrinkwrap.json": "npm"
}, INSTALL_METADATA = {
  "node_modules/.deno/": "deno",
  "node_modules/.pnpm/": "pnpm",
  "node_modules/.yarn-state.yml": "yarn",
  // yarn v2+ (node-modules)
  "node_modules/.yarn_integrity": "yarn",
  // yarn v1
  "node_modules/.package-lock.json": "npm",
  ".pnp.cjs": "yarn",
  // yarn v3+ (pnp)
  ".pnp.js": "yarn",
  // yarn v2 (pnp)
  "bun.lock": "bun",
  "bun.lockb": "bun"
};

// ../node_modules/package-manager-detector/dist/detect.mjs
import fs from "node:fs/promises";
import path2 from "node:path";
import process2 from "node:process";
async function pathExists(path22, type) {
  try {
    let stat = await fs.stat(path22);
    return type === "file" ? stat.isFile() : stat.isDirectory();
  } catch {
    return !1;
  }
}
function* lookup(cwd = process2.cwd()) {
  let directory = path2.resolve(cwd), { root } = path2.parse(directory);
  for (; directory && directory !== root; )
    yield directory, directory = path2.dirname(directory);
}
async function parsePackageJson(filepath, onUnknown) {
  return !filepath || !pathExists(filepath, "file") ? null : await handlePackageManager(filepath, onUnknown);
}
async function detect(options = {}) {
  let {
    cwd,
    strategies = ["lockfile", "packageManager-field", "devEngines-field"],
    onUnknown
  } = options, stopDir;
  if (typeof options.stopDir == "string") {
    let resolved = path2.resolve(options.stopDir);
    stopDir = (dir) => dir === resolved;
  } else
    stopDir = options.stopDir;
  for (let directory of lookup(cwd)) {
    for (let strategy of strategies)
      switch (strategy) {
        case "lockfile": {
          for (let lock of Object.keys(LOCKS))
            if (await pathExists(path2.join(directory, lock), "file")) {
              let name = LOCKS[lock], result = await parsePackageJson(path2.join(directory, "package.json"), onUnknown);
              return result || { name, agent: name };
            }
          break;
        }
        case "packageManager-field":
        case "devEngines-field": {
          let result = await parsePackageJson(path2.join(directory, "package.json"), onUnknown);
          if (result)
            return result;
          break;
        }
        case "install-metadata": {
          for (let metadata of Object.keys(INSTALL_METADATA)) {
            let fileOrDir = metadata.endsWith("/") ? "dir" : "file";
            if (await pathExists(path2.join(directory, metadata), fileOrDir)) {
              let name = INSTALL_METADATA[metadata], agent = name === "yarn" ? isMetadataYarnClassic(metadata) ? "yarn" : "yarn@berry" : name;
              return { name, agent };
            }
          }
          break;
        }
      }
    if (stopDir?.(directory))
      break;
  }
  return null;
}
function getNameAndVer(pkg) {
  let handelVer = (version2) => version2?.match(/\d+(\.\d+){0,2}/)?.[0] ?? version2;
  if (typeof pkg.packageManager == "string") {
    let [name, ver] = pkg.packageManager.replace(/^\^/, "").split("@");
    return { name, ver: handelVer(ver) };
  }
  if (typeof pkg.devEngines?.packageManager?.name == "string")
    return {
      name: pkg.devEngines.packageManager.name,
      ver: handelVer(pkg.devEngines.packageManager.version)
    };
}
async function handlePackageManager(filepath, onUnknown) {
  try {
    let pkg = JSON.parse(await fs.readFile(filepath, "utf8")), agent, nameAndVer = getNameAndVer(pkg);
    if (nameAndVer) {
      let name = nameAndVer.name, ver = nameAndVer.ver, version2 = ver;
      return name === "yarn" && ver && Number.parseInt(ver) > 1 ? (agent = "yarn@berry", version2 = "berry", { name, agent, version: version2 }) : name === "pnpm" && ver && Number.parseInt(ver) < 7 ? (agent = "pnpm@6", { name, agent, version: version2 }) : AGENTS.includes(name) ? (agent = name, { name, agent, version: version2 }) : onUnknown?.(pkg.packageManager) ?? null;
    }
  } catch {
  }
  return null;
}
function isMetadataYarnClassic(metadataPath) {
  return metadataPath.endsWith(".yarn_integrity");
}

// src/telemetry/get-package-manager-info.ts
var getPackageManagerInfo = async () => {
  let packageManagerType = await detect({ cwd: getProjectRoot() });
  if (!packageManagerType)
    return;
  let nodeLinker = "node_modules";
  if (packageManagerType.name === "yarn")
    try {
      let { stdout } = await execaCommand("yarn config get nodeLinker", {
        cwd: getProjectRoot()
      });
      nodeLinker = stdout.trim();
    } catch {
    }
  if (packageManagerType.name === "pnpm")
    try {
      let { stdout } = await execaCommand("pnpm config get nodeLinker", {
        cwd: getProjectRoot()
      });
      nodeLinker = stdout.trim() ?? "isolated";
    } catch {
    }
  return {
    type: packageManagerType.name,
    version: packageManagerType.version,
    agent: packageManagerType.agent,
    nodeLinker
  };
};

// src/telemetry/get-portable-stories-usage.ts
var getPortableStoriesFileCountUncached = async (path3) => {
  try {
    return await execCommandCountLines("git", [
      "grep",
      "-l",
      "composeStor",
      ...path3 ? ["--", path3] : []
    ]);
  } catch (err) {
    return err.exitCode === 1 ? 0 : void 0;
  }
}, getPortableStoriesFileCount = async (path3) => runTelemetryOperation(
  "portableStories",
  async () => getPortableStoriesFileCountUncached(path3)
);

// src/telemetry/package-json.ts
import { fileURLToPath, pathToFileURL } from "node:url";
var getActualPackageVersions = async (packages) => {
  let packageNames = Object.keys(packages);
  return Promise.all(packageNames.map(getActualPackageVersion));
}, getActualPackageVersion = async (packageName) => {
  try {
    let packageJson = await getActualPackageJson(packageName);
    return {
      name: packageJson?.name || packageName,
      version: packageJson?.version || null
    };
  } catch {
    return {
      name: packageName,
      version: null
    };
  }
}, getActualPackageJson = async (packageName) => {
  try {
    let resolvedPackageJsonPath = up({
      cwd: fileURLToPath(import.meta.resolve(packageName, process.cwd()))
    });
    resolvedPackageJsonPath || (resolvedPackageJsonPath = import.meta.resolve(`${packageName}/package.json`, process.cwd()));
    let { default: packageJson } = await import(pathToFileURL(resolvedPackageJsonPath).href, {
      with: { type: "json" }
    });
    return packageJson;
  } catch {
    return;
  }
};

// src/telemetry/storybook-metadata.ts
var metaFrameworks = {
  next: "Next",
  "react-scripts": "CRA",
  gatsby: "Gatsby",
  "@nuxtjs/storybook": "nuxt",
  "@nrwl/storybook": "nx",
  "@vue/cli-service": "vue-cli",
  "@sveltejs/kit": "sveltekit",
  "@tanstack/react-router": "tanstack-react",
  "@react-router/dev": "react-router",
  "@remix-run/dev": "remix"
}, sanitizeAddonName = (name) => cleanPaths(name).replace(/\/dist\/.*/, "").replace(/\.[mc]?[tj]?s[x]?$/, "").replace(/\/register$/, "").replace(/\/manager$/, "").replace(/\/preset$/, ""), computeStorybookMetadata = async ({
  packageJsonPath,
  packageJson,
  mainConfig,
  configDir
}) => {
  let settings = isCI() ? void 0 : await globalSettings(), metadata = {
    generatedAt: (/* @__PURE__ */ new Date()).getTime(),
    userSince: settings?.value.userSince,
    hasCustomBabel: !1,
    hasCustomWebpack: !1,
    hasStaticDirs: !1,
    hasStorybookEslint: !1,
    refCount: 0
  }, allDependencies = {
    ...packageJson?.dependencies,
    ...packageJson?.devDependencies,
    ...packageJson?.peerDependencies
  }, metaFramework = Object.keys(allDependencies).find((dep) => !!metaFrameworks[dep]);
  if (metaFramework) {
    let { version: version2 } = await getActualPackageVersion(metaFramework);
    metadata.metaFramework = {
      name: metaFrameworks[metaFramework],
      packageName: metaFramework,
      version: version2 || "unknown"
    };
  }
  let testPackages = [
    "playwright",
    "vitest",
    "jest",
    "cypress",
    "nightwatch",
    "webdriver",
    "@web/test-runner",
    "puppeteer",
    "karma",
    "jasmine",
    "chai",
    "testing-library",
    "@ngneat/spectator",
    "wdio",
    "msw",
    "miragejs",
    "sinon",
    "chromatic"
  ], testPackageDeps = Object.keys(allDependencies).filter(
    (dep) => testPackages.find((pkg) => dep.includes(pkg))
  );
  metadata.testPackages = Object.fromEntries(
    await Promise.all(
      testPackageDeps.map(async (dep) => [dep, (await getActualPackageVersion(dep))?.version])
    )
  ), metadata.hasRouterPackage = getHasRouterPackage(packageJson);
  let monorepoType = getMonorepoType();
  monorepoType && (metadata.monorepo = monorepoType), metadata.packageManager = await getPackageManagerInfo();
  let language = allDependencies.typescript ? "typescript" : "javascript";
  if (!mainConfig)
    return {
      ...metadata,
      storybookVersionSpecifier: versions.storybook,
      language
    };
  metadata.hasCustomBabel = !!mainConfig.babel, metadata.hasCustomWebpack = !!mainConfig.webpackFinal, metadata.hasStaticDirs = !!mainConfig.staticDirs, typeof mainConfig.typescript == "object" && (metadata.typescriptOptions = mainConfig.typescript);
  let frameworkInfo = await getFrameworkInfo(mainConfig, configDir);
  typeof mainConfig.refs == "object" && (metadata.refCount = Object.keys(mainConfig.refs).length), typeof mainConfig.features == "object" && (metadata.features = mainConfig.features);
  let addons = {};
  mainConfig.addons && mainConfig.addons.forEach((addon) => {
    let addonName, options;
    typeof addon == "string" ? addonName = sanitizeAddonName(addon) : (addon.name.includes("addon-essentials") && (options = addon.options), addonName = sanitizeAddonName(addon.name)), addons[addonName] = {
      options,
      version: void 0
    };
  });
  let chromaticVersionSpecifier = getChromaticVersionSpecifier(packageJson);
  chromaticVersionSpecifier && (addons.chromatic = {
    version: void 0,
    versionSpecifier: chromaticVersionSpecifier,
    options: void 0
  }), (await getActualPackageVersions(addons)).forEach(({ name, version: version2 }) => {
    addons[name] = addons[name] || {
      name,
      version: version2
    }, addons[name].version = version2 || void 0;
  });
  let addonNames = Object.keys(addons), storybookPackages = Object.keys(allDependencies).filter((dep) => dep.includes("storybook") && !addonNames.includes(dep)).reduce((acc, dep) => ({
    ...acc,
    [dep]: { version: void 0 }
  }), {});
  (await getActualPackageVersions(storybookPackages)).forEach(({ name, version: version2 }) => {
    storybookPackages[name] = storybookPackages[name] || {
      name,
      version: version2
    }, storybookPackages[name].version = version2 || void 0;
  });
  let hasStorybookEslint = !!allDependencies["eslint-plugin-storybook"], storybookInfo = await getStorybookInfo2(configDir);
  try {
    let { previewConfigPath: previewConfig } = storybookInfo;
    if (previewConfig) {
      let config = await readConfig(previewConfig), usesGlobals = !!(config.getFieldNode(["globals"]) || config.getFieldNode(["globalTypes"]));
      metadata.preview = { ...metadata.preview, usesGlobals };
    }
  } catch {
  }
  let portableStoriesFileCount = await getPortableStoriesFileCount(), applicationFileCount = await getApplicationFileCount(dirname(packageJsonPath));
  return {
    ...metadata,
    ...frameworkInfo,
    portableStoriesFileCount,
    applicationFileCount,
    storybookVersion: version,
    storybookVersionSpecifier: storybookInfo.versionSpecifier ?? "",
    language,
    storybookPackages,
    addons,
    hasStorybookEslint
  };
};
async function getPackageJsonDetails() {
  let packageJsonPath = up();
  return packageJsonPath ? {
    packageJsonPath,
    packageJson: JSON.parse(await readFile(packageJsonPath, "utf8"))
  } : {
    packageJsonPath: process.cwd(),
    packageJson: {}
  };
}
var metadataCache = /* @__PURE__ */ new Map();
async function hashMainConfig(configDir) {
  try {
    let mainPath = getInterpretedFile(resolve(configDir, "main"));
    if (!mainPath || !existsSync2(mainPath))
      return "missing";
    let content = await readFile(mainPath);
    return createHash("sha256").update(new Uint8Array(content)).digest("hex");
  } catch {
    return "unknown";
  }
}
var getStorybookMetadata = async (_configDir) => {
  let { packageJson, packageJsonPath } = await getPackageJsonDetails(), configDir = (_configDir || getStorybookConfiguration(
    String(packageJson?.scripts?.storybook || ""),
    "-c",
    "--config-dir"
  )) ?? ".storybook", contentHash = await hashMainConfig(configDir), cacheKey = `${configDir}::${contentHash}`, cached = metadataCache.get(cacheKey);
  if (cached)
    return cached;
  let mainConfig = await loadMainConfig({ configDir }).catch(() => {
  }), computed = await computeStorybookMetadata({
    mainConfig,
    packageJson,
    packageJsonPath,
    configDir
  });
  return metadataCache.set(cacheKey, computed), computed;
};

// src/telemetry/telemetry.ts
var import_fetch_retry = __toESM(require_fetch_retry(), 1);
import { readFileSync as readFileSync2 } from "node:fs";
import * as os from "node:os";
import { join as join2 } from "node:path";
import { isCI as isCI2 } from "storybook/internal/common";

// ../node_modules/nanoid/index.js
import { randomFillSync } from "crypto";

// ../node_modules/nanoid/url-alphabet/index.js
var urlAlphabet = "useandom-26T198340PX75pxJACKVERYMINDBUSHWOLF_GQZbfghjklqvwyzrict";

// ../node_modules/nanoid/index.js
var POOL_SIZE_MULTIPLIER = 128, pool, poolOffset, fillPool = (bytes) => {
  !pool || pool.length < bytes ? (pool = Buffer.allocUnsafe(bytes * POOL_SIZE_MULTIPLIER), randomFillSync(pool), poolOffset = 0) : poolOffset + bytes > pool.length && (randomFillSync(pool), poolOffset = 0), poolOffset += bytes;
};
var nanoid = (size = 21) => {
  fillPool(size -= 0);
  let id = "";
  for (let i = poolOffset - size; i < poolOffset; i++)
    id += urlAlphabet[pool[i] & 63];
  return id;
};

// src/telemetry/anonymous-id.ts
import { relative } from "node:path";
import { getProjectRoot as getProjectRoot3 } from "storybook/internal/common";
import { execSync } from "child_process";

// src/telemetry/one-way-hash.ts
import { createHash as createHash2 } from "crypto";
var oneWayHash = (payload) => {
  let hash = createHash2("sha256");
  return hash.update("storybook-telemetry-salt"), hash.update(payload), hash.digest("hex");
};

// src/telemetry/anonymous-id.ts
function normalizeGitUrl(rawUrl) {
  let urlWithoutScheme = rawUrl.trim().replace(/#.*$/, "").replace(/^.*@/, "").replace(/^.*\/\//, "");
  return (urlWithoutScheme.endsWith(".git") ? urlWithoutScheme : `${urlWithoutScheme}.git`).replace(":", "/");
}
function unhashedProjectId(remoteUrl, projectRootPath) {
  return `${normalizeGitUrl(remoteUrl)}${slash(projectRootPath)}`;
}
var anonymousProjectId, getAnonymousProjectId = () => {
  if (anonymousProjectId)
    return anonymousProjectId;
  try {
    let projectRootPath = relative(getProjectRoot3(), process.cwd()), originBuffer = execSync("git config --local --get remote.origin.url", {
      timeout: 1e3,
      stdio: "pipe"
    });
    anonymousProjectId = oneWayHash(unhashedProjectId(String(originBuffer), projectRootPath));
  } catch {
  }
  return anonymousProjectId;
};

// src/telemetry/event-cache.ts
import { cache as cache3 } from "storybook/internal/common";
var processingPromise = Promise.resolve(), setHelper = async (eventType, body) => {
  let lastEvents = await cache3.get("lastEvents") || {};
  lastEvents[eventType] = { body, timestamp: Date.now() }, await cache3.set("lastEvents", lastEvents);
}, set = (eventType, body) => {
  let run = processingPromise.then(async () => {
    await setHelper(eventType, body);
  });
  return processingPromise = run.catch(() => {
  }), run;
};
var getLastEvents = async () => (await processingPromise, await cache3.get("lastEvents") || {}), upgradeFields = (event) => {
  let { body, timestamp } = event;
  return {
    timestamp,
    eventType: body?.eventType,
    eventId: body?.eventId,
    sessionId: body?.sessionId
  };
}, UPGRADE_EVENTS = ["init", "upgrade"], RUN_EVENTS = ["build", "dev", "error"], lastEvent = (lastEvents, eventTypes) => {
  let descendingEvents = eventTypes.map((eventType) => lastEvents?.[eventType]).filter((event) => !!event).sort((a, b) => b.timestamp - a.timestamp);
  return descendingEvents.length > 0 ? descendingEvents[0] : void 0;
}, getPrecedingUpgrade = async (events = void 0) => {
  let lastEvents = events || await cache3.get("lastEvents") || {}, lastUpgradeEvent = lastEvent(lastEvents, UPGRADE_EVENTS), lastRunEvent = lastEvent(lastEvents, RUN_EVENTS);
  if (lastUpgradeEvent)
    return !lastRunEvent?.timestamp || lastUpgradeEvent.timestamp > lastRunEvent.timestamp ? upgradeFields(lastUpgradeEvent) : void 0;
};

// src/telemetry/fetch.ts
var fetch = global.fetch;

// src/telemetry/session-id.ts
import { cache as cache4 } from "storybook/internal/common";
var SESSION_TIMEOUT = 1e3 * 60 * 60 * 2, sessionId;
var getSessionId = async () => {
  let now = Date.now();
  if (!sessionId) {
    let session = await cache4.get("session");
    session && session.lastUsed >= now - SESSION_TIMEOUT ? sessionId = session.id : sessionId = nanoid();
  }
  return await cache4.set("session", { id: sessionId, lastUsed: now }), sessionId;
};

// src/telemetry/telemetry.ts
var retryingFetch = (0, import_fetch_retry.default)(fetch), URL = process.env.STORYBOOK_TELEMETRY_URL || "https://storybook.js.org/event-log", tasks = [], addToGlobalContext = (key, value) => {
  globalContext[key] = value;
}, getOperatingSystem = () => {
  try {
    let platform2 = os.platform();
    return platform2 === "win32" ? "Windows" : platform2 === "darwin" ? "macOS" : platform2 === "linux" ? "Linux" : `Other: ${platform2}`;
  } catch {
    return "Unknown";
  }
}, globalContext = {
  inCI: isCI2(),
  isTTY: process.stdout.isTTY,
  platform: getOperatingSystem(),
  nodeVersion: process.versions.node,
  storybookVersion: getVersionNumber()
}, prepareRequest = async (data, context, options) => {
  let { eventType, payload, metadata, ...rest } = data, sessionId2 = await getSessionId(), eventId = nanoid(), body = { ...rest, eventType, eventId, sessionId: sessionId2, metadata, payload, context };
  return retryingFetch(URL, {
    method: "post",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
    retries: 3,
    retryOn: [503, 504],
    retryDelay: (attempt) => 2 ** attempt * (typeof options?.retryDelay == "number" && !Number.isNaN(options?.retryDelay) ? options.retryDelay : 1e3)
  });
};
function getVersionNumber() {
  try {
    return JSON.parse(readFileSync2(join2(resolvePackageDir("storybook"), "package.json"), "utf8")).version;
  } catch {
    return version;
  }
}
async function sendTelemetry(data, options = { retryDelay: 1e3, immediate: !1 }) {
  let { eventType, payload, metadata, ...rest } = data, context = options.stripMetadata ? globalContext : {
    ...globalContext,
    anonymousId: getAnonymousProjectId()
  }, request;
  try {
    request = prepareRequest(data, context, options), tasks.push(request);
    let sessionId2 = await getSessionId(), eventId = nanoid(), body = { ...rest, eventType, eventId, sessionId: sessionId2, metadata, payload, context }, waitFor = options.immediate ? tasks : [request];
    await Promise.all([...waitFor, set(eventType, body)]);
  } catch {
  } finally {
    tasks = tasks.filter((task) => task !== request);
  }
}

// src/telemetry/error-collector.ts
var ErrorCollector = class _ErrorCollector {
  constructor() {
    this.errors = [];
  }
  static getInstance() {
    return _ErrorCollector.instance || (_ErrorCollector.instance = new _ErrorCollector()), _ErrorCollector.instance;
  }
  static addError(error) {
    this.getInstance().errors.push(error);
  }
  static getErrors() {
    return this.getInstance().errors;
  }
};

// src/telemetry/index.ts
var isExampleStoryId = (storyId) => storyId.startsWith("example-button--") || storyId.startsWith("example-header--") || storyId.startsWith("example-page--"), telemetry = async (eventType, payload = {}, options = {}) => {
  eventType !== "boot" && options.notify !== !1 && await notify();
  let telemetryData = {
    eventType,
    payload
  };
  try {
    options?.stripMetadata || (telemetryData.metadata = await getStorybookMetadata(options?.configDir));
  } catch (error) {
    payload.metadataErrorMessage = sanitizeError(error).message, options?.enableCrashReports && (payload.metadataError = sanitizeError(error));
  } finally {
    let { error } = payload;
    error && (payload.error = sanitizeError(error)), (!payload.error || options?.enableCrashReports) && (process.env?.STORYBOOK_TELEMETRY_DEBUG && (logger2.info("[telemetry]"), logger2.info(JSON.stringify(telemetryData, null, 2))), await sendTelemetry(telemetryData, options));
  }
};

export {
  removeAnsiEscapeCodes,
  cleanPaths,
  sanitizeError,
  metaFrameworks,
  sanitizeAddonName,
  computeStorybookMetadata,
  getStorybookMetadata,
  oneWayHash,
  getLastEvents,
  getPrecedingUpgrade,
  getSessionId,
  addToGlobalContext,
  ErrorCollector,
  isExampleStoryId,
  telemetry
};

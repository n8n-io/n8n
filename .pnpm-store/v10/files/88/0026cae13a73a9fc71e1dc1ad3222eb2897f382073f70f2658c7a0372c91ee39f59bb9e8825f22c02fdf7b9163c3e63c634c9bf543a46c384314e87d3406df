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
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var src_exports = {};
__export(src_exports, {
  detectPackageManager: () => detectPackageManager,
  installPackage: () => installPackage
});
module.exports = __toCommonJS(src_exports);

// src/detect.ts
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_find_up = __toESM(require("find-up"));
var AGENTS = ["pnpm", "yarn", "npm", "pnpm@6", "yarn@berry", "bun"];
var LOCKS = {
  "bun.lockb": "bun",
  "pnpm-lock.yaml": "pnpm",
  "yarn.lock": "yarn",
  "package-lock.json": "npm",
  "npm-shrinkwrap.json": "npm"
};
async function detectPackageManager(cwd = process.cwd()) {
  let agent = null;
  const lockPath = await (0, import_find_up.default)(Object.keys(LOCKS), { cwd });
  let packageJsonPath;
  if (lockPath)
    packageJsonPath = import_path.default.resolve(lockPath, "../package.json");
  else
    packageJsonPath = await (0, import_find_up.default)("package.json", { cwd });
  if (packageJsonPath && import_fs.default.existsSync(packageJsonPath)) {
    try {
      const pkg = JSON.parse(import_fs.default.readFileSync(packageJsonPath, "utf8"));
      if (typeof pkg.packageManager === "string") {
        const [name, version] = pkg.packageManager.split("@");
        if (name === "yarn" && parseInt(version) > 1)
          agent = "yarn@berry";
        else if (name === "pnpm" && parseInt(version) < 7)
          agent = "pnpm@6";
        else if (name in AGENTS)
          agent = name;
        else
          console.warn("[ni] Unknown packageManager:", pkg.packageManager);
      }
    } catch {
    }
  }
  if (!agent && lockPath)
    agent = LOCKS[import_path.default.basename(lockPath)];
  return agent;
}

// src/install.ts
var import_execa = __toESM(require("execa"));
async function installPackage(names, options = {}) {
  const detectedAgent = options.packageManager || await detectPackageManager(options.cwd) || "npm";
  const [agent] = detectedAgent.split("@");
  if (!Array.isArray(names))
    names = [names];
  const args = options.additionalArgs || [];
  if (options.preferOffline) {
    if (detectedAgent === "yarn@berry")
      args.unshift("--cached");
    else
      args.unshift("--prefer-offline");
  }
  return (0, import_execa.default)(
    agent,
    [
      agent === "yarn" ? "add" : "install",
      options.dev ? "-D" : "",
      ...args,
      ...names
    ].filter(Boolean),
    {
      stdio: options.silent ? "ignore" : "inherit",
      cwd: options.cwd
    }
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  detectPackageManager,
  installPackage
});

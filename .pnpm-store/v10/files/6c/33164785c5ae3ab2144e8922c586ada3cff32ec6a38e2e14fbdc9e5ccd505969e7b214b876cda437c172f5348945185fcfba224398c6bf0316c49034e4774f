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

// src/index.ts
var index_exports = {};
__export(index_exports, {
  detectPackageManager: () => detectPackageManager,
  installPackage: () => installPackage,
  uninstallPackage: () => uninstallPackage
});
module.exports = __toCommonJS(index_exports);

// src/detect.ts
var import_node_process = __toESM(require("process"), 1);
var import_detect = require("package-manager-detector/detect");
async function detectPackageManager(cwd = import_node_process.default.cwd()) {
  const result = await (0, import_detect.detect)({
    cwd,
    onUnknown(packageManager) {
      console.warn("[@antfu/install-pkg] Unknown packageManager:", packageManager);
      return void 0;
    }
  });
  return result?.agent || null;
}

// src/install.ts
var import_node_fs = require("fs");
var import_node_path = require("path");
var import_node_process2 = __toESM(require("process"), 1);
var import_tinyexec = require("tinyexec");
async function installPackage(names, options = {}) {
  const detectedAgent = options.packageManager || await detectPackageManager(options.cwd) || "npm";
  const [agent] = detectedAgent.split("@");
  if (!Array.isArray(names))
    names = [names];
  const args = (typeof options.additionalArgs === "function" ? options.additionalArgs(agent, detectedAgent) : options.additionalArgs) || [];
  if (options.preferOffline) {
    if (detectedAgent === "yarn@berry")
      args.unshift("--cached");
    else
      args.unshift("--prefer-offline");
  }
  if (agent === "pnpm") {
    args.unshift(
      /**
       * Prevent pnpm from removing installed devDeps while `NODE_ENV` is `production`
       * @see https://pnpm.io/cli/install#--prod--p
       */
      "--prod=false"
    );
    if ((0, import_node_fs.existsSync)((0, import_node_path.resolve)(options.cwd ?? import_node_process2.default.cwd(), "pnpm-workspace.yaml"))) {
      args.unshift("-w");
    }
  }
  return (0, import_tinyexec.x)(
    agent,
    [
      agent === "yarn" ? "add" : "install",
      options.dev ? "-D" : "",
      ...args,
      ...names
    ].filter(Boolean),
    {
      nodeOptions: {
        stdio: options.silent ? "ignore" : "inherit",
        cwd: options.cwd
      },
      throwOnError: true
    }
  );
}

// src/uninstall.ts
var import_node_fs2 = require("fs");
var import_node_process3 = __toESM(require("process"), 1);
var import_node_path2 = require("path");
var import_tinyexec2 = require("tinyexec");
async function uninstallPackage(names, options = {}) {
  const detectedAgent = options.packageManager || await detectPackageManager(options.cwd) || "npm";
  const [agent] = detectedAgent.split("@");
  if (!Array.isArray(names))
    names = [names];
  const args = options.additionalArgs || [];
  if (agent === "pnpm" && (0, import_node_fs2.existsSync)((0, import_node_path2.resolve)(options.cwd ?? import_node_process3.default.cwd(), "pnpm-workspace.yaml")))
    args.unshift("-w");
  return (0, import_tinyexec2.x)(
    agent,
    [
      agent === "yarn" ? "remove" : "uninstall",
      options.dev ? "-D" : "",
      ...args,
      ...names
    ].filter(Boolean),
    {
      nodeOptions: {
        stdio: options.silent ? "ignore" : "inherit",
        cwd: options.cwd
      },
      throwOnError: true
    }
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  detectPackageManager,
  installPackage,
  uninstallPackage
});

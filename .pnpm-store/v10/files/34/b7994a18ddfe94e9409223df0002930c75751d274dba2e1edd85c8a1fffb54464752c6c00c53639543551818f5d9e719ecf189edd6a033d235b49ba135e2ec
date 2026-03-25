#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
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

// src/cli.ts
var import_semver = __toESM(require("semver"), 1);

// src/bindings.ts
var import_module = require("module");
var import_os = __toESM(require("os"), 1);
var import_meta = {};
var require2 = (0, import_module.createRequire)(import_meta.url);
var platform = import_os.default.platform();
var arch = import_os.default.arch();
var binding;
if (platform === "darwin") {
  if (arch === "arm64") {
    binding = require2("chromadb-js-bindings-darwin-arm64");
  } else if (arch === "x64") {
    binding = require2("chromadb-js-bindings-darwin-x64");
  } else {
    throw new Error(`Unsupported architecture on macOS: ${arch}`);
  }
} else if (platform === "linux") {
  if (arch === "arm64") {
    binding = require2("chromadb-js-bindings-linux-arm64-gnu");
  } else if (arch === "x64") {
    binding = require2("chromadb-js-bindings-linux-x64-gnu");
  } else {
    throw new Error(`Unsupported architecture on Linux: ${arch}`);
  }
} else if (platform === "win32") {
  if (arch === "arm64") {
    binding = require2("chromadb-js-bindings-win32-arm64-msvc");
  } else {
    throw new Error(
      `Unsupported Windows architecture: ${arch}. Only ARM64 is supported.`
    );
  }
} else {
  throw new Error(`Unsupported platform: ${platform}`);
}
var bindings_default = binding;

// src/cli.ts
var getLatestVersion = async (packageName) => {
  const response = await fetch(`https://registry.npmjs.org/${packageName}`);
  if (!response.ok) {
    throw new Error(`Failed to fetch package data: ${response.statusText}`);
  }
  const data = await response.json();
  return data["dist-tags"].latest;
};
var update = async () => {
  try {
    const installedVersion = process.env.CHROMADB_VERSION || "0.0.0";
    const latestVersion = await getLatestVersion("chromadb");
    if (import_semver.default.lt(installedVersion, latestVersion)) {
      console.log(`
A new chromadb version (${latestVersion}) is available!`);
      console.log("\n\x1B[4mUpdat with npm\x1B[0m");
      console.log("npm install chromadb@latest");
      console.log("\n\x1B[4mUpdat with pnpm\x1B[0m");
      console.log("pnpm add chromadb@latest");
      console.log("\n\x1B[4mUpdat with yarn\x1B[0m");
      console.log("yarn add chromadb@latest");
      console.log("\n\x1B[4mUpdat with bun\x1B[0m");
      console.log("bun add chromadb@latest\n");
    } else {
      console.log(
        `
Your chromadb version (${latestVersion}) is up-to-date!
`
      );
    }
  } catch (error) {
    console.error("Error checking versions:", error);
  }
};
var main = async () => {
  const args = process.argv.slice(2);
  if (args.length > 0 && args[0] === "update") {
    await update();
    return;
  }
  process.on("SIGINT", () => {
    process.exit(0);
  });
  bindings_default.cli(["chroma", ...args]);
};
main().finally();
//# sourceMappingURL=cli.cjs.map
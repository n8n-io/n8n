#!/usr/bin/env node
import "./chunk-NSSMTXJJ.mjs";

// src/cli.ts
import semver from "semver";

// src/bindings.ts
import { createRequire } from "module";
import os from "os";
var require2 = createRequire(import.meta.url);
var platform = os.platform();
var arch = os.arch();
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
    if (semver.lt(installedVersion, latestVersion)) {
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
//# sourceMappingURL=cli.mjs.map
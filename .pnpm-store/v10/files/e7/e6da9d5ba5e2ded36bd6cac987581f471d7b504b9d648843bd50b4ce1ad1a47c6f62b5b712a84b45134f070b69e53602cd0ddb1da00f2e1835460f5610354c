import CJS_COMPAT_NODE_URL_lxsjc9tp9f from 'node:url';
import CJS_COMPAT_NODE_PATH_lxsjc9tp9f from 'node:path';
import CJS_COMPAT_NODE_MODULE_lxsjc9tp9f from "node:module";

var __filename = CJS_COMPAT_NODE_URL_lxsjc9tp9f.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_lxsjc9tp9f.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_lxsjc9tp9f.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------

// src/postinstall.ts
import { PackageManagerName } from "storybook/internal/common";
import { spawnSync } from "child_process";
var PACKAGE_MANAGER_TO_COMMAND = {
  [PackageManagerName.NPM]: "npx",
  [PackageManagerName.PNPM]: "pnpm dlx",
  [PackageManagerName.YARN1]: "npx",
  [PackageManagerName.YARN2]: "yarn dlx",
  [PackageManagerName.BUN]: "bunx"
}, selectPackageManagerCommand = (packageManager) => PACKAGE_MANAGER_TO_COMMAND[packageManager];
async function postinstall({ packageManager = PackageManagerName.NPM }) {
  let commandString = selectPackageManagerCommand(packageManager), [command, ...commandArgs] = commandString.split(" ");
  spawnSync(command, [...commandArgs, "@storybook/auto-config", "themes"], {
    stdio: "inherit",
    cwd: process.cwd()
  });
}
export {
  postinstall as default
};

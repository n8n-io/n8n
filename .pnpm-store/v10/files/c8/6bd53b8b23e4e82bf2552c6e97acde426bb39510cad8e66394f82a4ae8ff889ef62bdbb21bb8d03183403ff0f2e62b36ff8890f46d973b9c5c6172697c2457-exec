#!/usr/bin/env node
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
  versions_default
} from "../_node-chunks/chunk-WAL24RZR.js";
import {
  resolvePackageDir
} from "../_node-chunks/chunk-O7UZQAUS.js";
import {
  join
} from "../_node-chunks/chunk-XS5OAKHK.js";
import {
  require_dist
} from "../_node-chunks/chunk-SLZHVDN6.js";
import {
  __toESM
} from "../_node-chunks/chunk-DRM3MJ7Y.js";

// src/bin/dispatcher.ts
import { pathToFileURL } from "node:url";
import { executeCommand, executeNodeCommand } from "storybook/internal/common";
import { logger } from "storybook/internal/node-logger";
var import_ts_dedent = __toESM(require_dist(), 1);
var [majorNodeVersion, minorNodeVersion] = process.versions.node.split(".").map(Number);
(majorNodeVersion < 20 || majorNodeVersion === 20 && minorNodeVersion < 19 || majorNodeVersion === 22 && minorNodeVersion < 12) && (logger.error(
  import_ts_dedent.dedent`To run Storybook, you need Node.js version 20.19+ or 22.12+.
    You are currently running Node.js ${process.version}. Please upgrade your Node.js installation.`
), process.exit(1));
async function run() {
  let args = process.argv.slice(2);
  if (["dev", "build", "index"].includes(args[0])) {
    await import(pathToFileURL(join(resolvePackageDir("storybook"), "dist/bin/core.js")).href);
    return;
  }
  let targetCli = args[0] === "init" ? {
    pkg: "create-storybook",
    args: args.slice(1)
  } : {
    pkg: "@storybook/cli",
    args
  };
  try {
    let { default: targetCliPackageJson } = await import(`${targetCli.pkg}/package.json`, {
      with: { type: "json" }
    });
    if (targetCliPackageJson.version === versions_default[targetCli.pkg]) {
      executeNodeCommand({
        scriptPath: join(resolvePackageDir(targetCli.pkg), "dist/bin/index.js"),
        args: targetCli.args,
        options: {
          stdio: "inherit"
        }
      }).on("exit", (code) => {
        process.exit(code ?? 1);
      });
      return;
    }
  } catch {
  }
  executeCommand({
    command: "npx",
    args: ["--yes", `${targetCli.pkg}@${versions_default[targetCli.pkg]}`, ...targetCli.args],
    stdio: "inherit"
  }).on("exit", (code) => {
    process.exit(code ?? 1);
  });
}
run();

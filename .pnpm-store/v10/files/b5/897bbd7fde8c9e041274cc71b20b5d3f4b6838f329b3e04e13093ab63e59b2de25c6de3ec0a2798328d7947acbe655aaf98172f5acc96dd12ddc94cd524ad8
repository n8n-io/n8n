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
  NODE_TARGET
} from "../_node-chunks/chunk-OQY7D22D.js";
import {
  require_dist
} from "../_node-chunks/chunk-SLZHVDN6.js";
import {
  __toESM
} from "../_node-chunks/chunk-DRM3MJ7Y.js";

// src/bin/loader.ts
var import_ts_dedent = __toESM(require_dist(), 1);
import { existsSync } from "node:fs";
import { readFile } from "node:fs/promises";
import * as path from "node:path";
import { fileURLToPath } from "node:url";
import { deprecate } from "storybook/internal/node-logger";
import { transform } from "esbuild";
var supportedExtensions = [
  ".js",
  ".mjs",
  ".cjs",
  ".jsx",
  ".ts",
  ".mts",
  ".cts",
  ".tsx"
];
function resolveWithExtension(importPath, currentFilePath) {
  if (path.extname(importPath))
    return importPath;
  deprecate(import_ts_dedent.dedent`One or more extensionless imports detected: "${importPath}" in file "${currentFilePath}".
    For maximum compatibility, you should add an explicit file extension to this import. Storybook will attempt to resolve it automatically, but this may change in the future. If adding the extension results in an error from TypeScript, we recommend setting moduleResolution to "bundler" in tsconfig.json or alternatively look into the allowImportingTsExtensions option.`);
  let currentDir = path.dirname(currentFilePath), absolutePath = path.resolve(currentDir, importPath);
  for (let ext of supportedExtensions) {
    let candidatePath = `${absolutePath}${ext}`;
    if (existsSync(candidatePath))
      return `${importPath}${ext}`;
  }
  return importPath;
}
function addExtensionsToRelativeImports(source, filePath) {
  let patterns = [
    // import/export ... from './path' or "../path" (including side-effect imports)
    /(\b(?:import|export)\s+(?:[^'"]*?\s+from\s+)?['"])(\.[^'"]+)(['"])/g,
    // import('./path') or import("../path") - dynamic imports with quotes (with closing paren, no concatenation)
    /(\bimport\s*\(\s*['"])(\.[^'"]+)(['"]\s*\))/g,
    // import(`./path`) - dynamic imports with backticks (with closing paren, no template interpolation)
    /(\bimport\s*\(\s*`)(\.[^`$]+)(`\s*\))/g
  ], result = source;
  for (let pattern of patterns)
    result = result.replace(pattern, (match, prefix, path2, suffix) => {
      if (path2.startsWith("./") || path2.startsWith("../")) {
        let resolvedPath = resolveWithExtension(path2, filePath);
        return `${prefix}${resolvedPath}${suffix}`;
      }
      return match;
    });
  return result;
}
var load = async (url, context, nextLoad) => {
  if (url.endsWith(".ts") || url.endsWith(".tsx") || url.endsWith(".mts") || url.endsWith(".cts") || url.endsWith(".mtsx") || url.endsWith(".ctsx")) {
    let filePath = fileURLToPath(url), rawSource = await readFile(filePath, "utf-8"), transformedSource = await transform(rawSource, {
      loader: "ts",
      target: NODE_TARGET,
      format: "esm",
      platform: "neutral"
    });
    return {
      format: "module",
      shortCircuit: !0,
      source: addExtensionsToRelativeImports(transformedSource.code, filePath)
    };
  }
  return nextLoad(url, context);
};
export {
  addExtensionsToRelativeImports,
  load,
  resolveWithExtension,
  supportedExtensions
};

import CJS_COMPAT_NODE_URL_wg2xvph24c from 'node:url';
import CJS_COMPAT_NODE_PATH_wg2xvph24c from 'node:path';
import CJS_COMPAT_NODE_MODULE_wg2xvph24c from "node:module";

var __filename = CJS_COMPAT_NODE_URL_wg2xvph24c.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_wg2xvph24c.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_wg2xvph24c.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------

// src/preset.ts
import { fileURLToPath } from "node:url";
var previewAnnotations = async (input = [], options) => {
  let docsEnabled = Object.keys(await options.presets.apply("docs", {}, options)).length > 0;
  return [].concat(input).concat([fileURLToPath(import.meta.resolve("@storybook/vue3/entry-preview"))]).concat(
    docsEnabled ? [fileURLToPath(import.meta.resolve("@storybook/vue3/entry-preview-docs"))] : []
  );
};
export {
  previewAnnotations
};

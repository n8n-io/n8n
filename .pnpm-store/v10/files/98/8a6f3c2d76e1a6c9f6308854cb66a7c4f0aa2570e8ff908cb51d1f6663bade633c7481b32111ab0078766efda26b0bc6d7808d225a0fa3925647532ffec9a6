import CJS_COMPAT_NODE_URL_etqjn00nkf from 'node:url';
import CJS_COMPAT_NODE_PATH_etqjn00nkf from 'node:path';
import CJS_COMPAT_NODE_MODULE_etqjn00nkf from "node:module";

var __filename = CJS_COMPAT_NODE_URL_etqjn00nkf.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_etqjn00nkf.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_etqjn00nkf.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import {
  compile
} from "./_node-chunks/chunk-Z7BWOEHY.js";
import "./_node-chunks/chunk-VHTKJ4P2.js";
import "./_node-chunks/chunk-RCYR4KPD.js";
import "./_node-chunks/chunk-V6MEBOQH.js";

// src/mdx-loader.ts
var DEFAULT_RENDERER = `
import React from 'react';
`;
async function loader(content) {
  let callback = this.async(), options = { ...this.getOptions(), filepath: this.resourcePath };
  try {
    let result = await compile(content, options), code = `${DEFAULT_RENDERER}
${result}`;
    return callback(null, code);
  } catch (err) {
    return console.error("Error loading:", this.resourcePath), callback(err);
  }
}
var mdx_loader_default = loader;
export {
  mdx_loader_default as default
};

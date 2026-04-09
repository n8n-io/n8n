import CJS_COMPAT_NODE_URL_xdyj2ntbeef from 'node:url';
import CJS_COMPAT_NODE_PATH_xdyj2ntbeef from 'node:path';
import CJS_COMPAT_NODE_MODULE_xdyj2ntbeef from "node:module";

var __filename = CJS_COMPAT_NODE_URL_xdyj2ntbeef.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_xdyj2ntbeef.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_xdyj2ntbeef.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
import {
  compile
} from "./_node-chunks/chunk-AJLVCHF5.js";
import "./_node-chunks/chunk-MK3UV7SU.js";
import "./_node-chunks/chunk-XAHV36T5.js";
import "./_node-chunks/chunk-3MKFR4CL.js";

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

import CJS_COMPAT_NODE_URL_at6j9ae2j2t from 'node:url';
import CJS_COMPAT_NODE_PATH_at6j9ae2j2t from 'node:path';
import CJS_COMPAT_NODE_MODULE_at6j9ae2j2t from "node:module";

var __filename = CJS_COMPAT_NODE_URL_at6j9ae2j2t.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_at6j9ae2j2t.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_at6j9ae2j2t.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------

// src/common/utils/utils.ts
var groupBy = (items, keySelector) => items.reduce(
  (acc, item, index) => {
    let key = keySelector(item, index);
    return acc[key] ??= [], acc[key].push(item), acc;
  },
  {}
);
function invariant(condition, message) {
  if (!condition)
    throw new Error((typeof message == "function" ? message() : message) ?? "Invariant failed");
}

export {
  groupBy,
  invariant
};

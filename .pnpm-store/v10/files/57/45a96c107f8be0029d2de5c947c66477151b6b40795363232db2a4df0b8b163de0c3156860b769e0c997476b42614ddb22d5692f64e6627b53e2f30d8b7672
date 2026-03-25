import CJS_COMPAT_NODE_URL_at6j9ae2j2t from 'node:url';
import CJS_COMPAT_NODE_PATH_at6j9ae2j2t from 'node:path';
import CJS_COMPAT_NODE_MODULE_at6j9ae2j2t from "node:module";

var __filename = CJS_COMPAT_NODE_URL_at6j9ae2j2t.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_at6j9ae2j2t.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_at6j9ae2j2t.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------

// ../node_modules/empathic/resolve.mjs
import { createRequire } from "node:module";
import { isAbsolute, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
function absolute(input, root) {
  return isAbsolute(input) ? input : resolve(root || ".", input);
}
function from(root, ident, silent) {
  try {
    let r = root instanceof URL || root.startsWith("file://") ? join(fileURLToPath(root), "noop.js") : join(absolute(root), "noop.js");
    return createRequire(r).resolve(ident);
  } catch (err) {
    if (!silent) throw err;
  }
}

// ../node_modules/empathic/walk.mjs
import { dirname } from "node:path";
function up(base, options) {
  let { last, cwd } = options || {}, tmp = absolute(base, cwd), root = absolute(last || "/", cwd), prev, arr = [];
  for (; prev !== root && (arr.push(tmp), tmp = dirname(prev = tmp), tmp !== prev); )
    ;
  return arr;
}

// ../node_modules/empathic/find.mjs
import { join as join2 } from "node:path";
import { existsSync, statSync } from "node:fs";
function up2(name, options) {
  let dir, tmp, start = options && options.cwd || "";
  for (dir of up(start, options))
    if (tmp = join2(dir, name), existsSync(tmp)) return tmp;
}
function any(names, options) {
  let dir, start = options && options.cwd || "", j = 0, len = names.length, tmp;
  for (dir of up(start, options))
    for (j = 0; j < len; j++)
      if (tmp = join2(dir, names[j]), existsSync(tmp)) return tmp;
}

// ../node_modules/tiny-invariant/dist/esm/tiny-invariant.js
var isProduction = process.env.NODE_ENV === "production", prefix = "Invariant failed";
function invariant(condition, message) {
  if (!condition) {
    if (isProduction)
      throw new Error(prefix);
    var provided = typeof message == "function" ? message() : message, value = provided ? "".concat(prefix, ": ").concat(provided) : prefix;
    throw new Error(value);
  }
}

export {
  from,
  up,
  up2,
  any,
  invariant
};

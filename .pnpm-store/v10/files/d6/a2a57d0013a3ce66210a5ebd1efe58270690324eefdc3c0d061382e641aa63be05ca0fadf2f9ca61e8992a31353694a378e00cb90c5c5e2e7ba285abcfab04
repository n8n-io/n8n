import CJS_COMPAT_NODE_URL_78w93im8273 from 'node:url';
import CJS_COMPAT_NODE_PATH_78w93im8273 from 'node:path';
import CJS_COMPAT_NODE_MODULE_78w93im8273 from "node:module";

var __filename = CJS_COMPAT_NODE_URL_78w93im8273.fileURLToPath(import.meta.url);
var __dirname = CJS_COMPAT_NODE_PATH_78w93im8273.dirname(__filename);
var require = CJS_COMPAT_NODE_MODULE_78w93im8273.createRequire(import.meta.url);

// ------------------------------------------------------------
// end of CJS compatibility banner, injected by Storybook's esbuild configuration
// ------------------------------------------------------------
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf, __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from == "object" || typeof from == "function")
    for (let key of __getOwnPropNames(from))
      !__hasOwnProp.call(to, key) && key !== except && __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: !0 }) : target,
  mod
));

// ../../node_modules/pathe/dist/shared/pathe.ff20891b.mjs
var _DRIVE_LETTER_START_RE = /^[A-Za-z]:\//;
function normalizeWindowsPath(input = "") {
  return input && input.replace(/\\/g, "/").replace(_DRIVE_LETTER_START_RE, (r) => r.toUpperCase());
}
var _UNC_REGEX = /^[/\\]{2}/, _IS_ABSOLUTE_RE = /^[/\\](?![/\\])|^[/\\]{2}(?!\.)|^[A-Za-z]:[/\\]/, _DRIVE_LETTER_RE = /^[A-Za-z]:$/, _ROOT_FOLDER_RE = /^\/([A-Za-z]:)?$/;
var normalize = function(path2) {
  if (path2.length === 0)
    return ".";
  path2 = normalizeWindowsPath(path2);
  let isUNCPath = path2.match(_UNC_REGEX), isPathAbsolute = isAbsolute(path2), trailingSeparator = path2[path2.length - 1] === "/";
  return path2 = normalizeString(path2, !isPathAbsolute), path2.length === 0 ? isPathAbsolute ? "/" : trailingSeparator ? "./" : "." : (trailingSeparator && (path2 += "/"), _DRIVE_LETTER_RE.test(path2) && (path2 += "/"), isUNCPath ? isPathAbsolute ? `//${path2}` : `//./${path2}` : isPathAbsolute && !isAbsolute(path2) ? `/${path2}` : path2);
};
function cwd() {
  return typeof process < "u" && typeof process.cwd == "function" ? process.cwd().replace(/\\/g, "/") : "/";
}
var resolve = function(...arguments_) {
  arguments_ = arguments_.map((argument) => normalizeWindowsPath(argument));
  let resolvedPath = "", resolvedAbsolute = !1;
  for (let index = arguments_.length - 1; index >= -1 && !resolvedAbsolute; index--) {
    let path2 = index >= 0 ? arguments_[index] : cwd();
    !path2 || path2.length === 0 || (resolvedPath = `${path2}/${resolvedPath}`, resolvedAbsolute = isAbsolute(path2));
  }
  return resolvedPath = normalizeString(resolvedPath, !resolvedAbsolute), resolvedAbsolute && !isAbsolute(resolvedPath) ? `/${resolvedPath}` : resolvedPath.length > 0 ? resolvedPath : ".";
};
function normalizeString(path2, allowAboveRoot) {
  let res = "", lastSegmentLength = 0, lastSlash = -1, dots = 0, char = null;
  for (let index = 0; index <= path2.length; ++index) {
    if (index < path2.length)
      char = path2[index];
    else {
      if (char === "/")
        break;
      char = "/";
    }
    if (char === "/") {
      if (!(lastSlash === index - 1 || dots === 1)) if (dots === 2) {
        if (res.length < 2 || lastSegmentLength !== 2 || res[res.length - 1] !== "." || res[res.length - 2] !== ".") {
          if (res.length > 2) {
            let lastSlashIndex = res.lastIndexOf("/");
            lastSlashIndex === -1 ? (res = "", lastSegmentLength = 0) : (res = res.slice(0, lastSlashIndex), lastSegmentLength = res.length - 1 - res.lastIndexOf("/")), lastSlash = index, dots = 0;
            continue;
          } else if (res.length > 0) {
            res = "", lastSegmentLength = 0, lastSlash = index, dots = 0;
            continue;
          }
        }
        allowAboveRoot && (res += res.length > 0 ? "/.." : "..", lastSegmentLength = 2);
      } else
        res.length > 0 ? res += `/${path2.slice(lastSlash + 1, index)}` : res = path2.slice(lastSlash + 1, index), lastSegmentLength = index - lastSlash - 1;
      lastSlash = index, dots = 0;
    } else char === "." && dots !== -1 ? ++dots : dots = -1;
  }
  return res;
}
var isAbsolute = function(p) {
  return _IS_ABSOLUTE_RE.test(p);
};
var relative = function(from, to) {
  let _from = resolve(from).replace(_ROOT_FOLDER_RE, "$1").split("/"), _to = resolve(to).replace(_ROOT_FOLDER_RE, "$1").split("/");
  if (_to[0][1] === ":" && _from[0][1] === ":" && _from[0] !== _to[0])
    return _to.join("/");
  let _fromCopy = [..._from];
  for (let segment of _fromCopy) {
    if (_to[0] !== segment)
      break;
    _from.shift(), _to.shift();
  }
  return [..._from.map(() => ".."), ..._to].join("/");
};

export {
  __commonJS,
  __toESM,
  normalize,
  resolve,
  isAbsolute,
  relative
};

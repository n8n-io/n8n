"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var token_io_exports = {};
__export(token_io_exports, {
  findRootDir: () => findRootDir,
  getUserDataDir: () => getUserDataDir
});
module.exports = __toCommonJS(token_io_exports);
var import_path = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
var import_os = __toESM(require("os"));
var import_token_error = require("./token-error");
function findRootDir() {
  try {
    let dir = process.cwd();
    while (dir !== import_path.default.dirname(dir)) {
      const pkgPath = import_path.default.join(dir, ".vercel");
      if (import_fs.default.existsSync(pkgPath)) {
        return dir;
      }
      dir = import_path.default.dirname(dir);
    }
  } catch (e) {
    throw new import_token_error.VercelOidcTokenError(
      "Token refresh only supported in node server environments"
    );
  }
  return null;
}
function getUserDataDir() {
  if (process.env.XDG_DATA_HOME) {
    return process.env.XDG_DATA_HOME;
  }
  switch (import_os.default.platform()) {
    case "darwin":
      return import_path.default.join(import_os.default.homedir(), "Library/Application Support");
    case "linux":
      return import_path.default.join(import_os.default.homedir(), ".local/share");
    case "win32":
      if (process.env.LOCALAPPDATA) {
        return process.env.LOCALAPPDATA;
      }
      return null;
    default:
      return null;
  }
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  findRootDir,
  getUserDataDir
});

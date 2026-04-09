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
var auth_config_exports = {};
__export(auth_config_exports, {
  isValidAccessToken: () => isValidAccessToken,
  readAuthConfig: () => readAuthConfig,
  writeAuthConfig: () => writeAuthConfig
});
module.exports = __toCommonJS(auth_config_exports);
var fs = __toESM(require("fs"));
var path = __toESM(require("path"));
var import_token_util = require("./token-util");
function getAuthConfigPath() {
  const dataDir = (0, import_token_util.getVercelDataDir)();
  if (!dataDir) {
    throw new Error(
      `Unable to find Vercel CLI data directory. Your platform: ${process.platform}. Supported: darwin, linux, win32.`
    );
  }
  return path.join(dataDir, "auth.json");
}
function readAuthConfig() {
  try {
    const authPath = getAuthConfigPath();
    if (!fs.existsSync(authPath)) {
      return null;
    }
    const content = fs.readFileSync(authPath, "utf8");
    if (!content) {
      return null;
    }
    return JSON.parse(content);
  } catch (error) {
    return null;
  }
}
function writeAuthConfig(config) {
  const authPath = getAuthConfigPath();
  const authDir = path.dirname(authPath);
  if (!fs.existsSync(authDir)) {
    fs.mkdirSync(authDir, { mode: 504, recursive: true });
  }
  fs.writeFileSync(authPath, JSON.stringify(config, null, 2), { mode: 384 });
}
function isValidAccessToken(authConfig) {
  if (!authConfig.token)
    return false;
  if (typeof authConfig.expiresAt !== "number")
    return true;
  const nowInSeconds = Math.floor(Date.now() / 1e3);
  return authConfig.expiresAt >= nowInSeconds;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isValidAccessToken,
  readAuthConfig,
  writeAuthConfig
});

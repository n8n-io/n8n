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
var userAgent_exports = {};
__export(userAgent_exports, {
  getEmbedderName: () => getEmbedderName,
  getPlaywrightVersion: () => getPlaywrightVersion,
  getUserAgent: () => getUserAgent
});
module.exports = __toCommonJS(userAgent_exports);
var import_child_process = require("child_process");
var import_os = __toESM(require("os"));
var import_linuxUtils = require("../utils/linuxUtils");
let cachedUserAgent;
function getUserAgent() {
  if (cachedUserAgent)
    return cachedUserAgent;
  try {
    cachedUserAgent = determineUserAgent();
  } catch (e) {
    cachedUserAgent = "Playwright/unknown";
  }
  return cachedUserAgent;
}
function determineUserAgent() {
  let osIdentifier = "unknown";
  let osVersion = "unknown";
  if (process.platform === "win32") {
    const version = import_os.default.release().split(".");
    osIdentifier = "windows";
    osVersion = `${version[0]}.${version[1]}`;
  } else if (process.platform === "darwin") {
    const version = (0, import_child_process.execSync)("sw_vers -productVersion", { stdio: ["ignore", "pipe", "ignore"] }).toString().trim().split(".");
    osIdentifier = "macOS";
    osVersion = `${version[0]}.${version[1]}`;
  } else if (process.platform === "linux") {
    const distroInfo = (0, import_linuxUtils.getLinuxDistributionInfoSync)();
    if (distroInfo) {
      osIdentifier = distroInfo.id || "linux";
      osVersion = distroInfo.version || "unknown";
    } else {
      osIdentifier = "linux";
    }
  }
  const additionalTokens = [];
  if (process.env.CI)
    additionalTokens.push("CI/1");
  const serializedTokens = additionalTokens.length ? " " + additionalTokens.join(" ") : "";
  const { embedderName, embedderVersion } = getEmbedderName();
  return `Playwright/${getPlaywrightVersion()} (${import_os.default.arch()}; ${osIdentifier} ${osVersion}) ${embedderName}/${embedderVersion}${serializedTokens}`;
}
function getEmbedderName() {
  let embedderName = "unknown";
  let embedderVersion = "unknown";
  if (!process.env.PW_LANG_NAME) {
    embedderName = "node";
    embedderVersion = process.version.substring(1).split(".").slice(0, 2).join(".");
  } else if (["node", "python", "java", "csharp"].includes(process.env.PW_LANG_NAME)) {
    embedderName = process.env.PW_LANG_NAME;
    embedderVersion = process.env.PW_LANG_NAME_VERSION ?? "unknown";
  }
  return { embedderName, embedderVersion };
}
function getPlaywrightVersion(majorMinorOnly = false) {
  const version = process.env.PW_VERSION_OVERRIDE || require("./../../../package.json").version;
  return majorMinorOnly ? version.split(".").slice(0, 2).join(".") : version;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getEmbedderName,
  getPlaywrightVersion,
  getUserAgent
});

"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var env_exports = {};
__export(env_exports, {
  getAsBooleanFromENV: () => getAsBooleanFromENV,
  getFromENV: () => getFromENV,
  getPackageManager: () => getPackageManager,
  getPackageManagerExecCommand: () => getPackageManagerExecCommand,
  isLikelyNpxGlobal: () => isLikelyNpxGlobal,
  setPlaywrightTestProcessEnv: () => setPlaywrightTestProcessEnv
});
module.exports = __toCommonJS(env_exports);
function getFromENV(name) {
  let value = process.env[name];
  value = value === void 0 ? process.env[`npm_config_${name.toLowerCase()}`] : value;
  value = value === void 0 ? process.env[`npm_package_config_${name.toLowerCase()}`] : value;
  return value;
}
function getAsBooleanFromENV(name, defaultValue) {
  const value = getFromENV(name);
  if (value === "false" || value === "0")
    return false;
  if (value)
    return true;
  return !!defaultValue;
}
function getPackageManager() {
  const env = process.env.npm_config_user_agent || "";
  if (env.includes("yarn"))
    return "yarn";
  if (env.includes("pnpm"))
    return "pnpm";
  return "npm";
}
function getPackageManagerExecCommand() {
  const packageManager = getPackageManager();
  if (packageManager === "yarn")
    return "yarn";
  if (packageManager === "pnpm")
    return "pnpm exec";
  return "npx";
}
function isLikelyNpxGlobal() {
  return process.argv.length >= 2 && process.argv[1].includes("_npx");
}
function setPlaywrightTestProcessEnv() {
  return process.env["PLAYWRIGHT_TEST"] = "1";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getAsBooleanFromENV,
  getFromENV,
  getPackageManager,
  getPackageManagerExecCommand,
  isLikelyNpxGlobal,
  setPlaywrightTestProcessEnv
});

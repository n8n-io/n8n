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
var linuxUtils_exports = {};
__export(linuxUtils_exports, {
  getLinuxDistributionInfoSync: () => getLinuxDistributionInfoSync
});
module.exports = __toCommonJS(linuxUtils_exports);
var import_fs = __toESM(require("fs"));
let didFailToReadOSRelease = false;
let osRelease;
function getLinuxDistributionInfoSync() {
  if (process.platform !== "linux")
    return void 0;
  if (!osRelease && !didFailToReadOSRelease) {
    try {
      const osReleaseText = import_fs.default.readFileSync("/etc/os-release", "utf8");
      const fields = parseOSReleaseText(osReleaseText);
      osRelease = {
        id: fields.get("id") ?? "",
        version: fields.get("version_id") ?? ""
      };
    } catch (e) {
      didFailToReadOSRelease = true;
    }
  }
  return osRelease;
}
function parseOSReleaseText(osReleaseText) {
  const fields = /* @__PURE__ */ new Map();
  for (const line of osReleaseText.split("\n")) {
    const tokens = line.split("=");
    const name = tokens.shift();
    let value = tokens.join("=").trim();
    if (value.startsWith('"') && value.endsWith('"'))
      value = value.substring(1, value.length - 1);
    if (!name)
      continue;
    fields.set(name.toLowerCase(), value);
  }
  return fields;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getLinuxDistributionInfoSync
});

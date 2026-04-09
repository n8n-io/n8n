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
var userAgent_exports = {};
__export(userAgent_exports, {
  getUserAgentHeaderName: () => getUserAgentHeaderName,
  getUserAgentValue: () => getUserAgentValue
});
module.exports = __toCommonJS(userAgent_exports);
var import_userAgentPlatform = require("./userAgentPlatform.js");
var import_constants = require("../constants.js");
function getUserAgentString(telemetryInfo) {
  const parts = [];
  for (const [key, value] of telemetryInfo) {
    const token = value ? `${key}/${value}` : key;
    parts.push(token);
  }
  return parts.join(" ");
}
function getUserAgentHeaderName() {
  return (0, import_userAgentPlatform.getHeaderName)();
}
async function getUserAgentValue(prefix) {
  const runtimeInfo = /* @__PURE__ */ new Map();
  runtimeInfo.set("ts-http-runtime", import_constants.SDK_VERSION);
  await (0, import_userAgentPlatform.setPlatformSpecificData)(runtimeInfo);
  const defaultAgent = getUserAgentString(runtimeInfo);
  const userAgentValue = prefix ? `${prefix} ${defaultAgent}` : defaultAgent;
  return userAgentValue;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getUserAgentHeaderName,
  getUserAgentValue
});

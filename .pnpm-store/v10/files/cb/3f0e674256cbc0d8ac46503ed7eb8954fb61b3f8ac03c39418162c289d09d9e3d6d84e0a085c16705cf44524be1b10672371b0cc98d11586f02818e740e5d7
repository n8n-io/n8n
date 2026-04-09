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
var proxyPolicy_common_exports = {};
__export(proxyPolicy_common_exports, {
  getDefaultProxySettings: () => getDefaultProxySettings,
  proxyPolicy: () => proxyPolicy,
  proxyPolicyName: () => proxyPolicyName,
  resetCachedProxyAgents: () => resetCachedProxyAgents
});
module.exports = __toCommonJS(proxyPolicy_common_exports);
const proxyPolicyName = "proxyPolicy";
const errorMessage = "proxyPolicy is not supported in browser environment";
function getDefaultProxySettings(_proxyUrl) {
  throw new Error(errorMessage);
}
function proxyPolicy(_proxySettings, _options) {
  throw new Error(errorMessage);
}
function resetCachedProxyAgents() {
  throw new Error(errorMessage);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getDefaultProxySettings,
  proxyPolicy,
  proxyPolicyName,
  resetCachedProxyAgents
});

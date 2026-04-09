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
var proxyPolicy_exports = {};
__export(proxyPolicy_exports, {
  getDefaultProxySettings: () => getDefaultProxySettings,
  proxyPolicy: () => proxyPolicy,
  proxyPolicyName: () => proxyPolicyName
});
module.exports = __toCommonJS(proxyPolicy_exports);
var import_policies = require("@typespec/ts-http-runtime/internal/policies");
const proxyPolicyName = import_policies.proxyPolicyName;
function getDefaultProxySettings(proxyUrl) {
  return (0, import_policies.getDefaultProxySettings)(proxyUrl);
}
function proxyPolicy(proxySettings, options) {
  return (0, import_policies.proxyPolicy)(proxySettings, options);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getDefaultProxySettings,
  proxyPolicy,
  proxyPolicyName
});

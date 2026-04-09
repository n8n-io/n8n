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
var apiKeyAuthenticationPolicy_exports = {};
__export(apiKeyAuthenticationPolicy_exports, {
  apiKeyAuthenticationPolicy: () => apiKeyAuthenticationPolicy,
  apiKeyAuthenticationPolicyName: () => apiKeyAuthenticationPolicyName
});
module.exports = __toCommonJS(apiKeyAuthenticationPolicy_exports);
var import_checkInsecureConnection = require("./checkInsecureConnection.js");
const apiKeyAuthenticationPolicyName = "apiKeyAuthenticationPolicy";
function apiKeyAuthenticationPolicy(options) {
  return {
    name: apiKeyAuthenticationPolicyName,
    async sendRequest(request, next) {
      (0, import_checkInsecureConnection.ensureSecureConnection)(request, options);
      const scheme = (request.authSchemes ?? options.authSchemes)?.find((x) => x.kind === "apiKey");
      if (!scheme) {
        return next(request);
      }
      if (scheme.apiKeyLocation !== "header") {
        throw new Error(`Unsupported API key location: ${scheme.apiKeyLocation}`);
      }
      request.headers.set(scheme.name, options.credential.key);
      return next(request);
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  apiKeyAuthenticationPolicy,
  apiKeyAuthenticationPolicyName
});

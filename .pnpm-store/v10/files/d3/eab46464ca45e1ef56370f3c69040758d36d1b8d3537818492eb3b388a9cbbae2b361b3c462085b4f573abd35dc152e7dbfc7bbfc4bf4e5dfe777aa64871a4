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
var oauth2AuthenticationPolicy_exports = {};
__export(oauth2AuthenticationPolicy_exports, {
  oauth2AuthenticationPolicy: () => oauth2AuthenticationPolicy,
  oauth2AuthenticationPolicyName: () => oauth2AuthenticationPolicyName
});
module.exports = __toCommonJS(oauth2AuthenticationPolicy_exports);
var import_checkInsecureConnection = require("./checkInsecureConnection.js");
const oauth2AuthenticationPolicyName = "oauth2AuthenticationPolicy";
function oauth2AuthenticationPolicy(options) {
  return {
    name: oauth2AuthenticationPolicyName,
    async sendRequest(request, next) {
      (0, import_checkInsecureConnection.ensureSecureConnection)(request, options);
      const scheme = (request.authSchemes ?? options.authSchemes)?.find((x) => x.kind === "oauth2");
      if (!scheme) {
        return next(request);
      }
      const token = await options.credential.getOAuth2Token(scheme.flows, {
        abortSignal: request.abortSignal
      });
      request.headers.set("Authorization", `Bearer ${token}`);
      return next(request);
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  oauth2AuthenticationPolicy,
  oauth2AuthenticationPolicyName
});

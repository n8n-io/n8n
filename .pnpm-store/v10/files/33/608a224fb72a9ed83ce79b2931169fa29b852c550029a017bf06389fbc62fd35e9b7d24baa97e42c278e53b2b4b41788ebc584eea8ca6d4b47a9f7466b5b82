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
var bearerAuthenticationPolicy_exports = {};
__export(bearerAuthenticationPolicy_exports, {
  bearerAuthenticationPolicy: () => bearerAuthenticationPolicy,
  bearerAuthenticationPolicyName: () => bearerAuthenticationPolicyName
});
module.exports = __toCommonJS(bearerAuthenticationPolicy_exports);
var import_checkInsecureConnection = require("./checkInsecureConnection.js");
const bearerAuthenticationPolicyName = "bearerAuthenticationPolicy";
function bearerAuthenticationPolicy(options) {
  return {
    name: bearerAuthenticationPolicyName,
    async sendRequest(request, next) {
      (0, import_checkInsecureConnection.ensureSecureConnection)(request, options);
      const scheme = (request.authSchemes ?? options.authSchemes)?.find(
        (x) => x.kind === "http" && x.scheme === "bearer"
      );
      if (!scheme) {
        return next(request);
      }
      const token = await options.credential.getBearerToken({
        abortSignal: request.abortSignal
      });
      request.headers.set("Authorization", `Bearer ${token}`);
      return next(request);
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  bearerAuthenticationPolicy,
  bearerAuthenticationPolicyName
});

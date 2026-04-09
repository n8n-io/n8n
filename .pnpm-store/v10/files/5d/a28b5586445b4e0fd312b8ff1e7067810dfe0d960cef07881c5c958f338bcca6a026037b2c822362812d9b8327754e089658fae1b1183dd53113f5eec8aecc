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
var basicAuthenticationPolicy_exports = {};
__export(basicAuthenticationPolicy_exports, {
  basicAuthenticationPolicy: () => basicAuthenticationPolicy,
  basicAuthenticationPolicyName: () => basicAuthenticationPolicyName
});
module.exports = __toCommonJS(basicAuthenticationPolicy_exports);
var import_bytesEncoding = require("../../util/bytesEncoding.js");
var import_checkInsecureConnection = require("./checkInsecureConnection.js");
const basicAuthenticationPolicyName = "bearerAuthenticationPolicy";
function basicAuthenticationPolicy(options) {
  return {
    name: basicAuthenticationPolicyName,
    async sendRequest(request, next) {
      (0, import_checkInsecureConnection.ensureSecureConnection)(request, options);
      const scheme = (request.authSchemes ?? options.authSchemes)?.find(
        (x) => x.kind === "http" && x.scheme === "basic"
      );
      if (!scheme) {
        return next(request);
      }
      const { username, password } = options.credential;
      const headerValue = (0, import_bytesEncoding.uint8ArrayToString)(
        (0, import_bytesEncoding.stringToUint8Array)(`${username}:${password}`, "utf-8"),
        "base64"
      );
      request.headers.set("Authorization", `Basic ${headerValue}`);
      return next(request);
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  basicAuthenticationPolicy,
  basicAuthenticationPolicyName
});

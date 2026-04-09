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
var apiVersionPolicy_exports = {};
__export(apiVersionPolicy_exports, {
  apiVersionPolicy: () => apiVersionPolicy,
  apiVersionPolicyName: () => apiVersionPolicyName
});
module.exports = __toCommonJS(apiVersionPolicy_exports);
const apiVersionPolicyName = "ApiVersionPolicy";
function apiVersionPolicy(options) {
  return {
    name: apiVersionPolicyName,
    sendRequest: (req, next) => {
      const url = new URL(req.url);
      if (!url.searchParams.get("api-version") && options.apiVersion) {
        req.url = `${req.url}${Array.from(url.searchParams.keys()).length > 0 ? "&" : "?"}api-version=${options.apiVersion}`;
      }
      return next(req);
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  apiVersionPolicy,
  apiVersionPolicyName
});

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
var multipartPolicy_exports = {};
__export(multipartPolicy_exports, {
  multipartPolicy: () => multipartPolicy,
  multipartPolicyName: () => multipartPolicyName
});
module.exports = __toCommonJS(multipartPolicy_exports);
var import_policies = require("@typespec/ts-http-runtime/internal/policies");
var import_file = require("../util/file.js");
const multipartPolicyName = import_policies.multipartPolicyName;
function multipartPolicy() {
  const tspPolicy = (0, import_policies.multipartPolicy)();
  return {
    name: multipartPolicyName,
    sendRequest: async (request, next) => {
      if (request.multipartBody) {
        for (const part of request.multipartBody.parts) {
          if ((0, import_file.hasRawContent)(part.body)) {
            part.body = (0, import_file.getRawContent)(part.body);
          }
        }
      }
      return tspPolicy.sendRequest(request, next);
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  multipartPolicy,
  multipartPolicyName
});

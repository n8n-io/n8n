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
var formDataPolicy_exports = {};
__export(formDataPolicy_exports, {
  formDataPolicy: () => formDataPolicy,
  formDataPolicyName: () => formDataPolicyName
});
module.exports = __toCommonJS(formDataPolicy_exports);
var import_policies = require("@typespec/ts-http-runtime/internal/policies");
const formDataPolicyName = import_policies.formDataPolicyName;
function formDataPolicy() {
  return (0, import_policies.formDataPolicy)();
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  formDataPolicy,
  formDataPolicyName
});

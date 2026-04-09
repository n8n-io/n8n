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
var logPolicy_exports = {};
__export(logPolicy_exports, {
  logPolicy: () => logPolicy,
  logPolicyName: () => logPolicyName
});
module.exports = __toCommonJS(logPolicy_exports);
var import_log = require("../log.js");
var import_policies = require("@typespec/ts-http-runtime/internal/policies");
const logPolicyName = import_policies.logPolicyName;
function logPolicy(options = {}) {
  return (0, import_policies.logPolicy)({
    logger: import_log.logger.info,
    ...options
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  logPolicy,
  logPolicyName
});

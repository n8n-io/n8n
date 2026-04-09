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
var retryPolicy_exports = {};
__export(retryPolicy_exports, {
  retryPolicy: () => retryPolicy
});
module.exports = __toCommonJS(retryPolicy_exports);
var import_logger = require("@azure/logger");
var import_constants = require("../constants.js");
var import_policies = require("@typespec/ts-http-runtime/internal/policies");
const retryPolicyLogger = (0, import_logger.createClientLogger)("core-rest-pipeline retryPolicy");
function retryPolicy(strategies, options = { maxRetries: import_constants.DEFAULT_RETRY_POLICY_COUNT }) {
  return (0, import_policies.retryPolicy)(strategies, {
    logger: retryPolicyLogger,
    ...options
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  retryPolicy
});

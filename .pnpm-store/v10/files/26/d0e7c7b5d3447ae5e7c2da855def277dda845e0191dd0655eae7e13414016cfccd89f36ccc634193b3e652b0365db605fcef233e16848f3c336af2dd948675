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
var exponentialRetryPolicy_exports = {};
__export(exponentialRetryPolicy_exports, {
  exponentialRetryPolicy: () => exponentialRetryPolicy,
  exponentialRetryPolicyName: () => exponentialRetryPolicyName
});
module.exports = __toCommonJS(exponentialRetryPolicy_exports);
var import_exponentialRetryStrategy = require("../retryStrategies/exponentialRetryStrategy.js");
var import_retryPolicy = require("./retryPolicy.js");
var import_constants = require("../constants.js");
const exponentialRetryPolicyName = "exponentialRetryPolicy";
function exponentialRetryPolicy(options = {}) {
  return (0, import_retryPolicy.retryPolicy)(
    [
      (0, import_exponentialRetryStrategy.exponentialRetryStrategy)({
        ...options,
        ignoreSystemErrors: true
      })
    ],
    {
      maxRetries: options.maxRetries ?? import_constants.DEFAULT_RETRY_POLICY_COUNT
    }
  );
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  exponentialRetryPolicy,
  exponentialRetryPolicyName
});

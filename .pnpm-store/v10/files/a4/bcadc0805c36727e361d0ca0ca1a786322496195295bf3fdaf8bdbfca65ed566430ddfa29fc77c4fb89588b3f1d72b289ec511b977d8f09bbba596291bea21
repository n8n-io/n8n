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
var import_sanitizer = require("../util/sanitizer.js");
const logPolicyName = "logPolicy";
function logPolicy(options = {}) {
  const logger = options.logger ?? import_log.logger.info;
  const sanitizer = new import_sanitizer.Sanitizer({
    additionalAllowedHeaderNames: options.additionalAllowedHeaderNames,
    additionalAllowedQueryParameters: options.additionalAllowedQueryParameters
  });
  return {
    name: logPolicyName,
    async sendRequest(request, next) {
      if (!logger.enabled) {
        return next(request);
      }
      logger(`Request: ${sanitizer.sanitize(request)}`);
      const response = await next(request);
      logger(`Response status code: ${response.status}`);
      logger(`Headers: ${sanitizer.sanitize(response.headers)}`);
      return response;
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  logPolicy,
  logPolicyName
});

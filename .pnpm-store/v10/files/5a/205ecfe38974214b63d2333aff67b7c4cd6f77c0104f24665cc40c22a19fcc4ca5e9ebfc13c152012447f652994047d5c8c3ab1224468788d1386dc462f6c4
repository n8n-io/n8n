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
var userAgentPolicy_exports = {};
__export(userAgentPolicy_exports, {
  userAgentPolicy: () => userAgentPolicy,
  userAgentPolicyName: () => userAgentPolicyName
});
module.exports = __toCommonJS(userAgentPolicy_exports);
var import_userAgent = require("../util/userAgent.js");
const UserAgentHeaderName = (0, import_userAgent.getUserAgentHeaderName)();
const userAgentPolicyName = "userAgentPolicy";
function userAgentPolicy(options = {}) {
  const userAgentValue = (0, import_userAgent.getUserAgentValue)(options.userAgentPrefix);
  return {
    name: userAgentPolicyName,
    async sendRequest(request, next) {
      if (!request.headers.has(UserAgentHeaderName)) {
        request.headers.set(UserAgentHeaderName, await userAgentValue);
      }
      return next(request);
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  userAgentPolicy,
  userAgentPolicyName
});

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
var ndJsonPolicy_exports = {};
__export(ndJsonPolicy_exports, {
  ndJsonPolicy: () => ndJsonPolicy,
  ndJsonPolicyName: () => ndJsonPolicyName
});
module.exports = __toCommonJS(ndJsonPolicy_exports);
const ndJsonPolicyName = "ndJsonPolicy";
function ndJsonPolicy() {
  return {
    name: ndJsonPolicyName,
    async sendRequest(request, next) {
      if (typeof request.body === "string" && request.body.startsWith("[")) {
        const body = JSON.parse(request.body);
        if (Array.isArray(body)) {
          request.body = body.map((item) => JSON.stringify(item) + "\n").join("");
        }
      }
      return next(request);
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ndJsonPolicy,
  ndJsonPolicyName
});

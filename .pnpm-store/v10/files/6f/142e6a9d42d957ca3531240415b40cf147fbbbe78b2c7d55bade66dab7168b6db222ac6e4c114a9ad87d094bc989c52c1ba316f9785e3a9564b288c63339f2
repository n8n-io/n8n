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
var wrapAbortSignalLikePolicy_exports = {};
__export(wrapAbortSignalLikePolicy_exports, {
  wrapAbortSignalLikePolicy: () => wrapAbortSignalLikePolicy,
  wrapAbortSignalLikePolicyName: () => wrapAbortSignalLikePolicyName
});
module.exports = __toCommonJS(wrapAbortSignalLikePolicy_exports);
var import_wrapAbortSignal = require("../util/wrapAbortSignal.js");
const wrapAbortSignalLikePolicyName = "wrapAbortSignalLikePolicy";
function wrapAbortSignalLikePolicy() {
  return {
    name: wrapAbortSignalLikePolicyName,
    sendRequest: async (request, next) => {
      if (!request.abortSignal) {
        return next(request);
      }
      const { abortSignal, cleanup } = (0, import_wrapAbortSignal.wrapAbortSignalLike)(request.abortSignal);
      request.abortSignal = abortSignal;
      try {
        return await next(request);
      } finally {
        cleanup?.();
      }
    }
  };
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  wrapAbortSignalLikePolicy,
  wrapAbortSignalLikePolicyName
});

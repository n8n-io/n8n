"use strict";
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
var duration_exports = {};
__export(duration_exports, {
  DurationMiddleware: () => DurationMiddleware,
  default: () => duration_default
});
module.exports = __toCommonJS(duration_exports);
const DurationMiddleware = ({ mockRequest }) => ({
  async prepareRequest(next) {
    if (mockRequest) {
      return next();
    }
    const request = await next();
    return request.enhance({
      headers: { "X-Started-At": Date.now() }
    });
  },
  async response(next) {
    const response = await next();
    const endedAt = Date.now();
    const startedAt = response.request().header("x-started-at");
    return response.enhance({
      headers: {
        "X-Started-At": startedAt,
        "X-Ended-At": endedAt,
        "X-Duration": endedAt - startedAt
      }
    });
  }
});
var duration_default = DurationMiddleware;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  DurationMiddleware
});
//# sourceMappingURL=duration.js.map
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var v1_exports = {};
__export(v1_exports, {
  calculateExponentialRetryTime: () => calculateExponentialRetryTime,
  default: () => RetryMiddleware,
  setRetryConfigs: () => setRetryConfigs
});
module.exports = __toCommonJS(v1_exports);
var import_utils = require("../../../utils");
var import_v2 = __toESM(require("../v2"));
let retryConfigs = (0, import_utils.assign)({}, import_v2.defaultRetryConfigs);
const setRetryConfigs = (newConfigs) => {
  console.warn("The use of setRetryConfigs is deprecated - use RetryMiddleware v2 instead.");
  retryConfigs = (0, import_utils.assign)({}, retryConfigs, newConfigs);
  middlewareInstance = (0, import_v2.default)(retryConfigs)();
};
let middlewareInstance = (0, import_v2.default)(retryConfigs)();
function RetryMiddleware() {
  return {
    request(request) {
      return middlewareInstance.request(request);
    },
    response(next) {
      return middlewareInstance.response(next);
    }
  };
}
const calculateExponentialRetryTime = (retryTime) => Math.min(
  randomFromRetryTime(retryTime) * retryConfigs.multiplier,
  retryConfigs.maxRetryTimeInSecs * 1e3
);
const randomFromRetryTime = (retryTime) => {
  const delta = retryConfigs.factor * retryTime;
  return random(retryTime - delta, retryTime + delta);
};
const random = (min, max) => {
  return Math.random() * (max - min) + min;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  calculateExponentialRetryTime,
  setRetryConfigs
});
//# sourceMappingURL=index.js.map
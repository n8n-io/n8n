"use strict";
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __name = (target, value) => __defProp(target, "name", { value, configurable: true });
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

// src/index.ts
var index_exports = {};
__export(index_exports, {
  getLocationConstraintPlugin: () => getLocationConstraintPlugin,
  locationConstraintMiddleware: () => locationConstraintMiddleware,
  locationConstraintMiddlewareOptions: () => locationConstraintMiddlewareOptions
});
module.exports = __toCommonJS(index_exports);
function locationConstraintMiddleware(options) {
  return (next) => async (args) => {
    const { CreateBucketConfiguration } = args.input;
    const region = await options.region();
    if (!CreateBucketConfiguration?.LocationConstraint && !CreateBucketConfiguration?.Location) {
      args = {
        ...args,
        input: {
          ...args.input,
          CreateBucketConfiguration: region === "us-east-1" ? void 0 : { LocationConstraint: region }
        }
      };
    }
    return next(args);
  };
}
__name(locationConstraintMiddleware, "locationConstraintMiddleware");
var locationConstraintMiddlewareOptions = {
  step: "initialize",
  tags: ["LOCATION_CONSTRAINT", "CREATE_BUCKET_CONFIGURATION"],
  name: "locationConstraintMiddleware",
  override: true
};
var getLocationConstraintPlugin = /* @__PURE__ */ __name((config) => ({
  applyToStack: /* @__PURE__ */ __name((clientStack) => {
    clientStack.add(locationConstraintMiddleware(config), locationConstraintMiddlewareOptions);
  }, "applyToStack")
}), "getLocationConstraintPlugin");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  locationConstraintMiddlewareOptions,
  getLocationConstraintPlugin,
  locationConstraintMiddleware
});


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
  build: () => build,
  parse: () => parse,
  validate: () => validate
});
module.exports = __toCommonJS(index_exports);
var validate = /* @__PURE__ */ __name((str) => typeof str === "string" && str.indexOf("arn:") === 0 && str.split(":").length >= 6, "validate");
var parse = /* @__PURE__ */ __name((arn) => {
  const segments = arn.split(":");
  if (segments.length < 6 || segments[0] !== "arn") throw new Error("Malformed ARN");
  const [
    ,
    //Skip "arn" literal
    partition,
    service,
    region,
    accountId,
    ...resource
  ] = segments;
  return {
    partition,
    service,
    region,
    accountId,
    resource: resource.join(":")
  };
}, "parse");
var build = /* @__PURE__ */ __name((arnObject) => {
  const { partition = "aws", service, region, accountId, resource } = arnObject;
  if ([service, region, accountId, resource].some((segment) => typeof segment !== "string")) {
    throw new Error("Input ARN object is invalid");
  }
  return `arn:${partition}:${service}:${region}:${accountId}:${resource}`;
}, "build");
// Annotate the CommonJS export names for ESM import in node:

0 && (module.exports = {
  validate,
  parse,
  build
});


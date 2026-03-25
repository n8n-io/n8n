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
var errors_exports = {};
__export(errors_exports, {
  TargetClosedError: () => TargetClosedError,
  TimeoutError: () => TimeoutError,
  isTargetClosedError: () => isTargetClosedError,
  parseError: () => parseError,
  serializeError: () => serializeError
});
module.exports = __toCommonJS(errors_exports);
var import_serializers = require("../protocol/serializers");
var import_utils = require("../utils");
class CustomError extends Error {
  constructor(message) {
    super(message);
    this.name = this.constructor.name;
  }
}
class TimeoutError extends CustomError {
}
class TargetClosedError extends CustomError {
  constructor(cause, logs) {
    super((cause || "Target page, context or browser has been closed") + (logs || ""));
  }
}
function isTargetClosedError(error) {
  return error instanceof TargetClosedError || error.name === "TargetClosedError";
}
function serializeError(e) {
  if ((0, import_utils.isError)(e))
    return { error: { message: e.message, stack: e.stack, name: e.name } };
  return { value: (0, import_serializers.serializeValue)(e, (value) => ({ fallThrough: value })) };
}
function parseError(error) {
  if (!error.error) {
    if (error.value === void 0)
      throw new Error("Serialized error must have either an error or a value");
    return (0, import_serializers.parseSerializedValue)(error.value, void 0);
  }
  const e = new Error(error.error.message);
  e.stack = error.error.stack || "";
  e.name = error.error.name;
  return e;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  TargetClosedError,
  TimeoutError,
  isTargetClosedError,
  parseError,
  serializeError
});

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
var jsHandle_exports = {};
__export(jsHandle_exports, {
  JSHandle: () => JSHandle,
  assertMaxArguments: () => assertMaxArguments,
  parseResult: () => parseResult,
  serializeArgument: () => serializeArgument
});
module.exports = __toCommonJS(jsHandle_exports);
var import_channelOwner = require("./channelOwner");
var import_errors = require("./errors");
var import_serializers = require("../protocol/serializers");
class JSHandle extends import_channelOwner.ChannelOwner {
  static from(handle) {
    return handle._object;
  }
  constructor(parent, type, guid, initializer) {
    super(parent, type, guid, initializer);
    this._preview = this._initializer.preview;
    this._channel.on("previewUpdated", ({ preview }) => this._preview = preview);
  }
  async evaluate(pageFunction, arg) {
    const result = await this._channel.evaluateExpression({ expression: String(pageFunction), isFunction: typeof pageFunction === "function", arg: serializeArgument(arg) });
    return parseResult(result.value);
  }
  async _evaluateFunction(functionDeclaration) {
    const result = await this._channel.evaluateExpression({ expression: functionDeclaration, isFunction: true, arg: serializeArgument(void 0) });
    return parseResult(result.value);
  }
  async evaluateHandle(pageFunction, arg) {
    const result = await this._channel.evaluateExpressionHandle({ expression: String(pageFunction), isFunction: typeof pageFunction === "function", arg: serializeArgument(arg) });
    return JSHandle.from(result.handle);
  }
  async getProperty(propertyName) {
    const result = await this._channel.getProperty({ name: propertyName });
    return JSHandle.from(result.handle);
  }
  async getProperties() {
    const map = /* @__PURE__ */ new Map();
    for (const { name, value } of (await this._channel.getPropertyList()).properties)
      map.set(name, JSHandle.from(value));
    return map;
  }
  async jsonValue() {
    return parseResult((await this._channel.jsonValue()).value);
  }
  asElement() {
    return null;
  }
  async [Symbol.asyncDispose]() {
    await this.dispose();
  }
  async dispose() {
    try {
      await this._channel.dispose();
    } catch (e) {
      if ((0, import_errors.isTargetClosedError)(e))
        return;
      throw e;
    }
  }
  toString() {
    return this._preview;
  }
}
function serializeArgument(arg) {
  const handles = [];
  const pushHandle = (channel) => {
    handles.push(channel);
    return handles.length - 1;
  };
  const value = (0, import_serializers.serializeValue)(arg, (value2) => {
    if (value2 instanceof JSHandle)
      return { h: pushHandle(value2._channel) };
    return { fallThrough: value2 };
  });
  return { value, handles };
}
function parseResult(value) {
  return (0, import_serializers.parseSerializedValue)(value, void 0);
}
function assertMaxArguments(count, max) {
  if (count > max)
    throw new Error("Too many arguments. If you need to pass more than 1 argument to the function wrap them in an object.");
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  JSHandle,
  assertMaxArguments,
  parseResult,
  serializeArgument
});

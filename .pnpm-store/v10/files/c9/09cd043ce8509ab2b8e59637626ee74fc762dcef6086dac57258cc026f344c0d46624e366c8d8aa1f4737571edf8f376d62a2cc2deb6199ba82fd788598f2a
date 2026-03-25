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
var jsHandleDispatcher_exports = {};
__export(jsHandleDispatcher_exports, {
  JSHandleDispatcher: () => JSHandleDispatcher,
  parseArgument: () => parseArgument,
  parseValue: () => parseValue,
  serializeResult: () => serializeResult
});
module.exports = __toCommonJS(jsHandleDispatcher_exports);
var import_dispatcher = require("./dispatcher");
var import_elementHandlerDispatcher = require("./elementHandlerDispatcher");
var import_serializers = require("../../protocol/serializers");
class JSHandleDispatcher extends import_dispatcher.Dispatcher {
  constructor(scope, jsHandle) {
    super(scope, jsHandle, jsHandle.asElement() ? "ElementHandle" : "JSHandle", {
      preview: jsHandle.toString()
    });
    this._type_JSHandle = true;
    jsHandle._setPreviewCallback((preview) => this._dispatchEvent("previewUpdated", { preview }));
  }
  static fromJSHandle(scope, handle) {
    return scope.connection.existingDispatcher(handle) || new JSHandleDispatcher(scope, handle);
  }
  async evaluateExpression(params, progress) {
    const jsHandle = await progress.race(this._object.evaluateExpression(params.expression, { isFunction: params.isFunction }, parseArgument(params.arg)));
    return { value: serializeResult(jsHandle) };
  }
  async evaluateExpressionHandle(params, progress) {
    const jsHandle = await progress.race(this._object.evaluateExpressionHandle(params.expression, { isFunction: params.isFunction }, parseArgument(params.arg)));
    return { handle: import_elementHandlerDispatcher.ElementHandleDispatcher.fromJSOrElementHandle(this.parentScope(), jsHandle) };
  }
  async getProperty(params, progress) {
    const jsHandle = await progress.race(this._object.getProperty(params.name));
    return { handle: import_elementHandlerDispatcher.ElementHandleDispatcher.fromJSOrElementHandle(this.parentScope(), jsHandle) };
  }
  async getPropertyList(params, progress) {
    const map = await progress.race(this._object.getProperties());
    const properties = [];
    for (const [name, value] of map) {
      properties.push({ name, value: import_elementHandlerDispatcher.ElementHandleDispatcher.fromJSOrElementHandle(this.parentScope(), value) });
    }
    return { properties };
  }
  async jsonValue(params, progress) {
    return { value: serializeResult(await progress.race(this._object.jsonValue())) };
  }
  async dispose(_, progress) {
    progress.metadata.potentiallyClosesScope = true;
    this._object.dispose();
    this._dispose();
  }
}
function parseArgument(arg) {
  return (0, import_serializers.parseSerializedValue)(arg.value, arg.handles.map((a) => a._object));
}
function parseValue(v) {
  return (0, import_serializers.parseSerializedValue)(v, []);
}
function serializeResult(arg) {
  return (0, import_serializers.serializeValue)(arg, (value) => ({ fallThrough: value }));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  JSHandleDispatcher,
  parseArgument,
  parseValue,
  serializeResult
});

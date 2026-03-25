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
var crExecutionContext_exports = {};
__export(crExecutionContext_exports, {
  CRExecutionContext: () => CRExecutionContext,
  createHandle: () => createHandle
});
module.exports = __toCommonJS(crExecutionContext_exports);
var import_assert = require("../../utils/isomorphic/assert");
var import_crProtocolHelper = require("./crProtocolHelper");
var import_stackTrace = require("../../utils/isomorphic/stackTrace");
var import_utilityScriptSerializers = require("../../utils/isomorphic/utilityScriptSerializers");
var js = __toESM(require("../javascript"));
var dom = __toESM(require("../dom"));
var import_protocolError = require("../protocolError");
class CRExecutionContext {
  constructor(client, contextPayload) {
    this._client = client;
    this._contextId = contextPayload.id;
  }
  async rawEvaluateJSON(expression) {
    const { exceptionDetails, result: remoteObject } = await this._client.send("Runtime.evaluate", {
      expression,
      contextId: this._contextId,
      returnByValue: true
    }).catch(rewriteError);
    if (exceptionDetails)
      throw new js.JavaScriptErrorInEvaluate((0, import_crProtocolHelper.getExceptionMessage)(exceptionDetails));
    return remoteObject.value;
  }
  async rawEvaluateHandle(context, expression) {
    const { exceptionDetails, result: remoteObject } = await this._client.send("Runtime.evaluate", {
      expression,
      contextId: this._contextId
    }).catch(rewriteError);
    if (exceptionDetails)
      throw new js.JavaScriptErrorInEvaluate((0, import_crProtocolHelper.getExceptionMessage)(exceptionDetails));
    return createHandle(context, remoteObject);
  }
  async evaluateWithArguments(expression, returnByValue, utilityScript, values, handles) {
    const { exceptionDetails, result: remoteObject } = await this._client.send("Runtime.callFunctionOn", {
      functionDeclaration: expression,
      objectId: utilityScript._objectId,
      arguments: [
        { objectId: utilityScript._objectId },
        ...values.map((value) => ({ value })),
        ...handles.map((handle) => ({ objectId: handle._objectId }))
      ],
      returnByValue,
      awaitPromise: true,
      userGesture: true
    }).catch(rewriteError);
    if (exceptionDetails)
      throw new js.JavaScriptErrorInEvaluate((0, import_crProtocolHelper.getExceptionMessage)(exceptionDetails));
    return returnByValue ? (0, import_utilityScriptSerializers.parseEvaluationResultValue)(remoteObject.value) : createHandle(utilityScript._context, remoteObject);
  }
  async getProperties(object) {
    const response = await this._client.send("Runtime.getProperties", {
      objectId: object._objectId,
      ownProperties: true
    });
    const result = /* @__PURE__ */ new Map();
    for (const property of response.result) {
      if (!property.enumerable || !property.value)
        continue;
      result.set(property.name, createHandle(object._context, property.value));
    }
    return result;
  }
  async releaseHandle(handle) {
    if (!handle._objectId)
      return;
    await (0, import_crProtocolHelper.releaseObject)(this._client, handle._objectId);
  }
}
function rewriteError(error) {
  if (error.message.includes("Object reference chain is too long"))
    throw new Error("Cannot serialize result: object reference chain is too long.");
  if (error.message.includes("Object couldn't be returned by value"))
    return { result: { type: "undefined" } };
  if (error instanceof TypeError && error.message.startsWith("Converting circular structure to JSON"))
    (0, import_stackTrace.rewriteErrorMessage)(error, error.message + " Are you passing a nested JSHandle?");
  if (!js.isJavaScriptErrorInEvaluate(error) && !(0, import_protocolError.isSessionClosedError)(error))
    throw new Error("Execution context was destroyed, most likely because of a navigation.");
  throw error;
}
function potentiallyUnserializableValue(remoteObject) {
  const value = remoteObject.value;
  const unserializableValue = remoteObject.unserializableValue;
  return unserializableValue ? js.parseUnserializableValue(unserializableValue) : value;
}
function renderPreview(object) {
  if (object.type === "undefined")
    return "undefined";
  if ("value" in object)
    return String(object.value);
  if (object.unserializableValue)
    return String(object.unserializableValue);
  if (object.description === "Object" && object.preview) {
    const tokens = [];
    for (const { name, value } of object.preview.properties)
      tokens.push(`${name}: ${value}`);
    return `{${tokens.join(", ")}}`;
  }
  if (object.subtype === "array" && object.preview)
    return js.sparseArrayToString(object.preview.properties);
  return object.description;
}
function createHandle(context, remoteObject) {
  if (remoteObject.subtype === "node") {
    (0, import_assert.assert)(context instanceof dom.FrameExecutionContext);
    return new dom.ElementHandle(context, remoteObject.objectId);
  }
  return new js.JSHandle(context, remoteObject.subtype || remoteObject.type, renderPreview(remoteObject), remoteObject.objectId, potentiallyUnserializableValue(remoteObject));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  CRExecutionContext,
  createHandle
});

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
var wkExecutionContext_exports = {};
__export(wkExecutionContext_exports, {
  WKExecutionContext: () => WKExecutionContext,
  createHandle: () => createHandle
});
module.exports = __toCommonJS(wkExecutionContext_exports);
var js = __toESM(require("../javascript"));
var dom = __toESM(require("../dom"));
var import_protocolError = require("../protocolError");
var import_assert = require("../../utils/isomorphic/assert");
var import_utilityScriptSerializers = require("../../utils/isomorphic/utilityScriptSerializers");
class WKExecutionContext {
  constructor(session, contextId) {
    this._session = session;
    this._contextId = contextId;
  }
  async rawEvaluateJSON(expression) {
    try {
      const response = await this._session.send("Runtime.evaluate", {
        expression,
        contextId: this._contextId,
        returnByValue: true
      });
      if (response.wasThrown)
        throw new js.JavaScriptErrorInEvaluate(response.result.description);
      return response.result.value;
    } catch (error) {
      throw rewriteError(error);
    }
  }
  async rawEvaluateHandle(context, expression) {
    try {
      const response = await this._session.send("Runtime.evaluate", {
        expression,
        contextId: this._contextId,
        returnByValue: false
      });
      if (response.wasThrown)
        throw new js.JavaScriptErrorInEvaluate(response.result.description);
      return createHandle(context, response.result);
    } catch (error) {
      throw rewriteError(error);
    }
  }
  async evaluateWithArguments(expression, returnByValue, utilityScript, values, handles) {
    try {
      const response = await this._session.send("Runtime.callFunctionOn", {
        functionDeclaration: expression,
        objectId: utilityScript._objectId,
        arguments: [
          { objectId: utilityScript._objectId },
          ...values.map((value) => ({ value })),
          ...handles.map((handle) => ({ objectId: handle._objectId }))
        ],
        returnByValue,
        emulateUserGesture: true,
        awaitPromise: true
      });
      if (response.wasThrown)
        throw new js.JavaScriptErrorInEvaluate(response.result.description);
      if (returnByValue)
        return (0, import_utilityScriptSerializers.parseEvaluationResultValue)(response.result.value);
      return createHandle(utilityScript._context, response.result);
    } catch (error) {
      throw rewriteError(error);
    }
  }
  async getProperties(object) {
    const response = await this._session.send("Runtime.getProperties", {
      objectId: object._objectId,
      ownProperties: true
    });
    const result = /* @__PURE__ */ new Map();
    for (const property of response.properties) {
      if (!property.enumerable || !property.value)
        continue;
      result.set(property.name, createHandle(object._context, property.value));
    }
    return result;
  }
  async releaseHandle(handle) {
    if (!handle._objectId)
      return;
    await this._session.send("Runtime.releaseObject", { objectId: handle._objectId });
  }
}
function potentiallyUnserializableValue(remoteObject) {
  const value = remoteObject.value;
  const isUnserializable = remoteObject.type === "number" && ["NaN", "-Infinity", "Infinity", "-0"].includes(remoteObject.description);
  return isUnserializable ? js.parseUnserializableValue(remoteObject.description) : value;
}
function rewriteError(error) {
  if (error.message.includes("Object has too long reference chain"))
    throw new Error("Cannot serialize result: object reference chain is too long.");
  if (!js.isJavaScriptErrorInEvaluate(error) && !(0, import_protocolError.isSessionClosedError)(error))
    return new Error("Execution context was destroyed, most likely because of a navigation.");
  return error;
}
function renderPreview(object) {
  if (object.type === "undefined")
    return "undefined";
  if ("value" in object)
    return String(object.value);
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
  const isPromise = remoteObject.className === "Promise";
  return new js.JSHandle(context, isPromise ? "promise" : remoteObject.subtype || remoteObject.type, renderPreview(remoteObject), remoteObject.objectId, potentiallyUnserializableValue(remoteObject));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  WKExecutionContext,
  createHandle
});

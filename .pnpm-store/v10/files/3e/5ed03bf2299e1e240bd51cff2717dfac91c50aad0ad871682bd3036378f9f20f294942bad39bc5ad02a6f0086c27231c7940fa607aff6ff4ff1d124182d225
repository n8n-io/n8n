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
var ffExecutionContext_exports = {};
__export(ffExecutionContext_exports, {
  FFExecutionContext: () => FFExecutionContext,
  createHandle: () => createHandle
});
module.exports = __toCommonJS(ffExecutionContext_exports);
var import_assert = require("../../utils/isomorphic/assert");
var import_stackTrace = require("../../utils/isomorphic/stackTrace");
var import_utilityScriptSerializers = require("../../utils/isomorphic/utilityScriptSerializers");
var js = __toESM(require("../javascript"));
var dom = __toESM(require("../dom"));
var import_protocolError = require("../protocolError");
class FFExecutionContext {
  constructor(session, executionContextId) {
    this._session = session;
    this._executionContextId = executionContextId;
  }
  async rawEvaluateJSON(expression) {
    const payload = await this._session.send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      executionContextId: this._executionContextId
    }).catch(rewriteError);
    checkException(payload.exceptionDetails);
    return payload.result.value;
  }
  async rawEvaluateHandle(context, expression) {
    const payload = await this._session.send("Runtime.evaluate", {
      expression,
      returnByValue: false,
      executionContextId: this._executionContextId
    }).catch(rewriteError);
    checkException(payload.exceptionDetails);
    return createHandle(context, payload.result);
  }
  async evaluateWithArguments(expression, returnByValue, utilityScript, values, handles) {
    const payload = await this._session.send("Runtime.callFunction", {
      functionDeclaration: expression,
      args: [
        { objectId: utilityScript._objectId, value: void 0 },
        ...values.map((value) => ({ value })),
        ...handles.map((handle) => ({ objectId: handle._objectId, value: void 0 }))
      ],
      returnByValue,
      executionContextId: this._executionContextId
    }).catch(rewriteError);
    checkException(payload.exceptionDetails);
    if (returnByValue)
      return (0, import_utilityScriptSerializers.parseEvaluationResultValue)(payload.result.value);
    return createHandle(utilityScript._context, payload.result);
  }
  async getProperties(object) {
    const response = await this._session.send("Runtime.getObjectProperties", {
      executionContextId: this._executionContextId,
      objectId: object._objectId
    });
    const result = /* @__PURE__ */ new Map();
    for (const property of response.properties)
      result.set(property.name, createHandle(object._context, property.value));
    return result;
  }
  async releaseHandle(handle) {
    if (!handle._objectId)
      return;
    await this._session.send("Runtime.disposeObject", {
      executionContextId: this._executionContextId,
      objectId: handle._objectId
    });
  }
}
function checkException(exceptionDetails) {
  if (!exceptionDetails)
    return;
  if (exceptionDetails.value)
    throw new js.JavaScriptErrorInEvaluate(JSON.stringify(exceptionDetails.value));
  else
    throw new js.JavaScriptErrorInEvaluate(exceptionDetails.text + (exceptionDetails.stack ? "\n" + exceptionDetails.stack : ""));
}
function rewriteError(error) {
  if (error.message.includes("cyclic object value") || error.message.includes("Object is not serializable"))
    return { result: { type: "undefined", value: void 0 } };
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
  if (object.unserializableValue)
    return String(object.unserializableValue);
  if (object.type === "symbol")
    return "Symbol()";
  if (object.subtype === "regexp")
    return "RegExp";
  if (object.subtype === "weakmap")
    return "WeakMap";
  if (object.subtype === "weakset")
    return "WeakSet";
  if (object.subtype)
    return object.subtype[0].toUpperCase() + object.subtype.slice(1);
  if ("value" in object)
    return String(object.value);
}
function createHandle(context, remoteObject) {
  if (remoteObject.subtype === "node") {
    (0, import_assert.assert)(context instanceof dom.FrameExecutionContext);
    return new dom.ElementHandle(context, remoteObject.objectId);
  }
  return new js.JSHandle(context, remoteObject.subtype || remoteObject.type || "", renderPreview(remoteObject), remoteObject.objectId, potentiallyUnserializableValue(remoteObject));
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  FFExecutionContext,
  createHandle
});

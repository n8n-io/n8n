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
var javascript_exports = {};
__export(javascript_exports, {
  ExecutionContext: () => ExecutionContext,
  JSHandle: () => JSHandle,
  JavaScriptErrorInEvaluate: () => JavaScriptErrorInEvaluate,
  evaluate: () => evaluate,
  evaluateExpression: () => evaluateExpression,
  isJavaScriptErrorInEvaluate: () => isJavaScriptErrorInEvaluate,
  normalizeEvaluationExpression: () => normalizeEvaluationExpression,
  parseUnserializableValue: () => parseUnserializableValue,
  sparseArrayToString: () => sparseArrayToString
});
module.exports = __toCommonJS(javascript_exports);
var import_instrumentation = require("./instrumentation");
var rawUtilityScriptSource = __toESM(require("../generated/utilityScriptSource"));
var import_utils = require("../utils");
var import_utilityScriptSerializers = require("../utils/isomorphic/utilityScriptSerializers");
var import_manualPromise = require("../utils/isomorphic/manualPromise");
class ExecutionContext extends import_instrumentation.SdkObject {
  constructor(parent, delegate, worldNameForTest) {
    super(parent, "execution-context");
    this._contextDestroyedScope = new import_manualPromise.LongStandingScope();
    this.worldNameForTest = worldNameForTest;
    this.delegate = delegate;
  }
  contextDestroyed(reason) {
    this._contextDestroyedScope.close(new Error(reason));
  }
  async _raceAgainstContextDestroyed(promise) {
    return this._contextDestroyedScope.race(promise);
  }
  rawEvaluateJSON(expression) {
    return this._raceAgainstContextDestroyed(this.delegate.rawEvaluateJSON(expression));
  }
  rawEvaluateHandle(expression) {
    return this._raceAgainstContextDestroyed(this.delegate.rawEvaluateHandle(this, expression));
  }
  async evaluateWithArguments(expression, returnByValue, values, handles) {
    const utilityScript = await this.utilityScript();
    return this._raceAgainstContextDestroyed(this.delegate.evaluateWithArguments(expression, returnByValue, utilityScript, values, handles));
  }
  getProperties(object) {
    return this._raceAgainstContextDestroyed(this.delegate.getProperties(object));
  }
  releaseHandle(handle) {
    return this.delegate.releaseHandle(handle);
  }
  adoptIfNeeded(handle) {
    return null;
  }
  utilityScript() {
    if (!this._utilityScriptPromise) {
      const source = `
      (() => {
        const module = {};
        ${rawUtilityScriptSource.source}
        return new (module.exports.UtilityScript())(globalThis, ${(0, import_utils.isUnderTest)()});
      })();`;
      this._utilityScriptPromise = this._raceAgainstContextDestroyed(this.delegate.rawEvaluateHandle(this, source)).then((handle) => {
        handle._setPreview("UtilityScript");
        return handle;
      });
    }
    return this._utilityScriptPromise;
  }
  async doSlowMo() {
  }
}
class JSHandle extends import_instrumentation.SdkObject {
  constructor(context, type, preview, objectId, value) {
    super(context, "handle");
    this.__jshandle = true;
    this._disposed = false;
    this._context = context;
    this._objectId = objectId;
    this._value = value;
    this._objectType = type;
    this._preview = this._objectId ? preview || `JSHandle@${this._objectType}` : String(value);
    if (this._objectId && globalThis.leakedJSHandles)
      globalThis.leakedJSHandles.set(this, new Error("Leaked JSHandle"));
  }
  async evaluate(pageFunction, arg) {
    return evaluate(this._context, true, pageFunction, this, arg);
  }
  async evaluateHandle(pageFunction, arg) {
    return evaluate(this._context, false, pageFunction, this, arg);
  }
  async evaluateExpression(expression, options, arg) {
    const value = await evaluateExpression(this._context, expression, { ...options, returnByValue: true }, this, arg);
    await this._context.doSlowMo();
    return value;
  }
  async evaluateExpressionHandle(expression, options, arg) {
    const value = await evaluateExpression(this._context, expression, { ...options, returnByValue: false }, this, arg);
    await this._context.doSlowMo();
    return value;
  }
  async getProperty(propertyName) {
    const objectHandle = await this.evaluateHandle((object, propertyName2) => {
      const result2 = { __proto__: null };
      result2[propertyName2] = object[propertyName2];
      return result2;
    }, propertyName);
    const properties = await objectHandle.getProperties();
    const result = properties.get(propertyName);
    objectHandle.dispose();
    return result;
  }
  async getProperties() {
    if (!this._objectId)
      return /* @__PURE__ */ new Map();
    return this._context.getProperties(this);
  }
  rawValue() {
    return this._value;
  }
  async jsonValue() {
    if (!this._objectId)
      return this._value;
    const script = `(utilityScript, ...args) => utilityScript.jsonValue(...args)`;
    return this._context.evaluateWithArguments(script, true, [true], [this]);
  }
  asElement() {
    return null;
  }
  dispose() {
    if (this._disposed)
      return;
    this._disposed = true;
    if (this._objectId) {
      this._context.releaseHandle(this).catch((e) => {
      });
      if (globalThis.leakedJSHandles)
        globalThis.leakedJSHandles.delete(this);
    }
  }
  toString() {
    return this._preview;
  }
  _setPreviewCallback(callback) {
    this._previewCallback = callback;
  }
  preview() {
    return this._preview;
  }
  worldNameForTest() {
    return this._context.worldNameForTest;
  }
  _setPreview(preview) {
    this._preview = preview;
    if (this._previewCallback)
      this._previewCallback(preview);
  }
}
async function evaluate(context, returnByValue, pageFunction, ...args) {
  return evaluateExpression(context, String(pageFunction), { returnByValue, isFunction: typeof pageFunction === "function" }, ...args);
}
async function evaluateExpression(context, expression, options, ...args) {
  expression = normalizeEvaluationExpression(expression, options.isFunction);
  const handles = [];
  const toDispose = [];
  const pushHandle = (handle) => {
    handles.push(handle);
    return handles.length - 1;
  };
  args = args.map((arg) => (0, import_utilityScriptSerializers.serializeAsCallArgument)(arg, (handle) => {
    if (handle instanceof JSHandle) {
      if (!handle._objectId)
        return { fallThrough: handle._value };
      if (handle._disposed)
        throw new JavaScriptErrorInEvaluate("JSHandle is disposed!");
      const adopted = context.adoptIfNeeded(handle);
      if (adopted === null)
        return { h: pushHandle(Promise.resolve(handle)) };
      toDispose.push(adopted);
      return { h: pushHandle(adopted) };
    }
    return { fallThrough: handle };
  }));
  const utilityScriptObjects = [];
  for (const handle of await Promise.all(handles)) {
    if (handle._context !== context)
      throw new JavaScriptErrorInEvaluate("JSHandles can be evaluated only in the context they were created!");
    utilityScriptObjects.push(handle);
  }
  const utilityScriptValues = [options.isFunction, options.returnByValue, expression, args.length, ...args];
  const script = `(utilityScript, ...args) => utilityScript.evaluate(...args)`;
  try {
    return await context.evaluateWithArguments(script, options.returnByValue || false, utilityScriptValues, utilityScriptObjects);
  } finally {
    toDispose.map((handlePromise) => handlePromise.then((handle) => handle.dispose()));
  }
}
function parseUnserializableValue(unserializableValue) {
  if (unserializableValue === "NaN")
    return NaN;
  if (unserializableValue === "Infinity")
    return Infinity;
  if (unserializableValue === "-Infinity")
    return -Infinity;
  if (unserializableValue === "-0")
    return -0;
}
function normalizeEvaluationExpression(expression, isFunction) {
  expression = expression.trim();
  if (isFunction) {
    try {
      new Function("(" + expression + ")");
    } catch (e1) {
      if (expression.startsWith("async "))
        expression = "async function " + expression.substring("async ".length);
      else
        expression = "function " + expression;
      try {
        new Function("(" + expression + ")");
      } catch (e2) {
        throw new Error("Passed function is not well-serializable!");
      }
    }
  }
  if (/^(async)?\s*function(\s|\()/.test(expression))
    expression = "(" + expression + ")";
  return expression;
}
class JavaScriptErrorInEvaluate extends Error {
}
function isJavaScriptErrorInEvaluate(error) {
  return error instanceof JavaScriptErrorInEvaluate;
}
function sparseArrayToString(entries) {
  const arrayEntries = [];
  for (const { name, value } of entries) {
    const index = +name;
    if (isNaN(index) || index < 0)
      continue;
    arrayEntries.push({ index, value });
  }
  arrayEntries.sort((a, b) => a.index - b.index);
  let lastIndex = -1;
  const tokens = [];
  for (const { index, value } of arrayEntries) {
    const emptyItems = index - lastIndex - 1;
    if (emptyItems === 1)
      tokens.push(`empty`);
    else if (emptyItems > 1)
      tokens.push(`empty x ${emptyItems}`);
    tokens.push(String(value));
    lastIndex = index;
  }
  return "[" + tokens.join(", ") + "]";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ExecutionContext,
  JSHandle,
  JavaScriptErrorInEvaluate,
  evaluate,
  evaluateExpression,
  isJavaScriptErrorInEvaluate,
  normalizeEvaluationExpression,
  parseUnserializableValue,
  sparseArrayToString
});

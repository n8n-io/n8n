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
var context_storage_exports = {};
__export(context_storage_exports, {
  contextStorage: () => contextStorage,
  getContext: () => getContext,
  tryGetContext: () => tryGetContext
});
module.exports = __toCommonJS(context_storage_exports);
var import_node_async_hooks = require("node:async_hooks");
const asyncLocalStorage = new import_node_async_hooks.AsyncLocalStorage();
const contextStorage = () => {
  return async function contextStorage2(c, next) {
    await asyncLocalStorage.run(c, next);
  };
};
const tryGetContext = () => {
  return asyncLocalStorage.getStore();
};
const getContext = () => {
  const context = tryGetContext();
  if (!context) {
    throw new Error("Context is not available");
  }
  return context;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  contextStorage,
  getContext,
  tryGetContext
});

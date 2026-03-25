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
var context_exports = {};
__export(context_exports, {
  createContext: () => createContext,
  globalContexts: () => globalContexts,
  useContext: () => useContext
});
module.exports = __toCommonJS(context_exports);
var import_html = require("../helper/html");
var import_base = require("./base");
var import_constants = require("./constants");
var import_context = require("./dom/context");
const globalContexts = [];
const createContext = (defaultValue) => {
  const values = [defaultValue];
  const context = ((props) => {
    values.push(props.value);
    let string;
    try {
      string = props.children ? (Array.isArray(props.children) ? new import_base.JSXFragmentNode("", {}, props.children) : props.children).toString() : "";
    } catch (e) {
      values.pop();
      throw e;
    }
    if (string instanceof Promise) {
      return string.finally(() => values.pop()).then((resString) => (0, import_html.raw)(resString, resString.callbacks));
    } else {
      values.pop();
      return (0, import_html.raw)(string);
    }
  });
  context.values = values;
  context.Provider = context;
  context[import_constants.DOM_RENDERER] = (0, import_context.createContextProviderFunction)(values);
  globalContexts.push(context);
  return context;
};
const useContext = (context) => {
  return context.values.at(-1);
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createContext,
  globalContexts,
  useContext
});

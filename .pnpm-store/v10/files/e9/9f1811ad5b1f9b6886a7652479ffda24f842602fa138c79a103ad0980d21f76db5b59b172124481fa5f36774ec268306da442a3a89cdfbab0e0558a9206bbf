// src/jsx/context.ts
import { raw } from "../helper/html/index.js";
import { JSXFragmentNode } from "./base.js";
import { DOM_RENDERER } from "./constants.js";
import { createContextProviderFunction } from "./dom/context.js";
var globalContexts = [];
var createContext = (defaultValue) => {
  const values = [defaultValue];
  const context = ((props) => {
    values.push(props.value);
    let string;
    try {
      string = props.children ? (Array.isArray(props.children) ? new JSXFragmentNode("", {}, props.children) : props.children).toString() : "";
    } catch (e) {
      values.pop();
      throw e;
    }
    if (string instanceof Promise) {
      return string.finally(() => values.pop()).then((resString) => raw(resString, resString.callbacks));
    } else {
      values.pop();
      return raw(string);
    }
  });
  context.values = values;
  context.Provider = context;
  context[DOM_RENDERER] = createContextProviderFunction(values);
  globalContexts.push(context);
  return context;
};
var useContext = (context) => {
  return context.values.at(-1);
};
export {
  createContext,
  globalContexts,
  useContext
};

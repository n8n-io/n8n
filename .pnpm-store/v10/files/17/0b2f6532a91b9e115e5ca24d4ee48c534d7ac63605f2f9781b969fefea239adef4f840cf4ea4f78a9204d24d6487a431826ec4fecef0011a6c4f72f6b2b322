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
var components_exports = {};
__export(components_exports, {
  ErrorBoundary: () => ErrorBoundary,
  Suspense: () => Suspense
});
module.exports = __toCommonJS(components_exports);
var import_constants = require("../constants");
var import_jsx_runtime = require("./jsx-runtime");
const ErrorBoundary = (({ children, fallback, fallbackRender, onError }) => {
  const res = (0, import_jsx_runtime.Fragment)({ children });
  res[import_constants.DOM_ERROR_HANDLER] = (err) => {
    if (err instanceof Promise) {
      throw err;
    }
    onError?.(err);
    return fallbackRender?.(err) || fallback;
  };
  return res;
});
const Suspense = (({
  children,
  fallback
}) => {
  const res = (0, import_jsx_runtime.Fragment)({ children });
  res[import_constants.DOM_ERROR_HANDLER] = (err, retry) => {
    if (!(err instanceof Promise)) {
      throw err;
    }
    err.finally(retry);
    return fallback;
  };
  return res;
});
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  ErrorBoundary,
  Suspense
});

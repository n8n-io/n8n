// src/jsx/dom/components.ts
import { DOM_ERROR_HANDLER } from "../constants.js";
import { Fragment } from "./jsx-runtime.js";
var ErrorBoundary = (({ children, fallback, fallbackRender, onError }) => {
  const res = Fragment({ children });
  res[DOM_ERROR_HANDLER] = (err) => {
    if (err instanceof Promise) {
      throw err;
    }
    onError?.(err);
    return fallbackRender?.(err) || fallback;
  };
  return res;
});
var Suspense = (({
  children,
  fallback
}) => {
  const res = Fragment({ children });
  res[DOM_ERROR_HANDLER] = (err, retry) => {
    if (!(err instanceof Promise)) {
      throw err;
    }
    err.finally(retry);
    return fallback;
  };
  return res;
});
export {
  ErrorBoundary,
  Suspense
};

// src/jsx/dom/server.ts
import { renderToReadableStream as renderToReadableStreamHono } from "../streaming.js";
import version from "./index.js";
var renderToString = (element, options = {}) => {
  if (Object.keys(options).length > 0) {
    console.warn("options are not supported yet");
  }
  const res = element?.toString() ?? "";
  if (typeof res !== "string") {
    throw new Error("Async component is not supported in renderToString");
  }
  return res;
};
var renderToReadableStream = async (element, options = {}) => {
  if (Object.keys(options).some((key) => key !== "onError")) {
    console.warn("options are not supported yet, except onError");
  }
  if (!element || typeof element !== "object") {
    element = element?.toString() ?? "";
  }
  return renderToReadableStreamHono(element, options.onError);
};
var server_default = {
  renderToString,
  renderToReadableStream,
  version
};
export {
  server_default as default,
  renderToReadableStream,
  renderToString,
  version
};

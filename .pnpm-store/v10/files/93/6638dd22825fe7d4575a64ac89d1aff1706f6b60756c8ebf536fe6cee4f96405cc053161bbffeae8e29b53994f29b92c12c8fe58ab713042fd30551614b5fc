// src/jsx/jsx-runtime.ts
import { jsxDEV, Fragment } from "./jsx-dev-runtime.js";
import { jsxDEV as jsxDEV2 } from "./jsx-dev-runtime.js";
import { html, raw } from "../helper/html/index.js";
import { escapeToBuffer, stringBufferToString } from "../utils/html.js";
import { styleObjectForEach } from "./utils.js";
var jsxAttr = (key, v) => {
  const buffer = [`${key}="`];
  if (key === "style" && typeof v === "object") {
    let styleStr = "";
    styleObjectForEach(v, (property, value) => {
      if (value != null) {
        styleStr += `${styleStr ? ";" : ""}${property}:${value}`;
      }
    });
    escapeToBuffer(styleStr, buffer);
    buffer[0] += '"';
  } else if (typeof v === "string") {
    escapeToBuffer(v, buffer);
    buffer[0] += '"';
  } else if (v === null || v === void 0) {
    return raw("");
  } else if (typeof v === "number" || v.isEscaped) {
    buffer[0] += `${v}"`;
  } else if (v instanceof Promise) {
    buffer.unshift('"', v);
  } else {
    escapeToBuffer(v.toString(), buffer);
    buffer[0] += '"';
  }
  return buffer.length === 1 ? raw(buffer[0]) : stringBufferToString(buffer, void 0);
};
var jsxEscape = (value) => value;
export {
  Fragment,
  jsxDEV as jsx,
  jsxAttr,
  jsxEscape,
  html as jsxTemplate,
  jsxDEV2 as jsxs
};

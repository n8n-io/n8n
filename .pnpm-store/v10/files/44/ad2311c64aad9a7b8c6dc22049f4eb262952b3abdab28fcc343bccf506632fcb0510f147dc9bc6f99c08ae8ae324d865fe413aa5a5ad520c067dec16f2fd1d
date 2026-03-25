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
var jsx_runtime_exports = {};
__export(jsx_runtime_exports, {
  Fragment: () => import_jsx_dev_runtime.Fragment,
  jsx: () => import_jsx_dev_runtime.jsxDEV,
  jsxAttr: () => jsxAttr,
  jsxEscape: () => jsxEscape,
  jsxTemplate: () => import_html.html,
  jsxs: () => import_jsx_dev_runtime2.jsxDEV
});
module.exports = __toCommonJS(jsx_runtime_exports);
var import_jsx_dev_runtime = require("./jsx-dev-runtime");
var import_jsx_dev_runtime2 = require("./jsx-dev-runtime");
var import_html = require("../helper/html");
var import_html2 = require("../utils/html");
var import_utils = require("./utils");
const jsxAttr = (key, v) => {
  const buffer = [`${key}="`];
  if (key === "style" && typeof v === "object") {
    let styleStr = "";
    (0, import_utils.styleObjectForEach)(v, (property, value) => {
      if (value != null) {
        styleStr += `${styleStr ? ";" : ""}${property}:${value}`;
      }
    });
    (0, import_html2.escapeToBuffer)(styleStr, buffer);
    buffer[0] += '"';
  } else if (typeof v === "string") {
    (0, import_html2.escapeToBuffer)(v, buffer);
    buffer[0] += '"';
  } else if (v === null || v === void 0) {
    return (0, import_html.raw)("");
  } else if (typeof v === "number" || v.isEscaped) {
    buffer[0] += `${v}"`;
  } else if (v instanceof Promise) {
    buffer.unshift('"', v);
  } else {
    (0, import_html2.escapeToBuffer)(v.toString(), buffer);
    buffer[0] += '"';
  }
  return buffer.length === 1 ? (0, import_html.raw)(buffer[0]) : (0, import_html2.stringBufferToString)(buffer, void 0);
};
const jsxEscape = (value) => value;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  Fragment,
  jsx,
  jsxAttr,
  jsxEscape,
  jsxTemplate,
  jsxs
});

"use strict";
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
var protocolFormatter_exports = {};
__export(protocolFormatter_exports, {
  formatProtocolParam: () => formatProtocolParam,
  getActionGroup: () => getActionGroup,
  renderTitleForCall: () => renderTitleForCall
});
module.exports = __toCommonJS(protocolFormatter_exports);
var import_protocolMetainfo = require("./protocolMetainfo");
function formatProtocolParam(params, alternatives) {
  return _formatProtocolParam(params, alternatives)?.replaceAll("\n", "\\n");
}
function _formatProtocolParam(params, alternatives) {
  if (!params)
    return void 0;
  for (const name of alternatives.split("|")) {
    if (name === "url") {
      try {
        const urlObject = new URL(params[name]);
        if (urlObject.protocol === "data:")
          return urlObject.protocol;
        if (urlObject.protocol === "about:")
          return params[name];
        return urlObject.pathname + urlObject.search;
      } catch (error) {
        if (params[name] !== void 0)
          return params[name];
      }
    }
    if (name === "timeNumber" && params[name] !== void 0) {
      return new Date(params[name]).toString();
    }
    const value = deepParam(params, name);
    if (value !== void 0)
      return value;
  }
}
function deepParam(params, name) {
  const tokens = name.split(".");
  let current = params;
  for (const token of tokens) {
    if (typeof current !== "object" || current === null)
      return void 0;
    current = current[token];
  }
  if (current === void 0)
    return void 0;
  return String(current);
}
function renderTitleForCall(metadata) {
  const titleFormat = metadata.title ?? import_protocolMetainfo.methodMetainfo.get(metadata.type + "." + metadata.method)?.title ?? metadata.method;
  return titleFormat.replace(/\{([^}]+)\}/g, (fullMatch, p1) => {
    return formatProtocolParam(metadata.params, p1) ?? fullMatch;
  });
}
function getActionGroup(metadata) {
  return import_protocolMetainfo.methodMetainfo.get(metadata.type + "." + metadata.method)?.group;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  formatProtocolParam,
  getActionGroup,
  renderTitleForCall
});

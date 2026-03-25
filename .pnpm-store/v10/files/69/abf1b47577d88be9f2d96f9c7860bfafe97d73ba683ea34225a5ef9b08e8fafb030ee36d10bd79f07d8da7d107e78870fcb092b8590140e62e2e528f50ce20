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
var locatorUtils_exports = {};
__export(locatorUtils_exports, {
  getByAltTextSelector: () => getByAltTextSelector,
  getByLabelSelector: () => getByLabelSelector,
  getByPlaceholderSelector: () => getByPlaceholderSelector,
  getByRoleSelector: () => getByRoleSelector,
  getByTestIdSelector: () => getByTestIdSelector,
  getByTextSelector: () => getByTextSelector,
  getByTitleSelector: () => getByTitleSelector
});
module.exports = __toCommonJS(locatorUtils_exports);
var import_stringUtils = require("./stringUtils");
function getByAttributeTextSelector(attrName, text, options) {
  return `internal:attr=[${attrName}=${(0, import_stringUtils.escapeForAttributeSelector)(text, options?.exact || false)}]`;
}
function getByTestIdSelector(testIdAttributeName, testId) {
  return `internal:testid=[${testIdAttributeName}=${(0, import_stringUtils.escapeForAttributeSelector)(testId, true)}]`;
}
function getByLabelSelector(text, options) {
  return "internal:label=" + (0, import_stringUtils.escapeForTextSelector)(text, !!options?.exact);
}
function getByAltTextSelector(text, options) {
  return getByAttributeTextSelector("alt", text, options);
}
function getByTitleSelector(text, options) {
  return getByAttributeTextSelector("title", text, options);
}
function getByPlaceholderSelector(text, options) {
  return getByAttributeTextSelector("placeholder", text, options);
}
function getByTextSelector(text, options) {
  return "internal:text=" + (0, import_stringUtils.escapeForTextSelector)(text, !!options?.exact);
}
function getByRoleSelector(role, options = {}) {
  const props = [];
  if (options.checked !== void 0)
    props.push(["checked", String(options.checked)]);
  if (options.disabled !== void 0)
    props.push(["disabled", String(options.disabled)]);
  if (options.selected !== void 0)
    props.push(["selected", String(options.selected)]);
  if (options.expanded !== void 0)
    props.push(["expanded", String(options.expanded)]);
  if (options.includeHidden !== void 0)
    props.push(["include-hidden", String(options.includeHidden)]);
  if (options.level !== void 0)
    props.push(["level", String(options.level)]);
  if (options.name !== void 0)
    props.push(["name", (0, import_stringUtils.escapeForAttributeSelector)(options.name, !!options.exact)]);
  if (options.pressed !== void 0)
    props.push(["pressed", String(options.pressed)]);
  return `internal:role=${role}${props.map(([n, v]) => `[${n}=${v}]`).join("")}`;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getByAltTextSelector,
  getByLabelSelector,
  getByPlaceholderSelector,
  getByRoleSelector,
  getByTestIdSelector,
  getByTextSelector,
  getByTitleSelector
});

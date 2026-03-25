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
var credentialClassBody_identifiers_exports = {};
__export(credentialClassBody_identifiers_exports, {
  isDisplayName: () => isDisplayName,
  isDocumentationUrl: () => isDocumentationUrl,
  isFieldExtends: () => isFieldExtends,
  isName: () => isName,
  isPlaceholder: () => isPlaceholder
});
module.exports = __toCommonJS(credentialClassBody_identifiers_exports);
var import_utils = require("@typescript-eslint/utils");
function isStringField(fieldName, property) {
  return "key" in property && "type" in property.key && // property.type === AST_NODE_TYPES.PropertyDefinition &&
  // property.computed === false &&
  property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.key.name === fieldName && property.value !== null && property.value.type === import_utils.AST_NODE_TYPES.Literal && typeof property.value.value === "string";
}
function isName(property) {
  return isStringField("name", property);
}
function isDisplayName(property) {
  return isStringField("displayName", property);
}
function isDocumentationUrl(property) {
  return isStringField("documentationUrl", property);
}
function isPlaceholder(property) {
  return isStringField("placeholder", property);
}
function isArrayField(fieldName, property) {
  return "key" in property && "type" in property.key && // property.type === AST_NODE_TYPES.PropertyDefinition &&
  // property.computed === false &&
  property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.key.name === fieldName && property.value !== null && property.value.type === import_utils.AST_NODE_TYPES.ArrayExpression;
}
function isFieldExtends(property) {
  return isArrayField("extends", property);
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  isDisplayName,
  isDocumentationUrl,
  isFieldExtends,
  isName,
  isPlaceholder
});

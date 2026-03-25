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
var credentialClassBody_getters_exports = {};
__export(credentialClassBody_getters_exports, {
  getDisplayName: () => getDisplayName,
  getDocumentationUrl: () => getDocumentationUrl,
  getExtendsValue: () => getExtendsValue,
  getName: () => getName,
  getPlaceholder: () => getPlaceholder
});
module.exports = __toCommonJS(credentialClassBody_getters_exports);
var import_identifiers = require("../identifiers");
var import_restoreValue = require("../utils/restoreValue");
function getStringClassField(identifier, nodeParam) {
  const found = nodeParam.body.find(identifier);
  if (!found)
    return null;
  return {
    ast: found,
    value: found.value.value
  };
}
function getName(classBody) {
  return getStringClassField(import_identifiers.id.credClassBody.isName, classBody);
}
function getDisplayName(classBody) {
  return getStringClassField(import_identifiers.id.credClassBody.isDisplayName, classBody);
}
function getDocumentationUrl(classBody) {
  return getStringClassField(import_identifiers.id.credClassBody.isDocumentationUrl, classBody);
}
function getPlaceholder(classBody) {
  return getStringClassField(import_identifiers.id.credClassBody.isPlaceholder, classBody);
}
function getExtendsValue(classBody, context) {
  const extendsNode = classBody.body.find(import_identifiers.id.credClassBody.isFieldExtends);
  if (!extendsNode)
    return null;
  const extendsSource = context.getSourceCode().getText(extendsNode.value);
  return (0, import_restoreValue.restoreValue)(extendsSource) ?? null;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  getDisplayName,
  getDocumentationUrl,
  getExtendsValue,
  getName,
  getPlaceholder
});

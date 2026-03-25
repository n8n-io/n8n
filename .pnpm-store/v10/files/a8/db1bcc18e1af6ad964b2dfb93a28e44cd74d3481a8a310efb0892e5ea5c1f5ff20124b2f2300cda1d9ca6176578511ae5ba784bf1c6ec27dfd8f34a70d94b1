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
var common_identifiers_exports = {};
__export(common_identifiers_exports, {
  hasValue: () => hasValue,
  isArgument: () => isArgument,
  isArrayExpression: () => isArrayExpression,
  isArrayPropertyNamed: () => isArrayPropertyNamed,
  isBooleanPropertyNamed: () => isBooleanPropertyNamed,
  isCredentialClass: () => isCredentialClass,
  isIdentifierPropertyNamed: () => isIdentifierPropertyNamed,
  isLiteral: () => isLiteral,
  isMemberExpression: () => isMemberExpression,
  isNumericPropertyNamed: () => isNumericPropertyNamed,
  isObjectPropertyNamed: () => isObjectPropertyNamed,
  isReturnValue: () => isReturnValue,
  isStringPropertyNamed: () => isStringPropertyNamed,
  isWeakDescription: () => isWeakDescription
});
module.exports = __toCommonJS(common_identifiers_exports);
var import_utils = require("@typescript-eslint/utils");
var import_constants = require("../../constants");
function isTargetProperty({
  keyName,
  valueType
}, property) {
  if (property.type !== import_utils.AST_NODE_TYPES.Property || property.computed !== false || property.key.type !== import_utils.AST_NODE_TYPES.Identifier || property.key.name !== keyName) {
    return false;
  }
  if (valueType === "object") {
    return property.value.type === import_utils.AST_NODE_TYPES.ObjectExpression;
  }
  if (valueType === "array") {
    return property.value.type === import_utils.AST_NODE_TYPES.ArrayExpression;
  }
  return property.value.type === import_utils.AST_NODE_TYPES.Literal && typeof property.value.value === valueType;
}
function isStringPropertyNamed(keyName, property) {
  return isTargetProperty({ keyName, valueType: "string" }, property);
}
function isNumericPropertyNamed(keyName, property) {
  return isTargetProperty({ keyName, valueType: "number" }, property);
}
function isBooleanPropertyNamed(keyName, property) {
  return isTargetProperty({ keyName, valueType: "boolean" }, property);
}
function isObjectPropertyNamed(keyName, property) {
  return isTargetProperty({ keyName, valueType: "object" }, property);
}
function isArrayPropertyNamed(keyName, property) {
  return isTargetProperty({ keyName, valueType: "array" }, property);
}
function isIdentifierPropertyNamed(keyName, property) {
  return property.type === import_utils.AST_NODE_TYPES.Property && property.computed === false && property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.key.name === keyName && property.value.type === import_utils.AST_NODE_TYPES.Identifier;
}
function isCredentialClass(node) {
  return node.implements?.length === 1 && node.implements[0].type === import_utils.AST_NODE_TYPES.TSClassImplements && node.implements[0].expression.type === import_utils.AST_NODE_TYPES.Identifier && node.implements[0].expression.name === "ICredentialType";
}
function hasValue(value, nodeParam) {
  for (const property of nodeParam.properties) {
    if (property.type === import_utils.AST_NODE_TYPES.Property && property.computed === false && property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.value.type === import_utils.AST_NODE_TYPES.Literal && property.value.value === value && typeof property.value.value === "string") {
      return true;
    }
  }
  return false;
}
function isReturnValue(node) {
  return node.parent?.type === import_utils.AST_NODE_TYPES.ReturnStatement;
}
function isArgument(node) {
  return node.parent?.type === import_utils.AST_NODE_TYPES.TSAsExpression || node.parent?.type === import_utils.AST_NODE_TYPES.CallExpression;
}
function isWeakDescription({ value }) {
  return import_constants.WEAK_DESCRIPTIONS.some(
    (wd) => value.toLowerCase().includes(wd.toLowerCase())
  );
}
const isLiteral = (property) => {
  return property.type === import_utils.AST_NODE_TYPES.Property && property.computed === false && property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.value.type === import_utils.AST_NODE_TYPES.Literal;
};
const isArrayExpression = (property) => {
  return property.type === import_utils.AST_NODE_TYPES.Property && property.computed === false && property.key.type === import_utils.AST_NODE_TYPES.Identifier && typeof property.key.name === "string" && property.value.type === import_utils.AST_NODE_TYPES.ArrayExpression;
};
const isMemberExpression = (property) => {
  return property.type === import_utils.AST_NODE_TYPES.Property && property.computed === false && property.key.type === import_utils.AST_NODE_TYPES.Identifier && typeof property.key.name === "string" && property.value.type === import_utils.AST_NODE_TYPES.MemberExpression;
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  hasValue,
  isArgument,
  isArrayExpression,
  isArrayPropertyNamed,
  isBooleanPropertyNamed,
  isCredentialClass,
  isIdentifierPropertyNamed,
  isLiteral,
  isMemberExpression,
  isNumericPropertyNamed,
  isObjectPropertyNamed,
  isReturnValue,
  isStringPropertyNamed,
  isWeakDescription
});

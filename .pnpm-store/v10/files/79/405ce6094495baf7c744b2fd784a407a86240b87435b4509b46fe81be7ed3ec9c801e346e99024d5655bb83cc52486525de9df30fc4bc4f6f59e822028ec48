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
var nodeParameter_identifiers_exports = {};
__export(nodeParameter_identifiers_exports, {
  hasName: () => hasName,
  isAction: () => isAction,
  isArrayDefault: () => isArrayDefault,
  isBooleanType: () => isBooleanType,
  isCollectionType: () => isCollectionType,
  isDescription: () => isDescription,
  isDisplayName: () => isDisplayName,
  isDisplayOptions: () => isDisplayOptions,
  isDisplayOptionsShow: () => isDisplayOptionsShow,
  isEmail: () => isEmail,
  isFixedCollectionType: () => isFixedCollectionType,
  isFixedCollectionValues: () => isFixedCollectionValues,
  isGetAllOptionProperty: () => isGetAllOptionProperty,
  isHint: () => isHint,
  isIgnoreSslIssues: () => isIgnoreSslIssues,
  isLimit: () => isLimit,
  isLoadOptions: () => isLoadOptions,
  isLoadOptionsMethod: () => isLoadOptionsMethod,
  isMaxValue: () => isMaxValue,
  isMinValue: () => isMinValue,
  isMultiOptionsType: () => isMultiOptionsType,
  isName: () => isName,
  isNoDataExpression: () => isNoDataExpression,
  isNumericType: () => isNumericType,
  isObjectDefault: () => isObjectDefault,
  isOperation: () => isOperation,
  isOptions: () => isOptions,
  isOptionsType: () => isOptionsType,
  isPlaceholder: () => isPlaceholder,
  isPrimitiveDefault: () => isPrimitiveDefault,
  isRequired: () => isRequired,
  isResource: () => isResource,
  isReturnAll: () => isReturnAll,
  isShowSetting: () => isShowSetting,
  isSimplify: () => isSimplify,
  isStringType: () => isStringType,
  isTemplateDescription: () => isTemplateDescription,
  isTemplateLiteralDefault: () => isTemplateLiteralDefault,
  isType: () => isType,
  isTypeOptions: () => isTypeOptions,
  isUnaryExpression: () => isUnaryExpression,
  isUpdateFields: () => isUpdateFields,
  isValue: () => isValue
});
module.exports = __toCommonJS(nodeParameter_identifiers_exports);
var import_utils = require("@typescript-eslint/utils");
var import_common = require("./common.identifiers");
function isParamOfType(type, nodeParam) {
  const found = nodeParam.properties.find((property) => {
    return property.type === import_utils.AST_NODE_TYPES.Property && property.computed === false && property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.key.name === "type" && property.value.type === import_utils.AST_NODE_TYPES.Literal && property.value.value === type;
  });
  return Boolean(found);
}
function isStringType(nodeParam) {
  return isParamOfType("string", nodeParam);
}
function isNumericType(nodeParam) {
  return isParamOfType("number", nodeParam);
}
function isBooleanType(nodeParam) {
  return isParamOfType("boolean", nodeParam);
}
function isOptionsType(nodeParam) {
  return isParamOfType("options", nodeParam);
}
function isMultiOptionsType(nodeParam) {
  return isParamOfType("multiOptions", nodeParam);
}
function isCollectionType(nodeParam) {
  return isParamOfType("collection", nodeParam);
}
function isFixedCollectionType(nodeParam) {
  return isParamOfType("fixedCollection", nodeParam);
}
function hasName(name, nodeParam) {
  let check = (value) => value === name;
  if (name === "update")
    check = (value) => /update/.test(value);
  for (const property of nodeParam.properties) {
    if (property.type === import_utils.AST_NODE_TYPES.Property && property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.key.name === "name" && property.value.type === import_utils.AST_NODE_TYPES.Literal && typeof property.value.value === "string" && check(property.value.value)) {
      return true;
    }
  }
  return false;
}
function isEmail(nodeParam) {
  return isStringType(nodeParam) && hasName("email", nodeParam);
}
function isSimplify(nodeParam) {
  return isBooleanType(nodeParam) && hasName("simple", nodeParam);
}
function isLimit(nodeParam) {
  return isNumericType(nodeParam) && hasName("limit", nodeParam);
}
function isReturnAll(nodeParam) {
  return isBooleanType(nodeParam) && hasName("returnAll", nodeParam);
}
function isIgnoreSslIssues(nodeParam) {
  return isBooleanType(nodeParam) && hasName("allowUnauthorizedCerts", nodeParam);
}
function isUpdateFields(nodeParam) {
  return isCollectionType(nodeParam) && hasName("update", nodeParam);
}
function isResource(nodeParam) {
  return isOptionsType(nodeParam) && hasName("resource", nodeParam);
}
function isOperation(nodeParam) {
  return isOptionsType(nodeParam) && hasName("operation", nodeParam);
}
function isAction(nodeParam) {
  return isOptionsType(nodeParam) && hasName("action", nodeParam);
}
function isRequired(property) {
  return (0, import_common.isBooleanPropertyNamed)("required", property);
}
function isNoDataExpression(property) {
  return (0, import_common.isBooleanPropertyNamed)("noDataExpression", property);
}
function isDisplayName(property) {
  return (0, import_common.isStringPropertyNamed)("displayName", property);
}
function isPlaceholder(property) {
  return (0, import_common.isStringPropertyNamed)("placeholder", property);
}
function isType(property) {
  return (0, import_common.isStringPropertyNamed)("type", property);
}
function isName(property) {
  return (0, import_common.isStringPropertyNamed)("name", property);
}
function isHint(property) {
  return (0, import_common.isStringPropertyNamed)("hint", property);
}
function isValue(property) {
  return (0, import_common.isStringPropertyNamed)("value", property);
}
function isDisplayOptions(property) {
  return (0, import_common.isObjectPropertyNamed)("displayOptions", property);
}
const isUnaryExpression = (property) => {
  return property.type === import_utils.AST_NODE_TYPES.Property && property.computed === false && property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.value.type === import_utils.AST_NODE_TYPES.UnaryExpression;
};
function isPrimitiveDefault(property) {
  return property.type === import_utils.AST_NODE_TYPES.Property && property.computed === false && property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.key.name === "default" && property.value.type === import_utils.AST_NODE_TYPES.Literal;
}
function isTemplateLiteralDefault(property) {
  return property.type === import_utils.AST_NODE_TYPES.Property && property.computed === false && property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.key.name === "default" && property.value.type === import_utils.AST_NODE_TYPES.TemplateLiteral && property.value.quasis.length > 0;
}
function isObjectDefault(property) {
  return (0, import_common.isObjectPropertyNamed)("default", property);
}
function isArrayDefault(property) {
  return (0, import_common.isArrayPropertyNamed)("default", property);
}
function isOptions(property) {
  return property.type === import_utils.AST_NODE_TYPES.Property && property.computed === false && property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.key.name === "options";
}
function isTypeOptions(property) {
  return (0, import_common.isObjectPropertyNamed)("typeOptions", property);
}
function isTypeOptionsValue(property, keyName, valueType) {
  return property.type === import_utils.AST_NODE_TYPES.Property && property.computed === false && property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.value.type === import_utils.AST_NODE_TYPES.Literal && property.key.name === keyName && typeof property.value.value === valueType;
}
const isMinValue = (property) => isTypeOptionsValue(property, "minValue", "number");
const isMaxValue = (property) => isTypeOptionsValue(property, "maxValue", "number");
function isLoadOptionsMethod(property) {
  return (0, import_common.isStringPropertyNamed)("loadOptionsMethod", property);
}
function isLoadOptions(property) {
  return (0, import_common.isObjectPropertyNamed)("loadOptions", property);
}
function isDescription(property) {
  return (0, import_common.isStringPropertyNamed)("description", property);
}
function isTemplateDescription(property) {
  return property.type === import_utils.AST_NODE_TYPES.Property && property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.key.name === "description" && property.value.type === import_utils.AST_NODE_TYPES.TemplateLiteral && property.value.quasis.length > 0;
}
function isFixedCollectionValues(property) {
  return (0, import_common.isArrayPropertyNamed)("values", property);
}
function isDisplayOptionsShow(property) {
  return (0, import_common.isObjectPropertyNamed)("show", property);
}
function isShowSetting(showSettingKey, property) {
  return (0, import_common.isArrayPropertyNamed)(showSettingKey, property);
}
function isGetAllOptionProperty(property) {
  return property.type === import_utils.AST_NODE_TYPES.Property && property.computed === false && property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.key.name === "value" && property.value.type === import_utils.AST_NODE_TYPES.Literal && typeof property.value.value === "string" && property.value.value === "getAll";
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  hasName,
  isAction,
  isArrayDefault,
  isBooleanType,
  isCollectionType,
  isDescription,
  isDisplayName,
  isDisplayOptions,
  isDisplayOptionsShow,
  isEmail,
  isFixedCollectionType,
  isFixedCollectionValues,
  isGetAllOptionProperty,
  isHint,
  isIgnoreSslIssues,
  isLimit,
  isLoadOptions,
  isLoadOptionsMethod,
  isMaxValue,
  isMinValue,
  isMultiOptionsType,
  isName,
  isNoDataExpression,
  isNumericType,
  isObjectDefault,
  isOperation,
  isOptions,
  isOptionsType,
  isPlaceholder,
  isPrimitiveDefault,
  isRequired,
  isResource,
  isReturnAll,
  isShowSetting,
  isSimplify,
  isStringType,
  isTemplateDescription,
  isTemplateLiteralDefault,
  isType,
  isTypeOptions,
  isUnaryExpression,
  isUpdateFields,
  isValue
});

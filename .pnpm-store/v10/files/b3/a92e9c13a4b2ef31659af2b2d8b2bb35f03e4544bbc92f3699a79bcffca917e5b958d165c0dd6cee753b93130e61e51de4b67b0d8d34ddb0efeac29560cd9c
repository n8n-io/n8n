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
var restorers_exports = {};
__export(restorers_exports, {
  restoreArray: () => restoreArray,
  restoreArrayOfObjects: () => restoreArrayOfObjects,
  restoreClassDescriptionOptions: () => restoreClassDescriptionOptions,
  restoreFixedCollectionValues: () => restoreFixedCollectionValues,
  restoreNodeParamCollectionOptions: () => restoreNodeParamCollectionOptions,
  restoreNodeParamOptions: () => restoreNodeParamOptions,
  restoreObject: () => restoreObject
});
module.exports = __toCommonJS(restorers_exports);
var import_utils = require("@typescript-eslint/utils");
var import_common = require("../identifiers/common.identifiers");
var import_nodeParameter = require("../identifiers/nodeParameter.identifiers");
function restoreArray(elements) {
  return elements.reduce((acc, element) => {
    if (element.type === import_utils.AST_NODE_TYPES.Literal && element.value) {
      acc.push(element.value.toString());
    }
    return acc;
  }, []);
}
function restoreArrayOfObjects(elements) {
  return elements.reduce((acc, element) => {
    if (element.type === import_utils.AST_NODE_TYPES.ObjectExpression) {
      acc.push(restoreObject(element));
    }
    return acc;
  }, []);
}
function restoreObject(objectExpression) {
  return objectExpression.properties.reduce(
    (acc, property) => {
      if ((0, import_common.isArrayExpression)(property)) {
        acc[property.key.name] = restoreArrayOfObjects(property.value.elements);
      } else if ((0, import_common.isLiteral)(property)) {
        acc[property.key.name] = property.value.value;
      } else if ((0, import_nodeParameter.isUnaryExpression)(property)) {
        acc[property.key.name] = parseInt(
          property.value.operator + property.value.argument.raw
          // e.g. -1
        );
      }
      return acc;
    },
    {}
  );
}
function restoreFixedCollectionValues(options) {
  const isNodeParameterAsValue = (entity) => entity.displayName !== void 0;
  const restoredValues = [];
  for (const option of options) {
    const restoredValue = restoreObject(option);
    if (!isNodeParameterAsValue(restoredValue))
      continue;
    restoredValues.push(restoredValue);
  }
  return restoredValues;
}
function restoreNodeParamOptions(options) {
  const isOption = (entity) => entity.name !== void 0 && entity.value !== void 0;
  const restoredOptions = [];
  for (const option of options) {
    const restoredOption = restoreObject(option);
    if (!isOption(restoredOption))
      continue;
    restoredOptions.push(restoredOption);
  }
  return restoredOptions;
}
function restoreNodeParamCollectionOptions(options) {
  const isNodeParameterAsValue = (entity) => entity.displayName !== void 0;
  const restoredOptions = [];
  for (const option of options) {
    const restoredOption = restoreObject(option);
    if (!isNodeParameterAsValue(restoredOption))
      continue;
    restoredOptions.push(restoredOption);
  }
  return restoredOptions;
}
function restoreClassDescriptionOptions(credOptions) {
  const isCredOption = (entity) => entity.name !== void 0;
  const restoredCredOptions = [];
  for (const credOption of credOptions) {
    const restoredCredOption = restoreObject(credOption);
    if (!isCredOption(restoredCredOption))
      continue;
    restoredCredOptions.push(restoredCredOption);
  }
  return restoredCredOptions;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  restoreArray,
  restoreArrayOfObjects,
  restoreClassDescriptionOptions,
  restoreFixedCollectionValues,
  restoreNodeParamCollectionOptions,
  restoreNodeParamOptions,
  restoreObject
});

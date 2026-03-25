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
var nodeExecuteBlock_identifiers_exports = {};
__export(nodeExecuteBlock_identifiers_exports, {
  hasValidPluralPairingArgument: () => hasValidPluralPairingArgument,
  hasValidSingularPairingArgument: () => hasValidSingularPairingArgument,
  isForLoop: () => isForLoop,
  isPluralPairingStatement: () => isPluralPairingStatement,
  isResourceChecksRoot: () => isResourceChecksRoot,
  isSingularPairingStatement: () => isSingularPairingStatement,
  isTryCatch: () => isTryCatch
});
module.exports = __toCommonJS(nodeExecuteBlock_identifiers_exports);
var import_utils = require("@typescript-eslint/utils");
var import_getters = require("../getters");
const isForLoop = (node) => node.type === import_utils.AST_NODE_TYPES.ForStatement;
const isTryCatch = (node) => node.type === import_utils.AST_NODE_TYPES.TryStatement;
const isResourceChecksRoot = (node) => node.type === import_utils.AST_NODE_TYPES.IfStatement && node.test.type === import_utils.AST_NODE_TYPES.BinaryExpression && node.test.operator === "===" && node.test.left.type === import_utils.AST_NODE_TYPES.Identifier && node.test.left.name === "resource";
function isPluralPairingStatement(lastStatement, returnDataArrayName) {
  return lastStatement.type === import_utils.AST_NODE_TYPES.ExpressionStatement && isReturnDataPush(lastStatement, returnDataArrayName) && hasSpreadArgument(lastStatement);
}
const hasSpreadArgument = (statement) => statement.expression.arguments.length === 1 && statement.expression.arguments[0].type === import_utils.AST_NODE_TYPES.SpreadElement;
function isSingularPairingStatement(lastStatement, returnDataArrayName) {
  return lastStatement.type === import_utils.AST_NODE_TYPES.ExpressionStatement && isReturnDataPush(lastStatement, returnDataArrayName) && hasSingleArgument(lastStatement);
}
const isReturnDataPush = (node, returnDataArrayName) => {
  return node.expression.type === import_utils.AST_NODE_TYPES.CallExpression && node.expression.callee.type === import_utils.AST_NODE_TYPES.MemberExpression && node.expression.callee.object.type === import_utils.AST_NODE_TYPES.Identifier && node.expression.callee.object.name === returnDataArrayName && node.expression.callee.property.type === import_utils.AST_NODE_TYPES.Identifier && node.expression.callee.property.name === "push";
};
const hasSingleArgument = (statement) => statement.expression.arguments.length === 1;
function hasValidSingularPairingArgument(lastStatement, inputItemsIndexName) {
  const [argument] = lastStatement.expression.arguments;
  if (argument.type !== import_utils.AST_NODE_TYPES.ObjectExpression)
    return false;
  const hasJsonKey = argument.properties.some(
    (property) => property.type === import_utils.AST_NODE_TYPES.Property && property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.key.name === "json"
  );
  if (!hasJsonKey)
    return false;
  const hasResponseDataValue = argument.properties.some(
    (property) => property.type === import_utils.AST_NODE_TYPES.Property && property.value.type === import_utils.AST_NODE_TYPES.Identifier && property.value.name === "responseData"
  );
  if (!hasResponseDataValue)
    return false;
  const hasPairedItemKey = argument.properties.some(
    (property) => property.type === import_utils.AST_NODE_TYPES.Property && property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.key.name === "pairedItem"
  );
  if (!hasPairedItemKey)
    return false;
  const pairedItemValue = import_getters.getters.nodeExecuteBlock.getPairedItemValue(
    argument.properties
  );
  if (!pairedItemValue)
    return false;
  const hasPairedItemValueContent = pairedItemValue.properties.find(
    (property) => {
      return property.type === import_utils.AST_NODE_TYPES.Property && property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.key.name === "item" && property.value.type === import_utils.AST_NODE_TYPES.Identifier && property.value.name === inputItemsIndexName;
    }
  );
  if (!hasPairedItemValueContent)
    return false;
  return true;
}
function hasValidPluralPairingArgument(lastStatement, inputItemsIndexName) {
  const [argument] = lastStatement.expression.arguments;
  if (argument.type !== import_utils.AST_NODE_TYPES.SpreadElement)
    return false;
  if (argument.argument.type !== import_utils.AST_NODE_TYPES.CallExpression)
    return false;
  const hasResponseDataMap = argument.argument.callee.type === import_utils.AST_NODE_TYPES.MemberExpression && argument.argument.callee.object.type === import_utils.AST_NODE_TYPES.Identifier && argument.argument.callee.object.name === "responseData" && argument.argument.callee.property.type === import_utils.AST_NODE_TYPES.Identifier && argument.argument.callee.property.name === "map";
  if (!hasResponseDataMap)
    return false;
  if (argument.argument.arguments.length !== 1)
    return false;
  const [arrowFunction] = argument.argument.arguments;
  const hasArrowFunctionWithJsonArg = arrowFunction.type === import_utils.AST_NODE_TYPES.ArrowFunctionExpression && arrowFunction.params.length === 1 && arrowFunction.params[0].type === import_utils.AST_NODE_TYPES.Identifier && arrowFunction.params[0].name === "json";
  if (!hasArrowFunctionWithJsonArg)
    return false;
  const returnsObject = arrowFunction.body.type === import_utils.AST_NODE_TYPES.BlockStatement && arrowFunction.body.body.length === 1 && arrowFunction.body.body[0].type === import_utils.AST_NODE_TYPES.ReturnStatement && arrowFunction.body.body[0].argument !== null && arrowFunction.body.body[0].argument.type === import_utils.AST_NODE_TYPES.ObjectExpression;
  if (!returnsObject)
    return false;
  const { properties } = arrowFunction.body.body[0].argument;
  const returnedObjectHasJson = properties.some(
    (property) => property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.key.name === "json" && property.value.type === import_utils.AST_NODE_TYPES.Identifier && property.value.name === "json"
  );
  if (!returnedObjectHasJson)
    return false;
  const returnedObjectHasPairedItem = properties.find(
    (property) => property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.key.name === "pairedItem" && property.value.type === import_utils.AST_NODE_TYPES.ObjectExpression && property.value.properties.length === 1
  );
  if (!returnedObjectHasPairedItem)
    return false;
  const pairedItemValue = import_getters.getters.nodeExecuteBlock.getPairedItemValue(properties);
  if (!pairedItemValue)
    return false;
  const hasPairedItemValueContent = pairedItemValue.properties.find(
    (property) => {
      return property.type === import_utils.AST_NODE_TYPES.Property && property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.key.name === "item" && property.value.type === import_utils.AST_NODE_TYPES.Identifier && property.value.name === inputItemsIndexName;
    }
  );
  if (!hasPairedItemValueContent)
    return false;
  return true;
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  hasValidPluralPairingArgument,
  hasValidSingularPairingArgument,
  isForLoop,
  isPluralPairingStatement,
  isResourceChecksRoot,
  isSingularPairingStatement,
  isTryCatch
});

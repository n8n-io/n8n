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
var node_execute_block_error_missing_item_index_exports = {};
__export(node_execute_block_error_missing_item_index_exports, {
  default: () => node_execute_block_error_missing_item_index_default
});
module.exports = __toCommonJS(node_execute_block_error_missing_item_index_exports);
var import_utils = require("../ast/utils");
var import_getters = require("../ast/getters");
var import_utils2 = require("@typescript-eslint/utils");
var import_constants = require("../constants");
const {
  nodeExecuteBlock: { getOperationConsequents, collectConsequents }
} = import_getters.getters;
var node_execute_block_error_missing_item_index_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "In the operations in the `execute()` method in a node, `NodeApiError` and `NodeOperationError` must specify `itemIndex` as the third argument.",
      recommended: "strict"
    },
    schema: [],
    messages: {
      addItemIndexSameName: "Add `{ itemIndex }` as third argument [non-autofixable]",
      addItemIndexDifferentName: "Add `{ itemIndex: {{ indexName }} }` as third argument [non-autofixable]",
      changeThirdArgSameName: "Change third argument to `{ itemIndex }` [non-autofixable]",
      changeThirdArgDifferentName: "Change third argument to `{ itemIndex: {{ indexName }} }` [non-autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      MethodDefinition(node) {
        if (!import_utils.utils.isNodeFile(context.getFilename()))
          return;
        const result = getOperationConsequents(node, { filter: "all" });
        if (!result)
          return;
        const {
          operationConsequents: opConsequents,
          inputItemsIndexName: indexName
        } = result;
        const throwStatements = findThrowStatements(opConsequents);
        for (const statement of throwStatements) {
          if (statement.argument === null || // @ts-ignore @TODO: This does not typecheck but AST check is correct
          statement.argument.type !== import_utils2.AST_NODE_TYPES.NewExpression) {
            continue;
          }
          if (!isNodeErrorType(statement.argument))
            continue;
          const { arguments: errorArguments } = statement.argument;
          if (errorArguments.length !== 3 && indexName === "itemIndex") {
            context.report({
              messageId: "addItemIndexSameName",
              node: statement
            });
            continue;
          }
          if (errorArguments.length !== 3 && indexName !== "itemIndex") {
            context.report({
              messageId: "addItemIndexDifferentName",
              node: statement,
              data: { indexName }
            });
            continue;
          }
          const [thirdArg] = [...errorArguments].reverse();
          if (!isItemIndexArg(thirdArg) && indexName === "itemIndex") {
            context.report({
              messageId: "changeThirdArgSameName",
              node: statement
            });
            continue;
          }
          if (!isItemIndexArg(thirdArg) && indexName !== "itemIndex") {
            context.report({
              messageId: "changeThirdArgDifferentName",
              node: statement,
              data: { indexName }
            });
            continue;
          }
        }
      }
    };
  }
});
function findIfStatements(consequent) {
  return consequent.body.filter(
    (statement) => statement.type === import_utils2.AST_NODE_TYPES.IfStatement
  );
}
const isThrowStatement = (node) => node.type === import_utils2.AST_NODE_TYPES.ThrowStatement;
function findThrowStatements(operationConsequents) {
  return operationConsequents.reduce(
    (acc, operationConsequent) => {
      const topLevelThrows = operationConsequent.body.filter(isThrowStatement);
      const throwStatements = [...topLevelThrows];
      const nestedIfs = findIfStatements(operationConsequent);
      const nestedConsequents = nestedIfs.flatMap((s) => collectConsequents(s));
      const nestedThrows = nestedConsequents.flatMap(
        (c) => c.body.filter(isThrowStatement)
      );
      throwStatements.push(...nestedThrows);
      return [...acc, ...throwStatements];
    },
    []
  );
}
function isNodeErrorType(newExpressionArg) {
  return newExpressionArg.callee.type === import_utils2.AST_NODE_TYPES.Identifier && import_constants.N8N_NODE_ERROR_TYPES.includes(newExpressionArg.callee.name);
}
function isItemIndexArg(node) {
  return node.type === import_utils2.AST_NODE_TYPES.ObjectExpression && node.properties.length === 1 && node.properties[0].type === import_utils2.AST_NODE_TYPES.Property && node.properties[0].key.type === import_utils2.AST_NODE_TYPES.Identifier && node.properties[0].key.name === "itemIndex";
}

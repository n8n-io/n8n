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
var node_execute_block_wrong_error_thrown_exports = {};
__export(node_execute_block_wrong_error_thrown_exports, {
  default: () => node_execute_block_wrong_error_thrown_default
});
module.exports = __toCommonJS(node_execute_block_wrong_error_thrown_exports);
var import_utils = require("@typescript-eslint/utils");
var import_utils2 = require("../ast/utils");
var import_constants = require("../constants");
var node_execute_block_wrong_error_thrown_default = import_utils2.utils.createRule({
  name: import_utils2.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "The `execute()` method in a node may only throw `ApplicationError`, NodeApiError`, `NodeOperationError`, or `TriggerCloseError`.",
      recommended: "strict"
    },
    schema: [],
    messages: {
      useProperError: "Use `ApplicationError`, NodeApiError`, `NodeOperationError`, or `TriggerCloseError` [non-autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      "ThrowStatement > NewExpression"(node) {
        if (!import_utils2.utils.isNodeFile(context.getFilename()))
          return;
        if (node.callee.type !== import_utils.AST_NODE_TYPES.Identifier)
          return;
        const { name: errorType } = node.callee;
        if (!import_constants.N8N_NODE_ERROR_TYPES.includes(errorType)) {
          context.report({
            messageId: "useProperError",
            node
          });
        }
      }
    };
  }
});

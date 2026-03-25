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
var node_execute_block_missing_continue_on_fail_exports = {};
__export(node_execute_block_missing_continue_on_fail_exports, {
  default: () => node_execute_block_missing_continue_on_fail_default
});
module.exports = __toCommonJS(node_execute_block_missing_continue_on_fail_exports);
var import_utils = require("@typescript-eslint/utils");
var import_utils2 = require("../ast/utils");
var node_execute_block_missing_continue_on_fail_default = import_utils2.utils.createRule({
  name: import_utils2.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "The `execute()` method in a node must implement `continueOnFail` in a try-catch block.",
      recommended: "strict"
    },
    schema: [],
    messages: {
      addContinueOnFail: "Implement 'continueOnFail' [non-autofixable]"
      // unknowable implementation
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      MethodDefinition(node) {
        if (!import_utils2.utils.isNodeFile(context.getFilename()))
          return;
        const executeForLoop = getExecuteForLoop(node);
        if (!executeForLoop)
          return;
        const hasContinueOnFail = executeForLoop.body.some((e) => {
          const tryCatch = getTryCatch(e);
          if (!tryCatch)
            return;
          return tryCatch.body.some(isContinueOnFail);
        });
        if (!hasContinueOnFail) {
          context.report({
            messageId: "addContinueOnFail",
            node
          });
        }
      }
    };
  }
});
function getExecuteForLoop(node) {
  if (node.key.type === import_utils.AST_NODE_TYPES.Identifier && node.key.name === "execute" && node.value.type === import_utils.AST_NODE_TYPES.FunctionExpression && node.value.body.type === import_utils.AST_NODE_TYPES.BlockStatement && node.value.body.body.length === 1 && node.value.body.body[0].type === import_utils.AST_NODE_TYPES.ForStatement && node.value.body.body[0].body.type === import_utils.AST_NODE_TYPES.BlockStatement) {
    return node.value.body.body[0].body;
  }
  return null;
}
function getTryCatch(node) {
  if (node.type === import_utils.AST_NODE_TYPES.TryStatement && node.handler !== null && node.handler.body.type === import_utils.AST_NODE_TYPES.BlockStatement) {
    return node.handler.body;
  }
  return null;
}
function isContinueOnFail(node) {
  return node.type === import_utils.AST_NODE_TYPES.IfStatement && node.test.type === import_utils.AST_NODE_TYPES.CallExpression && node.test.callee.type === import_utils.AST_NODE_TYPES.MemberExpression && node.test.callee.object.type === import_utils.AST_NODE_TYPES.ThisExpression && node.test.callee.property.type === import_utils.AST_NODE_TYPES.Identifier && node.test.callee.property.name === "continueOnFail";
}

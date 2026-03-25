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
var node_execute_block_double_assertion_for_items_exports = {};
__export(node_execute_block_double_assertion_for_items_exports, {
  default: () => node_execute_block_double_assertion_for_items_default
});
module.exports = __toCommonJS(node_execute_block_double_assertion_for_items_exports);
var import_utils = require("@typescript-eslint/utils");
var import_utils2 = require("../ast/utils");
var import_getters = require("../ast/getters");
var node_execute_block_double_assertion_for_items_default = import_utils2.utils.createRule({
  name: import_utils2.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "In the `execute()` method there is no need to double assert the type of `items.length`.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      removeDoubleAssertion: "Remove double assertion [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      MethodDefinition(node) {
        if (!import_utils2.utils.isNodeFile(context.getFilename()))
          return;
        const executeContent = import_getters.getters.nodeExecuteBlock.getExecuteContent(node);
        if (!executeContent)
          return;
        const init = getDoublyAssertedDeclarationInit(executeContent);
        if (init) {
          context.report({
            messageId: "removeDoubleAssertion",
            node: init,
            fix: (fixer) => fixer.replaceText(init, "items.length")
          });
        }
      }
    };
  }
});
function getDoublyAssertedDeclarationInit(executeMethod) {
  for (const node of executeMethod.body) {
    if (node.type === import_utils.AST_NODE_TYPES.VariableDeclaration) {
      for (const declaration of node.declarations) {
        if (!declaration.init)
          continue;
        if (declaration.init.type === import_utils.AST_NODE_TYPES.TSAsExpression && declaration.init.typeAnnotation.type === import_utils.AST_NODE_TYPES.TSNumberKeyword && declaration.init.expression.type === import_utils.AST_NODE_TYPES.TSAsExpression && declaration.init.expression.typeAnnotation.type === import_utils.AST_NODE_TYPES.TSUnknownKeyword && declaration.init.expression.expression.type === import_utils.AST_NODE_TYPES.MemberExpression && declaration.init.expression.expression.object.type === import_utils.AST_NODE_TYPES.Identifier && declaration.init.expression.expression.object.name === "items" && declaration.init.expression.expression.property.type === import_utils.AST_NODE_TYPES.Identifier && declaration.init.expression.expression.property.name === "length") {
          return declaration.init;
        }
      }
    }
  }
  return null;
}

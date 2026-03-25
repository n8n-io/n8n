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
var node_param_array_type_assertion_exports = {};
__export(node_param_array_type_assertion_exports, {
  default: () => node_param_array_type_assertion_default
});
module.exports = __toCommonJS(node_param_array_type_assertion_exports);
var import_utils = require("@typescript-eslint/utils");
var import_utils2 = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var node_param_array_type_assertion_default = import_utils2.utils.createRule({
  name: import_utils2.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "Array of node parameters must be typed, not type-asserted.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      typeArray: "Use ': INodeProperties[]' [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      TSAsExpression(node) {
        if (containsArrayOfNodeParams(node)) {
          if (node.parent?.type !== import_utils.AST_NODE_TYPES.VariableDeclarator || node.parent?.id.type !== import_utils.AST_NODE_TYPES.Identifier) {
            return;
          }
          const rangeToRemove = import_utils2.utils.getRangeToRemove({
            ast: node.typeAnnotation
          });
          const { range } = node.parent.id;
          if (!range)
            return null;
          const indentation = getTrailingBracketIndentation(node);
          context.report({
            messageId: "typeArray",
            node,
            fix: (fixer) => {
              return [
                fixer.replaceTextRange(rangeToRemove, indentation),
                fixer.insertTextAfterRange(range, ": INodeProperties[]")
              ];
            }
          });
        }
      }
    };
  }
});
function containsArrayOfNodeParams(node) {
  if (node.expression.type !== import_utils.AST_NODE_TYPES.ArrayExpression || node.expression.elements.length === 0) {
    return false;
  }
  return node.expression.elements.every((element) => {
    return element?.type === import_utils.AST_NODE_TYPES.ObjectExpression && import_identifiers.id.isNodeParameter(element);
  });
}
function getTrailingBracketIndentation(node) {
  return "	".repeat(node.expression.loc.end.column - 1);
}

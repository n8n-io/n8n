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
var cred_class_field_properties_assertion_exports = {};
__export(cred_class_field_properties_assertion_exports, {
  default: () => cred_class_field_properties_assertion_default
});
module.exports = __toCommonJS(cred_class_field_properties_assertion_exports);
var import_utils = require("@typescript-eslint/utils");
var import_utils2 = require("../ast/utils");
var cred_class_field_properties_assertion_default = import_utils2.utils.createRule({
  name: import_utils2.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "In a credential class, the field `properties` must be typed `INodeProperties` and individual properties must have no assertions.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      removeAssertionAndType: "Remove assertion and type field 'properties' with 'INodeProperties[]' [autofixable]",
      removeAssertion: "Remove assertion [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      TSAsExpression(node) {
        if (!import_utils2.utils.isCredentialFile(context.getFilename()))
          return;
        const assertionNodes = getAssertionNodes(node);
        if (assertionNodes) {
          const { insertionNode, removalNode, typingExists } = assertionNodes;
          const rangeToRemove = import_utils2.utils.getRangeOfAssertion(removalNode);
          if (typingExists) {
            return context.report({
              messageId: "removeAssertion",
              node,
              fix: (fixer) => fixer.removeRange(rangeToRemove)
            });
          }
          context.report({
            messageId: "removeAssertionAndType",
            node,
            fix: (fixer) => {
              return [
                fixer.removeRange(rangeToRemove),
                fixer.insertTextAfterRange(
                  insertionNode.range,
                  ": INodeProperties[]"
                )
              ];
            }
          });
        }
      }
    };
  }
});
function getAssertionNodes(node) {
  if (node.typeAnnotation.type === import_utils.AST_NODE_TYPES.TSTypeReference && node.typeAnnotation.typeName.type === import_utils.AST_NODE_TYPES.Identifier && node.typeAnnotation.typeName.name === "NodePropertyTypes" && node.parent?.type === import_utils.AST_NODE_TYPES.Property && node.parent.key.type === import_utils.AST_NODE_TYPES.Identifier && node.parent.key.name === "type") {
    const insertionNode = node.parent?.parent?.parent?.parent;
    if (!insertionNode)
      return null;
    if ("key" in insertionNode && "type" in insertionNode.key && // insertionNode.type === AST_NODE_TYPES.PropertyDefinition &&
    // insertionNode.computed === false &&
    insertionNode.key.type === import_utils.AST_NODE_TYPES.Identifier && insertionNode.key.name === "properties") {
      return {
        removalNode: node.typeAnnotation.typeName,
        insertionNode: insertionNode.key,
        typingExists: isAlreadyTyped(insertionNode)
      };
    }
  }
  return null;
}
function isAlreadyTyped(node) {
  if (!node.typeAnnotation)
    return false;
  return node.typeAnnotation.type === import_utils.AST_NODE_TYPES.TSTypeAnnotation && node.typeAnnotation.typeAnnotation.type === import_utils.AST_NODE_TYPES.TSArrayType && node.typeAnnotation.typeAnnotation.elementType.type === import_utils.AST_NODE_TYPES.TSTypeReference && node.typeAnnotation.typeAnnotation.elementType.typeName.type === import_utils.AST_NODE_TYPES.Identifier && node.typeAnnotation.typeAnnotation.elementType.typeName.name === "INodeProperties";
}

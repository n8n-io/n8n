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
var node_param_collection_type_item_required_exports = {};
__export(node_param_collection_type_item_required_exports, {
  default: () => node_param_collection_type_item_required_default
});
module.exports = __toCommonJS(node_param_collection_type_item_required_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var import_utils2 = require("@typescript-eslint/utils");
var node_param_collection_type_item_required_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: `Items in collection-type node parameter must not have a \`required\` property.`,
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      removeRequired: "Remove `required: true` [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeParameter(node))
          return;
        if (!import_identifiers.id.nodeParam.isCollectionType(node))
          return;
        const options = import_getters.getters.nodeParam.getCollectionOptions(node);
        if (!options)
          return;
        if (options.value.every((param) => param.required === void 0)) {
          return;
        }
        if (options.ast.value.type !== import_utils2.AST_NODE_TYPES.ArrayExpression)
          return;
        const [objectExpression] = options.ast.value.elements;
        const requiredTrueProperties = objectExpression.properties.filter(
          (property) => {
            return property.type === import_utils2.AST_NODE_TYPES.Property && property.key.type === import_utils2.AST_NODE_TYPES.Identifier && property.key.name === "required" && property.value.type === import_utils2.AST_NODE_TYPES.Literal && property.value.value === true;
          }
        );
        for (const property of requiredTrueProperties) {
          const rangeToRemove = import_utils.utils.getRangeToRemove({ ast: property });
          context.report({
            messageId: "removeRequired",
            node: property,
            fix: (fixer) => fixer.removeRange(rangeToRemove)
          });
        }
      }
    };
  }
});

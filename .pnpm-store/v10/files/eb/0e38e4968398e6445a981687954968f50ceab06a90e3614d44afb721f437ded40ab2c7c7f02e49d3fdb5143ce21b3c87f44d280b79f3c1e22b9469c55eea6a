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
var node_class_description_non_core_color_present_exports = {};
__export(node_class_description_non_core_color_present_exports, {
  default: () => node_class_description_non_core_color_present_default
});
module.exports = __toCommonJS(node_class_description_non_core_color_present_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var import_utils2 = require("@typescript-eslint/utils");
var node_class_description_non_core_color_present_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`color` in node class description is deprecated and must not be present, except for nodes whose icon is a Font Awesome icon - usually core nodes.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      removeColor: "Remove `color` property [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeClassDescription(node))
          return;
        const icon = import_getters.getters.nodeClassDescription.getIcon(node);
        if (icon?.value.startsWith("fa:"))
          return;
        const defaults = import_getters.getters.nodeClassDescription.getDefaults(node);
        if (!defaults)
          return;
        if (defaults.ast.type === import_utils2.AST_NODE_TYPES.Property && defaults.ast.value.type === import_utils2.AST_NODE_TYPES.ObjectExpression) {
          const colorProperty = defaults.ast.value.properties.find(
            (property) => {
              return property.type === import_utils2.AST_NODE_TYPES.Property && property.key.type === import_utils2.AST_NODE_TYPES.Identifier && property.key.name === "color";
            }
          );
          if (!colorProperty)
            return;
          const rangeToRemove = import_utils.utils.getRangeToRemove({ ast: colorProperty });
          context.report({
            messageId: "removeColor",
            node: colorProperty,
            fix: (fixer) => fixer.removeRange(rangeToRemove)
          });
        }
      }
    };
  }
});

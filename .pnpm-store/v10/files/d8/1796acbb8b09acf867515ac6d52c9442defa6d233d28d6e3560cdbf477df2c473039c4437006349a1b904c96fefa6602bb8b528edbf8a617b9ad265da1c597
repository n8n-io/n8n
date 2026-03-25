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
var node_param_operation_option_description_wrong_for_get_many_exports = {};
__export(node_param_operation_option_description_wrong_for_get_many_exports, {
  default: () => node_param_operation_option_description_wrong_for_get_many_default
});
module.exports = __toCommonJS(node_param_operation_option_description_wrong_for_get_many_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var import_utils2 = require("@typescript-eslint/utils");
var node_param_operation_option_description_wrong_for_get_many_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "The property `description` in a Get Many option in an Operation node parameter must mention `many` instead of `all`.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      changeToGetMany: "Change to '{{ newDescription }}' [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.nodeParam.isOperation(node))
          return;
        const options = import_getters.getters.nodeParam.getOptions(node);
        if (!options)
          return;
        if (options.hasPropertyPointingToIdentifier)
          return;
        if (!Array.isArray(options.ast.value.elements))
          return;
        const getAllOption = options.ast.value.elements.find(
          import_getters.getters.nodeParam.getGetAllOption
        );
        if (!getAllOption)
          return;
        const descriptionNode = getAllOption.properties.find(isOptionDescription);
        if (!descriptionNode)
          return;
        const { value: description } = descriptionNode.value;
        if (description.includes(" all ")) {
          const [start, end] = description.split(" all ");
          const newDescription = [start, "many", end].join(" ");
          const fixed = import_utils.utils.keyValue("description", newDescription);
          context.report({
            messageId: "changeToGetMany",
            node: descriptionNode,
            fix: (fixer) => fixer.replaceText(descriptionNode, fixed),
            data: { newDescription }
          });
        }
      }
    };
  }
});
function isOptionDescription(property) {
  return property.type === import_utils2.AST_NODE_TYPES.Property && property.computed === false && property.key.type === import_utils2.AST_NODE_TYPES.Identifier && property.key.name === "description" && property.value.type === import_utils2.AST_NODE_TYPES.Literal && typeof property.value.value === "string";
}

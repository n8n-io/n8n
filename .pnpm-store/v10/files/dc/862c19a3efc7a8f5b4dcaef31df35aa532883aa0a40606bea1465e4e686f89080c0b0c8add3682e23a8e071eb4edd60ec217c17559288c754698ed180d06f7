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
var node_param_operation_option_action_wrong_for_get_many_exports = {};
__export(node_param_operation_option_action_wrong_for_get_many_exports, {
  default: () => node_param_operation_option_action_wrong_for_get_many_default
});
module.exports = __toCommonJS(node_param_operation_option_action_wrong_for_get_many_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var import_utils2 = require("@typescript-eslint/utils");
var node_param_operation_option_action_wrong_for_get_many_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "The property `action` in a Get Many option in an Operation node parameter must start with `Get many`.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      changeToGetMany: "Change to 'Get many {{ resourceName }}' [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.nodeParam.isOperation(node) && !import_identifiers.id.nodeParam.isAction(node)) {
          return;
        }
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
        const actionNode = getAllOption.properties.find(isActionProperty);
        if (!actionNode)
          return;
        const { value: action } = actionNode.value;
        const DEPRECATED_START_OF_ACTION = "Get all ";
        if (action.startsWith(DEPRECATED_START_OF_ACTION)) {
          const [_, resourceName] = action.split(DEPRECATED_START_OF_ACTION);
          const fixed = import_utils.utils.keyValue(
            "action",
            action.replace(DEPRECATED_START_OF_ACTION, "Get many ")
          );
          context.report({
            messageId: "changeToGetMany",
            node: actionNode,
            fix: (fixer) => fixer.replaceText(actionNode, fixed),
            data: { resourceName }
          });
        }
      }
    };
  }
});
function isActionProperty(property) {
  return property.type === import_utils2.AST_NODE_TYPES.Property && property.computed === false && property.key.type === import_utils2.AST_NODE_TYPES.Identifier && property.key.name === "action" && property.value.type === import_utils2.AST_NODE_TYPES.Literal && typeof property.value.value === "string";
}

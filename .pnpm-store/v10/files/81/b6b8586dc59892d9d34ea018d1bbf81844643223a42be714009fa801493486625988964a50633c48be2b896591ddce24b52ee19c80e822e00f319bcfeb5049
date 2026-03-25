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
var node_param_display_name_wrong_for_dynamic_options_exports = {};
__export(node_param_display_name_wrong_for_dynamic_options_exports, {
  default: () => node_param_display_name_wrong_for_dynamic_options_default
});
module.exports = __toCommonJS(node_param_display_name_wrong_for_dynamic_options_exports);
var import_constants = require("../constants");
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_display_name_wrong_for_dynamic_options_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: `\`displayName\` for dynamic-options-type node parameter must end with \`${import_constants.DYNAMIC_OPTIONS_NODE_PARAMETER.DISPLAY_NAME_SUFFIX}\``,
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      endWithNameOrId: `End with '{Entity} ${import_constants.DYNAMIC_OPTIONS_NODE_PARAMETER.DISPLAY_NAME_SUFFIX}' [autofixable]`
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeParameter(node))
          return;
        if (!import_identifiers.id.nodeParam.isOptionsType(node))
          return;
        const loadOptionsMethod = import_getters.getters.nodeParam.getLoadOptionsMethod(node);
        if (!loadOptionsMethod)
          return;
        const displayName = import_getters.getters.nodeParam.getDisplayName(node);
        if (!displayName)
          return;
        if (!displayName.value.endsWith(
          import_constants.DYNAMIC_OPTIONS_NODE_PARAMETER.DISPLAY_NAME_SUFFIX
        )) {
          const withEndSegment = import_utils.utils.addEndSegment(displayName.value);
          const fixed = import_utils.utils.keyValue("displayName", withEndSegment);
          context.report({
            messageId: "endWithNameOrId",
            node: displayName.ast,
            fix: (fixer) => fixer.replaceText(displayName.ast, fixed)
          });
        }
      }
    };
  }
});

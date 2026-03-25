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
var node_param_display_name_wrong_for_dynamic_multi_options_exports = {};
__export(node_param_display_name_wrong_for_dynamic_multi_options_exports, {
  default: () => node_param_display_name_wrong_for_dynamic_multi_options_default
});
module.exports = __toCommonJS(node_param_display_name_wrong_for_dynamic_multi_options_exports);
var import_constants = require("../constants");
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var import_pluralize = require("pluralize");
var node_param_display_name_wrong_for_dynamic_multi_options_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: `\`displayName\` for dynamic-multi-options-type node parameter must end with \`${import_constants.DYNAMIC_MULTI_OPTIONS_NODE_PARAMETER.DISPLAY_NAME_SUFFIX}\``,
      recommended: "strict"
    },
    schema: [],
    fixable: "code",
    messages: {
      endWithNamesOrIds: `End with '{Entity} ${import_constants.DYNAMIC_MULTI_OPTIONS_NODE_PARAMETER.DISPLAY_NAME_SUFFIX}' [autofixable]`
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeParameter(node))
          return;
        if (!import_identifiers.id.nodeParam.isMultiOptionsType(node))
          return;
        const loadOptionsMethod = import_getters.getters.nodeParam.getLoadOptionsMethod(node);
        if (!loadOptionsMethod)
          return;
        const displayName = import_getters.getters.nodeParam.getDisplayName(node);
        if (!displayName)
          return;
        if (!displayName.value.endsWith(
          import_constants.DYNAMIC_MULTI_OPTIONS_NODE_PARAMETER.DISPLAY_NAME_SUFFIX
        )) {
          const { value: displayNameValue } = displayName;
          if (displayNameValue.endsWith("Name or ID")) {
            const [noun] = displayNameValue.split(" Name or ID");
            const entity = ensureSingular(noun);
            const fixed = import_utils.utils.keyValue(
              "displayName",
              `${entity} Names or IDs`
            );
            return context.report({
              messageId: "endWithNamesOrIds",
              node: displayName.ast,
              fix: (fixer) => fixer.replaceText(displayName.ast, fixed)
            });
          }
          const parts = displayNameValue.split(" ");
          if (parts.length > 2)
            return;
          if (parts.length === 1) {
            const entity = ensureSingular(displayNameValue);
            const fixed = import_utils.utils.keyValue(
              "displayName",
              `${entity} Names or IDs`
            );
            return context.report({
              messageId: "endWithNamesOrIds",
              node: displayName.ast,
              fix: (fixer) => fixer.replaceText(displayName.ast, fixed)
            });
          }
          if (parts.length === 2) {
            const [adjective, noun] = parts;
            const entity = ensureSingular(noun);
            const composite = [adjective, entity].join(" ");
            const fixed = import_utils.utils.keyValue(
              "displayName",
              `${composite} Names or IDs`
            );
            return context.report({
              messageId: "endWithNamesOrIds",
              node: displayName.ast,
              fix: (fixer) => fixer.replaceText(displayName.ast, fixed)
            });
          }
        }
      }
    };
  }
});
function ensureSingular(noun) {
  return (0, import_pluralize.plural)(noun) === noun ? (0, import_pluralize.singular)(noun) : noun;
}

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
var node_param_display_name_miscased_id_exports = {};
__export(node_param_display_name_miscased_id_exports, {
  default: () => node_param_display_name_miscased_id_default
});
module.exports = __toCommonJS(node_param_display_name_miscased_id_exports);
var import_constants = require("../constants");
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_display_name_miscased_id_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: `\`ID\` in \`displayName\` in node parameter must be fully uppercased. ${import_constants.DOCUMENTATION.APPLICABLE_BY_EXTENSION_TO_NAME}`,
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      uppercaseId: "Use 'ID' [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        const isNodeParameter = import_identifiers.id.isNodeParameter(node);
        const isOption = import_identifiers.id.isOption(node);
        if (!isNodeParameter && !isOption)
          return;
        if (isNodeParameter) {
          const displayName = import_getters.getters.nodeParam.getDisplayName(node);
          if (!displayName)
            return;
          if (import_constants.MISCASED_ID_REGEX.test(displayName.value)) {
            const correctlyCased = displayName.value.replace(/\bid\b/i, "ID").replace(/\bids\b/i, "IDs");
            const fixed = import_utils.utils.keyValue("displayName", correctlyCased);
            context.report({
              messageId: "uppercaseId",
              node: displayName.ast,
              fix: (fixer) => fixer.replaceText(displayName.ast, fixed)
            });
          }
        } else if (isOption) {
          const name = import_getters.getters.nodeParam.getName(node);
          if (!name)
            return;
          if (import_constants.MISCASED_ID_REGEX.test(name.value)) {
            if (name.value.startsWith("="))
              return;
            const correctlyCased = name.value.replace(/\bid\b/i, "ID").replace(/\bids\b/i, "IDs");
            const fixed = import_utils.utils.keyValue("name", correctlyCased);
            context.report({
              messageId: "uppercaseId",
              node: name.ast,
              fix: (fixer) => fixer.replaceText(name.ast, fixed)
            });
          }
        }
      }
    };
  }
});

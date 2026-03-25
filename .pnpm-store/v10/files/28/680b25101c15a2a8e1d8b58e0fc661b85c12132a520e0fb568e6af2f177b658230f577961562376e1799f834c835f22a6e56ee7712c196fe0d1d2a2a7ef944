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
var node_param_display_name_excess_inner_whitespace_exports = {};
__export(node_param_display_name_excess_inner_whitespace_exports, {
  default: () => node_param_display_name_excess_inner_whitespace_default
});
module.exports = __toCommonJS(node_param_display_name_excess_inner_whitespace_exports);
var import_constants = require("../constants");
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_display_name_excess_inner_whitespace_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: `\`displayName\` in node parameter or in fixed collection section must not contain excess inner whitespace. ${import_constants.DOCUMENTATION.APPLICABLE_BY_EXTENSION_TO_NAME}`,
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      removeInnerWhitespace: "Remove excess inner whitespace [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        const isNodeParameter = import_identifiers.id.isNodeParameter(node);
        const isFixedCollectionSection = import_identifiers.id.isFixedCollectionSection(node);
        const isOption = import_identifiers.id.isOption(node);
        if (!isNodeParameter && !isFixedCollectionSection && !isOption)
          return;
        if (isNodeParameter || isFixedCollectionSection) {
          const displayName = import_getters.getters.nodeParam.getDisplayName(node);
          if (!displayName)
            return;
          if (/\s{2,}/.test(displayName.value)) {
            const withoutExcess = displayName.value.replace(/\s{2,}/g, " ");
            const fixed = import_utils.utils.keyValue("displayName", withoutExcess);
            context.report({
              messageId: "removeInnerWhitespace",
              node: displayName.ast,
              fix: (fixer) => fixer.replaceText(displayName.ast, fixed)
            });
          }
        } else if (isOption) {
          const name = import_getters.getters.nodeParam.getName(node);
          if (!name)
            return;
          if (/\s{2,}/.test(name.value)) {
            const withoutExcess = name.value.replace(/\s{2,}/g, " ");
            const fixed = import_utils.utils.keyValue("name", withoutExcess);
            context.report({
              messageId: "removeInnerWhitespace",
              node: name.ast,
              fix: (fixer) => fixer.replaceText(name.ast, fixed)
            });
          }
        }
      }
    };
  }
});

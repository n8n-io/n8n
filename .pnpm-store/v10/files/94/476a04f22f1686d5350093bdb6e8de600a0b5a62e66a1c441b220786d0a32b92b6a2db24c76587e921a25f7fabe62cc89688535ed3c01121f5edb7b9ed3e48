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
var node_param_display_name_miscased_exports = {};
__export(node_param_display_name_miscased_exports, {
  default: () => node_param_display_name_miscased_default
});
module.exports = __toCommonJS(node_param_display_name_miscased_exports);
var import_title_case = require("title-case");
var import_constants = require("../constants");
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_display_name_miscased_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: `\`displayName\` in node parameter or in fixed collection section must title cased. ${import_constants.DOCUMENTATION.APPLICABLE_BY_EXTENSION_TO_NAME}`,
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      useTitleCase: "Change to title case [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        const filename = import_utils.utils.getNodeFilename(context.getFilename());
        if (filename === "GenericFunctions.ts")
          return;
        if (import_identifiers.id.isArgument(node))
          return;
        const isNodeParameter = import_identifiers.id.isNodeParameter(node);
        const isFixedCollectionSection = import_identifiers.id.isFixedCollectionSection(node);
        const isOption = import_identifiers.id.isOption(node);
        if (!isNodeParameter && !isFixedCollectionSection && !isOption)
          return;
        if (isNodeParameter || isFixedCollectionSection) {
          const displayName = import_getters.getters.nodeParam.getDisplayName(node);
          if (!displayName)
            return;
          if (displayName.value.toLowerCase().endsWith("or"))
            return;
          const type = import_getters.getters.nodeParam.getType(node);
          if (type?.value === "notice")
            return;
          if (import_utils.utils.isAllowedLowercase(displayName.value))
            return;
          const titledCased = (0, import_title_case.titleCase)(displayName.value);
          if (displayName.value !== titledCased) {
            const fixed = import_utils.utils.keyValue("displayName", titledCased);
            context.report({
              messageId: "useTitleCase",
              node: displayName.ast,
              fix: (fixer) => fixer.replaceText(displayName.ast, fixed)
            });
          }
        } else if (isOption) {
          const name = import_getters.getters.nodeParam.getName(node);
          if (!name)
            return;
          if (name.value.toLowerCase().endsWith("or"))
            return;
          if (import_utils.utils.isAllowedLowercase(name.value))
            return;
          const titleCased = (0, import_title_case.titleCase)(name.value);
          if (name.value !== titleCased) {
            const fixed = import_utils.utils.keyValue("name", titleCased);
            context.report({
              messageId: "useTitleCase",
              node: name.ast,
              fix: (fixer) => fixer.replaceText(name.ast, fixed)
            });
          }
        }
      }
    };
  }
});

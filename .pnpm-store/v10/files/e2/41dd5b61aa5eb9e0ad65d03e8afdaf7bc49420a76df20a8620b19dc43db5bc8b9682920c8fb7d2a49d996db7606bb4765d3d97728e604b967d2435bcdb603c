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
var node_param_description_comma_separated_hyphen_exports = {};
__export(node_param_description_comma_separated_hyphen_exports, {
  default: () => node_param_description_comma_separated_hyphen_default
});
module.exports = __toCommonJS(node_param_description_comma_separated_hyphen_exports);
var import_constants = require("../constants");
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_description_comma_separated_hyphen_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: `The string \`comma-separated\` in \`description\` must be hyphenated. ${import_constants.DOCUMENTATION.APPLICABLE_BY_EXTENSION_TO_DESCRIPTION_IN_OPTION}`,
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      hyphenate: "Hyphenate [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeParameter(node) && !import_identifiers.id.isOption(node))
          return;
        const description = import_getters.getters.nodeParam.getDescription(node);
        if (!description)
          return;
        if (description.value.toLowerCase().includes("omma separated")) {
          const hyphenated = description.value.replace(
            /omma separated/g,
            "omma-separated"
          );
          const fixed = import_utils.utils.keyValue("description", hyphenated, {
            backtickedValue: import_utils.utils.isMultiline(description)
          });
          context.report({
            messageId: "hyphenate",
            node: description.ast,
            fix: (fixer) => fixer.replaceText(description.ast, fixed)
          });
        }
      }
    };
  }
});

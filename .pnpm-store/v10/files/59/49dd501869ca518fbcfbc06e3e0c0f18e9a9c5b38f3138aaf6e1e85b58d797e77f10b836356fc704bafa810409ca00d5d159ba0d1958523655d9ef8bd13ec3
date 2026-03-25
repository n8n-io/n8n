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
var node_param_description_excess_final_period_exports = {};
__export(node_param_description_excess_final_period_exports, {
  default: () => node_param_description_excess_final_period_default
});
module.exports = __toCommonJS(node_param_description_excess_final_period_exports);
var import_constants = require("../constants");
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_description_excess_final_period_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: `\`description\` in node parameter must end without a final period if a single-sentence description. ${import_constants.DOCUMENTATION.APPLICABLE_BY_EXTENSION_TO_DESCRIPTION_IN_OPTION}`,
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      excessFinalPeriod: "Remove final period [autofixable]"
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
        if (/\s{2,}/.test(description.value))
          return;
        if (import_identifiers.id.isWeakDescription(description))
          return;
        const { value } = description;
        const egLess = value.replace("e.g.", "");
        if (egLess.split(". ").length === 1 && egLess.endsWith(".")) {
          const withoutExcess = value.slice(0, value.length - 1);
          const fixed = import_utils.utils.keyValue("description", withoutExcess);
          context.report({
            messageId: "excessFinalPeriod",
            node: description.ast,
            fix: (fixer) => fixer.replaceText(description.ast, fixed)
          });
        }
      }
    };
  }
});

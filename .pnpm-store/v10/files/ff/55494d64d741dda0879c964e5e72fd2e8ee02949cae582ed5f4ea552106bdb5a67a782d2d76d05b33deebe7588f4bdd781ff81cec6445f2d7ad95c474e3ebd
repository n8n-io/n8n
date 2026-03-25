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
var node_param_type_options_max_value_present_exports = {};
__export(node_param_type_options_max_value_present_exports, {
  default: () => node_param_type_options_max_value_present_default
});
module.exports = __toCommonJS(node_param_type_options_max_value_present_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_type_options_max_value_present_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`maxValue` in `typeOptions` in Limit node parameter is deprecated and must not be present.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      removeMaxValue: "Remove `maxValue` [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeParameter(node))
          return;
        if (!import_identifiers.id.nodeParam.isLimit(node))
          return;
        const maxValue = import_getters.getters.nodeParam.getMaxValue(node);
        if (!maxValue)
          return;
        const rangeToRemove = import_utils.utils.getRangeToRemove(maxValue);
        context.report({
          messageId: "removeMaxValue",
          node: maxValue.ast,
          fix: (fixer) => fixer.removeRange(rangeToRemove)
        });
      }
    };
  }
});

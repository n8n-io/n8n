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
var node_param_min_value_wrong_for_limit_exports = {};
__export(node_param_min_value_wrong_for_limit_exports, {
  default: () => node_param_min_value_wrong_for_limit_default
});
module.exports = __toCommonJS(node_param_min_value_wrong_for_limit_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_min_value_wrong_for_limit_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`minValue` for Limit node parameter must be a positive integer.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      setPositiveMinValue: "Set a positive integer [autofixable]"
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
        const minValue = import_getters.getters.nodeParam.getMinValue(node);
        if (!minValue)
          return;
        if (minValue.value < 1) {
          context.report({
            messageId: "setPositiveMinValue",
            node: minValue.ast,
            fix: (fixer) => fixer.replaceText(minValue.ast, "minValue: 1")
          });
        }
      }
    };
  }
});

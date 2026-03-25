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
var node_param_description_missing_from_dynamic_multi_options_exports = {};
__export(node_param_description_missing_from_dynamic_multi_options_exports, {
  default: () => node_param_description_missing_from_dynamic_multi_options_default
});
module.exports = __toCommonJS(node_param_description_missing_from_dynamic_multi_options_exports);
var import_constants = require("../constants");
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_description_missing_from_dynamic_multi_options_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`description` in dynamic-multi-options-type node parameter must be present.",
      recommended: "strict"
    },
    schema: [],
    fixable: "code",
    messages: {
      addStandardDescription: `Add description: '${import_constants.DYNAMIC_MULTI_OPTIONS_NODE_PARAMETER.DESCRIPTION}' [autofixable]`
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
        const description = import_getters.getters.nodeParam.getDescription(node);
        if (!description) {
          const type = import_getters.getters.nodeParam.getType(node);
          if (!type)
            return;
          const { range, indentation } = import_utils.utils.getInsertionArgs(type);
          context.report({
            messageId: "addStandardDescription",
            node: type.ast,
            fix: (fixer) => fixer.insertTextAfterRange(
              range,
              `
${indentation}description: '${import_constants.DYNAMIC_MULTI_OPTIONS_NODE_PARAMETER.DESCRIPTION}',`
            )
          });
        }
      }
    };
  }
});

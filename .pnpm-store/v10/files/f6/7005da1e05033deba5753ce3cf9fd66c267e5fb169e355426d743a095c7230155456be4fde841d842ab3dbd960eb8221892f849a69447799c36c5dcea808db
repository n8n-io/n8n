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
var node_param_resource_without_no_data_expression_exports = {};
__export(node_param_resource_without_no_data_expression_exports, {
  default: () => node_param_resource_without_no_data_expression_default
});
module.exports = __toCommonJS(node_param_resource_without_no_data_expression_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_resource_without_no_data_expression_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`noDataExpression` in a Resource node parameter must be present and enabled.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      addNoDataExpression: "Add 'noDataExpression: true' [autofixable]",
      enableNoDataExpression: "Enable 'noDataExpression' [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeParameter(node))
          return;
        if (!import_identifiers.id.nodeParam.isResource(node))
          return;
        const noDataExpression = import_getters.getters.nodeParam.getNoDataExpression(node);
        if (!noDataExpression) {
          const type = import_getters.getters.nodeParam.getType(node);
          if (!type)
            return;
          const { range, indentation } = import_utils.utils.getInsertionArgs(type);
          context.report({
            messageId: "addNoDataExpression",
            node,
            fix: (fixer) => fixer.insertTextAfterRange(
              range,
              `
${indentation}noDataExpression: true,`
            )
          });
        } else if (noDataExpression.value === false) {
          context.report({
            messageId: "enableNoDataExpression",
            node: noDataExpression.ast,
            fix: (fixer) => fixer.replaceText(noDataExpression.ast, `noDataExpression: true`)
          });
        }
      }
    };
  }
});

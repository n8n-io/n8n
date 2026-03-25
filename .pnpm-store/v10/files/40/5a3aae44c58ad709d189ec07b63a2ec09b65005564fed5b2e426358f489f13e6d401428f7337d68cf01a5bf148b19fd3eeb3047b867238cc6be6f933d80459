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
var node_param_option_value_duplicate_exports = {};
__export(node_param_option_value_duplicate_exports, {
  default: () => node_param_option_value_duplicate_default
});
module.exports = __toCommonJS(node_param_option_value_duplicate_exports);
var import_utils = require("../ast/utils");
var import_nodeParameter = require("../ast/identifiers/nodeParameter.identifiers");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_option_value_duplicate_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "Option `value` in options-type node parameter must not be a duplicate.",
      recommended: "strict"
    },
    schema: [],
    fixable: "code",
    messages: {
      removeDuplicate: "Remove duplicate option [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeParameter(node))
          return;
        if (!import_identifiers.id.nodeParam.isOptionsType(node))
          return;
        const options = import_getters.getters.nodeParam.getOptions(node);
        if (!options)
          return;
        if (options.hasPropertyPointingToIdentifier)
          return;
        const duplicate = findDuplicateOptionValue(options);
        if (duplicate) {
          const rangeToRemove = import_utils.utils.getRangeToRemove({
            ast: duplicate.parentOptionAst
          });
          context.report({
            messageId: "removeDuplicate",
            node: duplicate.parentOptionAst,
            fix: (fixer) => fixer.removeRange(rangeToRemove)
          });
        }
      }
    };
  }
});
function findDuplicateOptionValue(options) {
  const seen = /* @__PURE__ */ new Set();
  for (const element of options.ast.value.elements) {
    if (!Array.isArray(element.properties))
      continue;
    for (const property of element.properties) {
      if (!(0, import_nodeParameter.isValue)(property))
        continue;
      const { value } = property.value;
      if (!seen.has(value)) {
        seen.add(value);
      } else {
        return { value, ast: property, parentOptionAst: element };
      }
    }
  }
  return null;
}

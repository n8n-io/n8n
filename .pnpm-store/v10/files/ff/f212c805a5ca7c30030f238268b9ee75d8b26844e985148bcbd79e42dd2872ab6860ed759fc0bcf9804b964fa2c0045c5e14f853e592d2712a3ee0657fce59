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
var node_param_description_boolean_without_whether_exports = {};
__export(node_param_description_boolean_without_whether_exports, {
  default: () => node_param_description_boolean_without_whether_default
});
module.exports = __toCommonJS(node_param_description_boolean_without_whether_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_description_boolean_without_whether_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`description` in a boolean node parameter must start with `Whether`.",
      recommended: "strict"
    },
    schema: [],
    messages: {
      useWhether: "Start with 'Whether' [non-autofixable]"
      // unpredictable input, unknowable description
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeParameter(node))
          return;
        if (!import_identifiers.id.nodeParam.isBooleanType(node))
          return;
        if (import_identifiers.id.nodeParam.isSimplify(node))
          return;
        const description = import_getters.getters.nodeParam.getDescription(node);
        if (!description)
          return;
        if (!description.value.startsWith("Whether")) {
          context.report({
            messageId: "useWhether",
            node: description.ast
          });
        }
      }
    };
  }
});

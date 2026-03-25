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
var node_param_option_name_wrong_for_get_many_exports = {};
__export(node_param_option_name_wrong_for_get_many_exports, {
  default: () => node_param_option_name_wrong_for_get_many_default
});
module.exports = __toCommonJS(node_param_option_name_wrong_for_get_many_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_option_name_wrong_for_get_many_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "Option `name` for Get Many node parameter must be `Get Many`",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      useGetMany: "Replace with 'Get Many' [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isOption(node))
          return;
        if (!import_identifiers.id.hasValue("getAll", node))
          return;
        const name = import_getters.getters.nodeParam.getName(node);
        if (!name)
          return;
        if (name.value !== "Get Many") {
          context.report({
            messageId: "useGetMany",
            node: name.ast,
            fix: (fixer) => fixer.replaceText(name.ast, "name: 'Get Many'")
          });
        }
      }
    };
  }
});

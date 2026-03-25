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
var node_param_color_type_unused_exports = {};
__export(node_param_color_type_unused_exports, {
  default: () => node_param_color_type_unused_default
});
module.exports = __toCommonJS(node_param_color_type_unused_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_color_type_unused_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`string`-type color-related node parameter must be `color`-type.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      useColorParam: "Use 'color' for 'type' [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeParameter(node))
          return;
        const name = import_getters.getters.nodeParam.getName(node);
        if (!name)
          return;
        const type = import_getters.getters.nodeParam.getType(node);
        if (!type)
          return;
        if (/colo(u?)r/i.test(name.value) && type.value === "string") {
          context.report({
            messageId: "useColorParam",
            node: type.ast,
            fix: (fixer) => fixer.replaceText(type.ast, "type: 'color'")
          });
        }
      }
    };
  }
});

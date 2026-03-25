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
var node_param_hint_untrimmed_exports = {};
__export(node_param_hint_untrimmed_exports, {
  default: () => node_param_hint_untrimmed_default
});
module.exports = __toCommonJS(node_param_hint_untrimmed_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_hint_untrimmed_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`hint` in node parameter must be trimmed.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      trimWhitespace: "Trim whitespace [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        const isNodeParameter = import_identifiers.id.isNodeParameter(node);
        if (!isNodeParameter)
          return;
        const hint = import_getters.getters.nodeParam.getHint(node);
        if (!hint)
          return;
        const trimmed = hint.value.trim();
        if (hint.value !== trimmed) {
          const fixed = import_utils.utils.keyValue("hint", trimmed);
          context.report({
            messageId: "trimWhitespace",
            node: hint.ast,
            fix: (fixer) => fixer.replaceText(hint.ast, fixed)
          });
        }
      }
    };
  }
});

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
var node_param_hint_url_missing_protocol_exports = {};
__export(node_param_hint_url_missing_protocol_exports, {
  default: () => node_param_hint_url_missing_protocol_default
});
module.exports = __toCommonJS(node_param_hint_url_missing_protocol_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_hint_url_missing_protocol_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: `\`hint\` in node parameter must include protocol e.g. \`https://\` when containing a URL.`,
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      addProtocol: "Prepend 'https://' [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeParameter(node))
          return;
        const hint = import_getters.getters.nodeParam.getHint(node);
        if (!hint)
          return;
        if (/<a href=/.test(hint.value) && !/href=["']https:\/\//.test(hint.value)) {
          const withProtocol = hint.value.replace(
            /href=(['"])/g,
            "href=$1https://"
          );
          const fixed = import_utils.utils.keyValue("hint", withProtocol);
          context.report({
            messageId: "addProtocol",
            node: hint.ast,
            fix: (fixer) => fixer.replaceText(hint.ast, fixed)
          });
        }
      }
    };
  }
});

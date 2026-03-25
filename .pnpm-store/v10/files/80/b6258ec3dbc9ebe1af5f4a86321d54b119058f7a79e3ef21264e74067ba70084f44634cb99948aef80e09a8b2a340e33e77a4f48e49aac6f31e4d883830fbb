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
var cred_class_field_placeholder_url_missing_eg_exports = {};
__export(cred_class_field_placeholder_url_missing_eg_exports, {
  default: () => cred_class_field_placeholder_url_missing_eg_default
});
module.exports = __toCommonJS(cred_class_field_placeholder_url_missing_eg_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var cred_class_field_placeholder_url_missing_eg_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`placeholder` for a URL in credential class must be prepended with `e.g.`.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      prependEg: "Prepend 'e.g.' [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ClassDeclaration(node) {
        if (!import_identifiers.id.isCredentialClass(node))
          return;
        const placeholder = import_getters.getters.credClassBody.getPlaceholder(node.body);
        if (!placeholder)
          return;
        if (placeholder.value.startsWith("http")) {
          context.report({
            messageId: "prependEg",
            node: placeholder.ast,
            fix: (fixer) => fixer.replaceText(
              placeholder.ast,
              `placeholder = 'e.g. ${placeholder.value}';`
            )
          });
        }
      }
    };
  }
});

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
var cred_class_field_documentation_url_miscased_exports = {};
__export(cred_class_field_documentation_url_miscased_exports, {
  default: () => cred_class_field_documentation_url_miscased_default
});
module.exports = __toCommonJS(cred_class_field_documentation_url_miscased_exports);
var import_camel_case = require("camel-case");
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var cred_class_field_documentation_url_miscased_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`documentationUrl` field in credential class must be camel cased. Only applicable to nodes in the main repository.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      useCamelCase: "Change to camelCase [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ClassDeclaration(node) {
        if (!import_identifiers.id.isCredentialClass(node))
          return;
        const documentationUrl = import_getters.getters.credClassBody.getDocumentationUrl(
          node.body
        );
        if (!documentationUrl)
          return;
        const camelCasedDocumentationUrl = (0, import_camel_case.camelCase)(documentationUrl.value);
        if (documentationUrl.value !== camelCasedDocumentationUrl) {
          context.report({
            messageId: "useCamelCase",
            node: documentationUrl.ast,
            fix: (fixer) => fixer.replaceText(
              documentationUrl.ast,
              `documentationUrl = '${camelCasedDocumentationUrl}';`
            )
          });
        }
      }
    };
  }
});

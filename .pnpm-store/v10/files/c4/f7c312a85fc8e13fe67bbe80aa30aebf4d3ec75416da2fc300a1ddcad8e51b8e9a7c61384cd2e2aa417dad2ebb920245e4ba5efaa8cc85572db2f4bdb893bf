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
var cred_class_field_documentation_url_missing_exports = {};
__export(cred_class_field_documentation_url_missing_exports, {
  default: () => cred_class_field_documentation_url_missing_default
});
module.exports = __toCommonJS(cred_class_field_documentation_url_missing_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var cred_class_field_documentation_url_missing_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`documentationUrl` field in credential class must be present.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      addDocumentationUrl: "Add `documentationUrl` [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ClassDeclaration(node) {
        if (!import_identifiers.id.isCredentialClass(node))
          return;
        const { body: classBody } = node;
        const documentationUrl = import_getters.getters.credClassBody.getDocumentationUrl(classBody);
        if (!documentationUrl) {
          const displayName = import_getters.getters.credClassBody.getDisplayName(classBody);
          if (!displayName)
            return;
          const className = import_getters.getters.credClassBody.getName(classBody);
          if (!className)
            return;
          const { indentation, range } = import_utils.utils.getInsertionArgs(displayName);
          const fixed = className.value.replace(/(OAuth2)?Api/g, "");
          context.report({
            messageId: "addDocumentationUrl",
            node: classBody,
            fix: (fixer) => fixer.insertTextAfterRange(
              range,
              `
${indentation}documentationUrl = '${fixed}';`
            )
          });
        }
      }
    };
  }
});

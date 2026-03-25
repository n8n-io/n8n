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
var cred_class_field_display_name_missing_oauth2_exports = {};
__export(cred_class_field_display_name_missing_oauth2_exports, {
  default: () => cred_class_field_display_name_missing_oauth2_default
});
module.exports = __toCommonJS(cred_class_field_display_name_missing_oauth2_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var cred_class_field_display_name_missing_oauth2_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`displayName` field in credential class must mention `OAuth2` if the credential is OAuth2.",
      recommended: "strict"
    },
    schema: [],
    messages: {
      addOAuth2: "Add 'OAuth2' [non-autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ClassDeclaration(node) {
        if (!import_identifiers.id.isCredentialClass(node))
          return;
        const extendsValue = import_getters.getters.credClassBody.getExtendsValue(
          node.body,
          context
        );
        if (!extendsValue)
          return;
        const displayName = import_getters.getters.credClassBody.getDisplayName(node.body);
        if (!displayName)
          return;
        if (extendsValue.includes("oAuth2Api") && !displayName.value.endsWith("OAuth2 API")) {
          context.report({
            messageId: "addOAuth2",
            node: displayName.ast
          });
        }
      }
    };
  }
});

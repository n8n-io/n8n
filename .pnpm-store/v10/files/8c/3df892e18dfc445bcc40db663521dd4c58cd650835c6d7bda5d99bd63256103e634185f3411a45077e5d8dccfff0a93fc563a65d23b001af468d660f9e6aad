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
var cred_class_field_documentation_url_not_http_url_exports = {};
__export(cred_class_field_documentation_url_not_http_url_exports, {
  default: () => cred_class_field_documentation_url_not_http_url_default
});
module.exports = __toCommonJS(cred_class_field_documentation_url_not_http_url_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
const isTestRun = process.env.NODE_ENV === "test";
var cred_class_field_documentation_url_not_http_url_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`documentationUrl` field in credential class must be an HTTP URL. Only applicable to community credentials.",
      recommended: "strict"
    },
    schema: [],
    messages: {
      useHttpUrl: "Use an HTTP URL, e.g. `https://example.com/docs/auth` [non-autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ClassDeclaration(node) {
        const filename = context.getFilename();
        if (!import_identifiers.id.isCredentialClass(node) || !isCommunityCredential(filename)) {
          return;
        }
        const documentationUrl = import_getters.getters.credClassBody.getDocumentationUrl(
          node.body
        );
        if (!documentationUrl)
          return;
        if (!isHttpUrl(documentationUrl.value)) {
          context.report({
            messageId: "useHttpUrl",
            node: documentationUrl.ast
          });
        }
      }
    };
  }
});
function isHttpUrl(string) {
  let url;
  try {
    url = new URL(string);
  } catch (_) {
    return false;
  }
  return url.protocol === "http:" || url.protocol === "https:";
}
const isCommunityCredential = (filename) => (!filename.includes("packages/credentials") || !filename.includes("packages\\credentials") || isTestRun) && !filename.includes("scratchpad");

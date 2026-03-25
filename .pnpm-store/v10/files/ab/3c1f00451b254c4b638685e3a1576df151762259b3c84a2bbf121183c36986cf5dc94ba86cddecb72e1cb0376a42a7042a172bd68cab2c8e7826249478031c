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
var cred_class_field_name_unsuffixed_exports = {};
__export(cred_class_field_name_unsuffixed_exports, {
  default: () => cred_class_field_name_unsuffixed_default
});
module.exports = __toCommonJS(cred_class_field_name_unsuffixed_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var import_apiSuffixExemption = require("../ast/utils/apiSuffixExemption");
var cred_class_field_name_unsuffixed_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`name` field in credential class must be suffixed with `-Api`.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      fixSuffix: "Suffix with '-Api' [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ClassDeclaration(node) {
        if (!import_identifiers.id.isCredentialClass(node))
          return;
        if ((0, import_apiSuffixExemption.isExemptedFromApiSuffix)(context.getFilename()))
          return;
        const name = import_getters.getters.credClassBody.getName(node.body);
        if (!name)
          return;
        if (!name.value.endsWith("Api")) {
          const fixed = import_utils.utils.addApiSuffix(name.value);
          context.report({
            messageId: "fixSuffix",
            node: name.ast,
            fix: (fixer) => fixer.replaceText(name.ast, `name = '${fixed}';`)
          });
        }
      }
    };
  }
});

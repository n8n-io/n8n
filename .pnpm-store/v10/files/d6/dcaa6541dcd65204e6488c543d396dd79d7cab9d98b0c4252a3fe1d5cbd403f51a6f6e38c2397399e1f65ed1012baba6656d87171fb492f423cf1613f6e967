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
var cred_class_field_name_uppercase_first_char_exports = {};
__export(cred_class_field_name_uppercase_first_char_exports, {
  default: () => cred_class_field_name_uppercase_first_char_default
});
module.exports = __toCommonJS(cred_class_field_name_uppercase_first_char_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var cred_class_field_name_uppercase_first_char_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "First char in `name` in credential class must be lowercase.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      uppercaseFirstChar: "Change first char to lowercase [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ClassDeclaration(node) {
        if (!import_identifiers.id.isCredentialClass(node))
          return;
        const name = import_getters.getters.credClassBody.getName(node.body);
        if (!name)
          return;
        const fixed = name.value.charAt(0).toLowerCase() + name.value.slice(1);
        if (/[A-Z]/.test(name.value.charAt(0))) {
          context.report({
            messageId: "uppercaseFirstChar",
            node: name.ast,
            fix: (fixer) => fixer.replaceText(name.ast, `name = '${fixed}';`)
          });
        }
      }
    };
  }
});

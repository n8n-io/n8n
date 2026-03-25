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
var cred_class_field_type_options_password_missing_exports = {};
__export(cred_class_field_type_options_password_missing_exports, {
  default: () => cred_class_field_type_options_password_missing_default
});
module.exports = __toCommonJS(cred_class_field_type_options_password_missing_exports);
var import_utils = require("../ast/utils");
var import_getters = require("../ast/getters");
var import_constants = require("../constants");
const isFalsePositive = (fieldName) => {
  if (fieldName.endsWith("Url"))
    return true;
  return import_constants.FALSE_POSITIVE_CRED_SENSITIVE_CLASS_FIELDS.includes(fieldName);
};
const isSensitive = (fieldName) => {
  if (isFalsePositive(fieldName))
    return false;
  return import_constants.CRED_SENSITIVE_CLASS_FIELDS.some(
    (sensitiveField) => fieldName.toLowerCase().includes(sensitiveField.toLowerCase())
  );
};
const sensitiveStrings = import_constants.CRED_SENSITIVE_CLASS_FIELDS.map(
  (i) => `\`${i}\``
).join(",");
var cred_class_field_type_options_password_missing_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: `In a sensitive string-type field, \`typeOptions.password\` must be set to \`true\` to obscure the input. A field name is sensitive if it contains the strings: ${sensitiveStrings}. See exceptions in source.`,
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      addPasswordAutofixable: "Add `typeOptions.password` with `true` [autofixable]",
      addPasswordNonAutofixable: "Add `typeOptions.password` with `true` [non-autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        const name = import_getters.getters.nodeParam.getName(node);
        if (!name || !isSensitive(name.value))
          return;
        const type = import_getters.getters.nodeParam.getType(node);
        if (!type || type.value !== "string")
          return;
        const typeOptions = import_getters.getters.nodeParam.getTypeOptions(node);
        if (typeOptions?.value.password === true)
          return;
        if (typeOptions) {
          return context.report({
            messageId: "addPasswordNonAutofixable",
            node: typeOptions.ast
            // @TODO: Autofix this case
          });
        }
        const { indentation, range } = import_utils.utils.getInsertionArgs(type);
        context.report({
          messageId: "addPasswordAutofixable",
          node: type.ast,
          fix: (fixer) => fixer.insertTextAfterRange(
            range,
            `
${indentation}typeOptions: { password: true },`
          )
        });
      }
    };
  }
});

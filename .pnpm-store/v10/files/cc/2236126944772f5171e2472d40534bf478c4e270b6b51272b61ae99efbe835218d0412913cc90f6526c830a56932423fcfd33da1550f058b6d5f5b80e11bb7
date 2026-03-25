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
var node_param_operation_option_action_miscased_exports = {};
__export(node_param_operation_option_action_miscased_exports, {
  default: () => node_param_operation_option_action_miscased_default
});
module.exports = __toCommonJS(node_param_operation_option_action_miscased_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var import_utils2 = require("@typescript-eslint/utils");
var import_sentence_case = require("sentence-case");
var node_param_operation_option_action_miscased_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "The property `action` in an option in an Operation node parameter must be sentence-cased.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      useSentenceCase: "Change to sentence case [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeParameter(node))
          return;
        if (!import_identifiers.id.nodeParam.isOperation(node) && !import_identifiers.id.nodeParam.isAction(node)) {
          return;
        }
        const options = import_getters.getters.nodeParam.getOptions(node);
        if (!options)
          return;
        if (options.hasPropertyPointingToIdentifier)
          return;
        if (!Array.isArray(options.ast.value.elements))
          return;
        for (const option of options.ast.value.elements) {
          const action = option.properties.find(isActionProperty);
          if (!action)
            continue;
          const actionSentence = action.value.value;
          if (!isSentenceCase(actionSentence)) {
            const sentenceCased = (0, import_sentence_case.sentenceCase)(actionSentence);
            const fixed = import_utils.utils.keyValue("action", sentenceCased);
            context.report({
              messageId: "useSentenceCase",
              node: action,
              fix: (fixer) => fixer.replaceText(action, fixed)
            });
          }
        }
      }
    };
  }
});
function isActionProperty(property) {
  return property.type === import_utils2.AST_NODE_TYPES.Property && property.computed === false && property.key.type === import_utils2.AST_NODE_TYPES.Identifier && property.key.name === "action" && property.value.type === import_utils2.AST_NODE_TYPES.Literal && typeof property.value.value === "string";
}
function isSentenceCase(sentence) {
  const withoutAllUppercaseWords = sentence.split(" ").filter((word) => !isAllUppercase(word)).filter((word) => !word.includes("\\'")).join(" ");
  return withoutAllUppercaseWords === (0, import_sentence_case.sentenceCase)(withoutAllUppercaseWords);
}
const isAllUppercase = (str) => str === str.toUpperCase();

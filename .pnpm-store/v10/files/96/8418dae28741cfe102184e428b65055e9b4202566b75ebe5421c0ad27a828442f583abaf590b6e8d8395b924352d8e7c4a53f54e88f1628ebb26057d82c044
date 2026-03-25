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
var node_param_placeholder_miscased_id_exports = {};
__export(node_param_placeholder_miscased_id_exports, {
  default: () => node_param_placeholder_miscased_id_default
});
module.exports = __toCommonJS(node_param_placeholder_miscased_id_exports);
var import_constants = require("../constants");
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_placeholder_miscased_id_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`ID` in `placeholder` in node parameter must be fully uppercased.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      uppercaseId: "Use 'ID' [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeParameter(node) && !import_identifiers.id.isOption(node))
          return;
        const placeholder = import_getters.getters.nodeParam.getPlaceholder(node);
        if (!placeholder || isToleratedException(placeholder.value))
          return;
        if (import_constants.MISCASED_ID_REGEX.test(placeholder.value)) {
          const correctlyCased = placeholder.value.replace(/\bid\b/i, "ID").replace(/\bids\b/i, "IDs");
          const fixed = import_utils.utils.keyValue("placeholder", correctlyCased);
          context.report({
            messageId: "uppercaseId",
            node: placeholder.ast,
            fix: (fixer) => fixer.replaceText(placeholder.ast, fixed)
          });
        }
      }
    };
  }
});
function isToleratedException(placeholderValue) {
  return placeholderValue.includes("SELECT") || placeholderValue.includes("id, name".replace(/\s/, ""));
}

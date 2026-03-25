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
var node_param_description_identical_to_display_name_exports = {};
__export(node_param_description_identical_to_display_name_exports, {
  default: () => node_param_description_identical_to_display_name_default
});
module.exports = __toCommonJS(node_param_description_identical_to_display_name_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_description_identical_to_display_name_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`description` in node parameter must not be identical to `displayName`.",
      recommended: "strict"
    },
    schema: [],
    fixable: "code",
    messages: {
      removeDescription: "Remove omittable description [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeParameter(node))
          return;
        const description = import_getters.getters.nodeParam.getDescription(node);
        if (!description)
          return;
        const displayName = import_getters.getters.nodeParam.getDisplayName(node);
        if (!displayName)
          return;
        const triviaLess = description.value.replace(/^The\s/g, "").replace(/\.$/, "");
        if (triviaLess.toLowerCase() === displayName.value.toLowerCase()) {
          const rangeToRemove = import_utils.utils.getRangeToRemove(description);
          context.report({
            messageId: "removeDescription",
            node: description.ast,
            fix: (fixer) => fixer.removeRange(rangeToRemove)
          });
        }
      }
    };
  }
});

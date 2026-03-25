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
var node_class_description_display_name_unsuffixed_trigger_node_exports = {};
__export(node_class_description_display_name_unsuffixed_trigger_node_exports, {
  default: () => node_class_description_display_name_unsuffixed_trigger_node_default
});
module.exports = __toCommonJS(node_class_description_display_name_unsuffixed_trigger_node_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_class_description_display_name_unsuffixed_trigger_node_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`displayName` in node class description for trigger node must be suffixed with `-Trigger`.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      fixInputs: "Suffix with '-Trigger' [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_utils.utils.isTriggerNodeFile(context.getFilename()))
          return;
        if (!import_identifiers.id.isNodeClassDescription(node))
          return;
        const displayName = import_getters.getters.nodeClassDescription.getDisplayName(node);
        if (!displayName)
          return;
        const displayValue = displayName.value.replace(/\s*\(Beta\)$/, "");
        if (!displayValue.endsWith("Trigger")) {
          const suffixed = `${displayName.value} Trigger`;
          const fixed = import_utils.utils.keyValue("displayName", suffixed);
          context.report({
            messageId: "fixInputs",
            node: displayName.ast,
            fix: (fixer) => fixer.replaceText(displayName.ast, fixed)
          });
        }
      }
    };
  }
});

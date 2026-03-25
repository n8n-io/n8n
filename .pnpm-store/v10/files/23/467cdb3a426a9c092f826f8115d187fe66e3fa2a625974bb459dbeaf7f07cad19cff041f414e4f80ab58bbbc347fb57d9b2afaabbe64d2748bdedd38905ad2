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
var node_class_description_inputs_wrong_regular_node_exports = {};
__export(node_class_description_inputs_wrong_regular_node_exports, {
  default: () => node_class_description_inputs_wrong_regular_node_default
});
module.exports = __toCommonJS(node_class_description_inputs_wrong_regular_node_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_class_description_inputs_wrong_regular_node_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "The number of `inputs` in node class description for regular node should be one, or two for Merge node.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      fixInputs: `Replace with "['main']" [autofixable]`,
      fixInputsMerge: `Replace with "['main', 'main']" [autofixable]`
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeClassDescription(node))
          return;
        const inputs = import_getters.getters.nodeClassDescription.getInputs(node);
        if (!inputs)
          return;
        const filename = context.getFilename();
        if (!import_utils.utils.isRegularNodeFile(filename))
          return;
        const isMergeNode = filename.endsWith("Merge.node.ts");
        const inputsTotal = inputs.value.length;
        if (isMergeNode && inputsTotal !== 2) {
          context.report({
            messageId: "fixInputsMerge",
            node: inputs.ast,
            fix: (fixer) => fixer.replaceText(inputs.ast, "inputs: ['main', 'main']")
          });
        }
        if (!isMergeNode && inputsTotal !== 1 || !isMergeNode && inputsTotal === 1 && inputs.value[0] !== "main") {
          context.report({
            messageId: "fixInputs",
            node: inputs.ast,
            fix: (fixer) => fixer.replaceText(inputs.ast, "inputs: ['main']")
          });
        }
      }
    };
  }
});

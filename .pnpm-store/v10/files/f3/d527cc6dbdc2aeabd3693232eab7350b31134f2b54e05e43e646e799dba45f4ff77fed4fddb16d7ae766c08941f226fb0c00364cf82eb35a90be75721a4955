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
var node_class_description_outputs_wrong_exports = {};
__export(node_class_description_outputs_wrong_exports, {
  default: () => node_class_description_outputs_wrong_default
});
module.exports = __toCommonJS(node_class_description_outputs_wrong_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_class_description_outputs_wrong_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "The number of `outputs` in node class description for any node must be one, or two for If node, or four for Switch node.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      fixOutputs: `Replace with "['main']" [autofixable]`,
      fixOutputsIf: `Replace with "['main', 'main']" [autofixable]`,
      fixOutputsSwitch: `Replace with "['main', 'main', 'main', 'main']" [autofixable]`
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeClassDescription(node))
          return;
        const outputs = import_getters.getters.nodeClassDescription.getOutputs(node);
        if (!outputs)
          return;
        const inputsTotal = outputs.value.length;
        const name = import_getters.getters.nodeClassDescription.getName(node);
        if (!name)
          return;
        if (name.value === "if" && inputsTotal !== 2) {
          context.report({
            messageId: "fixOutputsIf",
            node: outputs.ast,
            fix: (fixer) => fixer.replaceText(outputs.ast, "inputs: ['main', 'main']")
          });
        }
        if (name.value === "switch" && inputsTotal !== 4) {
          context.report({
            messageId: "fixOutputsSwitch",
            node: outputs.ast,
            fix: (fixer) => fixer.replaceText(
              outputs.ast,
              "inputs: ['main', 'main', 'main', 'main']"
            )
          });
        }
        if (inputsTotal !== 1 || inputsTotal === 1 && outputs.value[0] !== "main") {
          context.report({
            messageId: "fixOutputs",
            node: outputs.ast,
            fix: (fixer) => fixer.replaceText(outputs.ast, "outputs: ['main']")
          });
        }
      }
    };
  }
});

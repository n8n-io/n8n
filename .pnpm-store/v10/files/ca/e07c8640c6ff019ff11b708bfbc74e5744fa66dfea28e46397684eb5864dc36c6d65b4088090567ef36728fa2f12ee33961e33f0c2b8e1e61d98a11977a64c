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
var node_filename_against_convention_exports = {};
__export(node_filename_against_convention_exports, {
  default: () => node_filename_against_convention_default
});
module.exports = __toCommonJS(node_filename_against_convention_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_filename_against_convention_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`name` in node class description must match the node filename without the `.node.ts` suffix. Example: If `description.name` is `Test`, then filename must be `Test.node.ts`. Version suffix in filename (e.g. `-V2`) is disregarded.",
      recommended: "strict"
    },
    schema: [],
    messages: {
      renameFile: "Rename file to {{ expected }} [non-autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeClassDescription(node))
          return;
        const name = import_getters.getters.nodeClassDescription.getName(node);
        if (!name)
          return;
        const actual = import_utils.utils.getNodeFilename(context.getFilename().replace(/\\/g, "/")).replace(/V\d+\.node\.ts$/, ".node.ts");
        const expected = import_utils.utils.toExpectedNodeFilename(name.value);
        if (actual !== expected) {
          const topOfFile = { line: 1, column: 1 };
          context.report({
            messageId: "renameFile",
            loc: { start: topOfFile, end: topOfFile },
            data: { expected }
          });
        }
      }
    };
  }
});

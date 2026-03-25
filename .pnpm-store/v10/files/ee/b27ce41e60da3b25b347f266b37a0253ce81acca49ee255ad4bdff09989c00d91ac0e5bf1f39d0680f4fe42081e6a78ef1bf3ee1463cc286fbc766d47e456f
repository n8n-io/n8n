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
var node_dirname_against_convention_exports = {};
__export(node_dirname_against_convention_exports, {
  default: () => node_dirname_against_convention_default
});
module.exports = __toCommonJS(node_dirname_against_convention_exports);
var import_utils = require("../ast/utils");
var node_dirname_against_convention_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "Node dirname must match node filename, excluding the filename suffix. Example: `Test` node dirname matches `Test` section of `Test.node.ts` node filename.",
      recommended: "strict"
    },
    schema: [],
    messages: {
      renameDir: "Rename node dir to {{ expected }} [non-autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ClassDeclaration() {
        const filepath = context.getFilename();
        if (!filepath.endsWith(".node.ts"))
          return;
        const [filename, parentDir] = filepath.replace(/\\/g, "/").split("/").reverse().map((i) => i.replace("trigger", ""));
        const expected = filename.replace(".node.ts", "");
        if (!expected.toLowerCase().includes(parentDir.toLowerCase())) {
          const topOfFile = { line: 1, column: 1 };
          context.report({
            messageId: "renameDir",
            loc: { start: topOfFile, end: topOfFile },
            data: { expected }
          });
        }
      }
    };
  }
});

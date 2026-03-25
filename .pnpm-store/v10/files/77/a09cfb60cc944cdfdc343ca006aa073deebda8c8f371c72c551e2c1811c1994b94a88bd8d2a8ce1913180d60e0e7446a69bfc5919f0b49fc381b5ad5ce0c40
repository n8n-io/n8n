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
var cred_filename_against_convention_exports = {};
__export(cred_filename_against_convention_exports, {
  default: () => cred_filename_against_convention_default
});
module.exports = __toCommonJS(cred_filename_against_convention_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var cred_filename_against_convention_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "Credentials filename must match credentials class name, excluding the filename suffix. Example: `TestApi.credentials.ts` matches `TestApi` in `class TestApi implements ICredentialType`.",
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
      ClassDeclaration(node) {
        if (!import_identifiers.id.isCredentialClass(node))
          return;
        const actual = context.getFilename().replace(/\\/g, "/").split("/").pop();
        if (!actual)
          return;
        const className = import_getters.getters.getClassName(node);
        if (!className)
          return;
        const expected = className.value + ".credentials.ts";
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

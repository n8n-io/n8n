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
var node_resource_description_filename_against_convention_exports = {};
__export(node_resource_description_filename_against_convention_exports, {
  default: () => node_resource_description_filename_against_convention_default
});
module.exports = __toCommonJS(node_resource_description_filename_against_convention_exports);
var import_pluralize = require("pluralize");
var import_pascal_case = require("pascal-case");
var import_constants = require("../constants");
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var node_resource_description_filename_against_convention_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "Resource description file must use singular form. Example: `UserDescription.ts`, not `UsersDescription.ts`.",
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
        if (!import_identifiers.id.isNodeParameter(node))
          return;
        const filename = import_utils.utils.getNodeFilename(context.getFilename());
        const parts = filename.split(import_constants.RESOURCE_DESCRIPTION_SUFFIX);
        if (parts.length !== 2)
          return;
        const resourceName = parts.shift();
        if (resourceName && (0, import_pluralize.isPlural)(resourceName) && !isPluralException(resourceName)) {
          const topOfFile = { line: 1, column: 1 };
          context.report({
            messageId: "renameFile",
            loc: { start: topOfFile, end: topOfFile },
            data: {
              expected: (0, import_pluralize.singular)(resourceName) + import_constants.RESOURCE_DESCRIPTION_SUFFIX
            }
          });
        }
      }
    };
  }
});
function isPluralException(resourceName) {
  if (resourceName === (0, import_pascal_case.pascalCase)(resourceName))
    return true;
  const PLURAL_EXCEPTIONS = ["Media", "Sms", "Mms", "Software", "Sm", "Mail"];
  return PLURAL_EXCEPTIONS.includes(resourceName);
}

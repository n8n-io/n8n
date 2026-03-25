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
var node_param_description_wrong_for_upsert_exports = {};
__export(node_param_description_wrong_for_upsert_exports, {
  default: () => node_param_description_wrong_for_upsert_default
});
module.exports = __toCommonJS(node_param_description_wrong_for_upsert_exports);
var import_constants = require("../constants");
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_description_wrong_for_upsert_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: `\`description\` for Upsert node parameter must be \`${import_constants.UPSERT_NODE_PARAMETER.DESCRIPTION}\`. The resource name e.g. \`'contact'\` is also allowed instead of \`'record'\`.`,
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      useUpsertDescription: `Replace with '${import_constants.UPSERT_NODE_PARAMETER.DESCRIPTION}'.  [autofixable]`
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isOption(node))
          return;
        if (!import_identifiers.id.hasValue("upsert", node))
          return;
        const description = import_getters.getters.nodeParam.getDescription(node);
        if (!description)
          return;
        const { value } = description;
        const expected = import_constants.UPSERT_NODE_PARAMETER.DESCRIPTION;
        const [expectedStart, expectedEnd] = expected.split("record");
        if (value !== expected && (!value.startsWith(expectedStart) || !value.endsWith(expectedEnd))) {
          const fixed = import_utils.utils.keyValue("description", expected);
          context.report({
            messageId: "useUpsertDescription",
            node: description.ast,
            fix: (fixer) => fixer.replaceText(description.ast, fixed)
          });
        }
      }
    };
  }
});

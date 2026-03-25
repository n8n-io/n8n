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
var node_param_fixed_collection_type_unsorted_items_exports = {};
__export(node_param_fixed_collection_type_unsorted_items_exports, {
  default: () => node_param_fixed_collection_type_unsorted_items_default
});
module.exports = __toCommonJS(node_param_fixed_collection_type_unsorted_items_exports);
var import_constants = require("../constants");
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var import_utils2 = require("@typescript-eslint/utils");
var node_param_fixed_collection_type_unsorted_items_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: `Items in a fixed-collection-type node parameter section must be alphabetized by \`displayName\` if ${import_constants.MIN_ITEMS_TO_ALPHABETIZE_SPELLED_OUT} or more than ${import_constants.MIN_ITEMS_TO_ALPHABETIZE_SPELLED_OUT}, unless the items are address fields.`,
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      sortItems: "Alphabetize by 'displayName'. Order: {{ displayOrder }} [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isFixedCollectionSection(node))
          return;
        if (isAddressFixedCollectionSection(node))
          return;
        const values = import_getters.getters.nodeParam.getFixedCollectionValues(node);
        if (!values)
          return;
        if (values.value.length < import_constants.MIN_ITEMS_TO_ALPHABETIZE)
          return;
        const sortedParams = [...values.value].sort(
          (a, b) => a.displayName.localeCompare(b.displayName)
        );
        if (!import_utils.utils.areIdenticallySortedParams(values.value, sortedParams)) {
          const baseIndentation = import_utils.utils.getBaseIndentationForOption(values);
          const fixed = import_utils.utils.clean_OLD(sortedParams, baseIndentation);
          const displayOrder = sortedParams.reduce((acc, cur) => {
            return acc.push(cur.displayName), acc;
          }, []).join(" | ");
          context.report({
            messageId: "sortItems",
            node: values.ast,
            data: { displayOrder },
            fix: (fixer) => fixer.replaceText(values.ast, `values: ${fixed}`)
          });
        }
      }
    };
  }
});
function isAddressFixedCollectionSection(node) {
  for (const property of node.properties) {
    if (property.type === import_utils2.AST_NODE_TYPES.Property && property.key.type === import_utils2.AST_NODE_TYPES.Identifier && property.key.name === "displayName" && property.value.type === import_utils2.AST_NODE_TYPES.Literal && typeof property.value.value === "string" && property.value.value.toLowerCase().includes("address")) {
      return true;
    }
    const fixedCollectionParam = property?.parent?.parent?.parent?.parent;
    if (!fixedCollectionParam)
      continue;
    const displayName = import_getters.getters.nodeParam.getDisplayName(fixedCollectionParam);
    if (!displayName)
      continue;
    if (displayName.value.toLowerCase().includes("address"))
      return true;
  }
  return false;
}

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
var node_param_multi_options_type_unsorted_items_exports = {};
__export(node_param_multi_options_type_unsorted_items_exports, {
  default: () => node_param_multi_options_type_unsorted_items_default
});
module.exports = __toCommonJS(node_param_multi_options_type_unsorted_items_exports);
var import_constants = require("../constants");
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var import_node_param_options_type_unsorted_items = require("./node-param-options-type-unsorted-items");
var node_param_multi_options_type_unsorted_items_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: `Items in a multi-options-type node parameter must be alphabetized by \`name\` if ${import_constants.MIN_ITEMS_TO_ALPHABETIZE_SPELLED_OUT} or more than ${import_constants.MIN_ITEMS_TO_ALPHABETIZE_SPELLED_OUT}.`,
      recommended: "strict"
    },
    schema: [],
    messages: {
      sortItems: "Alphabetized by 'name'. Order: {{ displayOrder }} [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeParameter(node))
          return;
        if (!import_identifiers.id.nodeParam.isMultiOptionsType(node))
          return;
        const optionsNode = import_getters.getters.nodeParam.getOptions(node);
        if (!optionsNode)
          return;
        if (optionsNode.hasPropertyPointingToIdentifier)
          return;
        if (optionsNode.value.length < import_constants.MIN_ITEMS_TO_ALPHABETIZE)
          return;
        if (/^\d+$/.test(optionsNode.value[0].value))
          return;
        const optionsSource = context.getSourceCode().getText(optionsNode.ast.value);
        const options = (0, import_node_param_options_type_unsorted_items.toOptions)(optionsSource);
        if (!options)
          return;
        const sortedOptions = [...options].sort(import_utils.utils.optionComparator);
        if (!import_utils.utils.areIdenticallySortedOptions(options, sortedOptions)) {
          const displayOrder = import_utils.utils.toDisplayOrder(sortedOptions);
          context.report({
            messageId: "sortItems",
            node: optionsNode.ast,
            data: { displayOrder }
          });
        }
      }
    };
  }
});

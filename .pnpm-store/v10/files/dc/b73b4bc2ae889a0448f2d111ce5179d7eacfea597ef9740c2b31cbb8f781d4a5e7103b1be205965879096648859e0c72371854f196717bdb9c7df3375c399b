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
var node_param_default_missing_exports = {};
__export(node_param_default_missing_exports, {
  default: () => node_param_default_missing_default
});
module.exports = __toCommonJS(node_param_default_missing_exports);
var import_utils = require("@typescript-eslint/utils");
var import_utils2 = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_default_missing_default = import_utils2.utils.createRule({
  name: import_utils2.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`default` must be present in a node parameter, except in node parameters under `modes`.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      addDefault: "Add a default [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeParameter(node, { skipKeys: ["default"] }))
          return;
        if (node.parent?.parent) {
          if (node.parent.parent.type === import_utils.AST_NODE_TYPES.Property && node.parent.parent.key.type === import_utils.AST_NODE_TYPES.Identifier && node.parent.parent.key.name === "modes") {
            return;
          }
        }
        const type = import_getters.getters.nodeParam.getType(node);
        if (!type)
          return;
        const fixValues = {
          string: "",
          number: 0,
          boolean: false,
          options: getDefaultForOptionsTypeParam(node),
          multiOptions: [],
          collection: {},
          fixedCollection: {}
        };
        const _default = import_getters.getters.nodeParam.getDefault(node);
        if (_default?.isUnparseable)
          return;
        if (!_default) {
          const { range, indentation } = import_utils2.utils.getInsertionArgs(type);
          context.report({
            messageId: "addDefault",
            node,
            fix: (fixer) => fixer.insertTextAfterRange(
              range,
              `
${indentation}default: '${fixValues[type.value]}',`
            )
          });
        }
      }
    };
  }
});
function getDefaultForOptionsTypeParam(node) {
  const zerothOption = getZerothOption(node);
  if (!zerothOption)
    return "";
  return zerothOption.value;
}
function getZerothOption(nodeParamArg) {
  if (!import_identifiers.id.nodeParam.isOptionsType(nodeParamArg))
    return null;
  const options = import_getters.getters.nodeParam.getOptions(nodeParamArg);
  if (!options || options.hasPropertyPointingToIdentifier)
    return null;
  return options.value[0] ?? null;
}

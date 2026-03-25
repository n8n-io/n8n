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
var community_package_json_n8n_nodes_empty_exports = {};
__export(community_package_json_n8n_nodes_empty_exports, {
  default: () => community_package_json_n8n_nodes_empty_default
});
module.exports = __toCommonJS(community_package_json_n8n_nodes_empty_exports);
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var import_utils = require("../ast/utils");
var import_utils2 = require("@typescript-eslint/utils");
var community_package_json_n8n_nodes_empty_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "The `n8n.nodes` value in the `package.json` of a community package must contain at least one filepath.",
      recommended: "strict"
    },
    schema: [],
    messages: {
      addOneFilepath: "Enter at least one filepath in `n8n.nodes` in package.json"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isCommunityPackageJson(context.getFilename(), node))
          return;
        const n8n = import_getters.getters.communityPackageJson.getN8n(node);
        if (!n8n)
          return;
        if (!hasAtLeastOneFilepath(n8n)) {
          context.report({
            messageId: "addOneFilepath",
            node
          });
        }
      }
    };
  }
});
function hasAtLeastOneFilepath(n8n) {
  if (n8n.ast.type === import_utils2.AST_NODE_TYPES.Property && n8n.ast.value.type === import_utils2.AST_NODE_TYPES.ObjectExpression) {
    const nodes = n8n.ast.value.properties.find(import_identifiers.id.hasNodesLiteral);
    if (!nodes)
      return false;
    if (nodes.type === import_utils2.AST_NODE_TYPES.Property && nodes.value.type === import_utils2.AST_NODE_TYPES.ArrayExpression) {
      return nodes.value.elements.some(
        (element) => element?.type === import_utils2.AST_NODE_TYPES.Literal
      );
    }
  }
  return null;
}

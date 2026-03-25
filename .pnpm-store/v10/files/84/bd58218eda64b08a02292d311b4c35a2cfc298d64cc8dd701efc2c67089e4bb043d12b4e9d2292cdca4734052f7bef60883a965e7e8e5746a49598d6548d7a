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
var community_package_json_keywords_without_official_tag_exports = {};
__export(community_package_json_keywords_without_official_tag_exports, {
  default: () => community_package_json_keywords_without_official_tag_default
});
module.exports = __toCommonJS(community_package_json_keywords_without_official_tag_exports);
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var import_utils = require("../ast/utils");
var import_constants = require("../constants");
var import_utils2 = require("@typescript-eslint/utils");
var community_package_json_keywords_without_official_tag_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: `The \`keywords\` value in the \`package.json\` of a community package must be an array containing the value \`'${import_constants.COMMUNITY_PACKAGE_JSON.OFFICIAL_TAG}'\`.`,
      recommended: "strict"
    },
    schema: [],
    messages: {
      addOfficialTag: `Add \`${import_constants.COMMUNITY_PACKAGE_JSON.OFFICIAL_TAG}\` to \`keywords\` in package.json`
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isCommunityPackageJson(context.getFilename(), node))
          return;
        const keywords = import_getters.getters.communityPackageJson.getKeywords(node);
        if (!keywords)
          return;
        if (!hasOfficialTag(keywords)) {
          context.report({
            messageId: "addOfficialTag",
            node
          });
        }
      }
    };
  }
});
function hasOfficialTag(keywords) {
  if (keywords.ast.type === import_utils2.AST_NODE_TYPES.Property && keywords.ast.value.type === import_utils2.AST_NODE_TYPES.ArrayExpression) {
    return keywords.ast.value.elements.some(
      (element) => element?.type === import_utils2.AST_NODE_TYPES.Literal && element.value === import_constants.COMMUNITY_PACKAGE_JSON.OFFICIAL_TAG
    );
  }
  return false;
}

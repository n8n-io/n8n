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
var community_package_json_description_still_default_exports = {};
__export(community_package_json_description_still_default_exports, {
  default: () => community_package_json_description_still_default_default
});
module.exports = __toCommonJS(community_package_json_description_still_default_exports);
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var import_utils = require("../ast/utils");
var import_constants = require("../constants");
var import_defaultValue = require("../ast/utils/defaultValue");
var import_ast = require("../ast");
var community_package_json_description_still_default_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  defaultOptions: [{ description: import_constants.COMMUNITY_PACKAGE_JSON.DESCRIPTION }],
  meta: {
    type: "problem",
    docs: {
      description: import_ast.docline`The \`description\` value in the \`package.json\` of a community package must be different from the default value ${import_constants.COMMUNITY_PACKAGE_JSON.DESCRIPTION} or a user-defined default.`,
      recommended: "strict"
    },
    schema: [
      {
        type: "object",
        properties: {
          description: {
            type: "string"
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      updateDescription: "Update the `description` key in package.json"
    }
  },
  create(context, options) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isCommunityPackageJson(context.getFilename(), node))
          return;
        const description = import_getters.getters.communityPackageJson.getDescription(node);
        if (!description)
          return;
        const defaultDescription = (0, import_defaultValue.getDefaultValue)(options, "description");
        if (description.value === defaultDescription) {
          context.report({
            messageId: "updateDescription",
            node
          });
        }
      }
    };
  }
});

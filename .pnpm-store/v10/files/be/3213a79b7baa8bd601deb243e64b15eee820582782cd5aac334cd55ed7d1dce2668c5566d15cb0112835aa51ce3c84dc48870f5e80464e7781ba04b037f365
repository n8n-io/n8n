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
var community_package_json_name_still_default_exports = {};
__export(community_package_json_name_still_default_exports, {
  default: () => community_package_json_name_still_default_default
});
module.exports = __toCommonJS(community_package_json_name_still_default_exports);
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var import_utils = require("../ast/utils");
var import_constants = require("../constants");
var import_defaultValue = require("../ast/utils/defaultValue");
const isTestRun = process.env.NODE_ENV === "test";
const isProdRun = !isTestRun;
var community_package_json_name_still_default_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  defaultOptions: [{ name: import_constants.COMMUNITY_PACKAGE_JSON.NAME }],
  meta: {
    type: "problem",
    docs: {
      description: `The \`name\` key in the \`package.json\` of a community package must be different from the default value \`${import_constants.COMMUNITY_PACKAGE_JSON.NAME}\` or a user-defined default.`,
      recommended: "strict"
    },
    schema: [
      {
        type: "object",
        properties: {
          name: {
            type: "string"
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      updateName: "Update the `name` key in package.json"
    }
  },
  create(context, options) {
    return {
      ObjectExpression(node) {
        const filename = context.getFilename();
        if (isProdRun && !filename.includes("package.json"))
          return;
        if (isProdRun && !import_identifiers.id.prod.isTopLevelObjectExpression(node))
          return;
        if (isTestRun && !import_identifiers.id.test.isTopLevelObjectExpression(node))
          return;
        const name = import_getters.getters.communityPackageJson.getName(node);
        if (!name)
          return;
        const defaultName = (0, import_defaultValue.getDefaultValue)(options, "name");
        if (name.value === defaultName) {
          context.report({
            messageId: "updateName",
            node
          });
        }
      }
    };
  }
});

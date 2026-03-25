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
var community_package_json_license_not_default_exports = {};
__export(community_package_json_license_not_default_exports, {
  default: () => community_package_json_license_not_default_default
});
module.exports = __toCommonJS(community_package_json_license_not_default_exports);
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var import_utils = require("../ast/utils");
var import_constants = require("../constants");
var community_package_json_license_not_default_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: `The \`license\` key in the \`package.json\` of a community package must be the default value \`${import_constants.COMMUNITY_PACKAGE_JSON.LICENSE}\`.`,
      recommended: "strict"
    },
    schema: [],
    messages: {
      updateLicense: `Update the \`license\` key to ${import_constants.COMMUNITY_PACKAGE_JSON.LICENSE} in package.json`
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isCommunityPackageJson(context.getFilename(), node))
          return;
        const license = import_getters.getters.communityPackageJson.getLicense(node);
        if (!license)
          return;
        if (license.value !== import_constants.COMMUNITY_PACKAGE_JSON.LICENSE) {
          context.report({
            messageId: "updateLicense",
            node
          });
        }
      }
    };
  }
});

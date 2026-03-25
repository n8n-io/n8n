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
var node_class_description_missing_subtitle_exports = {};
__export(node_class_description_missing_subtitle_exports, {
  default: () => node_class_description_missing_subtitle_default
});
module.exports = __toCommonJS(node_class_description_missing_subtitle_exports);
var import_constants = require("../constants");
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_class_description_missing_subtitle_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`subtitle` in node class description must be present.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      addSubtitle: `Add subtitle: '${import_constants.NODE_CLASS_DESCRIPTION_SUBTITLE}' [autofixable]`
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeClassDescription(node))
          return;
        const allDisplayNames = getAllDisplayNames(node);
        if (!allDisplayNames)
          return;
        const hasNoSubtitleComponents = !allDisplayNames.every(
          (dn) => ["Resource", "Operation"].includes(dn)
        );
        if (hasNoSubtitleComponents)
          return;
        if (!import_getters.getters.nodeClassDescription.getSubtitle(node)) {
          const version = import_getters.getters.nodeClassDescription.getVersion(node) ?? import_getters.getters.nodeClassDescription.getDefaultVersion(node);
          if (!version)
            return;
          const { range, indentation } = import_utils.utils.getInsertionArgs(version);
          context.report({
            messageId: "addSubtitle",
            node,
            fix: (fixer) => fixer.insertTextAfterRange(
              range,
              `
${indentation}subtitle: '${import_constants.NODE_CLASS_DESCRIPTION_SUBTITLE}',`
            )
          });
        }
      }
    };
  }
});
function getAllDisplayNames(nodeParam) {
  const properties = nodeParam.properties.find(
    import_identifiers.id.nodeClassDescription.isProperties
  );
  if (!properties)
    return null;
  const displayNames = properties.value.elements.reduce(
    (acc, element) => {
      const found = element.properties?.find(import_identifiers.id.nodeParam.isDisplayName);
      if (found)
        acc.push(found.value.value);
      return acc;
    },
    []
  );
  if (!displayNames.length)
    return null;
  return displayNames;
}

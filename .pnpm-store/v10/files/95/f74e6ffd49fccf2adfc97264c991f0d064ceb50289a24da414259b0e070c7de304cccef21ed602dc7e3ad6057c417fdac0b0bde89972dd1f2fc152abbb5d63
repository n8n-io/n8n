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
var node_class_description_icon_not_svg_exports = {};
__export(node_class_description_icon_not_svg_exports, {
  default: () => node_class_description_icon_not_svg_default
});
module.exports = __toCommonJS(node_class_description_icon_not_svg_exports);
var import_constants = require("../constants");
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
const iconSources = import_constants.SVG_ICON_SOURCES.join(" | ");
var node_class_description_icon_not_svg_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "`icon` in node class description should be an SVG icon.",
      recommended: "strict"
    },
    schema: [],
    messages: {
      useSvg: `Try to use an SVG icon. Icon sources: ${iconSources} [non-autofixable]`
      // unavailable file
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeClassDescription(node))
          return;
        const icon = import_getters.getters.nodeClassDescription.getIcon(node);
        if (!icon)
          return;
        if (icon.value.startsWith("fa:"))
          return;
        if (!icon.value.endsWith(".svg")) {
          context.report({
            messageId: "useSvg",
            node: icon.ast
          });
        }
      }
    };
  }
});

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
var node_param_resource_with_plural_option_exports = {};
__export(node_param_resource_with_plural_option_exports, {
  default: () => node_param_resource_with_plural_option_default
});
module.exports = __toCommonJS(node_param_resource_with_plural_option_exports);
var import_utils = require("@typescript-eslint/utils");
var import_pluralize = require("pluralize");
var import_utils2 = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var node_param_resource_with_plural_option_default = import_utils2.utils.createRule({
  name: import_utils2.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "Option `name` for a Resource node parameter must be singular.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      useSingular: "Use singular [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeParameter(node))
          return;
        if (!import_identifiers.id.nodeParam.isResource(node))
          return;
        const options = import_getters.getters.nodeParam.getOptions(node);
        if (!options)
          return;
        if (options.hasPropertyPointingToIdentifier)
          return;
        const pluralOption = findPluralOption(options);
        if (pluralOption && !isAllowedPlural(pluralOption.value)) {
          const singularized = (0, import_pluralize.singular)(pluralOption.value);
          const fixed = import_utils2.utils.keyValue("name", singularized);
          context.report({
            messageId: "useSingular",
            node: pluralOption.ast,
            fix: (fixer) => fixer.replaceText(pluralOption.ast, fixed)
          });
        }
      }
    };
  }
});
function findPluralOption(options) {
  for (const element of options.ast.value.elements) {
    for (const property of element.properties) {
      if (property.type === import_utils.AST_NODE_TYPES.Property && property.computed === false && property.key.type === import_utils.AST_NODE_TYPES.Identifier && property.key.name === "name" && property.value.type === import_utils.AST_NODE_TYPES.Literal && typeof property.value.value === "string" && (0, import_pluralize.isPlural)(property.value.value) && (0, import_pluralize.singular)(property.value.value) !== (0, import_pluralize.plural)(property.value.value) && // ignore if noun with identical singular and plural forms, e.g. software, information
      property.value.value !== "SMS")
        return {
          ast: property,
          value: property.value.value
        };
    }
  }
  return null;
}
function isAllowedPlural(value) {
  return value.toLowerCase().endsWith("data");
}

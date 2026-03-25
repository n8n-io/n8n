"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
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
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var node_param_operation_option_without_action_exports = {};
__export(node_param_operation_option_without_action_exports, {
  default: () => node_param_operation_option_without_action_default
});
module.exports = __toCommonJS(node_param_operation_option_without_action_exports);
var import_utils = require("../ast/utils");
var import_identifiers = require("../ast/identifiers");
var import_getters = require("../ast/getters");
var import_utils2 = require("@typescript-eslint/utils");
var import_pluralize = require("pluralize");
var import_indefinite = __toESM(require("indefinite"));
var node_param_operation_option_without_action_default = import_utils.utils.createRule({
  name: import_utils.utils.getRuleName(module),
  meta: {
    type: "problem",
    docs: {
      description: "An option in an Operation node parameter must have an `action` property. The `action` property may or may not be identical to the `description` property.",
      recommended: "strict"
    },
    fixable: "code",
    schema: [],
    messages: {
      addAction: "Add `action: '{{ actionText }}'` [autofixable]"
    }
  },
  defaultOptions: [],
  create(context) {
    return {
      ObjectExpression(node) {
        if (!import_identifiers.id.isNodeParameter(node))
          return;
        if (!import_identifiers.id.nodeParam.isOperation(node) && !import_identifiers.id.nodeParam.isAction(node)) {
          return;
        }
        const options = import_getters.getters.nodeParam.getOptions(node);
        if (!options)
          return;
        if (options.hasPropertyPointingToIdentifier)
          return;
        if (allOptionsHaveActions(options))
          return;
        for (const option of options.ast.value.elements) {
          const { properties: optionProperties } = option;
          const optionHasAction = optionProperties.some(isActionProperty);
          if (optionHasAction)
            continue;
          let actionText = "<summary>";
          let resourceName = getResourceFromDisplayOptions(node);
          const operationName = getOperationName(optionProperties);
          if (resourceName && operationName) {
            const resourceParts = splitIfCamelCased(resourceName);
            if (operationName === "Get All") {
              resourceName = resourceParts.length > 1 ? [resourceParts[0], (0, import_pluralize.plural)(resourceParts[1])].join(" ") : (0, import_pluralize.plural)(resourceParts[0]);
              actionText = `Get all ${resourceName}`;
            } else {
              const article = (0, import_indefinite.default)(resourceName, { articleOnly: true });
              resourceName = resourceParts.join(" ");
              actionText = `${operationName} ${article} ${resourceName}`;
            }
          } else {
            const description = import_getters.getters.nodeParam.getDescription(option);
            if (!description)
              continue;
            actionText = description.value;
          }
          const { indentation, range } = import_utils.utils.getInsertionArgs({
            ast: optionProperties[optionProperties.length - 1]
          });
          const fixed = import_utils.utils.keyValue("action", actionText);
          context.report({
            data: { actionText },
            messageId: "addAction",
            node: option,
            fix: (fixer) => fixer.insertTextAfterRange(range, `
${indentation}${fixed},`)
          });
        }
      }
    };
  }
});
function allOptionsHaveActions(options) {
  return options.value.every((o) => o.action !== void 0);
}
function isActionProperty(property) {
  return property.type === import_utils2.AST_NODE_TYPES.Property && property.computed === false && property.key.type === import_utils2.AST_NODE_TYPES.Identifier && property.key.name === "action";
}
function isNameProperty(property) {
  return property.type === import_utils2.AST_NODE_TYPES.Property && property.computed === false && property.key.type === import_utils2.AST_NODE_TYPES.Identifier && property.key.name === "name" && property.value.type === import_utils2.AST_NODE_TYPES.Literal && typeof property.value.value === "string";
}
function getResourceFromDisplayOptions(node) {
  const displayOptions = node.properties.find(import_identifiers.id.nodeParam.isDisplayOptions);
  if (!displayOptions)
    return null;
  const show = displayOptions.value.properties.find(isShow);
  if (!show)
    return null;
  const resourceInShow = show.value.properties.find(isResourceInShow);
  if (!resourceInShow)
    return null;
  const [resourceName] = resourceInShow.value.elements;
  return resourceName.value;
}
function splitIfCamelCased(string) {
  return string.split(/(?=[A-Z])/g).map((part) => part.trim().toLowerCase());
}
function isShow(property) {
  return property.type === import_utils2.AST_NODE_TYPES.Property && property.computed === false && property.key.type === import_utils2.AST_NODE_TYPES.Identifier && property.key.name === "show" && property.value.type === import_utils2.AST_NODE_TYPES.ObjectExpression;
}
function isResourceInShow(property) {
  return property.type === import_utils2.AST_NODE_TYPES.Property && property.computed === false && property.key.type === import_utils2.AST_NODE_TYPES.Identifier && property.key.name === "resource" && property.value.type === import_utils2.AST_NODE_TYPES.ArrayExpression;
}
function getOperationName(optionProperties) {
  const operationNameProperty = optionProperties.find(isNameProperty);
  if (!operationNameProperty)
    return null;
  return operationNameProperty.value.value;
}

import { getStaticValue } from "@eslint-community/eslint-utils";
import {
  getMetaSchemaNode,
  getMetaSchemaNodeProperty,
  getRuleInfo
} from "../utils.js";
const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "require rules `meta.schema` properties to include descriptions",
      category: "Rules",
      recommended: true,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/require-meta-schema-description.md"
    },
    schema: [],
    messages: {
      missingDescription: "Schema option is missing an ajv description."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const { scopeManager } = sourceCode;
    const ruleInfo = getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }
    const schemaNode = getMetaSchemaNode(ruleInfo.meta, scopeManager);
    if (!schemaNode) {
      return {};
    }
    const schemaProperty = getMetaSchemaNodeProperty(schemaNode, scopeManager);
    if (schemaProperty?.type !== "ArrayExpression") {
      return {};
    }
    for (const element of schemaProperty.elements) {
      checkSchemaElement(element, true);
    }
    return {};
    function checkSchemaElement(node, isRoot = false) {
      if (!node || node.type !== "ObjectExpression") {
        return;
      }
      let hadChildren = false;
      let hadDescription = false;
      for (const { key, value } of node.properties.filter(
        (prop) => prop.type === "Property"
      )) {
        if (!key) {
          continue;
        }
        const staticKey = key.type === "Identifier" ? { value: key.name } : getStaticValue(key);
        if (!staticKey?.value) {
          continue;
        }
        switch (key.name ?? key.value) {
          case "description": {
            hadDescription = true;
            break;
          }
          case "oneOf": {
            hadChildren = true;
            if (value.type === "ArrayExpression") {
              for (const element of value.elements) {
                checkSchemaElement(element, isRoot);
              }
            }
            break;
          }
          case "properties": {
            hadChildren = true;
            if ("properties" in value && Array.isArray(value.properties)) {
              for (const property of value.properties) {
                if ("value" in property && property.value?.type === "ObjectExpression") {
                  checkSchemaElement(property.value);
                }
              }
            }
            break;
          }
        }
      }
      if (!hadDescription && !(hadChildren && isRoot)) {
        context.report({
          messageId: "missingDescription",
          node
        });
      }
    }
  }
};
var require_meta_schema_description_default = rule;
export {
  require_meta_schema_description_default as default
};

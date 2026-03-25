import {
  getContextIdentifiers,
  getMetaSchemaNode,
  getMetaSchemaNodeProperty,
  getRuleInfo,
  insertProperty,
  isUndefinedIdentifier
} from "../utils.js";
const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "require rules to implement a `meta.schema` property",
      category: "Rules",
      recommended: true,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/require-meta-schema.md"
    },
    hasSuggestions: true,
    schema: [
      {
        type: "object",
        properties: {
          requireSchemaPropertyWhenOptionless: {
            type: "boolean",
            default: true,
            description: "Whether the rule should require the `meta.schema` property to be specified (with `schema: []`) for rules that have no options."
          }
        },
        additionalProperties: false
      }
    ],
    defaultOptions: [{ requireSchemaPropertyWhenOptionless: true }],
    messages: {
      addEmptySchema: "Add empty schema indicating the rule has no options.",
      foundOptionsUsage: "`meta.schema` has no schema defined but rule has options.",
      missing: "`meta.schema` is required (use [] if rule has no schema).",
      wrongType: "`meta.schema` should be an array or object (use [] if rule has no schema)."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const { scopeManager } = sourceCode;
    const ruleInfo = getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }
    let contextIdentifiers;
    const metaNode = ruleInfo.meta;
    const requireSchemaPropertyWhenOptionless = !context.options[0] || context.options[0].requireSchemaPropertyWhenOptionless;
    let hasEmptySchema = false;
    let isUsingOptions = false;
    const schemaNode = getMetaSchemaNode(metaNode, scopeManager);
    const schemaProperty = getMetaSchemaNodeProperty(schemaNode, scopeManager);
    return {
      Program(ast) {
        contextIdentifiers = getContextIdentifiers(scopeManager, ast);
        if (!schemaProperty) {
          return;
        }
        if (schemaProperty.type === "ArrayExpression" && schemaProperty.elements.length === 0 || schemaProperty.type === "ObjectExpression" && schemaProperty.properties.length === 0) {
          hasEmptySchema = true;
        }
        if (schemaProperty.type === "Literal" || isUndefinedIdentifier(schemaProperty)) {
          context.report({ node: schemaProperty, messageId: "wrongType" });
        }
      },
      "Program:exit"() {
        if (!schemaNode && requireSchemaPropertyWhenOptionless) {
          context.report({
            node: metaNode || ruleInfo.create,
            messageId: "missing",
            suggest: !isUsingOptions && metaNode && metaNode.type === "ObjectExpression" ? [
              {
                messageId: "addEmptySchema",
                fix(fixer) {
                  return insertProperty(
                    fixer,
                    metaNode,
                    "schema: []",
                    sourceCode
                  );
                }
              }
            ] : []
          });
        }
      },
      MemberExpression(node) {
        if ((hasEmptySchema || !schemaNode) && node.object.type === "Identifier" && contextIdentifiers.has(node.object) && node.property.type === "Identifier" && node.property.name === "options") {
          isUsingOptions = true;
          context.report({
            node: schemaNode || metaNode || ruleInfo.create,
            messageId: "foundOptionsUsage"
          });
        }
      }
    };
  }
};
var require_meta_schema_default = rule;
export {
  require_meta_schema_default as default
};

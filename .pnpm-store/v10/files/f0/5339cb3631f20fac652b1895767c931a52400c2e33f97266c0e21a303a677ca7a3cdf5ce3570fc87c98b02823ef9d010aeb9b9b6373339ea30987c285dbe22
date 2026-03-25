import { getStaticValue } from "@eslint-community/eslint-utils";
import {
  evaluateObjectProperties,
  getContextIdentifiers,
  getKeyName,
  getRuleInfo,
  isUndefinedIdentifier
} from "../utils.js";
const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "require suggestable rules to implement a `meta.hasSuggestions` property",
      category: "Rules",
      recommended: true,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/require-meta-has-suggestions.md"
    },
    fixable: "code",
    schema: [],
    messages: {
      shouldBeSuggestable: "`meta.hasSuggestions` must be `true` for suggestable rules.",
      shouldNotBeSuggestable: "`meta.hasSuggestions` cannot be `true` for non-suggestable rules."
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
    let ruleReportsSuggestions = false;
    function doesPropertyContainSuggestions(node) {
      const scope = sourceCode.getScope(node);
      const staticValue = getStaticValue(node.value, scope);
      if (!staticValue || Array.isArray(staticValue.value) && staticValue.value.length > 0 || Array.isArray(staticValue.value) && staticValue.value.length === 0 && node.value.type === "Identifier") {
        return true;
      }
      return false;
    }
    return {
      Program(ast) {
        contextIdentifiers = getContextIdentifiers(scopeManager, ast);
      },
      CallExpression(node) {
        if (node.callee.type === "MemberExpression" && contextIdentifiers.has(node.callee.object) && node.callee.property.type === "Identifier" && node.callee.property.name === "report" && (node.arguments.length > 4 || node.arguments.length === 1 && node.arguments[0].type === "ObjectExpression")) {
          const suggestProp = evaluateObjectProperties(
            node.arguments[0],
            scopeManager
          ).filter((prop) => prop.type === "Property").find((prop) => getKeyName(prop) === "suggest");
          if (suggestProp && doesPropertyContainSuggestions(suggestProp)) {
            ruleReportsSuggestions = true;
          }
        }
      },
      Property(node) {
        if (node.key.type === "Identifier" && node.key.name === "suggest" && doesPropertyContainSuggestions(node)) {
          ruleReportsSuggestions = true;
        }
      },
      "Program:exit"(ast) {
        const scope = sourceCode.getScope(ast);
        const metaNode = ruleInfo && ruleInfo.meta;
        const hasSuggestionsProperty = evaluateObjectProperties(
          metaNode,
          scopeManager
        ).filter((prop) => prop.type === "Property").find((prop) => getKeyName(prop) === "hasSuggestions");
        const hasSuggestionsStaticValue = hasSuggestionsProperty && getStaticValue(hasSuggestionsProperty.value, scope);
        if (ruleReportsSuggestions) {
          if (!hasSuggestionsProperty) {
            context.report({
              node: metaNode || ruleInfo.create,
              messageId: "shouldBeSuggestable",
              fix(fixer) {
                if (metaNode && metaNode.type === "ObjectExpression") {
                  if (metaNode.properties.length === 0) {
                    return fixer.replaceText(
                      metaNode,
                      "{ hasSuggestions: true }"
                    );
                  }
                  return fixer.insertTextBefore(
                    metaNode.properties[0],
                    "hasSuggestions: true, "
                  );
                }
                return null;
              }
            });
          } else if (hasSuggestionsStaticValue && hasSuggestionsStaticValue.value !== true) {
            context.report({
              node: hasSuggestionsProperty.value,
              messageId: "shouldBeSuggestable",
              fix(fixer) {
                if (hasSuggestionsProperty.value.type === "Literal" || isUndefinedIdentifier(hasSuggestionsProperty.value)) {
                  return fixer.replaceText(
                    hasSuggestionsProperty.value,
                    "true"
                  );
                }
                return null;
              }
            });
          }
        } else if (!ruleReportsSuggestions && hasSuggestionsProperty && hasSuggestionsStaticValue && hasSuggestionsStaticValue.value === true) {
          context.report({
            node: hasSuggestionsProperty.value,
            messageId: "shouldNotBeSuggestable"
          });
        }
      }
    };
  }
};
var require_meta_has_suggestions_default = rule;
export {
  require_meta_has_suggestions_default as default
};

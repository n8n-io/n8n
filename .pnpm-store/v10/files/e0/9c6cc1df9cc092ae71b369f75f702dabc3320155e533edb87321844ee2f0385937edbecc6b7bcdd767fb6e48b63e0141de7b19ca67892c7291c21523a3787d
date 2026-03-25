import { getStaticValue } from "@eslint-community/eslint-utils";
import {
  evaluateObjectProperties,
  getContextIdentifiers,
  getKeyName,
  getRuleInfo
} from "../utils.js";
const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "require rules to implement a `meta.fixable` property",
      category: "Rules",
      recommended: true,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/require-meta-fixable.md"
    },
    schema: [
      {
        type: "object",
        properties: {
          catchNoFixerButFixableProperty: {
            type: "boolean",
            default: false,
            description: "Whether the rule should attempt to detect rules that do not have a fixer but enable the `meta.fixable` property. This option is off by default because it increases the chance of false positives since fixers can't always be detected when helper functions are used."
          }
        },
        additionalProperties: false
      }
    ],
    defaultOptions: [{ catchNoFixerButFixableProperty: false }],
    messages: {
      invalid: "`meta.fixable` must be either `code`, `whitespace`, or `null`.",
      missing: "`meta.fixable` must be either `code` or `whitespace` for fixable rules.",
      noFixerButFixableValue: "`meta.fixable` is enabled but no fixer detected."
    }
  },
  create(context) {
    const catchNoFixerButFixableProperty = context.options[0] && context.options[0].catchNoFixerButFixableProperty;
    const sourceCode = context.sourceCode;
    const { scopeManager } = sourceCode;
    const ruleInfo = getRuleInfo(sourceCode);
    let contextIdentifiers;
    let usesFixFunctions = false;
    if (!ruleInfo) {
      return {};
    }
    return {
      Program(ast) {
        contextIdentifiers = getContextIdentifiers(scopeManager, ast);
      },
      CallExpression(node) {
        if (node.callee.type === "MemberExpression" && contextIdentifiers.has(node.callee.object) && node.callee.property.type === "Identifier" && node.callee.property.name === "report" && (node.arguments.length > 4 || node.arguments.length === 1 && evaluateObjectProperties(node.arguments[0], scopeManager).some(
          (prop) => getKeyName(prop) === "fix"
        ))) {
          usesFixFunctions = true;
        }
      },
      "Program:exit"(ast) {
        const scope = sourceCode.getScope(ast);
        const metaFixableProp = ruleInfo && evaluateObjectProperties(ruleInfo.meta, scopeManager).filter((prop) => prop.type === "Property").find((prop) => getKeyName(prop) === "fixable");
        if (metaFixableProp) {
          const staticValue = getStaticValue(metaFixableProp.value, scope);
          if (!staticValue) {
            return;
          }
          if (staticValue.value && (typeof staticValue.value !== "string" || !["code", "whitespace"].includes(staticValue.value))) {
            context.report({
              node: metaFixableProp.value,
              messageId: "invalid"
            });
            return;
          }
          if (usesFixFunctions && (typeof staticValue.value !== "string" || !["code", "whitespace"].includes(staticValue.value))) {
            context.report({
              node: metaFixableProp.value,
              messageId: "missing"
            });
          } else if (catchNoFixerButFixableProperty && !usesFixFunctions && typeof staticValue.value === "string" && ["code", "whitespace"].includes(staticValue.value)) {
            context.report({
              node: metaFixableProp.value,
              messageId: "noFixerButFixableValue"
            });
          }
        } else if (!metaFixableProp && usesFixFunctions) {
          context.report({
            node: ruleInfo.meta || ruleInfo.create,
            messageId: "missing"
          });
        }
      }
    };
  }
};
var require_meta_fixable_default = rule;
export {
  require_meta_fixable_default as default
};

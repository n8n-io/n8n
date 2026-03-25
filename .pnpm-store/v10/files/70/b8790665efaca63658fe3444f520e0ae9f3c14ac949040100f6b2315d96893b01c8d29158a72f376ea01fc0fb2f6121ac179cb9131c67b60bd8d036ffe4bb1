import { evaluateObjectProperties, getKeyName, getRuleInfo } from "../utils.js";
const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "disallow using the `meta.replacedBy` rule property",
      category: "Rules",
      recommended: true,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-meta-replaced-by.md"
    },
    schema: [],
    messages: {
      useNewFormat: "Use `meta.deprecated.replacedBy` instead of `meta.replacedBy`"
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const ruleInfo = getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }
    return {
      Program() {
        const metaNode = ruleInfo.meta;
        if (!metaNode) {
          return;
        }
        const replacedByNode = evaluateObjectProperties(
          metaNode,
          sourceCode.scopeManager
        ).find((p) => p.type === "Property" && getKeyName(p) === "replacedBy");
        if (!replacedByNode) {
          return;
        }
        context.report({
          node: replacedByNode,
          messageId: "useNewFormat"
        });
      }
    };
  }
};
var no_meta_replaced_by_default = rule;
export {
  no_meta_replaced_by_default as default
};

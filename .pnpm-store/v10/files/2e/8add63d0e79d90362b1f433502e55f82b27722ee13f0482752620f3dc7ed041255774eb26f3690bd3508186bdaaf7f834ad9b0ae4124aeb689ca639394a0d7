import { getStaticValue } from "@eslint-community/eslint-utils";
import { evaluateObjectProperties, getKeyName, getRuleInfo } from "../utils.js";
const VALID_TYPES = /* @__PURE__ */ new Set(["problem", "suggestion", "layout"]);
const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "require rules to implement a `meta.type` property",
      category: "Rules",
      recommended: true,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/require-meta-type.md"
    },
    fixable: void 0,
    schema: [],
    messages: {
      missing: "`meta.type` is required (must be either `problem`, `suggestion`, or `layout`).",
      unexpected: "`meta.type` must be either `problem`, `suggestion`, or `layout`."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const ruleInfo = getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }
    return {
      Program(ast) {
        const scope = sourceCode.getScope(ast);
        const { scopeManager } = sourceCode;
        const metaNode = ruleInfo.meta;
        const typeNode = evaluateObjectProperties(metaNode, scopeManager).filter((p) => p.type === "Property").find((p) => getKeyName(p) === "type");
        if (!typeNode) {
          context.report({
            node: metaNode || ruleInfo.create,
            messageId: "missing"
          });
          return;
        }
        const staticValue = getStaticValue(typeNode.value, scope);
        if (!staticValue) {
          return;
        }
        if (typeof staticValue.value !== "string" || !VALID_TYPES.has(staticValue.value)) {
          context.report({ node: typeNode.value, messageId: "unexpected" });
        }
      }
    };
  }
};
var require_meta_type_default = rule;
export {
  require_meta_type_default as default
};

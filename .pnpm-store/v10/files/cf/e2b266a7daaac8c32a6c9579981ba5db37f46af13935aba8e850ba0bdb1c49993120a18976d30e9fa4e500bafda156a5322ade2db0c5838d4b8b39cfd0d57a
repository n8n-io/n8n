import { getKeyName, getRuleInfo } from "../utils.js";
const defaultOrder = [
  "type",
  "docs",
  "fixable",
  "hasSuggestions",
  "deprecated",
  "replacedBy",
  "schema",
  "defaultOptions",
  // https://github.com/eslint/rfcs/tree/main/designs/2023-rule-options-defaults
  "messages"
];
const keyNameMapper = (property) => getKeyName(property);
const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "enforce the order of meta properties",
      category: "Rules",
      recommended: false,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/meta-property-ordering.md"
    },
    fixable: "code",
    schema: [
      {
        type: "array",
        description: "What order to enforce for meta properties.",
        elements: { type: "string" }
      }
    ],
    defaultOptions: [defaultOrder],
    messages: {
      inconsistentOrder: "The meta properties should be placed in a consistent order: [{{order}}]."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const ruleInfo = getRuleInfo(sourceCode);
    if (!ruleInfo) {
      return {};
    }
    const order = context.options[0] || defaultOrder;
    const orderMap = new Map(
      order.map((name, i) => [name, i])
    );
    return {
      Program() {
        if (!ruleInfo.meta || ruleInfo.meta.type !== "ObjectExpression" || ruleInfo.meta.properties.length < 2) {
          return;
        }
        const props = ruleInfo.meta.properties;
        let last = Number.NEGATIVE_INFINITY;
        const violatingProps = props.filter((prop) => {
          const curr = orderMap.get(getKeyName(prop)) ?? Number.POSITIVE_INFINITY;
          return last > (last = curr);
        });
        if (violatingProps.length === 0) {
          return;
        }
        const knownProps = props.filter((prop) => orderMap.has(getKeyName(prop))).sort(
          (a, b) => orderMap.get(getKeyName(a)) - orderMap.get(getKeyName(b))
        );
        const unknownProps = props.filter(
          (prop) => !orderMap.has(getKeyName(prop))
        );
        for (const violatingProp of violatingProps) {
          context.report({
            node: violatingProp,
            messageId: "inconsistentOrder",
            data: {
              order: knownProps.map(keyNameMapper).join(", ")
            },
            fix(fixer) {
              const expectedProps = [...knownProps, ...unknownProps];
              return props.map((prop, k) => {
                return fixer.replaceText(
                  prop,
                  sourceCode.getText(expectedProps[k])
                );
              });
            }
          });
        }
      }
    };
  }
};
var meta_property_ordering_default = rule;
export {
  meta_property_ordering_default as default
};

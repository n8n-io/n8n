import { getKeyName, getSourceCodeIdentifiers } from "../utils.js";
const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "disallow unnecessary calls to `sourceCode.getFirstToken()` and `sourceCode.getLastToken()`",
      category: "Rules",
      recommended: true,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-useless-token-range.md"
    },
    fixable: "code",
    schema: [],
    messages: {
      useReplacement: "Use '{{replacementText}}' instead."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    function affectsGetTokenOutput(arg) {
      if (!arg) {
        return false;
      }
      if (arg.type !== "ObjectExpression") {
        return true;
      }
      return arg.properties.length >= 2 || arg.properties.length === 1 && (getKeyName(arg.properties[0]) !== "includeComments" || arg.properties[0].type === "Property" && arg.properties[0].value.type !== "Literal");
    }
    function isRangeAccess(node) {
      return node.property.type === "Identifier" && node.property.name === "range";
    }
    function isStartAccess(memberExpression) {
      if (isRangeAccess(memberExpression) && memberExpression.parent.type === "MemberExpression") {
        return isStartAccess(memberExpression.parent);
      }
      return memberExpression.property.type === "Identifier" && memberExpression.property.name === "start" || memberExpression.computed && memberExpression.property.type === "Literal" && memberExpression.property.value === 0 && memberExpression.object.type === "MemberExpression" && isRangeAccess(memberExpression.object);
    }
    function isEndAccess(memberExpression) {
      if (isRangeAccess(memberExpression) && memberExpression.parent.type === "MemberExpression") {
        return isEndAccess(memberExpression.parent);
      }
      return memberExpression.property.type === "Identifier" && memberExpression.property.name === "end" || memberExpression.computed && memberExpression.property.type === "Literal" && memberExpression.property.value === 1 && memberExpression.object.type === "MemberExpression" && isRangeAccess(memberExpression.object);
    }
    return {
      "Program:exit"(ast) {
        [...getSourceCodeIdentifiers(sourceCode.scopeManager, ast)].filter(
          (identifier) => identifier.parent.type === "MemberExpression" && identifier.parent.object === identifier && identifier.parent.property.type === "Identifier" && identifier.parent.parent.type === "CallExpression" && identifier.parent === identifier.parent.parent.callee && identifier.parent.parent.arguments.length <= 2 && !affectsGetTokenOutput(identifier.parent.parent.arguments[1]) && identifier.parent.parent.parent.type === "MemberExpression" && identifier.parent.parent === identifier.parent.parent.parent.object && (isStartAccess(identifier.parent.parent.parent) && identifier.parent.property.name === "getFirstToken" || isEndAccess(identifier.parent.parent.parent) && identifier.parent.property.name === "getLastToken")
        ).forEach((identifier) => {
          const callExpression = identifier.parent.parent;
          if (callExpression.type === "CallExpression") {
            const fullRangeAccess = identifier.parent.parent.parent.type === "MemberExpression" && isRangeAccess(identifier.parent.parent.parent) ? identifier.parent.parent.parent.parent : identifier.parent.parent.parent;
            const replacementText = sourceCode.text.slice(
              fullRangeAccess.range[0],
              identifier.parent.parent.range[0]
            ) + sourceCode.getText(callExpression.arguments[0]) + sourceCode.text.slice(
              identifier.parent.parent.range[1],
              fullRangeAccess.range[1]
            );
            context.report({
              node: identifier.parent.parent,
              messageId: "useReplacement",
              data: { replacementText },
              fix(fixer) {
                return fixer.replaceText(
                  identifier.parent.parent,
                  sourceCode.getText(callExpression.arguments[0])
                );
              }
            });
          }
        });
      }
    };
  }
};
var no_useless_token_range_default = rule;
export {
  no_useless_token_range_default as default
};

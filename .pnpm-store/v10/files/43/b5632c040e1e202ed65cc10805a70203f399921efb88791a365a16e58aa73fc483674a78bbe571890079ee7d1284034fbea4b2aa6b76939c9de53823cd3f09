import { getContextIdentifiers } from "../utils.js";
const DEPRECATED_PASSTHROUGHS = {
  getSource: "getText",
  getSourceLines: "getLines",
  getAllComments: "getAllComments",
  getNodeByRangeIndex: "getNodeByRangeIndex",
  getComments: "getComments",
  getCommentsBefore: "getCommentsBefore",
  getCommentsAfter: "getCommentsAfter",
  getCommentsInside: "getCommentsInside",
  getJSDocComment: "getJSDocComment",
  getFirstToken: "getFirstToken",
  getFirstTokens: "getFirstTokens",
  getLastToken: "getLastToken",
  getLastTokens: "getLastTokens",
  getTokenAfter: "getTokenAfter",
  getTokenBefore: "getTokenBefore",
  getTokenByRangeStart: "getTokenByRangeStart",
  getTokens: "getTokens",
  getTokensAfter: "getTokensAfter",
  getTokensBefore: "getTokensBefore",
  getTokensBetween: "getTokensBetween"
};
const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "disallow usage of deprecated methods on rule context objects",
      category: "Rules",
      recommended: true,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/no-deprecated-context-methods.md"
    },
    fixable: "code",
    schema: [],
    messages: {
      newFormat: "Use `{{contextName}}.getSourceCode().{{replacement}}` instead of `{{contextName}}.{{original}}`."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    return {
      "Program:exit"(ast) {
        [...getContextIdentifiers(sourceCode.scopeManager, ast)].filter(
          (contextId) => contextId.parent.type === "MemberExpression" && contextId === contextId.parent.object && contextId.parent.property.type === "Identifier" && contextId.parent.property.name in DEPRECATED_PASSTHROUGHS
        ).forEach((contextId) => {
          const parentPropertyName = contextId.parent.property.name;
          return context.report({
            node: contextId.parent,
            messageId: "newFormat",
            data: {
              contextName: contextId.name,
              original: parentPropertyName,
              replacement: DEPRECATED_PASSTHROUGHS[parentPropertyName]
            },
            fix: (fixer) => [
              fixer.insertTextAfter(contextId, ".getSourceCode()"),
              fixer.replaceText(
                contextId.parent.property,
                DEPRECATED_PASSTHROUGHS[parentPropertyName]
              )
            ]
          });
        });
      }
    };
  }
};
var no_deprecated_context_methods_default = rule;
export {
  no_deprecated_context_methods_default as default
};

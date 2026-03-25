import {
  getContextIdentifiers,
  isAutoFixerFunction,
  isSuggestionFixerFunction
} from "../utils.js";
const DEFAULT_FUNC_INFO = {
  upper: null,
  codePath: null,
  shouldCheck: false,
  node: null
};
const rule = {
  meta: {
    type: "suggestion",
    docs: {
      description: "require using `replaceText()` instead of `replaceTextRange()`",
      category: "Rules",
      recommended: false,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/prefer-replace-text.md"
    },
    fixable: void 0,
    schema: [],
    messages: {
      useReplaceText: "Use replaceText instead of replaceTextRange."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    let funcInfo = DEFAULT_FUNC_INFO;
    let contextIdentifiers;
    return {
      Program(ast) {
        contextIdentifiers = getContextIdentifiers(
          sourceCode.scopeManager,
          ast
        );
      },
      // Stacks this function's information.
      onCodePathStart(codePath, node) {
        funcInfo = {
          upper: funcInfo,
          codePath,
          shouldCheck: isAutoFixerFunction(node, contextIdentifiers, context) || isSuggestionFixerFunction(node, contextIdentifiers, context),
          node
        };
      },
      // Pops this function's information.
      onCodePathEnd() {
        funcInfo = funcInfo.upper ?? DEFAULT_FUNC_INFO;
      },
      // Checks the replaceTextRange arguments.
      "CallExpression[arguments.length=2]"(node) {
        if (funcInfo.shouldCheck && node.callee.type === "MemberExpression" && node.callee.property.name === "replaceTextRange") {
          const arg = node.arguments[0];
          const isIdenticalNodeRange = arg.type === "ArrayExpression" && arg.elements[0].type === "MemberExpression" && arg.elements[1].type === "MemberExpression" && sourceCode.getText(arg.elements[0].object) === sourceCode.getText(arg.elements[1].object);
          if (isIdenticalNodeRange) {
            context.report({
              node,
              messageId: "useReplaceText"
            });
          }
        }
      }
    };
  }
};
var prefer_replace_text_default = rule;
export {
  prefer_replace_text_default as default
};

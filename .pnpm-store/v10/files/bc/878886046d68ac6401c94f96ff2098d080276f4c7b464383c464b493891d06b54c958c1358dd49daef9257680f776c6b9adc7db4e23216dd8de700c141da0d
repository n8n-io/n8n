import { getStaticValue } from "@eslint-community/eslint-utils";
import {
  getContextIdentifiers,
  isAutoFixerFunction,
  isSuggestionFixerFunction
} from "../utils.js";
const DEFAULT_FUNC_INFO = {
  upper: null,
  codePath: null,
  hasReturnWithFixer: false,
  hasYieldWithFixer: false,
  shouldCheck: false,
  node: null
};
const rule = {
  meta: {
    type: "problem",
    docs: {
      description: "require fixer functions to return a fix",
      category: "Rules",
      recommended: true,
      url: "https://github.com/eslint-community/eslint-plugin-eslint-plugin/tree/HEAD/docs/rules/fixer-return.md"
    },
    fixable: void 0,
    schema: [],
    messages: {
      missingFix: "Fixer function never returned a fix."
    }
  },
  create(context) {
    let funcInfo = DEFAULT_FUNC_INFO;
    let contextIdentifiers = /* @__PURE__ */ new Set();
    function ensureFunctionReturnedFix(node, loc = (node.type === "FunctionExpression" && node.id ? node.id : node).loc?.start) {
      if (node.generator && !funcInfo.hasYieldWithFixer || // Generator function never yielded a fix
      !node.generator && !funcInfo.hasReturnWithFixer) {
        context.report({
          node,
          loc,
          messageId: "missingFix"
        });
      }
    }
    function isFix(node) {
      if (node.type === "ArrayExpression" && node.elements.length === 0) {
        return false;
      }
      const scope = context.sourceCode.getScope(node);
      const staticValue = getStaticValue(node, scope);
      if (!staticValue) {
        return true;
      }
      if (Array.isArray(staticValue.value)) {
        return true;
      }
      return false;
    }
    return {
      Program(ast) {
        const sourceCode = context.sourceCode;
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
          hasYieldWithFixer: false,
          hasReturnWithFixer: false,
          shouldCheck: isAutoFixerFunction(node, contextIdentifiers, context) || isSuggestionFixerFunction(node, contextIdentifiers, context),
          node
        };
      },
      // Pops this function's information.
      onCodePathEnd() {
        funcInfo = funcInfo.upper ?? DEFAULT_FUNC_INFO;
      },
      // Yield in generators
      YieldExpression(node) {
        if (funcInfo.shouldCheck && node.argument && isFix(node.argument)) {
          funcInfo.hasYieldWithFixer = true;
        }
      },
      // Checks the return statement is valid.
      ReturnStatement(node) {
        if (funcInfo.shouldCheck && node.argument && isFix(node.argument)) {
          funcInfo.hasReturnWithFixer = true;
        }
      },
      // Ensure the current fixer function returned or yielded a fix.
      "FunctionExpression:exit"(node) {
        if (funcInfo.shouldCheck) {
          ensureFunctionReturnedFix(node);
        }
      },
      // Ensure the current (arrow) fixer function returned a fix.
      "ArrowFunctionExpression:exit"(node) {
        if (funcInfo.shouldCheck) {
          const sourceCode = context.sourceCode;
          const loc = sourceCode.getTokenBefore(node.body)?.loc;
          if (node.expression) {
            if (!isFix(node.body)) {
              context.report({
                node,
                loc,
                messageId: "missingFix"
              });
            }
          } else {
            ensureFunctionReturnedFix(node, loc);
          }
        }
      }
    };
  }
};
var fixer_return_default = rule;
export {
  fixer_return_default as default
};

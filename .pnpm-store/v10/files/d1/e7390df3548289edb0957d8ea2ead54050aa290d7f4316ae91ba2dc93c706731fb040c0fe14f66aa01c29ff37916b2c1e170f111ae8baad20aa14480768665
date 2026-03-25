import { c as createRule, L as FixTracker, J as isTopLevelExpressionStatement } from '../utils.js';
import '@typescript-eslint/types';
import { a as astUtilsExports } from '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

var noExtraSemi = createRule({
  name: "no-extra-semi",
  meta: {
    type: "layout",
    docs: {
      description: "Disallow unnecessary semicolons"
    },
    fixable: "code",
    schema: [],
    messages: {
      unexpected: "Unnecessary semicolon."
    }
  },
  defaultOptions: [],
  create(context) {
    const sourceCode = context.sourceCode;
    function isFixable(nodeOrToken) {
      const nextToken = sourceCode.getTokenAfter(nodeOrToken);
      if (!nextToken || nextToken.type !== "String")
        return true;
      const stringNode = sourceCode.getNodeByRangeIndex(nextToken.range[0]);
      return !isTopLevelExpressionStatement(stringNode.parent);
    }
    function report(nodeOrToken) {
      context.report({
        node: nodeOrToken,
        messageId: "unexpected",
        fix: isFixable(nodeOrToken) ? (fixer) => new FixTracker(fixer, context.sourceCode).retainSurroundingTokens(nodeOrToken).remove(nodeOrToken) : null
      });
    }
    function checkForPartOfClassBody(firstToken) {
      for (let token = firstToken; token.type === "Punctuator" && !astUtilsExports.isClosingBraceToken(token); token = sourceCode.getTokenAfter(token)) {
        if (astUtilsExports.isSemicolonToken(token))
          report(token);
      }
    }
    return {
      /**
       * Reports this empty statement, except if the parent node is a loop.
       * @param node A EmptyStatement node to be reported.
       */
      EmptyStatement(node) {
        const parent = node.parent;
        const allowedParentTypes = [
          "ForStatement",
          "ForInStatement",
          "ForOfStatement",
          "WhileStatement",
          "DoWhileStatement",
          "IfStatement",
          "LabeledStatement",
          "WithStatement"
        ];
        if (!allowedParentTypes.includes(parent.type))
          report(node);
      },
      /**
       * Checks tokens from the head of this class body to the first MethodDefinition or the end of this class body.
       * @param node A ClassBody node to check.
       */
      ClassBody(node) {
        checkForPartOfClassBody(sourceCode.getFirstToken(node, 1));
      },
      /**
       * Checks tokens from this MethodDefinition to the next MethodDefinition or the end of this class body.
       * @param node A MethodDefinition node of the start point.
       */
      MethodDefinition(node) {
        checkForPartOfClassBody(sourceCode.getTokenAfter(node));
      },
      PropertyDefinition(node) {
        checkForPartOfClassBody(sourceCode.getTokenAfter(node));
      },
      StaticBlock(node) {
        checkForPartOfClassBody(sourceCode.getTokenAfter(node));
      },
      TSAbstractMethodDefinition(node) {
        checkForPartOfClassBody(sourceCode.getTokenAfter(node));
      },
      TSAbstractPropertyDefinition(node) {
        checkForPartOfClassBody(sourceCode.getTokenAfter(node));
      }
    };
  }
});

export { noExtraSemi as default };

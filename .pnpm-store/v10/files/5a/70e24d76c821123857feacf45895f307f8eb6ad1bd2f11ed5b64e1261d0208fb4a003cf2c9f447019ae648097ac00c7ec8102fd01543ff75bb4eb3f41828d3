import { c as createRule, l as isKeywordToken, A as ASSIGNMENT_OPERATOR } from '../utils.js';
import '@typescript-eslint/types';
import '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

var indentBinaryOps = createRule({
  name: "indent-binary-ops",
  meta: {
    type: "layout",
    docs: {
      description: "Indentation for binary operators"
    },
    fixable: "whitespace",
    schema: [
      {
        oneOf: [
          {
            type: "integer",
            minimum: 0
          },
          {
            type: "string",
            enum: ["tab"]
          }
        ]
      }
    ],
    messages: {
      wrongIndentation: "Expected indentation of {{expected}}"
    }
  },
  defaultOptions: [2],
  create: (context, options) => {
    const { sourceCode } = context;
    const indentStr = options[0] === "tab" ? "	" : " ".repeat(options[0] ?? 2);
    const indentCache = /* @__PURE__ */ new Map();
    function getIndentOfLine(line) {
      if (indentCache.has(line))
        return indentCache.get(line);
      return sourceCode.lines[line - 1].match(/^\s*/)?.[0] ?? "";
    }
    function subtractionIndent(indent) {
      if (options[0] === "tab") {
        return indent.slice(1);
      }
      return indent.slice(options[0] ?? 2);
    }
    function getTargetIndent(indent, needAdditionIndent, needSubtractionIndent) {
      if (needAdditionIndent && !needSubtractionIndent) {
        return indent + indentStr;
      }
      if (!needAdditionIndent && needSubtractionIndent) {
        return subtractionIndent(indent);
      }
      return indent;
    }
    function firstTokenOfLine(line) {
      return sourceCode.tokensAndComments.find((token) => token.loc.start.line === line);
    }
    function lastTokenOfLine(line) {
      return [...sourceCode.tokensAndComments].reverse().find((token) => token.loc.end.line === line);
    }
    function isGreaterThanCloseBracketOfLine(line) {
      const tokensAndCommentsOfLine = sourceCode.tokensAndComments.filter((token) => token.loc.start.line === line);
      let openBracketCount = 0;
      let closeBracketCount = 0;
      for (const token of tokensAndCommentsOfLine) {
        if (token.value === "(") {
          openBracketCount++;
        }
        if (token.value === ")") {
          closeBracketCount++;
        }
      }
      return openBracketCount < closeBracketCount;
    }
    function isTypeKeywordOfNode(typeToken, node) {
      while (node.parent) {
        node = node.parent;
        if (node.type === "TSTypeAliasDeclaration" && context.sourceCode.getTokenBefore(node.id) === typeToken) {
          return true;
        }
      }
      return false;
    }
    function handler(node, right) {
      if (node.loc.start.line === node.loc.end.line)
        return;
      let tokenRight = sourceCode.getFirstToken(right);
      let tokenOperator = sourceCode.getTokenBefore(tokenRight);
      while (tokenOperator.value === "(") {
        tokenRight = tokenOperator;
        tokenOperator = sourceCode.getTokenBefore(tokenRight);
        if (tokenOperator.range[0] <= right.parent.range[0])
          return;
      }
      const tokenBeforeAll = sourceCode.getTokenBefore(node);
      const tokenLeft = sourceCode.getTokenBefore(tokenOperator);
      const isMultiline = tokenRight.loc.start.line !== tokenLeft.loc.start.line;
      if (!isMultiline)
        return;
      const firstTokenOfLineLeft = firstTokenOfLine(tokenLeft.loc.start.line);
      const lastTokenOfLineLeft = lastTokenOfLine(tokenLeft.loc.start.line);
      const needAdditionIndent = isKeywordToken(firstTokenOfLineLeft) && !["typeof", "instanceof", "this"].includes(firstTokenOfLineLeft.value) || firstTokenOfLineLeft?.type === "Identifier" && firstTokenOfLineLeft.value === "type" && isTypeKeywordOfNode(firstTokenOfLineLeft, node) || [":", "[", "(", "<"].concat(ASSIGNMENT_OPERATOR).includes(lastTokenOfLineLeft?.value || "") || ["[", "(", "{", "=>", ":"].concat(ASSIGNMENT_OPERATOR).includes(tokenBeforeAll?.value || "") && firstTokenOfLineLeft?.loc.start.line === tokenBeforeAll?.loc.start.line;
      const needSubtractionIndent = lastTokenOfLineLeft?.value === ")" && isGreaterThanCloseBracketOfLine(tokenLeft.loc.start.line) && !["]", ")", "}"].includes(firstTokenOfLineLeft?.value || "");
      const indentLeft = getIndentOfLine(tokenLeft.loc.start.line);
      const indentRight = getIndentOfLine(tokenRight.loc.start.line);
      const indentTarget = getTargetIndent(indentLeft, needAdditionIndent, needSubtractionIndent);
      if (indentTarget !== indentRight) {
        const start = {
          line: tokenRight.loc.start.line,
          column: 0
        };
        const end = {
          line: tokenRight.loc.start.line,
          column: indentRight.length
        };
        context.report({
          loc: {
            start,
            end
          },
          messageId: "wrongIndentation",
          data: {
            expected: `${indentTarget.length} ${options[0] === "tab" ? "tab" : "space"}${indentTarget.length === 1 ? "" : "s"}`
          },
          fix(fixer) {
            return fixer.replaceTextRange(
              [sourceCode.getIndexFromLoc(start), sourceCode.getIndexFromLoc(end)],
              indentTarget
            );
          }
        });
        indentCache.set(tokenRight.loc.start.line, indentTarget);
      }
    }
    return {
      BinaryExpression(node) {
        handler(node, node.right);
      },
      LogicalExpression(node) {
        handler(node, node.right);
      },
      TSUnionType(node) {
        if (node.types.length > 1) {
          node.types.forEach((type) => {
            handler(node, type);
          });
        }
      },
      TSIntersectionType(node) {
        if (node.types.length > 1) {
          node.types.forEach((type) => {
            handler(node, type);
          });
        }
      }
    };
  }
});

export { indentBinaryOps as default };

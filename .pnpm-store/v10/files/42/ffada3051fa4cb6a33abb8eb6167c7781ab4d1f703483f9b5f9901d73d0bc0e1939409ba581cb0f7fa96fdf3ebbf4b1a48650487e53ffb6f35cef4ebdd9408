import { a as astUtilsExports } from '../vendor.js';
import 'eslint-visitor-keys';
import 'espree';
import '@typescript-eslint/types';
import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import 'estraverse';

const SELECTOR = [
  "BreakStatement",
  "ContinueStatement",
  "DebuggerStatement",
  "DoWhileStatement",
  "ExportAllDeclaration",
  "ExportDefaultDeclaration",
  "ExportNamedDeclaration",
  "ExpressionStatement",
  "ImportDeclaration",
  "ReturnStatement",
  "ThrowStatement",
  "VariableDeclaration",
  "PropertyDefinition"
].join(",");
function getChildren(node) {
  const t = node.type;
  if (t === "BlockStatement" || t === "StaticBlock" || t === "Program" || t === "ClassBody") {
    return node.body;
  }
  if (t === "SwitchCase")
    return node.consequent;
  return null;
}
function isLastChild(node) {
  if (!node.parent)
    return true;
  const t = node.parent.type;
  if (t === "IfStatement" && node.parent.consequent === node && node.parent.alternate) {
    return true;
  }
  if (t === "DoWhileStatement") {
    return true;
  }
  const nodeList = getChildren(node.parent);
  return nodeList !== null && nodeList[nodeList.length - 1] === node;
}
var semiStyle = createRule({
  name: "semi-style",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce location of semicolons"
    },
    schema: [{ type: "string", enum: ["last", "first"] }],
    fixable: "whitespace",
    messages: {
      expectedSemiColon: "Expected this semicolon to be at {{pos}}."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const option = context.options[0] || "last";
    function check(semiToken, expected) {
      const prevToken = sourceCode.getTokenBefore(semiToken);
      const nextToken = sourceCode.getTokenAfter(semiToken);
      const prevIsSameLine = !prevToken || astUtilsExports.isTokenOnSameLine(prevToken, semiToken);
      const nextIsSameLine = !nextToken || astUtilsExports.isTokenOnSameLine(semiToken, nextToken);
      if (expected === "last" && !prevIsSameLine || expected === "first" && !nextIsSameLine) {
        context.report({
          loc: semiToken.loc,
          messageId: "expectedSemiColon",
          data: {
            pos: expected === "last" ? "the end of the previous line" : "the beginning of the next line"
          },
          fix(fixer) {
            if (prevToken && nextToken && sourceCode.commentsExistBetween(prevToken, nextToken))
              return null;
            const start = prevToken ? prevToken.range[1] : semiToken.range[0];
            const end = nextToken ? nextToken.range[0] : semiToken.range[1];
            const text = expected === "last" ? ";\n" : "\n;";
            return fixer.replaceTextRange([start, end], text);
          }
        });
      }
    }
    return {
      [SELECTOR](node) {
        if (option === "first" && isLastChild(node))
          return;
        const lastToken = sourceCode.getLastToken(node);
        if (astUtilsExports.isSemicolonToken(lastToken))
          check(lastToken, option);
      },
      ForStatement(node) {
        const firstSemi = node.init && sourceCode.getTokenAfter(node.init, astUtilsExports.isSemicolonToken);
        const secondSemi = node.test && sourceCode.getTokenAfter(node.test, astUtilsExports.isSemicolonToken);
        if (firstSemi)
          check(firstSemi, "last");
        if (secondSemi)
          check(secondSemi, "last");
      }
    };
  }
});

export { semiStyle as default };

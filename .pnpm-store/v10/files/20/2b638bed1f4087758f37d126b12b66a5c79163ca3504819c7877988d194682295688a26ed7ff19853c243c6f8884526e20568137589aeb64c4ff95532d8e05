import { c as createRule, i as isSingleLine } from '../utils.js';
import '@typescript-eslint/types';
import { a as astUtilsExports } from '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

var multilineTernary = createRule({
  name: "multiline-ternary",
  meta: {
    type: "layout",
    docs: {
      description: "Enforce newlines between operands of ternary expressions"
    },
    schema: [
      {
        type: "string",
        enum: ["always", "always-multiline", "never"]
      },
      {
        type: "object",
        properties: {
          ignoreJSX: {
            type: "boolean",
            default: false
          }
        }
      }
    ],
    messages: {
      expectedTestCons: "Expected newline between test and consequent of ternary expression.",
      expectedConsAlt: "Expected newline between consequent and alternate of ternary expression.",
      unexpectedTestCons: "Unexpected newline between test and consequent of ternary expression.",
      unexpectedConsAlt: "Unexpected newline between consequent and alternate of ternary expression."
    },
    fixable: "whitespace"
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const multiline = context.options[0] !== "never";
    const allowSingleLine = context.options[0] === "always-multiline";
    const IGNORE_JSX = context.options[1] && context.options[1].ignoreJSX;
    return {
      ConditionalExpression(node) {
        const questionToken = sourceCode.getTokenAfter(node.test, astUtilsExports.isNotClosingParenToken);
        const colonToken = sourceCode.getTokenAfter(node.consequent, astUtilsExports.isNotClosingParenToken);
        const firstTokenOfTest = sourceCode.getFirstToken(node);
        const lastTokenOfTest = sourceCode.getTokenBefore(questionToken);
        const firstTokenOfConsequent = sourceCode.getTokenAfter(questionToken);
        const lastTokenOfConsequent = sourceCode.getTokenBefore(colonToken);
        const firstTokenOfAlternate = sourceCode.getTokenAfter(colonToken);
        const areTestAndConsequentOnSameLine = astUtilsExports.isTokenOnSameLine(lastTokenOfTest, firstTokenOfConsequent);
        const areConsequentAndAlternateOnSameLine = astUtilsExports.isTokenOnSameLine(lastTokenOfConsequent, firstTokenOfAlternate);
        const hasComments = !!sourceCode.getCommentsInside(node).length;
        if (IGNORE_JSX) {
          if (node.parent.type === "JSXElement" || node.parent.type === "JSXFragment" || node.parent.type === "JSXExpressionContainer") {
            return null;
          }
        }
        if (!multiline) {
          if (!areTestAndConsequentOnSameLine) {
            context.report({
              node: node.test,
              loc: {
                start: firstTokenOfTest.loc.start,
                end: lastTokenOfTest.loc.end
              },
              messageId: "unexpectedTestCons",
              fix(fixer) {
                if (hasComments)
                  return null;
                const fixers = [];
                const areTestAndQuestionOnSameLine = astUtilsExports.isTokenOnSameLine(lastTokenOfTest, questionToken);
                const areQuestionAndConsOnSameLine = astUtilsExports.isTokenOnSameLine(questionToken, firstTokenOfConsequent);
                if (!areTestAndQuestionOnSameLine)
                  fixers.push(fixer.removeRange([lastTokenOfTest.range[1], questionToken.range[0]]));
                if (!areQuestionAndConsOnSameLine)
                  fixers.push(fixer.removeRange([questionToken.range[1], firstTokenOfConsequent.range[0]]));
                return fixers;
              }
            });
          }
          if (!areConsequentAndAlternateOnSameLine) {
            context.report({
              node: node.consequent,
              loc: {
                start: firstTokenOfConsequent.loc.start,
                end: lastTokenOfConsequent.loc.end
              },
              messageId: "unexpectedConsAlt",
              fix(fixer) {
                if (hasComments)
                  return null;
                const fixers = [];
                const areConsAndColonOnSameLine = astUtilsExports.isTokenOnSameLine(lastTokenOfConsequent, colonToken);
                const areColonAndAltOnSameLine = astUtilsExports.isTokenOnSameLine(colonToken, firstTokenOfAlternate);
                if (!areConsAndColonOnSameLine)
                  fixers.push(fixer.removeRange([lastTokenOfConsequent.range[1], colonToken.range[0]]));
                if (!areColonAndAltOnSameLine)
                  fixers.push(fixer.removeRange([colonToken.range[1], firstTokenOfAlternate.range[0]]));
                return fixers;
              }
            });
          }
        } else {
          if (allowSingleLine && isSingleLine(node))
            return;
          if (areTestAndConsequentOnSameLine) {
            context.report({
              node: node.test,
              loc: {
                start: firstTokenOfTest.loc.start,
                end: lastTokenOfTest.loc.end
              },
              messageId: "expectedTestCons",
              fix: (fixer) => hasComments ? null : fixer.replaceTextRange(
                [
                  lastTokenOfTest.range[1],
                  questionToken.range[0]
                ],
                "\n"
              )
            });
          }
          if (areConsequentAndAlternateOnSameLine) {
            context.report({
              node: node.consequent,
              loc: {
                start: firstTokenOfConsequent.loc.start,
                end: lastTokenOfConsequent.loc.end
              },
              messageId: "expectedConsAlt",
              fix: (fixer) => hasComments ? null : fixer.replaceTextRange(
                [
                  lastTokenOfConsequent.range[1],
                  colonToken.range[0]
                ],
                "\n"
              )
            });
          }
        }
      }
    };
  }
});

export { multilineTernary as default };

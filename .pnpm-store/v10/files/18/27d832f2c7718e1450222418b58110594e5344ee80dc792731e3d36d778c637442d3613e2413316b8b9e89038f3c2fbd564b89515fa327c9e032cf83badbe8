import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import '../vendor.js';
import '@typescript-eslint/types';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

var noMultipleEmptyLines = createRule({
  name: "no-multiple-empty-lines",
  meta: {
    type: "layout",
    docs: {
      description: "Disallow multiple empty lines"
    },
    fixable: "whitespace",
    schema: [
      {
        type: "object",
        properties: {
          max: {
            type: "integer",
            minimum: 0
          },
          maxEOF: {
            type: "integer",
            minimum: 0
          },
          maxBOF: {
            type: "integer",
            minimum: 0
          }
        },
        required: ["max"],
        additionalProperties: false
      }
    ],
    messages: {
      blankBeginningOfFile: "Too many blank lines at the beginning of file. Max of {{max}} allowed.",
      blankEndOfFile: "Too many blank lines at the end of file. Max of {{max}} allowed.",
      consecutiveBlank: "More than {{max}} blank {{pluralizedLines}} not allowed."
    }
  },
  create(context) {
    let max = 2;
    let maxEOF = max;
    let maxBOF = max;
    if (context.options.length && context.options[0]) {
      max = context.options[0].max;
      maxEOF = typeof context.options[0].maxEOF !== "undefined" ? context.options[0].maxEOF : max;
      maxBOF = typeof context.options[0].maxBOF !== "undefined" ? context.options[0].maxBOF : max;
    }
    const sourceCode = context.sourceCode;
    const allLines = sourceCode.lines[sourceCode.lines.length - 1] === "" ? sourceCode.lines.slice(0, -1) : sourceCode.lines;
    const templateLiteralLines = /* @__PURE__ */ new Set();
    return {
      TemplateLiteral(node) {
        node.quasis.forEach((literalPart) => {
          for (let ignoredLine = literalPart.loc.start.line; ignoredLine < literalPart.loc.end.line; ignoredLine++)
            templateLiteralLines.add(ignoredLine);
        });
      },
      "Program:exit": function(node) {
        return allLines.reduce((nonEmptyLineNumbers, line, index) => {
          if (line.trim() || templateLiteralLines.has(index + 1))
            nonEmptyLineNumbers.push(index + 1);
          return nonEmptyLineNumbers;
        }, []).concat(allLines.length + 1).reduce((lastLineNumber, lineNumber) => {
          let messageId, maxAllowed;
          if (lastLineNumber === 0) {
            messageId = "blankBeginningOfFile";
            maxAllowed = maxBOF;
          } else if (lineNumber === allLines.length + 1) {
            messageId = "blankEndOfFile";
            maxAllowed = maxEOF;
          } else {
            messageId = "consecutiveBlank";
            maxAllowed = max;
          }
          if (lineNumber - lastLineNumber - 1 > maxAllowed) {
            context.report({
              node,
              loc: {
                start: { line: lastLineNumber + maxAllowed + 1, column: 0 },
                end: { line: lineNumber, column: 0 }
              },
              messageId,
              data: {
                max: maxAllowed,
                pluralizedLines: maxAllowed === 1 ? "line" : "lines"
              },
              fix(fixer) {
                const rangeStart = sourceCode.getIndexFromLoc({ line: lastLineNumber + 1, column: 0 });
                const lineNumberAfterRemovedLines = lineNumber - maxAllowed;
                const rangeEnd = lineNumberAfterRemovedLines <= allLines.length ? sourceCode.getIndexFromLoc({ line: lineNumberAfterRemovedLines, column: 0 }) : sourceCode.text.length;
                return fixer.removeRange([rangeStart, rangeEnd]);
              }
            });
          }
          return lineNumber;
        }, 0);
      }
    };
  }
});

export { noMultipleEmptyLines as default };

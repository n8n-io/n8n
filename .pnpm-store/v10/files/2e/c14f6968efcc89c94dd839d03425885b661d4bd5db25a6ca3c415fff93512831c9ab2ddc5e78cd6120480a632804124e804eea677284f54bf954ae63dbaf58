import { c as createRule, k as createGlobalLinebreakMatcher } from '../utils.js';
import '@typescript-eslint/types';
import '../vendor.js';
import '@eslint-community/eslint-utils';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

var noTrailingSpaces = createRule({
  name: "no-trailing-spaces",
  meta: {
    type: "layout",
    docs: {
      description: "Disallow trailing whitespace at the end of lines"
    },
    fixable: "whitespace",
    schema: [
      {
        type: "object",
        properties: {
          skipBlankLines: {
            type: "boolean",
            default: false
          },
          ignoreComments: {
            type: "boolean",
            default: false
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      trailingSpace: "Trailing spaces not allowed."
    }
  },
  create(context) {
    const sourceCode = context.sourceCode;
    const BLANK_CLASS = "[ 	\xA0\u2000-\u200B\u3000]";
    const SKIP_BLANK = `^${BLANK_CLASS}*$`;
    const NONBLANK = `${BLANK_CLASS}+$`;
    const options = context.options[0] || {};
    const skipBlankLines = options.skipBlankLines || false;
    const ignoreComments = options.ignoreComments || false;
    function report(node, location, fixRange) {
      context.report({
        node,
        loc: location,
        messageId: "trailingSpace",
        fix(fixer) {
          return fixer.removeRange(fixRange);
        }
      });
    }
    function getCommentLineNumbers(comments) {
      const lines = /* @__PURE__ */ new Set();
      comments.forEach((comment) => {
        const endLine = comment.type === "Block" ? comment.loc.end.line - 1 : comment.loc.end.line;
        for (let i = comment.loc.start.line; i <= endLine; i++)
          lines.add(i);
      });
      return lines;
    }
    return {
      Program: function checkTrailingSpaces(node) {
        const re = new RegExp(NONBLANK, "u");
        const skipMatch = new RegExp(SKIP_BLANK, "u");
        const lines = sourceCode.lines;
        const linebreaks = sourceCode.getText().match(createGlobalLinebreakMatcher());
        const comments = sourceCode.getAllComments();
        const commentLineNumbers = getCommentLineNumbers(comments);
        let totalLength = 0;
        for (let i = 0, ii = lines.length; i < ii; i++) {
          const lineNumber = i + 1;
          const linebreakLength = linebreaks && linebreaks[i] ? linebreaks[i].length : 1;
          const lineLength = lines[i].length + linebreakLength;
          const matches = re.exec(lines[i]);
          if (matches) {
            const location = {
              start: {
                line: lineNumber,
                column: matches.index
              },
              end: {
                line: lineNumber,
                column: lineLength - linebreakLength
              }
            };
            const rangeStart = totalLength + location.start.column;
            const rangeEnd = totalLength + location.end.column;
            const containingNode = sourceCode.getNodeByRangeIndex(rangeStart);
            if (containingNode && containingNode.type === "TemplateElement" && rangeStart > containingNode.parent.range[0] && rangeEnd < containingNode.parent.range[1]) {
              totalLength += lineLength;
              continue;
            }
            if (skipBlankLines && skipMatch.test(lines[i])) {
              totalLength += lineLength;
              continue;
            }
            const fixRange = [rangeStart, rangeEnd];
            if (!ignoreComments || !commentLineNumbers.has(lineNumber))
              report(node, location, fixRange);
          }
          totalLength += lineLength;
        }
      }
    };
  }
});

export { noTrailingSpaces as default };

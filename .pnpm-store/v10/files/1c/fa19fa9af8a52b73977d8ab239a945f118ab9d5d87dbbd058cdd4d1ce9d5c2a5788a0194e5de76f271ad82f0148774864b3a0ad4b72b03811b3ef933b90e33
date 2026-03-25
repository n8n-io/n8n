import { c as createRule } from '../utils.js';
import '@eslint-community/eslint-utils';
import '../vendor.js';
import '@typescript-eslint/types';
import 'eslint-visitor-keys';
import 'espree';
import 'estraverse';

var templateTagSpacing = createRule({
  name: "template-tag-spacing",
  meta: {
    type: "layout",
    docs: {
      description: "Require or disallow spacing between template tags and their literals"
    },
    fixable: "whitespace",
    schema: [
      {
        type: "string",
        enum: ["always", "never"]
      }
    ],
    messages: {
      unexpected: "Unexpected space between template tag and template literal.",
      missing: "Missing space between template tag and template literal."
    }
  },
  create(context) {
    const never = context.options[0] !== "always";
    const sourceCode = context.sourceCode;
    function checkSpacing(node) {
      const tagToken = sourceCode.getTokenBefore(node.quasi);
      const literalToken = sourceCode.getFirstToken(node.quasi);
      const hasWhitespace = sourceCode.isSpaceBetween(tagToken, literalToken);
      if (never && hasWhitespace) {
        context.report({
          node,
          loc: {
            start: tagToken.loc.end,
            end: literalToken.loc.start
          },
          messageId: "unexpected",
          fix(fixer) {
            const comments = sourceCode.getCommentsBefore(node.quasi);
            if (comments.some((comment) => comment.type === "Line"))
              return null;
            return fixer.replaceTextRange(
              [tagToken.range[1], literalToken.range[0]],
              comments.reduce((text, comment) => text + sourceCode.getText(comment), "")
            );
          }
        });
      } else if (!never && !hasWhitespace) {
        context.report({
          node,
          loc: {
            start: node.loc.start,
            end: literalToken.loc.start
          },
          messageId: "missing",
          fix(fixer) {
            return fixer.insertTextAfter(tagToken, " ");
          }
        });
      }
    }
    return {
      TaggedTemplateExpression: checkSpacing
    };
  }
});

export { templateTagSpacing as default };

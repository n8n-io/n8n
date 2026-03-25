/**
 * @author Yosuke ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const htmlComments = require('../utils/html-comments')

/**
 * @typedef { import('../utils/html-comments').ParsedHTMLComment } ParsedHTMLComment
 */

module.exports = {
  meta: {
    type: 'layout',

    docs: {
      description: 'enforce unified spacing in HTML comments',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/html-comment-content-spacing.html'
    },
    fixable: 'whitespace',
    schema: [
      {
        enum: ['always', 'never']
      },
      {
        type: 'object',
        properties: {
          exceptions: {
            type: 'array',
            items: {
              type: 'string'
            }
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      expectedAfterHTMLCommentOpen: "Expected space after '<!--'.",
      expectedBeforeHTMLCommentOpen: "Expected space before '-->'.",
      expectedAfterExceptionBlock: 'Expected space after exception block.',
      expectedBeforeExceptionBlock: 'Expected space before exception block.',
      unexpectedAfterHTMLCommentOpen: "Unexpected space after '<!--'.",
      unexpectedBeforeHTMLCommentOpen: "Unexpected space before '-->'."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    // Unless the first option is never, require a space
    const requireSpace = context.options[0] !== 'never'
    return htmlComments.defineVisitor(
      context,
      context.options[1],
      (comment) => {
        checkCommentOpen(comment)
        checkCommentClose(comment)
      },
      { includeDirectives: true }
    )

    /**
     * Reports the space before the contents of a given comment if it's invalid.
     * @param {ParsedHTMLComment} comment - comment data.
     * @returns {void}
     */
    function checkCommentOpen(comment) {
      const { value, openDecoration, open } = comment
      if (!value) {
        return
      }
      const beforeToken = openDecoration || open
      if (beforeToken.loc.end.line !== value.loc.start.line) {
        // Ignore newline
        return
      }

      if (requireSpace) {
        if (beforeToken.range[1] < value.range[0]) {
          // Is valid
          return
        }
        context.report({
          loc: {
            start: beforeToken.loc.end,
            end: value.loc.start
          },
          messageId: openDecoration
            ? 'expectedAfterExceptionBlock'
            : 'expectedAfterHTMLCommentOpen',
          fix: openDecoration
            ? undefined
            : (fixer) => fixer.insertTextAfter(beforeToken, ' ')
        })
      } else {
        if (openDecoration) {
          // Ignore expection block
          return
        }
        if (beforeToken.range[1] === value.range[0]) {
          // Is valid
          return
        }
        context.report({
          loc: {
            start: beforeToken.loc.end,
            end: value.loc.start
          },
          messageId: 'unexpectedAfterHTMLCommentOpen',
          fix: (fixer) =>
            fixer.removeRange([beforeToken.range[1], value.range[0]])
        })
      }
    }

    /**
     * Reports the space after the contents of a given comment if it's invalid.
     * @param {ParsedHTMLComment} comment - comment data.
     * @returns {void}
     */
    function checkCommentClose(comment) {
      const { value, closeDecoration, close } = comment
      if (!value) {
        return
      }
      const afterToken = closeDecoration || close
      if (value.loc.end.line !== afterToken.loc.start.line) {
        // Ignore newline
        return
      }

      if (requireSpace) {
        if (value.range[1] < afterToken.range[0]) {
          // Is valid
          return
        }
        context.report({
          loc: {
            start: value.loc.end,
            end: afterToken.loc.start
          },
          messageId: closeDecoration
            ? 'expectedBeforeExceptionBlock'
            : 'expectedBeforeHTMLCommentOpen',
          fix: closeDecoration
            ? undefined
            : (fixer) => fixer.insertTextBefore(afterToken, ' ')
        })
      } else {
        if (closeDecoration) {
          // Ignore expection block
          return
        }
        if (value.range[1] === afterToken.range[0]) {
          // Is valid
          return
        }
        context.report({
          loc: {
            start: value.loc.end,
            end: afterToken.loc.start
          },
          messageId: 'unexpectedBeforeHTMLCommentOpen',
          fix: (fixer) =>
            fixer.removeRange([value.range[1], afterToken.range[0]])
        })
      }
    }
  }
}

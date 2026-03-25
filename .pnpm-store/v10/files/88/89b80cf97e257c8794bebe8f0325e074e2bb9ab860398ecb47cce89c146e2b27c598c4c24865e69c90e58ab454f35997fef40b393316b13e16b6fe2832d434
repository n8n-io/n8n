/**
 * @fileoverview enforce unified spacing in mustache interpolations.
 * @author Armano
 */
'use strict'

const utils = require('../utils')

module.exports = {
  meta: {
    type: 'layout',
    docs: {
      description: 'enforce unified spacing in mustache interpolations',
      categories: ['vue3-strongly-recommended', 'vue2-strongly-recommended'],
      url: 'https://eslint.vuejs.org/rules/mustache-interpolation-spacing.html'
    },
    fixable: 'whitespace',
    schema: [
      {
        enum: ['always', 'never']
      }
    ],
    messages: {
      expectedSpaceAfter: "Expected 1 space after '{{', but not found.",
      expectedSpaceBefore: "Expected 1 space before '}}', but not found.",
      unexpectedSpaceAfter: "Expected no space after '{{', but found.",
      unexpectedSpaceBefore: "Expected no space before '}}', but found."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const options = context.options[0] || 'always'
    const sourceCode = context.getSourceCode()
    const template =
      sourceCode.parserServices.getTemplateBodyTokenStore &&
      sourceCode.parserServices.getTemplateBodyTokenStore()

    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VExpressionContainer} node */
      'VExpressionContainer[expression!=null]'(node) {
        const openBrace = template.getFirstToken(node)
        const closeBrace = template.getLastToken(node)

        if (
          !openBrace ||
          !closeBrace ||
          openBrace.type !== 'VExpressionStart' ||
          closeBrace.type !== 'VExpressionEnd'
        ) {
          return
        }

        const firstToken = template.getTokenAfter(openBrace, {
          includeComments: true
        })
        const lastToken = template.getTokenBefore(closeBrace, {
          includeComments: true
        })

        if (options === 'always') {
          if (openBrace.range[1] === firstToken.range[0]) {
            context.report({
              node: openBrace,
              messageId: 'expectedSpaceAfter',
              fix: (fixer) => fixer.insertTextAfter(openBrace, ' ')
            })
          }
          if (closeBrace.range[0] === lastToken.range[1]) {
            context.report({
              node: closeBrace,
              messageId: 'expectedSpaceBefore',
              fix: (fixer) => fixer.insertTextBefore(closeBrace, ' ')
            })
          }
        } else {
          if (openBrace.range[1] !== firstToken.range[0]) {
            context.report({
              loc: {
                start: openBrace.loc.start,
                end: firstToken.loc.start
              },
              messageId: 'unexpectedSpaceAfter',
              fix: (fixer) =>
                fixer.removeRange([openBrace.range[1], firstToken.range[0]])
            })
          }
          if (closeBrace.range[0] !== lastToken.range[1]) {
            context.report({
              loc: {
                start: lastToken.loc.end,
                end: closeBrace.loc.end
              },
              messageId: 'unexpectedSpaceBefore',
              fix: (fixer) =>
                fixer.removeRange([lastToken.range[1], closeBrace.range[0]])
            })
          }
        }
      }
    })
  }
}

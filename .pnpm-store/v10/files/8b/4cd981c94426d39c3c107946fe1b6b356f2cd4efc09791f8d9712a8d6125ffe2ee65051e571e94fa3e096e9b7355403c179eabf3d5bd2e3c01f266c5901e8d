/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

/**
 * @param {number} lineBreaks
 */
function getPhrase(lineBreaks) {
  switch (lineBreaks) {
    case 0: {
      return 'no line breaks'
    }
    case 1: {
      return '1 line break'
    }
    default: {
      return `${lineBreaks} line breaks`
    }
  }
}

/**
 * @typedef LineBreakBehavior
 * @type {('always'|'never')}
 */

/**
 * @typedef LineType
 * @type {('singleline'|'multiline')}
 */

/**
 * @typedef RuleOptions
 * @type {object}
 * @property {LineBreakBehavior} singleline - The behavior for single line tags.
 * @property {LineBreakBehavior} multiline - The behavior for multiline tags.
 * @property {object} selfClosingTag
 * @property {LineBreakBehavior} selfClosingTag.singleline - The behavior for single line self closing tags.
 * @property {LineBreakBehavior} selfClosingTag.multiline - The behavior for multiline self closing tags.
 */

/**
 * @param {VStartTag | VEndTag} node - The node representing a start or end tag.
 * @param {RuleOptions} options - The options for line breaks.
 * @param {LineType} type - The type of line break.
 * @returns {number} - The expected line breaks.
 */
function getExpectedLineBreaks(node, options, type) {
  const isSelfClosingTag = node.type === 'VStartTag' && node.selfClosing
  if (
    isSelfClosingTag &&
    options.selfClosingTag &&
    options.selfClosingTag[type]
  ) {
    return options.selfClosingTag[type] === 'always' ? 1 : 0
  }

  return options[type] === 'always' ? 1 : 0
}

module.exports = {
  meta: {
    type: 'layout',
    docs: {
      description:
        "require or disallow a line break before tag's closing brackets",
      categories: ['vue3-strongly-recommended', 'vue2-strongly-recommended'],
      url: 'https://eslint.vuejs.org/rules/html-closing-bracket-newline.html'
    },
    fixable: 'whitespace',
    schema: [
      {
        type: 'object',
        properties: {
          singleline: { enum: ['always', 'never'] },
          multiline: { enum: ['always', 'never'] },
          selfClosingTag: {
            type: 'object',
            properties: {
              singleline: { enum: ['always', 'never'] },
              multiline: { enum: ['always', 'never'] }
            },
            additionalProperties: false,
            minProperties: 1
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      expectedBeforeClosingBracket:
        'Expected {{expected}} before closing bracket, but {{actual}} found.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const options = Object.assign(
      {},
      {
        singleline: 'never',
        multiline: 'always'
      },
      context.options[0] || {}
    )
    const sourceCode = context.getSourceCode()
    const template =
      sourceCode.parserServices.getTemplateBodyTokenStore &&
      sourceCode.parserServices.getTemplateBodyTokenStore()

    return utils.defineDocumentVisitor(context, {
      /** @param {VStartTag | VEndTag} node */
      'VStartTag, VEndTag'(node) {
        const closingBracketToken = template.getLastToken(node)
        if (
          closingBracketToken.type !== 'HTMLSelfClosingTagClose' &&
          closingBracketToken.type !== 'HTMLTagClose'
        ) {
          return
        }

        const prevToken = template.getTokenBefore(closingBracketToken)
        const type =
          node.loc.start.line === prevToken.loc.end.line
            ? 'singleline'
            : 'multiline'

        const expectedLineBreaks = getExpectedLineBreaks(node, options, type)

        const actualLineBreaks =
          closingBracketToken.loc.start.line - prevToken.loc.end.line

        if (actualLineBreaks !== expectedLineBreaks) {
          context.report({
            node,
            loc: {
              start: prevToken.loc.end,
              end: closingBracketToken.loc.start
            },
            messageId: 'expectedBeforeClosingBracket',
            data: {
              expected: getPhrase(expectedLineBreaks),
              actual: getPhrase(actualLineBreaks)
            },
            fix(fixer) {
              /** @type {Range} */
              const range = [prevToken.range[1], closingBracketToken.range[0]]
              const text = '\n'.repeat(expectedLineBreaks)
              return fixer.replaceTextRange(range, text)
            }
          })
        }
      }
    })
  }
}

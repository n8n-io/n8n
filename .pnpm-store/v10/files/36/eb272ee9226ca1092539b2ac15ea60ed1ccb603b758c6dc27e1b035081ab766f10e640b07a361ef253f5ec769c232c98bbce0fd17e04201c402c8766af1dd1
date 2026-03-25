/**
 * @fileoverview disallow using deprecated object declaration on data
 * @author yoyo930021
 */
'use strict'

const utils = require('../utils')

/** @param {Token} token */
function isOpenParen(token) {
  return token.type === 'Punctuator' && token.value === '('
}

/** @param {Token} token */
function isCloseParen(token) {
  return token.type === 'Punctuator' && token.value === ')'
}

/**
 * @param {Expression} node
 * @param {SourceCode} sourceCode
 */
function getFirstAndLastTokens(node, sourceCode) {
  let first = sourceCode.getFirstToken(node)
  let last = sourceCode.getLastToken(node)

  // If the value enclosed by parentheses, update the 'first' and 'last' by the parentheses.
  while (true) {
    const prev = sourceCode.getTokenBefore(first)
    const next = sourceCode.getTokenAfter(last)
    if (isOpenParen(prev) && isCloseParen(next)) {
      first = prev
      last = next
    } else {
      return { first, last }
    }
  }
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow using deprecated object declaration on data (in Vue.js 3.0.0+)',
      categories: ['vue3-essential'],
      url: 'https://eslint.vuejs.org/rules/no-deprecated-data-object-declaration.html'
    },
    fixable: 'code',
    schema: [],
    messages: {
      objectDeclarationIsDeprecated:
        "Object declaration on 'data' property is deprecated. Using function declaration instead."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const sourceCode = context.getSourceCode()

    return utils.executeOnVue(context, (obj) => {
      const invalidData = utils.findProperty(
        obj,
        'data',
        (p) =>
          p.value.type !== 'FunctionExpression' &&
          p.value.type !== 'ArrowFunctionExpression' &&
          p.value.type !== 'Identifier'
      )

      if (invalidData) {
        context.report({
          node: invalidData,
          messageId: 'objectDeclarationIsDeprecated',
          fix(fixer) {
            const tokens = getFirstAndLastTokens(invalidData.value, sourceCode)

            return [
              fixer.insertTextBefore(tokens.first, 'function() {\nreturn '),
              fixer.insertTextAfter(tokens.last, ';\n}')
            ]
          }
        })
      }
    })
  }
}

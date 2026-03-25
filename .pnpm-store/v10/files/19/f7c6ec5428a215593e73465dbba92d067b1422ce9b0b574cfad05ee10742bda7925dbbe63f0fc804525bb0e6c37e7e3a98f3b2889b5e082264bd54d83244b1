/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

/**
 * Strip quotes string
 * @param {string} text
 * @returns {string|null}
 */
function stripQuotesForHTML(text) {
  if (
    (text[0] === '"' || text[0] === "'" || text[0] === '`') &&
    text[0] === text[text.length - 1]
  ) {
    return text.slice(1, -1)
  }

  const re =
    /^(?:&(?:quot|apos|#\d+|#x[\da-f]+);|["'`])([\s\S]*)(?:&(?:quot|apos|#\d+|#x[\da-f]+);|["'`])$/u.exec(
      text
    )
  if (!re) {
    return null
  }
  return re[1]
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow unnecessary mustache interpolations',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/no-useless-mustaches.html'
    },
    fixable: 'code',
    schema: [
      {
        type: 'object',
        properties: {
          ignoreIncludesComment: {
            type: 'boolean'
          },
          ignoreStringEscape: {
            type: 'boolean'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      unexpected:
        'Unexpected mustache interpolation with a string literal value.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const opts = context.options[0] || {}
    const ignoreIncludesComment = opts.ignoreIncludesComment
    const ignoreStringEscape = opts.ignoreStringEscape
    const sourceCode = context.getSourceCode()

    /**
     * Report if the value expression is string literals
     * @param {VExpressionContainer} node the node to check
     */
    function verify(node) {
      const { expression } = node
      if (!expression) {
        return
      }
      /** @type {string} */
      let strValue
      /** @type {string} */
      let rawValue
      if (expression.type === 'Literal') {
        if (typeof expression.value !== 'string') {
          return
        }
        strValue = expression.value
        rawValue = sourceCode.getText(expression).slice(1, -1)
      } else if (expression.type === 'TemplateLiteral') {
        if (expression.expressions.length > 0) {
          return
        }
        strValue = expression.quasis[0].value.cooked
        rawValue = expression.quasis[0].value.raw
      } else {
        return
      }
      const tokenStore = sourceCode.parserServices.getTemplateBodyTokenStore()
      const hasComment = tokenStore
        .getTokens(node, { includeComments: true })
        .some((t) => t.type === 'Block' || t.type === 'Line')
      if (ignoreIncludesComment && hasComment) {
        return
      }

      let hasEscape = false
      if (rawValue !== strValue) {
        // check escapes
        const chars = [...rawValue]
        let c = chars.shift()
        while (c) {
          if (c === '\\') {
            c = chars.shift()
            if (
              c == null ||
              // ignore "\\", '"', "'", "`" and "$"
              'nrvtbfux'.includes(c)
            ) {
              // has useful escape.
              hasEscape = true
              break
            }
          }
          c = chars.shift()
        }
      }
      if (ignoreStringEscape && hasEscape) {
        return
      }

      context.report({
        node,
        messageId: 'unexpected',
        fix(fixer) {
          if (hasComment || hasEscape) {
            // cannot fix
            return null
          }
          const text = stripQuotesForHTML(sourceCode.getText(expression))
          if (text == null) {
            // unknowns
            return null
          }
          if (text.includes('\n') || /^\s|\s$/u.test(text)) {
            // It doesn't autofix because another rule like indent or eol space might remove spaces.
            return null
          }
          const escaped = text.replace(/</g, '&lt;')

          return fixer.replaceText(node, escaped.replace(/\\([\S\s])/g, '$1'))
        }
      })
    }

    return utils.defineTemplateBodyVisitor(context, {
      'VElement > VExpressionContainer': verify
    })
  }
}

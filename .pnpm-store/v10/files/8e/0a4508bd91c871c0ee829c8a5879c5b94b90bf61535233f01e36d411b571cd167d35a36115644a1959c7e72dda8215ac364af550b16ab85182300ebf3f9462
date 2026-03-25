/**
 * @fileoverview Enforce new lines between multi-line properties in Vue components.
 * @author IWANABETHATGUY
 */
'use strict'

const utils = require('../utils')

/**
 * @param {Token} node
 */
function isComma(node) {
  return node.type === 'Punctuator' && node.value === ','
}

/**
 * Check whether the between given nodes has empty line.
 * @param {SourceCode} sourceCode
 * @param {ASTNode} pre
 * @param {ASTNode} cur
 */
function* iterateBetweenTokens(sourceCode, pre, cur) {
  yield sourceCode.getLastToken(pre)
  yield* sourceCode.getTokensBetween(pre, cur, {
    includeComments: true
  })
  yield sourceCode.getFirstToken(cur)
}

/**
 * Check whether the between given nodes has empty line.
 * @param {SourceCode} sourceCode
 * @param {ASTNode} pre
 * @param {ASTNode} cur
 */
function hasEmptyLine(sourceCode, pre, cur) {
  /** @type {Token|null} */
  let preToken = null
  for (const token of iterateBetweenTokens(sourceCode, pre, cur)) {
    if (preToken && token.loc.start.line - preToken.loc.end.line >= 2) {
      return true
    }
    preToken = token
  }
  return false
}

module.exports = {
  meta: {
    type: 'layout',
    docs: {
      description:
        'enforce new lines between multi-line properties in Vue components',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/new-line-between-multi-line-property.html'
    },
    fixable: 'whitespace',
    schema: [
      {
        type: 'object',
        properties: {
          // number of line you want to insert after multi-line property
          minLineOfMultilineProperty: {
            type: 'number',
            minimum: 2
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      missingEmptyLine:
        'Enforce new lines between multi-line properties in Vue components.'
    }
  },

  /** @param {RuleContext} context */
  create(context) {
    let minLineOfMultilineProperty = 2
    if (
      context.options &&
      context.options[0] &&
      context.options[0].minLineOfMultilineProperty
    ) {
      minLineOfMultilineProperty = context.options[0].minLineOfMultilineProperty
    }

    /** @type {CallExpression[]} */
    const callStack = []
    const sourceCode = context.getSourceCode()
    return Object.assign(
      utils.defineVueVisitor(context, {
        CallExpression(node) {
          callStack.push(node)
        },
        'CallExpression:exit'() {
          callStack.pop()
        },

        /**
         * @param {ObjectExpression} node
         */
        ObjectExpression(node) {
          if (callStack.length > 0) {
            return
          }
          const properties = node.properties
          for (let i = 1; i < properties.length; i++) {
            const cur = properties[i]
            const pre = properties[i - 1]

            const lineCountOfPreProperty =
              pre.loc.end.line - pre.loc.start.line + 1
            if (lineCountOfPreProperty < minLineOfMultilineProperty) {
              continue
            }

            if (hasEmptyLine(sourceCode, pre, cur)) {
              continue
            }

            context.report({
              node: pre,
              loc: {
                start: pre.loc.end,
                end: cur.loc.start
              },
              messageId: 'missingEmptyLine',
              fix(fixer) {
                /** @type {Token|null} */
                let preToken = null
                for (const token of iterateBetweenTokens(
                  sourceCode,
                  pre,
                  cur
                )) {
                  if (
                    preToken &&
                    preToken.loc.end.line < token.loc.start.line
                  ) {
                    return fixer.insertTextAfter(preToken, '\n')
                  }
                  preToken = token
                }
                const commaToken = sourceCode.getTokenAfter(pre, isComma)
                return fixer.insertTextAfter(commaToken || pre, '\n\n')
              }
            })
          }
        }
      })
    )
  }
}

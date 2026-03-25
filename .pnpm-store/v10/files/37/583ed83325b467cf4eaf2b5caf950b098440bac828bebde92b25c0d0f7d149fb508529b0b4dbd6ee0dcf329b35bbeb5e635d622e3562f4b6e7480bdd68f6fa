/**
 * @author Toru Nagashima
 * See LICENSE file in root directory for full license.
 */
'use strict'

const indentCommon = require('../utils/indent-common')

module.exports = {
  // eslint-disable-next-line eslint-plugin/prefer-message-ids
  meta: {
    type: 'layout',
    docs: {
      description: 'enforce consistent indentation in `<script>`',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/script-indent.html'
    },
    // eslint-disable-next-line eslint-plugin/require-meta-fixable -- fixer is not recognized
    fixable: 'whitespace',
    schema: [
      {
        oneOf: [{ type: 'integer', minimum: 1 }, { enum: ['tab'] }]
      },
      {
        type: 'object',
        properties: {
          baseIndent: { type: 'integer', minimum: 0 },
          switchCase: { type: 'integer', minimum: 0 },
          ignores: {
            type: 'array',
            items: {
              allOf: [
                { type: 'string' },
                { not: { type: 'string', pattern: ':exit$' } },
                { not: { type: 'string', pattern: String.raw`^\s*$` } }
              ]
            },
            uniqueItems: true,
            additionalItems: false
          }
        },
        additionalProperties: false
      }
    ]
  },
  /** @param {RuleContext} context */
  create(context) {
    return indentCommon.defineVisitor(context, context.getSourceCode(), {})
  }
}

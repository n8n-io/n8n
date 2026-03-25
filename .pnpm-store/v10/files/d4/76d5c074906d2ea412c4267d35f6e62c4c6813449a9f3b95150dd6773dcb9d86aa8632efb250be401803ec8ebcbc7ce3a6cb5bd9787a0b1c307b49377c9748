/**
 * @author Przemyslaw Falowski (@przemkow)
 * @fileoverview disallow using deprecated filters syntax
 */
'use strict'

const utils = require('../utils')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow using deprecated filters syntax (in Vue.js 3.0.0+)',
      categories: ['vue3-essential'],
      url: 'https://eslint.vuejs.org/rules/no-deprecated-filter.html'
    },
    fixable: null,
    schema: [],
    messages: {
      noDeprecatedFilter: 'Filters are deprecated.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return utils.defineTemplateBodyVisitor(context, {
      VFilterSequenceExpression(node) {
        context.report({
          node,
          loc: node.loc,
          messageId: 'noDeprecatedFilter'
        })
      }
    })
  }
}

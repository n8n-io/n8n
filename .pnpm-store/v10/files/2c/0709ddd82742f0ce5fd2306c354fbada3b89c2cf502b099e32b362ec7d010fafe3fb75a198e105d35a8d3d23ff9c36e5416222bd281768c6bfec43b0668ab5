/**
 * @author Toru Nagashima
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow mustaches in `<textarea>`',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/no-textarea-mustache.html'
    },
    fixable: null,
    schema: [],
    messages: {
      unexpected: "Unexpected mustache. Use 'v-model' instead."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VExpressionContainer} node */
      "VElement[rawName='textarea'] VExpressionContainer"(node) {
        if (node.parent.type !== 'VElement') {
          return
        }

        context.report({
          node,
          loc: node.loc,
          messageId: 'unexpected'
        })
      }
    })
  }
}

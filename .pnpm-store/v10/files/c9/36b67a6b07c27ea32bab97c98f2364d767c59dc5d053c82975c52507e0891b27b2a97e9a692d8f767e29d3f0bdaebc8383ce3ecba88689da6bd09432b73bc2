/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow using deprecated `inline-template` attribute (in Vue.js 3.0.0+)',
      categories: ['vue3-essential'],
      url: 'https://eslint.vuejs.org/rules/no-deprecated-inline-template.html'
    },
    fixable: null,
    schema: [],
    messages: {
      unexpected: '`inline-template` are deprecated.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VIdentifier} node */
      "VAttribute[directive=false] > VIdentifier[rawName='inline-template']"(
        node
      ) {
        context.report({
          node,
          loc: node.loc,
          messageId: 'unexpected'
        })
      }
    })
  }
}

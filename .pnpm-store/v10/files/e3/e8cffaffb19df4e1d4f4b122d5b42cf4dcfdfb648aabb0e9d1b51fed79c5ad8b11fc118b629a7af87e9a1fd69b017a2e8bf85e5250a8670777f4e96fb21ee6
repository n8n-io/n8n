/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const slotScopeAttribute = require('./syntaxes/slot-scope-attribute')

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'disallow deprecated `slot-scope` attribute (in Vue.js 2.6.0+)',
      categories: ['vue3-essential'],
      url: 'https://eslint.vuejs.org/rules/no-deprecated-slot-scope-attribute.html'
    },
    // eslint-disable-next-line eslint-plugin/require-meta-fixable -- fixer is not recognized
    fixable: 'code',
    schema: [],
    messages: {
      forbiddenSlotScopeAttribute: '`slot-scope` are deprecated.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const templateBodyVisitor = slotScopeAttribute.createTemplateBodyVisitor(
      context,
      { fixToUpgrade: true }
    )
    return utils.defineTemplateBodyVisitor(context, templateBodyVisitor)
  }
}

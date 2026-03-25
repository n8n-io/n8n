/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const vIs = require('./syntaxes/v-is')

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow deprecated `v-is` directive (in Vue.js 3.1.0+)',
      categories: ['vue3-essential'],
      url: 'https://eslint.vuejs.org/rules/no-deprecated-v-is.html'
    },
    fixable: null,
    schema: [],
    messages: {
      forbiddenVIs: '`v-is` directive is deprecated.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const templateBodyVisitor = vIs.createTemplateBodyVisitor(context)
    return utils.defineTemplateBodyVisitor(context, templateBodyVisitor)
  }
}

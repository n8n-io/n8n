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
        'disallow using deprecated `.native` modifiers (in Vue.js 3.0.0+)',
      categories: ['vue3-essential'],
      url: 'https://eslint.vuejs.org/rules/no-deprecated-v-on-native-modifier.html'
    },
    fixable: null,
    schema: [],
    messages: {
      deprecated: "'.native' modifier on 'v-on' directive is deprecated."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VIdentifier & {parent:VDirectiveKey} } node */
      "VAttribute[directive=true][key.name.name='on'] > VDirectiveKey > VIdentifier[name='native']"(
        node
      ) {
        const key = node.parent
        if (!key.modifiers.includes(node)) return

        context.report({
          node,
          messageId: 'deprecated'
        })
      }
    })
  }
}

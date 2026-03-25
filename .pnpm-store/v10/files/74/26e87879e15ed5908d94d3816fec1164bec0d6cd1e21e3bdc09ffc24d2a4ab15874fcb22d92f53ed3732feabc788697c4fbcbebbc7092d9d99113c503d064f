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
      description: 'require `v-bind:is` of `<component>` elements',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/require-component-is.html'
    },
    fixable: null,
    schema: [],
    messages: {
      requireComponentIs:
        "Expected '<component>' elements to have 'v-bind:is' attribute."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VElement} node */
      "VElement[name='component']"(node) {
        if (!utils.hasDirective(node, 'bind', 'is')) {
          context.report({
            node,
            loc: node.loc,
            messageId: 'requireComponentIs'
          })
        }
      }
    })
  }
}

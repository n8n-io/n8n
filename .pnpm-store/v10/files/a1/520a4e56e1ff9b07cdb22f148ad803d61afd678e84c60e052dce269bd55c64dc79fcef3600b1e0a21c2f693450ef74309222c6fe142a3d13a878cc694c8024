/**
 * @author Toru Nagashima
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

const VALID_MODIFIERS = new Set(['prop', 'camel', 'sync', 'attr'])

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce valid `v-bind` directives',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/valid-v-bind.html'
    },
    fixable: null,
    schema: [],
    messages: {
      unsupportedModifier:
        "'v-bind' directives don't support the modifier '{{name}}'.",
      expectedValue: "'v-bind' directives require an attribute value."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VDirective} node */
      "VAttribute[directive=true][key.name.name='bind']"(node) {
        for (const modifier of node.key.modifiers) {
          if (!VALID_MODIFIERS.has(modifier.name)) {
            context.report({
              node: modifier,
              messageId: 'unsupportedModifier',
              data: { name: modifier.name }
            })
          }
        }

        if (!node.value || utils.isEmptyValueDirective(node, context)) {
          context.report({
            node,
            messageId: 'expectedValue'
          })
        }
      }
    })
  }
}

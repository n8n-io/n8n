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
      description: 'enforce valid `v-if` directives',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/valid-v-if.html'
    },
    fixable: null,
    schema: [],
    messages: {
      withVElse:
        "'v-if' and 'v-else' directives can't exist on the same element. You may want 'v-else-if' directives.",
      withVElseIf:
        "'v-if' and 'v-else-if' directives can't exist on the same element.",
      unexpectedArgument: "'v-if' directives require no argument.",
      unexpectedModifier: "'v-if' directives require no modifier.",
      expectedValue: "'v-if' directives require that attribute value."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VDirective} node */
      "VAttribute[directive=true][key.name.name='if']"(node) {
        const element = node.parent.parent

        if (utils.hasDirective(element, 'else')) {
          context.report({
            node,
            messageId: 'withVElse'
          })
        }
        if (utils.hasDirective(element, 'else-if')) {
          context.report({
            node,
            messageId: 'withVElseIf'
          })
        }
        if (node.key.argument) {
          context.report({
            node: node.key.argument,
            messageId: 'unexpectedArgument'
          })
        }
        if (node.key.modifiers.length > 0) {
          context.report({
            node,
            loc: {
              start: node.key.modifiers[0].loc.start,
              end: node.key.modifiers[node.key.modifiers.length - 1].loc.end
            },
            messageId: 'unexpectedModifier'
          })
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

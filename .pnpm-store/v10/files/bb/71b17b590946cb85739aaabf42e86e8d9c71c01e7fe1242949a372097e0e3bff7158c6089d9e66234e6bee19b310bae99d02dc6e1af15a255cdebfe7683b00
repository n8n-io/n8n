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
      description: 'enforce valid `v-else-if` directives',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/valid-v-else-if.html'
    },
    fixable: null,
    schema: [],
    messages: {
      missingVIf:
        "'v-else-if' directives require being preceded by the element which has a 'v-if' or 'v-else-if' directive.",
      withVIf:
        "'v-else-if' and 'v-if' directives can't exist on the same element.",
      withVElse:
        "'v-else-if' and 'v-else' directives can't exist on the same element.",
      unexpectedArgument: "'v-else-if' directives require no argument.",
      unexpectedModifier: "'v-else-if' directives require no modifier.",
      expectedValue: "'v-else-if' directives require that attribute value."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VDirective} node */
      "VAttribute[directive=true][key.name.name='else-if']"(node) {
        const element = node.parent.parent

        if (!utils.prevElementHasIf(element)) {
          context.report({
            node,
            messageId: 'missingVIf'
          })
        }
        if (utils.hasDirective(element, 'if')) {
          context.report({
            node,
            messageId: 'withVIf'
          })
        }
        if (utils.hasDirective(element, 'else')) {
          context.report({
            node,
            messageId: 'withVElse'
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

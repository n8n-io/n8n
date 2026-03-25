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
      description: 'require `v-bind:key` with `v-for` directives',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/require-v-for-key.html'
    },
    fixable: null,
    schema: [],
    messages: {
      requireKey:
        "Elements in iteration expect to have 'v-bind:key' directives."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /**
     * Check the given element about `v-bind:key` attributes.
     * @param {VElement} element The element node to check.
     */
    function checkKey(element) {
      if (utils.hasDirective(element, 'bind', 'key')) {
        return
      }
      if (element.name === 'template' || element.name === 'slot') {
        for (const child of element.children) {
          if (child.type === 'VElement') {
            checkKey(child)
          }
        }
      } else if (!utils.isCustomComponent(element)) {
        context.report({
          node: element.startTag,
          loc: element.startTag.loc,
          messageId: 'requireKey'
        })
      }
    }

    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VDirective} node */
      "VAttribute[directive=true][key.name.name='for']"(node) {
        checkKey(node.parent.parent)
      }
    })
  }
}

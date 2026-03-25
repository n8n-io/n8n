/**
 * @author Toru Nagashima
 * @copyright 2017 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce `v-on` directive style',
      categories: ['vue3-strongly-recommended', 'vue2-strongly-recommended'],
      url: 'https://eslint.vuejs.org/rules/v-on-style.html'
    },
    fixable: 'code',
    schema: [{ enum: ['shorthand', 'longform'] }],
    messages: {
      expectedShorthand: "Expected '@' instead of 'v-on:'.",
      expectedLonghand: "Expected 'v-on:' instead of '@'."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const preferShorthand = context.options[0] !== 'longform'

    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VDirective} node */
      "VAttribute[directive=true][key.name.name='on'][key.argument!=null]"(
        node
      ) {
        const shorthand = node.key.name.rawName === '@'
        if (shorthand === preferShorthand) {
          return
        }

        const pos = node.range[0]
        context.report({
          node,
          loc: node.loc,
          messageId: preferShorthand ? 'expectedShorthand' : 'expectedLonghand',
          fix: (fixer) =>
            preferShorthand
              ? fixer.replaceTextRange([pos, pos + 5], '@')
              : fixer.replaceTextRange([pos, pos + 1], 'v-on:')
        })
      }
    })
  }
}

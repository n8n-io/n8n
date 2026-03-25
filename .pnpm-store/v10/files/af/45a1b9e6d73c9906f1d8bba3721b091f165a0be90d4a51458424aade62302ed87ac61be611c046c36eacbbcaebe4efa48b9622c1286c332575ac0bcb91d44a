/**
 * @author Przemyslaw Falowski (@przemkow)
 * @fileoverview This rule checks whether v-model used on custom component do not have an argument
 */
'use strict'

const utils = require('../utils')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow adding an argument to `v-model` used in custom component',
      categories: ['vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/no-v-model-argument.html'
    },
    fixable: null,
    deprecated: true,
    schema: [],
    messages: {
      vModelRequireNoArgument: "'v-model' directives require no argument."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VDirective} node */
      "VAttribute[directive=true][key.name.name='model']"(node) {
        const element = node.parent.parent

        if (node.key.argument && utils.isCustomComponent(element)) {
          context.report({
            node,
            loc: node.loc,
            messageId: 'vModelRequireNoArgument'
          })
        }
      }
    })
  }
}

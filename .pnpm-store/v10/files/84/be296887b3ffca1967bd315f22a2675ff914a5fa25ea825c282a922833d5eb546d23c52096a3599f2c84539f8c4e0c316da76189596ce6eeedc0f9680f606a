/**
 * @author Przemyslaw Falowski (@przemkow)
 * @fileoverview This rule checks whether v-model used on the component do not have custom modifiers
 */
'use strict'

const utils = require('../utils')

const VALID_MODIFIERS = new Set(['lazy', 'number', 'trim'])

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow custom modifiers on v-model used on the component',
      categories: ['vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/no-custom-modifiers-on-v-model.html'
    },
    fixable: null,
    schema: [],
    messages: {
      notSupportedModifier:
        "'v-model' directives don't support the modifier '{{name}}'."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return utils.defineTemplateBodyVisitor(context, {
      "VAttribute[directive=true][key.name.name='model']"(node) {
        const element = node.parent.parent

        if (utils.isCustomComponent(element)) {
          for (const modifier of node.key.modifiers) {
            if (!VALID_MODIFIERS.has(modifier.name)) {
              context.report({
                node,
                loc: node.loc,
                messageId: 'notSupportedModifier',
                data: { name: modifier.name }
              })
            }
          }
        }
      }
    })
  }
}

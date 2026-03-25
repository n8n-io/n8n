/**
 * @fileoverview enforce that each component should be in its own file
 * @author Armano
 */
'use strict'
const utils = require('../utils')
const { getVueComponentDefinitionType } = require('../utils')

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce that each component should be in its own file',
      categories: ['vue3-strongly-recommended', 'vue2-strongly-recommended'],
      url: 'https://eslint.vuejs.org/rules/one-component-per-file.html'
    },
    fixable: null,
    schema: [],
    messages: {
      toManyComponents: 'There is more than one component in this file.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /** @type {ObjectExpression[]} */
    const components = []

    return Object.assign(
      {},
      utils.executeOnVueComponent(context, (node, type) => {
        if (type === 'definition') {
          const defType = getVueComponentDefinitionType(node)
          if (defType === 'mixin') {
            return
          }
        }
        components.push(node)
      }),
      {
        'Program:exit'() {
          if (components.length > 1) {
            for (const node of components) {
              context.report({
                node,
                messageId: 'toManyComponents'
              })
            }
          }
        }
      }
    )
  }
}

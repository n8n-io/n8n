/**
 * @fileoverview Enforces render function to always return value.
 * @author Armano
 */
'use strict'

const utils = require('../utils')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce render function to always return value',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/require-render-return.html'
    },
    fixable: null,
    schema: [],
    messages: {
      expectedReturn: 'Expected to return a value in render function.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /** @type {Map<ESNode, Property['key']>} */
    const renderFunctions = new Map()

    return utils.compositingVisitors(
      utils.defineVueVisitor(context, {
        onRenderFunctionEnter(node) {
          renderFunctions.set(node, node.parent.key)
        }
      }),
      utils.executeOnFunctionsWithoutReturn(true, (node) => {
        const key = renderFunctions.get(node)
        if (key) {
          context.report({
            node: key,
            messageId: 'expectedReturn'
          })
        }
      })
    )
  }
}

/**
 * @author Sosuke Suzuki
 */
'use strict'

const utils = require('../utils')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow using arrow functions to define watcher',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/no-arrow-functions-in-watch.html'
    },
    fixable: null,
    schema: [],
    messages: {
      noArrowFunctionsInWatch:
        'You should not use an arrow function to define a watcher.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return utils.executeOnVue(context, (obj) => {
      const watchNode = utils.findProperty(obj, 'watch')
      if (watchNode == null) {
        return
      }
      const watchValue = watchNode.value
      if (watchValue.type !== 'ObjectExpression') {
        return
      }
      for (const property of watchValue.properties) {
        if (property.type !== 'Property') {
          continue
        }

        for (const handler of utils.iterateWatchHandlerValues(property)) {
          if (handler.type === 'ArrowFunctionExpression') {
            context.report({
              node: handler,
              messageId: 'noArrowFunctionsInWatch'
            })
          }
        }
      }
    })
  }
}

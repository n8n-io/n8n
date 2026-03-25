/**
 * @author Wayne Zhang
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce consistent style for props destructuring',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/define-props-destructuring.html'
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          destructure: {
            enum: ['always', 'never']
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      preferDestructuring: 'Prefer destructuring from `defineProps` directly.',
      avoidDestructuring: 'Avoid destructuring from `defineProps`.',
      avoidWithDefaults: 'Avoid using `withDefaults` with destructuring.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const options = context.options[0] || {}
    const destructurePreference = options.destructure || 'always'

    return utils.compositingVisitors(
      utils.defineScriptSetupVisitor(context, {
        onDefinePropsEnter(node, props) {
          const hasNoArgs = props.filter((prop) => prop.propName).length === 0
          if (hasNoArgs) {
            return
          }

          const hasDestructure = utils.isUsingPropsDestructure(node)
          const hasWithDefaults = utils.hasWithDefaults(node)

          if (destructurePreference === 'never') {
            if (hasDestructure) {
              context.report({
                node,
                messageId: 'avoidDestructuring'
              })
            }
            return
          }

          if (!hasDestructure) {
            context.report({
              node,
              messageId: 'preferDestructuring'
            })
            return
          }

          if (hasWithDefaults) {
            context.report({
              node: node.parent.callee,
              messageId: 'avoidWithDefaults'
            })
          }
        }
      })
    )
  }
}

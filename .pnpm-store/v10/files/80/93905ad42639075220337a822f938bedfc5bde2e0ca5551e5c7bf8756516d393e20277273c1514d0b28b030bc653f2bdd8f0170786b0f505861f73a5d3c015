/**
 * @fileoverview Emit definitions should be detailed
 * @author Pig Fang
 */
'use strict'

const utils = require('../utils')

/**
 * @typedef {import('../utils').ComponentEmit} ComponentEmit
 */

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'require type definitions in emits',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/require-emit-validator.html'
    },
    fixable: null,
    hasSuggestions: true,
    schema: [],
    messages: {
      missing: 'Emit "{{name}}" should define at least its validator function.',
      skipped:
        'Emit "{{name}}" should not skip validation, or you may define a validator function with no parameters.',
      emptyValidation: 'Replace with a validator function with no parameters.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /**
     * @param {ComponentEmit} emit
     */
    function checker(emit) {
      /** @type {Expression|null} */
      let value = null
      let hasType = false
      if (emit.type === 'object') {
        value = emit.value
        hasType =
          value.type === 'ArrowFunctionExpression' ||
          value.type === 'FunctionExpression' ||
          // validator may from outer scope
          value.type === 'Identifier'
      } else if (emit.type !== 'array') {
        return
      }

      if (!hasType) {
        const { node, emitName } = emit
        const name =
          emitName ||
          (node.type === 'Identifier' && node.name) ||
          'Unknown emit'

        if (value && value.type === 'Literal' && value.value === null) {
          const valueNode = value
          context.report({
            node,
            messageId: 'skipped',
            data: { name },
            suggest: [
              {
                messageId: 'emptyValidation',
                fix: (fixer) => fixer.replaceText(valueNode, '() => true')
              }
            ]
          })

          return
        }

        context.report({
          node,
          messageId: 'missing',
          data: { name }
        })
      }
    }

    return utils.compositingVisitors(
      utils.executeOnVue(context, (obj) => {
        for (const emit of utils.getComponentEmitsFromOptions(obj)) {
          checker(emit)
        }
      }),
      utils.defineScriptSetupVisitor(context, {
        onDefineEmitsEnter(_node, emits) {
          for (const emit of emits) {
            checker(emit)
          }
        }
      })
    )
  }
}

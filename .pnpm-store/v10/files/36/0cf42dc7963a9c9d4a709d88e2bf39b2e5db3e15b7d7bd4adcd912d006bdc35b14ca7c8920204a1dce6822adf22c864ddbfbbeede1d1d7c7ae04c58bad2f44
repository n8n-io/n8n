/**
 * @author Yosuke Ota <https://github.com/ota-meshi>
 * See LICENSE file in root directory for full license.
 */
'use strict'

const { findVariable } = require('@eslint-community/eslint-utils')
const utils = require('../utils')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce valid `defineOptions` compiler macro',
      categories: ['vue3-essential'],
      url: 'https://eslint.vuejs.org/rules/valid-define-options.html'
    },
    fixable: null,
    schema: [],
    messages: {
      referencingLocally:
        '`defineOptions` is referencing locally declared variables.',
      multiple: '`defineOptions` has been called multiple times.',
      notDefined: 'Options are not defined.',
      disallowProp:
        '`defineOptions()` cannot be used to declare `{{propName}}`. Use `{{insteadMacro}}()` instead.',
      typeArgs: '`defineOptions()` cannot accept type arguments.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const scriptSetup = utils.getScriptSetupElement(context)
    if (!scriptSetup) {
      return {}
    }

    /** @type {Set<Expression | SpreadElement>} */
    const optionsDefExpressions = new Set()
    /** @type {CallExpression[]} */
    const defineOptionsNodes = []

    return utils.compositingVisitors(
      utils.defineScriptSetupVisitor(context, {
        onDefineOptionsEnter(node) {
          defineOptionsNodes.push(node)

          if (node.arguments.length > 0) {
            const define = node.arguments[0]
            if (define.type === 'ObjectExpression') {
              for (const [propName, insteadMacro] of [
                ['props', 'defineProps'],
                ['emits', 'defineEmits'],
                ['expose', 'defineExpose'],
                ['slots', 'defineSlots']
              ]) {
                const prop = utils.findProperty(define, propName)
                if (prop) {
                  context.report({
                    node,
                    messageId: 'disallowProp',
                    data: { propName, insteadMacro }
                  })
                }
              }
            }

            optionsDefExpressions.add(node.arguments[0])
          } else {
            context.report({
              node,
              messageId: 'notDefined'
            })
          }

          const typeArguments =
            'typeArguments' in node ? node.typeArguments : node.typeParameters
          if (typeArguments) {
            context.report({
              node: typeArguments,
              messageId: 'typeArgs'
            })
          }
        },
        Identifier(node) {
          for (const defineOptions of optionsDefExpressions) {
            if (utils.inRange(defineOptions.range, node)) {
              const variable = findVariable(utils.getScope(context, node), node)
              if (
                variable &&
                variable.references.some((ref) => ref.identifier === node) &&
                variable.defs.length > 0 &&
                variable.defs.every(
                  (def) =>
                    def.type !== 'ImportBinding' &&
                    utils.inRange(scriptSetup.range, def.name) &&
                    !utils.inRange(defineOptions.range, def.name)
                )
              ) {
                if (utils.withinTypeNode(node)) {
                  continue
                }
                //`defineOptions` is referencing locally declared variables.
                context.report({
                  node,
                  messageId: 'referencingLocally'
                })
              }
            }
          }
        }
      }),
      {
        'Program:exit'() {
          if (defineOptionsNodes.length > 1) {
            // `defineOptions` has been called multiple times.
            for (const node of defineOptionsNodes) {
              context.report({
                node,
                messageId: 'multiple'
              })
            }
          }
        }
      }
    )
  }
}

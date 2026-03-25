/**
 * @fileoverview enforce Promise or callback style in `nextTick`
 * @author Flo Edelmann
 * @copyright 2020 Flo Edelmann. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const { findVariable } = require('@eslint-community/eslint-utils')

/**
 * @param {Identifier} identifier
 * @param {RuleContext} context
 * @returns {CallExpression|undefined}
 */
function getVueNextTickCallExpression(identifier, context) {
  // Instance API: this.$nextTick()
  if (
    identifier.name === '$nextTick' &&
    identifier.parent.type === 'MemberExpression' &&
    utils.isThis(identifier.parent.object, context) &&
    identifier.parent.parent.type === 'CallExpression' &&
    identifier.parent.parent.callee === identifier.parent
  ) {
    return identifier.parent.parent
  }

  // Vue 2 Global API: Vue.nextTick()
  if (
    identifier.name === 'nextTick' &&
    identifier.parent.type === 'MemberExpression' &&
    identifier.parent.object.type === 'Identifier' &&
    identifier.parent.object.name === 'Vue' &&
    identifier.parent.parent.type === 'CallExpression' &&
    identifier.parent.parent.callee === identifier.parent
  ) {
    return identifier.parent.parent
  }

  // Vue 3 Global API: import { nextTick as nt } from 'vue'; nt()
  if (
    identifier.parent.type === 'CallExpression' &&
    identifier.parent.callee === identifier
  ) {
    const variable = findVariable(
      utils.getScope(context, identifier),
      identifier
    )

    if (variable != null && variable.defs.length === 1) {
      const def = variable.defs[0]
      if (
        def.type === 'ImportBinding' &&
        def.node.type === 'ImportSpecifier' &&
        def.node.imported.type === 'Identifier' &&
        def.node.imported.name === 'nextTick' &&
        def.node.parent.type === 'ImportDeclaration' &&
        def.node.parent.source.value === 'vue'
      ) {
        return identifier.parent
      }
    }
  }

  return undefined
}

/**
 * @param {CallExpression} callExpression
 * @returns {boolean}
 */
function isAwaitedPromise(callExpression) {
  return (
    callExpression.parent.type === 'AwaitExpression' ||
    (callExpression.parent.type === 'MemberExpression' &&
      callExpression.parent.property.type === 'Identifier' &&
      callExpression.parent.property.name === 'then')
  )
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce Promise or callback style in `nextTick`',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/next-tick-style.html'
    },
    fixable: 'code',
    schema: [{ enum: ['promise', 'callback'] }],
    messages: {
      usePromise:
        'Use the Promise returned by `nextTick` instead of passing a callback function.',
      useCallback:
        'Pass a callback function to `nextTick` instead of using the returned Promise.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const preferredStyle =
      /** @type {string|undefined} */ (context.options[0]) || 'promise'

    return utils.defineVueVisitor(context, {
      /** @param {Identifier} node */
      Identifier(node) {
        const callExpression = getVueNextTickCallExpression(node, context)
        if (!callExpression) {
          return
        }

        if (preferredStyle === 'callback') {
          if (
            callExpression.arguments.length !== 1 ||
            isAwaitedPromise(callExpression)
          ) {
            context.report({
              node,
              messageId: 'useCallback'
            })
          }

          return
        }

        if (
          callExpression.arguments.length > 0 ||
          !isAwaitedPromise(callExpression)
        ) {
          context.report({
            node,
            messageId: 'usePromise',
            fix(fixer) {
              return fixer.insertTextAfter(node, '().then')
            }
          })
        }
      }
    })
  }
}

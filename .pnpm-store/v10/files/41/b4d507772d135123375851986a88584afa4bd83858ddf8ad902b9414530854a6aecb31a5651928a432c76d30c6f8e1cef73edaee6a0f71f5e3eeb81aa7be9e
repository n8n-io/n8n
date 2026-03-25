/**
 * @fileoverview enforce valid `nextTick` function calls
 * @author Flo Edelmann
 * @copyright 2021 Flo Edelmann. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const { findVariable } = require('@eslint-community/eslint-utils')

/**
 * @param {Identifier} identifier
 * @param {RuleContext} context
 * @returns {ASTNode|undefined}
 */
function getVueNextTickNode(identifier, context) {
  // Instance API: this.$nextTick()
  if (
    identifier.name === '$nextTick' &&
    identifier.parent.type === 'MemberExpression' &&
    utils.isThis(identifier.parent.object, context)
  ) {
    return identifier.parent
  }

  // Vue 2 Global API: Vue.nextTick()
  if (
    identifier.name === 'nextTick' &&
    identifier.parent.type === 'MemberExpression' &&
    identifier.parent.object.type === 'Identifier' &&
    identifier.parent.object.name === 'Vue'
  ) {
    return identifier.parent
  }

  // Vue 3 Global API: import { nextTick as nt } from 'vue'; nt()
  const variable = findVariable(utils.getScope(context, identifier), identifier)

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
      return identifier
    }
  }

  return undefined
}

/**
 * @param {CallExpression} callExpression
 * @returns {boolean}
 */
function isAwaitedPromise(callExpression) {
  if (callExpression.parent.type === 'AwaitExpression') {
    // cases like `await nextTick()`
    return true
  }

  if (callExpression.parent.type === 'ReturnStatement') {
    // cases like `return nextTick()`
    return true
  }
  if (
    callExpression.parent.type === 'ArrowFunctionExpression' &&
    callExpression.parent.body === callExpression
  ) {
    // cases like `() => nextTick()`
    return true
  }

  if (
    callExpression.parent.type === 'MemberExpression' &&
    callExpression.parent.property.type === 'Identifier' &&
    callExpression.parent.property.name === 'then'
  ) {
    // cases like `nextTick().then()`
    return true
  }

  if (
    callExpression.parent.type === 'VariableDeclarator' ||
    callExpression.parent.type === 'AssignmentExpression'
  ) {
    // cases like `let foo = nextTick()` or `foo = nextTick()`
    return true
  }

  if (
    callExpression.parent.type === 'ArrayExpression' &&
    callExpression.parent.parent.type === 'CallExpression' &&
    callExpression.parent.parent.callee.type === 'MemberExpression' &&
    callExpression.parent.parent.callee.object.type === 'Identifier' &&
    callExpression.parent.parent.callee.object.name === 'Promise' &&
    callExpression.parent.parent.callee.property.type === 'Identifier'
  ) {
    // cases like `Promise.all([nextTick()])`
    return true
  }

  return false
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'enforce valid `nextTick` function calls',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/valid-next-tick.html'
    },
    fixable: 'code',
    hasSuggestions: true,
    schema: [],
    messages: {
      shouldBeFunction: '`nextTick` is a function.',
      missingCallbackOrAwait:
        'Await the Promise returned by `nextTick` or pass a callback function.',
      addAwait: 'Add missing `await` statement.',
      tooManyParameters: '`nextTick` expects zero or one parameters.',
      eitherAwaitOrCallback:
        'Either await the Promise or pass a callback function to `nextTick`.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return utils.defineVueVisitor(context, {
      /** @param {Identifier} node */
      Identifier(node) {
        const nextTickNode = getVueNextTickNode(node, context)
        if (!nextTickNode || !nextTickNode.parent) {
          return
        }

        let parentNode = nextTickNode.parent

        // skip conditional expressions like `foo ? nextTick : bar`
        if (parentNode.type === 'ConditionalExpression') {
          parentNode = parentNode.parent
        }

        if (
          parentNode.type === 'CallExpression' &&
          parentNode.callee !== nextTickNode
        ) {
          // cases like `foo.then(nextTick)` are allowed
          return
        }

        if (
          parentNode.type === 'VariableDeclarator' ||
          parentNode.type === 'AssignmentExpression'
        ) {
          // cases like `let foo = nextTick` or `foo = nextTick` are allowed
          return
        }

        if (parentNode.type !== 'CallExpression') {
          context.report({
            node,
            messageId: 'shouldBeFunction',
            fix(fixer) {
              return fixer.insertTextAfter(node, '()')
            }
          })
          return
        }

        if (parentNode.arguments.length === 0) {
          if (!isAwaitedPromise(parentNode)) {
            context.report({
              node,
              messageId: 'missingCallbackOrAwait',
              suggest: [
                {
                  messageId: 'addAwait',
                  fix(fixer) {
                    return fixer.insertTextBefore(parentNode, 'await ')
                  }
                }
              ]
            })
          }
          return
        }

        if (parentNode.arguments.length > 1) {
          context.report({
            node,
            messageId: 'tooManyParameters'
          })
          return
        }

        if (isAwaitedPromise(parentNode)) {
          context.report({
            node,
            messageId: 'eitherAwaitOrCallback'
          })
        }
      }
    })
  }
}

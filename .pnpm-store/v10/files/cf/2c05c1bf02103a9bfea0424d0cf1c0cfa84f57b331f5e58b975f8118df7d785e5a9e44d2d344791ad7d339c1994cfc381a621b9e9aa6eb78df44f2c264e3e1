/**
 * @fileoverview Don't use this in a beforeRouteEnter method
 * @author Przemyslaw Jan Beigert
 */
'use strict'

const utils = require('../utils')

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow `this` usage in a `beforeRouteEnter` method',
      categories: null,
      url: 'https://eslint.vuejs.org/rules/no-this-in-before-route-enter.html'
    },
    fixable: null,
    schema: [],
    messages: {
      disallow:
        "'beforeRouteEnter' does NOT have access to `this` component instance. https://router.vuejs.org/guide/advanced/navigation-guards.html#in-component-guards."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /**
     * @typedef {object} ScopeStack
     * @property {ScopeStack | null} upper
     * @property {FunctionExpression | FunctionDeclaration} node
     * @property {boolean} beforeRouteEnter
     */
    /** @type {Set<FunctionExpression>} */
    const beforeRouteEnterFunctions = new Set()
    /** @type {ScopeStack | null} */
    let scopeStack = null

    /**
     * @param {FunctionExpression | FunctionDeclaration | ArrowFunctionExpression} node
     */
    function onFunctionEnter(node) {
      if (node.type === 'ArrowFunctionExpression') {
        return
      }
      scopeStack = {
        upper: scopeStack,
        node,
        beforeRouteEnter: beforeRouteEnterFunctions.has(
          /** @type {never} */ (node)
        )
      }
    }

    /**
     * @param {FunctionExpression | FunctionDeclaration | ArrowFunctionExpression} node
     */
    function onFunctionExit(node) {
      if (scopeStack && scopeStack.node === node) {
        scopeStack = scopeStack.upper
      }
    }
    return utils.defineVueVisitor(context, {
      onVueObjectEnter(node) {
        const beforeRouteEnter = utils.findProperty(node, 'beforeRouteEnter')
        if (
          beforeRouteEnter &&
          beforeRouteEnter.value.type === 'FunctionExpression'
        ) {
          beforeRouteEnterFunctions.add(beforeRouteEnter.value)
        }
      },
      ':function': onFunctionEnter,
      ':function:exit': onFunctionExit,
      ThisExpression(node) {
        if (scopeStack && scopeStack.beforeRouteEnter) {
          context.report({
            node,
            messageId: 'disallow'
          })
        }
      }
    })
  }
}

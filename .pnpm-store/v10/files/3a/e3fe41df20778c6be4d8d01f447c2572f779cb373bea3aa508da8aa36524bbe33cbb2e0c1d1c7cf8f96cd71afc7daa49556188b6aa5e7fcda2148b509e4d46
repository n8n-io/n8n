/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'
const { ReferenceTracker } = require('@eslint-community/eslint-utils')
const utils = require('../utils')

/**
 * @param {CallExpression | ChainExpression} node
 * @returns {boolean}
 */
function isMaybeUsedStopHandle(node) {
  const parent = node.parent
  if (parent) {
    if (parent.type === 'VariableDeclarator') {
      // var foo = watch()
      return true
    }
    if (parent.type === 'AssignmentExpression') {
      // foo = watch()
      return true
    }
    if (parent.type === 'CallExpression') {
      // foo(watch())
      return true
    }
    if (parent.type === 'Property') {
      // {foo: watch()}
      return true
    }
    if (parent.type === 'ArrayExpression') {
      // [watch()]
      return true
    }
    if (parent.type === 'ChainExpression') {
      return isMaybeUsedStopHandle(parent)
    }
  }
  return false
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow asynchronously registered `watch`',
      categories: ['vue3-essential'],
      url: 'https://eslint.vuejs.org/rules/no-watch-after-await.html'
    },
    fixable: null,
    schema: [],
    messages: {
      forbidden: '`watch` is forbidden after an `await` expression.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const watchCallNodes = new Set()
    /**
     * @typedef {object} SetupScopeData
     * @property {boolean} afterAwait
     * @property {[number,number]} range
     */
    /** @type {Map<FunctionExpression | ArrowFunctionExpression | FunctionDeclaration, SetupScopeData>} */
    const setupScopes = new Map()

    /**
     * @typedef {object} ScopeStack
     * @property {ScopeStack | null} upper
     * @property {FunctionExpression | ArrowFunctionExpression | FunctionDeclaration} scopeNode
     */
    /** @type {ScopeStack | null} */
    let scopeStack = null

    return utils.compositingVisitors(
      {
        /** @param {Program} program */
        Program(program) {
          const tracker = new ReferenceTracker(utils.getScope(context, program))

          for (const { node } of utils.iterateReferencesTraceMap(tracker, {
            watch: {
              [ReferenceTracker.CALL]: true
            },
            watchEffect: {
              [ReferenceTracker.CALL]: true
            }
          })) {
            watchCallNodes.add(node)
          }
        }
      },
      utils.defineVueVisitor(context, {
        onSetupFunctionEnter(node) {
          setupScopes.set(node, {
            afterAwait: false,
            range: node.range
          })
        },
        /** @param {FunctionExpression | ArrowFunctionExpression | FunctionDeclaration} node */
        ':function'(node) {
          scopeStack = {
            upper: scopeStack,
            scopeNode: node
          }
        },
        ':function:exit'() {
          scopeStack = scopeStack && scopeStack.upper
        },
        /** @param {AwaitExpression} node */
        AwaitExpression(node) {
          if (!scopeStack) {
            return
          }
          const setupScope = setupScopes.get(scopeStack.scopeNode)
          if (!setupScope || !utils.inRange(setupScope.range, node)) {
            return
          }
          setupScope.afterAwait = true
        },
        /** @param {CallExpression} node */
        CallExpression(node) {
          if (!scopeStack) {
            return
          }
          const setupScope = setupScopes.get(scopeStack.scopeNode)
          if (
            !setupScope ||
            !setupScope.afterAwait ||
            !utils.inRange(setupScope.range, node)
          ) {
            return
          }

          if (watchCallNodes.has(node) && !isMaybeUsedStopHandle(node)) {
            context.report({
              node,
              messageId: 'forbidden'
            })
          }
        },
        onSetupFunctionExit(node) {
          setupScopes.delete(node)
        }
      })
    )
  }
}

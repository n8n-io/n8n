/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'
const { ReferenceTracker } = require('@eslint-community/eslint-utils')
const utils = require('../utils')

/**
 * @typedef {import('@eslint-community/eslint-utils').TYPES.TraceMap} TraceMap
 */

const LIFECYCLE_HOOKS = [
  'onBeforeMount',
  'onBeforeUnmount',
  'onBeforeUpdate',
  'onErrorCaptured',
  'onMounted',
  'onRenderTracked',
  'onRenderTriggered',
  'onUnmounted',
  'onUpdated',
  'onActivated',
  'onDeactivated'
]

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'disallow asynchronously registered lifecycle hooks',
      categories: ['vue3-essential'],
      url: 'https://eslint.vuejs.org/rules/no-lifecycle-after-await.html'
    },
    fixable: null,
    schema: [],
    messages: {
      forbidden: 'Lifecycle hooks are forbidden after an `await` expression.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /**
     * @typedef {object} SetupScopeData
     * @property {boolean} afterAwait
     * @property {[number,number]} range
     */
    /**
     * @typedef {object} ScopeStack
     * @property {ScopeStack | null} upper
     * @property {FunctionDeclaration | FunctionExpression | ArrowFunctionExpression} scopeNode
     */
    /** @type {Set<ESNode>} */
    const lifecycleHookCallNodes = new Set()
    /** @type {Map<FunctionDeclaration | FunctionExpression | ArrowFunctionExpression, SetupScopeData>} */
    const setupScopes = new Map()

    /** @type {ScopeStack | null} */
    let scopeStack = null

    return utils.compositingVisitors(
      {
        /** @param {Program} program */
        Program(program) {
          const tracker = new ReferenceTracker(utils.getScope(context, program))
          /** @type {TraceMap} */
          const traceMap = {}
          for (const lifecycleHook of LIFECYCLE_HOOKS) {
            traceMap[lifecycleHook] = {
              [ReferenceTracker.CALL]: true
            }
          }

          for (const { node } of utils.iterateReferencesTraceMap(
            tracker,
            traceMap
          )) {
            lifecycleHookCallNodes.add(node)
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
        /**
         * @param {FunctionExpression | FunctionDeclaration | ArrowFunctionExpression} node
         */
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

          if (lifecycleHookCallNodes.has(node)) {
            if (node.arguments.length >= 2) {
              // Has target instance. e.g. `onMounted(() => {}, instance)`
              return
            }
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

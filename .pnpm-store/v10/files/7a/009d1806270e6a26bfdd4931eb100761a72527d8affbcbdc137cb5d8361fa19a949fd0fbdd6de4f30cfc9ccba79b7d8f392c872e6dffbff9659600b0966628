/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const { findVariable } = require('@eslint-community/eslint-utils')
const utils = require('../utils')

/**
 * Get the callee member node from the given CallExpression
 * @param {CallExpression} node CallExpression
 */
function getCalleeMemberNode(node) {
  const callee = utils.skipChainExpression(node.callee)

  if (callee.type === 'MemberExpression') {
    const name = utils.getStaticPropertyName(callee)
    if (name) {
      return { name, member: callee }
    }
  }
  return null
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow asynchronously registered `expose`',
      categories: ['vue3-essential'],
      url: 'https://eslint.vuejs.org/rules/no-expose-after-await.html'
    },
    fixable: null,
    schema: [],
    messages: {
      forbidden: '`{{name}}` is forbidden after an `await` expression.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /**
     * @typedef {object} SetupScopeData
     * @property {boolean} afterAwait
     * @property {[number,number]} range
     * @property {(node: Identifier, callNode: CallExpression) => boolean} isExposeReferenceId
     * @property {(node: Identifier) => boolean} isContextReferenceId
     */
    /**
     * @typedef {object} ScopeStack
     * @property {ScopeStack | null} upper
     * @property {FunctionDeclaration | FunctionExpression | ArrowFunctionExpression | Program} scopeNode
     */
    /** @type {Map<FunctionDeclaration | FunctionExpression | ArrowFunctionExpression | Program, SetupScopeData>} */
    const setupScopes = new Map()

    /** @type {ScopeStack | null} */
    let scopeStack = null

    return utils.compositingVisitors(
      {
        /**
         * @param {Program} node
         */
        Program(node) {
          scopeStack = {
            upper: scopeStack,
            scopeNode: node
          }
        }
      },
      {
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
          const { isContextReferenceId, isExposeReferenceId } = setupScope
          if (
            node.callee.type === 'Identifier' &&
            isExposeReferenceId(node.callee, node)
          ) {
            // setup(props,{expose}) {expose()}
            context.report({
              node,
              messageId: 'forbidden',
              data: {
                name: node.callee.name
              }
            })
          } else {
            const expose = getCalleeMemberNode(node)
            if (
              expose &&
              expose.name === 'expose' &&
              expose.member.object.type === 'Identifier' &&
              isContextReferenceId(expose.member.object)
            ) {
              // setup(props,context) {context.emit()}
              context.report({
                node,
                messageId: 'forbidden',
                data: {
                  name: expose.name
                }
              })
            }
          }
        }
      },
      (() => {
        const scriptSetup = utils.getScriptSetupElement(context)
        if (!scriptSetup) {
          return {}
        }
        return {
          /**
           * @param {Program} node
           */
          Program(node) {
            setupScopes.set(node, {
              afterAwait: false,
              range: scriptSetup.range,
              isExposeReferenceId: (id, callNode) =>
                callNode.parent.type === 'ExpressionStatement' &&
                callNode.parent.parent === node &&
                id.name === 'defineExpose',
              isContextReferenceId: () => false
            })
          }
        }
      })(),
      utils.defineVueVisitor(context, {
        onSetupFunctionEnter(node) {
          const contextParam = node.params[1]
          if (!contextParam) {
            // no arguments
            return
          }
          if (contextParam.type === 'RestElement') {
            // cannot check
            return
          }
          if (contextParam.type === 'ArrayPattern') {
            // cannot check
            return
          }
          /** @type {Set<Identifier>} */
          const contextReferenceIds = new Set()
          /** @type {Set<Identifier>} */
          const exposeReferenceIds = new Set()
          if (contextParam.type === 'ObjectPattern') {
            const exposeProperty = utils.findAssignmentProperty(
              contextParam,
              'expose'
            )
            if (!exposeProperty) {
              return
            }
            const exposeParam = exposeProperty.value
            // `setup(props, {emit})`
            const variable =
              exposeParam.type === 'Identifier'
                ? findVariable(
                    utils.getScope(context, exposeParam),
                    exposeParam
                  )
                : null
            if (!variable) {
              return
            }
            for (const reference of variable.references) {
              if (!reference.isRead()) {
                continue
              }
              exposeReferenceIds.add(reference.identifier)
            }
          } else if (contextParam.type === 'Identifier') {
            // `setup(props, context)`
            const variable = findVariable(
              utils.getScope(context, contextParam),
              contextParam
            )
            if (!variable) {
              return
            }
            for (const reference of variable.references) {
              if (!reference.isRead()) {
                continue
              }
              contextReferenceIds.add(reference.identifier)
            }
          }
          setupScopes.set(node, {
            afterAwait: false,
            range: node.range,
            isExposeReferenceId: (id) => exposeReferenceIds.has(id),
            isContextReferenceId: (id) => contextReferenceIds.has(id)
          })
        },
        onSetupFunctionExit(node) {
          setupScopes.delete(node)
        }
      })
    )
  }
}

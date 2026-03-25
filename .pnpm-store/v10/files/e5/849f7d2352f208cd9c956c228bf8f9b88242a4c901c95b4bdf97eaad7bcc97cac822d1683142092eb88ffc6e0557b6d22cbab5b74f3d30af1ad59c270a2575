/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

/**
 * @param {Expression|SpreadElement|null} node
 */
function isFunctionIdentifier(node) {
  return node && node.type === 'Identifier' && node.name === 'Function'
}

/**
 * @param {Expression} node
 * @returns {boolean}
 */
function hasFunctionType(node) {
  if (isFunctionIdentifier(node)) {
    return true
  }
  if (node.type === 'ArrayExpression') {
    return node.elements.some(isFunctionIdentifier)
  }
  return false
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow deprecated `this` access in props default function (in Vue.js 3.0.0+)',
      categories: ['vue3-essential'],
      url: 'https://eslint.vuejs.org/rules/no-deprecated-props-default-this.html'
    },
    fixable: null,
    schema: [],
    messages: {
      deprecated:
        'Props default value factory functions no longer have access to `this`.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /**
     * @typedef {object} ScopeStack
     * @property {ScopeStack | null} upper
     * @property {FunctionExpression | FunctionDeclaration} node
     * @property {boolean} propDefault
     */
    /** @type {Set<FunctionExpression>} */
    const propsDefault = new Set()
    /** @type {ScopeStack | null} */
    let scopeStack = null

    /**
     * @param {FunctionExpression | FunctionDeclaration | ArrowFunctionExpression} node
     */
    function onFunctionEnter(node) {
      if (node.type === 'ArrowFunctionExpression') {
        return
      }
      if (scopeStack) {
        scopeStack = {
          upper: scopeStack,
          node,
          propDefault: false
        }
      } else if (node.type === 'FunctionExpression' && propsDefault.has(node)) {
        scopeStack = {
          upper: scopeStack,
          node,
          propDefault: true
        }
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
        for (const prop of utils.getComponentPropsFromOptions(node)) {
          if (prop.type !== 'object') {
            continue
          }
          if (prop.value.type !== 'ObjectExpression') {
            continue
          }
          const def = utils.findProperty(prop.value, 'default')
          if (!def) {
            continue
          }
          const type = utils.findProperty(prop.value, 'type')
          if (type && hasFunctionType(type.value)) {
            // ignore function type
            continue
          }
          if (def.value.type !== 'FunctionExpression') {
            continue
          }
          propsDefault.add(def.value)
        }
      },
      ':function': onFunctionEnter,
      ':function:exit': onFunctionExit,
      ThisExpression(node) {
        if (scopeStack && scopeStack.propDefault) {
          context.report({
            node,
            messageId: 'deprecated'
          })
        }
      }
    })
  }
}

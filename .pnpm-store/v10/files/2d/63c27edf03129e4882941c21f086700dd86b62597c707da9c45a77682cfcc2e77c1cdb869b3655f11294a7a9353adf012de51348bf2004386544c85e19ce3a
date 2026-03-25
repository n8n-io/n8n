/**
 * @fileoverview Check if there are no asynchronous actions inside computed properties.
 * @author Armano
 */
'use strict'
const { ReferenceTracker } = require('@eslint-community/eslint-utils')
const utils = require('../utils')

/**
 * @typedef {import('../utils').VueObjectData} VueObjectData
 * @typedef {import('../utils').VueVisitor} VueVisitor
 * @typedef {import('../utils').ComponentComputedProperty} ComponentComputedProperty
 */

const PROMISE_FUNCTIONS = new Set(['then', 'catch', 'finally'])

const PROMISE_METHODS = new Set(['all', 'race', 'reject', 'resolve'])

const TIMED_FUNCTIONS = new Set([
  'setTimeout',
  'setInterval',
  'setImmediate',
  'requestAnimationFrame'
])

/**
 * @param {CallExpression} node
 */
function isTimedFunction(node) {
  const callee = utils.skipChainExpression(node.callee)
  return (
    ((callee.type === 'Identifier' && TIMED_FUNCTIONS.has(callee.name)) ||
      (callee.type === 'MemberExpression' &&
        callee.object.type === 'Identifier' &&
        callee.object.name === 'window' &&
        TIMED_FUNCTIONS.has(utils.getStaticPropertyName(callee) || ''))) &&
    node.arguments.length > 0
  )
}

/**
 * @param {CallExpression} node
 */
function isPromise(node) {
  const callee = utils.skipChainExpression(node.callee)
  if (callee.type === 'MemberExpression') {
    const name = utils.getStaticPropertyName(callee)
    return (
      name &&
      // hello.PROMISE_FUNCTION()
      (PROMISE_FUNCTIONS.has(name) ||
        // Promise.PROMISE_METHOD()
        (callee.object.type === 'Identifier' &&
          callee.object.name === 'Promise' &&
          PROMISE_METHODS.has(name)))
    )
  }
  return false
}

/**
 * @param {CallExpression} node
 * @param {RuleContext} context
 */
function isNextTick(node, context) {
  const callee = utils.skipChainExpression(node.callee)
  if (callee.type === 'MemberExpression') {
    const name = utils.getStaticPropertyName(callee)
    return (
      (utils.isThis(callee.object, context) && name === '$nextTick') ||
      (callee.object.type === 'Identifier' &&
        callee.object.name === 'Vue' &&
        name === 'nextTick')
    )
  }
  return false
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description: 'disallow asynchronous actions in computed properties',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/no-async-in-computed-properties.html'
    },
    fixable: null,
    schema: [],
    messages: {
      unexpectedInFunction:
        'Unexpected {{expressionName}} in computed function.',
      unexpectedInProperty:
        'Unexpected {{expressionName}} in "{{propertyName}}" computed property.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    /** @type {Map<ObjectExpression, ComponentComputedProperty[]>} */
    const computedPropertiesMap = new Map()
    /** @type {(FunctionExpression | ArrowFunctionExpression)[]} */
    const computedFunctionNodes = []

    /**
     * @typedef {object} ScopeStack
     * @property {ScopeStack | null} upper
     * @property {BlockStatement | Expression} body
     */
    /** @type {ScopeStack | null} */
    let scopeStack = null

    const expressionTypes = {
      promise: 'asynchronous action',
      nextTick: 'asynchronous action',
      await: 'await operator',
      async: 'async function declaration',
      new: 'Promise object',
      timed: 'timed function'
    }

    /**
     * @param {FunctionExpression | FunctionDeclaration | ArrowFunctionExpression} node
     * @param {VueObjectData|undefined} [info]
     */
    function onFunctionEnter(node, info) {
      if (node.async) {
        verify(
          node,
          node.body,
          'async',
          info ? computedPropertiesMap.get(info.node) : null
        )
      }

      scopeStack = {
        upper: scopeStack,
        body: node.body
      }
    }

    function onFunctionExit() {
      scopeStack = scopeStack && scopeStack.upper
    }

    /**
     * @param {ESNode} node
     * @param {BlockStatement | Expression} targetBody
     * @param {keyof expressionTypes} type
     * @param {ComponentComputedProperty[]|undefined|null} computedProperties
     */
    function verify(node, targetBody, type, computedProperties) {
      for (const cp of computedProperties || []) {
        if (
          cp.value &&
          node.loc.start.line >= cp.value.loc.start.line &&
          node.loc.end.line <= cp.value.loc.end.line &&
          targetBody === cp.value
        ) {
          context.report({
            node,
            messageId: 'unexpectedInProperty',
            data: {
              expressionName: expressionTypes[type],
              propertyName: cp.key || 'unknown'
            }
          })
          return
        }
      }

      for (const cf of computedFunctionNodes) {
        if (
          node.loc.start.line >= cf.body.loc.start.line &&
          node.loc.end.line <= cf.body.loc.end.line &&
          targetBody === cf.body
        ) {
          context.report({
            node,
            messageId: 'unexpectedInFunction',
            data: {
              expressionName: expressionTypes[type]
            }
          })
          return
        }
      }
    }
    const nodeVisitor = {
      ':function': onFunctionEnter,
      ':function:exit': onFunctionExit,

      /**
       * @param {NewExpression} node
       * @param {VueObjectData|undefined} [info]
       */
      NewExpression(node, info) {
        if (!scopeStack) {
          return
        }
        if (
          node.callee.type === 'Identifier' &&
          node.callee.name === 'Promise'
        ) {
          verify(
            node,
            scopeStack.body,
            'new',
            info ? computedPropertiesMap.get(info.node) : null
          )
        }
      },

      /**
       * @param {CallExpression} node
       * @param {VueObjectData|undefined} [info]
       */
      CallExpression(node, info) {
        if (!scopeStack) {
          return
        }
        if (isPromise(node)) {
          verify(
            node,
            scopeStack.body,
            'promise',
            info ? computedPropertiesMap.get(info.node) : null
          )
        } else if (isTimedFunction(node)) {
          verify(
            node,
            scopeStack.body,
            'timed',
            info ? computedPropertiesMap.get(info.node) : null
          )
        } else if (isNextTick(node, context)) {
          verify(
            node,
            scopeStack.body,
            'nextTick',
            info ? computedPropertiesMap.get(info.node) : null
          )
        }
      },

      /**
       * @param {AwaitExpression} node
       * @param {VueObjectData|undefined} [info]
       */
      AwaitExpression(node, info) {
        if (!scopeStack) {
          return
        }
        verify(
          node,
          scopeStack.body,
          'await',
          info ? computedPropertiesMap.get(info.node) : null
        )
      }
    }

    return utils.compositingVisitors(
      {
        /** @param {Program} program */
        Program(program) {
          const tracker = new ReferenceTracker(utils.getScope(context, program))
          for (const { node } of utils.iterateReferencesTraceMap(tracker, {
            computed: {
              [ReferenceTracker.CALL]: true
            }
          })) {
            if (node.type !== 'CallExpression') {
              continue
            }

            const getter = utils.getGetterBodyFromComputedFunction(node)
            if (getter) {
              computedFunctionNodes.push(getter)
            }
          }
        }
      },
      utils.isScriptSetup(context)
        ? utils.defineScriptSetupVisitor(context, nodeVisitor)
        : utils.defineVueVisitor(context, {
            onVueObjectEnter(node) {
              computedPropertiesMap.set(node, utils.getComputedProperties(node))
            },
            ...nodeVisitor
          })
    )
  }
}

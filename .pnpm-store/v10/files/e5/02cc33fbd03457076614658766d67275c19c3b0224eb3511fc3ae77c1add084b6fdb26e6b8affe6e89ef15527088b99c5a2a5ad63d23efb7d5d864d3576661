/**
 * @fileoverview enforce sort-keys in a manner that is compatible with order-in-components
 * @author Loren Klingman
 * Original ESLint sort-keys by Toru Nagashima
 */
'use strict'

const naturalCompare = require('natural-compare')
const utils = require('../utils')

/**
 * Gets the property name of the given `Property` node.
 *
 * - If the property's key is an `Identifier` node, this returns the key's name
 *   whether it's a computed property or not.
 * - If the property has a static name, this returns the static name.
 * - Otherwise, this returns null.
 * @param {Property} node The `Property` node to get.
 * @returns {string|null} The property name or null.
 * @private
 */
function getPropertyName(node) {
  const staticName = utils.getStaticPropertyName(node)

  if (staticName !== null) {
    return staticName
  }

  return node.key.type === 'Identifier' ? node.key.name : null
}

/**
 * Functions which check that the given 2 names are in specific order.
 *
 * Postfix `I` is meant insensitive.
 * Postfix `N` is meant natural.
 * @private
 * @type { { [key: string]: (a:string, b:string) => boolean } }
 */
const isValidOrders = {
  asc(a, b) {
    return a <= b
  },
  ascI(a, b) {
    return a.toLowerCase() <= b.toLowerCase()
  },
  ascN(a, b) {
    return naturalCompare(a, b) <= 0
  },
  ascIN(a, b) {
    return naturalCompare(a.toLowerCase(), b.toLowerCase()) <= 0
  },
  desc(a, b) {
    return isValidOrders.asc(b, a)
  },
  descI(a, b) {
    return isValidOrders.ascI(b, a)
  },
  descN(a, b) {
    return isValidOrders.ascN(b, a)
  },
  descIN(a, b) {
    return isValidOrders.ascIN(b, a)
  }
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'enforce sort-keys in a manner that is compatible with order-in-components',
      categories: null,
      url: 'https://eslint.vuejs.org/rules/sort-keys.html'
    },
    fixable: null,
    schema: [
      {
        enum: ['asc', 'desc']
      },
      {
        type: 'object',
        properties: {
          caseSensitive: {
            type: 'boolean'
          },
          ignoreChildrenOf: {
            type: 'array'
          },
          ignoreGrandchildrenOf: {
            type: 'array'
          },
          minKeys: {
            type: 'integer',
            minimum: 2
          },
          natural: {
            type: 'boolean'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      sortKeys:
        "Expected object keys to be in {{natural}}{{insensitive}}{{order}}ending order. '{{thisName}}' should be before '{{prevName}}'."
    }
  },
  /**
   * @param {RuleContext} context - The rule context.
   * @returns {RuleListener} AST event handlers.
   */
  create(context) {
    // Parse options.
    const options = context.options[1]
    const order = context.options[0] || 'asc'

    /** @type {Set<string>} */
    const ignoreGrandchildrenOf = new Set(
      (options && options.ignoreGrandchildrenOf) || [
        'computed',
        'directives',
        'inject',
        'props',
        'watch'
      ]
    )
    /** @type {Set<string>} */
    const ignoreChildrenOf = new Set(
      (options && options.ignoreChildrenOf) || ['model']
    )
    const insensitive = options && options.caseSensitive === false
    const minKeys = options?.minKeys ?? 2
    const natural = options && options.natural
    const isValidOrder =
      isValidOrders[order + (insensitive ? 'I' : '') + (natural ? 'N' : '')]

    /**
     * @typedef {object} ObjectStack
     * @property {ObjectStack | null} ObjectStack.upper
     * @property {string | null} ObjectStack.prevName
     * @property {number} ObjectStack.numKeys
     * @property {VueState} ObjectStack.vueState
     *
     * @typedef {object} VueState
     * @property {Property} [VueState.currentProperty]
     * @property {boolean} [VueState.isVueObject]
     * @property {boolean} [VueState.within]
     * @property {string} [VueState.propName]
     * @property {number} [VueState.chainLevel]
     * @property {boolean} [VueState.ignore]
     */

    /**
     * The stack to save the previous property's name for each object literals.
     * @type {ObjectStack | null}
     */
    let objectStack

    return {
      ObjectExpression(node) {
        /** @type {VueState} */
        const vueState = {}
        const upperVueState = (objectStack && objectStack.vueState) || {}
        objectStack = {
          upper: objectStack,
          prevName: null,
          numKeys: node.properties.length,
          vueState
        }

        vueState.isVueObject = utils.getVueObjectType(context, node) != null
        if (vueState.isVueObject) {
          vueState.within = vueState.isVueObject
          // Ignore Vue object properties
          vueState.ignore = true
        } else {
          if (upperVueState.within && upperVueState.currentProperty) {
            const isChain = utils.isPropertyChain(
              upperVueState.currentProperty,
              node
            )
            if (isChain) {
              let propName
              let chainLevel
              if (upperVueState.isVueObject) {
                propName =
                  utils.getStaticPropertyName(upperVueState.currentProperty) ||
                  ''
                chainLevel = 1
              } else {
                propName = upperVueState.propName || ''
                chainLevel = (upperVueState.chainLevel || 0) + 1
              }
              vueState.propName = propName
              vueState.chainLevel = chainLevel
              // chaining
              vueState.within = true

              // Judge whether to ignore the property.
              if (
                (chainLevel === 1 && ignoreChildrenOf.has(propName)) ||
                (chainLevel === 2 && ignoreGrandchildrenOf.has(propName))
              ) {
                vueState.ignore = true
              }
            } else {
              // chaining has broken.
              vueState.within = false
            }
          }
        }
      },
      'ObjectExpression:exit'() {
        objectStack = objectStack && objectStack.upper
      },
      SpreadElement(node) {
        if (!objectStack) {
          return
        }
        if (node.parent.type === 'ObjectExpression') {
          objectStack.prevName = null
        }
      },
      'ObjectExpression > Property'(node) {
        if (!objectStack) {
          return
        }
        objectStack.vueState.currentProperty = node
        if (objectStack.vueState.ignore) {
          return
        }
        const prevName = objectStack.prevName
        const numKeys = objectStack.numKeys
        const thisName = getPropertyName(node)

        if (thisName !== null) {
          objectStack.prevName = thisName
        }

        if (prevName === null || thisName === null || numKeys < minKeys) {
          return
        }

        if (!isValidOrder(prevName, thisName)) {
          context.report({
            node,
            loc: node.key.loc,
            messageId: 'sortKeys',
            data: {
              thisName,
              prevName,
              order,
              insensitive: insensitive ? 'insensitive ' : '',
              natural: natural ? 'natural ' : ''
            }
          })
        }
      }
    }
  }
}

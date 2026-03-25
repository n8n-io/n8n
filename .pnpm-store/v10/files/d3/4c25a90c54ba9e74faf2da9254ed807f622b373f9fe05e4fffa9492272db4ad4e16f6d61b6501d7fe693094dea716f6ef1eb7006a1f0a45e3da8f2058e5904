/**
 * @author Yosuke Ota <https://github.com/ota-meshi>
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const {
  extractRefObjectReferences,
  extractReactiveVariableReferences
} = require('../utils/ref-object-references')

/**
 * @typedef {import('../utils/ref-object-references').RefObjectReferences} RefObjectReferences
 * @typedef {import('../utils/ref-object-references').RefObjectReference} RefObjectReference
 */

/**
 * Checks whether writing assigns a value to the given pattern.
 * @param {Pattern | AssignmentProperty | Property} node
 * @returns {boolean}
 */
function isUpdate(node) {
  const parent = node.parent
  if (parent.type === 'UpdateExpression' && parent.argument === node) {
    // e.g. `pattern++`
    return true
  }
  if (parent.type === 'AssignmentExpression' && parent.left === node) {
    // e.g. `pattern = 42`
    return true
  }
  if (
    (parent.type === 'Property' && parent.value === node) ||
    parent.type === 'ArrayPattern' ||
    (parent.type === 'ObjectPattern' &&
      parent.properties.includes(/** @type {any} */ (node))) ||
    (parent.type === 'AssignmentPattern' && parent.left === node) ||
    parent.type === 'RestElement' ||
    (parent.type === 'MemberExpression' && parent.object === node)
  ) {
    return isUpdate(parent)
  }
  return false
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'disallow usages of ref objects that can lead to loss of reactivity',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/no-ref-object-reactivity-loss.html'
    },
    fixable: null,
    schema: [],
    messages: {
      getValueInSameScope:
        'Getting a value from the ref object in the same scope will cause the value to lose reactivity.',
      getReactiveVariableInSameScope:
        'Getting a reactive variable in the same scope will cause the value to lose reactivity.'
    }
  },
  /**
   * @param {RuleContext} context
   * @returns {RuleListener}
   */
  create(context) {
    /**
     * @typedef {object} ScopeStack
     * @property {ScopeStack | null} upper
     * @property {Program | FunctionExpression | FunctionDeclaration | ArrowFunctionExpression} node
     */
    /** @type {ScopeStack} */
    let scopeStack = { upper: null, node: context.getSourceCode().ast }
    /** @type {Map<CallExpression, ScopeStack>} */
    const scopes = new Map()

    const refObjectReferences = extractRefObjectReferences(context)
    const reactiveVariableReferences =
      extractReactiveVariableReferences(context)

    /**
     * Verify the given ref object value. `refObj = ref(); refObj.value;`
     * @param {Expression | Super | ObjectPattern} node
     */
    function verifyRefObjectValue(node) {
      const ref = refObjectReferences.get(node)
      if (!ref) {
        return
      }
      if (scopes.get(ref.define) !== scopeStack) {
        // Not in the same scope
        return
      }

      context.report({
        node,
        messageId: 'getValueInSameScope'
      })
    }

    /**
     * Verify the given reactive variable. `refVal = $ref(); refVal;`
     * @param {Identifier} node
     */
    function verifyReactiveVariable(node) {
      const ref = reactiveVariableReferences.get(node)
      if (!ref || ref.escape) {
        return
      }
      if (scopes.get(ref.define) !== scopeStack) {
        // Not in the same scope
        return
      }

      context.report({
        node,
        messageId: 'getReactiveVariableInSameScope'
      })
    }

    return {
      ':function'(node) {
        scopeStack = { upper: scopeStack, node }
      },
      ':function:exit'() {
        scopeStack = scopeStack.upper || scopeStack
      },
      CallExpression(node) {
        scopes.set(node, scopeStack)
      },
      /**
       * Check for `refObj.value`.
       */
      'MemberExpression:exit'(node) {
        if (isUpdate(node)) {
          // e.g. `refObj.value = 42`, `refObj.value++`
          return
        }
        const name = utils.getStaticPropertyName(node)
        if (name !== 'value') {
          return
        }
        verifyRefObjectValue(node.object)
      },
      /**
       * Check for `{value} = refObj`.
       */
      'ObjectPattern:exit'(node) {
        const prop = utils.findAssignmentProperty(node, 'value')
        if (!prop) {
          return
        }
        verifyRefObjectValue(node)
      },
      /**
       * Check for reactive variable`.
       * @param {Identifier} node
       */
      'Identifier:exit'(node) {
        if (isUpdate(node)) {
          // e.g. `reactiveVariable = 42`, `reactiveVariable++`
          return
        }
        verifyReactiveVariable(node)
      }
    }
  }
}

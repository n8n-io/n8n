/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'
const { findVariable } = require('@eslint-community/eslint-utils')
const utils = require('../utils')

/**
 * @typedef {'props'|'prop'} PropIdKind
 *    - `'props'`: A node is a container object that has props.
 *    - `'prop'`: A node is a variable with one prop.
 */
/**
 * @typedef {object} PropId
 * @property {Pattern} node
 * @property {PropIdKind} kind
 */
/**
 * Iterates over Prop identifiers by parsing the given pattern
 * in the left operand of defineProps().
 * @param {Pattern} node
 * @returns {IterableIterator<PropId>}
 */
function* iteratePropIds(node) {
  switch (node.type) {
    case 'ObjectPattern': {
      for (const prop of node.properties) {
        yield prop.type === 'Property'
          ? {
              // e.g. `const { prop } = defineProps()`
              node: unwrapAssignment(prop.value),
              kind: 'prop'
            }
          : {
              // RestElement
              // e.g. `const { x, ...prop } = defineProps()`
              node: unwrapAssignment(prop.argument),
              kind: 'props'
            }
      }
      break
    }
    default: {
      // e.g. `const props = defineProps()`
      yield { node: unwrapAssignment(node), kind: 'props' }
    }
  }
}

/**
 * @template {Pattern} T
 * @param {T} node
 * @returns {Pattern}
 */
function unwrapAssignment(node) {
  if (node.type === 'AssignmentPattern') {
    return node.left
  }
  return node
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'disallow usages that lose the reactivity of `props` passed to `setup`',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/no-setup-props-reactivity-loss.html'
    },
    fixable: null,
    schema: [],
    messages: {
      destructuring:
        'Destructuring the `props` will cause the value to lose reactivity.',
      getProperty:
        'Getting a value from the `props` in root scope of `{{scopeName}}` will cause the value to lose reactivity.'
    }
  },
  /**
   * @param {RuleContext} context
   * @returns {RuleListener}
   **/
  create(context) {
    /**
     * @typedef {object} ScopePropsReferences
     * @property {object} refs
     * @property {Set<Identifier>} refs.props A set of references to container objects with multiple props.
     * @property {Set<Identifier>} refs.prop A set of references a variable with one property.
     * @property {string} scopeName
     */
    /** @type {Map<FunctionDeclaration | FunctionExpression | ArrowFunctionExpression | Program, ScopePropsReferences>} */
    const setupScopePropsReferenceIds = new Map()
    const wrapperExpressionTypes = new Set([
      'ArrayExpression',
      'ObjectExpression'
    ])

    /**
     * @param {ESNode} node
     * @param {string} messageId
     * @param {string} scopeName
     */
    function report(node, messageId, scopeName) {
      context.report({
        node,
        messageId,
        data: {
          scopeName
        }
      })
    }

    /**
     * @param {Pattern} left
     * @param {Expression | null} right
     * @param {ScopePropsReferences} propsReferences
     */
    function verify(left, right, propsReferences) {
      if (!right) {
        return
      }

      const rightNode = utils.skipChainExpression(right)

      if (
        wrapperExpressionTypes.has(rightNode.type) &&
        isPropsMemberAccessed(rightNode, propsReferences)
      ) {
        // e.g. `const foo = { x: props.x }`
        report(rightNode, 'getProperty', propsReferences.scopeName)
        return
      }

      // Get the expression that provides the value.
      /** @type {Expression | Super} */
      let expression = rightNode
      while (expression.type === 'MemberExpression') {
        expression = utils.skipChainExpression(expression.object)
      }
      /** A list of expression nodes to verify */
      const expressions =
        expression.type === 'TemplateLiteral'
          ? expression.expressions
          : expression.type === 'ConditionalExpression'
            ? [expression.test, expression.consequent, expression.alternate]
            : expression.type === 'Identifier'
              ? [expression]
              : []

      if (
        (left.type === 'ArrayPattern' || left.type === 'ObjectPattern') &&
        expressions.some(
          (expr) =>
            expr.type === 'Identifier' && propsReferences.refs.props.has(expr)
        )
      ) {
        // e.g. `const {foo} = props`
        report(left, 'getProperty', propsReferences.scopeName)
        return
      }

      const reportNode = expressions.find((expr) =>
        isPropsMemberAccessed(expr, propsReferences)
      )
      if (reportNode) {
        report(reportNode, 'getProperty', propsReferences.scopeName)
      }
    }

    /**
     * @param {Expression | Super} node
     * @param {ScopePropsReferences} propsReferences
     */
    function isPropsMemberAccessed(node, propsReferences) {
      for (const props of propsReferences.refs.props) {
        const isPropsInExpressionRange = utils.inRange(node.range, props)
        const isPropsMemberExpression =
          props.parent.type === 'MemberExpression' &&
          props.parent.object === props

        if (isPropsInExpressionRange && isPropsMemberExpression) {
          return true
        }
      }

      // Checks for actual member access using prop destructuring.
      for (const prop of propsReferences.refs.prop) {
        const isPropsInExpressionRange = utils.inRange(node.range, prop)
        if (isPropsInExpressionRange) {
          return true
        }
      }

      return false
    }

    /**
     * @typedef {object} ScopeStack
     * @property {ScopeStack | null} upper
     * @property {FunctionDeclaration | FunctionExpression | ArrowFunctionExpression | Program} scopeNode
     */
    /**
     * @type {ScopeStack | null}
     */
    let scopeStack = null

    /**
     * @param {PropId} propId
     * @param {FunctionDeclaration | FunctionExpression | ArrowFunctionExpression | Program} scopeNode
     * @param {import('eslint').Scope.Scope} currentScope
     * @param {string} scopeName
     */
    function processPropId({ node, kind }, scopeNode, currentScope, scopeName) {
      if (
        node.type === 'RestElement' ||
        node.type === 'AssignmentPattern' ||
        node.type === 'MemberExpression'
      ) {
        // cannot check
        return
      }
      if (node.type === 'ArrayPattern' || node.type === 'ObjectPattern') {
        report(node, 'destructuring', scopeName)
        return
      }

      const variable = findVariable(currentScope, node)
      if (!variable) {
        return
      }

      let scopePropsReferences = setupScopePropsReferenceIds.get(scopeNode)
      if (!scopePropsReferences) {
        scopePropsReferences = {
          refs: {
            props: new Set(),
            prop: new Set()
          },
          scopeName
        }
        setupScopePropsReferenceIds.set(scopeNode, scopePropsReferences)
      }
      const propsReferenceIds = scopePropsReferences.refs[kind]
      for (const reference of variable.references) {
        // If reference is in another scope, we can't check it.
        if (reference.from !== currentScope) {
          continue
        }

        if (!reference.isRead()) {
          continue
        }

        propsReferenceIds.add(reference.identifier)
      }
    }

    return utils.compositingVisitors(
      {
        /**
         * @param {FunctionExpression | FunctionDeclaration | ArrowFunctionExpression | Program} node
         */
        'Program, :function'(node) {
          scopeStack = {
            upper: scopeStack,
            scopeNode: node
          }
        },
        /**
         * @param {FunctionExpression | FunctionDeclaration | ArrowFunctionExpression | Program} node
         */
        'Program, :function:exit'(node) {
          scopeStack = scopeStack && scopeStack.upper

          setupScopePropsReferenceIds.delete(node)
        },
        /**
         * @param {CallExpression} node
         */
        CallExpression(node) {
          if (!scopeStack) {
            return
          }

          const propsReferenceIds = setupScopePropsReferenceIds.get(
            scopeStack.scopeNode
          )

          if (!propsReferenceIds) {
            return
          }

          if (isPropsMemberAccessed(node, propsReferenceIds)) {
            report(node, 'getProperty', propsReferenceIds.scopeName)
          }
        },
        /**
         * @param {VariableDeclarator} node
         */
        VariableDeclarator(node) {
          if (!scopeStack) {
            return
          }
          const propsReferenceIds = setupScopePropsReferenceIds.get(
            scopeStack.scopeNode
          )
          if (!propsReferenceIds) {
            return
          }
          verify(node.id, node.init, propsReferenceIds)
        },
        /**
         * @param {AssignmentExpression} node
         */
        AssignmentExpression(node) {
          if (!scopeStack) {
            return
          }
          const propsReferenceIds = setupScopePropsReferenceIds.get(
            scopeStack.scopeNode
          )
          if (!propsReferenceIds) {
            return
          }
          verify(node.left, node.right, propsReferenceIds)
        }
      },
      utils.defineScriptSetupVisitor(context, {
        onDefinePropsEnter(node) {
          let target = node
          if (
            target.parent &&
            target.parent.type === 'CallExpression' &&
            target.parent.arguments[0] === target &&
            target.parent.callee.type === 'Identifier' &&
            target.parent.callee.name === 'withDefaults'
          ) {
            target = target.parent
          }
          if (!target.parent) {
            return
          }

          /** @type {Pattern|null} */
          let id = null
          if (target.parent.type === 'VariableDeclarator') {
            id = target.parent.init === target ? target.parent.id : null
          } else if (target.parent.type === 'AssignmentExpression') {
            id = target.parent.right === target ? target.parent.left : null
          }
          if (!id) return
          const currentScope = utils.getScope(context, node)
          for (const propId of iteratePropIds(id)) {
            processPropId(
              propId,
              context.getSourceCode().ast,
              currentScope,
              '<script setup>'
            )
          }
        }
      }),
      utils.defineVueVisitor(context, {
        onSetupFunctionEnter(node) {
          const currentScope = utils.getScope(context, node)
          const propsParam = utils.skipDefaultParamValue(node.params[0])
          if (!propsParam) return
          processPropId(
            { node: propsParam, kind: 'props' },
            node,
            currentScope,
            'setup()'
          )
        }
      })
    )
  }
}

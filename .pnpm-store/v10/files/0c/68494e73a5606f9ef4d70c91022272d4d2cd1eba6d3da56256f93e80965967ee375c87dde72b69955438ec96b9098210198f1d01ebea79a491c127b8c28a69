/**
 * @fileoverview Keep order of properties in components
 * @author Michał Sajnóg
 */
'use strict'

const utils = require('../utils')
const traverseNodes = require('vue-eslint-parser').AST.traverseNodes

/**
 * @typedef {import('eslint-visitor-keys').VisitorKeys} VisitorKeys
 */

const defaultOrder = [
  // Side Effects (triggers effects outside the component)
  'el',

  // Global Awareness (requires knowledge beyond the component)
  'name',
  'key', // for Nuxt
  'parent',

  // Component Type (changes the type of the component)
  'functional',

  // Template Modifiers (changes the way templates are compiled)
  ['delimiters', 'comments'],

  // Template Dependencies (assets used in the template)
  ['components', 'directives', 'filters'],

  // Composition (merges properties into the options)
  'extends',
  'mixins',
  ['provide', 'inject'], // for Vue.js 2.2.0+

  // Page Options (component rendered as a router page)
  'ROUTER_GUARDS', // for Vue Router
  'layout', // for Nuxt
  'middleware', // for Nuxt
  'validate', // for Nuxt
  'scrollToTop', // for Nuxt
  'transition', // for Nuxt
  'loading', // for Nuxt

  // Interface (the interface to the component)
  'inheritAttrs',
  'model',
  ['props', 'propsData'],
  'emits', // for Vue.js 3.x
  'slots',
  'expose',

  // Note:
  // The `setup` option is included in the "Composition" category,
  // but the behavior of the `setup` option requires the definition of "Interface",
  // so we prefer to put the `setup` option after the "Interface".
  'setup', // for Vue 3.x

  // Local State (local reactive properties)
  'asyncData', // for Nuxt
  'data',
  'fetch', // for Nuxt
  'head', // for Nuxt
  'computed',

  // Events (callbacks triggered by reactive events)
  'watch',
  'watchQuery', // for Nuxt
  'LIFECYCLE_HOOKS',

  // Non-Reactive Properties (instance properties independent of the reactivity system)
  'methods',

  // Rendering (the declarative description of the component output)
  ['template', 'render'],
  'renderError'
]

/** @type { { [key: string]: string[] } } */
const groups = {
  LIFECYCLE_HOOKS: [
    'beforeCreate',
    'created',
    'beforeMount',
    'mounted',
    'beforeUpdate',
    'updated',
    'activated',
    'deactivated',
    'beforeUnmount', // for Vue.js 3.x
    'unmounted', // for Vue.js 3.x
    'beforeDestroy',
    'destroyed',
    'renderTracked', // for Vue.js 3.x
    'renderTriggered', // for Vue.js 3.x
    'errorCaptured' // for Vue.js 2.5.0+
  ],
  ROUTER_GUARDS: ['beforeRouteEnter', 'beforeRouteUpdate', 'beforeRouteLeave']
}

/**
 * @param {(string | string[])[]} order
 */
function getOrderMap(order) {
  /** @type {Map<string, number>} */
  const orderMap = new Map()

  for (const [i, property] of order.entries()) {
    if (Array.isArray(property)) {
      for (const p of property) {
        orderMap.set(p, i)
      }
    } else {
      orderMap.set(property, i)
    }
  }

  return orderMap
}

/**
 * @param {Token} node
 */
function isComma(node) {
  return node.type === 'Punctuator' && node.value === ','
}

const ARITHMETIC_OPERATORS = ['+', '-', '*', '/', '%', '**' /* es2016 */]
const BITWISE_OPERATORS = ['&', '|', '^', '~', '<<', '>>', '>>>']
const COMPARISON_OPERATORS = ['==', '!=', '===', '!==', '>', '>=', '<', '<=']
const RELATIONAL_OPERATORS = ['in', 'instanceof']
const ALL_BINARY_OPERATORS = new Set([
  ...ARITHMETIC_OPERATORS,
  ...BITWISE_OPERATORS,
  ...COMPARISON_OPERATORS,
  ...RELATIONAL_OPERATORS
])
const LOGICAL_OPERATORS = new Set(['&&', '||', '??' /* es2020 */])

/**
 * Result `true` if the node is sure that there are no side effects
 *
 * Currently known side effects types
 *
 * node.type === 'CallExpression'
 * node.type === 'NewExpression'
 * node.type === 'UpdateExpression'
 * node.type === 'AssignmentExpression'
 * node.type === 'TaggedTemplateExpression'
 * node.type === 'UnaryExpression' && node.operator === 'delete'
 *
 * @param  {ASTNode} node target node
 * @param  {VisitorKeys} visitorKeys sourceCode.visitorKey
 * @returns {boolean} no side effects
 */
function isNotSideEffectsNode(node, visitorKeys) {
  let result = true
  /** @type {ASTNode | null} */
  let skipNode = null
  traverseNodes(node, {
    visitorKeys,
    /** @param {ASTNode} node */
    enterNode(node) {
      if (!result || skipNode) {
        return
      }

      if (
        // no side effects node
        node.type === 'FunctionExpression' ||
        node.type === 'Identifier' ||
        node.type === 'Literal' ||
        // es2015
        node.type === 'ArrowFunctionExpression' ||
        node.type === 'TemplateElement' ||
        // typescript
        node.type === 'TSAsExpression'
      ) {
        skipNode = node
      } else if (
        node.type !== 'Property' &&
        node.type !== 'ObjectExpression' &&
        node.type !== 'ArrayExpression' &&
        (node.type !== 'UnaryExpression' ||
          !['!', '~', '+', '-', 'typeof'].includes(node.operator)) &&
        (node.type !== 'BinaryExpression' ||
          !ALL_BINARY_OPERATORS.has(node.operator)) &&
        (node.type !== 'LogicalExpression' ||
          !LOGICAL_OPERATORS.has(node.operator)) &&
        node.type !== 'MemberExpression' &&
        node.type !== 'ConditionalExpression' &&
        // es2015
        node.type !== 'SpreadElement' &&
        node.type !== 'TemplateLiteral' &&
        // es2020
        node.type !== 'ChainExpression'
      ) {
        // Can not be sure that a node has no side effects
        result = false
      }
    },
    /** @param {ASTNode} node */
    leaveNode(node) {
      if (skipNode === node) {
        skipNode = null
      }
    }
  })

  return result
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'enforce order of properties in components',
      categories: ['vue3-recommended', 'vue2-recommended'],
      url: 'https://eslint.vuejs.org/rules/order-in-components.html'
    },
    fixable: 'code', // null or "code" or "whitespace"
    hasSuggestions: true,
    schema: [
      {
        type: 'object',
        properties: {
          order: {
            type: 'array'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      order:
        'The "{{name}}" property should be above the "{{firstUnorderedPropertyName}}" property on line {{line}}.',
      reorderWithSideEffects:
        'Manually move "{{name}}" property above "{{firstUnorderedPropertyName}}" property on line {{line}} (might break side effects).'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const options = context.options[0] || {}
    /** @type {(string|string[])[]} */
    const order = options.order || defaultOrder
    /** @type {(string|string[])[]} */
    const extendedOrder = order.map(
      (property) =>
        (typeof property === 'string' && groups[property]) || property
    )
    const orderMap = getOrderMap(extendedOrder)
    const sourceCode = context.getSourceCode()

    /**
     * @param {string} name
     */
    function getOrderPosition(name) {
      const num = orderMap.get(name)
      return num == null ? -1 : num
    }

    /**
     * @param {RuleFixer} fixer
     * @param {Property} propertyNode
     * @param {Property} unorderedPropertyNode
     */
    function* handleFix(fixer, propertyNode, unorderedPropertyNode) {
      const afterComma = sourceCode.getTokenAfter(propertyNode)
      const hasAfterComma = isComma(afterComma)

      const beforeComma = sourceCode.getTokenBefore(propertyNode)
      const codeStart = beforeComma.range[1] // to include comments
      const codeEnd = hasAfterComma
        ? afterComma.range[1]
        : propertyNode.range[1]

      const removeStart = hasAfterComma ? codeStart : beforeComma.range[0]
      yield fixer.removeRange([removeStart, codeEnd])

      const propertyCode =
        sourceCode.text.slice(codeStart, codeEnd) + (hasAfterComma ? '' : ',')
      const insertTarget = sourceCode.getTokenBefore(unorderedPropertyNode)

      yield fixer.insertTextAfter(insertTarget, propertyCode)
    }

    /**
     * @param {(Property | SpreadElement)[]} propertiesNodes
     */
    function checkOrder(propertiesNodes) {
      const properties = propertiesNodes
        .filter(utils.isProperty)
        .map((property) => ({
          node: property,
          name:
            utils.getStaticPropertyName(property) ||
            (property.key.type === 'Identifier' && property.key.name) ||
            ''
        }))

      for (const [i, property] of properties.entries()) {
        const orderPos = getOrderPosition(property.name)
        if (orderPos < 0) {
          continue
        }
        const propertiesAbove = properties.slice(0, i)
        const unorderedProperties = propertiesAbove
          .filter(
            (p) => getOrderPosition(p.name) > getOrderPosition(property.name)
          )
          .sort((p1, p2) =>
            getOrderPosition(p1.name) > getOrderPosition(p2.name) ? 1 : -1
          )

        const firstUnorderedProperty = unorderedProperties[0]

        if (firstUnorderedProperty) {
          const line = firstUnorderedProperty.node.loc.start.line
          const propertyNode = property.node
          const firstUnorderedPropertyNode = firstUnorderedProperty.node
          const hasSideEffectsPossibility = propertiesNodes
            .slice(
              propertiesNodes.indexOf(firstUnorderedPropertyNode),
              propertiesNodes.indexOf(propertyNode) + 1
            )
            .some(
              (property) =>
                !isNotSideEffectsNode(property, sourceCode.visitorKeys)
            )

          context.report({
            node: property.node,
            messageId: 'order',
            data: {
              name: property.name,
              firstUnorderedPropertyName: firstUnorderedProperty.name,
              line
            },
            fix: hasSideEffectsPossibility
              ? undefined
              : (fixer) =>
                  handleFix(fixer, propertyNode, firstUnorderedPropertyNode),
            suggest: hasSideEffectsPossibility
              ? [
                  {
                    messageId: 'reorderWithSideEffects',
                    data: {
                      name: property.name,
                      firstUnorderedPropertyName: firstUnorderedProperty.name,
                      line
                    },
                    fix: (fixer) =>
                      handleFix(fixer, propertyNode, firstUnorderedPropertyNode)
                  }
                ]
              : undefined
          })
        }
      }
    }

    return utils.compositingVisitors(
      utils.executeOnVue(context, (obj) => {
        checkOrder(obj.properties)
      }),
      utils.defineScriptSetupVisitor(context, {
        onDefineOptionsEnter(node) {
          if (node.arguments.length === 0) return
          const define = node.arguments[0]
          if (define.type !== 'ObjectExpression') return
          checkOrder(define.properties)
        }
      })
    )
  }
}

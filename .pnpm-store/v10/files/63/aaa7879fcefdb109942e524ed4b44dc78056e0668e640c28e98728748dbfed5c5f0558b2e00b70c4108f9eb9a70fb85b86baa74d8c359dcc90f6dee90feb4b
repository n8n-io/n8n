/**
 * @fileoverview disallow the use of reserved names in component definitions
 * @author Jake Hassel <https://github.com/shadskii>
 */
'use strict'

const utils = require('../utils')
const casing = require('../utils/casing')

const htmlElements = require('../utils/html-elements.json')
const deprecatedHtmlElements = require('../utils/deprecated-html-elements.json')
const svgElements = require('../utils/svg-elements.json')
const RESERVED_NAMES_IN_VUE = new Set(
  require('../utils/vue2-builtin-components')
)

const RESERVED_NAMES_IN_VUE3 = new Set(
  require('../utils/vue3-builtin-components')
)

const kebabCaseElements = [
  'annotation-xml',
  'color-profile',
  'font-face',
  'font-face-src',
  'font-face-uri',
  'font-face-format',
  'font-face-name',
  'missing-glyph'
]

/** @param {string} word  */
function isLowercase(word) {
  return /^[a-z]*$/.test(word)
}

/**
 * @param {Expression | SpreadElement} node
 * @returns {node is (Literal | TemplateLiteral)}
 */
function canVerify(node) {
  return (
    node.type === 'Literal' ||
    (node.type === 'TemplateLiteral' &&
      node.expressions.length === 0 &&
      node.quasis.length === 1)
  )
}

/**
 * @template T
 * @param {Set<T>} set
 * @param {Iterable<T>} iterable
 */
function addAll(set, iterable) {
  for (const element of iterable) {
    set.add(element)
  }
}

module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description:
        'disallow the use of reserved names in component definitions',
      categories: ['vue3-essential', 'vue2-essential'],
      url: 'https://eslint.vuejs.org/rules/no-reserved-component-names.html'
    },
    fixable: null,
    schema: [
      {
        type: 'object',
        properties: {
          disallowVueBuiltInComponents: {
            type: 'boolean'
          },
          disallowVue3BuiltInComponents: {
            type: 'boolean'
          },
          htmlElementCaseSensitive: {
            type: 'boolean'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      reserved: 'Name "{{name}}" is reserved.',
      reservedInHtml: 'Name "{{name}}" is reserved in HTML.',
      reservedInVue: 'Name "{{name}}" is reserved in Vue.js.',
      reservedInVue3: 'Name "{{name}}" is reserved in Vue.js 3.x.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const options = context.options[0] || {}
    const disallowVueBuiltInComponents =
      options.disallowVueBuiltInComponents === true
    const disallowVue3BuiltInComponents =
      options.disallowVue3BuiltInComponents === true
    const htmlElementCaseSensitive = options.htmlElementCaseSensitive === true

    const RESERVED_NAMES_IN_HTML = new Set(htmlElements)
    const RESERVED_NAMES_IN_OTHERS = new Set([
      ...deprecatedHtmlElements,
      ...kebabCaseElements,
      ...svgElements
    ])

    if (!htmlElementCaseSensitive) {
      addAll(RESERVED_NAMES_IN_HTML, htmlElements.map(casing.capitalize))
      addAll(RESERVED_NAMES_IN_OTHERS, [
        ...deprecatedHtmlElements.map(casing.capitalize),
        ...kebabCaseElements.map(casing.pascalCase),
        ...svgElements.filter(isLowercase).map(casing.capitalize)
      ])
    }

    const reservedNames = new Set([
      ...RESERVED_NAMES_IN_HTML,
      ...(disallowVueBuiltInComponents ? RESERVED_NAMES_IN_VUE : []),
      ...(disallowVue3BuiltInComponents ? RESERVED_NAMES_IN_VUE3 : []),
      ...RESERVED_NAMES_IN_OTHERS
    ])

    /**
     * @param {string} name
     * @returns {string}
     */
    function getMessageId(name) {
      if (RESERVED_NAMES_IN_HTML.has(name)) return 'reservedInHtml'
      if (RESERVED_NAMES_IN_VUE.has(name)) return 'reservedInVue'
      if (RESERVED_NAMES_IN_VUE3.has(name)) return 'reservedInVue3'
      return 'reserved'
    }

    /**
     * @param {Literal | TemplateLiteral} node
     */
    function reportIfInvalid(node) {
      let name
      if (node.type === 'TemplateLiteral') {
        const quasis = node.quasis[0]
        name = quasis.value.cooked
      } else {
        name = `${node.value}`
      }
      if (reservedNames.has(name)) {
        report(node, name)
      }
    }

    /**
     * @param {ESNode} node
     * @param {string} name
     */
    function report(node, name) {
      context.report({
        node,
        messageId: getMessageId(name),
        data: {
          name
        }
      })
    }

    return utils.compositingVisitors(
      utils.executeOnCallVueComponent(context, (node) => {
        if (node.arguments.length === 2) {
          const argument = node.arguments[0]

          if (canVerify(argument)) {
            reportIfInvalid(argument)
          }
        }
      }),
      utils.executeOnVue(context, (obj) => {
        // Report if a component has been registered locally with a reserved name.
        for (const { node, name } of utils.getRegisteredComponents(obj)) {
          if (reservedNames.has(name)) {
            report(node, name)
          }
        }

        const node = utils.findProperty(obj, 'name')

        if (!node) return
        if (!canVerify(node.value)) return
        reportIfInvalid(node.value)
      }),
      utils.defineScriptSetupVisitor(context, {
        onDefineOptionsEnter(node) {
          if (node.arguments.length === 0) return
          const define = node.arguments[0]
          if (define.type !== 'ObjectExpression') return
          const nameNode = utils.findProperty(define, 'name')
          if (!nameNode) return
          if (!canVerify(nameNode.value)) return
          reportIfInvalid(nameNode.value)
        }
      })
    )
  }
}

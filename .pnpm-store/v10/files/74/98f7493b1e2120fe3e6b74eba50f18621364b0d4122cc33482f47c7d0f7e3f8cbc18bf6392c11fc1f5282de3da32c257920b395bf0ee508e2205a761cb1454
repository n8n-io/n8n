/**
 * @author Toru Nagashima
 * @copyright 2016 Toru Nagashima. All rights reserved.
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

/**
 * These strings wil be displayed in error messages.
 */
const ELEMENT_TYPE_MESSAGES = Object.freeze({
  NORMAL: 'HTML elements',
  VOID: 'HTML void elements',
  COMPONENT: 'Vue.js custom components',
  SVG: 'SVG elements',
  MATH: 'MathML elements',
  UNKNOWN: 'unknown elements'
})

/**
 * @typedef {object} Options
 * @property {'always' | 'never'} NORMAL
 * @property {'always' | 'never'} VOID
 * @property {'always' | 'never'} COMPONENT
 * @property {'always' | 'never'} SVG
 * @property {'always' | 'never'} MATH
 * @property {null} UNKNOWN
 */

/**
 * Normalize the given options.
 * @param {any} options The raw options object.
 * @returns {Options} Normalized options.
 */
function parseOptions(options) {
  return {
    NORMAL: (options && options.html && options.html.normal) || 'always',
    VOID: (options && options.html && options.html.void) || 'never',
    COMPONENT: (options && options.html && options.html.component) || 'always',
    SVG: (options && options.svg) || 'always',
    MATH: (options && options.math) || 'always',
    UNKNOWN: null
  }
}

/**
 * Get the elementType of the given element.
 * @param {VElement} node The element node to get.
 * @returns {keyof Options} The elementType of the element.
 */
function getElementType(node) {
  if (utils.isCustomComponent(node)) {
    return 'COMPONENT'
  }
  if (utils.isHtmlElementNode(node)) {
    if (utils.isHtmlVoidElementName(node.name)) {
      return 'VOID'
    }
    return 'NORMAL'
  }
  if (utils.isSvgElementNode(node)) {
    return 'SVG'
  }
  if (utils.isMathElementNode(node)) {
    return 'MATH'
  }
  return 'UNKNOWN'
}

/**
 * Check whether the given element is empty or not.
 * This ignores whitespaces, doesn't ignore comments.
 * @param {VElement} node The element node to check.
 * @param {SourceCode} sourceCode The source code object of the current context.
 * @returns {boolean} `true` if the element is empty.
 */
function isEmpty(node, sourceCode) {
  const start = node.startTag.range[1]
  const end = node.endTag == null ? node.range[1] : node.endTag.range[0]

  return sourceCode.text.slice(start, end).trim() === ''
}

module.exports = {
  meta: {
    type: 'layout',
    docs: {
      description: 'enforce self-closing style',
      categories: ['vue3-strongly-recommended', 'vue2-strongly-recommended'],
      url: 'https://eslint.vuejs.org/rules/html-self-closing.html'
    },
    fixable: 'code',
    schema: {
      definitions: {
        optionValue: {
          enum: ['always', 'never', 'any']
        }
      },
      type: 'array',
      items: [
        {
          type: 'object',
          properties: {
            html: {
              type: 'object',
              properties: {
                normal: { $ref: '#/definitions/optionValue' },
                void: { $ref: '#/definitions/optionValue' },
                component: { $ref: '#/definitions/optionValue' }
              },
              additionalProperties: false
            },
            svg: { $ref: '#/definitions/optionValue' },
            math: { $ref: '#/definitions/optionValue' }
          },
          additionalProperties: false
        }
      ],
      maxItems: 1
    },
    messages: {
      requireSelfClosing:
        'Require self-closing on {{elementType}} (<{{name}}>).',
      disallowSelfClosing:
        'Disallow self-closing on {{elementType}} (<{{name}}/>).'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const sourceCode = context.getSourceCode()
    const options = parseOptions(context.options[0])
    let hasInvalidEOF = false

    return utils.defineTemplateBodyVisitor(
      context,
      {
        VElement(node) {
          if (hasInvalidEOF || node.parent.type === 'VDocumentFragment') {
            return
          }

          const elementType = getElementType(node)
          const mode = options[elementType]

          if (
            mode === 'always' &&
            !node.startTag.selfClosing &&
            isEmpty(node, sourceCode)
          ) {
            context.report({
              node: node.endTag || node,
              messageId: 'requireSelfClosing',
              data: {
                elementType: ELEMENT_TYPE_MESSAGES[elementType],
                name: node.rawName
              },
              fix(fixer) {
                const tokens =
                  sourceCode.parserServices.getTemplateBodyTokenStore()
                const close = tokens.getLastToken(node.startTag)
                if (close.type !== 'HTMLTagClose') {
                  return null
                }
                return fixer.replaceTextRange(
                  [close.range[0], node.range[1]],
                  '/>'
                )
              }
            })
          }

          if (mode === 'never' && node.startTag.selfClosing) {
            context.report({
              node,
              loc: {
                start: {
                  line: node.loc.end.line,
                  column: node.loc.end.column - 2
                },
                end: node.loc.end
              },
              messageId: 'disallowSelfClosing',
              data: {
                elementType: ELEMENT_TYPE_MESSAGES[elementType],
                name: node.rawName
              },
              fix(fixer) {
                const tokens =
                  sourceCode.parserServices.getTemplateBodyTokenStore()
                const close = tokens.getLastToken(node.startTag)
                if (close.type !== 'HTMLSelfClosingTagClose') {
                  return null
                }
                if (elementType === 'VOID') {
                  return fixer.replaceText(close, '>')
                }
                // If only `close` is targeted for replacement, it conflicts with `component-name-in-template-casing`,
                // so replace the entire element.
                // return fixer.replaceText(close, `></${node.rawName}>`)
                const elementPart = sourceCode.text.slice(
                  node.range[0],
                  close.range[0]
                )
                return fixer.replaceText(
                  node,
                  `${elementPart}></${node.rawName}>`
                )
              }
            })
          }
        }
      },
      {
        Program(node) {
          hasInvalidEOF = utils.hasInvalidEOF(node)
        }
      }
    )
  }
}

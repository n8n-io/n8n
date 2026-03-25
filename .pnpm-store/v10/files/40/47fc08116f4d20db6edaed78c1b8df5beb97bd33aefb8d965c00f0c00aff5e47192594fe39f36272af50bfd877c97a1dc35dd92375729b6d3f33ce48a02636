/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const casing = require('../utils/casing')
const INLINE_ELEMENTS = require('../utils/inline-non-void-elements.json')

/**
 * @param {VElement & { endTag: VEndTag } } element
 */
function isSinglelineElement(element) {
  return element.loc.start.line === element.endTag.loc.start.line
}

/**
 * @param {any} options
 */
function parseOptions(options) {
  return Object.assign(
    {
      ignores: ['pre', 'textarea', ...INLINE_ELEMENTS],
      externalIgnores: [],
      ignoreWhenNoAttributes: true,
      ignoreWhenEmpty: true
    },
    options
  )
}

/**
 * Check whether the given element is empty or not.
 * This ignores whitespaces, doesn't ignore comments.
 * @param {VElement & { endTag: VEndTag } } node The element node to check.
 * @param {SourceCode} sourceCode The source code object of the current context.
 * @returns {boolean} `true` if the element is empty.
 */
function isEmpty(node, sourceCode) {
  const start = node.startTag.range[1]
  const end = node.endTag.range[0]
  return sourceCode.text.slice(start, end).trim() === ''
}

module.exports = {
  meta: {
    type: 'layout',
    docs: {
      description:
        'require a line break before and after the contents of a singleline element',
      categories: ['vue3-strongly-recommended', 'vue2-strongly-recommended'],
      url: 'https://eslint.vuejs.org/rules/singleline-html-element-content-newline.html'
    },
    fixable: 'whitespace',
    schema: [
      {
        type: 'object',
        properties: {
          ignoreWhenNoAttributes: {
            type: 'boolean'
          },
          ignoreWhenEmpty: {
            type: 'boolean'
          },
          ignores: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
            additionalItems: false
          },
          externalIgnores: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
            additionalItems: false
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      unexpectedAfterClosingBracket:
        'Expected 1 line break after opening tag (`<{{name}}>`), but no line breaks found.',
      unexpectedBeforeOpeningBracket:
        'Expected 1 line break before closing tag (`</{{name}}>`), but no line breaks found.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const options = parseOptions(context.options[0])
    const ignores = new Set([...options.ignores, ...options.externalIgnores])
    const ignoreWhenNoAttributes = options.ignoreWhenNoAttributes
    const ignoreWhenEmpty = options.ignoreWhenEmpty
    const sourceCode = context.getSourceCode()
    const template =
      sourceCode.parserServices.getTemplateBodyTokenStore &&
      sourceCode.parserServices.getTemplateBodyTokenStore()

    /** @type {VElement | null} */
    let inIgnoreElement = null

    /** @param {VElement} node */
    function isIgnoredElement(node) {
      return (
        ignores.has(node.name) ||
        ignores.has(casing.pascalCase(node.rawName)) ||
        ignores.has(casing.kebabCase(node.rawName))
      )
    }

    return utils.defineTemplateBodyVisitor(context, {
      /** @param {VElement} node */
      VElement(node) {
        if (inIgnoreElement) {
          return
        }
        if (isIgnoredElement(node)) {
          // ignore element name
          inIgnoreElement = node
          return
        }
        if (node.startTag.selfClosing || !node.endTag) {
          // self closing
          return
        }

        const elem = /** @type {VElement & { endTag: VEndTag } } */ (node)

        if (!isSinglelineElement(elem)) {
          return
        }
        if (ignoreWhenNoAttributes && elem.startTag.attributes.length === 0) {
          return
        }

        /** @type {SourceCode.CursorWithCountOptions} */
        const getTokenOption = {
          includeComments: true,
          filter: (token) => token.type !== 'HTMLWhitespace'
        }
        if (
          ignoreWhenEmpty &&
          elem.children.length === 0 &&
          template.getFirstTokensBetween(
            elem.startTag,
            elem.endTag,
            getTokenOption
          ).length === 0
        ) {
          return
        }

        const contentFirst = /** @type {Token} */ (
          template.getTokenAfter(elem.startTag, getTokenOption)
        )
        const contentLast = /** @type {Token} */ (
          template.getTokenBefore(elem.endTag, getTokenOption)
        )

        context.report({
          node: template.getLastToken(elem.startTag),
          loc: {
            start: elem.startTag.loc.end,
            end: contentFirst.loc.start
          },
          messageId: 'unexpectedAfterClosingBracket',
          data: {
            name: elem.rawName
          },
          fix(fixer) {
            /** @type {Range} */
            const range = [elem.startTag.range[1], contentFirst.range[0]]
            return fixer.replaceTextRange(range, '\n')
          }
        })

        if (isEmpty(elem, sourceCode)) {
          return
        }

        context.report({
          node: template.getFirstToken(elem.endTag),
          loc: {
            start: contentLast.loc.end,
            end: elem.endTag.loc.start
          },
          messageId: 'unexpectedBeforeOpeningBracket',
          data: {
            name: elem.rawName
          },
          fix(fixer) {
            /** @type {Range} */
            const range = [contentLast.range[1], elem.endTag.range[0]]
            return fixer.replaceTextRange(range, '\n')
          }
        })
      },
      /** @param {VElement} node */
      'VElement:exit'(node) {
        if (inIgnoreElement === node) {
          inIgnoreElement = null
        }
      }
    })
  }
}

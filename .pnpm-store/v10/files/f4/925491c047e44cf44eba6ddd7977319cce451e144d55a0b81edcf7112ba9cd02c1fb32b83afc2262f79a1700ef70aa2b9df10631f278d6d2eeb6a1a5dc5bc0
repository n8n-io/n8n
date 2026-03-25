/**
 * @author Yosuke Ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')
const casing = require('../utils/casing')
const INLINE_ELEMENTS = require('../utils/inline-non-void-elements.json')

/**
 * @param {VElement & { endTag: VEndTag }} element
 */
function isMultilineElement(element) {
  return element.loc.start.line < element.endTag.loc.start.line
}

/**
 * @param {any} options
 */
function parseOptions(options) {
  return Object.assign(
    {
      ignores: ['pre', 'textarea', ...INLINE_ELEMENTS],
      ignoreWhenEmpty: true,
      allowEmptyLines: false
    },
    options
  )
}

/**
 * @param {number} lineBreaks
 */
function getPhrase(lineBreaks) {
  switch (lineBreaks) {
    case 0: {
      return 'no'
    }
    default: {
      return `${lineBreaks}`
    }
  }
}
/**
 * Check whether the given element is empty or not.
 * This ignores whitespaces, doesn't ignore comments.
 * @param {VElement & { endTag: VEndTag }} node The element node to check.
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
        'require a line break before and after the contents of a multiline element',
      categories: ['vue3-strongly-recommended', 'vue2-strongly-recommended'],
      url: 'https://eslint.vuejs.org/rules/multiline-html-element-content-newline.html'
    },
    fixable: 'whitespace',
    schema: [
      {
        type: 'object',
        properties: {
          ignoreWhenEmpty: {
            type: 'boolean'
          },
          ignores: {
            type: 'array',
            items: { type: 'string' },
            uniqueItems: true,
            additionalItems: false
          },
          allowEmptyLines: {
            type: 'boolean'
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      unexpectedAfterClosingBracket:
        'Expected 1 line break after opening tag (`<{{name}}>`), but {{actual}} line breaks found.',
      unexpectedBeforeOpeningBracket:
        'Expected 1 line break before closing tag (`</{{name}}>`), but {{actual}} line breaks found.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const options = parseOptions(context.options[0])
    const ignores = options.ignores
    const ignoreWhenEmpty = options.ignoreWhenEmpty
    const allowEmptyLines = options.allowEmptyLines
    const sourceCode = context.getSourceCode()
    const template =
      sourceCode.parserServices.getTemplateBodyTokenStore &&
      sourceCode.parserServices.getTemplateBodyTokenStore()

    /** @type {VElement | null} */
    let inIgnoreElement = null

    /**
     * @param {VElement} node
     */
    function isIgnoredElement(node) {
      return (
        ignores.includes(node.name) ||
        ignores.includes(casing.pascalCase(node.rawName)) ||
        ignores.includes(casing.kebabCase(node.rawName))
      )
    }

    /**
     * @param {number} lineBreaks
     */
    function isInvalidLineBreaks(lineBreaks) {
      return allowEmptyLines ? lineBreaks === 0 : lineBreaks !== 1
    }

    return utils.defineTemplateBodyVisitor(context, {
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

        const element = /** @type {VElement & { endTag: VEndTag }} */ (node)

        if (!isMultilineElement(element)) {
          return
        }

        /**
         * @type {SourceCode.CursorWithCountOptions}
         */
        const getTokenOption = {
          includeComments: true,
          filter: (token) => token.type !== 'HTMLWhitespace'
        }
        if (
          ignoreWhenEmpty &&
          element.children.length === 0 &&
          template.getFirstTokensBetween(
            element.startTag,
            element.endTag,
            getTokenOption
          ).length === 0
        ) {
          return
        }

        const contentFirst = /** @type {Token} */ (
          template.getTokenAfter(element.startTag, getTokenOption)
        )
        const contentLast = /** @type {Token} */ (
          template.getTokenBefore(element.endTag, getTokenOption)
        )

        const beforeLineBreaks =
          contentFirst.loc.start.line - element.startTag.loc.end.line
        const afterLineBreaks =
          element.endTag.loc.start.line - contentLast.loc.end.line
        if (isInvalidLineBreaks(beforeLineBreaks)) {
          context.report({
            node: template.getLastToken(element.startTag),
            loc: {
              start: element.startTag.loc.end,
              end: contentFirst.loc.start
            },
            messageId: 'unexpectedAfterClosingBracket',
            data: {
              name: element.rawName,
              actual: getPhrase(beforeLineBreaks)
            },
            fix(fixer) {
              /** @type {Range} */
              const range = [element.startTag.range[1], contentFirst.range[0]]
              return fixer.replaceTextRange(range, '\n')
            }
          })
        }

        if (isEmpty(element, sourceCode)) {
          return
        }

        if (isInvalidLineBreaks(afterLineBreaks)) {
          context.report({
            node: template.getFirstToken(element.endTag),
            loc: {
              start: contentLast.loc.end,
              end: element.endTag.loc.start
            },
            messageId: 'unexpectedBeforeOpeningBracket',
            data: {
              name: element.name,
              actual: getPhrase(afterLineBreaks)
            },
            fix(fixer) {
              /** @type {Range} */
              const range = [contentLast.range[1], element.endTag.range[0]]
              return fixer.replaceTextRange(range, '\n')
            }
          })
        }
      },
      'VElement:exit'(node) {
        if (inIgnoreElement === node) {
          inIgnoreElement = null
        }
      }
    })
  }
}

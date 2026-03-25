/**
 * @fileoverview Enforce line breaks style after opening and before closing block-level tags.
 * @author Yosuke Ota
 */
'use strict'
const utils = require('../utils')

/**
 * @typedef { 'always' | 'never' | 'consistent' | 'ignore' } OptionType
 * @typedef { { singleline?: OptionType, multiline?: OptionType, maxEmptyLines?: number } } ContentsOptions
 * @typedef { ContentsOptions & { blocks?: { [element: string]: ContentsOptions } } } Options
 * @typedef { Required<ContentsOptions> } ArgsOptions
 */

/**
 * @param {string} text Source code as a string.
 * @returns {number}
 */
function getLinebreakCount(text) {
  return text.split(/\r\n|[\r\n\u2028\u2029]/gu).length - 1
}

/**
 * @param {number} lineBreaks
 */
function getPhrase(lineBreaks) {
  switch (lineBreaks) {
    case 1: {
      return '1 line break'
    }
    default: {
      return `${lineBreaks} line breaks`
    }
  }
}

const ENUM_OPTIONS = { enum: ['always', 'never', 'consistent', 'ignore'] }
module.exports = {
  meta: {
    type: 'layout',
    docs: {
      description:
        'enforce line breaks after opening and before closing block-level tags',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/block-tag-newline.html'
    },
    fixable: 'whitespace',
    schema: [
      {
        type: 'object',
        properties: {
          singleline: ENUM_OPTIONS,
          multiline: ENUM_OPTIONS,
          maxEmptyLines: { type: 'number', minimum: 0 },
          blocks: {
            type: 'object',
            patternProperties: {
              '^(?:\\S+)$': {
                type: 'object',
                properties: {
                  singleline: ENUM_OPTIONS,
                  multiline: ENUM_OPTIONS,
                  maxEmptyLines: { type: 'number', minimum: 0 }
                },
                additionalProperties: false
              }
            },
            additionalProperties: false
          }
        },
        additionalProperties: false
      }
    ],
    messages: {
      unexpectedOpeningLinebreak:
        "There should be no line break after '<{{tag}}>'.",
      expectedOpeningLinebreak:
        "Expected {{expected}} after '<{{tag}}>', but {{actual}} found.",
      expectedClosingLinebreak:
        "Expected {{expected}}  before '</{{tag}}>', but {{actual}} found.",
      missingOpeningLinebreak: "A line break is required after '<{{tag}}>'.",
      missingClosingLinebreak: "A line break is required before '</{{tag}}>'."
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const sourceCode = context.getSourceCode()
    const df =
      sourceCode.parserServices.getDocumentFragment &&
      sourceCode.parserServices.getDocumentFragment()
    if (!df) {
      return {}
    }

    /**
     * @param {VStartTag} startTag
     * @param {string} beforeText
     * @param {number} beforeLinebreakCount
     * @param {'always' | 'never'} beforeOption
     * @param {number} maxEmptyLines
     * @returns {void}
     */
    function verifyBeforeSpaces(
      startTag,
      beforeText,
      beforeLinebreakCount,
      beforeOption,
      maxEmptyLines
    ) {
      if (beforeOption === 'always') {
        if (beforeLinebreakCount === 0) {
          context.report({
            loc: {
              start: startTag.loc.end,
              end: startTag.loc.end
            },
            messageId: 'missingOpeningLinebreak',
            data: { tag: startTag.parent.name },
            fix(fixer) {
              return fixer.insertTextAfter(startTag, '\n')
            }
          })
        } else if (maxEmptyLines < beforeLinebreakCount - 1) {
          context.report({
            loc: {
              start: startTag.loc.end,
              end: sourceCode.getLocFromIndex(
                startTag.range[1] + beforeText.length
              )
            },
            messageId: 'expectedOpeningLinebreak',
            data: {
              tag: startTag.parent.name,
              expected: getPhrase(maxEmptyLines + 1),
              actual: getPhrase(beforeLinebreakCount)
            },
            fix(fixer) {
              return fixer.replaceTextRange(
                [startTag.range[1], startTag.range[1] + beforeText.length],
                '\n'.repeat(maxEmptyLines + 1)
              )
            }
          })
        }
      } else {
        if (beforeLinebreakCount > 0) {
          context.report({
            loc: {
              start: startTag.loc.end,
              end: sourceCode.getLocFromIndex(
                startTag.range[1] + beforeText.length
              )
            },
            messageId: 'unexpectedOpeningLinebreak',
            data: { tag: startTag.parent.name },
            fix(fixer) {
              return fixer.removeRange([
                startTag.range[1],
                startTag.range[1] + beforeText.length
              ])
            }
          })
        }
      }
    }
    /**
     * @param {VEndTag} endTag
     * @param {string} afterText
     * @param {number} afterLinebreakCount
     * @param {'always' | 'never'} afterOption
     * @param {number} maxEmptyLines
     * @returns {void}
     */
    function verifyAfterSpaces(
      endTag,
      afterText,
      afterLinebreakCount,
      afterOption,
      maxEmptyLines
    ) {
      if (afterOption === 'always') {
        if (afterLinebreakCount === 0) {
          context.report({
            loc: {
              start: endTag.loc.start,
              end: endTag.loc.start
            },
            messageId: 'missingClosingLinebreak',
            data: { tag: endTag.parent.name },
            fix(fixer) {
              return fixer.insertTextBefore(endTag, '\n')
            }
          })
        } else if (maxEmptyLines < afterLinebreakCount - 1) {
          context.report({
            loc: {
              start: sourceCode.getLocFromIndex(
                endTag.range[0] - afterText.length
              ),
              end: endTag.loc.start
            },
            messageId: 'expectedClosingLinebreak',
            data: {
              tag: endTag.parent.name,
              expected: getPhrase(maxEmptyLines + 1),
              actual: getPhrase(afterLinebreakCount)
            },
            fix(fixer) {
              return fixer.replaceTextRange(
                [endTag.range[0] - afterText.length, endTag.range[0]],
                '\n'.repeat(maxEmptyLines + 1)
              )
            }
          })
        }
      } else {
        if (afterLinebreakCount > 0) {
          context.report({
            loc: {
              start: sourceCode.getLocFromIndex(
                endTag.range[0] - afterText.length
              ),
              end: endTag.loc.start
            },
            messageId: 'unexpectedOpeningLinebreak',
            data: { tag: endTag.parent.name },
            fix(fixer) {
              return fixer.removeRange([
                endTag.range[0] - afterText.length,
                endTag.range[0]
              ])
            }
          })
        }
      }
    }
    /**
     * @param {VElement} element
     * @param {ArgsOptions} options
     * @returns {void}
     */
    function verifyElement(element, options) {
      const { startTag, endTag } = element
      if (startTag.selfClosing || endTag == null) {
        return
      }
      const text = sourceCode.text.slice(startTag.range[1], endTag.range[0])

      const trimText = text.trim()
      if (!trimText) {
        return
      }

      const option =
        options.multiline !== options.singleline &&
        /[\n\r\u2028\u2029]/u.test(text.trim())
          ? options.multiline
          : options.singleline
      if (option === 'ignore') {
        return
      }
      const beforeText = /** @type {RegExpExecArray} */ (/^\s*/u.exec(text))[0]
      const afterText = /** @type {RegExpExecArray} */ (/\s*$/u.exec(text))[0]
      const beforeLinebreakCount = getLinebreakCount(beforeText)
      const afterLinebreakCount = getLinebreakCount(afterText)

      /** @type {'always' | 'never'} */
      let beforeOption
      /** @type {'always' | 'never'} */
      let afterOption
      if (option === 'always' || option === 'never') {
        beforeOption = option
        afterOption = option
      } else {
        // consistent
        if (beforeLinebreakCount > 0 === afterLinebreakCount > 0) {
          return
        }
        beforeOption = 'always'
        afterOption = 'always'
      }

      verifyBeforeSpaces(
        startTag,
        beforeText,
        beforeLinebreakCount,
        beforeOption,
        options.maxEmptyLines
      )

      verifyAfterSpaces(
        endTag,
        afterText,
        afterLinebreakCount,
        afterOption,
        options.maxEmptyLines
      )
    }

    /**
     * Normalizes a given option value.
     * @param { Options | undefined } option An option value to parse.
     * @returns { (element: VElement) => void } Verify function.
     */
    function normalizeOptionValue(option) {
      if (!option) {
        return normalizeOptionValue({})
      }

      /** @type {ContentsOptions} */
      const contentsOptions = option
      /** @type {ArgsOptions} */
      const options = {
        singleline: contentsOptions.singleline || 'consistent',
        multiline: contentsOptions.multiline || 'always',
        maxEmptyLines: contentsOptions.maxEmptyLines || 0
      }
      const { blocks } = option
      if (!blocks) {
        return (element) => verifyElement(element, options)
      }

      return (element) => {
        const { name } = element
        const elementsOptions = blocks[name]
        if (elementsOptions) {
          normalizeOptionValue({
            singleline: elementsOptions.singleline || options.singleline,
            multiline: elementsOptions.multiline || options.multiline,
            maxEmptyLines:
              elementsOptions.maxEmptyLines == null
                ? options.maxEmptyLines
                : elementsOptions.maxEmptyLines
          })(element)
        } else {
          verifyElement(element, options)
        }
      }
    }

    const documentFragment = df

    const verify = normalizeOptionValue(context.options[0])

    return utils.defineTemplateBodyVisitor(
      context,
      {},
      {
        /** @param {Program} node */
        Program(node) {
          if (utils.hasInvalidEOF(node)) {
            return
          }

          for (const element of documentFragment.children) {
            if (utils.isVElement(element)) {
              verify(element)
            }
          }
        }
      }
    )
  }
}

/**
 * @author dev1437
 * See LICENSE file in root directory for full license.
 */
'use strict'

const utils = require('../utils')

/**
 * Split the source code into multiple lines based on the line delimiters.
 * Copied from padding-line-between-blocks
 * @param {string} text Source code as a string.
 * @returns {string[]} Array of source code lines.
 */
function splitLines(text) {
  return text.split(/\r\n|[\r\n\u2028\u2029]/gu)
}

/**
 * @param {RuleContext} context
 * @param {VElement} tag
 * @param {VElement} sibling
 * @param {number} lineDifference
 */
function insertNewLine(context, tag, sibling, lineDifference) {
  const endTag = tag.endTag || tag.startTag

  if (lineDifference === 1) {
    context.report({
      messageId: 'always',
      loc: sibling.loc,
      // @ts-ignore
      fix(fixer) {
        return fixer.insertTextAfter(tag, '\n')
      }
    })
  } else if (lineDifference === 0) {
    context.report({
      messageId: 'always',
      loc: sibling.loc,
      // @ts-ignore
      fix(fixer) {
        const lastSpaces = /** @type {RegExpExecArray} */ (
          /^\s*/.exec(context.getSourceCode().lines[endTag.loc.start.line - 1])
        )[0]

        return fixer.insertTextAfter(endTag, `\n\n${lastSpaces}`)
      }
    })
  }
}

/**
 * @param {RuleContext} context
 * @param {VEndTag | VStartTag} endTag
 * @param {VElement} sibling
 * @param {number} lineDifference
 */
function removeExcessLines(context, endTag, sibling, lineDifference) {
  if (lineDifference > 1) {
    let hasOnlyTextBetween = true
    for (
      let i = endTag.loc.start.line;
      i < sibling.loc.start.line - 1 && hasOnlyTextBetween;
      i++
    ) {
      hasOnlyTextBetween = !/^\s*$/.test(context.getSourceCode().lines[i])
    }
    if (!hasOnlyTextBetween) {
      context.report({
        messageId: 'never',
        loc: sibling.loc,
        // @ts-ignore
        fix(fixer) {
          const start = endTag.range[1]
          const end = sibling.range[0]
          const paddingText = context.getSourceCode().text.slice(start, end)
          const textBetween = splitLines(paddingText)
          let newTextBetween = `\n${textBetween.pop()}`
          for (let i = textBetween.length - 1; i >= 0; i--) {
            if (!/^\s*$/.test(textBetween[i])) {
              newTextBetween = `${i === 0 ? '' : '\n'}${
                textBetween[i]
              }${newTextBetween}`
            }
          }
          return fixer.replaceTextRange([start, end], `${newTextBetween}`)
        }
      })
    }
  }
}

/**
 * @param {RuleContext} context
 */
function checkNewline(context) {
  /** @type {Array<{blankLine: "always" | "never" | "consistent", prev: string, next: string}>} */
  const configureList = context.options[0] || [
    { blankLine: 'always', prev: '*', next: '*' }
  ]

  const reverseConfigureList = [...configureList].reverse()

  /**
   * It has the style of the first `blankLine="consistent"`.
   * @type {Map<VElement, "always" | "never">}
   */
  const firstConsistentBlankLines = new Map()

  /**
   * @param {VElement} block
   */
  return (block) => {
    if (!block.parent.parent) {
      return
    }

    const endTag = block.endTag || block.startTag
    const lowerSiblings = block.parent.children
      .filter(
        (element) =>
          element.type === 'VElement' && element.range !== block.range
      )
      .filter((sibling) => sibling.range[0] - endTag.range[1] >= 0)

    if (lowerSiblings.length === 0) {
      return
    }

    const closestSibling = /** @type {VElement} */ (lowerSiblings[0])

    const configure = reverseConfigureList.find(
      (configure) =>
        (configure.prev === '*' || block.name === configure.prev) &&
        (configure.next === '*' || closestSibling.name === configure.next)
    )

    if (!configure) {
      return
    }
    const lineDifference = closestSibling.loc.start.line - endTag.loc.end.line

    let blankLine = configure.blankLine
    if (blankLine === 'consistent') {
      const firstConsistentBlankLine = firstConsistentBlankLines.get(
        block.parent
      )
      if (firstConsistentBlankLine == null) {
        firstConsistentBlankLines.set(
          block.parent,
          lineDifference > 1 ? 'always' : 'never'
        )
        return
      }
      blankLine = firstConsistentBlankLine
    }

    if (blankLine === 'always') {
      insertNewLine(context, block, closestSibling, lineDifference)
    } else {
      removeExcessLines(context, endTag, closestSibling, lineDifference)
    }
  }
}

module.exports = {
  meta: {
    type: 'layout',
    docs: {
      description:
        'require or disallow newlines between sibling tags in template',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/padding-line-between-tags.html'
    },
    // eslint-disable-next-line eslint-plugin/require-meta-fixable -- fixer is not recognized
    fixable: 'whitespace',
    schema: [
      {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            blankLine: { enum: ['always', 'never', 'consistent'] },
            prev: { type: 'string' },
            next: { type: 'string' }
          },
          additionalProperties: false,
          required: ['blankLine', 'prev', 'next']
        }
      }
    ],
    messages: {
      never: 'Unexpected blank line before this tag.',
      always: 'Expected blank line before this tag.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    return utils.defineTemplateBodyVisitor(context, {
      VElement: checkNewline(context)
    })
  }
}

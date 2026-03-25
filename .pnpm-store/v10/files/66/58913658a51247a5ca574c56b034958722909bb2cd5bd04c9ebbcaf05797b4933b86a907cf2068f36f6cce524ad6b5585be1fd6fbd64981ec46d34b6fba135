/**
 * @author Yosuke ota
 * See LICENSE file in root directory for full license.
 */
'use strict'

const htmlComments = require('../utils/html-comments')

/**
 * Normalize options.
 * @param {number|"tab"|undefined} type The type of indentation.
 * @returns { { indentChar: string, indentSize: number, indentText: string } } Normalized options.
 */
function parseOptions(type) {
  const ret = {
    indentChar: ' ',
    indentSize: 2,
    indentText: ''
  }

  if (Number.isSafeInteger(type)) {
    ret.indentSize = Number(type)
  } else if (type === 'tab') {
    ret.indentChar = '\t'
    ret.indentSize = 1
  }
  ret.indentText = ret.indentChar.repeat(ret.indentSize)

  return ret
}

/**
 * @param {string} s
 * @param {string} [unitChar]
 */
function toDisplay(s, unitChar) {
  if (s.length === 0 && unitChar) {
    return `0 ${toUnit(unitChar)}s`
  }
  const char = s[0]
  if ((char === ' ' || char === '\t') && [...s].every((c) => c === char)) {
    return `${s.length} ${toUnit(char)}${s.length === 1 ? '' : 's'}`
  }

  return JSON.stringify(s)
}

/** @param {string} char */
function toUnit(char) {
  if (char === '\t') {
    return 'tab'
  }
  if (char === ' ') {
    return 'space'
  }
  return JSON.stringify(char)
}

module.exports = {
  meta: {
    type: 'layout',

    docs: {
      description: 'enforce consistent indentation in HTML comments',
      categories: undefined,
      url: 'https://eslint.vuejs.org/rules/html-comment-indent.html'
    },
    fixable: 'whitespace',
    schema: [
      {
        oneOf: [{ type: 'integer', minimum: 0 }, { enum: ['tab'] }]
      }
    ],
    messages: {
      unexpectedBaseIndentation:
        'Expected base point indentation of {{expected}}, but found {{actual}}.',
      missingBaseIndentation:
        'Expected base point indentation of {{expected}}, but not found.',
      unexpectedIndentationCharacter:
        'Expected {{expected}} character, but found {{actual}} character.',
      unexpectedIndentation:
        'Expected indentation of {{expected}} but found {{actual}}.',
      unexpectedRelativeIndentation:
        'Expected relative indentation of {{expected}} but found {{actual}}.'
    }
  },
  /** @param {RuleContext} context */
  create(context) {
    const options = parseOptions(context.options[0])
    const sourceCode = context.getSourceCode()
    return htmlComments.defineVisitor(
      context,
      null,
      (comment) => {
        const baseIndentText = getLineIndentText(comment.open.loc.start.line)
        let endLine
        if (comment.value) {
          const startLine = comment.value.loc.start.line
          endLine = comment.value.loc.end.line

          const checkStartLine =
            comment.open.loc.end.line === startLine ? startLine + 1 : startLine

          for (let line = checkStartLine; line <= endLine; line++) {
            validateIndentForLine(line, baseIndentText, 1)
          }
        } else {
          endLine = comment.open.loc.end.line
        }

        if (endLine < comment.close.loc.start.line) {
          // `-->`
          validateIndentForLine(comment.close.loc.start.line, baseIndentText, 0)
        }
      },
      { includeDirectives: true }
    )

    /**
     * Checks whether the given line is a blank line.
     * @param {number} line The number of line. Begins with 1.
     * @returns {boolean} `true` if the given line is a blank line
     */
    function isEmptyLine(line) {
      const lineText = sourceCode.getLines()[line - 1]
      return !lineText.trim()
    }

    /**
     * Get the actual indentation of the given line.
     * @param {number} line The number of line. Begins with 1.
     * @returns {string} The actual indentation text
     */
    function getLineIndentText(line) {
      const lineText = sourceCode.getLines()[line - 1]
      const charIndex = lineText.search(/\S/)
      // already checked
      // if (charIndex < 0) {
      //   return lineText
      // }
      return lineText.slice(0, charIndex)
    }

    /**
     * Define the function which fixes the problem.
     * @param {number} line The number of line.
     * @param {string} actualIndentText The actual indentation text.
     * @param {string} expectedIndentText The expected indentation text.
     * @returns { (fixer: RuleFixer) => Fix } The defined function.
     */
    function defineFix(line, actualIndentText, expectedIndentText) {
      return (fixer) => {
        const start = sourceCode.getIndexFromLoc({
          line,
          column: 0
        })
        return fixer.replaceTextRange(
          [start, start + actualIndentText.length],
          expectedIndentText
        )
      }
    }

    /**
     * Validate the indentation of a line.
     * @param {number} line The number of line. Begins with 1.
     * @param {string} baseIndentText The expected base indentation text.
     * @param {number} offset The number of the indentation offset.
     */
    function validateIndentForLine(line, baseIndentText, offset) {
      if (isEmptyLine(line)) {
        return
      }
      const actualIndentText = getLineIndentText(line)

      const expectedOffsetIndentText = options.indentText.repeat(offset)
      const expectedIndentText = baseIndentText + expectedOffsetIndentText

      // validate base indent
      if (
        baseIndentText &&
        (actualIndentText.length < baseIndentText.length ||
          !actualIndentText.startsWith(baseIndentText))
      ) {
        context.report({
          loc: {
            start: { line, column: 0 },
            end: { line, column: actualIndentText.length }
          },
          messageId: actualIndentText
            ? 'unexpectedBaseIndentation'
            : 'missingBaseIndentation',
          data: {
            expected: toDisplay(baseIndentText),
            actual: toDisplay(actualIndentText.slice(0, baseIndentText.length))
          },
          fix: defineFix(line, actualIndentText, expectedIndentText)
        })
        return
      }

      const actualOffsetIndentText = actualIndentText.slice(
        baseIndentText.length
      )

      // validate indent charctor
      for (const [i, char] of [...actualOffsetIndentText].entries()) {
        if (char !== options.indentChar) {
          context.report({
            loc: {
              start: { line, column: baseIndentText.length + i },
              end: { line, column: baseIndentText.length + i + 1 }
            },
            messageId: 'unexpectedIndentationCharacter',
            data: {
              expected: toUnit(options.indentChar),
              actual: toUnit(char)
            },
            fix: defineFix(line, actualIndentText, expectedIndentText)
          })
          return
        }
      }

      // validate indent length
      if (actualOffsetIndentText.length !== expectedOffsetIndentText.length) {
        context.report({
          loc: {
            start: { line, column: baseIndentText.length },
            end: { line, column: actualIndentText.length }
          },
          messageId: baseIndentText
            ? 'unexpectedRelativeIndentation'
            : 'unexpectedIndentation',
          data: {
            expected: toDisplay(expectedOffsetIndentText, options.indentChar),
            actual: toDisplay(actualOffsetIndentText, options.indentChar)
          },
          fix: defineFix(line, actualIndentText, expectedIndentText)
        })
      }
    }
  }
}

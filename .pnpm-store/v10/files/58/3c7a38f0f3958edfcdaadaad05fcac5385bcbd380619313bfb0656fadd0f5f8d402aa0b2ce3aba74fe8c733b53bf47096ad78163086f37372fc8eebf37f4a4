/**
 * @author Toru Nagashima <https://github.com/mysticatea>
 * See LICENSE file in root directory for full license.
 */
'use strict'

const {
  isArrowToken,
  isOpeningParenToken,
  isClosingParenToken,
  isNotOpeningParenToken,
  isNotClosingParenToken,
  isOpeningBraceToken,
  isClosingBraceToken,
  isNotOpeningBraceToken,
  isOpeningBracketToken,
  isClosingBracketToken,
  isSemicolonToken,
  isNotSemicolonToken
} = require('@eslint-community/eslint-utils')
const {
  isComment,
  isNotComment,
  isWildcard,
  isExtendsKeyword,
  isNotWhitespace,
  isNotEmptyTextNode,
  isPipeOperator,
  last
} = require('./indent-utils')
const { defineVisitor: tsDefineVisitor } = require('./indent-ts')

/**
 * @typedef {import('../../typings/eslint-plugin-vue/util-types/node').HasLocation} HasLocation
 * @typedef { { type: string } & HasLocation } MaybeNode
 */

const LT_CHAR = /[\n\r\u2028\u2029]/
const LINES = /[^\n\r\u2028\u2029]+(?:$|\r\n|[\n\r\u2028\u2029])/g
const BLOCK_COMMENT_PREFIX = /^\s*\*/
const ITERATION_OPTS = Object.freeze({
  includeComments: true,
  filter: isNotWhitespace
})
const PREFORMATTED_ELEMENT_NAMES = new Set(['pre', 'textarea'])

/**
 * @typedef {object} IndentOptions
 * @property { " " | "\t" } IndentOptions.indentChar
 * @property {number} IndentOptions.indentSize
 * @property {number} IndentOptions.baseIndent
 * @property {number} IndentOptions.attribute
 * @property {object} IndentOptions.closeBracket
 * @property {number} IndentOptions.closeBracket.startTag
 * @property {number} IndentOptions.closeBracket.endTag
 * @property {number} IndentOptions.closeBracket.selfClosingTag
 * @property {number} IndentOptions.switchCase
 * @property {boolean} IndentOptions.alignAttributesVertically
 * @property {string[]} IndentOptions.ignores
 */
/**
 * @typedef {object} IndentUserOptions
 * @property { " " | "\t" } [IndentUserOptions.indentChar]
 * @property {number} [IndentUserOptions.indentSize]
 * @property {number} [IndentUserOptions.baseIndent]
 * @property {number} [IndentUserOptions.attribute]
 * @property {IndentOptions['closeBracket'] | number} [IndentUserOptions.closeBracket]
 * @property {number} [IndentUserOptions.switchCase]
 * @property {boolean} [IndentUserOptions.alignAttributesVertically]
 * @property {string[]} [IndentUserOptions.ignores]
 */
/**
 * Normalize options.
 * @param {number|"tab"|undefined} type The type of indentation.
 * @param {IndentUserOptions} options Other options.
 * @param {Partial<IndentOptions>} defaultOptions The default value of options.
 * @returns {IndentOptions} Normalized options.
 */
function parseOptions(type, options, defaultOptions) {
  /** @type {IndentOptions} */
  const ret = Object.assign(
    {
      indentChar: ' ',
      indentSize: 2,
      baseIndent: 0,
      attribute: 1,
      closeBracket: {
        startTag: 0,
        endTag: 0,
        selfClosingTag: 0
      },
      switchCase: 0,
      alignAttributesVertically: true,
      ignores: []
    },
    defaultOptions
  )

  if (Number.isSafeInteger(type)) {
    ret.indentSize = Number(type)
  } else if (type === 'tab') {
    ret.indentChar = '\t'
    ret.indentSize = 1
  }

  if (options.baseIndent != null && Number.isSafeInteger(options.baseIndent)) {
    ret.baseIndent = options.baseIndent
  }
  if (options.attribute != null && Number.isSafeInteger(options.attribute)) {
    ret.attribute = options.attribute
  }
  if (Number.isSafeInteger(options.closeBracket)) {
    const num = Number(options.closeBracket)
    ret.closeBracket = {
      startTag: num,
      endTag: num,
      selfClosingTag: num
    }
  } else if (options.closeBracket) {
    ret.closeBracket = Object.assign(
      {
        startTag: 0,
        endTag: 0,
        selfClosingTag: 0
      },
      options.closeBracket
    )
  }
  if (options.switchCase != null && Number.isSafeInteger(options.switchCase)) {
    ret.switchCase = options.switchCase
  }

  if (options.alignAttributesVertically != null) {
    ret.alignAttributesVertically = options.alignAttributesVertically
  }
  if (options.ignores != null) {
    ret.ignores = options.ignores
  }

  return ret
}

/**
 * Check whether the node is at the beginning of line.
 * @param {MaybeNode|null} node The node to check.
 * @param {number} index The index of the node in the nodes.
 * @param {(MaybeNode|null)[]} nodes The array of nodes.
 * @returns {boolean} `true` if the node is at the beginning of line.
 */
function isBeginningOfLine(node, index, nodes) {
  if (node != null) {
    for (let i = index - 1; i >= 0; --i) {
      const prevNode = nodes[i]
      if (prevNode == null) {
        continue
      }

      return node.loc.start.line !== prevNode.loc.end.line
    }
  }
  return false
}

/**
 * Check whether a given token is a closing token which triggers unindent.
 * @param {Token} token The token to check.
 * @returns {boolean} `true` if the token is a closing token.
 */
function isClosingToken(token) {
  return (
    token != null &&
    (token.type === 'HTMLEndTagOpen' ||
      token.type === 'VExpressionEnd' ||
      (token.type === 'Punctuator' &&
        (token.value === ')' || token.value === '}' || token.value === ']')))
  )
}

/**
 * Checks whether  a given token is a optional token.
 * @param {Token} token The token to check.
 * @returns {boolean} `true` if the token is a optional token.
 */
function isOptionalToken(token) {
  return token.type === 'Punctuator' && token.value === '?.'
}

/**
 * Creates AST event handlers for html-indent.
 *
 * @param {RuleContext} context The rule context.
 * @param {ParserServices.TokenStore | SourceCode} tokenStore The token store object to get tokens.
 * @param {Partial<IndentOptions>} defaultOptions The default value of options.
 * @returns {NodeListener} AST event handlers.
 */
module.exports.defineVisitor = function create(
  context,
  tokenStore,
  defaultOptions
) {
  if (!context.getFilename().endsWith('.vue')) return {}

  const options = parseOptions(
    context.options[0],
    context.options[1] || {},
    defaultOptions
  )
  const sourceCode = context.getSourceCode()
  /**
   * @typedef { { baseToken: Token | null, offset: number, baseline: boolean, expectedIndent: number | undefined } } OffsetData
   */
  /** @type {Map<Token|null, OffsetData>} */
  const offsets = new Map()
  const ignoreTokens = new Set()

  /**
   * Set offset to the given tokens.
   * @param {Token|Token[]|null|(Token|null)[]} token The token to set.
   * @param {number} offset The offset of the tokens.
   * @param {Token} baseToken The token of the base offset.
   * @returns {void}
   */
  function setOffset(token, offset, baseToken) {
    if (!token || token === baseToken) {
      return
    }
    if (Array.isArray(token)) {
      for (const t of token) {
        if (!t || t === baseToken) continue
        offsets.set(t, {
          baseToken,
          offset,
          baseline: false,
          expectedIndent: undefined
        })
      }
    } else {
      offsets.set(token, {
        baseToken,
        offset,
        baseline: false,
        expectedIndent: undefined
      })
    }
  }

  /**
   * Copy offset to the given tokens from srcToken.
   * @param {Token} token The token to set.
   * @param {Token} srcToken The token of the source offset.
   * @returns {void}
   */
  function copyOffset(token, srcToken) {
    if (!token) {
      return
    }
    const offsetData = offsets.get(srcToken)
    if (!offsetData) {
      return
    }

    setOffset(
      token,
      offsetData.offset,
      /** @type {Token} */ (offsetData.baseToken)
    )
    if (offsetData.baseline) {
      setBaseline(token)
    }
    const o = /** @type {OffsetData} */ (offsets.get(token))
    o.expectedIndent = offsetData.expectedIndent
  }

  /**
   * Set baseline flag to the given token.
   * @param {Token} token The token to set.
   * @returns {void}
   */
  function setBaseline(token) {
    const offsetInfo = offsets.get(token)
    if (offsetInfo != null) {
      offsetInfo.baseline = true
    }
  }

  /**
   * Sets preformatted tokens to the given element node.
   * @param {VElement} node The node to set.
   * @returns {void}
   */
  function setPreformattedTokens(node) {
    const endToken =
      (node.endTag && tokenStore.getFirstToken(node.endTag)) ||
      tokenStore.getTokenAfter(node)

    /** @type {SourceCode.CursorWithSkipOptions} */
    const cursorOptions = {
      includeComments: true,
      filter: (token) =>
        token != null &&
        (token.type === 'HTMLText' ||
          token.type === 'HTMLRCDataText' ||
          token.type === 'HTMLTagOpen' ||
          token.type === 'HTMLEndTagOpen' ||
          token.type === 'HTMLComment')
    }
    const contentTokens = endToken
      ? tokenStore.getTokensBetween(node.startTag, endToken, cursorOptions)
      : tokenStore.getTokensAfter(node.startTag, cursorOptions)

    for (const token of contentTokens) {
      ignoreTokens.add(token)
    }
    ignoreTokens.add(endToken)
  }

  /**
   * Get the first and last tokens of the given node.
   * If the node is parenthesized, this gets the outermost parentheses.
   * @param {MaybeNode} node The node to get.
   * @param {number} [borderOffset] The least offset of the first token. Defailt is 0. This value is used to prevent false positive in the following case: `(a) => {}` The parentheses are enclosing the whole parameter part rather than the first parameter, but this offset parameter is needed to distinguish.
   * @returns {{firstToken:Token,lastToken:Token}} The gotten tokens.
   */
  function getFirstAndLastTokens(node, borderOffset = 0) {
    borderOffset = Math.trunc(borderOffset)

    let firstToken = tokenStore.getFirstToken(node)
    let lastToken = tokenStore.getLastToken(node)

    // Get the outermost left parenthesis if it's parenthesized.
    let t, u
    while (
      (t = tokenStore.getTokenBefore(firstToken)) != null &&
      (u = tokenStore.getTokenAfter(lastToken)) != null &&
      isOpeningParenToken(t) &&
      isClosingParenToken(u) &&
      t.range[0] >= borderOffset
    ) {
      firstToken = t
      lastToken = u
    }

    return { firstToken, lastToken }
  }

  /**
   * Process the given node list.
   * The first node is offsetted from the given left token.
   * Rest nodes are adjusted to the first node.
   * @param {(MaybeNode|null)[]} nodeList The node to process.
   * @param {MaybeNode|Token|null} left The left parenthesis token.
   * @param {MaybeNode|Token|null} right The right parenthesis token.
   * @param {number} offset The offset to set.
   * @param {boolean} [alignVertically=true] The flag to align vertically. If `false`, this doesn't align vertically even if the first node is not at beginning of line.
   * @returns {void}
   */
  function processNodeList(nodeList, left, right, offset, alignVertically) {
    let t
    const leftToken = left && tokenStore.getFirstToken(left)
    const rightToken = right && tokenStore.getFirstToken(right)

    if (nodeList.length > 0) {
      let baseToken = null
      let lastToken = left
      const alignTokensBeforeBaseToken = []
      const alignTokens = []

      for (const node of nodeList) {
        if (node == null) {
          // Holes of an array.
          continue
        }
        const elementTokens = getFirstAndLastTokens(
          node,
          lastToken == null ? 0 : lastToken.range[1]
        )

        // Collect comma/comment tokens between the last token of the previous node and the first token of this node.
        if (lastToken != null) {
          t = lastToken
          while (
            (t = tokenStore.getTokenAfter(t, ITERATION_OPTS)) != null &&
            t.range[1] <= elementTokens.firstToken.range[0]
          ) {
            if (baseToken == null) {
              alignTokensBeforeBaseToken.push(t)
            } else {
              alignTokens.push(t)
            }
          }
        }

        if (baseToken == null) {
          baseToken = elementTokens.firstToken
        } else {
          alignTokens.push(elementTokens.firstToken)
        }

        // Save the last token to find tokens between this node and the next node.
        lastToken = elementTokens.lastToken
      }

      // Check trailing commas and comments.
      if (rightToken != null && lastToken != null) {
        t = lastToken
        while (
          (t = tokenStore.getTokenAfter(t, ITERATION_OPTS)) != null &&
          t.range[1] <= rightToken.range[0]
        ) {
          if (baseToken == null) {
            alignTokensBeforeBaseToken.push(t)
          } else {
            alignTokens.push(t)
          }
        }
      }

      // Set offsets.
      if (leftToken != null) {
        setOffset(alignTokensBeforeBaseToken, offset, leftToken)
      }
      if (baseToken != null) {
        // Set offset to the first token.
        if (leftToken != null) {
          setOffset(baseToken, offset, leftToken)
        }

        // Set baseline.
        if (nodeList.some(isBeginningOfLine)) {
          setBaseline(baseToken)
        }

        if (alignVertically === false && leftToken != null) {
          // Align tokens relatively to the left token.
          setOffset(alignTokens, offset, leftToken)
        } else {
          // Align the rest tokens to the first token.
          setOffset(alignTokens, 0, baseToken)
        }
      }
    }

    if (rightToken != null && leftToken != null) {
      setOffset(rightToken, 0, leftToken)
    }
  }

  /**
   * Process the given node as body.
   * The body node maybe a block statement or an expression node.
   * @param {ASTNode} node The body node to process.
   * @param {Token} baseToken The base token.
   * @returns {void}
   */
  function processMaybeBlock(node, baseToken) {
    const firstToken = getFirstAndLastTokens(node).firstToken
    setOffset(firstToken, isOpeningBraceToken(firstToken) ? 0 : 1, baseToken)
  }

  /**
   * Process semicolons of the given statement node.
   * @param {MaybeNode} node The statement node to process.
   * @returns {void}
   */
  function processSemicolons(node) {
    const firstToken = tokenStore.getFirstToken(node)
    const lastToken = tokenStore.getLastToken(node)
    if (isSemicolonToken(lastToken) && firstToken !== lastToken) {
      setOffset(lastToken, 0, firstToken)
    }

    // Set to the semicolon of the previous token for semicolon-free style.
    // E.g.,
    //   foo
    //   ;[1,2,3].forEach(f)
    const info = offsets.get(firstToken)
    const prevToken = tokenStore.getTokenBefore(firstToken)
    if (
      info != null &&
      prevToken &&
      isSemicolonToken(prevToken) &&
      prevToken.loc.end.line === firstToken.loc.start.line
    ) {
      offsets.set(prevToken, info)
    }
  }

  /**
   * Find the head of chaining nodes.
   * @param {ASTNode} node The start node to find the head.
   * @returns {Token} The head token of the chain.
   */
  function getChainHeadToken(node) {
    const type = node.type
    while (node.parent && node.parent.type === type) {
      const prevToken = tokenStore.getTokenBefore(node)
      if (isOpeningParenToken(prevToken)) {
        // The chaining is broken by parentheses.
        break
      }
      node = node.parent
    }
    return tokenStore.getFirstToken(node)
  }

  /**
   * Check whether a given token is the first token of:
   *
   * - ExpressionStatement
   * - VExpressionContainer
   * - A parameter of CallExpression/NewExpression
   * - An element of ArrayExpression
   * - An expression of SequenceExpression
   *
   * @param {Token} token The token to check.
   * @param {ASTNode} belongingNode The node that the token is belonging to.
   * @returns {boolean} `true` if the token is the first token of an element.
   */
  function isBeginningOfElement(token, belongingNode) {
    let node = belongingNode

    while (node != null && node.parent != null) {
      const parent = node.parent
      if (
        parent.type.endsWith('Statement') ||
        parent.type.endsWith('Declaration')
      ) {
        return parent.range[0] === token.range[0]
      }
      if (parent.type === 'VExpressionContainer') {
        if (node.range[0] !== token.range[0]) {
          return false
        }
        const prevToken = tokenStore.getTokenBefore(belongingNode)
        if (isOpeningParenToken(prevToken)) {
          // It is not the first token because it is enclosed in parentheses.
          return false
        }
        return true
      }
      if (parent.type === 'CallExpression' || parent.type === 'NewExpression') {
        const openParen = /** @type {Token} */ (
          tokenStore.getTokenAfter(parent.callee, isNotClosingParenToken)
        )
        return parent.arguments.some(
          (param) =>
            getFirstAndLastTokens(param, openParen.range[1]).firstToken
              .range[0] === token.range[0]
        )
      }
      if (parent.type === 'ArrayExpression') {
        return parent.elements.some(
          (element) =>
            element != null &&
            getFirstAndLastTokens(element).firstToken.range[0] ===
              token.range[0]
        )
      }
      if (parent.type === 'SequenceExpression') {
        return parent.expressions.some(
          (expr) =>
            getFirstAndLastTokens(expr).firstToken.range[0] === token.range[0]
        )
      }

      node = parent
    }

    return false
  }

  /**
   * Set the base indentation to a given top-level AST node.
   * @param {ASTNode} node The node to set.
   * @param {number} expectedIndent The number of expected indent.
   * @returns {void}
   */
  function processTopLevelNode(node, expectedIndent) {
    const token = tokenStore.getFirstToken(node)
    const offsetInfo = offsets.get(token)
    if (offsetInfo == null) {
      offsets.set(token, {
        baseToken: null,
        offset: 0,
        baseline: false,
        expectedIndent
      })
    } else {
      offsetInfo.expectedIndent = expectedIndent
    }
  }

  /**
   * Ignore all tokens of the given node.
   * @param {ASTNode} node The node to ignore.
   * @returns {void}
   */
  function ignore(node) {
    for (const token of tokenStore.getTokens(node)) {
      offsets.delete(token)
      ignoreTokens.add(token)
    }
  }

  /**
   * Define functions to ignore nodes into the given visitor.
   * @param {NodeListener} visitor The visitor to define functions to ignore nodes.
   * @returns {NodeListener} The visitor.
   */
  function processIgnores(visitor) {
    for (const ignorePattern of options.ignores) {
      const key = `${ignorePattern}:exit`

      if (visitor.hasOwnProperty(key)) {
        const handler = visitor[key]
        visitor[key] = function (node, ...args) {
          // @ts-expect-error
          const ret = handler.call(this, node, ...args)
          ignore(node)
          return ret
        }
      } else {
        visitor[key] = ignore
      }
    }

    return visitor
  }

  /**
   * Calculate correct indentation of the line of the given tokens.
   * @param {Token[]} tokens Tokens which are on the same line.
   * @returns { { expectedIndent: number, expectedBaseIndent: number } |null } Correct indentation. If it failed to calculate then `null`.
   */
  function getExpectedIndents(tokens) {
    const expectedIndents = []

    for (const [i, token] of tokens.entries()) {
      const offsetInfo = offsets.get(token)

      if (offsetInfo != null) {
        if (offsetInfo.expectedIndent == null) {
          const baseOffsetInfo = offsets.get(offsetInfo.baseToken)
          if (
            baseOffsetInfo != null &&
            baseOffsetInfo.expectedIndent != null &&
            (i === 0 || !baseOffsetInfo.baseline)
          ) {
            expectedIndents.push(
              baseOffsetInfo.expectedIndent +
                offsetInfo.offset * options.indentSize
            )
            if (baseOffsetInfo.baseline) {
              break
            }
          }
        } else {
          expectedIndents.push(offsetInfo.expectedIndent)
        }
      }
    }
    if (expectedIndents.length === 0) {
      return null
    }

    return {
      expectedIndent: expectedIndents[0],
      expectedBaseIndent: Math.min(...expectedIndents)
    }
  }

  /**
   * Get the text of the indentation part of the line which the given token is on.
   * @param {Token} firstToken The first token on a line.
   * @returns {string} The text of indentation part.
   */
  function getIndentText(firstToken) {
    const text = sourceCode.text
    let i = firstToken.range[0] - 1

    while (i >= 0 && !LT_CHAR.test(text[i])) {
      i -= 1
    }

    return text.slice(i + 1, firstToken.range[0])
  }

  /**
   * Define the function which fixes the problem.
   * @param {Token} token The token to fix.
   * @param {number} actualIndent The number of actual indentation.
   * @param {number} expectedIndent The number of expected indentation.
   * @returns { (fixer: RuleFixer) => Fix } The defined function.
   */
  function defineFix(token, actualIndent, expectedIndent) {
    if (token.type === 'Block' && token.loc.start.line !== token.loc.end.line) {
      // Fix indentation in multiline block comments.
      const lines = sourceCode.getText(token).match(LINES) || []
      const firstLine = lines.shift()
      if (lines.every((l) => BLOCK_COMMENT_PREFIX.test(l))) {
        return (fixer) => {
          /** @type {Range} */
          const range = [token.range[0] - actualIndent, token.range[1]]
          const indent = options.indentChar.repeat(expectedIndent)

          return fixer.replaceTextRange(
            range,
            `${indent}${firstLine}${lines
              .map((l) => l.replace(BLOCK_COMMENT_PREFIX, `${indent} *`))
              .join('')}`
          )
        }
      }
    }

    return (fixer) => {
      /** @type {Range} */
      const range = [token.range[0] - actualIndent, token.range[0]]
      const indent = options.indentChar.repeat(expectedIndent)
      return fixer.replaceTextRange(range, indent)
    }
  }

  /**
   * Validate the given token with the pre-calculated expected indentation.
   * @param {Token} token The token to validate.
   * @param {number} expectedIndent The expected indentation.
   * @param {[number, number?]} [optionalExpectedIndents] The optional expected indentation.
   * @returns {void}
   */
  function validateCore(token, expectedIndent, optionalExpectedIndents) {
    const line = token.loc.start.line
    const indentText = getIndentText(token)

    // If there is no line terminator after the `<script>` start tag,
    // `indentText` contains non-whitespace characters.
    // In that case, do nothing in order to prevent removing the `<script>` tag.
    if (indentText.trim() !== '') {
      return
    }

    const actualIndent = token.loc.start.column
    const unit = options.indentChar === '\t' ? 'tab' : 'space'

    for (const [i, char] of [...indentText].entries()) {
      if (char !== options.indentChar) {
        context.report({
          loc: {
            start: { line, column: i },
            end: { line, column: i + 1 }
          },
          message:
            'Expected {{expected}} character, but found {{actual}} character.',
          data: {
            expected: JSON.stringify(options.indentChar),
            actual: JSON.stringify(char)
          },
          fix: defineFix(token, actualIndent, expectedIndent)
        })
        return
      }
    }

    if (
      actualIndent !== expectedIndent &&
      (optionalExpectedIndents == null ||
        !optionalExpectedIndents.includes(actualIndent))
    ) {
      context.report({
        loc: {
          start: { line, column: 0 },
          end: { line, column: actualIndent }
        },
        message:
          'Expected indentation of {{expectedIndent}} {{unit}}{{expectedIndentPlural}} but found {{actualIndent}} {{unit}}{{actualIndentPlural}}.',
        data: {
          expectedIndent,
          actualIndent,
          unit,
          expectedIndentPlural: expectedIndent === 1 ? '' : 's',
          actualIndentPlural: actualIndent === 1 ? '' : 's'
        },
        fix: defineFix(token, actualIndent, expectedIndent)
      })
    }
  }

  /**
   * Get the expected indent of comments.
   * @param {Token} nextToken The next token of comments.
   * @param {number} nextExpectedIndent The expected indent of the next token.
   * @param {number|undefined} lastExpectedIndent The expected indent of the last token.
   * @returns {[number, number?]}
   */
  function getCommentExpectedIndents(
    nextToken,
    nextExpectedIndent,
    lastExpectedIndent
  ) {
    if (typeof lastExpectedIndent === 'number' && isClosingToken(nextToken)) {
      if (nextExpectedIndent === lastExpectedIndent) {
        // For solo comment. E.g.,
        // <div>
        //    <!-- comment -->
        // </div>
        return [nextExpectedIndent + options.indentSize, nextExpectedIndent]
      }

      // For last comment. E.g.,
      // <div>
      //    <div></div>
      //    <!-- comment -->
      // </div>
      return [lastExpectedIndent, nextExpectedIndent]
    }

    // Adjust to next normally. E.g.,
    // <div>
    //    <!-- comment -->
    //    <div></div>
    // </div>
    return [nextExpectedIndent]
  }

  /**
   * Validate indentation of the line that the given tokens are on.
   * @param {Token[]} tokens The tokens on the same line to validate.
   * @param {Token[]} comments The comments which are on the immediately previous lines of the tokens.
   * @param {Token|null} lastToken The last validated token. Comments can adjust to the token.
   * @returns {void}
   */
  function validate(tokens, comments, lastToken) {
    // Calculate and save expected indentation.
    const firstToken = tokens[0]
    const actualIndent = firstToken.loc.start.column
    const expectedIndents = getExpectedIndents(tokens)
    if (!expectedIndents) {
      return
    }

    const expectedBaseIndent = expectedIndents.expectedBaseIndent
    const expectedIndent = expectedIndents.expectedIndent

    // Debug log
    // console.log('line', firstToken.loc.start.line, '=', { actualIndent, expectedIndent }, 'from:')
    // for (const token of tokens) {
    //   const offsetInfo = offsets.get(token)
    //   if (offsetInfo == null) {
    //     console.log('    ', JSON.stringify(sourceCode.getText(token)), 'is unknown.')
    //   } else if (offsetInfo.expectedIndent != null) {
    //     console.log('    ', JSON.stringify(sourceCode.getText(token)), 'is fixed at', offsetInfo.expectedIndent, '.')
    //   } else {
    //     const baseOffsetInfo = offsets.get(offsetInfo.baseToken)
    //     console.log('    ', JSON.stringify(sourceCode.getText(token)), 'is', offsetInfo.offset, 'offset from ', JSON.stringify(sourceCode.getText(offsetInfo.baseToken)), '( line:', offsetInfo.baseToken && offsetInfo.baseToken.loc.start.line, ', indent:', baseOffsetInfo && baseOffsetInfo.expectedIndent, ', baseline:', baseOffsetInfo && baseOffsetInfo.baseline, ')')
    //   }
    // }

    // Save.
    const baseline = new Set()
    for (const token of tokens) {
      const offsetInfo = offsets.get(token)
      if (offsetInfo != null) {
        if (offsetInfo.baseline) {
          // This is a baseline token, so the expected indent is the column of this token.
          offsetInfo.expectedIndent =
            options.indentChar === ' '
              ? Math.max(
                  0,
                  token.loc.start.column + expectedBaseIndent - actualIndent
                )
              : // In hard-tabs mode, it cannot align tokens strictly, so use one additional offset.
                // But the additional offset isn't needed if it's at the beginning of the line.
                expectedBaseIndent + (token === tokens[0] ? 0 : 1)
          baseline.add(token)
        } else if (baseline.has(offsetInfo.baseToken)) {
          // The base token is a baseline token on this line, so inherit it.
          offsetInfo.expectedIndent = /** @type {OffsetData} */ (
            offsets.get(offsetInfo.baseToken)
          ).expectedIndent
          baseline.add(token)
        } else {
          // Otherwise, set the expected indent of this line.
          offsetInfo.expectedIndent = expectedBaseIndent
        }
      }
    }

    // It does not validate ignore tokens.
    if (ignoreTokens.has(firstToken)) {
      return
    }

    // Calculate the expected indents for comments.
    // It allows the same indent level with the previous line.
    const lastOffsetInfo = offsets.get(lastToken)
    const lastExpectedIndent = lastOffsetInfo && lastOffsetInfo.expectedIndent
    const commentOptionalExpectedIndents = getCommentExpectedIndents(
      firstToken,
      expectedIndent,
      lastExpectedIndent
    )

    // Validate.
    for (const comment of comments) {
      const commentExpectedIndents = getExpectedIndents([comment])
      const commentExpectedIndent = commentExpectedIndents
        ? commentExpectedIndents.expectedIndent
        : commentOptionalExpectedIndents[0]

      validateCore(
        comment,
        commentExpectedIndent,
        commentOptionalExpectedIndents
      )
    }
    validateCore(firstToken, expectedIndent)
  }

  // ------------------------------------------------------------------------------
  // Main
  // ------------------------------------------------------------------------------

  /** @type {Set<string>} */
  const knownNodes = new Set()
  /** @type {TemplateListener} */
  const visitor = {
    // ----------------------------------------------------------------------
    // Vue NODES
    // ----------------------------------------------------------------------
    /** @param {VAttribute | VDirective} node */
    VAttribute(node) {
      const keyToken = tokenStore.getFirstToken(node)
      const eqToken = tokenStore.getTokenAfter(node.key)

      if (eqToken != null && eqToken.range[1] <= node.range[1]) {
        setOffset(eqToken, 1, keyToken)

        const valueToken = tokenStore.getTokenAfter(eqToken)
        if (valueToken != null && valueToken.range[1] <= node.range[1]) {
          setOffset(valueToken, 1, keyToken)
        }
      }
    },
    /** @param {VElement} node */
    VElement(node) {
      if (PREFORMATTED_ELEMENT_NAMES.has(node.name)) {
        const startTagToken = tokenStore.getFirstToken(node)
        const endTagToken = node.endTag && tokenStore.getFirstToken(node.endTag)
        setOffset(endTagToken, 0, startTagToken)
        setPreformattedTokens(node)
      } else {
        const isTopLevel = node.parent.type !== 'VElement'
        const offset = isTopLevel ? options.baseIndent : 1
        processNodeList(
          node.children.filter(isNotEmptyTextNode),
          node.startTag,
          node.endTag,
          offset,
          false
        )
      }
    },
    /** @param {VEndTag} node */
    VEndTag(node) {
      const element = node.parent
      const startTagOpenToken = tokenStore.getFirstToken(element.startTag)
      const closeToken = tokenStore.getLastToken(node)

      if (closeToken.type.endsWith('TagClose')) {
        setOffset(closeToken, options.closeBracket.endTag, startTagOpenToken)
      }
    },
    /** @param {VExpressionContainer} node */
    VExpressionContainer(node) {
      if (
        node.expression != null &&
        node.range[0] !== node.expression.range[0]
      ) {
        const startQuoteToken = tokenStore.getFirstToken(node)
        const endQuoteToken = tokenStore.getLastToken(node)
        const childToken = tokenStore.getTokenAfter(startQuoteToken)

        setOffset(childToken, 1, startQuoteToken)
        setOffset(endQuoteToken, 0, startQuoteToken)
      }
    },
    /** @param {VFilter} node */
    VFilter(node) {
      const idToken = tokenStore.getFirstToken(node)
      const lastToken = tokenStore.getLastToken(node)
      if (isClosingParenToken(lastToken)) {
        const leftParenToken = tokenStore.getTokenAfter(node.callee)
        setOffset(leftParenToken, 1, idToken)
        processNodeList(node.arguments, leftParenToken, lastToken, 1)
      }
    },
    /** @param {VFilterSequenceExpression} node */
    VFilterSequenceExpression(node) {
      if (node.filters.length === 0) {
        return
      }

      const firstToken = tokenStore.getFirstToken(node)
      /** @type {(Token|null)[]} */
      const tokens = []

      for (const filter of node.filters) {
        tokens.push(
          tokenStore.getTokenBefore(filter, isPipeOperator),
          tokenStore.getFirstToken(filter)
        )
      }

      setOffset(tokens, 1, firstToken)
    },
    /** @param {VForExpression} node */
    VForExpression(node) {
      const firstToken = tokenStore.getFirstToken(node)
      const lastOfLeft = last(node.left) || firstToken
      const inToken = /** @type {Token} */ (
        tokenStore.getTokenAfter(lastOfLeft, isNotClosingParenToken)
      )
      const rightToken = tokenStore.getFirstToken(node.right)

      if (isOpeningParenToken(firstToken)) {
        const rightToken = tokenStore.getTokenAfter(
          lastOfLeft,
          isClosingParenToken
        )
        processNodeList(node.left, firstToken, rightToken, 1)
      }
      setOffset(inToken, 1, firstToken)
      setOffset(rightToken, 1, inToken)
    },
    /** @param {VOnExpression} node */
    VOnExpression(node) {
      processNodeList(node.body, null, null, 0)
    },
    /** @param {VStartTag} node */
    VStartTag(node) {
      const openToken = tokenStore.getFirstToken(node)
      const closeToken = tokenStore.getLastToken(node)

      processNodeList(
        node.attributes,
        openToken,
        null,
        options.attribute,
        options.alignAttributesVertically
      )
      if (closeToken != null && closeToken.type.endsWith('TagClose')) {
        const offset =
          closeToken.type === 'HTMLSelfClosingTagClose'
            ? options.closeBracket.selfClosingTag
            : options.closeBracket.startTag
        setOffset(closeToken, offset, openToken)
      }
    },
    /** @param {VText} node */
    VText(node) {
      const tokens = tokenStore.getTokens(node, isNotWhitespace)
      const firstTokenInfo = offsets.get(tokenStore.getFirstToken(node))

      for (const token of tokens) {
        offsets.set(token, Object.assign({}, firstTokenInfo))
      }
    },
    // ----------------------------------------------------------------------
    // SINGLE TOKEN NODES
    // ----------------------------------------------------------------------
    VIdentifier() {},
    VLiteral() {},
    // ----------------------------------------------------------------------
    // WRAPPER NODES
    // ----------------------------------------------------------------------
    VDirectiveKey() {},
    VSlotScopeExpression() {},
    // ----------------------------------------------------------------------
    // ES NODES
    // ----------------------------------------------------------------------
    /** @param {ArrayExpression | ArrayPattern} node */
    'ArrayExpression, ArrayPattern'(node) {
      const firstToken = tokenStore.getFirstToken(node)
      const rightToken = tokenStore.getTokenAfter(
        node.elements[node.elements.length - 1] || firstToken,
        isClosingBracketToken
      )
      processNodeList(node.elements, firstToken, rightToken, 1)
    },
    /** @param {ArrowFunctionExpression} node */
    ArrowFunctionExpression(node) {
      const firstToken = tokenStore.getFirstToken(node)
      const secondToken = tokenStore.getTokenAfter(firstToken)
      const leftToken = node.async ? secondToken : firstToken
      const arrowToken = tokenStore.getTokenBefore(node.body, isArrowToken)

      if (node.async) {
        setOffset(secondToken, 1, firstToken)
      }
      if (isOpeningParenToken(leftToken)) {
        const rightToken = tokenStore.getTokenAfter(
          last(node.params) || leftToken,
          isClosingParenToken
        )
        processNodeList(node.params, leftToken, rightToken, 1)
      }

      setOffset(arrowToken, 1, firstToken)
      processMaybeBlock(node.body, firstToken)
    },
    /** @param {AssignmentExpression | AssignmentPattern | BinaryExpression | LogicalExpression} node */
    'AssignmentExpression, AssignmentPattern, BinaryExpression, LogicalExpression'(
      node
    ) {
      const leftToken = getChainHeadToken(node)
      const opToken = /** @type {Token} */ (
        tokenStore.getTokenAfter(node.left, isNotClosingParenToken)
      )
      const rightToken = tokenStore.getTokenAfter(opToken)
      const prevToken = tokenStore.getTokenBefore(leftToken)
      const shouldIndent =
        prevToken == null ||
        prevToken.loc.end.line === leftToken.loc.start.line ||
        isBeginningOfElement(leftToken, node)

      setOffset([opToken, rightToken], shouldIndent ? 1 : 0, leftToken)
    },
    /** @param {AwaitExpression | RestElement | SpreadElement | UnaryExpression} node */
    'AwaitExpression, RestElement, SpreadElement, UnaryExpression'(node) {
      const firstToken = tokenStore.getFirstToken(node)
      const nextToken = tokenStore.getTokenAfter(firstToken)

      setOffset(nextToken, 1, firstToken)
    },
    /** @param {BlockStatement | ClassBody} node */
    'BlockStatement, ClassBody'(node) {
      processNodeList(
        node.body,
        tokenStore.getFirstToken(node),
        tokenStore.getLastToken(node),
        1
      )
    },
    StaticBlock(node) {
      const firstToken = tokenStore.getFirstToken(node)
      let next = tokenStore.getTokenAfter(firstToken)
      while (next && isNotOpeningBraceToken(next)) {
        setOffset(next, 0, firstToken)
        next = tokenStore.getTokenAfter(next)
      }
      setOffset(next, 0, firstToken)
      processNodeList(node.body, next, tokenStore.getLastToken(node), 1)
    },
    /** @param {BreakStatement | ContinueStatement | ReturnStatement | ThrowStatement} node */
    'BreakStatement, ContinueStatement, ReturnStatement, ThrowStatement'(node) {
      if (
        ((node.type === 'ReturnStatement' || node.type === 'ThrowStatement') &&
          node.argument != null) ||
        ((node.type === 'BreakStatement' ||
          node.type === 'ContinueStatement') &&
          node.label != null)
      ) {
        const firstToken = tokenStore.getFirstToken(node)
        const nextToken = tokenStore.getTokenAfter(firstToken)

        setOffset(nextToken, 1, firstToken)
      }
    },
    /** @param {CallExpression} node */
    CallExpression(node) {
      const typeArguments =
        'typeArguments' in node ? node.typeArguments : node.typeParameters
      const firstToken = tokenStore.getFirstToken(node)
      const rightToken = tokenStore.getLastToken(node)
      const leftToken = /** @type {Token} */ (
        tokenStore.getTokenAfter(
          typeArguments || node.callee,
          isOpeningParenToken
        )
      )

      if (typeArguments) {
        setOffset(tokenStore.getFirstToken(typeArguments), 1, firstToken)
      }

      for (const optionalToken of tokenStore.getTokensBetween(
        tokenStore.getLastToken(typeArguments || node.callee),
        leftToken,
        isOptionalToken
      )) {
        setOffset(optionalToken, 1, firstToken)
      }

      setOffset(leftToken, 1, firstToken)
      processNodeList(node.arguments, leftToken, rightToken, 1)
    },
    /** @param {ImportExpression} node */
    ImportExpression(node) {
      const firstToken = tokenStore.getFirstToken(node)
      const rightToken = tokenStore.getLastToken(node)
      const leftToken = tokenStore.getTokenAfter(
        firstToken,
        isOpeningParenToken
      )

      setOffset(leftToken, 1, firstToken)
      processNodeList([node.source], leftToken, rightToken, 1)
    },
    /** @param {CatchClause} node */
    CatchClause(node) {
      const firstToken = tokenStore.getFirstToken(node)
      const bodyToken = tokenStore.getFirstToken(node.body)

      if (node.param != null) {
        const leftToken = tokenStore.getTokenAfter(firstToken)
        const rightToken = tokenStore.getTokenAfter(node.param)

        setOffset(leftToken, 1, firstToken)
        processNodeList([node.param], leftToken, rightToken, 1)
      }
      setOffset(bodyToken, 0, firstToken)
    },
    /** @param {ClassDeclaration | ClassExpression} node */
    'ClassDeclaration, ClassExpression'(node) {
      const firstToken = tokenStore.getFirstToken(node)
      const bodyToken = tokenStore.getFirstToken(node.body)

      if (node.id != null) {
        setOffset(tokenStore.getFirstToken(node.id), 1, firstToken)
      }
      if (node.superClass != null) {
        const extendsToken = /** @type {Token} */ (
          tokenStore.getTokenBefore(node.superClass, isExtendsKeyword)
        )
        const superClassToken = tokenStore.getTokenAfter(extendsToken)
        setOffset(extendsToken, 1, firstToken)
        setOffset(superClassToken, 1, extendsToken)
      }
      setOffset(bodyToken, 0, firstToken)
    },
    /** @param {ConditionalExpression} node */
    ConditionalExpression(node) {
      const prevToken = tokenStore.getTokenBefore(node)
      const firstToken = tokenStore.getFirstToken(node)
      const questionToken = /** @type {Token} */ (
        tokenStore.getTokenAfter(node.test, isNotClosingParenToken)
      )
      const consequentToken = tokenStore.getTokenAfter(questionToken)
      const colonToken = /** @type {Token} */ (
        tokenStore.getTokenAfter(node.consequent, isNotClosingParenToken)
      )
      const alternateToken = tokenStore.getTokenAfter(colonToken)
      const isFlat =
        prevToken &&
        prevToken.loc.end.line !== node.loc.start.line &&
        node.test.loc.end.line === node.consequent.loc.start.line

      if (isFlat) {
        setOffset(
          [questionToken, consequentToken, colonToken, alternateToken],
          0,
          firstToken
        )
      } else {
        setOffset([questionToken, colonToken], 1, firstToken)
        setOffset([consequentToken, alternateToken], 1, questionToken)
      }
    },
    /** @param {DoWhileStatement} node */
    DoWhileStatement(node) {
      const doToken = tokenStore.getFirstToken(node)
      const whileToken = /** @type {Token} */ (
        tokenStore.getTokenAfter(node.body, isNotClosingParenToken)
      )
      const leftToken = tokenStore.getTokenAfter(whileToken)
      const testToken = tokenStore.getTokenAfter(leftToken)
      const lastToken = tokenStore.getLastToken(node)
      const rightToken = isSemicolonToken(lastToken)
        ? tokenStore.getTokenBefore(lastToken)
        : lastToken

      processMaybeBlock(node.body, doToken)
      setOffset(whileToken, 0, doToken)
      setOffset(leftToken, 1, whileToken)
      setOffset(testToken, 1, leftToken)
      setOffset(rightToken, 0, leftToken)
    },
    /** @param {ExportAllDeclaration} node */
    ExportAllDeclaration(node) {
      const exportToken = tokenStore.getFirstToken(node)
      const tokens = [
        ...tokenStore.getTokensBetween(exportToken, node.source),
        tokenStore.getFirstToken(node.source)
      ]
      if (node.exported) {
        // export * as foo from "mod"
        const starToken = /** @type {Token} */ (tokens.find(isWildcard))
        const asToken = tokenStore.getTokenAfter(starToken)
        const exportedToken = tokenStore.getTokenAfter(asToken)
        const afterTokens = tokens.slice(tokens.indexOf(exportedToken) + 1)

        setOffset(starToken, 1, exportToken)
        setOffset(asToken, 1, starToken)
        setOffset(exportedToken, 1, starToken)
        setOffset(afterTokens, 1, exportToken)
      } else {
        setOffset(tokens, 1, exportToken)
      }

      // assertions
      const lastToken = /** @type {Token} */ (
        tokenStore.getLastToken(node, isNotSemicolonToken)
      )
      const assertionTokens = tokenStore.getTokensBetween(
        node.source,
        lastToken
      )
      if (assertionTokens.length > 0) {
        const assertToken = /** @type {Token} */ (assertionTokens.shift())
        setOffset(assertToken, 0, exportToken)
        const assertionOpen = assertionTokens.shift()
        if (assertionOpen) {
          setOffset(assertionOpen, 1, assertToken)
          processNodeList(assertionTokens, assertionOpen, lastToken, 1)
        }
      }
    },
    /** @param {ExportDefaultDeclaration} node */
    ExportDefaultDeclaration(node) {
      const exportToken = tokenStore.getFirstToken(node)
      const defaultToken = tokenStore.getFirstToken(node, 1)
      const declarationToken = getFirstAndLastTokens(
        node.declaration
      ).firstToken
      setOffset([defaultToken, declarationToken], 1, exportToken)
    },
    /** @param {ExportNamedDeclaration} node */
    ExportNamedDeclaration(node) {
      const exportToken = tokenStore.getFirstToken(node)
      if (node.declaration) {
        // export var foo = 1;
        const declarationToken = tokenStore.getFirstToken(node, 1)
        setOffset(declarationToken, 1, exportToken)
      } else {
        const firstSpecifier = node.specifiers[0]
        if (!firstSpecifier || firstSpecifier.type === 'ExportSpecifier') {
          // export {foo, bar}; or export {foo, bar} from "mod";
          const leftBraceTokens = firstSpecifier
            ? tokenStore.getTokensBetween(exportToken, firstSpecifier)
            : [tokenStore.getTokenAfter(exportToken)]
          const rightBraceToken = /** @type {Token} */ (
            node.source
              ? tokenStore.getTokenBefore(node.source, isClosingBraceToken)
              : tokenStore.getLastToken(node, isClosingBraceToken)
          )
          setOffset(leftBraceTokens, 0, exportToken)
          processNodeList(
            node.specifiers,
            /** @type {Token} */ (last(leftBraceTokens)),
            rightBraceToken,
            1
          )

          if (node.source) {
            const tokens = tokenStore.getTokensBetween(
              rightBraceToken,
              node.source
            )
            setOffset(
              [...tokens, sourceCode.getFirstToken(node.source)],
              1,
              exportToken
            )

            // assertions
            const lastToken = /** @type {Token} */ (
              tokenStore.getLastToken(node, isNotSemicolonToken)
            )
            const assertionTokens = tokenStore.getTokensBetween(
              node.source,
              lastToken
            )
            if (assertionTokens.length > 0) {
              const assertToken = /** @type {Token} */ (assertionTokens.shift())
              setOffset(assertToken, 0, exportToken)
              const assertionOpen = assertionTokens.shift()
              if (assertionOpen) {
                setOffset(assertionOpen, 1, assertToken)
                processNodeList(assertionTokens, assertionOpen, lastToken, 1)
              }
            }
          }
        } else {
          // maybe babel parser
        }
      }
    },
    /** @param {ExportSpecifier | ImportSpecifier} node */
    'ExportSpecifier, ImportSpecifier'(node) {
      const tokens = tokenStore.getTokens(node)
      let firstToken = /** @type {Token} */ (tokens.shift())
      if (firstToken.value === 'type') {
        const typeToken = firstToken
        firstToken = /** @type {Token} */ (tokens.shift())
        setOffset(firstToken, 0, typeToken)
      }

      setOffset(tokens, 1, firstToken)
    },
    /** @param {ForInStatement | ForOfStatement} node */
    'ForInStatement, ForOfStatement'(node) {
      const forToken = tokenStore.getFirstToken(node)
      const awaitToken =
        (node.type === 'ForOfStatement' &&
          node.await &&
          tokenStore.getTokenAfter(forToken)) ||
        null
      const leftParenToken = tokenStore.getTokenAfter(awaitToken || forToken)
      const leftToken = tokenStore.getTokenAfter(leftParenToken)
      const inToken = /** @type {Token} */ (
        tokenStore.getTokenAfter(leftToken, isNotClosingParenToken)
      )
      const rightToken = tokenStore.getTokenAfter(inToken)
      const rightParenToken = tokenStore.getTokenBefore(
        node.body,
        isNotOpeningParenToken
      )

      if (awaitToken != null) {
        setOffset(awaitToken, 0, forToken)
      }
      setOffset(leftParenToken, 1, forToken)
      setOffset(leftToken, 1, leftParenToken)
      setOffset(inToken, 1, leftToken)
      setOffset(rightToken, 1, leftToken)
      setOffset(rightParenToken, 0, leftParenToken)
      processMaybeBlock(node.body, forToken)
    },
    /** @param {ForStatement} node */
    ForStatement(node) {
      const forToken = tokenStore.getFirstToken(node)
      const leftParenToken = tokenStore.getTokenAfter(forToken)
      const rightParenToken = tokenStore.getTokenBefore(
        node.body,
        isNotOpeningParenToken
      )

      setOffset(leftParenToken, 1, forToken)
      processNodeList(
        [node.init, node.test, node.update],
        leftParenToken,
        rightParenToken,
        1
      )
      processMaybeBlock(node.body, forToken)
    },
    /** @param {FunctionDeclaration | FunctionExpression} node */
    'FunctionDeclaration, FunctionExpression'(node) {
      const firstToken = tokenStore.getFirstToken(node)
      let leftParenToken, bodyBaseToken
      if (isOpeningParenToken(firstToken)) {
        // Methods.
        leftParenToken = firstToken
        bodyBaseToken = tokenStore.getFirstToken(node.parent)
      } else {
        // Normal functions.
        let nextToken = tokenStore.getTokenAfter(firstToken)
        let nextTokenOffset = 0
        while (
          nextToken &&
          !isOpeningParenToken(nextToken) &&
          nextToken.value !== '<'
        ) {
          if (
            nextToken.value === '*' ||
            (node.id && nextToken.range[0] === node.id.range[0])
          ) {
            nextTokenOffset = 1
          }
          setOffset(nextToken, nextTokenOffset, firstToken)
          nextToken = tokenStore.getTokenAfter(nextToken)
        }

        leftParenToken = nextToken
        bodyBaseToken = firstToken
      }

      if (
        !isOpeningParenToken(leftParenToken) &&
        /** @type {any} */ (node).typeParameters
      ) {
        leftParenToken = tokenStore.getTokenAfter(
          /** @type {any} */ (node).typeParameters
        )
      }
      const rightParenToken = tokenStore.getTokenAfter(
        node.params[node.params.length - 1] || leftParenToken,
        isClosingParenToken
      )
      setOffset(leftParenToken, 1, bodyBaseToken)
      processNodeList(node.params, leftParenToken, rightParenToken, 1)

      const bodyToken = tokenStore.getFirstToken(node.body)
      setOffset(bodyToken, 0, bodyBaseToken)
    },
    /** @param {IfStatement} node */
    IfStatement(node) {
      const ifToken = tokenStore.getFirstToken(node)
      const ifLeftParenToken = tokenStore.getTokenAfter(ifToken)
      const ifRightParenToken = tokenStore.getTokenBefore(
        node.consequent,
        isClosingParenToken
      )

      setOffset(ifLeftParenToken, 1, ifToken)
      setOffset(ifRightParenToken, 0, ifLeftParenToken)
      processMaybeBlock(node.consequent, ifToken)

      if (node.alternate != null) {
        const elseToken = /** @type {Token} */ (
          tokenStore.getTokenAfter(node.consequent, isNotClosingParenToken)
        )

        setOffset(elseToken, 0, ifToken)
        processMaybeBlock(node.alternate, elseToken)
      }
    },
    /** @param {ImportDeclaration} node */
    ImportDeclaration(node) {
      const importToken = tokenStore.getFirstToken(node)
      const tokens = tokenStore.getTokensBetween(importToken, node.source)
      const fromIndex = tokens.map((t) => t.value).lastIndexOf('from')
      const { fromToken, beforeTokens, afterTokens } =
        fromIndex === -1
          ? {
              fromToken: null,
              beforeTokens: [...tokens, tokenStore.getFirstToken(node.source)],
              afterTokens: []
            }
          : {
              fromToken: tokens[fromIndex],
              beforeTokens: tokens.slice(0, fromIndex),
              afterTokens: [
                ...tokens.slice(fromIndex + 1),
                tokenStore.getFirstToken(node.source)
              ]
            }

      /** @type {ImportSpecifier[]} */
      const namedSpecifiers = []
      for (const specifier of node.specifiers) {
        if (specifier.type === 'ImportSpecifier') {
          namedSpecifiers.push(specifier)
        } else {
          const removeTokens = tokenStore.getTokens(specifier)
          removeTokens.shift()
          for (const token of removeTokens) {
            const i = beforeTokens.indexOf(token)
            if (i !== -1) {
              beforeTokens.splice(i, 1)
            }
          }
        }
      }
      if (namedSpecifiers.length > 0) {
        const leftBrace = tokenStore.getTokenBefore(namedSpecifiers[0])
        const rightBrace = /** @type {Token} */ (
          tokenStore.getTokenAfter(
            namedSpecifiers[namedSpecifiers.length - 1],
            isClosingBraceToken
          )
        )
        processNodeList(namedSpecifiers, leftBrace, rightBrace, 1)
        for (const token of [
          ...tokenStore.getTokensBetween(leftBrace, rightBrace),
          rightBrace
        ]) {
          const i = beforeTokens.indexOf(token)
          if (i !== -1) {
            beforeTokens.splice(i, 1)
          }
        }
      }

      if (
        beforeTokens.every(
          (t) => isOpeningBraceToken(t) || isClosingBraceToken(t)
        )
      ) {
        setOffset(beforeTokens, 0, importToken)
      } else {
        setOffset(beforeTokens, 1, importToken)
      }
      if (fromToken) {
        setOffset(fromToken, 1, importToken)
        setOffset(afterTokens, 0, fromToken)
      }

      // assertions
      const lastToken = /** @type {Token} */ (
        tokenStore.getLastToken(node, isNotSemicolonToken)
      )
      const assertionTokens = tokenStore.getTokensBetween(
        node.source,
        lastToken
      )
      if (assertionTokens.length > 0) {
        const assertToken = /** @type {Token} */ (assertionTokens.shift())
        setOffset(assertToken, 0, importToken)
        const assertionOpen = assertionTokens.shift()
        if (assertionOpen) {
          setOffset(assertionOpen, 1, assertToken)
          processNodeList(assertionTokens, assertionOpen, lastToken, 1)
        }
      }
    },
    /** @param {ImportNamespaceSpecifier} node */
    ImportNamespaceSpecifier(node) {
      const tokens = tokenStore.getTokens(node)
      const firstToken = /** @type {Token} */ (tokens.shift())
      setOffset(tokens, 1, firstToken)
    },
    /** @param {LabeledStatement} node */
    LabeledStatement(node) {
      const labelToken = tokenStore.getFirstToken(node)
      const colonToken = tokenStore.getTokenAfter(labelToken)
      const bodyToken = tokenStore.getTokenAfter(colonToken)

      setOffset([colonToken, bodyToken], 1, labelToken)
    },
    /** @param {MemberExpression | MetaProperty} node */
    'MemberExpression, MetaProperty'(node) {
      const objectToken = tokenStore.getFirstToken(node)
      if (node.type === 'MemberExpression' && node.computed) {
        const leftBracketToken = /** @type {Token} */ (
          tokenStore.getTokenBefore(node.property, isOpeningBracketToken)
        )
        const propertyToken = tokenStore.getTokenAfter(leftBracketToken)
        const rightBracketToken = tokenStore.getTokenAfter(
          node.property,
          isClosingBracketToken
        )

        for (const optionalToken of tokenStore.getTokensBetween(
          tokenStore.getLastToken(node.object),
          leftBracketToken,
          isOptionalToken
        )) {
          setOffset(optionalToken, 1, objectToken)
        }

        setOffset(leftBracketToken, 1, objectToken)
        setOffset(propertyToken, 1, leftBracketToken)
        setOffset(rightBracketToken, 0, leftBracketToken)
      } else {
        const dotToken = tokenStore.getTokenBefore(node.property)
        const propertyToken = tokenStore.getTokenAfter(dotToken)

        setOffset([dotToken, propertyToken], 1, objectToken)
      }
    },
    /** @param {MethodDefinition | Property | PropertyDefinition} node */
    'MethodDefinition, Property, PropertyDefinition'(node) {
      const firstToken = tokenStore.getFirstToken(node)
      const keyTokens = getFirstAndLastTokens(node.key)
      const prefixTokens = tokenStore.getTokensBetween(
        firstToken,
        keyTokens.firstToken
      )
      if (node.computed) {
        prefixTokens.pop() // pop [
      }
      setOffset(prefixTokens, 0, firstToken)

      let lastKeyToken
      if (node.computed) {
        const leftBracketToken = tokenStore.getTokenBefore(keyTokens.firstToken)
        const rightBracketToken = (lastKeyToken = tokenStore.getTokenAfter(
          keyTokens.lastToken
        ))
        setOffset(leftBracketToken, 0, firstToken)
        processNodeList([node.key], leftBracketToken, rightBracketToken, 1)
      } else {
        setOffset(keyTokens.firstToken, 0, firstToken)
        lastKeyToken = keyTokens.lastToken
      }

      if (node.value != null) {
        const initToken = tokenStore.getFirstToken(node.value)
        setOffset(
          [...tokenStore.getTokensBetween(lastKeyToken, initToken), initToken],
          1,
          lastKeyToken
        )
      }
    },
    /** @param {NewExpression} node */
    NewExpression(node) {
      const typeArguments =
        'typeArguments' in node ? node.typeArguments : node.typeParameters
      const newToken = tokenStore.getFirstToken(node)
      const calleeToken = tokenStore.getTokenAfter(newToken)
      const rightToken = tokenStore.getLastToken(node)
      const leftToken = isClosingParenToken(rightToken)
        ? tokenStore.getFirstTokenBetween(
            typeArguments || node.callee,
            rightToken,
            isOpeningParenToken
          )
        : null

      if (typeArguments) {
        setOffset(tokenStore.getFirstToken(typeArguments), 1, calleeToken)
      }

      setOffset(calleeToken, 1, newToken)
      if (leftToken != null) {
        setOffset(leftToken, 1, calleeToken)
        processNodeList(node.arguments, leftToken, rightToken, 1)
      }
    },
    /** @param {ObjectExpression | ObjectPattern} node */
    'ObjectExpression, ObjectPattern'(node) {
      const firstToken = tokenStore.getFirstToken(node)
      const rightToken = tokenStore.getTokenAfter(
        node.properties[node.properties.length - 1] || firstToken,
        isClosingBraceToken
      )
      processNodeList(node.properties, firstToken, rightToken, 1)
    },
    /** @param {SequenceExpression} node */
    SequenceExpression(node) {
      processNodeList(node.expressions, null, null, 0)
    },
    /** @param {SwitchCase} node */
    SwitchCase(node) {
      const caseToken = tokenStore.getFirstToken(node)

      if (node.test == null) {
        const colonToken = tokenStore.getTokenAfter(caseToken)

        setOffset(colonToken, 1, caseToken)
      } else {
        const testToken = tokenStore.getTokenAfter(caseToken)
        const colonToken = tokenStore.getTokenAfter(
          node.test,
          isNotClosingParenToken
        )

        setOffset([testToken, colonToken], 1, caseToken)
      }

      if (
        node.consequent.length === 1 &&
        node.consequent[0].type === 'BlockStatement'
      ) {
        setOffset(tokenStore.getFirstToken(node.consequent[0]), 0, caseToken)
      } else if (node.consequent.length > 0) {
        setOffset(tokenStore.getFirstToken(node.consequent[0]), 1, caseToken)
        processNodeList(node.consequent, null, null, 0)
      }
    },
    /** @param {SwitchStatement} node */
    SwitchStatement(node) {
      const switchToken = tokenStore.getFirstToken(node)
      const leftParenToken = tokenStore.getTokenAfter(switchToken)
      const discriminantToken = tokenStore.getTokenAfter(leftParenToken)
      const leftBraceToken = /** @type {Token} */ (
        tokenStore.getTokenAfter(node.discriminant, isOpeningBraceToken)
      )
      const rightParenToken = tokenStore.getTokenBefore(leftBraceToken)
      const rightBraceToken = tokenStore.getLastToken(node)

      setOffset(leftParenToken, 1, switchToken)
      setOffset(discriminantToken, 1, leftParenToken)
      setOffset(rightParenToken, 0, leftParenToken)
      setOffset(leftBraceToken, 0, switchToken)
      processNodeList(
        node.cases,
        leftBraceToken,
        rightBraceToken,
        options.switchCase
      )
    },
    /** @param {TaggedTemplateExpression} node */
    TaggedTemplateExpression(node) {
      const tagTokens = getFirstAndLastTokens(node.tag, node.range[0])
      const quasiToken = tokenStore.getTokenAfter(tagTokens.lastToken)

      setOffset(quasiToken, 1, tagTokens.firstToken)
    },
    /** @param {TemplateLiteral} node */
    TemplateLiteral(node) {
      const firstToken = tokenStore.getFirstToken(node)
      const quasiTokens = node.quasis
        .slice(1)
        .map((n) => tokenStore.getFirstToken(n))
      const expressionToken = node.quasis
        .slice(0, -1)
        .map((n) => tokenStore.getTokenAfter(n))

      setOffset(quasiTokens, 0, firstToken)
      setOffset(expressionToken, 1, firstToken)
    },
    /** @param {TryStatement} node */
    TryStatement(node) {
      const tryToken = tokenStore.getFirstToken(node)
      const tryBlockToken = tokenStore.getFirstToken(node.block)

      setOffset(tryBlockToken, 0, tryToken)

      if (node.handler != null) {
        const catchToken = tokenStore.getFirstToken(node.handler)

        setOffset(catchToken, 0, tryToken)
      }

      if (node.finalizer != null) {
        const finallyToken = tokenStore.getTokenBefore(node.finalizer)
        const finallyBlockToken = tokenStore.getFirstToken(node.finalizer)

        setOffset([finallyToken, finallyBlockToken], 0, tryToken)
      }
    },
    /** @param {UpdateExpression} node */
    UpdateExpression(node) {
      const firstToken = tokenStore.getFirstToken(node)
      const nextToken = tokenStore.getTokenAfter(firstToken)

      setOffset(nextToken, 1, firstToken)
    },
    /** @param {VariableDeclaration} node */
    VariableDeclaration(node) {
      processNodeList(
        node.declarations,
        tokenStore.getFirstToken(node),
        null,
        1
      )
    },
    /** @param {VariableDeclarator} node */
    VariableDeclarator(node) {
      if (node.init != null) {
        const idToken = tokenStore.getFirstToken(node)
        const eqToken = tokenStore.getTokenAfter(node.id)
        const initToken = tokenStore.getTokenAfter(eqToken)

        setOffset([eqToken, initToken], 1, idToken)
      }
    },
    /** @param {WhileStatement | WithStatement} node */
    'WhileStatement, WithStatement'(node) {
      const firstToken = tokenStore.getFirstToken(node)
      const leftParenToken = tokenStore.getTokenAfter(firstToken)
      const rightParenToken = tokenStore.getTokenBefore(
        node.body,
        isClosingParenToken
      )

      setOffset(leftParenToken, 1, firstToken)
      setOffset(rightParenToken, 0, leftParenToken)
      processMaybeBlock(node.body, firstToken)
    },
    /** @param {YieldExpression} node */
    YieldExpression(node) {
      if (node.argument != null) {
        const yieldToken = tokenStore.getFirstToken(node)

        setOffset(tokenStore.getTokenAfter(yieldToken), 1, yieldToken)
        if (node.delegate) {
          setOffset(tokenStore.getTokenAfter(yieldToken, 1), 1, yieldToken)
        }
      }
    },
    // ----------------------------------------------------------------------
    // SINGLE TOKEN NODES
    // ----------------------------------------------------------------------
    DebuggerStatement() {},
    Identifier() {},
    ImportDefaultSpecifier() {},
    Literal() {},
    PrivateIdentifier() {},
    Super() {},
    TemplateElement() {},
    ThisExpression() {},
    // ----------------------------------------------------------------------
    // WRAPPER NODES
    // ----------------------------------------------------------------------
    ExpressionStatement() {},
    ChainExpression() {},
    EmptyStatement() {},
    // ----------------------------------------------------------------------
    // COMMONS
    // ----------------------------------------------------------------------
    /** @param {Statement} node */
    // Process semicolons.
    ':statement, PropertyDefinition'(node) {
      processSemicolons(node)
    },
    /** @param {Expression | MetaProperty | TemplateLiteral} node */
    // Process parentheses.
    // `:expression` does not match with MetaProperty and TemplateLiteral as a bug: https://github.com/estools/esquery/pull/59
    ':expression'(node) {
      let leftToken = tokenStore.getTokenBefore(node)
      let rightToken = tokenStore.getTokenAfter(node)
      let firstToken = tokenStore.getFirstToken(node)

      while (
        leftToken &&
        rightToken &&
        isOpeningParenToken(leftToken) &&
        isClosingParenToken(rightToken)
      ) {
        setOffset(firstToken, 1, leftToken)
        setOffset(rightToken, 0, leftToken)

        firstToken = leftToken
        leftToken = tokenStore.getTokenBefore(leftToken)
        rightToken = tokenStore.getTokenAfter(rightToken)
      }
    },

    .../** @type {TemplateListener} */ (
      tsDefineVisitor({
        processNodeList,
        tokenStore,
        setOffset,
        copyOffset,
        processSemicolons,
        getFirstAndLastTokens
      })
    ),

    /** @param {ASTNode} node */
    // Ignore tokens of unknown nodes.
    '*:exit'(node) {
      if (!knownNodes.has(node.type)) {
        ignore(node)
      }
    },
    /** @param {Program} node */
    // Top-level process.
    Program(node) {
      const firstToken = node.tokens[0]
      const isScriptTag =
        firstToken != null &&
        firstToken.type === 'Punctuator' &&
        firstToken.value === '<script>'
      const baseIndent = isScriptTag
        ? options.indentSize * options.baseIndent
        : 0

      for (const statement of node.body) {
        processTopLevelNode(statement, baseIndent)
      }
    },
    /** @param {VElement} node */
    "VElement[parent.type!='VElement']"(node) {
      processTopLevelNode(node, 0)
    },
    /** @param {Program | VElement} node */
    // Do validation.
    ":matches(Program, VElement[parent.type!='VElement']):exit"(node) {
      let comments = []
      /** @type {Token[]} */
      let tokensOnSameLine = []
      let isBesideMultilineToken = false
      let lastValidatedToken = null

      // Validate indentation of tokens.
      for (const token of tokenStore.getTokens(node, ITERATION_OPTS)) {
        const tokenStartLine = token.loc.start.line
        if (
          tokensOnSameLine.length === 0 ||
          tokensOnSameLine[0].loc.start.line === tokenStartLine
        ) {
          // This is on the same line (or the first token).
          tokensOnSameLine.push(token)
        } else if (tokensOnSameLine.every(isComment)) {
          // New line is detected, but the all tokens of the previous line are comment.
          // Comment lines are adjusted to the next code line.
          comments.push(tokensOnSameLine[0])
          isBesideMultilineToken =
            /** @type {Token} */ (last(tokensOnSameLine)).loc.end.line ===
            tokenStartLine
          tokensOnSameLine = [token]
        } else {
          // New line is detected, so validate the tokens.
          if (!isBesideMultilineToken) {
            validate(tokensOnSameLine, comments, lastValidatedToken)
            lastValidatedToken = tokensOnSameLine[0]
          }
          isBesideMultilineToken =
            /** @type {Token} */ (last(tokensOnSameLine)).loc.end.line ===
            tokenStartLine
          tokensOnSameLine = [token]
          comments = []
        }
      }
      if (tokensOnSameLine.some(isNotComment)) {
        validate(tokensOnSameLine, comments, lastValidatedToken)
      }
    }
  }

  for (const key of Object.keys(visitor)) {
    for (const nodeName of key
      .split(/\s*,\s*/gu)
      .map((s) => s.trim())
      .filter((s) => /[a-z]+/i.test(s))) {
      knownNodes.add(nodeName)
    }
  }

  return processIgnores(visitor)
}

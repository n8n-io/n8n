/**
 * @typedef { { exceptions?: string[] } } CommentParserConfig
 * @typedef { (comment: ParsedHTMLComment) => void } HTMLCommentVisitor
 * @typedef { { includeDirectives?: boolean } } CommentVisitorOption
 *
 * @typedef { Token & { type: 'HTMLCommentOpen' } } HTMLCommentOpen
 * @typedef { Token & { type: 'HTMLCommentOpenDecoration' } } HTMLCommentOpenDecoration
 * @typedef { Token & { type: 'HTMLCommentValue' } } HTMLCommentValue
 * @typedef { Token & { type: 'HTMLCommentClose' } } HTMLCommentClose
 * @typedef { Token & { type: 'HTMLCommentCloseDecoration' } } HTMLCommentCloseDecoration
 * @typedef { { open: HTMLCommentOpen, openDecoration: HTMLCommentOpenDecoration | null, value: HTMLCommentValue | null, closeDecoration: HTMLCommentCloseDecoration | null, close: HTMLCommentClose } } ParsedHTMLComment
 */
const utils = require('./')

const COMMENT_DIRECTIVE = /^\s*eslint-(?:en|dis)able/
const IE_CONDITIONAL_IF = /^\[if\s+/
const IE_CONDITIONAL_ENDIF = /\[endif]$/

/** @type { 'HTMLCommentOpen' } */
const TYPE_HTML_COMMENT_OPEN = 'HTMLCommentOpen'
/** @type { 'HTMLCommentOpenDecoration' } */
const TYPE_HTML_COMMENT_OPEN_DECORATION = 'HTMLCommentOpenDecoration'
/** @type { 'HTMLCommentValue' } */
const TYPE_HTML_COMMENT_VALUE = 'HTMLCommentValue'
/** @type { 'HTMLCommentClose' } */
const TYPE_HTML_COMMENT_CLOSE = 'HTMLCommentClose'
/** @type { 'HTMLCommentCloseDecoration' } */
const TYPE_HTML_COMMENT_CLOSE_DECORATION = 'HTMLCommentCloseDecoration'

/**
 * @param {HTMLComment} comment
 * @returns {boolean}
 */
function isCommentDirective(comment) {
  return COMMENT_DIRECTIVE.test(comment.value)
}

/**
 * @param {HTMLComment} comment
 * @returns {boolean}
 */
function isIEConditionalComment(comment) {
  return (
    IE_CONDITIONAL_IF.test(comment.value) ||
    IE_CONDITIONAL_ENDIF.test(comment.value)
  )
}

/**
 * Define HTML comment parser
 *
 * @param {SourceCode} sourceCode The source code instance.
 * @param {CommentParserConfig | null} config The config.
 * @returns { (node: Token) => (ParsedHTMLComment | null) } HTML comment parser.
 */
function defineParser(sourceCode, config) {
  config = config || {}

  const exceptions = config.exceptions || []

  /**
   * Get a open decoration string from comment contents.
   * @param {string} contents comment contents
   * @returns {string} decoration string
   */
  function getOpenDecoration(contents) {
    let decoration = ''
    for (const exception of exceptions) {
      const length = exception.length
      let index = 0
      while (contents.startsWith(exception, index)) {
        index += length
      }
      const exceptionLength = index
      if (decoration.length < exceptionLength) {
        decoration = contents.slice(0, exceptionLength)
      }
    }
    return decoration
  }

  /**
   * Get a close decoration string from comment contents.
   * @param {string} contents comment contents
   * @returns {string} decoration string
   */
  function getCloseDecoration(contents) {
    let decoration = ''
    for (const exception of exceptions) {
      const length = exception.length
      let index = contents.length
      while (contents.endsWith(exception, index)) {
        index -= length
      }
      const exceptionLength = contents.length - index
      if (decoration.length < exceptionLength) {
        decoration = contents.slice(index)
      }
    }
    return decoration
  }

  /**
   * Parse HTMLComment.
   * @param {Token} node a comment token
   * @returns {ParsedHTMLComment | null} the result of HTMLComment tokens.
   */
  return function parseHTMLComment(node) {
    if (node.type !== 'HTMLComment') {
      // Is not HTMLComment
      return null
    }

    const htmlCommentText = sourceCode.getText(node)

    if (
      !htmlCommentText.startsWith('<!--') ||
      !htmlCommentText.endsWith('-->')
    ) {
      // Is not normal HTML Comment
      // e.g. Error Code: "abrupt-closing-of-empty-comment", "incorrectly-closed-comment"
      return null
    }

    let valueText = htmlCommentText.slice(4, -3)
    const openDecorationText = getOpenDecoration(valueText)
    valueText = valueText.slice(openDecorationText.length)
    const firstCharIndex = valueText.search(/\S/)
    const beforeSpace =
      firstCharIndex >= 0 ? valueText.slice(0, firstCharIndex) : valueText
    valueText = valueText.slice(beforeSpace.length)

    const closeDecorationText = getCloseDecoration(valueText)
    if (closeDecorationText) {
      valueText = valueText.slice(0, -closeDecorationText.length)
    }
    const lastCharIndex = valueText.search(/\S\s*$/)
    const afterSpace =
      lastCharIndex >= 0 ? valueText.slice(lastCharIndex + 1) : valueText
    if (afterSpace) {
      valueText = valueText.slice(0, -afterSpace.length)
    }

    let tokenIndex = node.range[0]
    /**
     * @param {string} type
     * @param {string} value
     * @returns {any}
     */
    const createToken = (type, value) => {
      /** @type {Range} */
      const range = [tokenIndex, tokenIndex + value.length]
      tokenIndex = range[1]
      /** @type {SourceLocation} */
      let loc
      return {
        type,
        value,
        range,
        get loc() {
          if (loc) {
            return loc
          }
          return (loc = {
            start: sourceCode.getLocFromIndex(range[0]),
            end: sourceCode.getLocFromIndex(range[1])
          })
        }
      }
    }

    /** @type {HTMLCommentOpen} */
    const open = createToken(TYPE_HTML_COMMENT_OPEN, '<!--')
    /** @type {HTMLCommentOpenDecoration | null} */
    const openDecoration = openDecorationText
      ? createToken(TYPE_HTML_COMMENT_OPEN_DECORATION, openDecorationText)
      : null
    tokenIndex += beforeSpace.length
    /** @type {HTMLCommentValue | null} */
    const value = valueText
      ? createToken(TYPE_HTML_COMMENT_VALUE, valueText)
      : null
    tokenIndex += afterSpace.length
    /** @type {HTMLCommentCloseDecoration | null} */
    const closeDecoration = closeDecorationText
      ? createToken(TYPE_HTML_COMMENT_CLOSE_DECORATION, closeDecorationText)
      : null
    /** @type {HTMLCommentClose} */
    const close = createToken(TYPE_HTML_COMMENT_CLOSE, '-->')

    return {
      /** HTML comment open (`<!--`) */
      open,
      /** decoration of the start of HTML comments. (`*****` when `<!--*****`) */
      openDecoration,
      /** value of HTML comment. whitespaces and other tokens are not included. */
      value,
      /** decoration of the end of HTML comments.  (`*****` when `*****-->`) */
      closeDecoration,
      /** HTML comment close (`-->`) */
      close
    }
  }
}

/**
 * Define HTML comment visitor
 *
 * @param {RuleContext} context The rule context.
 * @param {CommentParserConfig | null} config The config.
 * @param {HTMLCommentVisitor} visitHTMLComment The HTML comment visitor.
 * @param {CommentVisitorOption} [visitorOption] The option for visitor.
 * @returns {RuleListener} HTML comment visitor.
 */
function defineVisitor(context, config, visitHTMLComment, visitorOption) {
  return {
    Program(node) {
      visitorOption = visitorOption || {}
      if (utils.hasInvalidEOF(node)) {
        return
      }
      if (!node.templateBody) {
        return
      }
      const parse = defineParser(context.getSourceCode(), config)

      for (const comment of node.templateBody.comments) {
        if (comment.type !== 'HTMLComment') {
          continue
        }
        if (!visitorOption.includeDirectives && isCommentDirective(comment)) {
          // ignore directives
          continue
        }
        if (isIEConditionalComment(comment)) {
          // ignore IE conditional
          continue
        }

        const tokens = parse(comment)
        if (tokens) {
          visitHTMLComment(tokens)
        }
      }
    }
  }
}

module.exports = {
  defineVisitor
}

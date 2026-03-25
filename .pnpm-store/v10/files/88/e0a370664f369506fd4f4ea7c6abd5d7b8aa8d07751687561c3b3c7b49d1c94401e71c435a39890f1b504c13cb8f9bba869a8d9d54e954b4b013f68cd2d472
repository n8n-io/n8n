'use strict'

const SINGLE_QUOTE = "'".charCodeAt(0)
const DOUBLE_QUOTE = '"'.charCodeAt(0)
const BACKSLASH = '\\'.charCodeAt(0)
const SLASH = '/'.charCodeAt(0)
const NEWLINE = '\n'.charCodeAt(0)
const SPACE = ' '.charCodeAt(0)
const FEED = '\f'.charCodeAt(0)
const TAB = '\t'.charCodeAt(0)
const CR = '\r'.charCodeAt(0)
const OPEN_SQUARE = '['.charCodeAt(0)
const CLOSE_SQUARE = ']'.charCodeAt(0)
const OPEN_PARENTHESES = '('.charCodeAt(0)
const CLOSE_PARENTHESES = ')'.charCodeAt(0)
const OPEN_CURLY = '{'.charCodeAt(0)
const CLOSE_CURLY = '}'.charCodeAt(0)
const SEMICOLON = ';'.charCodeAt(0)
const ASTERISK = '*'.charCodeAt(0)
const COLON = ':'.charCodeAt(0)
const AT = '@'.charCodeAt(0)

// SCSS PATCH {
const COMMA = ','.charCodeAt(0)
const HASH = '#'.charCodeAt(0)
// } SCSS PATCH

const RE_AT_END = /[\t\n\f\r "#'()/;[\\\]{}]/g
const RE_WORD_END = /[,\t\n\f\r !"#'():;@[\\\]{}]|\/(?=\*)/g
const RE_BAD_BRACKET = /.[\r\n"'(/\\]/
const RE_HEX_ESCAPE = /[\da-f]/i

const RE_NEW_LINE = /[\n\f\r]/g // SCSS PATCH

// SCSS PATCH function name was changed
module.exports = function scssTokenize(input, options = {}) {
  let css = input.css.valueOf()
  let ignore = options.ignoreErrors

  let code, next, quote, content, escape
  let escaped, prev, n, currentToken

  let length = css.length
  let pos = 0
  let buffer = []
  let returned = []

  let brackets // SCSS PATCH

  function position() {
    return pos
  }

  function unclosed(what) {
    throw input.error('Unclosed ' + what, pos)
  }

  function endOfFile() {
    return returned.length === 0 && pos >= length
  }

  // SCSS PATCH {
  function interpolation() {
    let deep = 1
    let stringQuote = false
    let stringEscaped = false
    while (deep > 0) {
      next += 1
      if (css.length <= next) unclosed('interpolation')

      code = css.charCodeAt(next)
      n = css.charCodeAt(next + 1)

      if (stringQuote) {
        if (!stringEscaped && code === stringQuote) {
          stringQuote = false
          stringEscaped = false
        } else if (code === BACKSLASH) {
          stringEscaped = !stringEscaped
        } else if (stringEscaped) {
          stringEscaped = false
        }
      } else if (code === SINGLE_QUOTE || code === DOUBLE_QUOTE) {
        stringQuote = code
      } else if (code === CLOSE_CURLY) {
        deep -= 1
      } else if (code === HASH && n === OPEN_CURLY) {
        deep += 1
      }
    }
  }
  // } SCSS PATCH

  function nextToken(opts) {
    if (returned.length) return returned.pop()
    if (pos >= length) return undefined

    let ignoreUnclosed = opts ? opts.ignoreUnclosed : false

    code = css.charCodeAt(pos)

    switch (code) {
      case NEWLINE:
      case SPACE:
      case TAB:
      case CR:
      case FEED: {
        next = pos
        do {
          next += 1
          code = css.charCodeAt(next)
        } while (
          code === SPACE ||
          code === NEWLINE ||
          code === TAB ||
          code === CR ||
          code === FEED
        )

        currentToken = ['space', css.slice(pos, next)]
        pos = next - 1
        break
      }

      case OPEN_SQUARE:
      case CLOSE_SQUARE:
      case OPEN_CURLY:
      case CLOSE_CURLY:
      case COLON:
      case SEMICOLON:
      case CLOSE_PARENTHESES: {
        let controlChar = String.fromCharCode(code)
        currentToken = [controlChar, controlChar, pos]
        break
      }

      // SCSS PATCH {
      case COMMA: {
        currentToken = ['word', ',', pos, pos + 1]
        break
      }
      // } SCSS PATCH

      case OPEN_PARENTHESES: {
        prev = buffer.length ? buffer.pop()[1] : ''
        n = css.charCodeAt(pos + 1)

        // SCSS PATCH {
        if (prev === 'url' && n !== SINGLE_QUOTE && n !== DOUBLE_QUOTE) {
          brackets = 1
          escaped = false
          next = pos + 1
          while (next <= css.length - 1) {
            n = css.charCodeAt(next)
            if (n === BACKSLASH) {
              escaped = !escaped
            } else if (n === OPEN_PARENTHESES) {
              brackets += 1
            } else if (n === CLOSE_PARENTHESES) {
              brackets -= 1
              if (brackets === 0) break
            }
            next += 1
          }

          content = css.slice(pos, next + 1)
          currentToken = ['brackets', content, pos, next]
          pos = next
          // } SCSS PATCH
        } else {
          next = css.indexOf(')', pos + 1)
          content = css.slice(pos, next + 1)

          if (next === -1 || RE_BAD_BRACKET.test(content)) {
            currentToken = ['(', '(', pos]
          } else {
            currentToken = ['brackets', content, pos, next]
            pos = next
          }
        }

        break
      }

      case SINGLE_QUOTE:
      case DOUBLE_QUOTE: {
        // SCSS PATCH {
        quote = code
        next = pos

        escaped = false
        while (next < length) {
          next++
          if (next === length) unclosed('string')

          code = css.charCodeAt(next)
          n = css.charCodeAt(next + 1)

          if (!escaped && code === quote) {
            break
          } else if (code === BACKSLASH) {
            escaped = !escaped
          } else if (escaped) {
            escaped = false
          } else if (code === HASH && n === OPEN_CURLY) {
            interpolation()
          }
        }
        // } SCSS PATCH

        currentToken = ['string', css.slice(pos, next + 1), pos, next]
        pos = next
        break
      }

      case AT: {
        RE_AT_END.lastIndex = pos + 1
        RE_AT_END.test(css)
        if (RE_AT_END.lastIndex === 0) {
          next = css.length - 1
        } else {
          next = RE_AT_END.lastIndex - 2
        }

        currentToken = ['at-word', css.slice(pos, next + 1), pos, next]

        pos = next
        break
      }

      case BACKSLASH: {
        next = pos
        escape = true
        while (css.charCodeAt(next + 1) === BACKSLASH) {
          next += 1
          escape = !escape
        }
        code = css.charCodeAt(next + 1)
        if (
          escape &&
          code !== SLASH &&
          code !== SPACE &&
          code !== NEWLINE &&
          code !== TAB &&
          code !== CR &&
          code !== FEED
        ) {
          next += 1
          if (RE_HEX_ESCAPE.test(css.charAt(next))) {
            while (RE_HEX_ESCAPE.test(css.charAt(next + 1))) {
              next += 1
            }
            if (css.charCodeAt(next + 1) === SPACE) {
              next += 1
            }
          }
        }

        currentToken = ['word', css.slice(pos, next + 1), pos, next]

        pos = next
        break
      }

      default:
        // SCSS PATCH {
        n = css.charCodeAt(pos + 1)

        if (code === HASH && n === OPEN_CURLY) {
          next = pos
          interpolation()
          content = css.slice(pos, next + 1)
          currentToken = ['word', content, pos, next]
          pos = next
        } else if (code === SLASH && n === ASTERISK) {
          // } SCSS PATCH
          next = css.indexOf('*/', pos + 2) + 1
          if (next === 0) {
            if (ignore || ignoreUnclosed) {
              next = css.length
            } else {
              unclosed('comment')
            }
          }

          currentToken = ['comment', css.slice(pos, next + 1), pos, next]
          pos = next

          // SCSS PATCH {
        } else if (code === SLASH && n === SLASH) {
          RE_NEW_LINE.lastIndex = pos + 1
          RE_NEW_LINE.test(css)
          if (RE_NEW_LINE.lastIndex === 0) {
            next = css.length - 1
          } else {
            next = RE_NEW_LINE.lastIndex - 2
          }

          content = css.slice(pos, next + 1)
          currentToken = ['comment', content, pos, next, 'inline']

          pos = next
          // } SCSS PATCH
        } else {
          RE_WORD_END.lastIndex = pos + 1
          RE_WORD_END.test(css)
          if (RE_WORD_END.lastIndex === 0) {
            next = css.length - 1
          } else {
            next = RE_WORD_END.lastIndex - 2
          }

          currentToken = ['word', css.slice(pos, next + 1), pos, next]
          buffer.push(currentToken)
          pos = next
        }

        break
    }

    pos++
    return currentToken
  }

  function back(token) {
    returned.push(token)
  }

  return {
    back,
    endOfFile,
    nextToken,
    position
  }
}

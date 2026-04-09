import {ExternalTokenizer, ContextTracker} from "@lezer/lr"
import {
  newline as newlineToken, eof, newlineBracketed, blankLineStart, indent, dedent, printKeyword,
  ParenthesizedExpression, TupleExpression, ComprehensionExpression,
  PatternArgList, SequencePattern, MappingPattern, TypeParamList,
  ArrayExpression, ArrayComprehensionExpression, ArgList, ParamList, importList, subscript,
  DictionaryExpression, DictionaryComprehensionExpression, SetExpression, SetComprehensionExpression,
  String as StringTerm, FormatString, FormatReplacement, nestedFormatReplacement,
  stringStart, stringStartD, stringStartL, stringStartLD,
  stringStartR, stringStartRD, stringStartRL, stringStartRLD,
  stringStartF, stringStartFD, stringStartFL, stringStartFLD,
  stringStartFR, stringStartFRD, stringStartFRL, stringStartFRLD,
  stringContent, Escape, replacementStart, stringEnd,
  ParenL, BraceL, BracketL
} from "./parser.terms.js"

const newline = 10, carriageReturn = 13, space = 32, tab = 9, hash = 35, parenOpen = 40, dot = 46,
      braceOpen = 123, braceClose = 125, singleQuote = 39, doubleQuote = 34, backslash = 92,
      letter_o = 111, letter_x = 120, letter_N = 78, letter_u = 117, letter_U = 85

const bracketed = new Set([
  ParenthesizedExpression, TupleExpression, ComprehensionExpression, importList, ArgList, ParamList,
  ArrayExpression, ArrayComprehensionExpression, subscript,
  SetExpression, SetComprehensionExpression, FormatString, FormatReplacement, nestedFormatReplacement,
  DictionaryExpression, DictionaryComprehensionExpression,
  SequencePattern, MappingPattern, PatternArgList, TypeParamList
])

function isLineBreak(ch) {
  return ch == newline || ch == carriageReturn
}

function isHex(ch) {
  return ch >= 48 && ch <= 57 || ch >= 65 && ch <= 70 || ch >= 97 && ch <= 102
}

export const newlines = new ExternalTokenizer((input, stack) => {
  let prev
  if (input.next < 0) {
    input.acceptToken(eof)
  } else if (stack.context.flags & cx_Bracketed) {
    if (isLineBreak(input.next)) input.acceptToken(newlineBracketed, 1)
  } else if (((prev = input.peek(-1)) < 0 || isLineBreak(prev)) &&
             stack.canShift(blankLineStart)) {
    let spaces = 0
    while (input.next == space || input.next == tab) { input.advance(); spaces++ }
    if (input.next == newline || input.next == carriageReturn || input.next == hash)
      input.acceptToken(blankLineStart, -spaces)
  } else if (isLineBreak(input.next)) {
    input.acceptToken(newlineToken, 1)
  }
}, {contextual: true})

export const indentation = new ExternalTokenizer((input, stack) => {
  let context = stack.context
  if (context.flags) return
  let prev = input.peek(-1), depth
  if (prev == newline || prev == carriageReturn) {
    let depth = 0, chars = 0
    for (;;) {
      if (input.next == space) depth++
      else if (input.next == tab) depth += 8 - (depth % 8)
      else break
      input.advance()
      chars++
    }
    if (depth != context.indent &&
        input.next != newline && input.next != carriageReturn && input.next != hash) {
      if (depth < context.indent) input.acceptToken(dedent, -chars)
      else input.acceptToken(indent)
    }
  }
})

// Flags used in Context objects
const cx_Bracketed = 1, cx_String = 2, cx_DoubleQuote = 4, cx_Long = 8, cx_Raw = 16, cx_Format = 32

function Context(parent, indent, flags) {
  this.parent = parent
  this.indent = indent
  this.flags = flags
  this.hash = (parent ? parent.hash + parent.hash << 8 : 0) + indent + (indent << 4) + flags + (flags << 6)
}

const topIndent = new Context(null, 0, 0)

function countIndent(space) {
  let depth = 0
  for (let i = 0; i < space.length; i++)
    depth += space.charCodeAt(i) == tab ? 8 - (depth % 8) : 1
  return depth
}

const stringFlags = new Map([
  [stringStart, 0],
  [stringStartD, cx_DoubleQuote],
  [stringStartL, cx_Long],
  [stringStartLD, cx_Long | cx_DoubleQuote],
  [stringStartR, cx_Raw],
  [stringStartRD, cx_Raw | cx_DoubleQuote],
  [stringStartRL, cx_Raw | cx_Long],
  [stringStartRLD, cx_Raw | cx_Long | cx_DoubleQuote],
  [stringStartF, cx_Format],
  [stringStartFD, cx_Format | cx_DoubleQuote],
  [stringStartFL, cx_Format | cx_Long],
  [stringStartFLD, cx_Format | cx_Long | cx_DoubleQuote],
  [stringStartFR, cx_Format | cx_Raw],
  [stringStartFRD, cx_Format | cx_Raw | cx_DoubleQuote],
  [stringStartFRL, cx_Format | cx_Raw | cx_Long],
  [stringStartFRLD, cx_Format | cx_Raw | cx_Long | cx_DoubleQuote]
].map(([term, flags]) => [term, flags | cx_String]))

export const trackIndent = new ContextTracker({
  start: topIndent,
  reduce(context, term, _, input) {
    if ((context.flags & cx_Bracketed) && bracketed.has(term) ||
        (term == StringTerm || term == FormatString) && (context.flags & cx_String))
      return context.parent
    return context
  },
  shift(context, term, stack, input) {
    if (term == indent)
      return new Context(context, countIndent(input.read(input.pos, stack.pos)), 0)
    if (term == dedent)
      return context.parent
    if (term == ParenL || term == BracketL || term == BraceL || term == replacementStart)
      return new Context(context, 0, cx_Bracketed)
    if (stringFlags.has(term))
      return new Context(context, 0, stringFlags.get(term) | (context.flags & cx_Bracketed))
    return context
  },
  hash(context) { return context.hash }
})

export const legacyPrint = new ExternalTokenizer(input => {
  for (let i = 0; i < 5; i++) {
    if (input.next != "print".charCodeAt(i)) return
    input.advance()
  }
  if (/\w/.test(String.fromCharCode(input.next))) return
  for (let off = 0;; off++) {
    let next = input.peek(off)
    if (next == space || next == tab) continue
    if (next != parenOpen && next != dot && next != newline && next != carriageReturn && next != hash)
      input.acceptToken(printKeyword)
    return
  }
})

export const strings = new ExternalTokenizer((input, stack) => {
  let {flags} = stack.context
  let quote = (flags & cx_DoubleQuote) ? doubleQuote : singleQuote
  let long = (flags & cx_Long) > 0
  let escapes = !(flags & cx_Raw)
  let format = (flags & cx_Format) > 0

  let start = input.pos
  for (;;) {
    if (input.next < 0) {
      break
    } else if (format && input.next == braceOpen) {
      if (input.peek(1) == braceOpen) {
        input.advance(2)
      } else {
        if (input.pos == start) {
          input.acceptToken(replacementStart, 1)
          return
        }
        break
      }
    } else if (escapes && input.next == backslash) {
      if (input.pos == start) {
        input.advance()
        let escaped = input.next
        if (escaped >= 0) {
          input.advance()
          skipEscape(input, escaped)
        }
        input.acceptToken(Escape)
        return
      }
      break
    } else if (input.next == backslash && !escapes && input.peek(1) > -1) {
      // Raw strings still ignore escaped quotes, weirdly.
      input.advance(2)
    } else if (input.next == quote && (!long || input.peek(1) == quote && input.peek(2) == quote)) {
      if (input.pos == start) {
        input.acceptToken(stringEnd, long ? 3 : 1)
        return
      }
      break
    } else if (input.next == newline) {
      if (long) {
        input.advance()
      } else if (input.pos == start) {
        input.acceptToken(stringEnd)
        return
      }
      break
    } else {
      input.advance()
    }
  }
  if (input.pos > start) input.acceptToken(stringContent)
})

function skipEscape(input, ch) {
  if (ch == letter_o) {
    for (let i = 0; i < 2 && input.next >= 48 && input.next <= 55; i++) input.advance()
  } else if (ch == letter_x) {
    for (let i = 0; i < 2 && isHex(input.next); i++) input.advance()
  } else if (ch == letter_u) {
    for (let i = 0; i < 4 && isHex(input.next); i++) input.advance()
  } else if (ch == letter_U) {
    for (let i = 0; i < 8 && isHex(input.next); i++) input.advance()
  } else if (ch == letter_N) {
    if (input.next == braceOpen) {
      input.advance()
      while (input.next >= 0 && input.next != braceClose && input.next != singleQuote &&
             input.next != doubleQuote && input.next != newline) input.advance()
      if (input.next == braceClose) input.advance()
    }
  }
}

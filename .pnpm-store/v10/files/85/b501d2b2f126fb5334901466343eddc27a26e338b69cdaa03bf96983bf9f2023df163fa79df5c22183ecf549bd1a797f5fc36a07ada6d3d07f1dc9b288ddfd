'use strict'

const INDENT = Symbol.for('indent')
const NEWLINE = Symbol.for('newline')

const DEFAULT_NEWLINE = '\n'
const DEFAULT_INDENT = '  '
const BOM = /^\uFEFF/

// only respect indentation if we got a line break, otherwise squash it
// things other than objects and arrays aren't indented, so ignore those
// Important: in both of these regexps, the $1 capture group is the newline
// or undefined, and the $2 capture group is the indent, or undefined.
const FORMAT = /^\s*[{[]((?:\r?\n)+)([\s\t]*)/
const EMPTY = /^(?:\{\}|\[\])((?:\r?\n)+)?$/

// Node 20 puts single quotes around the token and a comma after it
const UNEXPECTED_TOKEN = /^Unexpected token '?(.)'?(,)? /i

const hexify = (char) => {
  const h = char.charCodeAt(0).toString(16).toUpperCase()
  return `0x${h.length % 2 ? '0' : ''}${h}`
}

// Remove byte order marker. This catches EF BB BF (the UTF-8 BOM)
// because the buffer-to-string conversion in `fs.readFileSync()`
// translates it to FEFF, the UTF-16 BOM.
const stripBOM = (txt) => String(txt).replace(BOM, '')

const makeParsedError = (msg, parsing, position = 0) => ({
  message: `${msg} while parsing ${parsing}`,
  position,
})

const parseError = (e, txt, context = 20) => {
  let msg = e.message

  if (!txt) {
    return makeParsedError(msg, 'empty string')
  }

  const badTokenMatch = msg.match(UNEXPECTED_TOKEN)
  const badIndexMatch = msg.match(/ position\s+(\d+)/i)

  if (badTokenMatch) {
    msg = msg.replace(
      UNEXPECTED_TOKEN,
      `Unexpected token ${JSON.stringify(badTokenMatch[1])} (${hexify(badTokenMatch[1])})$2 `
    )
  }

  let errIdx
  if (badIndexMatch) {
    errIdx = +badIndexMatch[1]
  } else /* istanbul ignore next - doesnt happen in Node 22 */ if (
    msg.match(/^Unexpected end of JSON.*/i)
  ) {
    errIdx = txt.length - 1
  }

  if (errIdx == null) {
    return makeParsedError(msg, `'${txt.slice(0, context * 2)}'`)
  }

  const start = errIdx <= context ? 0 : errIdx - context
  const end = errIdx + context >= txt.length ? txt.length : errIdx + context
  const slice = `${start ? '...' : ''}${txt.slice(start, end)}${end === txt.length ? '' : '...'}`

  return makeParsedError(
    msg,
    `${txt === slice ? '' : 'near '}${JSON.stringify(slice)}`,
    errIdx
  )
}

class JSONParseError extends SyntaxError {
  constructor (er, txt, context, caller) {
    const metadata = parseError(er, txt, context)
    super(metadata.message)
    Object.assign(this, metadata)
    this.code = 'EJSONPARSE'
    this.systemError = er
    Error.captureStackTrace(this, caller || this.constructor)
  }

  get name () {
    return this.constructor.name
  }

  set name (n) {}

  get [Symbol.toStringTag] () {
    return this.constructor.name
  }
}

const parseJson = (txt, reviver) => {
  const result = JSON.parse(txt, reviver)
  if (result && typeof result === 'object') {
    // get the indentation so that we can save it back nicely
    // if the file starts with {" then we have an indent of '', ie, none
    // otherwise, pick the indentation of the next line after the first \n If the
    // pattern doesn't match, then it means no indentation. JSON.stringify ignores
    // symbols, so this is reasonably safe. if the string is '{}' or '[]', then
    // use the default 2-space indent.
    const match = txt.match(EMPTY) || txt.match(FORMAT) || [null, '', '']
    result[NEWLINE] = match[1] ?? DEFAULT_NEWLINE
    result[INDENT] = match[2] ?? DEFAULT_INDENT
  }
  return result
}

const parseJsonError = (raw, reviver, context) => {
  const txt = stripBOM(raw)
  try {
    return parseJson(txt, reviver)
  } catch (e) {
    if (typeof raw !== 'string' && !Buffer.isBuffer(raw)) {
      const msg = Array.isArray(raw) && raw.length === 0 ? 'an empty array' : String(raw)
      throw Object.assign(
        new TypeError(`Cannot parse ${msg}`),
        { code: 'EJSONPARSE', systemError: e }
      )
    }
    throw new JSONParseError(e, txt, context, parseJsonError)
  }
}

module.exports = parseJsonError
parseJsonError.JSONParseError = JSONParseError
parseJsonError.noExceptions = (raw, reviver) => {
  try {
    return parseJson(stripBOM(raw), reviver)
  } catch {
    // no exceptions
  }
}

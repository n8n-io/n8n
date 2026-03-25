'use strict'

const { format, safe, safenot } = require('./safe-format')
const { jaystring } = require('./javascript')

/*
 * Construct a function from lines/blocks/if conditions.
 *
 * Returns a Function instance (makeFunction) or code in text format (makeModule).
 */

const INDENT_START = /[{[]/
const INDENT_END = /[}\]]/

module.exports = () => {
  const lines = []
  let indent = 0

  const pushLine = (line) => {
    if (INDENT_END.test(line.trim()[0])) indent--
    lines.push({ indent, code: line })
    if (INDENT_START.test(line[line.length - 1])) indent++
  }

  const build = () => {
    if (indent !== 0) throw new Error('Unexpected indent at build()')
    const joined = lines.map((line) => format('%w%s', line.indent * 2, line.code)).join('\n')
    return /^[a-z][a-z0-9]*$/i.test(joined) ? `return ${joined}` : `return (${joined})`
  }

  const processScope = (scope) => {
    const entries = Object.entries(scope)
    for (const [key, value] of entries) {
      if (!/^[a-z][a-z0-9]*$/i.test(key)) throw new Error('Unexpected scope key!')
      if (!(typeof value === 'function' || value instanceof RegExp))
        throw new Error('Unexpected scope value!')
    }
    return entries
  }

  return {
    optimizedOut: false, // some branch of code has been optimized out
    size: () => lines.length,

    write(fmt, ...args) {
      if (typeof fmt !== 'string') throw new Error('Format must be a string!')
      if (fmt.includes('\n')) throw new Error('Only single lines are supported')
      pushLine(format(fmt, ...args))
      return true // code was written
    },

    block(prefix, writeBody, noInline = false) {
      const oldIndent = indent
      this.write('%s {', prefix)
      const length = lines.length
      writeBody()
      if (length === lines.length) {
        // no lines inside block, unwind the block
        lines.pop()
        indent = oldIndent
        return false // nothing written
      } else if (length === lines.length - 1 && !noInline) {
        // a single line has been written, inline it if opt-in allows
        const { code } = lines[lines.length - 1]
        // check below is just for generating more readable code, it's safe to inline all !noInline
        if (!/^(if|for) /.test(code)) {
          lines.length -= 2
          indent = oldIndent
          return this.write('%s %s', prefix, code)
        }
      }
      return this.write('}')
    },

    if(condition, writeBody, writeElse) {
      if (`${condition}` === 'false') {
        if (writeElse) writeElse()
        if (writeBody) this.optimizedOut = true
      } else if (`${condition}` === 'true') {
        if (writeBody) writeBody()
        if (writeElse) this.optimizedOut = true
      } else if (writeBody && this.block(format('if (%s)', condition), writeBody, !!writeElse)) {
        if (writeElse) this.block(format('else'), writeElse) // !!writeElse above ensures {} wrapping before `else`
      } else if (writeElse) {
        this.if(safenot(condition), writeElse)
      }
    },

    makeModule(scope = {}) {
      const scopeDefs = processScope(scope).map(
        ([key, val]) => `const ${safe(key)} = ${jaystring(val)};`
      )
      return `(function() {\n'use strict'\n${scopeDefs.join('\n')}\n${build()}})()`
    },

    makeFunction(scope = {}) {
      const scopeEntries = processScope(scope)
      const keys = scopeEntries.map((entry) => entry[0])
      const vals = scopeEntries.map((entry) => entry[1])
      // eslint-disable-next-line no-new-func
      return Function(...keys, `'use strict'\n${build()}`)(...vals)
    },
  }
}

'use strict'

exports.parse = function (source, transform) {
  return parsePostgresArray(source, transform)
}

function parsePostgresArray (source, transform, nested = false) {
  let character = ''
  let quote = false
  let position = 0
  let dimension = 0
  const entries = []
  let recorded = ''

  const newEntry = function (includeEmpty) {
    let entry = recorded

    if (entry.length > 0 || includeEmpty) {
      if (entry === 'NULL' && !includeEmpty) {
        entry = null
      }

      if (entry !== null && transform) {
        entry = transform(entry)
      }

      entries.push(entry)
      recorded = ''
    }
  }

  if (source[0] === '[') {
    while (position < source.length) {
      const char = source[position++]

      if (char === '=') { break }
    }
  }

  while (position < source.length) {
    let escaped = false
    character = source[position++]

    if (character === '\\') {
      character = source[position++]
      escaped = true
    }

    if (character === '{' && !quote) {
      dimension++

      if (dimension > 1) {
        const parser = parsePostgresArray(source.substr(position - 1), transform, true)

        entries.push(parser.entries)
        position += parser.position - 2
      }
    } else if (character === '}' && !quote) {
      dimension--

      if (!dimension) {
        newEntry()

        if (nested) {
          return {
            entries,
            position
          }
        }
      }
    } else if (character === '"' && !escaped) {
      if (quote) {
        newEntry(true)
      }

      quote = !quote
    } else if (character === ',' && !quote) {
      newEntry()
    } else {
      recorded += character
    }
  }

  if (dimension !== 0) {
    throw new Error('array dimension not balanced')
  }

  return entries
}

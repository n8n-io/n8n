const quotes = require('./quotes')
const dotenvParse = require('./dotenvParse')
const escapeForRegex = require('./escapeForRegex')
const escapeDollarSigns = require('./escapeDollarSigns')

function replace (src, key, replaceValue) {
  let output
  let newPart = ''

  const parsed = dotenvParse(src, true, true) // skip expanding \n and skip converting \r\n
  const _quotes = quotes(src)
  if (Object.prototype.hasOwnProperty.call(parsed, key)) {
    const quote = _quotes[key]
    newPart += `${key}=${quote}${replaceValue}${quote}`

    const originalValue = parsed[key]
    const escapedOriginalValue = escapeForRegex(originalValue)

    // conditionally enforce end of line
    let enforceEndOfLine = ''
    if (escapedOriginalValue === '') {
      enforceEndOfLine = '$' // EMPTY scenario

      // if empty quote and consecutive newlines
      const newlineMatch = src.match(new RegExp(`${key}\\s*=\\s*\n\n`, 'm')) // match any consecutive newline scenario for a blank value
      if (quote === '' && newlineMatch) {
        const newlineCount = (newlineMatch[0].match(/\n/g)).length - 1
        for (let i = 0; i < newlineCount; i++) {
          newPart += '\n' // re-append the extra newline to preserve user's format choice
        }
      }
    }

    const currentPart = new RegExp(
      '^' + // start of line
      '(\\s*)?' + // spaces
      '(export\\s+)?' + // export
      key + // KEY
      '\\s*=\\s*' + // spaces (KEY = value)
      '["\'`]?' + // open quote
      escapedOriginalValue + // escaped value
      '["\'`]?' + // close quote
      enforceEndOfLine
      ,
      'gm' // (g)lobal (m)ultiline
    )

    const saferInput = escapeDollarSigns(newPart) // cleanse user inputted capture groups ($1, $2 etc)

    // $1 preserves spaces
    // $2 preserves export
    output = src.replace(currentPart, `$1$2${saferInput}`)
  } else {
    newPart += `${key}="${replaceValue}"`

    // append
    if (src.endsWith('\n')) {
      newPart = newPart + '\n'
    } else {
      newPart = '\n' + newPart
    }

    output = src + newPart
  }

  return output
}

module.exports = replace

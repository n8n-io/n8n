const IS_WINDOWS = process.platform === 'win32'

module.exports = crossArgv

function crossArgv (pargv, force) {
  if (!pargv) pargv = process.argv
  const str = pargv.join(` `)
  if (((!IS_WINDOWS || (str.match(/'/g) || []).length < 2) && !force)) return pargv

  const newStr = str.replace(/'(.+?)'/g, `"$1"`)
  return splitCommandLine(newStr)
}

/**
 * @form https://stackoverflow.com/a/56930457/12391660
 * @param {*} commandLine
 * @returns
 */
function splitCommandLine (commandLine) {
  //  Find a unique marker for pairs of double-quote characters.
  //  Start with '<DDQ>' and repeatedly append '@' if necessary to make it unique.
  var doubleDoubleQuote = '<DDQ>'
  while (commandLine.indexOf(doubleDoubleQuote) > -1) doubleDoubleQuote += '@'

  //  Replace all pairs of double-quotes with above marker.
  var noDoubleDoubleQuotes = commandLine.replace(/""/g, doubleDoubleQuote)

  //  As above, find a unique marker for spaces.
  var spaceMarker = '<SP>'
  while (commandLine.indexOf(spaceMarker) > -1) spaceMarker += '@'

  //  Protect double-quoted strings.
  //   o  Find strings of non-double-quotes, wrapped in double-quotes.
  //   o  The final double-quote is optional to allow for an unterminated string.
  //   o  Replace each double-quoted-string with what's inside the qouble-quotes,
  //      after each space character has been replaced with the space-marker above;
  //      and each double-double-quote marker has been replaced with a double-
  //      quote character.
  //   o  The outer double-quotes will not be present.
  var noSpacesInQuotes = noDoubleDoubleQuotes.replace(/"([^"]*)"?/g, (fullMatch, capture) => {
    return capture.replace(/ /g, spaceMarker)
      .replace(RegExp(doubleDoubleQuote, 'g'), '"')
  })

  //  Now that it is safe to do so, split the command-line at one-or-more spaces.
  var mangledParamArray = noSpacesInQuotes.split(/ +/)

  //  Create a new array by restoring spaces from any space-markers. Also, any
  //  remaining double-double-quote markers must have been from OUTSIDE a double-
  //  quoted string and so are removed.
  var paramArray = mangledParamArray.map((mangledParam) => {
    return mangledParam.replace(RegExp(spaceMarker, 'g'), ' ')
      .replace(RegExp(doubleDoubleQuote, 'g'), '')
  })

  return paramArray
}

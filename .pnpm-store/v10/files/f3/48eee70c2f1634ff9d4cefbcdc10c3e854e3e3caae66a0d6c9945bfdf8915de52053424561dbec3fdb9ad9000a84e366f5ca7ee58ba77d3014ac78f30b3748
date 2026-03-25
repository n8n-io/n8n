/*
  Regex detection.
  From: https://github.com/riot/parser/blob/master/src/skip-regex.js
*/

var skipRegex = (function () { //eslint-disable-line no-unused-vars

  // safe characters to precced a regex (including `=>`, `**`, and `...`)
  var beforeReChars = '[{(,;:?=|&!^~>%*/'

  // keyword that can preceed a regex (`in` is handled as special case)
  var beforeReWords = [
    'case',
    'default',
    'do',
    'else',
    'in',
    'instanceof',
    'prefix',
    'return',
    'typeof',
    'void',
    'yield'
  ]

  var wordsLastChar = beforeReWords.reduce(function (s, w) {
    return s + w.slice(-1)
  }, '')

  // The string to test can't include line-endings
  var RE_REGEX = /^\/(?=[^*>/])[^[/\\]*(?:(?:\\.|\[(?:\\.|[^\]\\]*)*\])[^[\\/]*)*?\/[gimuy]*/
  var RE_VN_CHAR = /[$\w]/

  // Searches the position of the previous non-blank character inside `code`,
  // starting with `pos - 1`.
  function prev (code, pos) {
    while (--pos >= 0 && /\s/.test(code[pos]));
    return pos
  }

  /**
   * Check if the code in the `start` position can be a regex.
   *
   * @param   {string} code  - Buffer to test in
   * @param   {number} start - Position the first slash inside `code`
   * @returns {number} position of the char following the regex.
   */
  function _skipRegex (code, start) {

    // `exec()` will extract from the slash to the end of line and the
    // chained `match()` will match the possible regex.
    var re = /.*/g
    var pos = re.lastIndex = start++
    var match = re.exec(code)[0].match(RE_REGEX)

    if (match) {
      var next = pos + match[0].length  // result is not from `re.exec`

      pos = prev(code, pos)
      var c = code[pos]

      // start of buffer or safe prefix?
      if (pos < 0 || ~beforeReChars.indexOf(c)) {
        return next
      }

      // from here, `pos` is >= 0 and `c` is code[pos]
      // is-tanbul ignore next: This is for ES6
      if (c === '.') {
        // can be `...` or something silly like 5./2
        if (code[pos - 1] === '.') {
          start = next
        }

      } else if (c === '+' || c === '-') {
        // tricky case
        if (code[--pos] !== c ||              // if have a single operator or
            (pos = prev(code, pos)) < 0 ||    // ...have `++` and no previous token or
            !RE_VN_CHAR.test(code[pos])) {    // ...the token is not a JS var/number
          start = next                        // ...this is a regex
        }

      } else if (~wordsLastChar.indexOf(c)) {
        // keyword?
        var end = pos + 1

        while (--pos >= 0 && RE_VN_CHAR.test(code[pos]));
        if (~beforeReWords.indexOf(code.slice(pos + 1, end))) {
          start = next
        }
      }
    }

    return start
  }

  return _skipRegex

})()

/**
 * riot.util.brackets
 *
 * - `brackets    ` - Returns a string or regex based on its parameter
 * - `brackets.set` - Change the current riot brackets
 *
 * @module
 */
//#if 0 // only in the unprocessed source
/* eslint no-unused-vars: [2, {args: "after-used", varsIgnorePattern: "^brackets$"}] */
/* global skipRegex */
//#endif

//#if ES6
/* global riot */

export
//#endif
var brackets = (function (UNDEF) {
  //
  // Closure data
  // --------------------------------------------------------------------------
  //
  //#set $_RIX_TEST  = 4
  //#set $_RIX_ESC   = 5
  //#set $_RIX_OPEN  = 6
  //#set $_RIX_CLOSE = 7
  //#set $_RIX_PAIR  = 8
  //#set $_RIX_LOOP  = 9
  //#ifndef $_RIX_TEST
  var
    $_RIX_TEST  = 4,  // DONT'T FORGET SYNC THE #set BLOCK!!!
    $_RIX_ESC   = 5,
    $_RIX_OPEN  = 6,
    $_RIX_CLOSE = 7,
    $_RIX_PAIR  = 8,
    $_RIX_LOOP  = 9
  //#endif

  var
    REGLOB = 'g',

    /**
     * Used by internal functions and shared with the riot compiler, matches valid,
     * multiline JavaScript comments in almost all its forms. Can handle embedded
     * sequences `/\*`, `*\/` and `//` inside these. Skips non-valid comments like `/*\/`
     *
     * `R_MLCOMMS` does not make captures.
     * @const {RegExp}
     * @static
     */
    R_MLCOMMS = /\/\*[^*]*\*+(?:[^*\/][^*]*\*+)*\//g,

    /**
     * Used by internal functions and shared with the riot compiler, matches single or
     * double quoted strings, handles embedded quotes and multi-line strings (not in
     * accordance with the JavaScript spec).
     * It is not for ES6 template strings.
     *
     * `R_STRINGS` does not make captures.
     * @const {RegExp}
     * @static
     */
    R_STRINGS = /"[^"\\]*(?:\\[\S\s][^"\\]*)*"|'[^'\\]*(?:\\[\S\s][^'\\]*)*'|`[^`\\]*(?:\\[\S\s][^`\\]*)*`/g,

    /**
     * For use with the RegExp constructor. Combines the
     * {@link module:brackets.R_STRINGS|R_STRINGS} source with sources of regexes matching
     * division operators and literal regexes.
     * The resulting regex captures in `$1` and `$2` a single slash, depending
     * if it matches a division operator ($1) or a literal regex ($2).
     * @const {string}
     * @static
     */
    S_QBLOCKS = R_STRINGS.source + '|' +
      /(?:\breturn\s+|(?:[$\w\)\]]|\+\+|--)\s*(\/)(?![*\/]))/.source + '|' +
      /\/(?=[^*\/])[^[\/\\]*(?:(?:\[(?:\\.|[^\]\\]*)*\]|\\.)[^[\/\\]*)*?([^<]\/)[gim]*/.source,

    /**
     * Characters not supported by the expression parser.
     * @const {RegExp}
     * @static
     */
    UNSUPPORTED = RegExp('[\\' + 'x00-\\x1F<>a-zA-Z0-9\'",;\\\\]'),

    /**
     * These characters have to be escaped - Note that '{}' is not in this list.
     * @const {RegExp}
     * @static
     */
    NEED_ESCAPE = /(?=[[\]()*+?.^$|])/g,

    /*
      JS/ES6 quoted strings and start of regex (basic ES6 does not supports nested backquotes).
    */
    S_QBLOCK2 = R_STRINGS.source + '|' + /(\/)(?![*\/])/.source,

    /**
     * Hash of regexes for matching JavaScript brackets out of quoted strings and literal
     * regexes. Used by {@link module:brackets.split|split}, these are heavy, but their
     * performance is acceptable.
     * @const {object}
     * @private
     */
    FINDBRACES = {
      '(': RegExp('([()])|'   + S_QBLOCK2, REGLOB),
      '[': RegExp('([[\\]])|' + S_QBLOCK2, REGLOB),
      '{': RegExp('([{}])|'   + S_QBLOCK2, REGLOB)
    },

    /**
     * The predefined riot brackets
     * @const {string}
     * @default
     */
    DEFAULT = '{ }'

  // pre-made string and regexes for the default brackets
  var _pairs = [
    '{', '}',                   // [0-1]: separated brackets
    '{', '}',                   // [2-3]: separated brackets (escaped)
    /{[^}]*}/,                  // $_RIX_TEST
    /\\([{}])/g,                // $_RIX_ESC
    /\\({)|{/g,                 // $_RIX_OPEN
    RegExp('\\\\(})|([[({])|(})|' + S_QBLOCK2, REGLOB),       // $_RIX_CLOSE
    DEFAULT,                    // $_RIX_PAIR
    /^\s*{\^?\s*([$\w]+)(?:\s*,\s*(\S+))?\s+in\s+(\S.*)\s*}/, // $_RIX_LOOP
    /(^|[^\\]){=[\S\s]*?}/      // $_RIX_RAW
  ]

  // Variable information about the current brackets state, initialized on first use
  // and on bracket changes.
  var
    cachedBrackets = UNDEF,     // full brackets string in use, for change detection
    _regex,                     // function for regex convertion of default brackets
    _cache = [],                // pre-made string and regexes for the current brackets
    _settings                   // mirror `riot.settings`

  //
  // Private functions
  // --------------------------------------------------------------------------

  /**
   * Rewrite function for default brackets, returns the received regex as-is.
   * Used by the main brackets function when the current brackets are the default.
   * @param   {RegExp} re RegExp instance with the default riot brackets
   * @returns {RegExp}    The received regex.
   * @private
   */
  function _loopback (re) { return re }

  /**
   * Rewrite the regex with the default brackets replaced with the custom ones.
   * Used by the main brackets function when the current brackets are not the default.
   * @param   {RegExp} re  - RegExp instance with the default riot brackets
   * @param   {Array} [bp] - Escaped brackets in elements 2-3, defaults to those in _cache
   * @returns {RegExp} Copy of the received regex, with the default brackets replaced.
   * @private
   */
  function _rewrite (re, bp) {
    if (!bp) bp = _cache
    return new RegExp(
      re.source.replace(/{/g, bp[2]).replace(/}/g, bp[3]), re.global ? REGLOB : ''
    )
  }

  /**
   * Creates an array with pre-made strings and regexes based on the received brackets.
   * With the default brackets, returns a reference to an inner static array.
   *
   * Does not accept `<, >, a-z, A-Z, 0-9` nor control characters.
   * @param   {string} pair - String with the desired brackets pair (cannot be falsy)
   * @returns {Array}  Array with information for the given brackets.
   * @throws  Will throw an "Unsupported brackets ..." if _pair_ is not separated with
   *   exactly one space, or contains an invalid character.
   * @private
   */
  function _create (pair) {
    if (pair === DEFAULT) return _pairs

    var arr = pair.split(' ')

    if (arr.length !== 2 || UNSUPPORTED.test(pair)) {
      throw new Error('Unsupported brackets "' + pair + '"')
    }
    arr = arr.concat(pair.replace(NEED_ESCAPE, '\\').split(' '))

    arr[$_RIX_TEST] = _rewrite(arr[1].length > 1 ? /{[\S\s]*?}/ : _pairs[$_RIX_TEST], arr)
    arr[$_RIX_ESC] = _rewrite(pair.length > 3 ? /\\({|})/g : _pairs[$_RIX_ESC], arr)
    arr[$_RIX_OPEN] = _rewrite(_pairs[$_RIX_OPEN], arr) // for _split()
    arr[$_RIX_CLOSE] = RegExp('\\\\(' + arr[3] + ')|([[({])|(' + arr[3] + ')|' + S_QBLOCK2, REGLOB)
    arr[$_RIX_PAIR] = pair
    return arr
  }

  //
  // "Exported" functions
  // --------------------------------------------------------------------------

  /**
   * The main function.
   *
   * With a numeric parameter, returns the current left (0) or right (1) riot brackets.
   *
   * With a regex, returns the original regex if the current brackets are the defaults,
   * or a new one with the default brackets replaced by the current custom brackets.
   * @param   {RegExp|number} reOrIdx - As noted above
   * @returns {RegExp|string} Based on the received parameter.
   * @alias   brackets
   */
  function _brackets (reOrIdx) {
    return reOrIdx instanceof RegExp ? _regex(reOrIdx) : _cache[reOrIdx]
  }

  /**
   * Splits the received string in its template text and expression parts using
   * balanced brackets detection to avoid require escaped brackets from users.
   *
   * _For internal use by tmpl and the riot-compiler._
   * @param   {string} str    - Template source to split, can be one expression
   * @param   {number} [tmpl] - 1 if called from `tmpl()`
   * @param   {Array}  [_bp]  - Info of custom brackets to use
   * @returns {Array} - Array containing template text and expressions.
   *   If str was one unique expression, returns two elements: ["", expression].
   * @private
   */
  _brackets.split = function split (str, tmpl, _bp) {
    // istanbul ignore next: _bp is for the compiler
    if (!_bp) _bp = _cache

    // Template text is easy: closing brackets are ignored, all we have to do is find
    // the first unescaped bracket. The real work is with the expressions...
    //
    // Expressions are not so easy. We can already ignore opening brackets, but finding
    // the correct closing bracket is tricky.
    // Strings and regexes can contain almost any combination of characters and we
    // can't deal with these complexity with our regexes, so let's hide and ignore
    // these. From there, all we need is to detect the bracketed parts and skip
    // them, as they contains most of the common characters used by riot brackets.
    // With that, we have a 90% reliability in the detection, although (hope few) some
    // custom brackets still requires to be escaped.
    var
      parts = [],                 // holds the resulting parts
      match,                      // reused by both outer and nested searches
      isexpr,                     // we are in ttext (0) or expression (1)
      start,                      // start position of current template or expression
      pos,                        // current position (exec() result)
      re = _bp[$_RIX_OPEN]        // start with *updated* opening bracket

    var qblocks = []              // quoted strings and regexes
    var prevStr = ''
    var mark, lastIndex

    isexpr = start = re.lastIndex = 0       // re is reused, we must reset lastIndex

    while ((match = re.exec(str))) {

      lastIndex = re.lastIndex
      pos = match.index

      if (isexpr) {
        // $1: optional escape character,
        // $2: opening js bracket `{[(`,
        // $3: closing riot bracket,
        // $4: opening slashes of regex

        if (match[2]) {                     // if have a javascript opening bracket,
          //re.lastIndex = skipBraces(str, match[2], re.lastIndex)
          var ch = match[2]
          var rech = FINDBRACES[ch]
          var ix = 1

          rech.lastIndex = lastIndex
          while ((match = rech.exec(str))) {
            if (match[1]) {
              if (match[1] === ch) ++ix
              else if (!--ix) break
            } else {
              rech.lastIndex = pushQBlock(match.index, rech.lastIndex, match[2])
            }
          }
          re.lastIndex = ix ? str.length : rech.lastIndex
          continue                          // skip the bracketed block and loop
        }

        if (!match[3]) {                    // if don't have a closing bracket
          re.lastIndex = pushQBlock(pos, lastIndex, match[4])
          continue                          // search again
        }
      }

      // At this point, we expect an _unescaped_ openning bracket in $2 for text,
      // or a closing bracket in $3 for expression.

      if (!match[1]) {                      // ignore it if have an escape char
        unescapeStr(str.slice(start, pos))  // push part, even if empty
        start = re.lastIndex                // next position is the new start
        re = _bp[$_RIX_OPEN + (isexpr ^= 1)] // switch mode and swap regexp
        re.lastIndex = start                // update the regex pointer
      }
    }

    if (str && start < str.length) {        // push remaining part, if we have one
      unescapeStr(str.slice(start))
    }

    // send the literal strings as an array property
    parts.qblocks = qblocks

    return parts

    // Inner Helpers for _split() -----

    // Store the string in the array `parts`.
    // Unescape escaped brackets from expressions and, if we are called from
    // tmpl, from the HTML part too.
    function unescapeStr (s) {
      if (prevStr) {
        s = prevStr + s
        prevStr = ''
      }
      if (tmpl || isexpr) {
        parts.push(s && s.replace(_bp[$_RIX_ESC], '$1'))
      } else {
        parts.push(s)
      }
    }

    // Find the js closing bracket for the current block.
    // Skips strings, regexes, and other inner blocks.
    function pushQBlock(_pos, _lastIndex, slash) { //eslint-disable-line
      if (slash) {
        _lastIndex = skipRegex(str, _pos)
      }
      // do not save empty strings or non-regex slashes
      if (tmpl && _lastIndex > _pos + 2) {
        mark = '\u2057' + qblocks.length + '~'
        qblocks.push(str.slice(_pos, _lastIndex))
        prevStr += str.slice(start, _pos) + mark
        start = _lastIndex
      }
      return _lastIndex
    }
  }

  // exposed by riot.util.tmpl.hasExpr
  _brackets.hasExpr = function hasExpr (str) {
    return _cache[$_RIX_TEST].test(str)
  }

  // exposed by riot.util.tmpl.loopKeys
  _brackets.loopKeys = function loopKeys (expr) {
    var m = expr.match(_cache[$_RIX_LOOP])

    return m
      ? { key: m[1], pos: m[2], val: _cache[0] + m[3].trim() + _cache[1] }
      : { val: expr.trim() }
  }

  /**
   * Returns an array with brackets information, defaults to the current brackets.
   * (the `brackets` module in the node version of the compiler allways defaults
   * to the predefined riot brackets `{ }`).
   *
   * _This function is for internal use._
   * @param   {string} [pair] - If used, returns info for this brackets
   * @returns {Array}  Brackets array in internal format.
   * @private
   */
  _brackets.array = function array (pair) {
    return pair ? _create(pair) : _cache
  }

  /**
   * Resets the _cache array with strings and regexes based on its parameter.
   * @param {string} [pair=DEFAULT] - String with the brackets pair to set
   * @alias brackets.set
   */
  function _reset (pair) {
    if ((pair || (pair = DEFAULT)) !== _cache[$_RIX_PAIR]) {
      _cache = _create(pair)
      _regex = pair === DEFAULT ? _loopback : _rewrite
      _cache[$_RIX_LOOP] = _regex(_pairs[$_RIX_LOOP])
    }
    cachedBrackets = pair  // always set these
  }

  /**
   * Allows change detection of `riot.settings.brackets`.
   * @param {object} o - Where store the `brackets` property, mostly `riot.settings`
   * @private
   */
  function _setSettings (o) {
    var b

    o = o || {}
    b = o.brackets
    Object.defineProperty(o, 'brackets', {
      set: _reset,
      get: function () { return cachedBrackets },
      enumerable: true
    })
    _settings = o   // save the new reference
    _reset(b)       // update the brackets
  }

  // Inmediate execution
  // --------------------------------------------------------------------------

  // Set the internal _settings property as reference to `riot.settings`
  Object.defineProperty(_brackets, 'settings', {
    set: _setSettings,
    get: function () { return _settings }
  })

  /* istanbul ignore next: in the browser riot is always in the scope */
  _brackets.settings = typeof riot !== 'undefined' && riot.settings || {}
  _brackets.set = _reset
  _brackets.skipRegex = skipRegex

  // Public properties, shared with `tmpl`
  _brackets.R_STRINGS = R_STRINGS
  _brackets.R_MLCOMMS = R_MLCOMMS
  _brackets.S_QBLOCKS = S_QBLOCKS
  _brackets.S_QBLOCK2 = S_QBLOCK2

  return _brackets

})()

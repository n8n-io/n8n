'use strict';
var $ = require('../internals/export');
var global = require('../internals/global');
var getBuiltIn = require('../internals/get-built-in');
var uncurryThis = require('../internals/function-uncurry-this');
var call = require('../internals/function-call');
var fails = require('../internals/fails');
var toString = require('../internals/to-string');
var hasOwn = require('../internals/has-own-property');
var validateArgumentsLength = require('../internals/validate-arguments-length');
var ctoi = require('../internals/base64-map').ctoi;

var disallowed = /[^\d+/a-z]/i;
var whitespaces = /[\t\n\f\r ]+/g;
var finalEq = /[=]{1,2}$/;

var $atob = getBuiltIn('atob');
var fromCharCode = String.fromCharCode;
var charAt = uncurryThis(''.charAt);
var replace = uncurryThis(''.replace);
var exec = uncurryThis(disallowed.exec);

var NO_SPACES_IGNORE = fails(function () {
  return $atob(' ') !== '';
});

var NO_ENCODING_CHECK = !fails(function () {
  $atob('a');
});

var NO_ARG_RECEIVING_CHECK = !NO_SPACES_IGNORE && !NO_ENCODING_CHECK && !fails(function () {
  $atob();
});

var WRONG_ARITY = !NO_SPACES_IGNORE && !NO_ENCODING_CHECK && $atob.length !== 1;

// `atob` method
// https://html.spec.whatwg.org/multipage/webappapis.html#dom-atob
$({ global: true, bind: true, enumerable: true, forced: NO_SPACES_IGNORE || NO_ENCODING_CHECK || NO_ARG_RECEIVING_CHECK || WRONG_ARITY }, {
  atob: function atob(data) {
    validateArgumentsLength(arguments.length, 1);
    // `webpack` dev server bug on IE global methods - use call(fn, global, ...)
    if (NO_ARG_RECEIVING_CHECK || WRONG_ARITY) return call($atob, global, data);
    var string = replace(toString(data), whitespaces, '');
    var output = '';
    var position = 0;
    var bc = 0;
    var chr, bs;
    if (string.length % 4 === 0) {
      string = replace(string, finalEq, '');
    }
    if (string.length % 4 === 1 || exec(disallowed, string)) {
      throw new (getBuiltIn('DOMException'))('The string is not correctly encoded', 'InvalidCharacterError');
    }
    while (chr = charAt(string, position++)) {
      if (hasOwn(ctoi, chr)) {
        bs = bc % 4 ? bs * 64 + ctoi[chr] : ctoi[chr];
        if (bc++ % 4) output += fromCharCode(255 & bs >> (-2 * bc & 6));
      }
    } return output;
  }
});

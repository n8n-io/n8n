(function webpackUniversalModuleDefinition(root, factory) {
	if(typeof exports === 'object' && typeof module === 'object')
		module.exports = factory();
	else if(typeof define === 'function' && define.amd)
		define([], factory);
	else if(typeof exports === 'object')
		exports["indefinite"] = factory();
	else
		root["indefinite"] = factory();
})(self, () => {
return /******/ (() => { // webpackBootstrap
/******/ 	var __webpack_modules__ = ({

/***/ 769:
/***/ ((__unused_webpack_module, exports) => {

var STARTS_WITH_VOWEL = /^[aeiouAEIOU]/;

/**
 * Array#indexOf is faster IF the word starts with "a" (for example),
 * but negligibly faster when you have to .toLowerCase() the word, and
 * slower if the word happens to start with (e.g.) "u."
 */
exports.startsWithVowel = function (word) {
  return STARTS_WITH_VOWEL.test(word);
};
exports.capitalize = function (article, opts) {
  if (opts.capitalize) {
    article = "".concat(article.charAt(0).toUpperCase()).concat(article.slice(1));
  }
  return article;
};

/***/ }),

/***/ 393:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

var _require = __webpack_require__(769),
  capitalize = _require.capitalize;
var irregulars = __webpack_require__(725);
var rules = __webpack_require__(803);
var indefinite = function indefinite(word) {
  var opts = arguments.length > 1 && arguments[1] !== undefined ? arguments[1] : {};
  var article;

  /**
   * I'd really prefer to use for of here, but babel converts that
   * to something using Symbol.iterator, which PhantomJS chokes on.
   */
  rules.some(function (rule) {
    if (rule.check(word, opts)) {
      article = rule.run(word, opts);
      return true;
    }
  });
  return handleOptions(article, opts, word);
};
var handleOptions = function handleOptions(article, opts, word) {
  article = capitalize(article, opts);
  if (opts.articleOnly) {
    return article;
  }
  return "".concat(article, " ").concat(word);
};
indefinite.irregularWords = irregulars.list;
module.exports = indefinite;

/***/ }),

/***/ 725:
/***/ ((__unused_webpack_module, exports) => {

exports.check = function (word, ending) {
  if (ending) {
    // If the word ends in the ending, remove it.
    var regex = new RegExp("".concat(ending, "$"));
    word = word.replace(regex, '');
    if (word.length <= 1) {
      return false;
    }
  }
  return exports.list.indexOf(word) > -1;
};

/**
 * Here follows a List of words that take irregular articles because their
 * first letter is either a consonant pronounced like a vowel (hour) or a
 * vowel proncounced like a consonant (ukelele). Note that this is not only
 * nouns because adjectives and adverbs that start with these letters could
 * also follow an article when they identify a later noun, as in "a useless
 * tool."
 *
 * This is not an attempt at a complete list, but rather a collection of
 * words used in at least moderate frequency. A list of ALL irregular words
 * would be too exhaustive to compile without some sort of tool.
 * http://www.thefreedictionary.com/words-that-start-with-eu says there are
 * over 1800 words starting with "eu" alone.
 *
 * At least for now, this list omits proper names, as they aren't USUALLY
 * used in such a way as to require an _indefinite_ article. I can't think,
 * for example, of a case where you'd want to say "a Eustace."
 */
exports.list = [
// Nouns: eu like y
'eunuch', 'eucalyptus', 'eugenics', 'eulogy', 'euphemism', 'euphony', 'euphoria', 'eureka',
// Adjectives: eu like y
'euro', 'european', 'euphemistic', 'euphonic', 'euphoric',
// Adverbs: eu like y
'euphemistically', 'euphonically', 'euphorically',
// Nouns: silent h
'heir', 'heiress', 'herb', 'homage', 'honesty', 'honor', 'honour', 'honoree', 'hour',
// Adjectives: silent h
'honest', 'honorous',
// Adverbs: silent h
'honestly', 'hourly',
// Nouns: o like w
'one', 'ouija',
// Adjectives: o like w
'once',
// Adverbs: o like w

// Nouns: u like y
'ubiquity', 'udometer', 'ufo', 'uke', 'ukelele', 'ululate', 'unicorn', 'unicycle', 'uniform', 'unify', 'union', 'unison', 'unit', 'unity', 'universe', 'university', 'upas', 'ural', 'uranium', 'urea', 'ureter', 'urethra', 'urine', 'urologist', 'urology', 'urus', 'usage', 'use', 'user', 'usual', 'usurp', 'usurper', 'usury', 'utensil', 'uterus', 'utility', 'utopia', 'utricle', 'uvarovite', 'uvea', 'uvula', 'utah', 'utahn',
// Adjectives: u like y
'ubiquitous', 'ugandan', 'ukrainian', 'unanimous', 'unicameral', 'unified', 'unique', 'unisex', 'universal', 'urinal', 'urological', 'useful', 'useless', 'usurious', 'utilitarian', 'utopic',
// Adverbs: u like y
'ubiquitously', 'unanimously', 'unicamerally', 'uniquely', 'universally', 'urologically', 'usefully', 'uselessly', 'usuriously',
// Nouns: y like i
'yttria', 'yggdrasil', 'ylem', 'yperite', 'ytterbia', 'ytterbium', 'yttrium',
// Adjectives: y like i
'ytterbous', 'ytterbic', 'yttric',
// Single letters
'f', 'h', 'l', 'm', 'n', 'r', 's', 'u', 'x'];

/***/ }),

/***/ 803:
/***/ ((module, __unused_webpack_exports, __webpack_require__) => {

module.exports = [__webpack_require__(374), __webpack_require__(532), __webpack_require__(202)];

/***/ }),

/***/ 532:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

var _require = __webpack_require__(769),
  startsWithVowel = _require.startsWithVowel;
var ACRONYM = /^[A-Z]+$/;
var IRREGULAR_ACRONYM = /^[UFHLMNRSX]/;
var isIrregularAcronym = function isIrregularAcronym(word) {
  return IRREGULAR_ACRONYM.test(word.charAt(0));
};

/**
 * Both = a && b
 * Neither = !a && !b
 * In the case of Booleans, this means
 * either both true or both false, so
 * we can just compare the equality of
 * a and b.
 */
var bothOrNeither = function bothOrNeither(a, b) {
  return a === b;
};

/**
 * If the entirety of the first word is capital letters
 * and case insensitivity is off, it's an acronym.
 */
exports.check = function (word, _ref) {
  var caseInsensitive = _ref.caseInsensitive;
  return caseInsensitive ? false : ACRONYM.test(word.split(' ')[0]);
};
exports.run = function (word) {
  var isIrregular = isIrregularAcronym(word);
  var initialVowel = startsWithVowel(word);
  /*
   * If it starts with U: "a"
   * If it starts with any other vowel: "an"
   * If it starts with F, H, L, M, N, R, S, or X: "an"
   * If it starts with any other consonant: "a"
   */
  var article = bothOrNeither(initialVowel, isIrregular) ? 'a' : 'an';
  return article;
};

/***/ }),

/***/ 374:
/***/ ((__unused_webpack_module, exports) => {

var NUMBERS = /^([0-9,]+)/;
var EIGHT_ELEVEN_EIGHTEEN = /^(11|8|18)/;
var ELEVEN_EIGHTEEN = /^(11|18)/;
exports.check = function (word) {
  return NUMBERS.test(word);
};
exports.run = function (word, opts) {
  var number = word.toString().match(NUMBERS)[1].replace(/,/g, '');
  var article = 'a';
  if (EIGHT_ELEVEN_EIGHTEEN.test(number)) {
    var startsWith11Or18 = ELEVEN_EIGHTEEN.test(number);

    // If the number starts with 11 or 18 and is of length 4,
    // the pronunciation is ambiguous so check opts.numbers to see
    // how to render it. Otherwise, if it starts with 11 or 18
    // and has 2, 5, 8, 11, etc. digits, use 'an.' Finally, if it
    // starts with an 8, use 'an.' For everything else, use 'a.'
    if (startsWith11Or18 && number.length === 4) {
      article = opts.numbers === 'colloquial' ? 'an' : 'a';
    } else if (startsWith11Or18 && (number.length - 2) % 3 === 0) {
      article = 'an';
    } else {
      article = number.startsWith('8') ? 'an' : 'a';
    }
  }
  return article;
};

/***/ }),

/***/ 202:
/***/ ((__unused_webpack_module, exports, __webpack_require__) => {

var _require = __webpack_require__(769),
  startsWithVowel = _require.startsWithVowel;
var irregulars = __webpack_require__(725);
var EXTRAS = /[\s'-]/;
var getFirst = function getFirst(word) {
  return word.split(EXTRAS)[0].toLowerCase();
};
var xor = function xor(a, b) {
  return (a || b) && !(a && b);
};

/**
 * Try some variations on the word to determine whether it's irregular.
 * Specifically, try trimming s, then es, then ed because those are common
 * forms of plurals and past tense verbs (which can be used like adjectives).
 */
var checkForIrregulars = function checkForIrregulars(part) {
  return [null, 's', 'es', 'ed'].reduce(function (memo, ending) {
    return memo || irregulars.check(part, ending);
  }, false);
};
exports.check = function () {
  return true;
};
exports.run = function (word, opts) {
  // Only check the first word. Also, if it's hyphenated, only
  // check the first part. Finally, if it's possessive, ignore
  // the possessive part.
  var first = getFirst(word);
  var isIrregular = checkForIrregulars(first);

  /**
  * If it starts with a vowel and isn't irregular: "an"
  * If it starts with a vowel and IS irregular: "a"
  * If it starts with a consonant and isn't irregular: "a"
  * If it starts with a consonant and IS irregular: "an"
  */
  var article = xor(startsWithVowel(word), isIrregular) ? 'an' : 'a';
  return article;
};

/***/ })

/******/ 	});
/************************************************************************/
/******/ 	// The module cache
/******/ 	var __webpack_module_cache__ = {};
/******/ 	
/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {
/******/ 		// Check if module is in cache
/******/ 		var cachedModule = __webpack_module_cache__[moduleId];
/******/ 		if (cachedModule !== undefined) {
/******/ 			return cachedModule.exports;
/******/ 		}
/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = __webpack_module_cache__[moduleId] = {
/******/ 			// no module.id needed
/******/ 			// no module.loaded needed
/******/ 			exports: {}
/******/ 		};
/******/ 	
/******/ 		// Execute the module function
/******/ 		__webpack_modules__[moduleId](module, module.exports, __webpack_require__);
/******/ 	
/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}
/******/ 	
/************************************************************************/
/******/ 	
/******/ 	// startup
/******/ 	// Load entry module and return exports
/******/ 	// This entry module is referenced by other modules so it can't be inlined
/******/ 	var __webpack_exports__ = __webpack_require__(393);
/******/ 	
/******/ 	return __webpack_exports__;
/******/ })()
;
});
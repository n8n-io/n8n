/**
 * The MIT License (MIT)
 * Copyright (c) 2017-present Dmitry Soshnikov <dmitry.soshnikov@gmail.com>
 */

'use strict';

module.exports = new Map([
// \ud83d\ude80 -> \u{1f680}
['charSurrogatePairToSingleUnicode', require('./char-surrogate-pair-to-single-unicode-transform')],

// \u0061 -> a
['charCodeToSimpleChar', require('./char-code-to-simple-char-transform')],

// /Aa/i -> /aa/i
['charCaseInsensitiveLowerCaseTransform', require('./char-case-insensitive-lowercase-transform')],

// [\d\d] -> [\d]
['charClassRemoveDuplicates', require('./char-class-remove-duplicates-transform')],

// a{1,2}a{2,3} -> a{3,5}
['quantifiersMerge', require('./quantifiers-merge-transform')],

// a{1,} -> a+, a{3,3} -> a{3}, a{1} -> a
['quantifierRangeToSymbol', require('./quantifier-range-to-symbol-transform')],

// [a-a] -> [a], [a-b] -> [ab]
['charClassClassrangesToChars', require('./char-class-classranges-to-chars-transform')],

// [0-9] -> [\d]
['charClassToMeta', require('./char-class-to-meta-transform')],

// [\d] -> \d, [^\w] -> \W
['charClassToSingleChar', require('./char-class-to-single-char-transform')],

// \e -> e
['charEscapeUnescape', require('./char-escape-unescape-transform')],

// [a-de-f] -> [a-f]
['charClassClassrangesMerge', require('./char-class-classranges-merge-transform')],

// (ab|ab) -> (ab)
['disjunctionRemoveDuplicates', require('./disjunction-remove-duplicates-transform')],

// (a|b|c) -> [abc]
['groupSingleCharsToCharClass', require('./group-single-chars-to-char-class')],

// (?:)a -> a
['removeEmptyGroup', require('./remove-empty-group-transform')],

// (?:a) -> a
['ungroup', require('./ungroup-transform')],

// abcabcabc -> (?:abc){3}
['combineRepeatingPatterns', require('./combine-repeating-patterns-transform')]]);
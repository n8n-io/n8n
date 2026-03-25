const { startsWithVowel } = require('../helpers');
const ACRONYM = /^[A-Z]+$/;
const IRREGULAR_ACRONYM = /^[UFHLMNRSX]/;

const isIrregularAcronym = word => IRREGULAR_ACRONYM.test(word.charAt(0));

/**
 * Both = a && b
 * Neither = !a && !b
 * In the case of Booleans, this means
 * either both true or both false, so
 * we can just compare the equality of
 * a and b.
 */
const bothOrNeither = (a, b) => a === b;

/**
 * If the entirety of the first word is capital letters
 * and case insensitivity is off, it's an acronym.
 */
exports.check = (word, { caseInsensitive }) => caseInsensitive ? false : ACRONYM.test(word.split(' ')[0]);

exports.run = (word) => {
  let isIrregular = isIrregularAcronym(word);
  let initialVowel = startsWithVowel(word);
  /*
   * If it starts with U: "a"
   * If it starts with any other vowel: "an"
   * If it starts with F, H, L, M, N, R, S, or X: "an"
   * If it starts with any other consonant: "a"
   */
  let article = bothOrNeither(initialVowel, isIrregular) ? 'a' : 'an';
  return article;
};


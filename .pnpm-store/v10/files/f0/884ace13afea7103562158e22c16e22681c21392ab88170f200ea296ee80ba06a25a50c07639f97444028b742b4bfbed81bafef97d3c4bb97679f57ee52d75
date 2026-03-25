const { startsWithVowel } = require('../helpers');
const irregulars = require('../irregular-words');
const EXTRAS = /[\s'-]/;

const getFirst = word => word.split(EXTRAS)[0].toLowerCase();

const xor = (a, b) => (a || b) && !(a && b);

/**
 * Try some variations on the word to determine whether it's irregular.
 * Specifically, try trimming s, then es, then ed because those are common
 * forms of plurals and past tense verbs (which can be used like adjectives).
 */
const checkForIrregulars = part => [ null, 's', 'es', 'ed' ].reduce((memo, ending) => memo || irregulars.check(part, ending), false);

exports.check = () => true;

exports.run = (word, opts) => {
  // Only check the first word. Also, if it's hyphenated, only
  // check the first part. Finally, if it's possessive, ignore
  // the possessive part.
  let first = getFirst(word);
  let isIrregular = checkForIrregulars(first);

  /**
  * If it starts with a vowel and isn't irregular: "an"
  * If it starts with a vowel and IS irregular: "a"
  * If it starts with a consonant and isn't irregular: "a"
  * If it starts with a consonant and IS irregular: "an"
  */
  let article = xor(startsWithVowel(word), isIrregular) ? 'an' : 'a';
  return article;
};

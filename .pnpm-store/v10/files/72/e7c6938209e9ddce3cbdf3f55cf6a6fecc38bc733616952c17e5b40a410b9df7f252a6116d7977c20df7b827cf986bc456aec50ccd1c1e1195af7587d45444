exports.check = (word, ending) => {
  if (ending) {
    // If the word ends in the ending, remove it.
    let regex = new RegExp(`${ending}$`);
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
  'ubiquity', 'udometer', 'ufo', 'uke', 'ukelele', 'ululate', 'unicorn', 'unicycle', 'uniform',
  'unify', 'union', 'unison', 'unit', 'unity', 'universe', 'university', 'upas', 'ural', 'uranium',
  'urea', 'ureter', 'urethra', 'urine', 'urologist', 'urology', 'urus', 'usage', 'use', 'user', 'usual', 'usurp',
  'usurper', 'usury', 'utensil', 'uterus', 'utility', 'utopia', 'utricle', 'uvarovite', 'uvea', 'uvula', 'utah',
  'utahn',

  // Adjectives: u like y
  'ubiquitous', 'ugandan', 'ukrainian', 'unanimous', 'unicameral', 'unified', 'unique', 'unisex',
  'universal', 'urinal', 'urological', 'useful', 'useless', 'usurious', 'utilitarian',
  'utopic',

  // Adverbs: u like y
  'ubiquitously', 'unanimously', 'unicamerally', 'uniquely', 'universally', 'urologically', 'usefully', 'uselessly', 'usuriously',

  // Nouns: y like i
  'yttria', 'yggdrasil', 'ylem', 'yperite', 'ytterbia', 'ytterbium', 'yttrium',

  // Adjectives: y like i
  'ytterbous', 'ytterbic', 'yttric',

  // Single letters
  'f', 'h', 'l', 'm', 'n', 'r', 's', 'u', 'x'
];

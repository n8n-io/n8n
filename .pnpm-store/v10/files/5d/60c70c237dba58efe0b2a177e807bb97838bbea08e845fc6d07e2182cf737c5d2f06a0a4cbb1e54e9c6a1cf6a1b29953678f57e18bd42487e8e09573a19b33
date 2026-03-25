'use strict';

const emoji_cleanup = require('../cleanup.cjs');
const emoji_convert = require('../convert.cjs');
const emoji_test_variations = require('../test/variations.cjs');
const emoji_regex_tree = require('./tree.cjs');
require('../data.cjs');
require('../format.cjs');
require('./base.cjs');
require('./numbers.cjs');
require('./similar.cjs');

function createOptimisedRegexForEmojiSequences(sequences) {
  sequences = sequences.map((item) => emoji_convert.convertEmojiSequenceToUTF32(item));
  const tree = emoji_regex_tree.createEmojisTree(sequences);
  const regex = emoji_regex_tree.parseEmojiTree(tree);
  return regex.regex;
}
function createOptimisedRegex(emojis) {
  let sequences = emojis.map(
    (item) => typeof item === "string" ? emoji_cleanup.getSequenceFromEmojiStringOrKeyword(item) : item
  );
  sequences = emoji_test_variations.getQualifiedEmojiVariations(
    sequences.map((sequence) => {
      return {
        sequence
      };
    })
  ).map((item) => item.sequence);
  return createOptimisedRegexForEmojiSequences(sequences);
}

exports.createOptimisedRegex = createOptimisedRegex;
exports.createOptimisedRegexForEmojiSequences = createOptimisedRegexForEmojiSequences;

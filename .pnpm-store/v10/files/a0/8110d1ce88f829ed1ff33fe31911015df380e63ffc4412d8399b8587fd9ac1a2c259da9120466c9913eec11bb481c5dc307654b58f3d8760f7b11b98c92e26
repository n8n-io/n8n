'use strict';

const emoji_cleanup = require('./cleanup.cjs');
const emoji_format = require('./format.cjs');
const emoji_regex_create = require('./regex/create.cjs');
const emoji_test_missing = require('./test/missing.cjs');
const emoji_test_parse = require('./test/parse.cjs');
const emoji_test_similar = require('./test/similar.cjs');
const emoji_test_tree = require('./test/tree.cjs');
const emoji_test_variations = require('./test/variations.cjs');
require('./convert.cjs');
require('./data.cjs');
require('./regex/tree.cjs');
require('./regex/base.cjs');
require('./regex/numbers.cjs');
require('./regex/similar.cjs');
require('./test/components.cjs');
require('./test/name.cjs');

function prepareEmojiForIconsList(icons, rawTestData) {
  const testData = rawTestData ? emoji_test_parse.parseEmojiTestFile(rawTestData) : void 0;
  let iconsList = [];
  for (const char in icons) {
    const sequence = emoji_cleanup.getEmojiSequenceFromString(char);
    iconsList.push({
      icon: icons[char],
      sequence
    });
  }
  iconsList = emoji_test_variations.getQualifiedEmojiVariations(iconsList);
  if (testData) {
    iconsList = iconsList.concat(
      emoji_test_missing.findMissingEmojis(
        iconsList,
        emoji_test_tree.getEmojiTestDataTree(emoji_test_similar.combineSimilarEmojiTestData(testData))
      )
    );
  }
  const preparedIcons = iconsList.map((item) => {
    const sequence = emoji_format.getEmojiSequenceKeyword(
      emoji_cleanup.getUnqualifiedEmojiSequence(item.sequence)
    );
    return {
      icon: item.icon,
      sequence
    };
  });
  const regex = emoji_regex_create.createOptimisedRegexForEmojiSequences(
    iconsList.map((item) => item.sequence)
  );
  return {
    regex,
    icons: preparedIcons
  };
}
function prepareEmojiForIconSet(iconSet, rawTestData) {
  return prepareEmojiForIconsList(iconSet.chars || {}, rawTestData);
}

exports.prepareEmojiForIconSet = prepareEmojiForIconSet;
exports.prepareEmojiForIconsList = prepareEmojiForIconsList;

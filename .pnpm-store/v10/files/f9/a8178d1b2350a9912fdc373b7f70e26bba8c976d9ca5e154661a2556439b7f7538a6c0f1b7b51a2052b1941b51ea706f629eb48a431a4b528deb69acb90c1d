import { getEmojiSequenceFromString, getUnqualifiedEmojiSequence } from './cleanup.mjs';
import { getEmojiSequenceKeyword } from './format.mjs';
import { createOptimisedRegexForEmojiSequences } from './regex/create.mjs';
import { findMissingEmojis } from './test/missing.mjs';
import { parseEmojiTestFile } from './test/parse.mjs';
import { combineSimilarEmojiTestData } from './test/similar.mjs';
import { getEmojiTestDataTree } from './test/tree.mjs';
import { getQualifiedEmojiVariations } from './test/variations.mjs';
import './convert.mjs';
import './data.mjs';
import './regex/tree.mjs';
import './regex/base.mjs';
import './regex/numbers.mjs';
import './regex/similar.mjs';
import './test/components.mjs';
import './test/name.mjs';

function prepareEmojiForIconsList(icons, rawTestData) {
  const testData = rawTestData ? parseEmojiTestFile(rawTestData) : void 0;
  let iconsList = [];
  for (const char in icons) {
    const sequence = getEmojiSequenceFromString(char);
    iconsList.push({
      icon: icons[char],
      sequence
    });
  }
  iconsList = getQualifiedEmojiVariations(iconsList);
  if (testData) {
    iconsList = iconsList.concat(
      findMissingEmojis(
        iconsList,
        getEmojiTestDataTree(combineSimilarEmojiTestData(testData))
      )
    );
  }
  const preparedIcons = iconsList.map((item) => {
    const sequence = getEmojiSequenceKeyword(
      getUnqualifiedEmojiSequence(item.sequence)
    );
    return {
      icon: item.icon,
      sequence
    };
  });
  const regex = createOptimisedRegexForEmojiSequences(
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

export { prepareEmojiForIconSet, prepareEmojiForIconsList };

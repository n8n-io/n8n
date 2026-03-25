'use strict';

const emoji_data = require('../data.cjs');
const emoji_test_components = require('./components.cjs');
const emoji_test_name = require('./name.cjs');
require('../format.cjs');
require('../convert.cjs');

function findComponentsInEmojiTestItem(item, componentsData) {
  const name = emoji_test_name.splitEmojiNameVariations(
    item.name,
    item.sequence,
    componentsData
  );
  const sequence = [...item.sequence];
  name.variations?.forEach((item2) => {
    if (typeof item2 !== "string") {
      sequence[item2.index] = item2.type;
    }
  });
  const sequenceKey = emoji_test_components.emojiSequenceWithComponentsToString(
    sequence.filter((code) => code !== emoji_data.vs16Emoji)
  );
  return {
    ...item,
    name,
    sequenceKey,
    sequence
  };
}
function combineSimilarEmojiTestData(data, componentsData) {
  const results = /* @__PURE__ */ Object.create(null);
  componentsData = componentsData || emoji_test_components.mapEmojiTestDataComponents(data);
  for (const key in data) {
    const sourceItem = data[key];
    if (sourceItem.status !== "component") {
      const item = findComponentsInEmojiTestItem(
        sourceItem,
        componentsData
      );
      results[item.sequenceKey] = item;
    }
  }
  return results;
}

exports.combineSimilarEmojiTestData = combineSimilarEmojiTestData;
exports.findComponentsInEmojiTestItem = findComponentsInEmojiTestItem;

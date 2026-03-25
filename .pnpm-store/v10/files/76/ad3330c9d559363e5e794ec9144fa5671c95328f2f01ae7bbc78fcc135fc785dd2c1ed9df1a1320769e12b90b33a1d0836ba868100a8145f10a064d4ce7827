'use strict';

const emoji_data = require('../data.cjs');
const emoji_format = require('../format.cjs');
require('../convert.cjs');

function mapEmojiTestDataComponents(testSequences) {
  const results = {
    converted: /* @__PURE__ */ new Map(),
    items: /* @__PURE__ */ new Map(),
    names: /* @__PURE__ */ new Map(),
    types: {},
    keywords: {}
  };
  for (const key in emoji_data.emojiComponents) {
    const type = key;
    const range = emoji_data.emojiComponents[type];
    for (let number = range[0]; number < range[1]; number++) {
      const keyword = emoji_format.getEmojiSequenceKeyword([number]);
      const item = testSequences[keyword];
      if (!item) {
        throw new Error(
          `Missing emoji component in test sequence: "${keyword}"`
        );
      }
      results.converted.set(number, keyword);
      results.items.set(number, item);
      results.items.set(keyword, item);
      const name = item.name;
      results.names.set(number, name);
      results.names.set(keyword, name);
      results.types[name] = type;
      results.keywords[name] = keyword;
    }
  }
  return results;
}
function emojiSequenceWithComponentsToString(sequence) {
  return sequence.map((item) => typeof item === "number" ? item.toString(16) : item).join("-");
}
function findEmojiComponentsInSequence(sequence) {
  const components = [];
  for (let index = 0; index < sequence.length; index++) {
    const code = sequence[index];
    for (const key in emoji_data.emojiComponents) {
      const type = key;
      const range = emoji_data.emojiComponents[type];
      if (code >= range[0] && code < range[1]) {
        components.push({
          index,
          type
        });
        break;
      }
    }
  }
  return components;
}
function replaceEmojiComponentsInCombinedSequence(sequence, values) {
  const indexes = {
    "hair-style": 0,
    "skin-tone": 0
  };
  return sequence.map((item) => {
    if (typeof item === "number") {
      return item;
    }
    const index = indexes[item]++;
    const list = values[item];
    if (!list || !list.length) {
      throw new Error(`Cannot replace ${item}: no valid values provided`);
    }
    return list[index >= list.length ? list.length - 1 : index];
  });
}

exports.emojiSequenceWithComponentsToString = emojiSequenceWithComponentsToString;
exports.findEmojiComponentsInSequence = findEmojiComponentsInSequence;
exports.mapEmojiTestDataComponents = mapEmojiTestDataComponents;
exports.replaceEmojiComponentsInCombinedSequence = replaceEmojiComponentsInCombinedSequence;

'use strict';

const emoji_data = require('../data.cjs');

const nameSplit = ": ";
const variationSplit = ", ";
const ignoredVariations = /* @__PURE__ */ new Set(["person"]);
function splitEmojiNameVariations(name, sequence, componentsData) {
  const parts = name.split(nameSplit);
  const base = parts.shift();
  if (!parts.length) {
    return {
      base,
      key: base
    };
  }
  const baseVariations = parts.join(nameSplit).split(variationSplit).filter((text) => {
    const type = componentsData.types[text];
    if (!type) {
      return !ignoredVariations.has(text);
    }
    return false;
  });
  const key = base + (baseVariations.length ? nameSplit + baseVariations.join(variationSplit) : "");
  const result = {
    base,
    key
  };
  let components = 0;
  const variations = [
    ...baseVariations
  ];
  for (let index = 0; index < sequence.length; index++) {
    const num = sequence[index];
    for (const key2 in emoji_data.emojiComponents) {
      const type = key2;
      const range = emoji_data.emojiComponents[type];
      if (num >= range[0] && num < range[1]) {
        variations.push({
          index,
          type
        });
        components++;
      }
    }
  }
  if (variations.length) {
    result.variations = variations;
  }
  if (components) {
    result.components = components;
  }
  return result;
}

exports.splitEmojiNameVariations = splitEmojiNameVariations;

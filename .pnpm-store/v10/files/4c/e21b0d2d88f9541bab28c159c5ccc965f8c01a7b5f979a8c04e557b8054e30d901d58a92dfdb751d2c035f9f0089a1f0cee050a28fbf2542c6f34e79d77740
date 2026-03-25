'use strict';

const emoji_cleanup = require('../cleanup.cjs');
const emoji_convert = require('../convert.cjs');
const emoji_data = require('../data.cjs');
const emoji_format = require('../format.cjs');

function guessQualifiedEmojiSequence(sequence) {
  const split = emoji_cleanup.splitEmojiSequences(sequence).map((part) => {
    if (part.indexOf(emoji_data.vs16Emoji) !== -1) {
      return part;
    }
    if (part.length === 2) {
      const lastNum = part[1];
      if (lastNum === emoji_data.keycapEmoji) {
        return [part[0], emoji_data.vs16Emoji, lastNum];
      }
      for (const key in emoji_data.emojiComponents) {
        const range = emoji_data.emojiComponents[key];
        if (lastNum >= range[0] && lastNum < range[1]) {
          return [part[0], emoji_data.vs16Emoji, lastNum];
        }
      }
    }
    return part.length === 1 ? [part[0], emoji_data.vs16Emoji] : part;
  });
  return emoji_cleanup.joinEmojiSequences(split);
}
function getQualifiedEmojiVariation(item) {
  const unqualifiedSequence = emoji_cleanup.getUnqualifiedEmojiSequence(
    emoji_convert.convertEmojiSequenceToUTF32(item.sequence)
  );
  const result = {
    ...item,
    sequence: guessQualifiedEmojiSequence(unqualifiedSequence)
  };
  if (result.sequenceKey) {
    result.sequenceKey = emoji_format.getEmojiSequenceKeyword(unqualifiedSequence);
  }
  return result;
}
function getQualifiedEmojiVariations(items) {
  const results = /* @__PURE__ */ Object.create(null);
  for (let i = 0; i < items.length; i++) {
    const result = getQualifiedEmojiVariation(items[i]);
    const key = emoji_format.getEmojiSequenceKeyword(
      emoji_cleanup.getUnqualifiedEmojiSequence(result.sequence)
    );
    if (!results[key] || results[key].sequence.length < result.sequence.length) {
      results[key] = result;
    }
  }
  return Object.values(results);
}

exports.getQualifiedEmojiVariation = getQualifiedEmojiVariation;
exports.getQualifiedEmojiVariations = getQualifiedEmojiVariations;
exports.guessQualifiedEmojiSequence = guessQualifiedEmojiSequence;

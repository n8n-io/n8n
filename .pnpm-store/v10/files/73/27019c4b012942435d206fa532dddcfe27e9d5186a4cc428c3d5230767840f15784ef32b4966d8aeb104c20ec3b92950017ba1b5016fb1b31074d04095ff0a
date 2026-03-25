import { splitEmojiSequences, joinEmojiSequences, getUnqualifiedEmojiSequence } from '../cleanup.mjs';
import { convertEmojiSequenceToUTF32 } from '../convert.mjs';
import { vs16Emoji, keycapEmoji, emojiComponents } from '../data.mjs';
import { getEmojiSequenceKeyword } from '../format.mjs';

function guessQualifiedEmojiSequence(sequence) {
  const split = splitEmojiSequences(sequence).map((part) => {
    if (part.indexOf(vs16Emoji) !== -1) {
      return part;
    }
    if (part.length === 2) {
      const lastNum = part[1];
      if (lastNum === keycapEmoji) {
        return [part[0], vs16Emoji, lastNum];
      }
      for (const key in emojiComponents) {
        const range = emojiComponents[key];
        if (lastNum >= range[0] && lastNum < range[1]) {
          return [part[0], vs16Emoji, lastNum];
        }
      }
    }
    return part.length === 1 ? [part[0], vs16Emoji] : part;
  });
  return joinEmojiSequences(split);
}
function getQualifiedEmojiVariation(item) {
  const unqualifiedSequence = getUnqualifiedEmojiSequence(
    convertEmojiSequenceToUTF32(item.sequence)
  );
  const result = {
    ...item,
    sequence: guessQualifiedEmojiSequence(unqualifiedSequence)
  };
  if (result.sequenceKey) {
    result.sequenceKey = getEmojiSequenceKeyword(unqualifiedSequence);
  }
  return result;
}
function getQualifiedEmojiVariations(items) {
  const results = /* @__PURE__ */ Object.create(null);
  for (let i = 0; i < items.length; i++) {
    const result = getQualifiedEmojiVariation(items[i]);
    const key = getEmojiSequenceKeyword(
      getUnqualifiedEmojiSequence(result.sequence)
    );
    if (!results[key] || results[key].sequence.length < result.sequence.length) {
      results[key] = result;
    }
  }
  return Object.values(results);
}

export { getQualifiedEmojiVariation, getQualifiedEmojiVariations, guessQualifiedEmojiSequence };

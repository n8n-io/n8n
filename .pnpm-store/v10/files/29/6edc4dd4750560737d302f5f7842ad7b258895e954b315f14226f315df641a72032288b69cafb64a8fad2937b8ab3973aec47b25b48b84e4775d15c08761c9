'use strict';

const emoji_convert = require('./convert.cjs');
const emoji_data = require('./data.cjs');

function getEmojiSequenceFromString(value) {
  return value.trim().split(/[^0-9A-F]+/i).filter((item) => item.length > 0).map(emoji_convert.getEmojiCodePoint);
}
function getSequenceFromEmojiStringOrKeyword(value) {
  if (!value.match(/^[0-9a-fA-F-\s]+$/)) {
    const results = [];
    for (const codePoint of value) {
      const code = codePoint.codePointAt(0);
      if (code) {
        results.push(code);
      } else {
        return getEmojiSequenceFromString(value);
      }
    }
    return results;
  }
  return getEmojiSequenceFromString(value);
}
function splitEmojiSequences(sequence, separator = emoji_data.joinerEmoji) {
  const results = [];
  let queue = [];
  for (let i = 0; i < sequence.length; i++) {
    const code = sequence[i];
    if (code === separator) {
      results.push(queue);
      queue = [];
    } else {
      queue.push(code);
    }
  }
  results.push(queue);
  return results;
}
function joinEmojiSequences(sequences, separator = emoji_data.joinerEmoji) {
  let results = [];
  for (let i = 0; i < sequences.length; i++) {
    if (i > 0) {
      results.push(separator);
    }
    results = results.concat(sequences[i]);
  }
  return results;
}
function getUnqualifiedEmojiSequence(sequence) {
  return sequence.filter((num) => num !== emoji_data.vs16Emoji);
}

exports.getEmojiSequenceFromString = getEmojiSequenceFromString;
exports.getSequenceFromEmojiStringOrKeyword = getSequenceFromEmojiStringOrKeyword;
exports.getUnqualifiedEmojiSequence = getUnqualifiedEmojiSequence;
exports.joinEmojiSequences = joinEmojiSequences;
exports.splitEmojiSequences = splitEmojiSequences;

'use strict';

const emoji_replace_find = require('./find.cjs');
require('../convert.cjs');
require('../data.cjs');
require('../format.cjs');

function findAndReplaceEmojisInText(regexp, content, callback) {
  const matches = emoji_replace_find.getEmojiMatchesInText(regexp, content);
  if (!matches.length) {
    return null;
  }
  const sortedMatches = emoji_replace_find.sortEmojiMatchesInText(content, matches);
  let result = "";
  let replaced = false;
  for (let i = 0; i < sortedMatches.length; i++) {
    const item = sortedMatches[i];
    result += item.prev;
    const replacement = callback(
      {
        ...item.match
      },
      result
    );
    if (replacement === void 0) {
      result += item.match.match;
    } else {
      result += replacement;
      replaced = true;
    }
  }
  result += sortedMatches[sortedMatches.length - 1].next;
  return replaced ? result : null;
}

exports.findAndReplaceEmojisInText = findAndReplaceEmojisInText;

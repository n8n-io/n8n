import { getEmojiMatchesInText, sortEmojiMatchesInText } from './find.mjs';
import '../convert.mjs';
import '../data.mjs';
import '../format.mjs';

function findAndReplaceEmojisInText(regexp, content, callback) {
  const matches = getEmojiMatchesInText(regexp, content);
  if (!matches.length) {
    return null;
  }
  const sortedMatches = sortEmojiMatchesInText(content, matches);
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

export { findAndReplaceEmojisInText };

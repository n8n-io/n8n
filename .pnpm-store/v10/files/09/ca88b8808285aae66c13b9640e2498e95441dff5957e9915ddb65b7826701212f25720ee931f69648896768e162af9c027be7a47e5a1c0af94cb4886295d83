import { convertEmojiSequenceToUTF32 } from '../convert.mjs';
import { vs16Emoji } from '../data.mjs';
import { getEmojiSequenceKeyword } from '../format.mjs';

function createEmojiRegExp(regexp) {
  return new RegExp(regexp, "g");
}
function getEmojiMatchesInText(regexp, content) {
  const results = [];
  const found = /* @__PURE__ */ new Set();
  (regexp instanceof Array ? regexp : [regexp]).forEach((regexp2, index) => {
    const matches = content.match(
      typeof regexp2 === "string" ? createEmojiRegExp(regexp2) : regexp2
    );
    if (matches) {
      for (let i = 0; i < matches.length; i++) {
        const match = matches[i];
        if (found.has(match)) {
          continue;
        }
        found.add(match);
        const sequence = [];
        for (const codePoint of match) {
          const num = codePoint.codePointAt(0);
          if (num !== vs16Emoji) {
            sequence.push(num);
          }
        }
        results.push({
          match,
          sequence,
          keyword: getEmojiSequenceKeyword(
            convertEmojiSequenceToUTF32(sequence)
          ),
          regexp: index
        });
      }
    }
  });
  results.sort((a, b) => {
    const match1 = a.match;
    const match2 = b.match;
    if (match2.length === match1.length) {
      return match1.localeCompare(match2);
    }
    return match2.length - match1.length;
  });
  return results;
}
function sortEmojiMatchesInText(content, matches) {
  const ranges = [];
  const check = (start, end) => {
    for (let i = 0; i < ranges.length; i++) {
      if (start < ranges[i].end && end > ranges[i].start) {
        return false;
      }
    }
    return true;
  };
  for (let i = 0; i < matches.length; i++) {
    const match = matches[i];
    const search = match.match;
    let startFrom = 0;
    let start;
    while ((start = content.indexOf(search, startFrom)) !== -1) {
      const end = start + search.length;
      startFrom = end;
      if (check(start, end)) {
        ranges.push({
          start,
          end,
          match
        });
      }
    }
  }
  ranges.sort((a, b) => a.start - b.start);
  const list = [];
  let prevRange;
  let lastEnd;
  for (let i = 0; i < ranges.length; i++) {
    const range = ranges[i];
    const prev = content.slice(prevRange ? prevRange.end : 0, range.start);
    list.push({
      match: range.match,
      prev
    });
    prevRange = range;
    lastEnd = range.end;
  }
  if (!lastEnd) {
    return [];
  }
  const replacements = list.map((item, index) => {
    const nextItem = list[index + 1];
    return {
      ...item,
      next: nextItem ? nextItem.prev : content.slice(lastEnd)
    };
  });
  return replacements;
}

export { createEmojiRegExp, getEmojiMatchesInText, sortEmojiMatchesInText };

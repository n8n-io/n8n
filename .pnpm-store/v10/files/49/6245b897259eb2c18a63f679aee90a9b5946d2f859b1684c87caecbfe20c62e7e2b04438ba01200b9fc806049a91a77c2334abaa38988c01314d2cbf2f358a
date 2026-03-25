import { createUTF16EmojiRegexItem, createOptionalEmojiRegexItem, createSequenceEmojiRegexItem, createSetEmojiRegexItem } from './base.mjs';
import { splitEmojiSequences } from '../cleanup.mjs';
import { convertEmojiSequenceToUTF32 } from '../convert.mjs';
import { createRegexForNumbersSequence } from './numbers.mjs';
import { joinerEmoji } from '../data.mjs';
import { mergeSimilarItemsInSet } from './similar.mjs';

function createEmojisTree(sequences) {
  const root = [];
  for (let i = 0; i < sequences.length; i++) {
    const split = splitEmojiSequences(
      convertEmojiSequenceToUTF32(sequences[i])
    );
    let parent = root;
    for (let j = 0; j < split.length; j++) {
      const regex = createRegexForNumbersSequence(split[j]);
      let item;
      const match = parent.find(
        (item2) => item2.regex.regex === regex.regex
      );
      if (!match) {
        item = {
          regex
        };
        parent.push(item);
      } else {
        item = match;
      }
      if (j === split.length - 1) {
        item.end = true;
        break;
      }
      parent = item.children || (item.children = []);
    }
  }
  return root;
}
function parseEmojiTree(items) {
  function mergeParsedChildren(items2) {
    const parsedItems = [];
    const mapWithoutEnd = /* @__PURE__ */ Object.create(null);
    const mapWithEnd = /* @__PURE__ */ Object.create(null);
    for (let i = 0; i < items2.length; i++) {
      const item = items2[i];
      const children = item.children;
      if (children) {
        const fullItem = item;
        const target = item.end ? mapWithEnd : mapWithoutEnd;
        const regex = children.regex;
        if (!target[regex]) {
          target[regex] = [fullItem];
        } else {
          target[regex].push(fullItem);
        }
      } else {
        parsedItems.push(item.regex);
      }
    }
    [mapWithEnd, mapWithoutEnd].forEach((source) => {
      for (const regex in source) {
        const items3 = source[regex];
        const firstItem = items3[0];
        let childSequence = [
          createUTF16EmojiRegexItem([joinerEmoji]),
          firstItem.children
        ];
        if (firstItem.end) {
          childSequence = [
            createOptionalEmojiRegexItem(
              createSequenceEmojiRegexItem(childSequence)
            )
          ];
        }
        let mergedRegex;
        if (items3.length === 1) {
          mergedRegex = firstItem.regex;
        } else {
          mergedRegex = mergeSimilarItemsInSet(
            createSetEmojiRegexItem(items3.map((item) => item.regex))
          );
        }
        const sequence = createSequenceEmojiRegexItem([
          mergedRegex,
          ...childSequence
        ]);
        parsedItems.push(sequence);
      }
    });
    if (parsedItems.length === 1) {
      return parsedItems[0];
    }
    const set = createSetEmojiRegexItem(parsedItems);
    const result = mergeSimilarItemsInSet(set);
    return result;
  }
  function parseItemChildren(item) {
    const result = {
      regex: item.regex,
      end: !!item.end
    };
    const children = item.children;
    if (!children) {
      return result;
    }
    const parsedChildren = children.map(parseItemChildren);
    result.children = mergeParsedChildren(parsedChildren);
    return result;
  }
  const parsed = items.map(parseItemChildren);
  return mergeParsedChildren(parsed);
}

export { createEmojisTree, parseEmojiTree };

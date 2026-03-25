import { getUnqualifiedEmojiSequence } from '../cleanup.mjs';
import { emojiComponents } from '../data.mjs';
import { getEmojiSequenceKeyword } from '../format.mjs';
import { replaceEmojiComponentsInCombinedSequence } from './components.mjs';
import '../convert.mjs';

function findMissingEmojis(sequences, testDataTree) {
  const results = [];
  const existingItems = /* @__PURE__ */ Object.create(null);
  const copiedItems = /* @__PURE__ */ Object.create(null);
  sequences.forEach((item) => {
    const sequence = getUnqualifiedEmojiSequence(item.sequence);
    const key = getEmojiSequenceKeyword(sequence);
    if (!existingItems[key] || // If multiple matches for same sequence exist, use longest version
    existingItems[key].sequence.length < item.sequence.length) {
      existingItems[key] = item;
    }
  });
  const iterate = (type, parentTree, parentValues, parentItem, deep) => {
    const childTree = parentTree.children?.[type];
    if (!childTree) {
      return;
    }
    const range = emojiComponents[type];
    for (let number = range[0]; number < range[1]; number++) {
      const values = {
        "hair-style": [...parentValues["hair-style"]],
        "skin-tone": [...parentValues["skin-tone"]]
      };
      values[type].push(number);
      const sequence = replaceEmojiComponentsInCombinedSequence(
        childTree.item.sequence,
        values
      );
      const key = getEmojiSequenceKeyword(
        getUnqualifiedEmojiSequence(sequence)
      );
      const oldItem = existingItems[key];
      let item;
      if (oldItem) {
        item = oldItem;
      } else {
        item = copiedItems[key];
        if (!item) {
          item = {
            ...parentItem,
            sequence
          };
          if (item.sequenceKey) {
            item.sequenceKey = key;
          }
          copiedItems[key] = item;
          results.push(item);
        }
      }
      if (deep || oldItem) {
        for (const key2 in values) {
          iterate(
            key2,
            childTree,
            values,
            item,
            deep
          );
        }
      }
    }
  };
  const parse = (key, deep) => {
    const treeItem = testDataTree[key];
    const sequenceKey = treeItem.item.sequenceKey;
    const rootItem = existingItems[sequenceKey];
    if (!rootItem) {
      return;
    }
    const values = {
      "skin-tone": [],
      "hair-style": []
    };
    for (const key2 in values) {
      iterate(
        key2,
        treeItem,
        values,
        rootItem,
        deep
      );
    }
  };
  for (const key in testDataTree) {
    parse(key, false);
    parse(key, true);
  }
  return results;
}

export { findMissingEmojis };

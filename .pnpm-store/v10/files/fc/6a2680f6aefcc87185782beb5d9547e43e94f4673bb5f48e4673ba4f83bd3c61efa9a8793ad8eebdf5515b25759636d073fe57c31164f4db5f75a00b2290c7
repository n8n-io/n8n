'use strict';

const emoji_regex_base = require('./base.cjs');
const emoji_regex_numbers = require('./numbers.cjs');
require('../convert.cjs');
require('../data.cjs');

function findSimilarRegexItemSequences(items) {
  const startRegex = /* @__PURE__ */ Object.create(null);
  const endRegex = /* @__PURE__ */ Object.create(null);
  const addMapItem = (target, index, regex, slice) => {
    if (!target[regex]) {
      target[regex] = {
        // Start with 0. One item will remain after replacement
        score: 0,
        slices: [
          {
            index,
            slice
          }
        ]
      };
      return;
    }
    const item = target[regex];
    item.score += regex.length;
    item.slices.push({
      index,
      slice
    });
  };
  for (let index = 0; index < items.length; index++) {
    const baseItem = items[index];
    switch (baseItem.type) {
      case "optional":
      case "utf16": {
        addMapItem(startRegex, index, baseItem.regex, "full");
        addMapItem(endRegex, index, baseItem.regex, "full");
        break;
      }
      case "sequence": {
        addMapItem(startRegex, index, baseItem.regex, "full");
        addMapItem(endRegex, index, baseItem.regex, "full");
        const sequence = baseItem.items;
        for (let i = 1; i < sequence.length; i++) {
          const startSequence = emoji_regex_base.createSequenceEmojiRegexItem(
            sequence.slice(0, i)
          );
          addMapItem(startRegex, index, startSequence.regex, i);
          const endSequence = emoji_regex_base.createSequenceEmojiRegexItem(
            sequence.slice(i)
          );
          addMapItem(endRegex, index, endSequence.regex, i);
        }
        break;
      }
      case "set":
        throw new Error("Unexpected set within a set");
    }
  }
  let result;
  const checkResults = (target, type) => {
    for (const regex in target) {
      const item = target[regex];
      if (!item.score) {
        continue;
      }
      if (!result || result.score < item.score) {
        result = {
          score: item.score,
          sequences: [
            {
              type,
              slices: item.slices
            }
          ]
        };
        continue;
      }
      if (result.score === item.score) {
        result.sequences.push({
          type,
          slices: item.slices
        });
      }
    }
  };
  checkResults(startRegex, "start");
  checkResults(endRegex, "end");
  return result;
}
function mergeSimilarRegexItemSequences(items, merge, optimise) {
  const { type, slices } = merge;
  const indexes = /* @__PURE__ */ new Set();
  let hasFullSequence = false;
  let longestMatch = 0;
  let longestMatchIndex = -1;
  const differentSequences = [];
  for (let i = 0; i < slices.length; i++) {
    const { index, slice } = slices[i];
    const item = items[index];
    let length;
    if (slice === "full") {
      hasFullSequence = true;
      if (item.type === "sequence") {
        length = item.items.length;
      } else {
        length = 1;
      }
    } else {
      if (item.type !== "sequence") {
        throw new Error(
          `Unexpected partial match for type "${item.type}"`
        );
      }
      length = type === "start" ? slice : item.items.length - slice;
      differentSequences.push(
        type === "start" ? item.items.slice(slice) : item.items.slice(0, slice)
      );
    }
    if (length > longestMatch) {
      longestMatchIndex = index;
      longestMatch = length;
    }
    indexes.add(index);
  }
  if (longestMatch < 1 || longestMatchIndex < 0) {
    throw new Error("Cannot find common sequence");
  }
  const commonItem = items[longestMatchIndex];
  let sequence;
  if (commonItem.type !== "sequence") {
    if (longestMatch !== 1) {
      throw new Error(
        "Something went wrong. Cannot have long match in non-sequence"
      );
    }
    sequence = [commonItem];
  } else {
    sequence = type === "start" ? commonItem.items.slice(0, longestMatch) : commonItem.items.slice(
      commonItem.items.length - longestMatch
    );
  }
  const setItems = [];
  for (let i = 0; i < differentSequences.length; i++) {
    const list = differentSequences[i];
    if (list.length === 1) {
      setItems.push(list[0]);
    } else {
      setItems.push(emoji_regex_base.createSequenceEmojiRegexItem(list));
    }
  }
  const set = emoji_regex_base.createSetEmojiRegexItem(setItems);
  let mergedChunk = set.sets.length === 1 ? (
    // Do not run callback if only 1 item
    set.sets[0]
  ) : optimise ? (
    // Run callback to optimise it
    optimise(set)
  ) : (
    // Use set as is
    set
  );
  if (hasFullSequence) {
    mergedChunk = emoji_regex_base.createOptionalEmojiRegexItem(mergedChunk);
  }
  sequence[type === "start" ? "push" : "unshift"](mergedChunk);
  const results = [
    emoji_regex_base.createSequenceEmojiRegexItem(sequence),
    ...items.filter((item, index) => !indexes.has(index))
  ];
  return results;
}
function mergeSimilarItemsInSet(set) {
  const updatedSet = emoji_regex_numbers.optimiseNumbersSet(set);
  if (updatedSet.type !== "set") {
    return updatedSet;
  }
  set = updatedSet;
  let merges;
  while (merges = findSimilarRegexItemSequences(set.sets)) {
    const sequences = merges.sequences;
    if (sequences.length === 1) {
      const merged = mergeSimilarRegexItemSequences(
        set.sets.map((item) => emoji_regex_base.cloneEmojiRegexItem(item, true)),
        sequences[0],
        mergeSimilarItemsInSet
      );
      if (merged.length === 1) {
        return merged[0];
      }
      set = emoji_regex_base.createSetEmojiRegexItem(merged);
      continue;
    }
    let newItem;
    for (let i = 0; i < sequences.length; i++) {
      const merged = mergeSimilarRegexItemSequences(
        set.sets.map((item) => emoji_regex_base.cloneEmojiRegexItem(item, true)),
        sequences[i],
        mergeSimilarItemsInSet
      );
      const mergedItem = merged.length === 1 ? merged[0] : emoji_regex_base.createSetEmojiRegexItem(merged);
      if (!newItem || mergedItem.regex.length < newItem.regex.length) {
        newItem = mergedItem;
      }
    }
    if (!newItem) {
      throw new Error("Empty sequences list");
    }
    if (newItem.type !== "set") {
      return newItem;
    }
    set = newItem;
  }
  return set;
}

exports.findSimilarRegexItemSequences = findSimilarRegexItemSequences;
exports.mergeSimilarItemsInSet = mergeSimilarItemsInSet;
exports.mergeSimilarRegexItemSequences = mergeSimilarRegexItemSequences;

import { splitUTF32Number } from '../convert.mjs';
import { createUTF16EmojiRegexItem, createSequenceEmojiRegexItem, createSetEmojiRegexItem, createOptionalEmojiRegexItem } from './base.mjs';
import { vs16Emoji } from '../data.mjs';

function createEmojiRegexItemForNumbers(numbers) {
  const utf32 = [];
  const utf16 = [];
  numbers.sort((a, b) => a - b);
  let lastNumber;
  for (let i = 0; i < numbers.length; i++) {
    const number = numbers[i];
    if (number === lastNumber) {
      continue;
    }
    lastNumber = number;
    const split = splitUTF32Number(number);
    if (!split) {
      utf16.push(number);
      continue;
    }
    const [first, second] = split;
    const item = utf32.find((item2) => item2.first === first);
    if (item) {
      item.second.push(second);
      item.numbers.push(number);
    } else {
      utf32.push({
        first,
        second: [second],
        numbers: [number]
      });
    }
  }
  const results = [];
  if (utf16.length) {
    results.push(createUTF16EmojiRegexItem(utf16));
  }
  if (utf32.length) {
    const utf32Set = [];
    for (let i = 0; i < utf32.length; i++) {
      const item = utf32[i];
      const secondRegex = createUTF16EmojiRegexItem(item.second);
      const listItem = utf32Set.find(
        (item2) => item2.second.regex === secondRegex.regex
      );
      if (listItem) {
        listItem.first.push(item.first);
        listItem.numbers = [...listItem.numbers, ...item.numbers];
      } else {
        utf32Set.push({
          second: secondRegex,
          first: [item.first],
          numbers: [...item.numbers]
        });
      }
    }
    for (let i = 0; i < utf32Set.length; i++) {
      const item = utf32Set[i];
      const firstRegex = createUTF16EmojiRegexItem(item.first);
      const secondRegex = item.second;
      results.push(
        createSequenceEmojiRegexItem(
          [firstRegex, secondRegex],
          item.numbers
        )
      );
    }
  }
  return results.length === 1 ? results[0] : createSetEmojiRegexItem(results);
}
function createRegexForNumbersSequence(numbers, optionalVariations = true) {
  const items = [];
  for (let i = 0; i < numbers.length; i++) {
    const num = numbers[i];
    const split = splitUTF32Number(num);
    if (!split) {
      const item = createUTF16EmojiRegexItem([num]);
      if (optionalVariations && num === vs16Emoji) {
        items.push(createOptionalEmojiRegexItem(item));
      } else {
        items.push(item);
      }
    } else {
      items.push(createUTF16EmojiRegexItem([split[0]]));
      items.push(createUTF16EmojiRegexItem([split[1]]));
    }
  }
  if (items.length === 1) {
    return items[0];
  }
  const result = createSequenceEmojiRegexItem(items);
  if (numbers.length === 1 && items[0].type === "utf16") {
    result.numbers = [...numbers];
  }
  return result;
}
function optimiseNumbersSet(set) {
  const mandatoryMatches = {
    numbers: [],
    items: []
  };
  const optionalMatches = {
    numbers: [],
    items: []
  };
  const filteredItems = set.sets.filter((item) => {
    if (item.type === "optional") {
      const parentItem = item.item;
      if (parentItem.numbers) {
        optionalMatches.items.push(item);
        optionalMatches.numbers = optionalMatches.numbers.concat(
          parentItem.numbers
        );
        return false;
      }
      return true;
    }
    if (item.numbers) {
      mandatoryMatches.items.push(item);
      mandatoryMatches.numbers = mandatoryMatches.numbers.concat(
        item.numbers
      );
      return false;
    }
    return true;
  });
  if (mandatoryMatches.items.length + optionalMatches.items.length < 2) {
    return set;
  }
  const optionalNumbers = new Set(optionalMatches.numbers);
  let foundMatches = false;
  mandatoryMatches.numbers = mandatoryMatches.numbers.filter((number) => {
    if (optionalNumbers.has(number)) {
      foundMatches = true;
      return false;
    }
    return true;
  });
  if (mandatoryMatches.items.length) {
    if (!foundMatches && mandatoryMatches.items.length === 1) {
      filteredItems.push(mandatoryMatches.items[0]);
    } else if (mandatoryMatches.numbers.length) {
      filteredItems.push(
        createEmojiRegexItemForNumbers(mandatoryMatches.numbers)
      );
    }
  }
  switch (optionalMatches.items.length) {
    case 0:
      break;
    case 1:
      filteredItems.push(optionalMatches.items[0]);
      break;
    default:
      filteredItems.push(
        createOptionalEmojiRegexItem(
          createEmojiRegexItemForNumbers(optionalMatches.numbers)
        )
      );
  }
  return filteredItems.length === 1 ? filteredItems[0] : createSetEmojiRegexItem(filteredItems);
}

export { createEmojiRegexItemForNumbers, createRegexForNumbersSequence, optimiseNumbersSet };

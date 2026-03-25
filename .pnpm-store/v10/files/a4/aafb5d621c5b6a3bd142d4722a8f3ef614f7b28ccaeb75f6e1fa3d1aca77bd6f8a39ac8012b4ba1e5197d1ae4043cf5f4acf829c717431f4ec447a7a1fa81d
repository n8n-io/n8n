import { vs16Emoji } from '../data.mjs';
import { emojiSequenceWithComponentsToString, mapEmojiTestDataComponents } from './components.mjs';
import { splitEmojiNameVariations } from './name.mjs';
import '../format.mjs';
import '../convert.mjs';

function findComponentsInEmojiTestItem(item, componentsData) {
  const name = splitEmojiNameVariations(
    item.name,
    item.sequence,
    componentsData
  );
  const sequence = [...item.sequence];
  name.variations?.forEach((item2) => {
    if (typeof item2 !== "string") {
      sequence[item2.index] = item2.type;
    }
  });
  const sequenceKey = emojiSequenceWithComponentsToString(
    sequence.filter((code) => code !== vs16Emoji)
  );
  return {
    ...item,
    name,
    sequenceKey,
    sequence
  };
}
function combineSimilarEmojiTestData(data, componentsData) {
  const results = /* @__PURE__ */ Object.create(null);
  componentsData = componentsData || mapEmojiTestDataComponents(data);
  for (const key in data) {
    const sourceItem = data[key];
    if (sourceItem.status !== "component") {
      const item = findComponentsInEmojiTestItem(
        sourceItem,
        componentsData
      );
      results[item.sequenceKey] = item;
    }
  }
  return results;
}

export { combineSimilarEmojiTestData, findComponentsInEmojiTestItem };

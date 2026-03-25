import { getSequenceFromEmojiStringOrKeyword } from '../cleanup.mjs';
import { convertEmojiSequenceToUTF32 } from '../convert.mjs';
import { getQualifiedEmojiVariations } from '../test/variations.mjs';
import { createEmojisTree, parseEmojiTree } from './tree.mjs';
import '../data.mjs';
import '../format.mjs';
import './base.mjs';
import './numbers.mjs';
import './similar.mjs';

function createOptimisedRegexForEmojiSequences(sequences) {
  sequences = sequences.map((item) => convertEmojiSequenceToUTF32(item));
  const tree = createEmojisTree(sequences);
  const regex = parseEmojiTree(tree);
  return regex.regex;
}
function createOptimisedRegex(emojis) {
  let sequences = emojis.map(
    (item) => typeof item === "string" ? getSequenceFromEmojiStringOrKeyword(item) : item
  );
  sequences = getQualifiedEmojiVariations(
    sequences.map((sequence) => {
      return {
        sequence
      };
    })
  ).map((item) => item.sequence);
  return createOptimisedRegexForEmojiSequences(sequences);
}

export { createOptimisedRegex, createOptimisedRegexForEmojiSequences };

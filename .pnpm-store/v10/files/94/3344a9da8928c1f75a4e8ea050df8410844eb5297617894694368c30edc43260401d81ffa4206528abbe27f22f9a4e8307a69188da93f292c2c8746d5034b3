import { UTF16EmojiItemRegex, SequenceEmojiItemRegex, SetEmojiItemRegex, OptionalEmojiItemRegex, EmojiItemRegex } from './base.mjs';

/**
 * Create regex item for set of numbers
 */
declare function createEmojiRegexItemForNumbers(numbers: number[]): UTF16EmojiItemRegex | SequenceEmojiItemRegex | SetEmojiItemRegex;
/**
 * Create sequence of numbers
 */
declare function createRegexForNumbersSequence(numbers: number[], optionalVariations?: boolean): SequenceEmojiItemRegex | UTF16EmojiItemRegex | OptionalEmojiItemRegex;
/**
 * Attempt to optimise numbers in a set
 */
declare function optimiseNumbersSet(set: SetEmojiItemRegex): EmojiItemRegex;

export { createEmojiRegexItemForNumbers, createRegexForNumbersSequence, optimiseNumbersSet };

import { EmojiComponentType } from '../data.mjs';
import { EmojiTestDataItem, EmojiTestData } from './parse.mjs';

interface EmojiTestDataComponentsMap {
    converted: Map<number, string>;
    items: Map<string | number, EmojiTestDataItem>;
    names: Map<string | number, string>;
    types: Record<string, EmojiComponentType>;
    keywords: Record<string, string>;
}
/**
 * Map components from test data
 */
declare function mapEmojiTestDataComponents(testSequences: EmojiTestData): EmojiTestDataComponentsMap;
/**
 * Sequence with components
 */
type EmojiSequenceWithComponents = (EmojiComponentType | number)[];
/**
 * Convert to string
 */
declare function emojiSequenceWithComponentsToString(sequence: EmojiSequenceWithComponents): string;
/**
 * Entry in sequence
 */
interface EmojiSequenceComponentEntry {
    index: number;
    type: EmojiComponentType;
}
/**
 * Find variations in sequence
 */
declare function findEmojiComponentsInSequence(sequence: number[]): EmojiSequenceComponentEntry[];
/**
 * Component values
 */
type EmojiSequenceComponentValues = Partial<Record<EmojiComponentType, number[]>>;
/**
 * Replace components in sequence
 */
declare function replaceEmojiComponentsInCombinedSequence(sequence: EmojiSequenceWithComponents, values: EmojiSequenceComponentValues): number[];

export { type EmojiSequenceComponentEntry, type EmojiSequenceComponentValues, type EmojiSequenceWithComponents, type EmojiTestDataComponentsMap, emojiSequenceWithComponentsToString, findEmojiComponentsInSequence, mapEmojiTestDataComponents, replaceEmojiComponentsInCombinedSequence };

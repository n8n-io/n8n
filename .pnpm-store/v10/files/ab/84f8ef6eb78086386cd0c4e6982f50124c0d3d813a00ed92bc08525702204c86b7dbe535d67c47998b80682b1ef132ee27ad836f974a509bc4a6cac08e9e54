import { EmojiItemRegex, SetEmojiItemRegex } from './base.cjs';

type SlicePosition = 'start' | 'end';
type SliceValue = number | 'full';
/**
 * Slice of sequence
 */
interface SimilarRegexItemSlice {
    index: number;
    slice: SliceValue;
}
/**
 * Similar sequence
 */
interface SimilarRegexItemSequence {
    type: SlicePosition;
    slices: SimilarRegexItemSlice[];
}
/**
 * Result if findSimilarRegexItemSequences()
 */
interface SimilarRegexItemSequenceResult {
    score: number;
    sequences: SimilarRegexItemSequence[];
}
/**
 * Find similar item sequences
 *
 * Returns sequence(s) with highest score. Only one of results should be
 * applied to items. If there are multiple sequences, clone items list,
 * attempt to apply each sequence, run further optimisations on each fork
 * and see which one returns better result.
 *
 * Returns undefined if no common sequences found
 */
declare function findSimilarRegexItemSequences(items: EmojiItemRegex[]): SimilarRegexItemSequenceResult | undefined;
/**
 * Merge similar sequences
 *
 * Accepts callback to run optimisation on created subset
 */
declare function mergeSimilarRegexItemSequences(items: EmojiItemRegex[], merge: SimilarRegexItemSequence, optimise?: (set: SetEmojiItemRegex) => EmojiItemRegex): EmojiItemRegex[];
/**
 * Merge similar items
 */
declare function mergeSimilarItemsInSet(set: SetEmojiItemRegex): EmojiItemRegex;

export { findSimilarRegexItemSequences, mergeSimilarItemsInSet, mergeSimilarRegexItemSequences };

/**
 * Get qualified sequence, adding optional `FE0F` wherever it might exist
 *
 * This might result in sequence that is not actually valid, but considering
 * that `FE0F` is always treated as optional, full sequence used in regex will
 * catch both qualified and unqualified emojis, so proper sequence will get
 * caught anyway. This function just makes sure that in case if sequence does
 * have `FE0F`, it will be caught by regex too.
 */
declare function guessQualifiedEmojiSequence(sequence: number[]): number[];
/**
 * Base type to extend
 */
interface BaseSequenceItem {
    sequence: number[];
    sequenceKey?: string;
}
/**
 * Get qualified variations for emojis
 *
 * Also converts list to UTF-32 as needed and removes duplicate items
 */
declare function getQualifiedEmojiVariation<T extends BaseSequenceItem>(item: T): T;
/**
 * Get qualified emoji variations for set of emojis, ignoring duplicate entries
 */
declare function getQualifiedEmojiVariations<T extends BaseSequenceItem>(items: T[]): T[];

export { getQualifiedEmojiVariation, getQualifiedEmojiVariations, guessQualifiedEmojiSequence };

/**
 * Get emoji sequence from string
 *
 * Examples (shows same emoji sequence formatted differently):
 *  '1F441 FE0F 200D 1F5E8 FE0F' => [0x1f441, 0xfe0f, 0x200d, 0x1f5e8, 0xfe0f]
 *  '1f441-fe0f-200d-1f5e8-fe0f' => [0x1f441, 0xfe0f, 0x200d, 0x1f5e8, 0xfe0f]
 *  '\\uD83D\\uDC41\\uFE0F\\u200D\\uD83D\\uDDE8\\uFE0F' => [0x1f441, 0xfe0f, 0x200d, 0x1f5e8, 0xfe0f]
 */
declare function getEmojiSequenceFromString(value: string): number[];
/**
 * Convert emoji sequence or keyword
 *
 * If sequence is characters list, like '1f441-fe0f', it will be converted to [0x1f441, 0xfe0f]
 * If sequence contains anything other than [0-9A-F-\s], it will be converted character by character
 *
 * This is used to treat keywords, like ':cat:' differently when converting strings to sequences
 */
declare function getSequenceFromEmojiStringOrKeyword(value: string): number[];
/**
 * Split emoji sequence by joiner
 *
 * Result represents one emoji, split in smaller sequences separated by 0x200D
 *
 * Example:
 * 	[0x1FAF1, 0x1F3FB, 0x200D, 0x1FAF2, 0x1F3FC] => [[0x1FAF1, 0x1F3FB], [0x1FAF2, 0x1F3FC]]
 */
declare function splitEmojiSequences(sequence: number[], separator?: number): number[][];
/**
 * Join emoji sequences
 *
 * Parameter represents one emoji, split in smaller sequences
 *
 * Example:
 * 	[[0x1FAF1, 0x1F3FB], [0x1FAF2, 0x1F3FC]] => [0x1FAF1, 0x1F3FB, 0x200D, 0x1FAF2, 0x1F3FC]
 */
declare function joinEmojiSequences(sequences: number[][], separator?: number): number[];
/**
 * Get unqualified sequence
 */
declare function getUnqualifiedEmojiSequence(sequence: number[]): number[];

export { getEmojiSequenceFromString, getSequenceFromEmojiStringOrKeyword, getUnqualifiedEmojiSequence, joinEmojiSequences, splitEmojiSequences };

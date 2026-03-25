/**
 * Convert string to number
 */
declare function getEmojiCodePoint(code: string): number;
/**
 * Get UTF-32 as UTF-16 sequence
 */
declare function splitUTF32Number(code: number): [number, number] | undefined;
/**
 * Check if number is UTF-32 split as UTF-16
 *
 * Returns:
 * - 1 if number fits first number in sequence
 * - 2 if number fits second number in sequence
 * - false on failure
 */
declare function isUTF32SplitNumber(value: number): 1 | 2 | false;
/**
 * Get UTF-16 sequence as UTF-32
 */
declare function mergeUTF32Numbers(part1: number, part2: number): number | undefined;
/**
 * Convert hexadecimal string or number to unicode
 */
declare function getEmojiUnicode(code: number | string): string;
/**
 * Convert sequence to UTF-16
 */
declare function convertEmojiSequenceToUTF16(numbers: number[]): number[];
/**
 * Convert sequence to UTF-32
 */
declare function convertEmojiSequenceToUTF32(numbers: number[], throwOnError?: boolean): number[];

export { convertEmojiSequenceToUTF16, convertEmojiSequenceToUTF32, getEmojiCodePoint, getEmojiUnicode, isUTF32SplitNumber, mergeUTF32Numbers, splitUTF32Number };

import { IntervalArray } from '../types';
/**
 * Escape regular expression string
 * @see https://stackoverflow.com/questions/3446170/escape-string-for-use-in-javascript-regex/6969486#6969486
 */
export declare function escapeRegExp(str?: string): string;
/**
 * Check if a character is Chinese
 */
export declare function hasChinese(char: string): boolean;
/**
 * Check if a character is a punctuation
 */
export declare function hasPunctuationOrSpace(char: string): boolean;
/**
 * Deep clone a variable
 * @param obj Object to clone
 * @returns The cloned object
 */
export declare function deepClone(obj: any): any;
/**
 * Find all occurrences of a list of strings and merge the result in an interval array
 * @see: https://stackoverflow.com/questions/26390938/merge-arrays-with-overlapping-values#answer-26391774
 * @param source Source string
 * @param searches Strings to search
 * @returns A list of occurrences in the format of [[from, to], [from, to]]
 */
export declare function findStrOccurrences(source: string, searches: string[]): IntervalArray;
/**
 * Check if the given `num` is in the `rangeArr` interval array using Binary Search algorithm
 * @param num
 * @param rangeArr
 */
export declare function inRange(num: number, rangeArr: IntervalArray): boolean;
/**
 * Custom RegExp replace function to replace all unnecessary strings into target replacement string
 * @param source Source string
 * @param regexp Used to search through the source string
 * @param replacement Replace matched RegExp with replacement value
 * @param ignored Ignore certain string values within the matched strings
 */
export declare function regexpReplaceCustom(source: string, regexp: RegExp, replacement: string, ignored?: string[]): string;

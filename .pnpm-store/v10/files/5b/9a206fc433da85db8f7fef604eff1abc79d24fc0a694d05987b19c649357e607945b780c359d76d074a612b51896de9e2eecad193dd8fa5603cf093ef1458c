import { type Comparer, Comparison, type SortedReadonlyArray } from './corePublic';
/**
 * Iterates through `array` by index and performs the callback on each element of array until the callback
 * returns a falsey value, then returns false.
 * If no such value is found, the callback is applied to each element of array and `true` is returned.
 */
export declare function every<T>(array: readonly T[] | undefined, callback: (element: T, index: number) => boolean): boolean;
/** Works like Array.prototype.findIndex, returning `-1` if no element satisfying the predicate is found. */
export declare function findIndex<T>(array: readonly T[] | undefined, predicate: (element: T, index: number) => boolean, startIndex?: number): number;
export declare function indexOfAnyCharCode(text: string, charCodes: readonly number[], start?: number): number;
export declare function map<T, U>(array: readonly T[], f: (x: T, i: number) => U): U[];
export declare function map<T, U>(array: readonly T[] | undefined, f: (x: T, i: number) => U): U[] | undefined;
/**
 * Flattens an array containing a mix of array or non-array elements.
 *
 * @param array The array to flatten.
 */
export declare function flatten<T>(array: T[][] | readonly (T | readonly T[] | undefined)[]): T[];
/**
 * Maps an array. If the mapped value is an array, it is spread into the result.
 *
 * @param array The array to map.
 * @param mapfn The callback used to map the result into one or more values.
 */
export declare function flatMap<T, U>(array: readonly T[] | undefined, mapfn: (x: T, i: number) => U | readonly U[] | undefined): readonly U[];
export declare function some<T>(array: readonly T[] | undefined): array is readonly T[];
export declare function some<T>(array: readonly T[] | undefined, predicate: (value: T) => boolean): boolean;
/**
 * Returns a new sorted array.
 */
export declare function sort<T>(array: readonly T[], comparer?: Comparer<T>): SortedReadonlyArray<T>;
/**
 * Returns the last element of an array if non-empty, `undefined` otherwise.
 */
export declare function lastOrUndefined<T>(array: readonly T[] | undefined): T | undefined;
export declare function last<T>(array: readonly T[]): T;
/**
 * Compare the equality of two strings using a case-sensitive ordinal comparison.
 *
 * Case-sensitive comparisons compare both strings one code-point at a time using the integer
 * value of each code-point after applying `toUpperCase` to each string. We always map both
 * strings to their upper-case form as some unicode characters do not properly round-trip to
 * lowercase (such as `ẞ` (German sharp capital s)).
 */
export declare function equateStringsCaseInsensitive(a: string, b: string): boolean;
/**
 * Compare the equality of two strings using a case-sensitive ordinal comparison.
 *
 * Case-sensitive comparisons compare both strings one code-point at a time using the
 * integer value of each code-point.
 */
export declare function equateStringsCaseSensitive(a: string, b: string): boolean;
/**
 * Compare two strings using a case-insensitive ordinal comparison.
 *
 * Ordinal comparisons are based on the difference between the unicode code points of both
 * strings. Characters with multiple unicode representations are considered unequal. Ordinal
 * comparisons provide predictable ordering, but place "a" after "B".
 *
 * Case-insensitive comparisons compare both strings one code-point at a time using the integer
 * value of each code-point after applying `toUpperCase` to each string. We always map both
 * strings to their upper-case form as some unicode characters do not properly round-trip to
 * lowercase (such as `ẞ` (German sharp capital s)).
 */
declare function compareStringsCaseInsensitive(a: string, b: string): Comparison;
/**
 * Compare two strings using a case-sensitive ordinal comparison.
 *
 * Ordinal comparisons are based on the difference between the unicode code points of both
 * strings. Characters with multiple unicode representations are considered unequal. Ordinal
 * comparisons provide predictable ordering, but place "a" after "B".
 *
 * Case-sensitive comparisons compare both strings one code-point at a time using the integer
 * value of each code-point.
 */
export declare function compareStringsCaseSensitive(a: string | undefined, b: string | undefined): Comparison;
export declare function getStringComparer(ignoreCase?: boolean): typeof compareStringsCaseInsensitive;
export declare function endsWith(str: string, suffix: string): boolean;
export declare function stringContains(str: string, substring: string): boolean;
type GetCanonicalFileName = (fileName: string) => string;
export declare function createGetCanonicalFileName(useCaseSensitiveFileNames: boolean): GetCanonicalFileName;
export declare function startsWith(str: string, prefix: string): boolean;
export {};

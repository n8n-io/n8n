import type { AnyNode } from 'domhandler';
import type { Cheerio } from './cheerio.js';
/**
 * Checks if an object is a Cheerio instance.
 *
 * @category Utils
 * @param maybeCheerio - The object to check.
 * @returns Whether the object is a Cheerio instance.
 */
export declare function isCheerio<T>(maybeCheerio: any): maybeCheerio is Cheerio<T>;
/**
 * Convert a string to camel case notation.
 *
 * @private
 * @category Utils
 * @param str - The string to be converted.
 * @returns String in camel case notation.
 */
export declare function camelCase(str: string): string;
/**
 * Convert a string from camel case to "CSS case", where word boundaries are
 * described by hyphens ("-") and all characters are lower-case.
 *
 * @private
 * @category Utils
 * @param str - The string to be converted.
 * @returns String in "CSS case".
 */
export declare function cssCase(str: string): string;
/**
 * Iterate over each DOM element without creating intermediary Cheerio
 * instances.
 *
 * This is indented for use internally to avoid otherwise unnecessary memory
 * pressure introduced by _make.
 *
 * @category Utils
 * @param array - The array to iterate over.
 * @param fn - Function to call.
 * @returns The original instance.
 */
export declare function domEach<T extends AnyNode, Arr extends ArrayLike<T> = Cheerio<T>>(array: Arr, fn: (elem: T, index: number) => void): Arr;
/**
 * Check if string is HTML.
 *
 * Tests for a `<` within a string, immediate followed by a letter and
 * eventually followed by a `>`.
 *
 * @private
 * @category Utils
 * @param str - The string to check.
 * @returns Indicates if `str` is HTML.
 */
export declare function isHtml(str: string): boolean;
//# sourceMappingURL=utils.d.ts.map
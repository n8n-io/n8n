import type { AnyNode } from 'domhandler';
import type { Cheerio } from './cheerio.js';

/**
 * Checks if an object is a Cheerio instance.
 *
 * @category Utils
 * @param maybeCheerio - The object to check.
 * @returns Whether the object is a Cheerio instance.
 */
export function isCheerio<T>(maybeCheerio: any): maybeCheerio is Cheerio<T> {
  return maybeCheerio.cheerio != null;
}

/**
 * Convert a string to camel case notation.
 *
 * @private
 * @category Utils
 * @param str - The string to be converted.
 * @returns String in camel case notation.
 */
export function camelCase(str: string): string {
  return str.replace(/[._-](\w|$)/g, (_, x) => x.toUpperCase());
}

/**
 * Convert a string from camel case to "CSS case", where word boundaries are
 * described by hyphens ("-") and all characters are lower-case.
 *
 * @private
 * @category Utils
 * @param str - The string to be converted.
 * @returns String in "CSS case".
 */
export function cssCase(str: string): string {
  return str.replace(/[A-Z]/g, '-$&').toLowerCase();
}

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
export function domEach<
  T extends AnyNode,
  Arr extends ArrayLike<T> = Cheerio<T>,
>(array: Arr, fn: (elem: T, index: number) => void): Arr {
  const len = array.length;
  for (let i = 0; i < len; i++) fn(array[i], i);
  return array;
}

const enum CharacterCodes {
  LowerA = 97,
  LowerZ = 122,
  UpperA = 65,
  UpperZ = 90,
  Exclamation = 33,
}

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
export function isHtml(str: string): boolean {
  const tagStart = str.indexOf('<');

  if (tagStart < 0 || tagStart > str.length - 3) return false;

  const tagChar = str.charCodeAt(tagStart + 1);

  return (
    ((tagChar >= CharacterCodes.LowerA && tagChar <= CharacterCodes.LowerZ) ||
      (tagChar >= CharacterCodes.UpperA && tagChar <= CharacterCodes.UpperZ) ||
      tagChar === CharacterCodes.Exclamation) &&
    str.includes('>', tagStart + 2)
  );
}

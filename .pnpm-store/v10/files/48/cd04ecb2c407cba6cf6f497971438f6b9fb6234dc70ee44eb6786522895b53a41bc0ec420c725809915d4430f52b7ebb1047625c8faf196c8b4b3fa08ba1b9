import { type Element, type AnyNode } from 'domhandler';
import type { Cheerio } from '../cheerio.js';
/**
 * Get the value of a style property for the first element in the set of matched
 * elements.
 *
 * @category CSS
 * @param names - Optionally the names of the properties of interest.
 * @returns A map of all of the style properties.
 * @see {@link https://api.jquery.com/css/}
 */
export declare function css<T extends AnyNode>(this: Cheerio<T>, names?: string[]): Record<string, string> | undefined;
/**
 * Get the value of a style property for the first element in the set of matched
 * elements.
 *
 * @category CSS
 * @param name - The name of the property.
 * @returns The property value for the given name.
 * @see {@link https://api.jquery.com/css/}
 */
export declare function css<T extends AnyNode>(this: Cheerio<T>, name: string): string | undefined;
/**
 * Set one CSS property for every matched element.
 *
 * @category CSS
 * @param prop - The name of the property.
 * @param val - The new value.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/css/}
 */
export declare function css<T extends AnyNode>(this: Cheerio<T>, prop: string, val: string | ((this: Element, i: number, style: string) => string | undefined)): Cheerio<T>;
/**
 * Set multiple CSS properties for every matched element.
 *
 * @category CSS
 * @param map - A map of property names and values.
 * @returns The instance itself.
 * @see {@link https://api.jquery.com/css/}
 */
export declare function css<T extends AnyNode>(this: Cheerio<T>, map: Record<string, string>): Cheerio<T>;
//# sourceMappingURL=css.d.ts.map
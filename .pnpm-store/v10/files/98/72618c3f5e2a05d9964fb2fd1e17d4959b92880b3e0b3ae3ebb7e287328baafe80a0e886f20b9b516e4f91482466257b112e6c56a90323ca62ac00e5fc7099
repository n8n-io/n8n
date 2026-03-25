/** @file Types used in signatures of Cheerio methods. */
type LowercaseLetters = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';
type AlphaNumeric = LowercaseLetters | Uppercase<LowercaseLetters> | `${number}`;
type SelectorSpecial = '.' | '#' | ':' | '|' | '>' | '+' | '~' | '[';
/**
 * Type for identifying selectors. Allows us to "upgrade" queries using
 * selectors to return `Element`s.
 */
export type SelectorType = `${SelectorSpecial}${AlphaNumeric}${string}` | `${AlphaNumeric}${string}`;
import type { Cheerio } from './cheerio.js';
import type { AnyNode } from 'domhandler';
/** Elements that can be passed to manipulation methods. */
export type BasicAcceptedElems<T extends AnyNode> = ArrayLike<T> | T | string;
/** Elements that can be passed to manipulation methods, including functions. */
export type AcceptedElems<T extends AnyNode> = BasicAcceptedElems<T> | ((this: T, i: number, el: T) => BasicAcceptedElems<T>);
/** Function signature, for traversal methods. */
export type FilterFunction<T> = (this: T, i: number, el: T) => boolean;
/** Supported filter types, for traversal methods. */
export type AcceptedFilters<T> = string | FilterFunction<T> | T | Cheerio<T>;
export {};
//# sourceMappingURL=types.d.ts.map
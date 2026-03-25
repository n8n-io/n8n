declare type LowercaseLetters = 'a' | 'b' | 'c' | 'd' | 'e' | 'f' | 'g' | 'h' | 'i' | 'j' | 'k' | 'l' | 'm' | 'n' | 'o' | 'p' | 'q' | 'r' | 's' | 't' | 'u' | 'v' | 'w' | 'x' | 'y' | 'z';
declare type AlphaNumeric = LowercaseLetters | Uppercase<LowercaseLetters> | `${number}`;
declare type SelectorSpecial = '.' | '#' | ':' | '|' | '>' | '+' | '~' | '[';
/**
 * Type for identifying selectors. Allows us to "upgrade" queries using
 * selectors to return `Element`s.
 */
export declare type SelectorType = `${SelectorSpecial}${AlphaNumeric}${string}` | `${AlphaNumeric}${string}`;
import type { Cheerio } from './cheerio.js';
import type { AnyNode } from 'domhandler';
/** Elements that can be passed to manipulation methods. */
export declare type BasicAcceptedElems<T extends AnyNode> = Cheerio<T> | T[] | T | string;
/** Elements that can be passed to manipulation methods, including functions. */
export declare type AcceptedElems<T extends AnyNode> = BasicAcceptedElems<T> | ((this: T, i: number, el: T) => BasicAcceptedElems<T>);
/** Function signature, for traversal methods. */
export declare type FilterFunction<T> = (this: T, i: number, el: T) => boolean;
/** Supported filter types, for traversal methods. */
export declare type AcceptedFilters<T> = string | FilterFunction<T> | T | Cheerio<T>;
export {};
//# sourceMappingURL=types.d.ts.map
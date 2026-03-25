/**
 * This is an additional module specifically for string parsers.
 *
 * It contains parsers with token type bound to be `string`
 * and expected to work with individual characters.
 *
 * It should work even if you have a custom way to split
 * a string into symbols such as graphemes.
 *
 * Node:
 * ```ts
 * import * as pc from 'peberminta/char';
 * ```
 *
 * Deno:
 * ```ts
 * import * as p from 'https://deno.land/x/peberminta@.../char.ts';
 * ```
 *
 * @packageDocumentation
 */
import { Parser, Matcher, Data } from './core';
/**
 * Make a parser that looks for the exact match for a given character
 * and returns a match with that character.
 *
 * Tokens expected to be individual characters/graphemes.
 *
 * @param char - A character to look for.
 */
export declare function char<TOptions>(char: string): Parser<string, TOptions, string>;
/**
 * Make a parser that matches and returns a character
 * if it is present in a given character samples string/array.
 *
 * Tokens expected to be individual characters/graphemes.
 *
 * @param chars - An array (or a string) of all acceptable characters.
 */
export declare function oneOf<TOptions>(chars: string | string[]): Parser<string, TOptions, string>;
export { oneOf as anyOf };
/**
 * Make a parser that matches and returns a character
 * if it is absent in a given character samples string/array.
 *
 * Tokens expected to be individual characters/graphemes.
 *
 * @param chars - An array (or a string) of all characters that are not acceptable.
 */
export declare function noneOf<TOptions>(chars: string | string[]): Parser<string, TOptions, string>;
/**
 * Make a parser that matches input character against given regular expression.
 *
 * Use this to match characters belonging to a certain range
 * or having a certain [unicode property](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Regular_Expressions/Unicode_Property_Escapes).
 *
 * Use `satisfy` from core module instead if you need a predicate.
 *
 * Tokens expected to be individual characters/graphemes.
 *
 * @param regex - Tester regular expression.
 */
export declare function charTest<TOptions>(regex: RegExp): Parser<string, TOptions, string>;
/**
 * Make a parser that looks for the exact match for a given string,
 * returns a match with that string and consumes an according number of tokens.
 *
 * Empty string matches without consuming input.
 *
 * Tokens expected to be individual characters/graphemes.
 *
 * @param str - A string to look for.
 */
export declare function str<TOptions>(str: string): Parser<string, TOptions, string>;
/**
 * Make a parser that concatenates characters/strings
 * from all provided parsers into a single string.
 *
 * Nonmatch is returned if any of parsers didn't match.
 *
 * @param ps - Parsers sequence.
 * Each parser can return a string or an array of strings.
 */
export declare function concat<TOptions>(...ps: Parser<string, TOptions, string | string[]>[]): Parser<string, TOptions, string>;
/**
 * Utility function to render a given parser position
 * for error reporting and debug purposes.
 *
 * This is a version specific for char parsers.
 *
 * Note: it will fall back to core version (one token per line)
 * in case any multicharacter tokens are present.
 *
 * @param data - Data object (tokens and options).
 * @param i - Parser position in the tokens array.
 * @param contextTokens - How many tokens (characters) around the current one to render.
 * @returns A multiline string.
 *
 * @category Utility functions
 */
export declare function parserPosition(data: Data<string, unknown>, i: number, contextTokens?: number): string;
/**
 * Utility function that provides a bit cleaner interface for running a parser.
 *
 * This one throws an error in case parser didn't match
 * OR the match is incomplete (some part of input string left unparsed).
 *
 * Input string is broken down to characters as `[...str]`
 * unless you provide a pre-split array.
 *
 * @param parser - A parser to run.
 * @param str - Input string or an array of graphemes.
 * @param options - Parser options.
 * @returns A matched value.
 *
 * @category Utility functions
 */
export declare function parse<TOptions, TValue>(parser: Parser<string, TOptions, TValue>, str: string | string[], options: TOptions): TValue;
/**
 * Utility function that provides a bit cleaner interface
 * for running a parser over a string.
 * Returns `undefined` in case parser did not match.
 *
 * Input string is broken down to characters as `[...str]`
 * unless you provide a pre-split array.
 *
 * Note: this doesn't capture errors thrown during parsing.
 * Nonmatch is considered a part or normal flow.
 * Errors mean unrecoverable state and it's up to client code to decide
 * where to throw errors and how to get back to safe state.
 *
 * @param parser - A parser to run.
 * @param str - Input string or an array of graphemes.
 * @param options - Parser options.
 * @returns A matched value or `undefined` in case of nonmatch.
 *
 * @category Utility functions
 */
export declare function tryParse<TOptions, TValue>(parser: Parser<string, TOptions, TValue>, str: string | string[], options: TOptions): TValue | undefined;
/**
 * Utility function that provides a bit cleaner interface
 * for running a {@link Matcher} over a string.
 *
 * Input string is broken down to characters as `[...str]`
 * unless you provide a pre-split array.
 *
 * @param matcher - A matcher to run.
 * @param str - Input string or an array of graphemes.
 * @param options - Parser options.
 * @returns A matched value.
 *
 * @category Utility functions
 */
export declare function match<TOptions, TValue>(matcher: Matcher<string, TOptions, TValue>, str: string | string[], options: TOptions): TValue;

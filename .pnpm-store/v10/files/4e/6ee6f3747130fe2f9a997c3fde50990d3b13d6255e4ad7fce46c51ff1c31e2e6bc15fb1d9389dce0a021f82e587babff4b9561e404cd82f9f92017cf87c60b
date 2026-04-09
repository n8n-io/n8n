import type { NumberParser, ParseOptions, Reviver } from './types';
/**
 * The LosslessJSON.parse() method parses a string as JSON, optionally transforming
 * the value produced by parsing.
 *
 * The parser is based on the parser of Tan Li Hou shared in
 * https://lihautan.com/json-parser-with-javascript/
 *
 * @param text
 * The string to parse as JSON. See the JSON object for a description of JSON syntax.
 *
 * @param [reviver]
 * If a function, prescribes how the value originally produced by parsing is
 * transformed, before being returned.
 *
 * @param [options=ParseOptions | NumberParserArgument]
 * Pass a custom number parser. Input is a string, and the output can be unknown
 * numeric value: number, bigint, LosslessNumber, or a custom BigNumber library.
 *
 * @returns Returns the Object corresponding to the given JSON text.
 *
 * @throws Throws a SyntaxError exception if the string to parse is not valid JSON.
 */
export declare function parse(text: string, reviver?: Reviver | null, options?: ParseOptions | NumberParser): unknown;
export declare function isValidStringCharacter(code: number): boolean;
export declare function isDeepEqual(a: unknown, b: unknown): boolean;
export declare const codeUppercaseA = 65;
export declare const codeLowercaseA = 97;
export declare const codeUppercaseE = 69;
export declare const codeLowercaseE = 101;
export declare const codeUppercaseF = 70;
export declare const codeLowercaseF = 102;
//# sourceMappingURL=parse.d.ts.map
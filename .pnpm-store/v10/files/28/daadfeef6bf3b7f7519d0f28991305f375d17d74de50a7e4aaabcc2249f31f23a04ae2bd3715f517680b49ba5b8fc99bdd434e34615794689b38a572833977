export declare function isHex(char: string): boolean;
export declare function isDigit(char: string): boolean;
export declare function isValidStringCharacter(char: string): boolean;
export declare function isDelimiter(char: string): boolean;
export declare function isFunctionNameCharStart(char: string): boolean;
export declare function isFunctionNameChar(char: string): boolean;
export declare const regexUrlStart: RegExp;
export declare const regexUrlChar: RegExp;
export declare function isUnquotedStringDelimiter(char: string): boolean;
export declare function isStartOfValue(char: string): boolean;
export declare function isControlCharacter(char: string): char is "\n" | "\r" | "\t" | "\b" | "\f";
export interface Text {
    charCodeAt: (index: number) => number;
}
/**
 * Check if the given character is a whitespace character like space, tab, or
 * newline
 */
export declare function isWhitespace(text: Text, index: number): boolean;
/**
 * Check if the given character is a whitespace character like space or tab,
 * but NOT a newline
 */
export declare function isWhitespaceExceptNewline(text: Text, index: number): boolean;
/**
 * Check if the given character is a special whitespace character, some
 * unicode variant
 */
export declare function isSpecialWhitespace(text: Text, index: number): boolean;
/**
 * Test whether the given character is a quote or double quote character.
 * Also tests for special variants of quotes.
 */
export declare function isQuote(char: string): boolean;
/**
 * Test whether the given character is a double quote character.
 * Also tests for special variants of double quotes.
 */
export declare function isDoubleQuoteLike(char: string): boolean;
/**
 * Test whether the given character is a double quote character.
 * Does NOT test for special variants of double quotes.
 */
export declare function isDoubleQuote(char: string): boolean;
/**
 * Test whether the given character is a single quote character.
 * Also tests for special variants of single quotes.
 */
export declare function isSingleQuoteLike(char: string): boolean;
/**
 * Test whether the given character is a single quote character.
 * Does NOT test for special variants of single quotes.
 */
export declare function isSingleQuote(char: string): boolean;
/**
 * Strip last occurrence of textToStrip from text
 */
export declare function stripLastOccurrence(text: string, textToStrip: string, stripRemainingText?: boolean): string;
export declare function insertBeforeLastWhitespace(text: string, textToInsert: string): string;
export declare function removeAtIndex(text: string, start: number, count: number): string;
/**
 * Test whether a string ends with a newline or comma character and optional whitespace
 */
export declare function endsWithCommaOrNewline(text: string): boolean;
//# sourceMappingURL=stringUtils.d.ts.map
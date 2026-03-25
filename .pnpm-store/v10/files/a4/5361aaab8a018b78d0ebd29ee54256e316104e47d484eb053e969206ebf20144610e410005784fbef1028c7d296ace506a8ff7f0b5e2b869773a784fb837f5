import * as mdurl from "mdurl";
// import ucmicro from 'uc.micro';

interface Utils {
    lib: {
        mdurl: typeof mdurl;
    };

    /**
     * Merge objects
     */
    assign(target: any, ...sources: any[]): any;

    /**
     * Check if the type is string or not
     */
    isString(obj: any): obj is string;

    /**
     * has own property
     */
    has(obj: any, key: keyof any): boolean;

    unescapeMd(str: string): string;
    unescapeAll(str: string): string;

    isValidEntityCode(code: number): boolean;
    fromCodePoint(code: number): string;
    escapeHtml(str: string): string;

    /**
     * Remove element from array and put another array at those position.
     * Useful for some operations with tokens.
     * Return a new array.
     */
    arrayReplaceAt<T>(src: T[], pos: number, newElements: T[]): T[];

    isSpace(code: number): boolean;

    /**
     * Zs (unicode class) || [\t\f\v\r\n]
     */
    isWhiteSpace(code: number): boolean;

    /**
     * Markdown ASCII punctuation characters.
     *
     * !, ", #, $, %, &, ', (, ), *, +, ,, -, ., /, :, ;, <, =, >, ?, @, [, \, ], ^, _, `, {, |, }, or ~
     * http://spec.commonmark.org/0.15/#ascii-punctuation-character
     *
     * Don't confuse with unicode punctuation !!! It lacks some chars in ascii range.
     */
    isMdAsciiPunct(code: number): boolean;

    /**
     * Currently without astral characters support.
     */
    isPunctChar(ch: string): boolean;

    escapeRE(str: string): string;

    /**
     * Hepler to unify [reference labels].
     */
    normalizeReference(str: string): string;
}

declare const utils: Utils;

export = utils;

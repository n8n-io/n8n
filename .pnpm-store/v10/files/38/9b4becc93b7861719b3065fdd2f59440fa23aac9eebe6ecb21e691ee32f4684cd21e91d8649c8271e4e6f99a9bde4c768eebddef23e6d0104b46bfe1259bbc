interface Options {
    /** use custom masks instead of built-in */
    replaceMasks?: string[]|RegExp[];
    /** add your custom masks additionally to the built-in ones */
    extraMasks?: string[]|RegExp[];
    /* when using built-in masks, count only long enough HEX values, DEFAULT: 7 */
    minHexLength?: number;
    /* when using built-in masks, count only long enough base64 values, DEFAULT: 66 */
    minBase64Length?: number;
}

declare class UrlValueParser {
    constructor(options?: Options);

    public parsePathValues(path: string): { chunks: string[], valueIndexes: number[]; }
    public replacePathValues(path: string, replacement: string): string;
}

export = UrlValueParser;

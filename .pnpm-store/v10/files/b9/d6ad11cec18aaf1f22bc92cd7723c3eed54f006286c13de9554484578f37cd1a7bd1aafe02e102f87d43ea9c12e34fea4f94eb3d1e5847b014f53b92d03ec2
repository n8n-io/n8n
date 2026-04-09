export type Level = 'xml' | 'html4' | 'html5' | 'all';
interface CommonOptions {
    level?: Level;
}
export type EncodeMode = 'specialChars' | 'nonAscii' | 'nonAsciiPrintable' | 'nonAsciiPrintableOnly' | 'extensive';
export interface EncodeOptions extends CommonOptions {
    mode?: EncodeMode;
    numeric?: 'decimal' | 'hexadecimal';
}
export type DecodeScope = 'strict' | 'body' | 'attribute';
export interface DecodeOptions extends CommonOptions {
    scope?: DecodeScope;
}
/** Encodes all the necessary (specified by `level`) characters in the text */
export declare function encode(text: string | undefined | null, { mode, numeric, level }?: EncodeOptions): string;
/** Decodes a single entity */
export declare function decodeEntity(entity: string | undefined | null, { level }?: CommonOptions): string;
/** Decodes all entities in the text */
export declare function decode(text: string | undefined | null, { level, scope }?: DecodeOptions): string;
export {};

export declare function capitalize<T extends string>(value: T): Capitalize<T>;
export declare function uncapitalize<T extends string>(value: T): Uncapitalize<T>;
export type ConcatString<T extends string[]> = T extends [infer F extends string, ...infer R extends string[]] ? `${F}${ConcatString<R>}` : '';
export type Join<T extends string[], S extends string = ','> = T extends [
    infer F extends string,
    ...infer R extends string[]
] ? `${F}${R extends [] ? '' : `${S}${Join<R, S>}`}` : '';
export type Whitespace = ' ' | '\t';
export type Trim<T extends string> = T extends `${Whitespace}${infer R extends string}` ? Trim<R> : T;
/**
 * Encodes a UTF-8 string into a buffer
 */
export declare function encodeUTF8(input: string): Uint8Array;
/**
 * Decodes a UTF-8 string from a buffer
 */
export declare function decodeUTF8(input?: Uint8Array): string;
export declare function encodeASCII(input: string): Uint8Array;
export declare function decodeASCII(input: Uint8Array): string;

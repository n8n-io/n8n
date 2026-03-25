/**
 * Avoid modifying this file. It's part of
 * https://github.com/supabase-community/base64url-js.  Submit all fixes on
 * that repo!
 */
/**
 * Converts a byte to a Base64-URL string.
 *
 * @param byte The byte to convert, or null to flush at the end of the byte sequence.
 * @param state The Base64 conversion state. Pass an initial value of `{ queue: 0, queuedBits: 0 }`.
 * @param emit A function called with the next Base64 character when ready.
 */
export declare function byteToBase64URL(byte: number | null, state: {
    queue: number;
    queuedBits: number;
}, emit: (char: string) => void): void;
/**
 * Converts a String char code (extracted using `string.charCodeAt(position)`) to a sequence of Base64-URL characters.
 *
 * @param charCode The char code of the JavaScript string.
 * @param state The Base64 state. Pass an initial value of `{ queue: 0, queuedBits: 0 }`.
 * @param emit A function called with the next byte.
 */
export declare function byteFromBase64URL(charCode: number, state: {
    queue: number;
    queuedBits: number;
}, emit: (byte: number) => void): void;
/**
 * Converts a JavaScript string (which may include any valid character) into a
 * Base64-URL encoded string. The string is first encoded in UTF-8 which is
 * then encoded as Base64-URL.
 *
 * @param str The string to convert.
 */
export declare function stringToBase64URL(str: string): string;
/**
 * Converts a Base64-URL encoded string into a JavaScript string. It is assumed
 * that the underlying string has been encoded as UTF-8.
 *
 * @param str The Base64-URL encoded string.
 */
export declare function stringFromBase64URL(str: string): string;
/**
 * Converts a Unicode codepoint to a multi-byte UTF-8 sequence.
 *
 * @param codepoint The Unicode codepoint.
 * @param emit      Function which will be called for each UTF-8 byte that represents the codepoint.
 */
export declare function codepointToUTF8(codepoint: number, emit: (byte: number) => void): void;
/**
 * Converts a JavaScript string to a sequence of UTF-8 bytes.
 *
 * @param str  The string to convert to UTF-8.
 * @param emit Function which will be called for each UTF-8 byte of the string.
 */
export declare function stringToUTF8(str: string, emit: (byte: number) => void): void;
/**
 * Converts a UTF-8 byte to a Unicode codepoint.
 *
 * @param byte  The UTF-8 byte next in the sequence.
 * @param state The shared state between consecutive UTF-8 bytes in the
 *              sequence, an object with the shape `{ utf8seq: 0, codepoint: 0 }`.
 * @param emit  Function which will be called for each codepoint.
 */
export declare function stringFromUTF8(byte: number, state: {
    utf8seq: number;
    codepoint: number;
}, emit: (codepoint: number) => void): void;
/**
 * Helper functions to convert different types of strings to Uint8Array
 */
export declare function base64UrlToUint8Array(str: string): Uint8Array;
export declare function stringToUint8Array(str: string): Uint8Array;
//# sourceMappingURL=base64url.d.ts.map
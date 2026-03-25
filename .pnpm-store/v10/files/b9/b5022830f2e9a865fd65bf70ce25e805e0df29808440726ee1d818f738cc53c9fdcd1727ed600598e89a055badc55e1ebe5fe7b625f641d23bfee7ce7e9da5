declare global {
    function btoa(input: string): string;
    function atob(input: string): string;
}
/** The supported character encoding type */
export type EncodingType = "utf-8" | "base64" | "base64url" | "hex";
/**
 * The helper that transforms bytes with specific character encoding into string
 * @param bytes - the uint8array bytes
 * @param format - the format we use to encode the byte
 * @returns a string of the encoded string
 */
export declare function uint8ArrayToString(bytes: Uint8Array, format: EncodingType): string;
/**
 * The helper that transforms string to specific character encoded bytes array.
 * @param value - the string to be converted
 * @param format - the format we use to decode the value
 * @returns a uint8array
 */
export declare function stringToUint8Array(value: string, format: EncodingType): Uint8Array;
/**
 * Decodes a Uint8Array into a Base64 string.
 * @internal
 */
export declare function uint8ArrayToBase64(bytes: Uint8Array): string;
/**
 * Decodes a Uint8Array into a Base64Url string.
 * @internal
 */
export declare function uint8ArrayToBase64Url(bytes: Uint8Array): string;
/**
 * Decodes a Uint8Array into a javascript string.
 * @internal
 */
export declare function uint8ArrayToUtf8String(bytes: Uint8Array): string;
/**
 * Decodes a Uint8Array into a hex string
 * @internal
 */
export declare function uint8ArrayToHexString(bytes: Uint8Array): string;
/**
 * Encodes a JavaScript string into a Uint8Array.
 * @internal
 */
export declare function utf8StringToUint8Array(value: string): Uint8Array;
/**
 * Encodes a Base64 string into a Uint8Array.
 * @internal
 */
export declare function base64ToUint8Array(value: string): Uint8Array;
/**
 * Encodes a Base64Url string into a Uint8Array.
 * @internal
 */
export declare function base64UrlToUint8Array(value: string): Uint8Array;
/**
 * Encodes a hex string into a Uint8Array
 * @internal
 */
export declare function hexStringToUint8Array(value: string): Uint8Array;
//# sourceMappingURL=bytesEncoding.common.d.ts.map
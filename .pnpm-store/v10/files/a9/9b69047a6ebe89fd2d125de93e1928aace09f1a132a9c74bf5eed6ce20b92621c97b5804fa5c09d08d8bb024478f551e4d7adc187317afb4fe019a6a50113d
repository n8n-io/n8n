/**
 * Base64 decode a string.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-encoding/b64decode/
 * @param input - The string to base64 decode.
 * @param encoding - Base64 variant.
 * @returns The base64 decoded version of the input string in either string or ArrayBuffer format, depending on the `format` parameter.
 * @example
 * encoding.b64decode(str)
 * encoding.b64decode(str, 'rawstd')
 * const decBuffer = encoding.b64decode(str, 'rawurl')
 * let decBin = new Uint8Array(decBuffer);
 */
export function b64decode(input: string, encoding?: Base64Variant): ArrayBuffer;

/**
 * Base64 decode a string.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-encoding/b64decode/
 * @param input - The string to base64 decode.
 * @param encoding - Base64 variant.
 * @param format - If 's' return the data as a string, otherwise an ArrayBuffer object .
 * @returns The base64 decoded version of the input string in either string or ArrayBuffer format, depending on the `format` parameter.
 * @example
 * encoding.b64decode(str)
 * encoding.b64decode(str, 'rawstd')
 * const decodedString = encoding.b64decode(str, 'rawurl', 's')
 */
export function b64decode(input: string, encoding: Base64Variant, format: "s"): string;

/**
 * Base64 encode a string.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-encoding/b64encode/
 * @param input - String to encode or ArrayBuffer object.
 * @param encoding - Base64 variant.
 * @returns Base64 encoded string.
 * @example
 * encoding.b64encode(str)
 * encoding.b64encode(str, 'rawstd')
 */
export function b64encode(input: string | ArrayBuffer, encoding?: Base64Variant): string;

/**
 * Base64 variant.
 */
export type Base64Variant = "std" | "rawstd" | "url" | "rawurl";

/**
 * The encoding module provides base64 encoding/decoding.
 * https://grafana.com/docs/k6/latest/javascript-api/k6-encoding/
 */
declare namespace encoding {
    /**
     * Base64 decode a string.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-encoding/b64decode/
     * @param input - The string to base64 decode.
     * @param encoding - Base64 variant.
     * @returns The base64 decoded version of the input string in either string or ArrayBuffer format, depending on the `format` parameter.
     * @example
     * encoding.b64decode(str)
     * encoding.b64decode(str, 'rawstd')
     * const decBuffer = encoding.b64decode(str, 'rawurl')
     * let decBin = new Uint8Array(decBuffer);
     */
    function b64decode(input: string, encoding?: Base64Variant): ArrayBuffer;
    /**
     * Base64 decode a string.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-encoding/b64decode/
     * @param input - The string to base64 decode.
     * @param encoding - Base64 variant.
     * @param format - If 's' return the data as a string, otherwise an ArrayBuffer object .
     * @returns The base64 decoded version of the input string in either string or ArrayBuffer format, depending on the `format` parameter.
     * @example
     * encoding.b64decode(str)
     * encoding.b64decode(str, 'rawstd')
     * const decodedString = encoding.b64decode(str, 'rawurl', 's')
     */
    function b64decode(input: string, encoding: Base64Variant, format: "s"): string;
    /**
     * Base64 decode a string.
     * https://grafana.com/docs/k6/latest/javascript-api/k6-encoding/b64decode/
     * @param input - Base64 encoded string or ArrayBuffer object.
     * @param encoding - Base64 variant.
     * @returns Decoded string.
     * @example
     * encoding.b64encode(str)
     * encoding.b64encode(str, 'rawstd')
     */
    function b64encode(input: string | ArrayBuffer, encoding?: Base64Variant): string;
}

export default encoding;

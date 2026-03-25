/**
 * @desc Mimic lodash.zipObject
 * @param arr1 {string[]}
 * @param arr2 {[]}
 */
export declare function zipObject(arr1: string[], arr2: any[], skipDuplicated?: boolean): {};
/**
 * @desc Alternative to lodash.flattenDeep
 * @reference https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_flattendeep
 * @param input {[]}
 */
export declare function flattenDeep(input: any[]): any;
/**
 * @desc Alternative to lodash.last
 * @reference https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_last
 * @param input {[]}
 */
export declare function last(input: any[]): any;
/**
 * @desc Alternative to lodash.uniq
 * @reference https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_uniq
 * @param input {string[]}
 */
export declare function uniq(input: string[]): string[];
/**
 * @desc Alternative to lodash.get
 * @reference https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_get
 * @param obj
 * @param path
 * @param defaultValue
 */
export declare function get(obj: any, path: any, defaultValue: any): any;
/**
 * @desc Check if the input is string
 * @param {any} input
 */
export declare function isString(input: any): input is string;
/**
* @desc Encode string with base64 format
* @param  {string} message                       plain-text message
* @return {string} base64 encoded string
*/
declare function base64Encode(message: string | number[]): string;
/**
* @desc Decode string from base64 format
* @param  {string} base64Message                 encoded string
* @param  {boolean} isBytes                      determine the return value type (True: bytes False: string)
* @return {bytes/string}  decoded bytes/string depends on isBytes, default is {string}
*/
export declare function base64Decode(base64Message: string, isBytes?: boolean): string | Buffer;
/**
* @desc Compress the string
* @param  {string} message
* @return {string} compressed string
*/
declare function deflateString(message: string): number[];
/**
* @desc Decompress the compressed string
* @param  {string} compressedString
* @return {string} decompressed string
*/
export declare function inflateString(compressedString: string): string;
/**
* @desc Parse the .cer to string format without line break, header and footer
* @param  {string} certString     declares the certificate contents
* @return {string} certificiate in string format
*/
declare function normalizeCerString(certString: string | Buffer): string;
/**
* @desc Normalize the string in .pem format without line break, header and footer
* @param  {string} pemString
* @return {string} private key in string format
*/
declare function normalizePemString(pemString: string | Buffer): string;
/**
* @desc Return the complete URL
* @param  {object} req                   HTTP request
* @return {string} URL
*/
declare function getFullURL(req: any): string;
/**
* @desc Parse input string, return default value if it is undefined
* @param  {string/boolean}
* @return {boolean}
*/
declare function parseString(str: any, defaultValue?: string): any;
/**
* @desc Override the object by another object (rtl)
* @param  {object} default object
* @param  {object} object applied to the default object
* @return {object} result object
*/
declare function applyDefault(obj1: any, obj2: any): any;
/**
* @desc Get public key in pem format from the certificate included in the metadata
* @param {string} x509 certificate
* @return {string} public key fetched from the certificate
*/
declare function getPublicKeyPemFromCertificate(x509Certificate: string): string;
/**
* @desc Read private key from pem-formatted string
* @param {string | Buffer} keyString pem-formatted string
* @param {string} protected passphrase of the key
* @return {string} string in pem format
* If passphrase is used to protect the .pem content (recommend)
*/
export declare function readPrivateKey(keyString: string | Buffer, passphrase: string | undefined, isOutputString?: boolean): any;
/**
* @desc Inline syntax sugar
*/
declare function convertToString(input: any, isOutputString: any): any;
/**
 * @desc Check if the input is an array with non-zero size
 */
export declare function isNonEmptyArray(a: any): boolean;
export declare function castArrayOpt<T>(a?: T | T[]): T[];
export declare function notEmpty<TValue>(value: TValue | null | undefined): value is TValue;
declare const utility: {
    isString: typeof isString;
    base64Encode: typeof base64Encode;
    base64Decode: typeof base64Decode;
    deflateString: typeof deflateString;
    inflateString: typeof inflateString;
    normalizeCerString: typeof normalizeCerString;
    normalizePemString: typeof normalizePemString;
    getFullURL: typeof getFullURL;
    parseString: typeof parseString;
    applyDefault: typeof applyDefault;
    getPublicKeyPemFromCertificate: typeof getPublicKeyPemFromCertificate;
    readPrivateKey: typeof readPrivateKey;
    convertToString: typeof convertToString;
    isNonEmptyArray: typeof isNonEmptyArray;
};
export default utility;

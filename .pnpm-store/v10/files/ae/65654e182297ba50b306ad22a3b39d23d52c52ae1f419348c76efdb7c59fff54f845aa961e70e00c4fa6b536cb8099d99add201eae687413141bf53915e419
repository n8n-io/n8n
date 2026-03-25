/**
* @file utility.ts
* @author tngan
* @desc  Library for some common functions (e.g. de/inflation, en/decoding)
*/
import { pki, util, asn1 } from 'node-forge';
import { inflate, deflate } from 'pako';

const BASE64_STR = 'base64';

/**
 * @desc Mimic lodash.zipObject
 * @param arr1 {string[]}
 * @param arr2 {[]}
 */
export function zipObject(arr1: string[], arr2: any[], skipDuplicated = true) {
  return arr1.reduce((res, l, i) => {

    if (skipDuplicated) {
      res[l] = arr2[i];
      return res;
    }
    // if key exists, aggregate with array in order to get rid of duplicate key
    if (res[l] !== undefined) {
      res[l] = Array.isArray(res[l])
        ? res[l].concat(arr2[i])
        : [res[l]].concat(arr2[i]);
      return res;
    }

    res[l] = arr2[i];
    return res;

  }, {});
}
/**
 * @desc Alternative to lodash.flattenDeep
 * @reference https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_flattendeep
 * @param input {[]}
 */
export function flattenDeep(input: any[]) {
  return Array.isArray(input)
  ? input.reduce( (a, b) => a.concat(flattenDeep(b)) , [])
  : [input];
}
/**
 * @desc Alternative to lodash.last
 * @reference https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_last
 * @param input {[]}
 */
export function last(input: any[]) {
  return input.slice(-1)[0];
}
/**
 * @desc Alternative to lodash.uniq
 * @reference https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_uniq
 * @param input {string[]}
 */
export function uniq(input: string[]) {
  const set = new Set(input);
  return [... set];
}
/**
 * @desc Alternative to lodash.get
 * @reference https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_get
 * @param obj
 * @param path
 * @param defaultValue
 */
export function get(obj, path, defaultValue) {
  return path.split('.')
  .reduce((a, c) => (a && a[c] ? a[c] : (defaultValue || null)), obj);
}
/**
 * @desc Check if the input is string
 * @param {any} input
 */
export function isString(input: any) {
  return typeof input === 'string';
}
/**
* @desc Encode string with base64 format
* @param  {string} message                       plain-text message
* @return {string} base64 encoded string
*/
function base64Encode(message: string | number[]) {
  return Buffer.from(message as string).toString(BASE64_STR);
}
/**
* @desc Decode string from base64 format
* @param  {string} base64Message                 encoded string
* @param  {boolean} isBytes                      determine the return value type (True: bytes False: string)
* @return {bytes/string}  decoded bytes/string depends on isBytes, default is {string}
*/
export function base64Decode(base64Message: string, isBytes?: boolean): string | Buffer {
  const bytes = Buffer.from(base64Message, BASE64_STR);
  return Boolean(isBytes) ? bytes : bytes.toString();
}
/**
* @desc Compress the string
* @param  {string} message
* @return {string} compressed string
*/
function deflateString(message: string): number[] {
  const input = Array.prototype.map.call(message, char => char.charCodeAt(0));
  return Array.from(deflate(input, { raw: true }));
}
/**
* @desc Decompress the compressed string
* @param  {string} compressedString
* @return {string} decompressed string
*/
export function inflateString(compressedString: string): string {
  const inputBuffer = Buffer.from(compressedString, BASE64_STR);
  const input = Array.prototype.map.call(inputBuffer.toString('binary'), char => char.charCodeAt(0));
  return Array.from(inflate(input, { raw: true }))
    .map((byte: number) => String.fromCharCode(byte))
    .join('');
}
/**
* @desc Abstract the normalizeCerString and normalizePemString
* @param {buffer} File stream or string
* @param {string} String for header and tail
* @return {string} A formatted certificate string
*/
function _normalizeCerString(bin: string | Buffer, format: string) {
  return bin.toString().replace(/\n/g, '').replace(/\r/g, '').replace(`-----BEGIN ${format}-----`, '').replace(`-----END ${format}-----`, '').replace(/ /g, '').replace(/\t/g, '');
}
/**
* @desc Parse the .cer to string format without line break, header and footer
* @param  {string} certString     declares the certificate contents
* @return {string} certificiate in string format
*/
function normalizeCerString(certString: string | Buffer) {
  return _normalizeCerString(certString, 'CERTIFICATE');
}
/**
* @desc Normalize the string in .pem format without line break, header and footer
* @param  {string} pemString
* @return {string} private key in string format
*/
function normalizePemString(pemString: string | Buffer) {
  return _normalizeCerString(pemString.toString(), 'RSA PRIVATE KEY');
}
/**
* @desc Return the complete URL
* @param  {object} req                   HTTP request
* @return {string} URL
*/
function getFullURL(req) {
  return `${req.protocol}://${req.get('host')}${req.originalUrl}`;
}
/**
* @desc Parse input string, return default value if it is undefined
* @param  {string/boolean}
* @return {boolean}
*/
function parseString(str, defaultValue = '') {
  return str || defaultValue;
}
/**
* @desc Override the object by another object (rtl)
* @param  {object} default object
* @param  {object} object applied to the default object
* @return {object} result object
*/
function applyDefault(obj1, obj2) {
  return Object.assign({}, obj1, obj2);
}
/**
* @desc Get public key in pem format from the certificate included in the metadata
* @param {string} x509 certificate
* @return {string} public key fetched from the certificate
*/
function getPublicKeyPemFromCertificate(x509Certificate: string) {
  const certDerBytes = util.decode64(x509Certificate);
  const obj = asn1.fromDer(certDerBytes);
  const cert = pki.certificateFromAsn1(obj);
  return pki.publicKeyToPem(cert.publicKey);
}
/**
* @desc Read private key from pem-formatted string
* @param {string | Buffer} keyString pem-formatted string
* @param {string} protected passphrase of the key
* @return {string} string in pem format
* If passphrase is used to protect the .pem content (recommend)
*/
export function readPrivateKey(keyString: string | Buffer, passphrase: string | undefined, isOutputString?: boolean) {
  return isString(passphrase) ? this.convertToString(pki.privateKeyToPem(pki.decryptRsaPrivateKey(String(keyString), passphrase)), isOutputString) : keyString;
}
/**
* @desc Inline syntax sugar
*/
function convertToString(input, isOutputString) {
  return Boolean(isOutputString) ? String(input) : input;
}
/**
 * @desc Check if the input is an array with non-zero size
 */
export function isNonEmptyArray(a) {
  return Array.isArray(a) && a.length > 0;
}

export function castArrayOpt<T>(a?: T | T[]): T[] {
  if (a === undefined) return []
  return Array.isArray(a) ? a : [a]
}

export function notEmpty<TValue>(value: TValue | null | undefined): value is TValue {
  return value !== null && value !== undefined;
}

const utility = {
  isString,
  base64Encode,
  base64Decode,
  deflateString,
  inflateString,
  normalizeCerString,
  normalizePemString,
  getFullURL,
  parseString,
  applyDefault,
  getPublicKeyPemFromCertificate,
  readPrivateKey,
  convertToString,
  isNonEmptyArray,
};

export default utility;

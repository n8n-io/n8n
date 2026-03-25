"use strict";
var __read = (this && this.__read) || function (o, n) {
    var m = typeof Symbol === "function" && o[Symbol.iterator];
    if (!m) return o;
    var i = m.call(o), r, ar = [], e;
    try {
        while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
    }
    catch (error) { e = { error: error }; }
    finally {
        try {
            if (r && !r.done && (m = i["return"])) m.call(i);
        }
        finally { if (e) throw e.error; }
    }
    return ar;
};
var __spreadArray = (this && this.__spreadArray) || function (to, from, pack) {
    if (pack || arguments.length === 2) for (var i = 0, l = from.length, ar; i < l; i++) {
        if (ar || !(i in from)) {
            if (!ar) ar = Array.prototype.slice.call(from, 0, i);
            ar[i] = from[i];
        }
    }
    return to.concat(ar || Array.prototype.slice.call(from));
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.zipObject = zipObject;
exports.flattenDeep = flattenDeep;
exports.last = last;
exports.uniq = uniq;
exports.get = get;
exports.isString = isString;
exports.base64Decode = base64Decode;
exports.inflateString = inflateString;
exports.readPrivateKey = readPrivateKey;
exports.isNonEmptyArray = isNonEmptyArray;
exports.castArrayOpt = castArrayOpt;
exports.notEmpty = notEmpty;
/**
* @file utility.ts
* @author tngan
* @desc  Library for some common functions (e.g. de/inflation, en/decoding)
*/
var node_forge_1 = require("node-forge");
var pako_1 = require("pako");
var BASE64_STR = 'base64';
/**
 * @desc Mimic lodash.zipObject
 * @param arr1 {string[]}
 * @param arr2 {[]}
 */
function zipObject(arr1, arr2, skipDuplicated) {
    if (skipDuplicated === void 0) { skipDuplicated = true; }
    return arr1.reduce(function (res, l, i) {
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
function flattenDeep(input) {
    return Array.isArray(input)
        ? input.reduce(function (a, b) { return a.concat(flattenDeep(b)); }, [])
        : [input];
}
/**
 * @desc Alternative to lodash.last
 * @reference https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_last
 * @param input {[]}
 */
function last(input) {
    return input.slice(-1)[0];
}
/**
 * @desc Alternative to lodash.uniq
 * @reference https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_uniq
 * @param input {string[]}
 */
function uniq(input) {
    var set = new Set(input);
    return __spreadArray([], __read(set), false);
}
/**
 * @desc Alternative to lodash.get
 * @reference https://github.com/you-dont-need/You-Dont-Need-Lodash-Underscore#_get
 * @param obj
 * @param path
 * @param defaultValue
 */
function get(obj, path, defaultValue) {
    return path.split('.')
        .reduce(function (a, c) { return (a && a[c] ? a[c] : (defaultValue || null)); }, obj);
}
/**
 * @desc Check if the input is string
 * @param {any} input
 */
function isString(input) {
    return typeof input === 'string';
}
/**
* @desc Encode string with base64 format
* @param  {string} message                       plain-text message
* @return {string} base64 encoded string
*/
function base64Encode(message) {
    return Buffer.from(message).toString(BASE64_STR);
}
/**
* @desc Decode string from base64 format
* @param  {string} base64Message                 encoded string
* @param  {boolean} isBytes                      determine the return value type (True: bytes False: string)
* @return {bytes/string}  decoded bytes/string depends on isBytes, default is {string}
*/
function base64Decode(base64Message, isBytes) {
    var bytes = Buffer.from(base64Message, BASE64_STR);
    return Boolean(isBytes) ? bytes : bytes.toString();
}
/**
* @desc Compress the string
* @param  {string} message
* @return {string} compressed string
*/
function deflateString(message) {
    var input = Array.prototype.map.call(message, function (char) { return char.charCodeAt(0); });
    return Array.from((0, pako_1.deflate)(input, { raw: true }));
}
/**
* @desc Decompress the compressed string
* @param  {string} compressedString
* @return {string} decompressed string
*/
function inflateString(compressedString) {
    var inputBuffer = Buffer.from(compressedString, BASE64_STR);
    var input = Array.prototype.map.call(inputBuffer.toString('binary'), function (char) { return char.charCodeAt(0); });
    return Array.from((0, pako_1.inflate)(input, { raw: true }))
        .map(function (byte) { return String.fromCharCode(byte); })
        .join('');
}
/**
* @desc Abstract the normalizeCerString and normalizePemString
* @param {buffer} File stream or string
* @param {string} String for header and tail
* @return {string} A formatted certificate string
*/
function _normalizeCerString(bin, format) {
    return bin.toString().replace(/\n/g, '').replace(/\r/g, '').replace("-----BEGIN ".concat(format, "-----"), '').replace("-----END ".concat(format, "-----"), '').replace(/ /g, '').replace(/\t/g, '');
}
/**
* @desc Parse the .cer to string format without line break, header and footer
* @param  {string} certString     declares the certificate contents
* @return {string} certificiate in string format
*/
function normalizeCerString(certString) {
    return _normalizeCerString(certString, 'CERTIFICATE');
}
/**
* @desc Normalize the string in .pem format without line break, header and footer
* @param  {string} pemString
* @return {string} private key in string format
*/
function normalizePemString(pemString) {
    return _normalizeCerString(pemString.toString(), 'RSA PRIVATE KEY');
}
/**
* @desc Return the complete URL
* @param  {object} req                   HTTP request
* @return {string} URL
*/
function getFullURL(req) {
    return "".concat(req.protocol, "://").concat(req.get('host')).concat(req.originalUrl);
}
/**
* @desc Parse input string, return default value if it is undefined
* @param  {string/boolean}
* @return {boolean}
*/
function parseString(str, defaultValue) {
    if (defaultValue === void 0) { defaultValue = ''; }
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
function getPublicKeyPemFromCertificate(x509Certificate) {
    var certDerBytes = node_forge_1.util.decode64(x509Certificate);
    var obj = node_forge_1.asn1.fromDer(certDerBytes);
    var cert = node_forge_1.pki.certificateFromAsn1(obj);
    return node_forge_1.pki.publicKeyToPem(cert.publicKey);
}
/**
* @desc Read private key from pem-formatted string
* @param {string | Buffer} keyString pem-formatted string
* @param {string} protected passphrase of the key
* @return {string} string in pem format
* If passphrase is used to protect the .pem content (recommend)
*/
function readPrivateKey(keyString, passphrase, isOutputString) {
    return isString(passphrase) ? this.convertToString(node_forge_1.pki.privateKeyToPem(node_forge_1.pki.decryptRsaPrivateKey(String(keyString), passphrase)), isOutputString) : keyString;
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
function isNonEmptyArray(a) {
    return Array.isArray(a) && a.length > 0;
}
function castArrayOpt(a) {
    if (a === undefined)
        return [];
    return Array.isArray(a) ? a : [a];
}
function notEmpty(value) {
    return value !== null && value !== undefined;
}
var utility = {
    isString: isString,
    base64Encode: base64Encode,
    base64Decode: base64Decode,
    deflateString: deflateString,
    inflateString: inflateString,
    normalizeCerString: normalizeCerString,
    normalizePemString: normalizePemString,
    getFullURL: getFullURL,
    parseString: parseString,
    applyDefault: applyDefault,
    getPublicKeyPemFromCertificate: getPublicKeyPemFromCertificate,
    readPrivateKey: readPrivateKey,
    convertToString: convertToString,
    isNonEmptyArray: isNonEmptyArray,
};
exports.default = utility;
//# sourceMappingURL=utility.js.map
"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.uint8ArrayToString = uint8ArrayToString;
exports.stringToUint8Array = stringToUint8Array;
/**
 * The helper that transforms bytes with specific character encoding into string
 * @param bytes - the uint8array bytes
 * @param format - the format we use to encode the byte
 * @returns a string of the encoded string
 */
function uint8ArrayToString(bytes, format) {
    return Buffer.from(bytes).toString(format);
}
/**
 * The helper that transforms string to specific character encoded bytes array.
 * @param value - the string to be converted
 * @param format - the format we use to decode the value
 * @returns a uint8array
 */
function stringToUint8Array(value, format) {
    return Buffer.from(value, format);
}
//# sourceMappingURL=bytesEncoding.js.map
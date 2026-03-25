"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
Object.defineProperty(exports, "__esModule", { value: true });
exports.decodeStringToString = exports.decodeString = exports.encodeByteArray = exports.encodeString = void 0;
/**
 * Encodes a string in base64 format.
 * @param value - the string to encode
 * @internal
 */
function encodeString(value) {
    return Buffer.from(value).toString("base64");
}
exports.encodeString = encodeString;
/**
 * Encodes a byte array in base64 format.
 * @param value - the Uint8Aray to encode
 * @internal
 */
function encodeByteArray(value) {
    const bufferValue = value instanceof Buffer ? value : Buffer.from(value.buffer);
    return bufferValue.toString("base64");
}
exports.encodeByteArray = encodeByteArray;
/**
 * Decodes a base64 string into a byte array.
 * @param value - the base64 string to decode
 * @internal
 */
function decodeString(value) {
    return Buffer.from(value, "base64");
}
exports.decodeString = decodeString;
/**
 * Decodes a base64 string into a string.
 * @param value - the base64 string to decode
 * @internal
 */
function decodeStringToString(value) {
    return Buffer.from(value, "base64").toString();
}
exports.decodeStringToString = decodeStringToString;
//# sourceMappingURL=base64.js.map
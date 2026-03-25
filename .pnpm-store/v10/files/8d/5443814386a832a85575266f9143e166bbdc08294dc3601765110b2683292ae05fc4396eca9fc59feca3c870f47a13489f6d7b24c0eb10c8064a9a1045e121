// Copyright (c) Microsoft Corporation.
// Licensed under the MIT license.
/**
 * Encodes a string in base64 format.
 * @param value - the string to encode
 * @internal
 */
export function encodeString(value) {
    return Buffer.from(value).toString("base64");
}
/**
 * Encodes a byte array in base64 format.
 * @param value - the Uint8Aray to encode
 * @internal
 */
export function encodeByteArray(value) {
    const bufferValue = value instanceof Buffer ? value : Buffer.from(value.buffer);
    return bufferValue.toString("base64");
}
/**
 * Decodes a base64 string into a byte array.
 * @param value - the base64 string to decode
 * @internal
 */
export function decodeString(value) {
    return Buffer.from(value, "base64");
}
/**
 * Decodes a base64 string into a string.
 * @param value - the base64 string to decode
 * @internal
 */
export function decodeStringToString(value) {
    return Buffer.from(value, "base64").toString();
}
//# sourceMappingURL=base64.js.map
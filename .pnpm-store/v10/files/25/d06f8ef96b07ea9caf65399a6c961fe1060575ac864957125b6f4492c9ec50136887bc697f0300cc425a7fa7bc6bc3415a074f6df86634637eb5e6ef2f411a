"use strict";
// Copyright (c) Microsoft Corporation.
// Licensed under the MIT License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.uint8ArrayToString = uint8ArrayToString;
exports.stringToUint8Array = stringToUint8Array;
exports.uint8ArrayToBase64 = uint8ArrayToBase64;
exports.uint8ArrayToBase64Url = uint8ArrayToBase64Url;
exports.uint8ArrayToUtf8String = uint8ArrayToUtf8String;
exports.uint8ArrayToHexString = uint8ArrayToHexString;
exports.utf8StringToUint8Array = utf8StringToUint8Array;
exports.base64ToUint8Array = base64ToUint8Array;
exports.base64UrlToUint8Array = base64UrlToUint8Array;
exports.hexStringToUint8Array = hexStringToUint8Array;
/**
 * The helper that transforms bytes with specific character encoding into string
 * @param bytes - the uint8array bytes
 * @param format - the format we use to encode the byte
 * @returns a string of the encoded string
 */
function uint8ArrayToString(bytes, format) {
    switch (format) {
        case "utf-8":
            return uint8ArrayToUtf8String(bytes);
        case "base64":
            return uint8ArrayToBase64(bytes);
        case "base64url":
            return uint8ArrayToBase64Url(bytes);
        case "hex":
            return uint8ArrayToHexString(bytes);
    }
}
/**
 * The helper that transforms string to specific character encoded bytes array.
 * @param value - the string to be converted
 * @param format - the format we use to decode the value
 * @returns a uint8array
 */
function stringToUint8Array(value, format) {
    switch (format) {
        case "utf-8":
            return utf8StringToUint8Array(value);
        case "base64":
            return base64ToUint8Array(value);
        case "base64url":
            return base64UrlToUint8Array(value);
        case "hex":
            return hexStringToUint8Array(value);
    }
}
/**
 * Decodes a Uint8Array into a Base64 string.
 * @internal
 */
function uint8ArrayToBase64(bytes) {
    return btoa([...bytes].map((x) => String.fromCharCode(x)).join(""));
}
/**
 * Decodes a Uint8Array into a Base64Url string.
 * @internal
 */
function uint8ArrayToBase64Url(bytes) {
    return uint8ArrayToBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=/g, "");
}
/**
 * Decodes a Uint8Array into a javascript string.
 * @internal
 */
function uint8ArrayToUtf8String(bytes) {
    const decoder = new TextDecoder();
    const dataString = decoder.decode(bytes);
    return dataString;
}
/**
 * Decodes a Uint8Array into a hex string
 * @internal
 */
function uint8ArrayToHexString(bytes) {
    return [...bytes].map((x) => x.toString(16).padStart(2, "0")).join("");
}
/**
 * Encodes a JavaScript string into a Uint8Array.
 * @internal
 */
function utf8StringToUint8Array(value) {
    return new TextEncoder().encode(value);
}
/**
 * Encodes a Base64 string into a Uint8Array.
 * @internal
 */
function base64ToUint8Array(value) {
    return new Uint8Array([...atob(value)].map((x) => x.charCodeAt(0)));
}
/**
 * Encodes a Base64Url string into a Uint8Array.
 * @internal
 */
function base64UrlToUint8Array(value) {
    const base64String = value.replace(/-/g, "+").replace(/_/g, "/");
    return base64ToUint8Array(base64String);
}
const hexDigits = new Set("0123456789abcdefABCDEF");
/**
 * Encodes a hex string into a Uint8Array
 * @internal
 */
function hexStringToUint8Array(value) {
    // If value has odd length, the last character will be ignored, consistent with NodeJS Buffer behavior
    const bytes = new Uint8Array(value.length / 2);
    for (let i = 0; i < value.length / 2; ++i) {
        const highNibble = value[2 * i];
        const lowNibble = value[2 * i + 1];
        if (!hexDigits.has(highNibble) || !hexDigits.has(lowNibble)) {
            // Replicate Node Buffer behavior by exiting early when we encounter an invalid byte
            return bytes.slice(0, i);
        }
        bytes[i] = parseInt(`${highNibble}${lowNibble}`, 16);
    }
    return bytes;
}
//# sourceMappingURL=bytesEncoding.common.js.map
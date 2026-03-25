/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Class which exposes APIs to encode plaintext to base64 encoded string. See here for implementation details:
 * https://developer.mozilla.org/en-US/docs/Web/API/WindowBase64/Base64_encoding_and_decoding#Solution_2_%E2%80%93_JavaScript's_UTF-16_%3E_UTF-8_%3E_base64
 */
/**
 * Returns URL Safe b64 encoded string from a plaintext string.
 * @param input
 */
function urlEncode(input) {
    return encodeURIComponent(base64Encode(input)
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_"));
}
/**
 * Returns URL Safe b64 encoded string from an int8Array.
 * @param inputArr
 */
function urlEncodeArr(inputArr) {
    return base64EncArr(inputArr)
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}
/**
 * Returns b64 encoded string from plaintext string.
 * @param input
 */
function base64Encode(input) {
    return base64EncArr(new TextEncoder().encode(input));
}
/**
 * Base64 encode byte array
 * @param aBytes
 */
function base64EncArr(aBytes) {
    const binString = Array.from(aBytes, (x) => String.fromCodePoint(x)).join("");
    return btoa(binString);
}

export { base64Encode, urlEncode, urlEncodeArr };
//# sourceMappingURL=Base64Encode.mjs.map

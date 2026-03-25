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
export function urlEncode(input: string): string {
    return encodeURIComponent(
        base64Encode(input)
            .replace(/=/g, "")
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
    );
}

/**
 * Returns URL Safe b64 encoded string from an int8Array.
 * @param inputArr
 */
export function urlEncodeArr(inputArr: Uint8Array): string {
    return base64EncArr(inputArr)
        .replace(/=/g, "")
        .replace(/\+/g, "-")
        .replace(/\//g, "_");
}

/**
 * Returns b64 encoded string from plaintext string.
 * @param input
 */
export function base64Encode(input: string): string {
    return base64EncArr(new TextEncoder().encode(input));
}

/**
 * Base64 encode byte array
 * @param aBytes
 */
function base64EncArr(aBytes: Uint8Array): string {
    const binString = Array.from(aBytes, (x) => String.fromCodePoint(x)).join(
        ""
    );
    return btoa(binString);
}

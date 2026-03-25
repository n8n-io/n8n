/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    BrowserAuthErrorCodes,
    createBrowserAuthError,
} from "../error/BrowserAuthError.js";

/**
 * Class which exposes APIs to decode base64 strings to plaintext. See here for implementation details:
 * https://developer.mozilla.org/en-US/docs/Glossary/Base64#the_unicode_problem
 */

/**
 * Returns a URL-safe plaintext decoded string from b64 encoded input.
 * @param input
 */
export function base64Decode(input: string): string {
    return new TextDecoder().decode(base64DecToArr(input));
}

/**
 * Decodes base64 into Uint8Array
 * @param base64String
 */
export function base64DecToArr(base64String: string): Uint8Array {
    let encodedString = base64String.replace(/-/g, "+").replace(/_/g, "/");
    switch (encodedString.length % 4) {
        case 0:
            break;
        case 2:
            encodedString += "==";
            break;
        case 3:
            encodedString += "=";
            break;
        default:
            throw createBrowserAuthError(
                BrowserAuthErrorCodes.invalidBase64String
            );
    }
    const binString = atob(encodedString);
    return Uint8Array.from(binString, (m) => m.codePointAt(0) || 0);
}

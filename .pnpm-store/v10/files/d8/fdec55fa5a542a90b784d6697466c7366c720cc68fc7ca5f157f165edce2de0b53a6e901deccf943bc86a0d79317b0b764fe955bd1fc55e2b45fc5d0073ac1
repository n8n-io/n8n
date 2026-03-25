/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthorizeResponse } from "../response/AuthorizeResponse.js";
import {
    ClientAuthErrorCodes,
    createClientAuthError,
} from "../error/ClientAuthError.js";
import { StringDict } from "./MsalTypes.js";
import { StringUtils } from "./StringUtils.js";

/**
 * Canonicalizes a URL by making it lowercase and ensuring it ends with /
 * Inlined version of UrlString.canonicalizeUri to avoid circular dependency
 * @param url - URL to canonicalize
 * @returns Canonicalized URL
 */
function canonicalizeUrl(url: string): string {
    if (!url) {
        return url;
    }

    let lowerCaseUrl = url.toLowerCase();

    if (StringUtils.endsWith(lowerCaseUrl, "?")) {
        lowerCaseUrl = lowerCaseUrl.slice(0, -1);
    } else if (StringUtils.endsWith(lowerCaseUrl, "?/")) {
        lowerCaseUrl = lowerCaseUrl.slice(0, -2);
    }

    if (!StringUtils.endsWith(lowerCaseUrl, "/")) {
        lowerCaseUrl += "/";
    }

    return lowerCaseUrl;
}

/**
 * Parses hash string from given string. Returns empty string if no hash symbol is found.
 * @param hashString
 */
export function stripLeadingHashOrQuery(responseString: string): string {
    if (responseString.startsWith("#/")) {
        return responseString.substring(2);
    } else if (
        responseString.startsWith("#") ||
        responseString.startsWith("?")
    ) {
        return responseString.substring(1);
    }

    return responseString;
}

/**
 * Returns URL hash as server auth code response object.
 */
export function getDeserializedResponse(
    responseString: string
): AuthorizeResponse | null {
    // Check if given hash is empty
    if (!responseString || responseString.indexOf("=") < 0) {
        return null;
    }
    try {
        // Strip the # or ? symbol if present
        const normalizedResponse = stripLeadingHashOrQuery(responseString);
        // If # symbol was not present, above will return empty string, so give original hash value
        const deserializedHash: AuthorizeResponse = Object.fromEntries(
            new URLSearchParams(normalizedResponse)
        );

        // Check for known response properties
        if (
            deserializedHash.code ||
            deserializedHash.ear_jwe ||
            deserializedHash.error ||
            deserializedHash.error_description ||
            deserializedHash.state
        ) {
            return deserializedHash;
        }
    } catch (e) {
        throw createClientAuthError(ClientAuthErrorCodes.hashNotDeserialized);
    }

    return null;
}

/**
 * Utility to create a URL from the params map
 */
export function mapToQueryString(
    parameters: Map<string, string>,
    encodeExtraParams: boolean = true,
    extraQueryParameters?: StringDict
): string {
    const queryParameterArray: Array<string> = new Array<string>();

    parameters.forEach((value, key) => {
        if (
            !encodeExtraParams &&
            extraQueryParameters &&
            key in extraQueryParameters
        ) {
            queryParameterArray.push(`${key}=${value}`);
        } else {
            queryParameterArray.push(`${key}=${encodeURIComponent(value)}`);
        }
    });

    return queryParameterArray.join("&");
}

/**
 * Normalizes URLs for comparison by removing hash, canonicalizing,
 * and ensuring consistent URL encoding in query parameters.
 * This fixes redirect loops when URLs contain encoded characters like apostrophes (%27).
 * @param url - URL to normalize
 * @returns Normalized URL string for comparison
 */
export function normalizeUrlForComparison(url: string): string {
    if (!url) {
        return url;
    }

    // Remove hash first
    const urlWithoutHash = url.split("#")[0];

    try {
        // Parse the URL to handle encoding consistently
        const urlObj = new URL(urlWithoutHash);

        /*
         * Reconstruct the URL with properly decoded query parameters
         * This ensures that %27 and ' are treated as equivalent
         */
        const normalizedUrl = urlObj.origin + urlObj.pathname + urlObj.search;

        // Apply canonicalization logic inline to avoid circular dependency
        return canonicalizeUrl(normalizedUrl);
    } catch (e) {
        // Fallback to original logic if URL parsing fails
        return canonicalizeUrl(urlWithoutHash);
    }
}

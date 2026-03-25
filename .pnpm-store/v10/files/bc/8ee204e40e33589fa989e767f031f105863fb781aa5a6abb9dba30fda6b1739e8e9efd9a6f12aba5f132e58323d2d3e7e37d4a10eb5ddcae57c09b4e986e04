/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { ParsedUrlError } from '../error/ParsedUrlError.mjs';
import { InvalidUrl } from '../error/ParsedUrlErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
function parseUrl(url) {
    try {
        return new URL(url);
    }
    catch (e) {
        throw new ParsedUrlError(InvalidUrl, `The URL "${url}" is invalid: ${e}`);
    }
}
function buildUrl(baseUrl, path, queryParams) {
    const newBaseUrl = !baseUrl.endsWith("/") ? `${baseUrl}/` : baseUrl;
    const newPath = path.startsWith("/") ? path.slice(1) : path;
    const url = new URL(newPath, newBaseUrl);
    // Add query parameters if provided
    if (queryParams) {
        Object.entries(queryParams).forEach(([key, value]) => {
            if (value !== undefined && value !== null) {
                url.searchParams.set(key, String(value));
            }
        });
    }
    return url;
}

export { buildUrl, parseUrl };
//# sourceMappingURL=UrlUtils.mjs.map

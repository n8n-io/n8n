/*! @azure/msal-node v3.8.4 2025-12-04 */
'use strict';
/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class NetworkUtils {
    static getNetworkResponse(headers, body, statusCode) {
        return {
            headers: headers,
            body: body,
            status: statusCode,
        };
    }
    /*
     * Utility function that converts a URL object into an ordinary options object as expected by the
     * http.request and https.request APIs.
     * https://github.com/nodejs/node/blob/main/lib/internal/url.js#L1090
     */
    static urlToHttpOptions(url) {
        const options = {
            protocol: url.protocol,
            hostname: url.hostname && url.hostname.startsWith("[")
                ? url.hostname.slice(1, -1)
                : url.hostname,
            hash: url.hash,
            search: url.search,
            pathname: url.pathname,
            path: `${url.pathname || ""}${url.search || ""}`,
            href: url.href,
        };
        if (url.port !== "") {
            options.port = Number(url.port);
        }
        if (url.username || url.password) {
            options.auth = `${decodeURIComponent(url.username)}:${decodeURIComponent(url.password)}`;
        }
        return options;
    }
}

export { NetworkUtils };
//# sourceMappingURL=NetworkUtils.mjs.map

/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { createNetworkError } from '@azure/msal-common/browser';
import { createBrowserAuthError } from '../error/BrowserAuthError.mjs';
import { HTTP_REQUEST_TYPE } from '../utils/BrowserConstants.mjs';
import { getRequestFailed, noNetworkConnectivity, failedToParseResponse, postRequestFailed, failedToBuildHeaders, failedToParseHeaders } from '../error/BrowserAuthErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * This class implements the Fetch API for GET and POST requests. See more here: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 */
class FetchClient {
    /**
     * Fetch Client for REST endpoints - Get request
     * @param url
     * @param headers
     * @param body
     */
    async sendGetRequestAsync(url, options) {
        let response;
        let responseHeaders = {};
        let responseStatus = 0;
        const reqHeaders = getFetchHeaders(options);
        try {
            response = await fetch(url, {
                method: HTTP_REQUEST_TYPE.GET,
                headers: reqHeaders,
            });
        }
        catch (e) {
            throw createNetworkError(createBrowserAuthError(window.navigator.onLine
                ? getRequestFailed
                : noNetworkConnectivity), undefined, undefined, e);
        }
        responseHeaders = getHeaderDict(response.headers);
        try {
            responseStatus = response.status;
            return {
                headers: responseHeaders,
                body: (await response.json()),
                status: responseStatus,
            };
        }
        catch (e) {
            throw createNetworkError(createBrowserAuthError(failedToParseResponse), responseStatus, responseHeaders, e);
        }
    }
    /**
     * Fetch Client for REST endpoints - Post request
     * @param url
     * @param headers
     * @param body
     */
    async sendPostRequestAsync(url, options) {
        const reqBody = (options && options.body) || "";
        const reqHeaders = getFetchHeaders(options);
        let response;
        let responseStatus = 0;
        let responseHeaders = {};
        try {
            response = await fetch(url, {
                method: HTTP_REQUEST_TYPE.POST,
                headers: reqHeaders,
                body: reqBody,
            });
        }
        catch (e) {
            throw createNetworkError(createBrowserAuthError(window.navigator.onLine
                ? postRequestFailed
                : noNetworkConnectivity), undefined, undefined, e);
        }
        responseHeaders = getHeaderDict(response.headers);
        try {
            responseStatus = response.status;
            return {
                headers: responseHeaders,
                body: (await response.json()),
                status: responseStatus,
            };
        }
        catch (e) {
            throw createNetworkError(createBrowserAuthError(failedToParseResponse), responseStatus, responseHeaders, e);
        }
    }
}
/**
 * Get Fetch API Headers object from string map
 * @param inputHeaders
 */
function getFetchHeaders(options) {
    try {
        const headers = new Headers();
        if (!(options && options.headers)) {
            return headers;
        }
        const optionsHeaders = options.headers;
        Object.entries(optionsHeaders).forEach(([key, value]) => {
            headers.append(key, value);
        });
        return headers;
    }
    catch (e) {
        throw createNetworkError(createBrowserAuthError(failedToBuildHeaders), undefined, undefined, e);
    }
}
/**
 * Returns object representing response headers
 * @param headers
 * @returns
 */
function getHeaderDict(headers) {
    try {
        const headerDict = {};
        headers.forEach((value, key) => {
            headerDict[key] = value;
        });
        return headerDict;
    }
    catch (e) {
        throw createBrowserAuthError(failedToParseHeaders);
    }
}

export { FetchClient };
//# sourceMappingURL=FetchClient.mjs.map

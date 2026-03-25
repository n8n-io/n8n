/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    INetworkModule,
    NetworkRequestOptions,
    NetworkResponse,
    createNetworkError,
} from "@azure/msal-common/browser";
import {
    createBrowserAuthError,
    BrowserAuthErrorCodes,
} from "../error/BrowserAuthError.js";
import { HTTP_REQUEST_TYPE } from "../utils/BrowserConstants.js";

/**
 * This class implements the Fetch API for GET and POST requests. See more here: https://developer.mozilla.org/en-US/docs/Web/API/Fetch_API
 */
export class FetchClient implements INetworkModule {
    /**
     * Fetch Client for REST endpoints - Get request
     * @param url
     * @param headers
     * @param body
     */
    async sendGetRequestAsync<T>(
        url: string,
        options?: NetworkRequestOptions
    ): Promise<NetworkResponse<T>> {
        let response: Response;
        let responseHeaders: Record<string, string> = {};
        let responseStatus = 0;
        const reqHeaders = getFetchHeaders(options);
        try {
            response = await fetch(url, {
                method: HTTP_REQUEST_TYPE.GET,
                headers: reqHeaders,
            });
        } catch (e) {
            throw createNetworkError(
                createBrowserAuthError(
                    window.navigator.onLine
                        ? BrowserAuthErrorCodes.getRequestFailed
                        : BrowserAuthErrorCodes.noNetworkConnectivity
                ),
                undefined,
                undefined,
                e as Error
            );
        }

        responseHeaders = getHeaderDict(response.headers);
        try {
            responseStatus = response.status;
            return {
                headers: responseHeaders,
                body: (await response.json()) as T,
                status: responseStatus,
            };
        } catch (e) {
            throw createNetworkError(
                createBrowserAuthError(
                    BrowserAuthErrorCodes.failedToParseResponse
                ),
                responseStatus,
                responseHeaders,
                e as Error
            );
        }
    }

    /**
     * Fetch Client for REST endpoints - Post request
     * @param url
     * @param headers
     * @param body
     */
    async sendPostRequestAsync<T>(
        url: string,
        options?: NetworkRequestOptions
    ): Promise<NetworkResponse<T>> {
        const reqBody = (options && options.body) || "";
        const reqHeaders = getFetchHeaders(options);

        let response: Response;
        let responseStatus = 0;
        let responseHeaders: Record<string, string> = {};
        try {
            response = await fetch(url, {
                method: HTTP_REQUEST_TYPE.POST,
                headers: reqHeaders,
                body: reqBody,
            });
        } catch (e) {
            throw createNetworkError(
                createBrowserAuthError(
                    window.navigator.onLine
                        ? BrowserAuthErrorCodes.postRequestFailed
                        : BrowserAuthErrorCodes.noNetworkConnectivity
                ),
                undefined,
                undefined,
                e as Error
            );
        }

        responseHeaders = getHeaderDict(response.headers);
        try {
            responseStatus = response.status;
            return {
                headers: responseHeaders,
                body: (await response.json()) as T,
                status: responseStatus,
            };
        } catch (e) {
            throw createNetworkError(
                createBrowserAuthError(
                    BrowserAuthErrorCodes.failedToParseResponse
                ),
                responseStatus,
                responseHeaders,
                e as Error
            );
        }
    }
}

/**
 * Get Fetch API Headers object from string map
 * @param inputHeaders
 */
function getFetchHeaders(options?: NetworkRequestOptions): Headers {
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
    } catch (e) {
        throw createNetworkError(
            createBrowserAuthError(BrowserAuthErrorCodes.failedToBuildHeaders),
            undefined,
            undefined,
            e as Error
        );
    }
}

/**
 * Returns object representing response headers
 * @param headers
 * @returns
 */
function getHeaderDict(headers: Headers): Record<string, string> {
    try {
        const headerDict: Record<string, string> = {};
        headers.forEach((value: string, key: string) => {
            headerDict[key] = value;
        });
        return headerDict;
    } catch (e) {
        throw createBrowserAuthError(
            BrowserAuthErrorCodes.failedToParseHeaders
        );
    }
}

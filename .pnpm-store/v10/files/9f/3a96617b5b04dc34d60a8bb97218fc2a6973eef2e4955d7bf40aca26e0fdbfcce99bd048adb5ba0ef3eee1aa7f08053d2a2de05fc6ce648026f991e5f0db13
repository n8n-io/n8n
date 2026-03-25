/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { HttpMethod } from './IHttpClient.mjs';
import { HttpError } from '../../error/HttpError.mjs';
import { AADServerParamKeys } from '@azure/msal-common/browser';
import { NoNetworkConnectivity, FailedSendRequest } from '../../error/HttpErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Implementation of IHttpClient using fetch.
 */
class FetchHttpClient {
    constructor(logger) {
        this.logger = logger;
    }
    async sendAsync(url, options) {
        const headers = options.headers;
        const correlationId = headers?.[AADServerParamKeys.CLIENT_REQUEST_ID] || undefined;
        try {
            this.logger.verbosePii(`Sending request to ${url}`, correlationId);
            const startTime = performance.now();
            const response = await fetch(url, options);
            const endTime = performance.now();
            this.logger.verbosePii(`Request to '${url}' completed in ${endTime - startTime}ms with status code ${response.status}`, correlationId);
            return response;
        }
        catch (e) {
            this.logger.errorPii(`Failed to send request to ${url}: ${e}`, correlationId);
            if (!window.navigator.onLine) {
                throw new HttpError(NoNetworkConnectivity, `No network connectivity: ${e}`, correlationId);
            }
            throw new HttpError(FailedSendRequest, `Failed to send request: ${e}`, correlationId);
        }
    }
    async post(url, body, headers = {}) {
        return this.sendAsync(url, {
            method: HttpMethod.POST,
            headers,
            body,
        });
    }
    async get(url, headers = {}) {
        return this.sendAsync(url, {
            method: HttpMethod.GET,
            headers,
        });
    }
}

export { FetchHttpClient };
//# sourceMappingURL=FetchHttpClient.mjs.map

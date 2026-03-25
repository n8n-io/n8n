/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { HttpMethod, IHttpClient, RequestBody } from "./IHttpClient.js";
import { HttpError } from "../../error/HttpError.js";
import { AADServerParamKeys, Logger } from "@azure/msal-common/browser";
import {
    FailedSendRequest,
    NoNetworkConnectivity,
} from "../../error/HttpErrorCodes.js";

/**
 * Implementation of IHttpClient using fetch.
 */
export class FetchHttpClient implements IHttpClient {
    constructor(private logger: Logger) {}

    async sendAsync(
        url: string | URL,
        options: RequestInit
    ): Promise<Response> {
        const headers = options.headers as Record<string, string>;
        const correlationId =
            headers?.[AADServerParamKeys.CLIENT_REQUEST_ID] || undefined;

        try {
            this.logger.verbosePii(`Sending request to ${url}`, correlationId);

            const startTime = performance.now();
            const response = await fetch(url, options);
            const endTime = performance.now();

            this.logger.verbosePii(
                `Request to '${url}' completed in ${
                    endTime - startTime
                }ms with status code ${response.status}`,
                correlationId
            );

            return response;
        } catch (e) {
            this.logger.errorPii(
                `Failed to send request to ${url}: ${e}`,
                correlationId
            );

            if (!window.navigator.onLine) {
                throw new HttpError(
                    NoNetworkConnectivity,
                    `No network connectivity: ${e}`,
                    correlationId
                );
            }

            throw new HttpError(
                FailedSendRequest,
                `Failed to send request: ${e}`,
                correlationId
            );
        }
    }

    async post(
        url: string | URL,
        body: RequestBody,
        headers: Record<string, string> = {}
    ): Promise<Response> {
        return this.sendAsync(url, {
            method: HttpMethod.POST,
            headers,
            body,
        });
    }

    async get(
        url: string | URL,
        headers: Record<string, string> = {}
    ): Promise<Response> {
        return this.sendAsync(url, {
            method: HttpMethod.GET,
            headers,
        });
    }
}

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { IncomingHttpHeaders } from "http";
import { Logger } from "@azure/msal-common";

export interface IHttpRetryPolicy {
    _isNewRequest?: boolean;
    // set isNewRequest(value: boolean);

    /**
     * Pauses execution for a specified amount of time before retrying an HTTP request.
     *
     * @param httpStatusCode - The HTTP status code of the response.
     * @param currentRetry - The current retry attempt number.
     * @param retryAfterHeader - The value of the `retry-after` HTTP header, if present.
     * @returns A promise that resolves to a boolean indicating whether to retry the request.
     */
    pauseForRetry(
        httpStatusCode: number,
        currentRetry: number,
        logger: Logger,
        retryAfterHeader?: IncomingHttpHeaders["retry-after"]
    ): Promise<boolean>;
}

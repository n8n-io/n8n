/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthError } from "./AuthError.js";

/**
 * Represents network related errors
 */
export class NetworkError extends AuthError {
    error: AuthError;
    httpStatus?: number;
    responseHeaders?: Record<string, string>;

    constructor(
        error: AuthError,
        httpStatus?: number,
        responseHeaders?: Record<string, string>
    ) {
        super(error.errorCode, error.errorMessage, error.subError);

        Object.setPrototypeOf(this, NetworkError.prototype);
        this.name = "NetworkError";
        this.error = error;
        this.httpStatus = httpStatus;
        this.responseHeaders = responseHeaders;
    }
}

/**
 * Creates NetworkError object for a failed network request
 * @param error - Error to be thrown back to the caller
 * @param httpStatus - Status code of the network request
 * @param responseHeaders - Response headers of the network request, when available
 * @returns NetworkError object
 */
export function createNetworkError(
    error: AuthError,
    httpStatus?: number,
    responseHeaders?: Record<string, string>,
    additionalError?: Error
): NetworkError {
    error.errorMessage = `${error.errorMessage}, additionalErrorInfo: error.name:${additionalError?.name}, error.message:${additionalError?.message}`;
    return new NetworkError(error, httpStatus, responseHeaders);
}

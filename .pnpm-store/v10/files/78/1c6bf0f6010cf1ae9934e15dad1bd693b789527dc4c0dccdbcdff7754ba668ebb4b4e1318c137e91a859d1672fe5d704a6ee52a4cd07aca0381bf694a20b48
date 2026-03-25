/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthError } from "./AuthError.js";

/**
 * Error thrown when there is an error with the server code, for example, unavailability.
 */
export class ServerError extends AuthError {
    /**
     * Server error number;
     */
    readonly errorNo?: string;

    /**
     * Http status number;
     */
    readonly status?: number;

    constructor(
        errorCode?: string,
        errorMessage?: string,
        subError?: string,
        errorNo?: string,
        status?: number
    ) {
        super(errorCode, errorMessage, subError);
        this.name = "ServerError";
        this.errorNo = errorNo;
        this.status = status;

        Object.setPrototypeOf(this, ServerError.prototype);
    }
}

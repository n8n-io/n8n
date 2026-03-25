/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CustomAuthError } from "./CustomAuthError.js";

export class MsalCustomAuthError extends CustomAuthError {
    constructor(
        error: string,
        errorDescription?: string,
        subError?: string,
        errorCodes?: Array<number>,
        correlationId?: string
    ) {
        super(error, errorDescription, correlationId, errorCodes, subError);
        Object.setPrototypeOf(this, MsalCustomAuthError.prototype);
    }
}

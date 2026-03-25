/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

export class CustomAuthError extends Error {
    constructor(
        public error: string,
        public errorDescription?: string,
        public correlationId?: string,
        public errorCodes?: Array<number>,
        public subError?: string
    ) {
        super(`${error}: ${errorDescription ?? ""}`);
        Object.setPrototypeOf(this, CustomAuthError.prototype);

        this.errorCodes = errorCodes ?? [];
        this.subError = subError ?? "";
    }
}

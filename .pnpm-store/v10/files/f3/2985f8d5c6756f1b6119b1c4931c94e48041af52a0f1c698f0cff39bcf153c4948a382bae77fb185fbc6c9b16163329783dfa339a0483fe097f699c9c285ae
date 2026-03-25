/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CustomAuthError } from "./CustomAuthError.js";

export class UnsupportedEnvironmentError extends CustomAuthError {
    constructor(correlationId?: string) {
        super(
            "unsupported_env",
            "The current environment is not browser",
            correlationId
        );
        Object.setPrototypeOf(this, UnsupportedEnvironmentError.prototype);
    }
}

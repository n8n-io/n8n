/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CustomAuthError } from "./CustomAuthError.js";

export class NoCachedAccountFoundError extends CustomAuthError {
    constructor(correlationId?: string) {
        super(
            "no_cached_account_found",
            "No account found in the cache",
            correlationId
        );
        Object.setPrototypeOf(this, NoCachedAccountFoundError.prototype);
    }
}

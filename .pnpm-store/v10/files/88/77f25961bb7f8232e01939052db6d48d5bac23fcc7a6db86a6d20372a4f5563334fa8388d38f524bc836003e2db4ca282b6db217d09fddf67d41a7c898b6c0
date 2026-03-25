/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CustomAuthError } from "./CustomAuthError.js";

export class UserAlreadySignedInError extends CustomAuthError {
    constructor(correlationId?: string) {
        super(
            "user_already_signed_in",
            "The user has already signed in.",
            correlationId
        );
        Object.setPrototypeOf(this, UserAlreadySignedInError.prototype);
    }
}

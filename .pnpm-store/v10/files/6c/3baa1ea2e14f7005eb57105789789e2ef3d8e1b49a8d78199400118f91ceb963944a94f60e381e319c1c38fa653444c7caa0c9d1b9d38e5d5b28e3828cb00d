/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CustomAuthError } from "./CustomAuthError.js";

export class InvalidArgumentError extends CustomAuthError {
    constructor(argName: string, correlationId?: string) {
        const errorDescription = `The argument '${argName}' is invalid.`;

        super("invalid_argument", errorDescription, correlationId);
        Object.setPrototypeOf(this, InvalidArgumentError.prototype);
    }
}

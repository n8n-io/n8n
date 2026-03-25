/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CustomAuthError } from "./CustomAuthError.js";

export class MethodNotImplementedError extends CustomAuthError {
    constructor(method: string, correlationId?: string) {
        const errorDescription = `The method '${method}' is not implemented, please do not use.`;

        super("method_not_implemented", errorDescription, correlationId);
        Object.setPrototypeOf(this, MethodNotImplementedError.prototype);
    }
}

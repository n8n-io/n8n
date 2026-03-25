/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CustomAuthError } from "./CustomAuthError.js";

export class UserAccountAttributeError extends CustomAuthError {
    constructor(error: string, attributeName: string, attributeValue: string) {
        const errorDescription = `Failed to set attribute '${attributeName}' with value '${attributeValue}'`;

        super(error, errorDescription);
        Object.setPrototypeOf(this, UserAccountAttributeError.prototype);
    }
}

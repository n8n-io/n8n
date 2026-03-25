/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthError } from "./AuthError.js";
import * as JoseHeaderErrorCodes from "./JoseHeaderErrorCodes.js";
export { JoseHeaderErrorCodes };

export const JoseHeaderErrorMessages = {
    [JoseHeaderErrorCodes.missingKidError]:
        "The JOSE Header for the requested JWT, JWS or JWK object requires a keyId to be configured as the 'kid' header claim. No 'kid' value was provided.",
    [JoseHeaderErrorCodes.missingAlgError]:
        "The JOSE Header for the requested JWT, JWS or JWK object requires an algorithm to be specified as the 'alg' header claim. No 'alg' value was provided.",
};

/**
 * Error thrown when there is an error in the client code running on the browser.
 */
export class JoseHeaderError extends AuthError {
    constructor(errorCode: string, errorMessage?: string) {
        super(errorCode, errorMessage);
        this.name = "JoseHeaderError";

        Object.setPrototypeOf(this, JoseHeaderError.prototype);
    }
}

/** Returns JoseHeaderError object */
export function createJoseHeaderError(code: string): JoseHeaderError {
    return new JoseHeaderError(code, JoseHeaderErrorMessages[code]);
}

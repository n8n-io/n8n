/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthError } from '@azure/msal-common/browser';
import { CustomAuthError } from '../error/CustomAuthError.mjs';
import { MsalCustomAuthError } from '../error/MsalCustomAuthError.mjs';
import { UnexpectedError } from '../error/UnexpectedError.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Base class for a result of an authentication operation.
 * @typeParam TState - The type of the auth flow state.
 * @typeParam TError - The type of error.
 * @typeParam TData - The type of the result data.
 */
class AuthFlowResultBase {
    /*
     *constructor for ResultBase
     * @param state - The state.
     * @param data - The result data.
     */
    constructor(state, data) {
        this.state = state;
        this.data = data;
    }
    /*
     * Creates a CustomAuthError with an error.
     * @param error - The error that occurred.
     * @returns The auth error.
     */
    static createErrorData(error) {
        if (error instanceof CustomAuthError) {
            return error;
        }
        else if (error instanceof AuthError) {
            const errorCodes = [];
            if ("errorNo" in error) {
                if (typeof error.errorNo === "string") {
                    const code = Number(error.errorNo);
                    if (!isNaN(code)) {
                        errorCodes.push(code);
                    }
                }
                else if (typeof error.errorNo === "number") {
                    errorCodes.push(error.errorNo);
                }
            }
            return new MsalCustomAuthError(error.errorCode, error.errorMessage, error.subError, errorCodes, error.correlationId);
        }
        else {
            return new UnexpectedError(error);
        }
    }
}

export { AuthFlowResultBase };
//# sourceMappingURL=AuthFlowResultBase.mjs.map

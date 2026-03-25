/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthError } from "@azure/msal-common/browser";
import { CustomAuthError } from "../error/CustomAuthError.js";
import { MsalCustomAuthError } from "../error/MsalCustomAuthError.js";
import { UnexpectedError } from "../error/UnexpectedError.js";
import { AuthFlowErrorBase } from "./AuthFlowErrorBase.js";
import { AuthFlowStateBase } from "./AuthFlowState.js";

/*
 * Base class for a result of an authentication operation.
 * @typeParam TState - The type of the auth flow state.
 * @typeParam TError - The type of error.
 * @typeParam TData - The type of the result data.
 */
export abstract class AuthFlowResultBase<
    TState extends AuthFlowStateBase,
    TError extends AuthFlowErrorBase,
    TData = void
> {
    /*
     *constructor for ResultBase
     * @param state - The state.
     * @param data - The result data.
     */
    constructor(public state: TState, public data?: TData) {}

    /*
     * The error that occurred during the authentication operation.
     */
    error?: TError;

    /*
     * Creates a CustomAuthError with an error.
     * @param error - The error that occurred.
     * @returns The auth error.
     */
    protected static createErrorData(error: unknown): CustomAuthError {
        if (error instanceof CustomAuthError) {
            return error;
        } else if (error instanceof AuthError) {
            const errorCodes: Array<number> = [];

            if ("errorNo" in error) {
                if (typeof error.errorNo === "string") {
                    const code = Number(error.errorNo);
                    if (!isNaN(code)) {
                        errorCodes.push(code);
                    }
                } else if (typeof error.errorNo === "number") {
                    errorCodes.push(error.errorNo);
                }
            }

            return new MsalCustomAuthError(
                error.errorCode,
                error.errorMessage,
                error.subError,
                errorCodes,
                error.correlationId
            );
        } else {
            return new UnexpectedError(error);
        }
    }
}

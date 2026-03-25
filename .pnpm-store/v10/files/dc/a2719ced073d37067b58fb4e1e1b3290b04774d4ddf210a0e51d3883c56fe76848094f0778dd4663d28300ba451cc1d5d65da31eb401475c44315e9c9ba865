/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import {
    SIGN_IN_CODE_REQUIRED_STATE_TYPE,
    SIGN_IN_FAILED_STATE_TYPE,
} from "../../../core/auth_flow/AuthFlowStateTypes.js";
import { SignInResendCodeError } from "../error_type/SignInError.js";
import type { SignInCodeRequiredState } from "../state/SignInCodeRequiredState.js";
import { SignInFailedState } from "../state/SignInFailedState.js";

export class SignInResendCodeResult extends AuthFlowResultBase<
    SignInResendCodeResultState,
    SignInResendCodeError,
    void
> {
    /**
     * Creates a new instance of SignInResendCodeResult.
     * @param state The state of the result.
     */
    constructor(state: SignInResendCodeResultState) {
        super(state);
    }

    /**
     * Creates a new instance of SignInResendCodeResult with an error.
     * @param error The error that occurred.
     * @returns {SignInResendCodeResult} A new instance of SignInResendCodeResult with the error set.
     */
    static createWithError(error: unknown): SignInResendCodeResult {
        const result = new SignInResendCodeResult(new SignInFailedState());
        result.error = new SignInResendCodeError(
            SignInResendCodeResult.createErrorData(error)
        );

        return result;
    }

    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is SignInResendCodeResult & { state: SignInFailedState } {
        return this.state.stateType === SIGN_IN_FAILED_STATE_TYPE;
    }

    /**
     * Checks if the result is in a code required state.
     */
    isCodeRequired(): this is SignInResendCodeResult & {
        state: SignInCodeRequiredState;
    } {
        /*
         * The instanceof operator couldn't be used here to check the state type since the circular dependency issue.
         * So we are using the constructor name to check the state type.
         */
        return this.state.stateType === SIGN_IN_CODE_REQUIRED_STATE_TYPE;
    }
}

/**
 * The possible states for the SignInResendCodeResult.
 * This includes:
 * - SignInCodeRequiredState: The sign-in process requires a code.
 * - SignInFailedState: The sign-in process has failed.
 */
export type SignInResendCodeResultState =
    | SignInCodeRequiredState
    | SignInFailedState;

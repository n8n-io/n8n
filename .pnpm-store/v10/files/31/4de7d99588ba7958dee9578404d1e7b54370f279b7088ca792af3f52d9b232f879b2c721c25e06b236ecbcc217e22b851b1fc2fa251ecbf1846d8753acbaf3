/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { SignUpError } from "../error_type/SignUpError.js";
import { SignUpAttributesRequiredState } from "../state/SignUpAttributesRequiredState.js";
import { SignUpCodeRequiredState } from "../state/SignUpCodeRequiredState.js";
import { SignUpFailedState } from "../state/SignUpFailedState.js";
import { SignUpPasswordRequiredState } from "../state/SignUpPasswordRequiredState.js";
import {
    SIGN_UP_FAILED_STATE_TYPE,
    SIGN_UP_CODE_REQUIRED_STATE_TYPE,
    SIGN_UP_PASSWORD_REQUIRED_STATE_TYPE,
    SIGN_UP_ATTRIBUTES_REQUIRED_STATE_TYPE,
} from "../../../core/auth_flow/AuthFlowStateTypes.js";

/*
 * Result of a sign-up operation.
 */
export class SignUpResult extends AuthFlowResultBase<
    SignUpResultState,
    SignUpError,
    void
> {
    /**
     * Creates a new instance of SignUpResult.
     * @param state The state of the result.
     */
    constructor(state: SignUpResultState) {
        super(state);
    }

    /**
     * Creates a new instance of SignUpResult with an error.
     * @param error The error that occurred.
     * @returns {SignUpResult} A new instance of SignUpResult with the error set.
     */
    static createWithError(error: unknown): SignUpResult {
        const result = new SignUpResult(new SignUpFailedState());
        result.error = new SignUpError(SignUpResult.createErrorData(error));

        return result;
    }

    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is SignUpResult & { state: SignUpFailedState } {
        return this.state.stateType === SIGN_UP_FAILED_STATE_TYPE;
    }

    /**
     * Checks if the result is in a code required state.
     */
    isCodeRequired(): this is SignUpResult & {
        state: SignUpCodeRequiredState;
    } {
        return this.state.stateType === SIGN_UP_CODE_REQUIRED_STATE_TYPE;
    }

    /**
     * Checks if the result is in a password required state.
     */
    isPasswordRequired(): this is SignUpResult & {
        state: SignUpPasswordRequiredState;
    } {
        return this.state.stateType === SIGN_UP_PASSWORD_REQUIRED_STATE_TYPE;
    }

    /**
     * Checks if the result is in an attributes required state.
     */
    isAttributesRequired(): this is SignUpResult & {
        state: SignUpAttributesRequiredState;
    } {
        return this.state.stateType === SIGN_UP_ATTRIBUTES_REQUIRED_STATE_TYPE;
    }
}

/**
 * The possible states for the SignUpResult.
 * This includes:
 * - SignUpCodeRequiredState: The sign-up process requires a code.
 * - SignUpPasswordRequiredState: The sign-up process requires a password.
 * - SignUpAttributesRequiredState: The sign-up process requires additional attributes.
 * - SignUpFailedState: The sign-up process has failed.
 */
export type SignUpResultState =
    | SignUpCodeRequiredState
    | SignUpPasswordRequiredState
    | SignUpAttributesRequiredState
    | SignUpFailedState;

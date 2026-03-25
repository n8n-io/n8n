/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { SignUpSubmitCodeError } from "../error_type/SignUpError.js";
import { SignUpAttributesRequiredState } from "../state/SignUpAttributesRequiredState.js";
import { SignUpPasswordRequiredState } from "../state/SignUpPasswordRequiredState.js";
import { SignUpCompletedState } from "../state/SignUpCompletedState.js";
import { SignUpFailedState } from "../state/SignUpFailedState.js";
import {
    SIGN_UP_FAILED_STATE_TYPE,
    SIGN_UP_PASSWORD_REQUIRED_STATE_TYPE,
    SIGN_UP_ATTRIBUTES_REQUIRED_STATE_TYPE,
    SIGN_UP_COMPLETED_STATE_TYPE,
} from "../../../core/auth_flow/AuthFlowStateTypes.js";

/*
 * Result of a sign-up operation that requires a code.
 */
export class SignUpSubmitCodeResult extends AuthFlowResultBase<
    SignUpSubmitCodeResultState,
    SignUpSubmitCodeError,
    void
> {
    /**
     * Creates a new instance of SignUpSubmitCodeResult.
     * @param state The state of the result.
     */
    constructor(state: SignUpSubmitCodeResultState) {
        super(state);
    }

    /**
     * Creates a new instance of SignUpSubmitCodeResult with an error.
     * @param error The error that occurred.
     * @returns {SignUpSubmitCodeResult} A new instance of SignUpSubmitCodeResult with the error set.
     */
    static createWithError(error: unknown): SignUpSubmitCodeResult {
        const result = new SignUpSubmitCodeResult(new SignUpFailedState());
        result.error = new SignUpSubmitCodeError(
            SignUpSubmitCodeResult.createErrorData(error)
        );

        return result;
    }

    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is SignUpSubmitCodeResult & { state: SignUpFailedState } {
        return this.state.stateType === SIGN_UP_FAILED_STATE_TYPE;
    }

    /**
     * Checks if the result is in a password required state.
     */
    isPasswordRequired(): this is SignUpSubmitCodeResult & {
        state: SignUpPasswordRequiredState;
    } {
        return this.state.stateType === SIGN_UP_PASSWORD_REQUIRED_STATE_TYPE;
    }

    /**
     * Checks if the result is in an attributes required state.
     */
    isAttributesRequired(): this is SignUpSubmitCodeResult & {
        state: SignUpAttributesRequiredState;
    } {
        return this.state.stateType === SIGN_UP_ATTRIBUTES_REQUIRED_STATE_TYPE;
    }

    /**
     * Checks if the result is in a completed state.
     */
    isCompleted(): this is SignUpSubmitCodeResult & {
        state: SignUpCompletedState;
    } {
        return this.state.stateType === SIGN_UP_COMPLETED_STATE_TYPE;
    }
}

/**
 * The possible states for the SignUpSubmitCodeResult.
 * This includes:
 * - SignUpPasswordRequiredState: The sign-up process requires a password.
 * - SignUpAttributesRequiredState: The sign-up process requires additional attributes.
 * - SignUpCompletedState: The sign-up process has completed successfully.
 * - SignUpFailedState: The sign-up process has failed.
 */
export type SignUpSubmitCodeResultState =
    | SignUpPasswordRequiredState
    | SignUpAttributesRequiredState
    | SignUpCompletedState
    | SignUpFailedState;

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { SignUpSubmitPasswordError } from "../error_type/SignUpError.js";
import { SignUpAttributesRequiredState } from "../state/SignUpAttributesRequiredState.js";
import { SignUpCompletedState } from "../state/SignUpCompletedState.js";
import { SignUpFailedState } from "../state/SignUpFailedState.js";
import {
    SIGN_UP_FAILED_STATE_TYPE,
    SIGN_UP_ATTRIBUTES_REQUIRED_STATE_TYPE,
    SIGN_UP_COMPLETED_STATE_TYPE,
} from "../../../core/auth_flow/AuthFlowStateTypes.js";

/*
 * Result of a sign-up operation that requires a password.
 */
export class SignUpSubmitPasswordResult extends AuthFlowResultBase<
    SignUpSubmitPasswordResultState,
    SignUpSubmitPasswordError,
    void
> {
    /**
     * Creates a new instance of SignUpSubmitPasswordResult.
     * @param state The state of the result.
     */
    constructor(state: SignUpSubmitPasswordResultState) {
        super(state);
    }

    /**
     * Creates a new instance of SignUpSubmitPasswordResult with an error.
     * @param error The error that occurred.
     * @returns {SignUpSubmitPasswordResult} A new instance of SignUpSubmitPasswordResult with the error set.
     */
    static createWithError(error: unknown): SignUpSubmitPasswordResult {
        const result = new SignUpSubmitPasswordResult(new SignUpFailedState());
        result.error = new SignUpSubmitPasswordError(
            SignUpSubmitPasswordResult.createErrorData(error)
        );

        return result;
    }

    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is SignUpSubmitPasswordResult & {
        state: SignUpFailedState;
    } {
        return this.state.stateType === SIGN_UP_FAILED_STATE_TYPE;
    }

    /**
     * Checks if the result is in an attributes required state.
     */
    isAttributesRequired(): this is SignUpSubmitPasswordResult & {
        state: SignUpAttributesRequiredState;
    } {
        return this.state.stateType === SIGN_UP_ATTRIBUTES_REQUIRED_STATE_TYPE;
    }

    /**
     * Checks if the result is in a completed state.
     */
    isCompleted(): this is SignUpSubmitPasswordResult & {
        state: SignUpCompletedState;
    } {
        return this.state.stateType === SIGN_UP_COMPLETED_STATE_TYPE;
    }
}

/**
 * The possible states for the SignUpSubmitPasswordResult.
 * This includes:
 * - SignUpAttributesRequiredState: The sign-up process requires additional attributes.
 * - SignUpCompletedState: The sign-up process has completed successfully.
 * - SignUpFailedState: The sign-up process has failed.
 */
export type SignUpSubmitPasswordResultState =
    | SignUpAttributesRequiredState
    | SignUpCompletedState
    | SignUpFailedState;

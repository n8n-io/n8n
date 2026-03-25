/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { SignUpSubmitAttributesError } from "../error_type/SignUpError.js";
import { SignUpCompletedState } from "../state/SignUpCompletedState.js";
import { SignUpFailedState } from "../state/SignUpFailedState.js";
import {
    SIGN_UP_FAILED_STATE_TYPE,
    SIGN_UP_COMPLETED_STATE_TYPE,
} from "../../../core/auth_flow/AuthFlowStateTypes.js";

/*
 * Result of a sign-up operation that requires attributes.
 */
export class SignUpSubmitAttributesResult extends AuthFlowResultBase<
    SignUpSubmitAttributesResultState,
    SignUpSubmitAttributesError,
    void
> {
    /**
     * Creates a new instance of SignUpSubmitAttributesResult.
     * @param state The state of the result.
     */
    constructor(state: SignUpSubmitAttributesResultState) {
        super(state);
    }

    /**
     * Creates a new instance of SignUpSubmitAttributesResult with an error.
     * @param error The error that occurred.
     * @returns {SignUpSubmitAttributesResult} A new instance of SignUpSubmitAttributesResult with the error set.
     */
    static createWithError(error: unknown): SignUpSubmitAttributesResult {
        const result = new SignUpSubmitAttributesResult(
            new SignUpFailedState()
        );
        result.error = new SignUpSubmitAttributesError(
            SignUpSubmitAttributesResult.createErrorData(error)
        );

        return result;
    }

    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is SignUpSubmitAttributesResult & {
        state: SignUpFailedState;
    } {
        return this.state.stateType === SIGN_UP_FAILED_STATE_TYPE;
    }

    /**
     * Checks if the result is in a completed state.
     */
    isCompleted(): this is SignUpSubmitAttributesResult & {
        state: SignUpCompletedState;
    } {
        return this.state.stateType === SIGN_UP_COMPLETED_STATE_TYPE;
    }
}

/**
 * The possible states for the SignUpSubmitAttributesResult.
 * This includes:
 * - SignUpCompletedState: The sign-up process has completed successfully.
 * - SignUpFailedState: The sign-up process has failed.
 */
export type SignUpSubmitAttributesResultState =
    | SignUpCompletedState
    | SignUpFailedState;

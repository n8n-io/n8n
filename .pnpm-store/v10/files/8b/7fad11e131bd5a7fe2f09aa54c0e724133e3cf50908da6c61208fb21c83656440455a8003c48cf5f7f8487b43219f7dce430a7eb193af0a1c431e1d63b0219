/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { ResetPasswordError } from "../error_type/ResetPasswordError.js";
import { ResetPasswordCodeRequiredState } from "../state/ResetPasswordCodeRequiredState.js";
import { ResetPasswordFailedState } from "../state/ResetPasswordFailedState.js";
import {
    RESET_PASSWORD_FAILED_STATE_TYPE,
    RESET_PASSWORD_CODE_REQUIRED_STATE_TYPE,
} from "../../../core/auth_flow/AuthFlowStateTypes.js";

/*
 * Result of a reset password operation.
 */
export class ResetPasswordStartResult extends AuthFlowResultBase<
    ResetPasswordStartResultState,
    ResetPasswordError,
    void
> {
    /**
     * Creates a new instance of ResetPasswordStartResult.
     * @param state The state of the result.
     */
    constructor(state: ResetPasswordStartResultState) {
        super(state);
    }

    /**
     * Creates a new instance of ResetPasswordStartResult with an error.
     * @param error The error that occurred.
     * @returns {ResetPasswordStartResult} A new instance of ResetPasswordStartResult with the error set.
     */
    static createWithError(error: unknown): ResetPasswordStartResult {
        const result = new ResetPasswordStartResult(
            new ResetPasswordFailedState()
        );
        result.error = new ResetPasswordError(
            ResetPasswordStartResult.createErrorData(error)
        );

        return result;
    }

    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is ResetPasswordStartResult & {
        state: ResetPasswordFailedState;
    } {
        return this.state.stateType === RESET_PASSWORD_FAILED_STATE_TYPE;
    }

    /**
     * Checks if the result is in a code required state.
     */
    isCodeRequired(): this is ResetPasswordStartResult & {
        state: ResetPasswordCodeRequiredState;
    } {
        return this.state.stateType === RESET_PASSWORD_CODE_REQUIRED_STATE_TYPE;
    }
}

/**
 * The possible states for the ResetPasswordStartResult.
 * This includes:
 * - ResetPasswordCodeRequiredState: The reset password process requires a code.
 * - ResetPasswordFailedState: The reset password process has failed.
 */
export type ResetPasswordStartResultState =
    | ResetPasswordCodeRequiredState
    | ResetPasswordFailedState;

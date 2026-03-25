/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { ResetPasswordSubmitPasswordError } from "../error_type/ResetPasswordError.js";
import { ResetPasswordCompletedState } from "../state/ResetPasswordCompletedState.js";
import { ResetPasswordFailedState } from "../state/ResetPasswordFailedState.js";
import {
    RESET_PASSWORD_FAILED_STATE_TYPE,
    RESET_PASSWORD_COMPLETED_STATE_TYPE,
} from "../../../core/auth_flow/AuthFlowStateTypes.js";

/*
 * Result of a reset password operation that requires a password.
 */
export class ResetPasswordSubmitPasswordResult extends AuthFlowResultBase<
    ResetPasswordSubmitPasswordResultState,
    ResetPasswordSubmitPasswordError,
    void
> {
    /**
     * Creates a new instance of ResetPasswordSubmitPasswordResult.
     * @param state The state of the result.
     */
    constructor(state: ResetPasswordSubmitPasswordResultState) {
        super(state);
    }

    static createWithError(error: unknown): ResetPasswordSubmitPasswordResult {
        const result = new ResetPasswordSubmitPasswordResult(
            new ResetPasswordFailedState()
        );
        result.error = new ResetPasswordSubmitPasswordError(
            ResetPasswordSubmitPasswordResult.createErrorData(error)
        );

        return result;
    }

    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is ResetPasswordSubmitPasswordResult & {
        state: ResetPasswordFailedState;
    } {
        return this.state.stateType === RESET_PASSWORD_FAILED_STATE_TYPE;
    }

    /**
     * Checks if the result is in a completed state.
     */
    isCompleted(): this is ResetPasswordSubmitPasswordResult & {
        state: ResetPasswordCompletedState;
    } {
        return this.state.stateType === RESET_PASSWORD_COMPLETED_STATE_TYPE;
    }
}

/**
 * The possible states for the ResetPasswordSubmitPasswordResult.
 * This includes:
 * - ResetPasswordCompletedState: The reset password process has completed successfully.
 * - ResetPasswordFailedState: The reset password process has failed.
 */
export type ResetPasswordSubmitPasswordResultState =
    | ResetPasswordCompletedState
    | ResetPasswordFailedState;

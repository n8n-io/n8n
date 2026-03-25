/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { ResetPasswordSubmitCodeError } from "../error_type/ResetPasswordError.js";
import { ResetPasswordFailedState } from "../state/ResetPasswordFailedState.js";
import { ResetPasswordPasswordRequiredState } from "../state/ResetPasswordPasswordRequiredState.js";
import {
    RESET_PASSWORD_FAILED_STATE_TYPE,
    RESET_PASSWORD_PASSWORD_REQUIRED_STATE_TYPE,
} from "../../../core/auth_flow/AuthFlowStateTypes.js";

/*
 * Result of a reset password operation that requires a code.
 */
export class ResetPasswordSubmitCodeResult extends AuthFlowResultBase<
    ResetPasswordSubmitCodeResultState,
    ResetPasswordSubmitCodeError,
    void
> {
    /**
     * Creates a new instance of ResetPasswordSubmitCodeResult.
     * @param state The state of the result.
     */
    constructor(state: ResetPasswordSubmitCodeResultState) {
        super(state);
    }

    /**
     * Creates a new instance of ResetPasswordSubmitCodeResult with an error.
     * @param error The error that occurred.
     * @returns {ResetPasswordSubmitCodeResult} A new instance of ResetPasswordSubmitCodeResult with the error set.
     */
    static createWithError(error: unknown): ResetPasswordSubmitCodeResult {
        const result = new ResetPasswordSubmitCodeResult(
            new ResetPasswordFailedState()
        );
        result.error = new ResetPasswordSubmitCodeError(
            ResetPasswordSubmitCodeResult.createErrorData(error)
        );

        return result;
    }

    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is ResetPasswordSubmitCodeResult & {
        state: ResetPasswordFailedState;
    } {
        return this.state.stateType === RESET_PASSWORD_FAILED_STATE_TYPE;
    }

    /**
     * Checks if the result is in a password required state.
     */
    isPasswordRequired(): this is ResetPasswordSubmitCodeResult & {
        state: ResetPasswordPasswordRequiredState;
    } {
        return (
            this.state.stateType === RESET_PASSWORD_PASSWORD_REQUIRED_STATE_TYPE
        );
    }
}

/**
 * The possible states for the ResetPasswordSubmitCodeResult.
 * This includes:
 * - ResetPasswordPasswordRequiredState: The reset password process requires a password.
 * - ResetPasswordFailedState: The reset password process has failed.
 */
export type ResetPasswordSubmitCodeResultState =
    | ResetPasswordPasswordRequiredState
    | ResetPasswordFailedState;

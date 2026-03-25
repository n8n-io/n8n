/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { ResetPasswordResendCodeError } from "../error_type/ResetPasswordError.js";
import type { ResetPasswordCodeRequiredState } from "../state/ResetPasswordCodeRequiredState.js";
import { ResetPasswordFailedState } from "../state/ResetPasswordFailedState.js";
import {
    RESET_PASSWORD_FAILED_STATE_TYPE,
    RESET_PASSWORD_CODE_REQUIRED_STATE_TYPE,
} from "../../../core/auth_flow/AuthFlowStateTypes.js";

/*
 * Result of resending code in a reset password operation.
 */
export class ResetPasswordResendCodeResult extends AuthFlowResultBase<
    ResetPasswordResendCodeResultState,
    ResetPasswordResendCodeError,
    void
> {
    /**
     * Creates a new instance of ResetPasswordResendCodeResult.
     * @param state The state of the result.
     */
    constructor(state: ResetPasswordResendCodeResultState) {
        super(state);
    }

    /**
     * Creates a new instance of ResetPasswordResendCodeResult with an error.
     * @param error The error that occurred.
     * @returns {ResetPasswordResendCodeResult} A new instance of ResetPasswordResendCodeResult with the error set.
     */
    static createWithError(error: unknown): ResetPasswordResendCodeResult {
        const result = new ResetPasswordResendCodeResult(
            new ResetPasswordFailedState()
        );
        result.error = new ResetPasswordResendCodeError(
            ResetPasswordResendCodeResult.createErrorData(error)
        );

        return result;
    }

    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is ResetPasswordResendCodeResult & {
        state: ResetPasswordFailedState;
    } {
        return this.state.stateType === RESET_PASSWORD_FAILED_STATE_TYPE;
    }

    /**
     * Checks if the result is in a code required state.
     */
    isCodeRequired(): this is ResetPasswordResendCodeResult & {
        state: ResetPasswordCodeRequiredState;
    } {
        return this.state.stateType === RESET_PASSWORD_CODE_REQUIRED_STATE_TYPE;
    }
}

/**
 * The possible states for the ResetPasswordResendCodeResult.
 * This includes:
 * - ResetPasswordCodeRequiredState: The reset password process requires a code.
 * - ResetPasswordFailedState: The reset password process has failed.
 */
export type ResetPasswordResendCodeResultState =
    | ResetPasswordCodeRequiredState
    | ResetPasswordFailedState;

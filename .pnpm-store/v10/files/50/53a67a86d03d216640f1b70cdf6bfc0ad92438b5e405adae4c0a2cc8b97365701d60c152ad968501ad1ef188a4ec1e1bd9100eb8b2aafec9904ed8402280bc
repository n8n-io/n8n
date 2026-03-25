/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { SignInSubmitCodeError } from "../error_type/SignInError.js";
import { SignInCompletedState } from "../state/SignInCompletedState.js";
import { SignInFailedState } from "../state/SignInFailedState.js";
import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { CustomAuthAccountData } from "../../../get_account/auth_flow/CustomAuthAccountData.js";
import { AuthMethodRegistrationRequiredState } from "../../../core/auth_flow/jit/state/AuthMethodRegistrationState.js";
import { MfaAwaitingState } from "../../../core/auth_flow/mfa/state/MfaState.js";
import {
    SIGN_IN_FAILED_STATE_TYPE,
    SIGN_IN_COMPLETED_STATE_TYPE,
    AUTH_METHOD_REGISTRATION_REQUIRED_STATE_TYPE,
    MFA_AWAITING_STATE_TYPE,
} from "../../../core/auth_flow/AuthFlowStateTypes.js";

/*
 * Result of a sign-in submit code operation.
 */
export class SignInSubmitCodeResult extends AuthFlowResultBase<
    SignInSubmitCodeResultState,
    SignInSubmitCodeError,
    CustomAuthAccountData
> {
    /**
     * Creates a new instance of SignInSubmitCodeResult with error data.
     * @param error The error that occurred.
     * @returns {SignInSubmitCodeResult} A new instance of SignInSubmitCodeResult with the error set.
     */
    static createWithError(error: unknown): SignInSubmitCodeResult {
        const result = new SignInSubmitCodeResult(new SignInFailedState());
        result.error = new SignInSubmitCodeError(
            SignInSubmitCodeResult.createErrorData(error)
        );

        return result;
    }

    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is SignInSubmitCodeResult & { state: SignInFailedState } {
        return this.state.stateType === SIGN_IN_FAILED_STATE_TYPE;
    }

    /**
     * Checks if the result is in a completed state.
     */
    isCompleted(): this is SignInSubmitCodeResult & {
        state: SignInCompletedState;
    } {
        return this.state.stateType === SIGN_IN_COMPLETED_STATE_TYPE;
    }

    /**
     * Checks if the result requires authentication method registration.
     */
    isAuthMethodRegistrationRequired(): this is SignInSubmitCodeResult & {
        state: AuthMethodRegistrationRequiredState;
    } {
        return (
            this.state.stateType ===
            AUTH_METHOD_REGISTRATION_REQUIRED_STATE_TYPE
        );
    }

    /**
     * Checks if the result requires MFA.
     */
    isMfaRequired(): this is SignInSubmitCodeResult & {
        state: MfaAwaitingState;
    } {
        return this.state.stateType === MFA_AWAITING_STATE_TYPE;
    }
}

/**
 * The possible states of the SignInSubmitCodeResult.
 * This includes:
 * - SignInCompletedState: The sign-in process has completed successfully.
 * - SignInFailedState: The sign-in process has failed.
 * - AuthMethodRegistrationRequiredState: The user needs to register an authentication method.
 * - MfaAwaitingState: The user is in a multi-factor authentication (MFA) waiting state.
 */
export type SignInSubmitCodeResultState =
    | SignInCompletedState
    | SignInFailedState
    | AuthMethodRegistrationRequiredState
    | MfaAwaitingState;

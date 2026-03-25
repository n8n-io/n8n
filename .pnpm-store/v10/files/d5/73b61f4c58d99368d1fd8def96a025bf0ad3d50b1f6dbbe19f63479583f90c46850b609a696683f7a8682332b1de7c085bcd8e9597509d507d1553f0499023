/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { SignInSubmitPasswordError } from "../error_type/SignInError.js";
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
 * Result of a sign-in submit password operation.
 */
export class SignInSubmitPasswordResult extends AuthFlowResultBase<
    SignInSubmitPasswordResultState,
    SignInSubmitPasswordError,
    CustomAuthAccountData
> {
    static createWithError(error: unknown): SignInSubmitPasswordResult {
        const result = new SignInSubmitPasswordResult(new SignInFailedState());
        result.error = new SignInSubmitPasswordError(
            SignInSubmitPasswordResult.createErrorData(error)
        );

        return result;
    }

    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is SignInSubmitPasswordResult & {
        state: SignInFailedState;
    } {
        return this.state.stateType === SIGN_IN_FAILED_STATE_TYPE;
    }

    /**
     * Checks if the result is in a completed state.
     */
    isCompleted(): this is SignInSubmitPasswordResult & {
        state: SignInCompletedState;
    } {
        return this.state.stateType === SIGN_IN_COMPLETED_STATE_TYPE;
    }

    /**
     * Checks if the result requires authentication method registration.
     */
    isAuthMethodRegistrationRequired(): this is SignInSubmitPasswordResult & {
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
    isMfaRequired(): this is SignInSubmitPasswordResult & {
        state: MfaAwaitingState;
    } {
        return this.state.stateType === MFA_AWAITING_STATE_TYPE;
    }
}

/**
 * The possible states of the SignInSubmitPasswordResult.
 * This includes:
 * - SignInCompletedState: The sign-in process has completed successfully.
 * - SignInFailedState: The sign-in process has failed.
 * - AuthMethodRegistrationRequiredState: The sign-in process requires authentication method registration.
 * - MfaAwaitingState: The sign-in process requires MFA.
 */
export type SignInSubmitPasswordResultState =
    | SignInCompletedState
    | SignInFailedState
    | AuthMethodRegistrationRequiredState
    | MfaAwaitingState;

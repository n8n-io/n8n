/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthFlowResultBase } from "../../AuthFlowResultBase.js";
import { AuthMethodRegistrationSubmitChallengeError } from "../error_type/AuthMethodRegistrationError.js";
import { CustomAuthAccountData } from "../../../../get_account/auth_flow/CustomAuthAccountData.js";
import { AuthMethodRegistrationFailedState } from "../state/AuthMethodRegistrationFailedState.js";
import { AuthMethodRegistrationCompletedState } from "../state/AuthMethodRegistrationCompletedState.js";
import {
    AUTH_METHOD_REGISTRATION_COMPLETED_STATE_TYPE,
    AUTH_METHOD_REGISTRATION_FAILED_STATE_TYPE,
} from "../../AuthFlowStateTypes.js";

/**
 * Result of submitting a challenge for authentication method registration.
 */
export class AuthMethodRegistrationSubmitChallengeResult extends AuthFlowResultBase<
    AuthMethodRegistrationSubmitChallengeResultState,
    AuthMethodRegistrationSubmitChallengeError,
    CustomAuthAccountData
> {
    /**
     * Creates an AuthMethodRegistrationSubmitChallengeResult with an error.
     * @param error The error that occurred.
     * @returns The AuthMethodRegistrationSubmitChallengeResult with error.
     */
    static createWithError(
        error: unknown
    ): AuthMethodRegistrationSubmitChallengeResult {
        const result = new AuthMethodRegistrationSubmitChallengeResult(
            new AuthMethodRegistrationFailedState()
        );
        result.error = new AuthMethodRegistrationSubmitChallengeError(
            AuthMethodRegistrationSubmitChallengeResult.createErrorData(error)
        );
        return result;
    }

    /**
     * Checks if the result indicates that registration is completed.
     * @returns true if registration is completed, false otherwise.
     */
    isCompleted(): this is AuthMethodRegistrationSubmitChallengeResult & {
        state: AuthMethodRegistrationCompletedState;
    } {
        return (
            this.state.stateType ===
            AUTH_METHOD_REGISTRATION_COMPLETED_STATE_TYPE
        );
    }

    /**
     * Checks if the result is in a failed state.
     * @returns true if the result is failed, false otherwise.
     */
    isFailed(): this is AuthMethodRegistrationSubmitChallengeResult & {
        state: AuthMethodRegistrationFailedState;
    } {
        return (
            this.state.stateType === AUTH_METHOD_REGISTRATION_FAILED_STATE_TYPE
        );
    }
}

/**
 * Type definition for possible states in AuthMethodRegistrationSubmitChallengeResult.
 */
export type AuthMethodRegistrationSubmitChallengeResultState =
    | AuthMethodRegistrationCompletedState
    | AuthMethodRegistrationFailedState;

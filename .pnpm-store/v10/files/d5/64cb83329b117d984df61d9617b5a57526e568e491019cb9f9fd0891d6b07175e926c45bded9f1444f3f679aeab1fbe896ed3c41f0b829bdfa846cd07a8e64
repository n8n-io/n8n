/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthFlowResultBase } from "../../AuthFlowResultBase.js";
import { AuthMethodRegistrationChallengeMethodError } from "../error_type/AuthMethodRegistrationError.js";
import type { AuthMethodVerificationRequiredState } from "../state/AuthMethodRegistrationState.js";
import { CustomAuthAccountData } from "../../../../get_account/auth_flow/CustomAuthAccountData.js";
import { AuthMethodRegistrationCompletedState } from "../state/AuthMethodRegistrationCompletedState.js";
import { AuthMethodRegistrationFailedState } from "../state/AuthMethodRegistrationFailedState.js";
import {
    AUTH_METHOD_VERIFICATION_REQUIRED_STATE_TYPE,
    AUTH_METHOD_REGISTRATION_COMPLETED_STATE_TYPE,
    AUTH_METHOD_REGISTRATION_FAILED_STATE_TYPE,
} from "../../AuthFlowStateTypes.js";

/**
 * Result of challenging an authentication method for registration.
 * Uses base state type to avoid circular dependencies.
 */
export class AuthMethodRegistrationChallengeMethodResult extends AuthFlowResultBase<
    AuthMethodRegistrationChallengeMethodResultState,
    AuthMethodRegistrationChallengeMethodError,
    CustomAuthAccountData
> {
    /**
     * Creates an AuthMethodRegistrationChallengeMethodResult with an error.
     * @param error The error that occurred.
     * @returns The AuthMethodRegistrationChallengeMethodResult with error.
     */
    static createWithError(
        error: unknown
    ): AuthMethodRegistrationChallengeMethodResult {
        const result = new AuthMethodRegistrationChallengeMethodResult(
            new AuthMethodRegistrationFailedState()
        );
        result.error = new AuthMethodRegistrationChallengeMethodError(
            AuthMethodRegistrationChallengeMethodResult.createErrorData(error)
        );
        return result;
    }

    /**
     * Checks if the result indicates that verification is required.
     * @returns true if verification is required, false otherwise.
     */
    isVerificationRequired(): this is AuthMethodRegistrationChallengeMethodResult & {
        state: AuthMethodVerificationRequiredState;
    } {
        return (
            this.state.stateType ===
            AUTH_METHOD_VERIFICATION_REQUIRED_STATE_TYPE
        );
    }

    /**
     * Checks if the result indicates that registration is completed (fast-pass scenario).
     * @returns true if registration is completed, false otherwise.
     */
    isCompleted(): this is AuthMethodRegistrationChallengeMethodResult & {
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
    isFailed(): this is AuthMethodRegistrationChallengeMethodResult & {
        state: AuthMethodRegistrationFailedState;
    } {
        return (
            this.state.stateType === AUTH_METHOD_REGISTRATION_FAILED_STATE_TYPE
        );
    }
}

/**
 * Type definition for possible states in AuthMethodRegistrationChallengeMethodResult.
 */
export type AuthMethodRegistrationChallengeMethodResultState =
    | AuthMethodVerificationRequiredState
    | AuthMethodRegistrationCompletedState
    | AuthMethodRegistrationFailedState;

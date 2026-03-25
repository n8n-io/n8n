/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthFlowResultBase } from "../../AuthFlowResultBase.js";
import { MfaRequestChallengeError } from "../error_type/MfaError.js";
import { MfaFailedState } from "../state/MfaFailedState.js";
import type { MfaVerificationRequiredState } from "../state/MfaState.js";
import {
    MFA_VERIFICATION_REQUIRED_STATE_TYPE,
    MFA_FAILED_STATE_TYPE,
} from "../../AuthFlowStateTypes.js";

/**
 * Result of requesting an MFA challenge.
 * Uses base state type to avoid circular dependencies.
 */
export class MfaRequestChallengeResult extends AuthFlowResultBase<
    MfaRequestChallengeResultState,
    MfaRequestChallengeError
> {
    /**
     * Creates an MfaRequestChallengeResult with an error.
     * @param error The error that occurred.
     * @returns The MfaRequestChallengeResult with error.
     */
    static createWithError(error: unknown): MfaRequestChallengeResult {
        const result = new MfaRequestChallengeResult(new MfaFailedState());
        result.error = new MfaRequestChallengeError(
            MfaRequestChallengeResult.createErrorData(error)
        );
        return result;
    }

    /**
     * Checks if the result indicates that verification is required.
     * @returns true if verification is required, false otherwise.
     */
    isVerificationRequired(): this is MfaRequestChallengeResult & {
        state: MfaVerificationRequiredState;
    } {
        return this.state.stateType === MFA_VERIFICATION_REQUIRED_STATE_TYPE;
    }

    /**
     * Checks if the result is in a failed state.
     * @returns true if the result is failed, false otherwise.
     */
    isFailed(): this is MfaRequestChallengeResult & {
        state: MfaFailedState;
    } {
        return this.state.stateType === MFA_FAILED_STATE_TYPE;
    }
}

/**
 * The possible states for the MfaRequestChallengeResult.
 * This includes:
 * - MfaVerificationRequiredState: The user needs to verify their challenge.
 * - MfaFailedState: The MFA request failed.
 */
export type MfaRequestChallengeResultState =
    | MfaVerificationRequiredState
    | MfaFailedState;

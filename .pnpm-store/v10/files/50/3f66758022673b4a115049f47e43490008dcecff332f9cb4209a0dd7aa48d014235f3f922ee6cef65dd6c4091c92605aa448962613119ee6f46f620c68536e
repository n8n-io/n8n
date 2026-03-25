/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthFlowResultBase } from "../../AuthFlowResultBase.js";
import { MfaSubmitChallengeError } from "../error_type/MfaError.js";
import { CustomAuthAccountData } from "../../../../get_account/auth_flow/CustomAuthAccountData.js";
import { MfaCompletedState } from "../state/MfaCompletedState.js";
import { MfaFailedState } from "../state/MfaFailedState.js";
import {
    MFA_COMPLETED_STATE_TYPE,
    MFA_FAILED_STATE_TYPE,
} from "../../AuthFlowStateTypes.js";

/**
 * Result of submitting an MFA challenge.
 */
export class MfaSubmitChallengeResult extends AuthFlowResultBase<
    MfaSubmitChallengeResultState,
    MfaSubmitChallengeError,
    CustomAuthAccountData
> {
    /**
     * Creates an MfaSubmitChallengeResult with an error.
     * @param error The error that occurred.
     * @returns The MfaSubmitChallengeResult with error.
     */
    static createWithError(error: unknown): MfaSubmitChallengeResult {
        const result = new MfaSubmitChallengeResult(new MfaFailedState());
        result.error = new MfaSubmitChallengeError(
            MfaSubmitChallengeResult.createErrorData(error)
        );
        return result;
    }

    /**
     * Checks if the MFA flow is completed successfully.
     * @returns true if completed, false otherwise.
     */
    isCompleted(): this is MfaSubmitChallengeResult & {
        state: MfaCompletedState;
    } {
        return this.state.stateType === MFA_COMPLETED_STATE_TYPE;
    }

    /**
     * Checks if the result is in a failed state.
     * @returns true if the result is failed, false otherwise.
     */
    isFailed(): this is MfaSubmitChallengeResult & {
        state: MfaFailedState;
    } {
        return this.state.stateType === MFA_FAILED_STATE_TYPE;
    }
}

export type MfaSubmitChallengeResultState = MfaCompletedState | MfaFailedState;

/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthFlowResultBase } from '../../AuthFlowResultBase.mjs';
import { MfaSubmitChallengeError } from '../error_type/MfaError.mjs';
import { MfaFailedState } from '../state/MfaFailedState.mjs';
import { MFA_COMPLETED_STATE_TYPE, MFA_FAILED_STATE_TYPE } from '../../AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Result of submitting an MFA challenge.
 */
class MfaSubmitChallengeResult extends AuthFlowResultBase {
    /**
     * Creates an MfaSubmitChallengeResult with an error.
     * @param error The error that occurred.
     * @returns The MfaSubmitChallengeResult with error.
     */
    static createWithError(error) {
        const result = new MfaSubmitChallengeResult(new MfaFailedState());
        result.error = new MfaSubmitChallengeError(MfaSubmitChallengeResult.createErrorData(error));
        return result;
    }
    /**
     * Checks if the MFA flow is completed successfully.
     * @returns true if completed, false otherwise.
     */
    isCompleted() {
        return this.state.stateType === MFA_COMPLETED_STATE_TYPE;
    }
    /**
     * Checks if the result is in a failed state.
     * @returns true if the result is failed, false otherwise.
     */
    isFailed() {
        return this.state.stateType === MFA_FAILED_STATE_TYPE;
    }
}

export { MfaSubmitChallengeResult };
//# sourceMappingURL=MfaSubmitChallengeResult.mjs.map

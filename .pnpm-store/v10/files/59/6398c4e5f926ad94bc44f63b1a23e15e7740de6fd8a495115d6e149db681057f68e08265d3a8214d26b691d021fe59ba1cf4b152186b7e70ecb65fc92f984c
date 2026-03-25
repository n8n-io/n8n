/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthFlowResultBase } from '../../AuthFlowResultBase.mjs';
import { MfaRequestChallengeError } from '../error_type/MfaError.mjs';
import { MfaFailedState } from '../state/MfaFailedState.mjs';
import { MFA_VERIFICATION_REQUIRED_STATE_TYPE, MFA_FAILED_STATE_TYPE } from '../../AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Result of requesting an MFA challenge.
 * Uses base state type to avoid circular dependencies.
 */
class MfaRequestChallengeResult extends AuthFlowResultBase {
    /**
     * Creates an MfaRequestChallengeResult with an error.
     * @param error The error that occurred.
     * @returns The MfaRequestChallengeResult with error.
     */
    static createWithError(error) {
        const result = new MfaRequestChallengeResult(new MfaFailedState());
        result.error = new MfaRequestChallengeError(MfaRequestChallengeResult.createErrorData(error));
        return result;
    }
    /**
     * Checks if the result indicates that verification is required.
     * @returns true if verification is required, false otherwise.
     */
    isVerificationRequired() {
        return this.state.stateType === MFA_VERIFICATION_REQUIRED_STATE_TYPE;
    }
    /**
     * Checks if the result is in a failed state.
     * @returns true if the result is failed, false otherwise.
     */
    isFailed() {
        return this.state.stateType === MFA_FAILED_STATE_TYPE;
    }
}

export { MfaRequestChallengeResult };
//# sourceMappingURL=MfaRequestChallengeResult.mjs.map

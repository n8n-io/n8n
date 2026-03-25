/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthFlowResultBase } from '../../AuthFlowResultBase.mjs';
import { AuthMethodRegistrationSubmitChallengeError } from '../error_type/AuthMethodRegistrationError.mjs';
import { AuthMethodRegistrationFailedState } from '../state/AuthMethodRegistrationFailedState.mjs';
import { AUTH_METHOD_REGISTRATION_COMPLETED_STATE_TYPE, AUTH_METHOD_REGISTRATION_FAILED_STATE_TYPE } from '../../AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Result of submitting a challenge for authentication method registration.
 */
class AuthMethodRegistrationSubmitChallengeResult extends AuthFlowResultBase {
    /**
     * Creates an AuthMethodRegistrationSubmitChallengeResult with an error.
     * @param error The error that occurred.
     * @returns The AuthMethodRegistrationSubmitChallengeResult with error.
     */
    static createWithError(error) {
        const result = new AuthMethodRegistrationSubmitChallengeResult(new AuthMethodRegistrationFailedState());
        result.error = new AuthMethodRegistrationSubmitChallengeError(AuthMethodRegistrationSubmitChallengeResult.createErrorData(error));
        return result;
    }
    /**
     * Checks if the result indicates that registration is completed.
     * @returns true if registration is completed, false otherwise.
     */
    isCompleted() {
        return (this.state.stateType ===
            AUTH_METHOD_REGISTRATION_COMPLETED_STATE_TYPE);
    }
    /**
     * Checks if the result is in a failed state.
     * @returns true if the result is failed, false otherwise.
     */
    isFailed() {
        return (this.state.stateType === AUTH_METHOD_REGISTRATION_FAILED_STATE_TYPE);
    }
}

export { AuthMethodRegistrationSubmitChallengeResult };
//# sourceMappingURL=AuthMethodRegistrationSubmitChallengeResult.mjs.map

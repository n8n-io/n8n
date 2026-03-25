/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { SignInSubmitPasswordError } from '../error_type/SignInError.mjs';
import { SignInFailedState } from '../state/SignInFailedState.mjs';
import { AuthFlowResultBase } from '../../../core/auth_flow/AuthFlowResultBase.mjs';
import { SIGN_IN_FAILED_STATE_TYPE, SIGN_IN_COMPLETED_STATE_TYPE, AUTH_METHOD_REGISTRATION_REQUIRED_STATE_TYPE, MFA_AWAITING_STATE_TYPE } from '../../../core/auth_flow/AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Result of a sign-in submit password operation.
 */
class SignInSubmitPasswordResult extends AuthFlowResultBase {
    static createWithError(error) {
        const result = new SignInSubmitPasswordResult(new SignInFailedState());
        result.error = new SignInSubmitPasswordError(SignInSubmitPasswordResult.createErrorData(error));
        return result;
    }
    /**
     * Checks if the result is in a failed state.
     */
    isFailed() {
        return this.state.stateType === SIGN_IN_FAILED_STATE_TYPE;
    }
    /**
     * Checks if the result is in a completed state.
     */
    isCompleted() {
        return this.state.stateType === SIGN_IN_COMPLETED_STATE_TYPE;
    }
    /**
     * Checks if the result requires authentication method registration.
     */
    isAuthMethodRegistrationRequired() {
        return (this.state.stateType ===
            AUTH_METHOD_REGISTRATION_REQUIRED_STATE_TYPE);
    }
    /**
     * Checks if the result requires MFA.
     */
    isMfaRequired() {
        return this.state.stateType === MFA_AWAITING_STATE_TYPE;
    }
}

export { SignInSubmitPasswordResult };
//# sourceMappingURL=SignInSubmitPasswordResult.mjs.map

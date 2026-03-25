/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthFlowResultBase } from '../../../core/auth_flow/AuthFlowResultBase.mjs';
import { SignInError } from '../error_type/SignInError.mjs';
import { SignInFailedState } from '../state/SignInFailedState.mjs';
import { SIGN_IN_FAILED_STATE_TYPE, SIGN_IN_CODE_REQUIRED_STATE_TYPE, SIGN_IN_PASSWORD_REQUIRED_STATE_TYPE, SIGN_IN_COMPLETED_STATE_TYPE, AUTH_METHOD_REGISTRATION_REQUIRED_STATE_TYPE, MFA_AWAITING_STATE_TYPE } from '../../../core/auth_flow/AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Result of a sign-in operation.
 */
class SignInResult extends AuthFlowResultBase {
    /**
     * Creates a new instance of SignInResultState.
     * @param state The state of the result.
     */
    constructor(state, resultData) {
        super(state, resultData);
    }
    /**
     * Creates a new instance of SignInResult with an error.
     * @param error The error that occurred.
     * @returns {SignInResult} A new instance of SignInResult with the error set.
     */
    static createWithError(error) {
        const result = new SignInResult(new SignInFailedState());
        result.error = new SignInError(SignInResult.createErrorData(error));
        return result;
    }
    /**
     * Checks if the result is in a failed state.
     */
    isFailed() {
        return this.state.stateType === SIGN_IN_FAILED_STATE_TYPE;
    }
    /**
     * Checks if the result is in a code required state.
     */
    isCodeRequired() {
        return this.state.stateType === SIGN_IN_CODE_REQUIRED_STATE_TYPE;
    }
    /**
     * Checks if the result is in a password required state.
     */
    isPasswordRequired() {
        return this.state.stateType === SIGN_IN_PASSWORD_REQUIRED_STATE_TYPE;
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

export { SignInResult };
//# sourceMappingURL=SignInResult.mjs.map

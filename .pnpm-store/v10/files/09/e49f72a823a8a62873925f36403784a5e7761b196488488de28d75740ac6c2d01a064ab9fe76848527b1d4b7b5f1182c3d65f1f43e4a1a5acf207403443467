/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthFlowResultBase } from '../../../core/auth_flow/AuthFlowResultBase.mjs';
import { SIGN_IN_FAILED_STATE_TYPE, SIGN_IN_CODE_REQUIRED_STATE_TYPE } from '../../../core/auth_flow/AuthFlowStateTypes.mjs';
import { SignInResendCodeError } from '../error_type/SignInError.mjs';
import { SignInFailedState } from '../state/SignInFailedState.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class SignInResendCodeResult extends AuthFlowResultBase {
    /**
     * Creates a new instance of SignInResendCodeResult.
     * @param state The state of the result.
     */
    constructor(state) {
        super(state);
    }
    /**
     * Creates a new instance of SignInResendCodeResult with an error.
     * @param error The error that occurred.
     * @returns {SignInResendCodeResult} A new instance of SignInResendCodeResult with the error set.
     */
    static createWithError(error) {
        const result = new SignInResendCodeResult(new SignInFailedState());
        result.error = new SignInResendCodeError(SignInResendCodeResult.createErrorData(error));
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
        /*
         * The instanceof operator couldn't be used here to check the state type since the circular dependency issue.
         * So we are using the constructor name to check the state type.
         */
        return this.state.stateType === SIGN_IN_CODE_REQUIRED_STATE_TYPE;
    }
}

export { SignInResendCodeResult };
//# sourceMappingURL=SignInResendCodeResult.mjs.map

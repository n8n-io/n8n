/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthFlowResultBase } from '../../../core/auth_flow/AuthFlowResultBase.mjs';
import { SignUpResendCodeError } from '../error_type/SignUpError.mjs';
import { SignUpFailedState } from '../state/SignUpFailedState.mjs';
import { SIGN_UP_FAILED_STATE_TYPE, SIGN_UP_CODE_REQUIRED_STATE_TYPE } from '../../../core/auth_flow/AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Result of resending code in a sign-up operation.
 */
class SignUpResendCodeResult extends AuthFlowResultBase {
    /**
     * Creates a new instance of SignUpResendCodeResult.
     * @param state The state of the result.
     */
    constructor(state) {
        super(state);
    }
    /**
     * Creates a new instance of SignUpResendCodeResult with an error.
     * @param error The error that occurred.
     * @returns {SignUpResendCodeResult} A new instance of SignUpResendCodeResult with the error set.
     */
    static createWithError(error) {
        const result = new SignUpResendCodeResult(new SignUpFailedState());
        result.error = new SignUpResendCodeError(SignUpResendCodeResult.createErrorData(error));
        return result;
    }
    /**
     * Checks if the result is in a failed state.
     */
    isFailed() {
        return this.state.stateType === SIGN_UP_FAILED_STATE_TYPE;
    }
    /**
     * Checks if the result is in a code required state.
     */
    isCodeRequired() {
        return this.state.stateType === SIGN_UP_CODE_REQUIRED_STATE_TYPE;
    }
}

export { SignUpResendCodeResult };
//# sourceMappingURL=SignUpResendCodeResult.mjs.map

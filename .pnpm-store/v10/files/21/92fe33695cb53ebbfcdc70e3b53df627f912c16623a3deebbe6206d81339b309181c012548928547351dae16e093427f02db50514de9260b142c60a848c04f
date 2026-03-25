/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthFlowResultBase } from '../../../core/auth_flow/AuthFlowResultBase.mjs';
import { SignUpError } from '../error_type/SignUpError.mjs';
import { SignUpFailedState } from '../state/SignUpFailedState.mjs';
import { SIGN_UP_FAILED_STATE_TYPE, SIGN_UP_CODE_REQUIRED_STATE_TYPE, SIGN_UP_PASSWORD_REQUIRED_STATE_TYPE, SIGN_UP_ATTRIBUTES_REQUIRED_STATE_TYPE } from '../../../core/auth_flow/AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Result of a sign-up operation.
 */
class SignUpResult extends AuthFlowResultBase {
    /**
     * Creates a new instance of SignUpResult.
     * @param state The state of the result.
     */
    constructor(state) {
        super(state);
    }
    /**
     * Creates a new instance of SignUpResult with an error.
     * @param error The error that occurred.
     * @returns {SignUpResult} A new instance of SignUpResult with the error set.
     */
    static createWithError(error) {
        const result = new SignUpResult(new SignUpFailedState());
        result.error = new SignUpError(SignUpResult.createErrorData(error));
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
    /**
     * Checks if the result is in a password required state.
     */
    isPasswordRequired() {
        return this.state.stateType === SIGN_UP_PASSWORD_REQUIRED_STATE_TYPE;
    }
    /**
     * Checks if the result is in an attributes required state.
     */
    isAttributesRequired() {
        return this.state.stateType === SIGN_UP_ATTRIBUTES_REQUIRED_STATE_TYPE;
    }
}

export { SignUpResult };
//# sourceMappingURL=SignUpResult.mjs.map

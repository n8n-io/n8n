/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthFlowResultBase } from '../../../core/auth_flow/AuthFlowResultBase.mjs';
import { SignUpSubmitPasswordError } from '../error_type/SignUpError.mjs';
import { SignUpFailedState } from '../state/SignUpFailedState.mjs';
import { SIGN_UP_FAILED_STATE_TYPE, SIGN_UP_ATTRIBUTES_REQUIRED_STATE_TYPE, SIGN_UP_COMPLETED_STATE_TYPE } from '../../../core/auth_flow/AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Result of a sign-up operation that requires a password.
 */
class SignUpSubmitPasswordResult extends AuthFlowResultBase {
    /**
     * Creates a new instance of SignUpSubmitPasswordResult.
     * @param state The state of the result.
     */
    constructor(state) {
        super(state);
    }
    /**
     * Creates a new instance of SignUpSubmitPasswordResult with an error.
     * @param error The error that occurred.
     * @returns {SignUpSubmitPasswordResult} A new instance of SignUpSubmitPasswordResult with the error set.
     */
    static createWithError(error) {
        const result = new SignUpSubmitPasswordResult(new SignUpFailedState());
        result.error = new SignUpSubmitPasswordError(SignUpSubmitPasswordResult.createErrorData(error));
        return result;
    }
    /**
     * Checks if the result is in a failed state.
     */
    isFailed() {
        return this.state.stateType === SIGN_UP_FAILED_STATE_TYPE;
    }
    /**
     * Checks if the result is in an attributes required state.
     */
    isAttributesRequired() {
        return this.state.stateType === SIGN_UP_ATTRIBUTES_REQUIRED_STATE_TYPE;
    }
    /**
     * Checks if the result is in a completed state.
     */
    isCompleted() {
        return this.state.stateType === SIGN_UP_COMPLETED_STATE_TYPE;
    }
}

export { SignUpSubmitPasswordResult };
//# sourceMappingURL=SignUpSubmitPasswordResult.mjs.map

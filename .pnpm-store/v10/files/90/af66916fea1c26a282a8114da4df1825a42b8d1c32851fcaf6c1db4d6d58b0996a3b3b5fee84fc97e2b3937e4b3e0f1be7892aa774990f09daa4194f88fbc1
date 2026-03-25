/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthFlowResultBase } from '../../../core/auth_flow/AuthFlowResultBase.mjs';
import { ResetPasswordSubmitCodeError } from '../error_type/ResetPasswordError.mjs';
import { ResetPasswordFailedState } from '../state/ResetPasswordFailedState.mjs';
import { RESET_PASSWORD_FAILED_STATE_TYPE, RESET_PASSWORD_PASSWORD_REQUIRED_STATE_TYPE } from '../../../core/auth_flow/AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Result of a reset password operation that requires a code.
 */
class ResetPasswordSubmitCodeResult extends AuthFlowResultBase {
    /**
     * Creates a new instance of ResetPasswordSubmitCodeResult.
     * @param state The state of the result.
     */
    constructor(state) {
        super(state);
    }
    /**
     * Creates a new instance of ResetPasswordSubmitCodeResult with an error.
     * @param error The error that occurred.
     * @returns {ResetPasswordSubmitCodeResult} A new instance of ResetPasswordSubmitCodeResult with the error set.
     */
    static createWithError(error) {
        const result = new ResetPasswordSubmitCodeResult(new ResetPasswordFailedState());
        result.error = new ResetPasswordSubmitCodeError(ResetPasswordSubmitCodeResult.createErrorData(error));
        return result;
    }
    /**
     * Checks if the result is in a failed state.
     */
    isFailed() {
        return this.state.stateType === RESET_PASSWORD_FAILED_STATE_TYPE;
    }
    /**
     * Checks if the result is in a password required state.
     */
    isPasswordRequired() {
        return (this.state.stateType === RESET_PASSWORD_PASSWORD_REQUIRED_STATE_TYPE);
    }
}

export { ResetPasswordSubmitCodeResult };
//# sourceMappingURL=ResetPasswordSubmitCodeResult.mjs.map

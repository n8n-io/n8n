/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthFlowResultBase } from '../../../core/auth_flow/AuthFlowResultBase.mjs';
import { ResetPasswordResendCodeError } from '../error_type/ResetPasswordError.mjs';
import { ResetPasswordFailedState } from '../state/ResetPasswordFailedState.mjs';
import { RESET_PASSWORD_FAILED_STATE_TYPE, RESET_PASSWORD_CODE_REQUIRED_STATE_TYPE } from '../../../core/auth_flow/AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Result of resending code in a reset password operation.
 */
class ResetPasswordResendCodeResult extends AuthFlowResultBase {
    /**
     * Creates a new instance of ResetPasswordResendCodeResult.
     * @param state The state of the result.
     */
    constructor(state) {
        super(state);
    }
    /**
     * Creates a new instance of ResetPasswordResendCodeResult with an error.
     * @param error The error that occurred.
     * @returns {ResetPasswordResendCodeResult} A new instance of ResetPasswordResendCodeResult with the error set.
     */
    static createWithError(error) {
        const result = new ResetPasswordResendCodeResult(new ResetPasswordFailedState());
        result.error = new ResetPasswordResendCodeError(ResetPasswordResendCodeResult.createErrorData(error));
        return result;
    }
    /**
     * Checks if the result is in a failed state.
     */
    isFailed() {
        return this.state.stateType === RESET_PASSWORD_FAILED_STATE_TYPE;
    }
    /**
     * Checks if the result is in a code required state.
     */
    isCodeRequired() {
        return this.state.stateType === RESET_PASSWORD_CODE_REQUIRED_STATE_TYPE;
    }
}

export { ResetPasswordResendCodeResult };
//# sourceMappingURL=ResetPasswordResendCodeResult.mjs.map

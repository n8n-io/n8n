/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthFlowResultBase } from '../../../core/auth_flow/AuthFlowResultBase.mjs';
import { ResetPasswordError } from '../error_type/ResetPasswordError.mjs';
import { ResetPasswordFailedState } from '../state/ResetPasswordFailedState.mjs';
import { RESET_PASSWORD_FAILED_STATE_TYPE, RESET_PASSWORD_CODE_REQUIRED_STATE_TYPE } from '../../../core/auth_flow/AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Result of a reset password operation.
 */
class ResetPasswordStartResult extends AuthFlowResultBase {
    /**
     * Creates a new instance of ResetPasswordStartResult.
     * @param state The state of the result.
     */
    constructor(state) {
        super(state);
    }
    /**
     * Creates a new instance of ResetPasswordStartResult with an error.
     * @param error The error that occurred.
     * @returns {ResetPasswordStartResult} A new instance of ResetPasswordStartResult with the error set.
     */
    static createWithError(error) {
        const result = new ResetPasswordStartResult(new ResetPasswordFailedState());
        result.error = new ResetPasswordError(ResetPasswordStartResult.createErrorData(error));
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

export { ResetPasswordStartResult };
//# sourceMappingURL=ResetPasswordStartResult.mjs.map

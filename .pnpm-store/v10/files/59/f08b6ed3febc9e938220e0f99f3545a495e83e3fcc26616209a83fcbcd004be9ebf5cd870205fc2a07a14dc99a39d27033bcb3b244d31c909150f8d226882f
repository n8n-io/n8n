/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthFlowResultBase } from '../../../core/auth_flow/AuthFlowResultBase.mjs';
import { ResetPasswordSubmitPasswordError } from '../error_type/ResetPasswordError.mjs';
import { ResetPasswordFailedState } from '../state/ResetPasswordFailedState.mjs';
import { RESET_PASSWORD_FAILED_STATE_TYPE, RESET_PASSWORD_COMPLETED_STATE_TYPE } from '../../../core/auth_flow/AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Result of a reset password operation that requires a password.
 */
class ResetPasswordSubmitPasswordResult extends AuthFlowResultBase {
    /**
     * Creates a new instance of ResetPasswordSubmitPasswordResult.
     * @param state The state of the result.
     */
    constructor(state) {
        super(state);
    }
    static createWithError(error) {
        const result = new ResetPasswordSubmitPasswordResult(new ResetPasswordFailedState());
        result.error = new ResetPasswordSubmitPasswordError(ResetPasswordSubmitPasswordResult.createErrorData(error));
        return result;
    }
    /**
     * Checks if the result is in a failed state.
     */
    isFailed() {
        return this.state.stateType === RESET_PASSWORD_FAILED_STATE_TYPE;
    }
    /**
     * Checks if the result is in a completed state.
     */
    isCompleted() {
        return this.state.stateType === RESET_PASSWORD_COMPLETED_STATE_TYPE;
    }
}

export { ResetPasswordSubmitPasswordResult };
//# sourceMappingURL=ResetPasswordSubmitPasswordResult.mjs.map

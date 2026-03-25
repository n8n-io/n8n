/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthFlowResultBase } from '../../../core/auth_flow/AuthFlowResultBase.mjs';
import { SignOutError } from '../error_type/GetAccountError.mjs';
import { SignOutCompletedState, SignOutFailedState } from '../state/SignOutState.mjs';
import { SIGN_OUT_COMPLETED_STATE_TYPE, SIGN_OUT_FAILED_STATE_TYPE } from '../../../core/auth_flow/AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Result of a sign-out operation.
 */
class SignOutResult extends AuthFlowResultBase {
    /**
     * Creates a new instance of SignOutResult.
     * @param state The state of the result.
     */
    constructor() {
        super(new SignOutCompletedState());
    }
    /**
     * Creates a new instance of SignOutResult with an error.
     * @param error The error that occurred during the sign-out operation.
     */
    static createWithError(error) {
        const result = new SignOutResult();
        result.error = new SignOutError(SignOutResult.createErrorData(error));
        result.state = new SignOutFailedState();
        return result;
    }
    /**
     * Checks if the sign-out operation is completed.
     */
    isCompleted() {
        return this.state.stateType === SIGN_OUT_COMPLETED_STATE_TYPE;
    }
    /**
     * Checks if the sign-out operation failed.
     */
    isFailed() {
        return this.state.stateType === SIGN_OUT_FAILED_STATE_TYPE;
    }
}

export { SignOutResult };
//# sourceMappingURL=SignOutResult.mjs.map

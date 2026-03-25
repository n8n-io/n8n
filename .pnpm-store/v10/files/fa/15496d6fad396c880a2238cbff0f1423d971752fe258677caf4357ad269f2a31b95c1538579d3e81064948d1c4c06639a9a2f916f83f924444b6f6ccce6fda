/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthFlowResultBase } from '../../../core/auth_flow/AuthFlowResultBase.mjs';
import { SignUpSubmitAttributesError } from '../error_type/SignUpError.mjs';
import { SignUpFailedState } from '../state/SignUpFailedState.mjs';
import { SIGN_UP_FAILED_STATE_TYPE, SIGN_UP_COMPLETED_STATE_TYPE } from '../../../core/auth_flow/AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Result of a sign-up operation that requires attributes.
 */
class SignUpSubmitAttributesResult extends AuthFlowResultBase {
    /**
     * Creates a new instance of SignUpSubmitAttributesResult.
     * @param state The state of the result.
     */
    constructor(state) {
        super(state);
    }
    /**
     * Creates a new instance of SignUpSubmitAttributesResult with an error.
     * @param error The error that occurred.
     * @returns {SignUpSubmitAttributesResult} A new instance of SignUpSubmitAttributesResult with the error set.
     */
    static createWithError(error) {
        const result = new SignUpSubmitAttributesResult(new SignUpFailedState());
        result.error = new SignUpSubmitAttributesError(SignUpSubmitAttributesResult.createErrorData(error));
        return result;
    }
    /**
     * Checks if the result is in a failed state.
     */
    isFailed() {
        return this.state.stateType === SIGN_UP_FAILED_STATE_TYPE;
    }
    /**
     * Checks if the result is in a completed state.
     */
    isCompleted() {
        return this.state.stateType === SIGN_UP_COMPLETED_STATE_TYPE;
    }
}

export { SignUpSubmitAttributesResult };
//# sourceMappingURL=SignUpSubmitAttributesResult.mjs.map

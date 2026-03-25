/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthFlowResultBase } from '../../../core/auth_flow/AuthFlowResultBase.mjs';
import { GetAccountError } from '../error_type/GetAccountError.mjs';
import { GetAccountCompletedState, GetAccountFailedState } from '../state/GetAccountState.mjs';
import { GET_ACCOUNT_COMPLETED_STATE_TYPE, GET_ACCOUNT_FAILED_STATE_TYPE } from '../../../core/auth_flow/AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Result of getting an account.
 */
class GetAccountResult extends AuthFlowResultBase {
    /**
     * Creates a new instance of GetAccountResult.
     * @param resultData The result data.
     */
    constructor(resultData) {
        super(new GetAccountCompletedState(), resultData);
    }
    /**
     * Creates a new instance of GetAccountResult with an error.
     * @param error The error data.
     */
    static createWithError(error) {
        const result = new GetAccountResult();
        result.error = new GetAccountError(GetAccountResult.createErrorData(error));
        result.state = new GetAccountFailedState();
        return result;
    }
    /**
     * Checks if the result is in a completed state.
     */
    isCompleted() {
        return this.state.stateType === GET_ACCOUNT_COMPLETED_STATE_TYPE;
    }
    /**
     * Checks if the result is in a failed state.
     */
    isFailed() {
        return this.state.stateType === GET_ACCOUNT_FAILED_STATE_TYPE;
    }
}

export { GetAccountResult };
//# sourceMappingURL=GetAccountResult.mjs.map

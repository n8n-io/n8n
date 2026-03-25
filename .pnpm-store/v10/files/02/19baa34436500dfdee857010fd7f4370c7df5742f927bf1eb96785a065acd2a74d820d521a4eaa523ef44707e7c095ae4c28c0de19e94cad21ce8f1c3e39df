/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthFlowResultBase } from '../../../core/auth_flow/AuthFlowResultBase.mjs';
import { GetCurrentAccountAccessTokenError } from '../error_type/GetAccountError.mjs';
import { GetAccessTokenCompletedState, GetAccessTokenFailedState } from '../state/GetAccessTokenState.mjs';
import { GET_ACCESS_TOKEN_COMPLETED_STATE_TYPE, GET_ACCESS_TOKEN_FAILED_STATE_TYPE } from '../../../core/auth_flow/AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Result of getting an access token.
 */
class GetAccessTokenResult extends AuthFlowResultBase {
    /**
     * Creates a new instance of GetAccessTokenResult.
     * @param resultData The result data of the access token.
     */
    constructor(resultData) {
        super(new GetAccessTokenCompletedState(), resultData);
    }
    /**
     * Creates a new instance of GetAccessTokenResult with an error.
     * @param error The error that occurred.
     * @return {GetAccessTokenResult} The result with the error.
     */
    static createWithError(error) {
        const result = new GetAccessTokenResult();
        result.error = new GetCurrentAccountAccessTokenError(GetAccessTokenResult.createErrorData(error));
        result.state = new GetAccessTokenFailedState();
        return result;
    }
    /**
     * Checks if the result is completed.
     */
    isCompleted() {
        return this.state.stateType === GET_ACCESS_TOKEN_COMPLETED_STATE_TYPE;
    }
    /**
     * Checks if the result is failed.
     */
    isFailed() {
        return this.state.stateType === GET_ACCESS_TOKEN_FAILED_STATE_TYPE;
    }
}

export { GetAccessTokenResult };
//# sourceMappingURL=GetAccessTokenResult.mjs.map

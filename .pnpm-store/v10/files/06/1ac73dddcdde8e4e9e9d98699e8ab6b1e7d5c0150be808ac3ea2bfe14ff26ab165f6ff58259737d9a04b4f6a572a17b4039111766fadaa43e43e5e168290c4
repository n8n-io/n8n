/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { CustomAuthAccountData } from "../CustomAuthAccountData.js";
import { GetAccountError } from "../error_type/GetAccountError.js";
import {
    GetAccountCompletedState,
    GetAccountFailedState,
} from "../state/GetAccountState.js";
import {
    GET_ACCOUNT_COMPLETED_STATE_TYPE,
    GET_ACCOUNT_FAILED_STATE_TYPE,
} from "../../../core/auth_flow/AuthFlowStateTypes.js";

/*
 * Result of getting an account.
 */
export class GetAccountResult extends AuthFlowResultBase<
    GetAccountResultState,
    GetAccountError,
    CustomAuthAccountData
> {
    /**
     * Creates a new instance of GetAccountResult.
     * @param resultData The result data.
     */
    constructor(resultData?: CustomAuthAccountData) {
        super(new GetAccountCompletedState(), resultData);
    }

    /**
     * Creates a new instance of GetAccountResult with an error.
     * @param error The error data.
     */
    static createWithError(error: unknown): GetAccountResult {
        const result = new GetAccountResult();
        result.error = new GetAccountError(
            GetAccountResult.createErrorData(error)
        );
        result.state = new GetAccountFailedState();

        return result;
    }

    /**
     * Checks if the result is in a completed state.
     */
    isCompleted(): this is GetAccountResult & {
        state: GetAccountCompletedState;
    } {
        return this.state.stateType === GET_ACCOUNT_COMPLETED_STATE_TYPE;
    }

    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is GetAccountResult & { state: GetAccountFailedState } {
        return this.state.stateType === GET_ACCOUNT_FAILED_STATE_TYPE;
    }
}

/**
 * The possible states for the GetAccountResult.
 * This includes:
 * - GetAccountCompletedState: The account was successfully retrieved.
 * - GetAccountFailedState: The account retrieval failed.
 */
export type GetAccountResultState =
    | GetAccountCompletedState
    | GetAccountFailedState;

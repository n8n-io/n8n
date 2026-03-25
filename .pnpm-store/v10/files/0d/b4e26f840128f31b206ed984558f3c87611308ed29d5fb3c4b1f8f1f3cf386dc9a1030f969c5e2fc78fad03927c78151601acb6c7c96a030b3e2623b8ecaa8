import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { CustomAuthAccountData } from "../CustomAuthAccountData.js";
import { GetAccountError } from "../error_type/GetAccountError.js";
import { GetAccountCompletedState, GetAccountFailedState } from "../state/GetAccountState.js";
export declare class GetAccountResult extends AuthFlowResultBase<GetAccountResultState, GetAccountError, CustomAuthAccountData> {
    /**
     * Creates a new instance of GetAccountResult.
     * @param resultData The result data.
     */
    constructor(resultData?: CustomAuthAccountData);
    /**
     * Creates a new instance of GetAccountResult with an error.
     * @param error The error data.
     */
    static createWithError(error: unknown): GetAccountResult;
    /**
     * Checks if the result is in a completed state.
     */
    isCompleted(): this is GetAccountResult & {
        state: GetAccountCompletedState;
    };
    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is GetAccountResult & {
        state: GetAccountFailedState;
    };
}
/**
 * The possible states for the GetAccountResult.
 * This includes:
 * - GetAccountCompletedState: The account was successfully retrieved.
 * - GetAccountFailedState: The account retrieval failed.
 */
export type GetAccountResultState = GetAccountCompletedState | GetAccountFailedState;
//# sourceMappingURL=GetAccountResult.d.ts.map
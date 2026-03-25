import { AuthenticationResult } from "../../../../response/AuthenticationResult.js";
import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { GetCurrentAccountAccessTokenError } from "../error_type/GetAccountError.js";
import { GetAccessTokenCompletedState, GetAccessTokenFailedState } from "../state/GetAccessTokenState.js";
export declare class GetAccessTokenResult extends AuthFlowResultBase<GetAccessTokenResultState, GetCurrentAccountAccessTokenError, AuthenticationResult> {
    /**
     * Creates a new instance of GetAccessTokenResult.
     * @param resultData The result data of the access token.
     */
    constructor(resultData?: AuthenticationResult);
    /**
     * Creates a new instance of GetAccessTokenResult with an error.
     * @param error The error that occurred.
     * @return {GetAccessTokenResult} The result with the error.
     */
    static createWithError(error: unknown): GetAccessTokenResult;
    /**
     * Checks if the result is completed.
     */
    isCompleted(): this is GetAccessTokenResult & {
        state: GetAccessTokenCompletedState;
    };
    /**
     * Checks if the result is failed.
     */
    isFailed(): this is GetAccessTokenResult & {
        state: GetAccessTokenFailedState;
    };
}
/**
 * The possible states for the GetAccessTokenResult.
 * This includes:
 * - GetAccessTokenCompletedState: The access token was successfully retrieved.
 * - GetAccessTokenFailedState: The access token retrieval failed.
 */
export type GetAccessTokenResultState = GetAccessTokenCompletedState | GetAccessTokenFailedState;
//# sourceMappingURL=GetAccessTokenResult.d.ts.map
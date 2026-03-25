import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { SignOutError } from "../error_type/GetAccountError.js";
import { SignOutCompletedState, SignOutFailedState } from "../state/SignOutState.js";
export declare class SignOutResult extends AuthFlowResultBase<SignOutResultState, SignOutError, void> {
    /**
     * Creates a new instance of SignOutResult.
     * @param state The state of the result.
     */
    constructor();
    /**
     * Creates a new instance of SignOutResult with an error.
     * @param error The error that occurred during the sign-out operation.
     */
    static createWithError(error: unknown): SignOutResult;
    /**
     * Checks if the sign-out operation is completed.
     */
    isCompleted(): this is SignOutResult & {
        state: SignOutCompletedState;
    };
    /**
     * Checks if the sign-out operation failed.
     */
    isFailed(): this is SignOutResult & {
        state: SignOutFailedState;
    };
}
/**
 * The possible states for the SignOutResult.
 * This includes:
 * - SignOutCompletedState: The sign-out operation was successful.
 * - SignOutFailedState: The sign-out operation failed.
 */
export type SignOutResultState = SignOutCompletedState | SignOutFailedState;
//# sourceMappingURL=SignOutResult.d.ts.map
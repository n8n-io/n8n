import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { ResetPasswordSubmitPasswordError } from "../error_type/ResetPasswordError.js";
import { ResetPasswordCompletedState } from "../state/ResetPasswordCompletedState.js";
import { ResetPasswordFailedState } from "../state/ResetPasswordFailedState.js";
export declare class ResetPasswordSubmitPasswordResult extends AuthFlowResultBase<ResetPasswordSubmitPasswordResultState, ResetPasswordSubmitPasswordError, void> {
    /**
     * Creates a new instance of ResetPasswordSubmitPasswordResult.
     * @param state The state of the result.
     */
    constructor(state: ResetPasswordSubmitPasswordResultState);
    static createWithError(error: unknown): ResetPasswordSubmitPasswordResult;
    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is ResetPasswordSubmitPasswordResult & {
        state: ResetPasswordFailedState;
    };
    /**
     * Checks if the result is in a completed state.
     */
    isCompleted(): this is ResetPasswordSubmitPasswordResult & {
        state: ResetPasswordCompletedState;
    };
}
/**
 * The possible states for the ResetPasswordSubmitPasswordResult.
 * This includes:
 * - ResetPasswordCompletedState: The reset password process has completed successfully.
 * - ResetPasswordFailedState: The reset password process has failed.
 */
export type ResetPasswordSubmitPasswordResultState = ResetPasswordCompletedState | ResetPasswordFailedState;
//# sourceMappingURL=ResetPasswordSubmitPasswordResult.d.ts.map
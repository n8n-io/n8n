import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { ResetPasswordError } from "../error_type/ResetPasswordError.js";
import { ResetPasswordCodeRequiredState } from "../state/ResetPasswordCodeRequiredState.js";
import { ResetPasswordFailedState } from "../state/ResetPasswordFailedState.js";
export declare class ResetPasswordStartResult extends AuthFlowResultBase<ResetPasswordStartResultState, ResetPasswordError, void> {
    /**
     * Creates a new instance of ResetPasswordStartResult.
     * @param state The state of the result.
     */
    constructor(state: ResetPasswordStartResultState);
    /**
     * Creates a new instance of ResetPasswordStartResult with an error.
     * @param error The error that occurred.
     * @returns {ResetPasswordStartResult} A new instance of ResetPasswordStartResult with the error set.
     */
    static createWithError(error: unknown): ResetPasswordStartResult;
    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is ResetPasswordStartResult & {
        state: ResetPasswordFailedState;
    };
    /**
     * Checks if the result is in a code required state.
     */
    isCodeRequired(): this is ResetPasswordStartResult & {
        state: ResetPasswordCodeRequiredState;
    };
}
/**
 * The possible states for the ResetPasswordStartResult.
 * This includes:
 * - ResetPasswordCodeRequiredState: The reset password process requires a code.
 * - ResetPasswordFailedState: The reset password process has failed.
 */
export type ResetPasswordStartResultState = ResetPasswordCodeRequiredState | ResetPasswordFailedState;
//# sourceMappingURL=ResetPasswordStartResult.d.ts.map
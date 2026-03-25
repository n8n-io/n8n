import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { ResetPasswordResendCodeError } from "../error_type/ResetPasswordError.js";
import type { ResetPasswordCodeRequiredState } from "../state/ResetPasswordCodeRequiredState.js";
import { ResetPasswordFailedState } from "../state/ResetPasswordFailedState.js";
export declare class ResetPasswordResendCodeResult extends AuthFlowResultBase<ResetPasswordResendCodeResultState, ResetPasswordResendCodeError, void> {
    /**
     * Creates a new instance of ResetPasswordResendCodeResult.
     * @param state The state of the result.
     */
    constructor(state: ResetPasswordResendCodeResultState);
    /**
     * Creates a new instance of ResetPasswordResendCodeResult with an error.
     * @param error The error that occurred.
     * @returns {ResetPasswordResendCodeResult} A new instance of ResetPasswordResendCodeResult with the error set.
     */
    static createWithError(error: unknown): ResetPasswordResendCodeResult;
    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is ResetPasswordResendCodeResult & {
        state: ResetPasswordFailedState;
    };
    /**
     * Checks if the result is in a code required state.
     */
    isCodeRequired(): this is ResetPasswordResendCodeResult & {
        state: ResetPasswordCodeRequiredState;
    };
}
/**
 * The possible states for the ResetPasswordResendCodeResult.
 * This includes:
 * - ResetPasswordCodeRequiredState: The reset password process requires a code.
 * - ResetPasswordFailedState: The reset password process has failed.
 */
export type ResetPasswordResendCodeResultState = ResetPasswordCodeRequiredState | ResetPasswordFailedState;
//# sourceMappingURL=ResetPasswordResendCodeResult.d.ts.map
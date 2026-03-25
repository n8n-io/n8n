import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { ResetPasswordSubmitCodeError } from "../error_type/ResetPasswordError.js";
import { ResetPasswordFailedState } from "../state/ResetPasswordFailedState.js";
import { ResetPasswordPasswordRequiredState } from "../state/ResetPasswordPasswordRequiredState.js";
export declare class ResetPasswordSubmitCodeResult extends AuthFlowResultBase<ResetPasswordSubmitCodeResultState, ResetPasswordSubmitCodeError, void> {
    /**
     * Creates a new instance of ResetPasswordSubmitCodeResult.
     * @param state The state of the result.
     */
    constructor(state: ResetPasswordSubmitCodeResultState);
    /**
     * Creates a new instance of ResetPasswordSubmitCodeResult with an error.
     * @param error The error that occurred.
     * @returns {ResetPasswordSubmitCodeResult} A new instance of ResetPasswordSubmitCodeResult with the error set.
     */
    static createWithError(error: unknown): ResetPasswordSubmitCodeResult;
    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is ResetPasswordSubmitCodeResult & {
        state: ResetPasswordFailedState;
    };
    /**
     * Checks if the result is in a password required state.
     */
    isPasswordRequired(): this is ResetPasswordSubmitCodeResult & {
        state: ResetPasswordPasswordRequiredState;
    };
}
/**
 * The possible states for the ResetPasswordSubmitCodeResult.
 * This includes:
 * - ResetPasswordPasswordRequiredState: The reset password process requires a password.
 * - ResetPasswordFailedState: The reset password process has failed.
 */
export type ResetPasswordSubmitCodeResultState = ResetPasswordPasswordRequiredState | ResetPasswordFailedState;
//# sourceMappingURL=ResetPasswordSubmitCodeResult.d.ts.map
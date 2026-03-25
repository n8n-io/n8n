import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { SignUpResendCodeError } from "../error_type/SignUpError.js";
import type { SignUpCodeRequiredState } from "../state/SignUpCodeRequiredState.js";
import { SignUpFailedState } from "../state/SignUpFailedState.js";
export declare class SignUpResendCodeResult extends AuthFlowResultBase<SignUpResendCodeResultState, SignUpResendCodeError, void> {
    /**
     * Creates a new instance of SignUpResendCodeResult.
     * @param state The state of the result.
     */
    constructor(state: SignUpResendCodeResultState);
    /**
     * Creates a new instance of SignUpResendCodeResult with an error.
     * @param error The error that occurred.
     * @returns {SignUpResendCodeResult} A new instance of SignUpResendCodeResult with the error set.
     */
    static createWithError(error: unknown): SignUpResendCodeResult;
    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is SignUpResendCodeResult & {
        state: SignUpFailedState;
    };
    /**
     * Checks if the result is in a code required state.
     */
    isCodeRequired(): this is SignUpResendCodeResult & {
        state: SignUpCodeRequiredState;
    };
}
/**
 * The possible states for the SignUpResendCodeResult.
 * This includes:
 * - SignUpCodeRequiredState: The sign-up process requires a code.
 * - SignUpFailedState: The sign-up process has failed.
 */
export type SignUpResendCodeResultState = SignUpCodeRequiredState | SignUpFailedState;
//# sourceMappingURL=SignUpResendCodeResult.d.ts.map
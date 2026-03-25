import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { SignUpSubmitCodeError } from "../error_type/SignUpError.js";
import { SignUpAttributesRequiredState } from "../state/SignUpAttributesRequiredState.js";
import { SignUpPasswordRequiredState } from "../state/SignUpPasswordRequiredState.js";
import { SignUpCompletedState } from "../state/SignUpCompletedState.js";
import { SignUpFailedState } from "../state/SignUpFailedState.js";
export declare class SignUpSubmitCodeResult extends AuthFlowResultBase<SignUpSubmitCodeResultState, SignUpSubmitCodeError, void> {
    /**
     * Creates a new instance of SignUpSubmitCodeResult.
     * @param state The state of the result.
     */
    constructor(state: SignUpSubmitCodeResultState);
    /**
     * Creates a new instance of SignUpSubmitCodeResult with an error.
     * @param error The error that occurred.
     * @returns {SignUpSubmitCodeResult} A new instance of SignUpSubmitCodeResult with the error set.
     */
    static createWithError(error: unknown): SignUpSubmitCodeResult;
    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is SignUpSubmitCodeResult & {
        state: SignUpFailedState;
    };
    /**
     * Checks if the result is in a password required state.
     */
    isPasswordRequired(): this is SignUpSubmitCodeResult & {
        state: SignUpPasswordRequiredState;
    };
    /**
     * Checks if the result is in an attributes required state.
     */
    isAttributesRequired(): this is SignUpSubmitCodeResult & {
        state: SignUpAttributesRequiredState;
    };
    /**
     * Checks if the result is in a completed state.
     */
    isCompleted(): this is SignUpSubmitCodeResult & {
        state: SignUpCompletedState;
    };
}
/**
 * The possible states for the SignUpSubmitCodeResult.
 * This includes:
 * - SignUpPasswordRequiredState: The sign-up process requires a password.
 * - SignUpAttributesRequiredState: The sign-up process requires additional attributes.
 * - SignUpCompletedState: The sign-up process has completed successfully.
 * - SignUpFailedState: The sign-up process has failed.
 */
export type SignUpSubmitCodeResultState = SignUpPasswordRequiredState | SignUpAttributesRequiredState | SignUpCompletedState | SignUpFailedState;
//# sourceMappingURL=SignUpSubmitCodeResult.d.ts.map
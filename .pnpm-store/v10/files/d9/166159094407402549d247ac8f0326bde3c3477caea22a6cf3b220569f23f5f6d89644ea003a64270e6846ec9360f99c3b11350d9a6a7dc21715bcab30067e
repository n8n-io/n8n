import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { SignUpError } from "../error_type/SignUpError.js";
import { SignUpAttributesRequiredState } from "../state/SignUpAttributesRequiredState.js";
import { SignUpCodeRequiredState } from "../state/SignUpCodeRequiredState.js";
import { SignUpFailedState } from "../state/SignUpFailedState.js";
import { SignUpPasswordRequiredState } from "../state/SignUpPasswordRequiredState.js";
export declare class SignUpResult extends AuthFlowResultBase<SignUpResultState, SignUpError, void> {
    /**
     * Creates a new instance of SignUpResult.
     * @param state The state of the result.
     */
    constructor(state: SignUpResultState);
    /**
     * Creates a new instance of SignUpResult with an error.
     * @param error The error that occurred.
     * @returns {SignUpResult} A new instance of SignUpResult with the error set.
     */
    static createWithError(error: unknown): SignUpResult;
    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is SignUpResult & {
        state: SignUpFailedState;
    };
    /**
     * Checks if the result is in a code required state.
     */
    isCodeRequired(): this is SignUpResult & {
        state: SignUpCodeRequiredState;
    };
    /**
     * Checks if the result is in a password required state.
     */
    isPasswordRequired(): this is SignUpResult & {
        state: SignUpPasswordRequiredState;
    };
    /**
     * Checks if the result is in an attributes required state.
     */
    isAttributesRequired(): this is SignUpResult & {
        state: SignUpAttributesRequiredState;
    };
}
/**
 * The possible states for the SignUpResult.
 * This includes:
 * - SignUpCodeRequiredState: The sign-up process requires a code.
 * - SignUpPasswordRequiredState: The sign-up process requires a password.
 * - SignUpAttributesRequiredState: The sign-up process requires additional attributes.
 * - SignUpFailedState: The sign-up process has failed.
 */
export type SignUpResultState = SignUpCodeRequiredState | SignUpPasswordRequiredState | SignUpAttributesRequiredState | SignUpFailedState;
//# sourceMappingURL=SignUpResult.d.ts.map
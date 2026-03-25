import { CustomAuthAccountData } from "../../../get_account/auth_flow/CustomAuthAccountData.js";
import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { SignInError } from "../error_type/SignInError.js";
import { SignInCodeRequiredState } from "../state/SignInCodeRequiredState.js";
import { SignInPasswordRequiredState } from "../state/SignInPasswordRequiredState.js";
import { SignInFailedState } from "../state/SignInFailedState.js";
import { SignInCompletedState } from "../state/SignInCompletedState.js";
import { AuthMethodRegistrationRequiredState } from "../../../core/auth_flow/jit/state/AuthMethodRegistrationState.js";
import { MfaAwaitingState } from "../../../core/auth_flow/mfa/state/MfaState.js";
export declare class SignInResult extends AuthFlowResultBase<SignInResultState, SignInError, CustomAuthAccountData> {
    /**
     * Creates a new instance of SignInResultState.
     * @param state The state of the result.
     */
    constructor(state: SignInResultState, resultData?: CustomAuthAccountData);
    /**
     * Creates a new instance of SignInResult with an error.
     * @param error The error that occurred.
     * @returns {SignInResult} A new instance of SignInResult with the error set.
     */
    static createWithError(error: unknown): SignInResult;
    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is SignInResult & {
        state: SignInFailedState;
    };
    /**
     * Checks if the result is in a code required state.
     */
    isCodeRequired(): this is SignInResult & {
        state: SignInCodeRequiredState;
    };
    /**
     * Checks if the result is in a password required state.
     */
    isPasswordRequired(): this is SignInResult & {
        state: SignInPasswordRequiredState;
    };
    /**
     * Checks if the result is in a completed state.
     */
    isCompleted(): this is SignInResult & {
        state: SignInCompletedState;
    };
    /**
     * Checks if the result requires authentication method registration.
     */
    isAuthMethodRegistrationRequired(): this is SignInResult & {
        state: AuthMethodRegistrationRequiredState;
    };
    /**
     * Checks if the result requires MFA.
     */
    isMfaRequired(): this is SignInResult & {
        state: MfaAwaitingState;
    };
}
/**
 * The possible states for the SignInResult.
 * This includes:
 * - SignInCodeRequiredState: The sign-in process requires a code.
 * - SignInPasswordRequiredState: The sign-in process requires a password.
 * - SignInFailedState: The sign-in process has failed.
 * - SignInCompletedState: The sign-in process is completed.
 * - AuthMethodRegistrationRequiredState: The sign-in process requires authentication method registration.
 * - MfaAwaitingState: The sign-in process requires MFA.
 */
export type SignInResultState = SignInCodeRequiredState | SignInPasswordRequiredState | SignInFailedState | SignInCompletedState | AuthMethodRegistrationRequiredState | MfaAwaitingState;
//# sourceMappingURL=SignInResult.d.ts.map
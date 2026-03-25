import { SignInSubmitPasswordError } from "../error_type/SignInError.js";
import { SignInCompletedState } from "../state/SignInCompletedState.js";
import { SignInFailedState } from "../state/SignInFailedState.js";
import { AuthFlowResultBase } from "../../../core/auth_flow/AuthFlowResultBase.js";
import { CustomAuthAccountData } from "../../../get_account/auth_flow/CustomAuthAccountData.js";
import { AuthMethodRegistrationRequiredState } from "../../../core/auth_flow/jit/state/AuthMethodRegistrationState.js";
import { MfaAwaitingState } from "../../../core/auth_flow/mfa/state/MfaState.js";
export declare class SignInSubmitPasswordResult extends AuthFlowResultBase<SignInSubmitPasswordResultState, SignInSubmitPasswordError, CustomAuthAccountData> {
    static createWithError(error: unknown): SignInSubmitPasswordResult;
    /**
     * Checks if the result is in a failed state.
     */
    isFailed(): this is SignInSubmitPasswordResult & {
        state: SignInFailedState;
    };
    /**
     * Checks if the result is in a completed state.
     */
    isCompleted(): this is SignInSubmitPasswordResult & {
        state: SignInCompletedState;
    };
    /**
     * Checks if the result requires authentication method registration.
     */
    isAuthMethodRegistrationRequired(): this is SignInSubmitPasswordResult & {
        state: AuthMethodRegistrationRequiredState;
    };
    /**
     * Checks if the result requires MFA.
     */
    isMfaRequired(): this is SignInSubmitPasswordResult & {
        state: MfaAwaitingState;
    };
}
/**
 * The possible states of the SignInSubmitPasswordResult.
 * This includes:
 * - SignInCompletedState: The sign-in process has completed successfully.
 * - SignInFailedState: The sign-in process has failed.
 * - AuthMethodRegistrationRequiredState: The sign-in process requires authentication method registration.
 * - MfaAwaitingState: The sign-in process requires MFA.
 */
export type SignInSubmitPasswordResultState = SignInCompletedState | SignInFailedState | AuthMethodRegistrationRequiredState | MfaAwaitingState;
//# sourceMappingURL=SignInSubmitPasswordResult.d.ts.map
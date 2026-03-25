import { AuthFlowActionRequiredStateBase } from "../../../core/auth_flow/AuthFlowState.js";
import { AuthMethodRegistrationRequiredState } from "../../../core/auth_flow/jit/state/AuthMethodRegistrationState.js";
import { MfaAwaitingState } from "../../../core/auth_flow/mfa/state/MfaState.js";
import { CustomAuthAccountData } from "../../../get_account/auth_flow/CustomAuthAccountData.js";
import { SignInCompletedResult, SignInJitRequiredResult, SignInMfaRequiredResult } from "../../interaction_client/result/SignInActionResult.js";
import { SignInCompletedState } from "./SignInCompletedState.js";
import { SignInStateParameters } from "./SignInStateParameters.js";
export declare abstract class SignInState<TParameters extends SignInStateParameters> extends AuthFlowActionRequiredStateBase<TParameters> {
    constructor(stateParameters: TParameters);
    /**
     * Handles the result of a sign-in attempt.
     * @param result - The result of the sign-in attempt.
     * @param scopes - The scopes requested for the sign-in.
     * @returns An object containing the next state and account information, if applicable.
     */
    protected handleSignInResult(result: SignInCompletedResult | SignInJitRequiredResult | SignInMfaRequiredResult, scopes?: string[]): {
        state: SignInCompletedState | AuthMethodRegistrationRequiredState | MfaAwaitingState;
        accountInfo?: CustomAuthAccountData;
        error?: Error;
    };
}
//# sourceMappingURL=SignInState.d.ts.map
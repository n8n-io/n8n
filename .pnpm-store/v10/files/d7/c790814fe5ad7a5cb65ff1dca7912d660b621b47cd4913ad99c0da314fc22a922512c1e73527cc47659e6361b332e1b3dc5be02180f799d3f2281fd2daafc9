import { CustomAuthInteractionClientBase } from "../../core/interaction_client/CustomAuthInteractionClientBase.js";
import { SignInStartParams, SignInResendCodeParams, SignInSubmitCodeParams, SignInSubmitPasswordParams, SignInContinuationTokenParams } from "./parameter/SignInParams.js";
import { SignInCodeSendResult, SignInCompletedResult, SignInPasswordRequiredResult, SignInJitRequiredResult, SignInMfaRequiredResult } from "./result/SignInActionResult.js";
export declare class SignInClient extends CustomAuthInteractionClientBase {
    /**
     * Starts the signin flow.
     * @param parameters The parameters required to start the sign-in flow.
     * @returns The result of the sign-in start operation.
     */
    start(parameters: SignInStartParams): Promise<SignInPasswordRequiredResult | SignInCodeSendResult>;
    /**
     * Resends the code for sign-in flow.
     * @param parameters The parameters required to resend the code.
     * @returns The result of the sign-in resend code action.
     */
    resendCode(parameters: SignInResendCodeParams): Promise<SignInCodeSendResult>;
    /**
     * Submits the code for sign-in flow.
     * @param parameters The parameters required to submit the code.
     * @returns The result of the sign-in submit code action.
     */
    submitCode(parameters: SignInSubmitCodeParams): Promise<SignInCompletedResult | SignInJitRequiredResult | SignInMfaRequiredResult>;
    /**
     * Submits the password for sign-in flow.
     * @param parameters The parameters required to submit the password.
     * @returns The result of the sign-in submit password action.
     */
    submitPassword(parameters: SignInSubmitPasswordParams): Promise<SignInCompletedResult | SignInJitRequiredResult | SignInMfaRequiredResult>;
    /**
     * Signs in with continuation token.
     * @param parameters The parameters required to sign in with continuation token.
     * @returns The result of the sign-in complete action.
     */
    signInWithContinuationToken(parameters: SignInContinuationTokenParams): Promise<SignInCompletedResult | SignInJitRequiredResult | SignInMfaRequiredResult>;
    /**
     * Common method to handle token endpoint calls and create sign-in results.
     * @param tokenEndpointCaller Function that calls the specific token endpoint
     * @param scopes Scopes for the token request
     * @param correlationId Correlation ID for logging and result
     * @param telemetryManager Telemetry manager for telemetry logging
     * @returns SignInCompletedResult | SignInJitRequiredResult | SignInMfaRequiredResult with authentication result
     */
    private performTokenRequest;
    private performChallengeRequest;
    private getPublicApiIdBySignInScenario;
    private handleJitRequiredError;
    private handleMfaRequiredError;
}
//# sourceMappingURL=SignInClient.d.ts.map
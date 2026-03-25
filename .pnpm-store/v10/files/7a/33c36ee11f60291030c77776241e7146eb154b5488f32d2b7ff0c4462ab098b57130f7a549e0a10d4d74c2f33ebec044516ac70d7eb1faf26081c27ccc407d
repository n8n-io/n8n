import { CustomAuthInteractionClientBase } from "../../core/interaction_client/CustomAuthInteractionClientBase.js";
import { SignUpResendCodeParams, SignUpStartParams, SignUpSubmitCodeParams, SignUpSubmitPasswordParams, SignUpSubmitUserAttributesParams } from "./parameter/SignUpParams.js";
import { SignUpAttributesRequiredResult, SignUpCodeRequiredResult, SignUpCompletedResult, SignUpPasswordRequiredResult } from "./result/SignUpActionResult.js";
export declare class SignUpClient extends CustomAuthInteractionClientBase {
    /**
     * Starts the sign up flow.
     * @param parameters The parameters for the sign up start action.
     * @returns The result of the sign up start action.
     */
    start(parameters: SignUpStartParams): Promise<SignUpPasswordRequiredResult | SignUpCodeRequiredResult>;
    /**
     * Submits the code for the sign up flow.
     * @param parameters The parameters for the sign up submit code action.
     * @returns The result of the sign up submit code action.
     */
    submitCode(parameters: SignUpSubmitCodeParams): Promise<SignUpCompletedResult | SignUpPasswordRequiredResult | SignUpAttributesRequiredResult>;
    /**
     * Submits the password for the sign up flow.
     * @param parameter The parameters for the sign up submit password action.
     * @returns The result of the sign up submit password action.
     */
    submitPassword(parameter: SignUpSubmitPasswordParams): Promise<SignUpCompletedResult | SignUpCodeRequiredResult | SignUpAttributesRequiredResult>;
    /**
     * Submits the attributes for the sign up flow.
     * @param parameter The parameters for the sign up submit attributes action.
     * @returns The result of the sign up submit attributes action.
     */
    submitAttributes(parameter: SignUpSubmitUserAttributesParams): Promise<SignUpCompletedResult | SignUpPasswordRequiredResult | SignUpCodeRequiredResult>;
    /**
     * Resends the code for the sign up flow.
     * @param parameters The parameters for the sign up resend code action.
     * @returns The result of the sign up resend code action.
     */
    resendCode(parameters: SignUpResendCodeParams): Promise<SignUpCodeRequiredResult>;
    private performChallengeRequest;
    private performContinueRequest;
    private handleContinueResponseError;
    private isAttributesRequiredError;
    private readContinuationTokenFromResponeError;
}
//# sourceMappingURL=SignUpClient.d.ts.map
import { CustomAuthInteractionClientBase } from "../CustomAuthInteractionClientBase.js";
import { MfaRequestChallengeParams, MfaSubmitChallengeParams } from "./parameter/MfaClientParameters.js";
import { MfaVerificationRequiredResult, MfaCompletedResult } from "./result/MfaActionResult.js";
/**
 * MFA client for handling multi-factor authentication flows.
 */
export declare class MfaClient extends CustomAuthInteractionClientBase {
    /**
     * Requests an MFA challenge to be sent to the user.
     * @param parameters The parameters for requesting the challenge.
     * @returns Promise that resolves to either MfaVerificationRequiredResult.
     */
    requestChallenge(parameters: MfaRequestChallengeParams): Promise<MfaVerificationRequiredResult>;
    /**
     * Submits the MFA challenge response (e.g., OTP code).
     * @param parameters The parameters for submitting the challenge.
     * @returns Promise that resolves to MfaCompletedResult.
     */
    submitChallenge(parameters: MfaSubmitChallengeParams): Promise<MfaCompletedResult>;
}
//# sourceMappingURL=MfaClient.d.ts.map
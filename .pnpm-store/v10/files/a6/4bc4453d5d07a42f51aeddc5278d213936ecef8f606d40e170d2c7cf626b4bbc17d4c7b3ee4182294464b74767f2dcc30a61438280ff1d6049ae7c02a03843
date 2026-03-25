import { MfaAwaitingStateParameters, MfaStateParameters, MfaVerificationRequiredStateParameters } from "./MfaStateParameters.js";
import { MfaSubmitChallengeResult } from "../result/MfaSubmitChallengeResult.js";
import { MfaRequestChallengeResult } from "../result/MfaRequestChallengeResult.js";
import { AuthenticationMethod } from "../../../network_client/custom_auth_api/types/ApiResponseTypes.js";
import { AuthFlowActionRequiredStateBase } from "../../AuthFlowState.js";
declare abstract class MfaState<TParameters extends MfaStateParameters> extends AuthFlowActionRequiredStateBase<TParameters> {
    /**
     * Requests an MFA challenge for a specific authentication method.
     * @param authMethodId The authentication method ID to use for the challenge.
     * @returns Promise that resolves to MfaRequestChallengeResult.
     */
    requestChallenge(authMethodId: string): Promise<MfaRequestChallengeResult>;
}
/**
 * State indicating that MFA is required and awaiting user action.
 * This state allows the developer to pause execution before sending the code to the user's email.
 */
export declare class MfaAwaitingState extends MfaState<MfaAwaitingStateParameters> {
    /**
     * The type of the state.
     */
    stateType: string;
    /**
     * Gets the available authentication methods for MFA.
     * @returns Array of available authentication methods.
     */
    getAuthMethods(): AuthenticationMethod[];
}
/**
 * State indicating that MFA verification is required.
 * The challenge has been sent and the user needs to provide the code.
 */
export declare class MfaVerificationRequiredState extends MfaState<MfaVerificationRequiredStateParameters> {
    /**
     * The type of the state.
     */
    stateType: string;
    /**
     * Gets the length of the code that the user needs to provide.
     * @returns The expected code length.
     */
    getCodeLength(): number;
    /**
     * Gets the channel through which the challenge was sent.
     * @returns The challenge channel (e.g., "email").
     */
    getChannel(): string;
    /**
     * Gets the target label indicating where the challenge was sent.
     * @returns The challenge target label (e.g., masked email address).
     */
    getSentTo(): string;
    /**
     * Submits the MFA challenge (e.g., OTP code) to complete the authentication.
     * @param challenge The challenge code (e.g., OTP code) entered by the user.
     * @returns Promise that resolves to MfaSubmitChallengeResult.
     */
    submitChallenge(challenge: string): Promise<MfaSubmitChallengeResult>;
}
export {};
//# sourceMappingURL=MfaState.d.ts.map
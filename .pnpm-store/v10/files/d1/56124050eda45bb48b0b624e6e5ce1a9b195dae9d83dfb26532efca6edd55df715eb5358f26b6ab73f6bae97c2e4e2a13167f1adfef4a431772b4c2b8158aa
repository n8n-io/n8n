import { AuthMethodRegistrationStateParameters, AuthMethodRegistrationRequiredStateParameters, AuthMethodVerificationRequiredStateParameters } from "./AuthMethodRegistrationStateParameters.js";
import { AuthMethodDetails } from "../AuthMethodDetails.js";
import { AuthenticationMethod } from "../../../network_client/custom_auth_api/types/ApiResponseTypes.js";
import { AuthFlowActionRequiredStateBase } from "../../AuthFlowState.js";
import { AuthMethodRegistrationChallengeMethodResult } from "../result/AuthMethodRegistrationChallengeMethodResult.js";
import { AuthMethodRegistrationSubmitChallengeResult } from "../result/AuthMethodRegistrationSubmitChallengeResult.js";
/**
 * Abstract base class for authentication method registration states.
 */
declare abstract class AuthMethodRegistrationState<TParameters extends AuthMethodRegistrationStateParameters> extends AuthFlowActionRequiredStateBase<TParameters> {
    /**
     * Internal method to challenge an authentication method.
     * @param authMethodDetails The authentication method details to challenge.
     * @returns Promise that resolves to AuthMethodRegistrationChallengeMethodResult.
     */
    protected challengeAuthMethodInternal(authMethodDetails: AuthMethodDetails): Promise<AuthMethodRegistrationChallengeMethodResult>;
}
/**
 * State indicating that authentication method registration is required.
 */
export declare class AuthMethodRegistrationRequiredState extends AuthMethodRegistrationState<AuthMethodRegistrationRequiredStateParameters> {
    /**
     * The type of the state.
     */
    stateType: string;
    /**
     * Gets the available authentication methods for registration.
     * @returns Array of available authentication methods.
     */
    getAuthMethods(): AuthenticationMethod[];
    /**
     * Challenges an authentication method for registration.
     * @param authMethodDetails The authentication method details to challenge.
     * @returns Promise that resolves to AuthMethodRegistrationChallengeMethodResult.
     */
    challengeAuthMethod(authMethodDetails: AuthMethodDetails): Promise<AuthMethodRegistrationChallengeMethodResult>;
}
/**
 * State indicating that verification is required for the challenged authentication method.
 */
export declare class AuthMethodVerificationRequiredState extends AuthMethodRegistrationState<AuthMethodVerificationRequiredStateParameters> {
    /**
     * The type of the state.
     */
    stateType: string;
    /**
     * Gets the length of the expected verification code.
     * @returns The code length.
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
     * Submits the verification challenge to complete the authentication method registration.
     * @param code The verification code entered by the user.
     * @returns Promise that resolves to AuthMethodRegistrationSubmitChallengeResult.
     */
    submitChallenge(code: string): Promise<AuthMethodRegistrationSubmitChallengeResult>;
    /**
     * Challenges a different authentication method for registration.
     * @param authMethodDetails The authentication method details to challenge.
     * @returns Promise that resolves to AuthMethodRegistrationChallengeMethodResult.
     */
    challengeAuthMethod(authMethodDetails: AuthMethodDetails): Promise<AuthMethodRegistrationChallengeMethodResult>;
}
export {};
//# sourceMappingURL=AuthMethodRegistrationState.d.ts.map
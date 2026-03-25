import { CustomAuthInteractionClientBase } from "../CustomAuthInteractionClientBase.js";
import { JitChallengeAuthMethodParams, JitSubmitChallengeParams } from "./parameter/JitParams.js";
import { JitVerificationRequiredResult, JitCompletedResult } from "./result/JitActionResult.js";
/**
 * JIT client for handling just-in-time authentication method registration flows.
 */
export declare class JitClient extends CustomAuthInteractionClientBase {
    /**
     * Challenges an authentication method for JIT registration.
     * @param parameters The parameters for challenging the auth method.
     * @returns Promise that resolves to either JitVerificationRequiredResult or JitCompletedResult.
     */
    challengeAuthMethod(parameters: JitChallengeAuthMethodParams): Promise<JitVerificationRequiredResult | JitCompletedResult>;
    /**
     * Submits challenge response and completes JIT registration.
     * @param parameters The parameters for submitting the challenge.
     * @returns Promise that resolves to JitCompletedResult.
     */
    submitChallenge(parameters: JitSubmitChallengeParams): Promise<JitCompletedResult>;
}
//# sourceMappingURL=JitClient.d.ts.map
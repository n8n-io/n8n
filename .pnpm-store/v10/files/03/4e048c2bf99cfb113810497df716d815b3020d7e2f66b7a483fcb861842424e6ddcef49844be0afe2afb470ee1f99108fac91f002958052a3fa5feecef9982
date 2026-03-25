import { AuthenticationResult } from "../../../../../response/AuthenticationResult.js";
interface MfaActionResult {
    type: string;
    correlationId: string;
}
export interface MfaVerificationRequiredResult extends MfaActionResult {
    type: typeof MFA_VERIFICATION_REQUIRED_RESULT_TYPE;
    continuationToken: string;
    challengeChannel: string;
    challengeTargetLabel: string;
    codeLength: number;
    bindingMethod: string;
}
export interface MfaCompletedResult extends MfaActionResult {
    type: typeof MFA_COMPLETED_RESULT_TYPE;
    authenticationResult: AuthenticationResult;
}
export declare const MFA_VERIFICATION_REQUIRED_RESULT_TYPE = "MfaVerificationRequiredResult";
export declare const MFA_COMPLETED_RESULT_TYPE = "MfaCompletedResult";
export declare function createMfaVerificationRequiredResult(input: Omit<MfaVerificationRequiredResult, "type">): MfaVerificationRequiredResult;
export declare function createMfaCompletedResult(input: Omit<MfaCompletedResult, "type">): MfaCompletedResult;
export {};
//# sourceMappingURL=MfaActionResult.d.ts.map
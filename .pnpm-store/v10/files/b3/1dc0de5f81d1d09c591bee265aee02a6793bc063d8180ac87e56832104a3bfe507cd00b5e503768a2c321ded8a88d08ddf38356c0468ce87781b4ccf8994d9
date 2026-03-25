import { AuthenticationResult } from "../../../../../response/AuthenticationResult.js";
interface JitActionResult {
    type: string;
    correlationId: string;
}
export interface JitVerificationRequiredResult extends JitActionResult {
    type: typeof JIT_VERIFICATION_REQUIRED_RESULT_TYPE;
    continuationToken: string;
    challengeChannel: string;
    challengeTargetLabel: string;
    codeLength: number;
}
export interface JitCompletedResult extends JitActionResult {
    type: typeof JIT_COMPLETED_RESULT_TYPE;
    authenticationResult: AuthenticationResult;
}
export declare const JIT_VERIFICATION_REQUIRED_RESULT_TYPE = "JitVerificationRequiredResult";
export declare const JIT_COMPLETED_RESULT_TYPE = "JitCompletedResult";
export declare function createJitVerificationRequiredResult(input: Omit<JitVerificationRequiredResult, "type">): JitVerificationRequiredResult;
export declare function createJitCompletedResult(input: Omit<JitCompletedResult, "type">): JitCompletedResult;
export {};
//# sourceMappingURL=JitActionResult.d.ts.map
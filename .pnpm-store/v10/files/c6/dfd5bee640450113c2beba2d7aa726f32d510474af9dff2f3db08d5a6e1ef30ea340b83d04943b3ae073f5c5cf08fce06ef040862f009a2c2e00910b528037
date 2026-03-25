import { AuthenticationResult } from "../../../../response/AuthenticationResult.js";
import { AuthenticationMethod } from "../../../core/network_client/custom_auth_api/types/ApiResponseTypes.js";
interface SignInActionResult {
    type: string;
    correlationId: string;
}
interface SignInContinuationTokenResult extends SignInActionResult {
    continuationToken: string;
}
export interface SignInCompletedResult extends SignInActionResult {
    type: typeof SIGN_IN_COMPLETED_RESULT_TYPE;
    authenticationResult: AuthenticationResult;
}
export interface SignInPasswordRequiredResult extends SignInContinuationTokenResult {
    type: typeof SIGN_IN_PASSWORD_REQUIRED_RESULT_TYPE;
}
export interface SignInCodeSendResult extends SignInContinuationTokenResult {
    type: typeof SIGN_IN_CODE_SEND_RESULT_TYPE;
    challengeChannel: string;
    challengeTargetLabel: string;
    codeLength: number;
    bindingMethod: string;
}
export interface SignInJitRequiredResult extends SignInContinuationTokenResult {
    type: typeof SIGN_IN_JIT_REQUIRED_RESULT_TYPE;
    authMethods: AuthenticationMethod[];
}
export interface SignInMfaRequiredResult extends SignInContinuationTokenResult {
    type: typeof SIGN_IN_MFA_REQUIRED_RESULT_TYPE;
    authMethods: AuthenticationMethod[];
}
export declare const SIGN_IN_CODE_SEND_RESULT_TYPE = "SignInCodeSendResult";
export declare const SIGN_IN_PASSWORD_REQUIRED_RESULT_TYPE = "SignInPasswordRequiredResult";
export declare const SIGN_IN_COMPLETED_RESULT_TYPE = "SignInCompletedResult";
export declare const SIGN_IN_JIT_REQUIRED_RESULT_TYPE = "SignInJitRequiredResult";
export declare const SIGN_IN_MFA_REQUIRED_RESULT_TYPE = "SignInMfaRequiredResult";
export declare function createSignInCompleteResult(input: Omit<SignInCompletedResult, "type">): SignInCompletedResult;
export declare function createSignInPasswordRequiredResult(input: Omit<SignInPasswordRequiredResult, "type">): SignInPasswordRequiredResult;
export declare function createSignInCodeSendResult(input: Omit<SignInCodeSendResult, "type">): SignInCodeSendResult;
export declare function createSignInJitRequiredResult(input: Omit<SignInJitRequiredResult, "type">): SignInJitRequiredResult;
export declare function createSignInMfaRequiredResult(input: Omit<SignInMfaRequiredResult, "type">): SignInMfaRequiredResult;
export {};
//# sourceMappingURL=SignInActionResult.d.ts.map
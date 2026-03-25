import { UserAttribute } from "../../../core/network_client/custom_auth_api/types/ApiErrorResponseTypes.js";
interface SignUpActionResult {
    type: string;
    correlationId: string;
    continuationToken: string;
}
export interface SignUpCompletedResult extends SignUpActionResult {
    type: typeof SIGN_UP_COMPLETED_RESULT_TYPE;
}
export interface SignUpPasswordRequiredResult extends SignUpActionResult {
    type: typeof SIGN_UP_PASSWORD_REQUIRED_RESULT_TYPE;
}
export interface SignUpCodeRequiredResult extends SignUpActionResult {
    type: typeof SIGN_UP_CODE_REQUIRED_RESULT_TYPE;
    challengeChannel: string;
    challengeTargetLabel: string;
    codeLength: number;
    interval: number;
    bindingMethod: string;
}
export interface SignUpAttributesRequiredResult extends SignUpActionResult {
    type: typeof SIGN_UP_ATTRIBUTES_REQUIRED_RESULT_TYPE;
    requiredAttributes: Array<UserAttribute>;
}
export declare const SIGN_UP_COMPLETED_RESULT_TYPE = "SignUpCompletedResult";
export declare const SIGN_UP_PASSWORD_REQUIRED_RESULT_TYPE = "SignUpPasswordRequiredResult";
export declare const SIGN_UP_CODE_REQUIRED_RESULT_TYPE = "SignUpCodeRequiredResult";
export declare const SIGN_UP_ATTRIBUTES_REQUIRED_RESULT_TYPE = "SignUpAttributesRequiredResult";
export declare function createSignUpCompletedResult(input: Omit<SignUpCompletedResult, "type">): SignUpCompletedResult;
export declare function createSignUpPasswordRequiredResult(input: Omit<SignUpPasswordRequiredResult, "type">): SignUpPasswordRequiredResult;
export declare function createSignUpCodeRequiredResult(input: Omit<SignUpCodeRequiredResult, "type">): SignUpCodeRequiredResult;
export declare function createSignUpAttributesRequiredResult(input: Omit<SignUpAttributesRequiredResult, "type">): SignUpAttributesRequiredResult;
export {};
//# sourceMappingURL=SignUpActionResult.d.ts.map
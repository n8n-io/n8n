import { AuthActionErrorBase } from "../../AuthFlowErrorBase.js";
/**
 * Error that occurred during MFA challenge request.
 */
export declare class MfaRequestChallengeError extends AuthActionErrorBase {
    /**
     * Checks if the input for MFA challenge is incorrect.
     * @returns true if the input is incorrect, false otherwise.
     */
    isInvalidInput(): boolean;
    /**
     * Checks if the error is due to the verification contact (e.g., phone number or email) being blocked. Consider contacting customer support for assistance.
     * @returns true if the error is due to the verification contact being blocked, false otherwise.
     */
    isVerificationContactBlocked(): boolean;
}
/**
 * Error that occurred during MFA challenge submission.
 */
export declare class MfaSubmitChallengeError extends AuthActionErrorBase {
    /**
     * Checks if the submitted challenge code (e.g., OTP code) is incorrect.
     * @returns true if the challenge code is invalid, false otherwise.
     */
    isIncorrectChallenge(): boolean;
}
//# sourceMappingURL=MfaError.d.ts.map
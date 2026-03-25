import { AuthActionErrorBase } from "../../../core/auth_flow/AuthFlowErrorBase.js";
export declare class ResetPasswordError extends AuthActionErrorBase {
    /**
     * Checks if the error is due to the user not being found.
     * @returns true if the error is due to the user not being found, false otherwise.
     */
    isUserNotFound(): boolean;
    /**
     * Checks if the error is due to the username being invalid.
     * @returns true if the error is due to the username being invalid, false otherwise.
     */
    isInvalidUsername(): boolean;
    /**
     * Checks if the error is due to the provided challenge type is not supported.
     * @returns {boolean} True if the error is due to the provided challenge type is not supported, false otherwise.
     */
    isUnsupportedChallengeType(): boolean;
}
export declare class ResetPasswordSubmitPasswordError extends AuthActionErrorBase {
    /**
     * Checks if the new password is invalid or incorrect.
     * @returns {boolean} True if the new password is invalid, false otherwise.
     */
    isInvalidPassword(): boolean;
    /**
     * Checks if the password reset failed due to reset timeout or password change failed.
     * @returns {boolean} True if the password reset failed, false otherwise.
     */
    isPasswordResetFailed(): boolean;
}
export declare class ResetPasswordSubmitCodeError extends AuthActionErrorBase {
    /**
     * Checks if the provided code is invalid.
     * @returns {boolean} True if the provided code is invalid, false otherwise.
     */
    isInvalidCode(): boolean;
}
export declare class ResetPasswordResendCodeError extends AuthActionErrorBase {
}
//# sourceMappingURL=ResetPasswordError.d.ts.map
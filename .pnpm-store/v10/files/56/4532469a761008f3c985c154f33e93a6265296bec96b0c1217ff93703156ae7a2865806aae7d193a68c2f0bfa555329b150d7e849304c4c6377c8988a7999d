import { AuthActionErrorBase } from "../../../core/auth_flow/AuthFlowErrorBase.js";
export declare class SignInError extends AuthActionErrorBase {
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
     * Checks if the error is due to the provided password being incorrect.
     * @returns true if the error is due to the provided password being incorrect, false otherwise.
     */
    isPasswordIncorrect(): boolean;
    /**
     * Checks if the error is due to password reset being required.
     * @returns true if the error is due to password reset being required, false otherwise.
     */
    isPasswordResetRequired(): boolean;
    /**
     * Checks if the error is due to the provided challenge type is not supported.
     * @returns {boolean} True if the error is due to the provided challenge type is not supported, false otherwise.
     */
    isUnsupportedChallengeType(): boolean;
}
export declare class SignInSubmitPasswordError extends AuthActionErrorBase {
    /**
     * Checks if the password submitted during sign-in is incorrect.
     * @returns {boolean} True if the error is due to the password being invalid, false otherwise.
     */
    isInvalidPassword(): boolean;
}
export declare class SignInSubmitCodeError extends AuthActionErrorBase {
    /**
     * Checks if the code submitted during sign-in is invalid.
     * @returns {boolean} True if the error is due to the code being invalid, false otherwise.
     */
    isInvalidCode(): boolean;
}
export declare class SignInResendCodeError extends AuthActionErrorBase {
}
//# sourceMappingURL=SignInError.d.ts.map
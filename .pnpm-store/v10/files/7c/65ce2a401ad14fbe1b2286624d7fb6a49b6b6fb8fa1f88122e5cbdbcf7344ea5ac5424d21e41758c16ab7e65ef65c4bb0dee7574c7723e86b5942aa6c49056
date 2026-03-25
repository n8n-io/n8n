import { CustomAuthError } from "../error/CustomAuthError.js";
/**
 * Base class for all auth flow errors.
 */
export declare abstract class AuthFlowErrorBase {
    errorData: CustomAuthError;
    constructor(errorData: CustomAuthError);
    protected isUserNotFoundError(): boolean;
    protected isUserInvalidError(): boolean;
    protected isUnsupportedChallengeTypeError(): boolean;
    protected isPasswordIncorrectError(): boolean;
    protected isInvalidCodeError(): boolean;
    protected isRedirectError(): boolean;
    protected isInvalidNewPasswordError(): boolean;
    protected isUserAlreadyExistsError(): boolean;
    protected isAttributeRequiredError(): boolean;
    protected isAttributeValidationFailedError(): boolean;
    protected isNoCachedAccountFoundError(): boolean;
    protected isTokenExpiredError(): boolean;
    /**
     * @todo verify the password change required error can be detected once the MFA is in place.
     * This error will be raised during signin and refresh tokens when calling /token endpoint.
     */
    protected isPasswordResetRequiredError(): boolean;
    protected isInvalidInputError(): boolean;
    protected isVerificationContactBlockedError(): boolean;
}
export declare abstract class AuthActionErrorBase extends AuthFlowErrorBase {
    /**
     * Checks if the error is due to the expired continuation token.
     * @returns {boolean} True if the error is due to the expired continuation token, false otherwise.
     */
    isTokenExpired(): boolean;
    /**
     * Check if client app supports the challenge type configured in Entra.
     * @returns {boolean} True if client app doesn't support the challenge type configured in Entra, "loginPopup" function is required to continue the operation.
     */
    isRedirectRequired(): boolean;
}
//# sourceMappingURL=AuthFlowErrorBase.d.ts.map
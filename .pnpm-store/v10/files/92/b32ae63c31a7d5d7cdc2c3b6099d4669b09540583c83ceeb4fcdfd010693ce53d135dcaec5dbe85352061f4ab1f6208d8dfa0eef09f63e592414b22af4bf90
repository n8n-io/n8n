/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { CustomAuthApiError, RedirectError } from '../error/CustomAuthApiError.mjs';
import { NoCachedAccountFoundError } from '../error/NoCachedAccountFoundError.mjs';
import { InvalidArgumentError } from '../error/InvalidArgumentError.mjs';
import { USER_NOT_FOUND, INVALID_REQUEST, UNSUPPORTED_CHALLENGE_TYPE, INVALID_GRANT, USER_ALREADY_EXISTS, ATTRIBUTES_REQUIRED, EXPIRED_TOKEN, ACCESS_DENIED } from '../network_client/custom_auth_api/types/ApiErrorCodes.mjs';
import { INVALID_OOB_VALUE, ATTRIBUTE_VALIATION_FAILED, PROVIDER_BLOCKED_BY_REPUTATION, PASSWORD_BANNED, PASSWORD_IS_INVALID, PASSWORD_RECENTLY_USED, PASSWORD_TOO_LONG, PASSWORD_TOO_SHORT, PASSWORD_TOO_WEAK } from '../network_client/custom_auth_api/types/ApiSuberrors.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Base class for all auth flow errors.
 */
class AuthFlowErrorBase {
    constructor(errorData) {
        this.errorData = errorData;
    }
    isUserNotFoundError() {
        return this.errorData.error === USER_NOT_FOUND;
    }
    isUserInvalidError() {
        return ((this.errorData instanceof InvalidArgumentError &&
            this.errorData.errorDescription?.includes("username")) ||
            (this.errorData instanceof CustomAuthApiError &&
                !!this.errorData.errorDescription?.includes("username parameter is empty or not valid") &&
                !!this.errorData.errorCodes?.includes(90100)));
    }
    isUnsupportedChallengeTypeError() {
        return ((this.errorData.error === INVALID_REQUEST &&
            (this.errorData.errorDescription?.includes("The challenge_type list parameter contains an unsupported challenge type") ??
                false)) ||
            this.errorData.error ===
                UNSUPPORTED_CHALLENGE_TYPE);
    }
    isPasswordIncorrectError() {
        const isIncorrectPassword = this.errorData.error === INVALID_GRANT &&
            this.errorData instanceof CustomAuthApiError &&
            (this.errorData.errorCodes ?? []).includes(50126);
        const isPasswordEmpty = this.errorData instanceof InvalidArgumentError &&
            this.errorData.errorDescription?.includes("password") === true;
        return isIncorrectPassword || isPasswordEmpty;
    }
    isInvalidCodeError() {
        return ((this.errorData.error === INVALID_GRANT &&
            this.errorData instanceof CustomAuthApiError &&
            this.errorData.subError ===
                INVALID_OOB_VALUE) ||
            (this.errorData instanceof InvalidArgumentError &&
                (this.errorData.errorDescription?.includes("code") ||
                    this.errorData.errorDescription?.includes("challenge")) ===
                    true));
    }
    isRedirectError() {
        return this.errorData instanceof RedirectError;
    }
    isInvalidNewPasswordError() {
        const invalidPasswordSubErrors = new Set([
            PASSWORD_BANNED,
            PASSWORD_IS_INVALID,
            PASSWORD_RECENTLY_USED,
            PASSWORD_TOO_LONG,
            PASSWORD_TOO_SHORT,
            PASSWORD_TOO_WEAK,
        ]);
        return (this.errorData instanceof CustomAuthApiError &&
            this.errorData.error === INVALID_GRANT &&
            invalidPasswordSubErrors.has(this.errorData.subError ?? ""));
    }
    isUserAlreadyExistsError() {
        return (this.errorData instanceof CustomAuthApiError &&
            this.errorData.error === USER_ALREADY_EXISTS);
    }
    isAttributeRequiredError() {
        return (this.errorData instanceof CustomAuthApiError &&
            this.errorData.error === ATTRIBUTES_REQUIRED);
    }
    isAttributeValidationFailedError() {
        return ((this.errorData instanceof CustomAuthApiError &&
            this.errorData.error === INVALID_GRANT &&
            this.errorData.subError ===
                ATTRIBUTE_VALIATION_FAILED) ||
            (this.errorData instanceof InvalidArgumentError &&
                this.errorData.errorDescription?.includes("attributes") ===
                    true));
    }
    isNoCachedAccountFoundError() {
        return this.errorData instanceof NoCachedAccountFoundError;
    }
    isTokenExpiredError() {
        return (this.errorData instanceof CustomAuthApiError &&
            this.errorData.error === EXPIRED_TOKEN);
    }
    /**
     * @todo verify the password change required error can be detected once the MFA is in place.
     * This error will be raised during signin and refresh tokens when calling /token endpoint.
     */
    isPasswordResetRequiredError() {
        return (this.errorData instanceof CustomAuthApiError &&
            this.errorData.error === INVALID_REQUEST &&
            this.errorData.errorCodes?.includes(50142) === true);
    }
    isInvalidInputError() {
        return (this.errorData instanceof CustomAuthApiError &&
            this.errorData.error === INVALID_REQUEST &&
            this.errorData.errorCodes?.includes(901001) === true);
    }
    isVerificationContactBlockedError() {
        return (this.errorData instanceof CustomAuthApiError &&
            this.errorData.error === ACCESS_DENIED &&
            this.errorData.subError ===
                PROVIDER_BLOCKED_BY_REPUTATION);
    }
}
class AuthActionErrorBase extends AuthFlowErrorBase {
    /**
     * Checks if the error is due to the expired continuation token.
     * @returns {boolean} True if the error is due to the expired continuation token, false otherwise.
     */
    isTokenExpired() {
        return this.isTokenExpiredError();
    }
    /**
     * Check if client app supports the challenge type configured in Entra.
     * @returns {boolean} True if client app doesn't support the challenge type configured in Entra, "loginPopup" function is required to continue the operation.
     */
    isRedirectRequired() {
        return this.isRedirectError();
    }
}

export { AuthActionErrorBase, AuthFlowErrorBase };
//# sourceMappingURL=AuthFlowErrorBase.mjs.map

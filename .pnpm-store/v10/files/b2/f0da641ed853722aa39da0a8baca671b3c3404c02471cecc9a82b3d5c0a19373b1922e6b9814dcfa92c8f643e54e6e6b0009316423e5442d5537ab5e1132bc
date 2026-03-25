/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    CustomAuthApiError,
    RedirectError,
} from "../error/CustomAuthApiError.js";
import { CustomAuthError } from "../error/CustomAuthError.js";
import { NoCachedAccountFoundError } from "../error/NoCachedAccountFoundError.js";
import { InvalidArgumentError } from "../error/InvalidArgumentError.js";
import * as CustomAuthApiErrorCode from "../network_client/custom_auth_api/types/ApiErrorCodes.js";
import * as CustomAuthApiSuberror from "../network_client/custom_auth_api/types/ApiSuberrors.js";
/**
 * Base class for all auth flow errors.
 */
export abstract class AuthFlowErrorBase {
    constructor(public errorData: CustomAuthError) {}

    protected isUserNotFoundError(): boolean {
        return this.errorData.error === CustomAuthApiErrorCode.USER_NOT_FOUND;
    }

    protected isUserInvalidError(): boolean {
        return (
            (this.errorData instanceof InvalidArgumentError &&
                this.errorData.errorDescription?.includes("username")) ||
            (this.errorData instanceof CustomAuthApiError &&
                !!this.errorData.errorDescription?.includes(
                    "username parameter is empty or not valid"
                ) &&
                !!this.errorData.errorCodes?.includes(90100))
        );
    }

    protected isUnsupportedChallengeTypeError(): boolean {
        return (
            (this.errorData.error === CustomAuthApiErrorCode.INVALID_REQUEST &&
                (this.errorData.errorDescription?.includes(
                    "The challenge_type list parameter contains an unsupported challenge type"
                ) ??
                    false)) ||
            this.errorData.error ===
                CustomAuthApiErrorCode.UNSUPPORTED_CHALLENGE_TYPE
        );
    }

    protected isPasswordIncorrectError(): boolean {
        const isIncorrectPassword =
            this.errorData.error === CustomAuthApiErrorCode.INVALID_GRANT &&
            this.errorData instanceof CustomAuthApiError &&
            (this.errorData.errorCodes ?? []).includes(50126);

        const isPasswordEmpty =
            this.errorData instanceof InvalidArgumentError &&
            this.errorData.errorDescription?.includes("password") === true;

        return isIncorrectPassword || isPasswordEmpty;
    }

    protected isInvalidCodeError(): boolean {
        return (
            (this.errorData.error === CustomAuthApiErrorCode.INVALID_GRANT &&
                this.errorData instanceof CustomAuthApiError &&
                this.errorData.subError ===
                    CustomAuthApiSuberror.INVALID_OOB_VALUE) ||
            (this.errorData instanceof InvalidArgumentError &&
                (this.errorData.errorDescription?.includes("code") ||
                    this.errorData.errorDescription?.includes("challenge")) ===
                    true)
        );
    }

    protected isRedirectError(): boolean {
        return this.errorData instanceof RedirectError;
    }

    protected isInvalidNewPasswordError(): boolean {
        const invalidPasswordSubErrors = new Set<string>([
            CustomAuthApiSuberror.PASSWORD_BANNED,
            CustomAuthApiSuberror.PASSWORD_IS_INVALID,
            CustomAuthApiSuberror.PASSWORD_RECENTLY_USED,
            CustomAuthApiSuberror.PASSWORD_TOO_LONG,
            CustomAuthApiSuberror.PASSWORD_TOO_SHORT,
            CustomAuthApiSuberror.PASSWORD_TOO_WEAK,
        ]);

        return (
            this.errorData instanceof CustomAuthApiError &&
            this.errorData.error === CustomAuthApiErrorCode.INVALID_GRANT &&
            invalidPasswordSubErrors.has(this.errorData.subError ?? "")
        );
    }

    protected isUserAlreadyExistsError(): boolean {
        return (
            this.errorData instanceof CustomAuthApiError &&
            this.errorData.error === CustomAuthApiErrorCode.USER_ALREADY_EXISTS
        );
    }

    protected isAttributeRequiredError(): boolean {
        return (
            this.errorData instanceof CustomAuthApiError &&
            this.errorData.error === CustomAuthApiErrorCode.ATTRIBUTES_REQUIRED
        );
    }

    protected isAttributeValidationFailedError(): boolean {
        return (
            (this.errorData instanceof CustomAuthApiError &&
                this.errorData.error === CustomAuthApiErrorCode.INVALID_GRANT &&
                this.errorData.subError ===
                    CustomAuthApiSuberror.ATTRIBUTE_VALIATION_FAILED) ||
            (this.errorData instanceof InvalidArgumentError &&
                this.errorData.errorDescription?.includes("attributes") ===
                    true)
        );
    }

    protected isNoCachedAccountFoundError(): boolean {
        return this.errorData instanceof NoCachedAccountFoundError;
    }

    protected isTokenExpiredError(): boolean {
        return (
            this.errorData instanceof CustomAuthApiError &&
            this.errorData.error === CustomAuthApiErrorCode.EXPIRED_TOKEN
        );
    }

    /**
     * @todo verify the password change required error can be detected once the MFA is in place.
     * This error will be raised during signin and refresh tokens when calling /token endpoint.
     */
    protected isPasswordResetRequiredError(): boolean {
        return (
            this.errorData instanceof CustomAuthApiError &&
            this.errorData.error === CustomAuthApiErrorCode.INVALID_REQUEST &&
            this.errorData.errorCodes?.includes(50142) === true
        );
    }

    protected isInvalidInputError(): boolean {
        return (
            this.errorData instanceof CustomAuthApiError &&
            this.errorData.error === CustomAuthApiErrorCode.INVALID_REQUEST &&
            this.errorData.errorCodes?.includes(901001) === true
        );
    }

    protected isVerificationContactBlockedError(): boolean {
        return (
            this.errorData instanceof CustomAuthApiError &&
            this.errorData.error === CustomAuthApiErrorCode.ACCESS_DENIED &&
            this.errorData.subError ===
                CustomAuthApiSuberror.PROVIDER_BLOCKED_BY_REPUTATION
        );
    }
}

export abstract class AuthActionErrorBase extends AuthFlowErrorBase {
    /**
     * Checks if the error is due to the expired continuation token.
     * @returns {boolean} True if the error is due to the expired continuation token, false otherwise.
     */
    isTokenExpired(): boolean {
        return this.isTokenExpiredError();
    }

    /**
     * Check if client app supports the challenge type configured in Entra.
     * @returns {boolean} True if client app doesn't support the challenge type configured in Entra, "loginPopup" function is required to continue the operation.
     */
    isRedirectRequired(): boolean {
        return this.isRedirectError();
    }
}

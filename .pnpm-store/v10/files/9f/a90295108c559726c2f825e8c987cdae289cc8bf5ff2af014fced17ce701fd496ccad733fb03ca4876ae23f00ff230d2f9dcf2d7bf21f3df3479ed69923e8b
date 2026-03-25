/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthActionErrorBase } from '../../../core/auth_flow/AuthFlowErrorBase.mjs';
import { USER_NOT_FOUND } from '../../../core/network_client/custom_auth_api/types/ApiErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class SignInError extends AuthActionErrorBase {
    /**
     * Checks if the error is due to the user not being found.
     * @returns true if the error is due to the user not being found, false otherwise.
     */
    isUserNotFound() {
        return this.errorData.error === USER_NOT_FOUND;
    }
    /**
     * Checks if the error is due to the username being invalid.
     * @returns true if the error is due to the username being invalid, false otherwise.
     */
    isInvalidUsername() {
        return this.isUserInvalidError();
    }
    /**
     * Checks if the error is due to the provided password being incorrect.
     * @returns true if the error is due to the provided password being incorrect, false otherwise.
     */
    isPasswordIncorrect() {
        return this.isPasswordIncorrectError();
    }
    /**
     * Checks if the error is due to password reset being required.
     * @returns true if the error is due to password reset being required, false otherwise.
     */
    isPasswordResetRequired() {
        return this.isPasswordResetRequiredError();
    }
    /**
     * Checks if the error is due to the provided challenge type is not supported.
     * @returns {boolean} True if the error is due to the provided challenge type is not supported, false otherwise.
     */
    isUnsupportedChallengeType() {
        return this.isUnsupportedChallengeTypeError();
    }
}
class SignInSubmitPasswordError extends AuthActionErrorBase {
    /**
     * Checks if the password submitted during sign-in is incorrect.
     * @returns {boolean} True if the error is due to the password being invalid, false otherwise.
     */
    isInvalidPassword() {
        return this.isPasswordIncorrectError();
    }
}
class SignInSubmitCodeError extends AuthActionErrorBase {
    /**
     * Checks if the code submitted during sign-in is invalid.
     * @returns {boolean} True if the error is due to the code being invalid, false otherwise.
     */
    isInvalidCode() {
        return this.isInvalidCodeError();
    }
}
class SignInResendCodeError extends AuthActionErrorBase {
}

export { SignInError, SignInResendCodeError, SignInSubmitCodeError, SignInSubmitPasswordError };
//# sourceMappingURL=SignInError.mjs.map

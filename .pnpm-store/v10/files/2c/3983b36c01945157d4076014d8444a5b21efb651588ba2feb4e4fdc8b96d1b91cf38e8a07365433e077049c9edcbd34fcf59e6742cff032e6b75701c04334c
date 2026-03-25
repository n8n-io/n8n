/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthActionErrorBase } from '../../../core/auth_flow/AuthFlowErrorBase.mjs';
import { CustomAuthApiError } from '../../../core/error/CustomAuthApiError.mjs';
import { PASSWORD_RESET_TIMEOUT, PASSWORD_CHANGE_FAILED } from '../../../core/network_client/custom_auth_api/types/ApiErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class ResetPasswordError extends AuthActionErrorBase {
    /**
     * Checks if the error is due to the user not being found.
     * @returns true if the error is due to the user not being found, false otherwise.
     */
    isUserNotFound() {
        return this.isUserNotFoundError();
    }
    /**
     * Checks if the error is due to the username being invalid.
     * @returns true if the error is due to the username being invalid, false otherwise.
     */
    isInvalidUsername() {
        return this.isUserInvalidError();
    }
    /**
     * Checks if the error is due to the provided challenge type is not supported.
     * @returns {boolean} True if the error is due to the provided challenge type is not supported, false otherwise.
     */
    isUnsupportedChallengeType() {
        return this.isUnsupportedChallengeTypeError();
    }
}
class ResetPasswordSubmitPasswordError extends AuthActionErrorBase {
    /**
     * Checks if the new password is invalid or incorrect.
     * @returns {boolean} True if the new password is invalid, false otherwise.
     */
    isInvalidPassword() {
        return (this.isInvalidNewPasswordError() || this.isPasswordIncorrectError());
    }
    /**
     * Checks if the password reset failed due to reset timeout or password change failed.
     * @returns {boolean} True if the password reset failed, false otherwise.
     */
    isPasswordResetFailed() {
        return (this.errorData instanceof CustomAuthApiError &&
            (this.errorData.error ===
                PASSWORD_RESET_TIMEOUT ||
                this.errorData.error ===
                    PASSWORD_CHANGE_FAILED));
    }
}
class ResetPasswordSubmitCodeError extends AuthActionErrorBase {
    /**
     * Checks if the provided code is invalid.
     * @returns {boolean} True if the provided code is invalid, false otherwise.
     */
    isInvalidCode() {
        return this.isInvalidCodeError();
    }
}
class ResetPasswordResendCodeError extends AuthActionErrorBase {
}

export { ResetPasswordError, ResetPasswordResendCodeError, ResetPasswordSubmitCodeError, ResetPasswordSubmitPasswordError };
//# sourceMappingURL=ResetPasswordError.mjs.map

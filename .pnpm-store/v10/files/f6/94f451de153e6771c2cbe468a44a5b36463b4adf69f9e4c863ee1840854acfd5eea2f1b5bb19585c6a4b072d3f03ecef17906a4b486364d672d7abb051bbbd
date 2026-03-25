/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthActionErrorBase } from "../../../core/auth_flow/AuthFlowErrorBase.js";
import { CustomAuthApiError } from "../../../core/error/CustomAuthApiError.js";
import * as CustomAuthApiErrorCode from "../../../core/network_client/custom_auth_api/types/ApiErrorCodes.js";

export class ResetPasswordError extends AuthActionErrorBase {
    /**
     * Checks if the error is due to the user not being found.
     * @returns true if the error is due to the user not being found, false otherwise.
     */
    isUserNotFound(): boolean {
        return this.isUserNotFoundError();
    }

    /**
     * Checks if the error is due to the username being invalid.
     * @returns true if the error is due to the username being invalid, false otherwise.
     */
    isInvalidUsername(): boolean {
        return this.isUserInvalidError();
    }

    /**
     * Checks if the error is due to the provided challenge type is not supported.
     * @returns {boolean} True if the error is due to the provided challenge type is not supported, false otherwise.
     */
    isUnsupportedChallengeType(): boolean {
        return this.isUnsupportedChallengeTypeError();
    }
}

export class ResetPasswordSubmitPasswordError extends AuthActionErrorBase {
    /**
     * Checks if the new password is invalid or incorrect.
     * @returns {boolean} True if the new password is invalid, false otherwise.
     */
    isInvalidPassword(): boolean {
        return (
            this.isInvalidNewPasswordError() || this.isPasswordIncorrectError()
        );
    }

    /**
     * Checks if the password reset failed due to reset timeout or password change failed.
     * @returns {boolean} True if the password reset failed, false otherwise.
     */
    isPasswordResetFailed(): boolean {
        return (
            this.errorData instanceof CustomAuthApiError &&
            (this.errorData.error ===
                CustomAuthApiErrorCode.PASSWORD_RESET_TIMEOUT ||
                this.errorData.error ===
                    CustomAuthApiErrorCode.PASSWORD_CHANGE_FAILED)
        );
    }
}

export class ResetPasswordSubmitCodeError extends AuthActionErrorBase {
    /**
     * Checks if the provided code is invalid.
     * @returns {boolean} True if the provided code is invalid, false otherwise.
     */
    isInvalidCode(): boolean {
        return this.isInvalidCodeError();
    }
}

export class ResetPasswordResendCodeError extends AuthActionErrorBase {}

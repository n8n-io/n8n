/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthActionErrorBase } from "../../../core/auth_flow/AuthFlowErrorBase.js";
import * as CustomAuthApiErrorCode from "../../../core/network_client/custom_auth_api/types/ApiErrorCodes.js";

export class SignInError extends AuthActionErrorBase {
    /**
     * Checks if the error is due to the user not being found.
     * @returns true if the error is due to the user not being found, false otherwise.
     */
    isUserNotFound(): boolean {
        return this.errorData.error === CustomAuthApiErrorCode.USER_NOT_FOUND;
    }

    /**
     * Checks if the error is due to the username being invalid.
     * @returns true if the error is due to the username being invalid, false otherwise.
     */
    isInvalidUsername(): boolean {
        return this.isUserInvalidError();
    }

    /**
     * Checks if the error is due to the provided password being incorrect.
     * @returns true if the error is due to the provided password being incorrect, false otherwise.
     */
    isPasswordIncorrect(): boolean {
        return this.isPasswordIncorrectError();
    }

    /**
     * Checks if the error is due to password reset being required.
     * @returns true if the error is due to password reset being required, false otherwise.
     */
    isPasswordResetRequired(): boolean {
        return this.isPasswordResetRequiredError();
    }

    /**
     * Checks if the error is due to the provided challenge type is not supported.
     * @returns {boolean} True if the error is due to the provided challenge type is not supported, false otherwise.
     */
    isUnsupportedChallengeType(): boolean {
        return this.isUnsupportedChallengeTypeError();
    }
}

export class SignInSubmitPasswordError extends AuthActionErrorBase {
    /**
     * Checks if the password submitted during sign-in is incorrect.
     * @returns {boolean} True if the error is due to the password being invalid, false otherwise.
     */
    isInvalidPassword(): boolean {
        return this.isPasswordIncorrectError();
    }
}

export class SignInSubmitCodeError extends AuthActionErrorBase {
    /**
     * Checks if the code submitted during sign-in is invalid.
     * @returns {boolean} True if the error is due to the code being invalid, false otherwise.
     */
    isInvalidCode(): boolean {
        return this.isInvalidCodeError();
    }
}

export class SignInResendCodeError extends AuthActionErrorBase {}

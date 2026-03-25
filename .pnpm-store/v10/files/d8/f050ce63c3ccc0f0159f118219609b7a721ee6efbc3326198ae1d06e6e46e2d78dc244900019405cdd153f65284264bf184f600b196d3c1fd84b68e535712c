/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { AuthActionErrorBase } from "../../../core/auth_flow/AuthFlowErrorBase.js";

export class SignUpError extends AuthActionErrorBase {
    /**
     * Checks if the error is due to the user already exists.
     * @returns {boolean} True if the error is due to the user already exists, false otherwise.
     */
    isUserAlreadyExists(): boolean {
        return this.isUserAlreadyExistsError();
    }

    /**
     * Checks if the error is due to the username is invalid.
     * @returns {boolean} True if the error is due to the user is invalid, false otherwise.
     */
    isInvalidUsername(): boolean {
        return this.isUserInvalidError();
    }

    /**
     * Checks if the error is due to the password being invalid or incorrect.
     * @returns {boolean} True if the error is due to the password being invalid, false otherwise.
     */
    isInvalidPassword(): boolean {
        return this.isInvalidNewPasswordError();
    }

    /**
     * Checks if the error is due to the required attributes are missing.
     * @returns {boolean} True if the error is due to the required attributes are missing, false otherwise.
     */
    isMissingRequiredAttributes(): boolean {
        return this.isAttributeRequiredError();
    }

    /**
     * Checks if the error is due to the attributes validation failed.
     * @returns {boolean} True if the error is due to the attributes validation failed, false otherwise.
     */
    isAttributesValidationFailed(): boolean {
        return this.isAttributeValidationFailedError();
    }

    /**
     * Checks if the error is due to the provided challenge type is not supported.
     * @returns {boolean} True if the error is due to the provided challenge type is not supported, false otherwise.
     */
    isUnsupportedChallengeType(): boolean {
        return this.isUnsupportedChallengeTypeError();
    }
}

export class SignUpSubmitPasswordError extends AuthActionErrorBase {
    /**
     * Checks if the error is due to the password being invalid or incorrect.
     * @returns {boolean} True if the error is due to the password being invalid, false otherwise.
     */
    isInvalidPassword(): boolean {
        return (
            this.isPasswordIncorrectError() || this.isInvalidNewPasswordError()
        );
    }
}

export class SignUpSubmitCodeError extends AuthActionErrorBase {
    /**
     * Checks if the provided code is invalid.
     * @returns {boolean} True if the provided code is invalid, false otherwise.
     */
    isInvalidCode(): boolean {
        return this.isInvalidCodeError();
    }
}

export class SignUpSubmitAttributesError extends AuthActionErrorBase {
    /**
     * Checks if the error is due to the required attributes are missing.
     * @returns {boolean} True if the error is due to the required attributes are missing, false otherwise.
     */
    isMissingRequiredAttributes(): boolean {
        return this.isAttributeRequiredError();
    }

    /**
     * Checks if the error is due to the attributes validation failed.
     * @returns {boolean} True if the error is due to the attributes validation failed, false otherwise.
     */
    isAttributesValidationFailed(): boolean {
        return this.isAttributeValidationFailedError();
    }
}

export class SignUpResendCodeError extends AuthActionErrorBase {}

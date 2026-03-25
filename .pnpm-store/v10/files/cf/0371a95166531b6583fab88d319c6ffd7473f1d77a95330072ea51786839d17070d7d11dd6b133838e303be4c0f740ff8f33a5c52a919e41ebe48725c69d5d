/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthActionErrorBase } from '../../../core/auth_flow/AuthFlowErrorBase.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class SignUpError extends AuthActionErrorBase {
    /**
     * Checks if the error is due to the user already exists.
     * @returns {boolean} True if the error is due to the user already exists, false otherwise.
     */
    isUserAlreadyExists() {
        return this.isUserAlreadyExistsError();
    }
    /**
     * Checks if the error is due to the username is invalid.
     * @returns {boolean} True if the error is due to the user is invalid, false otherwise.
     */
    isInvalidUsername() {
        return this.isUserInvalidError();
    }
    /**
     * Checks if the error is due to the password being invalid or incorrect.
     * @returns {boolean} True if the error is due to the password being invalid, false otherwise.
     */
    isInvalidPassword() {
        return this.isInvalidNewPasswordError();
    }
    /**
     * Checks if the error is due to the required attributes are missing.
     * @returns {boolean} True if the error is due to the required attributes are missing, false otherwise.
     */
    isMissingRequiredAttributes() {
        return this.isAttributeRequiredError();
    }
    /**
     * Checks if the error is due to the attributes validation failed.
     * @returns {boolean} True if the error is due to the attributes validation failed, false otherwise.
     */
    isAttributesValidationFailed() {
        return this.isAttributeValidationFailedError();
    }
    /**
     * Checks if the error is due to the provided challenge type is not supported.
     * @returns {boolean} True if the error is due to the provided challenge type is not supported, false otherwise.
     */
    isUnsupportedChallengeType() {
        return this.isUnsupportedChallengeTypeError();
    }
}
class SignUpSubmitPasswordError extends AuthActionErrorBase {
    /**
     * Checks if the error is due to the password being invalid or incorrect.
     * @returns {boolean} True if the error is due to the password being invalid, false otherwise.
     */
    isInvalidPassword() {
        return (this.isPasswordIncorrectError() || this.isInvalidNewPasswordError());
    }
}
class SignUpSubmitCodeError extends AuthActionErrorBase {
    /**
     * Checks if the provided code is invalid.
     * @returns {boolean} True if the provided code is invalid, false otherwise.
     */
    isInvalidCode() {
        return this.isInvalidCodeError();
    }
}
class SignUpSubmitAttributesError extends AuthActionErrorBase {
    /**
     * Checks if the error is due to the required attributes are missing.
     * @returns {boolean} True if the error is due to the required attributes are missing, false otherwise.
     */
    isMissingRequiredAttributes() {
        return this.isAttributeRequiredError();
    }
    /**
     * Checks if the error is due to the attributes validation failed.
     * @returns {boolean} True if the error is due to the attributes validation failed, false otherwise.
     */
    isAttributesValidationFailed() {
        return this.isAttributeValidationFailedError();
    }
}
class SignUpResendCodeError extends AuthActionErrorBase {
}

export { SignUpError, SignUpResendCodeError, SignUpSubmitAttributesError, SignUpSubmitCodeError, SignUpSubmitPasswordError };
//# sourceMappingURL=SignUpError.mjs.map

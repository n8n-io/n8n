/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthActionErrorBase } from '../../AuthFlowErrorBase.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Error that occurred during MFA challenge request.
 */
class MfaRequestChallengeError extends AuthActionErrorBase {
    /**
     * Checks if the input for MFA challenge is incorrect.
     * @returns true if the input is incorrect, false otherwise.
     */
    isInvalidInput() {
        return this.isInvalidInputError();
    }
    /**
     * Checks if the error is due to the verification contact (e.g., phone number or email) being blocked. Consider contacting customer support for assistance.
     * @returns true if the error is due to the verification contact being blocked, false otherwise.
     */
    isVerificationContactBlocked() {
        return this.isVerificationContactBlockedError();
    }
}
/**
 * Error that occurred during MFA challenge submission.
 */
class MfaSubmitChallengeError extends AuthActionErrorBase {
    /**
     * Checks if the submitted challenge code (e.g., OTP code) is incorrect.
     * @returns true if the challenge code is invalid, false otherwise.
     */
    isIncorrectChallenge() {
        return this.isInvalidCodeError();
    }
}

export { MfaRequestChallengeError, MfaSubmitChallengeError };
//# sourceMappingURL=MfaError.mjs.map

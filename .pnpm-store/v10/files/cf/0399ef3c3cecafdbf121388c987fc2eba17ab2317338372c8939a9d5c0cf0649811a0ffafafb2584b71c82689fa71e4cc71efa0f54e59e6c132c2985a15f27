/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { ResetPasswordResendCodeResult } from '../result/ResetPasswordResendCodeResult.mjs';
import { ResetPasswordSubmitCodeResult } from '../result/ResetPasswordSubmitCodeResult.mjs';
import { ResetPasswordState } from './ResetPasswordState.mjs';
import { ResetPasswordPasswordRequiredState } from './ResetPasswordPasswordRequiredState.mjs';
import { RESET_PASSWORD_CODE_REQUIRED_STATE_TYPE } from '../../../core/auth_flow/AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Reset password code required state.
 */
class ResetPasswordCodeRequiredState extends ResetPasswordState {
    constructor() {
        super(...arguments);
        /**
         * The type of the state.
         */
        this.stateType = RESET_PASSWORD_CODE_REQUIRED_STATE_TYPE;
    }
    /**
     * Submits a one-time passcode that the customer user received in their email in order to continue password reset flow.
     * @param {string} code - The code to submit.
     * @returns {Promise<ResetPasswordSubmitCodeResult>} The result of the operation.
     */
    async submitCode(code) {
        try {
            this.ensureCodeIsValid(code, this.stateParameters.codeLength);
            this.stateParameters.logger.verbose("Submitting code for password reset.", this.stateParameters.correlationId);
            const result = await this.stateParameters.resetPasswordClient.submitCode({
                clientId: this.stateParameters.config.auth.clientId,
                correlationId: this.stateParameters.correlationId,
                challengeType: this.stateParameters.config.customAuth.challengeTypes ??
                    [],
                continuationToken: this.stateParameters.continuationToken ?? "",
                code: code,
                username: this.stateParameters.username,
            });
            this.stateParameters.logger.verbose("Code is submitted for password reset.", this.stateParameters.correlationId);
            return new ResetPasswordSubmitCodeResult(new ResetPasswordPasswordRequiredState({
                correlationId: result.correlationId,
                continuationToken: result.continuationToken,
                logger: this.stateParameters.logger,
                config: this.stateParameters.config,
                resetPasswordClient: this.stateParameters.resetPasswordClient,
                signInClient: this.stateParameters.signInClient,
                cacheClient: this.stateParameters.cacheClient,
                jitClient: this.stateParameters.jitClient,
                mfaClient: this.stateParameters.mfaClient,
                username: this.stateParameters.username,
            }));
        }
        catch (error) {
            this.stateParameters.logger.errorPii(`Failed to submit code for password reset. Error: ${error}.`, this.stateParameters.correlationId);
            return ResetPasswordSubmitCodeResult.createWithError(error);
        }
    }
    /**
     * Resends another one-time passcode if the previous one hasn't been verified
     * @returns {Promise<ResetPasswordResendCodeResult>} The result of the operation.
     */
    async resendCode() {
        try {
            this.stateParameters.logger.verbose("Resending code for password reset.", this.stateParameters.correlationId);
            const result = await this.stateParameters.resetPasswordClient.resendCode({
                clientId: this.stateParameters.config.auth.clientId,
                challengeType: this.stateParameters.config.customAuth.challengeTypes ??
                    [],
                username: this.stateParameters.username,
                correlationId: this.stateParameters.correlationId,
                continuationToken: this.stateParameters.continuationToken ?? "",
            });
            this.stateParameters.logger.verbose("Code is resent for password reset.", this.stateParameters.correlationId);
            return new ResetPasswordResendCodeResult(new ResetPasswordCodeRequiredState({
                correlationId: result.correlationId,
                continuationToken: result.continuationToken,
                logger: this.stateParameters.logger,
                config: this.stateParameters.config,
                resetPasswordClient: this.stateParameters.resetPasswordClient,
                signInClient: this.stateParameters.signInClient,
                cacheClient: this.stateParameters.cacheClient,
                jitClient: this.stateParameters.jitClient,
                mfaClient: this.stateParameters.mfaClient,
                username: this.stateParameters.username,
                codeLength: result.codeLength,
            }));
        }
        catch (error) {
            this.stateParameters.logger.errorPii(`Failed to resend code for password reset. Error: ${error}.`, this.stateParameters.correlationId);
            return ResetPasswordResendCodeResult.createWithError(error);
        }
    }
    /**
     * Gets the sent code length.
     * @returns {number} The length of the code.
     */
    getCodeLength() {
        return this.stateParameters.codeLength;
    }
}

export { ResetPasswordCodeRequiredState };
//# sourceMappingURL=ResetPasswordCodeRequiredState.mjs.map

/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { ResetPasswordSubmitPasswordResult } from '../result/ResetPasswordSubmitPasswordResult.mjs';
import { ResetPasswordState } from './ResetPasswordState.mjs';
import { ResetPasswordCompletedState } from './ResetPasswordCompletedState.mjs';
import { SignInScenario } from '../../../sign_in/auth_flow/SignInScenario.mjs';
import { RESET_PASSWORD_PASSWORD_REQUIRED_STATE_TYPE } from '../../../core/auth_flow/AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Reset password password required state.
 */
class ResetPasswordPasswordRequiredState extends ResetPasswordState {
    constructor() {
        super(...arguments);
        /**
         * The type of the state.
         */
        this.stateType = RESET_PASSWORD_PASSWORD_REQUIRED_STATE_TYPE;
    }
    /**
     * Submits a new password for reset password flow.
     * @param {string} password - The password to submit.
     * @returns {Promise<ResetPasswordSubmitPasswordResult>} The result of the operation.
     */
    async submitNewPassword(password) {
        try {
            this.ensurePasswordIsNotEmpty(password);
            this.stateParameters.logger.verbose("Submitting new password for password reset.", this.stateParameters.correlationId);
            const result = await this.stateParameters.resetPasswordClient.submitNewPassword({
                clientId: this.stateParameters.config.auth.clientId,
                correlationId: this.stateParameters.correlationId,
                challengeType: this.stateParameters.config.customAuth
                    .challengeTypes ?? [],
                continuationToken: this.stateParameters.continuationToken ?? "",
                newPassword: password,
                username: this.stateParameters.username,
            });
            this.stateParameters.logger.verbose("New password is submitted for sign-up.", this.stateParameters.correlationId);
            return new ResetPasswordSubmitPasswordResult(new ResetPasswordCompletedState({
                correlationId: result.correlationId,
                continuationToken: result.continuationToken,
                logger: this.stateParameters.logger,
                config: this.stateParameters.config,
                username: this.stateParameters.username,
                signInClient: this.stateParameters.signInClient,
                cacheClient: this.stateParameters.cacheClient,
                jitClient: this.stateParameters.jitClient,
                mfaClient: this.stateParameters.mfaClient,
                signInScenario: SignInScenario.SignInAfterPasswordReset,
            }));
        }
        catch (error) {
            this.stateParameters.logger.errorPii(`Failed to submit password for password reset. Error: ${error}.`, this.stateParameters.correlationId);
            return ResetPasswordSubmitPasswordResult.createWithError(error);
        }
    }
}

export { ResetPasswordPasswordRequiredState };
//# sourceMappingURL=ResetPasswordPasswordRequiredState.mjs.map

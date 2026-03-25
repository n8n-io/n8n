/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { SignInSubmitPasswordResult } from '../result/SignInSubmitPasswordResult.mjs';
import { SignInState } from './SignInState.mjs';
import { SIGN_IN_PASSWORD_REQUIRED_STATE_TYPE } from '../../../core/auth_flow/AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Sign-in password required state.
 */
class SignInPasswordRequiredState extends SignInState {
    constructor() {
        super(...arguments);
        /**
         * The type of the state.
         */
        this.stateType = SIGN_IN_PASSWORD_REQUIRED_STATE_TYPE;
    }
    /**
     * Once user configures email with password as a authentication method in Microsoft Entra, user submits a password to continue sign-in flow.
     * @param {string} password - The password to submit.
     * @returns {Promise<SignInSubmitPasswordResult>} The result of the operation.
     */
    async submitPassword(password) {
        try {
            this.ensurePasswordIsNotEmpty(password);
            const submitPasswordParams = {
                clientId: this.stateParameters.config.auth.clientId,
                correlationId: this.stateParameters.correlationId,
                challengeType: this.stateParameters.config.customAuth.challengeTypes ?? [],
                scopes: this.stateParameters.scopes ?? [],
                continuationToken: this.stateParameters.continuationToken ?? "",
                password: password,
                username: this.stateParameters.username,
                claims: this.stateParameters.claims,
            };
            this.stateParameters.logger.verbose("Submitting password for sign-in.", this.stateParameters.correlationId);
            const submitPasswordResult = await this.stateParameters.signInClient.submitPassword(submitPasswordParams);
            this.stateParameters.logger.verbose("Password submitted for sign-in.", this.stateParameters.correlationId);
            const nextState = this.handleSignInResult(submitPasswordResult, this.stateParameters.scopes);
            if (nextState.error) {
                return SignInSubmitPasswordResult.createWithError(nextState.error);
            }
            return new SignInSubmitPasswordResult(nextState.state, nextState.accountInfo);
        }
        catch (error) {
            this.stateParameters.logger.errorPii(`Failed to sign in after submitting password. Error: ${error}.`, this.stateParameters.correlationId);
            return SignInSubmitPasswordResult.createWithError(error);
        }
    }
    /**
     * Gets the scopes to request.
     * @returns {string[] | undefined} The scopes to request.
     */
    getScopes() {
        return this.stateParameters.scopes;
    }
}

export { SignInPasswordRequiredState };
//# sourceMappingURL=SignInPasswordRequiredState.mjs.map

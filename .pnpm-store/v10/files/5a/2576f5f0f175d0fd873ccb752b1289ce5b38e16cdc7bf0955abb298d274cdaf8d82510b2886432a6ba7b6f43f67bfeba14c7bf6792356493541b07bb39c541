/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { SignInResult } from '../result/SignInResult.mjs';
import { SignInState } from './SignInState.mjs';
import { ensureArgumentIsJSONString } from '../../../core/utils/ArgumentValidator.mjs';
import { SIGN_IN_CONTINUATION_STATE_TYPE } from '../../../core/auth_flow/AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Sign-in continuation state.
 */
class SignInContinuationState extends SignInState {
    constructor() {
        super(...arguments);
        /**
         * The type of the state.
         */
        this.stateType = SIGN_IN_CONTINUATION_STATE_TYPE;
    }
    /**
     * Initiates the sign-in flow with continuation token.
     * @param {SignInWithContinuationTokenInputs} signInWithContinuationTokenInputs - The result of the operation.
     * @returns {Promise<SignInResult>} The result of the operation.
     */
    async signIn(signInWithContinuationTokenInputs) {
        try {
            if (signInWithContinuationTokenInputs?.claims) {
                ensureArgumentIsJSONString("signInWithContinuationTokenInputs.claims", signInWithContinuationTokenInputs.claims, this.stateParameters.correlationId);
            }
            const continuationTokenParams = {
                clientId: this.stateParameters.config.auth.clientId,
                correlationId: this.stateParameters.correlationId,
                challengeType: this.stateParameters.config.customAuth.challengeTypes ?? [],
                scopes: signInWithContinuationTokenInputs?.scopes ?? [],
                continuationToken: this.stateParameters.continuationToken ?? "",
                username: this.stateParameters.username,
                signInScenario: this.stateParameters.signInScenario,
                claims: signInWithContinuationTokenInputs?.claims,
            };
            this.stateParameters.logger.verbose("Signing in with continuation token.", this.stateParameters.correlationId);
            const signInResult = await this.stateParameters.signInClient.signInWithContinuationToken(continuationTokenParams);
            this.stateParameters.logger.verbose("Signed in with continuation token.", this.stateParameters.correlationId);
            const nextState = this.handleSignInResult(signInResult, signInWithContinuationTokenInputs?.scopes);
            if (nextState.error) {
                return SignInResult.createWithError(nextState.error);
            }
            return new SignInResult(nextState.state, nextState.accountInfo);
        }
        catch (error) {
            this.stateParameters.logger.errorPii(`Failed to sign in with continuation token. Error: ${error}.`, this.stateParameters.correlationId);
            return SignInResult.createWithError(error);
        }
    }
}

export { SignInContinuationState };
//# sourceMappingURL=SignInContinuationState.mjs.map

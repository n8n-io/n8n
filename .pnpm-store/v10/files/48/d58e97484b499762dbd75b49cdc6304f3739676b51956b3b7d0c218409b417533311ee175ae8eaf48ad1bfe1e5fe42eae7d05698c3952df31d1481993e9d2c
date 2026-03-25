/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { AuthFlowActionRequiredStateBase } from '../../../core/auth_flow/AuthFlowState.mjs';
import { AuthMethodRegistrationRequiredState } from '../../../core/auth_flow/jit/state/AuthMethodRegistrationState.mjs';
import { MfaAwaitingState } from '../../../core/auth_flow/mfa/state/MfaState.mjs';
import { ensureArgumentIsNotEmptyString } from '../../../core/utils/ArgumentValidator.mjs';
import { CustomAuthAccountData } from '../../../get_account/auth_flow/CustomAuthAccountData.mjs';
import { SIGN_IN_COMPLETED_RESULT_TYPE, SIGN_IN_JIT_REQUIRED_RESULT_TYPE, SIGN_IN_MFA_REQUIRED_RESULT_TYPE } from '../../interaction_client/result/SignInActionResult.mjs';
import { SignInCompletedState } from './SignInCompletedState.mjs';
import { SignInFailedState } from './SignInFailedState.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/*
 * Base state handler for sign-in flow.
 */
class SignInState extends AuthFlowActionRequiredStateBase {
    /*
     * Creates a new SignInState.
     * @param stateParameters - The state parameters for sign-in.
     */
    constructor(stateParameters) {
        super(stateParameters);
        ensureArgumentIsNotEmptyString("username", stateParameters.username, stateParameters.correlationId);
        ensureArgumentIsNotEmptyString("continuationToken", stateParameters.continuationToken, stateParameters.correlationId);
    }
    /**
     * Handles the result of a sign-in attempt.
     * @param result - The result of the sign-in attempt.
     * @param scopes - The scopes requested for the sign-in.
     * @returns An object containing the next state and account information, if applicable.
     */
    handleSignInResult(result, scopes) {
        const correlationId = result.correlationId || this.stateParameters.correlationId;
        if (result.type === SIGN_IN_COMPLETED_RESULT_TYPE) {
            // Sign-in completed - return SignInCompletedState
            this.stateParameters.logger.verbose("Sign-in completed successfully.", correlationId);
            const accountInfo = new CustomAuthAccountData(result.authenticationResult.account, this.stateParameters.config, this.stateParameters.cacheClient, this.stateParameters.logger, correlationId);
            return {
                state: new SignInCompletedState(),
                accountInfo: accountInfo,
            };
        }
        else if (result.type === SIGN_IN_JIT_REQUIRED_RESULT_TYPE) {
            // JIT is required - return AuthMethodRegistrationRequiredState
            this.stateParameters.logger.verbose("Authentication method registration is required during sign-in.", correlationId);
            return {
                state: new AuthMethodRegistrationRequiredState({
                    correlationId: correlationId,
                    continuationToken: result.continuationToken,
                    logger: this.stateParameters.logger,
                    config: this.stateParameters.config,
                    jitClient: this.stateParameters.jitClient,
                    cacheClient: this.stateParameters.cacheClient,
                    authMethods: result.authMethods,
                    username: this.stateParameters.username,
                    scopes: scopes ?? [],
                    claims: this.stateParameters.claims,
                }),
            };
        }
        else if (result.type === SIGN_IN_MFA_REQUIRED_RESULT_TYPE) {
            // MFA is required - return MfaAwaitingState
            this.stateParameters.logger.verbose("MFA is required during the sign-in.", correlationId);
            return {
                state: new MfaAwaitingState({
                    correlationId: correlationId,
                    continuationToken: result.continuationToken,
                    logger: this.stateParameters.logger,
                    config: this.stateParameters.config,
                    mfaClient: this.stateParameters.mfaClient,
                    cacheClient: this.stateParameters.cacheClient,
                    scopes: scopes ?? [],
                    authMethods: result.authMethods ?? [],
                }),
            };
        }
        else {
            // Unexpected result type
            const unexpectedResult = result;
            const error = new Error(`Unexpected result type: ${unexpectedResult.type}`);
            return {
                state: new SignInFailedState(),
                error: error,
            };
        }
    }
}

export { SignInState };
//# sourceMappingURL=SignInState.mjs.map

/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { CustomAuthAccountData } from '../../../../get_account/auth_flow/CustomAuthAccountData.mjs';
import { JIT_VERIFICATION_REQUIRED_RESULT_TYPE, JIT_COMPLETED_RESULT_TYPE } from '../../../interaction_client/jit/result/JitActionResult.mjs';
import { UnexpectedError } from '../../../error/UnexpectedError.mjs';
import { AuthFlowActionRequiredStateBase } from '../../AuthFlowState.mjs';
import { GrantType } from '../../../../CustomAuthConstants.mjs';
import { AuthMethodRegistrationChallengeMethodResult } from '../result/AuthMethodRegistrationChallengeMethodResult.mjs';
import { AuthMethodRegistrationSubmitChallengeResult } from '../result/AuthMethodRegistrationSubmitChallengeResult.mjs';
import { AuthMethodRegistrationCompletedState } from './AuthMethodRegistrationCompletedState.mjs';
import { AUTH_METHOD_REGISTRATION_REQUIRED_STATE_TYPE, AUTH_METHOD_VERIFICATION_REQUIRED_STATE_TYPE } from '../../AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * Abstract base class for authentication method registration states.
 */
class AuthMethodRegistrationState extends AuthFlowActionRequiredStateBase {
    /**
     * Internal method to challenge an authentication method.
     * @param authMethodDetails The authentication method details to challenge.
     * @returns Promise that resolves to AuthMethodRegistrationChallengeMethodResult.
     */
    async challengeAuthMethodInternal(authMethodDetails) {
        try {
            this.stateParameters.logger.verbose(`Challenging authentication method - '${authMethodDetails.authMethodType.id}' for auth method registration.`, this.stateParameters.correlationId);
            const challengeParams = {
                correlationId: this.stateParameters.correlationId,
                continuationToken: this.stateParameters.continuationToken ?? "",
                authMethod: authMethodDetails.authMethodType,
                verificationContact: authMethodDetails.verificationContact,
                scopes: this.stateParameters.scopes ?? [],
                username: this.stateParameters.username,
                claims: this.stateParameters.claims,
            };
            const result = await this.stateParameters.jitClient.challengeAuthMethod(challengeParams);
            this.stateParameters.logger.verbose("Authentication method challenged successfully for auth method registration.", this.stateParameters.correlationId);
            if (result.type === JIT_VERIFICATION_REQUIRED_RESULT_TYPE) {
                // Verification required
                this.stateParameters.logger.verbose("Auth method verification required.", this.stateParameters.correlationId);
                return new AuthMethodRegistrationChallengeMethodResult(new AuthMethodVerificationRequiredState({
                    correlationId: result.correlationId,
                    continuationToken: result.continuationToken,
                    config: this.stateParameters.config,
                    logger: this.stateParameters.logger,
                    jitClient: this.stateParameters.jitClient,
                    cacheClient: this.stateParameters.cacheClient,
                    challengeChannel: result.challengeChannel,
                    challengeTargetLabel: result.challengeTargetLabel,
                    codeLength: result.codeLength,
                    scopes: this.stateParameters.scopes ?? [],
                    username: this.stateParameters.username,
                    claims: this.stateParameters.claims,
                }));
            }
            else if (result.type === JIT_COMPLETED_RESULT_TYPE) {
                // Registration completed (fast-pass scenario)
                this.stateParameters.logger.verbose("Auth method registration completed via fast-pass.", this.stateParameters.correlationId);
                const accountInfo = new CustomAuthAccountData(result.authenticationResult.account, this.stateParameters.config, this.stateParameters.cacheClient, this.stateParameters.logger, this.stateParameters.correlationId);
                return new AuthMethodRegistrationChallengeMethodResult(new AuthMethodRegistrationCompletedState(), accountInfo);
            }
            else {
                // Handle unexpected result type with proper typing
                this.stateParameters.logger.error("Unexpected result type from auth challenge method", this.stateParameters.correlationId);
                throw new UnexpectedError("Unexpected result type from auth challenge method");
            }
        }
        catch (error) {
            this.stateParameters.logger.errorPii(`Failed to challenge authentication method for auth method registration. Error: ${error}.`, this.stateParameters.correlationId);
            return AuthMethodRegistrationChallengeMethodResult.createWithError(error);
        }
    }
}
/**
 * State indicating that authentication method registration is required.
 */
class AuthMethodRegistrationRequiredState extends AuthMethodRegistrationState {
    constructor() {
        super(...arguments);
        /**
         * The type of the state.
         */
        this.stateType = AUTH_METHOD_REGISTRATION_REQUIRED_STATE_TYPE;
    }
    /**
     * Gets the available authentication methods for registration.
     * @returns Array of available authentication methods.
     */
    getAuthMethods() {
        return this.stateParameters.authMethods;
    }
    /**
     * Challenges an authentication method for registration.
     * @param authMethodDetails The authentication method details to challenge.
     * @returns Promise that resolves to AuthMethodRegistrationChallengeMethodResult.
     */
    async challengeAuthMethod(authMethodDetails) {
        return this.challengeAuthMethodInternal(authMethodDetails);
    }
}
/**
 * State indicating that verification is required for the challenged authentication method.
 */
class AuthMethodVerificationRequiredState extends AuthMethodRegistrationState {
    constructor() {
        super(...arguments);
        /**
         * The type of the state.
         */
        this.stateType = AUTH_METHOD_VERIFICATION_REQUIRED_STATE_TYPE;
    }
    /**
     * Gets the length of the expected verification code.
     * @returns The code length.
     */
    getCodeLength() {
        return this.stateParameters.codeLength;
    }
    /**
     * Gets the channel through which the challenge was sent.
     * @returns The challenge channel (e.g., "email").
     */
    getChannel() {
        return this.stateParameters.challengeChannel;
    }
    /**
     * Gets the target label indicating where the challenge was sent.
     * @returns The challenge target label (e.g., masked email address).
     */
    getSentTo() {
        return this.stateParameters.challengeTargetLabel;
    }
    /**
     * Submits the verification challenge to complete the authentication method registration.
     * @param code The verification code entered by the user.
     * @returns Promise that resolves to AuthMethodRegistrationSubmitChallengeResult.
     */
    async submitChallenge(code) {
        try {
            this.ensureCodeIsValid(code, this.getCodeLength());
            this.stateParameters.logger.verbose("Submitting auth method challenge.", this.stateParameters.correlationId);
            const submitParams = {
                correlationId: this.stateParameters.correlationId,
                continuationToken: this.stateParameters.continuationToken ?? "",
                scopes: this.stateParameters.scopes ?? [],
                grantType: GrantType.OOB,
                challenge: code,
                username: this.stateParameters.username,
                claims: this.stateParameters.claims,
            };
            const result = await this.stateParameters.jitClient.submitChallenge(submitParams);
            this.stateParameters.logger.verbose("Auth method challenge submitted successfully.", this.stateParameters.correlationId);
            const accountInfo = new CustomAuthAccountData(result.authenticationResult.account, this.stateParameters.config, this.stateParameters.cacheClient, this.stateParameters.logger, this.stateParameters.correlationId);
            return new AuthMethodRegistrationSubmitChallengeResult(new AuthMethodRegistrationCompletedState(), accountInfo);
        }
        catch (error) {
            this.stateParameters.logger.errorPii(`Failed to submit auth method challenge. Error: ${error}.`, this.stateParameters.correlationId);
            return AuthMethodRegistrationSubmitChallengeResult.createWithError(error);
        }
    }
    /**
     * Challenges a different authentication method for registration.
     * @param authMethodDetails The authentication method details to challenge.
     * @returns Promise that resolves to AuthMethodRegistrationChallengeMethodResult.
     */
    async challengeAuthMethod(authMethodDetails) {
        return this.challengeAuthMethodInternal(authMethodDetails);
    }
}

export { AuthMethodRegistrationRequiredState, AuthMethodVerificationRequiredState };
//# sourceMappingURL=AuthMethodRegistrationState.mjs.map

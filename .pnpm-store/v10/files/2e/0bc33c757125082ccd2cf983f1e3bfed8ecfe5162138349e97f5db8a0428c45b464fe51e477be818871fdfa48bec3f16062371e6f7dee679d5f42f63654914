/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { MfaSubmitChallengeResult } from '../result/MfaSubmitChallengeResult.mjs';
import { MfaRequestChallengeResult } from '../result/MfaRequestChallengeResult.mjs';
import { CustomAuthAccountData } from '../../../../get_account/auth_flow/CustomAuthAccountData.mjs';
import { MfaCompletedState } from './MfaCompletedState.mjs';
import { ensureArgumentIsNotEmptyString } from '../../../utils/ArgumentValidator.mjs';
import { AuthFlowActionRequiredStateBase } from '../../AuthFlowState.mjs';
import { MFA_AWAITING_STATE_TYPE, MFA_VERIFICATION_REQUIRED_STATE_TYPE } from '../../AuthFlowStateTypes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class MfaState extends AuthFlowActionRequiredStateBase {
    /**
     * Requests an MFA challenge for a specific authentication method.
     * @param authMethodId The authentication method ID to use for the challenge.
     * @returns Promise that resolves to MfaRequestChallengeResult.
     */
    async requestChallenge(authMethodId) {
        try {
            ensureArgumentIsNotEmptyString("authMethodId", authMethodId);
            this.stateParameters.logger.verbose(`Requesting MFA challenge with authentication method - '${authMethodId}'.`, this.stateParameters.correlationId);
            const requestParams = {
                correlationId: this.stateParameters.correlationId,
                continuationToken: this.stateParameters.continuationToken ?? "",
                challengeType: this.stateParameters.config.customAuth.challengeTypes ?? [],
                authMethodId: authMethodId,
            };
            const result = await this.stateParameters.mfaClient.requestChallenge(requestParams);
            this.stateParameters.logger.verbose("MFA challenge requested successfully.", this.stateParameters.correlationId);
            return new MfaRequestChallengeResult(new MfaVerificationRequiredState({
                correlationId: result.correlationId,
                continuationToken: result.continuationToken,
                config: this.stateParameters.config,
                logger: this.stateParameters.logger,
                mfaClient: this.stateParameters.mfaClient,
                cacheClient: this.stateParameters.cacheClient,
                challengeChannel: result.challengeChannel,
                challengeTargetLabel: result.challengeTargetLabel,
                codeLength: result.codeLength,
                selectedAuthMethodId: authMethodId,
                scopes: this.stateParameters.scopes ?? [],
            }));
        }
        catch (error) {
            this.stateParameters.logger.errorPii(`Failed to request MFA challenge. Error: ${error}.`, this.stateParameters.correlationId);
            return MfaRequestChallengeResult.createWithError(error);
        }
    }
}
/**
 * State indicating that MFA is required and awaiting user action.
 * This state allows the developer to pause execution before sending the code to the user's email.
 */
class MfaAwaitingState extends MfaState {
    constructor() {
        super(...arguments);
        /**
         * The type of the state.
         */
        this.stateType = MFA_AWAITING_STATE_TYPE;
    }
    /**
     * Gets the available authentication methods for MFA.
     * @returns Array of available authentication methods.
     */
    getAuthMethods() {
        return this.stateParameters.authMethods;
    }
}
/**
 * State indicating that MFA verification is required.
 * The challenge has been sent and the user needs to provide the code.
 */
class MfaVerificationRequiredState extends MfaState {
    constructor() {
        super(...arguments);
        /**
         * The type of the state.
         */
        this.stateType = MFA_VERIFICATION_REQUIRED_STATE_TYPE;
    }
    /**
     * Gets the length of the code that the user needs to provide.
     * @returns The expected code length.
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
     * Submits the MFA challenge (e.g., OTP code) to complete the authentication.
     * @param challenge The challenge code (e.g., OTP code) entered by the user.
     * @returns Promise that resolves to MfaSubmitChallengeResult.
     */
    async submitChallenge(challenge) {
        try {
            this.ensureCodeIsValid(challenge, this.getCodeLength());
            this.stateParameters.logger.verbose("Submitting MFA challenge.", this.stateParameters.correlationId);
            const submitParams = {
                correlationId: this.stateParameters.correlationId,
                continuationToken: this.stateParameters.continuationToken ?? "",
                scopes: this.stateParameters.scopes ?? [],
                challenge: challenge,
            };
            const result = await this.stateParameters.mfaClient.submitChallenge(submitParams);
            this.stateParameters.logger.verbose("MFA challenge submitted successfully.", this.stateParameters.correlationId);
            const accountInfo = new CustomAuthAccountData(result.authenticationResult.account, this.stateParameters.config, this.stateParameters.cacheClient, this.stateParameters.logger, this.stateParameters.correlationId);
            return new MfaSubmitChallengeResult(new MfaCompletedState(), accountInfo);
        }
        catch (error) {
            this.stateParameters.logger.errorPii(`Failed to submit MFA challenge. Error: ${error}.`, this.stateParameters.correlationId);
            return MfaSubmitChallengeResult.createWithError(error);
        }
    }
}

export { MfaAwaitingState, MfaVerificationRequiredState };
//# sourceMappingURL=MfaState.mjs.map

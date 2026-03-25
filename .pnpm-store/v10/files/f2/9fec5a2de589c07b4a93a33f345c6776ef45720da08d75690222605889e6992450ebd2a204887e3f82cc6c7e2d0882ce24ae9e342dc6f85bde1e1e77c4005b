/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { CustomAuthInteractionClientBase } from '../CustomAuthInteractionClientBase.mjs';
import { createMfaVerificationRequiredResult, createMfaCompletedResult } from './result/MfaActionResult.mjs';
import { ChallengeType, GrantType, DefaultCustomAuthApiCodeLength } from '../../../CustomAuthConstants.mjs';
import { MFA_REQUEST_CHALLENGE, MFA_SUBMIT_CHALLENGE } from '../../telemetry/PublicApiId.mjs';
import { ensureArgumentIsNotEmptyString } from '../../utils/ArgumentValidator.mjs';
import { CustomAuthApiError } from '../../error/CustomAuthApiError.mjs';
import { UNSUPPORTED_CHALLENGE_TYPE } from '../../network_client/custom_auth_api/types/ApiErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
/**
 * MFA client for handling multi-factor authentication flows.
 */
class MfaClient extends CustomAuthInteractionClientBase {
    /**
     * Requests an MFA challenge to be sent to the user.
     * @param parameters The parameters for requesting the challenge.
     * @returns Promise that resolves to either MfaVerificationRequiredResult.
     */
    async requestChallenge(parameters) {
        const apiId = MFA_REQUEST_CHALLENGE;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        this.logger.verbose("Calling challenge endpoint for MFA.", parameters.correlationId);
        const challengeReq = {
            challenge_type: this.getChallengeTypes(parameters.challengeType),
            continuation_token: parameters.continuationToken,
            id: parameters.authMethodId,
            correlationId: parameters.correlationId,
            telemetryManager: telemetryManager,
        };
        const challengeResponse = await this.customAuthApiClient.signInApi.requestChallenge(challengeReq);
        this.logger.verbose("Challenge endpoint called for MFA.", parameters.correlationId);
        if (challengeResponse.challenge_type === ChallengeType.OOB) {
            // Verification required - code will be sent
            return createMfaVerificationRequiredResult({
                correlationId: challengeResponse.correlation_id,
                continuationToken: challengeResponse.continuation_token ?? "",
                challengeChannel: challengeResponse.challenge_channel ?? "",
                challengeTargetLabel: challengeResponse.challenge_target_label ?? "",
                codeLength: challengeResponse.code_length ??
                    DefaultCustomAuthApiCodeLength,
                bindingMethod: challengeResponse.binding_method ?? "",
            });
        }
        this.logger.error(`Unsupported challenge type '${challengeResponse.challenge_type}' for MFA.`, parameters.correlationId);
        throw new CustomAuthApiError(UNSUPPORTED_CHALLENGE_TYPE, `Unsupported challenge type '${challengeResponse.challenge_type}'.`, challengeResponse.correlation_id);
    }
    /**
     * Submits the MFA challenge response (e.g., OTP code).
     * @param parameters The parameters for submitting the challenge.
     * @returns Promise that resolves to MfaCompletedResult.
     */
    async submitChallenge(parameters) {
        ensureArgumentIsNotEmptyString("parameters.challenge", parameters.challenge, parameters.correlationId);
        const apiId = MFA_SUBMIT_CHALLENGE;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        const scopes = this.getScopes(parameters.scopes);
        const request = {
            continuation_token: parameters.continuationToken,
            oob: parameters.challenge,
            grant_type: GrantType.MFA_OOB,
            scope: scopes.join(" "),
            correlationId: parameters.correlationId,
            telemetryManager: telemetryManager,
            ...(parameters.claims && {
                claims: parameters.claims,
            }),
        };
        this.logger.verbose("Calling token endpoint for MFA challenge submission.", parameters.correlationId);
        const tokenResponse = await this.customAuthApiClient.signInApi.requestTokensWithOob(request);
        // Save tokens and create authentication result
        const result = await this.handleTokenResponse(tokenResponse, scopes, tokenResponse.correlation_id ?? parameters.correlationId);
        return createMfaCompletedResult({
            correlationId: parameters.correlationId,
            authenticationResult: result,
        });
    }
}

export { MfaClient };
//# sourceMappingURL=MfaClient.mjs.map

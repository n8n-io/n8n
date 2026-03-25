/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CustomAuthInteractionClientBase } from "../CustomAuthInteractionClientBase.js";
import {
    JitChallengeAuthMethodParams,
    JitSubmitChallengeParams,
} from "./parameter/JitParams.js";
import {
    JitVerificationRequiredResult,
    JitCompletedResult,
    createJitVerificationRequiredResult,
    createJitCompletedResult,
} from "./result/JitActionResult.js";
import {
    DefaultCustomAuthApiCodeLength,
    ChallengeType,
    GrantType,
} from "../../../CustomAuthConstants.js";
import * as PublicApiId from "../../telemetry/PublicApiId.js";
import {
    RegisterChallengeRequest,
    RegisterContinueRequest,
    SignInContinuationTokenRequest,
} from "../../network_client/custom_auth_api/types/ApiRequestTypes.js";

/**
 * JIT client for handling just-in-time authentication method registration flows.
 */
export class JitClient extends CustomAuthInteractionClientBase {
    /**
     * Challenges an authentication method for JIT registration.
     * @param parameters The parameters for challenging the auth method.
     * @returns Promise that resolves to either JitVerificationRequiredResult or JitCompletedResult.
     */
    async challengeAuthMethod(
        parameters: JitChallengeAuthMethodParams
    ): Promise<JitVerificationRequiredResult | JitCompletedResult> {
        const apiId = PublicApiId.JIT_CHALLENGE_AUTH_METHOD;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);

        this.logger.verbose(
            "Calling challenge endpoint for getting auth method.",
            parameters.correlationId
        );

        const challengeReq: RegisterChallengeRequest = {
            continuation_token: parameters.continuationToken,
            challenge_type: parameters.authMethod.challenge_type,
            challenge_target: parameters.verificationContact,
            challenge_channel: parameters.authMethod.challenge_channel,
            correlationId: parameters.correlationId,
            telemetryManager: telemetryManager,
        };

        const challengeResponse =
            await this.customAuthApiClient.registerApi.challenge(challengeReq);

        this.logger.verbose(
            "Challenge endpoint called for auth method registration.",
            parameters.correlationId
        );

        /*
         * Handle fast-pass scenario (preverified)
         * This occurs when the user selects the same email used during sign-up
         * Since the email was already verified during sign-up, no additional verification is needed
         */
        if (challengeResponse.challenge_type === ChallengeType.PREVERIFIED) {
            this.logger.verbose(
                "Fast-pass scenario detected - completing registration without additional verification.",
                challengeResponse.correlation_id
            );

            // Use submitChallenge for fast-pass scenario with continuation_token grant type
            const fastPassParams: JitSubmitChallengeParams = {
                correlationId: challengeResponse.correlation_id,
                continuationToken: challengeResponse.continuation_token,
                grantType: GrantType.CONTINUATION_TOKEN,
                scopes: parameters.scopes,
                username: parameters.username,
                claims: parameters.claims,
            };

            const completedResult = await this.submitChallenge(fastPassParams);
            return completedResult;
        }

        // Verification required
        return createJitVerificationRequiredResult({
            correlationId: challengeResponse.correlation_id,
            continuationToken: challengeResponse.continuation_token,
            challengeChannel: challengeResponse.challenge_channel,
            challengeTargetLabel: challengeResponse.challenge_target,
            codeLength:
                challengeResponse.code_length || DefaultCustomAuthApiCodeLength,
        });
    }

    /**
     * Submits challenge response and completes JIT registration.
     * @param parameters The parameters for submitting the challenge.
     * @returns Promise that resolves to JitCompletedResult.
     */
    async submitChallenge(
        parameters: JitSubmitChallengeParams
    ): Promise<JitCompletedResult> {
        const apiId = PublicApiId.JIT_SUBMIT_CHALLENGE;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);

        this.logger.verbose(
            "Calling continue endpoint for auth method challenge submission.",
            parameters.correlationId
        );

        // Submit challenge to complete registration
        const continueReq: RegisterContinueRequest = {
            continuation_token: parameters.continuationToken,
            grant_type: parameters.grantType,
            ...(parameters.challenge && {
                oob: parameters.challenge,
            }),
            correlationId: parameters.correlationId,
            telemetryManager: telemetryManager,
        };

        const continueResponse =
            await this.customAuthApiClient.registerApi.continue(continueReq);

        this.logger.verbose(
            "Continue endpoint called for auth method challenge submission.",
            parameters.correlationId
        );

        // Use continuation token to get authentication tokens
        const scopes = this.getScopes(parameters.scopes);
        const tokenRequest: SignInContinuationTokenRequest = {
            continuation_token: continueResponse.continuation_token,
            scope: scopes.join(" "),
            correlationId: continueResponse.correlation_id,
            telemetryManager: telemetryManager,
            ...(parameters.claims && {
                claims: parameters.claims,
            }),
        };

        const tokenResponse =
            await this.customAuthApiClient.signInApi.requestTokenWithContinuationToken(
                tokenRequest
            );

        const authResult = await this.handleTokenResponse(
            tokenResponse,
            scopes,
            tokenResponse.correlation_id || continueResponse.correlation_id
        );

        return createJitCompletedResult({
            correlationId: continueResponse.correlation_id,
            authenticationResult: authResult,
        });
    }
}

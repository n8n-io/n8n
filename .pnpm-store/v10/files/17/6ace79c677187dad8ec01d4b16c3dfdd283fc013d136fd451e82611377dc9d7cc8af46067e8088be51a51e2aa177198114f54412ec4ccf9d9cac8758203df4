/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { CustomAuthInteractionClientBase } from "../CustomAuthInteractionClientBase.js";
import {
    MfaRequestChallengeParams,
    MfaSubmitChallengeParams,
} from "./parameter/MfaClientParameters.js";
import {
    MfaVerificationRequiredResult,
    MfaCompletedResult,
    createMfaVerificationRequiredResult,
    createMfaCompletedResult,
} from "./result/MfaActionResult.js";
import {
    DefaultCustomAuthApiCodeLength,
    ChallengeType,
    GrantType,
} from "../../../CustomAuthConstants.js";
import * as PublicApiId from "../../telemetry/PublicApiId.js";
import {
    SignInChallengeRequest,
    SignInOobTokenRequest,
} from "../../network_client/custom_auth_api/types/ApiRequestTypes.js";
import { ensureArgumentIsNotEmptyString } from "../../utils/ArgumentValidator.js";
import { CustomAuthApiError } from "../../error/CustomAuthApiError.js";
import * as CustomAuthApiErrorCode from "../../network_client/custom_auth_api/types/ApiErrorCodes.js";

/**
 * MFA client for handling multi-factor authentication flows.
 */
export class MfaClient extends CustomAuthInteractionClientBase {
    /**
     * Requests an MFA challenge to be sent to the user.
     * @param parameters The parameters for requesting the challenge.
     * @returns Promise that resolves to either MfaVerificationRequiredResult.
     */
    async requestChallenge(
        parameters: MfaRequestChallengeParams
    ): Promise<MfaVerificationRequiredResult> {
        const apiId = PublicApiId.MFA_REQUEST_CHALLENGE;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);

        this.logger.verbose(
            "Calling challenge endpoint for MFA.",
            parameters.correlationId
        );

        const challengeReq: SignInChallengeRequest = {
            challenge_type: this.getChallengeTypes(parameters.challengeType),
            continuation_token: parameters.continuationToken,
            id: parameters.authMethodId,
            correlationId: parameters.correlationId,
            telemetryManager: telemetryManager,
        };

        const challengeResponse =
            await this.customAuthApiClient.signInApi.requestChallenge(
                challengeReq
            );

        this.logger.verbose(
            "Challenge endpoint called for MFA.",
            parameters.correlationId
        );

        if (challengeResponse.challenge_type === ChallengeType.OOB) {
            // Verification required - code will be sent
            return createMfaVerificationRequiredResult({
                correlationId: challengeResponse.correlation_id,
                continuationToken: challengeResponse.continuation_token ?? "",
                challengeChannel: challengeResponse.challenge_channel ?? "",
                challengeTargetLabel:
                    challengeResponse.challenge_target_label ?? "",
                codeLength:
                    challengeResponse.code_length ??
                    DefaultCustomAuthApiCodeLength,
                bindingMethod: challengeResponse.binding_method ?? "",
            });
        }

        this.logger.error(
            `Unsupported challenge type '${challengeResponse.challenge_type}' for MFA.`,
            parameters.correlationId
        );

        throw new CustomAuthApiError(
            CustomAuthApiErrorCode.UNSUPPORTED_CHALLENGE_TYPE,
            `Unsupported challenge type '${challengeResponse.challenge_type}'.`,
            challengeResponse.correlation_id
        );
    }

    /**
     * Submits the MFA challenge response (e.g., OTP code).
     * @param parameters The parameters for submitting the challenge.
     * @returns Promise that resolves to MfaCompletedResult.
     */
    async submitChallenge(
        parameters: MfaSubmitChallengeParams
    ): Promise<MfaCompletedResult> {
        ensureArgumentIsNotEmptyString(
            "parameters.challenge",
            parameters.challenge,
            parameters.correlationId
        );

        const apiId = PublicApiId.MFA_SUBMIT_CHALLENGE;
        const telemetryManager = this.initializeServerTelemetryManager(apiId);
        const scopes = this.getScopes(parameters.scopes);

        const request: SignInOobTokenRequest = {
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

        this.logger.verbose(
            "Calling token endpoint for MFA challenge submission.",
            parameters.correlationId
        );

        const tokenResponse =
            await this.customAuthApiClient.signInApi.requestTokensWithOob(
                request
            );

        // Save tokens and create authentication result
        const result = await this.handleTokenResponse(
            tokenResponse,
            scopes,
            tokenResponse.correlation_id ?? parameters.correlationId
        );

        return createMfaCompletedResult({
            correlationId: parameters.correlationId,
            authenticationResult: result,
        });
    }
}

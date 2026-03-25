/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { BaseApiClient } from "./BaseApiClient.js";
import * as CustomAuthApiEndpoint from "./CustomAuthApiEndpoint.js";
import {
    RegisterIntrospectRequest,
    RegisterChallengeRequest,
    RegisterContinueRequest,
} from "./types/ApiRequestTypes.js";
import {
    RegisterIntrospectResponse,
    RegisterChallengeResponse,
    RegisterContinueResponse,
} from "./types/ApiResponseTypes.js";

export class RegisterApiClient extends BaseApiClient {
    /**
     * Gets available authentication methods for registration
     */
    async introspect(
        params: RegisterIntrospectRequest
    ): Promise<RegisterIntrospectResponse> {
        const result = await this.request<RegisterIntrospectResponse>(
            CustomAuthApiEndpoint.REGISTER_INTROSPECT,
            {
                continuation_token: params.continuation_token,
            },
            params.telemetryManager,
            params.correlationId
        );

        this.ensureContinuationTokenIsValid(
            result.continuation_token,
            params.correlationId
        );

        return result;
    }

    /**
     * Sends challenge to specified authentication method
     */
    async challenge(
        params: RegisterChallengeRequest
    ): Promise<RegisterChallengeResponse> {
        const result = await this.request<RegisterChallengeResponse>(
            CustomAuthApiEndpoint.REGISTER_CHALLENGE,
            {
                continuation_token: params.continuation_token,
                challenge_type: params.challenge_type,
                challenge_target: params.challenge_target,
                ...(params.challenge_channel && {
                    challenge_channel: params.challenge_channel,
                }),
            },
            params.telemetryManager,
            params.correlationId
        );

        this.ensureContinuationTokenIsValid(
            result.continuation_token,
            params.correlationId
        );

        return result;
    }

    /**
     * Submits challenge response and continues registration
     */
    async continue(
        params: RegisterContinueRequest
    ): Promise<RegisterContinueResponse> {
        const result = await this.request<RegisterContinueResponse>(
            CustomAuthApiEndpoint.REGISTER_CONTINUE,
            {
                continuation_token: params.continuation_token,
                grant_type: params.grant_type,
                ...(params.oob && { oob: params.oob }),
            },
            params.telemetryManager,
            params.correlationId
        );

        this.ensureContinuationTokenIsValid(
            result.continuation_token,
            params.correlationId
        );

        return result;
    }
}

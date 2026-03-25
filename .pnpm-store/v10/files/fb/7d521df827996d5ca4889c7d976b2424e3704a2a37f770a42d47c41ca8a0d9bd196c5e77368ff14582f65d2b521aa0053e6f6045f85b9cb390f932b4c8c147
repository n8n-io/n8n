/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import { GrantType } from "../../../CustomAuthConstants.js";
import { BaseApiClient } from "./BaseApiClient.js";
import { IHttpClient } from "../http_client/IHttpClient.js";
import * as CustomAuthApiEndpoint from "./CustomAuthApiEndpoint.js";
import {
    SignUpChallengeRequest,
    SignUpContinueWithAttributesRequest,
    SignUpContinueWithOobRequest,
    SignUpContinueWithPasswordRequest,
    SignUpStartRequest,
} from "./types/ApiRequestTypes.js";
import {
    SignUpChallengeResponse,
    SignUpContinueResponse,
    SignUpStartResponse,
} from "./types/ApiResponseTypes.js";

export class SignupApiClient extends BaseApiClient {
    private readonly capabilities?: string;

    constructor(
        customAuthApiBaseUrl: string,
        clientId: string,
        httpClient: IHttpClient,
        capabilities?: string,
        customAuthApiQueryParams?: Record<string, string>
    ) {
        super(
            customAuthApiBaseUrl,
            clientId,
            httpClient,
            customAuthApiQueryParams
        );
        this.capabilities = capabilities;
    }

    /**
     * Start the sign-up flow
     */
    async start(params: SignUpStartRequest): Promise<SignUpStartResponse> {
        const result = await this.request<SignUpStartResponse>(
            CustomAuthApiEndpoint.SIGNUP_START,
            {
                username: params.username,
                ...(params.password && { password: params.password }),
                ...(params.attributes && {
                    attributes: JSON.stringify(params.attributes),
                }),
                challenge_type: params.challenge_type,
                ...(this.capabilities && {
                    capabilities: this.capabilities,
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
     * Request challenge (e.g., OTP)
     */
    async requestChallenge(
        params: SignUpChallengeRequest
    ): Promise<SignUpChallengeResponse> {
        const result = await this.request<SignUpChallengeResponse>(
            CustomAuthApiEndpoint.SIGNUP_CHALLENGE,
            {
                continuation_token: params.continuation_token,
                challenge_type: params.challenge_type,
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
     * Continue sign-up flow with code.
     */
    async continueWithCode(
        params: SignUpContinueWithOobRequest
    ): Promise<SignUpContinueResponse> {
        const result = await this.request<SignUpContinueResponse>(
            CustomAuthApiEndpoint.SIGNUP_CONTINUE,
            {
                continuation_token: params.continuation_token,
                grant_type: GrantType.OOB,
                oob: params.oob,
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

    async continueWithPassword(
        params: SignUpContinueWithPasswordRequest
    ): Promise<SignUpContinueResponse> {
        const result = await this.request<SignUpContinueResponse>(
            CustomAuthApiEndpoint.SIGNUP_CONTINUE,
            {
                continuation_token: params.continuation_token,
                grant_type: GrantType.PASSWORD,
                password: params.password,
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

    async continueWithAttributes(
        params: SignUpContinueWithAttributesRequest
    ): Promise<SignUpContinueResponse> {
        const result = await this.request<SignUpContinueResponse>(
            CustomAuthApiEndpoint.SIGNUP_CONTINUE,
            {
                continuation_token: params.continuation_token,
                grant_type: GrantType.ATTRIBUTES,
                attributes: JSON.stringify(params.attributes),
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

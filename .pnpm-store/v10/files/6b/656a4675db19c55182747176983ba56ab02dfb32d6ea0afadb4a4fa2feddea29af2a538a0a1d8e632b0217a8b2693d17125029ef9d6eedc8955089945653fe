/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */

import {
    GrantType,
    ResetPasswordPollStatus,
} from "../../../CustomAuthConstants.js";
import { CustomAuthApiError } from "../../error/CustomAuthApiError.js";
import { BaseApiClient } from "./BaseApiClient.js";
import { IHttpClient } from "../http_client/IHttpClient.js";
import * as CustomAuthApiEndpoint from "./CustomAuthApiEndpoint.js";
import * as CustomAuthApiErrorCode from "./types/ApiErrorCodes.js";
import {
    ResetPasswordChallengeRequest,
    ResetPasswordContinueRequest,
    ResetPasswordPollCompletionRequest,
    ResetPasswordStartRequest,
    ResetPasswordSubmitRequest,
} from "./types/ApiRequestTypes.js";
import {
    ResetPasswordChallengeResponse,
    ResetPasswordContinueResponse,
    ResetPasswordPollCompletionResponse,
    ResetPasswordStartResponse,
    ResetPasswordSubmitResponse,
} from "./types/ApiResponseTypes.js";

export class ResetPasswordApiClient extends BaseApiClient {
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
     * Start the password reset flow
     */
    async start(
        params: ResetPasswordStartRequest
    ): Promise<ResetPasswordStartResponse> {
        const result = await this.request<ResetPasswordStartResponse>(
            CustomAuthApiEndpoint.RESET_PWD_START,
            {
                challenge_type: params.challenge_type,
                username: params.username,
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
     * Request a challenge (OTP) to be sent to the user's email
     * @param ChallengeResetPasswordRequest Parameters for the challenge request
     */
    async requestChallenge(
        params: ResetPasswordChallengeRequest
    ): Promise<ResetPasswordChallengeResponse> {
        const result = await this.request<ResetPasswordChallengeResponse>(
            CustomAuthApiEndpoint.RESET_PWD_CHALLENGE,
            {
                challenge_type: params.challenge_type,
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
     * Submit the code for verification
     * @param ContinueResetPasswordRequest Token from previous response
     */
    async continueWithCode(
        params: ResetPasswordContinueRequest
    ): Promise<ResetPasswordContinueResponse> {
        const result = await this.request<ResetPasswordContinueResponse>(
            CustomAuthApiEndpoint.RESET_PWD_CONTINUE,
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

    /**
     * Submit the new password
     * @param SubmitResetPasswordResponse Token from previous response
     */
    async submitNewPassword(
        params: ResetPasswordSubmitRequest
    ): Promise<ResetPasswordSubmitResponse> {
        const result = await this.request<ResetPasswordSubmitResponse>(
            CustomAuthApiEndpoint.RESET_PWD_SUBMIT,
            {
                continuation_token: params.continuation_token,
                new_password: params.new_password,
            },
            params.telemetryManager,
            params.correlationId
        );

        this.ensureContinuationTokenIsValid(
            result.continuation_token,
            params.correlationId
        );

        if (result.poll_interval === 0) {
            result.poll_interval = 2;
        }

        return result;
    }

    /**
     * Poll for password reset completion status
     * @param continuationToken Token from previous response
     */
    async pollCompletion(
        params: ResetPasswordPollCompletionRequest
    ): Promise<ResetPasswordPollCompletionResponse> {
        const result = await this.request<ResetPasswordPollCompletionResponse>(
            CustomAuthApiEndpoint.RESET_PWD_POLL,
            {
                continuation_token: params.continuation_token,
            },
            params.telemetryManager,
            params.correlationId
        );

        this.ensurePollStatusIsValid(result.status, params.correlationId);

        return result;
    }

    protected ensurePollStatusIsValid(
        status: string,
        correlationId: string
    ): void {
        if (
            status !== ResetPasswordPollStatus.FAILED &&
            status !== ResetPasswordPollStatus.IN_PROGRESS &&
            status !== ResetPasswordPollStatus.SUCCEEDED &&
            status !== ResetPasswordPollStatus.NOT_STARTED
        ) {
            throw new CustomAuthApiError(
                CustomAuthApiErrorCode.INVALID_POLL_STATUS,
                `The poll status '${status}' for password reset is invalid`,
                correlationId
            );
        }
    }
}

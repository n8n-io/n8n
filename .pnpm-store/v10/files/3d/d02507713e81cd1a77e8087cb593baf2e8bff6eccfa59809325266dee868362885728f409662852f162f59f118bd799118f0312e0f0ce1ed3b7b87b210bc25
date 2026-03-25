/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { GrantType, ResetPasswordPollStatus } from '../../../CustomAuthConstants.mjs';
import { CustomAuthApiError } from '../../error/CustomAuthApiError.mjs';
import { BaseApiClient } from './BaseApiClient.mjs';
import { RESET_PWD_START, RESET_PWD_CHALLENGE, RESET_PWD_CONTINUE, RESET_PWD_SUBMIT, RESET_PWD_POLL } from './CustomAuthApiEndpoint.mjs';
import { INVALID_POLL_STATUS } from './types/ApiErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class ResetPasswordApiClient extends BaseApiClient {
    constructor(customAuthApiBaseUrl, clientId, httpClient, capabilities, customAuthApiQueryParams) {
        super(customAuthApiBaseUrl, clientId, httpClient, customAuthApiQueryParams);
        this.capabilities = capabilities;
    }
    /**
     * Start the password reset flow
     */
    async start(params) {
        const result = await this.request(RESET_PWD_START, {
            challenge_type: params.challenge_type,
            username: params.username,
            ...(this.capabilities && {
                capabilities: this.capabilities,
            }),
        }, params.telemetryManager, params.correlationId);
        this.ensureContinuationTokenIsValid(result.continuation_token, params.correlationId);
        return result;
    }
    /**
     * Request a challenge (OTP) to be sent to the user's email
     * @param ChallengeResetPasswordRequest Parameters for the challenge request
     */
    async requestChallenge(params) {
        const result = await this.request(RESET_PWD_CHALLENGE, {
            challenge_type: params.challenge_type,
            continuation_token: params.continuation_token,
        }, params.telemetryManager, params.correlationId);
        this.ensureContinuationTokenIsValid(result.continuation_token, params.correlationId);
        return result;
    }
    /**
     * Submit the code for verification
     * @param ContinueResetPasswordRequest Token from previous response
     */
    async continueWithCode(params) {
        const result = await this.request(RESET_PWD_CONTINUE, {
            continuation_token: params.continuation_token,
            grant_type: GrantType.OOB,
            oob: params.oob,
        }, params.telemetryManager, params.correlationId);
        this.ensureContinuationTokenIsValid(result.continuation_token, params.correlationId);
        return result;
    }
    /**
     * Submit the new password
     * @param SubmitResetPasswordResponse Token from previous response
     */
    async submitNewPassword(params) {
        const result = await this.request(RESET_PWD_SUBMIT, {
            continuation_token: params.continuation_token,
            new_password: params.new_password,
        }, params.telemetryManager, params.correlationId);
        this.ensureContinuationTokenIsValid(result.continuation_token, params.correlationId);
        if (result.poll_interval === 0) {
            result.poll_interval = 2;
        }
        return result;
    }
    /**
     * Poll for password reset completion status
     * @param continuationToken Token from previous response
     */
    async pollCompletion(params) {
        const result = await this.request(RESET_PWD_POLL, {
            continuation_token: params.continuation_token,
        }, params.telemetryManager, params.correlationId);
        this.ensurePollStatusIsValid(result.status, params.correlationId);
        return result;
    }
    ensurePollStatusIsValid(status, correlationId) {
        if (status !== ResetPasswordPollStatus.FAILED &&
            status !== ResetPasswordPollStatus.IN_PROGRESS &&
            status !== ResetPasswordPollStatus.SUCCEEDED &&
            status !== ResetPasswordPollStatus.NOT_STARTED) {
            throw new CustomAuthApiError(INVALID_POLL_STATUS, `The poll status '${status}' for password reset is invalid`, correlationId);
        }
    }
}

export { ResetPasswordApiClient };
//# sourceMappingURL=ResetPasswordApiClient.mjs.map

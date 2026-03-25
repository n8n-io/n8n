/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { GrantType } from '../../../CustomAuthConstants.mjs';
import { BaseApiClient } from './BaseApiClient.mjs';
import { SIGNUP_START, SIGNUP_CHALLENGE, SIGNUP_CONTINUE } from './CustomAuthApiEndpoint.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class SignupApiClient extends BaseApiClient {
    constructor(customAuthApiBaseUrl, clientId, httpClient, capabilities, customAuthApiQueryParams) {
        super(customAuthApiBaseUrl, clientId, httpClient, customAuthApiQueryParams);
        this.capabilities = capabilities;
    }
    /**
     * Start the sign-up flow
     */
    async start(params) {
        const result = await this.request(SIGNUP_START, {
            username: params.username,
            ...(params.password && { password: params.password }),
            ...(params.attributes && {
                attributes: JSON.stringify(params.attributes),
            }),
            challenge_type: params.challenge_type,
            ...(this.capabilities && {
                capabilities: this.capabilities,
            }),
        }, params.telemetryManager, params.correlationId);
        this.ensureContinuationTokenIsValid(result.continuation_token, params.correlationId);
        return result;
    }
    /**
     * Request challenge (e.g., OTP)
     */
    async requestChallenge(params) {
        const result = await this.request(SIGNUP_CHALLENGE, {
            continuation_token: params.continuation_token,
            challenge_type: params.challenge_type,
        }, params.telemetryManager, params.correlationId);
        this.ensureContinuationTokenIsValid(result.continuation_token, params.correlationId);
        return result;
    }
    /**
     * Continue sign-up flow with code.
     */
    async continueWithCode(params) {
        const result = await this.request(SIGNUP_CONTINUE, {
            continuation_token: params.continuation_token,
            grant_type: GrantType.OOB,
            oob: params.oob,
        }, params.telemetryManager, params.correlationId);
        this.ensureContinuationTokenIsValid(result.continuation_token, params.correlationId);
        return result;
    }
    async continueWithPassword(params) {
        const result = await this.request(SIGNUP_CONTINUE, {
            continuation_token: params.continuation_token,
            grant_type: GrantType.PASSWORD,
            password: params.password,
        }, params.telemetryManager, params.correlationId);
        this.ensureContinuationTokenIsValid(result.continuation_token, params.correlationId);
        return result;
    }
    async continueWithAttributes(params) {
        const result = await this.request(SIGNUP_CONTINUE, {
            continuation_token: params.continuation_token,
            grant_type: GrantType.ATTRIBUTES,
            attributes: JSON.stringify(params.attributes),
        }, params.telemetryManager, params.correlationId);
        this.ensureContinuationTokenIsValid(result.continuation_token, params.correlationId);
        return result;
    }
}

export { SignupApiClient };
//# sourceMappingURL=SignupApiClient.mjs.map

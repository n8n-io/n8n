/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { BaseApiClient } from './BaseApiClient.mjs';
import { REGISTER_INTROSPECT, REGISTER_CHALLENGE, REGISTER_CONTINUE } from './CustomAuthApiEndpoint.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class RegisterApiClient extends BaseApiClient {
    /**
     * Gets available authentication methods for registration
     */
    async introspect(params) {
        const result = await this.request(REGISTER_INTROSPECT, {
            continuation_token: params.continuation_token,
        }, params.telemetryManager, params.correlationId);
        this.ensureContinuationTokenIsValid(result.continuation_token, params.correlationId);
        return result;
    }
    /**
     * Sends challenge to specified authentication method
     */
    async challenge(params) {
        const result = await this.request(REGISTER_CHALLENGE, {
            continuation_token: params.continuation_token,
            challenge_type: params.challenge_type,
            challenge_target: params.challenge_target,
            ...(params.challenge_channel && {
                challenge_channel: params.challenge_channel,
            }),
        }, params.telemetryManager, params.correlationId);
        this.ensureContinuationTokenIsValid(result.continuation_token, params.correlationId);
        return result;
    }
    /**
     * Submits challenge response and continues registration
     */
    async continue(params) {
        const result = await this.request(REGISTER_CONTINUE, {
            continuation_token: params.continuation_token,
            grant_type: params.grant_type,
            ...(params.oob && { oob: params.oob }),
        }, params.telemetryManager, params.correlationId);
        this.ensureContinuationTokenIsValid(result.continuation_token, params.correlationId);
        return result;
    }
}

export { RegisterApiClient };
//# sourceMappingURL=RegisterApiClient.mjs.map

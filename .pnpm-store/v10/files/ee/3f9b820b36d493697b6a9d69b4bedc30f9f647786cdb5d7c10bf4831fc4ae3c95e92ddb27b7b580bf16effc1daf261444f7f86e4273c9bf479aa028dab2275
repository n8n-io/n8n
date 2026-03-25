/*! @azure/msal-browser v4.27.0 2025-12-04 */
'use strict';
import { GrantType } from '../../../CustomAuthConstants.mjs';
import { CustomAuthApiError } from '../../error/CustomAuthApiError.mjs';
import { BaseApiClient } from './BaseApiClient.mjs';
import { SIGNIN_INITIATE, SIGNIN_CHALLENGE, SIGNIN_INTROSPECT, SIGNIN_TOKEN } from './CustomAuthApiEndpoint.mjs';
import { ACCESS_TOKEN_MISSING, ID_TOKEN_MISSING, REFRESH_TOKEN_MISSING, INVALID_EXPIRES_IN, INVALID_TOKEN_TYPE, CLIENT_INFO_MISSING } from './types/ApiErrorCodes.mjs';

/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License.
 */
class SignInApiClient extends BaseApiClient {
    constructor(customAuthApiBaseUrl, clientId, httpClient, capabilities, customAuthApiQueryParams) {
        super(customAuthApiBaseUrl, clientId, httpClient, customAuthApiQueryParams);
        this.capabilities = capabilities;
    }
    /**
     * Initiates the sign-in flow
     * @param username User's email
     * @param authMethod 'email-otp' | 'email-password'
     */
    async initiate(params) {
        const result = await this.request(SIGNIN_INITIATE, {
            username: params.username,
            challenge_type: params.challenge_type,
            ...(this.capabilities && {
                capabilities: this.capabilities,
            }),
        }, params.telemetryManager, params.correlationId);
        this.ensureContinuationTokenIsValid(result.continuation_token, params.correlationId);
        return result;
    }
    /**
     * Requests authentication challenge (OTP or password validation)
     * @param continuationToken Token from initiate response
     * @param authMethod 'email-otp' | 'email-password'
     */
    async requestChallenge(params) {
        const result = await this.request(SIGNIN_CHALLENGE, {
            continuation_token: params.continuation_token,
            challenge_type: params.challenge_type,
            ...(params.id && { id: params.id }),
        }, params.telemetryManager, params.correlationId);
        this.ensureContinuationTokenIsValid(result.continuation_token, params.correlationId);
        return result;
    }
    /**
     * Requests security tokens using either password or OTP
     * @param continuationToken Token from challenge response
     * @param credentials Password or OTP
     * @param authMethod 'email-otp' | 'email-password'
     */
    async requestTokensWithPassword(params) {
        return this.requestTokens({
            continuation_token: params.continuation_token,
            grant_type: GrantType.PASSWORD,
            scope: params.scope,
            password: params.password,
            ...(params.claims && { claims: params.claims }),
        }, params.telemetryManager, params.correlationId);
    }
    async requestTokensWithOob(params) {
        return this.requestTokens({
            continuation_token: params.continuation_token,
            scope: params.scope,
            oob: params.oob,
            grant_type: params.grant_type,
            ...(params.claims && { claims: params.claims }),
        }, params.telemetryManager, params.correlationId);
    }
    async requestTokenWithContinuationToken(params) {
        return this.requestTokens({
            continuation_token: params.continuation_token,
            scope: params.scope,
            grant_type: GrantType.CONTINUATION_TOKEN,
            client_info: true,
            ...(params.claims && { claims: params.claims }),
            ...(params.username && { username: params.username }),
        }, params.telemetryManager, params.correlationId);
    }
    /**
     * Requests available authentication methods for MFA
     * @param continuationToken Token from previous response
     */
    async requestAuthMethods(params) {
        const result = await this.request(SIGNIN_INTROSPECT, {
            continuation_token: params.continuation_token,
        }, params.telemetryManager, params.correlationId);
        this.ensureContinuationTokenIsValid(result.continuation_token, params.correlationId);
        return result;
    }
    async requestTokens(requestData, telemetryManager, correlationId) {
        // The client_info parameter is required for MSAL to return the uid and utid in the response.
        requestData.client_info = true;
        const result = await this.request(SIGNIN_TOKEN, requestData, telemetryManager, correlationId);
        SignInApiClient.ensureTokenResponseIsValid(result);
        return result;
    }
    static ensureTokenResponseIsValid(tokenResponse) {
        let errorCode = "";
        let errorDescription = "";
        if (!tokenResponse.access_token) {
            errorCode = ACCESS_TOKEN_MISSING;
            errorDescription = "Access token is missing in the response body";
        }
        else if (!tokenResponse.id_token) {
            errorCode = ID_TOKEN_MISSING;
            errorDescription = "Id token is missing in the response body";
        }
        else if (!tokenResponse.refresh_token) {
            errorCode = REFRESH_TOKEN_MISSING;
            errorDescription = "Refresh token is missing in the response body";
        }
        else if (!tokenResponse.expires_in || tokenResponse.expires_in <= 0) {
            errorCode = INVALID_EXPIRES_IN;
            errorDescription = "Expires in is invalid in the response body";
        }
        else if (tokenResponse.token_type !== "Bearer") {
            errorCode = INVALID_TOKEN_TYPE;
            errorDescription = `Token type '${tokenResponse.token_type}' is invalid in the response body`;
        }
        else if (!tokenResponse.client_info) {
            errorCode = CLIENT_INFO_MISSING;
            errorDescription = "Client info is missing in the response body";
        }
        if (!errorCode && !errorDescription) {
            return;
        }
        throw new CustomAuthApiError(errorCode, errorDescription, tokenResponse.correlation_id);
    }
}

export { SignInApiClient };
//# sourceMappingURL=SignInApiClient.mjs.map

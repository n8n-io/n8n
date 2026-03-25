"use strict";
// Copyright 2023 Google LLC
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExternalAccountAuthorizedUserClient = exports.EXTERNAL_ACCOUNT_AUTHORIZED_USER_TYPE = void 0;
const authclient_1 = require("./authclient");
const oauth2common_1 = require("./oauth2common");
const gaxios_1 = require("gaxios");
const stream = require("stream");
const baseexternalclient_1 = require("./baseexternalclient");
/**
 * The credentials JSON file type for external account authorized user clients.
 */
exports.EXTERNAL_ACCOUNT_AUTHORIZED_USER_TYPE = 'external_account_authorized_user';
const DEFAULT_TOKEN_URL = 'https://sts.{universeDomain}/v1/oauthtoken';
/**
 * Handler for token refresh requests sent to the token_url endpoint for external
 * authorized user credentials.
 */
class ExternalAccountAuthorizedUserHandler extends oauth2common_1.OAuthClientAuthHandler {
    #tokenRefreshEndpoint;
    /**
     * Initializes an ExternalAccountAuthorizedUserHandler instance.
     * @param url The URL of the token refresh endpoint.
     * @param transporter The transporter to use for the refresh request.
     * @param clientAuthentication The client authentication credentials to use
     *   for the refresh request.
     */
    constructor(options) {
        super(options);
        this.#tokenRefreshEndpoint = options.tokenRefreshEndpoint;
    }
    /**
     * Requests a new access token from the token_url endpoint using the provided
     *   refresh token.
     * @param refreshToken The refresh token to use to generate a new access token.
     * @param additionalHeaders Optional additional headers to pass along the
     *   request.
     * @return A promise that resolves with the token refresh response containing
     *   the requested access token and its expiration time.
     */
    async refreshToken(refreshToken, headers) {
        const opts = {
            ...ExternalAccountAuthorizedUserHandler.RETRY_CONFIG,
            url: this.#tokenRefreshEndpoint,
            method: 'POST',
            headers,
            data: new URLSearchParams({
                grant_type: 'refresh_token',
                refresh_token: refreshToken,
            }),
        };
        authclient_1.AuthClient.setMethodName(opts, 'refreshToken');
        // Apply OAuth client authentication.
        this.applyClientAuthenticationOptions(opts);
        try {
            const response = await this.transporter.request(opts);
            // Successful response.
            const tokenRefreshResponse = response.data;
            tokenRefreshResponse.res = response;
            return tokenRefreshResponse;
        }
        catch (error) {
            // Translate error to OAuthError.
            if (error instanceof gaxios_1.GaxiosError && error.response) {
                throw (0, oauth2common_1.getErrorFromOAuthErrorResponse)(error.response.data, 
                // Preserve other fields from the original error.
                error);
            }
            // Request could fail before the server responds.
            throw error;
        }
    }
}
/**
 * External Account Authorized User Client. This is used for OAuth2 credentials
 * sourced using external identities through Workforce Identity Federation.
 * Obtaining the initial access and refresh token can be done through the
 * Google Cloud CLI.
 */
class ExternalAccountAuthorizedUserClient extends authclient_1.AuthClient {
    cachedAccessToken;
    externalAccountAuthorizedUserHandler;
    refreshToken;
    /**
     * Instantiates an ExternalAccountAuthorizedUserClient instances using the
     * provided JSON object loaded from a credentials files.
     * An error is throws if the credential is not valid.
     * @param options The external account authorized user option object typically
     *   from the external accoutn authorized user JSON credential file.
     */
    constructor(options) {
        super(options);
        if (options.universe_domain) {
            this.universeDomain = options.universe_domain;
        }
        this.refreshToken = options.refresh_token;
        const clientAuthentication = {
            confidentialClientType: 'basic',
            clientId: options.client_id,
            clientSecret: options.client_secret,
        };
        this.externalAccountAuthorizedUserHandler =
            new ExternalAccountAuthorizedUserHandler({
                tokenRefreshEndpoint: options.token_url ??
                    DEFAULT_TOKEN_URL.replace('{universeDomain}', this.universeDomain),
                transporter: this.transporter,
                clientAuthentication,
            });
        this.cachedAccessToken = null;
        this.quotaProjectId = options.quota_project_id;
        // As threshold could be zero,
        // eagerRefreshThresholdMillis || EXPIRATION_TIME_OFFSET will override the
        // zero value.
        if (typeof options?.eagerRefreshThresholdMillis !== 'number') {
            this.eagerRefreshThresholdMillis = baseexternalclient_1.EXPIRATION_TIME_OFFSET;
        }
        else {
            this.eagerRefreshThresholdMillis = options
                .eagerRefreshThresholdMillis;
        }
        this.forceRefreshOnFailure = !!options?.forceRefreshOnFailure;
    }
    async getAccessToken() {
        // If cached access token is unavailable or expired, force refresh.
        if (!this.cachedAccessToken || this.isExpired(this.cachedAccessToken)) {
            await this.refreshAccessTokenAsync();
        }
        // Return GCP access token in GetAccessTokenResponse format.
        return {
            token: this.cachedAccessToken.access_token,
            res: this.cachedAccessToken.res,
        };
    }
    async getRequestHeaders() {
        const accessTokenResponse = await this.getAccessToken();
        const headers = new Headers({
            authorization: `Bearer ${accessTokenResponse.token}`,
        });
        return this.addSharedMetadataHeaders(headers);
    }
    request(opts, callback) {
        if (callback) {
            this.requestAsync(opts).then(r => callback(null, r), e => {
                return callback(e, e.response);
            });
        }
        else {
            return this.requestAsync(opts);
        }
    }
    /**
     * Authenticates the provided HTTP request, processes it and resolves with the
     * returned response.
     * @param opts The HTTP request options.
     * @param reAuthRetried Whether the current attempt is a retry after a failed attempt due to an auth failure.
     * @return A promise that resolves with the successful response.
     */
    async requestAsync(opts, reAuthRetried = false) {
        let response;
        try {
            const requestHeaders = await this.getRequestHeaders();
            opts.headers = gaxios_1.Gaxios.mergeHeaders(opts.headers);
            this.addUserProjectAndAuthHeaders(opts.headers, requestHeaders);
            response = await this.transporter.request(opts);
        }
        catch (e) {
            const res = e.response;
            if (res) {
                const statusCode = res.status;
                // Retry the request for metadata if the following criteria are true:
                // - We haven't already retried.  It only makes sense to retry once.
                // - The response was a 401 or a 403
                // - The request didn't send a readableStream
                // - forceRefreshOnFailure is true
                const isReadableStream = res.config.data instanceof stream.Readable;
                const isAuthErr = statusCode === 401 || statusCode === 403;
                if (!reAuthRetried &&
                    isAuthErr &&
                    !isReadableStream &&
                    this.forceRefreshOnFailure) {
                    await this.refreshAccessTokenAsync();
                    return await this.requestAsync(opts, true);
                }
            }
            throw e;
        }
        return response;
    }
    /**
     * Forces token refresh, even if unexpired tokens are currently cached.
     * @return A promise that resolves with the refreshed credential.
     */
    async refreshAccessTokenAsync() {
        // Refresh the access token using the refresh token.
        const refreshResponse = await this.externalAccountAuthorizedUserHandler.refreshToken(this.refreshToken);
        this.cachedAccessToken = {
            access_token: refreshResponse.access_token,
            expiry_date: new Date().getTime() + refreshResponse.expires_in * 1000,
            res: refreshResponse.res,
        };
        if (refreshResponse.refresh_token !== undefined) {
            this.refreshToken = refreshResponse.refresh_token;
        }
        return this.cachedAccessToken;
    }
    /**
     * Returns whether the provided credentials are expired or not.
     * If there is no expiry time, assumes the token is not expired or expiring.
     * @param credentials The credentials to check for expiration.
     * @return Whether the credentials are expired or not.
     */
    isExpired(credentials) {
        const now = new Date().getTime();
        return credentials.expiry_date
            ? now >= credentials.expiry_date - this.eagerRefreshThresholdMillis
            : false;
    }
}
exports.ExternalAccountAuthorizedUserClient = ExternalAccountAuthorizedUserClient;
//# sourceMappingURL=externalAccountAuthorizedUserClient.js.map
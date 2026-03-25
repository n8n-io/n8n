"use strict";
// Copyright 2021 Google LLC
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
exports.StsCredentials = void 0;
const gaxios_1 = require("gaxios");
const authclient_1 = require("./authclient");
const oauth2common_1 = require("./oauth2common");
const util_1 = require("../util");
/**
 * Implements the OAuth 2.0 token exchange based on
 * https://tools.ietf.org/html/rfc8693
 */
class StsCredentials extends oauth2common_1.OAuthClientAuthHandler {
    #tokenExchangeEndpoint;
    /**
     * Initializes an STS credentials instance.
     *
     * @param options The STS credentials instance options. Passing an `tokenExchangeEndpoint` directly is **@DEPRECATED**.
     * @param clientAuthentication **@DEPRECATED**. Provide a {@link StsCredentialsConstructionOptions `StsCredentialsConstructionOptions`} object in the first parameter instead.
     */
    constructor(options = {
        tokenExchangeEndpoint: '',
    }, 
    /**
     * @deprecated - provide a {@link StsCredentialsConstructionOptions `StsCredentialsConstructionOptions`} object in the first parameter instead
     */
    clientAuthentication) {
        if (typeof options !== 'object' || options instanceof URL) {
            options = {
                tokenExchangeEndpoint: options,
                clientAuthentication,
            };
        }
        super(options);
        this.#tokenExchangeEndpoint = options.tokenExchangeEndpoint;
    }
    /**
     * Exchanges the provided token for another type of token based on the
     * rfc8693 spec.
     * @param stsCredentialsOptions The token exchange options used to populate
     *   the token exchange request.
     * @param additionalHeaders Optional additional headers to pass along the
     *   request.
     * @param options Optional additional GCP-specific non-spec defined options
     *   to send with the request.
     *   Example: `&options=${encodeUriComponent(JSON.stringified(options))}`
     * @return A promise that resolves with the token exchange response containing
     *   the requested token and its expiration time.
     */
    async exchangeToken(stsCredentialsOptions, headers, options) {
        const values = {
            grant_type: stsCredentialsOptions.grantType,
            resource: stsCredentialsOptions.resource,
            audience: stsCredentialsOptions.audience,
            scope: stsCredentialsOptions.scope?.join(' '),
            requested_token_type: stsCredentialsOptions.requestedTokenType,
            subject_token: stsCredentialsOptions.subjectToken,
            subject_token_type: stsCredentialsOptions.subjectTokenType,
            actor_token: stsCredentialsOptions.actingParty?.actorToken,
            actor_token_type: stsCredentialsOptions.actingParty?.actorTokenType,
            // Non-standard GCP-specific options.
            options: options && JSON.stringify(options),
        };
        const opts = {
            ...StsCredentials.RETRY_CONFIG,
            url: this.#tokenExchangeEndpoint.toString(),
            method: 'POST',
            headers,
            data: new URLSearchParams((0, util_1.removeUndefinedValuesInObject)(values)),
        };
        authclient_1.AuthClient.setMethodName(opts, 'exchangeToken');
        // Apply OAuth client authentication.
        this.applyClientAuthenticationOptions(opts);
        try {
            const response = await this.transporter.request(opts);
            // Successful response.
            const stsSuccessfulResponse = response.data;
            stsSuccessfulResponse.res = response;
            return stsSuccessfulResponse;
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
exports.StsCredentials = StsCredentials;
//# sourceMappingURL=stscredentials.js.map
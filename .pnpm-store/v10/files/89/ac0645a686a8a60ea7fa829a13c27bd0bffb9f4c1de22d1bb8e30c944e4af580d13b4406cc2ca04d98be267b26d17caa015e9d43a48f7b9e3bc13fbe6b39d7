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
const querystring = require("querystring");
const transporters_1 = require("../transporters");
const oauth2common_1 = require("./oauth2common");
/**
 * Implements the OAuth 2.0 token exchange based on
 * https://tools.ietf.org/html/rfc8693
 */
class StsCredentials extends oauth2common_1.OAuthClientAuthHandler {
    /**
     * Initializes an STS credentials instance.
     * @param tokenExchangeEndpoint The token exchange endpoint.
     * @param clientAuthentication The client authentication credentials if
     *   available.
     */
    constructor(tokenExchangeEndpoint, clientAuthentication) {
        super(clientAuthentication);
        this.tokenExchangeEndpoint = tokenExchangeEndpoint;
        this.transporter = new transporters_1.DefaultTransporter();
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
    async exchangeToken(stsCredentialsOptions, additionalHeaders, 
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    options) {
        var _a, _b, _c;
        const values = {
            grant_type: stsCredentialsOptions.grantType,
            resource: stsCredentialsOptions.resource,
            audience: stsCredentialsOptions.audience,
            scope: (_a = stsCredentialsOptions.scope) === null || _a === void 0 ? void 0 : _a.join(' '),
            requested_token_type: stsCredentialsOptions.requestedTokenType,
            subject_token: stsCredentialsOptions.subjectToken,
            subject_token_type: stsCredentialsOptions.subjectTokenType,
            actor_token: (_b = stsCredentialsOptions.actingParty) === null || _b === void 0 ? void 0 : _b.actorToken,
            actor_token_type: (_c = stsCredentialsOptions.actingParty) === null || _c === void 0 ? void 0 : _c.actorTokenType,
            // Non-standard GCP-specific options.
            options: options && JSON.stringify(options),
        };
        // Remove undefined fields.
        Object.keys(values).forEach(key => {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            if (typeof values[key] === 'undefined') {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                delete values[key];
            }
        });
        const headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
        };
        // Inject additional STS headers if available.
        Object.assign(headers, additionalHeaders || {});
        const opts = {
            ...StsCredentials.RETRY_CONFIG,
            url: this.tokenExchangeEndpoint.toString(),
            method: 'POST',
            headers,
            data: querystring.stringify(values),
            responseType: 'json',
        };
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

"use strict";
// Copyright 2025 Google LLC
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
exports.getToken = getToken;
const jwsSign_1 = require("./jwsSign");
/** The URL for Google's OAuth 2.0 token endpoint. */
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
/** The grant type for JWT-based authorization. */
const GOOGLE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:jwt-bearer';
/**
 * Generates the request options for fetching a token.
 * @param tokenOptions The options for the token.
 * @returns The Gaxios options for the request.
 */
const generateRequestOptions = (tokenOptions) => {
    return {
        method: 'POST',
        url: GOOGLE_TOKEN_URL,
        data: new URLSearchParams({
            grant_type: GOOGLE_GRANT_TYPE, // Grant type for JWT
            assertion: (0, jwsSign_1.getJwsSign)(tokenOptions),
        }),
        responseType: 'json',
        retryConfig: {
            httpMethodsToRetry: ['POST'],
        },
    };
};
/**
 * Fetches an access token.
 * @param tokenOptions The options for the token.
 * @returns A promise that resolves with the token data.
 */
async function getToken(tokenOptions) {
    if (!tokenOptions.transporter) {
        throw new Error('No transporter set.');
    }
    try {
        const gaxiosOptions = generateRequestOptions(tokenOptions);
        const response = await tokenOptions.transporter.request(gaxiosOptions);
        return response.data;
    }
    catch (e) {
        // The error is re-thrown, but we want to format it to be more
        // informative.
        const err = e;
        const errorData = err.response?.data;
        if (errorData?.error) {
            err.message = `${errorData.error}: ${errorData.error_description}`;
        }
        throw err;
    }
}
//# sourceMappingURL=getToken.js.map
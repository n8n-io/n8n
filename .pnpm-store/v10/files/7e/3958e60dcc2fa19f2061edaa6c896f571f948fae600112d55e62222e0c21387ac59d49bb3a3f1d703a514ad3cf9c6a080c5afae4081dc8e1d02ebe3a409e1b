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
exports.revokeToken = revokeToken;
/** The URL for Google's OAuth 2.0 token revocation endpoint. */
const GOOGLE_REVOKE_TOKEN_URL = 'https://oauth2.googleapis.com/revoke?token=';
/** The default retry behavior for the revoke token request. */
const DEFAULT_RETRY_VALUE = true;
/**
 * Revokes a given access token.
 * @param accessToken The access token to revoke.
 * @param transporter The transporter to make the request with.
 * @returns A promise that resolves with the revocation response.
 */
async function revokeToken(accessToken, transporter) {
    const url = GOOGLE_REVOKE_TOKEN_URL + accessToken;
    return await transporter.request({
        url,
        retry: DEFAULT_RETRY_VALUE,
    });
}
//# sourceMappingURL=revokeToken.js.map
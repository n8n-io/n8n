"use strict";
// Copyright 2020 Google LLC
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
exports.IdTokenClient = void 0;
const oauth2client_1 = require("./oauth2client");
class IdTokenClient extends oauth2client_1.OAuth2Client {
    /**
     * Google ID Token client
     *
     * Retrieve ID token from the metadata server.
     * See: https://cloud.google.com/docs/authentication/get-id-token#metadata-server
     */
    constructor(options) {
        super(options);
        this.targetAudience = options.targetAudience;
        this.idTokenProvider = options.idTokenProvider;
    }
    async getRequestMetadataAsync(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    url) {
        if (!this.credentials.id_token ||
            !this.credentials.expiry_date ||
            this.isTokenExpiring()) {
            const idToken = await this.idTokenProvider.fetchIdToken(this.targetAudience);
            this.credentials = {
                id_token: idToken,
                expiry_date: this.getIdTokenExpiryDate(idToken),
            };
        }
        const headers = {
            Authorization: 'Bearer ' + this.credentials.id_token,
        };
        return { headers };
    }
    getIdTokenExpiryDate(idToken) {
        const payloadB64 = idToken.split('.')[1];
        if (payloadB64) {
            const payload = JSON.parse(Buffer.from(payloadB64, 'base64').toString('ascii'));
            return payload.exp * 1000;
        }
    }
}
exports.IdTokenClient = IdTokenClient;

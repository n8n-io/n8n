"use strict";
// Copyright 2015 Google LLC
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
exports.UserRefreshClient = exports.USER_REFRESH_ACCOUNT_TYPE = void 0;
const oauth2client_1 = require("./oauth2client");
const querystring_1 = require("querystring");
exports.USER_REFRESH_ACCOUNT_TYPE = 'authorized_user';
class UserRefreshClient extends oauth2client_1.OAuth2Client {
    constructor(optionsOrClientId, clientSecret, refreshToken, eagerRefreshThresholdMillis, forceRefreshOnFailure) {
        const opts = optionsOrClientId && typeof optionsOrClientId === 'object'
            ? optionsOrClientId
            : {
                clientId: optionsOrClientId,
                clientSecret,
                refreshToken,
                eagerRefreshThresholdMillis,
                forceRefreshOnFailure,
            };
        super(opts);
        this._refreshToken = opts.refreshToken;
        this.credentials.refresh_token = opts.refreshToken;
    }
    /**
     * Refreshes the access token.
     * @param refreshToken An ignored refreshToken..
     * @param callback Optional callback.
     */
    async refreshTokenNoCache(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    refreshToken) {
        return super.refreshTokenNoCache(this._refreshToken);
    }
    async fetchIdToken(targetAudience) {
        const res = await this.transporter.request({
            ...UserRefreshClient.RETRY_CONFIG,
            url: this.endpoints.oauth2TokenUrl,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            method: 'POST',
            data: (0, querystring_1.stringify)({
                client_id: this._clientId,
                client_secret: this._clientSecret,
                grant_type: 'refresh_token',
                refresh_token: this._refreshToken,
                target_audience: targetAudience,
            }),
        });
        return res.data.id_token;
    }
    /**
     * Create a UserRefreshClient credentials instance using the given input
     * options.
     * @param json The input object.
     */
    fromJSON(json) {
        if (!json) {
            throw new Error('Must pass in a JSON object containing the user refresh token');
        }
        if (json.type !== 'authorized_user') {
            throw new Error('The incoming JSON object does not have the "authorized_user" type');
        }
        if (!json.client_id) {
            throw new Error('The incoming JSON object does not contain a client_id field');
        }
        if (!json.client_secret) {
            throw new Error('The incoming JSON object does not contain a client_secret field');
        }
        if (!json.refresh_token) {
            throw new Error('The incoming JSON object does not contain a refresh_token field');
        }
        this._clientId = json.client_id;
        this._clientSecret = json.client_secret;
        this._refreshToken = json.refresh_token;
        this.credentials.refresh_token = json.refresh_token;
        this.quotaProjectId = json.quota_project_id;
        this.universeDomain = json.universe_domain || this.universeDomain;
    }
    fromStream(inputStream, callback) {
        if (callback) {
            this.fromStreamAsync(inputStream).then(() => callback(), callback);
        }
        else {
            return this.fromStreamAsync(inputStream);
        }
    }
    async fromStreamAsync(inputStream) {
        return new Promise((resolve, reject) => {
            if (!inputStream) {
                return reject(new Error('Must pass in a stream containing the user refresh token.'));
            }
            let s = '';
            inputStream
                .setEncoding('utf8')
                .on('error', reject)
                .on('data', chunk => (s += chunk))
                .on('end', () => {
                try {
                    const data = JSON.parse(s);
                    this.fromJSON(data);
                    return resolve();
                }
                catch (err) {
                    return reject(err);
                }
            });
        });
    }
    /**
     * Create a UserRefreshClient credentials instance using the given input
     * options.
     * @param json The input object.
     */
    static fromJSON(json) {
        const client = new UserRefreshClient();
        client.fromJSON(json);
        return client;
    }
}
exports.UserRefreshClient = UserRefreshClient;

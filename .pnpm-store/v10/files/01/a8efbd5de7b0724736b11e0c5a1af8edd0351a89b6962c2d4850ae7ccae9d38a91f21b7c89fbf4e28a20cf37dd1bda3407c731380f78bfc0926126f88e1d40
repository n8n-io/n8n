"use strict";
// Copyright 2013 Google LLC
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
exports.Compute = void 0;
const gaxios_1 = require("gaxios");
const gcpMetadata = require("gcp-metadata");
const oauth2client_1 = require("./oauth2client");
class Compute extends oauth2client_1.OAuth2Client {
    /**
     * Google Compute Engine service account credentials.
     *
     * Retrieve access token from the metadata server.
     * See: https://cloud.google.com/compute/docs/access/authenticate-workloads#applications
     */
    constructor(options = {}) {
        super(options);
        // Start with an expired refresh token, which will automatically be
        // refreshed before the first API call is made.
        this.credentials = { expiry_date: 1, refresh_token: 'compute-placeholder' };
        this.serviceAccountEmail = options.serviceAccountEmail || 'default';
        this.scopes = Array.isArray(options.scopes)
            ? options.scopes
            : options.scopes
                ? [options.scopes]
                : [];
    }
    /**
     * Refreshes the access token.
     * @param refreshToken Unused parameter
     */
    async refreshTokenNoCache(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    refreshToken) {
        const tokenPath = `service-accounts/${this.serviceAccountEmail}/token`;
        let data;
        try {
            const instanceOptions = {
                property: tokenPath,
            };
            if (this.scopes.length > 0) {
                instanceOptions.params = {
                    scopes: this.scopes.join(','),
                };
            }
            data = await gcpMetadata.instance(instanceOptions);
        }
        catch (e) {
            if (e instanceof gaxios_1.GaxiosError) {
                e.message = `Could not refresh access token: ${e.message}`;
                this.wrapError(e);
            }
            throw e;
        }
        const tokens = data;
        if (data && data.expires_in) {
            tokens.expiry_date = new Date().getTime() + data.expires_in * 1000;
            delete tokens.expires_in;
        }
        this.emit('tokens', tokens);
        return { tokens, res: null };
    }
    /**
     * Fetches an ID token.
     * @param targetAudience the audience for the fetched ID token.
     */
    async fetchIdToken(targetAudience) {
        const idTokenPath = `service-accounts/${this.serviceAccountEmail}/identity` +
            `?format=full&audience=${targetAudience}`;
        let idToken;
        try {
            const instanceOptions = {
                property: idTokenPath,
            };
            idToken = await gcpMetadata.instance(instanceOptions);
        }
        catch (e) {
            if (e instanceof Error) {
                e.message = `Could not fetch ID token: ${e.message}`;
            }
            throw e;
        }
        return idToken;
    }
    wrapError(e) {
        const res = e.response;
        if (res && res.status) {
            e.status = res.status;
            if (res.status === 403) {
                e.message =
                    'A Forbidden error was returned while attempting to retrieve an access ' +
                        'token for the Compute Engine built-in service account. This may be because the Compute ' +
                        'Engine instance does not have the correct permission scopes specified: ' +
                        e.message;
            }
            else if (res.status === 404) {
                e.message =
                    'A Not Found error was returned while attempting to retrieve an access' +
                        'token for the Compute Engine built-in service account. This may be because the Compute ' +
                        'Engine instance does not have any permission scopes specified: ' +
                        e.message;
            }
        }
    }
}
exports.Compute = Compute;

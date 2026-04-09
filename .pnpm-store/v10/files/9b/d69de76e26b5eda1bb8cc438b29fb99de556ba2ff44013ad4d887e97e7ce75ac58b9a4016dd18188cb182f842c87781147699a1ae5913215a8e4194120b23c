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
exports.GoogleToken = void 0;
const gaxios_1 = require("gaxios");
const tokenHandler_1 = require("./tokenHandler");
const revokeToken_1 = require("./revokeToken");
/**
 * The GoogleToken class is used to manage authentication with Google's OAuth 2.0 authorization server.
 * It handles fetching, caching, and refreshing of access tokens.
 */
class GoogleToken {
    /** The configuration options for this token instance. */
    tokenOptions;
    /** The handler for token fetching and caching logic. */
    tokenHandler;
    /**
     * Create a GoogleToken.
     *
     * @param options  Configuration object.
     */
    constructor(options) {
        this.tokenOptions = options || {};
        // If a transporter is not set, by default set it to use gaxios.
        this.tokenOptions.transporter = this.tokenOptions.transporter || {
            request: opts => (0, gaxios_1.request)(opts),
        };
        if (!this.tokenOptions.iss) {
            this.tokenOptions.iss = this.tokenOptions.email;
        }
        if (typeof this.tokenOptions.scope === 'object') {
            this.tokenOptions.scope = this.tokenOptions.scope.join(' ');
        }
        this.tokenHandler = new tokenHandler_1.TokenHandler(this.tokenOptions);
    }
    get expiresAt() {
        return this.tokenHandler.tokenExpiresAt;
    }
    /**
     * The most recent access token obtained by this client.
     */
    get accessToken() {
        return this.tokenHandler.token?.access_token;
    }
    /**
     * The most recent ID token obtained by this client.
     */
    get idToken() {
        return this.tokenHandler.token?.id_token;
    }
    /**
     * The token type of the most recent access token.
     */
    get tokenType() {
        return this.tokenHandler.token?.token_type;
    }
    /**
     * The refresh token for the current credentials.
     */
    get refreshToken() {
        return this.tokenHandler.token?.refresh_token;
    }
    /**
     * A boolean indicating if the current token has expired.
     */
    hasExpired() {
        return this.tokenHandler.hasExpired();
    }
    /**
     * A boolean indicating if the current token is expiring soon,
     * based on the `eagerRefreshThresholdMillis` option.
     */
    isTokenExpiring() {
        return this.tokenHandler.isTokenExpiring();
    }
    getToken(callbackOrOptions, opts = { forceRefresh: false }) {
        // Handle the various method overloads.
        let callback;
        if (typeof callbackOrOptions === 'function') {
            callback = callbackOrOptions;
        }
        else if (typeof callbackOrOptions === 'object') {
            opts = callbackOrOptions;
        }
        // Delegate the token fetching to the token handler.
        const promise = this.tokenHandler.getToken(opts.forceRefresh ?? false);
        // If a callback is provided, use it, otherwise return the promise.
        if (callback) {
            promise.then(token => callback(null, token), callback);
        }
        return promise;
    }
    revokeToken(callback) {
        if (!this.accessToken) {
            return Promise.reject(new Error('No token to revoke.'));
        }
        const promise = (0, revokeToken_1.revokeToken)(this.accessToken, this.tokenOptions.transporter);
        // If a callback is provided, use it.
        if (callback) {
            promise.then(() => callback(), callback);
        }
        // After revoking, reset the token handler to clear the cached token.
        this.tokenHandler = new tokenHandler_1.TokenHandler(this.tokenOptions);
    }
    /**
     * Returns the configuration options for this token instance.
     */
    get googleTokenOptions() {
        return this.tokenOptions;
    }
}
exports.GoogleToken = GoogleToken;
//# sourceMappingURL=googleToken.js.map
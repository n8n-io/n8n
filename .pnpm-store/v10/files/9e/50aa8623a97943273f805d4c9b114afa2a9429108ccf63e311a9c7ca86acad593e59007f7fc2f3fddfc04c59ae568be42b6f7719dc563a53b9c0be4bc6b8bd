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
exports.JWTAccess = void 0;
const jws = require("jws");
const util_1 = require("../util");
const DEFAULT_HEADER = {
    alg: 'RS256',
    typ: 'JWT',
};
class JWTAccess {
    /**
     * JWTAccess service account credentials.
     *
     * Create a new access token by using the credential to create a new JWT token
     * that's recognized as the access token.
     *
     * @param email the service account email address.
     * @param key the private key that will be used to sign the token.
     * @param keyId the ID of the private key used to sign the token.
     */
    constructor(email, key, keyId, eagerRefreshThresholdMillis) {
        this.cache = new util_1.LRUCache({
            capacity: 500,
            maxAge: 60 * 60 * 1000,
        });
        this.email = email;
        this.key = key;
        this.keyId = keyId;
        this.eagerRefreshThresholdMillis =
            eagerRefreshThresholdMillis !== null && eagerRefreshThresholdMillis !== void 0 ? eagerRefreshThresholdMillis : 5 * 60 * 1000;
    }
    /**
     * Ensures that we're caching a key appropriately, giving precedence to scopes vs. url
     *
     * @param url The URI being authorized.
     * @param scopes The scope or scopes being authorized
     * @returns A string that returns the cached key.
     */
    getCachedKey(url, scopes) {
        let cacheKey = url;
        if (scopes && Array.isArray(scopes) && scopes.length) {
            cacheKey = url ? `${url}_${scopes.join('_')}` : `${scopes.join('_')}`;
        }
        else if (typeof scopes === 'string') {
            cacheKey = url ? `${url}_${scopes}` : scopes;
        }
        if (!cacheKey) {
            throw Error('Scopes or url must be provided');
        }
        return cacheKey;
    }
    /**
     * Get a non-expired access token, after refreshing if necessary.
     *
     * @param url The URI being authorized.
     * @param additionalClaims An object with a set of additional claims to
     * include in the payload.
     * @returns An object that includes the authorization header.
     */
    getRequestHeaders(url, additionalClaims, scopes) {
        // Return cached authorization headers, unless we are within
        // eagerRefreshThresholdMillis ms of them expiring:
        const key = this.getCachedKey(url, scopes);
        const cachedToken = this.cache.get(key);
        const now = Date.now();
        if (cachedToken &&
            cachedToken.expiration - now > this.eagerRefreshThresholdMillis) {
            return cachedToken.headers;
        }
        const iat = Math.floor(Date.now() / 1000);
        const exp = JWTAccess.getExpirationTime(iat);
        let defaultClaims;
        // Turn scopes into space-separated string
        if (Array.isArray(scopes)) {
            scopes = scopes.join(' ');
        }
        // If scopes are specified, sign with scopes
        if (scopes) {
            defaultClaims = {
                iss: this.email,
                sub: this.email,
                scope: scopes,
                exp,
                iat,
            };
        }
        else {
            defaultClaims = {
                iss: this.email,
                sub: this.email,
                aud: url,
                exp,
                iat,
            };
        }
        // if additionalClaims are provided, ensure they do not collide with
        // other required claims.
        if (additionalClaims) {
            for (const claim in defaultClaims) {
                if (additionalClaims[claim]) {
                    throw new Error(`The '${claim}' property is not allowed when passing additionalClaims. This claim is included in the JWT by default.`);
                }
            }
        }
        const header = this.keyId
            ? { ...DEFAULT_HEADER, kid: this.keyId }
            : DEFAULT_HEADER;
        const payload = Object.assign(defaultClaims, additionalClaims);
        // Sign the jwt and add it to the cache
        const signedJWT = jws.sign({ header, payload, secret: this.key });
        const headers = { Authorization: `Bearer ${signedJWT}` };
        this.cache.set(key, {
            expiration: exp * 1000,
            headers,
        });
        return headers;
    }
    /**
     * Returns an expiration time for the JWT token.
     *
     * @param iat The issued at time for the JWT.
     * @returns An expiration time for the JWT.
     */
    static getExpirationTime(iat) {
        const exp = iat + 3600; // 3600 seconds = 1 hour
        return exp;
    }
    /**
     * Create a JWTAccess credentials instance using the given input options.
     * @param json The input object.
     */
    fromJSON(json) {
        if (!json) {
            throw new Error('Must pass in a JSON object containing the service account auth settings.');
        }
        if (!json.client_email) {
            throw new Error('The incoming JSON object does not contain a client_email field');
        }
        if (!json.private_key) {
            throw new Error('The incoming JSON object does not contain a private_key field');
        }
        // Extract the relevant information from the json key file.
        this.email = json.client_email;
        this.key = json.private_key;
        this.keyId = json.private_key_id;
        this.projectId = json.project_id;
    }
    fromStream(inputStream, callback) {
        if (callback) {
            this.fromStreamAsync(inputStream).then(() => callback(), callback);
        }
        else {
            return this.fromStreamAsync(inputStream);
        }
    }
    fromStreamAsync(inputStream) {
        return new Promise((resolve, reject) => {
            if (!inputStream) {
                reject(new Error('Must pass in a stream containing the service account auth settings.'));
            }
            let s = '';
            inputStream
                .setEncoding('utf8')
                .on('data', chunk => (s += chunk))
                .on('error', reject)
                .on('end', () => {
                try {
                    const data = JSON.parse(s);
                    this.fromJSON(data);
                    resolve();
                }
                catch (err) {
                    reject(err);
                }
            });
        });
    }
}
exports.JWTAccess = JWTAccess;

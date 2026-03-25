"use strict";
/**
 * Copyright 2021 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Impersonated = exports.IMPERSONATED_ACCOUNT_TYPE = void 0;
const oauth2client_1 = require("./oauth2client");
const gaxios_1 = require("gaxios");
const util_1 = require("../util");
exports.IMPERSONATED_ACCOUNT_TYPE = 'impersonated_service_account';
class Impersonated extends oauth2client_1.OAuth2Client {
    /**
     * Impersonated service account credentials.
     *
     * Create a new access token by impersonating another service account.
     *
     * Impersonated Credentials allowing credentials issued to a user or
     * service account to impersonate another. The source project using
     * Impersonated Credentials must enable the "IAMCredentials" API.
     * Also, the target service account must grant the orginating principal
     * the "Service Account Token Creator" IAM role.
     *
     * @param {object} options - The configuration object.
     * @param {object} [options.sourceClient] the source credential used as to
     * acquire the impersonated credentials.
     * @param {string} [options.targetPrincipal] the service account to
     * impersonate.
     * @param {string[]} [options.delegates] the chained list of delegates
     * required to grant the final access_token. If set, the sequence of
     * identities must have "Service Account Token Creator" capability granted to
     * the preceding identity. For example, if set to [serviceAccountB,
     * serviceAccountC], the sourceCredential must have the Token Creator role on
     * serviceAccountB. serviceAccountB must have the Token Creator on
     * serviceAccountC. Finally, C must have Token Creator on target_principal.
     * If left unset, sourceCredential must have that role on targetPrincipal.
     * @param {string[]} [options.targetScopes] scopes to request during the
     * authorization grant.
     * @param {number} [options.lifetime] number of seconds the delegated
     * credential should be valid for up to 3600 seconds by default, or 43,200
     * seconds by extending the token's lifetime, see:
     * https://cloud.google.com/iam/docs/creating-short-lived-service-account-credentials#sa-credentials-oauth
     * @param {string} [options.endpoint] api endpoint override.
     */
    constructor(options = {}) {
        var _a, _b, _c, _d, _e, _f;
        super(options);
        // Start with an expired refresh token, which will automatically be
        // refreshed before the first API call is made.
        this.credentials = {
            expiry_date: 1,
            refresh_token: 'impersonated-placeholder',
        };
        this.sourceClient = (_a = options.sourceClient) !== null && _a !== void 0 ? _a : new oauth2client_1.OAuth2Client();
        this.targetPrincipal = (_b = options.targetPrincipal) !== null && _b !== void 0 ? _b : '';
        this.delegates = (_c = options.delegates) !== null && _c !== void 0 ? _c : [];
        this.targetScopes = (_d = options.targetScopes) !== null && _d !== void 0 ? _d : [];
        this.lifetime = (_e = options.lifetime) !== null && _e !== void 0 ? _e : 3600;
        const usingExplicitUniverseDomain = !!(0, util_1.originalOrCamelOptions)(options).get('universe_domain');
        if (!usingExplicitUniverseDomain) {
            // override the default universe with the source's universe
            this.universeDomain = this.sourceClient.universeDomain;
        }
        else if (this.sourceClient.universeDomain !== this.universeDomain) {
            // non-default universe and is not matching the source - this could be a credential leak
            throw new RangeError(`Universe domain ${this.sourceClient.universeDomain} in source credentials does not match ${this.universeDomain} universe domain set for impersonated credentials.`);
        }
        this.endpoint =
            (_f = options.endpoint) !== null && _f !== void 0 ? _f : `https://iamcredentials.${this.universeDomain}`;
    }
    /**
     * Signs some bytes.
     *
     * {@link https://cloud.google.com/iam/docs/reference/credentials/rest/v1/projects.serviceAccounts/signBlob Reference Documentation}
     * @param blobToSign String to sign.
     *
     * @returns A {@link SignBlobResponse} denoting the keyID and signedBlob in base64 string
     */
    async sign(blobToSign) {
        await this.sourceClient.getAccessToken();
        const name = `projects/-/serviceAccounts/${this.targetPrincipal}`;
        const u = `${this.endpoint}/v1/${name}:signBlob`;
        const body = {
            delegates: this.delegates,
            payload: Buffer.from(blobToSign).toString('base64'),
        };
        const res = await this.sourceClient.request({
            ...Impersonated.RETRY_CONFIG,
            url: u,
            data: body,
            method: 'POST',
        });
        return res.data;
    }
    /** The service account email to be impersonated. */
    getTargetPrincipal() {
        return this.targetPrincipal;
    }
    /**
     * Refreshes the access token.
     */
    async refreshToken() {
        var _a, _b, _c, _d, _e, _f;
        try {
            await this.sourceClient.getAccessToken();
            const name = 'projects/-/serviceAccounts/' + this.targetPrincipal;
            const u = `${this.endpoint}/v1/${name}:generateAccessToken`;
            const body = {
                delegates: this.delegates,
                scope: this.targetScopes,
                lifetime: this.lifetime + 's',
            };
            const res = await this.sourceClient.request({
                ...Impersonated.RETRY_CONFIG,
                url: u,
                data: body,
                method: 'POST',
            });
            const tokenResponse = res.data;
            this.credentials.access_token = tokenResponse.accessToken;
            this.credentials.expiry_date = Date.parse(tokenResponse.expireTime);
            return {
                tokens: this.credentials,
                res,
            };
        }
        catch (error) {
            if (!(error instanceof Error))
                throw error;
            let status = 0;
            let message = '';
            if (error instanceof gaxios_1.GaxiosError) {
                status = (_c = (_b = (_a = error === null || error === void 0 ? void 0 : error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.error) === null || _c === void 0 ? void 0 : _c.status;
                message = (_f = (_e = (_d = error === null || error === void 0 ? void 0 : error.response) === null || _d === void 0 ? void 0 : _d.data) === null || _e === void 0 ? void 0 : _e.error) === null || _f === void 0 ? void 0 : _f.message;
            }
            if (status && message) {
                error.message = `${status}: unable to impersonate: ${message}`;
                throw error;
            }
            else {
                error.message = `unable to impersonate: ${error}`;
                throw error;
            }
        }
    }
    /**
     * Generates an OpenID Connect ID token for a service account.
     *
     * {@link https://cloud.google.com/iam/docs/reference/credentials/rest/v1/projects.serviceAccounts/generateIdToken Reference Documentation}
     *
     * @param targetAudience the audience for the fetched ID token.
     * @param options the for the request
     * @return an OpenID Connect ID token
     */
    async fetchIdToken(targetAudience, options) {
        var _a, _b;
        await this.sourceClient.getAccessToken();
        const name = `projects/-/serviceAccounts/${this.targetPrincipal}`;
        const u = `${this.endpoint}/v1/${name}:generateIdToken`;
        const body = {
            delegates: this.delegates,
            audience: targetAudience,
            includeEmail: (_a = options === null || options === void 0 ? void 0 : options.includeEmail) !== null && _a !== void 0 ? _a : true,
            useEmailAzp: (_b = options === null || options === void 0 ? void 0 : options.includeEmail) !== null && _b !== void 0 ? _b : true,
        };
        const res = await this.sourceClient.request({
            ...Impersonated.RETRY_CONFIG,
            url: u,
            data: body,
            method: 'POST',
        });
        return res.data.token;
    }
}
exports.Impersonated = Impersonated;

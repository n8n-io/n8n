/**
 * Copyright 2018 Google LLC
 *
 * Distributed under MIT license.
 * See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
 */
import * as fs from 'fs';
import { request } from 'gaxios';
import * as jws from 'jws';
import * as path from 'path';
import { promisify } from 'util';
const readFile = fs.readFile
    ? promisify(fs.readFile)
    : async () => {
        // if running in the web-browser, fs.readFile may not have been shimmed.
        throw new ErrorWithCode('use key rather than keyFile.', 'MISSING_CREDENTIALS');
    };
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';
const GOOGLE_REVOKE_TOKEN_URL = 'https://oauth2.googleapis.com/revoke?token=';
class ErrorWithCode extends Error {
    code;
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
export class GoogleToken {
    get accessToken() {
        return this.rawToken ? this.rawToken.access_token : undefined;
    }
    get idToken() {
        return this.rawToken ? this.rawToken.id_token : undefined;
    }
    get tokenType() {
        return this.rawToken ? this.rawToken.token_type : undefined;
    }
    get refreshToken() {
        return this.rawToken ? this.rawToken.refresh_token : undefined;
    }
    expiresAt;
    key;
    keyFile;
    iss;
    sub;
    scope;
    rawToken;
    tokenExpires;
    email;
    additionalClaims;
    eagerRefreshThresholdMillis;
    transporter = {
        request: opts => request(opts),
    };
    #inFlightRequest;
    /**
     * Create a GoogleToken.
     *
     * @param options  Configuration object.
     */
    constructor(options) {
        this.#configure(options);
    }
    /**
     * Returns whether the token has expired.
     *
     * @return true if the token has expired, false otherwise.
     */
    hasExpired() {
        const now = new Date().getTime();
        if (this.rawToken && this.expiresAt) {
            return now >= this.expiresAt;
        }
        else {
            return true;
        }
    }
    /**
     * Returns whether the token will expire within eagerRefreshThresholdMillis
     *
     * @return true if the token will be expired within eagerRefreshThresholdMillis, false otherwise.
     */
    isTokenExpiring() {
        const now = new Date().getTime();
        const eagerRefreshThresholdMillis = this.eagerRefreshThresholdMillis ?? 0;
        if (this.rawToken && this.expiresAt) {
            return this.expiresAt <= now + eagerRefreshThresholdMillis;
        }
        else {
            return true;
        }
    }
    getToken(callback, opts = {}) {
        if (typeof callback === 'object') {
            opts = callback;
            callback = undefined;
        }
        opts = Object.assign({
            forceRefresh: false,
        }, opts);
        if (callback) {
            const cb = callback;
            this.#getTokenAsync(opts).then(t => cb(null, t), callback);
            return;
        }
        return this.#getTokenAsync(opts);
    }
    /**
     * Given a keyFile, extract the key and client email if available
     * @param keyFile Path to a json, pem, or p12 file that contains the key.
     * @returns an object with privateKey and clientEmail properties
     */
    async getCredentials(keyFile) {
        const ext = path.extname(keyFile);
        switch (ext) {
            case '.json': {
                const key = await readFile(keyFile, 'utf8');
                const body = JSON.parse(key);
                const privateKey = body.private_key;
                const clientEmail = body.client_email;
                if (!privateKey || !clientEmail) {
                    throw new ErrorWithCode('private_key and client_email are required.', 'MISSING_CREDENTIALS');
                }
                return { privateKey, clientEmail };
            }
            case '.der':
            case '.crt':
            case '.pem': {
                const privateKey = await readFile(keyFile, 'utf8');
                return { privateKey };
            }
            case '.p12':
            case '.pfx': {
                throw new ErrorWithCode('*.p12 certificates are not supported after v6.1.2. ' +
                    'Consider utilizing *.json format or converting *.p12 to *.pem using the OpenSSL CLI.', 'UNKNOWN_CERTIFICATE_TYPE');
            }
            default:
                throw new ErrorWithCode('Unknown certificate type. Type is determined based on file extension. ' +
                    'Current supported extensions are *.json, and *.pem.', 'UNKNOWN_CERTIFICATE_TYPE');
        }
    }
    async #getTokenAsync(opts) {
        if (this.#inFlightRequest && !opts.forceRefresh) {
            return this.#inFlightRequest;
        }
        try {
            return await (this.#inFlightRequest = this.#getTokenAsyncInner(opts));
        }
        finally {
            this.#inFlightRequest = undefined;
        }
    }
    async #getTokenAsyncInner(opts) {
        if (this.isTokenExpiring() === false && opts.forceRefresh === false) {
            return Promise.resolve(this.rawToken);
        }
        if (!this.key && !this.keyFile) {
            throw new Error('No key or keyFile set.');
        }
        if (!this.key && this.keyFile) {
            const creds = await this.getCredentials(this.keyFile);
            this.key = creds.privateKey;
            this.iss = creds.clientEmail || this.iss;
            if (!creds.clientEmail) {
                this.#ensureEmail();
            }
        }
        return this.#requestToken();
    }
    #ensureEmail() {
        if (!this.iss) {
            throw new ErrorWithCode('email is required.', 'MISSING_CREDENTIALS');
        }
    }
    revokeToken(callback) {
        if (callback) {
            this.#revokeTokenAsync().then(() => callback(), callback);
            return;
        }
        return this.#revokeTokenAsync();
    }
    async #revokeTokenAsync() {
        if (!this.accessToken) {
            throw new Error('No token to revoke.');
        }
        const url = GOOGLE_REVOKE_TOKEN_URL + this.accessToken;
        await this.transporter.request({
            url,
            retry: true,
        });
        this.#configure({
            email: this.iss,
            sub: this.sub,
            key: this.key,
            keyFile: this.keyFile,
            scope: this.scope,
            additionalClaims: this.additionalClaims,
        });
    }
    /**
     * Configure the GoogleToken for re-use.
     * @param  {object} options Configuration object.
     */
    #configure(options = {}) {
        this.keyFile = options.keyFile;
        this.key = options.key;
        this.rawToken = undefined;
        this.iss = options.email || options.iss;
        this.sub = options.sub;
        this.additionalClaims = options.additionalClaims;
        if (typeof options.scope === 'object') {
            this.scope = options.scope.join(' ');
        }
        else {
            this.scope = options.scope;
        }
        this.eagerRefreshThresholdMillis = options.eagerRefreshThresholdMillis;
        if (options.transporter) {
            this.transporter = options.transporter;
        }
    }
    /**
     * Request the token from Google.
     */
    async #requestToken() {
        const iat = Math.floor(new Date().getTime() / 1000);
        const additionalClaims = this.additionalClaims || {};
        const payload = Object.assign({
            iss: this.iss,
            scope: this.scope,
            aud: GOOGLE_TOKEN_URL,
            exp: iat + 3600,
            iat,
            sub: this.sub,
        }, additionalClaims);
        const signedJWT = jws.sign({
            header: { alg: 'RS256' },
            payload,
            secret: this.key,
        });
        try {
            const r = await this.transporter.request({
                method: 'POST',
                url: GOOGLE_TOKEN_URL,
                data: new URLSearchParams({
                    grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                    assertion: signedJWT,
                }),
                responseType: 'json',
                retryConfig: {
                    httpMethodsToRetry: ['POST'],
                },
            });
            this.rawToken = r.data;
            this.expiresAt =
                r.data.expires_in === null || r.data.expires_in === undefined
                    ? undefined
                    : (iat + r.data.expires_in) * 1000;
            return this.rawToken;
        }
        catch (e) {
            this.rawToken = undefined;
            this.tokenExpires = undefined;
            const body = e.response && e.response?.data
                ? e.response?.data
                : {};
            if (body.error) {
                const desc = body.error_description
                    ? `: ${body.error_description}`
                    : '';
                e.message = `${body.error}${desc}`;
            }
            throw e;
        }
    }
}

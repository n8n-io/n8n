"use strict";
/**
 * Copyright 2018 Google LLC
 *
 * Distributed under MIT license.
 * See file LICENSE for detail or copy at https://opensource.org/licenses/MIT
 */
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var _GoogleToken_instances, _GoogleToken_inFlightRequest, _GoogleToken_getTokenAsync, _GoogleToken_getTokenAsyncInner, _GoogleToken_ensureEmail, _GoogleToken_revokeTokenAsync, _GoogleToken_configure, _GoogleToken_requestToken;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GoogleToken = void 0;
const fs = require("fs");
const gaxios_1 = require("gaxios");
const jws = require("jws");
const path = require("path");
const util_1 = require("util");
const readFile = fs.readFile
    ? (0, util_1.promisify)(fs.readFile)
    : async () => {
        // if running in the web-browser, fs.readFile may not have been shimmed.
        throw new ErrorWithCode('use key rather than keyFile.', 'MISSING_CREDENTIALS');
    };
const GOOGLE_TOKEN_URL = 'https://www.googleapis.com/oauth2/v4/token';
const GOOGLE_REVOKE_TOKEN_URL = 'https://accounts.google.com/o/oauth2/revoke?token=';
class ErrorWithCode extends Error {
    constructor(message, code) {
        super(message);
        this.code = code;
    }
}
class GoogleToken {
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
    /**
     * Create a GoogleToken.
     *
     * @param options  Configuration object.
     */
    constructor(options) {
        _GoogleToken_instances.add(this);
        this.transporter = {
            request: opts => (0, gaxios_1.request)(opts),
        };
        _GoogleToken_inFlightRequest.set(this, void 0);
        __classPrivateFieldGet(this, _GoogleToken_instances, "m", _GoogleToken_configure).call(this, options);
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
        var _a;
        const now = new Date().getTime();
        const eagerRefreshThresholdMillis = (_a = this.eagerRefreshThresholdMillis) !== null && _a !== void 0 ? _a : 0;
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
            __classPrivateFieldGet(this, _GoogleToken_instances, "m", _GoogleToken_getTokenAsync).call(this, opts).then(t => cb(null, t), callback);
            return;
        }
        return __classPrivateFieldGet(this, _GoogleToken_instances, "m", _GoogleToken_getTokenAsync).call(this, opts);
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
    revokeToken(callback) {
        if (callback) {
            __classPrivateFieldGet(this, _GoogleToken_instances, "m", _GoogleToken_revokeTokenAsync).call(this).then(() => callback(), callback);
            return;
        }
        return __classPrivateFieldGet(this, _GoogleToken_instances, "m", _GoogleToken_revokeTokenAsync).call(this);
    }
}
exports.GoogleToken = GoogleToken;
_GoogleToken_inFlightRequest = new WeakMap(), _GoogleToken_instances = new WeakSet(), _GoogleToken_getTokenAsync = async function _GoogleToken_getTokenAsync(opts) {
    if (__classPrivateFieldGet(this, _GoogleToken_inFlightRequest, "f") && !opts.forceRefresh) {
        return __classPrivateFieldGet(this, _GoogleToken_inFlightRequest, "f");
    }
    try {
        return await (__classPrivateFieldSet(this, _GoogleToken_inFlightRequest, __classPrivateFieldGet(this, _GoogleToken_instances, "m", _GoogleToken_getTokenAsyncInner).call(this, opts), "f"));
    }
    finally {
        __classPrivateFieldSet(this, _GoogleToken_inFlightRequest, undefined, "f");
    }
}, _GoogleToken_getTokenAsyncInner = async function _GoogleToken_getTokenAsyncInner(opts) {
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
            __classPrivateFieldGet(this, _GoogleToken_instances, "m", _GoogleToken_ensureEmail).call(this);
        }
    }
    return __classPrivateFieldGet(this, _GoogleToken_instances, "m", _GoogleToken_requestToken).call(this);
}, _GoogleToken_ensureEmail = function _GoogleToken_ensureEmail() {
    if (!this.iss) {
        throw new ErrorWithCode('email is required.', 'MISSING_CREDENTIALS');
    }
}, _GoogleToken_revokeTokenAsync = async function _GoogleToken_revokeTokenAsync() {
    if (!this.accessToken) {
        throw new Error('No token to revoke.');
    }
    const url = GOOGLE_REVOKE_TOKEN_URL + this.accessToken;
    await this.transporter.request({
        url,
        retry: true,
    });
    __classPrivateFieldGet(this, _GoogleToken_instances, "m", _GoogleToken_configure).call(this, {
        email: this.iss,
        sub: this.sub,
        key: this.key,
        keyFile: this.keyFile,
        scope: this.scope,
        additionalClaims: this.additionalClaims,
    });
}, _GoogleToken_configure = function _GoogleToken_configure(options = {}) {
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
}, _GoogleToken_requestToken = 
/**
 * Request the token from Google.
 */
async function _GoogleToken_requestToken() {
    var _a, _b;
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
            data: {
                grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
                assertion: signedJWT,
            },
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
        const body = e.response && ((_a = e.response) === null || _a === void 0 ? void 0 : _a.data)
            ? (_b = e.response) === null || _b === void 0 ? void 0 : _b.data
            : {};
        if (body.error) {
            const desc = body.error_description
                ? `: ${body.error_description}`
                : '';
            e.message = `${body.error}${desc}`;
        }
        throw e;
    }
};
//# sourceMappingURL=index.js.map
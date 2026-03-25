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
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SigningError = exports.URLSigner = exports.PATH_STYLED_HOST = exports.SignerExceptionMessages = void 0;
const crypto = __importStar(require("crypto"));
const url = __importStar(require("url"));
const storage_js_1 = require("./storage.js");
const util_js_1 = require("./util.js");
var SignerExceptionMessages;
(function (SignerExceptionMessages) {
    SignerExceptionMessages["ACCESSIBLE_DATE_INVALID"] = "The accessible at date provided was invalid.";
    SignerExceptionMessages["EXPIRATION_BEFORE_ACCESSIBLE_DATE"] = "An expiration date cannot be before accessible date.";
    SignerExceptionMessages["X_GOOG_CONTENT_SHA256"] = "The header X-Goog-Content-SHA256 must be a hexadecimal string.";
})(SignerExceptionMessages || (exports.SignerExceptionMessages = SignerExceptionMessages = {}));
/*
 * Default signing version for getSignedUrl is 'v2'.
 */
const DEFAULT_SIGNING_VERSION = 'v2';
const SEVEN_DAYS = 7 * 24 * 60 * 60;
/**
 * @const {string}
 * @deprecated - unused
 */
exports.PATH_STYLED_HOST = 'https://storage.googleapis.com';
class URLSigner {
    constructor(auth, bucket, file, 
    /**
     * A {@link Storage} object.
     *
     * @privateRemarks
     *
     * Technically this is a required field, however it would be a breaking change to
     * move it before optional properties. In the next major we should refactor the
     * constructor of this class to only accept a config object.
     */
    storage = new storage_js_1.Storage()) {
        this.auth = auth;
        this.bucket = bucket;
        this.file = file;
        this.storage = storage;
    }
    getSignedUrl(cfg) {
        const expiresInSeconds = this.parseExpires(cfg.expires);
        const method = cfg.method;
        const accessibleAtInSeconds = this.parseAccessibleAt(cfg.accessibleAt);
        if (expiresInSeconds < accessibleAtInSeconds) {
            throw new Error(SignerExceptionMessages.EXPIRATION_BEFORE_ACCESSIBLE_DATE);
        }
        let customHost;
        // Default style is `path`.
        const isVirtualHostedStyle = cfg.virtualHostedStyle || false;
        if (cfg.cname) {
            customHost = cfg.cname;
        }
        else if (isVirtualHostedStyle) {
            customHost = `https://${this.bucket.name}.storage.${this.storage.universeDomain}`;
        }
        const secondsToMilliseconds = 1000;
        const config = Object.assign({}, cfg, {
            method,
            expiration: expiresInSeconds,
            accessibleAt: new Date(secondsToMilliseconds * accessibleAtInSeconds),
            bucket: this.bucket.name,
            file: this.file ? (0, util_js_1.encodeURI)(this.file.name, false) : undefined,
        });
        if (customHost) {
            config.cname = customHost;
        }
        const version = cfg.version || DEFAULT_SIGNING_VERSION;
        let promise;
        if (version === 'v2') {
            promise = this.getSignedUrlV2(config);
        }
        else if (version === 'v4') {
            promise = this.getSignedUrlV4(config);
        }
        else {
            throw new Error(`Invalid signed URL version: ${version}. Supported versions are 'v2' and 'v4'.`);
        }
        return promise.then(query => {
            var _a;
            query = Object.assign(query, cfg.queryParams);
            const signedUrl = new url.URL(((_a = cfg.host) === null || _a === void 0 ? void 0 : _a.toString()) || config.cname || this.storage.apiEndpoint);
            signedUrl.pathname = this.getResourcePath(!!config.cname, this.bucket.name, config.file);
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            signedUrl.search = (0, util_js_1.qsStringify)(query);
            return signedUrl.href;
        });
    }
    getSignedUrlV2(config) {
        const canonicalHeadersString = this.getCanonicalHeaders(config.extensionHeaders || {});
        const resourcePath = this.getResourcePath(false, config.bucket, config.file);
        const blobToSign = [
            config.method,
            config.contentMd5 || '',
            config.contentType || '',
            config.expiration,
            canonicalHeadersString + resourcePath,
        ].join('\n');
        const sign = async () => {
            var _a;
            const auth = this.auth;
            try {
                const signature = await auth.sign(blobToSign, (_a = config.signingEndpoint) === null || _a === void 0 ? void 0 : _a.toString());
                const credentials = await auth.getCredentials();
                return {
                    GoogleAccessId: credentials.client_email,
                    Expires: config.expiration,
                    Signature: signature,
                };
            }
            catch (err) {
                const error = err;
                const signingErr = new SigningError(error.message);
                signingErr.stack = error.stack;
                throw signingErr;
            }
        };
        return sign();
    }
    getSignedUrlV4(config) {
        var _a;
        config.accessibleAt = config.accessibleAt
            ? config.accessibleAt
            : new Date();
        const millisecondsToSeconds = 1.0 / 1000.0;
        const expiresPeriodInSeconds = config.expiration - config.accessibleAt.valueOf() * millisecondsToSeconds;
        // v4 limit expiration to be 7 days maximum
        if (expiresPeriodInSeconds > SEVEN_DAYS) {
            throw new Error(`Max allowed expiration is seven days (${SEVEN_DAYS} seconds).`);
        }
        const extensionHeaders = Object.assign({}, config.extensionHeaders);
        const fqdn = new url.URL(((_a = config.host) === null || _a === void 0 ? void 0 : _a.toString()) || config.cname || this.storage.apiEndpoint);
        extensionHeaders.host = fqdn.hostname;
        if (config.contentMd5) {
            extensionHeaders['content-md5'] = config.contentMd5;
        }
        if (config.contentType) {
            extensionHeaders['content-type'] = config.contentType;
        }
        let contentSha256;
        const sha256Header = extensionHeaders['x-goog-content-sha256'];
        if (sha256Header) {
            if (typeof sha256Header !== 'string' ||
                !/[A-Fa-f0-9]{40}/.test(sha256Header)) {
                throw new Error(SignerExceptionMessages.X_GOOG_CONTENT_SHA256);
            }
            contentSha256 = sha256Header;
        }
        const signedHeaders = Object.keys(extensionHeaders)
            .map(header => header.toLowerCase())
            .sort()
            .join(';');
        const extensionHeadersString = this.getCanonicalHeaders(extensionHeaders);
        const datestamp = (0, util_js_1.formatAsUTCISO)(config.accessibleAt);
        const credentialScope = `${datestamp}/auto/storage/goog4_request`;
        const sign = async () => {
            var _a;
            const credentials = await this.auth.getCredentials();
            const credential = `${credentials.client_email}/${credentialScope}`;
            const dateISO = (0, util_js_1.formatAsUTCISO)(config.accessibleAt ? config.accessibleAt : new Date(), true);
            const queryParams = {
                'X-Goog-Algorithm': 'GOOG4-RSA-SHA256',
                'X-Goog-Credential': credential,
                'X-Goog-Date': dateISO,
                'X-Goog-Expires': expiresPeriodInSeconds.toString(10),
                'X-Goog-SignedHeaders': signedHeaders,
                ...(config.queryParams || {}),
            };
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const canonicalQueryParams = this.getCanonicalQueryParams(queryParams);
            const canonicalRequest = this.getCanonicalRequest(config.method, this.getResourcePath(!!config.cname, config.bucket, config.file), canonicalQueryParams, extensionHeadersString, signedHeaders, contentSha256);
            const hash = crypto
                .createHash('sha256')
                .update(canonicalRequest)
                .digest('hex');
            const blobToSign = [
                'GOOG4-RSA-SHA256',
                dateISO,
                credentialScope,
                hash,
            ].join('\n');
            try {
                const signature = await this.auth.sign(blobToSign, (_a = config.signingEndpoint) === null || _a === void 0 ? void 0 : _a.toString());
                const signatureHex = Buffer.from(signature, 'base64').toString('hex');
                const signedQuery = Object.assign({}, queryParams, {
                    'X-Goog-Signature': signatureHex,
                });
                return signedQuery;
            }
            catch (err) {
                const error = err;
                const signingErr = new SigningError(error.message);
                signingErr.stack = error.stack;
                throw signingErr;
            }
        };
        return sign();
    }
    /**
     * Create canonical headers for signing v4 url.
     *
     * The canonical headers for v4-signing a request demands header names are
     * first lowercased, followed by sorting the header names.
     * Then, construct the canonical headers part of the request:
     *  <lowercasedHeaderName> + ":" + Trim(<value>) + "\n"
     *  ..
     *  <lowercasedHeaderName> + ":" + Trim(<value>) + "\n"
     *
     * @param headers
     * @private
     */
    getCanonicalHeaders(headers) {
        // Sort headers by their lowercased names
        const sortedHeaders = (0, util_js_1.objectEntries)(headers)
            // Convert header names to lowercase
            .map(([headerName, value]) => [
            headerName.toLowerCase(),
            value,
        ])
            .sort((a, b) => a[0].localeCompare(b[0]));
        return sortedHeaders
            .filter(([, value]) => value !== undefined)
            .map(([headerName, value]) => {
            // - Convert Array (multi-valued header) into string, delimited by
            //      ',' (no space).
            // - Trim leading and trailing spaces.
            // - Convert sequential (2+) spaces into a single space
            const canonicalValue = `${value}`.trim().replace(/\s{2,}/g, ' ');
            return `${headerName}:${canonicalValue}\n`;
        })
            .join('');
    }
    getCanonicalRequest(method, path, query, headers, signedHeaders, contentSha256) {
        return [
            method,
            path,
            query,
            headers,
            signedHeaders,
            contentSha256 || 'UNSIGNED-PAYLOAD',
        ].join('\n');
    }
    getCanonicalQueryParams(query) {
        return (0, util_js_1.objectEntries)(query)
            .map(([key, value]) => [(0, util_js_1.encodeURI)(key, true), (0, util_js_1.encodeURI)(value, true)])
            .sort((a, b) => (a[0] < b[0] ? -1 : 1))
            .map(([key, value]) => `${key}=${value}`)
            .join('&');
    }
    getResourcePath(cname, bucket, file) {
        if (cname) {
            return '/' + (file || '');
        }
        else if (file) {
            return `/${bucket}/${file}`;
        }
        else {
            return `/${bucket}`;
        }
    }
    parseExpires(expires, current = new Date()) {
        const expiresInMSeconds = new Date(expires).valueOf();
        if (isNaN(expiresInMSeconds)) {
            throw new Error(storage_js_1.ExceptionMessages.EXPIRATION_DATE_INVALID);
        }
        if (expiresInMSeconds < current.valueOf()) {
            throw new Error(storage_js_1.ExceptionMessages.EXPIRATION_DATE_PAST);
        }
        return Math.floor(expiresInMSeconds / 1000); // The API expects seconds.
    }
    parseAccessibleAt(accessibleAt) {
        const accessibleAtInMSeconds = new Date(accessibleAt || new Date()).valueOf();
        if (isNaN(accessibleAtInMSeconds)) {
            throw new Error(SignerExceptionMessages.ACCESSIBLE_DATE_INVALID);
        }
        return Math.floor(accessibleAtInMSeconds / 1000); // The API expects seconds.
    }
}
exports.URLSigner = URLSigner;
/**
 * Custom error type for errors related to getting signed errors and policies.
 *
 * @private
 */
class SigningError extends Error {
    constructor() {
        super(...arguments);
        this.name = 'SigningError';
    }
}
exports.SigningError = SigningError;

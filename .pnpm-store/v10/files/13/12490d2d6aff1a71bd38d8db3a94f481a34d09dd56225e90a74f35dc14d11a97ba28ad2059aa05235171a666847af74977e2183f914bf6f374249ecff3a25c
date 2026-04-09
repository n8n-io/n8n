"use strict";
/**
 * (C) Copyright IBM Corp. 2025-2026.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AWSAuthenticator = exports.JWTRequestBaseAuthenticator = exports.AWSTokenManager = exports.RequestFunctionJWTTokenManager = void 0;
const ibm_cloud_sdk_core_1 = require("ibm-cloud-sdk-core");
/* AWS authentication endpoint path for token requests. */
const AWS_AUTHENTICATION_PATH = '/api/2.0/apikeys/token';
/**
 * JWT Token Manager that uses a custom request function for token retrieval. Extends the base
 * JwtTokenManager with a custom token request implementation.
 *
 * @extends JwtTokenManager
 */
class RequestFunctionJWTTokenManager extends ibm_cloud_sdk_core_1.JwtTokenManager {
    /**
     * Creates a new RequestFunctionJWTTokenManager instance.
     *
     * @param {JwtTokenManagerOptions} options - Configuration options for the token manager
     * @param {() => Promise<RequestTokenResponse>} requestToken - Custom function to request tokens
     */
    constructor(options, requestToken) {
        super(options);
        super.requestToken = requestToken;
    }
}
exports.RequestFunctionJWTTokenManager = RequestFunctionJWTTokenManager;
/**
 * Token Manager specifically designed for AWS authentication. Handles token requests to AWS
 * endpoints using API keys.
 *
 * @extends JwtTokenManager
 */
class AWSTokenManager extends ibm_cloud_sdk_core_1.JwtTokenManager {
    /**
     * Creates a new AWSTokenManager instance.
     *
     * @param {JwtTokenManagerOptions} options - Configuration options including API key and URL
     * @param {string} options.apikey - The API key for AWS authentication
     * @param {Agent} [options.httpsAgent] - Optional custom HTTPS agent for handling requests
     */
    constructor(options) {
        super(options);
        this.apikey = options.apikey;
        this.tokenName = 'token';
        this.httpsAgent = options.httpsAgent;
    }
    /**
     * Requests a new token from the AWS authentication endpoint. Constructs the request with API key
     * and sends it to the configured URL.
     *
     * @returns {Promise<any>} Promise resolving to the token response
     * @protected
     */
    requestToken() {
        return __awaiter(this, void 0, void 0, function* () {
            const authPath = new URL(this.url).pathname === '/' ? AWS_AUTHENTICATION_PATH : '';
            const parameters = {
                options: {
                    url: this.url + authPath,
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: {
                        apikey: this.apikey,
                    },
                    rejectUnauthorized: !this.disableSslVerification,
                    axiosOptions: {
                        httpsAgent: this.httpsAgent,
                    },
                },
            };
            return this.requestWrapperInstance.sendRequest(parameters);
        });
    }
}
exports.AWSTokenManager = AWSTokenManager;
/**
 * JWT-based authenticator that uses a custom request function for token management. Supports Zen
 * authentication type for IBM Cloud Pak for Data.
 *
 * @extends TokenRequestBasedAuthenticator
 */
class JWTRequestBaseAuthenticator extends ibm_cloud_sdk_core_1.TokenRequestBasedAuthenticator {
    /**
     * Creates a new JWTRequestBaseAuthenticator instance.
     *
     * @param {BaseOptions} options - Base authentication options
     * @param {() => Promise<RequestTokenResponse>} requestToken - Custom function to request tokens
     */
    constructor(options, requestToken) {
        super(options);
        this.tokenManager = new RequestFunctionJWTTokenManager(options, requestToken);
    }
}
exports.JWTRequestBaseAuthenticator = JWTRequestBaseAuthenticator;
/* Authentication type identifier for Zen (IBM Cloud Pak for Data). */
JWTRequestBaseAuthenticator.AUTHTYPE_ZEN = 'zen';
/**
 * Authenticator specifically designed for AWS authentication. Uses AWSTokenManager to handle token
 * lifecycle for AWS services.
 *
 * @extends TokenRequestBasedAuthenticator
 */
class AWSAuthenticator extends ibm_cloud_sdk_core_1.TokenRequestBasedAuthenticator {
    /**
     * Creates a new AWSAuthenticator instance.
     *
     * @param {BaseOptions} options - Base authentication options including API key and URL
     */
    constructor(options) {
        super(options);
        this.tokenManager = new AWSTokenManager(options);
    }
}
exports.AWSAuthenticator = AWSAuthenticator;
/* Authentication type identifier for AWS. */
AWSAuthenticator.AUTHTYPE_AWS = 'aws';
//# sourceMappingURL=authenticators.js.map
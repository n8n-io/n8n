/* eslint-disable class-methods-use-this */
/**
 * (C) Copyright IBM Corp. 2019, 2024.
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
import { decode } from 'jsonwebtoken';
import logger from '../../lib/logger';
import { TokenManager } from './token-manager';
/**
 * A class for shared functionality for parsing, storing, and requesting
 * JWT tokens. Intended to be used as a parent to be extended for token
 * request management. Child classes should implement `requestToken()`
 * to retrieve the bearer token from intended sources.
 */
export class JwtTokenManager extends TokenManager {
    /**
     * Create a new JwtTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     */
    constructor(options) {
        // all parameters are optional
        options = options || {};
        super(options);
        this.tokenName = 'access_token';
        this.tokenInfo = {};
    }
    /**
     * Request a JWT using an API key.
     *
     * @returns Promise
     */
    requestToken() {
        const errMsg = '`requestToken` MUST be overridden by a subclass of JwtTokenManagerV1.';
        const err = new Error(errMsg);
        logger.error(errMsg);
        return Promise.reject(err);
    }
    /**
     * Save the JWT service response and the calculated expiration time to the object's state.
     *
     * @param tokenResponse - the response object from JWT service request
     */
    saveTokenInfo(tokenResponse) {
        const responseBody = tokenResponse.result || {};
        this.accessToken = responseBody[this.tokenName];
        if (!this.accessToken) {
            const err = 'Access token not present in response';
            logger.error(err);
            throw new Error(err);
        }
        const decodedResponse = decode(this.accessToken);
        if (!decodedResponse) {
            const err = 'Access token received is not a valid JWT';
            logger.error(err);
            throw new Error(err);
        }
        // the time of expiration is found by decoding the JWT access token
        // 'exp' is the time of expire and 'iat' is the time of token retrieval
        const { exp, iat } = decodedResponse;
        // There are no required claims in JWT
        if (!exp || !iat) {
            this.expireTime = 0;
            this.refreshTime = 0;
        }
        else {
            const fractionOfTtl = 0.8;
            const timeToLive = exp - iat;
            this.expireTime = exp;
            this.refreshTime = exp - timeToLive * (1.0 - fractionOfTtl);
        }
        this.tokenInfo = Object.assign({}, responseBody);
    }
}

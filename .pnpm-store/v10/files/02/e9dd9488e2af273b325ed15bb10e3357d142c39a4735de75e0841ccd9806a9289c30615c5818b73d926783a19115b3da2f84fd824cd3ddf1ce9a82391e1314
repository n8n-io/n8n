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
import extend from 'extend';
import logger from '../../lib/logger';
import { computeBasicAuthHeader, getCurrentTime, onlyOne, removeSuffix } from '../utils/helpers';
import { JwtTokenManager } from './jwt-token-manager';
const CLIENT_ID_SECRET_WARNING = 'Warning: Client ID and Secret must BOTH be given, or the header will not be included.';
const DEFAULT_IAM_URL = 'https://iam.cloud.ibm.com';
const OPERATION_PATH = '/identity/token';
const IAM_EXPIRATION_WINDOW = 10;
/**
 * The IamRequestBasedTokenManager class contains code relevant to any token manager that
 * interacts with the IAM service to manage a token. It stores information relevant to all
 * IAM requests, such as the client ID and secret, and performs the token request with a set
 * of request options common to any IAM token management scheme. It is intended that this
 * class be extended with specific implementations.
 */
export class IamRequestBasedTokenManager extends JwtTokenManager {
    /**
     *
     * Create a new IamRequestBasedTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service (default value: "https://iam.cloud.ibm.com")
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     * - clientId: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - clientSecret: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - scope: (optional) the "scope" parameter to use when fetching the bearer token from the token service
     *
     * @throws Error: the configuration options are not valid.
     */
    constructor(options) {
        // all parameters are optional
        options = options || {};
        super(options);
        // Canonicalize the URL by removing the operation path if it was specified by the user.
        this.url = this.url ? removeSuffix(this.url, OPERATION_PATH) : DEFAULT_IAM_URL;
        if (options.clientId) {
            this.clientId = options.clientId;
        }
        if (options.clientSecret) {
            this.clientSecret = options.clientSecret;
        }
        if (options.scope) {
            this.scope = options.scope;
        }
        if (onlyOne(options.clientId, options.clientSecret)) {
            // tslint:disable-next-line
            logger.warn(CLIENT_ID_SECRET_WARNING);
        }
        // initialize the form data object
        this.formData = {};
    }
    /**
     * Sets the IAM "scope" value.
     * This value is sent as the "scope" form parameter within the request sent to the IAM token service.
     *
     * @param scope - a space-separated string that contains one or more scope names
     */
    setScope(scope) {
        this.scope = scope;
    }
    /**
     * Sets the IAM "clientId" and "clientSecret" values.
     * These values are used to compute the Authorization header used
     * when retrieving the IAM access token.
     * If these values are not set, no Authorization header will be
     * set on the request (it is not required).
     *
     * @param clientId - the client id.
     * @param clientSecret - the client secret.
     */
    setClientIdAndSecret(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        if (onlyOne(clientId, clientSecret)) {
            // tslint:disable-next-line
            logger.warn(CLIENT_ID_SECRET_WARNING);
        }
    }
    /**
     * Extend this method from the parent class to extract the refresh token from
     * the request and save it.
     *
     * @param tokenResponse - the response object from JWT service request
     */
    saveTokenInfo(tokenResponse) {
        super.saveTokenInfo(tokenResponse);
        const responseBody = tokenResponse.result || {};
        if (responseBody.refresh_token) {
            this.refreshToken = responseBody.refresh_token;
        }
    }
    /**
     * Request an IAM access token using an API key.
     *
     * @returns Promise
     */
    requestToken() {
        // these cannot be overwritten
        const requiredHeaders = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'User-Agent': this.userAgent,
        };
        // If both the clientId and secret were specified by the user, then use them.
        if (this.clientId && this.clientSecret) {
            requiredHeaders.Authorization = computeBasicAuthHeader(this.clientId, this.clientSecret);
        }
        if (this.scope) {
            this.formData.scope = this.scope;
        }
        const parameters = {
            options: {
                url: this.url + OPERATION_PATH,
                method: 'POST',
                headers: extend(true, {}, this.headers, requiredHeaders),
                form: this.formData,
                rejectUnauthorized: !this.disableSslVerification,
            },
        };
        logger.debug(`Invoking IAM get_token operation: ${parameters.options.url}`);
        return this.requestWrapperInstance.sendRequest(parameters).then((response) => {
            logger.debug('Returned from IAM get_token operation');
            return response;
        });
    }
    /**
     * Returns true iff the currently-cached IAM access token is expired.
     * We'll consider an access token as expired when we reach its IAM server-reported
     * expiration time minus our expiration window (10 secs).
     * We do this to avoid using an access token that might expire in the middle of a long-running
     * transaction within an IBM Cloud service.
     *
     * @returns true if the token has expired, false otherwise
     */
    isTokenExpired() {
        const { expireTime } = this;
        if (!expireTime) {
            return true;
        }
        const currentTime = getCurrentTime();
        return currentTime >= expireTime - IAM_EXPIRATION_WINDOW;
    }
}

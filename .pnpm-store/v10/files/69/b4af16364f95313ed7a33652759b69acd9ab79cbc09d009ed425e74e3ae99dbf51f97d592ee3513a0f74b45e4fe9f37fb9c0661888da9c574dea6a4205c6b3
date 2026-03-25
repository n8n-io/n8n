/**
 * (C) Copyright IBM Corp. 2019, 2023.
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
import { Authenticator } from './authenticator';
import { IamTokenManager } from '../token-managers/iam-token-manager';
import { validateInput } from '../utils/helpers';
import { IamRequestBasedAuthenticator } from './iam-request-based-authenticator';
/**
 * The IamAuthenticator will use the user-supplied `apikey`
 * value to obtain a bearer token from a token server.  When the bearer token
 * expires, a new token is obtained from the token server. If specified, the
 * optional, mutually inclusive "clientId" and "clientSecret" pair can be used to
 * influence rate-limiting for requests to the IAM token server.
 *
 * The bearer token will be sent as an Authorization header in the form:
 *
 *      Authorization: Bearer \<bearer-token\>
 */
export class IamAuthenticator extends IamRequestBasedAuthenticator {
    /**
     *
     * Create a new IamAuthenticator instance.
     *
     * @param options - Configuration options for IAM authentication.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service
     * - apikey: (required) the IAM api key
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
        super(options);
        this.requiredOptions = ['apikey'];
        validateInput(options, this.requiredOptions);
        this.apikey = options.apikey;
        // the param names are shared between the authenticator and the token
        // manager so we can just pass along the options object
        this.tokenManager = new IamTokenManager(options);
    }
    /**
     * Returns the authenticator's type ('iam').
     *
     * @returns a string that indicates the authenticator's type
     */
    // eslint-disable-next-line class-methods-use-this
    authenticationType() {
        return Authenticator.AUTHTYPE_IAM;
    }
    /**
     * Return the most recently stored refresh token.
     *
     * @returns the refresh token string
     */
    getRefreshToken() {
        return this.tokenManager.getRefreshToken();
    }
}

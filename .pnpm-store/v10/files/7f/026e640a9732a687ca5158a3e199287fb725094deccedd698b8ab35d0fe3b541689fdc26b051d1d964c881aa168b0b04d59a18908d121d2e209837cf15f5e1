/**
 * (C) Copyright IBM Corp. 2023, 2025.
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
import { McspTokenManager } from '../token-managers/mcsp-token-manager';
import { TokenRequestBasedAuthenticator } from './token-request-based-authenticator';
/**
 * The McspAuthenticator uses an apikey to obtain an access token from the MCSP token server.
 * When the access token expires, a new access token is obtained from the token server.
 * The access token will be added to outbound requests via the Authorization header
 * of the form:    "Authorization: Bearer <access-token>"
 */
export class McspAuthenticator extends TokenRequestBasedAuthenticator {
    /**
     * Create a new McspAuthenticator instance.
     *
     * @param options - Configuration options for CloudPakForData authentication.
     * This should be an object containing these fields:
     * - url: (required) the endpoint URL for the CloudPakForData token service
     * - apikey: (optional) the API key used to obtain a bearer token (required if password is not specified)
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     *
     * @throws Error: the username, password, and/or url are not valid, or unspecified, for Cloud Pak For Data token requests.
     */
    constructor(options) {
        super(options);
        this.requiredOptions = ['apikey', 'url'];
        this.apikey = options.apikey;
        this.url = options.url;
        // the param names are shared between the authenticator and the token
        // manager so we can just pass along the options object.
        // also, the token manager will handle input validation
        this.tokenManager = new McspTokenManager(options);
    }
    /**
     * Returns the authenticator's type ('mcsp').
     *
     * @returns a string that indicates the authenticator's type
     */
    // eslint-disable-next-line class-methods-use-this
    authenticationType() {
        return Authenticator.AUTHTYPE_MCSP;
    }
}

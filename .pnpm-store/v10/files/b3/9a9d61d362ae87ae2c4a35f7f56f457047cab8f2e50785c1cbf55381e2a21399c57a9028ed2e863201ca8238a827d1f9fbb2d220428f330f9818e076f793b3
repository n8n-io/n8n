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
import { computeBasicAuthHeader, validateInput } from '../utils/helpers';
import { Authenticator } from './authenticator';
import logger from '../../lib/logger';
/**
 * The BasicAuthenticator is used to add basic authentication information to
 *   requests.
 *
 * Basic Authorization will be sent as an Authorization header in the form:
 *
 *     Authorization: Basic \<encoded username and password\>
 *
 */
export class BasicAuthenticator extends Authenticator {
    /**
     * Create a new BasicAuthenticator instance.
     *
     * @param options - Configuration options for basic authentication.
     * This should be an object containing these fields:
     * - username: the username portion of basic authentication
     * - password: the password portion of basic authentication
     *
     * @throws Error: the configuration options are not valid.
     */
    constructor(options) {
        super();
        this.requiredOptions = ['username', 'password'];
        validateInput(options, this.requiredOptions);
        const { username, password } = options;
        const authHeaderString = computeBasicAuthHeader(username, password);
        this.authHeader = { Authorization: authHeaderString };
    }
    /**
     * Add basic authentication information to `requestOptions`. The basic authentication information
     * will be set in the Authorization property of `requestOptions.headers` in the form:
     *
     *     Authorization: Basic \<encoded username and password\>
     *
     * @param requestOptions - The request to augment with authentication information.
     */
    authenticate(requestOptions) {
        return new Promise((resolve) => {
            requestOptions.headers = extend(true, {}, requestOptions.headers, this.authHeader);
            logger.debug(`Authenticated outbound request (type=${this.authenticationType()})`);
            resolve();
        });
    }
    /**
     * Returns the authenticator's type ('basic').
     *
     * @returns a string that indicates the authenticator's type
     */
    // eslint-disable-next-line class-methods-use-this
    authenticationType() {
        return Authenticator.AUTHTYPE_BASIC;
    }
}

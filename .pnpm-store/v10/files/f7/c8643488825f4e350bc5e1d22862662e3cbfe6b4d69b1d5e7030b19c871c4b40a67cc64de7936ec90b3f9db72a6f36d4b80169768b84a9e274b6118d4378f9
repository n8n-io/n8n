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
import extend from 'extend';
import { validateInput } from '../utils/helpers';
import { Authenticator } from './authenticator';
import logger from '../../lib/logger';
/**
 * The BearerTokenAuthenticator will set a user-provided bearer token
 *   in requests.
 *
 * The bearer token will be sent as an Authorization header in the form:
 *
 *      Authorization: Bearer \<bearer-token\>
 */
export class BearerTokenAuthenticator extends Authenticator {
    /**
     * Create a new BearerTokenAuthenticator instance.
     *
     * @param options - Configuration options for bearer authentication.
     * This should be an object containing the "bearerToken" field.
     *
     * @throws Error: the options.bearerToken field is not valid, or unspecified
     */
    constructor(options) {
        super();
        this.requiredOptions = ['bearerToken'];
        validateInput(options, this.requiredOptions);
        this.bearerToken = options.bearerToken;
    }
    /**
     * Set a new bearer token to be sent in subsequent requests.
     *
     * @param bearerToken - The bearer token that will be sent in service
     *   requests.
     */
    setBearerToken(bearerToken) {
        this.bearerToken = bearerToken;
    }
    /**
     * Add a bearer token to `requestOptions`. The bearer token information
     * will be set in the Authorization property of "requestOptions.headers" in the form:
     *
     *      Authorization: Bearer \<bearer-token\>
     *
     * @param requestOptions - The request to augment with authentication information.
     */
    authenticate(requestOptions) {
        return new Promise((resolve) => {
            const authHeader = { Authorization: `Bearer ${this.bearerToken}` };
            requestOptions.headers = extend(true, {}, requestOptions.headers, authHeader);
            logger.debug(`Authenticated outbound request (type=${this.authenticationType()})`);
            resolve();
        });
    }
    /**
     * Returns the authenticator's type ('bearertoken').
     *
     * @returns a string that indicates the authenticator's type
     */
    // eslint-disable-next-line class-methods-use-this
    authenticationType() {
        return Authenticator.AUTHTYPE_BEARERTOKEN;
    }
}

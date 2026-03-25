/**
 * (C) Copyright IBM Corp. 2023, 2024.
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
import { buildUserAgent } from '../../lib/build-user-agent';
import { JwtTokenManager } from './jwt-token-manager';
import logger from '../../lib/logger';
/**
 * This is the path associated with the operation used to obtain
 * an access token from the MCSP token service.
 */
const OPERATION_PATH = '/siusermgr/api/1.0/apikeys/token';
/**
 * Token Manager for Multi-Cloud Saas Platform (MCSP) authenticator.
 *
 * The Token Manager will invoke the MCSP token service's 'POST /siusermgr/api/1.0/apikeys/token'
 * operation to obtain an MCSP access token for a user-supplied apikey.
 */
export class McspTokenManager extends JwtTokenManager {
    /**
     * Create a new McspTokenManager instance.
     *
     * @param options - Configuration options
     * This should be an object containing these fields:
     * - url: (required) the base endpoint URL for the MCSP token service
     * - apikey: (required) the API key used to obtain the MCSP access token.
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     *
     * @throws Error: the configuration options were invalid.
     */
    constructor(options) {
        super(options);
        this.requiredOptions = ['apikey', 'url'];
        this.tokenName = 'token';
        validateInput(options, this.requiredOptions);
        this.apikey = options.apikey;
        this.userAgent = buildUserAgent('mcsp-authenticator');
    }
    requestToken() {
        const requiredHeaders = {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'User-Agent': this.userAgent,
        };
        const parameters = {
            options: {
                url: this.url + OPERATION_PATH,
                body: {
                    apikey: this.apikey,
                },
                method: 'POST',
                headers: extend(true, {}, this.headers, requiredHeaders),
                rejectUnauthorized: !this.disableSslVerification,
            },
        };
        logger.debug(`Invoking MCSP token service operation: ${parameters.options.url}`);
        return this.requestWrapperInstance.sendRequest(parameters).then((response) => {
            logger.debug('Returned from MCSP token service operation');
            return response;
        });
    }
}

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
import { TokenRequestBasedAuthenticatorImmutable } from './token-request-based-authenticator-immutable';
/**
 * Class for common functionality shared by token-request authenticators.
 * TokenRequestBasedAuthenticators use token managers to retrieve, store,
 * and refresh tokens. Not intended to be used as stand-alone authenticator,
 * but as base class to authenticators that have their own token manager
 * implementations.
 *
 * The token will be added as an Authorization header in the form:
 *
 *      Authorization: Bearer \<bearer-token\>
 */
export class TokenRequestBasedAuthenticator extends TokenRequestBasedAuthenticatorImmutable {
    /**
     * Set the flag that indicates whether verification of the server's SSL
     * certificate should be disabled or not.
     *
     * @param value - a flag that indicates whether verification of the
     *   token server's SSL certificate should be disabled or not.
     */
    setDisableSslVerification(value) {
        // if they try to pass in a non-boolean value,
        // use the "truthy-ness" of the value
        this.disableSslVerification = Boolean(value);
        this.tokenManager.setDisableSslVerification(this.disableSslVerification);
    }
    /**
     * Set headers.
     *
     * @param headers - a set of HTTP headers to be sent with each outbound token server request.
     * Overwrites previous default headers.
     */
    setHeaders(headers) {
        if (typeof headers !== 'object') {
            // do nothing, for now
            return;
        }
        this.headers = headers;
        this.tokenManager.setHeaders(this.headers);
    }
}

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
import { IamRequestBasedAuthenticatorImmutable } from './iam-request-based-authenticator-immutable';
/**
 * The IamRequestBasedAuthenticator provides shared configuration and functionality
 * for authenticators that interact with the IAM token service. This authenticator
 * is not meant for use on its own.
 */
export class IamRequestBasedAuthenticator extends IamRequestBasedAuthenticatorImmutable {
    /**
     * Setter for the mutually inclusive "clientId" and the "clientSecret" fields.
     * @param clientId - the "clientId" value used to form a Basic Authorization header for IAM token requests
     * @param clientSecret - the "clientSecret" value used to form a Basic Authorization header for IAM token requests
     */
    setClientIdAndSecret(clientId, clientSecret) {
        this.clientId = clientId;
        this.clientSecret = clientSecret;
        // update properties in token manager
        this.tokenManager.setClientIdAndSecret(clientId, clientSecret);
    }
    /**
     * Setter for the "scope" parameter to use when fetching the bearer token from the IAM token server.
     * @param scope - (optional) a space-separated string that specifies one or more scopes to be
     * associated with IAM token requests
     */
    setScope(scope) {
        this.scope = scope;
        // update properties in token manager
        this.tokenManager.setScope(scope);
    }
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

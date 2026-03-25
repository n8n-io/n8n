/**
 * (C) Copyright IBM Corp. 2024.
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
import { IamAssumeTokenManager } from '../token-managers';
import { IamRequestBasedAuthenticatorImmutable, } from './iam-request-based-authenticator-immutable';
/**
 * The IamAssumeAuthenticator obtains an IAM access token using the IAM "get-token"
 * operation's "assume" grant type. The authenticator obtains an initial IAM access
 * token from a user-supplied apikey, then exchanges this initial IAM access token
 * for another IAM access token that has "assumed the identity" of the specified
 * trusted profile.
 *
 * The bearer token will be sent as an Authorization header in the form:
 *
 *      Authorization: Bearer \<bearer-token\>
 */
export class IamAssumeAuthenticator extends IamRequestBasedAuthenticatorImmutable {
    /**
     *
     * Create a new IamAssumeAuthenticator instance.
     *
     * @param options - Configuration options for IAM authentication.
     * This should be an object containing these fields:
     * - apikey: (required) the IAM api key for initial token request
     * - iamProfileId: (optional) the ID of the trusted profile to use
     * - iamProfileCrn: (optional) the CRN of the trusted profile to use
     * - iamProfileName: (optional) the name of the trusted profile to use (must be specified with iamAccountId)
     * - iamAccountId: (optional) the ID of the account the trusted profile is in (must be specified with iamProfileName)
     * - url: (optional) the endpoint URL for the token service
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
        // The param names are shared between the authenticator and the token
        // manager so we can just pass along the options object. This will
        // also perform input validation on the options.
        this.tokenManager = new IamAssumeTokenManager(options);
    }
    /**
     * Returns the authenticator's type ('iamAssume').
     *
     * @returns a string that indicates the authenticator's type
     */
    // eslint-disable-next-line class-methods-use-this
    authenticationType() {
        return Authenticator.AUTHTYPE_IAM_ASSUME;
    }
}

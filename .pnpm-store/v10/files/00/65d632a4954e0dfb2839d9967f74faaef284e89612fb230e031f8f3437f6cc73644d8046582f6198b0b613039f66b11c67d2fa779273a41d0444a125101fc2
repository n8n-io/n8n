/**
 * (C) Copyright IBM Corp. 2025.
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
import { TokenRequestBasedAuthenticator } from './token-request-based-authenticator';
import { McspV2TokenManager } from '../token-managers/mcspv2-token-manager';
/**
 * The McspV2Authenticator invokes the MCSP v2 token-exchange operation (POST /api/2.0/\{scopeCollectionType\}/\{scopeId\}/apikeys/token)
 * to obtain an access token for an apikey, and adds the access token to requests via an Authorization header
 * of the form:  "Authorization: Bearer <access-token>"
 */
export class McspV2Authenticator extends TokenRequestBasedAuthenticator {
    /**
     * Create a new McspV2Authenticator instance.
     *
     * @param options - Configuration options for MCSP v2 authentication.
     * This should be an object containing these fields:
     * - url: (required) the endpoint URL for the CloudPakForData token service.
     * - apikey: (optional) the API key used to obtain a bearer token (required if password is not specified).
     * - scopeCollectionType: (required) The scope collection type of item(s). Valid values are: "accounts", "subscriptions", "services".
     * - scopeId: (required) the scope identifier of item(s).
     * - includeBuiltinActions: (optional) a flag to include builtin actions in the "actions" claim in the MCSP access token (default: false).
     * - includeCustomActions: (optional) a flag to include custom actions in the "actions" claim in the MCSP access token (default: false).
     * - includeRoles: (optional) a flag to include the "roles" claim in the MCSP access token (default: true).
     * - prefixRoles: (optional) a flag to add a prefix with the scope level where the role is defined in the "roles" claim (default: false).
     * - callerExtClaim: (optional) a map (object) containing keys and values to be injected into the access token as the "callerExt" claim.
     *     The keys used in this map must be enabled in the apikey by setting the "callerExtClaimNames" property when the apikey is created.
     *     This property is typically only used in scenarios involving an apikey with identityType `SERVICEID`.
     * - disableSslVerification: (optional) a flag to disable verification of the token server's SSL certificate; defaults to false.
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service.
     *
     * @throws Error: the input configuration failed validation
     */
    constructor(options) {
        super(options);
        // All we really need to do is construct the token manager, passing in
        // our Options object since it contains the same fields as the
        // token manager's Options interface.
        // Note that the token manager handles input validation.
        this.tokenManager = new McspV2TokenManager(options);
    }
    /**
     * Returns the authenticator's type ('mcspv2').
     *
     * @returns a string that indicates the authenticator's type
     */
    // eslint-disable-next-line class-methods-use-this
    authenticationType() {
        return Authenticator.AUTHTYPE_MCSPV2;
    }
}

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
import { JwtTokenManager, JwtTokenManagerOptions } from './jwt-token-manager';
/**
 * Configuration options for MCSP v2 token retrieval.
 */
interface Options extends JwtTokenManagerOptions {
    /**
     * (required) The API key used to obtain an MCSP access token.
     */
    apikey: string;
    /**
     * (required) The URL representing the MCSP token service endpoint.
     */
    url: string;
    /**
     * (required) The scope collection type of item(s).
     * Valid values are: "accounts", "subscriptions", "services".
     */
    scopeCollectionType: string;
    /**
     * (required) The scope identifier of item(s).
     */
    scopeId: string;
    /**
     * (optional) A flag to include builtin actions in the "actions" claim in the MCSP access token (default: false).
     */
    includeBuiltinActions?: boolean;
    /**
     * (optional) A flag to include custom actions in the "actions" claim in the MCSP access token (default: false).
     */
    includeCustomActions?: boolean;
    /**
     * (optional) A flag to include the "roles" claim in the MCSP access token (default: true).
     */
    includeRoles?: boolean;
    /**
     * (optional) A flag to add a prefix with the scope level where the role is defined in the "roles" claim (default: false).
     */
    prefixRoles?: boolean;
    /**
     * (optional) A map (object) containing keys and values to be injected into the access token as the "callerExt" claim.
     * The keys used in this map must be enabled in the apikey by setting the "callerExtClaimNames" property when the apikey is created.
     * This property is typically only used in scenarios involving an apikey with identityType `SERVICEID`.
     */
    callerExtClaim?: object;
}
/**
 * Token Manager for Multi-Cloud Saas Platform (MCSP) V2 authentication.
 *
 * The McspV2TokenManager will invoke the MCSP token service's 'POST /api/2.0/\{scopeCollectionType\}/\{scopeId\}/apikeys/token'
 * operation to obtain an MCSP access token for an apikey.
 */
export declare class McspV2TokenManager extends JwtTokenManager {
    protected requiredOptions: string[];
    private apikey;
    private scopeCollectionType;
    private scopeId;
    private includeBuiltinActions;
    private includeCustomActions;
    private includeRoles;
    private prefixRoles;
    private callerExtClaim;
    /**
     * Create a new McspV2TokenManager instance.
     *
     * @param options - Configuration options.
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
    constructor(options: Options);
    private PATH_TEMPLATE;
    protected requestToken(): Promise<any>;
    /**
     * Parses the Options configuration property named by 'fieldName' as a boolean value.
     * The value in the Options object could be either boolean or string and this function
     * will do its best to parse it correctly.
     * @param options - the Options object containing the configuration
     * @param fieldName - the name of the field to parse as a boolean
     * @param defaultValue - the default value to use in case the specified field is not present in Options
     * @returns boolean the boolean value to be used for the configuration property
     */
    private static parseBoolean;
}
export {};

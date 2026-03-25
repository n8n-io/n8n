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
import { IamAssumeTokenManager } from '../token-managers';
import { IamRequestOptions, IamRequestBasedAuthenticatorImmutable } from './iam-request-based-authenticator-immutable';
/** Configuration options for IAM Assume authentication. */
export interface Options extends IamRequestOptions {
    /** The IAM api key */
    apikey: string;
    /**
     * Specify exactly one of [iamProfileId, iamProfileCrn, or iamProfileName] to
     * identify the trusted profile whose identity should be used. If iamProfileId
     * or iamProfileCrn is used, the trusted profile must exist in the same account.
     * If and only if iamProfileName is used, then iamAccountId must also be
     * specified to indicate the account that contains the trusted profile.
     */
    iamProfileId?: string;
    iamProfileCrn?: string;
    iamProfileName?: string;
    /**
     * If and only if iamProfileName is used to specify the trusted profile, then
     * iamAccountId must also be specified to indicate the account that contains
     * the trusted profile.
     */
    iamAccountId?: string;
}
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
export declare class IamAssumeAuthenticator extends IamRequestBasedAuthenticatorImmutable {
    protected tokenManager: IamAssumeTokenManager;
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
    constructor(options: Options);
    /**
     * Returns the authenticator's type ('iamAssume').
     *
     * @returns a string that indicates the authenticator's type
     */
    authenticationType(): string;
}

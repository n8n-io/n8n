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
/// <reference types="node" />
import { OutgoingHttpHeaders } from 'http';
import { IamRequestBasedTokenManager, IamRequestOptions } from './iam-request-based-token-manager';
/** Configuration options for IAM Assume token retrieval. */
interface Options extends IamRequestOptions {
    apikey: string;
    iamProfileId?: string;
    iamProfileCrn?: string;
    iamProfileName?: string;
    iamAccountId?: string;
}
/**
 * The IamAssumeTokenManager takes an api key, along with trusted profile information, and performs
 * the necessary interactions with the IAM token service to obtain and store a suitable bearer token
 * that "assumes" the identify of the trusted profile.
 */
export declare class IamAssumeTokenManager extends IamRequestBasedTokenManager {
    protected requiredOptions: string[];
    private iamProfileId;
    private iamProfileCrn;
    private iamProfileName;
    private iamAccountId;
    private iamDelegate;
    /**
     *
     * Create a new IamAssumeTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - apikey: (required) the IAM api key
     * - iamProfileId: (optional) the ID of the trusted profile to use
     * - iamProfileCrn: (optional) the CRN of the trusted profile to use
     * - iamProfileName: (optional) the name of the trusted profile to use (must be specified with iamAccountId)
     * - iamAccountId: (optional) the ID of the account the trusted profile is in (must be specified with iamProfileName)
     * - url: (optional) the endpoint URL for the IAM token service (default value: "https://iam.cloud.ibm.com")
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
     * Request an IAM token using a standard access token and a trusted profile.
     */
    protected requestToken(): Promise<any>;
    /**
     * Extend this method from the parent class to erase the refresh token from
     * the class - we do not want to expose it for IAM Assume authentication.
     *
     * @param tokenResponse - the response object from JWT service request
     */
    protected saveTokenInfo(tokenResponse: any): void;
    /**
     * Sets the IAM "scope" value.
     * This value is sent as the "scope" form parameter in the IAM delegate request.
     *
     * @param scope - a space-separated string that contains one or more scope names
     */
    setScope(scope: string): void;
    /**
     * Sets the IAM "clientId" and "clientSecret" values for the IAM delegate.
     *
     * @param clientId - the client id.
     * @param clientSecret - the client secret.
     */
    setClientIdAndSecret(clientId: string, clientSecret: string): void;
    /**
     * Sets the "disableSslVerification" property for the IAM delegate.
     *
     * @param value - the new value for the disableSslVerification property
     */
    setDisableSslVerification(value: boolean): void;
    /**
     * Sets the headers to be included in the IAM delegate's requests.
     *
     * @param headers - the set of headers to send with each request to the token server
     */
    setHeaders(headers: OutgoingHttpHeaders): void;
}
export {};

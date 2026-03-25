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
import { JwtTokenManager, JwtTokenManagerOptions } from './jwt-token-manager';
/** Configuration options for IAM token retrieval. */
export interface IamRequestOptions extends JwtTokenManagerOptions {
    clientId?: string;
    clientSecret?: string;
    scope?: string;
}
/**
 * The IamRequestBasedTokenManager class contains code relevant to any token manager that
 * interacts with the IAM service to manage a token. It stores information relevant to all
 * IAM requests, such as the client ID and secret, and performs the token request with a set
 * of request options common to any IAM token management scheme. It is intended that this
 * class be extended with specific implementations.
 */
export declare class IamRequestBasedTokenManager extends JwtTokenManager {
    protected clientId: string;
    protected clientSecret: string;
    protected scope: string;
    protected refreshToken: string;
    protected formData: any;
    /**
     *
     * Create a new IamRequestBasedTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service (default value: "https://iam.cloud.ibm.com")
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
    constructor(options: IamRequestOptions);
    /**
     * Sets the IAM "scope" value.
     * This value is sent as the "scope" form parameter within the request sent to the IAM token service.
     *
     * @param scope - a space-separated string that contains one or more scope names
     */
    setScope(scope: string): void;
    /**
     * Sets the IAM "clientId" and "clientSecret" values.
     * These values are used to compute the Authorization header used
     * when retrieving the IAM access token.
     * If these values are not set, no Authorization header will be
     * set on the request (it is not required).
     *
     * @param clientId - the client id.
     * @param clientSecret - the client secret.
     */
    setClientIdAndSecret(clientId: string, clientSecret: string): void;
    /**
     * Extend this method from the parent class to extract the refresh token from
     * the request and save it.
     *
     * @param tokenResponse - the response object from JWT service request
     */
    protected saveTokenInfo(tokenResponse: any): void;
    /**
     * Request an IAM access token using an API key.
     *
     * @returns Promise
     */
    protected requestToken(): Promise<any>;
    /**
     * Returns true iff the currently-cached IAM access token is expired.
     * We'll consider an access token as expired when we reach its IAM server-reported
     * expiration time minus our expiration window (10 secs).
     * We do this to avoid using an access token that might expire in the middle of a long-running
     * transaction within an IBM Cloud service.
     *
     * @returns true if the token has expired, false otherwise
     */
    protected isTokenExpired(): boolean;
}

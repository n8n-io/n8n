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
import { IamRequestBasedTokenManager, IamRequestOptions } from './iam-request-based-token-manager';
/** Configuration options for IAM token retrieval. */
interface Options extends IamRequestOptions {
    apikey: string;
}
/**
 * The IamTokenManager takes an api key and performs the necessary interactions with
 * the IAM token service to obtain and store a suitable bearer token. Additionally, the IamTokenManager
 * will retrieve bearer tokens via basic auth using a supplied "clientId" and "clientSecret" pair.
 */
export declare class IamTokenManager extends IamRequestBasedTokenManager {
    protected requiredOptions: string[];
    private apikey;
    /**
     *
     * Create a new IamTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the IAM token service (default value: "https://iam.cloud.ibm.com")
     * - apikey: (required) the IAM api key
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
     * Returns the most recently stored refresh token.
     *
     * @returns the refresh token
     */
    getRefreshToken(): string;
}
export {};

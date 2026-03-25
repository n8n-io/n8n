/**
 * (C) Copyright IBM Corp. 2021, 2025.
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
    crTokenFilename?: string;
    iamProfileName?: string;
    iamProfileId?: string;
}
/**
 * The ContainerTokenManager retrieves a compute resource token from a file on the container. This token
 * is used to perform the necessary interactions with the IAM token service to obtain and store a suitable
 * bearer (access) token.
 */
export declare class ContainerTokenManager extends IamRequestBasedTokenManager {
    private crTokenFilename;
    private iamProfileName;
    private iamProfileId;
    /**
     *
     * Create a new ContainerTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service (default: "https://iam.cloud.ibm.com")
     * - crTokenFilename: (optional) the file containing the compute resource token (default: "/var/run/secrets/tokens/vault-token")
     * - iamProfileName: (optional) the name of the IAM trusted profile associated with the compute resource token (required if iamProfileId is not specified)
     * - iamProfileId]: (optional) the ID of the IAM trusted profile associated with the compute resource token (required if iamProfileName is not specified)
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - clientId: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     * - clientSecret: (optional) the "clientId" and "clientSecret" fields are used to form a Basic
     * Authorization header to be included in each request to the token service
     *
     * @throws Error: the configuration options were invalid
     */
    constructor(options: Options);
    /**
     * Sets the "crTokenFilename" field
     * @param crTokenFilename - the name of the file containing the CR token
     */
    setCrTokenFilename(crTokenFilename: string): void;
    /**
     * Sets the name of the IAM trusted profile to use when obtaining an access token from the IAM token server.
     * @param iamProfileName - the name of the IAM trusted profile
     */
    setIamProfileName(iamProfileName: string): void;
    /**
     * Sets the ID of the IAM trusted profile to use when obtaining an access token from the IAM token server.
     * @param iamProfileId - the ID of the IAM trusted profile
     */
    setIamProfileId(iamProfileId: string): void;
    /**
     * Returns the most recently stored refresh token.
     *
     * @returns the refresh token
     */
    getRefreshToken(): string;
    /**
     * Request an IAM token using a compute resource token.
     */
    protected requestToken(): Promise<any>;
    /**
     * Retrieves the CR token from a file using this search order:
     * 1. User-specified filename (if specified)
     * 2. Default file #1 (/var/run/secrets/tokens/vault-token)
     * 3. Default file #2 (/var/run/secrets/tokens/sa-token)
     * 4. Default file #3 (/var/run/secrets/codeengine.cloud.ibm.com/compute-resource-token/token)
     * First one found wins.
     *
     * @returns the CR token value as a string
     */
    protected getCrToken(): string;
}
export {};

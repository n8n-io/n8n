/**
 * Copyright 2021, 202e IBM Corp. All Rights Reserved.
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
import { ContainerTokenManager } from '../token-managers/container-token-manager';
import { IamRequestOptions, IamRequestBasedAuthenticator } from './iam-request-based-authenticator';
/** Configuration options for IAM authentication. */
export interface Options extends IamRequestOptions {
    /** The file containing the compute resource token. */
    crTokenFilename?: string;
    /** The IAM profile name associated with the compute resource token. */
    iamProfileName?: string;
    /** The IAM profile ID associated with the compute resource token. */
    iamProfileId?: string;
}
/**
 * The ContainerAuthenticator will read a compute resource token from the file system
 * and use this value to obtain a bearer token from the IAM token server.  When the bearer
 * token expires, a new token is obtained from the token server.
 *
 * The bearer token will be sent as an Authorization header in the form:
 *
 *      Authorization: Bearer \<bearer-token\>
 */
export declare class ContainerAuthenticator extends IamRequestBasedAuthenticator {
    protected tokenManager: ContainerTokenManager;
    private crTokenFilename;
    private iamProfileName;
    private iamProfileId;
    /**
     *
     * Create a new ContainerAuthenticator instance.
     *
     * @param options - Configuration options for IAM authentication.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service
     * - crTokenFilename: (optional) the file containing the compute resource token
     * - iamProfileName: (optional) the name of the IAM trusted profile associated with the compute resource token (required if iamProfileId is not specified)
     * - iamProfileId]: (optional) the ID of the IAM trusted profile associated with the compute resource token (required if iamProfileName is not specified)
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
     * Setter for the filename of the compute resource token.
     * @param crTokenFilename - A string containing a path to the CR token file
     */
    setCrTokenFilename(crTokenFilename: string): void;
    /**
     * Setter for the "profile_name" parameter to use when fetching the bearer token from the IAM token server.
     * @param iamProfileName - the name of the IAM trusted profile
     */
    setIamProfileName(iamProfileName: string): void;
    /**
     * Setter for the "profile_id" parameter to use when fetching the bearer token from the IAM token server.
     * @param iamProfileId - the ID of the IAM trusted profile
     */
    setIamProfileId(iamProfileId: string): void;
    /**
     * Returns the authenticator's type ('container').
     *
     * @returns a string that indicates the authenticator's type
     */
    authenticationType(): string;
    /**
     * Return the most recently stored refresh token.
     *
     * @returns the refresh token string
     */
    getRefreshToken(): string;
}

/**
 * (C) Copyright IBM Corp. 2021, 2024.
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
/** Configuration options for VPC token retrieval. */
interface Options extends JwtTokenManagerOptions {
    /** The CRN of the linked trusted IAM profile to be used as the identity of the compute resource */
    iamProfileCrn?: string;
    /** The ID of the linked trusted IAM profile to be used when obtaining the IAM access token */
    iamProfileId?: string;
}
/**
 * Token Manager for VPC Instance Authentication.
 */
export declare class VpcInstanceTokenManager extends JwtTokenManager {
    private iamProfileCrn;
    private iamProfileId;
    /**
     * Create a new VpcInstanceTokenManager instance.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the VPC Instance Metadata Service (default value: "http://169.254.169.254")
     * - iamProfileCrn: (optional) the CRN of the linked IAM trusted profile to be used to obtain the IAM access token
     * - iamProfileId: (optional) the ID of the linked IAM trusted profile to be used to obtain the IAM access token
     *
     * @remarks
     * At most one of "iamProfileCrn" or "iamProfileId" may be specified. If neither one is specified,
     * then the default IAM profile defined for the compute resource will be used.
     */
    constructor(options: Options);
    /**
     * Sets the CRN of the IAM trusted profile to use when fetching the access token from the IAM token server.
     * @param iamProfileCrn - the CRN of the IAM trusted profile
     */
    setIamProfileCrn(iamProfileCrn: string): void;
    /**
     * Sets the Id of the IAM trusted profile to use when fetching the access token from the IAM token server.
     * @param iamProfileId - the ID of the IAM trusted profile
     */
    setIamProfileId(iamProfileId: string): void;
    protected requestToken(): Promise<any>;
    private getInstanceIdentityToken;
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
export {};

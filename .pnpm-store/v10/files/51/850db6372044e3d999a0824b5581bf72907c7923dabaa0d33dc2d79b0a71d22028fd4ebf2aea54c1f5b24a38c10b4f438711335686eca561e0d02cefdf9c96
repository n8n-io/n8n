/**
 * (C) Copyright IBM Corp. 2021, 2023.
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
import { VpcInstanceTokenManager } from '../token-managers/vpc-instance-token-manager';
import { BaseOptions, TokenRequestBasedAuthenticator } from './token-request-based-authenticator';
/** Configuration options for VpcInstance authentication. */
export interface Options extends BaseOptions {
    /** The CRN of the linked trusted IAM profile to be used as the identity of the compute resource */
    iamProfileCrn?: string;
    /** The ID of the linked trusted IAM profile to be used when obtaining the IAM access token */
    iamProfileId?: string;
}
/**
 * The VpcInstanceAuthenticator implements an authentication scheme in which it retrieves an "instance identity token"
 * and exchanges that for an IAM access token using the VPC Instance Metadata Service API which is available on the local
 * compute resource (VM). The instance identity token is similar to an IAM apikey, except that it is managed automatically
 * by the compute resource provider (VPC).
 *
 * The resulting IAM access token is then added to outbound requests in an Authorization header
 *
 *      Authorization: Bearer \<access-token\>
 */
export declare class VpcInstanceAuthenticator extends TokenRequestBasedAuthenticator {
    protected tokenManager: VpcInstanceTokenManager;
    private iamProfileCrn;
    private iamProfileId;
    /**
     * Create a new VpcInstanceAuthenticator instance.
     *
     * @param options - Configuration options for VpcInstance authentication.
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
     * Sets the "iamProfileCrn" value to be used when obtaining an IAM access token
     * @param iamProfileCrn - the CRN of the linked IAM trusted profile to use when obtaining an IAM access token
     */
    setIamProfileCrn(iamProfileCrn: string): void;
    /**
     * Sets the "iamProfileId" value to be used when obtaining an IAM access token
     * @param iamProfileId - the ID of the linked IAM trusted profile to use when obtaining an IAM access token
     */
    setIamProfileId(iamProfileId: string): void;
    /**
     * Returns the authenticator's type ('vpc').
     *
     * @returns a string that indicates the authenticator's type
     */
    authenticationType(): string;
}

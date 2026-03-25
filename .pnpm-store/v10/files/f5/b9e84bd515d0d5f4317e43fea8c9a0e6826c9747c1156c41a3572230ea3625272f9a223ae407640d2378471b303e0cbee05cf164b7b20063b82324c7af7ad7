/**
 * (C) Copyright IBM Corp. 2019, 2023.
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
import { AuthenticateOptions, AuthenticatorInterface } from './authenticator-interface';
/**
 * Base Authenticator class for other Authenticators to extend. Not intended
 * to be used as a stand-alone authenticator.
 */
export declare class Authenticator implements AuthenticatorInterface {
    /**
     * Constants that define the various authenticator types.
     */
    static AUTHTYPE_BASIC: string;
    static AUTHTYPE_BEARERTOKEN: string;
    static AUTHTYPE_IAM: string;
    static AUTHTYPE_IAM_ASSUME: string;
    static AUTHTYPE_CONTAINER: string;
    static AUTHTYPE_CP4D: string;
    static AUTHTYPE_NOAUTH: string;
    static AUTHTYPE_VPC: string;
    static AUTHTYPE_MCSP: string;
    static AUTHTYPE_UNKNOWN: string;
    /**
     * Create a new Authenticator instance.
     *
     * @throws Error: the "new" keyword was not used to construct the authenticator.
     */
    constructor();
    /**
     * Augment the request with authentication information.
     *
     * @param requestOptions - The request to augment with authentication information.
     * @throws Error: The authenticate method was not implemented by a subclass.
     */
    authenticate(requestOptions: AuthenticateOptions): Promise<void>;
    /**
     * Retrieves the authenticator's type.
     * The returned value will be the same string that is used
     * when configuring an instance of the authenticator with the
     * \<service_name\>_AUTH_TYPE configuration property
     * (e.g. "basic", "iam", etc.).
     * This function should be overridden in each authenticator
     * implementation class that extends this class.
     *
     * @returns a string that indicates the authenticator's type
     */
    authenticationType(): string;
}

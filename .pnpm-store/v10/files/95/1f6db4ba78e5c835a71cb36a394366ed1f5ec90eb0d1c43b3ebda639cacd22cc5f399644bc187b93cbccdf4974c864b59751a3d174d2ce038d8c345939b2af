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
import { JwtTokenManager } from '../token-managers/jwt-token-manager';
import { Authenticator } from './authenticator';
import { AuthenticateOptions } from './authenticator-interface';
/** Configuration options for token-based authentication. */
export type BaseOptions = {
    /** Headers to be sent with every outbound HTTP requests to token services. */
    headers?: OutgoingHttpHeaders;
    /**
     * A flag that indicates whether verification of the token server's SSL
     * certificate should be disabled or not.
     */
    disableSslVerification?: boolean;
    /** Endpoint for HTTP token requests. */
    url?: string;
    /** Allow additional request config parameters */
    [propName: string]: any;
};
/**
 * Class for common functionality shared by token-request authenticators.
 * Token-request authenticators use token managers to retrieve, store,
 * and refresh tokens. Not intended to be used as stand-alone authenticator,
 * but as base class to authenticators that have their own token manager
 * implementations.
 *
 * The token will be added as an Authorization header in the form:
 *
 *      Authorization: Bearer \<bearer-token\>
 */
export declare class TokenRequestBasedAuthenticatorImmutable extends Authenticator {
    protected tokenManager: JwtTokenManager;
    protected url: string;
    protected headers: OutgoingHttpHeaders;
    protected disableSslVerification: boolean;
    /**
     * Create a new TokenRequestBasedAuthenticatorImmutable instance with an internal JwtTokenManager.
     *
     * @param options - Configuration options.
     * This should be an object containing these fields:
     * - url: (optional) the endpoint URL for the token service
     * - disableSslVerification: (optional) a flag that indicates whether verification of the token server's SSL certificate
     * should be disabled or not
     * - headers: (optional) a set of HTTP headers to be sent with each request to the token service
     */
    constructor(options: BaseOptions);
    /**
     * Adds bearer token information to "requestOptions". The bearer token information
     * will be set in the Authorization property of "requestOptions.headers" in the form:
     *
     *     Authorization: Bearer \<bearer-token\>
     *
     * @param requestOptions - The request to augment with authentication information.
     */
    authenticate(requestOptions: AuthenticateOptions): Promise<void>;
}

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
/// <reference types="node" />
import { OutgoingHttpHeaders } from 'http';
import { IamRequestBasedAuthenticatorImmutable } from './iam-request-based-authenticator-immutable';
/** Shared configuration options for IAM Request based authentication. */
export { IamRequestOptions } from './iam-request-based-authenticator-immutable';
/**
 * The IamRequestBasedAuthenticator provides shared configuration and functionality
 * for authenticators that interact with the IAM token service. This authenticator
 * is not meant for use on its own.
 */
export declare class IamRequestBasedAuthenticator extends IamRequestBasedAuthenticatorImmutable {
    /**
     * Setter for the mutually inclusive "clientId" and the "clientSecret" fields.
     * @param clientId - the "clientId" value used to form a Basic Authorization header for IAM token requests
     * @param clientSecret - the "clientSecret" value used to form a Basic Authorization header for IAM token requests
     */
    setClientIdAndSecret(clientId: string, clientSecret: string): void;
    /**
     * Setter for the "scope" parameter to use when fetching the bearer token from the IAM token server.
     * @param scope - (optional) a space-separated string that specifies one or more scopes to be
     * associated with IAM token requests
     */
    setScope(scope: string): void;
    /**
     * Set the flag that indicates whether verification of the server's SSL
     * certificate should be disabled or not.
     *
     * @param value - a flag that indicates whether verification of the
     *   token server's SSL certificate should be disabled or not.
     */
    setDisableSslVerification(value: boolean): void;
    /**
     * Set headers.
     *
     * @param headers - a set of HTTP headers to be sent with each outbound token server request.
     * Overwrites previous default headers.
     */
    setHeaders(headers: OutgoingHttpHeaders): void;
}

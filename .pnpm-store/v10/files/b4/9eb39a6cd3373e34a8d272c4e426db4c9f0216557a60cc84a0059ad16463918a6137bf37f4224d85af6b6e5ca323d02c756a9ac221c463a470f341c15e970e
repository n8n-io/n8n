/**
 * (C) Copyright IBM Corp. 2024-2026.
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under the License
 * is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express
 * or implied. See the License for the specific language governing permissions and limitations under
 * the License.
 */
/// <reference types="node" />
import { Authenticator } from 'ibm-cloud-sdk-core';
import type { Agent } from 'https';
import type { RequestTokenResponse } from "./authenticators.js";
/**
 * Look for external configuration of authenticator.
 *
 * Try to get authenticator from external sources, with the following priority:
 *
 * 1. Credentials file (ibm-credentials.env)
 * 2. Environment variables
 * 3. VCAP Services (Cloud Foundry)
 *
 * @param {Object} params - The parameters object.
 * @param {string} params.serviceName - The service name prefix.
 * @param {string} [params.serviceUrl] - The service URL (optional, used for AWS authentication).
 * @param {() => Promise<RequestTokenResponse>} [params.requestToken] - Function for requesting
 *   JWToken (optional, required for zen authentication).
 * @param {Agent} [params.httpsAgent] - HTTPS agent for custom SSL configuration (optional).
 * @returns {Authenticator} The configured authenticator instance.
 */
export declare function getAuthenticatorFromEnvironment({ serviceName, serviceUrl, requestToken, httpsAgent, }: {
    serviceName: string;
    serviceUrl?: string;
    requestToken?: () => Promise<RequestTokenResponse>;
    httpsAgent?: Agent | undefined;
}): Authenticator;
//# sourceMappingURL=get-authenticator-from-environment.d.ts.map
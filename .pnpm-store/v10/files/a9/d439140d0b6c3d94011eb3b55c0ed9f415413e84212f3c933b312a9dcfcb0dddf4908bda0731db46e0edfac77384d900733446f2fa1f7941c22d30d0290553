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
import { Authenticator, BasicAuthenticator, BearerTokenAuthenticator, CloudPakForDataAuthenticator, IamAuthenticator, NoAuthAuthenticator, readExternalSources, } from 'ibm-cloud-sdk-core';
import { AWSAuthenticator, JWTRequestBaseAuthenticator } from "./authenticators.mjs";
import { AUTH_AWS_URLS } from "./urls.mjs";
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
export function getAuthenticatorFromEnvironment({ serviceName, serviceUrl, requestToken, httpsAgent, }) {
    if (!serviceName) {
        throw new Error('Service name is required.');
    }
    // construct the credentials object from the environment
    const credentials = readExternalSources(serviceName);
    if (Object.keys(credentials).length === 0) {
        throw new Error('Unable to create an authenticator from the environment.');
    }
    // remove client-level properties
    delete credentials.disableSsl;
    // convert "auth" properties to their proper keys
    if (credentials.authUrl) {
        credentials.url = credentials.authUrl;
        delete credentials.authUrl;
    }
    if (credentials.authDisableSsl) {
        credentials.disableSslVerification = credentials.authDisableSsl;
        delete credentials.authDisableSsl;
    }
    // in the situation where the auth type is not provided:
    // if an apikey is provided, default to IAM
    // if not, default to container auth
    let { authType } = credentials;
    if (!authType) {
        // Support the alternate "AUTHTYPE" config property.
        authType = credentials.authtype;
    }
    if (!authType || typeof authType !== 'string') {
        authType = credentials.apikey ? Authenticator.AUTHTYPE_IAM : null;
    }
    // Create and return the appropriate authenticator.
    let authenticator;
    // Compare the authType against our constants case-insensitively to
    // determine which authenticator type needs to be constructed.
    if (!authType)
        throw new Error('authType and apiKey cannot be undefined! Please specify an authType or an apikey');
    authType = authType.toLowerCase();
    if (requestToken && authType !== JWTRequestBaseAuthenticator.AUTHTYPE_ZEN) {
        throw new Error('requestToken function is only valid for zen authentication');
    }
    switch (authType) {
        case Authenticator.AUTHTYPE_NOAUTH.toLowerCase():
            authenticator = new NoAuthAuthenticator();
            break;
        case Authenticator.AUTHTYPE_BASIC:
            authenticator = new BasicAuthenticator(credentials);
            break;
        case Authenticator.AUTHTYPE_BEARERTOKEN.toLowerCase():
            authenticator = new BearerTokenAuthenticator(credentials);
            break;
        case Authenticator.AUTHTYPE_CP4D:
            credentials.url = credentials.url.concat('/icp4d-api/v1/authorize');
            authenticator = new CloudPakForDataAuthenticator(credentials);
            break;
        case Authenticator.AUTHTYPE_IAM:
            authenticator = new IamAuthenticator(credentials);
            break;
        case JWTRequestBaseAuthenticator.AUTHTYPE_ZEN:
            if (requestToken) {
                authenticator = new JWTRequestBaseAuthenticator(credentials, requestToken);
            }
            else
                throw new Error('requestToken function not provided. This function is necessary for zen authentication.');
            break;
        case AWSAuthenticator.AUTHTYPE_AWS:
            if (!credentials.url && serviceUrl) {
                const tokenURL = AUTH_AWS_URLS[serviceUrl];
                if (!tokenURL) {
                    throw new Error(`No token URL is found for serviceUrl: ${serviceUrl}. Check your serviceUrl and try again.`);
                }
                credentials.url = tokenURL;
            }
            credentials.httpsAgent = httpsAgent;
            authenticator = new AWSAuthenticator(credentials);
            break;
        default:
            throw new Error(`Invalid value for AUTH_TYPE: ${authType}`);
    }
    return authenticator;
}
//# sourceMappingURL=get-authenticator-from-environment.mjs.map
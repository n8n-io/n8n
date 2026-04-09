"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthenticatorFromEnvironment = void 0;
const ibm_cloud_sdk_core_1 = require("ibm-cloud-sdk-core");
const authenticators_1 = require("./authenticators.js");
const urls_1 = require("./urls.js");
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
function getAuthenticatorFromEnvironment({ serviceName, serviceUrl, requestToken, httpsAgent, }) {
    if (!serviceName) {
        throw new Error('Service name is required.');
    }
    // construct the credentials object from the environment
    const credentials = (0, ibm_cloud_sdk_core_1.readExternalSources)(serviceName);
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
        authType = credentials.apikey ? ibm_cloud_sdk_core_1.Authenticator.AUTHTYPE_IAM : null;
    }
    // Create and return the appropriate authenticator.
    let authenticator;
    // Compare the authType against our constants case-insensitively to
    // determine which authenticator type needs to be constructed.
    if (!authType)
        throw new Error('authType and apiKey cannot be undefined! Please specify an authType or an apikey');
    authType = authType.toLowerCase();
    if (requestToken && authType !== authenticators_1.JWTRequestBaseAuthenticator.AUTHTYPE_ZEN) {
        throw new Error('requestToken function is only valid for zen authentication');
    }
    switch (authType) {
        case ibm_cloud_sdk_core_1.Authenticator.AUTHTYPE_NOAUTH.toLowerCase():
            authenticator = new ibm_cloud_sdk_core_1.NoAuthAuthenticator();
            break;
        case ibm_cloud_sdk_core_1.Authenticator.AUTHTYPE_BASIC:
            authenticator = new ibm_cloud_sdk_core_1.BasicAuthenticator(credentials);
            break;
        case ibm_cloud_sdk_core_1.Authenticator.AUTHTYPE_BEARERTOKEN.toLowerCase():
            authenticator = new ibm_cloud_sdk_core_1.BearerTokenAuthenticator(credentials);
            break;
        case ibm_cloud_sdk_core_1.Authenticator.AUTHTYPE_CP4D:
            credentials.url = credentials.url.concat('/icp4d-api/v1/authorize');
            authenticator = new ibm_cloud_sdk_core_1.CloudPakForDataAuthenticator(credentials);
            break;
        case ibm_cloud_sdk_core_1.Authenticator.AUTHTYPE_IAM:
            authenticator = new ibm_cloud_sdk_core_1.IamAuthenticator(credentials);
            break;
        case authenticators_1.JWTRequestBaseAuthenticator.AUTHTYPE_ZEN:
            if (requestToken) {
                authenticator = new authenticators_1.JWTRequestBaseAuthenticator(credentials, requestToken);
            }
            else
                throw new Error('requestToken function not provided. This function is necessary for zen authentication.');
            break;
        case authenticators_1.AWSAuthenticator.AUTHTYPE_AWS:
            if (!credentials.url && serviceUrl) {
                const tokenURL = urls_1.AUTH_AWS_URLS[serviceUrl];
                if (!tokenURL) {
                    throw new Error(`No token URL is found for serviceUrl: ${serviceUrl}. Check your serviceUrl and try again.`);
                }
                credentials.url = tokenURL;
            }
            credentials.httpsAgent = httpsAgent;
            authenticator = new authenticators_1.AWSAuthenticator(credentials);
            break;
        default:
            throw new Error(`Invalid value for AUTH_TYPE: ${authType}`);
    }
    return authenticator;
}
exports.getAuthenticatorFromEnvironment = getAuthenticatorFromEnvironment;
//# sourceMappingURL=get-authenticator-from-environment.js.map
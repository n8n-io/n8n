"use strict";
/**
 * (C) Copyright IBM Corp. 2019, 2022.
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuthenticatorFromEnvironment = void 0;
/* eslint-disable import/prefer-default-export */
const ibm_cloud_sdk_core_1 = require("ibm-cloud-sdk-core");
/**
 * Look for external configuration of authenticator.
 *
 * Try to get authenticator from external sources, with the following priority:
 * 1. Credentials file (ibm-credentials.env)
 * 2. Environment variables
 * 3. VCAP Services (Cloud Foundry)
 *
 * @param serviceName - the service name prefix.
 *
 */
function getAuthenticatorFromEnvironment(serviceName) {
    if (!serviceName) {
        throw new Error('Service name is required.');
    }
    // construct the credentials object from the environment
    const credentials = (0, ibm_cloud_sdk_core_1.readExternalSources)(serviceName);
    if (credentials === null) {
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
        authType = credentials.apikey ? ibm_cloud_sdk_core_1.Authenticator.AUTHTYPE_IAM : ibm_cloud_sdk_core_1.Authenticator.AUTHTYPE_CONTAINER;
    }
    // Create and return the appropriate authenticator.
    let authenticator;
    // Compare the authType against our constants case-insensitively to
    // determine which authenticator type needs to be constructed.
    authType = authType.toLowerCase();
    if (authType === ibm_cloud_sdk_core_1.Authenticator.AUTHTYPE_NOAUTH.toLowerCase()) {
        authenticator = new ibm_cloud_sdk_core_1.NoAuthAuthenticator();
    }
    else if (authType === ibm_cloud_sdk_core_1.Authenticator.AUTHTYPE_BASIC.toLowerCase()) {
        authenticator = new ibm_cloud_sdk_core_1.BasicAuthenticator(credentials);
    }
    else if (authType === ibm_cloud_sdk_core_1.Authenticator.AUTHTYPE_BEARERTOKEN.toLowerCase()) {
        authenticator = new ibm_cloud_sdk_core_1.BearerTokenAuthenticator(credentials);
    }
    else if (authType === ibm_cloud_sdk_core_1.Authenticator.AUTHTYPE_CP4D.toLowerCase()) {
        credentials.url = credentials.url.concat('/icp4d-api/v1/authorize');
        authenticator = new ibm_cloud_sdk_core_1.CloudPakForDataAuthenticator(credentials);
    }
    else if (authType === ibm_cloud_sdk_core_1.Authenticator.AUTHTYPE_IAM.toLowerCase()) {
        authenticator = new ibm_cloud_sdk_core_1.IamAuthenticator(credentials);
    }
    else {
        throw new Error(`Invalid value for AUTH_TYPE: ${authType}`);
    }
    return authenticator;
}
exports.getAuthenticatorFromEnvironment = getAuthenticatorFromEnvironment;
//# sourceMappingURL=get-authenticator-from-environment.js.map
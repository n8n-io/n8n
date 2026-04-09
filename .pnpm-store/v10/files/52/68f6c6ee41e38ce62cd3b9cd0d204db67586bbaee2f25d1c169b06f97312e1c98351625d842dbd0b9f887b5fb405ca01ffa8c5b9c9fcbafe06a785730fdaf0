/**
 * (C) Copyright IBM Corp. 2019, 2025.
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
import { Authenticator, BasicAuthenticator, BearerTokenAuthenticator, CloudPakForDataAuthenticator, IamAuthenticator, IamAssumeAuthenticator, ContainerAuthenticator, NoAuthAuthenticator, VpcInstanceAuthenticator, McspAuthenticator, McspV2Authenticator, } from '../authenticators';
import { readExternalSources } from './read-external-sources';
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
export function getAuthenticatorFromEnvironment(serviceName) {
    if (!serviceName) {
        throw new Error('Service name is required.');
    }
    // construct the credentials object from the environment
    const credentials = readExternalSources(serviceName);
    if (credentials === null) {
        throw new Error('Unable to create an authenticator from the environment.');
    }
    // remove client-level properties
    delete credentials.url;
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
        authType = credentials.apikey ? Authenticator.AUTHTYPE_IAM : Authenticator.AUTHTYPE_CONTAINER;
    }
    // Create and return the appropriate authenticator.
    let authenticator;
    // Compare the authType against our constants case-insensitively to
    // determine which authenticator type needs to be constructed.
    authType = authType.toLowerCase();
    if (authType === Authenticator.AUTHTYPE_NOAUTH.toLowerCase()) {
        authenticator = new NoAuthAuthenticator();
    }
    else if (authType === Authenticator.AUTHTYPE_BASIC.toLowerCase()) {
        authenticator = new BasicAuthenticator(credentials);
    }
    else if (authType === Authenticator.AUTHTYPE_BEARERTOKEN.toLowerCase()) {
        authenticator = new BearerTokenAuthenticator(credentials);
    }
    else if (authType === Authenticator.AUTHTYPE_CP4D.toLowerCase()) {
        authenticator = new CloudPakForDataAuthenticator(credentials);
    }
    else if (authType === Authenticator.AUTHTYPE_IAM.toLowerCase()) {
        authenticator = new IamAuthenticator(credentials);
    }
    else if (authType === Authenticator.AUTHTYPE_IAM_ASSUME.toLowerCase()) {
        authenticator = new IamAssumeAuthenticator(credentials);
    }
    else if (authType === Authenticator.AUTHTYPE_CONTAINER.toLowerCase()) {
        authenticator = new ContainerAuthenticator(credentials);
    }
    else if (authType === Authenticator.AUTHTYPE_VPC.toLowerCase()) {
        authenticator = new VpcInstanceAuthenticator(credentials);
    }
    else if (authType === Authenticator.AUTHTYPE_MCSP.toLowerCase()) {
        authenticator = new McspAuthenticator(credentials);
    }
    else if (authType === Authenticator.AUTHTYPE_MCSPV2.toLowerCase()) {
        authenticator = new McspV2Authenticator(credentials);
    }
    else {
        throw new Error(`Invalid value for AUTH_TYPE: ${authType}`);
    }
    return authenticator;
}

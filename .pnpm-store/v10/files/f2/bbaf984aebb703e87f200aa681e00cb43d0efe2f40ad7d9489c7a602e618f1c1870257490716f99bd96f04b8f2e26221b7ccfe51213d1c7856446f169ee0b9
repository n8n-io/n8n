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
/**
 * @module authenticators
 * The ibm-cloud-sdk-core module supports the following types of authentication:
 *
 * Basic Authentication
 * Bearer Token
 * Identity and Access Management (IAM, grant type: apikey)
 * Identity and Access Management (IAM, grant type: assume)
 * Container (IKS, etc)
 * VPC Instance
 * Cloud Pak for Data
 * No Authentication
 *
 * The supported authentication types may vary from service to service. Each
 * authentication type is implemented as an Authenticator for consumption by a service.
 *
 * classes:
 *   AuthenticatorInterface: Implement this interface to provide custom authentication schemes to services.
 *   Authenticator: Extend this class to provide custom authentication schemes to services.
 *   BasicAuthenticator: Authenticator for passing supplied basic authentication information to service endpoint.
 *   BearerTokenAuthenticator: Authenticator for passing supplied bearer token to service endpoint.
 *   CloudPakForDataAuthenticator: Authenticator for passing CP4D authentication information to service endpoint.
 *   IAMAuthenticator: Authenticator for passing IAM authentication information to service endpoint.
 *   IAMAssumeAuthenticator: Authenticator for passing IAM authentication information to service endpoint, assuming a trusted profile.
 *   ContainerAuthenticator: Authenticator for passing IAM authentication to a service, based on a token living on the container.
 *   VpcInstanceAuthenticator: Authenticator that uses the VPC Instance Metadata Service API to retrieve an IAM token.
 *   McspAuthenticator: Authenticator for passing MCSP authentication to a service endpoint.
 *   NoAuthAuthenticator: Performs no authentication. Useful for testing purposes.
 */
export { AuthenticatorInterface } from './authenticator-interface';
export { Authenticator } from './authenticator';
export { BasicAuthenticator } from './basic-authenticator';
export { BearerTokenAuthenticator } from './bearer-token-authenticator';
export { CloudPakForDataAuthenticator } from './cloud-pak-for-data-authenticator';
export { IamAuthenticator } from './iam-authenticator';
export { ContainerAuthenticator } from './container-authenticator';
export { NoAuthAuthenticator } from './no-auth-authenticator';
export { IamRequestBasedAuthenticator } from './iam-request-based-authenticator';
export { TokenRequestBasedAuthenticator } from './token-request-based-authenticator';
export { VpcInstanceAuthenticator } from './vpc-instance-authenticator';
export { McspAuthenticator } from './mcsp-authenticator';
export { IamAssumeAuthenticator } from './iam-assume-authenticator';

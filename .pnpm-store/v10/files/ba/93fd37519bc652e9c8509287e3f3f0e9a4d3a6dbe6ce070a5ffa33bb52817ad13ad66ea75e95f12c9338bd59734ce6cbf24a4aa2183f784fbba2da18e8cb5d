import { GoogleAuth } from './auth/googleauth';
export * as gcpMetadata from 'gcp-metadata';
export * as gaxios from 'gaxios';
import { AuthClient } from './auth/authclient';
export { AuthClient, DEFAULT_UNIVERSE } from './auth/authclient';
export { Compute, ComputeOptions } from './auth/computeclient';
export { CredentialBody, CredentialRequest, Credentials, JWTInput, } from './auth/credentials';
export { GCPEnv } from './auth/envDetect';
export { GoogleAuthOptions, ProjectIdCallback } from './auth/googleauth';
export { IAMAuth, RequestMetadata } from './auth/iam';
export { IdTokenClient, IdTokenProvider } from './auth/idtokenclient';
export { Claims, JWTAccess } from './auth/jwtaccess';
export { JWT, JWTOptions } from './auth/jwtclient';
export { Impersonated, ImpersonatedOptions } from './auth/impersonated';
export { Certificates, CodeChallengeMethod, CodeVerifierResults, GenerateAuthUrlOpts, GetTokenOptions, OAuth2Client, OAuth2ClientOptions, RefreshOptions, TokenInfo, VerifyIdTokenOptions, ClientAuthentication, } from './auth/oauth2client';
export { LoginTicket, TokenPayload } from './auth/loginticket';
export { UserRefreshClient, UserRefreshClientOptions, } from './auth/refreshclient';
export { AwsClient, AwsClientOptions, AwsSecurityCredentialsSupplier, } from './auth/awsclient';
export { AwsSecurityCredentials, AwsRequestSigner, } from './auth/awsrequestsigner';
export { IdentityPoolClient, IdentityPoolClientOptions, SubjectTokenSupplier, } from './auth/identitypoolclient';
export { ExternalAccountClient, ExternalAccountClientOptions, } from './auth/externalclient';
export { BaseExternalAccountClient, BaseExternalAccountClientOptions, SharedExternalAccountClientOptions, ExternalAccountSupplierContext, IamGenerateAccessTokenResponse, } from './auth/baseexternalclient';
export { CredentialAccessBoundary, DownscopedClient, } from './auth/downscopedclient';
export { PluggableAuthClient, PluggableAuthClientOptions, ExecutableError, } from './auth/pluggable-auth-client';
export { EXTERNAL_ACCOUNT_AUTHORIZED_USER_TYPE, ExternalAccountAuthorizedUserClient, ExternalAccountAuthorizedUserClientOptions, } from './auth/externalAccountAuthorizedUserClient';
export { PassThroughClient } from './auth/passthrough';
export * from './gtoken/googleToken';
type ALL_EXPORTS = (typeof import('./'))[keyof typeof import('./')];
/**
 * A union type for all {@link AuthClient `AuthClient`} constructors.
 */
export type AnyAuthClientConstructor = Extract<ALL_EXPORTS, typeof AuthClient>;
/**
 * A union type for all {@link AuthClient `AuthClient`}s.
 */
export type AnyAuthClient = InstanceType<AnyAuthClientConstructor>;
declare const auth: GoogleAuth<AuthClient>;
export { auth, GoogleAuth };

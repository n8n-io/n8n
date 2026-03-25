import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { SSOOIDCServiceException as __BaseException } from "./SSOOIDCServiceException";
export declare class AccessDeniedException extends __BaseException {
  readonly name: "AccessDeniedException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<AccessDeniedException, __BaseException>
  );
}
export declare class AuthorizationPendingException extends __BaseException {
  readonly name: "AuthorizationPendingException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<AuthorizationPendingException, __BaseException>
  );
}
export interface AwsAdditionalDetails {
  identityContext?: string | undefined;
}
export interface CreateTokenRequest {
  clientId: string | undefined;
  clientSecret: string | undefined;
  grantType: string | undefined;
  deviceCode?: string | undefined;
  code?: string | undefined;
  refreshToken?: string | undefined;
  scope?: string[] | undefined;
  redirectUri?: string | undefined;
  codeVerifier?: string | undefined;
}
export interface CreateTokenResponse {
  accessToken?: string | undefined;
  tokenType?: string | undefined;
  expiresIn?: number | undefined;
  refreshToken?: string | undefined;
  idToken?: string | undefined;
}
export declare class ExpiredTokenException extends __BaseException {
  readonly name: "ExpiredTokenException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<ExpiredTokenException, __BaseException>
  );
}
export declare class InternalServerException extends __BaseException {
  readonly name: "InternalServerException";
  readonly $fault: "server";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<InternalServerException, __BaseException>
  );
}
export declare class InvalidClientException extends __BaseException {
  readonly name: "InvalidClientException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<InvalidClientException, __BaseException>
  );
}
export declare class InvalidGrantException extends __BaseException {
  readonly name: "InvalidGrantException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<InvalidGrantException, __BaseException>
  );
}
export declare class InvalidRequestException extends __BaseException {
  readonly name: "InvalidRequestException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<InvalidRequestException, __BaseException>
  );
}
export declare class InvalidScopeException extends __BaseException {
  readonly name: "InvalidScopeException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<InvalidScopeException, __BaseException>
  );
}
export declare class SlowDownException extends __BaseException {
  readonly name: "SlowDownException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(opts: __ExceptionOptionType<SlowDownException, __BaseException>);
}
export declare class UnauthorizedClientException extends __BaseException {
  readonly name: "UnauthorizedClientException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<UnauthorizedClientException, __BaseException>
  );
}
export declare class UnsupportedGrantTypeException extends __BaseException {
  readonly name: "UnsupportedGrantTypeException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<UnsupportedGrantTypeException, __BaseException>
  );
}
export interface CreateTokenWithIAMRequest {
  clientId: string | undefined;
  grantType: string | undefined;
  code?: string | undefined;
  refreshToken?: string | undefined;
  assertion?: string | undefined;
  scope?: string[] | undefined;
  redirectUri?: string | undefined;
  subjectToken?: string | undefined;
  subjectTokenType?: string | undefined;
  requestedTokenType?: string | undefined;
  codeVerifier?: string | undefined;
}
export interface CreateTokenWithIAMResponse {
  accessToken?: string | undefined;
  tokenType?: string | undefined;
  expiresIn?: number | undefined;
  refreshToken?: string | undefined;
  idToken?: string | undefined;
  issuedTokenType?: string | undefined;
  scope?: string[] | undefined;
  awsAdditionalDetails?: AwsAdditionalDetails | undefined;
}
export declare class InvalidRequestRegionException extends __BaseException {
  readonly name: "InvalidRequestRegionException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  endpoint?: string | undefined;
  region?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<InvalidRequestRegionException, __BaseException>
  );
}
export declare class InvalidClientMetadataException extends __BaseException {
  readonly name: "InvalidClientMetadataException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<InvalidClientMetadataException, __BaseException>
  );
}
export declare class InvalidRedirectUriException extends __BaseException {
  readonly name: "InvalidRedirectUriException";
  readonly $fault: "client";
  error?: string | undefined;
  error_description?: string | undefined;
  constructor(
    opts: __ExceptionOptionType<InvalidRedirectUriException, __BaseException>
  );
}
export interface RegisterClientRequest {
  clientName: string | undefined;
  clientType: string | undefined;
  scopes?: string[] | undefined;
  redirectUris?: string[] | undefined;
  grantTypes?: string[] | undefined;
  issuerUrl?: string | undefined;
  entitledApplicationArn?: string | undefined;
}
export interface RegisterClientResponse {
  clientId?: string | undefined;
  clientSecret?: string | undefined;
  clientIdIssuedAt?: number | undefined;
  clientSecretExpiresAt?: number | undefined;
  authorizationEndpoint?: string | undefined;
  tokenEndpoint?: string | undefined;
}
export interface StartDeviceAuthorizationRequest {
  clientId: string | undefined;
  clientSecret: string | undefined;
  startUrl: string | undefined;
}
export interface StartDeviceAuthorizationResponse {
  deviceCode?: string | undefined;
  userCode?: string | undefined;
  verificationUri?: string | undefined;
  verificationUriComplete?: string | undefined;
  expiresIn?: number | undefined;
  interval?: number | undefined;
}
export declare const CreateTokenRequestFilterSensitiveLog: (
  obj: CreateTokenRequest
) => any;
export declare const CreateTokenResponseFilterSensitiveLog: (
  obj: CreateTokenResponse
) => any;
export declare const CreateTokenWithIAMRequestFilterSensitiveLog: (
  obj: CreateTokenWithIAMRequest
) => any;
export declare const CreateTokenWithIAMResponseFilterSensitiveLog: (
  obj: CreateTokenWithIAMResponse
) => any;
export declare const RegisterClientResponseFilterSensitiveLog: (
  obj: RegisterClientResponse
) => any;
export declare const StartDeviceAuthorizationRequestFilterSensitiveLog: (
  obj: StartDeviceAuthorizationRequest
) => any;

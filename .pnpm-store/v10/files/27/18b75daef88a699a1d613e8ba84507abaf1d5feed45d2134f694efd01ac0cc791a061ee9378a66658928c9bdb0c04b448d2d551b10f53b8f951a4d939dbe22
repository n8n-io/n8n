import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { SSOOIDCServiceException as __BaseException } from "./SSOOIDCServiceException";
export declare const AccessDeniedExceptionReason: {
  readonly KMS_ACCESS_DENIED: "KMS_AccessDeniedException";
};
export type AccessDeniedExceptionReason =
  (typeof AccessDeniedExceptionReason)[keyof typeof AccessDeniedExceptionReason];
export declare class AccessDeniedException extends __BaseException {
  readonly name: "AccessDeniedException";
  readonly $fault: "client";
  error?: string | undefined;
  reason?: AccessDeniedExceptionReason | undefined;
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
export declare const CreateTokenRequestFilterSensitiveLog: (
  obj: CreateTokenRequest
) => any;
export interface CreateTokenResponse {
  accessToken?: string | undefined;
  tokenType?: string | undefined;
  expiresIn?: number | undefined;
  refreshToken?: string | undefined;
  idToken?: string | undefined;
}
export declare const CreateTokenResponseFilterSensitiveLog: (
  obj: CreateTokenResponse
) => any;
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
export declare const InvalidRequestExceptionReason: {
  readonly KMS_DISABLED_KEY: "KMS_DisabledException";
  readonly KMS_INVALID_KEY_USAGE: "KMS_InvalidKeyUsageException";
  readonly KMS_INVALID_STATE: "KMS_InvalidStateException";
  readonly KMS_KEY_NOT_FOUND: "KMS_NotFoundException";
};
export type InvalidRequestExceptionReason =
  (typeof InvalidRequestExceptionReason)[keyof typeof InvalidRequestExceptionReason];
export declare class InvalidRequestException extends __BaseException {
  readonly name: "InvalidRequestException";
  readonly $fault: "client";
  error?: string | undefined;
  reason?: InvalidRequestExceptionReason | undefined;
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

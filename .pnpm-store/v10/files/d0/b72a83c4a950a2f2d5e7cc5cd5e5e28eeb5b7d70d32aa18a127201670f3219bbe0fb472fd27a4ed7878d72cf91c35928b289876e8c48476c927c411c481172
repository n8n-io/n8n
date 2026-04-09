import type { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import type { AccessDeniedExceptionReason, InvalidRequestExceptionReason } from "./enums";
import { SSOOIDCServiceException as __BaseException } from "./SSOOIDCServiceException";
/**
 * <p>You do not have sufficient access to perform this action.</p>
 * @public
 */
export declare class AccessDeniedException extends __BaseException {
    readonly name: "AccessDeniedException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be <code>access_denied</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>A string that uniquely identifies a reason for the error.</p>
     * @public
     */
    reason?: AccessDeniedExceptionReason | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<AccessDeniedException, __BaseException>);
}
/**
 * <p>Indicates that a request to authorize a client with an access user session token is
 *       pending.</p>
 * @public
 */
export declare class AuthorizationPendingException extends __BaseException {
    readonly name: "AuthorizationPendingException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be
     *       <code>authorization_pending</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<AuthorizationPendingException, __BaseException>);
}
/**
 * <p>Indicates that the token issued by the service is expired and is no longer valid.</p>
 * @public
 */
export declare class ExpiredTokenException extends __BaseException {
    readonly name: "ExpiredTokenException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be <code>expired_token</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ExpiredTokenException, __BaseException>);
}
/**
 * <p>Indicates that an error from the service occurred while trying to process a
 *       request.</p>
 * @public
 */
export declare class InternalServerException extends __BaseException {
    readonly name: "InternalServerException";
    readonly $fault: "server";
    /**
     * <p>Single error code. For this exception the value will be <code>server_error</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InternalServerException, __BaseException>);
}
/**
 * <p>Indicates that the <code>clientId</code> or <code>clientSecret</code> in the request is
 *       invalid. For example, this can occur when a client sends an incorrect <code>clientId</code> or
 *       an expired <code>clientSecret</code>.</p>
 * @public
 */
export declare class InvalidClientException extends __BaseException {
    readonly name: "InvalidClientException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be
     *       <code>invalid_client</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidClientException, __BaseException>);
}
/**
 * <p>Indicates that a request contains an invalid grant. This can occur if a client makes a
 *         <a>CreateToken</a> request with an invalid grant type.</p>
 * @public
 */
export declare class InvalidGrantException extends __BaseException {
    readonly name: "InvalidGrantException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be <code>invalid_grant</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidGrantException, __BaseException>);
}
/**
 * <p>Indicates that something is wrong with the input to the request. For example, a required
 *       parameter might be missing or out of range.</p>
 * @public
 */
export declare class InvalidRequestException extends __BaseException {
    readonly name: "InvalidRequestException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be
     *       <code>invalid_request</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>A string that uniquely identifies a reason for the error.</p>
     * @public
     */
    reason?: InvalidRequestExceptionReason | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidRequestException, __BaseException>);
}
/**
 * <p>Indicates that the scope provided in the request is invalid.</p>
 * @public
 */
export declare class InvalidScopeException extends __BaseException {
    readonly name: "InvalidScopeException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be <code>invalid_scope</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidScopeException, __BaseException>);
}
/**
 * <p>Indicates that the client is making the request too frequently and is more than the
 *       service can handle. </p>
 * @public
 */
export declare class SlowDownException extends __BaseException {
    readonly name: "SlowDownException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be <code>slow_down</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<SlowDownException, __BaseException>);
}
/**
 * <p>Indicates that the client is not currently authorized to make the request. This can happen
 *       when a <code>clientId</code> is not issued for a public client.</p>
 * @public
 */
export declare class UnauthorizedClientException extends __BaseException {
    readonly name: "UnauthorizedClientException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be
     *       <code>unauthorized_client</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<UnauthorizedClientException, __BaseException>);
}
/**
 * <p>Indicates that the grant type in the request is not supported by the service.</p>
 * @public
 */
export declare class UnsupportedGrantTypeException extends __BaseException {
    readonly name: "UnsupportedGrantTypeException";
    readonly $fault: "client";
    /**
     * <p>Single error code. For this exception the value will be
     *         <code>unsupported_grant_type</code>.</p>
     * @public
     */
    error?: string | undefined;
    /**
     * <p>Human-readable text providing additional information, used to assist the client developer
     *       in understanding the error that occurred.</p>
     * @public
     */
    error_description?: string | undefined;
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<UnsupportedGrantTypeException, __BaseException>);
}

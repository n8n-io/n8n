import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { SSOServiceException as __BaseException } from "./SSOServiceException";
/**
 * <p>Provides information about your AWS account.</p>
 * @public
 */
export interface AccountInfo {
    /**
     * <p>The identifier of the AWS account that is assigned to the user.</p>
     * @public
     */
    accountId?: string | undefined;
    /**
     * <p>The display name of the AWS account that is assigned to the user.</p>
     * @public
     */
    accountName?: string | undefined;
    /**
     * <p>The email address of the AWS account that is assigned to the user.</p>
     * @public
     */
    emailAddress?: string | undefined;
}
/**
 * @public
 */
export interface GetRoleCredentialsRequest {
    /**
     * <p>The friendly name of the role that is assigned to the user.</p>
     * @public
     */
    roleName: string | undefined;
    /**
     * <p>The identifier for the AWS account that is assigned to the user.</p>
     * @public
     */
    accountId: string | undefined;
    /**
     * <p>The token issued by the <code>CreateToken</code> API call. For more information, see
     *         <a href="https://docs.aws.amazon.com/singlesignon/latest/OIDCAPIReference/API_CreateToken.html">CreateToken</a> in the <i>IAM Identity Center OIDC API Reference Guide</i>.</p>
     * @public
     */
    accessToken: string | undefined;
}
/**
 * <p>Provides information about the role credentials that are assigned to the user.</p>
 * @public
 */
export interface RoleCredentials {
    /**
     * <p>The identifier used for the temporary security credentials. For more information, see
     *         <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_use-resources.html">Using Temporary Security Credentials to Request Access to AWS Resources</a> in the
     *         <i>AWS IAM User Guide</i>.</p>
     * @public
     */
    accessKeyId?: string | undefined;
    /**
     * <p>The key that is used to sign the request. For more information, see <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_use-resources.html">Using Temporary Security Credentials to Request Access to AWS Resources</a> in the
     *         <i>AWS IAM User Guide</i>.</p>
     * @public
     */
    secretAccessKey?: string | undefined;
    /**
     * <p>The token used for temporary credentials. For more information, see <a href="https://docs.aws.amazon.com/IAM/latest/UserGuide/id_credentials_temp_use-resources.html">Using Temporary Security Credentials to Request Access to AWS Resources</a> in the
     *         <i>AWS IAM User Guide</i>.</p>
     * @public
     */
    sessionToken?: string | undefined;
    /**
     * <p>The date on which temporary security credentials expire.</p>
     * @public
     */
    expiration?: number | undefined;
}
/**
 * @public
 */
export interface GetRoleCredentialsResponse {
    /**
     * <p>The credentials for the role that is assigned to the user.</p>
     * @public
     */
    roleCredentials?: RoleCredentials | undefined;
}
/**
 * <p>Indicates that a problem occurred with the input to the request. For example, a required
 *       parameter might be missing or out of range.</p>
 * @public
 */
export declare class InvalidRequestException extends __BaseException {
    readonly name: "InvalidRequestException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<InvalidRequestException, __BaseException>);
}
/**
 * <p>The specified resource doesn't exist.</p>
 * @public
 */
export declare class ResourceNotFoundException extends __BaseException {
    readonly name: "ResourceNotFoundException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<ResourceNotFoundException, __BaseException>);
}
/**
 * <p>Indicates that the request is being made too frequently and is more than what the server
 *       can handle.</p>
 * @public
 */
export declare class TooManyRequestsException extends __BaseException {
    readonly name: "TooManyRequestsException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<TooManyRequestsException, __BaseException>);
}
/**
 * <p>Indicates that the request is not authorized. This can happen due to an invalid access
 *       token in the request.</p>
 * @public
 */
export declare class UnauthorizedException extends __BaseException {
    readonly name: "UnauthorizedException";
    readonly $fault: "client";
    /**
     * @internal
     */
    constructor(opts: __ExceptionOptionType<UnauthorizedException, __BaseException>);
}
/**
 * @public
 */
export interface ListAccountRolesRequest {
    /**
     * <p>The page token from the previous response output when you request subsequent pages.</p>
     * @public
     */
    nextToken?: string | undefined;
    /**
     * <p>The number of items that clients can request per page.</p>
     * @public
     */
    maxResults?: number | undefined;
    /**
     * <p>The token issued by the <code>CreateToken</code> API call. For more information, see
     *         <a href="https://docs.aws.amazon.com/singlesignon/latest/OIDCAPIReference/API_CreateToken.html">CreateToken</a> in the <i>IAM Identity Center OIDC API Reference Guide</i>.</p>
     * @public
     */
    accessToken: string | undefined;
    /**
     * <p>The identifier for the AWS account that is assigned to the user.</p>
     * @public
     */
    accountId: string | undefined;
}
/**
 * <p>Provides information about the role that is assigned to the user.</p>
 * @public
 */
export interface RoleInfo {
    /**
     * <p>The friendly name of the role that is assigned to the user.</p>
     * @public
     */
    roleName?: string | undefined;
    /**
     * <p>The identifier of the AWS account assigned to the user.</p>
     * @public
     */
    accountId?: string | undefined;
}
/**
 * @public
 */
export interface ListAccountRolesResponse {
    /**
     * <p>The page token client that is used to retrieve the list of accounts.</p>
     * @public
     */
    nextToken?: string | undefined;
    /**
     * <p>A paginated response with the list of roles and the next token if more results are
     *       available.</p>
     * @public
     */
    roleList?: RoleInfo[] | undefined;
}
/**
 * @public
 */
export interface ListAccountsRequest {
    /**
     * <p>(Optional) When requesting subsequent pages, this is the page token from the previous
     *       response output.</p>
     * @public
     */
    nextToken?: string | undefined;
    /**
     * <p>This is the number of items clients can request per page.</p>
     * @public
     */
    maxResults?: number | undefined;
    /**
     * <p>The token issued by the <code>CreateToken</code> API call. For more information, see
     *         <a href="https://docs.aws.amazon.com/singlesignon/latest/OIDCAPIReference/API_CreateToken.html">CreateToken</a> in the <i>IAM Identity Center OIDC API Reference Guide</i>.</p>
     * @public
     */
    accessToken: string | undefined;
}
/**
 * @public
 */
export interface ListAccountsResponse {
    /**
     * <p>The page token client that is used to retrieve the list of accounts.</p>
     * @public
     */
    nextToken?: string | undefined;
    /**
     * <p>A paginated response with the list of account information and the next token if more
     *       results are available.</p>
     * @public
     */
    accountList?: AccountInfo[] | undefined;
}
/**
 * @public
 */
export interface LogoutRequest {
    /**
     * <p>The token issued by the <code>CreateToken</code> API call. For more information, see
     *         <a href="https://docs.aws.amazon.com/singlesignon/latest/OIDCAPIReference/API_CreateToken.html">CreateToken</a> in the <i>IAM Identity Center OIDC API Reference Guide</i>.</p>
     * @public
     */
    accessToken: string | undefined;
}
/**
 * @internal
 */
export declare const GetRoleCredentialsRequestFilterSensitiveLog: (obj: GetRoleCredentialsRequest) => any;
/**
 * @internal
 */
export declare const RoleCredentialsFilterSensitiveLog: (obj: RoleCredentials) => any;
/**
 * @internal
 */
export declare const GetRoleCredentialsResponseFilterSensitiveLog: (obj: GetRoleCredentialsResponse) => any;
/**
 * @internal
 */
export declare const ListAccountRolesRequestFilterSensitiveLog: (obj: ListAccountRolesRequest) => any;
/**
 * @internal
 */
export declare const ListAccountsRequestFilterSensitiveLog: (obj: ListAccountsRequest) => any;
/**
 * @internal
 */
export declare const LogoutRequestFilterSensitiveLog: (obj: LogoutRequest) => any;

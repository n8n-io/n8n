import { ExceptionOptionType as __ExceptionOptionType } from "@smithy/smithy-client";
import { CognitoIdentityServiceException as __BaseException } from "./CognitoIdentityServiceException";
export declare const AmbiguousRoleResolutionType: {
  readonly AUTHENTICATED_ROLE: "AuthenticatedRole";
  readonly DENY: "Deny";
};
export type AmbiguousRoleResolutionType =
  (typeof AmbiguousRoleResolutionType)[keyof typeof AmbiguousRoleResolutionType];
export interface CognitoIdentityProvider {
  ProviderName?: string | undefined;
  ClientId?: string | undefined;
  ServerSideTokenCheck?: boolean | undefined;
}
export interface CreateIdentityPoolInput {
  IdentityPoolName: string | undefined;
  AllowUnauthenticatedIdentities: boolean | undefined;
  AllowClassicFlow?: boolean | undefined;
  SupportedLoginProviders?: Record<string, string> | undefined;
  DeveloperProviderName?: string | undefined;
  OpenIdConnectProviderARNs?: string[] | undefined;
  CognitoIdentityProviders?: CognitoIdentityProvider[] | undefined;
  SamlProviderARNs?: string[] | undefined;
  IdentityPoolTags?: Record<string, string> | undefined;
}
export interface IdentityPool {
  IdentityPoolId: string | undefined;
  IdentityPoolName: string | undefined;
  AllowUnauthenticatedIdentities: boolean | undefined;
  AllowClassicFlow?: boolean | undefined;
  SupportedLoginProviders?: Record<string, string> | undefined;
  DeveloperProviderName?: string | undefined;
  OpenIdConnectProviderARNs?: string[] | undefined;
  CognitoIdentityProviders?: CognitoIdentityProvider[] | undefined;
  SamlProviderARNs?: string[] | undefined;
  IdentityPoolTags?: Record<string, string> | undefined;
}
export declare class InternalErrorException extends __BaseException {
  readonly name: "InternalErrorException";
  readonly $fault: "server";
  constructor(
    opts: __ExceptionOptionType<InternalErrorException, __BaseException>
  );
}
export declare class InvalidParameterException extends __BaseException {
  readonly name: "InvalidParameterException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<InvalidParameterException, __BaseException>
  );
}
export declare class LimitExceededException extends __BaseException {
  readonly name: "LimitExceededException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<LimitExceededException, __BaseException>
  );
}
export declare class NotAuthorizedException extends __BaseException {
  readonly name: "NotAuthorizedException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<NotAuthorizedException, __BaseException>
  );
}
export declare class ResourceConflictException extends __BaseException {
  readonly name: "ResourceConflictException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<ResourceConflictException, __BaseException>
  );
}
export declare class TooManyRequestsException extends __BaseException {
  readonly name: "TooManyRequestsException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<TooManyRequestsException, __BaseException>
  );
}
export interface DeleteIdentitiesInput {
  IdentityIdsToDelete: string[] | undefined;
}
export declare const ErrorCode: {
  readonly ACCESS_DENIED: "AccessDenied";
  readonly INTERNAL_SERVER_ERROR: "InternalServerError";
};
export type ErrorCode = (typeof ErrorCode)[keyof typeof ErrorCode];
export interface UnprocessedIdentityId {
  IdentityId?: string | undefined;
  ErrorCode?: ErrorCode | undefined;
}
export interface DeleteIdentitiesResponse {
  UnprocessedIdentityIds?: UnprocessedIdentityId[] | undefined;
}
export interface DeleteIdentityPoolInput {
  IdentityPoolId: string | undefined;
}
export declare class ResourceNotFoundException extends __BaseException {
  readonly name: "ResourceNotFoundException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<ResourceNotFoundException, __BaseException>
  );
}
export interface DescribeIdentityInput {
  IdentityId: string | undefined;
}
export interface IdentityDescription {
  IdentityId?: string | undefined;
  Logins?: string[] | undefined;
  CreationDate?: Date | undefined;
  LastModifiedDate?: Date | undefined;
}
export interface DescribeIdentityPoolInput {
  IdentityPoolId: string | undefined;
}
export declare class ExternalServiceException extends __BaseException {
  readonly name: "ExternalServiceException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<ExternalServiceException, __BaseException>
  );
}
export interface GetCredentialsForIdentityInput {
  IdentityId: string | undefined;
  Logins?: Record<string, string> | undefined;
  CustomRoleArn?: string | undefined;
}
export interface Credentials {
  AccessKeyId?: string | undefined;
  SecretKey?: string | undefined;
  SessionToken?: string | undefined;
  Expiration?: Date | undefined;
}
export interface GetCredentialsForIdentityResponse {
  IdentityId?: string | undefined;
  Credentials?: Credentials | undefined;
}
export declare class InvalidIdentityPoolConfigurationException extends __BaseException {
  readonly name: "InvalidIdentityPoolConfigurationException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<
      InvalidIdentityPoolConfigurationException,
      __BaseException
    >
  );
}
export interface GetIdInput {
  AccountId?: string | undefined;
  IdentityPoolId: string | undefined;
  Logins?: Record<string, string> | undefined;
}
export interface GetIdResponse {
  IdentityId?: string | undefined;
}
export interface GetIdentityPoolRolesInput {
  IdentityPoolId: string | undefined;
}
export declare const MappingRuleMatchType: {
  readonly CONTAINS: "Contains";
  readonly EQUALS: "Equals";
  readonly NOT_EQUAL: "NotEqual";
  readonly STARTS_WITH: "StartsWith";
};
export type MappingRuleMatchType =
  (typeof MappingRuleMatchType)[keyof typeof MappingRuleMatchType];
export interface MappingRule {
  Claim: string | undefined;
  MatchType: MappingRuleMatchType | undefined;
  Value: string | undefined;
  RoleARN: string | undefined;
}
export interface RulesConfigurationType {
  Rules: MappingRule[] | undefined;
}
export declare const RoleMappingType: {
  readonly RULES: "Rules";
  readonly TOKEN: "Token";
};
export type RoleMappingType =
  (typeof RoleMappingType)[keyof typeof RoleMappingType];
export interface RoleMapping {
  Type: RoleMappingType | undefined;
  AmbiguousRoleResolution?: AmbiguousRoleResolutionType | undefined;
  RulesConfiguration?: RulesConfigurationType | undefined;
}
export interface GetIdentityPoolRolesResponse {
  IdentityPoolId?: string | undefined;
  Roles?: Record<string, string> | undefined;
  RoleMappings?: Record<string, RoleMapping> | undefined;
}
export interface GetOpenIdTokenInput {
  IdentityId: string | undefined;
  Logins?: Record<string, string> | undefined;
}
export interface GetOpenIdTokenResponse {
  IdentityId?: string | undefined;
  Token?: string | undefined;
}
export declare class DeveloperUserAlreadyRegisteredException extends __BaseException {
  readonly name: "DeveloperUserAlreadyRegisteredException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<
      DeveloperUserAlreadyRegisteredException,
      __BaseException
    >
  );
}
export interface GetOpenIdTokenForDeveloperIdentityInput {
  IdentityPoolId: string | undefined;
  IdentityId?: string | undefined;
  Logins: Record<string, string> | undefined;
  PrincipalTags?: Record<string, string> | undefined;
  TokenDuration?: number | undefined;
}
export interface GetOpenIdTokenForDeveloperIdentityResponse {
  IdentityId?: string | undefined;
  Token?: string | undefined;
}
export interface GetPrincipalTagAttributeMapInput {
  IdentityPoolId: string | undefined;
  IdentityProviderName: string | undefined;
}
export interface GetPrincipalTagAttributeMapResponse {
  IdentityPoolId?: string | undefined;
  IdentityProviderName?: string | undefined;
  UseDefaults?: boolean | undefined;
  PrincipalTags?: Record<string, string> | undefined;
}
export interface ListIdentitiesInput {
  IdentityPoolId: string | undefined;
  MaxResults: number | undefined;
  NextToken?: string | undefined;
  HideDisabled?: boolean | undefined;
}
export interface ListIdentitiesResponse {
  IdentityPoolId?: string | undefined;
  Identities?: IdentityDescription[] | undefined;
  NextToken?: string | undefined;
}
export interface ListIdentityPoolsInput {
  MaxResults: number | undefined;
  NextToken?: string | undefined;
}
export interface IdentityPoolShortDescription {
  IdentityPoolId?: string | undefined;
  IdentityPoolName?: string | undefined;
}
export interface ListIdentityPoolsResponse {
  IdentityPools?: IdentityPoolShortDescription[] | undefined;
  NextToken?: string | undefined;
}
export interface ListTagsForResourceInput {
  ResourceArn: string | undefined;
}
export interface ListTagsForResourceResponse {
  Tags?: Record<string, string> | undefined;
}
export interface LookupDeveloperIdentityInput {
  IdentityPoolId: string | undefined;
  IdentityId?: string | undefined;
  DeveloperUserIdentifier?: string | undefined;
  MaxResults?: number | undefined;
  NextToken?: string | undefined;
}
export interface LookupDeveloperIdentityResponse {
  IdentityId?: string | undefined;
  DeveloperUserIdentifierList?: string[] | undefined;
  NextToken?: string | undefined;
}
export interface MergeDeveloperIdentitiesInput {
  SourceUserIdentifier: string | undefined;
  DestinationUserIdentifier: string | undefined;
  DeveloperProviderName: string | undefined;
  IdentityPoolId: string | undefined;
}
export interface MergeDeveloperIdentitiesResponse {
  IdentityId?: string | undefined;
}
export declare class ConcurrentModificationException extends __BaseException {
  readonly name: "ConcurrentModificationException";
  readonly $fault: "client";
  constructor(
    opts: __ExceptionOptionType<
      ConcurrentModificationException,
      __BaseException
    >
  );
}
export interface SetIdentityPoolRolesInput {
  IdentityPoolId: string | undefined;
  Roles: Record<string, string> | undefined;
  RoleMappings?: Record<string, RoleMapping> | undefined;
}
export interface SetPrincipalTagAttributeMapInput {
  IdentityPoolId: string | undefined;
  IdentityProviderName: string | undefined;
  UseDefaults?: boolean | undefined;
  PrincipalTags?: Record<string, string> | undefined;
}
export interface SetPrincipalTagAttributeMapResponse {
  IdentityPoolId?: string | undefined;
  IdentityProviderName?: string | undefined;
  UseDefaults?: boolean | undefined;
  PrincipalTags?: Record<string, string> | undefined;
}
export interface TagResourceInput {
  ResourceArn: string | undefined;
  Tags: Record<string, string> | undefined;
}
export interface TagResourceResponse {}
export interface UnlinkDeveloperIdentityInput {
  IdentityId: string | undefined;
  IdentityPoolId: string | undefined;
  DeveloperProviderName: string | undefined;
  DeveloperUserIdentifier: string | undefined;
}
export interface UnlinkIdentityInput {
  IdentityId: string | undefined;
  Logins: Record<string, string> | undefined;
  LoginsToRemove: string[] | undefined;
}
export interface UntagResourceInput {
  ResourceArn: string | undefined;
  TagKeys: string[] | undefined;
}
export interface UntagResourceResponse {}
export declare const GetCredentialsForIdentityInputFilterSensitiveLog: (
  obj: GetCredentialsForIdentityInput
) => any;
export declare const CredentialsFilterSensitiveLog: (obj: Credentials) => any;
export declare const GetCredentialsForIdentityResponseFilterSensitiveLog: (
  obj: GetCredentialsForIdentityResponse
) => any;
export declare const GetIdInputFilterSensitiveLog: (obj: GetIdInput) => any;
export declare const GetOpenIdTokenInputFilterSensitiveLog: (
  obj: GetOpenIdTokenInput
) => any;
export declare const GetOpenIdTokenResponseFilterSensitiveLog: (
  obj: GetOpenIdTokenResponse
) => any;
export declare const GetOpenIdTokenForDeveloperIdentityInputFilterSensitiveLog: (
  obj: GetOpenIdTokenForDeveloperIdentityInput
) => any;
export declare const GetOpenIdTokenForDeveloperIdentityResponseFilterSensitiveLog: (
  obj: GetOpenIdTokenForDeveloperIdentityResponse
) => any;
export declare const UnlinkIdentityInputFilterSensitiveLog: (
  obj: UnlinkIdentityInput
) => any;

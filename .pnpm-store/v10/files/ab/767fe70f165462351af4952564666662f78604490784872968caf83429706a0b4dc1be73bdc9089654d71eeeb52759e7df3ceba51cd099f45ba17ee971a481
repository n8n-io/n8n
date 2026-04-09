import {
  AmbiguousRoleResolutionType,
  ErrorCode,
  MappingRuleMatchType,
  RoleMappingType,
} from "./enums";
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
export interface DeleteIdentitiesInput {
  IdentityIdsToDelete: string[] | undefined;
}
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
export interface MappingRule {
  Claim: string | undefined;
  MatchType: MappingRuleMatchType | undefined;
  Value: string | undefined;
  RoleARN: string | undefined;
}
export interface RulesConfigurationType {
  Rules: MappingRule[] | undefined;
}
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

export interface AssumedRoleUser {
  AssumedRoleId: string | undefined;
  Arn: string | undefined;
}
export interface PolicyDescriptorType {
  arn?: string | undefined;
}
export interface ProvidedContext {
  ProviderArn?: string | undefined;
  ContextAssertion?: string | undefined;
}
export interface Tag {
  Key: string | undefined;
  Value: string | undefined;
}
export interface AssumeRoleRequest {
  RoleArn: string | undefined;
  RoleSessionName: string | undefined;
  PolicyArns?: PolicyDescriptorType[] | undefined;
  Policy?: string | undefined;
  DurationSeconds?: number | undefined;
  Tags?: Tag[] | undefined;
  TransitiveTagKeys?: string[] | undefined;
  ExternalId?: string | undefined;
  SerialNumber?: string | undefined;
  TokenCode?: string | undefined;
  SourceIdentity?: string | undefined;
  ProvidedContexts?: ProvidedContext[] | undefined;
}
export interface Credentials {
  AccessKeyId: string | undefined;
  SecretAccessKey: string | undefined;
  SessionToken: string | undefined;
  Expiration: Date | undefined;
}
export interface AssumeRoleResponse {
  Credentials?: Credentials | undefined;
  AssumedRoleUser?: AssumedRoleUser | undefined;
  PackedPolicySize?: number | undefined;
  SourceIdentity?: string | undefined;
}
export interface AssumeRoleWithWebIdentityRequest {
  RoleArn: string | undefined;
  RoleSessionName: string | undefined;
  WebIdentityToken: string | undefined;
  ProviderId?: string | undefined;
  PolicyArns?: PolicyDescriptorType[] | undefined;
  Policy?: string | undefined;
  DurationSeconds?: number | undefined;
}
export interface AssumeRoleWithWebIdentityResponse {
  Credentials?: Credentials | undefined;
  SubjectFromWebIdentityToken?: string | undefined;
  AssumedRoleUser?: AssumedRoleUser | undefined;
  PackedPolicySize?: number | undefined;
  Provider?: string | undefined;
  Audience?: string | undefined;
  SourceIdentity?: string | undefined;
}

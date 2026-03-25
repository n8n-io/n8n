import { CredentialProviderOptions } from "@aws-sdk/types";
import { AwsCredentialIdentity, Logger, Provider } from "@smithy/types";
import { AssumeRoleCommandInput } from "./commands/AssumeRoleCommand";
import { AssumeRoleWithWebIdentityCommandInput } from "./commands/AssumeRoleWithWebIdentityCommand";
import { STSClient, STSClientConfig } from "./STSClient";
export type STSRoleAssumerOptions = Pick<
  STSClientConfig,
  "logger" | "region" | "requestHandler" | "profile"
> & {
  credentialProviderLogger?: Logger;
  parentClientConfig?: CredentialProviderOptions["parentClientConfig"];
};
export type RoleAssumer = (
  sourceCreds: AwsCredentialIdentity,
  params: AssumeRoleCommandInput
) => Promise<AwsCredentialIdentity>;
export declare const getDefaultRoleAssumer: (
  stsOptions: STSRoleAssumerOptions,
  STSClient: new (options: STSClientConfig) => STSClient
) => RoleAssumer;
export type RoleAssumerWithWebIdentity = (
  params: AssumeRoleWithWebIdentityCommandInput
) => Promise<AwsCredentialIdentity>;
export declare const getDefaultRoleAssumerWithWebIdentity: (
  stsOptions: STSRoleAssumerOptions,
  STSClient: new (options: STSClientConfig) => STSClient
) => RoleAssumerWithWebIdentity;
export type DefaultCredentialProvider = (
  input: any
) => Provider<AwsCredentialIdentity>;
export declare const decorateDefaultCredentialProvider: (
  provider: DefaultCredentialProvider
) => DefaultCredentialProvider;

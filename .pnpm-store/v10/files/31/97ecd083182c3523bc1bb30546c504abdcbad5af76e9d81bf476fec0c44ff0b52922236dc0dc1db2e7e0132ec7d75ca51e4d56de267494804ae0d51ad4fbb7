import {
  AwsIdentityProperties,
  CredentialProviderOptions,
  RuntimeConfigAwsCredentialIdentityProvider,
} from "@aws-sdk/types";
import { SourceProfileInit } from "@smithy/shared-ini-file-loader";
import { SSOClient, SSOClientConfig } from "./loadSso";
export interface SsoCredentialsParameters {
  ssoStartUrl: string;
  ssoSession?: string;
  ssoAccountId: string;
  ssoRegion: string;
  ssoRoleName: string;
}
export interface FromSSOInit
  extends SourceProfileInit,
    CredentialProviderOptions {
  ssoClient?: SSOClient;
  clientConfig?: SSOClientConfig;
  callerClientConfig?: AwsIdentityProperties["callerClientConfig"];
}
export declare const fromSSO: (
  init?: FromSSOInit & Partial<SsoCredentialsParameters>
) => RuntimeConfigAwsCredentialIdentityProvider;

import { FromHttpOptions } from "@aws-sdk/credential-provider-http";
import { FromIniInit } from "@aws-sdk/credential-provider-ini";
import { FromProcessInit } from "@aws-sdk/credential-provider-process";
import {
  FromSSOInit,
  SsoCredentialsParameters,
} from "@aws-sdk/credential-provider-sso";
import { FromTokenFileInit } from "@aws-sdk/credential-provider-web-identity";
import { RemoteProviderInit } from "@smithy/credential-provider-imds";
import { AwsCredentialIdentity } from "@smithy/types";
import { MemoizedRuntimeConfigAwsCredentialIdentityProvider } from "./runtime/memoize-chain";
export type DefaultProviderInit = FromIniInit &
  FromHttpOptions &
  RemoteProviderInit &
  FromProcessInit &
  (FromSSOInit & Partial<SsoCredentialsParameters>) &
  FromTokenFileInit;
export declare const defaultProvider: (
  init?: DefaultProviderInit
) => MemoizedRuntimeConfigAwsCredentialIdentityProvider;
export declare const credentialsWillNeedRefresh: (
  credentials: AwsCredentialIdentity
) => boolean;
export declare const credentialsTreatedAsExpired: (
  credentials: AwsCredentialIdentity
) => boolean;

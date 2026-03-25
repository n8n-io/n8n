import {
  CredentialProviderOptions,
  RuntimeConfigIdentityProvider,
  TokenIdentity,
} from "@aws-sdk/types";
import { SourceProfileInit } from "@smithy/shared-ini-file-loader";
export interface FromSsoInit
  extends SourceProfileInit,
    CredentialProviderOptions {
  clientConfig?: any;
}
export declare const fromSso: (
  _init?: FromSsoInit
) => RuntimeConfigIdentityProvider<TokenIdentity>;

import { FromLoginCredentialsInit } from "@aws-sdk/credential-provider-login";
import { AssumeRoleWithWebIdentityParams } from "@aws-sdk/credential-provider-web-identity";
import { CredentialProviderOptions } from "@aws-sdk/types";
import { RuntimeConfigAwsCredentialIdentityProvider } from "@aws-sdk/types";
import { SourceProfileInit } from "@smithy/shared-ini-file-loader";
import { AwsCredentialIdentity, Pluggable } from "@smithy/types";
import { AssumeRoleParams } from "./resolveAssumeRoleCredentials";
export interface FromIniInit
  extends SourceProfileInit,
    CredentialProviderOptions,
    FromLoginCredentialsInit {
  mfaCodeProvider?: (mfaSerial: string) => Promise<string>;
  roleAssumer?: (
    sourceCreds: AwsCredentialIdentity,
    params: AssumeRoleParams
  ) => Promise<AwsCredentialIdentity>;
  roleAssumerWithWebIdentity?: (
    params: AssumeRoleWithWebIdentityParams
  ) => Promise<AwsCredentialIdentity>;
  clientConfig?: any;
  clientPlugins?: Pluggable<any, any>[];
  ignoreCache?: boolean;
}
export declare const fromIni: (
  _init?: FromIniInit
) => RuntimeConfigAwsCredentialIdentityProvider;

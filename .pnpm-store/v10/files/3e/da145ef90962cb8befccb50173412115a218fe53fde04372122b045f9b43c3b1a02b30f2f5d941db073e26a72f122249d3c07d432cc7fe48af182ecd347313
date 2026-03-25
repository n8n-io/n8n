import {
  AssumeRoleCommandInput,
  STSClientConfig,
} from "@aws-sdk/nested-clients/sts";
import {
  CredentialProviderOptions,
  RuntimeConfigAwsCredentialIdentityProvider,
} from "@aws-sdk/types";
import {
  AwsCredentialIdentity,
  AwsCredentialIdentityProvider,
  Logger,
  Pluggable,
} from "@smithy/types";
export interface FromTemporaryCredentialsOptions
  extends CredentialProviderOptions {
  params: Pick<
    AssumeRoleCommandInput,
    Exclude<keyof AssumeRoleCommandInput, "RoleSessionName">
  > & {
    RoleSessionName?: string;
  };
  masterCredentials?: AwsCredentialIdentity | AwsCredentialIdentityProvider;
  clientConfig?: STSClientConfig;
  logger?: Logger;
  clientPlugins?: Pluggable<any, any>[];
  mfaCodeProvider?: (mfaSerial: string) => Promise<string>;
}
export declare const fromTemporaryCredentials: (
  options: FromTemporaryCredentialsOptions,
  credentialDefaultProvider?: () => AwsCredentialIdentityProvider,
  regionProvider?: ({
    profile,
  }: {
    profile?: string;
  }) => Promise<string | undefined>
) => RuntimeConfigAwsCredentialIdentityProvider;

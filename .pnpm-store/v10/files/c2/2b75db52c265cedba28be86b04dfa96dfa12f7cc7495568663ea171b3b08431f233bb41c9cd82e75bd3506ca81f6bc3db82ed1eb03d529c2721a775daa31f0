import {
  AwsCredentialIdentity,
  AwsCredentialIdentityProvider,
  Logger,
  RequestHandler,
} from "@smithy/types";
import { AwsSdkCredentialsFeatures } from "../feature-ids";
export {
  AwsCredentialIdentity,
  AwsCredentialIdentityProvider,
  IdentityProvider,
} from "@smithy/types";
export interface AwsIdentityProperties {
  callerClientConfig?: {
    credentials?: AwsCredentialIdentity | AwsCredentialIdentityProvider;
    credentialDefaultProvider?: (input?: any) => AwsCredentialIdentityProvider;
    logger?: Logger;
    profile?: string;
    region(): Promise<string>;
    requestHandler?: RequestHandler<any, any>;
  };
}
export type RuntimeConfigIdentityProvider<T> = (
  awsIdentityProperties?: AwsIdentityProperties
) => Promise<T>;
export type RuntimeConfigAwsCredentialIdentityProvider =
  RuntimeConfigIdentityProvider<AwsCredentialIdentity>;
export type AttributedAwsCredentialIdentity = AwsCredentialIdentity & {
  $source?: AwsSdkCredentialsFeatures;
};

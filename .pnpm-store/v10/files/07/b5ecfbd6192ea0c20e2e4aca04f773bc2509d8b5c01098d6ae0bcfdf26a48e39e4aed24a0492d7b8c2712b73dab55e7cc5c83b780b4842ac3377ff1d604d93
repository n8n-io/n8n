import { Logger } from "@smithy/types";
import { AwsCredentialIdentity } from "./identity";
import { Provider } from "./util";
export interface Credentials extends AwsCredentialIdentity {}
export type CredentialProvider = Provider<Credentials>;
export type CredentialProviderOptions = {
  logger?: Logger;
  parentClientConfig?: {
    region?: string | Provider<string>;
    profile?: string;
    logger?: Logger;
    userAgentAppId?(): Promise<string | undefined>;
    [key: string]: unknown;
  };
};

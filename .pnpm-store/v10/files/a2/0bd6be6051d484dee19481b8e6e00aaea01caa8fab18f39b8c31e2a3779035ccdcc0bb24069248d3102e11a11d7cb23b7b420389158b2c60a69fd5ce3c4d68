import { LoadedConfigSelectors } from "@smithy/node-config-provider";
import { Provider } from "@smithy/types";
export interface AwsSdkSigV4AAuthInputConfig {
  sigv4aSigningRegionSet?:
    | string[]
    | undefined
    | Provider<string[] | undefined>;
}
export interface AwsSdkSigV4APreviouslyResolved {}
export interface AwsSdkSigV4AAuthResolvedConfig {
  sigv4aSigningRegionSet: Provider<string[] | undefined>;
}
export declare const resolveAwsSdkSigV4AConfig: <T>(
  config: T & AwsSdkSigV4AAuthInputConfig & AwsSdkSigV4APreviouslyResolved
) => T & AwsSdkSigV4AAuthResolvedConfig;
export declare const NODE_SIGV4A_CONFIG_OPTIONS: LoadedConfigSelectors<
  string[] | undefined
>;

import { LoadedConfigSelectors } from "@smithy/node-config-provider";
import type { Provider } from "@smithy/types";
/**
 * @public
 */
export interface AwsSdkSigV4AAuthInputConfig {
    /**
     * This option will override the AWS sigv4a
     * signing regionSet from any other source.
     *
     * The lookup order is:
     * 1. this value
     * 2. configuration file value of sigv4a_signing_region_set.
     * 3. environment value of AWS_SIGV4A_SIGNING_REGION_SET.
     * 4. signingRegionSet given by endpoint resolution.
     * 5. the singular region of the SDK client.
     */
    sigv4aSigningRegionSet?: string[] | undefined | Provider<string[] | undefined>;
}
/**
 * @internal
 */
export interface AwsSdkSigV4APreviouslyResolved {
}
/**
 * @internal
 */
export interface AwsSdkSigV4AAuthResolvedConfig {
    sigv4aSigningRegionSet: Provider<string[] | undefined>;
}
/**
 * @internal
 */
export declare const resolveAwsSdkSigV4AConfig: <T>(config: T & AwsSdkSigV4AAuthInputConfig & AwsSdkSigV4APreviouslyResolved) => T & AwsSdkSigV4AAuthResolvedConfig;
/**
 * @internal
 */
export declare const NODE_SIGV4A_CONFIG_OPTIONS: LoadedConfigSelectors<string[] | undefined>;

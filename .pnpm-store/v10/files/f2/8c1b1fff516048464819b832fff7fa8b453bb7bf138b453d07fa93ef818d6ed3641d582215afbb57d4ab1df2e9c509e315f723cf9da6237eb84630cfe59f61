import type { DefaultExtensionConfiguration } from "@smithy/types";
import type { PartialChecksumRuntimeConfigType } from "./checksum";
import type { PartialRetryRuntimeConfigType } from "./retry";
/**
 * @internal
 */
export type DefaultExtensionRuntimeConfigType = PartialRetryRuntimeConfigType & PartialChecksumRuntimeConfigType;
/**
 * @internal
 *
 * Helper function to resolve default extension configuration from runtime config
 */
export declare const getDefaultExtensionConfiguration: (runtimeConfig: DefaultExtensionRuntimeConfigType) => {
    addChecksumAlgorithm(algo: import("@smithy/types").ChecksumAlgorithm): void;
    checksumAlgorithms(): import("@smithy/types").ChecksumAlgorithm[];
} & {
    setRetryStrategy(retryStrategy: import("@smithy/types").Provider<import("@smithy/types").RetryStrategyV2 | import("@smithy/types").RetryStrategy>): void;
    retryStrategy(): import("@smithy/types").Provider<import("@smithy/types").RetryStrategyV2 | import("@smithy/types").RetryStrategy>;
};
/**
 * @deprecated use getDefaultExtensionConfiguration
 * @internal
 *
 * Helper function to resolve default extension configuration from runtime config
 */
export declare const getDefaultClientConfiguration: (runtimeConfig: DefaultExtensionRuntimeConfigType) => {
    addChecksumAlgorithm(algo: import("@smithy/types").ChecksumAlgorithm): void;
    checksumAlgorithms(): import("@smithy/types").ChecksumAlgorithm[];
} & {
    setRetryStrategy(retryStrategy: import("@smithy/types").Provider<import("@smithy/types").RetryStrategyV2 | import("@smithy/types").RetryStrategy>): void;
    retryStrategy(): import("@smithy/types").Provider<import("@smithy/types").RetryStrategyV2 | import("@smithy/types").RetryStrategy>;
};
/**
 * @internal
 *
 * Helper function to resolve runtime config from default extension configuration
 */
export declare const resolveDefaultRuntimeConfig: (config: DefaultExtensionConfiguration) => DefaultExtensionRuntimeConfigType;
